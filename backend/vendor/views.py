from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import VendorLead, Vendor, GSTDetail
from .serializers import VendorLeadSerializer, VendorSerializer, VendorLeadStatusSerializer
import random
import string
import json
from django.utils import timezone
from django.http import HttpResponse, Http404
import os
import mammoth
from django.conf import settings

class VendorLeadViewSet(viewsets.ModelViewSet):
    queryset = VendorLead.objects.all()
    serializer_class = VendorLeadSerializer

    @action(detail=True, methods=['post'])
    def convert_to_vendor(self, request, pk=None):
        lead = self.get_object()

        # Generate vendor code
        vendor_code = 'VEN' + ''.join(random.choices(string.digits, k=6))

        # Parse GST details
        gst_details = request.data.get('gst_details', [])
        if isinstance(gst_details, str):
            try:
                gst_details = json.loads(gst_details)
            except json.JSONDecodeError:
                return Response({'gst_details': 'Invalid JSON format'}, status=400)

        # Prepare vendor data from lead
        vendor_data = {
            'vendor_code': vendor_code,
            'vendor_name': lead.vendor_name,
            'contact_person': lead.contact_person,
            'designation': lead.designation,
            'email': lead.email,
            'contact_no1': lead.contact_no1,
            'contact_no2': lead.contact_no2,
            'company_type': lead.company_type,
            'address': request.data.get('address', ''),
            'start_date': request.data.get('start_date', timezone.now().date()),
            'end_date': request.data.get('end_date', timezone.now().date()),
            'pan_no': request.data.get('pan_no', ''),
            'rc_no': request.data.get('rc_no', ''),
            'gst_details': gst_details,
        }

        serializer = VendorSerializer(data=vendor_data)
        if serializer.is_valid():
            vendor = serializer.save()
            lead.status = 'converted'
            lead.save()
            return Response(VendorSerializer(vendor).data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.active()  # Only show non-deleted vendors by default
    serializer_class = VendorSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # Parse gst_details from string (if it's sent as JSON string)
        gst_details_raw = data.get('gst_details', [])
        if isinstance(gst_details_raw, str):
            try:
                gst_details = json.loads(gst_details_raw)
            except json.JSONDecodeError:
                return Response({'gst_details': 'Invalid JSON format'}, status=400)
        else:
            gst_details = gst_details_raw

        # Remove gst_details from serializer input, handled separately
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()

        # Create related GSTDetail entries with ForeignKey
        for gst in gst_details:
            GSTDetail.objects.create(vendor=vendor, gst_no=gst['gst_no'], state=gst['state'])

        return Response(self.get_serializer(vendor).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()

        # Parse gst_details from string (if needed)
        gst_details_raw = data.get('gst_details', [])
        if isinstance(gst_details_raw, str):
            try:
                gst_details = json.loads(gst_details_raw)
            except json.JSONDecodeError:
                return Response({'gst_details': 'Invalid JSON format'}, status=400)
        else:
            gst_details = gst_details_raw

        # Remove gst_details from serializer input, handled separately
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()

        # Replace old GSTDetails if provided
        if gst_details:
            instance.gst_details.all().delete()
            for gst in gst_details:
                GSTDetail.objects.create(vendor=vendor, gst_no=gst['gst_no'], state=gst['state'])

        return Response(self.get_serializer(vendor).data)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        vendor = self.get_object()
        new_status = request.data.get('status')

        if new_status not in dict(Vendor.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        vendor.status = new_status
        vendor.save()
        return Response({'status': 'Status updated successfully'})

    @action(detail=True, methods=['post'])
    def soft_delete_vendor(self, request, pk=None):
        """Soft delete a vendor"""
        vendor = self.get_object()
        vendor.soft_delete()
        return Response({
            'message': 'Vendor soft deleted successfully',
            'vendor_id': vendor.id,
            'vendor_name': vendor.vendor_name,
            'deleted_at': vendor.deleted_at
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def restore_vendor(self, request, pk=None):
        """Restore a soft-deleted vendor"""
        # Get vendor from all objects (including deleted ones)
        try:
            vendor = Vendor.objects.with_deleted().get(pk=pk)
        except Vendor.DoesNotExist:
            return Response({'error': 'Vendor not found'}, status=status.HTTP_404_NOT_FOUND)

        if vendor.del_state != 1:
            return Response({'error': 'Vendor is not deleted'}, status=status.HTTP_400_BAD_REQUEST)

        vendor.restore()
        return Response({
            'message': 'Vendor restored successfully',
            'vendor_id': vendor.id,
            'vendor_name': vendor.vendor_name
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def deleted_vendors(self, request):
        """Get all soft-deleted vendors"""
        deleted_vendors = Vendor.objects.deleted()
        serializer = self.get_serializer(deleted_vendors, many=True)
        return Response(serializer.data)

    def get_object(self):
        """Override to handle soft-deleted vendors for restore action"""
        if self.action == 'restore_vendor':
            # For restore action, get from all objects including deleted
            queryset = Vendor.objects.with_deleted()
        else:
            # For other actions, use default queryset (active only)
            queryset = self.get_queryset()

        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        obj = queryset.get(**filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj

class VendorStatusViewSet(viewsets.ModelViewSet):
    queryset = VendorLead.objects.all()
    serializer_class = VendorLeadStatusSerializer

    @action(detail=True, methods=['put'])
    def update_status(self, request, pk=None):
        vendor_lead = self.get_object()
        new_status = request.data.get('status')

        if new_status not in dict(VendorLead.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        vendor_lead.status = new_status
        vendor_lead.save()
        return Response({'status': 'Status updated successfully'})

def preview_docx(request, filename):
    file_path = os.path.join(settings.MEDIA_ROOT, 'contracts', filename)

    if not os.path.exists(file_path):
        raise Http404("File not found")

    with open(file_path, "rb") as docx_file:
        result = mammoth.convert_to_html(docx_file)
        html = result.value  # Extracted HTML from DOCX

    return HttpResponse(html)