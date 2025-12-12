from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum
from django.http import HttpResponse
from .models import Invoice
from .serializers import InvoiceSerializer, InvoiceListSerializer
from candidate.models import Candidate

class InvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Invoice CRUD operations
    """
    queryset = Invoice.objects.all().select_related('candidate')
    serializer_class = InvoiceSerializer
    # permission_classes = [IsAuthenticated]  # Uncomment when authentication is ready

    def get_serializer_class(self):
        """Use different serializers for different actions"""
        # Always use full InvoiceSerializer to get all fields
        return InvoiceSerializer

    def get_queryset(self):
        """Filter invoices based on query parameters"""
        queryset = Invoice.objects.all().select_related('candidate')

        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by candidate
        candidate_id = self.request.query_params.get('candidate_id', None)
        if candidate_id:
            queryset = queryset.filter(candidate_id=candidate_id)

        # Filter by client
        client_name = self.request.query_params.get('client_name', None)
        if client_name:
            queryset = queryset.filter(client_name__icontains=client_name)

        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search) |
                Q(candidate_name__icontains=search) |
                Q(client_name__icontains=search) |
                Q(emp_code__icontains=search)
            )

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        """Set created_by when creating invoice"""
        # serializer.save(created_by=self.request.user.username)  # Uncomment when auth is ready
        serializer.save()

    def perform_update(self, serializer):
        """Set updated_by when updating invoice"""
        # serializer.save(updated_by=self.request.user.username)  # Uncomment when auth is ready
        serializer.save()

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get dashboard statistics for invoices"""
        total_invoices = Invoice.objects.count()
        draft_invoices = Invoice.objects.filter(status='draft').count()
        generated_invoices = Invoice.objects.filter(status='generated').count()
        paid_invoices = Invoice.objects.filter(status='paid').count()

        total_amount = Invoice.objects.aggregate(
            total=Sum('total_amount')
        )['total'] or 0

        return Response({
            'total_invoices': total_invoices,
            'draft_invoices': draft_invoices,
            'generated_invoices': generated_invoices,
            'paid_invoices': paid_invoices,
            'total_amount': total_amount,
        })

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """Change invoice status"""
        invoice = self.get_object()
        new_status = request.data.get('status')

        if new_status not in dict(Invoice._meta.get_field('status').choices):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        invoice.status = new_status
        invoice.save()

        return Response({
            'message': f'Invoice status changed to {new_status}',
            'status': invoice.status
        })

    @action(detail=False, methods=['get'])
    def generate_invoice_number(self, request):
        """Generate unique invoice number"""
        import random
        import string
        from datetime import datetime

        # Generate format: INV-YYYY-XXXXXXXX
        year = datetime.now().year
        random_part = ''.join(random.choices(string.digits, k=8))
        invoice_number = f"INV-{year}-{random_part}"

        # Ensure uniqueness
        while Invoice.objects.filter(invoice_number=invoice_number).exists():
            random_part = ''.join(random.choices(string.digits, k=8))
            invoice_number = f"INV-{year}-{random_part}"

        return Response({'invoice_number': invoice_number})

    @action(detail=False, methods=['get'])
    def candidates_for_invoice(self, request):
        """Get candidates that can be invoiced"""
        candidates = Candidate.objects.all().values(
            'id', 'candidate_name', 'executive_name', 'city', 'state'
        )
        return Response(candidates)

    @action(detail=True, methods=['get'])
    def download_invoice(self, request, pk=None):
        """Download invoice file"""
        invoice = self.get_object()
        if invoice.invoice_file:
            response = HttpResponse(
                invoice.invoice_file.read(),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.invoice_number}.pdf"'
            return response
        else:
            return Response(
                {'error': 'No invoice file found'},
                status=status.HTTP_404_NOT_FOUND
            )
