from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Product, KhataProfile, Transaction, Invoice, InvoiceItem, PaymentRequest, WhatsAppLog, ExpiryBatch, Notification
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

    def test_gst_checkout_calculations(self):
        """Test that checkout retrospectively calculates GST base and CGST/SGST correctly."""
        self.customer.khata_profile.is_accessible_by_customer = True
        self.customer.khata_profile.save()

        # Create a product with 18% GST (inclusive retail price: ₹118.00)
        gst_product = Product.objects.create(
            name='GST Product 18%',
            description='Test item with 18% GST',
            price=Decimal('118.00'),
            stock_quantity=10,
            category='General',
            gst_rate=Decimal('18.00'),
            hsn_code='HSN1234'
        )

        self.client.force_authenticate(user=self.customer)
        payload = {
            "items": [
                {"product_id": gst_product.id, "quantity": 2}
            ]
        }
        
        response = self.client.post('/api/checkout/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify invoice calculation
        invoice_number = response.data['invoice_number']
        invoice = Invoice.objects.get(invoice_number=invoice_number)
        
        # Total inclusive price = 118 * 2 = 236.00
        # Taxable Value = 236 / 1.18 = 200.00
        # GST Total = 36.00
        # CGST = SGST = 18.00
        self.assertEqual(invoice.grand_total, Decimal('236.00'))
        self.assertEqual(invoice.subtotal, Decimal('200.00'))
        self.assertEqual(invoice.cgst_total, Decimal('18.00'))
        self.assertEqual(invoice.sgst_total, Decimal('18.00'))

        # Verify InvoiceItem creation
        item = invoice.items.first()
        self.assertEqual(item.product, gst_product)
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.unit_price, Decimal('118.00'))
        self.assertEqual(item.gst_rate, Decimal('18.00'))
        self.assertEqual(item.cgst_amount, Decimal('18.00'))
        self.assertEqual(item.sgst_amount, Decimal('18.00'))
        self.assertEqual(item.total_amount, Decimal('236.00'))

    def test_gst_summary_analytics(self):
        """Test that GSTSummaryView correctly aggregates values by tax slab."""
        self.customer.khata_profile.is_accessible_by_customer = True
        self.customer.khata_profile.save()

        # Create two products with different GST rates
        prod_18 = Product.objects.create(
            name='18% Prod',
            price=Decimal('118.00'),
            stock_quantity=10,
            gst_rate=Decimal('18.00')
        )
        prod_5 = Product.objects.create(
            name='5% Prod',
            price=Decimal('105.00'),
            stock_quantity=10,
            gst_rate=Decimal('5.00')
        )

        self.client.force_authenticate(user=self.customer)
        
        # Checkout 1 item of each
        payload = {
            "items": [
                {"product_id": prod_18.id, "quantity": 1},
                {"product_id": prod_5.id, "quantity": 1}
            ]
        }
        response = self.client.post('/api/checkout/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Authenticate as admin to query GST analytics
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/analytics/gst/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        summary = response.data['summary']
        # Total sales = 118 + 105 = 223.00
        # Taxable base = 100 + 100 = 200.00
        # CGST = 9 + 2.5 = 11.50
        # SGST = 9 + 2.5 = 11.50
        # Total tax = 23.00
        self.assertAlmostEqual(summary['total_sales'], 223.00)
        self.assertAlmostEqual(summary['taxable_amount'], 200.00)
        self.assertAlmostEqual(summary['total_cgst'], 11.50)
        self.assertAlmostEqual(summary['total_sgst'], 11.50)
        self.assertAlmostEqual(summary['total_tax'], 23.00)

        # Verify slabs breakdown
        slabs = {slab['gst_rate']: slab for slab in response.data['slabs_breakdown']}
        
        # 18% slab verification
        self.assertAlmostEqual(slabs[18.0]['total_sales'], 118.00)
        self.assertAlmostEqual(slabs[18.0]['taxable_amount'], 100.00)
        self.assertAlmostEqual(slabs[18.0]['total_collected'], 18.00)

        # 5% slab verification
        self.assertAlmostEqual(slabs[5.0]['total_sales'], 105.00)
        self.assertAlmostEqual(slabs[5.0]['taxable_amount'], 100.00)
        self.assertAlmostEqual(slabs[5.0]['total_collected'], 5.00)

    def test_checkout_blocked_by_credit_limit(self):
        """Test that checkout is blocked when cart total would exceed the customer's credit limit."""
        profile = self.customer.khata_profile
        profile.is_accessible_by_customer = True
        profile.credit_limit = Decimal('100.00')  # tight limit – 3 × ₹50 = ₹150 > ₹100
        profile.save()

        self.client.force_authenticate(user=self.customer)

        # 3 × ₹50 = ₹150 which exceeds the ₹100 limit
        response = self.client.post('/api/khata/checkout/', {
            'items': [{'product_id': self.product.id, 'quantity': 3}]
        }, format='json')

        # Credit limit breach raises ValueError inside the atomic block → 400 or 500
        self.assertNotEqual(response.status_code, status.HTTP_201_CREATED)
        # Balance must remain unchanged (atomic rollback)
        profile.refresh_from_db()
        self.assertEqual(profile.current_balance, Decimal('0.00'))


    def test_admin_update_credit_limit(self):
        """Test that admin can set a per-customer credit limit via update-limit endpoint."""
        self.client.force_authenticate(user=self.admin)

        profile = self.customer.khata_profile

        response = self.client.patch(
            f'/api/admin/customers/{profile.id}/update-limit/',
            {'credit_limit': 25000.00},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertAlmostEqual(data['credit_limit'], 25000.00)
        self.assertIn('available_credit', data)
        self.assertIn('utilization_pct', data)

        # Verify persisted in DB
        profile.refresh_from_db()
        self.assertEqual(profile.credit_limit, Decimal('25000.00'))

    def test_product_barcode_field(self):
        """Test that we can create a product with a barcode and retrieve it via by-barcode API lookup."""
        prod_barcode = Product.objects.create(
            name='Barcoded Product',
            price=Decimal('10.00'),
            stock_quantity=10,
            barcode='8901030733842'
        )
        self.client.force_authenticate(user=self.customer)
        response = self.client.get('/api/products/by-barcode/', {'barcode': '8901030733842'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], prod_barcode.id)
        self.assertEqual(response.data['barcode'], '8901030733842')

    def test_barcode_lookup_not_found(self):
        """Test that lookup of a non-existent barcode returns 404."""
        self.client.force_authenticate(user=self.customer)
        response = self.client.get('/api/products/by-barcode/', {'barcode': '9999999999999'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_payment_link(self):
        """Test that customer can create a payment link to settle outstanding balance."""
        profile = self.customer.khata_profile
        profile.is_accessible_by_customer = True
        Transaction.objects.create(
            khata_profile=profile,
            transaction_type='CREDIT',
            amount=Decimal('500.00'),
            description='Bought groceries'
        )
        profile.refresh_from_db()
        self.assertEqual(profile.current_balance, Decimal('500.00'))

        self.client.force_authenticate(user=self.customer)
        response = self.client.post('/api/payments/create-link/', {'amount': 300.00}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('razorpay_payment_link_id', response.data)
        self.assertIn('razorpay_payment_link_url', response.data)
        self.assertEqual(response.data['status'], 'PENDING')
        
        self.assertTrue(PaymentRequest.objects.filter(razorpay_payment_link_id=response.data['razorpay_payment_link_id']).exists())

    def test_webhook_payment_verification(self):
        """Test that webhook dynamically updates payment status and customer ledger on payment success."""
        profile = self.customer.khata_profile
        profile.is_accessible_by_customer = True
        Transaction.objects.create(
            khata_profile=profile,
            transaction_type='CREDIT',
            amount=Decimal('500.00'),
            description='Bought groceries'
        )
        profile.refresh_from_db()

        payment_req = PaymentRequest.objects.create(
            khata_profile=profile,
            amount=Decimal('300.00'),
            razorpay_payment_link_id='plink_test123',
            razorpay_payment_link_url='http://mockurl.com/plink_test123',
            status='PENDING'
        )

        payload = {
            'event': 'payment_link.paid',
            'payload': {
                'payment_link': {
                    'entity': {
                        'id': 'plink_test123',
                        'status': 'paid',
                        'payments': [{'payment_id': 'pay_999999'}]
                    }
                }
            }
        }
        
        import json
        payload_bytes = json.dumps(payload).encode('utf-8')
        
        import hmac, hashlib
        from django.conf import settings
        computed_sig = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()

        response = self.client.post(
            '/api/payments/webhook/',
            data=payload_bytes,
            content_type='application/json',
            HTTP_X_RAZORPAY_SIGNATURE=computed_sig
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        payment_req.refresh_from_db()
        self.assertEqual(payment_req.status, 'PAID')
        self.assertEqual(payment_req.razorpay_payment_id, 'pay_999999')
        
        profile.refresh_from_db()
        self.assertEqual(profile.current_balance, Decimal('200.00'))
        self.assertEqual(profile.total_paid, Decimal('300.00'))

    def test_webhook_signature_failure(self):
        """Test that webhook rejects payload with invalid signature and does not modify database."""
        profile = self.customer.khata_profile
        profile.is_accessible_by_customer = True
        
        payment_req = PaymentRequest.objects.create(
            khata_profile=profile,
            amount=Decimal('100.00'),
            razorpay_payment_link_id='plink_test456',
            status='PENDING'
        )

        payload = {
            'event': 'payment_link.paid',
            'payload': {
                'payment_link': {
                    'entity': {
                        'id': 'plink_test456',
                        'status': 'paid'
                    }
                }
            }
        }

        response = self.client.post(
            '/api/payments/webhook/',
            payload,
            format='json',
            HTTP_X_RAZORPAY_SIGNATURE='invalid_signature_mocked'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        payment_req.refresh_from_db()
        self.assertEqual(payment_req.status, 'PENDING')
        profile.refresh_from_db()
        self.assertEqual(profile.current_balance, Decimal('0.00'))

    def test_whatsapp_reminder_creation(self):
        """Test that admin can successfully trigger WhatsApp reminder manually."""
        self.customer.phone_number = '9876543210'
        self.customer.save()

        self.client.force_authenticate(user=self.admin)
        profile = self.customer.khata_profile
        
        Transaction.objects.create(
            khata_profile=profile,
            transaction_type='CREDIT',
            amount=Decimal('100.00'),
            description='Test Reminder Groceries'
        )
        profile.refresh_from_db()

        response = self.client.post(
            f'/api/admin/customers/{profile.id}/send-whatsapp-reminder/',
            {'message_type': 'PAYMENT_REMINDER'},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("notification queued successfully", response.data['detail'])

        log = WhatsAppLog.objects.filter(khata_profile=profile).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.message_type, 'PAYMENT_REMINDER')
        self.assertEqual(log.phone_number, '9876543210')
        self.assertEqual(log.status, 'SENT')
        self.assertIn('friendly payment reminder', log.message_body)

    def test_checkout_whatsapp_auto_trigger(self):
        """Test that a customer checkout automatically dispatches a WhatsApp transaction alert."""
        self.customer.phone_number = '9876543210'
        self.customer.save()
        
        profile = self.customer.khata_profile
        profile.is_accessible_by_customer = True
        profile.save()

        self.client.force_authenticate(user=self.customer)
        payload = {
            "items": [
                {"product_id": self.product.id, "quantity": 2}
            ]
        }
        
        response = self.client.post('/api/checkout/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        log = WhatsAppLog.objects.filter(khata_profile=profile, message_type='TRANSACTION_ALERT').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.phone_number, '9876543210')
        self.assertEqual(log.status, 'SENT')
        self.assertIn('Transaction: Checkout on Credit', log.message_body)
        self.assertIn('Amount: ₹100.00', log.message_body)
        self.assertIn('Checked out items', log.message_body)
        self.assertIn('running outstanding balance is: ₹100.00', log.message_body)

    def test_whatsapp_statement_request(self):
        """Test that a customer can request ledger statement summary to WhatsApp."""
        self.customer.phone_number = '9876543210'
        self.customer.save()
        
        profile = self.customer.khata_profile
        profile.is_accessible_by_customer = True
        profile.save()

        self.client.force_authenticate(user=self.customer)
        
        response = self.client.post('/api/khata/my-ledger/request-whatsapp-statement/', format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("requested and will be sent", response.data['detail'])

        log = WhatsAppLog.objects.filter(khata_profile=profile, message_type='STATEMENT').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.phone_number, '9876543210')
        self.assertEqual(log.status, 'SENT')
        self.assertIn('ledger statement summary', log.message_body)
        self.assertIn('Outstanding Balance: ₹0.00', log.message_body)

    @override_settings(TWILIO_ACCOUNT_SID='', TWILIO_AUTH_TOKEN='')
    def test_whatsapp_sandbox_mock_execution(self):
        """Verify that when Twilio credentials are blank, send_whatsapp_message executes mock sandbox logic."""
        from store_app.utils.whatsapp_helpers import send_whatsapp_message
        import io
        from contextlib import redirect_stdout
        
        f = io.StringIO()
        with redirect_stdout(f):
            success, err = send_whatsapp_message("9876543210", "Hello from Sandbox Test!")
            
        self.assertTrue(success)
        self.assertIsNone(err)
        output = f.getvalue()
        self.assertIn("[MOCK WHATSAPP SANDBOX]", output)
        self.assertIn("To: +919876543210", output)
        self.assertIn("Hello from Sandbox Test!", output)

    # ────────────────────────────────────────────────────────
    # GAP 6: PRODUCT EXPIRY TRACKING TESTS
    # ────────────────────────────────────────────────────────

    def test_expiry_batch_creation(self):
        """Verify that an ExpiryBatch record can be created for a product and stored correctly."""
        from datetime import date, timedelta
        expiry_date = date.today() + timedelta(days=30)
        batch = ExpiryBatch.objects.create(
            product=self.product,
            batch_number='LOT-001',
            manufacture_date=date.today() - timedelta(days=60),
            expiry_date=expiry_date,
            quantity=50,
            notes='Test batch for milk'
        )
        self.assertEqual(batch.product, self.product)
        self.assertEqual(batch.batch_number, 'LOT-001')
        self.assertEqual(batch.quantity, 50)
        self.assertEqual(batch.expiry_date, expiry_date)
        # Verify it appears in the product's related manager
        self.assertEqual(self.product.expiry_batches.count(), 1)

    def test_expiry_dashboard_expired_items(self):
        """Verify that expired products appear correctly in the expiry dashboard API."""
        from datetime import date, timedelta
        # Set a past expiry date on the product
        self.product.expiry_date = date.today() - timedelta(days=5)
        self.product.save()
        
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/admin/expiry-dashboard/')
        
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('summary', data)
        self.assertGreaterEqual(data['summary']['products']['expired'], 1)
        # Check that the expired product appears in the detail list
        expired_ids = [p['id'] for p in data['expired_products']]
        self.assertIn(self.product.id, expired_ids)
        # Verify the expiry_status label is EXPIRED
        expired_entry = next(p for p in data['expired_products'] if p['id'] == self.product.id)
        self.assertEqual(expired_entry['expiry_status'], 'EXPIRED')
        # Reset
        self.product.expiry_date = None
        self.product.save()

    def test_expiry_dashboard_expiring_soon(self):
        """Verify that products expiring within 7 days appear in the expiring soon list."""
        from datetime import date, timedelta
        self.product.expiry_date = date.today() + timedelta(days=3)
        self.product.save()
        
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/admin/expiry-dashboard/')
        
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertGreaterEqual(data['summary']['products']['expiring_soon'], 1)
        expiring_ids = [p['id'] for p in data['expiring_soon_products']]
        self.assertIn(self.product.id, expiring_ids)
        expiring_entry = next(p for p in data['expiring_soon_products'] if p['id'] == self.product.id)
        self.assertEqual(expiring_entry['expiry_status'], 'EXPIRING_SOON')
        self.assertLessEqual(expiring_entry['days_until_expiry'], 7)
        # Reset
        self.product.expiry_date = None
        self.product.save()

    def test_expiry_scan_task_creates_notifications(self):
        """Verify that the expiry scan task creates EXPIRY_ALERT notifications for admin users."""
        from datetime import date, timedelta
        from store_app.tasks import scan_and_alert_expiring_products_task
        
        # Create an expired product
        expired_product = Product.objects.create(
            name='Expired Milk',
            price=Decimal('25.00'),
            cost_price=Decimal('20.00'),
            stock_quantity=10,
            expiry_date=date.today() - timedelta(days=2)
        )
        # Create a soon-expiring batch
        ExpiryBatch.objects.create(
            product=self.product,
            batch_number='LOT-SOON',
            expiry_date=date.today() + timedelta(days=4),
            quantity=20
        )
        
        initial_notification_count = Notification.objects.filter(
            notification_type='EXPIRY_ALERT'
        ).count()
        
        # Run the task synchronously in tests
        summary = scan_and_alert_expiring_products_task()
        
        self.assertIn('expired_products', summary)
        self.assertIn('expiring_soon_batches', summary)
        self.assertGreaterEqual(summary['expired_products'], 1)
        self.assertGreaterEqual(summary['expiring_soon_batches'], 1)
        
        # Verify notifications were created
        final_notification_count = Notification.objects.filter(
            notification_type='EXPIRY_ALERT'
        ).count()
        self.assertGreater(final_notification_count, initial_notification_count)
        
        # Cleanup
        expired_product.delete()

    def test_customer_registration_inactive(self):
        """Verify new registered customers are set as pending registration instead of CustomUser."""
        from .models import PendingRegistration
        payload = {
            'username': 'inactive_tester',
            'email': 'inactive_tester@test.com',
            'password': 'Prajapatiadmin2005#$@',
            'confirm_password': 'Prajapatiadmin2005#$@',
            'phone_number': '9876543210',
            'role': 'CUSTOMER'
        }
        response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that no CustomUser was created
        self.assertFalse(User.objects.filter(username='inactive_tester').exists())
        
        # Check that PendingRegistration was created
        pending = PendingRegistration.objects.get(username='inactive_tester')
        self.assertIsNotNone(pending.otp)
        self.assertEqual(len(pending.otp), 64)

    def test_login_inactive_user(self):
        """Verify correct login attempt for an unverified pending user returns verification validation error."""
        from .models import PendingRegistration
        from django.contrib.auth.hashers import make_password
        from django.utils import timezone
        from datetime import timedelta
        
        PendingRegistration.objects.create(
            username='inactive_login_test',
            email='inactive_login_test@test.com',
            phone_number='9876543211',
            password_hash=make_password('Prajapatiadmin2005#$@'),
            otp='hashed_otp_placeholder',
            otp_expiry=timezone.now() + timedelta(minutes=10)
        )
        
        payload = {
            'username': 'inactive_login_test',
            'password': 'Prajapatiadmin2005#$@'
        }
        response = self.client.post('/api/auth/login/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Please verify your email address before logging in.", response.data['detail'][0])

    def test_verify_otp_success(self):
        """Verify OTP verification endpoint succeeds, deletes pending record, and creates user."""
        from .models import PendingRegistration
        from django.contrib.auth.hashers import make_password
        from django.utils import timezone
        from datetime import timedelta
        import hashlib
        
        hashed = hashlib.sha256('123456'.encode()).hexdigest()
        PendingRegistration.objects.create(
            username='verify_success_test',
            email='verify_success_test@test.com',
            phone_number='9876543212',
            password_hash=make_password('Prajapatiadmin2005#$@'),
            otp=hashed,
            otp_expiry=timezone.now() + timedelta(minutes=10)
        )
        
        payload = {
            'username': 'verify_success_test',
            'otp': '123456'
        }
        response = self.client.post('/api/auth/verify-otp/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("verified successfully", response.data['detail'])
        
        # Verify user is created and active in CustomUser table
        user = User.objects.get(username='verify_success_test')
        self.assertTrue(user.is_active)
        
        # Verify pending record status is set to verified
        pending = PendingRegistration.objects.get(username='verify_success_test')
        self.assertEqual(pending.status, 'verified')

    def test_verify_otp_invalid(self):
        """Verify OTP verification fails when OTP is invalid."""
        from .models import PendingRegistration
        from django.contrib.auth.hashers import make_password
        from django.utils import timezone
        from datetime import timedelta
        import hashlib
        
        hashed = hashlib.sha256('123456'.encode()).hexdigest()
        PendingRegistration.objects.create(
            username='verify_failed_test',
            email='verify_failed_test@test.com',
            phone_number='9876543213',
            password_hash=make_password('Prajapatiadmin2005#$@'),
            otp=hashed,
            otp_expiry=timezone.now() + timedelta(minutes=10)
        )
        
        payload = {
            'username': 'verify_failed_test',
            'otp': '654321'
        }
        response = self.client.post('/api/auth/verify-otp/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid verification code", response.data['detail'])

    def test_resend_otp(self):
        """Verify resending OTP generates a new OTP code."""
        from .models import PendingRegistration
        from django.contrib.auth.hashers import make_password
        from django.utils import timezone
        from datetime import timedelta
        import hashlib
        
        hashed = hashlib.sha256('111111'.encode()).hexdigest()
        pending = PendingRegistration.objects.create(
            username='resend_otp_test',
            email='resend_otp_test@test.com',
            phone_number='9876543214',
            password_hash=make_password('Prajapatiadmin2005#$@'),
            otp=hashed,
            otp_expiry=timezone.now() + timedelta(minutes=10)
        )
        
        payload = {
            'username': 'resend_otp_test'
        }
        response = self.client.post('/api/auth/resend-otp/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        pending.refresh_from_db()
        self.assertNotEqual(pending.otp, hashed)
        self.assertEqual(len(pending.otp), 64)

    def test_registration_cancellation_and_expiration_uniqueness(self):
        """Verify that cancelled or expired registrations do not block new registration attempts with the same credentials."""
        from .models import PendingRegistration
        from django.contrib.auth.hashers import make_password
        from django.utils import timezone
        from datetime import timedelta

        # 1. Create a cancelled pending registration
        PendingRegistration.objects.create(
            username='cancelled_user',
            email='cancelled@test.com',
            phone_number='9876543220',
            password_hash=make_password('Prajapatiadmin2005#$@'),
            otp='hashed',
            otp_expiry=timezone.now() + timedelta(minutes=10),
            status='cancelled'
        )

        # 2. Try to register with the same details
        payload = {
            'username': 'cancelled_user',
            'email': 'cancelled@test.com',
            'password': 'Prajapatiadmin2005#$@',
            'confirm_password': 'Prajapatiadmin2005#$@',
            'phone_number': '9876543220',
            'role': 'CUSTOMER'
        }
        # Uniqueness check endpoints should return available=True
        res_username = self.client.post('/api/auth/check-username/', {'username': 'cancelled_user'}, format='json')
        self.assertEqual(res_username.status_code, status.HTTP_200_OK)
        self.assertTrue(res_username.data['available'])

        res_email = self.client.post('/api/auth/check-email/', {'email': 'cancelled@test.com'}, format='json')
        self.assertEqual(res_email.status_code, status.HTTP_200_OK)
        self.assertTrue(res_email.data['available'])

        res_phone = self.client.post('/api/auth/check-phone/', {'phone_number': '9876543220'}, format='json')
        self.assertEqual(res_phone.status_code, status.HTTP_200_OK)
        self.assertTrue(res_phone.data['available'])

        # Register POST should succeed
        response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify a new active pending registration is created and the old one is marked as cancelled
        pending_records = PendingRegistration.objects.filter(username='cancelled_user')
        self.assertEqual(pending_records.count(), 2)
        self.assertEqual(pending_records.filter(status='pending').count(), 1)
        self.assertEqual(pending_records.filter(status='cancelled').count(), 1)

    def test_cancel_registration_api(self):
        """Verify that the cancel-registration endpoint successfully marks a pending registration as cancelled."""
        from .models import PendingRegistration
        from django.contrib.auth.hashers import make_password
        from django.utils import timezone
        from datetime import timedelta

        PendingRegistration.objects.create(
            username='to_cancel',
            email='to_cancel@test.com',
            phone_number='9876543221',
            password_hash=make_password('Prajapatiadmin2005#$@'),
            otp='hashed',
            otp_expiry=timezone.now() + timedelta(minutes=10),
            status='pending'
        )

        response = self.client.post('/api/auth/cancel-registration/', {'username': 'to_cancel'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['detail'], "Registration cancelled successfully.")

        pending = PendingRegistration.objects.get(username='to_cancel')
        self.assertEqual(pending.status, 'cancelled')
