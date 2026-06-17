import os
import django
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'store_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from store_app.models import Product, KhataProfile, Transaction, Expense, Supplier, SupplierTransaction, Purchase, Notification

User = get_user_model()

def seed():
    print("Seeding database...")
    # Clean up old default admin users if they exist for security
    User.objects.filter(username__in=['admin', 'testuser']).delete()

    # 1. Create Admin
    admin_user, created = User.objects.get_or_create(
        username='shivam1121@',
        email='admin@shivam.com',
        defaults={
            'phone_number': '9876543210',
            'role': 'ADMIN',
            'is_staff': True,
            'is_superuser': True,
        }
    )
    if created or not admin_user.check_password('Prajapatiadmin2005#$@') or not admin_user.is_staff or not admin_user.is_superuser:
        admin_user.set_password('Prajapatiadmin2005#$@')
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()
        print("Admin user created/updated.")

    # 2. Create Customer
    customer_user, created = User.objects.get_or_create(
        username='shyam',
        email='shyam@gmail.com',
        defaults={
            'phone_number': '9988776655',
            'role': 'CUSTOMER'
        }
    )
    if created or not customer_user.check_password('shyam123'):
        customer_user.set_password('shyam123')
        customer_user.save()
        print("Customer user created/updated.")

    # 3. Create Products
    products_data = [
        {
            'name': 'Premium Basmati Rice',
            'description': 'Long-grain aromatic basmati rice, aged for 1 year.',
            'price': Decimal('110.00'),
            'cost_price': Decimal('85.00'),
            'stock_quantity': 150,
            'category': 'Grains',
            'image': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80'
        },
        {
            'name': 'Organic Wheat Flour (Atta)',
            'description': '100% stone-ground whole wheat flour.',
            'price': Decimal('45.00'),
            'cost_price': Decimal('32.00'),
            'stock_quantity': 80,
            'category': 'Flours',
            'image': 'https://images.unsplash.com/photo-1574325131876-a79997886145?auto=format&fit=crop&w=400&q=80'
        },
        {
            'name': 'Cold Pressed Mustard Oil',
            'description': 'Pure cold-pressed mustard oil for healthy cooking.',
            'price': Decimal('175.00'),
            'cost_price': Decimal('130.00'),
            'stock_quantity': 45,
            'category': 'Oils',
            'image': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80'
        },
        {
            'name': 'Toor Dal (Arhar)',
            'description': 'Premium quality unpolished split pigeon peas.',
            'price': Decimal('140.00'),
            'cost_price': Decimal('100.00'),
            'stock_quantity': 90,
            'category': 'Pulses',
            'image': 'https://images.unsplash.com/photo-1547825407-2d060104b7c8?auto=format&fit=crop&w=400&q=80'
        },
        {
            'name': 'Tata Salt',
            'description': 'Iodized vacuum evaporated salt.',
            'price': Decimal('28.00'),
            'cost_price': Decimal('18.00'),
            'stock_quantity': 200,
            'category': 'Spices',
            'image': 'https://images.unsplash.com/photo-1614742467144-8d4cb2820a44?auto=format&fit=crop&w=400&q=80'
        },
        {
            'name': 'Refined Sugar',
            'description': 'Pure white crystal sugar.',
            'price': Decimal('42.00'),
            'cost_price': Decimal('28.00'),
            'stock_quantity': 120,
            'category': 'Sweeteners',
            'image': 'https://images.unsplash.com/photo-1581781880940-08990145dfbb?auto=format&fit=crop&w=400&q=80'
        }
    ]

    created_products = []
    for p_data in products_data:
        p, created = Product.objects.update_or_create(
            name=p_data['name'],
            defaults=p_data
        )
        created_products.append(p)
        print(f"Product {p.name} created/updated.")

    # 4. Add transactions for Shyam
    khata = customer_user.khata_profile
    khata.transactions.all().delete()
    khata.current_balance = Decimal('0.00')
    khata.total_credit = Decimal('0.00')
    khata.total_paid = Decimal('0.00')
    khata.save()

    t1 = Transaction.objects.create(
        khata_profile=khata,
        transaction_type='CREDIT',
        amount=Decimal('1250.00'),
        description='Bought Premium Rice & Oils',
        product=created_products[0],
        quantity=10
    )
    t2 = Transaction.objects.create(
        khata_profile=khata,
        transaction_type='CREDIT',
        amount=Decimal('350.00'),
        description='Bought Organic Wheat Atta',
        product=created_products[1],
        quantity=5
    )
    t3 = Transaction.objects.create(
        khata_profile=khata,
        transaction_type='DEBIT',
        amount=Decimal('500.00'),
        description='UPI payment received'
    )
    print("Transactions created for Shyam.")
    khata.is_accessible_by_customer = True
    khata.save()

    # 5. Create Expenses
    Expense.objects.all().delete()
    today = timezone.localtime(timezone.now()).date()
    
    Expense.objects.create(
        title='Monthly Shop Rent',
        category='RENT',
        amount=Decimal('15000.00'),
        expense_date=today - timedelta(days=5),
        created_by=admin_user
    )
    Expense.objects.create(
        title='Electricity Bill May',
        category='ELECTRICITY',
        amount=Decimal('3400.00'),
        expense_date=today - timedelta(days=2),
        created_by=admin_user
    )
    Expense.objects.create(
        title='Internet Wi-Fi',
        category='INTERNET',
        amount=Decimal('799.00'),
        expense_date=today - timedelta(days=1),
        created_by=admin_user
    )
    Expense.objects.create(
        title='Staff Helper Payout',
        category='SALARY',
        amount=Decimal('8000.00'),
        expense_date=today - timedelta(days=4),
        created_by=admin_user
    )
    Expense.objects.create(
        title='Miscellaneous Tea & Cleaning',
        category='MISC',
        amount=Decimal('450.00'),
        expense_date=today,
        created_by=admin_user
    )
    print("Expenses seeded.")

    # 6. Create Suppliers
    Supplier.objects.all().delete()
    s1 = Supplier.objects.create(
        name="Laxmi Grain Distributors",
        contact_number="9876123450",
        email="contact@laxmigrains.com",
        address="12, Wholesale Mandi, Indore, MP",
        gst_number="23AAAAA1234A1Z1",
        notes="Grains and pulses wholesale supplier"
    )
    s2 = Supplier.objects.create(
        name="Tata Consumer Products Ltd",
        contact_number="9988112233",
        email="info@tataconsumer.com",
        address="Commercial Plaza, Mumbai",
        gst_number="27BBBBB5678B2Z2",
        notes="Spices, tea and salt vendor"
    )
    print("Suppliers seeded.")

    # 7. Create Purchases
    Purchase.objects.all().delete()
    Purchase.objects.create(
        supplier=s1,
        product=created_products[0], # Basmati Rice
        quantity=50,
        cost_price=Decimal('80.00'),
        gst=Decimal('5.00'),
        purchase_date=today - timedelta(days=10)
    )
    Purchase.objects.create(
        supplier=s2,
        product=created_products[4], # tata salt
        quantity=100,
        cost_price=Decimal('16.00'),
        gst=Decimal('12.00'),
        purchase_date=today - timedelta(days=8)
    )
    print("Purchases seeded.")

    # 8. Record some supplier payments
    SupplierTransaction.objects.create(
        supplier=s1,
        transaction_type='PAYMENT',
        amount=Decimal('2000.00'),
        description='Cash payment voucher #98',
        date=today - timedelta(days=3)
    )
    print("Supplier payments seeded.")

    # 9. Create Notifications
    Notification.objects.all().delete()
    Notification.objects.create(
        user=admin_user,
        message="Product Tata Salt stock level is below 10 (Currently: 5 units remaining).",
        notification_type='LOW_STOCK'
    )
    Notification.objects.create(
        user=admin_user,
        message="Purchase invoice of ₹4200.00 logged for Laxmi Grain Distributors.",
        notification_type='SUPPLIER_DUE'
    )
    print("Notifications seeded.")
    print("Database seeding completed successfully.")

if __name__ == '__main__':
    seed()
