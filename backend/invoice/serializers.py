from rest_framework import serializers
from .models import Invoice
from candidate.models import Candidate

class InvoiceSerializer(serializers.ModelSerializer):
    # Read-only fields for display
    candidate_name_display = serializers.CharField(source='candidate.candidate_name', read_only=True)
    executive_name = serializers.CharField(source='candidate.executive_name', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'candidate', 'candidate_name', 'client_name', 'state', 'emp_code',
            'ctc', 'placement_type', 'placement_percent', 'placement_fixed', 'placement_amount',
            'cgst', 'sgst', 'igst', 'total_gst', 'total_amount',
            'invoice_number', 'invoice_date', 'client_address', 'client_gst', 'client_pan',
            'status', 'invoice_file', 'created_at', 'updated_at', 'created_by', 'updated_by',
            'candidate_name_display', 'executive_name'
        ]
        read_only_fields = [
            'placement_amount', 'cgst', 'sgst', 'igst', 'total_gst', 'total_amount',
            'created_at', 'updated_at', 'candidate_name_display', 'executive_name'
        ]

    def validate_client_pan(self, value):
        """Validate PAN format"""
        if value:
            import re
            pan_regex = r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$'
            if not re.match(pan_regex, value):
                raise serializers.ValidationError("Invalid PAN format. Expected format: AAAAA0000A")
        return value

    def validate_client_gst(self, value):
        """Validate GST format"""
        if value:
            import re
            gst_regex = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
            if not re.match(gst_regex, value):
                raise serializers.ValidationError("Invalid GST format. Expected format: 22AAAAA0000A1Z5")
        return value

    def validate(self, data):
        """Cross-field validation"""
        placement_type = data.get('placement_type')

        if placement_type == 'percentage':
            if not data.get('placement_percent'):
                raise serializers.ValidationError({
                    'placement_percent': 'Placement percentage is required when type is percentage.'
                })
        elif placement_type == 'fixed':
            if not data.get('placement_fixed'):
                raise serializers.ValidationError({
                    'placement_fixed': 'Fixed placement amount is required when type is fixed.'
                })

        return data

class InvoiceListSerializer(serializers.ModelSerializer):
    """Complete serializer for list views - now includes all fields"""
    candidate_name_display = serializers.CharField(source='candidate.candidate_name', read_only=True)
    executive_name = serializers.CharField(source='candidate.executive_name', read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'  # Include all model fields
