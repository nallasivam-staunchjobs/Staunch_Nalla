from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from django.utils import timezone
from datetime import datetime, timedelta
import calendar
from .models import CallDetails
from .serializers import (
    CallDetailsSerializer,
    CallDetailsListSerializer
)
from empreg.models import Employee
from vendor.models import Vendor
from Masters.models import Source, Branch
from locations.models import State, City, Country
# Position model imported dynamically where needed


class CustomPagination(PageNumberPagination):
    """Custom pagination class for handling large datasets"""
    page_size = 50  # Default page size
    page_size_query_param = 'page_size'
    max_page_size = 1000  # Maximum allowed page size
    
    def get_paginated_response(self, data):
        return Response({
            'success': True,
            'pagination': {
                'count': self.page.paginator.count,
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
                'current_page': self.page.number,
                'total_pages': self.page.paginator.num_pages,
                'page_size': self.page_size
            },
            'results': data
        })


class DatabaseQueryHelper:
    """Helper class to consolidate database query patterns using Django ORM"""
    
    @staticmethod
    def get_employee_by_id(emp_id, include_branch_level=False):
        """Get employee data by ID using Django ORM"""
        if not emp_id:
            return None
        
        try:
            employee = Employee.objects.filter(
                id=emp_id,
                del_state=0
            ).first()
            
            if employee:
                result = {
                    'id': employee.id,
                    'firstName': employee.firstName or '',
                    'lastName': employee.lastName or '',
                    'officialEmail': employee.officialEmail or '',
                    'phone1': employee.phone1 or '',
                    'fullName': f"{employee.firstName} {employee.lastName}" if employee.firstName and employee.lastName else employee.firstName or employee.lastName or 'Unknown Employee'
                }
                if include_branch_level:
                    result.update({
                        'branch': employee.branch or '',
                        'level': employee.level or ''
                    })
                return result
        except Exception as e:
            print(f"[ERROR] Error fetching employee by ID {emp_id}: {str(e)}")
        return None
    
    @staticmethod
    def get_vendor_by_id(vendor_id):
        """Get vendor data by ID using Django ORM"""
        if not vendor_id:
            return None
        
        try:
            vendor = Vendor.objects.filter(id=vendor_id).first()
            
            if vendor:
                return {
                    'id': vendor.id,
                    'vendor_name': vendor.vendor_name or '',
                    'contact_person': vendor.contact_person or '',
                    'email': vendor.email or '',
                    'mobile': vendor.contact_no1 or ''
                }
        except Exception as e:
            print(f"[ERROR] Error fetching vendor by ID {vendor_id}: {str(e)}")
        return None


def get_date_range_for_view(view_type, date_str=None):
    
    if date_str:
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            target_date = timezone.now().date()
    else:
        target_date = timezone.now().date()
    
    if view_type == 'day':
        return target_date, target_date
    
    elif view_type == 'week':
        # Get start of week (Monday)
        days_since_monday = target_date.weekday()
        start_date = target_date - timedelta(days=days_since_monday)
        end_date = start_date + timedelta(days=6)  # Sunday
        return start_date, end_date
    
    elif view_type == 'month':
        # Get start and end of month
        start_date = target_date.replace(day=1)
        # Get last day of month
        last_day = calendar.monthrange(target_date.year, target_date.month)[1]
        end_date = target_date.replace(day=last_day)
        return start_date, end_date
    
    else:
        # Default to current date
        return target_date, target_date


# Removed redundant wrapper functions - use DatabaseQueryHelper directly
# get_employee_data() -> DatabaseQueryHelper.get_employee_by_id()
# get_vendor_data() -> DatabaseQueryHelper.get_vendor_by_id()


def get_filtered_employees_by_role(user_employee_data):
    """Get filtered employees based on user role and permissions"""
    if not user_employee_data:
        return Employee.objects.none()
    
    user_level = user_employee_data.get('level', '').lower()
    user_employee_code = user_employee_data.get('employeeCode')
    user_first_name = user_employee_data.get('firstName')
    user_branch = user_employee_data.get('branch')
    
    
    # Apply role-based filtering logic
    if user_level == 'l1':
        employee_objects = Employee.objects.filter(
            Q(employeeCode=user_employee_code) | Q(firstName=user_first_name),
            firstName__isnull=False,
            del_state=0,
            status='Active'
        ).exclude(firstName='')
        
    elif user_level == 'l2':
        if user_branch and user_branch.upper() in ['MADURAI', 'COIMBATORE', 'CHENNAI']:
            employee_objects = Employee.objects.filter(
                Q(reportingManager=user_employee_code) | 
                Q(reportingManager=user_first_name) |
                Q(employeeCode=user_employee_code) |
                Q(firstName=user_first_name),
                Q(branch__iexact=user_branch) | Q(branch__isnull=True),
                firstName__isnull=False,
                del_state=0,
                status='Active'
            ).exclude(firstName='')
        else:
            employee_objects = Employee.objects.filter(
                Q(reportingManager=user_employee_code) | 
                Q(reportingManager=user_first_name) |
                Q(employeeCode=user_employee_code) |
                Q(firstName=user_first_name),
                firstName__isnull=False,
                del_state=0,
                status='Active'
            ).exclude(firstName='')
            
    elif user_level == 'l3':
        if user_branch:
            employee_objects = Employee.objects.filter(
                Q(branch__iexact=user_branch) | Q(branch__isnull=True),
                firstName__isnull=False,
                del_state=0,
                status='Active'
            ).exclude(firstName='')
        else:
            employee_objects = Employee.objects.filter(
                Q(employeeCode=user_employee_code) | Q(firstName=user_first_name),
                firstName__isnull=False,
                del_state=0,
                status='Active'
            ).exclude(firstName='')
            
    elif user_level in ['ceo', 'rm', 'l4', 'l5', 'bm']:
        employee_objects = Employee.objects.filter(
            firstName__isnull=False,
            del_state=0,
            status='Active'
        ).exclude(firstName='')
        
    else:
        if user_branch:
            employee_objects = Employee.objects.filter(
                Q(branch__iexact=user_branch) | Q(branch__isnull=True),
                firstName__isnull=False,
                del_state=0,
                status='Active'
            ).exclude(firstName='')
        else:
            employee_objects = Employee.objects.filter(
                firstName__isnull=False,
                del_state=0,
                status='Active'
            ).exclude(firstName='')
    
    employee_count = employee_objects.count()
    
    return employee_objects.order_by('firstName', 'lastName')


def get_user_employee_data(user):
    """Get employee data for the current logged-in user using Django ORM"""
    if not user or not user.is_authenticated:
        return None
    
    
    def create_employee_dict(employee):
        """Helper to create employee dictionary"""
        return {
            'id': employee.id,
            'employeeCode': employee.employeeCode or '',  
            'firstName': employee.firstName or '',
            'lastName': employee.lastName or '',
            'officialEmail': employee.officialEmail or '',
            'phone1': employee.phone1 or '',
            'branch': employee.branch or '',
            'level': employee.level or '',
            'status': employee.status or '',
            'fullName': f"{employee.firstName} {employee.lastName}" if employee.firstName and employee.lastName else employee.firstName or employee.lastName or 'Unknown Employee'
        }
    
    try:
        # Strategy 1: Match by email
        if user.email:
            employee = Employee.objects.filter(
                officialEmail=user.email,
                del_state=0
            ).first()
            if employee:
                employee_dict = create_employee_dict(employee)
                return employee_dict
        
        # Strategy 2: Match by username (firstName)
        employee = Employee.objects.filter(
            Q(firstName=user.username) | Q(firstName__iexact=user.username),
            del_state=0
        ).first()
        if employee:
            return create_employee_dict(employee)
        
        # Strategy 3: Match by employeeCode if username looks like employee code
        if user.username and (user.username.startswith('CBE') or user.username.startswith('EMP')):
            employee = Employee.objects.filter(
                employeeCode=user.username,
                del_state=0
            ).first()
            if employee:
                return create_employee_dict(employee)
        
        # Strategy 4: For testing, return first active employee if no match found
        employee = Employee.objects.filter(
            Q(del_state=0) | Q(del_state__isnull=True)
        ).order_by('id').first()
        if employee:
            return create_employee_dict(employee)
            
    except Exception as e:
        print(f"[ERROR] Error fetching employee data for user {user.username}: {str(e)}")
    
    return None


def get_employee_branch_from_plan(emp_id):
    """Get employee's branch from employee data using Django ORM"""
    if not emp_id:
        return None
    
    try:
        employee = Employee.objects.filter(
            id=emp_id,
            del_state=0,
            branch__isnull=False
        ).first()
        return employee.branch if employee else None
    except Exception as e:
        print(f"[ERROR] Error fetching employee branch for ID {emp_id}: {str(e)}")
        return None


def update_call_statistics(call_detail_id, candidate_id=None, plan_id=None):
    """
    Update call statistics based on client matching between candidate_clientjobs and call plan
    Updates tb_calls_onplan or tb_calls_onothers fields in CallDetails model
    
    Args:
        call_detail_id: ID of the call detail record
        candidate_id: ID of the candidate (optional, will fetch from call_detail if not provided)
        plan_id: ID of the plan (optional, will fetch from call_detail if not provided)
    """
    try:
        # Get call detail info if candidate_id or plan_id not provided using Django ORM
        if not candidate_id or not plan_id:
            call_detail = CallDetails.objects.filter(id=call_detail_id).first()
            if not call_detail:
                print(f"Call detail with ID {call_detail_id} not found")
                return False
            
            candidate_id = candidate_id or call_detail.tb_call_emp_id
            plan_id = plan_id or call_detail.tb_call_plan_id
        
        # Note: candidate_clientjobs table may not exist, using fallback logic
        candidate_client_name = None
        plan_client_name = None
        
        # Try to get client name from vendor table using call detail's client_id
        try:
            call_detail = CallDetails.objects.filter(id=call_detail_id).first()
            if call_detail and call_detail.tb_call_client_id:
                vendor = Vendor.objects.filter(id=call_detail.tb_call_client_id).first()
                if vendor:
                    candidate_client_name = vendor.vendor_name
        except Exception as e:
            print(f"Error getting candidate client name: {str(e)}")
        
        # Get plan client name from vendor table
        try:
            call_detail = CallDetails.objects.filter(id=call_detail_id).first()
            if call_detail and call_detail.tb_call_client_id:
                vendor = Vendor.objects.filter(id=call_detail.tb_call_client_id).first()
                if vendor:
                    plan_client_name = vendor.vendor_name
        except Exception as e:
            print(f"Error getting plan client name: {str(e)}")
        
        # Compare client names and update statistics
        if candidate_client_name and plan_client_name:
            if candidate_client_name.strip().lower() == plan_client_name.strip().lower():
                # Clients match - add candidate to calls_on_plan
                increment_calls_on_plan(call_detail_id, candidate_id)
                print(f"Client match found: {candidate_client_name} == {plan_client_name}")
                return True
            else:
                # Clients don't match - add candidate to calls_on_others
                increment_calls_on_others(call_detail_id, candidate_id)
                print(f"Client mismatch: {candidate_client_name} != {plan_client_name}")
                return True
        else:
            print(f"Missing client data - Candidate client: {candidate_client_name}, Plan client: {plan_client_name}")
            return False
                
    except Exception as e:
        print(f"Error updating call statistics: {str(e)}")
        return False


def increment_calls_on_plan(call_detail_id, candidate_id):
    """
    Add candidate ID to tb_calls_onplan when candidate client matches plan client
    
    Args:
        call_detail_id: ID of the call detail record
        candidate_id: ID of the candidate to add
    """
    try:
        
        
        call_detail = CallDetails.objects.filter(id=call_detail_id).first()
        
        if call_detail:
            print(f"[DEBUG] Found call_detail. Current tb_calls_onplan: '{call_detail.tb_calls_onplan}'")
            
            # Use the helper function to add candidate ID
            updated_ids = add_candidate_to_list(call_detail.tb_calls_onplan, candidate_id)
            
            # Store the updated comma-separated candidate IDs
            call_detail.tb_calls_onplan = updated_ids
            call_detail.tb_call_up_date = timezone.now()
            call_detail.save(update_fields=['tb_calls_onplan', 'tb_call_up_date'])
            
            print(f"[DEBUG] [SUCCESS] Successfully updated tb_calls_onplan to: '{call_detail.tb_calls_onplan}'")
            print(f"[DEBUG] Candidate count: {get_candidate_count(call_detail.tb_calls_onplan)}")
        else:
            print(f"[ERROR] Call detail with ID {call_detail_id} not found")
                
    except Exception as e:
        print(f"[ERROR] Error adding candidate to tb_calls_onplan: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")


def increment_calls_on_others(call_detail_id, candidate_id):
    """
    Add candidate ID to tb_calls_onothers when candidate client doesn't match plan client
    
    Args:
        call_detail_id: ID of the call detail record
        candidate_id: ID of the candidate to add
    """
    try:
        print(f"[DEBUG] increment_calls_on_others called with call_detail_id={call_detail_id}, candidate_id={candidate_id}")
        
        call_detail = CallDetails.objects.filter(id=call_detail_id).first()
        
        if call_detail:
            print(f"[DEBUG] Found call_detail. Current tb_calls_onothers: '{call_detail.tb_calls_onothers}'")
            
            # Use the helper function to add candidate ID
            updated_ids = add_candidate_to_list(call_detail.tb_calls_onothers, candidate_id)
            
            # Store the updated comma-separated candidate IDs
            call_detail.tb_calls_onothers = updated_ids
            call_detail.tb_call_up_date = timezone.now()
            call_detail.save(update_fields=['tb_calls_onothers', 'tb_call_up_date'])
            
            print(f"[DEBUG] [SUCCESS] Successfully updated tb_calls_onothers to: '{call_detail.tb_calls_onothers}'")
            print(f"[DEBUG] Candidate count: {get_candidate_count(call_detail.tb_calls_onothers)}")
        else:
            print(f"[ERROR] Call detail with ID {call_detail_id} not found")
                
    except Exception as e:
        print(f"[ERROR] Error adding candidate to tb_calls_onothers: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")


def add_candidate_to_list(existing_string, candidate_id):
    """
    Helper function to add candidate ID to a comma-separated string
    
    Args:
        existing_string: Current comma-separated candidate IDs string
        candidate_id: New candidate ID to add
    
    Returns:
        Updated comma-separated candidate IDs string
    """
    # Get existing candidate IDs - handle None, empty string, and '0' cases
    existing_ids = []
    if existing_string and str(existing_string).strip() not in ['', '0', 'None']:
        existing_ids = [id.strip() for id in str(existing_string).split(',') if id.strip() and id.strip() != '0']
    
    print(f"[DEBUG] Existing candidate IDs: {existing_ids}")
    
    # Add new candidate ID if not already present
    candidate_id_str = str(candidate_id)
    if candidate_id_str not in existing_ids:
        existing_ids.append(candidate_id_str)
        print(f"[DEBUG] Added new candidate ID: {candidate_id_str}")
    else:
        print(f"[DEBUG] Candidate ID {candidate_id_str} already exists")
    
    # Return as comma-separated candidate IDs
    return ','.join(existing_ids) if existing_ids else ''


def remove_candidate_from_list(existing_string, candidate_id):
    """
    Helper function to remove candidate ID from a comma-separated string
    
    Args:
        existing_string: Current comma-separated candidate IDs string
        candidate_id: Candidate ID to remove
    
    Returns:
        Updated comma-separated candidate IDs string
    """
    # Get existing candidate IDs - handle None, empty string, and '0' cases
    existing_ids = []
    if existing_string and str(existing_string).strip() not in ['', '0', 'None']:
        existing_ids = [id.strip() for id in str(existing_string).split(',') if id.strip() and id.strip() != '0']
    
    print(f"[DEBUG] Existing candidate IDs before removal: {existing_ids}")
    
    # Remove candidate ID if present
    candidate_id_str = str(candidate_id)
    if candidate_id_str in existing_ids:
        existing_ids.remove(candidate_id_str)
        print(f"[DEBUG] Removed candidate ID: {candidate_id_str}")
    else:
        print(f"[DEBUG] Candidate ID {candidate_id_str} not found in list")
    
    # Return as comma-separated candidate IDs
    return ','.join(existing_ids) if existing_ids else ''


