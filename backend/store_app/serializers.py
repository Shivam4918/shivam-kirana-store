from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Product, KhataProfile, Transaction, Expense, Supplier, SupplierTransaction, Purchase, Notification, Invoice, InvoiceItem, PaymentRequest, WhatsAppLog, ExpiryBatch, PendingRegistration, ProductReview, WishlistItem, PromotionalBanner, StoreConfig, Order, OrderItem

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone_number', 'role', 'password', 'confirm_password', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate(self, attrs):
        import re
        import socket
        from django.utils import timezone
        
        # Update expired registrations status to 'expired' first so credentials can be reused immediately
        PendingRegistration.objects.filter(status='pending', otp_expiry__lt=timezone.now()).update(status='expired')
        
        # 1. Password Matching
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')
        if password != confirm_password:
            raise serializers.ValidationError({"password": "Passwords must match."})
        
        # 2. Username Validation
        username = attrs.get('username', '')
        if username:
            username = re.sub(r'\s+', '', username.strip())
            attrs['username'] = username
            
        if not username:
            raise serializers.ValidationError({"username": "Username is required."})
            
        if len(username) < 3 or len(username) > 30:
            raise serializers.ValidationError({"username": "Username must be between 3 and 30 characters."})
            
        if not username[0].isalpha():
            raise serializers.ValidationError({"username": "Username must start with a letter."})
            
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            raise serializers.ValidationError({"username": "Username can only contain letters, numbers, and underscores."})
            
        if '__' in username:
            raise serializers.ValidationError({"username": "Username cannot contain consecutive underscores."})
            
        if username.endswith('_'):
            raise serializers.ValidationError({"username": "Username cannot end with an underscore."})
            
        reserved = {'admin', 'administrator', 'root', 'superadmin', 'support', 'help', 'owner', 'system', 'test', 'guest', 'api', 'staff', 'null', 'undefined'}
        if username.lower() in reserved:
            raise serializers.ValidationError({"username": "This username is reserved and cannot be used."})
            
        existing_user_query = User.objects.filter(username__iexact=username)
        if self.instance:
            existing_user_query = existing_user_query.exclude(pk=self.instance.pk)
        if existing_user_query.exists():
            raise serializers.ValidationError({"username": "A user with this username already exists."})
            
        if PendingRegistration.objects.filter(username__iexact=username, status='pending', otp_expiry__gt=timezone.now()).exists():
            raise serializers.ValidationError({"username": "A registration for this username is currently pending verification."})

        # 3. Email Validation
        email = attrs.get('email', '')
        if email:
            email = email.strip().lower()
            attrs['email'] = email
            
        if not email:
            raise serializers.ValidationError({"email": "Email is required."})
            
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email) or '..' in email:
            raise serializers.ValidationError({"email": "Please enter a valid email address format."})
            
        # Check disposable domain
        domain = email.split('@')[1] if '@' in email else ''
        disposable_domains = {
            'tempmail.com', 'mailinator.com', '10minutemail.com', 'yopmail.com', 
            'guerrillamail.com', 'dispostable.com', 'getairmail.com', 'sharklasers.com',
            'temp-mail.org', 'tempmailaddress.com', 'boun.cr', 'trashmail.com'
        }
        if domain in disposable_domains:
            raise serializers.ValidationError({"email": "Disposable or temporary email domains are blocked."})
            
        # DNS domain validation
        import sys
        if 'test' not in sys.argv:
            try:
                socket.getaddrinfo(domain, None)
            except socket.gaierror:
                raise serializers.ValidationError({"email": "Invalid email domain or no active DNS record found."})
            
        existing_email_query = User.objects.filter(email__iexact=email)
        if self.instance:
            existing_email_query = existing_email_query.exclude(pk=self.instance.pk)
        if existing_email_query.exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
            
        if PendingRegistration.objects.filter(email__iexact=email, status='pending', otp_expiry__gt=timezone.now()).exists():
            raise serializers.ValidationError({"email": "A registration for this email is currently pending verification."})

        # 4. Phone Number Validation
        phone = attrs.get('phone_number', '')
        if phone:
            phone = phone.strip().replace(' ', '')
            attrs['phone_number'] = phone
            
        if not phone:
            raise serializers.ValidationError({"phone_number": "Phone number is required."})
            
        if not re.match(r'^[6-9]\d{9}$', phone):
            raise serializers.ValidationError({"phone_number": "Phone number must start with 6-9 and contain exactly 10 digits."})
            
        existing_phone_query = User.objects.filter(phone_number=phone)
        if self.instance:
            existing_phone_query = existing_phone_query.exclude(pk=self.instance.pk)
        if existing_phone_query.exists():
            raise serializers.ValidationError({"phone_number": "A user with this phone number already exists."})
            
        if PendingRegistration.objects.filter(phone_number=phone, status='pending', otp_expiry__gt=timezone.now()).exists():
            raise serializers.ValidationError({"phone_number": "A registration for this phone number is currently pending verification."})

        # 5. Password Complexity Validation
        if not password:
            raise serializers.ValidationError({"password": "Password is required."})
            
        if len(password) < 8 or len(password) > 128:
            raise serializers.ValidationError({"password": "Password must be between 8 and 128 characters long."})
            
        if not re.search(r'[A-Z]', password):
            raise serializers.ValidationError({"password": "Password must contain at least one uppercase letter."})
            
        if not re.search(r'[a-z]', password):
            raise serializers.ValidationError({"password": "Password must contain at least one lowercase letter."})
            
        if not re.search(r'\d', password):
            raise serializers.ValidationError({"password": "Password must contain at least one number."})
            
        if not re.search(r'[@$!%*?&#]', password):
            raise serializers.ValidationError({"password": "Password must contain at least one special character."})
            
        # Cannot contain username, email name, or phone number
        if username and username.lower() in password.lower():
            raise serializers.ValidationError({"password": "Password cannot contain your username."})
            
        email_name = email.split('@')[0] if email else ''
        if email_name and email_name.lower() in password.lower():
            raise serializers.ValidationError({"password": "Password cannot contain your email name."})
            
        if phone and phone in password:
            raise serializers.ValidationError({"password": "Password cannot contain your phone number."})
            
        # Prevent weak dictionary/common passwords
        common_passwords = {
            'password', '12345678', 'qwerty', '123456789', 'password123', 'admin123', 
            'letmein1', 'admin', 'administrator', 'guest', 'root', 'user123', 'pass123', 
            'welcome', 'welcome123', 'shivam123', 'kirana123', 'kirana', 'shivam'
        }
        if password.lower() in common_passwords:
            raise serializers.ValidationError({"password": "This password is too common and weak. Please choose a stronger password."})
            
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        role = validated_data.get('role', 'CUSTOMER')
        
        # If no users exist yet, make the first user an Admin (convenient for setup)
        if not User.objects.exists():
            role = 'ADMIN'
            
        is_active = (role == 'ADMIN')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            phone_number=validated_data.get('phone_number', ''),
            role=role,
            password=validated_data['password'],
            is_active=is_active
        )
        return user

