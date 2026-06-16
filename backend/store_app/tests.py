from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Product, KhataProfile, Transaction, Invoice, InvoiceItem, PaymentRequest, WhatsAppLog
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
