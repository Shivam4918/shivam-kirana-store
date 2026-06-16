from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, UserProfileView, ProductViewSet,
    CustomerKhataView, CustomerCheckoutView, AdminDashboardAnalyticsView, AdminCustomerViewSet,
    ExpenseViewSet, SupplierViewSet, PurchaseViewSet, NotificationViewSet,
    ProfitLossAnalyticsView, BalanceSheetAnalyticsView, CashFlowAnalyticsView, InventoryAnalyticsView,
    ExportPDFView, ExportExcelView, InvoiceViewSet, GSTSummaryView,
    PaymentLinkCreateView, PaymentRequestStatusView, PaymentWebhookView, AdminPaymentRequestViewSet,
    CustomerRequestWhatsAppStatementView, WhatsAppLogViewSet
)

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='products')
router.register(r'admin/customers', AdminCustomerViewSet, basename='admin-customers')
router.register(r'expenses', ExpenseViewSet, basename='expenses')
router.register(r'suppliers', SupplierViewSet, basename='suppliers')
router.register(r'purchases', PurchaseViewSet, basename='purchases')
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'invoices', InvoiceViewSet, basename='invoices')
router.register(r'admin/payments', AdminPaymentRequestViewSet, basename='admin-payments')
router.register(r'admin/whatsapp-logs', WhatsAppLogViewSet, basename='admin-whatsapp-logs')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    path('khata/my-ledger/', CustomerKhataView.as_view(), name='my-ledger'),
    path('khata/my-ledger/request-whatsapp-statement/', CustomerRequestWhatsAppStatementView.as_view(), name='request-whatsapp-statement'),
    path('checkout/', CustomerCheckoutView.as_view(), name='checkout'),
    path('admin/analytics/', AdminDashboardAnalyticsView.as_view(), name='admin-analytics'),
    
    # Online Payments
    path('payments/create-link/', PaymentLinkCreateView.as_view(), name='payment-create-link'),
    path('payments/<int:pk>/status/', PaymentRequestStatusView.as_view(), name='payment-status'),
    path('payments/webhook/', PaymentWebhookView.as_view(), name='payment-webhook'),
    
    # Financial Analytics
    path('admin/analytics/pl/', ProfitLossAnalyticsView.as_view(), name='analytics-pl'),
    path('admin/analytics/balance-sheet/', BalanceSheetAnalyticsView.as_view(), name='analytics-balance-sheet'),
    path('admin/analytics/cash-flow/', CashFlowAnalyticsView.as_view(), name='analytics-cash-flow'),
    path('admin/analytics/inventory/', InventoryAnalyticsView.as_view(), name='analytics-inventory'),
    path('admin/analytics/gst/', GSTSummaryView.as_view(), name='analytics-gst'),
    
    # PDF & Excel Exports
    path('exports/pdf/', ExportPDFView.as_view(), name='export-pdf'),
    path('exports/excel/', ExportExcelView.as_view(), name='export-excel'),
    
    path('', include(router.urls)),
]

