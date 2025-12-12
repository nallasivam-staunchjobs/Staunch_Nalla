from django.contrib import admin
from .models import Invoice

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        'invoice_number', 'candidate_name', 'client_name', 'state',
        'total_amount', 'status', 'invoice_date', 'created_at'
    ]
    list_filter = ['status', 'state', 'placement_type', 'created_at', 'invoice_date']
    search_fields = [
        'invoice_number', 'candidate_name', 'client_name',
        'emp_code', 'client_gst', 'client_pan'
    ]
    readonly_fields = [
        'placement_amount', 'cgst', 'sgst', 'igst',
        'total_gst', 'total_amount', 'created_at', 'updated_at'
    ]

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'candidate', 'candidate_name', 'client_name',
                'state', 'emp_code'
            )
        }),
        ('Financial Details', {
            'fields': (
                'ctc', 'placement_type', 'placement_percent',
                'placement_fixed', 'placement_amount'
            )
        }),
        ('GST Calculations', {
            'fields': (
                'cgst', 'sgst', 'igst', 'total_gst', 'total_amount'
            ),
            'classes': ('collapse',)
        }),
        ('Invoice Details', {
            'fields': (
                'invoice_number', 'invoice_date', 'status', 'invoice_file'
            )
        }),
        ('Client Information', {
            'fields': (
                'client_address', 'client_gst', 'client_pan'
            ),
            'classes': ('collapse',)
        }),
        ('Audit Information', {
            'fields': (
                'created_by', 'created_at', 'updated_by', 'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # Creating new object
            obj.created_by = request.user.username
        obj.updated_by = request.user.username
        super().save_model(request, obj, form, change)
