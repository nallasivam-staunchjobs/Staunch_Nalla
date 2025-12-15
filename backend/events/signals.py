from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import CallDetails
from candidate.models import Candidate, ClientJob
from .views import update_call_statistics


# Disable any old signals by disconnecting them first
from django.db.models.signals import post_save
post_save.disconnect(sender=Candidate, dispatch_uid='create_calldetails_for_candidate')
post_save.disconnect(sender=ClientJob, dispatch_uid='old_clientjob_signal')


@receiver(post_save, sender=ClientJob, dispatch_uid='new_clientjob_signal')
def update_call_details_for_clientjob(sender, instance, created, **kwargs):
    """
    Update existing CallDetails record when a ClientJob is created
    Adds candidate ID to the appropriate call statistics field
    """
    if created:
        try:
            # Get employee ID from executive_name or assign_to
            executive_code = instance.assign_to or instance.candidate.executive_name
            
            from empreg.models import Employee
            employee = Employee.objects.filter(employeeCode=executive_code).first()
            
            if not employee:
                return
            
            # Find ALL CallDetails for this employee (not just first one)
            call_details = CallDetails.objects.filter(tb_call_emp_id=employee.id)
            
            if not call_details.exists():
                print(f"[CLIENT_MATCH_DEBUG] No CallDetails found for employee {employee.id}")
                return
            
            # Use our direct store_candidate_id function
            from .views import store_candidate_id
            
            # Get candidate client name
            candidate_client = instance.client_name if hasattr(instance, 'client_name') else ''
            
            print(f"[CLIENT_MATCH_DEBUG] ==========================================")
            print(f"[CLIENT_MATCH_DEBUG] Candidate ID: {instance.candidate.id}")
            print(f"[CLIENT_MATCH_DEBUG] ClientJob Client: '{candidate_client}'")
            print(f"[CLIENT_MATCH_DEBUG] Found {call_details.count()} CallDetails for employee")
            
            # Process each CallDetails record
            for call_detail in call_details:
                # Get call_detail client name - try client_name field first, then resolve from tb_call_client_id
                call_detail_client = call_detail.client_name if hasattr(call_detail, 'client_name') and call_detail.client_name else ''
                
                # If client_name is empty, try to resolve from tb_call_client_id
                if not call_detail_client and call_detail.tb_call_client_id:
                    try:
                        from vendor.models import Vendor
                        vendor = Vendor.objects.get(id=call_detail.tb_call_client_id)
                        call_detail_client = vendor.vendor_name
                        print(f"[CLIENT_MATCH_DEBUG] Resolved client from vendor ID {call_detail.tb_call_client_id}: '{call_detail_client}'")
                    except Exception as e:
                        print(f"[CLIENT_MATCH_DEBUG] Failed to resolve vendor ID {call_detail.tb_call_client_id}: {str(e)}")
                
                print(f"[CLIENT_MATCH_DEBUG] ---")
                print(f"[CLIENT_MATCH_DEBUG] CallDetails ID: {call_detail.id}, Plan: {call_detail.tb_call_plan_data}")
                print(f"[CLIENT_MATCH_DEBUG] CallDetails Client: '{call_detail_client}'")
                
                # Determine field type based on client match
                if candidate_client and call_detail_client:
                    if candidate_client.strip().lower() == call_detail_client.strip().lower():
                        # Clients MATCH - add to onplan
                        field_type = 'onplan'
                        profile_field_type = 'profiles'
                        print(f"[CLIENT_MATCH_DEBUG] Result: MATCH  → {field_type}")
                    else:
                        # Clients DON'T MATCH - add to onothers
                        field_type = 'onothers'
                        profile_field_type = 'profilesothers'
                        print(f"[CLIENT_MATCH_DEBUG] Result: NO MATCH  → {field_type}")
                else:
                    # Default to onplan if client info not available
                    field_type = 'onplan'
                    profile_field_type = 'profiles'
                    print(f"[CLIENT_MATCH_DEBUG] Result: DEFAULT (missing client info) → {field_type}")
                
                # Add to appropriate call field (onplan or onothers)
                result1 = store_candidate_id(call_detail.id, instance.candidate.id, field_type)
                
                # If profile_submission is 1 (Yes), also add to appropriate profile field
                if instance.profile_submission == 1:
                    result2 = store_candidate_id(call_detail.id, instance.candidate.id, profile_field_type)
            
            print(f"[CLIENT_MATCH_DEBUG] ==========================================")
            
        except Exception as e:
            import traceback
            pass


@receiver(pre_delete, sender=ClientJob, dispatch_uid='delete_clientjob_signal')
def remove_candidate_from_call_details(sender, instance, **kwargs):
    """
    Remove candidate ID from CallDetails when ClientJob is deleted
    """
    try:
        # Get employee ID from executive_name or assign_to
        executive_code = instance.assign_to or instance.candidate.executive_name
        
        from empreg.models import Employee
        employee = Employee.objects.filter(employeeCode=executive_code).first()
        
        if not employee:
            return
        
        # Find existing CallDetails for this employee
        call_detail = CallDetails.objects.filter(tb_call_emp_id=employee.id).first()
        
        if not call_detail:
            return
        
        # Remove candidate ID from all relevant fields
        from .views import remove_candidate_from_list
        
        fields_to_check = ['tb_calls_onplan', 'tb_calls_onothers']
        
        # Always check onplan and onothers
        for field in fields_to_check:
            current_value = getattr(call_detail, field)
            if current_value and str(instance.candidate.id) in current_value:
                updated_value = remove_candidate_from_list(current_value, instance.candidate.id)
                setattr(call_detail, field, updated_value)
        
        # Check profiles fields only if profile_submission was 1 (Yes)
        if instance.profile_submission == 1:
            profile_fields = ['tb_calls_profiles', 'tb_calls_profilesothers']
            for field in profile_fields:
                current_value = getattr(call_detail, field)
                if current_value and str(instance.candidate.id) in current_value:
                    updated_value = remove_candidate_from_list(current_value, instance.candidate.id)
                    setattr(call_detail, field, updated_value)
        
        call_detail.tb_call_up_date = timezone.now()
        call_detail.save()
            
    except Exception as e:
        import traceback
        pass


def get_client_id_by_name(client_name):
    """
    Get client ID from vendor table by client name
    Returns default ID 1 if not found
    """
    try:
        from vendor.models import Vendor
        vendor = Vendor.objects.filter(vendor_name__iexact=client_name).first()
        return vendor.id if vendor else 1
    except Exception as e:
        return 1
