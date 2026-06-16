from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Product, KhataProfile, Transaction, Expense, Supplier, SupplierTransaction, Purchase, Notification, Invoice, InvoiceItem, PaymentRequest, WhatsAppLog

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone_number', 'role', 'password', 'confirm_password', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"password": "Passwords must match."})
        
        # Ensure email is unique
        email = attrs.get('email')
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
            
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        role = validated_data.get('role', 'CUSTOMER')
        
        # If no users exist yet, make the first user an Admin (convenient for setup)
        if not User.objects.exists():
            role = 'ADMIN'
            
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            phone_number=validated_data.get('phone_number', ''),
            role=role,
            password=validated_data['password']
        )
        return user

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

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

    class Meta:
        model = KhataProfile
        fields = ('id', 'user', 'current_balance', 'total_credit', 'total_paid', 'credit_limit', 'is_accessible_by_customer', 'transactions', 'created_at', 'updated_at')
        read_only_fields = ('id', 'current_balance', 'total_credit', 'total_paid', 'credit_limit', 'created_at', 'updated_at')

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Support logging in with email
        username_or_email = attrs.get('username')
        if username_or_email and '@' in username_or_email:
            try:
                user_obj = User.objects.get(email=username_or_email)
                attrs['username'] = user_obj.username
            except User.DoesNotExist:
                pass

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