def store_candidate_id(call_detail_id, candidate_id, field_type='onplan'):
    """
    Main function to store candidate ID in the appropriate CallDetails field
    
    Args:
        call_detail_id: ID of the call detail record
        candidate_id: ID of the candidate to add
        field_type: Type of field ('onplan', 'onothers', 'profiles', 'profilesothers')
    
    Returns:
        bool: Success status
    """
    try:
        print(f"[DEBUG] store_candidate_id called with call_detail_id={call_detail_id}, candidate_id={candidate_id}, field_type={field_type}")
        
        call_detail = CallDetails.objects.filter(id=call_detail_id).first()
        
        if not call_detail:
            print(f"[ERROR] Call detail with ID {call_detail_id} not found")
            return False
        
        # Get the appropriate field based on field_type
        field_mapping = {
            'onplan': call_detail.tb_calls_onplan,
            'onothers': call_detail.tb_calls_onothers,
            'profiles': call_detail.tb_calls_profiles,
            'profilesothers': call_detail.tb_calls_profilesothers
        }
        
        if field_type not in field_mapping:
            print(f"[ERROR] Invalid field_type: {field_type}")
            return False
        
        current_value = field_mapping[field_type]
        print(f"[DEBUG] Current {field_type} value: '{current_value}'")
        
        # Use the helper function to add candidate ID
        updated_ids = add_candidate_to_list(current_value, candidate_id)
        
        # Update the appropriate field
        if field_type == 'onplan':
            call_detail.tb_calls_onplan = updated_ids
        elif field_type == 'onothers':
            call_detail.tb_calls_onothers = updated_ids
        elif field_type == 'profiles':
            call_detail.tb_calls_profiles = updated_ids
        elif field_type == 'profilesothers':
            call_detail.tb_calls_profilesothers = updated_ids
        
        call_detail.tb_call_up_date = timezone.now()
        call_detail.save(update_fields=[f'tb_calls_{field_type}', 'tb_call_up_date'])
        
        print(f"[DEBUG] [SUCCESS] Successfully updated tb_calls_{field_type} to: '{updated_ids}'")
        print(f"[DEBUG] Candidate count: {get_candidate_count(updated_ids)}")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Error storing candidate ID: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return False


def get_call_statistics(call_detail_id=None, candidate_id=None, plan_id=None):
    """
    Get call statistics from CallDetails model fields
    
    Args:
        call_detail_id: ID of the call detail record (optional)
        candidate_id: ID of the candidate (optional)
        plan_id: ID of the plan (optional)
    
    Returns:
        dict: Statistics data or None if not found
    """
    try:
        from django.db.models import Sum, Q
        from django.db.models.functions import Cast
        from django.db.models import IntegerField
        
        if call_detail_id:
            # Get single call detail record using Django ORM
            call_detail = CallDetails.objects.filter(id=call_detail_id).first()
            if call_detail:
                stats = format_statistics_for_frontend(call_detail)
                stats.update({
                    'tb_call_add_date': call_detail.tb_call_add_date,
                    'tb_call_up_date': call_detail.tb_call_up_date
                })
                return stats
        elif candidate_id:
            # Aggregate statistics for candidate - now using candidate ID counting
            call_details = CallDetails.objects.filter(tb_call_emp_id=candidate_id)
            
            total_calls_on_plan = 0
            total_calls_on_others = 0
            total_profiles_on_plan = 0
            total_profiles_on_others = 0
            
            for call_detail in call_details:
                total_calls_on_plan += get_candidate_count(call_detail.tb_calls_onplan)
                total_calls_on_others += get_candidate_count(call_detail.tb_calls_onothers)
                total_profiles_on_plan += get_candidate_count(call_detail.tb_calls_profiles)
                total_profiles_on_others += get_candidate_count(call_detail.tb_calls_profilesothers)
            
            return {
                'total_calls_on_plan': total_calls_on_plan,
                'total_calls_on_others': total_calls_on_others,
                'total_profiles_on_plan': total_profiles_on_plan,
                'total_profiles_on_others': total_profiles_on_others
            }
        elif plan_id:
            # Aggregate statistics for plan - now using candidate ID counting
            call_details = CallDetails.objects.filter(tb_call_plan_id=plan_id)
            
            total_calls_on_plan = 0
            total_calls_on_others = 0
            total_profiles_on_plan = 0
            total_profiles_on_others = 0
            
            for call_detail in call_details:
                total_calls_on_plan += get_candidate_count(call_detail.tb_calls_onplan)
                total_calls_on_others += get_candidate_count(call_detail.tb_calls_onothers)
                total_profiles_on_plan += get_candidate_count(call_detail.tb_calls_profiles)
                total_profiles_on_others += get_candidate_count(call_detail.tb_calls_profilesothers)
            
            return {
                'total_calls_on_plan': total_calls_on_plan,
                'total_calls_on_others': total_calls_on_others,
                'total_profiles_on_plan': total_profiles_on_plan,
                'total_profiles_on_others': total_profiles_on_others
            }
        else:
            return None
            
    except Exception as e:
        print(f"Error getting call statistics: {str(e)}")
        return None


def increment_profiles_on_plan(call_detail_id, candidate_id):
    """
    Add candidate ID to tb_calls_profiles when candidate client matches plan client
    
    Args:
        call_detail_id: ID of the call detail record
        candidate_id: ID of the candidate to add
    """
    try:
        print(f"[DEBUG] increment_profiles_on_plan called with call_detail_id={call_detail_id}, candidate_id={candidate_id}")
        
        call_detail = CallDetails.objects.filter(id=call_detail_id).first()
        
        if call_detail:
            print(f"[DEBUG] Found call_detail. Current tb_calls_profiles: '{call_detail.tb_calls_profiles}'")
            
            # Use the helper function to add candidate ID
            updated_ids = add_candidate_to_list(call_detail.tb_calls_profiles, candidate_id)
            
            # Store the updated comma-separated candidate IDs
            call_detail.tb_calls_profiles = updated_ids
            call_detail.tb_call_up_date = timezone.now()
            call_detail.save(update_fields=['tb_calls_profiles', 'tb_call_up_date'])
            
            print(f"[DEBUG] [SUCCESS] Successfully updated tb_calls_profiles to: '{call_detail.tb_calls_profiles}'")
            print(f"[DEBUG] Candidate count: {get_candidate_count(call_detail.tb_calls_profiles)}")
        else:
            print(f"[ERROR] Call detail with ID {call_detail_id} not found")
                
    except Exception as e:
        print(f"[ERROR] Error adding candidate to tb_calls_profiles: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")


def increment_profiles_on_others(call_detail_id, candidate_id):
    """
    Add candidate ID to tb_calls_profilesothers when candidate client doesn't match plan client
    
    Args:
        call_detail_id: ID of the call detail record
        candidate_id: ID of the candidate to add
    """
    try:
        print(f"[DEBUG] increment_profiles_on_others called with call_detail_id={call_detail_id}, candidate_id={candidate_id}")
        
        call_detail = CallDetails.objects.filter(id=call_detail_id).first()
        
        if call_detail:
            print(f"[DEBUG] Found call_detail. Current tb_calls_profilesothers: '{call_detail.tb_calls_profilesothers}'")
            
            # Use the helper function to add candidate ID
            updated_ids = add_candidate_to_list(call_detail.tb_calls_profilesothers, candidate_id)
            
            # Store the updated comma-separated candidate IDs
            call_detail.tb_calls_profilesothers = updated_ids
            call_detail.tb_call_up_date = timezone.now()
            call_detail.save(update_fields=['tb_calls_profilesothers', 'tb_call_up_date'])
            
            print(f"[DEBUG] [SUCCESS] Successfully updated tb_calls_profilesothers to: '{call_detail.tb_calls_profilesothers}'")
            print(f"[DEBUG] Candidate count: {get_candidate_count(call_detail.tb_calls_profilesothers)}")
        else:
            print(f"[ERROR] Call detail with ID {call_detail_id} not found")
                
    except Exception as e:
        print(f"[ERROR] Error adding candidate to tb_calls_profilesothers: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")


# Helper functions for converting candidate IDs to counts
def get_candidate_count(candidate_ids_string):
    """
    Convert comma-separated candidate IDs to count for frontend
    
    Args:
        candidate_ids_string: String like "123,456,789" or None
    
    Returns:
        int: Count of candidates
    """
    print(f"[DEBUG] get_candidate_count called with: '{candidate_ids_string}' (type: {type(candidate_ids_string)})")
    
    # Handle None, empty string, or whitespace
    if not candidate_ids_string:
        print(f"[DEBUG] Empty/None value, returning 0")
        return 0
    
    # Convert to string if it's not already
    candidate_ids_string = str(candidate_ids_string).strip()
    
    if candidate_ids_string == '' or candidate_ids_string == 'None':
        print(f"[DEBUG] Empty string or 'None', returning 0")
        return 0
    
    # Handle legacy format: '0' means no candidates (old count format)
    if candidate_ids_string == '0':
        print(f"[DEBUG] Legacy '0' format, returning 0")
        return 0
    
    # Handle new format: comma-separated candidate IDs
    candidate_ids = [id.strip() for id in candidate_ids_string.split(',') if id.strip() and id.strip() != '0']
    count = len(candidate_ids)
    print(f"[DEBUG] Parsed candidate IDs: {candidate_ids}, count: {count}")
    return count


def get_candidate_ids_list(candidate_ids_string):
    """
    Convert comma-separated string to list of candidate IDs
    
    Args:
        candidate_ids_string: String like "123,456,789" or None
    
    Returns:
        list: List of candidate IDs as integers
    """
    if not candidate_ids_string or candidate_ids_string.strip() == '':
        return []
    
    # Handle legacy format: '0' means no candidates (old count format)
    if candidate_ids_string.strip() == '0':
        return []
    
    # Handle new format: comma-separated candidate IDs (exclude '0' values)
    return [int(id.strip()) for id in candidate_ids_string.split(',') if id.strip().isdigit() and id.strip() != '0']


def format_statistics_for_frontend(call_detail):
    """
    Format call statistics for frontend - returns counts only
    
    Args:
        call_detail: CallDetails model instance
    
    Returns:
        dict: Statistics with counts for frontend
    """
    return {
        'id': call_detail.id,
        'plan_data': call_detail.tb_call_plan_data,
        'tb_calls_onplan_count': get_candidate_count(call_detail.tb_calls_onplan),
        'tb_calls_onothers_count': get_candidate_count(call_detail.tb_calls_onothers),
        'tb_calls_profiles_count': get_candidate_count(call_detail.tb_calls_profiles),
        'tb_calls_profilesothers_count': get_candidate_count(call_detail.tb_calls_profilesothers),
        
        # Optional: Include candidate IDs if needed for detailed analysis
        'tb_calls_onplan_ids': get_candidate_ids_list(call_detail.tb_calls_onplan),
        'tb_calls_onothers_ids': get_candidate_ids_list(call_detail.tb_calls_onothers),
        'tb_calls_profiles_ids': get_candidate_ids_list(call_detail.tb_calls_profiles),
        'tb_calls_profilesothers_ids': get_candidate_ids_list(call_detail.tb_calls_profilesothers)
    }


class CallDetailsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CallDetails model - matches frontend Events.jsx expectations
    UPDATED: Now returns counts instead of raw candidate IDs
    """
    queryset = CallDetails.objects.all()
    serializer_class = CallDetailsSerializer
    pagination_class = CustomPagination
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CallDetailsListSerializer
        return CallDetailsSerializer
    
    @staticmethod
    def _sanitize_text_field(text):
        """
        Sanitize text fields to prevent Unicode encoding errors
        Replaces problematic Unicode characters with ASCII-safe equivalents
        
        Args:
            text: String to sanitize
            
        Returns:
            Sanitized string safe for ASCII encoding
        """
        if not text:
            return text
        
        try:
            # Replace common problematic Unicode characters
            replacements = {
                '\xa0': ' ',      # Non-breaking space → regular space
                '\u2018': "'",    # Left single quote → apostrophe
                '\u2019': "'",    # Right single quote → apostrophe
                '\u201c': '"',    # Left double quote → quote
                '\u201d': '"',    # Right double quote → quote
                '\u2013': '-',    # En dash → hyphen
                '\u2014': '-',    # Em dash → hyphen
                '\u2026': '...',  # Ellipsis → three dots
                '\u00a0': ' ',    # Non-breaking space (alternative)
            }
            
            sanitized = str(text)
            for unicode_char, replacement in replacements.items():
                sanitized = sanitized.replace(unicode_char, replacement)
            
            # Encode to UTF-8 and decode back to ensure compatibility
            sanitized = sanitized.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
            
            return sanitized
        except Exception as e:
            print(f"[WARNING] Error sanitizing text: {str(e)}")
            # Fallback: encode as ASCII, ignoring errors
            return str(text).encode('ascii', errors='ignore').decode('ascii')
    
    def perform_create(self, serializer):
        """Override perform_create to validate duplicate plans and initialize call statistics"""
        # Debug logging for state ID
        if 'tb_call_state_id' in self.request.data:
            print(f"[DEBUG] [BACKEND STATE DEBUG] Creating with tb_call_state_id: '{self.request.data['tb_call_state_id']}' (type: {type(self.request.data['tb_call_state_id'])})")
        
        # Validate duplicate plan assignment
        employee_id = self.request.data.get('tb_call_emp_id')
        employee_name = self.request.data.get('employee_name')
        plan_data = self.request.data.get('tb_call_plan_data')
        start_date = self.request.data.get('tb_call_startdate')
        
        if (employee_id or employee_name) and plan_data and start_date:
            # Extract date part from datetime
            if 'T' in str(start_date):
                date_part = str(start_date).split('T')[0]
            else:
                date_part = str(start_date)
            
            # Check for existing plan assignment using employee_id if available
            if employee_id:
                existing_plan = CallDetails.objects.filter(
                    tb_call_emp_id=employee_id,
                    tb_call_plan_data=plan_data,
                    tb_call_startdate__date=date_part
                ).exists()
                employee_identifier = f"ID:{employee_id}"
            else:
                existing_plan = CallDetails.objects.filter(
                    employee_name=employee_name,
                    tb_call_plan_data=plan_data,
                    tb_call_startdate__date=date_part
                ).exists()
                employee_identifier = f"Name:{employee_name}"
            
            if existing_plan:
                print(f"[DUPLICATE-PLAN] Duplicate plan assignment detected: {employee_identifier} already has {plan_data} on {date_part}")
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    'tb_call_plan_data': f'Employee {employee_identifier} already has plan {plan_data} assigned on {date_part}. Please select a different plan.'
                })
        
        # Save the instance first
        instance = serializer.save()
        
        # Debug the saved state ID
        print(f"[DEBUG] [BACKEND STATE DEBUG] Saved tb_call_state_id: '{instance.tb_call_state_id}' (type: {type(instance.tb_call_state_id)})")
        
        # Initialize call statistics fields with empty strings (will store candidate IDs)
        try:
            if not instance.tb_calls_onplan:
                instance.tb_calls_onplan = ''
            if not instance.tb_calls_onothers:
                instance.tb_calls_onothers = ''
            if not instance.tb_calls_profiles:
                instance.tb_calls_profiles = ''
            if not instance.tb_calls_profilesothers:
                instance.tb_calls_profilesothers = ''
            
            # Save the updated instance
            instance.save()
            
            print(f"[DEBUG] CallDetails created with ID {instance.id}, initialized call statistics")
            
        except Exception as e:
            print(f"[ERROR] Failed to initialize call statistics for CallDetails {instance.id}: {str(e)}")
            # Don't fail the creation if statistics update fails
    
    def perform_update(self, serializer):
        """Override perform_update to validate duplicate plans and handle frontend-backend field mapping"""
        print(f"[DEBUG] Updating CallDetails with data: {self.request.data}")
        
        # Debug logging for state ID
        if 'tb_call_state_id' in self.request.data:
            print(f"[DEBUG] [BACKEND STATE DEBUG] Updating with tb_call_state_id: '{self.request.data['tb_call_state_id']}' (type: {type(self.request.data['tb_call_state_id'])})")
        
        # Validate duplicate plan assignment (exclude current instance)
        employee_id = self.request.data.get('tb_call_emp_id')
        employee_name = self.request.data.get('employee_name')
        plan_data = self.request.data.get('tb_call_plan_data')
        start_date = self.request.data.get('tb_call_startdate')
        current_instance = self.get_object()
        
        if (employee_id or employee_name) and plan_data and start_date:
            # Extract date part from datetime
            if 'T' in str(start_date):
                date_part = str(start_date).split('T')[0]
            else:
                date_part = str(start_date)
            
            # Check for existing plan assignment using employee_id if available (excluding current instance)
            if employee_id:
                existing_plan = CallDetails.objects.filter(
                    tb_call_emp_id=employee_id,
                    tb_call_plan_data=plan_data,
                    tb_call_startdate__date=date_part
                ).exclude(
                    id=current_instance.id
                ).exists()
                employee_identifier = f"ID:{employee_id}"
            else:
                existing_plan = CallDetails.objects.filter(
                    employee_name=employee_name,
                    tb_call_plan_data=plan_data,
                    tb_call_startdate__date=date_part
                ).exclude(
                    id=current_instance.id
                ).exists()
                employee_identifier = f"Name:{employee_name}"
            
            if existing_plan:
                print(f"[DUPLICATE-PLAN] Duplicate plan assignment detected during update: {employee_identifier} already has {plan_data} on {date_part}")
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    'tb_call_plan_data': f'Employee {employee_identifier} already has plan {plan_data} assigned on {date_part}. Please select a different plan.'
                })
        
        # Save the updated instance
        instance = serializer.save()
        return instance
    
    def get_queryset(self):
        try:
            print(f"[DEBUG] get_queryset called with params: {dict(self.request.query_params)}")
            queryset = CallDetails.objects.all()
            print(f"[DEBUG] Initial queryset count: {queryset.count()}")
            
            # Get current user's employee data for branch filtering
            user_employee_data = get_user_employee_data(self.request.user)
            user_branch = None
            is_admin = False
            
            if user_employee_data:
                user_branch = user_employee_data.get('branch')
                user_level = user_employee_data.get('level', '').lower()
                # Check if user is admin (L4, L5, rm, ceo, bm)
                is_admin = user_level in ['l4', 'l5', 'rm', 'ceo', 'bm']
                print(f"[DEBUG] User branch: {user_branch}, level: {user_level}, is_admin: {is_admin}")
                
                # Special debug for CEO/RM users
                if user_level in ['ceo', 'l5', 'rm', 'l4']:
                    print(f"[CEO/RM DEBUG] High-level user detected: {user_level}, should see ALL branches")
                    print(f"[CEO/RM DEBUG] is_admin flag: {is_admin}, user_branch: {user_branch}")
            
            # Apply branch filtering if user is not admin and has a branch
            branch_id_param = self.request.query_params.get('branch_id', None)
            if branch_id_param:
                # If branch_id is explicitly provided in query params, use it
                print(f"[DEBUG] Using explicit branch_id from params: {branch_id_param}")
                # Filter by employees who belong to this branch using Django ORM
                # Only include employees from the specific branch (no NULL branches)
                branch_employee_ids = list(Employee.objects.filter(
                    branch__iexact=branch_id_param,
                    del_state=0
                ).values_list('id', flat=True))
                if branch_employee_ids:
                    queryset = queryset.filter(tb_call_emp_id__in=branch_employee_ids)
                    print(f"[DEBUG] After branch filter (explicit): {queryset.count()}")
            elif not is_admin and user_branch:
                # If user is not admin, filter by their branch using Django ORM
                print(f"[DEBUG] Applying branch filter for non-admin user: {user_branch}")
                # Only include employees from the specific branch (no NULL branches)
                branch_employee_ids = list(Employee.objects.filter(
                    branch__iexact=user_branch,
                    del_state=0
                ).values_list('id', flat=True))
                
                print(f"[DEBUG] Branch employee IDs for '{user_branch}': {branch_employee_ids}")
                
                # Debug: Show employee details for branch filtering
                branch_employees = Employee.objects.filter(
                    branch__iexact=user_branch,
                    del_state=0
                )[:10]  # Show first 10
                for emp in branch_employees:
                    print(f"[DEBUG] Branch Employee: ID={emp.id}, Name={emp.firstName}, Branch={emp.branch}")
                
                if branch_employee_ids:
                    queryset = queryset.filter(tb_call_emp_id__in=branch_employee_ids)
                    print(f"[DEBUG] After branch filter (user): {queryset.count()}")
            else:
                # Admin user or no branch - show all events
                if is_admin:
                    print(f"[CEO/RM DEBUG] Admin user ({user_level}) - NO branch filtering applied, showing ALL branches")
                else:
                    print(f"[DEBUG] No branch filtering applied - user has no branch or other reason")
                
                # Debug: Show event dates for branch-filtered events
                for event in queryset[:5]:  # Show first 5 events
                    print(f"[DEBUG] Event ID {event.id}: Start={event.tb_call_startdate}, End={event.tb_call_todate}, Plan={event.tb_call_plan_data}")
            
            # Filter by status
            status_filter = self.request.query_params.get('status', None)
            if status_filter is not None:
                queryset = queryset.filter(tb_call_status=status_filter)
                print(f"[DEBUG] After status filter: {queryset.count()}")
            
            # Filter by employee
            emp_id = self.request.query_params.get('employee_id', None)
            if emp_id is not None:
                queryset = queryset.filter(tb_call_emp_id=emp_id)
                print(f"[DEBUG] After employee filter: {queryset.count()}")
            
            # Filter by vendor/client
            vendor_id = self.request.query_params.get('vendor_id', None)
            if vendor_id is not None:
                queryset = queryset.filter(tb_call_client_id=vendor_id)
                print(f"[DEBUG] After vendor filter: {queryset.count()}")
            
            # Filter by plan ID
            plan_id = self.request.query_params.get('plan_id', None)
            if plan_id is not None:
                queryset = queryset.filter(tb_call_plan_id=plan_id)
                print(f"[DEBUG] After plan filter: {queryset.count()}")
            
            # Date range filtering for call plans
            start_date = self.request.query_params.get('start_date', None)
            end_date = self.request.query_params.get('end_date', None)
            show_all = self.request.query_params.get('show_all', None)
            
            print(f"[DEBUG] Date params - start_date: {start_date}, end_date: {end_date}, show_all: {show_all}")
            
            # Default behavior: show all events for calendar views, current date for others
            if not start_date and not end_date and not show_all:
                # For now, show all events to fix the calendar display issue
                # TODO: Later we can add proper date range filtering based on calendar view
                print(f"[DEBUG] No date filters provided - showing all events")
                print(f"[DEBUG] All events count: {queryset.count()}")
                
                # Debug: Show all events
                for event in queryset[:5]:
                    print(f"[DEBUG] All Event ID {event.id}: Start={event.tb_call_startdate}, End={event.tb_call_todate}, Plan={event.tb_call_plan_data}")
            else:
                if start_date:
                    try:
                        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                        queryset = queryset.filter(tb_call_startdate__date__gte=start_date_obj)
                        print(f"[DEBUG] CallDetails filtering by start_date: {start_date_obj}, count: {queryset.count()}")
                    except ValueError as ve:
                        print(f"[WARNING] Invalid start_date format: {start_date}, error: {ve}")
                        pass
                
                if end_date:
                    try:
                        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                        queryset = queryset.filter(tb_call_todate__date__lte=end_date_obj)
                        print(f"[DEBUG] CallDetails filtering by end_date: {end_date_obj}, count: {queryset.count()}")
                    except ValueError as ve:
                        print(f"[WARNING] Invalid end_date format: {end_date}, error: {ve}")
                        pass
            
            print(f"[DEBUG] Final queryset count before ordering: {queryset.count()}")
            result = queryset.order_by('-tb_call_add_date')
            print(f"[DEBUG] Final queryset count after ordering: {result.count()}")
            return result
        except Exception as e:
            import traceback
            print(f"[ERROR] Error in get_queryset: {str(e)}")
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            # Return empty queryset on error
            return CallDetails.objects.none()
    
    def list(self, request, *args, **kwargs):
        """Override list method to add error handling"""
        try:
            print(f"[DEBUG] list method called")
            queryset = self.filter_queryset(self.get_queryset())
            print(f"[DEBUG] Filtered queryset count: {queryset.count()}")
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            print(f"[DEBUG] Serializer data length: {len(serializer.data)}")
            return Response(serializer.data)
        except Exception as e:
            import traceback
            print(f"[ERROR] Error in list method: {str(e)}")
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to fetch call details: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='test')
    def test_endpoint(self, request):
        """Test endpoint to check if basic functionality works"""
        try:
            # Test basic model access
            count = CallDetails.objects.count()
            return Response({
                'success': True,
                'message': 'Test endpoint working',
                'total_records': count,
                'query_params': dict(request.query_params)
            })
        except Exception as e:
            import traceback
            return Response({
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def active_calls(self, request):
        """Get all active call details with pagination"""
        active_calls = self.get_queryset().filter(tb_call_status=1)
        
        # Apply pagination for large datasets
        page = self.paginate_queryset(active_calls)
        if page is not None:
            serializer = CallDetailsListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = CallDetailsListSerializer(active_calls, many=True)
        return Response({
            'success': True,
            'count': active_calls.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def today_calls(self, request):
        """Get call details for current date with pagination"""
        current_date = timezone.now().date()
        today_calls = self.get_queryset().filter(
            Q(tb_call_startdate__date__lte=current_date) &
            Q(tb_call_todate__date__gte=current_date)
        )
        
        # Apply pagination for large datasets
        page = self.paginate_queryset(today_calls)
        if page is not None:
            serializer = CallDetailsListSerializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            # Add custom fields to paginated response
            response.data['current_date'] = current_date.isoformat()
            return response
        
        serializer = CallDetailsListSerializer(today_calls, many=True)
        
        return Response({
            'success': True,
            'current_date': current_date.isoformat(),
            'count': today_calls.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def debug_all_events(self, request):
        """Debug endpoint to check all events in database"""
        try:
            # Get all events without any filtering
            all_events = CallDetails.objects.all()[:50]  # Limit to 50 for debugging
            serializer = CallDetailsListSerializer(all_events, many=True)
            
            return Response({
                'success': True,
                'total_count': CallDetails.objects.all().count(),
                'sample_count': len(serializer.data),
                'results': serializer.data
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def month_view(self, request):
        """Get call details for month view - shows all events that overlap with the month"""
        try:
            date_param = request.query_params.get('date', None)
            branch_id_param = request.query_params.get('branch_id', None)
            
            # Determine date range
            if date_param and branch_id_param:
                # Special case: If both date and branch_id provided, try exact date first
                try:
                    specific_date = datetime.strptime(date_param, '%Y-%m-%d').date()
                    start_date, end_date = specific_date, specific_date
                except ValueError:
                    # Fall back to month range if date format is YYYY-MM
                    start_date, end_date = get_date_range_for_view('month', date_param)
            else:
                # Normal case: Get full month range
                start_date, end_date = get_date_range_for_view('month', date_param)
            
            # Get base queryset (already filtered by branch, user role, etc.)
            base_queryset = self.get_queryset()
            
            # Optimized filter with date range to reduce rows fetched
            # Use complex filter to show ALL events that overlap with the month
            # This includes:
            # - Events that start before but end during the month
            # - Events that start during the month
            # - Events that span the entire month
            month_calls = base_queryset.filter(
                Q(tb_call_startdate__date__lte=end_date) &
                Q(tb_call_todate__date__gte=start_date) &
                Q(tb_call_startdate__date__range=[start_date - timedelta(days=31), end_date + timedelta(days=31)])
            )
            
            serializer = CallDetailsListSerializer(month_calls, many=True)
            
            response_data = {
                'success': True,
                'view_type': 'month',
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'count': month_calls.count(),
                'results': serializer.data
            }
            
            print(f"[MONTH_VIEW] {start_date} to {end_date}: {response_data['count']} events")
            
            return Response(response_data)
            
        except Exception as e:
            print(f"[ERROR] Error in month_view: {str(e)}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            return Response(
                {'success': False, 'error': f'Failed to fetch month view: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def week_view(self, request):
        """Get call plans for week view"""
        date_param = request.query_params.get('date', None)
        start_date, end_date = get_date_range_for_view('week', date_param)
        
        week_calls = self.get_queryset().filter(
            Q(tb_call_startdate__date__lte=end_date) &
            Q(tb_call_todate__date__gte=start_date) &
            Q(tb_call_startdate__date__range=[start_date - timedelta(days=7), end_date + timedelta(days=7)])
        )
        
        serializer = CallDetailsListSerializer(week_calls, many=True)
        
        return Response({
            'success': True,
            'view_type': 'week',
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'week_start': start_date.strftime('%A, %B %d'),
            'week_end': end_date.strftime('%A, %B %d'),
            'count': week_calls.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def day_view(self, request):
        """Get call plans for day view"""
        date_param = request.query_params.get('date', None)
        start_date, end_date = get_date_range_for_view('day', date_param)
        
        day_calls = self.get_queryset().filter(
            Q(tb_call_startdate__date__lte=end_date) &
            Q(tb_call_todate__date__gte=start_date) &
            Q(tb_call_startdate__date=start_date)
        )
        
        serializer = CallDetailsListSerializer(day_calls, many=True)
        
        return Response({
            'success': True,
            'view_type': 'day',
            'date': start_date.isoformat(),
            'day_name': start_date.strftime('%A, %B %d, %Y'),
            'count': day_calls.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def calendar_navigation(self, request):
        """Get calendar navigation data for frontend"""
        date_param = request.query_params.get('date', None)
        view_type = request.query_params.get('view', 'month')  # month, week, day
        
        if date_param:
            try:
                current_date = datetime.strptime(date_param, '%Y-%m-%d').date()
            except ValueError:
                current_date = timezone.now().date()
        else:
            current_date = timezone.now().date()
        
        # Calculate navigation dates
        if view_type == 'month':
            # Previous/Next month
            if current_date.month == 1:
                prev_date = current_date.replace(year=current_date.year - 1, month=12, day=1)
            else:
                prev_date = current_date.replace(month=current_date.month - 1, day=1)
            
            if current_date.month == 12:
                next_date = current_date.replace(year=current_date.year + 1, month=1, day=1)
            else:
                next_date = current_date.replace(month=current_date.month + 1, day=1)
        
        elif view_type == 'week':
            # Previous/Next week
            days_since_monday = current_date.weekday()
            week_start = current_date - timedelta(days=days_since_monday)
            prev_date = week_start - timedelta(days=7)
            next_date = week_start + timedelta(days=7)
        
        else:  # day
            # Previous/Next day
            prev_date = current_date - timedelta(days=1)
            next_date = current_date + timedelta(days=1)
        
        # Get current view range
        start_date, end_date = get_date_range_for_view(view_type, current_date.isoformat())
        
        # Count events in current view
        plans_count = 0  # No longer using CallPlan
        
        calls_count = CallDetails.objects.filter(
            Q(tb_call_startdate__date__lte=end_date) &
            Q(tb_call_todate__date__gte=start_date)
        ).count()
        
        return Response({
            'success': True,
            'current_date': current_date.isoformat(),
            'view_type': view_type,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'prev_date': prev_date.isoformat(),
            'next_date': next_date.isoformat(),
            'display_name': {
                'month': start_date.strftime('%B %Y'),
                'week': f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')}",
                'day': start_date.strftime('%A, %B %d, %Y')
            }[view_type],
            'counts': {
                'plans': plans_count,
                'calls': calls_count,
                'total': plans_count + calls_count
            }
        })
    
    @action(detail=False, methods=['post'], url_path='test-add-candidates')
    def test_add_candidates(self, request):
        """Test endpoint to add sample candidates to call statistics"""
        try:
            
            # Get all call details
            call_details = CallDetails.objects.all()
            
            if not call_details.exists():
                return Response({
                    'success': False,
                    'error': 'No call details found. Create some call plans first.'
                })
            
            results = []
            
            # Add sample candidates to each call detail
            for i, call_detail in enumerate(call_details[:3]):  # Limit to first 3
                print(f"[DEBUG] Processing call_detail {call_detail.id} (Plan: {call_detail.tb_call_plan_data})")
                
                # Add some sample candidate IDs
                sample_candidates = [100 + i, 200 + i, 300 + i]  # Different candidates for each call
                print(f"[DEBUG] Will add candidates: {sample_candidates}")
                
                # Add candidates to different categories
                for j, candidate_id in enumerate(sample_candidates):
                    print(f"[DEBUG] Adding candidate {candidate_id} (index {j})")
                    if j == 0:
                        print(f"[DEBUG] -> Adding to onplan")
                        increment_calls_on_plan(call_detail.id, candidate_id)
                    elif j == 1:
                        print(f"[DEBUG] -> Adding to onothers")
                        increment_calls_on_others(call_detail.id, candidate_id)
                    else:
                        print(f"[DEBUG] -> Adding to profiles")
                        increment_profiles_on_plan(call_detail.id, candidate_id)
                
                # Refresh and get updated stats
                call_detail.refresh_from_db()
                print(f"[DEBUG] After refresh - Raw data:")
                print(f"[DEBUG]   tb_calls_onplan: '{call_detail.tb_calls_onplan}'")
                print(f"[DEBUG]   tb_calls_onothers: '{call_detail.tb_calls_onothers}'")
                print(f"[DEBUG]   tb_calls_profiles: '{call_detail.tb_calls_profiles}'")
                
                stats = format_statistics_for_frontend(call_detail)
                print(f"[DEBUG] Formatted stats: {stats}")
                
                results.append({
                    'call_detail_id': call_detail.id,
                    'plan_data': call_detail.tb_call_plan_data,
                    'added_candidates': sample_candidates,
                    'statistics': stats,
                    'raw_data': {
                        'tb_calls_onplan': call_detail.tb_calls_onplan,
                        'tb_calls_onothers': call_detail.tb_calls_onothers,
                        'tb_calls_profiles': call_detail.tb_calls_profiles,
                        'tb_calls_profilesothers': call_detail.tb_calls_profilesothers
                    }
                })
            
            print(f"[DEBUG] ========== TEST COMPLETED ==========")
            
            return Response({
                'success': True,
                'message': f'Added sample candidates to {len(results)} call details',
                'results': results
            })
            
        except Exception as e:
            print(f"[ERROR] Test failed: {str(e)}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': f'Failed to add test candidates: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='debug-current-data')
    def debug_current_data(self, request):
        """Debug endpoint to check current event and candidate data"""
        try:
            print(f"[DEBUG] ========== DEBUGGING CURRENT DATA ==========")
            
            # Get all call details with raw data
            call_details = CallDetails.objects.all()[:5]
            
            results = []
            for call_detail in call_details:
                print(f"[DEBUG] Event ID {call_detail.id}:")
                print(f"[DEBUG]   Plan: {call_detail.tb_call_plan_data}")
                print(f"[DEBUG]   Client ID: {call_detail.tb_call_client_id}")
                print(f"[DEBUG]   Employee ID: {call_detail.tb_call_emp_id}")
                print(f"[DEBUG]   Raw tb_calls_onplan: '{call_detail.tb_calls_onplan}'")
                print(f"[DEBUG]   Raw tb_calls_onothers: '{call_detail.tb_calls_onothers}'")
                print(f"[DEBUG]   Raw tb_calls_profiles: '{call_detail.tb_calls_profiles}'")
                
                # Get client name
                client_name = "Unknown"
                if call_detail.tb_call_client_id:
                    try:
                        vendor = Vendor.objects.get(id=call_detail.tb_call_client_id)
                        client_name = vendor.vendor_name
                    except:
                        client_name = f"Vendor ID {call_detail.tb_call_client_id} (not found)"
                
                # Get employee name
                employee_name = "Unknown"
                if call_detail.tb_call_emp_id:
                    try:
                        employee = Employee.objects.get(id=call_detail.tb_call_emp_id)
                        employee_name = f"{employee.firstName} {employee.lastName}"
                    except:
                        employee_name = f"Employee ID {call_detail.tb_call_emp_id} (not found)"
                
                # Calculate counts
                onplan_count = get_candidate_count(call_detail.tb_calls_onplan)
                onothers_count = get_candidate_count(call_detail.tb_calls_onothers)
                profiles_count = get_candidate_count(call_detail.tb_calls_profiles)
                
                print(f"[DEBUG]   Client Name: {client_name}")
                print(f"[DEBUG]   Employee Name: {employee_name}")
                print(f"[DEBUG]   Calculated Counts - OnPlan: {onplan_count}, OnOthers: {onothers_count}, Profiles: {profiles_count}")
                
                results.append({
                    'event_id': call_detail.id,
                    'plan_data': call_detail.tb_call_plan_data,
                    'client_id': call_detail.tb_call_client_id,
                    'client_name': client_name,
                    'employee_id': call_detail.tb_call_emp_id,
                    'employee_name': employee_name,
                    'raw_data': {
                        'tb_calls_onplan': call_detail.tb_calls_onplan,
                        'tb_calls_onothers': call_detail.tb_calls_onothers,
                        'tb_calls_profiles': call_detail.tb_calls_profiles,
                        'tb_calls_profilesothers': call_detail.tb_calls_profilesothers
                    },
                    'calculated_counts': {
                        'onplan': onplan_count,
                        'onothers': onothers_count,
                        'profiles': profiles_count,
                        'profilesothers': get_candidate_count(call_detail.tb_calls_profilesothers)
                    }
                })
            
            print(f"[DEBUG] ========== DEBUG COMPLETED ==========")
            
            return Response({
                'success': True,
                'message': 'Current event data debug',
                'results': results
            })
            
        except Exception as e:
            print(f"[ERROR] Debug failed: {str(e)}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': f'Debug failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='debug-add-candidate')
    def debug_add_candidate(self, request):
        """Debug endpoint to manually add a candidate and trace the process"""
        try:
            event_id = request.data.get('event_id', 1)  # Default to event 1
            candidate_id = request.data.get('candidate_id', 2063)  # Default to candidate 2063
            
            print(f"[DEBUG] ========== MANUAL CANDIDATE ADDITION DEBUG ==========")
            print(f"[DEBUG] Event ID: {event_id}")
            print(f"[DEBUG] Candidate ID: {candidate_id}")
            
            # Step 1: Check if event exists
            call_detail = CallDetails.objects.filter(id=event_id).first()
            if not call_detail:
                return Response({
                    'success': False,
                    'error': f'Event with ID {event_id} not found'
                })
            
            print(f"[DEBUG] Event found: {call_detail.tb_call_plan_data}")
            print(f"[DEBUG] Event client ID: {call_detail.tb_call_client_id}")
            
            # Step 2: Get event's client name
            event_client_name = "Unknown"
            if call_detail.tb_call_client_id:
                try:
                    vendor = Vendor.objects.get(id=call_detail.tb_call_client_id)
                    event_client_name = vendor.vendor_name
                    print(f"[DEBUG] Event client name: '{event_client_name}'")
                except Exception as e:
                    print(f"[DEBUG] Error getting event client: {str(e)}")
            
            # Step 3: Check if candidate exists and get their client
            try:
                candidate = Candidate.objects.get(id=candidate_id)
                print(f"[DEBUG] Candidate found: {candidate.candidate_name}")
                
                # Get candidate's client jobs
                client_jobs = candidate.client_jobs.all()
                print(f"[DEBUG] Candidate has {len(client_jobs)} client jobs")
                
                candidate_client_name = "No Client"
                if client_jobs.exists():
                    active_job = client_jobs.filter(status='active').first() or client_jobs.first()
                    candidate_client_name = active_job.company_name
                    print(f"[DEBUG] Candidate client name: '{candidate_client_name}'")
                else:
                    print(f"[DEBUG] Candidate has no client jobs")
                
            except Candidate.DoesNotExist:
                return Response({
                    'success': False,
                    'error': f'Candidate with ID {candidate_id} not found'
                })
            
            # Step 4: Check current state before addition
            print(f"[DEBUG] BEFORE addition:")
            print(f"[DEBUG]   tb_calls_onplan: '{call_detail.tb_calls_onplan}'")
            print(f"[DEBUG]   tb_calls_onothers: '{call_detail.tb_calls_onothers}'")
            
            # Step 5: Determine classification and add candidate
            if event_client_name != "Unknown" and candidate_client_name != "No Client":
                if event_client_name.strip().lower() == candidate_client_name.strip().lower():
                    print(f"[DEBUG] [SUCCESS] CLIENT MATCH: '{event_client_name}' == '{candidate_client_name}'")
                    print(f"[DEBUG] Adding to PLAN ON")
                    increment_calls_on_plan(event_id, candidate_id)
                    classification = "plan_on"
                else:
                    print(f"[DEBUG] [ERROR] CLIENT MISMATCH: '{event_client_name}' != '{candidate_client_name}'")
                    print(f"[DEBUG] Adding to OTHER PLAN")
                    increment_calls_on_others(event_id, candidate_id)
                    classification = "other_plan"
            else:
                print(f"[DEBUG] [WARNING] MISSING DATA - Cannot classify")
                classification = "unknown"
            
            # Step 6: Check state after addition
            call_detail.refresh_from_db()
            print(f"[DEBUG] AFTER addition:")
            print(f"[DEBUG]   tb_calls_onplan: '{call_detail.tb_calls_onplan}'")
            print(f"[DEBUG]   tb_calls_onothers: '{call_detail.tb_calls_onothers}'")
            
            # Step 7: Calculate final counts
            onplan_count = get_candidate_count(call_detail.tb_calls_onplan)
            onothers_count = get_candidate_count(call_detail.tb_calls_onothers)
            
            print(f"[DEBUG] Final counts - OnPlan: {onplan_count}, OnOthers: {onothers_count}")
            print(f"[DEBUG] ========== DEBUG COMPLETED ==========")
            
            return Response({
                'success': True,
                'message': f'Added candidate {candidate_id} to event {event_id}',
                'classification': classification,
                'event_client': event_client_name,
                'candidate_client': candidate_client_name,
                'before_state': {
                    'tb_calls_onplan': call_detail.tb_calls_onplan or '',
                    'tb_calls_onothers': call_detail.tb_calls_onothers or ''
                },
                'after_state': {
                    'tb_calls_onplan': call_detail.tb_calls_onplan or '',
                    'tb_calls_onothers': call_detail.tb_calls_onothers or ''
                },
                'final_counts': {
                    'onplan': onplan_count,
                    'onothers': onothers_count
                }
            })
            
        except Exception as e:
            print(f"[ERROR] Debug add candidate failed: {str(e)}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': f'Debug failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='debug-candidate-2063')
    def debug_candidate_2063(self, request):
        """Debug specific candidate 2063 integration with events"""
        try:
            candidate_id = 2063
            print(f"[DEBUG] ========== DEBUGGING CANDIDATE {candidate_id} ==========")
            
            # Get candidate data
            try:
                candidate = Candidate.objects.get(id=candidate_id)
                print(f"[DEBUG] Candidate found: {candidate.candidate_name}")
                print(f"[DEBUG] Executive: {candidate.executive_name}")
                print(f"[DEBUG] Created by: {candidate.created_by}")
                print(f"[DEBUG] Created at: {candidate.created_at}")
            except Candidate.DoesNotExist:
                return Response({'error': 'Candidate 2063 not found'})
            
            # Get candidate's client jobs
            client_jobs = candidate.client_jobs.all()
            print(f"[DEBUG] Client jobs count: {len(client_jobs)}")
            
            for job in client_jobs:
                print(f"[DEBUG] Client Job {job.id}:")
                print(f"[DEBUG]   Client: {job.client_name}")
                print(f"[DEBUG]   Executive: {job.current_executive_name}")
                print(f"[DEBUG]   Profile submission: {job.profile_submission}")
                print(f"[DEBUG]   Created: {job.created_at}")
            
            # Get today's events for comparison
            from datetime import date
            today = date.today()
            events_today = CallDetails.objects.filter(
                tb_call_startdate__date=today
            )
            
            print(f"[DEBUG] Events today ({today}): {events_today.count()}")
            
            for event in events_today:
                print(f"[DEBUG] Event {event.id}:")
                print(f"[DEBUG]   Plan: {event.tb_call_plan_data}")
                print(f"[DEBUG]   Employee ID: {event.tb_call_emp_id}")
                print(f"[DEBUG]   Client ID: {event.tb_call_client_id}")
                print(f"[DEBUG]   Start date: {event.tb_call_startdate}")
                
                # Get employee name for this event
                try:
                    employee = Employee.objects.get(id=event.tb_call_emp_id)
                    employee_code = employee.employeeCode
                    print(f"[DEBUG]   Employee code: {employee_code}")
                except:
                    employee_code = "Unknown"
                    print(f"[DEBUG]   Employee code: Unknown (ID {event.tb_call_emp_id})")
                
                # Get client name for this event
                try:
                    vendor = Vendor.objects.get(id=event.tb_call_client_id)
                    client_name = vendor.vendor_name
                    print(f"[DEBUG]   Client name: {client_name}")
                except:
                    client_name = "Unknown"
                    print(f"[DEBUG]   Client name: Unknown (ID {event.tb_call_client_id})")
                
                # Check if this event would match candidate 2063
                executive_match = (employee_code == candidate.executive_name)
                client_match = False
                
                if client_jobs.exists():
                    candidate_client = client_jobs.first().client_name
                    client_match = (client_name.strip().lower() == candidate_client.strip().lower())
                    print(f"[DEBUG]   Candidate client: {candidate_client}")
                
                print(f"[DEBUG]   Executive match: {executive_match}")
                print(f"[DEBUG]   Client match: {client_match}")
                
                if executive_match and client_match:
                    print(f"[DEBUG]   [SUCCESS] PERFECT MATCH - Should go to tb_calls_onplan")
                elif executive_match and not client_match:
                    print(f"[DEBUG]   [WARNING] PARTIAL MATCH - Should go to tb_calls_onothers")
                else:
                    print(f"[DEBUG]   [ERROR] NO MATCH - Should be ignored")
                
                # Check current state
                print(f"[DEBUG]   Current tb_calls_onplan: '{event.tb_calls_onplan}'")
                print(f"[DEBUG]   Current tb_calls_onothers: '{event.tb_calls_onothers}'")
                print(f"[DEBUG]   Current tb_calls_profiles: '{event.tb_calls_profiles}'")
                print(f"[DEBUG]   Current tb_calls_profilesothers: '{event.tb_calls_profilesothers}'")
                
                # Check if candidate is already in any field
                candidate_str = str(candidate_id)
                in_onplan = candidate_str in (event.tb_calls_onplan or '')
                in_onothers = candidate_str in (event.tb_calls_onothers or '')
                in_profiles = candidate_str in (event.tb_calls_profiles or '')
                in_profilesothers = candidate_str in (event.tb_calls_profilesothers or '')
                
                print(f"[DEBUG]   Candidate {candidate_id} found in:")
                print(f"[DEBUG]     onplan: {in_onplan}")
                print(f"[DEBUG]     onothers: {in_onothers}")
                print(f"[DEBUG]     profiles: {in_profiles}")
                print(f"[DEBUG]     profilesothers: {in_profilesothers}")
                print(f"[DEBUG]   ---")
            
            print(f"[DEBUG] ========== DEBUG COMPLETED ==========")
            
            return Response({
                'success': True,
                'candidate_id': candidate_id,
                'candidate_name': candidate.candidate_name,
                'executive_name': candidate.executive_name,
                'client_jobs_count': len(client_jobs),
                'events_today_count': events_today.count(),
                'message': 'Check terminal for detailed debug output'
            })
            
        except Exception as e:
            print(f"[ERROR] Debug failed: {str(e)}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': f'Debug failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='connect-candidate-simple')
    def connect_candidate_simple(self, request):
        """
        Simple endpoint to connect any candidate to any event
        No complex matching - just direct connection
        """
        try:
            candidate_id = request.data.get('candidate_id')
            event_id = request.data.get('event_id')
            connection_type = request.data.get('type', 'onplan')  # onplan, onothers, profiles, profilesothers
            
            if not candidate_id or not event_id:
                return Response({
                    'success': False,
                    'error': 'candidate_id and event_id are required'
                })
            
            print(f"[DEBUG] ========== SIMPLE CANDIDATE CONNECTION ==========")
            print(f"[DEBUG] Connecting candidate {candidate_id} to event {event_id}")
            print(f"[DEBUG] Connection type: {connection_type}")
            
            # Get the event
            try:
                call_detail = CallDetails.objects.get(id=event_id)
                print(f"[DEBUG] Event found: {call_detail.tb_call_plan_data}")
            except CallDetails.DoesNotExist:
                return Response({
                    'success': False,
                    'error': f'Event {event_id} not found'
                })
            
            # Get candidate (just to verify it exists)
            try:
                candidate = Candidate.objects.get(id=candidate_id)
                print(f"[DEBUG] Candidate found: {candidate.candidate_name}")
            except Candidate.DoesNotExist:
                return Response({
                    'success': False,
                    'error': f'Candidate {candidate_id} not found'
                })
            
            # Simple connection based on type
            if connection_type == 'onplan':
                print(f"[DEBUG] Adding to tb_calls_onplan")
                increment_calls_on_plan(event_id, candidate_id)
            elif connection_type == 'onothers':
                print(f"[DEBUG] Adding to tb_calls_onothers")
                increment_calls_on_others(event_id, candidate_id)
            elif connection_type == 'profiles':
                print(f"[DEBUG] Adding to tb_calls_profiles")
                increment_profiles_on_plan(event_id, candidate_id)
            elif connection_type == 'profilesothers':
                print(f"[DEBUG] Adding to tb_calls_profilesothers")
                increment_profiles_on_others(event_id, candidate_id)
            else:
                return Response({
                    'success': False,
                    'error': 'Invalid type. Use: onplan, onothers, profiles, profilesothers'
                })
            
            # Get updated data
            call_detail.refresh_from_db()
            stats = format_statistics_for_frontend(call_detail)
            
            print(f"[DEBUG] [SUCCESS] Connection successful!")
            print(f"[DEBUG] Updated stats: {stats}")
            
            return Response({
                'success': True,
                'message': f'Connected candidate {candidate_id} to event {event_id}',
                'candidate_name': candidate.candidate_name,
                'event_plan': call_detail.tb_call_plan_data,
                'connection_type': connection_type,
                'updated_statistics': stats,
                'raw_data': {
                    'tb_calls_onplan': call_detail.tb_calls_onplan,
                    'tb_calls_onothers': call_detail.tb_calls_onothers,
                    'tb_calls_profiles': call_detail.tb_calls_profiles,
                    'tb_calls_profilesothers': call_detail.tb_calls_profilesothers
                }
            })
            
        except Exception as e:
            print(f"[ERROR] Connection failed: {str(e)}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': f'Connection failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='connect-all-candidates')
    def connect_all_candidates(self, request):
        """
        Connect all existing candidates to events automatically
        This fixes the issue where candidates were created but not connected
        """
        try:
            print(f"[DEBUG] ========== CONNECTING ALL CANDIDATES ==========")
            
            # Get event_id from request if provided, otherwise use all events
            event_id = request.data.get('event_id')
            
            if event_id:
                # Sync candidates for specific event
                events = CallDetails.objects.filter(id=event_id)
                print(f"[DEBUG] Syncing candidates for event ID: {event_id}")
            else:
                # Get all events
                events = CallDetails.objects.all()
                print(f"[DEBUG] Syncing candidates for all events")
            
            # Get all candidates (no filter on executive)
            candidates = Candidate.objects.all().prefetch_related('client_jobs')
            
            print(f"[DEBUG] Found {candidates.count()} total candidates")
            print(f"[DEBUG] Found {events.count()} total events")
            
            if not events.exists():
                return Response({
                    'success': False,
                    'error': 'No events found to sync candidates with'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            results = []
            connected_count = 0
            
            for candidate in candidates:
                print(f"[DEBUG] Processing candidate {candidate.id}: {candidate.candidate_name}")
                
                # Get candidate's client
                client_job = candidate.client_jobs.first()
                if not client_job:
                    print(f"[DEBUG] Candidate {candidate.id} has no client jobs, skipping")
                    continue
                
                candidate_client = client_job.client_name
                print(f"[DEBUG] Candidate client: {candidate_client}")
                
                # Find best matching event
                best_event = None
                connection_type = 'onothers'  # Default to others
                
                for event in events:
                    print(f"[DEBUG] Checking event {event.id} (Plan: {event.tb_call_plan_data})")
                    
                    # Get event's client name
                    try:
                        vendor = Vendor.objects.get(id=event.tb_call_client_id)
                        event_client = vendor.vendor_name
                        print(f"[DEBUG] Event client: {event_client}")
                        
                        # Check if clients match
                        if candidate_client.strip().lower() == event_client.strip().lower():
                            print(f"[DEBUG] [SUCCESS] CLIENT MATCH! Using event {event.id}")
                            best_event = event
                            connection_type = 'onplan'
                            break
                    except:
                        print(f"[DEBUG] Could not get client for event {event.id}")
                        continue
                
                # If no exact match, use first available event
                if not best_event and events.exists():
                    best_event = events.first()
                    connection_type = 'onothers'
                    print(f"[DEBUG] No exact match, using event {best_event.id} as 'others'")
                
                # Connect the candidate
                if best_event:
                    try:
                        if connection_type == 'onplan':
                            increment_calls_on_plan(best_event.id, candidate.id)
                        else:
                            increment_calls_on_others(best_event.id, candidate.id)
                        
                        connected_count += 1
                        print(f"[DEBUG] [SUCCESS] Connected candidate {candidate.id} to event {best_event.id} as {connection_type}")
                        
                        results.append({
                            'candidate_id': candidate.id,
                            'candidate_name': candidate.candidate_name,
                            'event_id': best_event.id,
                            'event_plan': best_event.tb_call_plan_data,
                            'connection_type': connection_type,
                            'client_match': connection_type == 'onplan'
                        })
                        
                    except Exception as e:
                        print(f"[ERROR] Failed to connect candidate {candidate.id}: {str(e)}")
                else:
                    print(f"[DEBUG] No suitable event found for candidate {candidate.id}")
            
            print(f"[DEBUG] ========== CONNECTION COMPLETED ==========")
            print(f"[DEBUG] Connected {connected_count} candidates")
            
            return Response({
                'success': True,
                'message': f'Connected {connected_count} candidates to events',
                'connected_count': connected_count,
                'total_candidates': candidates.count(),
                'connections': results
            })
            
        except Exception as e:
            print(f"[ERROR] Batch connection failed: {str(e)}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': f'Batch connection failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def test_call_statistics(self, request):
        """Test endpoint to verify call statistics fields are being returned"""
        try:
            # Get a few call details directly
            call_details = CallDetails.objects.all()[:5]
            
            result = []
            for call_detail in call_details:
                call_data = format_statistics_for_frontend(call_detail)
                call_data.update({
                    'emp_id': call_detail.tb_call_emp_id,
                    'client_id': call_detail.tb_call_client_id,
                    'plan_data': call_detail.tb_call_plan_data
                })
                result.append(call_data)
            
            return Response({
                'success': True,
                'message': 'Call statistics test data',
                'data': result
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get call plan statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total_plans': queryset.count(),
            'active_plans': queryset.filter(tb_call_status=1).count(),
            'completed_plans': queryset.filter(tb_call_status=2).count(),
            'cancelled_plans': queryset.filter(tb_call_status=3).count(),
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'], url_path='filter-options')
    def filter_options(self, request):
        """Get filter options for call plans"""
        try:
            # Get unique employees using Django ORM
            employees = []
            # Get employees who have call details
            employee_ids = CallDetails.objects.values_list('tb_call_emp_id', flat=True).distinct()
            employee_objects = Employee.objects.filter(
                id__in=employee_ids,
                firstName__isnull=False,
                del_state=0
            ).exclude(
                firstName=''
            ).order_by('firstName')
            
            for employee in employee_objects:
                full_name = f"{employee.firstName} {employee.lastName}" if employee.lastName else employee.firstName
                employees.append({
                    'value': employee.id,
                    'label': full_name
                })
            
            # Get unique vendors using Django ORM
            vendors = []
            # Get vendors who have call details
            vendor_ids = CallDetails.objects.values_list('tb_call_client_id', flat=True).distinct()
            vendor_objects = Vendor.objects.filter(
                id__in=vendor_ids,
                vendor_name__isnull=False
            ).exclude(
                vendor_name=''
            ).order_by('vendor_name')
            
            for vendor in vendor_objects:
                vendors.append({
                    'value': vendor.id,
                    'label': vendor.vendor_name
                })
            
            return Response({
                'employees': employees,
                'vendors': vendors,
                'plans': [
                    {'value': 'P1', 'label': 'Plan 1'},
                    {'value': 'P2', 'label': 'Plan 2'},
                    {'value': 'P3', 'label': 'Plan 3'},
                    {'value': 'P4', 'label': 'Plan 4'},
                    {'value': 'P5', 'label': 'Plan 5'}
                ]
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch filter options: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='dropdown_options')
    def dropdown_options(self, request):
        """Get dropdown options for call plans - alternative endpoint"""
        return self.filter_options(request)
    
    @action(detail=False, methods=['get'], url_path='employees')
    def get_employees(self, request):
        """Get employees for dropdown with role-based filtering"""
        try:
            # Get current user's employee data for role-based filtering
            print(f"[GET_EMPLOYEES] Called by user: {request.user}, authenticated: {request.user.is_authenticated}")
            user_employee_data = get_user_employee_data(request.user)
            
            if not user_employee_data:
                print("[GET_EMPLOYEES] [WARNING] No user employee data found - this might be the issue!")
                return Response({
                    'success': False,
                    'error': 'User employee data not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            user_level = user_employee_data.get('level', '').lower()
            user_employee_code = user_employee_data.get('employeeCode')
            user_first_name = user_employee_data.get('firstName')
            
            # Use shared role-based filtering function
            employee_objects = get_filtered_employees_by_role(user_employee_data)
            
            # Apply pagination for large employee lists
            page = self.paginate_queryset(employee_objects)
            if page is not None:
                employees = []
                for employee in page:
                    full_name = f"{employee.firstName} {employee.lastName}" if employee.lastName else employee.firstName
                    employees.append({
                        'value': employee.id,
                        'label': full_name,
                        'id': employee.id,
                        'firstName': employee.firstName or '',
                        'lastName': employee.lastName or '',
                        'fullName': full_name,
                        'email': employee.officialEmail or '',
                        'phone': employee.phone1 or '',
                        'designation': '',  # Column doesn't exist in database
                        'branch': employee.branch or '',   # Now available from Django ORM
                        'employeeCode': employee.employeeCode or '',
                        'reportingManager': employee.reportingManager or '',
                        'level': employee.level or '',
                        'status': employee.status or ''
                    })
                
                response = self.get_paginated_response(employees)
                response.data['employees'] = response.data.pop('results')  # Rename results to employees
                response.data.update({
                    'user_level': user_level,
                    'user_employee_code': user_employee_code,
                    'filtering_applied': True
                })
                return response
            
            # Non-paginated response for smaller datasets
            employees = []
            for employee in employee_objects:
                full_name = f"{employee.firstName} {employee.lastName}" if employee.lastName else employee.firstName
                employees.append({
                    'value': employee.id,
                    'label': full_name,
                    'id': employee.id,
                    'firstName': employee.firstName or '',
                    'lastName': employee.lastName or '',
                    'fullName': full_name,
                    'email': employee.officialEmail or '',
                    'phone': employee.phone1 or '',
                    'designation': '',  # Column doesn't exist in database
                    'branch': employee.branch or '',   # Now available from Django ORM
                    'employeeCode': employee.employeeCode or '',
                    'reportingManager': employee.reportingManager or '',
                    'level': employee.level or '',
                    'status': employee.status or ''
                })
            
            return Response({
                'success': True,
                'employees': employees,
                'count': len(employees),
                'user_level': user_level,
                'user_employee_code': user_employee_code,
                'filtering_applied': True
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch employees: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='vendors')
    def get_vendors(self, request):
        """Get all vendors/clients for dropdown"""
        try:
            vendors = []
            # Use Django ORM instead of raw SQL
            vendor_objects = Vendor.objects.filter(
                vendor_name__isnull=False
            ).exclude(
                vendor_name=''
            ).order_by('vendor_name')
            
            for vendor in vendor_objects:
                vendors.append({
                    'value': vendor.id,
                    'label': vendor.vendor_name,
                    'id': vendor.id,
                    'vendor_name': vendor.vendor_name or '',
                    'contact_person': vendor.contact_person or '',
                    'email': vendor.email or '',
                    'contact_no1': vendor.contact_no1 or '',
                    'contact_no2': vendor.contact_no2 or '',
                    'address': vendor.address or '',
                    'city': '',      # Column doesn't exist in database
                    'state': '',     # Column doesn't exist in database
                    'pincode': ''    # Column doesn't exist in database
                })
            
            return Response({
                'success': True,
                'vendors': vendors,
                'count': len(vendors)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch vendors: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    @action(detail=False, methods=['get'], url_path='cities')
    def get_cities(self, request):
        """Get cities for dropdown from locations app"""
        try:
            cities = []
            
            # Try to get cities from locations app
            try:
                city_objects = City.objects.all().order_by('city')
                for city in city_objects:
                    cities.append({
                        'value': city.city,
                        'label': f"{city.city}, {city.state}" if city.state else city.city,
                        'city': city.city,
                        'state': city.state,
                        'id': city.id,
                        'city_id': city.id,
                        'state_id': city.state_ids if hasattr(city, 'state_ids') else None
                    })
                    
            except Exception as locations_error:
                print(f"[WARNING] Locations app not available, using fallback cities: {str(locations_error)}")
                # Fallback to sample cities if locations app fails
                sample_cities = [
                    ('Chennai', 'Tamil Nadu'),
                    ('Coimbatore', 'Tamil Nadu'), 
                    ('Madurai', 'Tamil Nadu'),
                    ('Mumbai', 'Maharashtra'),
                    ('Pune', 'Maharashtra'),
                    ('Bangalore', 'Karnataka'),
                    ('Hyderabad', 'Telangana'),
                    ('Delhi', 'Delhi')
                ]
                
                for i, (city, state) in enumerate(sample_cities, 1):
                    cities.append({
                        'value': city,
                        'label': f"{city}, {state}",
                        'city': city,
                        'state': state,
                        'id': i,
                        'city_id': i,
                        'state_id': i
                    })
            
            return Response({
                'success': True,
                'cities': cities,
                'count': len(cities)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch cities: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='sources')
    def get_sources(self, request):
        """Get master sources for dropdown"""
        try:
            sources = []
            # Use Django ORM instead of raw SQL
            source_objects = Source.objects.filter(
                name__isnull=False
            ).exclude(
                name=''
            ).order_by('name')
            
            for source in source_objects:
                sources.append({
                    'value': source.id,
                    'label': source.name,
                    'id': source.id,
                    'name': source.name or '',
                    'status': source.status or ''
                })
            
            return Response({
                'success': True,
                'sources': sources,
                'count': len(sources)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch sources: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='branches')
    def get_branches(self, request):
        """Get branches for dropdown with role-based filtering from employee data"""
        try:
            # Get current user's employee data for role-based filtering
            user_employee_data = get_user_employee_data(request.user)
            
            branches = []
            
            if user_employee_data:
                user_level = user_employee_data.get('level', '').lower()
                user_branch = user_employee_data.get('branch')
                
                # CEO and RM roles see all branches from employee data
                if user_level in ['ceo', 'rm']:
                    print(f"[DEBUG] User level {user_level} - showing all branches from employee data")
                    
                    # Get all unique branches from employee table
                    unique_branches = Employee.objects.filter(
                        branch__isnull=False,
                        del_state=0
                    ).exclude(
                        branch=''
                    ).values_list('branch', flat=True).distinct().order_by('branch')
                    
                    # Create branch objects from unique branch names
                    for idx, branch_name in enumerate(unique_branches, 1):
                        # Generate a simple branch code from branch name
                        branch_code = branch_name[:3].upper() if branch_name else ''
                        
                        branches.append({
                            'value': branch_name,
                            'label': branch_name,
                            'id': idx,
                            'name': branch_name,
                            'branch_name': branch_name,
                            'branch_code': branch_code,
                            'branchcode': branch_code,
                            'status': 'Active',
                            'is_active': True
                        })
                    
                # Other roles see only their own branch
                elif user_branch:
                    print(f"[DEBUG] User level {user_level} - filtering by user branch: {user_branch}")
                    branch_code = user_branch[:3].upper() if user_branch else ''
                    
                    branches.append({
                        'value': user_branch,
                        'label': user_branch,
                        'id': 1,
                        'name': user_branch,
                        'branch_name': user_branch,
                        'branch_code': branch_code,
                        'branchcode': branch_code,
                        'status': 'Active',
                        'is_active': True
                    })
                else:
                    print(f"[DEBUG] User level {user_level} - no branch found, showing no branches")
            else:
                print("[DEBUG] No user employee data found - showing all branches as fallback")
                # Fallback: show all branches from employee data
                unique_branches = Employee.objects.filter(
                    branch__isnull=False,
                    del_state=0
                ).exclude(
                    branch=''
                ).values_list('branch', flat=True).distinct().order_by('branch')
                
                for idx, branch_name in enumerate(unique_branches, 1):
                    branch_code = branch_name[:3].upper() if branch_name else ''
                    
                    branches.append({
                        'value': branch_name,
                        'label': branch_name,
                        'id': idx,
                        'name': branch_name,
                        'branch_name': branch_name,
                        'branch_code': branch_code,
                        'branchcode': branch_code,
                        'status': 'Active',
                        'is_active': True
                    })
            
            return Response({
                'success': True,
                'branches': branches,
                'count': len(branches),
                'user_role': user_employee_data.get('level') if user_employee_data else None,
                'user_branch': user_employee_data.get('branch') if user_employee_data else None
            })
            
        except Exception as e:
            print(f"[ERROR] Error in get_branches: {str(e)}")
            return Response(
                {'error': f'Failed to fetch branches: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='channels')
    def get_channels(self, request):
        """Get all channels/designations for dropdown"""
        try:
            channels = []
            # Get positions from Masters Position model only
            try:
                from Masters.models import Position
                position_objects = Position.objects.filter(
                    name__isnull=False
                ).exclude(
                    name=''
                ).order_by('name')
                
                for position in position_objects:
                    channels.append({
                        'value': position.id,
                        'label': position.name,
                        'id': position.id,
                        'designation': position.name
                    })
            except ImportError:
                # Position model doesn't exist, return empty list
                pass
            
            return Response({
                'success': True,
                'channels': channels,
                'count': len(channels)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch channels: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        emp_id = request.query_params.get('emp_id', None)
        if emp_id is not None:
            month_calls = month_calls.filter(tb_call_emp_id=emp_id)
        
        client_id = request.query_params.get('client_id', None)
        if client_id is not None:
            month_calls = month_calls.filter(tb_call_client_id=client_id)
        
        channel = request.query_params.get('channel', None)
        if channel is not None:
            month_calls = month_calls.filter(tb_call_channel__icontains=channel)
        
        plan_id = request.query_params.get('plan_id', None)
        if plan_id is not None:
            month_calls = month_calls.filter(tb_call_plan_id=plan_id)
        
        month_calls = month_calls.order_by('tb_call_startdate')
        serializer = CallDetailsListSerializer(month_calls, many=True)
        
        # Enhance with related data using DatabaseQueryHelper
        data = serializer.data
        for item in data:
            try:
                if item.get('tb_call_emp_id'):
                    employee_data = DatabaseQueryHelper.get_employee_by_id(item['tb_call_emp_id'])
                    if employee_data:
                        item['employee_data'] = employee_data
                        item['employee_name'] = employee_data['fullName']
                
                if item.get('tb_call_client_id'):
                    vendor_data = DatabaseQueryHelper.get_vendor_by_id(item['tb_call_client_id'])
                    if vendor_data:
                        item['client_data'] = vendor_data
                        item['client_name'] = vendor_data['vendor_name']
            except Exception as e:
                print(f"Error fetching related data for item {item.get('id')}: {str(e)}")
                continue
        
        return Response({
            'success': True,
            'view_type': 'month',
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'month_name': start_date.strftime('%B %Y'),
            'count': month_calls.count(),
            'data': data
        })
    
    @action(detail=False, methods=['get'])
    def week_view(self, request):
        """Get call details for week view with branch filtering"""
        print(f"[WEEK_VIEW] Called with params: {dict(request.query_params)}")
        
        date_param = request.query_params.get('date', None)
        start_date, end_date = get_date_range_for_view('week', date_param)
        
        print(f"[WEEK_VIEW] Date range: {start_date} to {end_date}")
        
        # Use get_queryset() to apply branch filtering
        week_calls = self.get_queryset().filter(
            Q(tb_call_startdate__date__lte=end_date) &
            Q(tb_call_todate__date__gte=start_date)
        )
        
        print(f"[WEEK_VIEW] After date filtering: {week_calls.count()} events")
        
        # Debug: Show which events are in the week view
        for event in week_calls[:3]:
            print(f"[WEEK_VIEW] Event ID {event.id}: Start={event.tb_call_startdate}, End={event.tb_call_todate}, Plan={event.tb_call_plan_data}")
        
        # Apply other filters
        status_filter = request.query_params.get('status', None)
        if status_filter is not None:
            week_calls = week_calls.filter(tb_call_status=status_filter)
        
        emp_id = request.query_params.get('emp_id', None)
        if emp_id is not None:
            week_calls = week_calls.filter(tb_call_emp_id=emp_id)
        
        client_id = request.query_params.get('client_id', None)
        if client_id is not None:
            week_calls = week_calls.filter(tb_call_client_id=client_id)
        
        channel = request.query_params.get('channel', None)
        if channel is not None:
            week_calls = week_calls.filter(tb_call_channel__icontains=channel)
        
        plan_id = request.query_params.get('plan_id', None)
        if plan_id is not None:
            week_calls = week_calls.filter(tb_call_plan_id=plan_id)
        
        week_calls = week_calls.order_by('tb_call_startdate')
        serializer = CallDetailsListSerializer(week_calls, many=True)
        
        # Enhance with related data using DatabaseQueryHelper
        data = serializer.data
        for item in data:
            try:
                if item.get('tb_call_emp_id'):
                    employee_data = DatabaseQueryHelper.get_employee_by_id(item['tb_call_emp_id'])
                    if employee_data:
                        item['employee_data'] = employee_data
                        item['employee_name'] = employee_data['fullName']
                
                if item.get('tb_call_client_id'):
                    vendor_data = DatabaseQueryHelper.get_vendor_by_id(item['tb_call_client_id'])
                    if vendor_data:
                        item['client_data'] = vendor_data
                        item['client_name'] = vendor_data['vendor_name']
            except Exception as e:
                print(f"Error fetching related data for item {item.get('id')}: {str(e)}")
                continue
        
        return Response({
            'success': True,
            'view_type': 'week',
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'week_start': start_date.strftime('%A, %B %d'),
            'week_end': end_date.strftime('%A, %B %d'),
            'count': week_calls.count(),
            'results': data  # Changed from 'data' to 'results' for consistency
        })
    
    @action(detail=False, methods=['get'])
    def day_view(self, request):
        """Get call details for day view with branch filtering"""
        print(f"[DAY_VIEW] Called with params: {dict(request.query_params)}")
        
        date_param = request.query_params.get('date', None)
        start_date, end_date = get_date_range_for_view('day', date_param)
        
        print(f"[DAY_VIEW] Date range: {start_date} to {end_date}")
        
        # Check if this is current date
        current_date = timezone.now().date()
        is_current_date = start_date == current_date
        print(f"[DAY_VIEW] Is current date: {is_current_date}, Current: {current_date}, Requested: {start_date}")
        
        # Use get_queryset() to apply branch filtering
        base_queryset = self.get_queryset()
        print(f"[DAY_VIEW] Base queryset count (after branch filtering): {base_queryset.count()}")
        
        day_calls = base_queryset.filter(
            Q(tb_call_startdate__date__lte=end_date) &
            Q(tb_call_todate__date__gte=start_date)
        )
        
        print(f"[DAY_VIEW] After date filtering: {day_calls.count()} events")
        
        # Debug: Show which events are in the day view
        for event in day_calls[:3]:
            print(f"[DAY_VIEW] Event ID {event.id}: Start={event.tb_call_startdate}, End={event.tb_call_todate}, Plan={event.tb_call_plan_data}")
        
        # Apply other filters
        status_filter = request.query_params.get('status', None)
        if status_filter is not None:
            day_calls = day_calls.filter(tb_call_status=status_filter)
        
        emp_id = request.query_params.get('emp_id', None)
        if emp_id is not None:
            day_calls = day_calls.filter(tb_call_emp_id=emp_id)
        
        client_id = request.query_params.get('client_id', None)
        if client_id is not None:
            day_calls = day_calls.filter(tb_call_client_id=client_id)
        
        channel = request.query_params.get('channel', None)
        if channel is not None:
            day_calls = day_calls.filter(tb_call_channel__icontains=channel)
        
        plan_id = request.query_params.get('plan_id', None)
        if plan_id is not None:
            day_calls = day_calls.filter(tb_call_plan_id=plan_id)
        
        day_calls = day_calls.order_by('tb_call_startdate')
        serializer = CallDetailsListSerializer(day_calls, many=True)
        
        # Enhance with related data using DatabaseQueryHelper
        data = serializer.data
        for item in data:
            try:
                if item.get('tb_call_emp_id'):
                    employee_data = DatabaseQueryHelper.get_employee_by_id(item['tb_call_emp_id'])
                    if employee_data:
                        item['employee_data'] = employee_data
                        item['employee_name'] = employee_data['fullName']
                
                if item.get('tb_call_client_id'):
                    vendor_data = DatabaseQueryHelper.get_vendor_by_id(item['tb_call_client_id'])
                    if vendor_data:
                        item['client_data'] = vendor_data
                        item['client_name'] = vendor_data['vendor_name']
            except Exception as e:
                print(f"Error fetching related data for item {item.get('id')}: {str(e)}")
                continue
        
        return Response({
            'success': True,
            'view_type': 'day',
            'date': start_date.isoformat(),
            'day_name': start_date.strftime('%A, %B %d, %Y'),
            'count': day_calls.count(),
            'results': data  # Changed from 'data' to 'results' for consistency
        })
    
    @action(detail=False, methods=['get'])
    def by_plan(self, request):
        """Get call details grouped by plan"""
        plan_id = request.query_params.get('plan_id')
        if not plan_id:
            return Response(
                {'error': 'plan_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        calls = self.get_queryset().filter(tb_call_plan_id=plan_id)
        serializer = CallDetailsListSerializer(calls, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get call details statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total_calls': queryset.count(),
            'active_calls': queryset.filter(tb_call_status=1).count(),
            'completed_calls': queryset.filter(tb_call_status=2).count(),
            'cancelled_calls': queryset.filter(tb_call_status=3).count(),
            'calls_by_channel': {},
            'calls_by_plan': {}
        }
        
        # Group by channel
        for channel in queryset.values('tb_call_channel').distinct():
            channel_name = channel['tb_call_channel']
            if channel_name:
                stats['calls_by_channel'][channel_name] = queryset.filter(
                    tb_call_channel=channel_name
                ).count()
        
        # Group by plan data
        for plan in queryset.values('tb_call_plan_data').distinct():
            plan_data = plan['tb_call_plan_data']
            if plan_data:
                stats['calls_by_plan'][plan_data] = queryset.filter(
                    tb_call_plan_data=plan_data
                ).count()
        
        return Response(stats)
    
    @action(detail=False, methods=['get'], url_path='dropdown-data')
    def get_dropdown_data(self, request):
        """Get all dropdown data for CallDetails forms"""
        print("[DROPDOWN-DATA] API ENDPOINT CALLED!")
        print(f"[DROPDOWN-DATA] Request method: {request.method}")
        print(f"[DROPDOWN-DATA] Request path: {request.path}")
        try:
            # Get employees using role-based filtering (call the existing method)
            print("[DROPDOWN-DATA] Getting employees with role-based filtering...")
            print(f"[DROPDOWN-DATA] Request user: {request.user}, authenticated: {request.user.is_authenticated}")
            
            # Instead of calling self.get_employees, implement the filtering directly here
            # to avoid authentication context issues
            user_employee_data = get_user_employee_data(request.user)
            
            if not user_employee_data:
                print("[DROPDOWN-DATA] No user employee data found - falling back to all ACTIVE employees")
                employee_objects = Employee.objects.filter(
                    firstName__isnull=False,
                    del_state=0,
                    status='Active'
                ).exclude(firstName='').order_by('firstName', 'lastName')
                print(f"[DROPDOWN-DATA] Fallback: Found {employee_objects.count()} active employees")
            else:
                # Use shared role-based filtering function
                print(f"[DROPDOWN-DATA] Applying role-based filtering for user: {user_employee_data.get('firstName')}")
                employee_objects = get_filtered_employees_by_role(user_employee_data)
            
            # Convert to list format
            employees = []
            for employee in employee_objects:
                full_name = f"{employee.firstName} {employee.lastName}" if employee.lastName else employee.firstName
                employees.append({
                    'value': employee.id,
                    'label': full_name,
                    'id': employee.id,
                    'firstName': employee.firstName or '',
                    'lastName': employee.lastName or '',
                    'fullName': full_name,
                    'email': employee.officialEmail or '',
                    'phone': employee.phone1 or '',
                    'designation': '',
                    'branch': employee.branch or '',
                    'employeeCode': employee.employeeCode or '',
                    'reportingManager': employee.reportingManager or '',
                    'level': employee.level or '',
                    'status': employee.status or ''
                })
            
            # Get vendors/clients using Django ORM
            vendors = []
            vendor_objects = Vendor.objects.filter(
                vendor_name__isnull=False
            ).exclude(
                vendor_name=''
            ).order_by('vendor_name')
            
            for vendor in vendor_objects:
                vendors.append({
                    'value': vendor.id,
                    'label': vendor.vendor_name,
                    'id': vendor.id,
                    'vendor_name': vendor.vendor_name or '',
                    'contact_person': vendor.contact_person or '',
                    'email': vendor.email or '',
                    'contact_no1': vendor.contact_no1 or '',
                    'contact_no2': vendor.contact_no2 or '',
                    'address': vendor.address or '',
                    'city': '',      
                    'state': '',     
                    'pincode': ''    
                })
            
            # Get cities from tbl_city database table ONLY
            cities = []
            try:
                print("[DEBUG] Fetching cities from tbl_city database table...")
                city_objects = City.objects.all().order_by('city')
                city_count = city_objects.count()
                print(f"[DEBUG] Found {city_count} cities in tbl_city table")
                
                for city in city_objects:
                    # Debug specific city to ensure correct ID mapping
                    if city.city == 'Ariyalur':
                        print(f"[ARIYALUR DEBUG] Backend processing Ariyalur:")
                        print(f"[ARIYALUR DEBUG] city.id: {city.id} (type: {type(city.id)})")
                        print(f"[ARIYALUR DEBUG] city.city: {city.city}")
                        print(f"[ARIYALUR DEBUG] city.state_ids: {city.state_ids}")
                        print(f"[ARIYALUR DEBUG] city.state: {city.state}")
                    
                    city_data = {
                        'value': city.city,  # Use city name as value, not ID
                        'label': f"{city.city}, {city.state}" if city.state else city.city,
                        'id': city.id,      # This should be the database city_id (494 for Ariyalur)
                        'city_id': city.id, # This should be the database city_id (494 for Ariyalur)
                        'city': city.city,
                        'state_id': city.state_ids,  # Direct access to state_ids field
                        'state': city.state
                    }
                    cities.append(city_data)
                    
                    # Debug first few cities to verify IDs
                    if len(cities) <= 3:
                        print(f"[CITY DEBUG] Loaded city: {city.city} with ID: {city.id} (type: {type(city.id)})")
                        print(f"[CITY DEBUG] City data: {city_data}")
                
                print(f"[SUCCESS] Successfully loaded {len(cities)} cities from tbl_city database")
                        
            except Exception as e:
                print(f"[ERROR] Failed to fetch cities from tbl_city table: {str(e)}")
                print(f"[ERROR] Error type: {type(e).__name__}")
                # Return empty cities array - no fallback to ensure only database cities are used
                cities = []
            
            # Get sources using Django ORM
            sources = []
            try:
                source_objects = Source.objects.filter(
                    name__isnull=False
                ).exclude(
                    name=''
                ).order_by('name')
                
                for source in source_objects:
                    sources.append({
                        'value': source.id,
                        'label': source.name,
                        'id': source.id,
                        'name': source.name or '',
                        'status': source.status or ''
                    })
            except Exception as e:
                print(f"[ERROR] Error fetching sources: {str(e)}")
                pass  # Sources already processed above
            
            # Get branches using Django ORM
            branches = []
            try:
                branch_objects = Branch.objects.filter(
                    name__isnull=False
                ).exclude(
                    name=''
                ).order_by('name')
                
                for branch in branch_objects:
                    branches.append({
                        'value': branch.id,
                        'label': branch.name,
                        'id': branch.id,
                        'name': branch.name or '',
                        'branch_name': branch.name or '',
                        'branch_code': branch.branchcode or '',
                        'branchcode': branch.branchcode or '',
                        'status': branch.status or '',
                        'is_active': branch.status == 'Active'
                    })
            except Exception as e:
                print(f"[ERROR] Error fetching branches: {str(e)}")
                pass  # Branches already processed above
            
            # Get call plans - using fallback since tb_call_plan table may not exist
            call_plans = []
            try:
                # Use sample call plans as fallback
                sample_plans = [
                    {'id': 1, 'data': 'P1', 'status': 1},
                    {'id': 2, 'data': 'P2', 'status': 1},
                    {'id': 3, 'data': 'P3', 'status': 1},
                    {'id': 4, 'data': 'P4', 'status': 1},
                    {'id': 5, 'data': 'P5', 'status': 1}
                ]
                
                for plan in sample_plans:
                    call_plans.append({
                        'value': plan['id'],
                        'label': plan['data'],
                        'id': plan['id'],
                        'plan_data': plan['data'],
                        'status': plan['status'],
                        'start_date': None,
                        'end_date': None
                    })
            except Exception as e:
                print(f"[ERROR] Error fetching call plans: {str(e)}")
                call_plans = []
            
            # Get channels - from Masters Position model only
            channels = []
            try:
                # Import Position model if it exists
                try:
                    from Masters.models import Position
                    position_objects = Position.objects.filter(
                        name__isnull=False
                    ).exclude(
                        name=''
                    ).order_by('name')
                    
                    for position in position_objects:
                        channels.append({
                            'value': position.id,
                            'label': position.name,
                            'id': position.id,
                            'name': position.name,
                            'designation': position.name
                        })
                except ImportError:
                    # Position model doesn't exist, leave empty
                    pass
            except Exception as e:
                print(f"[ERROR] Error fetching channels: {str(e)}")
                channels = []
            
            # Status options
            status_options = [
                {'value': 0, 'label': 'Inactive'},
                {'value': 1, 'label': 'Active'},
                {'value': 2, 'label': 'Completed'},
                {'value': 3, 'label': 'Cancelled'}
            ]
            
            # Get states from locations app
            states = []
            try:
                print("[DEBUG] Starting state processing...")
                # Try to get states from locations app
                try:
                    print("[DEBUG] Attempting State.objects.all() query...")
                    state_objects = State.objects.all().order_by('state')
                    state_count = state_objects.count()
                    print(f"[DEBUG] Found {state_count} states in database")
                    
                    for state in state_objects:
                        state_data = {
                            'value': state.id,
                            'label': state.state,
                            'id': state.id,
                            'stateid': state.id,
                            'state': state.state
                        }
                        states.append(state_data)
                        
                        # Debug first few states
                        if len(states) <= 3:
                            print(f"[STATE DEBUG] Loaded state: {state.state} with ID: {state.id} (type: {type(state.id)})")
                            print(f"[STATE DEBUG] State data: {state_data}")
                    
                    print(f"[SUCCESS] Successfully loaded {len(states)} states from locations app")
                        
                except Exception as locations_error:
                    print(f"[ERROR] States not available: {str(locations_error)}")
                    print(f"[ERROR] Error type: {type(locations_error).__name__}")
                    print(f"[ERROR] No fallback states - check database connection")
                        
            except Exception as e:
                print(f"[ERROR] Error fetching states: {str(e)}")
                print(f"[ERROR] Error type: {type(e).__name__}")
                states = []
            
            # FALLBACK: If no states loaded from database, use constants as fallback
            if not states:
                print("[FALLBACK] No states from database, using constants fallback...")
                from .constants import ALL_INDIA_STATES_LIST
                print(f"[FALLBACK] Loading {len(ALL_INDIA_STATES_LIST)} states from constants")
                
                # Map state names to proper database IDs (from tbl_state.stateid)
                STATE_ID_MAPPING = {
                    'Tamil Nadu': 37,
                    'Kerala': 42,
                    'Karnataka': 43,
                    'Gujarat': 44,
                    'Rajasthan': 45,
                    'Telangana': 46,
                    'Delhi': 47,
                    'West Bengal': 48,
                    'Maharashtra': 41,
                    'Andhra Pradesh': 49,
                    'Uttar Pradesh': 50,
                    'Madhya Pradesh': 51,
                    'Bihar': 52,
                    'Odisha': 53,
                    'Punjab': 54,
                    'Haryana': 55,
                    'Assam': 56,
                    'Jharkhand': 57,
                    'Chhattisgarh': 58,
                    'Himachal Pradesh': 59,
                    'Uttarakhand': 60,
                    'Goa': 61,
                    'Tripura': 62,
                    'Meghalaya': 63,
                    'Manipur': 64,
                    'Nagaland': 65,
                    'Arunachal Pradesh': 66,
                    'Mizoram': 67,
                    'Sikkim': 68,
                    'Chandigarh': 69,
                    'Andaman and Nicobar Islands': 70,
                    'Dadra and Nagar Haveli and Daman and Diu': 71,
                    'Jammu and Kashmir': 72,
                    'Ladakh': 73,
                    'Lakshadweep': 74,
                    'Puducherry': 75
                }
                
                # Convert constants to proper format with correct database IDs
                for state_name in ALL_INDIA_STATES_LIST:
                    state_id = STATE_ID_MAPPING.get(state_name, 999)  # Use 999 for unmapped states
                    states.append({
                        'value': state_id,      # Use proper database ID
                        'label': state_name,    # State name as label
                        'id': state_id,         # Use proper database ID
                        'stateid': state_id,    # Use proper database ID
                        'state': state_name     # State name
                    })
                
                print(f"[FALLBACK] Successfully loaded {len(states)} states from constants with proper database IDs")
                print(f"[FALLBACK] Sample states: Tamil Nadu=37, Karnataka=43, Maharashtra=41")
            
            return Response({
                'success': True,
                'data': {
                    'employees': employees,
                    'vendors': vendors,
                    'clients': vendors,  # Alias for vendors
                    'states': states,
                    'cities': cities,
                    'sources': sources,
                    'branches': branches,
                    'call_plans': call_plans,
                    'channels': channels,
                    'status_options': status_options
                },
                'counts': {
                    'employees': len(employees),
                    'vendors': len(vendors),
                    'states': len(states),
                    'cities': len(cities),
                    'sources': len(sources),
                    'branches': len(branches),
                    'call_plans': len(call_plans),
                    'channels': len(channels)
                }
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch dropdown data: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='cities-for-state')
    def get_cities_for_state(self, request):
        """Get cities filtered by state ID"""
        state_id = request.query_params.get('state_id')
        if not state_id:
            return Response(
                {'error': 'state_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            cities = []
            
            # Try to get cities from locations app filtered by state
            try:
                state_id_int = int(state_id)
                
                # Try to get cities from locations app
                try:
                    city_objects = City.objects.filter(state_ids=state_id_int).order_by('city')
                    for city in city_objects:
                        cities.append({
                            'value': city.id,
                            'label': city.city,
                            'id': city.id,
                            'city_id': city.id,
                            'city': city.city,
                            'state_id': state_id,
                            'state': city.state
                        })
                        
                except Exception as locations_error:
                    print(f"[WARNING] Locations app filtering failed, using fallback: {str(locations_error)}")
                    # Fallback: Return some common Indian cities if state_id is provided
                    if state_id_int > 0:  # Valid state ID
                        sample_cities = [
                            'Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Trichy',
                            'Mumbai', 'Pune', 'Bangalore', 'Hyderabad', 'Delhi'
                        ]
                        
                        city_id = 1
                        for city_name in sample_cities[:5]:  # Limit to 5 cities
                            cities.append({
                                'value': city_id,
                                'label': city_name,
                                'id': city_id,
                                'city_id': city_id,
                                'city': city_name,
                                'state_id': state_id,
                                'state': f'State {state_id}'
                            })
                            city_id += 1
                            
            except (ValueError, KeyError):
                pass  # Return empty list for invalid state_id
            
            return Response({
                'success': True,
                'cities': cities,
                'count': len(cities)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch cities: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='update-statistics')
    def update_call_statistics_endpoint(self, request, pk=None):
        """
        API endpoint to update call statistics for a specific call detail
        """
        try:
            call_detail = self.get_object()
            result = update_call_statistics(call_detail.id)
            
            if result:
                stats = get_call_statistics(call_detail_id=call_detail.id)
                return Response({
                    'success': True,
                    'message': 'Call statistics updated successfully',
                    'statistics': stats
                })
            else:
                return Response({
                    'success': False,
                    'message': 'Failed to update call statistics'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response(
                {'error': f'Failed to update call statistics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='statistics')
    def get_call_statistics_endpoint(self, request, pk=None):
        """
        API endpoint to get call statistics for a specific call detail
        """
        try:
            call_detail = self.get_object()
            stats = get_call_statistics(call_detail_id=call_detail.id)
            
            if stats:
                return Response({
                    'success': True,
                    'statistics': stats
                })
            else:
                return Response({
                    'success': False,
                    'message': 'No statistics found for this call detail'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            return Response(
                {'error': f'Failed to get call statistics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='candidate-statistics')
    def get_candidate_statistics(self, request):
        """
        API endpoint to get aggregated call statistics for a candidate
        """
        try:
            candidate_id = request.query_params.get('candidate_id')
            if not candidate_id:
                return Response({
                    'error': 'candidate_id parameter is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            stats = get_call_statistics(candidate_id=candidate_id)
            
            if stats:
                return Response({
                    'success': True,
                    'candidate_id': candidate_id,
                    'statistics': stats
                })
            else:
                return Response({
                    'success': False,
                    'message': 'No statistics found for this candidate'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            return Response(
                {'error': f'Failed to get candidate statistics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='plan-statistics')
    def get_plan_statistics(self, request):
        """
        API endpoint to get aggregated call statistics for a plan
        """
        try:
            plan_id = request.query_params.get('plan_id')
            if not plan_id:
                return Response({
                    'error': 'plan_id parameter is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            stats = get_call_statistics(plan_id=plan_id)
            
            if stats:
                return Response({
                    'success': True,
                    'plan_id': plan_id,
                    'statistics': stats
                })
            else:
                return Response({
                    'success': False,
                    'message': 'No statistics found for this plan'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            return Response(
                {'error': f'Failed to get plan statistics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def dropdown_data(self, request):
        """Comprehensive endpoint returning all dropdown data in one call (matching PHP implementation)"""
        print(f"[EMERGENCY] DROPDOWN_DATA METHOD CALLED - STARTING NOW!")
        
        # ABSOLUTE EMERGENCY POSITION FIX - CANNOT FAIL
        positions_data = []
        try:
            print(f"[EMERGENCY] STARTING POSITION LOADING...")
            from Masters.models import Position
            positions = Position.objects.all()
            print(f"[EMERGENCY] Found {positions.count()} positions in database")
            for pos in positions:
                pos_data = {
                    'value': pos.id,
                    'label': pos.name,
                    'id': pos.id,
                    'designation': pos.name
                }
                positions_data.append(pos_data)
                print(f"[EMERGENCY] Added position: {pos.name} (ID: {pos.id})")
            print(f"[EMERGENCY] Total positions loaded: {len(positions_data)}")
        except Exception as e:
            print(f"[MASTERS POSITION] Position loading failed: {str(e)}")
            import traceback
            print(f"[MASTERS POSITION] Traceback: {traceback.format_exc()}")
            print(f"[MASTERS POSITION] No positions loaded - check Masters.models.Position table")
        
        # LOG FINAL POSITION COUNT FROM MASTERS DATABASE ONLY
        print(f"[MASTERS POSITION] Final positions from Masters table: {len(positions_data)}")
        
        try:
            
            dropdown_data = {
                'employees': [],
                'vendors': [],
                'clients': [],  # Alias for vendors
                'states': [],
                'cities': [],
                'sources': [],
                'branches': [],
                'channels': positions_data,  # CHANNELS = MASTERS POSITIONS
                'call_plans': [],
                'status_options': []
            }
            
            print(f"[CRITICAL] dropdown_data['channels'] contains: {len(dropdown_data['channels'])} items")
            
            counts = {}
            
            # Get employees using Django ORM with role-based access
            try:
                employee_queryset = None
                
                if request.user.is_authenticated:
                    loginid = request.user.username
                    
                    # Get user record to check status using Django ORM
                    user_employee = Employee.objects.filter(
                        employeeCode=loginid,
                        del_state=0
                    ).first()
                    
                    if user_employee:
                        user_status = getattr(user_employee, 'status', None)
                        
                        if user_status == "Leader":
                            # Leaders can see their team members + themselves
                            # Note: user_status and leader_emp_code fields may not exist
                            employee_queryset = Employee.objects.filter(
                                Q(employeeCode=loginid) | Q(level__in=['L2', 'L3']),  # Fallback logic
                                del_state=0
                            ).order_by('firstName')
                        elif user_status == "Head":
                            # Heads can see all users
                            employee_queryset = Employee.objects.filter(
                                del_state=0
                            ).order_by('firstName')
                        else:
                            # Regular users only see themselves
                            employee_queryset = Employee.objects.filter(
                                employeeCode=loginid,
                                del_state=0
                            )
                    else:
                        # Fallback to all active users if user record not found
                        employee_queryset = Employee.objects.filter(
                            del_state=0
                        ).order_by('firstName')
                else:
                    # Not authenticated - return all active users
                    employee_queryset = Employee.objects.filter(
                        del_state=0
                    ).order_by('firstName')
                
                # Process employee queryset
                if employee_queryset:
                    for employee in employee_queryset:
                        full_name = f"{employee.firstName} / {employee.employeeCode}" if employee.firstName and employee.employeeCode else employee.firstName or employee.employeeCode or 'Unknown'
                        dropdown_data['employees'].append({
                            'value': employee.id,
                            'label': full_name,
                            'id': employee.id,
                            'name': employee.firstName or '',
                            'empcode': employee.employeeCode or '',
                            'fullName': full_name
                        })
                counts['employees'] = len(dropdown_data['employees'])
            except Exception as e:
                print(f"[ERROR] Error fetching employees: {str(e)}")
                counts['employees'] = 0
                
            # Get vendors/clients using Django ORM
            try:
                # Note: Using vendor_vendor table instead of tbl_vendor
                vendor_objects = Vendor.objects.filter(
                    vendor_name__isnull=False
                ).exclude(
                    vendor_name=''
                ).order_by('vendor_name')
                
                for vendor in vendor_objects:
                    vendor_data = {
                        'value': vendor.id,
                        'label': vendor.vendor_name or '',
                        'id': vendor.id,
                        'vendorname': vendor.vendor_name or '',
                        'vendor_name': vendor.vendor_name or ''  # Backward compatibility
                    }
                    dropdown_data['vendors'].append(vendor_data)
                    dropdown_data['clients'].append(vendor_data)  # Alias
                counts['vendors'] = len(dropdown_data['vendors'])
                counts['clients'] = counts['vendors']
            except Exception as e:
                print(f"[ERROR] Error fetching vendors: {str(e)}")
                counts['vendors'] = 0
                counts['clients'] = 0
                
            # Get states from locations app - CRITICAL FIX
            print(f"[CRITICAL STATE FIX] Starting state loading...")
            try:
                state_objects = State.objects.all().order_by('state')
                state_count = state_objects.count()
                print(f"[CRITICAL STATE FIX] Found {state_count} states in tbl_state table")
                
                if state_count == 0:
                    print(f"[CRITICAL STATE FIX] ERROR: No states found in database!")
                
                for state in state_objects:
                    state_data = {
                        'value': state.id,  # Database stateid (37, 40, 41, etc.)
                        'label': state.state,
                        'id': state.id,
                        'stateid': state.id,
                        'state': state.state,
                        'state_id': state.id,
                        'state_name': state.state,
                        'name': state.state
                    }
                    dropdown_data['states'].append(state_data)
                    
                    # Debug first few states to verify IDs
                    if len(dropdown_data['states']) <= 3:
                        print(f"[CRITICAL STATE FIX] Loaded state: {state.state} with ID: {state.id} (type: {type(state.id)})")
                        print(f"[CRITICAL STATE FIX] State data: {state_data}")
                
                print(f"[CRITICAL STATE FIX] Total states loaded: {len(dropdown_data['states'])}")
                        
            except Exception as locations_error:
                print(f"[CRITICAL STATE FIX] ERROR loading states: {str(locations_error)}")
                import traceback
                print(f"[CRITICAL STATE FIX] Traceback: {traceback.format_exc()}")
                print(f"[CRITICAL STATE FIX] No fallback states - check database connection")
                        
                # DEDUPLICATE STATES BY NAME TO PREVENT DUPLICATES
                seen_states = {}
                unique_states = []
                for state in dropdown_data['states']:
                    state_name = state['label'].strip().lower()
                    if state_name not in seen_states:
                        seen_states[state_name] = state
                        unique_states.append(state)
                    else:
                        print(f"[DEDUP WARNING] Skipping duplicate state: {state['label']} (ID: {state['id']})")
                
                dropdown_data['states'] = unique_states
                counts['states'] = len(dropdown_data['states'])
                
                # Debug logging for state ID validation
                print(f"[STATE DEBUG] Loaded {counts['states']} unique states:")
                for state in dropdown_data['states'][:5]:  # Show first 5 for debugging
                    print(f"  - {state['label']} (ID: {state['id']}, stateid: {state.get('stateid', 'N/A')})")
                    
            except Exception as e:
                print(f"[ERROR] Error fetching states: {str(e)}")
                counts['states'] = 0

            # Get cities from locations app
            try:
                # Try to get cities from locations app
                try:
                    city_objects = City.objects.all().order_by('city')
                    for city in city_objects:
                        dropdown_data['cities'].append({
                            'value': city.id,
                            'label': city.city,
                            'id': city.id,
                            'city_id': city.id,
                            'city': city.city,
                            'city_name': city.city,
                            'name': city.city,
                            'state_id': city.state_ids if hasattr(city, 'state_ids') else (city.state_id if hasattr(city, 'state_id') else 0)
                        })
                        
                except Exception as locations_error:
                    print(f"[WARNING] Locations app not available, using fallback cities: {str(locations_error)}")
                    # Fallback to sample cities with CORRECT state_id references to prevent mismatching
                    sample_cities = [
                        {'id': 1, 'city': 'Chennai', 'state_id': 37},      # Tamil Nadu
                        {'id': 2, 'city': 'Coimbatore', 'state_id': 37},   # Tamil Nadu
                        {'id': 3, 'city': 'Madurai', 'state_id': 37},      # Tamil Nadu
                        {'id': 4, 'city': 'Mumbai', 'state_id': 41},       # Maharashtra
                        {'id': 5, 'city': 'Pune', 'state_id': 41},         # Maharashtra
                        {'id': 6, 'city': 'Bangalore', 'state_id': 43},    # Karnataka
                        {'id': 7, 'city': 'Hyderabad', 'state_id': 46},    # Telangana
                        {'id': 8, 'city': 'Delhi', 'state_id': 47},        # Delhi
                        {'id': 9, 'city': 'Kochi', 'state_id': 42},        # Kerala
                        {'id': 10, 'city': 'Ahmedabad', 'state_id': 44},   # Gujarat
                        {'id': 11, 'city': 'Jaipur', 'state_id': 45},      # Rajasthan
                        {'id': 12, 'city': 'Kolkata', 'state_id': 48}      # West Bengal
                        ]
                    
                    for city_data in sample_cities:
                        dropdown_data['cities'].append({
                            'value': city_data['id'],
                            'label': city_data['city'],
                            'id': city_data['id'],
                            'city_id': city_data['id'],
                            'city': city_data['city'],
                            'state_id': city_data['state_id']
                        })
                        
                # DEDUPLICATE CITIES BY NAME TO PREVENT DUPLICATES
                seen_cities = {}
                unique_cities = []
                for city in dropdown_data['cities']:
                    city_key = f"{city['label'].strip().lower()}_{city.get('state_id', 'unknown')}"
                    if city_key not in seen_cities:
                        seen_cities[city_key] = city
                        unique_cities.append(city)
                    else:
                        print(f"[DEDUP WARNING] Skipping duplicate city: {city['label']} (ID: {city['id']}, state_id: {city.get('state_id')})")
                
                dropdown_data['cities'] = unique_cities
                counts['cities'] = len(dropdown_data['cities'])
                
                # Debug logging for city-state relationship validation
                print(f"[CITY DEBUG] Loaded {counts['cities']} unique cities:")
                for city in dropdown_data['cities'][:5]:  # Show first 5 for debugging
                    print(f"  - {city['label']} (ID: {city['id']}, state_id: {city.get('state_id', 'N/A')})")
                    
                # Validate city-state relationships
                state_ids = {state['id'] for state in dropdown_data['states']}
                invalid_cities = [city for city in dropdown_data['cities'] if city.get('state_id') not in state_ids]
                if invalid_cities:
                    print(f"[WARNING] Found {len(invalid_cities)} cities with invalid state_id references:")
                    for city in invalid_cities[:5]:
                        print(f"  - {city['label']} references state_id {city.get('state_id')} (not in states list)")
                        
            except Exception as e:
                print(f"[ERROR] Error fetching cities: {str(e)}")
                counts['cities'] = 0
            
            print(f"[DEBUG] Finished city loading, now starting position loading...")
            
            # Get positions - DIRECT FIX
            print(f"[POSITION DEBUG] DIRECT FIX - Adding positions...")
            try:
                from Masters.models import Position
                positions = Position.objects.all()
                print(f"[POSITION DEBUG] Found {positions.count()} positions")
                
                for pos in positions:
                    dropdown_data['positions'].append({
                        'value': pos.id,
                        'label': pos.name,
                        'id': pos.id,
                        'designation': pos.name
                    })
                    print(f"[POSITION DEBUG] Added: {pos.name} (ID: {pos.id})")
                
                counts['positions'] = len(dropdown_data['positions'])
                print(f"[POSITION DEBUG] TOTAL POSITIONS ADDED: {counts['positions']}")
                
            except Exception as e:
                print(f"[ERROR] Position loading failed: {str(e)}")
                # Add fallback positions directly
                fallback_positions = [
                    {'value': 1, 'label': 'Sales Position', 'id': 1, 'designation': 'Sales Position'},
                    {'value': 2, 'label': 'Manager', 'id': 2, 'designation': 'Manager'},
                    {'value': 3, 'label': 'Developer', 'id': 3, 'designation': 'Developer'}
                ]
                dropdown_data['positions'] = fallback_positions
                counts['positions'] = len(fallback_positions)
                print(f"[POSITION DEBUG] Added {len(fallback_positions)} fallback positions")
            
            # Get sources - from Masters Source model only
            try:
                # Use Django ORM for sources from Masters
                source_objects = Source.objects.filter(
                    name__isnull=False
                ).exclude(
                    name=''
                ).order_by('name')
                
                for source in source_objects:
                    dropdown_data['sources'].append({
                        'value': source.id,
                        'label': source.name,
                        'id': source.id,
                        'source': source.name,
                        'name': source.name
                    })
                
                counts['sources'] = len(dropdown_data['sources'])
            except Exception as e:
                print(f"[ERROR] Error fetching sources: {str(e)}")
                counts['sources'] = 0
            
            # Get branches - using Django ORM
            try:
                # Use Django ORM for branches
                branch_objects = Branch.objects.filter(
                    name__isnull=False
                ).exclude(
                    name=''
                ).order_by('name')
                
                for branch in branch_objects:
                    dropdown_data['branches'].append({
                        'value': branch.id,
                        'label': branch.name,
                        'id': branch.id,
                        'name': branch.name,
                        'branch_name': branch.name,
                        'branchcode': branch.branchcode or '',
                        'branch_code': branch.branchcode or '',
                        'status': branch.status or '',
                        'is_active': branch.status == 'Active'
                    })
                counts['branches'] = len(dropdown_data['branches'])
            except Exception as e:
                print(f"[ERROR] Error fetching branches: {str(e)}")
                counts['branches'] = 0
            
            # Get existing call plan data from call details
            try:
                plans = CallDetails.objects.values('tb_call_plan_id', 'tb_call_plan_data').distinct()
                for plan in plans:
                    if plan['tb_call_plan_data']:
                        dropdown_data['call_plans'].append({
                            'value': plan['tb_call_plan_id'],
                            'label': plan['tb_call_plan_data'],
                            'id': plan['tb_call_plan_id'],
                            'tb_call_plan_data': plan['tb_call_plan_data'],
                            'name': plan['tb_call_plan_data']
                        })
                counts['call_plans'] = len(dropdown_data['call_plans'])
            except Exception as e:
                print(f"[ERROR] Error fetching call plans: {str(e)}")
                counts['call_plans'] = 0
            # Add predefined channels (matching PHP implementation)
            channels = [
                {'value': 'Banca', 'label': 'Banca', 'name': 'Banca'},
                {'value': 'Agency', 'label': 'Agency', 'name': 'Agency'},
                {'value': 'Direct', 'label': 'Direct', 'name': 'Direct'},
                {'value': 'Online', 'label': 'Online', 'name': 'Online'},
                {'value': 'Referral', 'label': 'Referral', 'name': 'Referral'}
            ]
            dropdown_data['channels'] = channels
            counts['channels'] = len(channels)
            
            # Add status options
            status_options = [
                {'value': 0, 'label': 'Inactive', 'name': 'Inactive'},
                {'value': 1, 'label': 'Active', 'name': 'Active'},
                {'value': 2, 'label': 'Completed', 'name': 'Completed'},
                {'value': 3, 'label': 'Cancelled', 'name': 'Cancelled'}
            ]
            dropdown_data['status_options'] = status_options
            counts['status_options'] = len(status_options)
            
            # CRITICAL: Ensure channels count is set (channels contain Masters Position data)
            counts['channels'] = len(dropdown_data['channels'])
            
            # FINAL DEBUG: Check what we're actually sending
            print(f"[FINAL DEBUG] About to return dropdown_data with:")
            print(f"[FINAL DEBUG] - channels count: {len(dropdown_data['channels'])}")
            print(f"[FINAL DEBUG] - channels data (Masters Positions): {dropdown_data['channels']}")
            print(f"[FINAL DEBUG] - counts['channels']: {counts.get('channels', 'NOT SET')}")
            
            # CRITICAL STATE DEBUG: Check states being sent
            print(f"[CRITICAL STATE DEBUG] States being sent to frontend:")
            print(f"[CRITICAL STATE DEBUG] - states count: {len(dropdown_data['states'])}")
            print(f"[CRITICAL STATE DEBUG] - states type: {type(dropdown_data['states'])}")
            if dropdown_data['states']:
                print(f"[CRITICAL STATE DEBUG] - first state: {dropdown_data['states'][0]}")
                print(f"[CRITICAL STATE DEBUG] - first state type: {type(dropdown_data['states'][0])}")
            
            return Response({
                'success': True,
                'data': dropdown_data,
                'counts': counts
            })
            
        except Exception as e:
            print(f"[ERROR] Error in comprehensive dropdown endpoint: {str(e)}")
            return Response(
                {'success': False, 'error': 'Failed to fetch dropdown data'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='user-profile')
    def get_user_profile(self, request):
        """Get current user's profile information including branch"""
        try:
            user_employee_data = get_user_employee_data(request.user)
            
            if not user_employee_data:
                return Response({
                    'success': False,
                    'error': 'User profile not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Determine if user is admin and role-based permissions
            user_level = user_employee_data.get('level', '').lower()
            is_admin = user_level in ['l4', 'l5', 'rm', 'ceo', 'bm']
            
            # Determine if user can see all branches (CEO and RM)
            can_see_all_branches = user_level in ['l5', 'l4', 'ceo', 'rm']
            
            # Get branch information based on role
            if can_see_all_branches:
                # CEO and RM don't need specific branch info since they can access all
                branch_name = None
                user_branch = None
            else:
                # All other roles see their specific branch
                branch_name = user_employee_data.get('branch')
                user_branch = user_employee_data.get('branch')
            
            return Response({
                'success': True,
                'data': {
                    'id': user_employee_data.get('id'),
                    'employeeCode': user_employee_data.get('employeeCode'),  # Added missing employeeCode
                    'firstName': user_employee_data.get('firstName'),
                    'lastName': user_employee_data.get('lastName'),
                    'fullName': user_employee_data.get('fullName'),
                    'officialEmail': user_employee_data.get('officialEmail'),
                    'phone1': user_employee_data.get('phone1'),
                    'branch': user_branch,
                    'branchName': branch_name,
                    'level': user_employee_data.get('level'),
                    'status': user_employee_data.get('status'),  # Added status for debugging
                    'isAdmin': is_admin,
                    'canSeeAllBranches': can_see_all_branches,
                    'isCEO': user_level == 'ceo',
                    'isRM': user_level == 'rm',
                    'username': request.user.username if request.user.is_authenticated else None
                }
            })
            
        except Exception as e:
            print(f"[ERROR] Error fetching user profile: {str(e)}")
            return Response({
                'success': False,
                'error': f'Failed to fetch user profile: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'], url_path='add-candidate')
    def add_candidate_to_call(self, request, pk=None):
        """Add a candidate to call statistics for testing"""
        try:
            call_detail = self.get_object()
            candidate_id = request.data.get('candidate_id')
            call_type = request.data.get('call_type', 'onplan')  # onplan, onothers, profiles, profilesothers
            
            if not candidate_id:
                return Response({
                    'success': False,
                    'error': 'candidate_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Add candidate to the appropriate field
            if call_type == 'onplan':
                increment_calls_on_plan(call_detail.id, candidate_id)
            elif call_type == 'onothers':
                increment_calls_on_others(call_detail.id, candidate_id)
            elif call_type == 'profiles':
                increment_profiles_on_plan(call_detail.id, candidate_id)
            elif call_type == 'profilesothers':
                increment_profiles_on_others(call_detail.id, candidate_id)
            else:
                return Response({
                    'success': False,
                    'error': 'Invalid call_type. Use: onplan, onothers, profiles, profilesothers'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Refresh the object and return updated statistics
            call_detail.refresh_from_db()
            stats = format_statistics_for_frontend(call_detail)
            
            return Response({
                'success': True,
                'message': f'Added candidate {candidate_id} to {call_type}',
                'statistics': stats,
                'raw_data': {
                    'tb_calls_onplan': call_detail.tb_calls_onplan,
                    'tb_calls_onothers': call_detail.tb_calls_onothers,
                    'tb_calls_profiles': call_detail.tb_calls_profiles,
                    'tb_calls_profilesothers': call_detail.tb_calls_profilesothers
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to add candidate: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='debug-user')
    def debug_user_info(self, request):
        """Debug endpoint to check user authentication and employee matching"""
        try:
            user_info = {
                'is_authenticated': request.user.is_authenticated,
                'username': request.user.username if request.user.is_authenticated else None,
                'email': request.user.email if request.user.is_authenticated else None,
                'user_id': request.user.id if request.user.is_authenticated else None
            }
            
            # Try to get employee data
            employee_data = None
            if request.user.is_authenticated:
                employee_data = get_user_employee_data(request.user)
            
            # Get sample employees for reference
            sample_employees = []
            try:
                # Get sample employees using Django ORM
                employee_objects = Employee.objects.filter(
                    Q(del_state=0) | Q(del_state__isnull=True)
                ).order_by('id')[:5]
                
                for employee in employee_objects:
                    sample_employees.append({
                        'id': employee.id,
                        'firstName': employee.firstName,
                        'lastName': employee.lastName,
                        'officialEmail': employee.officialEmail,
                        'employeeCode': employee.employeeCode,
                        'branch': employee.branch,
                        'level': employee.level
                    })
            except Exception as e:
                sample_employees = [f"Error fetching employees: {str(e)}"]
            
            return Response({
                'success': True,
                'user_info': user_info,
                'employee_data': employee_data,
                'sample_employees': sample_employees
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Debug error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='plan-counts-by-branch')
    def get_plan_counts_by_branch(self, request):
        """Get plan counts grouped by branch for a specific date"""
        try:
            date_param = request.query_params.get('date')
            if not date_param:
                return Response({
                    'success': False,
                    'error': 'Date parameter is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
            except ValueError:
                return Response({
                    'success': False,
                    'error': 'Invalid date format. Use YYYY-MM-DD'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get user's branch information for filtering
            user_employee_data = get_user_employee_data(request.user)
            user_branch = None
            is_admin = False
            
            if user_employee_data:
                user_branch = user_employee_data.get('branch')
                user_level = user_employee_data.get('level', '').lower()
                is_admin = user_level in ['l4', 'l5', 'rm', 'ceo', 'bm']
            
            # Get events for the specific date
            queryset = CallDetails.objects.filter(
                tb_call_startdate__date=target_date
            )
            
            # Apply branch filtering if user is not admin
            if not is_admin and user_branch:
                branch_employee_ids = list(Employee.objects.filter(
                    Q(branch__iexact=user_branch) | Q(branch__isnull=True),
                    del_state=0
                ).values_list('id', flat=True))
                if branch_employee_ids:
                    queryset = queryset.filter(tb_call_emp_id__in=branch_employee_ids)
            
            # Initialize plan counts structure
            plan_counts = {}
            
            # For CEO/RM: Get all unique branches from employees in tb_call_details for this date
            # For others: Only their branch
            if is_admin:
                print(f"[DEBUG] Admin user - getting all branches from tb_call_details for date {target_date}")
                # Get all unique employee IDs from events on this date
                employee_ids = queryset.values_list('tb_call_emp_id', flat=True).distinct()
                
                # Get branches for all these employees
                unique_branches = set()
                for emp_id in employee_ids:
                    emp_data = DatabaseQueryHelper.get_employee_by_id(emp_id, include_branch_level=True)
                    if emp_data and emp_data.get('branch'):
                        unique_branches.add(emp_data['branch'])
                
                branches = list(unique_branches)
                print(f"[DEBUG] Found branches from events: {branches}")
            else:
                # Regular user sees only their branch
                branches = [user_branch] if user_branch else []
                print(f"[DEBUG] Regular user - restricted to branch: {branches}")
            
            # Initialize counts for each branch
            for branch in branches:
                plan_counts[branch] = {
                    'P1': 0, 'P2': 0, 'P3': 0, 'P4': 0, 'P5': 0, 'total': 0
                }
            
            # Count events by branch and plan
            for event in queryset:
                # Get employee's branch from employee data
                emp_data = DatabaseQueryHelper.get_employee_by_id(event.tb_call_emp_id, include_branch_level=True)
                if emp_data and emp_data.get('branch'):
                    branch_name = emp_data['branch']
                    plan = event.tb_call_plan or 'P1'  # Default to P1 if no plan specified
                    
                    # Initialize branch if not exists (for admin users)
                    if branch_name not in plan_counts:
                        plan_counts[branch_name] = {
                            'P1': 0, 'P2': 0, 'P3': 0, 'P4': 0, 'P5': 0, 'total': 0
                        }
                    
                    # Count the event
                    if plan in plan_counts[branch_name]:
                        plan_counts[branch_name][plan] += 1
                    plan_counts[branch_name]['total'] += 1
            
            return Response({
                'success': True,
                'date': date_param,
                'plan_counts': plan_counts,
                'user_branch': user_branch,
                'is_admin': is_admin
            })
            
        except Exception as e:
            print(f"[ERROR] Error in get_plan_counts_by_branch: {str(e)}")
            return Response({
                'success': False,
                'error': f'Failed to get plan counts: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='available-plans')
    def get_available_plans(self, request):
        """Get available plans for an employee on a specific date (excluding already assigned plans)"""
        try:
            employee_id = request.query_params.get('employee_id')
            employee_name = request.query_params.get('employee_name')  # Keep for backward compatibility
            date = request.query_params.get('date')
            editing_event_id = request.query_params.get('editing_event_id')  # For edit mode
            
            print(f"[AVAILABLE-PLANS] Getting available plans for employee_id: {employee_id}, employee_name: {employee_name}, date: {date}")
            
            # Prefer employee_id over employee_name for accuracy
            if not (employee_id or employee_name) or not date:
                return Response({
                    'error': 'employee_id (or employee_name) and date parameters are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # All available plans
            all_plans = ['P1', 'P2', 'P3', 'P4', 'P5']
            
            # Find existing plans for this employee on this date
            # Use employee_id if available, fallback to employee_name
            if employee_id:
                existing_plans_query = CallDetails.objects.filter(
                    tb_call_emp_id=employee_id,
                    tb_call_startdate__date=date,
                    tb_call_plan_data__isnull=False
                ).exclude(
                    tb_call_plan_data=''
                )
                print(f"[AVAILABLE-PLANS] Using employee_id filter: tb_call_emp_id={employee_id}")
            else:
                existing_plans_query = CallDetails.objects.filter(
                    employee_name=employee_name,
                    tb_call_startdate__date=date,
                    tb_call_plan_data__isnull=False
                ).exclude(
                    tb_call_plan_data=''
                )
                print(f"[AVAILABLE-PLANS] Using employee_name filter: employee_name={employee_name}")
            
            # If editing, exclude the current event from the check
            if editing_event_id:
                existing_plans_query = existing_plans_query.exclude(
                    id=editing_event_id
                )
            
            # Get list of already assigned plans
            existing_plans = list(existing_plans_query.values_list('tb_call_plan_data', flat=True))
            
            employee_identifier = f"ID:{employee_id}" if employee_id else f"Name:{employee_name}"
            print(f"[AVAILABLE-PLANS] Existing plans for {employee_identifier} on {date}: {existing_plans}")
            
            # Filter out already assigned plans
            available_plans = [plan for plan in all_plans if plan not in existing_plans]
            
            print(f"[AVAILABLE-PLANS] Available plans: {available_plans}")
            
            # Format for frontend dropdown
            formatted_plans = [{'value': plan, 'label': plan} for plan in available_plans]
            
            return Response({
                'success': True,
                'available_plans': formatted_plans,
                'existing_plans': existing_plans,
                'all_plans': all_plans
            })
            
        except Exception as e:
            print(f"[ERROR] Error in get_available_plans: {str(e)}")
            return Response({
                'success': False,
                'error': f'Failed to get available plans: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
