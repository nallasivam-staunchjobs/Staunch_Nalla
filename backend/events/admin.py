from django.contrib import admin
from .models import CallDetails


@admin.register(CallDetails)
class CallDetailsAdmin(admin.ModelAdmin):
    list_display = [
        'tb_call_plan_data', 'tb_call_emp_id', 'tb_call_client_id',
        'tb_call_channel', 'tb_call_startdate', 'tb_call_status', 'is_active'
    ]
    list_filter = ['tb_call_status', 'tb_call_add_date', 'tb_call_plan_data']
    search_fields = ['tb_call_description', 'tb_call_channel', 'employee_name', 'client_name']
    readonly_fields = ['tb_call_add_date', 'tb_call_up_date']
