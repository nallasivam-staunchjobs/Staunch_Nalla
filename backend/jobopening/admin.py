from django.contrib import admin
from .models import JobOpening

@admin.register(JobOpening)
class JobOpeningAdmin(admin.ModelAdmin):
    list_display = [
        'job_title', 'company_name', 'state', 'city',
        'is_active', 'posted_date', 'created_by'
    ]
    list_filter = ['is_active', 'state', 'posted_date', 'created_at']
    search_fields = ['job_title', 'company_name', 'contact_person']
    readonly_fields = ['posted_date', 'created_at', 'updated_at']

    fieldsets = (
        ('Job Information', {
            'fields': ('job_title', 'company_name', 'ctc', 'experience', 'state', 'city')
        }),
        ('Requirements', {
            'fields': ('skills', 'languages', 'short_description', 'job_description')
        }),
        ('Contact Details', {
            'fields': ('contact_person', 'contact_number')
        }),
        ('Status & Metadata', {
            'fields': ('is_active', 'posted_date', 'created_by', 'created_at', 'updated_by', 'updated_at')
        }),
    )
