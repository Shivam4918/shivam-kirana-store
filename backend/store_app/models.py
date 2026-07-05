from django.db import models, transaction as db_transaction
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from decimal import Decimal

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('CUSTOMER', 'Customer'),
    )
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, unique=True, blank=True, null=True, db_index=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='CUSTOMER')
    otp_code = models.CharField(max_length=128, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)
    otp_failed_attempts = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Normalize empty string phone numbers to None to avoid unique index violation for multiple empty inputs
        if self.phone_number == '':
            self.phone_number = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"

class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    stock_quantity = models.IntegerField(default=0)
    image = models.TextField(blank=True, null=True)  # Text field for image URL/base64
    category = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    hsn_code = models.CharField(max_length=15, blank=True, null=True)
    barcode = models.CharField(max_length=100, blank=True, null=True, unique=True)
    expiry_date = models.DateField(blank=True, null=True, help_text="Product-level expiry date (optional). Use ExpiryBatch for per-lot tracking.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class KhataProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='khata_profile')
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_credit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=10000.00)
    is_accessible_by_customer = models.BooleanField(default=False)
    loyalty_points = models.IntegerField(default=0)
    points_earned = models.IntegerField(default=0)
    points_redeemed = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Khata - {self.user.username} (Balance: {self.current_balance})"

class Transaction(models.Model):
    TRANSACTION_TYPES = (
        ('CREDIT', 'Credit'),
        ('DEBIT', 'Debit'),
    )
    khata_profile = models.ForeignKey(KhataProfile, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    quantity = models.IntegerField(null=True, blank=True)
    invoice = models.ForeignKey('Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    remaining_balance_at_snapshot = models.DecimalField(max_digits=12, decimal_places=2, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if is_new:
            with db_transaction.atomic():
                # Select the profile with write lock to ensure no race conditions
                profile = KhataProfile.objects.select_for_update().get(pk=self.khata_profile.pk)
                amount = self.amount
                if self.transaction_type == 'CREDIT':
                    profile.current_balance += amount
                    profile.total_credit += amount
                elif self.transaction_type == 'DEBIT':
                    profile.current_balance -= amount
                    profile.total_paid += amount
                
                profile.save()
                self.remaining_balance_at_snapshot = profile.current_balance

                # Trigger Khata outstanding notification
                from store_app.utils.notifications import check_and_notify_customer_khata, check_and_notify_stock
                check_and_notify_customer_khata(profile)

                # Update product stock if product and quantity are specified
                if self.product and self.quantity and self.quantity > 0:
                    product = Product.objects.select_for_update().get(pk=self.product.pk)
                    if self.transaction_type == 'CREDIT':
                        # Customer bought goods -> reduce stock
                        if product.stock_quantity < self.quantity:
                            raise ValueError(f"Insufficient stock for {product.name}. Available: {product.stock_quantity}")
                        product.stock_quantity -= self.quantity
                    elif self.transaction_type == 'DEBIT':
                        # Customer returned goods -> increase stock
                        product.stock_quantity += self.quantity
                    product.save()
                    check_and_notify_stock(product)
        super().save(*args, **kwargs)


    def __str__(self):
        return f"{self.transaction_type} of {self.amount} for {self.khata_profile.user.username}"

from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=CustomUser)
def create_user_khata_profile(sender, instance, created, **kwargs):
    """
    Create KhataProfile when:
    1. A new user is created AND is immediately active (e.g. Admin users), OR
    2. An existing user transitions to is_active=True (OTP email verification completes).
    
    This prevents unverified CUSTOMER registrations from polluting the DB.
    """
    if created and instance.is_active:
        # New active user (admin or first user) — create profile immediately
        KhataProfile.objects.get_or_create(user=instance)
    elif not created and instance.is_active:
        # Existing user just became active (email verified) — ensure profile exists
        KhataProfile.objects.get_or_create(user=instance)

class Expense(models.Model):
    CATEGORY_CHOICES = (
        ('RENT', 'Rent'),
        ('ELECTRICITY', 'Electricity'),
        ('INTERNET', 'Internet'),
        ('SALARY', 'Staff Salary'),
        ('TRANSPORT', 'Transport'),
        ('MAINTENANCE', 'Maintenance'),
        ('MISC', 'Miscellaneous'),
    )
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='MISC')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    expense_date = models.DateField(default=timezone.now)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.category} (₹{self.amount})"

