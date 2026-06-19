from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    CustomUser, Product, KhataProfile, Transaction, Expense, Supplier, 
    SupplierTransaction, Purchase, Notification, Invoice, InvoiceItem, 
    PaymentRequest, WhatsAppLog, ExpiryBatch, PendingRegistration
)

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'phone_number', 'role', 'is_active', 'is_staff', 'created_at')
    list_filter = ('role', 'is_active', 'is_staff', 'created_at')
    search_fields = ('username', 'email', 'phone_number')
    ordering = ('-created_at',)
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'phone_number', 'otp_code', 'otp_created_at')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('role', 'phone_number', 'email')}),
    )

@admin.register(KhataProfile)
class KhataProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'current_balance', 'total_credit', 'total_paid', 'credit_limit', 'is_accessible_by_customer', 'updated_at')
    list_filter = ('is_accessible_by_customer', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email', 'user__phone_number')
    ordering = ('user__username',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'cost_price', 'stock_quantity', 'category', 'gst_rate', 'expiry_date')
    list_filter = ('category', 'gst_rate', 'created_at', 'expiry_date')
    search_fields = ('name', 'barcode', 'hsn_code', 'category')
    ordering = ('name',)

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('khata_profile', 'transaction_type', 'amount', 'product', 'quantity', 'remaining_balance_at_snapshot', 'created_at')
    list_filter = ('transaction_type', 'created_at')
    search_fields = ('khata_profile__user__username', 'description', 'product__name')
    ordering = ('-created_at',)

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'amount', 'expense_date', 'created_by')
    list_filter = ('category', 'expense_date', 'created_at')
    search_fields = ('title', 'description')
    ordering = ('-expense_date',)

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_number', 'email', 'amount_due', 'amount_paid', 'remaining_due')
    search_fields = ('name', 'contact_number', 'email', 'gst_number')
    ordering = ('name',)

@admin.register(SupplierTransaction)
class SupplierTransactionAdmin(admin.ModelAdmin):
    list_display = ('supplier', 'transaction_type', 'amount', 'date', 'created_at')
    list_filter = ('transaction_type', 'date')
    search_fields = ('supplier__name', 'description')
    ordering = ('-created_at',)

@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('supplier', 'product', 'quantity', 'cost_price', 'gst', 'purchase_date')
    list_filter = ('purchase_date', 'created_at')
    search_fields = ('supplier__name', 'product__name')
    ordering = ('-purchase_date',)

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'notification_type', 'message', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__username', 'message')
    ordering = ('-created_at',)

class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'customer', 'subtotal', 'cgst_total', 'sgst_total', 'grand_total', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('invoice_number', 'customer__user__username')
    inlines = [InvoiceItemInline]
    ordering = ('-created_at',)

@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'product', 'quantity', 'unit_price', 'gst_rate', 'total_amount')
    search_fields = ('invoice__invoice_number', 'product__name')

@admin.register(PaymentRequest)
class PaymentRequestAdmin(admin.ModelAdmin):
    list_display = ('khata_profile', 'amount', 'status', 'razorpay_payment_link_id', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('khata_profile__user__username', 'razorpay_payment_link_id')
    ordering = ('-created_at',)

@admin.register(WhatsAppLog)
class WhatsAppLogAdmin(admin.ModelAdmin):
    list_display = ('khata_profile', 'message_type', 'phone_number', 'status', 'sent_at')
    list_filter = ('message_type', 'status', 'sent_at')
    search_fields = ('khata_profile__user__username', 'phone_number', 'message_body')
    ordering = ('-sent_at',)

@admin.register(ExpiryBatch)
class ExpiryBatchAdmin(admin.ModelAdmin):
    list_display = ('product', 'batch_number', 'expiry_date', 'quantity')
    list_filter = ('expiry_date', 'created_at')
    search_fields = ('product__name', 'batch_number')
    ordering = ('expiry_date',)


@admin.register(PendingRegistration)
class PendingRegistrationAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'phone_number', 'is_verified', 'otp_expiry', 'attempt_count', 'created_at')
    list_filter = ('is_verified', 'created_at', 'otp_expiry')
    search_fields = ('username', 'email', 'phone_number')
    ordering = ('-created_at',)

