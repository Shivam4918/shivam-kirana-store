from store_app.models import Notification, CustomUser
from django.contrib.auth import get_user_model

User = get_user_model()

def notify_admin(message, notification_type):
    # Find all admins
    admins = User.objects.filter(role='ADMIN')
    for admin in admins:
        Notification.objects.create(
            user=admin,
            message=message,
            notification_type=notification_type
        )

def check_and_notify_stock(product):
    if product.stock_quantity == 0:
        message = f"Product '{product.name}' is OUT OF STOCK. Please restock immediately."
        notify_admin(message, 'OUT_OF_STOCK')
    elif product.stock_quantity <= 10: # low stock threshold = 10
        message = f"Product '{product.name}' is running LOW on stock ({product.stock_quantity} remaining)."
        notify_admin(message, 'LOW_STOCK')

def check_and_notify_customer_khata(khata_profile):
    if khata_profile.current_balance >= 5000:
        # Notify Admin
        admin_msg = f"Customer '{khata_profile.user.username}' has a high outstanding balance of ₹{khata_profile.current_balance}."
        notify_admin(admin_msg, 'HIGH_OUTSTANDING')
        
        # Notify Customer
        cust_msg = f"Your outstanding balance has reached a high level of ₹{khata_profile.current_balance}. Please settle due balances."
        Notification.objects.create(
            user=khata_profile.user,
            message=cust_msg,
            notification_type='HIGH_OUTSTANDING'
        )

def notify_supplier_due(supplier, amount):
    message = f"Recorded purchase from supplier '{supplier.name}'. Outstanding due increased by ₹{amount}."
    notify_admin(message, 'SUPPLIER_DUE')
