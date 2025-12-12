from rest_framework import serializers
from .models import VendorLead, Vendor, GSTDetail

class GSTDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = GSTDetail
        fields = ['gst_no', 'state']

class VendorSerializer(serializers.ModelSerializer):
    gst_details = GSTDetailSerializer(many=True, required=False)

    class Meta:
        model = Vendor
        fields = [
            'id',
            'vendor_code',
            'vendor_name',
            'contact_person',
            'designation',
            'email',
            'contact_no1',
            'contact_no2',
            'address',
            'company_type',
            'pan_no',
            'rc_no',
            'contract_copy',
            'start_date',
            'end_date',
            'status',
            'created_at',
            'del_state',
            'deleted_at',
            'gst_details',
        ]
        read_only_fields = ['created_at', 'del_state', 'deleted_at']

    def create(self, validated_data):
        gst_details_data = validated_data.pop('gst_details', [])
        vendor = Vendor.objects.create(**validated_data)

        for gst in gst_details_data:
            GSTDetail.objects.create(vendor=vendor, **gst)

        return vendor

    def update(self, instance, validated_data):
        gst_details_data = validated_data.pop('gst_details', [])

        # Update base vendor fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Replace old GST details
        if gst_details_data:
            instance.gst_details.all().delete()
            for gst in gst_details_data:
                GSTDetail.objects.create(vendor=instance, **gst)

        return instance

class VendorLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorLead
        fields = '__all__'
        read_only_fields = ['created_at']

class VendorLeadStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorLead
        fields = ['status']