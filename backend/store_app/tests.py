from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Product, KhataProfile, Transaction
from decimal import Decimal

User = get_user_model()

class StoreBackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_test',
            email='admin_test@test.com',
            password='password123',
            role='ADMIN'
        )
        self.customer = User.objects.create_user(
            username='customer_test',
            email='customer_test@test.com',
            password='password123',
            role='CUSTOMER'
        )
        self.product = Product.objects.create(
            name='Test Flour',
            description='Whole wheat test flour',
            price=Decimal('50.00'),
            stock_quantity=100,
            category='Flours'
        )

    def test_khata_profile_auto_created(self):
        """Test that KhataProfile is automatically created via post_save signal."""
        profile = KhataProfile.objects.filter(user=self.customer).first()
        self.assertIsNotNone(profile)
        self.assertEqual(profile.current_balance, Decimal('0.00'))
        self.assertFalse(profile.is_accessible_by_customer)

    def test_transaction_arithmetic(self):
        """Test that adding CREDIT and DEBIT transactions updates KhataProfile balances correctly."""
        profile = self.customer.khata_profile
        
        tx_credit = Transaction.objects.create(
            khata_profile=profile,
            transaction_type='CREDIT',
            amount=Decimal('500.00'),
            description='Bought groceries'
        )
        profile.refresh_from_db()
        self.assertEqual(profile.current_balance, Decimal('500.00'))
        self.assertEqual(profile.total_credit, Decimal('500.00'))
        self.assertEqual(tx_credit.remaining_balance_at_snapshot, Decimal('500.00'))

        tx_debit = Transaction.objects.create(
            khata_profile=profile,
            transaction_type='DEBIT',
            amount=Decimal('200.00'),
            description='Paid cash'
        )
        profile.refresh_from_db()
        self.assertEqual(profile.current_balance, Decimal('300.00'))
        self.assertEqual(profile.total_paid, Decimal('200.00'))
        self.assertEqual(tx_debit.remaining_balance_at_snapshot, Decimal('300.00'))

    def test_customer_khata_security_lock(self):
        """Test that customer cannot retrieve ledger if access is locked by admin."""
        self.client.force_authenticate(user=self.customer)
        
        response = self.client.get('/api/khata/my-ledger/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(response.data.get('is_locked'))

        profile = self.customer.khata_profile
        profile.is_accessible_by_customer = True
        profile.save()

        response = self.client.get('/api/khata/my-ledger/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(response.data['current_balance'])), Decimal('0.00'))

    def test_admin_dashboard_analytics_permissions(self):
        """Test that only admin role can access analytics and customer lists."""
        self.client.force_authenticate(user=self.customer)
        response = self.client.get('/api/admin/analytics/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/analytics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('metrics', response.data)
        self.assertIn('charts', response.data)

    def test_customer_checkout_success(self):
        """Test successful cart checkout under unlocked khata."""
        self.customer.khata_profile.is_accessible_by_customer = True
        self.customer.khata_profile.save()

        self.client.force_authenticate(user=self.customer)
        payload = {
            "items": [
                {"product_id": self.product.id, "quantity": 3}
            ]
        }
        response = self.client.post('/api/checkout/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['current_balance'], 150.00)

        # Assert stock is reduced
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 97)

        # Assert credit logs are created
        self.customer.khata_profile.refresh_from_db()
        self.assertEqual(self.customer.khata_profile.current_balance, Decimal('150.00'))

    def test_customer_checkout_locked_khata(self):
        """Test that locked khata customer cannot checkout cart."""
        self.customer.khata_profile.is_accessible_by_customer = False
        self.customer.khata_profile.save()

        self.client.force_authenticate(user=self.customer)
        payload = {
            "items": [
                {"product_id": self.product.id, "quantity": 1}
            ]
        }
        response = self.client.post('/api/checkout/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(response.data.get('is_locked'))

        # Assert stock did not change
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 100)

    def test_customer_checkout_insufficient_stock(self):
        """Test checkout fails and rolls back if stock is insufficient."""
        self.customer.khata_profile.is_accessible_by_customer = True
        self.customer.khata_profile.save()

        self.client.force_authenticate(user=self.customer)
        payload = {
            "items": [
                {"product_id": self.product.id, "quantity": 101} # 1 more than available
            ]
        }
        response = self.client.post('/api/checkout/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient stock", response.data['detail'])

        # Assert stock did not change
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 100)
