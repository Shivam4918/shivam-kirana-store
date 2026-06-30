from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, VerifyOTPView, ResendOTPView, UserProfileView, ProductViewSet,
    CustomerKhataView, CustomerCheckoutView, AdminDashboardAnalyticsView, AdminCustomerViewSet,
    ExpenseViewSet, SupplierViewSet, PurchaseViewSet, NotificationViewSet,
    ProfitLossAnalyticsView, BalanceSheetAnalyticsView, CashFlowAnalyticsView, InventoryAnalyticsView,
    ExportPDFView, ExportExcelView, InvoiceViewSet, GSTSummaryView,
    PaymentLinkCreateView, PaymentRequestStatusView, PaymentWebhookView, AdminPaymentRequestViewSet, PaymentMockSettleView,
    CustomerRequestWhatsAppStatementView, WhatsAppLogViewSet,
    ExpiryBatchViewSet, ExpiryDashboardView, TriggerExpiryScanView, HealthCheckView, TestEmailView,
    CheckUsernameView, CheckEmailView, CheckPhoneView, CancelRegistrationView,
    WishlistViewSet, PromotionalBannerViewSet, StoreConfigViewSet, CustomerDashboardSummaryView,
    LogoutView
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
router.register(r'admin/expiry-batches', ExpiryBatchViewSet, basename='admin-expiry-batches')
router.register(r'wishlist', WishlistViewSet, basename='wishlist')
router.register(r'banners', PromotionalBannerViewSet, basename='banners')
router.register(r'configs', StoreConfigViewSet, basename='configs')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('auth/resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    path('auth/cancel-registration/', CancelRegistrationView.as_view(), name='cancel-registration'),
    path('auth/check-username/', CheckUsernameView.as_view(), name='check-username'),
    path('auth/check-email/', CheckEmailView.as_view(), name='check-email'),
    path('auth/check-phone/', CheckPhoneView.as_view(), name='check-phone'),
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    path('khata/my-ledger/', CustomerKhataView.as_view(), name='my-ledger'),
    path('khata/my-ledger/request-whatsapp-statement/', CustomerRequestWhatsAppStatementView.as_view(), name='request-whatsapp-statement'),
    path('checkout/', CustomerCheckoutView.as_view(), name='checkout'),
    path('customer/summary/', CustomerDashboardSummaryView.as_view(), name='customer-summary'),
    path('admin/analytics/', AdminDashboardAnalyticsView.as_view(), name='admin-analytics'),
    
    # Online Payments
    path('payments/create-link/', PaymentLinkCreateView.as_view(), name='payment-create-link'),
    path('payments/<int:pk>/status/', PaymentRequestStatusView.as_view(), name='payment-status'),
    path('payments/webhook/', PaymentWebhookView.as_view(), name='payment-webhook'),
    path('payments/mock-settle/<str:link_id>/', PaymentMockSettleView.as_view(), name='payment-mock-settle'),
    
    # Financial Analytics
    path('admin/analytics/pl/', ProfitLossAnalyticsView.as_view(), name='analytics-pl'),
    path('admin/analytics/balance-sheet/', BalanceSheetAnalyticsView.as_view(), name='analytics-balance-sheet'),
    path('admin/analytics/cash-flow/', CashFlowAnalyticsView.as_view(), name='analytics-cash-flow'),
    path('admin/analytics/inventory/', InventoryAnalyticsView.as_view(), name='analytics-inventory'),
    path('admin/analytics/gst/', GSTSummaryView.as_view(), name='analytics-gst'),
    
    # PDF & Excel Exports
    path('exports/pdf/', ExportPDFView.as_view(), name='export-pdf'),
    path('exports/excel/', ExportExcelView.as_view(), name='export-excel'),

    # Expiry Tracking (Gap 6)
    path('admin/expiry-dashboard/', ExpiryDashboardView.as_view(), name='expiry-dashboard'),
    path('admin/expiry-scan/', TriggerExpiryScanView.as_view(), name='expiry-scan'),

    # Health Check
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('auth/test-email/', TestEmailView.as_view(), name='test-email'),

    path('', include(router.urls)),
]