class Supplier(models.Model):
    name = models.CharField(max_length=255)
    contact_number = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    gst_number = models.CharField(max_length=15, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    amount_due = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def remaining_due(self):
        return self.amount_due - self.amount_paid

    def __str__(self):
        return self.name

class SupplierTransaction(models.Model):
    TRANSACTION_TYPES = (
        ('PURCHASE', 'Purchase'),
        ('PAYMENT', 'Payment'),
    )
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if is_new:
            with db_transaction.atomic():
                supplier = Supplier.objects.select_for_update().get(pk=self.supplier.pk)
                if self.transaction_type == 'PURCHASE':
                    supplier.amount_due += self.amount
                elif self.transaction_type == 'PAYMENT':
                    supplier.amount_paid += self.amount
                supplier.save()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.transaction_type} of ₹{self.amount} for {self.supplier.name}"

class Purchase(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='purchases')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='purchases')
    quantity = models.IntegerField()
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    gst = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    purchase_date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if is_new:
            with db_transaction.atomic():
                product = Product.objects.select_for_update().get(pk=self.product.pk)
                product.stock_quantity += self.quantity
                product.cost_price = self.cost_price
                product.save()

                total_amount = (self.cost_price * self.quantity) * (Decimal('1.00') + self.gst / Decimal('100.00'))

                SupplierTransaction.objects.create(
                    supplier=self.supplier,
                    transaction_type='PURCHASE',
                    amount=total_amount,
                    description=f"Purchased {self.quantity}x {product.name} @ ₹{self.cost_price}/unit + {self.gst}% GST",
                    date=self.purchase_date
                )
                
                # Trigger Supplier outstanding notification
                from store_app.utils.notifications import notify_supplier_due
                notify_supplier_due(self.supplier, total_amount)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Purchase of {self.quantity}x {self.product.name} from {self.supplier.name}"

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('LOW_STOCK', 'Low Stock Alert'),
        ('OUT_OF_STOCK', 'Out of Stock Alert'),
        ('HIGH_OUTSTANDING', 'High Outstanding Balance'),
        ('PENDING_PAYMENT', 'Long Pending Payment'),
        ('SUPPLIER_DUE', 'Supplier Payment Due'),
        ('CLOSING_REMINDER', 'Daily Closing Reminder'),
        ('REPORT_READY', 'Monthly Report Ready'),
        ('EXPIRY_ALERT', 'Product Expiry Alert'),
        ('ORDER_RECEIVED', 'Order Received Alert'),
    )
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.notification_type}] - {self.message[:30]}"


class Invoice(models.Model):
    invoice_number = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(KhataProfile, on_delete=models.CASCADE, related_name='invoices')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # exclusive of GST
    cgst_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    sgst_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # inclusive of GST
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return self.invoice_number


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)  # Retail selling price inclusive of GST
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)  # e.g. 18.00
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # quantity * unit_price

    def __str__(self):
        return f"{self.product.name if self.product else 'Deleted Product'} (Qty: {self.quantity})"


class Order(models.Model):
    STATUS_CHOICES = (
        ('ORDER_RECEIVED', 'Order Received'),
        ('PREPARING', 'Preparing'),
        ('READY', 'Ready for Pickup'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )
    order_number = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(KhataProfile, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ORDER_RECEIVED')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    cgst_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    sgst_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    redeemed_points = models.IntegerField(default=0)
    redeem_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.order_number} ({self.get_status_display()})"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)  # Retail selling price inclusive of GST
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)  # e.g. 18.00
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # quantity * unit_price

    def __str__(self):
        return f"{self.product.name if self.product else 'Deleted Product'} (Qty: {self.quantity})"


