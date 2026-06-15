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
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='CUSTOMER')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    stock_quantity = models.IntegerField(default=0)
    image = models.TextField(blank=True, null=True)  # Text field for image URL/base64
    category = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class KhataProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='khata_profile')
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_credit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    is_accessible_by_customer = models.BooleanField(default=False)
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
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    quantity = models.IntegerField(null=True, blank=True)
    remaining_balance_at_snapshot = models.DecimalField(max_digits=12, decimal_places=2, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

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
    if created:
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
    )
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.notification_type}] - {self.message[:30]}"

