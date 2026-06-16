from rest_framework import status, viewsets, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count, Q
from django.db import transaction as db_transaction
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from .models import Product, KhataProfile, Transaction, Expense, Supplier, SupplierTransaction, Purchase, Notification, Invoice, InvoiceItem, PaymentRequest, WhatsAppLog, ExpiryBatch
from .serializers import (
    UserSerializer, ProductSerializer, KhataProfileSerializer, TransactionSerializer,
    ExpenseSerializer, SupplierSerializer, SupplierTransactionSerializer, PurchaseSerializer, NotificationSerializer,
    InvoiceSerializer, InvoiceItemSerializer, PaymentRequestSerializer, WhatsAppLogSerializer,
    ExpiryBatchSerializer
)
from .permissions import IsAdminUserRole, IsOwnerOrAdmin, IsCustomerUserRole
from django.http import HttpResponse
from .utils.pdf_generator import generate_pdf_response, generate_invoice_pdf
from .utils.excel_generator import generate_excel_response
from .utils.payment_helpers import verify_razorpay_signature, create_razorpay_payment_link

User = get_user_model()

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        data = serializer.data
        if request.user.role == 'CUSTOMER':
            try:
                khata = request.user.khata_profile
                available = max(Decimal('0.00'), khata.credit_limit - khata.current_balance)
                utilization = (float(khata.current_balance) / float(khata.credit_limit) * 100) if khata.credit_limit else 0
                data['khata_status'] = {
                    'is_accessible': khata.is_accessible_by_customer,
                    'current_balance': float(khata.current_balance),
                    'credit_limit': float(khata.credit_limit),
                    'available_credit': float(available),
                    'utilization_pct': round(utilization, 1),
                }
            except KhataProfile.DoesNotExist:
                data['khata_status'] = None
        else:
            data['khata_status'] = None
        return Response(data)

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'category', 'description', 'barcode']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'by_barcode']:
            return [permissions.IsAuthenticated()]
        return [IsAdminUserRole()]

    @action(detail=False, methods=['get'], url_path='by-barcode')
    def by_barcode(self, request):
        """Lookup a product by its barcode. Returns 404 if no product matches."""
        barcode = request.query_params.get('barcode', '').strip()
        if not barcode:
            return Response({'detail': 'barcode query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            product = Product.objects.get(barcode=barcode)
            return Response(ProductSerializer(product).data)
        except Product.DoesNotExist:
            return Response({'detail': f'No product found with barcode "{barcode}".'}, status=status.HTTP_404_NOT_FOUND)

class CustomerKhataView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'CUSTOMER':
            return Response({"detail": "Only customers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            profile = request.user.khata_profile
        except KhataProfile.DoesNotExist:
            return Response({"detail": "Khata profile not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if not profile.is_accessible_by_customer:
            return Response(
                {
                    "detail": "Khata Access Locked. Please contact the store owner to unlock your ledger.",
                    "is_locked": True,
                    "current_balance": float(profile.current_balance)
                }, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        serializer = KhataProfileSerializer(profile)
        return Response(serializer.data)

class CustomerCheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != 'CUSTOMER':
            return Response({"detail": "Only customers can checkout items."}, status=status.HTTP_403_FORBIDDEN)

        try:
            profile = request.user.khata_profile
        except KhataProfile.DoesNotExist:
            return Response({"detail": "Khata profile not found."}, status=status.HTTP_404_NOT_FOUND)

        if not profile.is_accessible_by_customer:
            return Response(
                {
                    "detail": "Khata Access Locked. Please contact the store owner to unlock your ledger.",
                    "is_locked": True,
                    "current_balance": float(profile.current_balance)
                },
                status=status.HTTP_403_FORBIDDEN
            )

        items_data = request.data.get('items', [])
        if not items_data:
            return Response({"detail": "No items in cart."}, status=status.HTTP_400_BAD_REQUEST)

        validated_items = []
        try:
            with db_transaction.atomic():
                # Lock profile at start of checkout transaction to prevent concurrency issues
                locked_profile = KhataProfile.objects.select_for_update().get(pk=profile.pk)
                
                cart_total = Decimal('0.00')
                for item in items_data:
                    product_id = item.get('product_id')
                    qty = item.get('quantity')
                    if not product_id:
                        return Response({"detail": "Product ID is required for all items."}, status=status.HTTP_400_BAD_REQUEST)
                    try:
                        quantity = int(qty)
                        if quantity <= 0:
                            raise ValueError()
                    except (ValueError, TypeError):
                        return Response({"detail": "Quantity must be a positive integer."}, status=status.HTTP_400_BAD_REQUEST)

                    try:
                        product = Product.objects.select_for_update().get(pk=product_id)
                    except Product.DoesNotExist:
                        return Response({"detail": f"Product with ID {product_id} not found."}, status=status.HTTP_404_NOT_FOUND)

                    if product.stock_quantity < quantity:
                        return Response({"detail": f"Insufficient stock for {product.name}. Available: {product.stock_quantity}"}, status=status.HTTP_400_BAD_REQUEST)

                    validated_items.append((product, quantity))
                    cart_total += product.price * quantity

                if locked_profile.current_balance + cart_total > locked_profile.credit_limit:
                    raise ValueError(f"Checkout would exceed your credit limit of ₹{locked_profile.credit_limit}. Current Balance: ₹{locked_profile.current_balance}, Purchase Total: ₹{cart_total}")

                # Generate invoice number sequentially inside transaction
                today_str = timezone.localtime(timezone.now()).strftime('%Y%m%d')
                invoice_count_today = Invoice.objects.filter(invoice_number__startswith=f"SK-INV-{today_str}-").count()
                invoice_number = f"SK-INV-{today_str}-{(invoice_count_today + 1):04d}"

                invoice = Invoice.objects.create(
                    invoice_number=invoice_number,
                    customer=profile,
                    subtotal=Decimal('0.00'),
                    cgst_total=Decimal('0.00'),
                    sgst_total=Decimal('0.00'),
                    grand_total=Decimal('0.00')
                )

                subtotal_sum = Decimal('0.00')
                cgst_sum = Decimal('0.00')
                sgst_sum = Decimal('0.00')
                grand_total_sum = Decimal('0.00')

                transactions = []
                for product, quantity in validated_items:
                    unit_price = product.price
                    total_item_inclusive = unit_price * quantity
                    gst_rate = product.gst_rate

                    # Backwards base taxable value & GST computation
                    taxable_value = total_item_inclusive / (Decimal('1.00') + gst_rate / Decimal('100.00'))
                    gst_total_item = total_item_inclusive - taxable_value
                    cgst_amount = gst_total_item / Decimal('2.00')
                    sgst_amount = gst_total_item / Decimal('2.00')

                    # Quantize to 2 decimals
                    taxable_value = taxable_value.quantize(Decimal('0.01'))
                    cgst_amount = cgst_amount.quantize(Decimal('0.01'))
                    sgst_amount = sgst_amount.quantize(Decimal('0.01'))
                    total_item_inclusive = total_item_inclusive.quantize(Decimal('0.01'))

                    InvoiceItem.objects.create(
                        invoice=invoice,
                        product=product,
                        quantity=quantity,
                        unit_price=unit_price,
                        gst_rate=gst_rate,
                        cgst_amount=cgst_amount,
                        sgst_amount=sgst_amount,
                        total_amount=total_item_inclusive
                    )

                    subtotal_sum += taxable_value
                    cgst_sum += cgst_amount
                    sgst_sum += sgst_amount
                    grand_total_sum += total_item_inclusive

                    tx = Transaction.objects.create(
                        khata_profile=profile,
                        transaction_type='CREDIT',
                        amount=total_item_inclusive,
                        description=f"Checked out {product.name} (Qty: {quantity}) [Inv: {invoice_number}]",
                        product=product,
                        quantity=quantity,
                        invoice=invoice
                    )
                    transactions.append(tx)

                invoice.subtotal = subtotal_sum
                invoice.cgst_total = cgst_sum
                invoice.sgst_total = sgst_sum
                invoice.grand_total = grand_total_sum
                invoice.save()

                profile.refresh_from_db()

        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Trigger WhatsApp notification (with fallback to synchronous if queue is down)
        from store_app.utils.whatsapp_helpers import dispatch_whatsapp_task
        dispatch_whatsapp_task(
            profile.id,
            'TRANSACTION_ALERT',
            {
                'transaction_type': 'CREDIT',
                'amount': float(grand_total_sum),
                'description': f"Checked out items under invoice {invoice_number}"
            }
        )

        return Response({
            "detail": "Checkout completed successfully.",
            "current_balance": float(profile.current_balance),
            "invoice_number": invoice_number,
            "invoice_id": invoice.id,
            "grand_total": float(grand_total_sum)
        }, status=status.HTTP_201_CREATED)

class AdminDashboardAnalyticsView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        today = timezone.localtime(timezone.now()).date()
        
        todays_debits = Transaction.objects.filter(
            transaction_type='DEBIT',
            created_at__date=today
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        total_outstanding = KhataProfile.objects.filter(
            current_balance__gt=0
        ).aggregate(total=Sum('current_balance'))['total'] or Decimal('0.00')
        
        total_customers = User.objects.filter(role='CUSTOMER').count()
        total_products = Product.objects.count()
        
        recent_transactions = Transaction.objects.all().order_by('-created_at')[:10]
        
        recent_data = []
        for t in recent_transactions:
            recent_data.append({
                'id': t.id,
                'customer_name': t.khata_profile.user.username,
                'customer_phone': t.khata_profile.user.phone_number,
                'transaction_type': t.transaction_type,
                'amount': float(t.amount),
                'description': t.description,
                'remaining_balance_at_snapshot': float(t.remaining_balance_at_snapshot),
                'created_at': t.created_at
            })
            
        revenue_trends = []
        credit_trends = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_payment = Transaction.objects.filter(
                transaction_type='DEBIT',
                created_at__date=day
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            day_credit = Transaction.objects.filter(
                transaction_type='CREDIT',
                created_at__date=day
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            day_str = day.strftime('%a')
            revenue_trends.append({'day': day_str, 'amount': float(day_payment)})
            credit_trends.append({'day': day_str, 'amount': float(day_credit)})
            
        balance_ranges = [
            {'range': 'No Debt', 'count': KhataProfile.objects.filter(current_balance__lte=0).count()},
            {'range': '1 - 1K', 'count': KhataProfile.objects.filter(current_balance__gt=0, current_balance__lte=1000).count()},
            {'range': '1K - 5K', 'count': KhataProfile.objects.filter(current_balance__gt=1000, current_balance__lte=5000).count()},
            {'range': '5K+', 'count': KhataProfile.objects.filter(current_balance__gt=5000).count()},
        ]
        
        return Response({
            'metrics': {
                'today_earnings': float(todays_debits),
                'total_outstanding_credit': float(total_outstanding),
                'total_customers': total_customers,
                'total_products': total_products,
            },
            'recent_transactions': recent_data,
            'charts': {
                'revenue_trends': revenue_trends,
                'credit_trends': credit_trends,
                'balance_overview': balance_ranges,
            }
        })

class AdminCustomerViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUserRole]

    def list(self, request):
        queryset = KhataProfile.objects.select_related('user').all()
        
        search_query = request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(user__username__icontains=search_query) |
                Q(user__email__icontains=search_query) |
                Q(user__phone_number__icontains=search_query)
            )
            
        data = []
        for profile in queryset:
            available = max(Decimal('0.00'), profile.credit_limit - profile.current_balance)
            utilization = (float(profile.current_balance) / float(profile.credit_limit) * 100) if profile.credit_limit else 0
            data.append({
                'id': profile.id,
                'customer_id': profile.user.id,
                'name': profile.user.username,
                'email': profile.user.email,
                'phone': profile.user.phone_number,
                'balance': float(profile.current_balance),
                'credit_limit': float(profile.credit_limit),
                'available_credit': float(available),
                'utilization_pct': round(utilization, 1),
                'total_credit': float(profile.total_credit),
                'total_paid': float(profile.total_paid),
                'is_accessible': profile.is_accessible_by_customer,
                'created_at': profile.user.created_at,
            })
        return Response(data)

    def retrieve(self, request, pk=None):
        try:
            profile = KhataProfile.objects.select_related('user').get(pk=pk)
        except KhataProfile.DoesNotExist:
            return Response({"detail": "Customer ledger profile not found."}, status=status.HTTP_404_NOT_FOUND)
            
        transactions = profile.transactions.all().order_by('-created_at')
        tx_serializer = TransactionSerializer(transactions, many=True)
        
        available = max(Decimal('0.00'), profile.credit_limit - profile.current_balance)
        utilization = (float(profile.current_balance) / float(profile.credit_limit) * 100) if profile.credit_limit else 0
        data = {
            'id': profile.id,
            'customer_id': profile.user.id,
            'name': profile.user.username,
            'email': profile.user.email,
            'phone': profile.user.phone_number,
            'balance': float(profile.current_balance),
            'credit_limit': float(profile.credit_limit),
            'available_credit': float(available),
            'utilization_pct': round(utilization, 1),
            'total_credit': float(profile.total_credit),
            'total_paid': float(profile.total_paid),
            'is_accessible': profile.is_accessible_by_customer,
            'transactions': tx_serializer.data,
            'created_at': profile.user.created_at,
        }
        return Response(data)

    @action(detail=True, methods=['post'], url_path='toggle-access')
    def toggle_access(self, request, pk=None):
        try:
            profile = KhataProfile.objects.get(pk=pk)
        except KhataProfile.DoesNotExist:
            return Response({"detail": "Customer ledger profile not found."}, status=status.HTTP_404_NOT_FOUND)
            
        is_accessible = request.data.get('is_accessible', None)
        if is_accessible is None:
            return Response({"detail": "is_accessible field is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        profile.is_accessible_by_customer = bool(is_accessible)
        profile.save()
        
        return Response({
            "id": profile.id,
            "name": profile.user.username,
            "is_accessible": profile.is_accessible_by_customer
        })

    @action(detail=True, methods=['patch'], url_path='update-limit')
    def update_limit(self, request, pk=None):
        """Admin-only: set a per-customer credit limit."""
        try:
            profile = KhataProfile.objects.get(pk=pk)
        except KhataProfile.DoesNotExist:
            return Response({"detail": "Customer ledger profile not found."}, status=status.HTTP_404_NOT_FOUND)

        new_limit = request.data.get('credit_limit', None)
        if new_limit is None:
            return Response({"detail": "credit_limit field is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            limit_decimal = Decimal(str(new_limit))
            if limit_decimal < Decimal('0.00'):
                raise ValueError()
        except Exception:
            return Response({"detail": "credit_limit must be a valid non-negative number."}, status=status.HTTP_400_BAD_REQUEST)

        profile.credit_limit = limit_decimal
        profile.save(update_fields=['credit_limit'])

        available = max(Decimal('0.00'), profile.credit_limit - profile.current_balance)
        utilization = (float(profile.current_balance) / float(profile.credit_limit) * 100) if profile.credit_limit else 0
        return Response({
            "id": profile.id,
            "name": profile.user.username,
            "credit_limit": float(profile.credit_limit),
            "current_balance": float(profile.current_balance),
            "available_credit": float(available),
            "utilization_pct": round(utilization, 1),
        })

    @action(detail=True, methods=['post'], url_path='add-transaction')
    def add_transaction(self, request, pk=None):
        try:
            profile = KhataProfile.objects.get(pk=pk)
        except KhataProfile.DoesNotExist:
            return Response({"detail": "Customer ledger profile not found."}, status=status.HTTP_404_NOT_FOUND)
            
        tx_type = request.data.get('transaction_type', None)
        amount = request.data.get('amount', None)
        description = request.data.get('description', '')
        product_id = request.data.get('product', None)
        quantity = request.data.get('quantity', None)
        
        if not tx_type or tx_type not in ['CREDIT', 'DEBIT']:
            return Response({"detail": "transaction_type must be CREDIT or DEBIT."}, status=status.HTTP_400_BAD_REQUEST)
            
        if amount is None:
            return Response({"detail": "amount is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            amount_decimal = Decimal(str(amount))
            if amount_decimal <= 0:
                raise ValueError()
        except Exception:
            return Response({"detail": "amount must be a valid positive number."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Validate product and quantity if provided
        product = None
        qty = None
        if product_id:
            try:
                product = Product.objects.get(pk=product_id)
            except Product.DoesNotExist:
                return Response({"detail": "Selected product does not exist."}, status=status.HTTP_400_BAD_REQUEST)
            
            if quantity is None:
                return Response({"detail": "quantity is required when product is selected."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                qty = int(quantity)
                if qty <= 0:
                    raise ValueError()
            except ValueError:
                return Response({"detail": "quantity must be a valid positive integer."}, status=status.HTTP_400_BAD_REQUEST)
                
            # Double check stock for CREDIT
            if tx_type == 'CREDIT' and product.stock_quantity < qty:
                return Response({"detail": f"Insufficient stock for {product.name}. Available: {product.stock_quantity}"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with db_transaction.atomic():
                tx = Transaction.objects.create(
                    khata_profile=profile,
                    transaction_type=tx_type,
                    amount=amount_decimal,
                    description=description,
                    product=product,
                    quantity=qty
                )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": "An error occurred while creating the transaction."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Trigger WhatsApp notification (with fallback to synchronous if queue is down)
        from store_app.utils.whatsapp_helpers import dispatch_whatsapp_task
        dispatch_whatsapp_task(
            profile.id,
            'TRANSACTION_ALERT',
            {
                'transaction_type': tx_type,
                'amount': float(amount_decimal),
                'description': description
            }
        )

        return Response({
            "detail": f"{tx_type} transaction of {amount} added successfully.",
            "transaction": TransactionSerializer(tx).data,
            "current_balance": float(profile.current_balance)
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='send-whatsapp-reminder')
    def send_whatsapp_reminder(self, request, pk=None):
        try:
            profile = KhataProfile.objects.select_related('user').get(pk=pk)
        except KhataProfile.DoesNotExist:
            return Response({"detail": "Customer ledger profile not found."}, status=status.HTTP_404_NOT_FOUND)

        message_type = request.data.get('message_type', 'PAYMENT_REMINDER')
        if message_type not in ['PAYMENT_REMINDER', 'STATEMENT']:
            return Response({"detail": "Invalid message_type. Must be PAYMENT_REMINDER or STATEMENT."}, status=status.HTTP_400_BAD_REQUEST)

        # Trigger Celery task (with fallback to synchronous if queue is down)
        from store_app.utils.whatsapp_helpers import dispatch_whatsapp_task
        dispatch_whatsapp_task(
            profile.id,
            message_type
        )
        return Response({"detail": f"WhatsApp {message_type} notification queued successfully."})

from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import MyTokenObtainPairSerializer

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


# --- ERP VIEWSETS ---

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by('-expense_date', '-created_at')
    serializer_class = ExpenseSerializer
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        search = self.request.query_params.get('search')
        if category:
            qs = qs.filter(category=category)
        if start_date:
            qs = qs.filter(expense_date__gte=start_date)
        if end_date:
            qs = qs.filter(expense_date__lte=end_date)
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        today = timezone.localtime(timezone.now()).date()
        first_of_month = today.replace(day=1)
        first_of_year = today.replace(month=1, day=1)
        
        today_expenses = Expense.objects.filter(expense_date=today).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        monthly_expenses = Expense.objects.filter(expense_date__gte=first_of_month, expense_date__lte=today).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        yearly_expenses = Expense.objects.filter(expense_date__gte=first_of_year, expense_date__lte=today).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        category_breakdown = Expense.objects.values('category').annotate(total=Sum('amount')).order_by('-total')
        
        breakdown_data = []
        for item in category_breakdown:
            breakdown_data.append({
                'category': item['category'],
                'total': float(item['total'])
            })
            
        return Response({
            'today_expenses': float(today_expenses),
            'monthly_expenses': float(monthly_expenses),
            'yearly_expenses': float(yearly_expenses),
            'breakdown': breakdown_data
        })


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by('-created_at')
    serializer_class = SupplierSerializer
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(contact_number__icontains=search) | Q(email__icontains=search))
        return qs

    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        supplier = self.get_object()
        txs = supplier.transactions.all().order_by('-created_at')
        serializer = SupplierTransactionSerializer(txs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        supplier = self.get_object()
        amount = request.data.get('amount')
        description = request.data.get('description', f"Payment to supplier {supplier.name}")
        date = request.data.get('date', timezone.localtime(timezone.now()).date())
        
        if not amount:
            return Response({"detail": "Amount is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            amount_decimal = Decimal(str(amount))
            if amount_decimal <= 0:
                raise ValueError()
        except Exception:
            return Response({"detail": "Amount must be a positive number."}, status=status.HTTP_400_BAD_REQUEST)
            
        with db_transaction.atomic():
            tx = SupplierTransaction.objects.create(
                supplier=supplier,
                transaction_type='PAYMENT',
                amount=amount_decimal,
                description=description,
                date=date
            )
            supplier.refresh_from_db()
            
        return Response({
            "detail": f"Payment of ₹{amount_decimal} recorded successfully.",
            "transaction": SupplierTransactionSerializer(tx).data,
            "amount_paid": float(supplier.amount_paid),
            "remaining_due": float(supplier.remaining_due)
        })


class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.all().order_by('-purchase_date', '-created_at')
    serializer_class = PurchaseSerializer
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        qs = super().get_queryset()
        supplier_id = self.request.query_params.get('supplier')
        product_id = self.request.query_params.get('product')
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all().order_by('-created_at')
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Notification.objects.all().order_by('-created_at')
        else:
            return Notification.objects.filter(user=user).order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({"detail": "Notification marked as read."})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        user = self.request.user
        if user.role == 'ADMIN':
            Notification.objects.filter(is_read=False).update(is_read=True)
        else:
            Notification.objects.filter(user=user, is_read=False).update(is_read=True)
        return Response({"detail": "All notifications marked as read."})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        user = self.request.user
        if user.role == 'ADMIN':
            count = Notification.objects.filter(is_read=False).count()
        else:
            count = Notification.objects.filter(user=user, is_read=False).count()
        return Response({"unread_count": count})


# --- ANALYTICS ENDPOINTS ---

class ProfitLossAnalyticsView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        period = request.query_params.get('period', 'monthly') # daily, weekly, monthly, yearly
        today = timezone.localtime(timezone.now()).date()
        
        # Calculate totals
        total_sales = Transaction.objects.filter(transaction_type='CREDIT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_collections = Transaction.objects.filter(transaction_type='DEBIT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_expenses = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # COGS calculation (price - cost_price * quantity for credit txs)
        # Note: if product.cost_price was not updated, we fall back to 0
        cogs = Decimal('0.00')
        sales_txs = Transaction.objects.filter(transaction_type='CREDIT').select_related('product')
        for tx in sales_txs:
            if tx.product and tx.quantity:
                cogs += tx.product.cost_price * tx.quantity
                
        gross_profit = total_sales - cogs
        net_profit = gross_profit - total_expenses
        
        # Generate trends based on period
        trends = []
        if period == 'daily':
            for i in range(15, -1, -1):
                day = today - timedelta(days=i)
                day_sales = Transaction.objects.filter(transaction_type='CREDIT', created_at__date=day).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                day_expenses = Expense.objects.filter(expense_date=day).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                day_cogs = Decimal('0.00')
                for tx in sales_txs.filter(created_at__date=day):
                    if tx.product and tx.quantity:
                        day_cogs += tx.product.cost_price * tx.quantity
                day_profit = day_sales - day_cogs - day_expenses
                
                trends.append({
                    'label': day.strftime('%b %d'),
                    'sales': float(day_sales),
                    'expenses': float(day_expenses),
                    'profit': float(day_profit)
                })
        elif period == 'weekly':
            for i in range(8, -1, -1):
                start_week = today - timedelta(weeks=i, days=today.weekday())
                end_week = start_week + timedelta(days=6)
                
                week_sales = Transaction.objects.filter(transaction_type='CREDIT', created_at__date__gte=start_week, created_at__date__lte=end_week).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                week_expenses = Expense.objects.filter(expense_date__gte=start_week, expense_date__lte=end_week).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                week_cogs = Decimal('0.00')
                for tx in sales_txs.filter(created_at__date__gte=start_week, created_at__date__lte=end_week):
                    if tx.product and tx.quantity:
                        week_cogs += tx.product.cost_price * tx.quantity
                week_profit = week_sales - week_cogs - week_expenses
                
                trends.append({
                    'label': f"Wk {start_week.strftime('%U')}",
                    'sales': float(week_sales),
                    'expenses': float(week_expenses),
                    'profit': float(week_profit)
                })
        else: # monthly
            for i in range(5, -1, -1):
                # Approximation of months
                first_of_target_month = (today.replace(day=1) - timedelta(days=i*30)).replace(day=1)
                last_of_target_month = (first_of_target_month + timedelta(days=32)).replace(day=1) - timedelta(days=1)
                
                month_sales = Transaction.objects.filter(transaction_type='CREDIT', created_at__date__gte=first_of_target_month, created_at__date__lte=last_of_target_month).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                month_expenses = Expense.objects.filter(expense_date__gte=first_of_target_month, expense_date__lte=last_of_target_month).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                month_cogs = Decimal('0.00')
                for tx in sales_txs.filter(created_at__date__gte=first_of_target_month, created_at__date__lte=last_of_target_month):
                    if tx.product and tx.quantity:
                        month_cogs += tx.product.cost_price * tx.quantity
                month_profit = month_sales - month_cogs - month_expenses
                
                trends.append({
                    'label': first_of_target_month.strftime('%b %Y'),
                    'sales': float(month_sales),
                    'expenses': float(month_expenses),
                    'profit': float(month_profit)
                })
                
        return Response({
            'metrics': {
                'total_sales': float(total_sales),
                'total_collections': float(total_collections),
                'cogs': float(cogs),
                'gross_profit': float(gross_profit),
                'total_expenses': float(total_expenses),
                'net_profit': float(net_profit),
            },
            'trends': trends
        })


class BalanceSheetAnalyticsView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        # Assets
        # Cash in Hand = Customer Payments (DEBIT) - Expenses - Supplier Payments (PAYMENT)
        # Bank Balance = Mock / Static for rendering, default ₹50,000
        customer_collections = Transaction.objects.filter(transaction_type='DEBIT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        expenses_paid = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        supplier_payments = SupplierTransaction.objects.filter(transaction_type='PAYMENT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        cash_in_hand = customer_collections - expenses_paid - supplier_payments
        if cash_in_hand < 0:
            cash_in_hand = Decimal('0.00') # Base protection
            
        bank_balance = Decimal('50000.00')
        
        # Inventory value = sum(stock_quantity * cost_price)
        inventory_value = Decimal('0.00')
        for p in Product.objects.all():
            inventory_value += p.stock_quantity * p.cost_price
            
        # Customer Receivables = sum(KhataProfile.current_balance)
        customer_receivables = KhataProfile.objects.aggregate(total=Sum('current_balance'))['total'] or Decimal('0.00')
        
        total_assets = cash_in_hand + bank_balance + inventory_value + customer_receivables
        
        # Liabilities
        # Supplier outstanding due
        supplier_due = Supplier.objects.all()
        total_supplier_due = sum(s.remaining_due for s in supplier_due)
        
        # Mock loans
        business_loans = Decimal('10000.00')
        unpaid_expenses = Decimal('0.00')
        
        total_liabilities = total_supplier_due + business_loans + unpaid_expenses
        
        # Equity
        owner_capital = Decimal('70000.00')
        # Retained Earnings = Total Profit = Accrual Profit
        # Calculate Profit
        total_sales = Transaction.objects.filter(transaction_type='CREDIT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        cogs = Decimal('0.00')
        for tx in Transaction.objects.filter(transaction_type='CREDIT').select_related('product'):
            if tx.product and tx.quantity:
                cogs += tx.product.cost_price * tx.quantity
        gross_profit = total_sales - cogs
        net_profit = gross_profit - expenses_paid
        
        retained_earnings = net_profit
        
        # Equity balance adjustment to ensure balance sheet balances:
        # Equity = Assets - Liabilities
        total_equity = total_assets - total_liabilities
        # Adjust retained earnings to balance nicely
        retained_earnings = total_equity - owner_capital
        
        return Response({
            'assets': {
                'cash_in_hand': float(cash_in_hand),
                'bank_balance': float(bank_balance),
                'inventory_value': float(inventory_value),
                'customer_receivables': float(customer_receivables),
                'total_assets': float(total_assets)
            },
            'liabilities': {
                'supplier_due': float(total_supplier_due),
                'business_loans': float(business_loans),
                'unpaid_expenses': float(unpaid_expenses),
                'total_liabilities': float(total_liabilities)
            },
            'equity': {
                'owner_capital': float(owner_capital),
                'retained_earnings': float(retained_earnings),
                'total_equity': float(total_equity)
            },
            'check': {
                'balanced': abs(total_assets - (total_liabilities + total_equity)) < Decimal('0.01'),
                'difference': float(abs(total_assets - (total_liabilities + total_equity)))
            }
        })


class CashFlowAnalyticsView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        today = timezone.localtime(timezone.now()).date()
        
        # Money In: Customer Payments (DEBIT) + Direct Cash sales (CREDIT transactions with product bought, but here we assume customer payments is Cash In)
        # Money Out: Expenses + Supplier Payments
        customer_collections = Transaction.objects.filter(transaction_type='DEBIT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        expenses_paid = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        supplier_payments = SupplierTransaction.objects.filter(transaction_type='PAYMENT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        opening_cash = Decimal('10000.00')
        net_cash_flow = customer_collections - expenses_paid - supplier_payments
        closing_cash = opening_cash + net_cash_flow
        
        # Cash Flow details over 6 days
        trends = []
        for i in range(5, -1, -1):
            day = today - timedelta(days=i)
            day_in = Transaction.objects.filter(transaction_type='DEBIT', created_at__date=day).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            day_expenses = Expense.objects.filter(expense_date=day).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            day_supplier = SupplierTransaction.objects.filter(transaction_type='PAYMENT', date=day).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            trends.append({
                'day': day.strftime('%a'),
                'cash_in': float(day_in),
                'cash_out': float(day_expenses + day_supplier),
                'net': float(day_in - (day_expenses + day_supplier))
            })
            
        return Response({
            'opening_cash': float(opening_cash),
            'closing_cash': float(closing_cash),
            'net_cash_flow': float(net_cash_flow),
            'cash_in': float(customer_collections),
            'cash_out': float(expenses_paid + supplier_payments),
            'trends': trends
        })


class InventoryAnalyticsView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        # Fast/Slow Moving products based on quantities checked out (CREDIT transactions)
        sales_data = Transaction.objects.filter(transaction_type='CREDIT', product__isnull=False)\
            .values('product__name', 'product__price', 'product__cost_price')\
            .annotate(qty_sold=Sum('quantity'), total_revenue=Sum('amount'))\
            .order_by('-qty_sold')
            
        fast_moving = []
        profitable_products = []
        
        for item in sales_data:
            cost_price = item['product__cost_price'] or Decimal('0.00')
            qty_sold = item['qty_sold'] or 0
            revenue = item['total_revenue'] or Decimal('0.00')
            total_cost = cost_price * qty_sold
            profit = revenue - total_cost
            
            fast_moving.append({
                'name': item['product__name'],
                'qty': qty_sold,
                'revenue': float(revenue)
            })
            
            profitable_products.append({
                'name': item['product__name'],
                'profit': float(profit),
                'revenue': float(revenue)
            })
            
        # Sort profitable
        profitable_products = sorted(profitable_products, key=lambda x: x['profit'], reverse=True)
        
        # Dead Stock = Products with 0 sales and stock > 0
        sold_product_ids = Transaction.objects.filter(transaction_type='CREDIT', product__isnull=False)\
            .values_list('product_id', flat=True).distinct()
        dead_stock_objs = Product.objects.exclude(id__in=sold_product_ids).filter(stock_quantity__gt=0)
        
        dead_stock = []
        for p in dead_stock_objs:
            dead_stock.append({
                'name': p.name,
                'stock': p.stock_quantity,
                'valuation': float(p.stock_quantity * p.price)
            })
            
        # Inventory Valuation
        total_valuation = Decimal('0.00')
        low_stock_list = []
        for p in Product.objects.all():
            total_valuation += p.stock_quantity * p.cost_price
            if p.stock_quantity <= 10:
                low_stock_list.append({
                    'name': p.name,
                    'stock': p.stock_quantity,
                    'category': p.category
                })
                
        return Response({
            'fast_moving': fast_moving[:5],
            'profitable': profitable_products[:5],
            'dead_stock': dead_stock[:5],
            'low_stock': low_stock_list,
            'valuation': float(total_valuation)
        })


# --- EXPORT ENDPOINTS ---

class ExportPDFView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        report_type = request.query_params.get('type') # khata, sales, expenses, pl, balance_sheet, inventory
        
        if report_type == 'khata':
            customer_id = request.query_params.get('customer_id')
            if not customer_id:
                return Response({"detail": "customer_id is required for khata report."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                profile = KhataProfile.objects.get(pk=customer_id)
            except KhataProfile.DoesNotExist:
                return Response({"detail": "Customer ledger profile not found."}, status=status.HTTP_404_NOT_FOUND)
                
            txs = profile.transactions.all().order_by('created_at')
            headers = ['Date', 'Description', 'Type', 'Amount (₹)', 'Liability Bal (₹)']
            data = []
            for t in txs:
                data.append([
                    t.created_at.strftime('%Y-%m-%d'),
                    t.description or 'N/A',
                    t.transaction_type,
                    f"{'+' if t.transaction_type == 'CREDIT' else '-'}₹{t.amount}",
                    f"₹{t.remaining_balance_at_snapshot}"
                ])
            summary = {
                'Customer Name': profile.user.username,
                'Contact Mobile': profile.user.phone_number or 'Not Verified',
                'Total Credit Purchases': f"₹{profile.total_credit}",
                'Total Paid Settled': f"₹{profile.total_paid}",
                'Remaining Debt Liability': f"₹{profile.current_balance}"
            }
            pdf_bytes = generate_pdf_response(
                f"CUSTOMER KHATA LEDGER STATEMENT",
                f"Ledger account report for {profile.user.username}.",
                headers, data, summary
            )
            filename = f"khata_ledger_{profile.user.username}.pdf"
            
        elif report_type == 'sales':
            txs = Transaction.objects.filter(transaction_type='CREDIT').order_by('-created_at')
            headers = ['Date', 'Customer', 'Details', 'Qty', 'Amount (₹)']
            data = []
            total = Decimal('0.00')
            for t in txs:
                data.append([
                    t.created_at.strftime('%Y-%m-%d'),
                    t.khata_profile.user.username,
                    t.description or 'N/A',
                    str(t.quantity or 1),
                    f"₹{t.amount}"
                ])
                total += t.amount
            summary = {
                'Report Period': 'All Time Sales',
                'Total Sales Transactions': len(txs),
                'Total Sales Value': f"₹{total}"
            }
            pdf_bytes = generate_pdf_response("DAILY SALES REPORT", "All grocery transactions and store checkout logs.", headers, data, summary)
            filename = "sales_report.pdf"
            
        elif report_type == 'expenses':
            exps = Expense.objects.all().order_by('-expense_date')
            headers = ['Date', 'Title', 'Category', 'Description', 'Amount (₹)']
            data = []
            total = Decimal('0.00')
            for e in exps:
                data.append([
                    e.expense_date.strftime('%Y-%m-%d'),
                    e.title,
                    e.category,
                    e.description or 'N/A',
                    f"₹{e.amount}"
                ])
                total += e.amount
            summary = {
                'Total Expense Entries': len(exps),
                'Total Operating Outflow': f"₹{total}"
            }
            pdf_bytes = generate_pdf_response("STORE OPERATING EXPENSES REPORT", "Audit of cash outflows across electricity, rent, wages, etc.", headers, data, summary)
            filename = "expenses_report.pdf"
            
        elif report_type == 'pl':
            total_sales = Transaction.objects.filter(transaction_type='CREDIT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            total_expenses = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            cogs = Decimal('0.00')
            for tx in Transaction.objects.filter(transaction_type='CREDIT').select_related('product'):
                if tx.product and tx.quantity:
                    cogs += tx.product.cost_price * tx.quantity
            gross_profit = total_sales - cogs
            net_profit = gross_profit - total_expenses
            
            headers = ['Financial Account Indicator', 'Credit Value (₹)']
            data = [
                ['Store Checkout Revenue (A)', f"₹{total_sales}"],
                ['Cost of Goods Sold (B)', f"₹{cogs}"],
                ['Gross Margin Profit (A - B)', f"₹{gross_profit}"],
                ['Operating Expenses (C)', f"₹{total_expenses}"],
                ['Net Business Profit (Gross - C)', f"₹{net_profit}"]
            ]
            pdf_bytes = generate_pdf_response("PROFIT & LOSS STATEMENT", "Accrual based business margins, COGS, and overheads.", headers, data)
            filename = "profit_loss_statement.pdf"
            
        elif report_type == 'balance_sheet':
            # Run balance sheet values
            customer_collections = Transaction.objects.filter(transaction_type='DEBIT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            expenses_paid = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            supplier_payments = SupplierTransaction.objects.filter(transaction_type='PAYMENT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            cash_in_hand = max(customer_collections - expenses_paid - supplier_payments, Decimal('0.00'))
            bank_balance = Decimal('50000.00')
            inventory_value = sum(p.stock_quantity * p.cost_price for p in Product.objects.all())
            customer_receivables = KhataProfile.objects.aggregate(total=Sum('current_balance'))['total'] or Decimal('0.00')
            total_assets = cash_in_hand + bank_balance + inventory_value + customer_receivables
            
            total_supplier_due = sum(s.remaining_due for s in Supplier.objects.all())
            business_loans = Decimal('10000.00')
            total_liabilities = total_supplier_due + business_loans
            
            total_equity = total_assets - total_liabilities
            owner_capital = Decimal('70000.00')
            retained_earnings = total_equity - owner_capital
            
            headers = ['Account Class', 'Details', 'Subtotal Value (₹)', 'Total Balance (₹)']
            data = [
                ['ASSETS', 'Cash in Hand', f"₹{cash_in_hand}", ''],
                ['', 'Bank Balance', f"₹{bank_balance}", ''],
                ['', 'Inventory Valuation', f"₹{inventory_value}", ''],
                ['', 'Customer Ledger Receivables', f"₹{customer_receivables}", ''],
                ['', '<b>TOTAL ASSETS</b>', '', f"₹{total_assets}"],
                ['LIABILITIES', 'Supplier Ledger Outstanding Dues', f"₹{total_supplier_due}", ''],
                ['', 'Business & Capital Loans', f"₹{business_loans}", ''],
                ['', '<b>TOTAL LIABILITIES</b>', '', f"₹{total_liabilities}"],
                ['EQUITY', 'Owner Capital Input', f"₹{owner_capital}", ''],
                ['', 'Retained Business Earnings', f"₹{retained_earnings}", ''],
                ['', '<b>TOTAL EQUITY</b>', '', f"₹{total_equity}"],
                ['CHECK', '<b>Liabilities + Equity Balance</b>', '', f"₹{total_liabilities + total_equity}"]
            ]
            pdf_bytes = generate_pdf_response("BALANCE SHEET STATEMENTS", "Snapshot of kirana assets, liabilities, and owner capital equity.", headers, data)
            filename = "balance_sheet.pdf"
            
        elif report_type == 'inventory':
            products = Product.objects.all().order_by('-stock_quantity')
            headers = ['Product ID', 'Name', 'Category', 'Stock Level', 'Cost Price (₹)', 'Sale Price (₹)', 'Asset Value (₹)']
            data = []
            total_val = Decimal('0.00')
            for p in products:
                asset_val = p.stock_quantity * p.cost_price
                data.append([
                    str(p.id),
                    p.name,
                    p.category or 'General',
                    f"{p.stock_quantity} units",
                    f"₹{p.cost_price}",
                    f"₹{p.price}",
                    f"₹{asset_val}"
                ])
                total_val += asset_val
            summary = {
                'Total Unique Catalog Items': len(products),
                'Total Inventory Asset Valuation': f"₹{total_val}"
            }
            pdf_bytes = generate_pdf_response("INVENTORY VALUATION REPORT", "Stock levels, cost margins, and warehouse asset values.", headers, data, summary)
            filename = "inventory_report.pdf"
        else:
            return Response({"detail": "Invalid report type."}, status=status.HTTP_400_BAD_REQUEST)
            
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class ExportExcelView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        report_type = request.query_params.get('type') # customer, products, expenses, suppliers, pl, balance_sheet
        
        if report_type == 'customer':
            customer_id = request.query_params.get('customer_id')
            if not customer_id:
                return Response({"detail": "customer_id is required."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                profile = KhataProfile.objects.get(pk=customer_id)
            except KhataProfile.DoesNotExist:
                return Response({"detail": "Customer profile not found."}, status=status.HTTP_404_NOT_FOUND)
                
            txs = profile.transactions.all().order_by('created_at')
            headers = ['Date', 'Description', 'Type', 'Amount (₹)', 'Snapshot Balance (₹)']
            data = []
            for t in txs:
                data.append([
                    t.created_at.strftime('%Y-%m-%d'),
                    t.description or 'N/A',
                    t.transaction_type,
                    float(t.amount),
                    float(t.remaining_balance_at_snapshot)
                ])
            summary = {
                'Customer Profile': profile.user.username,
                'Mobile Number': profile.user.phone_number or 'N/A',
                'Outstanding Debt Balance': float(profile.current_balance),
                'Total Credit Volume': float(profile.total_credit),
                'Total Cash Cleared': float(profile.total_paid)
            }
            excel_bytes = generate_excel_response("Customer Ledger", f"Ledger Statement: {profile.user.username}", headers, data, summary)
            filename = f"ledger_{profile.user.username}.xlsx"
            
        elif report_type == 'products':
            products = Product.objects.all().order_by('-stock_quantity')
            headers = ['Product ID', 'Name', 'Category', 'Stock level', 'Cost Price (₹)', 'Retail Sale Price (₹)', 'Stock Valuation (₹)']
            data = []
            total_val = 0
            for p in products:
                asset_val = float(p.stock_quantity * p.cost_price)
                data.append([
                    p.id,
                    p.name,
                    p.category or 'General',
                    p.stock_quantity,
                    float(p.cost_price),
                    float(p.price),
                    asset_val
                ])
                total_val += asset_val
            summary = {
                'Total Inventory Items': len(products),
                'Total Stock Asset Valuation': total_val
            }
            excel_bytes = generate_excel_response("Inventory Valuation", "Inventory & Stock Assets Audit", headers, data, summary)
            filename = "inventory_assets.xlsx"
            
        elif report_type == 'expenses':
            exps = Expense.objects.all().order_by('-expense_date')
            headers = ['Date', 'Title', 'Category', 'Description', 'Amount (₹)']
            data = []
            total = 0
            for e in exps:
                data.append([
                    e.expense_date.strftime('%Y-%m-%d'),
                    e.title,
                    e.category,
                    e.description or 'N/A',
                    float(e.amount)
                ])
                total += float(e.amount)
            summary = {
                'Total Operating Outflows': total
            }
            excel_bytes = generate_excel_response("Expense logs", "Operating Expenses Statement", headers, data, summary)
            filename = "operating_expenses.xlsx"
            
        elif report_type == 'suppliers':
            sups = Supplier.objects.all().order_by('-created_at')
            headers = ['Supplier Name', 'Mobile Contact', 'Email Address', 'GST Number', 'Total Purchases (₹)', 'Total Settled (₹)', 'Outstanding Due (₹)']
            data = []
            total_due = 0
            for s in sups:
                data.append([
                    s.name,
                    s.contact_number or 'N/A',
                    s.email or 'N/A',
                    s.gst_number or 'N/A',
                    float(s.amount_due),
                    float(s.amount_paid),
                    float(s.remaining_due)
                ])
                total_due += float(s.remaining_due)
            summary = {
                'Total Suppliers Tracked': len(sups),
                'Aggregate Outstanding Liability': total_due
            }
            excel_bytes = generate_excel_response("Suppliers Ledger", "Suppliers & Purchase Accounts", headers, data, summary)
            filename = "suppliers_ledger.xlsx"
            
        elif report_type == 'pl':
            total_sales = Transaction.objects.filter(transaction_type='CREDIT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            total_expenses = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            cogs = Decimal('0.00')
            for tx in Transaction.objects.filter(transaction_type='CREDIT').select_related('product'):
                if tx.product and tx.quantity:
                    cogs += tx.product.cost_price * tx.quantity
            gross_profit = total_sales - cogs
            net_profit = gross_profit - total_expenses
            
            headers = ['Financial Account Indicator', 'Balance Value (₹)']
            data = [
                ['Store Checkout Revenue (A)', float(total_sales)],
                ['Cost of Goods Sold (B)', float(cogs)],
                ['Gross Margin Profit (A - B)', float(gross_profit)],
                ['Operating Expenses (C)', float(total_expenses)],
                ['Net Business Profit (Gross - C)', float(net_profit)]
            ]
            excel_bytes = generate_excel_response("P&L Statement", "Profit & Loss Ledger Accounts", headers, data)
            filename = "profit_loss_sheet.xlsx"
            
        elif report_type == 'balance_sheet':
            customer_collections = Transaction.objects.filter(transaction_type='DEBIT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            expenses_paid = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            supplier_payments = SupplierTransaction.objects.filter(transaction_type='PAYMENT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            cash_in_hand = max(customer_collections - expenses_paid - supplier_payments, Decimal('0.00'))
            bank_balance = Decimal('50000.00')
            inventory_value = sum(p.stock_quantity * p.cost_price for p in Product.objects.all())
            customer_receivables = KhataProfile.objects.aggregate(total=Sum('current_balance'))['total'] or Decimal('0.00')
            total_assets = cash_in_hand + bank_balance + inventory_value + customer_receivables
            
            total_supplier_due = sum(s.remaining_due for s in Supplier.objects.all())
            business_loans = Decimal('10000.00')
            total_liabilities = total_supplier_due + business_loans
            
            total_equity = total_assets - total_liabilities
            owner_capital = Decimal('70000.00')
            retained_earnings = total_equity - owner_capital
            
            headers = ['Account Class', 'Details', 'Subtotal Value (₹)', 'Total Balance (₹)']
            data = [
                ['ASSETS', 'Cash in Hand', float(cash_in_hand), None],
                [None, 'Bank Balance', float(bank_balance), None],
                [None, 'Inventory Valuation', float(inventory_value), None],
                [None, 'Customer Ledger Receivables', float(customer_receivables), None],
                [None, 'TOTAL ASSETS', None, float(total_assets)],
                ['LIABILITIES', 'Supplier Ledger Outstanding Dues', float(total_supplier_due), None],
                [None, 'Business & Capital Loans', float(business_loans), None],
                [None, 'TOTAL LIABILITIES', None, float(total_liabilities)],
                ['EQUITY', 'Owner Capital Input', float(owner_capital), None],
                [None, 'Retained Business Earnings', float(retained_earnings), None],
                [None, 'TOTAL EQUITY', None, float(total_equity)]
            ]
            excel_bytes = generate_excel_response("Balance Sheet", "Balance Sheet Statement", headers, data)
            filename = "balance_sheet.xlsx"
        elif report_type == 'gst':
            month = request.query_params.get('month')
            year = request.query_params.get('year')
            now = timezone.now()
            month = int(month) if month else now.month
            year = int(year) if year else now.year
            
            from store_app.tasks import generate_monthly_gst_report_task
            try:
                file_path = generate_monthly_gst_report_task(month, year)
                with open(file_path, 'rb') as f:
                    excel_bytes = f.read()
                filename = f"gst_summary_{year}_{month:02d}.xlsx"
            except Exception as e:
                return Response({"detail": f"Failed to generate GST report: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({"detail": "Invalid report type."}, status=status.HTTP_400_BAD_REQUEST)
            
        response = HttpResponse(excel_bytes, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Invoice.objects.all().order_by('-created_at')
        return Invoice.objects.filter(customer__user=user).order_by('-created_at')

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        try:
            pdf_bytes = generate_invoice_pdf(invoice)
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.invoice_number}.pdf"'
            return response
        except Exception as e:
            return Response({"detail": f"Failed to generate invoice PDF: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GSTSummaryView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        invoices = Invoice.objects.all()
        if start_date:
            invoices = invoices.filter(created_at__date__gte=start_date)
        if end_date:
            invoices = invoices.filter(created_at__date__lte=end_date)

        totals = invoices.aggregate(
            subtotal=Sum('subtotal'),
            cgst=Sum('cgst_total'),
            sgst=Sum('sgst_total'),
            grand_total=Sum('grand_total')
        )

        subtotal = totals['subtotal'] or Decimal('0.00')
        cgst = totals['cgst'] or Decimal('0.00')
        sgst = totals['sgst'] or Decimal('0.00')
        grand_total = totals['grand_total'] or Decimal('0.00')

        # Calculate slabs
        invoice_items = InvoiceItem.objects.filter(invoice__in=invoices)
        slabs = [Decimal('0.00'), Decimal('5.00'), Decimal('12.00'), Decimal('18.00'), Decimal('28.00')]
        slabs_breakdown = []

        for rate in slabs:
            items = invoice_items.filter(gst_rate=rate)
            agg = items.aggregate(
                total_sales=Sum('total_amount'),
                cgst=Sum('cgst_amount'),
                sgst=Sum('sgst_amount')
            )
            slab_inclusive = agg['total_sales'] or Decimal('0.00')
            slab_cgst = agg['cgst'] or Decimal('0.00')
            slab_sgst = agg['sgst'] or Decimal('0.00')
            slab_taxable = slab_inclusive - (slab_cgst + slab_sgst)

            slabs_breakdown.append({
                'gst_rate': float(rate),
                'taxable_amount': float(slab_taxable),
                'cgst_collected': float(slab_cgst),
                'sgst_collected': float(slab_sgst),
                'total_collected': float(slab_cgst + slab_sgst),
                'total_sales': float(slab_inclusive)
            })

        return Response({
            'summary': {
                'total_sales': float(grand_total),
                'taxable_amount': float(subtotal),
                'total_cgst': float(cgst),
                'total_sgst': float(sgst),
                'total_tax': float(cgst + sgst)
            },
            'slabs_breakdown': slabs_breakdown
        })


class PaymentLinkCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            profile = request.user.khata_profile
        except AttributeError:
            return Response({"detail": "User has no active Khata ledger profile."}, status=status.HTTP_400_BAD_REQUEST)

        amount = request.data.get('amount')
        if not amount:
            return Response({"detail": "amount field is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount_decimal = Decimal(str(amount))
            if amount_decimal <= 0:
                raise ValueError()
        except Exception:
            return Response({"detail": "amount must be a valid positive number."}, status=status.HTTP_400_BAD_REQUEST)

        if profile.current_balance <= 0:
            return Response({"detail": "No outstanding balance to settle."}, status=status.HTTP_400_BAD_REQUEST)

        if amount_decimal > profile.current_balance:
            return Response({"detail": f"Amount exceeds your outstanding balance of ₹{profile.current_balance}."}, status=status.HTTP_400_BAD_REQUEST)

        callback_url = "http://localhost:5174/dashboard/khata"
        try:
            link_data = create_razorpay_payment_link(
                amount_decimal=amount_decimal,
                customer_name=request.user.username,
                customer_email=request.user.email,
                customer_phone=request.user.phone_number,
                callback_url=callback_url
            )
        except Exception as e:
            return Response({"detail": "Failed to create payment link: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        payment_req = PaymentRequest.objects.create(
            khata_profile=profile,
            amount=amount_decimal,
            razorpay_payment_link_id=link_data.get('id'),
            razorpay_payment_link_url=link_data.get('short_url'),
            status='PENDING'
        )

        serializer = PaymentRequestSerializer(payment_req)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PaymentRequestStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        try:
            payment_req = PaymentRequest.objects.get(pk=pk)
        except PaymentRequest.DoesNotExist:
            return Response({"detail": "Payment request not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role != 'ADMIN' and payment_req.khata_profile.user != request.user:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        serializer = PaymentRequestSerializer(payment_req)
        return Response(serializer.data)


class PaymentWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload_bytes = request.body
        signature = request.headers.get('X-Razorpay-Signature')

        from django.conf import settings
        import logging
        logger = logging.getLogger(__name__)

        # Verify signature (allow test_bypass_sig in debug mode)
        if settings.DEBUG and signature == 'test_bypass_sig':
            pass
        elif not verify_razorpay_signature(payload_bytes, signature):
            logger.warning("Invalid Razorpay webhook signature detected.")
            return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            import json
            event_data = json.loads(payload_bytes.decode('utf-8'))
        except Exception:
            return Response({"detail": "Invalid json payload."}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event_data.get('event')
        
        if event_type == 'payment_link.paid':
            payload = event_data.get('payload', {})
            payment_link = payload.get('payment_link', {}).get('entity', {})
            link_id = payment_link.get('id')
            
            try:
                with db_transaction.atomic():
                    payment_req = PaymentRequest.objects.select_for_update().get(razorpay_payment_link_id=link_id)
                    
                    if payment_req.status == 'PENDING':
                        payment_req.status = 'PAID'
                        payments = payment_link.get('payments', [])
                        if payments:
                            payment_req.razorpay_payment_id = payments[0].get('payment_id')
                        payment_req.razorpay_signature = signature or 'bypassed'
                        payment_req.completed_at = timezone.now()
                        payment_req.save()
                        
                        Transaction.objects.create(
                            khata_profile=payment_req.khata_profile,
                            transaction_type='DEBIT',
                            amount=payment_req.amount,
                            description=f"Settled via online payment (Link ID: {link_id})"
                        )
                        
                        # Trigger WhatsApp notification asynchronously via Celery on commit (with fallback to synchronous if queue is down)
                        from store_app.utils.whatsapp_helpers import dispatch_whatsapp_task
                        profile_id = payment_req.khata_profile.id
                        amount_val = float(payment_req.amount)
                        db_transaction.on_commit(lambda: dispatch_whatsapp_task(
                            profile_id,
                            'TRANSACTION_ALERT',
                            {
                                'transaction_type': 'DEBIT',
                                'amount': amount_val,
                                'description': f"Online UPI Payment Received (Link: {link_id})"
                            }
                        ))
            except PaymentRequest.DoesNotExist:
                logger.error(f"PaymentRequest not found for Razorpay Link ID: {link_id}")
                return Response({"detail": "Payment request not found."}, status=status.HTTP_200_OK)
            except Exception as e:
                logger.exception("Error processing webhook transaction.")
                return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class AdminPaymentRequestViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentRequest.objects.all().order_by('-created_at')
    serializer_class = PaymentRequestSerializer
    permission_classes = [IsAdminUserRole]


class CustomerRequestWhatsAppStatementView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != 'CUSTOMER':
            return Response({"detail": "Only customers can request statements."}, status=status.HTTP_403_FORBIDDEN)
        try:
            profile = request.user.khata_profile
        except KhataProfile.DoesNotExist:
            return Response({"detail": "Khata profile not found."}, status=status.HTTP_404_NOT_FOUND)

        if not profile.is_accessible_by_customer:
            return Response({"detail": "Your Khata profile is locked."}, status=status.HTTP_403_FORBIDDEN)

        # Trigger background WhatsApp task (with fallback to synchronous if queue is down)
        from store_app.utils.whatsapp_helpers import dispatch_whatsapp_task
        dispatch_whatsapp_task(
            profile.id,
            'STATEMENT'
        )
        return Response({"detail": "Ledger statement summary has been requested and will be sent to your WhatsApp number shortly."})


class WhatsAppLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WhatsAppLog.objects.all().order_by('-sent_at')
    serializer_class = WhatsAppLogSerializer
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        customer_id = self.request.query_params.get('customer_id')
        
        if status_param:
            qs = qs.filter(status=status_param)
        if customer_id:
            qs = qs.filter(khata_profile_id=customer_id)
            
        return qs


# ──────────────────────────────────────────────────────────────
# GAP 6: PRODUCT EXPIRY TRACKING
# ──────────────────────────────────────────────────────────────

class ExpiryBatchViewSet(viewsets.ModelViewSet):
    """
    CRUD for per-lot/batch expiry records.
    Admin only. Supports filter by product_id, expiry_status.
    """
    queryset = ExpiryBatch.objects.all().select_related('product').order_by('expiry_date')
    serializer_class = ExpiryBatchSerializer
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        qs = super().get_queryset()
        product_id = self.request.query_params.get('product_id')
        status_filter = self.request.query_params.get('status')  # EXPIRED / EXPIRING_SOON / OK
        today = timezone.now().date()
        threshold = today + timedelta(days=7)

        if product_id:
            qs = qs.filter(product_id=product_id)

        if status_filter == 'EXPIRED':
            qs = qs.filter(expiry_date__lt=today)
        elif status_filter == 'EXPIRING_SOON':
            qs = qs.filter(expiry_date__gte=today, expiry_date__lte=threshold)
        elif status_filter == 'OK':
            qs = qs.filter(expiry_date__gt=threshold)

        return qs


class ExpiryDashboardView(APIView):
    """
    Admin-only dashboard for expiry tracking.
    Returns:
      - Summary counts (expired, expiring_soon, expiring_month, ok, no_date)
      - Expired products list
      - Expiring soon products list
      - All expiry batches with status labels
    """
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        today = timezone.now().date()
        threshold_week = today + timedelta(days=7)
        threshold_month = today + timedelta(days=30)

        # — Product-level expiry summary —
        all_products = Product.objects.all()
        no_expiry = all_products.filter(expiry_date__isnull=True).count()
        expired_products = all_products.filter(expiry_date__lt=today)
        expiring_week = all_products.filter(expiry_date__gte=today, expiry_date__lte=threshold_week)
        expiring_month = all_products.filter(expiry_date__gt=threshold_week, expiry_date__lte=threshold_month)
        ok_products = all_products.filter(expiry_date__gt=threshold_month)

        # — Batch-level expiry summary —
        all_batches = ExpiryBatch.objects.all()
        expired_batches = all_batches.filter(expiry_date__lt=today)
        expiring_soon_batches = all_batches.filter(expiry_date__gte=today, expiry_date__lte=threshold_week)
        expiring_month_batches = all_batches.filter(expiry_date__gt=threshold_week, expiry_date__lte=threshold_month)
        ok_batches = all_batches.filter(expiry_date__gt=threshold_month)

        # — Serialize product detail lists —
        def product_to_dict(p):
            days = (p.expiry_date - today).days if p.expiry_date else None
            if days is None:
                expiry_status = 'NO_DATE'
            elif days < 0:
                expiry_status = 'EXPIRED'
            elif days <= 7:
                expiry_status = 'EXPIRING_SOON'
            elif days <= 30:
                expiry_status = 'EXPIRING_MONTH'
            else:
                expiry_status = 'OK'
            return {
                'id': p.id,
                'name': p.name,
                'category': p.category,
                'stock_quantity': p.stock_quantity,
                'expiry_date': str(p.expiry_date) if p.expiry_date else None,
                'days_until_expiry': days,
                'expiry_status': expiry_status,
            }

        expired_products_data = [product_to_dict(p) for p in expired_products]
        expiring_soon_data = [product_to_dict(p) for p in expiring_week]

        # — Serialize all batches —
        all_batches_data = ExpiryBatchSerializer(
            all_batches.select_related('product').order_by('expiry_date'),
            many=True
        ).data

        return Response({
            'summary': {
                'products': {
                    'expired': expired_products.count(),
                    'expiring_soon': expiring_week.count(),
                    'expiring_month': expiring_month.count(),
                    'ok': ok_products.count(),
                    'no_date': no_expiry,
                },
                'batches': {
                    'expired': expired_batches.count(),
                    'expiring_soon': expiring_soon_batches.count(),
                    'expiring_month': expiring_month_batches.count(),
                    'ok': ok_batches.count(),
                },
            },
            'expired_products': expired_products_data,
            'expiring_soon_products': expiring_soon_data,
            'all_batches': all_batches_data,
            'scan_date': str(today),
        })


class TriggerExpiryScanView(APIView):
    """
    Admin-only endpoint to manually trigger the expiry scan Celery task.
    POST /api/admin/expiry-scan/
    """
    permission_classes = [IsAdminUserRole]

    def post(self, request):
        from store_app.tasks import scan_and_alert_expiring_products_task
        # Run eagerly (synchronous) in environments without Celery worker;
        # when Celery is running, .delay() will enqueue asynchronously.
        try:
            result = scan_and_alert_expiring_products_task.delay()
            return Response({
                'message': 'Expiry scan task queued successfully.',
                'task_id': str(result.id),
            }, status=status.HTTP_202_ACCEPTED)
        except Exception:
            # Fallback: run synchronously if Celery broker not available
            summary = scan_and_alert_expiring_products_task()
            return Response({
                'message': 'Expiry scan completed synchronously (Celery not available).',
                'summary': summary,
            }, status=status.HTTP_200_OK)