class PaymentRequest(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('FAILED', 'Failed'),
        ('EXPIRED', 'Expired'),
    )
    khata_profile = models.ForeignKey(KhataProfile, on_delete=models.CASCADE, related_name='payment_requests')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    razorpay_payment_link_id = models.CharField(max_length=100, unique=True, blank=True, null=True)
    razorpay_payment_link_url = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='PENDING')
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Payment of ₹{self.amount} for {self.khata_profile.user.username} - {self.status}"


class WhatsAppLog(models.Model):
    MESSAGE_TYPES = (
        ('PAYMENT_REMINDER', 'Payment Reminder'),
        ('TRANSACTION_ALERT', 'Transaction Alert'),
        ('STATEMENT', 'Account Statement'),
    )
    STATUS_CHOICES = (
        ('SENT', 'Sent'),
        ('FAILED', 'Failed'),
        ('PENDING', 'Pending'),
    )
    khata_profile = models.ForeignKey(KhataProfile, on_delete=models.CASCADE, related_name='whatsapp_logs')
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES)
    phone_number = models.CharField(max_length=20)
    message_body = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True, null=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.message_type} to {self.phone_number} ({self.status})"


class ExpiryBatch(models.Model):
    """
    Tracks per-lot/batch expiry for products. A product can have multiple batches
    with different manufacture and expiry dates (e.g. two deliveries of the same milk).
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='expiry_batches')
    batch_number = models.CharField(max_length=100, blank=True, null=True, help_text="Batch/Lot number printed on packaging")
    manufacture_date = models.DateField(blank=True, null=True)
    expiry_date = models.DateField(help_text="Expiry date for this batch")
    quantity = models.IntegerField(default=0, help_text="Number of units in this batch")
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['expiry_date']

    def __str__(self):
        batch_label = f"Batch {self.batch_number}" if self.batch_number else "Unnamed Batch"
        return f"{batch_label} — {self.product.name} (Exp: {self.expiry_date})"


class PendingRegistration(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    username = models.CharField(max_length=150, db_index=True)
    email = models.EmailField(db_index=True)
    phone_number = models.CharField(max_length=15, null=True, blank=True, db_index=True)
    password_hash = models.CharField(max_length=128)
    otp = models.CharField(max_length=128, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)
    otp_expiry = models.DateTimeField(blank=True, null=True)
    attempt_count = models.IntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.phone_number == '':
            self.phone_number = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"PR ({self.status}) - {self.username} ({self.email})"


class ProductReview(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(default=5)  # 1 to 5 stars
    review_text = models.TextField(blank=True, null=True)
    is_verified_purchase = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('product', 'user')
        ordering = ['-created_at']

    def __str__(self):
        return f"Review ({self.rating}*) for {self.product.name} by {self.user.username}"


class WishlistItem(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='wishlist_items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='wishlisted_by')
    product_name = models.CharField(max_length=255, blank=True, null=True)
    product_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    product_image = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.product:
            if not self.product_name:
                self.product_name = self.product.name
            if not self.product_price:
                self.product_price = self.product.price
            if not self.product_image:
                self.product_image = self.product.image
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} - {self.product_name or 'Deleted Product'}"


class PromotionalBanner(models.Model):
    BANNER_TYPES = (
        ('OFFER', 'Offer'),
        ('DISCOUNT', 'Discount'),
        ('ANNOUNCEMENT', 'Announcement'),
        ('KHATA', 'Khata Promotion'),
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    image_url = models.TextField(help_text="Image URL or base64 data")
    link_to_category = models.CharField(max_length=100, blank=True, null=True, help_text="Redirect category tag if clicked")
    banner_type = models.CharField(max_length=20, choices=BANNER_TYPES, default='OFFER')
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return f"[{self.banner_type}] {self.title}"


class StoreConfig(models.Model):
    key = models.CharField(max_length=50, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.key}: {self.value}"