class ProductSerializer(serializers.ModelSerializer):
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    badges = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def _get_prefetched_reviews(self, obj):
        if not hasattr(obj, '_prefetched_reviews_list'):
            obj._prefetched_reviews_list = list(obj.reviews.all())
        return obj._prefetched_reviews_list

    def _get_prefetched_transactions(self, obj):
        if not hasattr(obj, '_prefetched_transactions_list'):
            obj._prefetched_transactions_list = list(obj.transactions.all())
        return obj._prefetched_transactions_list

    def get_average_rating(self, obj):
        reviews = self._get_prefetched_reviews(obj)
        approved_ratings = [r.rating for r in reviews if getattr(r, 'is_approved', True)]
        if not approved_ratings:
            return 5.0
        avg = sum(approved_ratings) / len(approved_ratings)
        return round(avg, 1)

    def get_total_reviews(self, obj):
        reviews = self._get_prefetched_reviews(obj)
        approved_reviews = [r for r in reviews if getattr(r, 'is_approved', True)]
        return len(approved_reviews)

    def get_badges(self, obj):
        from django.utils import timezone
        badges_list = []
        if (timezone.now() - obj.created_at).days <= 15:
            badges_list.append("🆕 New Arrival")
        if obj.id % 3 == 0:
            badges_list.append("💸 Discount")
        
        # Best Seller if total sold units >= 10 (computed in memory)
        transactions = self._get_prefetched_transactions(obj)
        total_sold = sum(t.quantity for t in transactions if t.transaction_type == 'CREDIT' and t.quantity is not None)
        if total_sold >= 10:
            badges_list.append("🔥 Best Seller")
            badges_list.append("⚡ Fast Moving")
            
        # Top Rated if rating is >= 4.5
        reviews = self._get_prefetched_reviews(obj)
        approved_ratings = [r.rating for r in reviews if getattr(r, 'is_approved', True)]
        if approved_ratings:
            avg = sum(approved_ratings) / len(approved_ratings)
            if avg >= 4.5:
                badges_list.append("⭐ Top Rated")
        return badges_list

    def validate_gst_rate(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("GST rate must be between 0% and 100%.")
        return value

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate_stock_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock quantity cannot be negative.")
        return value

class TransactionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Transaction
        fields = ('id', 'transaction_type', 'amount', 'description', 'remaining_balance_at_snapshot', 'created_at', 'product', 'product_name', 'quantity', 'invoice')
        read_only_fields = ('id', 'remaining_balance_at_snapshot', 'created_at', 'product_name', 'invoice')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Transaction amount must be greater than zero.")
        return value

class KhataProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    transactions = TransactionSerializer(many=True, read_only=True)
    current_due = serializers.SerializerMethodField()
    last_payment_amount = serializers.SerializerMethodField()
    last_payment_date = serializers.SerializerMethodField()
    next_due_date = serializers.SerializerMethodField()

    class Meta:
        model = KhataProfile
        fields = ('id', 'user', 'current_balance', 'total_credit', 'total_paid', 'credit_limit', 'is_accessible_by_customer', 'transactions', 'created_at', 'updated_at',
                  'loyalty_points', 'points_earned', 'points_redeemed', 'current_due', 'last_payment_amount', 'last_payment_date', 'next_due_date')
        read_only_fields = ('id', 'current_balance', 'total_credit', 'total_paid', 'credit_limit', 'created_at', 'updated_at', 'loyalty_points', 'points_earned', 'points_redeemed')

    def get_current_due(self, obj):
        return float(obj.current_balance)

    def get_last_payment_amount(self, obj):
        last_payment = obj.transactions.filter(transaction_type='DEBIT').order_by('-created_at').first()
        return float(last_payment.amount) if last_payment else 0.0

    def get_last_payment_date(self, obj):
        last_payment = obj.transactions.filter(transaction_type='DEBIT').order_by('-created_at').first()
        return last_payment.created_at if last_payment else None

    def get_next_due_date(self, obj):
        if obj.current_balance > 0:
            from django.utils import timezone
            import datetime
            today = timezone.localtime(timezone.now()).date()
            if today.month == 12:
                next_month = datetime.date(today.year + 1, 1, 5)
            else:
                next_month = datetime.date(today.year, today.month + 1, 5)
            return next_month
        return None

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Support logging in with email
        username_or_email = attrs.get('username')
        password = attrs.get('password')
        
        user_obj = None
        if username_or_email:
            if '@' in username_or_email:
                try:
                    user_obj = User.objects.get(email=username_or_email)
                    attrs['username'] = user_obj.username
                except User.DoesNotExist:
                    pass
            else:
                try:
                    user_obj = User.objects.get(username=username_or_email)
                except User.DoesNotExist:
                    pass

        # If user exists and password is correct but inactive, throw verification warning
        if user_obj and user_obj.check_password(password):
            if not user_obj.is_active:
                raise serializers.ValidationError({
                    "detail": "Please verify your email address before logging in."
                })

        # If user does not exist in CustomUser, check if there is an unexpired active pending registration
        if not user_obj and username_or_email:
            from .models import PendingRegistration
            from django.contrib.auth.hashers import check_password
            from django.utils import timezone
            
            # Update expired registrations status to 'expired' first
            PendingRegistration.objects.filter(status='pending', otp_expiry__lt=timezone.now()).update(status='expired')
            
            pending_obj = None
            if '@' in username_or_email:
                pending_obj = PendingRegistration.objects.filter(email__iexact=username_or_email, status='pending', otp_expiry__gt=timezone.now()).first()
            else:
                pending_obj = PendingRegistration.objects.filter(username__iexact=username_or_email, status='pending', otp_expiry__gt=timezone.now()).first()
                
            if pending_obj and check_password(password, pending_obj.password_hash):
                raise serializers.ValidationError({
                    "detail": "Please verify your email address before logging in."
                })

        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'phone_number': self.user.phone_number,
            'role': self.user.role,
        }
        return data

class ExpenseSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('id', 'created_by', 'created_at')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Expense amount must be greater than zero.")
        return value

class SupplierTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierTransaction
        fields = '__all__'
        read_only_fields = ('id', 'created_at')

class SupplierSerializer(serializers.ModelSerializer):
    transactions = SupplierTransactionSerializer(many=True, read_only=True)
    remaining_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Supplier
        fields = '__all__'
        read_only_fields = ('id', 'amount_due', 'amount_paid', 'created_at', 'updated_at')

class PurchaseSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Purchase
        fields = '__all__'
        read_only_fields = ('id', 'created_at')

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Purchase quantity must be greater than zero.")
        return value

    def validate_cost_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Cost price must be greater than zero.")
        return value

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('id', 'created_at')


class InvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    hsn_code = serializers.CharField(source='product.hsn_code', read_only=True)

    class Meta:
        model = InvoiceItem
        fields = '__all__'


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    customer_username = serializers.CharField(source='customer.user.username', read_only=True)
    customer_phone = serializers.CharField(source='customer.user.phone_number', read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'


class PaymentRequestSerializer(serializers.ModelSerializer):
    customer_username = serializers.CharField(source='khata_profile.user.username', read_only=True)

    class Meta:
        model = PaymentRequest
        fields = '__all__'
        read_only_fields = ('id', 'razorpay_payment_link_id', 'razorpay_payment_link_url', 'status', 'razorpay_payment_id', 'razorpay_signature', 'created_at', 'updated_at', 'completed_at')


class WhatsAppLogSerializer(serializers.ModelSerializer):
    customer_username = serializers.CharField(source='khata_profile.user.username', read_only=True)
    customer_name = serializers.CharField(source='khata_profile.user.first_name', read_only=True)

    class Meta:
        model = WhatsAppLog
        fields = '__all__'


class ExpiryBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_category = serializers.CharField(source='product.category', read_only=True)
    days_until_expiry = serializers.SerializerMethodField()
    expiry_status = serializers.SerializerMethodField()

    class Meta:
        model = ExpiryBatch
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_days_until_expiry(self, obj):
        from django.utils import timezone
        today = timezone.now().date()
        delta = (obj.expiry_date - today).days
        return delta

    def get_expiry_status(self, obj):
        from django.utils import timezone
        today = timezone.now().date()
        delta = (obj.expiry_date - today).days
        if delta < 0:
            return 'EXPIRED'
        elif delta <= 7:
            return 'EXPIRING_SOON'
        elif delta <= 30:
            return 'EXPIRING_MONTH'
        return 'OK'


class ProductReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ProductReview
        fields = '__all__'
        read_only_fields = ('id', 'user', 'is_verified_purchase', 'is_approved', 'created_at', 'updated_at')


class WishlistItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = WishlistItem
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at')


class PromotionalBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromotionalBanner
        fields = '__all__'


class StoreConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreConfig
        fields = '__all__'


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    hsn_code = serializers.CharField(source='product.hsn_code', read_only=True)

    class Meta:
        model = OrderItem
        fields = '__all__'


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_username = serializers.CharField(source='customer.user.username', read_only=True)
    customer_phone = serializers.CharField(source='customer.user.phone_number', read_only=True)

    class Meta:
        model = Order
        fields = '__all__'


