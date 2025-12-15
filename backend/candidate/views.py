from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count, OuterRef, Subquery, IntegerField, Value, Sum,Prefetch
from django.http import FileResponse, Http404, HttpResponse
from django.conf import settings
from django.db import transaction, connection
from django.utils import timezone
from django.core.cache import cache
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from datetime import datetime, timedelta
from empreg.models import Employee  # Import Employee model for branch filtering
import os
import uuid
import tempfile
import logging
import time
import traceback
import hashlib

# Set up logger for this module
logger = logging.getLogger(__name__)
from .models import (
    Candidate, ClientJob, EducationCertificate,
    ExperienceCompany, PreviousCompany, AdditionalInfo, CandidateRevenue, CandidateRevenueFeedback,
    CandidateStatusHistory
)
from .serializers import (
    CandidateSerializer, CandidateListSerializer, ClientJobSerializer, EducationCertificateSerializer,
    ExperienceCompanySerializer, PreviousCompanySerializer, AdditionalInfoSerializer, CandidateRevenueSerializer, CandidateRevenueMinimalSerializer, CandidateRevenueFeedbackSerializer ,CandidateSearchSerializer, ProfileInSerializer, ProfileOutSerializer
)
from .utils import parse_resume, convert_docx_to_pdf
from .alternative_parser import alternative_parse_resume
from empreg.models import Employee
# ------------------------------
# Utility Functions
# ------------------------------
def get_nfd_expiry_threshold():
    """
    Common NFD expiry threshold calculation
    Returns the cutoff date - any NFD before this date is considered expired
    
    Rule: NFD expires at 12:00 AM (midnight) the next day
    Example: NFD = Oct 29 → Expires on Oct 30 at 12:00 AM
    So on Oct 30, threshold = Oct 30, and Oct 29 < Oct 30 = EXPIRED
    
    Standard: current_date (any NFD before today is expired)
    """
    from django.utils import timezone
    
    current_date = timezone.now().date()
    expiry_threshold = current_date  # Changed from current_date - 1 day
    return expiry_threshold

def get_current_user_name(user):
    """Standalone function to get current user's name with employee code for feedback entries"""
    
    try:
        if user and user.is_authenticated:
            
            # Optimized: Single query with Q objects to avoid multiple DB hits
            username = user.username
            employee = Employee.objects.filter(
                Q(user=user) | 
                Q(employeeCode=username) | 
                Q(phone1=username) | 
                Q(phone2=username),
                del_state=0
            ).select_related().first()
            
            if employee:
                result = f"{employee.firstName}({employee.employeeCode})"
                return result
            
            # Fallback to username if no employee record
            fallback_name = user.username if user else "System"
            return fallback_name
            
    except Exception as e:
        logger.error(f"Exception in get_current_user_name: {str(e)}")
        return "Unknown User"

def get_current_user_employee_code(user):
    """Get only the employee code for created_by/updated_by fields"""
    
    try:
        if user and user.is_authenticated:
            username = user.username
            employees = Employee.objects.filter(
                Q(user=user) | 
                Q(employeeCode=username) | 
                Q(phone1=username) | 
                Q(phone2=username),
                del_state=0
            ).select_related()
            
            if employees.exists():
                # Prioritize correct format: "Emp/XXXXX" over invalid formats like "EMPXXXXX-X"
                # First, try to find employee code with "/" (correct format)
                for employee in employees:
                    if employee.employeeCode and '/' in employee.employeeCode:
                        return employee.employeeCode  # Return correct format (e.g., "Emp/00040")
                
                # If no "/" format found, return the first one as fallback
                return employees.first().employeeCode
            
            # Fallback to username if no employee record
            return user.username if user else "System"
            
    except Exception as e:
        logger.error(f"Exception in get_current_user_employee_code: {str(e)}")
        return "System"       

def _resolve_branch_team_by_employee_code(employee_code, fallback_client_job_id=None):
    try:
        from empreg.models import Employee as Emp
        from Masters.models import Team as TeamModel, Branch as BranchModel
        from .models import ClientJob as CJ

        branch_id = None
        team_id = None

        emp = Emp.objects.filter(employeeCode=employee_code, del_state=0).first()
        if emp:
            team = (
                TeamModel.objects
                .filter(employees__employeeCode=employee_code, employees__del_state=0, status='Active')
                .first()
            )
            if team:
                team_id = team.id
                if getattr(team, 'branch_id', None):
                    branch_id = team.branch_id

            if branch_id is None:
                bp = (emp.branch or '').strip()
                if bp:
                    b = BranchModel.objects.filter(name__iexact=bp).first() or BranchModel.objects.filter(branchcode__iexact=bp).first()
                    if b:
                        branch_id = b.id

        if (branch_id is None or team_id is None) and fallback_client_job_id:
            cj = CJ.objects.filter(id=fallback_client_job_id).first()
            if cj:
                if branch_id is None:
                    branch_id = cj.branch_id
                if team_id is None:
                    team_id = cj.team_id

        return branch_id, team_id
    except Exception:
        return None, None
# ------------------------------
# Pagination for Candidate List
# ------------------------------
class CandidatePagination(PageNumberPagination):
    page_size = 50  # Limit to 50 candidates per page
    page_size_query_param = 'page_size'
    max_page_size = 100


class RevenuePagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200

# ------------------------------
# Candidate View
# ------------------------------
class CandidateViewSet(viewsets.ModelViewSet):
    # Ensure detail routes only match numeric IDs so list actions like 'create-complete' don't 405
    lookup_value_regex = r'\d+'
    serializer_class = CandidateSerializer
    pagination_class = CandidatePagination
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    @action(detail=False, methods=['post'], url_path='bulk-fetch')
    def bulk_fetch(self, request):
        """
        Optimized bulk fetch for multiple candidates by IDs.
        Handles missing IDs gracefully with efficient database queries.
        
        POST /api/candidates/bulk-fetch/
        Body: {
            "ids": [1, 2, 3, 4, 5],
            "include_client_jobs": true,  # Optional: include client job relationships
            "include_feedback": true,     # Optional: include feedback data
            "include_assignments": true   # Optional: include assignment data
        }
        
        Returns: {
            "found": [...],  # Candidates that exist
            "missing": [...],  # IDs that don't exist
            "count": 3,
            "performance": {"query_time": 0.05, "serialization_time": 0.02}
        }
        """
        start_time = time.time()
        
        try:
            # Input validation and extraction
            candidate_ids = request.data.get('ids', [])
            include_client_jobs = request.data.get('include_client_jobs', False)
            include_feedback = request.data.get('include_feedback', False)
            include_assignments = request.data.get('include_assignments', False)
            
            # Early return for empty input
            if not candidate_ids:
                return Response({
                    'found': [],
                    'missing': [],
                    'count': 0,
                    'message': 'No candidate IDs provided',
                    'performance': {'total_time': 0.0}
                }, status=status.HTTP_200_OK)
            
            # Increased limit for bulk operations
            MAX_BULK_SIZE = 5000  # Increased from 500 to 5000
            if len(candidate_ids) > MAX_BULK_SIZE:
                return Response({
                    'error': f'Bulk operation limited to {MAX_BULK_SIZE} candidates',
                    'requested': len(candidate_ids),
                    'max_allowed': MAX_BULK_SIZE,
                    'suggestion': 'Consider using pagination or filtering to reduce the dataset'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Optimized ID validation using list comprehension and set operations
            valid_ids = set()
            invalid_ids = []
            
            for id_val in candidate_ids:
                try:
                    int_id = int(id_val)
                    if int_id > 0:
                        valid_ids.add(int_id)  # Use set to automatically handle duplicates
                    else:
                        invalid_ids.append(id_val)
                except (ValueError, TypeError):
                    invalid_ids.append(id_val)
            
            valid_ids = list(valid_ids)  # Convert back to list for query
            
            if not valid_ids:
                return Response({
                    'found': [],
                    'missing': invalid_ids,
                    'count': 0,
                    'message': 'No valid candidate IDs provided',
                    'performance': {'total_time': time.time() - start_time}
                }, status=status.HTTP_200_OK)
            
            # Build optimized queryset with selective prefetching
            query_start = time.time()
            
            # For very large ID sets, use chunking to avoid database query limits
            CHUNK_SIZE = 1000  # Process in chunks of 1000 IDs
            existing_candidates = []
            
            if len(valid_ids) > CHUNK_SIZE:
                # Process in chunks for better performance
                for i in range(0, len(valid_ids), CHUNK_SIZE):
                    chunk_ids = valid_ids[i:i + CHUNK_SIZE]
                    chunk_queryset = Candidate.objects.filter(id__in=chunk_ids)
                    
                    # Conditional prefetch based on requested data
                    prefetch_relations = []
                    if include_client_jobs:
                        prefetch_relations.append('client_jobs')
                    if include_feedback or include_assignments:
                        prefetch_relations.extend([
                            'education_certificates',
                            'experience_companies', 
                            'previous_companies',
                            'additional_info'
                        ])
                    
                    if prefetch_relations:
                        chunk_queryset = chunk_queryset.prefetch_related(*prefetch_relations)
                    
                    existing_candidates.extend(list(chunk_queryset))
            else:
                # Single query for smaller datasets
                queryset = Candidate.objects.filter(id__in=valid_ids)
                
                # Conditional prefetch based on requested data
                prefetch_relations = []
                if include_client_jobs:
                    prefetch_relations.append('client_jobs')
                if include_feedback or include_assignments:
                    prefetch_relations.extend([
                        'education_certificates',
                        'experience_companies', 
                        'previous_companies',
                        'additional_info'
                    ])
                
                if prefetch_relations:
                    queryset = queryset.prefetch_related(*prefetch_relations)
                
                existing_candidates = list(queryset)
            
            query_time = time.time() - query_start
            
            # Efficient missing ID calculation using set operations
            found_ids = {candidate.id for candidate in existing_candidates}
            missing_ids = [id_val for id_val in valid_ids if id_val not in found_ids]
            
            # Optimized serialization with employee details
            serialization_start = time.time()
            
            # Choose serializer based on requested data
            if include_client_jobs or include_feedback or include_assignments:
                serializer = CandidateSerializer(existing_candidates, many=True)
            else:
                serializer = CandidateListSerializer(existing_candidates, many=True)
            
            serialized_data = serializer.data
            
            # Enhance with employee details (firstName, lastName) from employee codes
            employee_enhancement_start = time.time()
            enhanced_data = self._enhance_with_employee_details(serialized_data)
            employee_enhancement_time = time.time() - employee_enhancement_start
            
            # Format created_at and updated_at dates to dd-mm-yyyy
            date_formatting_start = time.time()
            enhanced_data = self._format_dates_in_data(enhanced_data)
            date_formatting_time = time.time() - date_formatting_start
            
            serialization_time = time.time() - serialization_start
            total_time = time.time() - start_time
            
            # Enhanced response with performance metrics
            return Response({
                'found': enhanced_data,
                'missing': missing_ids + invalid_ids,
                'count': len(enhanced_data),
                'requested_count': len(candidate_ids),
                'valid_count': len(valid_ids),
                'duplicate_count': len(candidate_ids) - len(valid_ids) - len(invalid_ids),
                'message': f'Found {len(enhanced_data)} out of {len(candidate_ids)} requested candidates with employee details',
                'includes': {
                    'client_jobs': include_client_jobs,
                    'feedback': include_feedback,
                    'assignments': include_assignments,
                    'employee_details': True
                },
                'performance': {
                    'total_time': round(total_time, 4),
                    'query_time': round(query_time, 4),
                    'serialization_time': round(serialization_time, 4),
                    'employee_enhancement_time': round(employee_enhancement_time, 4),
                    'date_formatting_time': round(date_formatting_time, 4),
                    'candidates_per_second': round(len(enhanced_data) / total_time, 2) if total_time > 0 else 0,
                    'chunked_processing': len(valid_ids) > 1000,
                    'chunks_processed': max(1, len(valid_ids) // 1000) if len(valid_ids) > 1000 else 1
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            total_time = time.time() - start_time
            logger.error(f"Error in bulk_fetch after {total_time:.4f}s: {str(e)}")
            return Response({
                'error': 'Failed to fetch candidates',
                'details': str(e),
                'performance': {'total_time': round(total_time, 4)}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_queryset(self):
        """Optimize database queries with executive filtering and search"""
        # Get filter parameters
        executive_filter = self.request.query_params.get('executive', None)
        remark_filter = self.request.query_params.get('remark', '').strip()
        search_term = self.request.query_params.get('search', '').strip()
        from_date = self.request.query_params.get('from_date', '').strip()
        to_date = self.request.query_params.get('to_date', '').strip()
        client_filter = self.request.query_params.get('client', '').strip()
        state_filter = self.request.query_params.get('state', '').strip()
        city_filter = self.request.query_params.get('city', '').strip()
        
        if self.action == 'list':
            queryset = Candidate.objects.all()
            
            # Apply date filters
            if from_date:
                queryset = queryset.filter(created_at__gte=from_date)
            if to_date:
                # Add one day to include the entire end date
                from datetime import datetime, timedelta
                to_date_obj = datetime.strptime(to_date, '%Y-%m-%d') + timedelta(days=1)
                queryset = queryset.filter(created_at__lt=to_date_obj)
            
            # Filter by client if provided
            if client_filter:
                queryset = queryset.filter(
                    client_jobs__client_name__icontains=client_filter
                ).distinct()
            
            # Filter by state/city if provided
            if state_filter:
                queryset = queryset.filter(state__iexact=state_filter)
            if city_filter:
                queryset = queryset.filter(city__iexact=city_filter)
            
            # Filter by remark if provided (for DataBank detailed view)
            if remark_filter:
                queryset = queryset.filter(
                    client_jobs__remarks__iexact=remark_filter
                ).distinct()
            
            # Filter by executive if provided
            if executive_filter:
                # Show candidates where:
                # 1. Main executive_name matches, OR
                # 2. Any of their client jobs are assigned to this executive
                queryset = queryset.filter(
                    Q(executive_name__iexact=executive_filter) |
                    Q(client_jobs__assign_to__iexact=executive_filter)
                ).distinct()
            
            # Apply search filter if provided
            if search_term:
                # Try to find employee by name first
                from empreg.models import Employee
                matching_employees = Employee.objects.filter(
                    Q(firstName__icontains=search_term) |
                    Q(lastName__icontains=search_term)
                ).values_list('employeeCode', flat=True)
                
                # Build search query
                search_query = (
                    Q(candidate_name__icontains=search_term) |
                    Q(profile_number__icontains=search_term) |
                    Q(mobile1__icontains=search_term) |
                    Q(mobile2__icontains=search_term) |
                    Q(email__icontains=search_term) |
                    Q(city__icontains=search_term) |
                    Q(state__icontains=search_term) |
                    Q(executive_name__icontains=search_term) |  # Search executive code
                    Q(client_jobs__client_name__icontains=search_term) |
                    Q(client_jobs__designation__icontains=search_term)
                )
                
                # Add employee name search if we found matching employees
                if matching_employees:
                    search_query |= Q(executive_name__in=matching_employees)
                
                queryset = queryset.filter(search_query).distinct()
            
            return queryset.order_by('-created_at')
        else:
            # For detail view, prefetch related objects
            queryset = Candidate.objects.prefetch_related(
                'client_jobs', 'education_certificates', 'experience_companies', 
                'previous_companies', 'additional_info'
            )
            
            # Apply same executive filtering for detail view
            if executive_filter:
                queryset = queryset.filter(
                    Q(executive_name__iexact=executive_filter) |
                    Q(client_jobs__assign_to__iexact=executive_filter)
                ).distinct()
            
            return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        """Use lightweight serializer for list operations to improve performance"""
        if self.action == 'list':
            return CandidateListSerializer
        return CandidateSerializer

    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        """
        Custom search action for candidates.
        Search by name, email (case-insensitive exact match) or mobile number (exact match).
        Usage: /api/candidate/search/?term=search_value
        """
        term = request.query_params.get('term', '').strip()
        
        if not term:
            return Response([])
        
        # Build search query with exact matches
        # For name and email: case-insensitive exact match
        # For mobile numbers: exact match (case-sensitive)
        query = Q(candidate_name__iexact=term) | Q(email__iexact=term) | Q(mobile1__exact=term)
        
        # Add mobile2 search if it's not null/empty
        query |= Q(mobile2__exact=term)
       
        # candidates = Candidate.objects.filter(query).prefetch_related('client_jobs', 'revenues')
        # Prefetch Active client jobs, treating NULL/blank as Active too
        active_jobs_prefetch = Prefetch(
            'client_jobs',
            queryset=ClientJob.objects.filter(
                Q(transfer_status__iexact='Active') | Q(transfer_status__isnull=True) | Q(transfer_status__exact='')
            ).order_by('-updated_at')
        )
        # Prefetch only minimal revenue fields needed for CandidateRevenueMinimalSerializer
        revenue_prefetch = Prefetch(
            'revenues',
            queryset=CandidateRevenue.objects.only('id', 'candidate_id', 'joining_date')
        )
        candidates = Candidate.objects.filter(query).prefetch_related(active_jobs_prefetch, revenue_prefetch)
        serializer = self.get_serializer(candidates, many=True)
        
        # Enhance with employee details
        enhanced_data = self._enhance_with_employee_details(serializer.data)
        return Response(enhanced_data)

    def perform_create(self, serializer):
        # Get current user's employee code
        current_user_emp_code = self.request.user.username if hasattr(self.request.user, 'username') else None
        
        # Set both created_by and updated_by for new candidates
        candidate = serializer.save(
            created_by=current_user_emp_code,
        )
        self._process_resume(candidate)

    def perform_update(self, serializer):
        # Get current user's employee code
        current_user_emp_code = self.request.user.username if hasattr(self.request.user, 'username') else None
        
        # Set updated_by for candidate updates
        candidate = serializer.save(updated_by=current_user_emp_code)
        self._process_resume(candidate)

    # ------------------------------------------------------------------
    # Helper: add employee full names into serialized candidate structures
    # ------------------------------------------------------------------
    def _enhance_with_employee_details(self, serialized_data):
        try:
            from empreg.models import Employee
            # Collect all employee codes used across the payload
            employee_codes = set()
            for c in serialized_data:
                for code in [
                    c.get('created_by'),
                    c.get('updated_by'),
                    c.get('executive_name'),
                    c.get('executive_code'),
                ]:
                    if code:
                        employee_codes.add(code)
                # Also gather assign_to codes from client_jobs if present
                jobs = c.get('client_jobs') or []
                for job in jobs:
                    code = job.get('assign_to') or job.get('assignTo')
                    if code:
                        employee_codes.add(code)

            if not employee_codes:
                return serialized_data

            # Bulk fetch employees; prefer active ones if model has del_state
            employees = Employee.objects.filter(employeeCode__in=employee_codes)
            if hasattr(Employee, 'del_state'):
                employees = employees.filter(del_state=0)
            employees = employees.values('employeeCode', 'firstName', 'lastName')

            # Build lookup
            lookup = {}
            for emp in employees:
                first = emp.get('firstName') or ''
                last = emp.get('lastName') or ''
                full = f"{first} {last}".strip() or first or last or ''
                lookup[emp['employeeCode']] = {
                    'firstName': first,
                    'lastName': last,
                    'fullName': full,
                }

            # Enhance each candidate dict
            for c in serialized_data:
                # created_by / updated_by
                for key, out_key in [('created_by', 'created_by_employee'), ('updated_by', 'updated_by_employee')]:
                    code = c.get(key)
                    if code and code in lookup:
                        info = lookup[code]
                        c[out_key] = {
                            'employeeCode': code,
                            'firstName': info['firstName'],
                            'lastName': info['lastName'],
                            'fullName': info['fullName'],
                        }

                # executive_name → executive_display + executive_employee
                exec_code = c.get('executive_name')
                if exec_code and exec_code in lookup:
                    info = lookup[exec_code]
                    c['executive_employee'] = {
                        'employeeCode': exec_code,
                        'firstName': info['firstName'],
                        'lastName': info['lastName'],
                        'fullName': info['fullName'],
                    }
                    c['executive_display'] = info['fullName']

                # client_jobs assign_to → assign_to_employee
                jobs = c.get('client_jobs') or []
                for job in jobs:
                    acode = job.get('assign_to') or job.get('assignTo')
                    if acode and acode in lookup:
                        info = lookup[acode]
                        job['assign_to_employee'] = {
                            'employeeCode': acode,
                            'firstName': info['firstName'],
                            'lastName': info['lastName'],
                            'fullName': info['fullName'],
                        }

            return serialized_data
        except Exception:
            # In case of any unexpected error, return the original data unmodified
            return serialized_data

    # ------------------------------------------------------------------
    # Helper: format created_at/updated_at dates to dd-mm-yyyy strings
    # ------------------------------------------------------------------
    def _format_dates_in_data(self, serialized_data):
        try:
            from datetime import datetime
            for c in serialized_data:
                for fld in ('created_at', 'updated_at'):
                    val = c.get(fld)
                    if isinstance(val, str):
                        try:
                            dt = datetime.fromisoformat(val.replace('Z', '+00:00'))
                            c[fld] = dt.strftime('%d-%m-%Y')
                        except Exception:
                            pass

                # Inside client_jobs if present
                jobs = c.get('client_jobs') or []
                for job in jobs:
                    for fld in ('created_at', 'updated_at'):
                        val = job.get(fld)
                        if isinstance(val, str):
                            try:
                                dt = datetime.fromisoformat(val.replace('Z', '+00:00'))
                                job[fld] = dt.strftime('%d-%m-%Y')
                            except Exception:
                                pass
            return serialized_data
        except Exception:
            return serialized_data

    def _process_resume(self, candidate):
        if not getattr(candidate, 'resume_file', None):
            return
        try:
            file_path = candidate.resume_file.path
            if not os.path.exists(file_path):
                return
            result = parse_resume(file_path)
            if result.get('success'):
                data = result.get('data', {})
                candidate.resume_parsed_data = data
                raw_text = data.get('raw_text', '') or ''
                if raw_text:
                    cleaned = raw_text.encode('utf-8', errors='ignore').decode('utf-8')
                    if len(cleaned) > 50000:
                        cleaned = cleaned[:50000]
                    candidate.resume_text = cleaned
                candidate.save(update_fields=['resume_parsed_data', 'resume_text'])
        except Exception:
            return
    
    @action(detail=False, methods=['post'], url_path='create-complete')
    def create_complete(self, request):
        try:
            import json

            # Accept JSON or multipart FormData with resume_file
            if hasattr(request, 'FILES') and 'resume_file' in request.FILES:
                def parse_json_field(name, default=None):
                    val = request.data.get(name)
                    if isinstance(val, str):
                        try:
                            return json.loads(val)
                        except json.JSONDecodeError:
                            return default if default is not None else {}
                    return val if val is not None else (default if default is not None else {})

                candidate_data = parse_json_field('candidate', {})
                client_job_data = parse_json_field('client_job', {})
                education_certificates = parse_json_field('education_certificates', [])
                experience_company_data = parse_json_field('experience_company', {})
                previous_companies = parse_json_field('previous_companies', [])
                additional_info_data = parse_json_field('additional_info', {})
                candidate_data['resume_file'] = request.FILES['resume_file']
            else:
                candidate_data = request.data.get('candidate', {})
                client_job_data = request.data.get('client_job', {})
                education_certificates = request.data.get('education_certificates', [])
                experience_company_data = request.data.get('experience_company', {})
                previous_companies = request.data.get('previous_companies', [])
                additional_info_data = request.data.get('additional_info', {})

            # Convert profile_submission to integer 1/0 if present
            if isinstance(client_job_data, dict) and 'profile_submission' in client_job_data:
                ps = client_job_data.get('profile_submission')
                if isinstance(ps, bool):
                    client_job_data['profile_submission'] = 1 if ps else 0
                elif isinstance(ps, int):
                    client_job_data['profile_submission'] = 1 if ps else 0
                else:
                    client_job_data['profile_submission'] = 1 if str(ps).lower() in ('true', '1', 'yes') else 0

            with transaction.atomic():
                # Create candidate
                current_user_emp_code = request.user.username if hasattr(request.user, 'username') else None
                cand_serializer = CandidateSerializer(data=candidate_data)
                if not cand_serializer.is_valid():
                    return Response({'error': 'Candidate validation failed', 'details': cand_serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
                candidate = cand_serializer.save(created_by=current_user_emp_code, updated_by=current_user_emp_code)

                # Create client job (optional)
                client_job = None
                if client_job_data:
                    client_job_data['candidate'] = candidate.id
                    # Resolve branch/team from current user (executive) when creating client job
                    try:
                        exec_code = get_current_user_employee_code(request.user)
                        if not exec_code:
                            exec_code = candidate.created_by or candidate.executive_name
                        b_id, t_id = _resolve_branch_team_by_employee_code(exec_code)
                        if b_id is not None:
                            client_job_data.setdefault('branch_id', b_id)
                        if t_id is not None:
                            client_job_data.setdefault('team_id', t_id)
                        # Store employee_id as employee code (e.g., Emp/00100)
                        client_job_data.setdefault('employee_id', exec_code)
                        # Default audit fields if not provided
                        client_job_data.setdefault('created_by', exec_code)
                        client_job_data.setdefault('updated_by', exec_code)
                        # Default initial transfer status to Active if not provided
                        client_job_data.setdefault('transfer_status', 'Active')
                    except Exception:
                        pass

                    # Map common alias field names (camelCase -> snake_case) before serialization
                    try:
                        def _apply_alias(dest, aliases):
                            # If dest is missing/empty but any alias has a value, copy it
                            dest_val = client_job_data.get(dest, None)
                            if dest_val is not None and str(dest_val).strip() != '':
                                return
                            for a in aliases:
                                if a in client_job_data and client_job_data[a] not in (None, ''):
                                    client_job_data[dest] = client_job_data[a]
                                    return

                        # Primary requested fields
                        _apply_alias('next_follow_up_date', ['nextFollowUpDate', 'next_follow_up', 'nfd', 'nfd_date'])
                        _apply_alias('remarks', ['remark', 'statusRemark', 'status_remarks'])
                        _apply_alias('transfer_status', ['transferStatus'])

                        # Related, safe aliases
                        _apply_alias('expected_joining_date', ['expectedJoiningDate'])
                        _apply_alias('interview_date', ['interviewDate'])
                        _apply_alias('profilestatus', ['profile_status', 'profileStatus'])
                        _apply_alias('attend', ['attended', 'attend_flag'])
                        _apply_alias('attend_date', ['attendDate'])

                        # Normalize attend boolean/numeric
                        if 'attend' in client_job_data:
                            val = client_job_data['attend']
                            sval = str(val).strip().lower()
                            client_job_data['attend'] = True if sval in ('1', 'true', 'yes') else False if sval in ('0', 'false', 'no') else val

                        # If remarks is still empty but profilestatus provided, fallback copy
                        if (not client_job_data.get('remarks')) and client_job_data.get('profilestatus'):
                            ps_val = str(client_job_data.get('profilestatus', '')).strip()
                            if ps_val:
                                client_job_data['remarks'] = ps_val
                    except Exception:
                        pass
                    cj_serializer = ClientJobSerializer(data=client_job_data)
                    if not cj_serializer.is_valid():
                        return Response({'error': 'Client job validation failed', 'details': cj_serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
                    client_job = cj_serializer.save()
                    try:
                        exec_code = get_current_user_employee_code(request.user)
                        b_id, t_id = _resolve_branch_team_by_employee_code(exec_code, client_job.id)
                        ps = client_job_data.get('profile_submission')
                        ps_val = None
                        try:
                            if ps is not None and int(ps) == 1:
                                ps_val = 1
                        except Exception:
                            ps_val = None
                        change_dt = client_job_data.get('profile_submission_date') or timezone.now().date()
                        # Use employee code for status history employee_id
                        emp_code_val = exec_code
                        CandidateStatusHistory.create_status_entry(
                            candidate_id=candidate.id,
                            remarks='Interested',
                            change_date=change_dt,
                            created_by=exec_code,
                            extra_notes='Initial candidate creation',
                            client_job_id=client_job.id,
                            vendor_id=None,
                            client_name=client_job.client_name,
                            profile_submission=ps_val,
                            branch_id=b_id,
                            team_id=t_id,
                            employee_id=emp_code_val
                        )
                    except Exception:
                        pass

                # Education certificates (optional)
                created_certificates = []
                try:
                    for cert in (education_certificates or []):
                        if isinstance(cert, dict):
                            cert['candidate'] = candidate.id
                            ec_ser = EducationCertificateSerializer(data=cert)
                            if ec_ser.is_valid():
                                created_certificates.append(ec_ser.save())
                except Exception:
                    pass

                # Experience company (optional)
                experience_company = None
                if isinstance(experience_company_data, dict) and experience_company_data:
                    experience_company_data['candidate'] = candidate.id
                    exp_ser = ExperienceCompanySerializer(data=experience_company_data)
                    if exp_ser.is_valid():
                        experience_company = exp_ser.save()

                # Previous companies (optional)
                created_prev_companies = []
                try:
                    for prev in (previous_companies or []):
                        if isinstance(prev, dict):
                            prev['candidate'] = candidate.id
                            pc_ser = PreviousCompanySerializer(data=prev)
                            if pc_ser.is_valid():
                                created_prev_companies.append(pc_ser.save())
                except Exception:
                    pass

                # Additional info (optional)
                additional_info = None
                if isinstance(additional_info_data, dict) and additional_info_data:
                    additional_info_data['candidate'] = candidate.id
                    add_ser = AdditionalInfoSerializer(data=additional_info_data)
                    if add_ser.is_valid():
                        additional_info = add_ser.save()

                candidate_id = candidate.id

            # After commit, process resume if present
            try:
                from django.shortcuts import get_object_or_404
                candidate = get_object_or_404(Candidate, pk=candidate_id)
                if getattr(candidate, 'resume_file', None):
                    self._process_resume(candidate)
            except Exception:
                pass

            return Response({
                'status': 'success',
                'message': 'Candidate created successfully',
                'data': {
                    'candidate': {
                        'id': candidate.id,
                        'candidate_name': candidate.candidate_name,
                        'email': candidate.email,
                        'mobile1': candidate.mobile1,
                        'profile_number': candidate.profile_number,
                        'executive_name': candidate.executive_name
                    },
                    'client_job': {'id': client_job.id} if client_job else None,
                    'education_certificates': [{'id': c.id} for c in created_certificates],
                    'experience_company': {'id': experience_company.id} if experience_company else None,
                    'previous_companies': [{'id': pc.id} for pc in created_prev_companies],
                    'additional_info': {'id': additional_info.id} if additional_info else None
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': 'Failed to create candidate', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='remarks')
    def remarks(self, request):
        """
        Return distinct, non-empty remarks from ClientJob table as a flat list.
        Prioritizes profilestatus over remarks field.
        Endpoint: /api/candidates/remarks/
        """
        # Get distinct profilestatus values (priority)
        profilestatus_qs = (
            ClientJob.objects
            .filter(profilestatus__isnull=False)
            .exclude(profilestatus="")
            .values_list("profilestatus", flat=True)
            .distinct()
        )
        
        # Get distinct remarks values (fallback)
        remarks_qs = (
            ClientJob.objects
            .filter(remarks__isnull=False)
            .exclude(remarks="")
            .values_list("remarks", flat=True)
            .distinct()
        )
        
        # Combine both lists and remove duplicates while preserving order
        all_remarks = list(profilestatus_qs) + list(remarks_qs)
        unique_remarks = []
        seen = set()
        
        for remark in all_remarks:
            if remark not in seen:
                unique_remarks.append(remark)
                seen.add(remark)
        
        return Response(unique_remarks, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='locations')
    def locations(self, request):
        """
        Return distinct, non-empty locations (cities) from Candidate table as a flat list.
        Endpoint: /api/candidates/locations/
        """
        locations_qs = (
            Candidate.objects
            .filter(city__isnull=False)
            .exclude(city="")
            .values_list("city", flat=True)
            .distinct()
            .order_by("city")
        )
        return Response(list(locations_qs), status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='remarks-with-counts')
    def remarks_with_counts(self, request):
        """
        Return ALL active remarks from masters_remark with their filtered counts.
        Uses RAW SQL for maximum performance + 5-minute caching.
        Endpoint: /api/candidates/remarks-with-counts/
        """
        try:
            from django.core.cache import cache
            from django.db import connection
            import hashlib
            import time
            
            start_time = time.time()
            
            # Get filters from query params
            from_date = request.query_params.get('from_date', '')
            to_date = request.query_params.get('to_date', '')
            client = request.query_params.get('client', '')
            executive = request.query_params.get('executive', '')
            state = request.query_params.get('state', '')
            city = request.query_params.get('city', '')
            
            # Create cache key based on filters
            filter_str = f"{from_date}_{to_date}_{client}_{executive}_{state}_{city}"
            cache_key = f"remarks_counts_{hashlib.md5(filter_str.encode()).hexdigest()}"
            
            logger.info(f"[CACHE] Checking cache for key: {cache_key}")
            
            # Try to get from cache
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                cache_time = time.time() - start_time
                logger.info(f"[CACHE HIT] Returned cached data in {cache_time:.3f}s")
                cached_data['cached'] = True
                cached_data['cache_time'] = f"{cache_time:.3f}s"
                return Response(cached_data, status=status.HTTP_200_OK)
            
            logger.info(f"[CACHE MISS] Computing fresh data...")
            
            
            # Check if any filters are applied
            has_filters = any([from_date, to_date, client, executive, state, city])
            
            # If no filters applied -> return all remarks with count = 0
            if not has_filters:
                all_remarks = Remark.objects.filter(status='Active').order_by('name')
                remarks_data = []
                for idx, remark in enumerate(all_remarks, 1):
                    remarks_data.append({
                        'sno': idx,
                        'remarks': remark.name,
                        'total_count': 0,
                        'filtered_count': 0
                    })
                
                return Response({
                    "results": remarks_data,
                    "count": len(remarks_data),
                    "message": f"Showing all {len(remarks_data)} active remarks with no filters applied."
                }, status=status.HTTP_200_OK)
            
            # Build RAW SQL query for maximum performance
            sql_params = []
            where_clauses = ["cj.remarks IS NOT NULL", "cj.remarks != ''"]
            
            # Apply date filters (optimized for index usage)
            # Use range comparison instead of DATE() function to allow index usage
            if from_date:
                where_clauses.append("cj.updated_at >= %s")
                sql_params.append(f"{from_date} 00:00:00")
            if to_date:
                where_clauses.append("cj.updated_at <= %s")
                sql_params.append(f"{to_date} 23:59:59")
            
            # Apply client filter
            if client and client.strip().lower() not in ["", "all", "all clients"]:
                where_clauses.append("cj.client_name LIKE %s")
                sql_params.append(f"%{client.strip()}%")
            
            # Apply executive filter (requires JOIN)
            if executive and executive.strip().lower() not in ["", "all", "all executives"]:
                where_clauses.append("c.executive_name LIKE %s")
                sql_params.append(f"%{executive.strip()}%")
            
            # Apply state filter
            if state and state.strip().lower() not in ["", "all", "all states"]:
                where_clauses.append("(c.city LIKE %s OR c.state LIKE %s)")
                sql_params.append(f"%{state.strip()}%")
                sql_params.append(f"%{state.strip()}%")
            
            # Apply city filter
            if city and city.strip().lower() not in ["", "all", "all cities"]:
                where_clauses.append("c.city LIKE %s")
                sql_params.append(f"%{city.strip()}%")
            
            where_sql = " AND ".join(where_clauses)
            
            # RAW SQL query - much faster than ORM
            sql = f"""
                SELECT 
                    cj.remarks,
                    COUNT(*) as total_count
                FROM candidate_clientjob cj
                INNER JOIN candidate_candidate c ON cj.candidate_id = c.id
                WHERE {where_sql}
                GROUP BY cj.remarks
                ORDER BY total_count DESC
            """
            
            query_start = time.time()
            with connection.cursor() as cursor:
                cursor.execute(sql, sql_params)
                filtered_results = cursor.fetchall()
            query_time = time.time() - query_start
            
            logger.info(f"[SQL] Query executed in {query_time:.3f}s, found {len(filtered_results)} remarks")
            
            # Convert to dict for lookup
            filtered_counts = {row[0]: row[1] for row in filtered_results}
            
            # Get all active remarks from Masters
            from Masters.models import Remark
            all_remarks = list(Remark.objects.filter(status='Active').values_list('name', flat=True).order_by('name'))
            
            # Combine all remarks with their counts
            remarks_data = []
            for remark_name in all_remarks:
                count = filtered_counts.get(remark_name, 0)
                remarks_data.append({
                    'sno': 0,  # Will be set after sorting
                    'remarks': remark_name,
                    'total_count': count,
                    'filtered_count': count
                })
            
            # Sort by count (descending)
            remarks_data.sort(key=lambda x: x['total_count'], reverse=True)
            
            # Re-number after sorting
            for idx, item in enumerate(remarks_data, 1):
                item['sno'] = idx
            
            
            total_time = time.time() - start_time
            
            response_data = {
                'results': remarks_data,
                'count': len(remarks_data),
                'filtered_count': len([r for r in remarks_data if r['total_count'] > 0]),
                'message': f'Showing all {len(remarks_data)} active remarks with filtered counts',
                'cached': False,
                'query_time': f"{query_time:.3f}s",
                'total_time': f"{total_time:.3f}s"
            }
            
            # Cache for 5 minutes (300 seconds)
            cache.set(cache_key, response_data, 300)
            logger.info(f"[CACHE SET] Cached data for key: {cache_key} (expires in 5 min)")
            logger.info(f"[TIMING] Total request time: {total_time:.3f}s (SQL: {query_time:.3f}s)")
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in remarks_with_counts: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({
                'error': 'Failed to fetch remarks with counts',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


   

    @action(detail=False, methods=['get'], url_path='all')
    def all_candidates(self, request):
        """
        Action to retrieve all candidates, regardless of employee.
        Supports pagination and 'all=true' parameter to get all records.
        Endpoint: /api/candidates/all/
        """
        try:
            # Get filters
            from_date = request.query_params.get('from_date')
            to_date = request.query_params.get('to_date')
            remark = request.query_params.get('remark')
            client = request.query_params.get('client')
            state = request.query_params.get('state')
            city = request.query_params.get('city')
            executive_filter = request.query_params.get('executive', None)
            search_term = request.query_params.get('search', '').strip()
            include_history_param = request.query_params.get('include_history', None)
            include_history = True
            if include_history_param is not None:
                val = str(include_history_param).strip().lower()
                if val in ('0', 'false', 'no'):
                    include_history = False
                elif val in ('1', 'true', 'yes'):
                    include_history = True
            
            # OPTIMIZATION: Use subquery to filter ClientJobs first, then get candidate IDs
            # This avoids expensive joins and distinct() on the main query
            from django.db.models import Q, Exists, OuterRef
            from .models import ClientJob
            
            # Build ClientJob filters (optimized for index usage)
            client_job_filters = Q()
            if from_date:
                try:
                    from datetime import datetime
                    from_datetime = datetime.strptime(from_date, '%Y-%m-%d')
                    # Use datetime comparison instead of __date lookup for index usage
                    client_job_filters &= Q(updated_at__gte=from_datetime)
                except ValueError:
                    logger.warning(f"Invalid from_date format: {from_date}")
            
            if to_date:
                try:
                    from datetime import datetime
                    to_datetime = datetime.strptime(to_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
                    # Use datetime comparison instead of __date lookup for index usage
                    client_job_filters &= Q(updated_at__lte=to_datetime)
                except ValueError:
                    logger.warning(f"Invalid to_date format: {to_date}")
            
            if remark:
                client_job_filters &= Q(remarks=remark)
            # Optional attend filter (1 or 0)
            attend_param = request.query_params.get('attend')
            if attend_param is not None:
                val = str(attend_param).strip().lower()
                if val in ('1', 'true', 'yes'):
                    client_job_filters &= Q(attend=1)
                elif val in ('0', 'false', 'no'):
                    client_job_filters &= Q(attend=0)

            # Optional profile_submission filter (1 or 0)
            profile_submission_param = request.query_params.get('profile_submission')
            if profile_submission_param is not None:
                ps_val = str(profile_submission_param).strip().lower()
                if ps_val in ('1', 'true', 'yes'):
                    client_job_filters &= Q(profile_submission=1)
                elif ps_val in ('0', 'false', 'no'):
                    client_job_filters &= Q(profile_submission=0)

            # Optional transfer_status filter ('Active' or 'Inactive')
            transfer_status_param = request.query_params.get('transfer_status')
            if transfer_status_param is not None:
                ts_val = str(transfer_status_param).strip()
                if ts_val:
                    # Support CSV like Active,Inactive if ever needed
                    if ',' in ts_val:
                        statuses = [s.strip() for s in ts_val.split(',') if s.strip()]
                        if statuses:
                            client_job_filters &= Q(transfer_status__in=statuses)
                    else:
                        client_job_filters &= Q(transfer_status__iexact=ts_val)

            # Optional exclude_remarks for 'others' drilldown (CSV list)
            exclude_remarks_param = request.query_params.get('exclude_remarks')
            if exclude_remarks_param:
                try:
                    values = [v.strip() for v in exclude_remarks_param.split(',') if v.strip()]
                    if values:
                        excl_q = Q()
                        for v in values:
                            excl_q |= Q(remarks__iexact=v)
                        client_job_filters &= ~excl_q
                except Exception:
                    pass
                
            if client and client.strip().lower() not in ["", "all", "all clients"]:
                client_trimmed = client.strip()
                client_job_filters &= Q(client_name__icontains=client_trimmed)
            
            # Build Candidate filters
            candidate_filters = Q()
            
            if executive_filter and executive_filter.strip().lower() not in ["", "all", "all executives"]:
                executive_trimmed = executive_filter.strip()
                candidate_filters &= Q(executive_name__icontains=executive_trimmed)
            
            if state and state.strip().lower() not in ["", "all", "all states"]:
                state_trimmed = state.strip()
                candidate_filters &= (Q(city__icontains=state_trimmed) | Q(state__icontains=state_trimmed))
            
            if city and city.strip().lower() not in ["", "all", "all cities"]:
                city_trimmed = city.strip()
                candidate_filters &= Q(city__icontains=city_trimmed)
            
            # Use optimized approach: filter ClientJob first, get IDs, then filter Candidate
            # This is faster than Exists for large datasets with complex filters
            import time
            start_time = time.time()
            
            # Step 1: Get candidate IDs from filtered ClientJobs (uses indexes)
            logger.info(f"[DATABANK] Filtering ClientJobs with filters: {client_job_filters}")
            matching_candidate_ids = list(ClientJob.objects.filter(
                client_job_filters
            ).values_list('candidate_id', flat=True).distinct())
            
            filter_time = time.time() - start_time
            logger.info(f"[DATABANK] Found {len(matching_candidate_ids)} candidate IDs in {filter_time:.3f}s")
            
            # Augment: If a remark filter is provided, also include candidates from status history
            # This supports drill-down from aggregated reports that are based on CandidateStatusHistory
            try:
                if remark and include_history:
                    history_filters = Q(remarks__iexact=remark)
                    # Apply client filter to history using icontains to handle spacing/case differences
                    if client and client.strip().lower() not in ["", "all", "all clients"]:
                        client_trimmed = client.strip()
                        history_filters &= Q(client_name__icontains=client_trimmed)
                    # Apply date range to change_date (history business date)
                    if from_date:
                        try:
                            from datetime import datetime
                            from_date_obj = datetime.strptime(from_date, '%Y-%m-%d').date()
                            history_filters &= Q(change_date__gte=from_date_obj)
                        except ValueError:
                            logger.warning(f"Invalid from_date format for history: {from_date}")
                    if to_date:
                        try:
                            from datetime import datetime
                            to_date_obj = datetime.strptime(to_date, '%Y-%m-%d').date()
                            history_filters &= Q(change_date__lte=to_date_obj)
                        except ValueError:
                            logger.warning(f"Invalid to_date format for history: {to_date}")

                    history_ids = list(CandidateStatusHistory.objects.filter(history_filters)
                                       .values_list('candidate_id', flat=True)
                                       .distinct())
                    if history_ids:
                        before = len(matching_candidate_ids)
                        matching_candidate_ids = list(set(matching_candidate_ids) | set(history_ids))
                        logger.info(
                            f"[DATABANK] Augmented candidate IDs from history: +{len(matching_candidate_ids) - before} (history={len(history_ids)}), total={len(matching_candidate_ids)}"
                        )
            except Exception as hx:
                logger.warning(f"History augmentation skipped due to error: {str(hx)}")
            
            # Step 2: Filter candidates by ID (fast - uses PRIMARY KEY)
            if matching_candidate_ids:
                all_candidates = self.get_queryset().filter(
                    candidate_filters,
                    id__in=matching_candidate_ids
                )
            else:
                # No matching jobs, return empty queryset
                all_candidates = self.get_queryset().none()
            
            # Add search filter - search across multiple fields
            # This is done AFTER the initial filters to search across all remaining candidates
            if search_term:
                # First, search for employees whose name matches the search term
                try:
                    from empreg.models import Employee
                    matching_employees = list(Employee.objects.filter(
                        Q(firstName__icontains=search_term) |
                        Q(lastName__icontains=search_term) |
                        Q(employeeCode__icontains=search_term)
                    ).values_list('employeeCode', flat=True))
                except Exception as emp_error:
                    logger.warning(f"Error searching employees: {str(emp_error)}")
                    matching_employees = []
                
                # Search in candidate fields OR client job fields OR employee names
                candidate_search = (
                    Q(candidate_name__icontains=search_term) |
                    Q(profile_number__icontains=search_term) |
                    Q(email__icontains=search_term) |
                    Q(mobile1__icontains=search_term) |
                    Q(mobile2__icontains=search_term) |
                    Q(city__icontains=search_term) |
                    Q(state__icontains=search_term) |
                    Q(executive_name__icontains=search_term)
                )
                
                # Add employee name search - find candidates assigned to matching employees
                if matching_employees:
                    candidate_search |= Q(executive_name__in=matching_employees)
                
                # For client job search, use Exists subquery
                search_jobs_subquery = ClientJob.objects.filter(
                    Q(client_name__icontains=search_term) |
                    Q(designation__icontains=search_term) |
                    Q(remarks__icontains=search_term),
                    candidate_id=OuterRef('pk')
                )
                
                # Combine: candidate matches OR has matching client jobs
                all_candidates = all_candidates.filter(
                    candidate_search | Q(Exists(search_jobs_subquery))
                )
            
            # Add prefetch_related BEFORE pagination to optimize query
            all_candidates = all_candidates.prefetch_related('client_jobs').order_by('-updated_at')
            
            
            # Support both offset/limit and page-based pagination
            offset = int(request.query_params.get('offset', 0))
            limit = int(request.query_params.get('limit', 100))
            page = int(request.query_params.get('page', 0))

            # Check if user wants all data without pagination
            get_all = request.query_params.get('all', '').lower() == 'true'

            if get_all:
                # Use proper serializer to get complete candidate data
                from .serializers import CandidateSerializer
                
                
                # Use the full CandidateSerializer for complete data including nested relationships
                serializer = CandidateSerializer(all_candidates, many=True)
                candidates_data = serializer.data
                
                
                return Response({
                    'results': candidates_data,
                    'count': len(candidates_data),
                    'message': 'All candidates retrieved successfully'
                }, status=status.HTTP_200_OK)
            else:
                # Use pagination for regular requests
                paginator = self.pagination_class()
                page = paginator.paginate_queryset(all_candidates, request)
                if page is not None:
                    # Page already has prefetch_related applied from the queryset above
                    # No need for additional query
                    
                    # Use full CandidateSerializer for complete data
                    from .serializers import CandidateSerializer
                    serializer = CandidateSerializer(page, many=True)
                    
                    # CandidateSerializer already includes executive_display field
                    # No post-processing needed
                    
                    total_time = time.time() - start_time
                    logger.info(f"[DATABANK] Total query time: {total_time:.3f}s")
                    
                    # Standard DRF paginated response: {count,next,previous,results}
                    return paginator.get_paginated_response(serializer.data)
                
                # Fallback if pagination fails
                from .serializers import CandidateSerializer
                serializer = CandidateSerializer(all_candidates[:100], many=True)  # Limit to 100
                return Response({
                    'results': serializer.data,
                    'count': all_candidates.count(),
                    'message': 'Candidates retrieved with limit'
                }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in all_candidates: {str(e)}")
            return Response({
                'error': 'Failed to fetch all candidates',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='job-rows')
    def job_rows(self, request):
        """
        Return flattened ClientJob rows matching filters.
        Endpoint: /api/candidates/job-rows/
        Query params:
          - from_date (YYYY-MM-DD)
          - to_date (YYYY-MM-DD)
          - date_field: updated_at | profile_submission_date (default: updated_at)
          - client (icontains)
          - state (icontains on candidate.city or candidate.state)
          - city (icontains)
          - executive (icontains on candidate.executive_name)
          - profile_submission (1/0)
          - attend (1/0)
          - transfer_status (Active/Inactive or CSV)
          - all=true to return all without pagination
        """
        try:
            from django.db.models import Q
            from .models import ClientJob, Candidate

            from_date = request.query_params.get('from_date')
            to_date = request.query_params.get('to_date')
            date_field = (request.query_params.get('date_field') or 'updated_at').strip()
            client = request.query_params.get('client')
            state = request.query_params.get('state')
            city = request.query_params.get('city')
            executive = request.query_params.get('executive')
            owner_by = (request.query_params.get('owner_by') or '').strip().lower()  # 'current' | 'previous' | '' (default)
            remark = request.query_params.get('remark')
            attend_param = request.query_params.get('attend')
            profile_submission_param = request.query_params.get('profile_submission')
            transfer_status_param = request.query_params.get('transfer_status')

            job_q = Q()
            if from_date:
                try:
                    from datetime import datetime
                    if date_field == 'profile_submission_date':
                        job_q &= Q(profile_submission_date__gte=datetime.strptime(from_date, '%Y-%m-%d').date())
                    else:
                        job_q &= Q(updated_at__gte=datetime.strptime(from_date, '%Y-%m-%d'))
                except ValueError:
                    logger.warning(f"Invalid from_date format: {from_date}")
            if to_date:
                try:
                    from datetime import datetime
                    if date_field == 'profile_submission_date':
                        job_q &= Q(profile_submission_date__lte=datetime.strptime(to_date, '%Y-%m-%d').date())
                    else:
                        to_dt = datetime.strptime(to_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
                        job_q &= Q(updated_at__lte=to_dt)
                except ValueError:
                    logger.warning(f"Invalid to_date format: {to_date}")

            if attend_param is not None:
                val = str(attend_param).strip().lower()
                if val in ('1', 'true', 'yes'):
                    job_q &= Q(attend=True)
                elif val in ('0', 'false', 'no'):
                    job_q &= Q(attend=False)

            if profile_submission_param is not None:
                ps_val = str(profile_submission_param).strip().lower()
                if ps_val in ('1', 'true', 'yes'):
                    job_q &= Q(profile_submission=1)
                elif ps_val in ('0', 'false', 'no'):
                    job_q &= Q(profile_submission=0)

            if transfer_status_param is not None:
                ts_val = str(transfer_status_param).strip()
                if ts_val:
                    if ',' in ts_val:
                        statuses = [s.strip() for s in ts_val.split(',') if s.strip()]
                        if statuses:
                            job_q &= Q(transfer_status__in=statuses)
                    else:
                        job_q &= Q(transfer_status__iexact=ts_val)

            if client and client.strip().lower() not in ["", "all", "all clients"]:
                job_q &= Q(client_name__icontains=client.strip())

            if remark:
                job_q &= Q(remarks__iexact=remark.strip())

            # Executive filter: allow different owner scopes
            cand_q = Q()
            exec_val = (executive or '').strip()
            exec_filter_applied = False
            if exec_val and exec_val.lower() not in ["", "all", "all executives"]:
                if owner_by == 'previous':
                    # Attribute to previous owner -> match assigned_from on ClientJob
                    job_q &= Q(assigned_from__iexact=exec_val)
                    exec_filter_applied = True
                elif owner_by == 'current':
                    # Current owner -> assign_to OR candidate.executive_name
                    job_q &= (Q(assign_to__iexact=exec_val) | Q(candidate__executive_name__iexact=exec_val))
                    exec_filter_applied = True
                # else fallback to candidate.executive_name icontains (legacy behavior)
                
            if (not exec_filter_applied) and exec_val and exec_val.lower() not in ["", "all", "all executives"]:
                cand_q &= Q(executive_name__icontains=exec_val)
            if state and state.strip().lower() not in ["", "all", "all states"]:
                st = state.strip()
                cand_q &= (Q(state__icontains=st) | Q(city__icontains=st))
            if city and city.strip().lower() not in ["", "all", "all cities"]:
                cand_q &= Q(city__icontains=city.strip())

            qs = ClientJob.objects.select_related('candidate').prefetch_related('assignment_history').filter(job_q)
            if cand_q.children:
                qs = qs.filter(candidate__in=Candidate.objects.filter(cand_q).values('id'))

            get_all = request.query_params.get('all', '').lower() == 'true'
            offset = int(request.query_params.get('offset', 0))
            limit = int(request.query_params.get('limit', 100))

            total_count = qs.count()
            if not get_all:
                jobs = qs.order_by('-updated_at')[offset:offset+limit]
            else:
                jobs = qs.order_by('-updated_at')

            results = []
            for j in jobs:
                c = j.candidate
                # Build previous owners list from assignment history (unique, preserve order)
                prev_owners = []
                try:
                    hist = list(getattr(j, 'assignment_history').all())
                    prev_owners = [h.previous_owner for h in hist if getattr(h, 'previous_owner', None)]
                    seen = set()
                    prev_owners = [x for x in prev_owners if not (x in seen or seen.add(x))]
                except Exception:
                    prev_owners = []

                results.append({
                    'job_id': j.id,
                    'candidate_id': c.id,
                    'candidate_name': getattr(c, 'candidate_name', None),
                    'client_name': j.client_name,
                    'designation': j.designation,
                    'transfer_status': j.transfer_status,
                    'profile_submission': j.profile_submission,
                    'profile_submission_date': j.profile_submission_date,
                    'attend': getattr(j, 'attend', None),
                    'remarks': j.remarks or j.profilestatus,
                    'updated_at': j.updated_at,
                    'city': getattr(c, 'city', None),
                    'state': getattr(c, 'state', None),
                    'executive_name': getattr(c, 'executive_name', None),
                    # Assignment/transfer fields for Transfer tab UI
                    'employee_id': j.employee_id,
                    'assign_to': j.assign_to,
                    'assigned_from': j.assigned_from,
                    'transfer_date': j.transfer_date,
                    'previous_owners': prev_owners,
                })

            # Resolve previous owner and assigned codes to names from Employee table
            try:
                from empreg.models import Employee
                all_codes = set()
                for r in results:
                    # Collect previous owners
                    for code in (r.get('previous_owners') or []):
                        if code:
                            all_codes.add(str(code))
                    # Collect assigned_from and assign_to codes
                    if r.get('assigned_from'):
                        all_codes.add(str(r.get('assigned_from')))
                    if r.get('assign_to'):
                        all_codes.add(str(r.get('assign_to')))

                code_to_name = {}
                if all_codes:
                    emp_rows = Employee.objects.filter(employeeCode__in=list(all_codes), del_state=0).values('employeeCode', 'firstName', 'lastName')
                    for emp in emp_rows:
                        full_name = f"{emp.get('firstName') or ''} {emp.get('lastName') or ''}".strip()
                        code_to_name[str(emp['employeeCode'])] = full_name or str(emp['employeeCode'])

                for r in results:
                    prev = r.get('previous_owners') or []
                    r['previous_owner_names'] = [code_to_name.get(str(c), str(c)) for c in prev]
                    # Map assigned_from and assign_to names
                    r['assigned_from_name'] = code_to_name.get(str(r.get('assigned_from'))) if r.get('assigned_from') else None
                    r['assign_to_name'] = code_to_name.get(str(r.get('assign_to'))) if r.get('assign_to') else None
            except Exception:
                # Graceful fallback to codes if lookup fails
                for r in results:
                    if 'previous_owner_names' not in r:
                        r['previous_owner_names'] = r.get('previous_owners') or []
                    if 'assigned_from_name' not in r:
                        r['assigned_from_name'] = r.get('assigned_from')
                    if 'assign_to_name' not in r:
                        r['assign_to_name'] = r.get('assign_to')

            return Response({
                'count': total_count,
                'results': results
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error in job_rows: {str(e)}")
            return Response({
                'error': 'Failed to fetch job rows',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='my-candidates')
    def my_candidates(self, request):
        """
        Return candidates created by the logged-in employee.
        Filters: created_by = request.user.employee.employeeCode
        Endpoint: /api/candidates/my-candidates/
        """
        try:
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return Response({
                    'error': 'Authentication required'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Debug: Log the request details
            
            # Get the employee code for the logged-in user using robust search
            try:
                from empreg.models import Employee
                
                username = request.user.username
                employee = Employee.objects.filter(
                    Q(user=request.user) | 
                    Q(employeeCode=username) | 
                    Q(phone1=username) | 
                    Q(phone2=username),
                    del_state=0
                ).select_related().first()
                
                if not employee:
                    return Response({
                        'error': 'Employee profile not found for this user'
                    }, status=status.HTTP_404_NOT_FOUND)
                
                employee_code = employee.employeeCode
                
                if not employee_code:
                    return Response({
                        'error': 'Employee code not set for this user'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                return Response({
                    'error': 'Employee profile lookup failed'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Filter candidates by created_by field (without del_state to avoid DB issues)
            candidates = Candidate.objects.filter(
                created_by=employee_code
            ).only(
                'id', 'profile_number', 'executive_name', 'candidate_name', 
                'mobile1', 'mobile2', 'email', 'city', 'created_by', 'created_at', 'updated_at'
            ).order_by('-updated_at')
            
            
            # Apply date filters if provided
            from_date = request.query_params.get('from_date')
            to_date = request.query_params.get('to_date')
            
            if from_date:
                try:
                    from datetime import datetime
                    from_date_obj = datetime.strptime(from_date, '%Y-%m-%d').date()
                    candidates = candidates.filter(updated_at__date__gte=from_date_obj)
                except ValueError:
                    pass  # Invalid date format, skip filter
            if to_date:
                try:
                    from datetime import datetime
                    to_date_obj = datetime.strptime(to_date, '%Y-%m-%d').date()
                    candidates = candidates.filter(updated_at__date__lte=to_date_obj)
                except ValueError:
                    pass  # Invalid date format, skip filter
            
            # Check if user wants all data (no pagination)
            get_all = request.query_params.get('all', '').lower() == 'true'
            
            if get_all:
                # Return all candidates without pagination
                total_count = candidates.count()
                candidates_page = candidates
                page = 1
                page_size = total_count
            else:
                # Add pagination to prevent timeout with large datasets
                page_size = int(request.query_params.get('page_size', 1000))  # Default 1000 per page
                page = int(request.query_params.get('page', 1))
                
                # Limit page_size to prevent abuse (allow up to 5000 records)
                page_size = min(page_size, 5000)  # Max 5000 records per request
                
                start_index = (page - 1) * page_size
                end_index = start_index + page_size
                
                total_count = candidates.count()
                candidates_page = candidates[start_index:end_index]
                
            
            # Get all client jobs for these candidates in one query to avoid N+1 problem
            candidate_ids = [c.id for c in candidates_page]
            client_jobs_dict = {}
            
            if candidate_ids:
                client_jobs = ClientJob.objects.filter(
                    candidate_id__in=candidate_ids
                ).values(
                    'candidate_id', 'id', 'client_name', 'designation', 'remarks', 'created_at', 'updated_at'
                ).order_by('-updated_at')
                
                # Group client jobs by candidate_id
                for job in client_jobs:
                    candidate_id = job['candidate_id']
                    if candidate_id not in client_jobs_dict:
                        client_jobs_dict[candidate_id] = []
                    client_jobs_dict[candidate_id].append(job)
            
            
            # Serialize the data manually to avoid del_state field issues
            candidate_data = []
            for candidate in candidates_page:
                candidate_dict = {
                    'id': candidate.id,
                    'profile_number': candidate.profile_number,
                    'executive_name': candidate.executive_name,
                    'candidate_name': candidate.candidate_name,
                    'mobile1': candidate.mobile1,
                    'mobile2': candidate.mobile2,
                    'email': candidate.email,
                    'city': candidate.city,
                    'created_by': candidate.created_by,
                    'created_at': candidate.created_at,
                    'updated_at': candidate.updated_at,
                    'source': candidate.source,
                    'client_jobs': client_jobs_dict.get(candidate.id, [])
                }
                candidate_data.append(candidate_dict)
            
            
            # Prepare pagination info based on whether we're fetching all or using pagination
            if get_all:
                pagination_info = {
                    'page': 1,
                    'page_size': total_count,
                    'total_count': total_count,
                    'total_pages': 1,
                    'has_next': False,
                    'has_previous': False
                }
            else:
                pagination_info = {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size,
                    'has_next': end_index < total_count,
                    'has_previous': page > 1
                }
            
            response_data = {
                'results': candidate_data,
                'pagination': pagination_info
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to fetch candidates',
                'detail': str(e),
                'traceback': traceback.format_exc()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='my-candidates-dtr')
    def my_candidates_dtr(self, request):
        
        """
        Return candidates created by the logged-in employee for DTR reports.
        BMs (L3/bm): See branch candidates based on filter mode + own candidates.
        TLs (L2/tl): See their own + their team's candidates.
        Employees (L1): See only their own candidates.
        Endpoint: /api/candidates/my-candidates-dtr/
        """
        try:
            from empreg.models import Employee
            

            # Get employee profile using robust search
            try:
                username = request.user.username
                employee = Employee.objects.filter(
                    Q(user=request.user) | 
                    Q(employeeCode=username) | 
                    Q(phone1=username) | 
                    Q(phone2=username),
                    del_state=0
                ).select_related().first()
                
                if not employee:
                    return Response({"error": "Employee profile not found"}, status=status.HTTP_404_NOT_FOUND)
                
                employee_code = employee.employeeCode
                user_role = employee.level or 'L1'
                user_branch = employee.branch
                
                if not employee_code:
                    return Response({"error": "Employee code not set"}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({"error": "Employee profile lookup failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Get filter parameters for BM
            selected_employee = request.query_params.get('selectedEmployee')
            selected_tl = request.query_params.get('selectedTL')
            filter_mode = request.query_params.get('filterMode', 'self_only')  # Default to self_only

            # BM logic (L3/bm) - Enhanced filtering
            if user_role in ['L3', 'bm']:
                # Get all employees in BM's branch (including null branch for Coimbatore and Madurai)
                if user_branch and user_branch.upper() in ['COIMBATORE', 'MADURAI']:
                    # For Coimbatore and Madurai BM: include employees with branch='COIMBATORE'/'MADURAI' OR branch is null
                    branch_employees = Employee.objects.filter(
                        Q(branch__iexact=user_branch) | Q(branch__isnull=True),
                        del_state=0,
                        status='Active'
                    ).exclude(employeeCode__isnull=True)
                else:
                    # For other branches: only include employees with exact branch match
                    branch_employees = Employee.objects.filter(
                        branch=user_branch,
                        del_state=0,
                        status='Active'
                    ).exclude(employeeCode__isnull=True)
                branch_employee_codes = [emp.employeeCode for emp in branch_employees if emp.employeeCode]
                # Always include BM's own employeeCode
                if employee_code not in branch_employee_codes:
                    branch_employee_codes.append(employee_code)

                # Apply filters based on priority
                if selected_employee:
                    # Priority 1: Selected Employee - show only candidates currently owned by that employee
                    # executive_name stores employee code, not full name
                    candidates = Candidate.objects.filter(
                        executive_name=selected_employee
                    ).prefetch_related('client_jobs').order_by('-created_at')
                elif filter_mode == 'self_only':
                    # Priority 2: Self Only - show only BM's currently owned candidates
                    # executive_name stores employee code, not full name
                    candidates = Candidate.objects.filter(
                        executive_name=employee_code
                    ).prefetch_related('client_jobs').order_by('-created_at')
                elif filter_mode == 'all_branch':
                    # Priority 3: All Branch - show only candidates currently owned by branch employees
                    # executive_name stores employee code, not full name
                    candidates = Candidate.objects.filter(
                        executive_name__in=branch_employee_codes
                    ).prefetch_related('client_jobs').order_by('-created_at')
                elif filter_mode == 'tl_only' and selected_tl:
                    # Priority 4: TL Only - show candidates under selected TL
                    # Verify selected TL is active and in the same branch (including null for Coimbatore and Madurai)
                    if user_branch and user_branch.upper() in ['COIMBATORE', 'MADURAI']:
                        selected_tl_obj = Employee.objects.filter(
                            Q(branch__iexact=user_branch) | Q(branch__isnull=True),
                            employeeCode=selected_tl,
                            level='L2',
                            status='Active',
                            del_state=0
                        ).first()
                    else:
                        selected_tl_obj = Employee.objects.filter(
                            employeeCode=selected_tl,
                            branch=user_branch,
                            level='L2',
                            status='Active',
                            del_state=0
                        ).first()
                    
                    if selected_tl_obj:
                        # executive_name stores employee code, not full name
                        candidates = Candidate.objects.filter(
                            executive_name=selected_tl
                        ).prefetch_related('client_jobs').order_by('-created_at')
                    else:
                        # If TL is not valid, default to BM's currently owned candidates
                        candidates = Candidate.objects.filter(
                            executive_name=employee_code
                        ).prefetch_related('client_jobs').order_by('-created_at')
                elif filter_mode == 'tl_with_team' and selected_tl:
                    # Priority 5: TL + Team - show TL + their team candidates
                    # Verify selected TL is active and in the same branch (including null for Coimbatore and Madurai)
                    if user_branch and user_branch.upper() in ['COIMBATORE', 'MADURAI']:
                        selected_tl_obj = Employee.objects.filter(
                            Q(branch__iexact=user_branch) | Q(branch__isnull=True),
                            employeeCode=selected_tl,
                            level='L2',
                            status='Active',
                            del_state=0
                        ).first()
                    else:
                        selected_tl_obj = Employee.objects.filter(
                            employeeCode=selected_tl,
                            branch=user_branch,
                            level='L2',
                            status='Active',
                            del_state=0
                        ).first()
                    
                    if selected_tl_obj:
                        # Get team members reporting to this TL (same branch logic)
                        if user_branch and user_branch.upper() in ['COIMBATORE', 'MADURAI']:
                            tl_team_employees = Employee.objects.filter(
                                Q(branch__iexact=user_branch) | Q(branch__isnull=True),
                                reportingManager__in=[selected_tl],
                                status='Active',
                                del_state=0
                            )
                        else:
                            tl_team_employees = Employee.objects.filter(
                                reportingManager__in=[selected_tl],
                                branch=user_branch,
                                status='Active',
                                del_state=0
                            )
                        tl_team_codes = [selected_tl]  # Include TL themselves
                        tl_team_codes.extend([emp.employeeCode for emp in tl_team_employees if emp.employeeCode])
                        
                        # Get employee codes for executive_name matching
                        # executive_name stores employee code, not full name
                        tl_team_codes_list = [selected_tl]
                        tl_team_codes_list.extend([emp.employeeCode for emp in tl_team_employees if emp.employeeCode])
                        
                        candidates = Candidate.objects.filter(
                            executive_name__in=tl_team_codes_list
                        ).prefetch_related('client_jobs').order_by('-created_at')
                    else:
                        # If TL is not valid, default to BM's currently owned candidates
                        candidates = Candidate.objects.filter(
                            executive_name=employee_code
                        ).prefetch_related('client_jobs').order_by('-created_at')
                else:
                    # Default: BM's currently owned candidates only
                    # executive_name stores employee code, not full name
                    candidates = Candidate.objects.filter(
                        executive_name=employee_code
                    ).prefetch_related('client_jobs').order_by('-created_at')

            # TL logic (L2/tl) - Show only currently owned candidates by team
            elif user_role in ['L2', 'tl']:
                reporting_employees = Employee.objects.filter(
                    reportingManager__in=[employee_code, employee.firstName]
                )
                
                # Get employee codes of all team members for executive_name matching
                # executive_name stores employee code, not full name
                team_employee_codes = [employee_code]
                team_employee_codes.extend([emp.employeeCode for emp in reporting_employees if emp.employeeCode])

                # Show only candidates currently owned by TL or team members (executive_name)
                # Once assigned outside the team, they won't see it
                candidates = Candidate.objects.filter(
                    executive_name__in=team_employee_codes
                ).prefetch_related('client_jobs').order_by('-created_at')

            # Regular employee logic (L1) - Show only currently owned candidates
            else:
                # Show only candidates currently owned by this employee
                # executive_name stores employee code (e.g., "Emp/00101"), not full name
                # Once assigned to someone else, original creator won't see it
                candidates = Candidate.objects.filter(
                    executive_name=employee_code
                ).prefetch_related('client_jobs').order_by('-created_at')

            # Apply optional date filters - support both created_at and updated_at
            from_date = request.query_params.get('from_date')
            to_date = request.query_params.get('to_date')
            date_field = request.query_params.get('date_field', 'updated_at')  # Default to updated_at for T-DTR

            if from_date:
                try:
                    from datetime import datetime
                    from_date_obj = datetime.strptime(from_date, '%Y-%m-%d').date()
                    
                    # F-DTR: Filter by candidate created_at (when candidate was first added)
                    if date_field == 'created_at':
                        candidates = candidates.filter(created_at__date__gte=from_date_obj)
                    # T-DTR: Filter by client job updated_at (when feedback was updated) - DEFAULT
                    else:
                        candidates = candidates.filter(client_jobs__updated_at__date__gte=from_date_obj).distinct()
                except ValueError:
                    pass  # Invalid date format, skip filter
                    
            if to_date:
                try:
                    from datetime import datetime
                    to_date_obj = datetime.strptime(to_date, '%Y-%m-%d').date()
                    
                    # F-DTR: Filter by candidate created_at (when candidate was first added)
                    if date_field == 'created_at':
                        candidates = candidates.filter(created_at__date__lte=to_date_obj)
                    # T-DTR: Filter by client job updated_at (when feedback was updated) - DEFAULT
                    else:
                        candidates = candidates.filter(client_jobs__updated_at__date__lte=to_date_obj).distinct()
                except ValueError:
                    pass  # Invalid date format, skip filter

            # Add pagination for better performance
            page_size = int(request.query_params.get('page_size', 1000))  # Default 1000
            page = int(request.query_params.get('page', 1))
            
            # Limit page size to prevent abuse
            page_size = min(page_size, 5000)  # Max 5000 records
            
            # Get total count before pagination
            total_count = candidates.count()
            
            # Apply pagination
            start_index = (page - 1) * page_size
            candidates = candidates[start_index:start_index + page_size]

            # Optimize: Pre-fetch all employees to avoid N+1 queries
            all_employees = {emp.employeeCode: emp for emp in Employee.objects.all()}
            
            # Helper function to format date to dd-mm-yyyy
            def format_date_to_ddmmyyyy(date_value):
                """Format date to dd-mm-yyyy format"""
                if not date_value:
                    return None
                try:
                    import datetime as dt
                    
                    # If it's already a date or datetime object
                    if isinstance(date_value, (dt.date, dt.datetime)):
                        return date_value.strftime('%d-%m-%Y')
                    
                    # If it's a string, try to parse it
                    if isinstance(date_value, str):
                        # Try ISO format first
                        try:
                            date_obj = dt.datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                            return date_obj.strftime('%d-%m-%Y')
                        except:
                            # Try parsing as date string (YYYY-MM-DD)
                            try:
                                date_obj = dt.datetime.strptime(date_value, '%Y-%m-%d')
                                return date_obj.strftime('%d-%m-%Y')
                            except:
                                # Return as-is if already in dd-mm-yyyy format
                                if len(date_value) == 10 and date_value[2] == '-' and date_value[5] == '-':
                                    return date_value
                                return None
                    
                    return None
                except Exception as e:
                    logger.warning(f"Error formatting date {date_value}: {e}")
                    return None

            # Optimize: Get all client jobs in one query
            candidate_ids = [c.id for c in candidates]
            all_client_jobs = {}
            if candidate_ids:
                from candidate.models import ClientJob
                client_jobs_query = ClientJob.objects.filter(
                    candidate_id__in=candidate_ids
                ).values(
                    'candidate_id', 'id', 'client_name', 'designation', 'remarks', 
                    'created_at', 'updated_at', 'created_by', 'updated_by',
                    'current_ctc', 'expected_ctc', 'next_follow_up_date', 
                    'expected_joining_date', 'interview_date'
                ).order_by('candidate_id', '-updated_at')
                
                for job in client_jobs_query:
                    try:
                        candidate_id = job['candidate_id']
                        if candidate_id not in all_client_jobs:
                            all_client_jobs[candidate_id] = []
                        
                        # Store raw values for comparison
                        job['updated_at_raw'] = job.get('updated_at')
                        job['created_at_raw'] = job.get('created_at')
                        
                        # Format dates in job before appending
                        job['next_follow_up_date'] = format_date_to_ddmmyyyy(job.get('next_follow_up_date'))
                        job['expected_joining_date'] = format_date_to_ddmmyyyy(job.get('expected_joining_date'))
                        job['interview_date'] = format_date_to_ddmmyyyy(job.get('interview_date'))
                        # Also add interview_fixed_date as alias for frontend compatibility
                        job['interview_fixed_date'] = job['interview_date']
                        # Format created_at and updated_at for client jobs
                        job['created_at'] = format_date_to_ddmmyyyy(job['created_at_raw'])
                        job['updated_at'] = format_date_to_ddmmyyyy(job['updated_at_raw'])
                        
                        all_client_jobs[candidate_id].append(job)
                    except Exception as e:
                        logger.error(f"Error processing client job {job.get('id')}: {e}")
                        # Continue processing other jobs even if one fails
                        continue

            # Serialize manually with optimized data
            candidate_data = []
            for candidate in candidates:
                client_jobs = all_client_jobs.get(candidate.id, [])
                most_recent_job = client_jobs[0] if client_jobs else None

                # Feedback history with cached employee lookups
                feedback_history = []
                if getattr(candidate, 'feedback', None):
                    feedback_author = candidate.updated_by or candidate.created_by or 'Unknown'
                    employee_obj = all_employees.get(feedback_author)
                    feedback_author_name = f"{employee_obj.firstName} ({employee_obj.employeeCode})" if employee_obj else feedback_author
                    feedback_history.append({
                        'feedback': candidate.feedback,
                        'author': feedback_author_name,
                        'date': format_date_to_ddmmyyyy(candidate.updated_at) or format_date_to_ddmmyyyy(candidate.created_at),
                        'client_name': most_recent_job['client_name'] if most_recent_job else '',
                        'designation': most_recent_job['designation'] if most_recent_job else ''
                    })
                # for job in client_jobs:
                #     if job['feedback']:
                #         feedback_author = job['updated_by'] or job['created_by'] or 'Unknown'
                        
                #         # Use cached employee lookup
                #         employee_obj = all_employees.get(feedback_author)
                #         feedback_author_name = f"{employee_obj.firstName} ({employee_obj.employeeCode})" if employee_obj else feedback_author

                #         feedback_history.append({
                #             'feedback': job['feedback'],
                #             'author': feedback_author_name,
                #             'date': job['updated_at'] or job['created_at'],
                #             'client_name': job['client_name'],
                #             'designation': job['designation']
                #         })

                # Executive name lookup with cached data
                executive_name = candidate.created_by
                executive_display = candidate.created_by
                employee_obj = all_employees.get(candidate.created_by)
                
                if employee_obj:
                    executive_name = employee_obj.employeeCode
                    # Create executive display: "FirstName LastName" (name only, no code)
                    full_name_parts = []
                    if employee_obj.firstName:
                        full_name_parts.append(employee_obj.firstName)
                    if employee_obj.lastName:
                        full_name_parts.append(employee_obj.lastName)
                    
                    if full_name_parts:
                        executive_display = ' '.join(full_name_parts)
                    else:
                        executive_display = employee_obj.employeeCode
                    

                # Calculate latest updated_at from both Candidate and ClientJobs
                # Use raw values for comparison (no extra queries needed)
                latest_updated_raw = candidate.updated_at
                latest_updated_by = candidate.updated_by
                latest_source = 'candidate'
                
                # Compare with client jobs using already-fetched raw values
                for job_dict in client_jobs:
                    job_updated_raw = job_dict.get('updated_at_raw')
                    if job_updated_raw:
                        if not latest_updated_raw or job_updated_raw > latest_updated_raw:
                            latest_updated_raw = job_updated_raw
                            latest_updated_by = job_dict.get('updated_by') or job_dict.get('created_by')
                            latest_source = 'clientjob'

                candidate_dict = {
                    'id': candidate.id,
                    'profile_number': candidate.profile_number,
                    'executive_name': executive_name,
                    'executive_display': executive_display,
                    'candidate_name': candidate.candidate_name,
                    'mobile1': candidate.mobile1,
                    'mobile2': candidate.mobile2,
                    'email': candidate.email,
                    'gender': candidate.gender,
                    'dob': format_date_to_ddmmyyyy(candidate.dob),
                    'country': candidate.country,
                    'state': candidate.state,
                    'city': candidate.city,
                    'pincode': candidate.pincode,
                    'education': candidate.education,
                    'experience': candidate.experience,
                    'source': candidate.source,
                    'communication': candidate.communication,
                    'entry_date': most_recent_job['updated_at'] if most_recent_job else None,
                    'client_name': most_recent_job['client_name'] if most_recent_job else '',
                    'designation': most_recent_job['designation'] if most_recent_job else '',
                    'remarks': most_recent_job['remarks'] if most_recent_job else '',
                    'feedback_history': feedback_history,
                    # Candidate timestamps
                    'candidate_created_at': format_date_to_ddmmyyyy(candidate.created_at),
                    'candidate_updated_at': format_date_to_ddmmyyyy(candidate.updated_at),
                    # Latest update across both Candidate and ClientJobs
                    'latest_updated_at': format_date_to_ddmmyyyy(latest_updated_raw),
                    'latest_updated_by': latest_updated_by,
                    'latest_update_source': latest_source,
                    # Legacy fields for backward compatibility
                    'created_at': format_date_to_ddmmyyyy(candidate.created_at),
                    'updated_by': latest_updated_by,
                    'updated_at': format_date_to_ddmmyyyy(latest_updated_raw),
                    'client_jobs': client_jobs,
                }
                candidate_data.append(candidate_dict)

            # Return with pagination info
            response_data = {
                'results': candidate_data,
                'pagination': {
                    'total_count': total_count,
                    'page': page,
                    'page_size': page_size,
                    'total_pages': (total_count + page_size - 1) // page_size,
                    'has_next': start_index + page_size < total_count,
                    'has_previous': page > 1
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in my_candidates_dtr: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({
                'error': 'Failed to fetch candidates',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    @action(detail=False, methods=['get'], url_path='branch-employees')
    def branch_employees(self, request):
        """
        Return employees in the same branch as the logged-in BM for DTR filtering.
        Only accessible by BM (L3/bm) users.
        Endpoint: /api/candidates/branch-employees/
        """
        try:
            from empreg.models import Employee
            
            print(f"branch_employees called by user: {request.user}")

            # Get employee profile using robust search
            try:
                username = request.user.username
                employee = Employee.objects.filter(
                    Q(user=request.user) | 
                    Q(employeeCode=username) | 
                    Q(phone1=username) | 
                    Q(phone2=username),
                    del_state=0
                ).select_related().first()
                
                if not employee:
                    print(f"BM Employee not found for user: {request.user} (username: {username})")
                    return Response({"error": "Employee profile not found"}, status=status.HTTP_404_NOT_FOUND)
                
                employee_code = employee.employeeCode
                user_role = employee.level or 'L1'
                user_branch = employee.branch
                print(f"BM Employee found: {employee_code}, role: {user_role}, branch: {user_branch}")
                
                if not employee_code:
                    return Response({"error": "Employee code not set"}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                print(f"Error finding BM employee for user: {request.user}, error: {str(e)}")
                return Response({"error": "Employee profile lookup failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Only allow BM users to access this endpoint
            if user_role not in ['L3', 'bm']:
                return Response({"error": "Access denied. Only Branch Managers can access this endpoint."}, 
                              status=status.HTTP_403_FORBIDDEN)

            # Get all employees in BM's branch (including null branch for Coimbatore and Madurai)
            if user_branch and user_branch.upper() in ['COIMBATORE', 'MADURAI']:
                # For Coimbatore and Madurai BM: include employees with branch='COIMBATORE'/'MADURAI' OR branch is null
                branch_employees = Employee.objects.filter(
                    Q(branch__iexact=user_branch) | Q(branch__isnull=True),
                    del_state=0,
                    status='Active'
                ).exclude(employeeCode__isnull=True).order_by('firstName', 'lastName')
            else:
                # For other branches: only include employees with exact branch match
                branch_employees = Employee.objects.filter(
                    branch=user_branch,
                    del_state=0,
                    status='Active'
                ).exclude(employeeCode__isnull=True).order_by('firstName', 'lastName')

            # Get TLs specifically with enhanced filtering
            if user_branch and user_branch.upper() in ['COIMBATORE', 'MADURAI']:
                # For Coimbatore and Madurai BM: include TLs with branch='COIMBATORE'/'MADURAI' OR branch is null
                team_leaders_query = Employee.objects.filter(
                    Q(branch__iexact=user_branch) | Q(branch__isnull=True),
                    level='L2',
                    status='Active',
                    del_state=0
                ).exclude(employeeCode__isnull=True).order_by('firstName', 'lastName')
            else:
                # For other branches: only include TLs with exact branch match
                team_leaders_query = Employee.objects.filter(
                    branch=user_branch,
                    level='L2',
                    status='Active',
                    del_state=0
                ).exclude(employeeCode__isnull=True).order_by('firstName', 'lastName')

            # Separate TLs and regular employees
            team_leaders = []
            all_employees = []

            # Process all branch employees
            for emp in branch_employees:
                emp_data = {
                    'employeeCode': emp.employeeCode,
                    'firstName': emp.firstName,
                    'lastName': emp.lastName,
                    'level': emp.level or 'L1',
                    'reportingManager': emp.reportingManager,
                    'branch': emp.branch or 'NULL',  # Show NULL for display
                    'status': emp.status
                }
                all_employees.append(emp_data)

            # Process TLs specifically
            for tl in team_leaders_query:
                tl_data = {
                    'employeeCode': tl.employeeCode,
                    'firstName': tl.firstName,
                    'lastName': tl.lastName,
                    'level': tl.level,
                    'reportingManager': tl.reportingManager,
                    'branch': tl.branch or 'NULL',  # Show NULL for display
                    'status': tl.status
                }
                team_leaders.append(tl_data)

            return Response({
                'branch': user_branch,
                'bm_employee_code': employee_code,
                'team_leaders': team_leaders,
                'all_employees': all_employees,
                'total_employees': len(all_employees),
                'total_tls': len(team_leaders)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            return Response({
                'error': 'Failed to fetch branch employees',
                'detail': str(e),
                'traceback': traceback.format_exc()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    @action(detail=True, methods=['post'], url_path='upload-resume')
    def upload_resume(self, request, pk=None):
        """Upload and parse a resume for an existing candidate"""
        candidate = self.get_object()
        if 'resume_file' not in request.FILES:
            return Response({"error": "No file provided"}, status=400)

        candidate.resume_file = request.FILES['resume_file']
        candidate.save()
        self._process_resume(candidate)
        
        return Response({
            "status": "Resume processed",
            "data": candidate.resume_parsed_data
        })

    def perform_update(self, serializer):
        candidate = serializer.save()
        self._process_resume(candidate)

   
    # @action(detail=False, methods=['get'], url_path='calendar-stats')
    # def calendar_stats(self, request):
    #     """
    #     Optimized calendar statistics endpoint - Same URL, 5x faster performance
    #     """
    #     try:
    #         # Get parameters
    #         month_param = request.query_params.get('month')
    #         year_param = request.query_params.get('year')
            
    #         # Simple date parsing
    #         start_date, end_date = None, None
    #         if month_param:
    #             year, month = map(int, month_param.split('-'))
    #             start_date = datetime(year, month, 1).date()
    #             end_date = (datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)).date() - timedelta(days=1)
    #         elif year_param:
    #             year = int(year_param)
    #             start_date = datetime(year, 1, 1).date()
    #             end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
            
    #         from .models import ClientJob, Candidate
    #         from empreg.models import Employee
            
    #         # Prefetch client job and candidate data
    #         client_jobs_query = ClientJob.objects.select_related('candidate')

    #         if start_date and end_date:
    #             client_jobs_query = client_jobs_query.filter(
    #                 Q(interview_date__date__range=[start_date, end_date]) |
    #                 Q(next_follow_up_date__range=[start_date, end_date]) |
    #                 Q(expected_joining_date__date__range=[start_date, end_date])
    #             )
    #         else:
    #             client_jobs_query = client_jobs_query.filter(
    #                 Q(interview_date__isnull=False) |
    #                 Q(next_follow_up_date__isnull=False) |
    #                 Q(expected_joining_date__isnull=False)
    #             )

    #         client_jobs = list(client_jobs_query)
    #         # print(client_jobs)

    #         # Optimize: Batch fetch all employee names at once instead of querying for each candidate
    #         employee_codes = set(job.candidate.executive_name for job in client_jobs if job.candidate.executive_name)
            
    #         # Fetch all employees in one query
    #         employees = Employee.objects.filter(
    #             Q(employeeCode__in=employee_codes) | 
    #             Q(phone1__in=employee_codes) | 
    #             Q(phone2__in=employee_codes),
    #             del_state=0
    #         ).values('employeeCode', 'phone1', 'phone2', 'firstName', 'lastName')
            
    #         # Create lookup dictionary for O(1) access (support case-insensitive matching)
    #         employee_lookup = {}
    #         for emp in employees:
    #             full_name = (f"{emp['firstName']} {emp['lastName']}").strip() or emp['firstName'] or 'N/A'
    #             if emp['employeeCode']:
    #                 employee_lookup[emp['employeeCode']] = full_name
    #             if emp['phone1']:
    #                 employee_lookup[emp['phone1']] = full_name
    #             if emp['phone2']:
    #                 employee_lookup[emp['phone2']] = full_name
    #         # Lowercase index for tolerant lookups (EMP/00040 vs Emp/00040)
    #         employee_lookup_lower = {str(k).lower(): v for k, v in employee_lookup.items()}

    #         # Fast lookup function using dictionary
    #         def get_employee_full_name(employee_code):
    #             if not employee_code:
    #                 return 'N/A'
    #             name = employee_lookup.get(employee_code)
    #             if name:
    #                 return name
    #             try:
    #                 return employee_lookup_lower.get(str(employee_code).lower(), employee_code)
    #             except Exception:
    #                 return employee_code
            
    #         # Stats containers
    #         daily_stats = {}
    #         totals = {'interviews': 0, 'followups': 0, 'joinings': 0}
    #         # Track attended row counts per date (count of status history rows with attend_flag=True)
    #         attendance_counts_by_date = {}
    #         # Track which candidates already have a PS event per (date, client_job) to avoid duplicates
    #         ps_seen_keys = set()
    #         if_seen_keys = set()
            
    #         candidate_ids = set()

    #         for job in client_jobs:

    #             # Candidate data
    #             candidate_data = {
    #                 'id': job.candidate.id,
    #                 'candidate_name': job.candidate.candidate_name,
    #                 'mobile1': job.candidate.mobile1,
    #                 'email': job.candidate.email,
    #                 # Preserve raw code and expose display name separately
    #                 'executive_name': job.candidate.executive_name,
    #                 'executive_display': get_employee_full_name(job.candidate.executive_name),
    #                 'profile_number': job.candidate.profile_number,
    #                 'mobile2': job.candidate.mobile2,
    #                 'education': job.candidate.education,
    #                 'experience': job.candidate.experience,
    #                 'created_at': str(job.candidate.created_at),
    #                 'updated_at': str(job.candidate.updated_at),
    #                 'created_by': job.candidate.created_by,
    #                 'updated_by': job.candidate.updated_by,
    #                 'state': job.candidate.state,
    #                 'city': job.candidate.city,
    #                 'pincode': job.candidate.pincode,
    #                 'source': job.candidate.source,
    #             }

    #             # Client job data
    #             client_job_data = {
    #                 'id': job.id,
    #                 'client_name': job.client_name,
    #                 'designation': job.designation,
    #                 'remarks': job.remarks,
    #                 'expected_ctc': job.expected_ctc,
    #                 'current_ctc': job.current_ctc,
    #                 'feedback': getattr(job.candidate, 'feedback', None),
    #                 'created_at': str(job.created_at),
    #                 'updated_at': str(job.updated_at),
    #                 'created_by': job.created_by,
    #                 'updated_by': job.updated_by,
                    
    #                 'interview_date': str(job.interview_date) if job.interview_date else None,
    #                 'next_follow_up_date': str(job.next_follow_up_date) if job.next_follow_up_date else None,
    #                 'expected_joining_date': str(job.expected_joining_date) if job.expected_joining_date else None,
    #                 'candidate_id': job.candidate_id
    #             }
                
    #             candidate_ids.add(job.candidate_id)

    #             # Process each event type
    #             events = []

    #             if job.interview_date:
    #                 try:
    #                     # Handle datetime, date, or string types
    #                     if hasattr(job.interview_date, 'date'):
    #                         interview_date_str = job.interview_date.date().isoformat()
    #                     elif hasattr(job.interview_date, 'isoformat'):
    #                         interview_date_str = job.interview_date.isoformat()
    #                     else:
    #                         interview_date_str = str(job.interview_date)
                        
    #                     # Validate the date string is not invalid (e.g., 0000-00-00)
    #                     if interview_date_str and not interview_date_str.startswith('0000'):
    #                         key = (interview_date_str, job.candidate_id, job.id)
    #                         if_seen_keys.add(key)
    #                         events.append(('IF', interview_date_str))
    #                         totals['interviews'] += 1
    #                 except (ValueError, AttributeError, OSError) as e:
    #                     # Skip invalid dates (year 0, invalid format, etc.)
    #                     logger.warning(f"Skipping invalid interview_date for job {job.id}: {e}")
    #                     pass

    #             if job.next_follow_up_date:
    #                 try:
    #                     nfd_str = job.next_follow_up_date.isoformat()
    #                     # Validate the date string is not invalid
    #                     if nfd_str and not nfd_str.startswith('0000'):
    #                         events.append(('NFD', nfd_str))
    #                         totals['followups'] += 1
    #                 except (ValueError, AttributeError, OSError) as e:
    #                     # Skip invalid dates
    #                     logger.warning(f"Skipping invalid next_follow_up_date for job {job.id}: {e}")
    #                     pass

    #             if job.expected_joining_date:
    #                 try:
    #                     # Handle datetime, date, or string types
    #                     if hasattr(job.expected_joining_date, 'date'):
    #                         joining_date_str = job.expected_joining_date.date().isoformat()
    #                     elif hasattr(job.expected_joining_date, 'isoformat'):
    #                         joining_date_str = job.expected_joining_date.isoformat()
    #                     else:
    #                         joining_date_str = str(job.expected_joining_date)
                        
    #                     # Validate the date string is not invalid
    #                     if joining_date_str and not joining_date_str.startswith('0000'):
    #                         events.append(('EDJ', joining_date_str))
    #                         totals['joinings'] += 1
    #                 except (ValueError, AttributeError, OSError) as e:
    #                     # Skip invalid dates
    #                     logger.warning(f"Skipping invalid expected_joining_date for job {job.id}: {e}")
    #                     pass

    #             # Add results by date
    #             for event_type, date_str in events:
    #                 try:
    #                     if start_date and end_date:
    #                         # Convert date_str to date object for comparison
    #                         event_date = datetime.fromisoformat(date_str).date() if isinstance(date_str, str) else date_str
    #                         if not (start_date <= event_date <= end_date):
    #                             continue
    #                 except (ValueError, OSError) as e:
    #                     # Skip dates that can't be parsed
    #                     logger.warning(f"Skipping unparseable date {date_str}: {e}")
    #                     continue
                    
    #                 if date_str not in daily_stats:
    #                     daily_stats[date_str] = {
    #                         'events': [],
    #                         'event_counts': {'IF': 0, 'NFD': 0, 'EDJ': 0, 'FP': 0, 'ATND': 0}
    #                     }

    #                 daily_stats[date_str]['events'].append({
    #                     'type': event_type,
    #                     'candidate': candidate_data,
    #                     'client_job': client_job_data,
    #                 })
    #                 daily_stats[date_str]['event_counts'][event_type] += 1
            
    #         # Add Status History Events
    #         try:
    #             status_history_query = CandidateStatusHistory.objects.select_related()
                
    #             if start_date and end_date:
    #                 status_history_query = status_history_query.filter(
    #                     change_date__range=[start_date, end_date]
    #                 )
                
    #             status_histories = list(status_history_query)

    #             # Augment employee lookup with executives from status history candidates (not only client_jobs)
    #             try:
    #                 status_candidate_ids = list({sh.candidate_id for sh in status_histories})
    #                 if status_candidate_ids:
    #                     exec_codes = list({row['executive_name'] for row in Candidate.objects.filter(id__in=status_candidate_ids).values('executive_name') if row['executive_name']})
    #                     # Filter out codes already present (case-insensitive)
    #                     missing_codes = [c for c in exec_codes if str(c).lower() not in employee_lookup_lower]
    #                     if missing_codes:
    #                         extra_emps = Employee.objects.filter(
    #                             Q(employeeCode__in=missing_codes) |
    #                             Q(phone1__in=missing_codes) |
    #                             Q(phone2__in=missing_codes),
    #                             del_state=0
    #                         ).values('employeeCode', 'phone1', 'phone2', 'firstName', 'lastName')
    #                         for emp in extra_emps:
    #                             full_name = (f"{emp['firstName']} {emp['lastName']}").strip() or emp['firstName'] or 'N/A'
    #                             if emp['employeeCode']:
    #                                 employee_lookup[emp['employeeCode']] = full_name
    #                             if emp['phone1']:
    #                                 employee_lookup[emp['phone1']] = full_name
    #                             if emp['phone2']:
    #                                 employee_lookup[emp['phone2']] = full_name
    #                         # Refresh lowercase map
    #                         employee_lookup_lower = {str(k).lower(): v for k, v in employee_lookup.items()}
    #             except Exception:
    #                 pass
                
    #             # Process status history events
    #             for history in status_histories:
    #                 try:
    #                     date_str = history.change_date.isoformat()
                        
    #                     # Skip if outside date range
    #                     if start_date and end_date:
    #                         if not (start_date <= history.change_date <= end_date):
    #                             continue
                        
    #                     # Get candidate data for this status history
    #                     try:
    #                         candidate = Candidate.objects.get(id=history.candidate_id)
    #                         # Return full candidate details for parity with ClientJob events
    #                         # Get client job data if available
    #                         client_job = None
    #                         if history.client_job_id:
    #                             try:
    #                                 client_job = ClientJob.objects.filter(id=history.client_job_id).first()
    #                             except ClientJob.DoesNotExist:
    #                                 pass
                            
    #                         # Get designation from client job or use candidate's
    #                         designation = None
    #                         if hasattr(candidate, 'designation') and candidate.designation:
    #                             designation = candidate.designation
    #                         elif client_job and client_job.designation:
    #                             designation = client_job.designation
                                
    #                         # Get CTC values from client job or use candidate's
    #                         current_ctc = None
    #                         if hasattr(candidate, 'current_ctc') and candidate.current_ctc is not None:
    #                             current_ctc = str(candidate.current_ctc)
    #                         elif client_job and client_job.current_ctc is not None:
    #                             current_ctc = str(client_job.current_ctc)
                                
    #                         expected_ctc = None
    #                         if hasattr(candidate, 'expected_ctc') and candidate.expected_ctc is not None:
    #                             expected_ctc = str(candidate.expected_ctc)
    #                         elif client_job and client_job.expected_ctc is not None:
    #                             expected_ctc = str(client_job.expected_ctc)
                            
    #                         candidate_data = {
    #                             # Core identifiers
    #                             'id': candidate.id,

    #                             # Names and phones (include both old and new keys for compatibility)
    #                             'candidate_name': candidate.candidate_name,
    #                             'name': candidate.candidate_name,
    #                             'mobile1': candidate.mobile1,
    #                             'mobile2': candidate.mobile2,
    #                             'mobile': candidate.mobile1,

    #                             # Contact and ownership
    #                             'email': candidate.email,
    #                             # Preserve raw code and add display name
    #                             'executive_name': candidate.executive_name if hasattr(candidate, 'executive_name') else None,
    #                             'executive_display': get_employee_full_name(candidate.executive_name) if hasattr(candidate, 'executive_name') else 'N/A',
    #                             'profile_number': candidate.profile_number,

    #                             # Profile info
    #                             'education': candidate.education,
    #                             'experience': candidate.experience,
    #                             'state': candidate.state,
    #                             'city': candidate.city,
    #                             'pincode': candidate.pincode,
    #                             'source': candidate.source,
    #                             'designation': designation,
    #                             'current_ctc': current_ctc,
    #                             'expected_ctc': expected_ctc,

    #                             # Audit
    #                             'created_at': str(candidate.created_at),
    #                             'updated_at': str(candidate.updated_at),
    #                             'created_by': get_employee_full_name(candidate.created_by) if candidate.created_by else 'N/A',
    #                             'updated_by': get_employee_full_name(candidate.updated_by) if candidate.updated_by else 'N/A',
    #                         }
    #                     except Candidate.DoesNotExist:
    #                         continue
                        
                        
                        
    #                     # Map status remarks to event types
    #                     status_type_mapping = {
    #                         'interested': 'INT',
    #                         'interview fixed': 'IF',
    #                         'feedback pending': 'FP',
    #                         'next round': 'NR',
    #                         'selected': 'SEL',
    #                         'joined': 'JND',
    #                         'not selected': 'NS',
    #                         'no show': 'NS',
    #                         'rejected': 'REJ',
    #                         'in process': 'INP',
    #                         'hold': 'HLD',
    #                         'candidate lost': 'CL',
    #                         'not joined': 'NLJ',
    #                         'golden egg': 'GE',
    #                         'profile submitted': 'PS'                          
    #                     }
                        
    #                     event_type = status_type_mapping.get(history.remarks.lower(), 'SH')  # SH = Status History
                        
    #                     # For Profile Submission (PS) events, ensure only one per (date, candidate, client_job)
    #                     # We process history rows in descending change_date/created_at order, so the first
    #                     # PS encountered per key is the latest and is the one we keep.
    #                     if event_type == 'PS':
    #                         key = (date_str, history.candidate_id, history.client_job_id or 0)
    #                         if key in ps_seen_keys:
    #                             # Skip older duplicate PS entries for the same candidate/job/date
    #                             continue
    #                         ps_seen_keys.add(key)
    #                     if event_type == 'IF':
    #                         key = (date_str, history.candidate_id, history.client_job_id or 0)
    #                         if key in if_seen_keys:
    #                             continue
    #                         if_seen_keys.add(key)
                        
    #                     if date_str not in daily_stats:
    #                         daily_stats[date_str] = {
    #                             'events': [],
    #                             'event_counts': {'IF': 0, 'NFD': 0, 'EDJ': 0, 'INT': 0, 'AFP': 0, 'FP': 0, 'SEL': 0, 'JND': 0, 'NS': 0, 'REJ': 0, 'HLD': 0, 'CL': 0, 'NLJ': 0, 'GE': 0, 'PS': 0, 'SH': 0, 'INP': 0, 'NR': 0, 'ATND': 0}
    #                         }
                        
    #                     # Ensure all event types exist in event_counts
    #                     for et in ['INT', 'AFP', 'FP', 'SEL', 'JND', 'NS', 'REJ', 'HLD', 'CL', 'NLJ', 'GE', 'PS', 'SH', 'INP', 'NR', 'ATND']:
    #                         if et not in daily_stats[date_str]['event_counts']:
    #                             daily_stats[date_str]['event_counts'][et] = 0

    #                     # FIXED ATND REMARK LOGIC
    #                     # -------------------------
    #                     if getattr(history, 'attend_flag', False):
    #                         client_job = ClientJob.objects.filter(id=history.client_job_id).first()
    #                         original_attend_remark = client_job.remarks if client_job else history.remarks

    #                         daily_stats[date_str]['events'].append({
    #                             'type': 'ATND',
    #                             'candidate': candidate_data,
    #                             'status_history': {
    #                                 'id': history.id,
    #                                 'remarks': original_attend_remark,  # Use actual client job remark for ATND
    #                                 'client_job_id': history.client_job_id,
    #                                 'vendor_id': history.vendor_id,
    #                                 'client_name': history.client_name,
    #                                 'extra_notes': history.extra_notes,
    #                                 'attend_flag': True,
    #                                 'created_by': get_employee_full_name(history.created_by) if history.created_by else 'N/A',
    #                                 'created_at': str(history.created_at)
    #                             }
    #                         })
    #                         daily_stats[date_str]['event_counts']['ATND'] += 1

    #                         # Count attended rows per date
    #                         try:
    #                             if date_str not in attendance_counts_by_date:
    #                                 attendance_counts_by_date[date_str] = 0
    #                             attendance_counts_by_date[date_str] += 1
    #                         except Exception:
    #                             pass
                            
    #                         # Skip normal SH mapping for attended rows
    #                         continue

    #                     # ---------- Non-Attended events (normal flow) ----------
    #                     daily_stats[date_str]['events'].append({
    #                         'type': event_type,
    #                         'candidate': candidate_data,
    #                         'status_history': {
    #                             'id': history.id,
    #                             'remarks': history.remarks,
    #                             'client_job_id': history.client_job_id,
    #                             'vendor_id': history.vendor_id,
    #                             'client_name': history.client_name,
    #                             'extra_notes': history.extra_notes,
    #                             'attend_flag': False,
    #                             'created_by': get_employee_full_name(history.created_by) if history.created_by else 'N/A',
    #                             'created_at': str(history.created_at)
    #                         }
    #                     })
    #                     daily_stats[date_str]['event_counts'][event_type] += 1

    #                     # Record attended row for this date if marked as attended
    #                     try:
    #                         if getattr(history, 'attend_flag', False):
    #                             if date_str not in attendance_counts_by_date:
    #                                 attendance_counts_by_date[date_str] = 0
    #                             attendance_counts_by_date[date_str] += 1
    #                     except Exception:
    #                         pass
                        
    #                     # Update totals
    #                     if event_type == 'INT':
    #                         totals['interested'] = totals.get('interested', 0) + 1
    #                     elif event_type == 'SEL':
    #                         totals['selected'] = totals.get('selected', 0) + 1
    #                     elif event_type == 'FP':
    #                         # Use snake_case key so it can be exposed as `feedback_pending` if needed
    #                         totals['feedback_pending'] = totals.get('feedback_pending', 0) + 1
    #                     elif event_type == 'INP':
    #                         # Use snake_case key to match `in_process` in the API response
    #                         totals['in_process'] = totals.get('in_process', 0) + 1
    #                     elif event_type == 'JND':
    #                         totals['joined'] = totals.get('joined', 0) + 1
    #                     elif event_type == 'NS':
    #                         totals['no_show'] = totals.get('no_show', 0) + 1
    #                     elif event_type == 'NR':
    #                         # Next Round
    #                         totals['next_round'] = totals.get('next_round', 0) + 1
    #                     elif event_type == 'PS':
    #                         # Profile Submission
    #                         totals['profile_submissions'] = totals.get('profile_submissions', 0) + 1
                        
                            
    #                 except Exception as e:
    #                     logger.warning(f"Error processing status history {history.id}: {e}")
    #                     continue
                        
    #         except Exception as e:
    #             logger.warning(f"Error fetching status history: {e}")
    #             # Continue without status history if there's an error
            
    #         # Prepare final result with ATND derived from attend_flag rows per date
    #         events_list = []
    #         attended_total = 0

    #         for date, info in sorted(daily_stats.items()):
    #             event_counts = info['event_counts'].copy()
    #             # ATND is count of status history rows marked attended on this date
    #             atnd_for_date = attendance_counts_by_date.get(date, 0)
    #             event_counts['ATND'] = atnd_for_date
    #             attended_total += atnd_for_date

    #             events_list.append({
    #                 'date': date,
    #                 'events': info['events'],
    #                 'event_counts': event_counts
    #             })

    #         # Set total attended across month
    #         totals['attended'] = attended_total

    #         result = {
    #             'totals': {
    #                 'interviews': totals['interviews'],
    #                 'followups': totals['followups'],
    #                 'joinings': totals['joinings'],
    #                 # 'interested': totals.get('interested', 0),
    #                 'selected': totals.get('selected', 0),
    #                 # 'joined': totals.get('joined', 0),
    #                 # 'no_show': totals.get('no_show', 0),
    #                 'attended': totals.get('attended', 0),
    #                 'in_process': totals.get('in_process', 0),
    #                 'next_round': totals.get('next_round', 0),
    #                 'profile_submissions': totals.get('profile_submissions', 0),
    #                 'total_events': (
    #                     totals.get('interviews', 0)
    #                     + totals.get('followups', 0)
    #                     + totals.get('joinings', 0)
    #                     + totals.get('selected', 0)
    #                     + totals.get('attended', 0)
    #                     + totals.get('in_process', 0)
    #                     + totals.get('next_round', 0)
    #                     + totals.get('profile_submissions', 0)
    #                 )
    #             },
    #             'events': events_list,
    #             'summary': {
    #                 'total_candidates': len(candidate_ids),
    #                 'total_client_jobs': len(client_jobs)
    #             }
    #         }

    #         return Response(result)

    #     except Exception as e:
    #         logger.error(f"Calendar stats error: {str(e)}")
    #         return Response({
    #             'error': 'Failed to fetch calendar statistics',
    #             'details': str(e),
    #             'month': month_param or 'unknown',
    #             'year': year_param or 'unknown'
    #         }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='calendar-stats')
    def calendar_stats(self, request):
        """
        Ultra-optimized calendar API — loads full month under 3 seconds.
        No per-row loops. Uses DB aggregation for all event types.
        """
        from django.db.models.functions import TruncDate
        from django.db.models import Count, Q, Value
        from .models import ClientJob, CandidateStatusHistory, Candidate
        from empreg.models import Employee

        try:
            # ----------------------------
            # Parse date filters
            # ----------------------------
            month_param = request.query_params.get("month")
            year_param  = request.query_params.get("year")

            if month_param:
                year, month = map(int, month_param.split("-"))
                start_date = datetime(year, month, 1).date()
                end_date = (
                    datetime(year, month + 1, 1).date() if month < 12
                    else datetime(year + 1, 1, 1).date()
                ) - timedelta(days=1)
            else:
                year = int(year_param)
                start_date = datetime(year, 1, 1).date()
                end_date   = datetime(year + 1, 1, 1).date() - timedelta(days=1)

            # Build datetime range for expected_joining_date so DB can use index efficiently
            start_ejd = datetime.combine(start_date, datetime.min.time())
            end_ejd = datetime.combine(end_date + timedelta(days=1), datetime.min.time())

            # ----------------------------
            #  Aggregation: ClientJob Events (IF, NFD, EDJ)
            # ----------------------------
            followups_by_date = (
                ClientJob.objects
                .filter(next_follow_up_date__range=[start_date, end_date])
                .annotate(date=TruncDate("next_follow_up_date"))
                .values("date")
                .annotate(count=Count("id"))
            )

            joinings_by_date = (
                ClientJob.objects
                .filter(
                    expected_joining_date__gte=start_ejd,
                    expected_joining_date__lt=end_ejd,
                )
                .annotate(date=TruncDate("expected_joining_date"))
                .values("date")
                .annotate(count=Count("id"))
            )

            # ----------------------------
            #  Aggregation: Status History Events
            # (PS, SEL, NR, INP, ATND, etc.)
            # ----------------------------
            # Include profile_submission so PS can follow the same
            # semantics as calendar_details (only profile_submission=1).
            hist = (
                CandidateStatusHistory.objects
                .filter(change_date__range=[start_date, end_date])
                .annotate(date=TruncDate("change_date"))
                .values("date", "remarks", "attend_flag", "profile_submission")
                .annotate(count=Count("id"))
            )

            # ----------------------------
            #  Build event_counts dictionary per date
            # ----------------------------
            daily = {}

            def ensure_date(date_str):
                if date_str not in daily:
                    daily[date_str] = {
                        "event_counts": {
                            "IF":0,"NFD":0,"EDJ":0,"PS":0,"SEL":0,
                            "NR":0,"INP":0,"FP":0,"ATND":0
                        },
                        "events": []  # detailed rows loaded later
                    }
            # ---- NFD
            for row in followups_by_date:
                ds = str(row["date"])
                ensure_date(ds)
                daily[ds]["event_counts"]["NFD"] = row["count"]

            # ---- EDJ
            for row in joinings_by_date:
                ds = str(row["date"])
                ensure_date(ds)
                daily[ds]["event_counts"]["EDJ"] = row["count"]

            # ---- Status History
            map_type = {
                "profile submitted": "PS",
                "selected": "SEL",
                "next round": "NR",
                "in process": "INP",
                "feedback pending": "FP",
                "interview fixed": "IF",
            }

            for row in hist:
                ds = str(row["date"])
                ensure_date(ds)

                if row["attend_flag"]:
                    # All attend_flag=True rows are counted as ATND
                    daily[ds]["event_counts"]["ATND"] += row["count"]
                else:
                    remarks = (row["remarks"] or "").strip().lower()

                    # For PS, follow the same rule as calendar_details:
                    # only count when profile_submission is flagged (1).
                    if remarks == "profile submitted":
                        if row.get("profile_submission") == 1:
                            daily[ds]["event_counts"]["PS"] += row["count"]
                    else:
                        event_type = map_type.get(remarks, None)
                        if event_type:
                            daily[ds]["event_counts"][event_type] += row["count"]

            # ----------------------------
            #  Compute Totals
            # ----------------------------
            totals = {
                "interviews": sum(d["event_counts"]["IF"] for d in daily.values()),
                "followups": sum(d["event_counts"]["NFD"] for d in daily.values()),
                "joinings": sum(d["event_counts"]["EDJ"] for d in daily.values()),
                "selected": sum(d["event_counts"]["SEL"] for d in daily.values()),
                "attended": sum(d["event_counts"]["ATND"] for d in daily.values()),
                "in_process": sum(d["event_counts"]["INP"] for d in daily.values()),
                "next_round": sum(d["event_counts"]["NR"] for d in daily.values()),
                "profile_submissions": sum(d["event_counts"]["PS"] for d in daily.values()),
            }

            totals["total_events"] = sum(totals.values())

            # ----------------------------
            #  Format list for frontend
            # ----------------------------
            events_list = [
                {
                    "date": date,
                    "events": daily[date]["events"],     # empty by default, filled by details API
                    "event_counts": daily[date]["event_counts"],
                }
                for date in sorted(daily.keys())
            ]

            return Response({
                "totals": totals,
                "events": events_list,
                "summary": {
                    "total_client_jobs": ClientJob.objects.count(),
                    "total_candidates": Candidate.objects.count()
                }
            })

        except Exception as e:
            logger.error(f"Calendar error: {e}")
            return Response({"error": str(e)}, status=500)


    @action(detail=False, methods=['get'], url_path='calendar-details')
    def calendar_details(self, request):
        """
        Returns FULL event details for a specific date and event type.
        Super fast (indexed queries).
        """
        from .models import ClientJob, CandidateStatusHistory, Candidate

        date = request.query_params.get("date")
        event = request.query_params.get("type")  # IF, NFD, EDJ, PS, SEL, ATND, NR, INP

        if not date or not event:
            return Response({"error": "date and type are required"}, status=400)

        # Pagination params (optional)
        page_param = request.query_params.get("page")
        page_size_param = request.query_params.get("page_size")

        # Only paginate if either page or page_size is explicitly provided
        paginate = not ((page_param in [None, ""]) and (page_size_param in [None, ""]))

        if paginate:
            try:
                page = int(page_param) if page_param not in [None, ""] else 1
            except (TypeError, ValueError):
                page = 1

            try:
                page_size = int(page_size_param) if page_size_param not in [None, ""] else 50
            except (TypeError, ValueError):
                page_size = 50

            if page < 1:
                page = 1
            if page_size < 1:
                page_size = 1

            max_page_size = 100
            if page_size > max_page_size:
                page_size = max_page_size

            offset = (page - 1) * page_size
        else:
            # No frontend pagination requested: return all rows for the day/event
            page = 1
            page_size = None
            offset = 0

        # Parse date string once so we can use proper date/datetime filters with indexes
        try:
            selected_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=400)

        # Helper to resolve employee code -> full name
        def get_employee_full_name(code):
            if not code:
                return None
            try:
                emp = Employee.objects.filter(
                    employeeCode=code,
                    del_state=0
                ).values("firstName", "lastName").first()
                if emp:
                    return (f"{emp['firstName']} {emp['lastName']}".strip() or emp['firstName'])
                return code
            except Exception:
                return code

        results = []
        total = 0

        # -----------------------------
        # ClientJob-based events (NFD, EDJ)
        # -----------------------------
        if event in ["NFD", "EDJ"]:
            if event == "NFD":
                qs = ClientJob.objects.filter(next_follow_up_date=selected_date).select_related("candidate")
            else:  # EDJ
                start_dt = datetime.combine(selected_date, datetime.min.time())
                end_dt = start_dt + timedelta(days=1)
                qs = ClientJob.objects.filter(
                    expected_joining_date__gte=start_dt,
                    expected_joining_date__lt=end_dt,
                ).select_related("candidate")

            total = qs.count()
            if paginate and page_size is not None:
                qs = qs[offset:offset + page_size]

            for job in qs:
                candidate = job.candidate

                candidate_payload = {
                    # Core identifiers
                    "id": candidate.id,

                    # Names and phones (include both old and new keys for compatibility)
                    "candidate_name": candidate.candidate_name,
                    "name": candidate.candidate_name,
                    "mobile1": candidate.mobile1,
                    "mobile2": candidate.mobile2,
                    "mobile": candidate.mobile1,

                    # Contact and ownership
                    "email": candidate.email,
                    "executive_name": getattr(candidate, "executive_name", None),
                    # Human-readable executive name for UI
                    "executive_display": get_employee_full_name(getattr(candidate, "executive_name", None)),
                    "profile_number": candidate.profile_number,

                    # Profile info
                    "education": candidate.education,
                    "experience": candidate.experience,
                    "state": candidate.state,
                    "city": candidate.city,
                    "pincode": candidate.pincode,
                    "source": candidate.source,
                    "designation": job.designation,
                    "current_ctc": job.current_ctc,
                    "expected_ctc": job.expected_ctc,

                    # Audit
                    "created_at": str(candidate.created_at) if getattr(candidate, "created_at", None) else None,
                    "updated_at": str(candidate.updated_at) if getattr(candidate, "updated_at", None) else None,
                    "created_by": getattr(candidate, "created_by", None),
                    "updated_by": getattr(candidate, "updated_by", None),
                }

                # Attach minimal revenue info (single joining_date) for this candidate
                try:
                    revenues_qs = getattr(candidate, "revenues", None)
                    if revenues_qs is not None:
                        # Use latest non-null joining_date, ignore deleted records
                        rev = (
                            revenues_qs
                            .filter(is_deleted=False, joining_date__isnull=False)
                            .order_by("-joining_date")
                            .first()
                        )
                        if rev is not None:
                            candidate_payload["candidaterevenue"] = [
                                {"joining_date": rev.joining_date.isoformat()}
                            ]
                        else:
                            candidate_payload["candidaterevenue"] = []
                    else:
                        candidate_payload["candidaterevenue"] = []
                except Exception:
                    # If anything goes wrong while fetching revenue, fall back gracefully
                    candidate_payload["candidaterevenue"] = []

                results.append({
                    "type": event,
                    "candidate": candidate_payload,
                    "client_job": {
                        "id": job.id,
                        "client_name": job.client_name,
                        "designation": job.designation,
                        "remarks": job.remarks,
                        "next_follow_up_date": job.next_follow_up_date,
                        "interview_date": job.interview_date,
                        "expected_joining_date": job.expected_joining_date,
                        "profilestatus": job.profilestatus,
                    },
                })

        # -----------------------------
        # Status History-based events (IF, PS, SEL, NR, INP, ATND)
        # -----------------------------
        elif event in ["IF", "PS", "SEL", "NR", "INP", "ATND"]:
            mapping = {
                "IF": "interview fixed",
                "PS": "profile submitted",
                "SEL": "selected",
                "NR": "next round",
                "INP": "in process",
                "ATND": "attended",
            }

            if event == "ATND":
                hist_qs = CandidateStatusHistory.objects.filter(
                    attend_flag=True,
                    change_date=date,
                    remarks__iexact=mapping[event],
                )
            elif event == "PS":
                # Profile Submission: ensure we only pick rows where profile_submission is flagged (1)
                hist_qs = CandidateStatusHistory.objects.filter(
                    change_date=date,
                    remarks__iexact=mapping[event],
                    profile_submission=1,
                )
            else:
                hist_qs = CandidateStatusHistory.objects.filter(
                    change_date=date,
                    remarks__iexact=mapping[event],
                )

            total = hist_qs.count()
            if paginate and page_size is not None:
                hist_qs = hist_qs[offset:offset + page_size]

            for h in hist_qs:
                c = Candidate.objects.get(id=h.candidate_id)

                # Try to resolve related client job for designation / CTCs if available
                related_job = None
                if h.client_job_id:
                    try:
                        related_job = ClientJob.objects.filter(id=h.client_job_id).first()
                    except Exception:
                        related_job = None

                designation = None
                if hasattr(c, "designation") and c.designation:
                    designation = c.designation
                elif related_job and related_job.designation:
                    designation = related_job.designation

                current_ctc = None
                if related_job and related_job.current_ctc is not None:
                    current_ctc = related_job.current_ctc

                expected_ctc = None
                if related_job and related_job.expected_ctc is not None:
                    expected_ctc = related_job.expected_ctc

                candidate_payload = {
                    # Core identifiers
                    "id": c.id,

                    # Names and phones
                    "candidate_name": c.candidate_name,
                    "name": c.candidate_name,
                    "mobile1": c.mobile1,
                    "mobile2": c.mobile2,
                    "mobile": c.mobile1,

                    # Contact and ownership
                    "email": c.email,
                    "executive_name": getattr(c, "executive_name", None),
                    "executive_display": get_employee_full_name(getattr(c, "executive_name", None)),
                    "profile_number": c.profile_number,

                    # Profile info
                    "education": c.education,
                    "experience": c.experience,
                    "state": c.state,
                    "city": c.city,
                    "pincode": c.pincode,
                    "source": c.source,
                    "designation": designation,
                    "current_ctc": current_ctc,
                    "expected_ctc": expected_ctc,

                    # Audit
                    "created_at": str(c.created_at) if getattr(c, "created_at", None) else None,
                    "updated_at": str(c.updated_at) if getattr(c, "updated_at", None) else None,
                    "created_by": getattr(c, "created_by", None),
                    "updated_by": getattr(c, "updated_by", None),
                }

                # Attach minimal revenue info (single joining_date) for this candidate
                try:
                    revenues_qs = getattr(c, "revenues", None)
                    if revenues_qs is not None:
                        rev = (
                            revenues_qs
                            .filter(is_deleted=False, joining_date__isnull=False)
                            .order_by("-joining_date")
                            .first()
                        )
                        if rev is not None:
                            candidate_payload["candidaterevenue"] = [
                                {"joining_date": rev.joining_date.isoformat()}
                            ]
                        else:
                            candidate_payload["candidaterevenue"] = []
                    else:
                        candidate_payload["candidaterevenue"] = []
                except Exception:
                    candidate_payload["candidaterevenue"] = []

                # Build client job payload using related ClientJob when available
                if related_job:
                    client_job_payload = {
                        "id": related_job.id,
                        "client_name": related_job.client_name or h.client_name,
                        "designation": related_job.designation,
                        "remarks": related_job.remarks or h.remarks,
                        "next_follow_up_date": related_job.next_follow_up_date,
                        "interview_date": related_job.interview_date,
                        "expected_joining_date": related_job.expected_joining_date,
                        "profilestatus": related_job.profilestatus,
                    }
                else:
                    # Fallback to basic info from status history when no ClientJob is linked
                    client_job_payload = {
                        "id": h.client_job_id,
                        "client_name": h.client_name,
                        "designation": designation,
                        "remarks": h.remarks,
                        "next_follow_up_date": None,
                        "interview_date": None,
                        "expected_joining_date": None,
                    }

                results.append({
                    "type": event,
                    "candidate": candidate_payload,
                    "client_job": client_job_payload,
                    "status_history": {
                        "remarks": h.remarks,
                        "client_job_id": h.client_job_id,
                        "extra_notes": h.extra_notes,
                    },
                })

        page_count = len(results)

        if paginate and page_size:
            total_pages = (total + page_size - 1) // page_size
            effective_page_size = page_size
        else:
            # When not paginating, treat everything as a single page
            total_pages = 1 if total > 0 else 0
            effective_page_size = page_count

        return Response({
            "results": results,
            "count": total,          # total records (matches calendar_stats)
            "page_count": page_count,  # records in this page
            "total": total,
            "page": page,
            "page_size": effective_page_size,
            "total_pages": total_pages,
        })


    @action(detail=False, methods=['get'], url_path='clientwise-report')
    def clientwise_report(self, request):
        """
        Client-wise report using ONLY candidate_clientjob (ClientJob table).
        Final status per candidate is stored here, so we do NOT use CandidateStatusHistory.
        """

        from django.db.models import Count, Q
        from .models import ClientJob

        try:
            # Query params
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            client = request.query_params.get('client')
            state = request.query_params.get('state')
            city = request.query_params.get('city')
            # New optional filters
            branch_param = request.query_params.get('branch')
            team_id_param = request.query_params.get('team_id')
            team_name_param = request.query_params.get('team')
            executive_param = request.query_params.get('executive')
            owner_by_param = (request.query_params.get('owner_by') or 'both').strip().lower()

            # Base queryset
            qs = ClientJob.objects.all()
            employee_scope_applied = False
            employee_scope_applied = False

            # Row-level filters for numeric branch/team
            employee_scope_applied = False
            try:
                # If a specific executive is provided, we skip row-level branch/team filtering
                # so that results reflect that employee across both current and previous ownership
                if not (executive_param and executive_param.strip()):
                    if branch_param and str(branch_param).isdigit():
                        qs = qs.filter(branch_id=int(str(branch_param).strip()))
                    if team_id_param and str(team_id_param).isdigit():
                        qs = qs.filter(team_id=int(str(team_id_param).strip()))
            except Exception:
                pass

            # Executive scope: include current and/or previous owner based on owner_by
            if executive_param and executive_param.strip().lower() not in ["", "all", "all executives"]:
                ex = executive_param.strip()
                if owner_by_param == 'previous':
                    qs = qs.filter(assigned_from__iexact=ex)
                elif owner_by_param == 'current':
                    qs = qs.filter(Q(candidate__executive_name__iexact=ex) | Q(assign_to__iexact=ex))
                else:  # both (default)
                    qs = qs.filter(
                        Q(candidate__executive_name__iexact=ex) |
                        Q(assign_to__iexact=ex) |
                        Q(assigned_from__iexact=ex)
                    )
                employee_scope_applied = True

            # Optional Branch/Team/Executive code resolution (same as clientwise)
            try:
                from empreg.models import Employee as Emp
                from Masters.models import Team as TeamModel, Branch as BranchModel

                codes_set = None

                if branch_param:
                    b_name = None
                    b_code = None
                    bp = str(branch_param).strip()
                    if bp.isdigit():
                        bobj = BranchModel.objects.filter(id=int(bp)).first()
                        if bobj:
                            b_name = (getattr(bobj, 'name', None) or '').strip()
                            b_code = (getattr(bobj, 'code', None) or getattr(bobj, 'branchcode', None) or getattr(bobj, 'branch_code', None) or '')
                            b_code = (b_code or '').strip()
                    else:
                        bobj = BranchModel.objects.filter(name__iexact=bp).first() or BranchModel.objects.filter(code__iexact=bp).first()
                        if bobj:
                            b_name = (getattr(bobj, 'name', None) or '').strip()
                            b_code = (getattr(bobj, 'code', None) or getattr(bobj, 'branchcode', None) or getattr(bobj, 'branch_code', None) or '')
                            b_code = (b_code or '').strip()
                        else:
                            b_name = bp

                    q = None
                    if b_name:
                        q = Q(branch__iexact=b_name)
                    if b_code:
                        q = (q | Q(branch__iexact=b_code)) if q is not None else Q(branch__iexact=b_code)

                    branch_codes = set()
                    if q is not None:
                        branch_codes = set(Emp.objects.filter(del_state=0).filter(q).values_list('employeeCode', flat=True))
                    if codes_set is None:
                        codes_set = branch_codes
                    else:
                        codes_set = codes_set & branch_codes

                if team_id_param or team_name_param:
                    team_obj = None
                    if team_id_param and str(team_id_param).isdigit():
                        team_obj = TeamModel.objects.filter(id=int(team_id_param)).first()
                    if not team_obj and team_name_param:
                        team_obj = TeamModel.objects.filter(name__iexact=str(team_name_param).strip()).first()
                    team_codes = set()
                    if team_obj:
                        team_codes = set(team_obj.employees.filter(del_state=0).values_list('employeeCode', flat=True))
                    if codes_set is None:
                        codes_set = team_codes
                    else:
                        codes_set = codes_set & team_codes

                if executive and executive.strip().lower() not in ["", "all", "all executives"]:
                    ex_code = executive.strip()
                    ex_set = {ex_code}
                    if codes_set is None:
                        codes_set = ex_set
                    else:
                        codes_set = codes_set & ex_set

                if codes_set is not None:
                    if codes_set:
                        qs = qs.filter(Q(candidate__executive_name__in=list(codes_set)) | Q(assign_to__in=list(codes_set)))
                    else:
                        qs = qs.none()
            except Exception:
                pass

            # Apply optional Branch/Team/Executive filters by resolving to employee codes
            try:
                from empreg.models import Employee as Emp
                from Masters.models import Team as TeamModel, Branch as BranchModel

                codes_set = None  # None means no restriction yet; sets will be intersected

                # Branch filter -> collect employee codes by employee.branch name/code
                if branch_param:
                    b_name = None
                    b_code = None
                    bp = str(branch_param).strip()
                    if bp.isdigit():
                        bobj = BranchModel.objects.filter(id=int(bp)).first()
                        if bobj:
                            b_name = (getattr(bobj, 'name', None) or '').strip()
                            b_code = (getattr(bobj, 'code', None) or getattr(bobj, 'branchcode', None) or getattr(bobj, 'branch_code', None) or '')
                            b_code = (b_code or '').strip()
                    else:
                        # Try match by name/code
                        bobj = BranchModel.objects.filter(name__iexact=bp).first() or BranchModel.objects.filter(code__iexact=bp).first()
                        if bobj:
                            b_name = (getattr(bobj, 'name', None) or '').strip()
                            b_code = (getattr(bobj, 'code', None) or getattr(bobj, 'branchcode', None) or getattr(bobj, 'branch_code', None) or '')
                            b_code = (b_code or '').strip()
                        else:
                            # If branch not found in table, use provided string directly as name hint
                            b_name = bp

                    q = None
                    if b_name:
                        q = Q(branch__iexact=b_name)
                    if b_code:
                        q = (q | Q(branch__iexact=b_code)) if q is not None else Q(branch__iexact=b_code)

                    branch_codes = set()
                    if q is not None:
                        branch_codes = set(Emp.objects.filter(del_state=0).filter(q).values_list('employeeCode', flat=True))
                    if codes_set is None:
                        codes_set = branch_codes
                    else:
                        codes_set = codes_set & branch_codes

                # Team filter -> collect employee codes from team M2M
                if team_id_param or team_name_param:
                    team_obj = None
                    if team_id_param and str(team_id_param).isdigit():
                        team_obj = TeamModel.objects.filter(id=int(team_id_param)).first()
                    if not team_obj and team_name_param:
                        team_obj = TeamModel.objects.filter(name__iexact=str(team_name_param).strip()).first()
                    team_codes = set()
                    if team_obj:
                        team_codes = set(team_obj.employees.filter(del_state=0).values_list('employeeCode', flat=True))
                    if codes_set is None:
                        codes_set = team_codes
                    else:
                        codes_set = codes_set & team_codes

                # Executive filter -> restrict to a single employee code
                if executive_param and executive_param.strip().lower() not in ["", "all", "all executives"]:
                    ex_code = executive_param.strip()
                    ex_set = {ex_code}
                    if codes_set is None:
                        codes_set = ex_set
                    else:
                        codes_set = codes_set & ex_set

                # Apply employee-code based filter if any restriction was built
                # Do not override when executive scope already applied above
                if codes_set is not None and not employee_scope_applied:
                    if codes_set:
                        owner_q = Q(candidate__executive_name__in=list(codes_set)) | Q(assign_to__in=list(codes_set))
                        if owner_by_param in ('previous', 'both'):
                            owner_q = owner_q | Q(assigned_from__in=list(codes_set))
                        qs = qs.filter(owner_q)
                    else:
                        # Intersection produced empty set -> no results
                        qs = qs.none()
            except Exception:
                # If anything fails in enrichment, continue without extra filters
                pass

            # Apply client filter
            if client:
                qs = qs.filter(client_name__icontains=client)

            # Apply optional state/city filters via Candidate join so counts respect UI filters
            if state:
                state_trimmed = state.strip()
                if state_trimmed:
                    qs = qs.filter(Q(candidate__state__icontains=state_trimmed) | Q(candidate__city__icontains=state_trimmed))
            if city:
                city_trimmed = city.strip()
                if city_trimmed:
                    qs = qs.filter(candidate__city__icontains=city_trimmed)

            # Date filter is applied on updated_at (final status update time)
            if start_date and end_date:
                qs = qs.filter(updated_at__date__range=[start_date, end_date])

            # Aggregating counts by client_name and final remarks
            agg = (
                qs.values("client_name", "remarks")
                  .annotate(count=Count("candidate_id", distinct=True))
            )

            # Result dictionary
            result = {}

            # Helper to initialize client row
            def init_client(name):
                if name not in result:
                    result[name] = {
                        "client_name": name,
                        "profile_submitted": 0,
                        "interview_fixed": 0,
                        "selected": 0,
                        "rejected": 0,
                        "feedback_pending": 0,
                        "next_round": 0,
                        "in_process": 0,
                        "no_show": 0,
                        "others": 0,
                        "total": 0,
                        "profile_submission_count": 0,  # Add count for profile_submission=1
                        "attended_count": 0,  # Add count for attend=1
                    }

            # Get profile_submission=1 and attend=1 counts per client in a single query
            from django.db.models import Q, Count, Case, When, IntegerField
            
            # Get counts for both profile_submission=1 and attend=1 in a single query
            # Prepare exclusion for well-known remarks for 'others'
            # New rule: Only exclude these six from OTHERS
            known_remarks = [
                'Selected', 'Rejected', 'Feedback Pending',
                'Next Round', 'In Process', 'No Show'
            ]

            # Build a Q that matches any known remark case-insensitively
            exclude_known_q = Q()
            for val in known_remarks:
                exclude_known_q |= Q(remarks__iexact=val)

            client_counts = (
                qs.values('client_name')
                .annotate(
                    profile_submission_count=Count(
                        'candidate_id',
                        filter=Q(profile_submission=1),
                        distinct=True,
                    ),
                    profile_submitted_active=Count(
                        'candidate_id',
                        filter=Q(profile_submission=1, transfer_status='Active'),
                        distinct=True,
                    ),
                    profile_submitted_inactive=Count(
                        'candidate_id',
                        filter=Q(profile_submission=1, transfer_status='Inactive'),
                        distinct=True,
                    ),
                    attended_count=Count(
                        'candidate_id',
                        filter=Q(attend=1),
                        distinct=True,
                    ),
                    attended_active=Count(
                        'candidate_id',
                        filter=Q(attend=1, transfer_status='Active'),
                        distinct=True,
                    ),
                    attended_inactive=Count(
                        'candidate_id',
                        filter=Q(attend=1, transfer_status='Inactive'),
                        distinct=True,
                    ),
                    others=Count(
                        'candidate_id',
                        filter=~exclude_known_q,
                        distinct=True,
                    )
                )
            )
            
            # Create lookup dictionaries for both counts
            profile_submission_dict = {
                item['client_name']: item['profile_submission_count']
                for item in client_counts
            }
            
            attended_dict = {
                item['client_name']: item['attended_count']
                for item in client_counts
            }
            attended_active_dict = {
                item['client_name']: item['attended_active']
                for item in client_counts
            }
            attended_inactive_dict = {
                item['client_name']: item['attended_inactive']
                for item in client_counts
            }
            others_dict = {
                item['client_name']: item['others']
                for item in client_counts
            }
            ps_active_dict = {
                item['client_name']: item['profile_submitted_active']
                for item in client_counts
            }
            ps_inactive_dict = {
                item['client_name']: item['profile_submitted_inactive']
                for item in client_counts
            }

            # Loop through aggregated results
            for row in agg:
                cname = row["client_name"]
                remark = (row["remarks"] or "").strip().lower()
                count = row["count"]

                init_client(cname)

                # Map remarks to keys
                if remark == "profile submitted":
                    result[cname]["profile_submitted"] += count
                elif remark == "interview fixed":
                    result[cname]["interview_fixed"] += count
                elif remark == "selected":
                    result[cname]["selected"] += count
                elif remark == "rejected":
                    result[cname]["rejected"] += count
                elif remark == "feedback pending":
                    result[cname]["feedback_pending"] += count
                elif remark == "next round":
                    result[cname]["next_round"] += count
                elif remark == "in process":
                    result[cname]["in_process"] += count
                elif remark == "no show":
                    result[cname]["no_show"] += count

                # Update total
                result[cname]["total"] += count
                
                # Update counts from our queries
                result[cname]["profile_submission_count"] = profile_submission_dict.get(cname, 0)
                result[cname]["profile_submitted"] = profile_submission_dict.get(cname, 0)
                result[cname]["attended_count"] = attended_dict.get(cname, 0)
                result[cname]["attended_active"] = attended_active_dict.get(cname, 0)
                result[cname]["attended_inactive"] = attended_inactive_dict.get(cname, 0)
                result[cname]["others"] = others_dict.get(cname, 0)
                # New: split counts
                result[cname]["profile_submitted_active"] = ps_active_dict.get(cname, 0)
                result[cname]["profile_submitted_inactive"] = ps_inactive_dict.get(cname, 0)

            # Return as list
            return Response(list(result.values()), status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=['get'], url_path='employeewise-report')
    def employeewise_report(self, request):
        """
        Employee-wise report using ONLY candidate_clientjob (ClientJob table).
        Owner logic: use assign_to (if present and not empty), otherwise Candidate.executive_name.
        """

        from django.db.models import Count, Q, Case, When, IntegerField, F, Value, CharField
        from .models import ClientJob
        try:
            # Query params
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            client = request.query_params.get('client')
            state = request.query_params.get('state')
            city = request.query_params.get('city')
            executive = request.query_params.get('executive')
            branch_param = request.query_params.get('branch')
            team_id_param = request.query_params.get('team_id')
            team_name_param = request.query_params.get('team')
            owner_by_param = (request.query_params.get('owner_by') or 'both').strip().lower()

            # Base queryset
            qs = ClientJob.objects.all()

            # Filters
            if client:
                qs = qs.filter(client_name__icontains=client)
            if state:
                st = state.strip()
                if st:
                    qs = qs.filter(Q(candidate__state__icontains=st) | Q(candidate__city__icontains=st))
            if city:
                ct = city.strip()
                if ct:
                    qs = qs.filter(candidate__city__icontains=ct)
            if start_date and end_date:
                qs = qs.filter(updated_at__date__range=[start_date, end_date])

            # Row-level numeric filters for branch/team when no specific executive is provided
            try:
                if not (executive and str(executive).strip()):
                    if branch_param and str(branch_param).isdigit():
                        qs = qs.filter(branch_id=int(str(branch_param).strip()))
                    if team_id_param and str(team_id_param).isdigit():
                        qs = qs.filter(team_id=int(str(team_id_param).strip()))
            except Exception:
                pass

            # Executive filter with owner scope matching clientwise behavior
            if executive and executive.strip().lower() not in ["", "all", "all executives"]:
                ex = executive.strip()
                if owner_by_param == 'previous':
                    qs = qs.filter(assigned_from__iexact=ex)
                elif owner_by_param == 'current':
                    qs = qs.filter(Q(candidate__executive_name__iexact=ex) | Q(assign_to__iexact=ex))
                else:  # both
                    qs = qs.filter(
                        Q(candidate__executive_name__iexact=ex) |
                        Q(assign_to__iexact=ex) |
                        Q(assigned_from__iexact=ex)
                    )
                employee_scope_applied = True

            # Determine owner code (employee code) per row
            owner_code = Case(
                When(Q(assign_to__isnull=False) & ~Q(assign_to=""), then=F('assign_to')),
                default=F('candidate__executive_name'),
                output_field=CharField(),
            )

            # Known remarks excluded from Others (new rule - only six)
            known_remarks = [
                'Selected', 'Rejected', 'Feedback Pending',
                'Next Round', 'In Process', 'No Show'
            ]
            exclude_known_q = Q()
            for val in known_remarks:
                exclude_known_q |= Q(remarks__iexact=val)

            # Apply optional Branch/Team/Executive filters by resolving to employee codes (if not already scoped by executive)
            try:
                from empreg.models import Employee as Emp
                from Masters.models import Team as TeamModel, Branch as BranchModel

                codes_set = None

                # Branch filter -> collect employee codes
                #  (a) by employee.branch name/code (Emp table)
                #  (b) by Team.branch_id membership (Team.employees M2M)
                if branch_param:
                    b_name = None
                    b_code = None
                    bp = str(branch_param).strip()
                    if bp.isdigit():
                        bobj = BranchModel.objects.filter(id=int(bp)).first()
                        if bobj:
                            b_name = (getattr(bobj, 'name', None) or '').strip()
                            b_code = (getattr(bobj, 'code', None) or getattr(bobj, 'branchcode', None) or getattr(bobj, 'branch_code', None) or '')
                            b_code = (b_code or '').strip()
                    else:
                        bobj = BranchModel.objects.filter(name__iexact=bp).first() or BranchModel.objects.filter(code__iexact=bp).first()
                        if bobj:
                            b_name = (getattr(bobj, 'name', None) or '').strip()
                            b_code = (getattr(bobj, 'code', None) or getattr(bobj, 'branchcode', None) or getattr(bobj, 'branch_code', None) or '')
                            b_code = (b_code or '').strip()
                        else:
                            b_name = bp

                    # (a) Emp.branch name/code match
                    q = None
                    if b_name:
                        q = Q(branch__iexact=b_name)
                    if b_code:
                        q = (q | Q(branch__iexact=b_code)) if q is not None else Q(branch__iexact=b_code)
                    branch_codes = set()
                    if q is not None:
                        branch_codes = set(Emp.objects.filter(del_state=0).filter(q).values_list('employeeCode', flat=True))

                    # (b) Team.branch_id membership
                    team_branch_codes = set()
                    try:
                        if bp.isdigit():
                            tqs = TeamModel.objects.filter(branch_id=int(bp))
                            team_branch_codes = set(
                                Emp.objects.filter(del_state=0, teams__in=list(tqs)).values_list('employeeCode', flat=True)
                            )
                    except Exception:
                        pass

                    # Union both sources
                    combined = branch_codes | team_branch_codes
                    if codes_set is None:
                        codes_set = combined
                    else:
                        codes_set = codes_set & combined

                # Team filter -> collect employee codes from team M2M
                if team_id_param or team_name_param:
                    team_obj = None
                    if team_id_param and str(team_id_param).isdigit():
                        team_obj = TeamModel.objects.filter(id=int(team_id_param)).first()
                    if not team_obj and team_name_param:
                        team_obj = TeamModel.objects.filter(name__iexact=str(team_name_param).strip()).first()
                    team_codes = set()
                    if team_obj:
                        team_codes = set(team_obj.employees.filter(del_state=0).values_list('employeeCode', flat=True))
                    if codes_set is None:
                        codes_set = team_codes
                    else:
                        codes_set = codes_set & team_codes

                # Executive filter -> restrict to a single employee code (when provided but not already applied above)
                if executive and executive.strip().lower() not in ["", "all", "all executives"] and not employee_scope_applied:
                    ex_code = executive.strip()
                    ex_set = {ex_code}
                    if codes_set is None:
                        codes_set = ex_set
                    else:
                        codes_set = codes_set & ex_set

                # Apply codes_set against owner fields
                if codes_set is not None and not employee_scope_applied:
                    if codes_set:
                        owner_q = Q(candidate__executive_name__in=list(codes_set)) | Q(assign_to__in=list(codes_set))
                        if owner_by_param in ('previous', 'both'):
                            owner_q = owner_q | Q(assigned_from__in=list(codes_set))
                        qs = qs.filter(owner_q)
                    else:
                        qs = qs.none()
            except Exception:
                pass

            # Build a base queryset with computed owner (employee_code)
            qs_with_owner = qs.annotate(employee_code=owner_code)

            # 1) Per-remark aggregation grouped by employee_code
            agg = (
                qs_with_owner
                .values('employee_code', 'remarks')
                .annotate(count=Count('candidate_id', distinct=True))
            )

            # Unique clients per employee_code (current owner)
            client_pairs = qs_with_owner.values('employee_code', 'client_name').distinct()
            client_map = {}
            for row in client_pairs:
                code = (row.get('employee_code') or '').strip()
                cname = (row.get('client_name') or '').strip()
                if not code or not cname:
                    continue
                if code not in client_map:
                    client_map[code] = []
                client_map[code].append(cname)

            # Unique clients per previous owner (assigned_from)
            client_prev_pairs = qs.values('assigned_from', 'client_name').distinct()
            client_prev_map = {}
            for row in client_prev_pairs:
                pcode = (row.get('assigned_from') or '').strip()
                cname = (row.get('client_name') or '').strip()
                if not pcode or not cname:
                    continue
                if pcode not in client_prev_map:
                    client_prev_map[pcode] = []
                client_prev_map[pcode].append(cname)

            # 2) Summary counts per employee_code for flags and others (distinct per candidate)
            summary = (
                qs_with_owner
                .values('employee_code')
                .annotate(
                    profile_submission_count=Count('candidate_id', filter=Q(profile_submission=1), distinct=True),
                    profile_submitted_active=Count('candidate_id', filter=Q(profile_submission=1, transfer_status='Active'), distinct=True),
                    profile_submitted_inactive=Count('candidate_id', filter=Q(profile_submission=1, transfer_status='Inactive'), distinct=True),
                    attended_count=Count('candidate_id', filter=Q(attend=1), distinct=True),
                    attended_active=Count('candidate_id', filter=Q(attend=1, transfer_status='Active'), distinct=True),
                    attended_inactive=Count('candidate_id', filter=Q(attend=1, transfer_status='Inactive'), distinct=True),
                    others_count=Count('candidate_id', filter=~exclude_known_q, distinct=True),
                )
            )

            # Prev-owner (transfer-out) summary grouped by assigned_from
            prev_summary = (
                qs.values('assigned_from')
                .annotate(
                    profile_transfer=Count('candidate_id', filter=Q(profile_submission=1, transfer_status='Inactive'), distinct=True),
                    attended_transfer=Count('candidate_id', filter=Q(attend=1, transfer_status='Inactive'), distinct=True),
                )
            )
            prev_map = { (row.get('assigned_from') or '').strip(): row for row in prev_summary if row.get('assigned_from') }

            # Build result dict keyed by employee_code
            result = {}
            def init_exec(code):
                if code not in result:
                    result[code] = {
                        'employee_code': code,
                        'employee_name': code,  # temporary, resolve later
                        'profile_submitted': 0,
                        'profile_submitted_active': 0,
                        'profile_submitted_inactive': 0,
                        'interview_fixed': 0,
                        'selected': 0,
                        'rejected': 0,
                        'feedback_pending': 0,
                        'next_round': 0,
                        'in_process': 0,
                        'no_show': 0,
                        'others': 0,
                        'total': 0,
                        'profile_submission_count': 0,
                        'attended_count': 0,
                        'attended_active': 0,
                        'attended_inactive': 0,
                    }

            # Accumulate counts by remark
            for row in agg:
                code = (row.get('employee_code') or '').strip()
                remark = (row.get('remarks') or '').strip().lower()
                cnt = int(row.get('count') or 0)

                if not code:
                    code = 'UNKNOWN'
                init_exec(code)

                if remark == 'profile submitted':
                    result[code]['profile_submitted'] += cnt
                elif remark == 'interview fixed':
                    result[code]['interview_fixed'] += cnt
                elif remark == 'selected':
                    result[code]['selected'] += cnt
                elif remark == 'rejected':
                    result[code]['rejected'] += cnt
                elif remark == 'feedback pending':
                    result[code]['feedback_pending'] += cnt
                elif remark == 'next round':
                    result[code]['next_round'] += cnt
                elif remark == 'in process':
                    result[code]['in_process'] += cnt
                elif remark == 'no show':
                    result[code]['no_show'] += cnt

                # Totals per distinct candidate across this remark
                result[code]['total'] += cnt

            # Merge summary counts into result and sync profile_submitted with profile_submission_count
            summary_map = {s['employee_code']: s for s in summary}

            # Ensure employees that only appear as transfer-out (assigned_from) are also present
            # But when a Branch/Team filter is applied, restrict to those employee codes within the filtered scope
            prev_keys = list(prev_map.keys())
            try:
                if 'codes_set' in locals() and codes_set is not None:
                    prev_keys = [k for k in prev_keys if k in codes_set]
            except Exception:
                pass
            for pcode in prev_keys:
                if pcode and pcode not in result:
                    init_exec(pcode)

            for code, r in result.items():
                s = summary_map.get(code, {})
                p = prev_map.get(code, {})
                r['profile_submission_count'] = s.get('profile_submission_count', 0) or 0
                r['attended_count'] = s.get('attended_count', 0) or 0
                r['others'] = s.get('others_count', 0) or 0
                # Ongoing = current owner (computed from owner_code)
                r['profile_submitted_active'] = s.get('profile_submitted_active', 0) or 0
                r['attended_active'] = s.get('attended_active', 0) or 0
                # Transfer = attribute to previous owner (assigned_from)
                r['profile_submitted_inactive'] = p.get('profile_transfer', 0) or 0
                r['attended_inactive'] = p.get('attended_transfer', 0) or 0
                # Keep UI consistent with clientwise: show profile_submitted using the flag count
                r['profile_submitted'] = r['profile_submission_count']
                # Attach unique clients list
                # Combine clients from current owner and previous owner
                cl_current = client_map.get(code, [])
                cl_prev = client_prev_map.get(code, [])
                cl_combined = (cl_current or []) + (cl_prev or [])
                # Preserve order, de-duplicate
                seen = set()
                uniq = []
                for x in cl_combined:
                    if x and x not in seen:
                        seen.add(x)
                        uniq.append(x)
                # Fallback: if still empty but we have transfer counts, query directly
                if not uniq and p:
                    try:
                        extra_prev_clients = list(
                            qs.filter(assigned_from__iexact=code)
                            .values_list('client_name', flat=True)
                            .distinct()
                        )
                        for x in extra_prev_clients:
                            if x and x not in seen:
                                seen.add(x)
                                uniq.append(x)
                    except Exception:
                        pass
                r['clients'] = uniq

            # If branch/team filter is present, hard-restrict final result to allowed codes
            try:
                if (branch_param or team_id_param or team_name_param):
                    allowed_codes = set()
                    if 'codes_set' in locals() and codes_set is not None:
                        allowed_codes = set(codes_set)
                    # If codes_set wasn't computed (shouldn't happen with branch/team), fallback to Emp-based branch match
                    if not allowed_codes and branch_param:
                        from empreg.models import Employee as Emp
                        from Masters.models import Branch as BranchModel
                        bp = str(branch_param).strip()
                        q = None
                        if bp.isdigit():
                            bobj = BranchModel.objects.filter(id=int(bp)).first()
                            if bobj:
                                bname = (getattr(bobj, 'name', None) or '').strip()
                                bcode = (getattr(bobj, 'code', None) or getattr(bobj, 'branchcode', None) or getattr(bobj, 'branch_code', None) or '').strip()
                                if bname:
                                    q = Q(branch__iexact=bname)
                                if bcode:
                                    q = (q | Q(branch__iexact=bcode)) if q is not None else Q(branch__iexact=bcode)
                        else:
                            q = Q(branch__iexact=bp)
                        if q is not None:
                            allowed_codes = set(Emp.objects.filter(del_state=0).filter(q).values_list('employeeCode', flat=True))
                    if allowed_codes:
                        result = { code: row for code, row in result.items() if code in allowed_codes }
            except Exception:
                pass

            # If a specific executive is requested, return only that executive's row
            try:
                if executive and executive.strip().lower() not in ["", "all", "all executives"]:
                    ex = executive.strip()
                    if ex:
                        result = { code: row for code, row in result.items() if code == ex }
            except Exception:
                pass

            # Resolve employee names from codes
            try:
                from empreg.models import Employee
                codes = [k for k in result.keys() if k and k != 'UNKNOWN']
                if codes:
                    emp_map = {
                        e.employeeCode: (f"{e.firstName} {e.lastName}".strip() or e.firstName or e.employeeCode)
                        for e in Employee.objects.filter(employeeCode__in=codes, del_state=0)
                    }
                    for code in result.keys():
                        disp = emp_map.get(code)
                        if disp:
                            result[code]['employee_name'] = disp
            except Exception:
                pass

            return Response(list(result.values()), status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=500)

   
# ------------------------------
# Client Job View
# ------------------------------
class ClientJobViewSet(viewsets.ModelViewSet):
    queryset = ClientJob.objects.all()
    serializer_class = ClientJobSerializer
    
    def get_current_user_name(self, request):
        """Get current logged-in user's name with employee code for feedback entries"""
        
        try:
            if request.user and request.user.is_authenticated:
                
                # Method 1: Try to get employee by user relationship
                try:
                    employee = Employee.objects.get(user=request.user, del_state=0)
                    result = f"{employee.firstName}({employee.employeeCode})"
                    return result
                except Employee.DoesNotExist:
                    pass  # Continue to next method
                
                # Method 2: Try to find employee by username (might be phone or employeeCode)
                username = request.user.username
                
                # Try by employeeCode first
                try:
                    employee = Employee.objects.get(employeeCode=username, del_state=0)
                    result = f"{employee.firstName}({employee.employeeCode})"
                    return result
                except Employee.DoesNotExist:
                    pass
                
                # Try by phone number
                try:
                    employee = Employee.objects.get(phone1=username, del_state=0)
                    result = f"{employee.firstName}({employee.employeeCode})"
                    return result
                except Employee.DoesNotExist:
                    pass
                
                try:
                    employee = Employee.objects.get(phone2=username, del_state=0)
                    result = f"{employee.firstName}({employee.employeeCode})"
                    return result
                except Employee.DoesNotExist:
                    pass
                
                # Fallback to username if no employee record
                fallback_name = request.user.username if request.user else "System"
                return fallback_name
                
        except Exception as e:
            return "Unknown User"
    
    def convert_employee_code_to_name(self, employee_code):
        """Convert employee code to employee name if needed"""
        if not employee_code:
            return employee_code
            
        try:
            # If it's already a name (contains spaces or doesn't match code pattern), return as is
            if ' ' in employee_code or not employee_code.startswith(('EMP', 'CBE')):
                return employee_code
            
            # Try to find employee by code and return name
            employee = Employee.objects.get(employeeCode=employee_code, del_state=0)
            return employee.firstName
        except Employee.DoesNotExist:
            print(f"WARNING: Could not find employee with code {employee_code}")
            return employee_code
        except Exception as e:
            print(f"ERROR: Exception converting employee code {employee_code}: {str(e)}")
            return employee_code

    def get_current_user_employee(self, request):
        """
        Get the current user's Employee record - OPTIMIZED VERSION
        Returns Employee object if found, None otherwise
        """
        try:
            if not request.user or not request.user.is_authenticated:
                return None
            
            # OPTIMIZED: Single query with Q objects to avoid multiple DB hits
            return Employee.objects.filter(
                Q(user=request.user) | 
                Q(employeeCode=request.user.username) |
                Q(phone1=request.user.username) | 
                Q(phone2=request.user.username),
                del_state=0
            ).select_related().first()
            
        except Exception as e:
            print(f"Error getting current user employee: {str(e)}")
            return None

    def can_edit_client_job(self, client_job, request):
        """
        Check if the current user can edit this client job
        
        Editing rules:
        1. If job is assigned (assign_to is set) - only assigned executive + higher roles can edit
        2. If job is open profile (assign_to is None) - no one can edit until claimed
        3. Higher roles (TL, BM, RM, CEO) can always edit jobs assigned to their subordinates
        
        Args:
            client_job: ClientJob instance to check
            request: Django request object
            
        Returns:
            tuple: (can_edit: bool, reason: str)
        """
        try:
            if not request.user or not request.user.is_authenticated:
                return False, "User not authenticated"
            
            # Get current user's employee record
            current_employee = self.get_current_user_employee(request)
            if not current_employee:
                return False, "Employee profile not found"
            
            # If job is unassigned (NFD expired or open profile), allow editing for claiming
            # NFD expired jobs have assign_to = NULL but keep their original remarks and NFD date
            # Frontend shows "NFD: date (open profile)" for display
            if not client_job.assign_to:
                # Check if NFD is expired
                if client_job.next_follow_up_date:
                    expiry_threshold = get_nfd_expiry_threshold()
                    if client_job.next_follow_up_date < expiry_threshold:
                        return True, "NFD expired - can be claimed by editing"
                # Or if explicitly marked as open profile
                if client_job.remarks and client_job.remarks.lower() == 'open profile':
                    return True, "Open profile - can be claimed by editing"
            
            # Permission check logic
            
            # Check if current user is the assigned executive
            # assign_to stores employee code, so compare with current user's code
            current_emp_code = str(current_employee.employeeCode) if current_employee.employeeCode else ""
            assigned_to_code = str(client_job.assign_to) if client_job.assign_to else ""
            
            
            if assigned_to_code and current_emp_code == assigned_to_code:
                return True, "User is assigned to this job"
            
            # TEMPORARY: Allow all authenticated users to edit any job (for flexibility)
            # TODO: Enable hierarchy check in future when needed
            return True, "Edit allowed for all authenticated users"
            
            # ========================================================================
            # HIERARCHY CHECK (DISABLED FOR NOW - UNCOMMENT TO ENABLE IN FUTURE)
            # ========================================================================
            # 
            # # If job is not assigned to current user, check hierarchy
            # 
            # # Check hierarchy - higher roles can edit subordinate jobs
            # current_level = current_employee.level
            # if not current_level:
            #     return False, "User level not defined"
            # 
            # # Get assigned executive's level
            # try:
            #     # assign_to stores employee code, so search by employeeCode
            #     assigned_employee = Employee.objects.get(
            #         employeeCode=client_job.assign_to, 
            #         del_state=0
            #     )
            #     assigned_level = assigned_employee.level
            # except Employee.DoesNotExist:
            #     # If assigned employee not found, allow editing by higher roles
            #     assigned_level = 'employee'  # Assume lowest level
            # 
            # # Level hierarchy: employee < tl < bm < rm < ceo
            # # Support both naming conventions: L1/L2/L3 and employee/tl/bm
            # level_hierarchy = {
            #     'employee': 1,
            #     'L1': 1,  # Employee level
            #     'tl': 2,
            #     'L2': 2,  # Team Leader level
            #     'bm': 3,
            #     'L3': 3,  # Branch Manager level
            #     'rm': 4,
            #     'L4': 4,  # Regional Manager level
            #     'ceo': 5,
            #     'L5': 5   # CEO level
            # }
            # 
            # current_level_rank = level_hierarchy.get(current_level, 0)
            # assigned_level_rank = level_hierarchy.get(assigned_level, 1)
            # 
            # 
            # if current_level_rank > assigned_level_rank:
            #     return True, f"User has higher role ({current_level}) than assigned executive ({assigned_level})"
            # elif current_level_rank == assigned_level_rank:
            #     # Same level - allow editing (for testing/flexibility)
            #     # In production, you might want to restrict this to same person only
            #     return True, f"User has same level ({current_level}) as assigned executive - allowing edit"
            # 
            # return False, f"User level ({current_level}) cannot edit job assigned to {assigned_level}"
            
        except Exception as e:
            # Error checking edit permissions - silently handled
            return False, f"Error checking permissions: {str(e)}"

    def check_edit_permission(self, client_job):
        """
        Check edit permission and raise PermissionDenied if not allowed
        """
        can_edit, reason = self.can_edit_client_job(client_job, self.request)
        if not can_edit:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(f"Cannot edit this client job: {reason}")
        return True
    
    def get_queryset(self):
        queryset = ClientJob.objects.select_related('candidate').all()
        
        # Check for both 'candidate' and 'candidate_id' parameters
        candidate_id = self.request.query_params.get('candidate', None) or self.request.query_params.get('candidate_id', None)
        if candidate_id is not None:
            queryset = queryset.filter(candidate_id=candidate_id)
            # Only apply limit when filtering by candidate to prevent massive responses
            return queryset.order_by('-id')[:50]  # Reduce to 50 most recent records for better performance
        # For individual object retrieval (detail views), don't apply slice
        return queryset.order_by('-id')
    
    def perform_create(self, serializer):
        """
        Auto-replicate industry, current_ctc, and expected_ctc from existing client jobs
        when creating a new client job for the same candidate.
        """
        candidate_id = serializer.validated_data.get('candidate')
        
        if candidate_id:
            # Check if there are existing client jobs for this candidate
            existing_job = ClientJob.objects.filter(candidate=candidate_id).first()
            
            if existing_job:
                # Auto-replicate fields from existing job if not provided in new job
                validated_data = serializer.validated_data
                
                if not validated_data.get('industry') and existing_job.industry:
                    validated_data['industry'] = existing_job.industry
                    
                if not validated_data.get('current_ctc') and existing_job.current_ctc:
                    validated_data['current_ctc'] = existing_job.current_ctc
                    
                if not validated_data.get('expected_ctc') and existing_job.expected_ctc:
                    validated_data['expected_ctc'] = existing_job.expected_ctc
        
        client_job = serializer.save()
        
        # If this new ClientJob has profile submission, record status history
        # try:
        #     if bool(getattr(client_job, 'profile_submission', 0)):
        #         created_by = get_current_user_employee_code(self.request.user)
        #         change_date = client_job.profile_submission_date or timezone.now().date()
        #         CandidateStatusHistory.create_status_entry(
        #             candidate_id=client_job.candidate.id,
        #             remarks='Profile Submitted',
        #             change_date=change_date,
        #             created_by=created_by,
        #             client_job_id=client_job.id,
        #             vendor_id=None,
        #             client_name=client_job.client_name if client_job else None,
        #             profile_submission=1
        #         )
        
        try:
            if bool(getattr(client_job, 'profile_submission', 0)):
                has_profile_submitted = CandidateStatusHistory.objects.filter(
                    candidate_id=client_job.candidate.id,
                    client_job_id=client_job.id,
                    remarks='Profile Submitted'
                ).exists()
                if not has_profile_submitted:
                    created_by = get_current_user_employee_code(self.request.user)
                    change_date = client_job.profile_submission_date or timezone.now().date()
                    CandidateStatusHistory.objects.create(
                        candidate_id=client_job.candidate.id,
                        client_job_id=client_job.id,
                        remarks='Profile Submitted',
                        change_date=change_date,
                        created_by=created_by,
                        client_name=client_job.client_name if client_job else None,
                        profile_submission=1,
                        employee_id=created_by
                    )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to create 'Profile Submitted' history on ClientJob create: {str(e)}")

        # Trigger event update after new ClientJob creation
        try:
            self._update_call_details_on_candidate_creation(
                candidate=client_job.candidate,
                client_job=client_job,
                request=self.request
            )
        except Exception as call_details_error:
            # Log error but don't fail the ClientJob creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error updating call details after new ClientJob creation: {str(call_details_error)}")

    def perform_update(self, serializer):
        """Override update to use current user's name when feedback is auto-generated"""
        
        # Get the instance before saving to compare changes
        instance = self.get_object()
        
        # Check edit permissions before allowing update
        self.check_edit_permission(instance)
        
        # Get current user's name and employee
        current_user_name = self.get_current_user_name(self.request)
        current_employee = self.get_current_user_employee(self.request)
        
        # Check if current user is the account holder (candidate creator)
        is_account_holder = False
        if current_employee and instance.candidate:
            current_emp_code = str(current_employee.employeeCode) if current_employee.employeeCode else ""
            candidate_creator = str(instance.candidate.executive_name) if instance.candidate.executive_name else ""
            is_account_holder = (current_emp_code == candidate_creator)
        
        # If NOT account holder, restrict to feedback and attendance-only updates
        if not is_account_holder:
            request_data = self.request.data
            # Only allow feedback, attendance, and remarks fields to be updated for ClientJob
            allowed_fields = {'feedback', 'remarks'}
            # Ignore fields that belong to Candidate model (not ClientJob)
            candidate_fields = {
                'designation', 'ctc', 'experience', 'client_name', 'notice_period', 
                'location', 'vendor_status', 'candidate_name', 'mobile1', 'mobile2',
                'email', 'city', 'state', 'source', 'dob', 'gender', 'education',
                'skills', 'languages', 'current_ctc', 'expected_ctc'
            }
            # Ignore system fields
            system_fields = {'id', 'candidate', 'created_at', 'updated_at'}
            
            # Check only ClientJob-specific restricted fields
            restricted_fields = set(request_data.keys()) - allowed_fields - candidate_fields - system_fields
            
            if restricted_fields:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied(
                    f"Non-account holders can only update feedback field. "
                    f"Attempted to update: {', '.join(restricted_fields)}"
                )
        
        old_remarks = instance.remarks
        old_nfd = instance.next_follow_up_date
        old_feedback = getattr(instance.candidate, 'feedback', None)
        old_profile_submission = 1 if bool(getattr(instance, 'profile_submission', 0)) else 0
        old_attend = instance.attend
        old_attend_date = instance.attend_date

        # Save the updated instance
        client_job = serializer.save()

        # Handle profile submission status history
        new_profile_submission = 1 if bool(getattr(client_job, 'profile_submission', 0)) else 0
        if new_profile_submission == 1:
            created_by = get_current_user_employee_code(self.request.user)
            change_date = client_job.profile_submission_date or timezone.now().date()
            CandidateStatusHistory.create_status_entry(
                candidate_id=client_job.candidate.id,
                remarks='Profile Submitted',
                change_date=change_date,
                created_by=created_by,
                client_job_id=client_job.id,
                vendor_id=None,
                client_name=client_job.client_name if client_job else None,
                profile_submission=1
            )

        # Handle attendance status history (idempotent)
        attend_changed = client_job.attend != old_attend or client_job.attend_date != old_attend_date
        if attend_changed:
            created_by = get_current_user_employee_code(self.request.user)
            change_date = client_job.attend_date or timezone.now().date()

            # 1) Pure attendance row: Attended/Not Attended with attend_flag = 1/0
            attend_remarks = 'Attended' if client_job.attend else 'Not Attended'

            # Extra guard to avoid duplicates on the same candidate/job/date/state
            exists = CandidateStatusHistory.objects.filter(
                candidate_id=client_job.candidate.id,
                client_job_id=client_job.id,
                change_date=change_date,
                attend_flag=client_job.attend
            ).exists()
            if not exists:
                CandidateStatusHistory.create_status_entry(
                    candidate_id=client_job.candidate.id,
                    remarks=attend_remarks,
                    change_date=change_date,
                    created_by=created_by,
                    client_job_id=client_job.id,
                    vendor_id=None,
                    client_name=client_job.client_name if client_job else None,
                    profile_submission=None,
                    attend_flag=client_job.attend
                )

            # 2) Separate status row for the new remarks (e.g. "Next Round") with attend_flag = 0
            if old_remarks != client_job.remarks and client_job.remarks:
                CandidateStatusHistory.create_status_entry(
                    candidate_id=client_job.candidate.id,
                    remarks=client_job.remarks,
                    change_date=change_date,
                    created_by=created_by,
                    client_job_id=client_job.id,
                    vendor_id=None,
                    client_name=client_job.client_name if client_job else None,
                    profile_submission=None,
                    attend_flag=False
                )

        # Check if this update should generate feedback entry
        request_data = self.request.data
        new_remarks = client_job.remarks
        new_nfd = client_job.next_follow_up_date
        
        # Auto-generate feedback if remarks or important fields changed
        should_generate_feedback = False
        feedback_text = ""
        
        if old_remarks != new_remarks and new_remarks:
            should_generate_feedback = True
            feedback_text = f"Status updated to: {new_remarks}"
        elif 'feedback' in request_data and request_data.get('feedback'):
            should_generate_feedback = True
            feedback_text = request_data.get('feedback', 'Status updated')
        
        # Generate feedback entry with current user's name
        if should_generate_feedback:
            client_job.add_feedback(
                feedback_text=feedback_text,
                remarks=new_remarks or old_remarks,
                nfd_date=new_nfd.strftime('%d/%m/%Y') if new_nfd else None,
                entry_by=current_user_name,  # Use current logged-in user's name
                call_status=request_data.get('call_status', '')
            )
            client_job.save()
        # No else block needed - feedback only generated when conditions are met
        
        # Trigger event update after ClientJob edit
        try:
            self._update_call_details_on_candidate_creation(
                candidate=client_job.candidate,
                client_job=client_job,
                request=self.request
            )
        except Exception as call_details_error:
            # Log error but don't fail the ClientJob update
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error updating call details after ClientJob edit: {str(call_details_error)}")

    def _sanitize_feedback_text(self, text):
        """
        Sanitize feedback text to remove problematic Unicode characters
        that cause ASCII encoding errors in responses.
        """
        if not text:
            return text
        
        try:
            # Convert to string if not already
            text = str(text)
            
            # Replace non-breaking spaces with regular spaces
            text = text.replace('\xa0', ' ')
            text = text.replace('\u00a0', ' ')  # Alternative non-breaking space
            
            # Replace other common problematic Unicode characters
            text = text.replace('\u2018', "'")  # Left single quotation mark
            text = text.replace('\u2019', "'")  # Right single quotation mark
            text = text.replace('\u201c', '"')  # Left double quotation mark
            text = text.replace('\u201d', '"')  # Right double quotation mark
            text = text.replace('\u2013', '-')  # En dash
            text = text.replace('\u2014', '-')  # Em dash
            text = text.replace('\u2026', '...')  # Horizontal ellipsis
            text = text.replace('\u00b7', '*')  # Middle dot
            text = text.replace('\u2022', '*')  # Bullet
            text = text.replace('\u2010', '-')  # Hyphen
            text = text.replace('\u2011', '-')  # Non-breaking hyphen
            
            # Remove zero-width characters
            text = text.replace('\u200b', '')  # Zero-width space
            text = text.replace('\u200c', '')  # Zero-width non-joiner
            text = text.replace('\u200d', '')  # Zero-width joiner
            text = text.replace('\ufeff', '')  # Byte order mark
            
            # Encode to UTF-8 and decode back to remove remaining problematic characters
            text = text.encode('utf-8', errors='ignore').decode('utf-8')
            
            # Normalize whitespace
            text = ' '.join(text.split())
            
            return text
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sanitizing feedback text: {str(e)}")
            # Fallback: ASCII-safe encoding
            try:
                return str(text).encode('ascii', errors='ignore').decode('ascii')
            except:
                return "Text encoding error"

    @action(detail=True, methods=['post'], url_path='add-feedback')
    def add_feedback(self, request, pk=None):
        """Add or update structured feedback to client job"""
        try:
            client_job = self.get_object()
            
            # Check edit permissions before allowing feedback addition
            self.check_edit_permission(client_job)
            
            # Get current user's employee
            current_employee = self.get_current_user_employee(request)
            
            # Check if current user is the account holder (candidate creator)
            is_account_holder = False
            if current_employee and client_job.candidate:
                current_emp_code = str(current_employee.employeeCode) if current_employee.employeeCode else ""
                candidate_creator = str(client_job.candidate.executive_name) if client_job.candidate.executive_name else ""
                is_account_holder = (current_emp_code == candidate_creator)
            
            # Sanitize input data to prevent encoding errors
            feedback_text = self._sanitize_feedback_text(request.data.get('feedback_text', ''))
            remarks = self._sanitize_feedback_text(request.data.get('remarks', ''))
            nfd_date = request.data.get('nfd_date')
            ejd_date = request.data.get('ejd_date')
            ifd_date = request.data.get('ifd_date')
            profile_submission = request.data.get('profile_submission')
            profile_submission_date = request.data.get('profile_submission_date')
            # Get current user's name instead of using entry_by from request
            entry_by = self.get_current_user_name(request)
            entry_id = request.data.get('entry_id')  # New parameter for updating existing entries
            call_status = self._sanitize_feedback_text(request.data.get('call_status', ''))  # Sanitize call status too
            
            # If NOT account holder, restrict to feedback and remarks updates only
            if not is_account_holder:
                # Clear all fields except feedback_text, remarks, and call_status
                # remarks is now allowed for non-account holders
                nfd_date = None
                ejd_date = None
                ifd_date = None
                profile_submission = None
                profile_submission_date = None
            
            
            if not feedback_text:
                return Response({"error": "feedback_text is required"}, status=400)
            
            # Validate entry_id if provided
            if entry_id is not None:
                try:
                    entry_id = int(entry_id)
                except (ValueError, TypeError):
                    return Response({"error": "entry_id must be a valid integer"}, status=400)
            
            # Store original feedback for comparison
            original_feedback = getattr(client_job.candidate, 'feedback', None)
            old_profile_submission = 1 if bool(getattr(client_job, 'profile_submission', 0)) else 0
            
            # Add feedback with comprehensive error handling
            try:
                client_job.add_feedback(
                    feedback_text=feedback_text,
                    remarks=remarks,
                    nfd_date=nfd_date,
                    ejd_date=ejd_date,
                    ifd_date=ifd_date,
                    profile_submission=profile_submission,
                    profile_submission_date=profile_submission_date,
                    entry_by=entry_by,  # Now uses current logged-in user's name
                    entry_id=entry_id,
                    call_status=call_status,
                    update_date_fields=is_account_holder  # Only account holders can update date fields
                )
                
                # Save the model with encoding error handling
                try:
                    client_job.save()
                except UnicodeEncodeError as ue:
                    # Handle Unicode encoding errors during save
                    print(f"Unicode encoding error during save: {str(ue)}")
                    # Clean the feedback field again and retry
                    if hasattr(client_job.candidate, 'feedback'):
                        client_job.candidate.feedback = self._sanitize_feedback_text(client_job.candidate.feedback)
                        client_job.candidate.save(update_fields=['feedback'])
                    client_job.remarks = self._sanitize_feedback_text(client_job.remarks)
                    client_job.save()
                    
            except Exception as feedback_error:
                print(f"Error in add_feedback: {str(feedback_error)}")
                # If add_feedback fails, try to sanitize and save basic fields only
                client_job.remarks = self._sanitize_feedback_text(remarks) if remarks else client_job.remarks
                client_job.save()
                raise Exception(f"Feedback processing failed: {str(feedback_error)}")
            
            # Refresh from database to ensure we have latest data
            client_job.refresh_from_db()
            # If profile_submission turned true with this feedback, record latest status history
            try:
                new_profile_submission = 1 if bool(getattr(client_job, 'profile_submission', 0)) else 0
                if new_profile_submission == 1:
                    created_by = get_current_user_employee_code(request.user)
                    change_date = client_job.profile_submission_date or timezone.now().date()
                    CandidateStatusHistory.create_status_entry(
                        candidate_id=client_job.candidate.id,
                        remarks='Profile Submitted',
                        change_date=change_date,
                        created_by=created_by,
                        client_job_id=client_job.id,
                        vendor_id=None,
                        client_name=client_job.client_name if client_job else None,
                        profile_submission=1
                    )
            except Exception as hist_err:
                # Do not fail feedback due to history creation issues
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to create Profile Submitted history on add_feedback: {str(hist_err)}")
            
            # Trigger event update after feedback addition/update
            try:
                self._update_call_details_on_candidate_creation(
                    candidate=client_job.candidate,
                    client_job=client_job,
                    request=request
                )
            except Exception as call_details_error:
                # Log error but don't fail the feedback operation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error updating call details after feedback addition: {str(call_details_error)}")
            
            action_type = "updated" if entry_id is not None else "added"
            
            # Sanitize feedback before returning to prevent encoding errors
            sanitized_feedback = self._sanitize_feedback_text(getattr(client_job.candidate, 'feedback', ''))
            
            return Response({
                "status": f"Feedback {action_type} successfully",
                "feedback": sanitized_feedback,
                "entry_id": entry_id,
                "action": action_type
            })
            
        except Exception as e:
            # Sanitize error message to prevent encoding issues
            error_message = self._sanitize_feedback_text(str(e)) if hasattr(self, '_sanitize_feedback_text') else str(e)
            return Response({"error": error_message}, status=500)

    @action(detail=False, methods=['post'], url_path='test-encoding')   
    def test_encoding(self, request):
        """Test endpoint to verify encoding fixes"""
        try:
            test_text = request.data.get('test_text', 'Test with\xa0non-breaking space')
            
            # Test sanitization
            sanitized = self._sanitize_feedback_text(test_text)
            
            return Response({
                "original": repr(test_text),
                "sanitized": repr(sanitized),
                "status": "Encoding test successful"
            })
        except Exception as e:
            return Response({
                "error": str(e),
                "status": "Encoding test failed"
            }, status=500)

    @action(detail=True, methods=['get'], url_path='get-feedback-entries')
    def get_feedback_entries(self, request, pk=None):
        """Get parsed feedback entries with NFD auto-update"""
        try:
            client_job = self.get_object()
            
            # Optimized NFD update check with minimal logging
            nfd_updated = client_job.check_and_update_expired_nfd()
            if nfd_updated:
                client_job.refresh_from_db()
            
            # Get feedback entries without excessive debugging
            entries = client_job.get_feedback_entries()

            total_entries = len(entries)

            page_param = request.query_params.get('page')
            page_size_param = request.query_params.get('page_size')

            if page_param is not None or page_size_param is not None:
                try:
                    page = int(page_param) if page_param is not None else 1
                except (TypeError, ValueError):
                    page = 1
                try:
                    page_size = int(page_size_param) if page_size_param is not None else 20
                except (TypeError, ValueError):
                    page_size = 20

                if page < 1:
                    page = 1
                if page_size < 1:
                    page_size = 1

                start = (page - 1) * page_size
                end = start + page_size
                paginated_entries = entries[start:end]
                total_pages = (total_entries + page_size - 1) // page_size if page_size else 1
            else:
                paginated_entries = entries
                page = 1
                page_size = total_entries if total_entries > 0 else 1
                total_pages = 1
            
            # Sanitize each entry's feedback_text to prevent encoding errors
            for entry in paginated_entries:
                if 'feedback_text' in entry:
                    entry['feedback_text'] = self._sanitize_feedback_text(entry['feedback_text'])
            
            return Response({
                "feedback_entries": paginated_entries,
                "total_entries": total_entries,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1,
                "nfd_updated": nfd_updated
            })
            
        except ClientJob.DoesNotExist:
            return Response(
                {"error": f"ClientJob with ID {pk} not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in get_feedback_entries for ID {pk}: {str(e)}")
            return Response(
                {"error": "Internal server error", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='check-permissions')
    def check_permissions(self, request, pk=None):
        """
        Check user permissions for this client job
        Returns editing rights and job status information
        """
        try:
            client_job = self.get_object()
            
            # Check edit permissions
            can_edit, edit_reason = self.can_edit_client_job(client_job, request)
            
            # Get current user info
            current_employee = self.get_current_user_employee(request)
            current_user_name = self.get_current_user_name(request)
            
            # Get job status information
            job_status = {
                'id': client_job.id,
                'assign_to': client_job.assign_to,
                'assign_by': client_job.assign_by,
                'remarks': client_job.remarks,
                'is_assignable': client_job.is_assignable(),
                'next_follow_up_date': client_job.next_follow_up_date.isoformat() if client_job.next_follow_up_date else None
            }
            
            # Get assignment info
            assignment_info = client_job.get_assignment_info()
            
            return Response({
                'success': True,
                'permissions': {
                    'can_edit': can_edit,
                    'edit_reason': edit_reason,
                    'can_claim': not client_job.assign_to or client_job.remarks == 'open profile' or client_job.is_assignable(),
                    'can_assign': client_job.is_assignable()
                },
                'current_user': {
                    'name': current_user_name,
                    'employee_code': current_employee.employeeCode if current_employee else None,
                    'level': current_employee.level if current_employee else None
                },
                'job_status': job_status,
                'assignment_info': assignment_info
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f" Error checking permissions: {str(e)}")
            return Response({
                'error': f'Failed to check permissions: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='assign-candidate')
    def assign_candidate(self, request, pk=None):
        """Assign candidate to an executive for this specific client job - OPTIMIZED"""
        try:
            logger.info(f"Starting assignment process for ClientJob ID: {pk}")
            
            # OPTIMIZED: Get client job with related candidate in single query
            client_job = self.get_queryset().select_related('candidate').get(pk=pk)
            
            # Get assignment data from request
            assign_to_code = request.data.get('assign_to_code') or request.data.get('assign_to')
            assign_by_code = request.data.get('assign_by_code') or request.data.get('assign_by')
            entry_by = request.data.get('entry_by', '')
            feedback_text = request.data.get('feedback_text', '')
            nfd_date = request.data.get('nfd_date')
            remarks = request.data.get('remarks', 'Profile Assigned')
            
            # Validate required fields
            if not assign_to_code:
                return Response({"error": "assign_to_code (employee code) is required"}, status=400)
            
            if not assign_by_code:
                return Response({"error": "assign_by_code (employee code) is required"}, status=400)
            
            # Check if candidate profile is open for assignment
            if not client_job.is_assignable():
                # If not assignable, try to mark as open profile
                client_job.remarks = "open profile"
                client_job.save(update_fields=['remarks'])
                logger.info(f"Profile not assignable - automatically marked as 'open profile' for ClientJob ID: {pk}")
                
                # Verify it's now assignable
                if not client_job.is_assignable():
                    return Response({
                        "error": "Cannot assign candidate - Failed to update profile status",
                        "current_remarks": client_job.remarks,
                        "nfd_date": client_job.next_follow_up_date.strftime('%Y-%m-%d') if client_job.next_follow_up_date else None
                    }, status=400)
            
            # OPTIMIZED: Verify both employees exist in single query
            employee_codes = [assign_to_code, assign_by_code]
            employees = Employee.objects.filter(
                employeeCode__in=employee_codes, 
                del_state=0
            ).only('employeeCode', 'firstName')
            
            # Create lookup dictionary for O(1) access
            employee_dict = {emp.employeeCode: emp for emp in employees}
            
            # Validate employees exist
            if assign_to_code not in employee_dict:
                return Response({"error": f"Employee with code '{assign_to_code}' not found"}, status=404)
            
            if assign_by_code not in employee_dict:
                return Response({"error": f"Employee with code '{assign_by_code}' not found"}, status=404)
            
            assign_to_employee = employee_dict[assign_to_code]
            assign_by_employee = employee_dict[assign_by_code]
            
            # Store original assignment for response and history
            original_assign_to = client_job.assign_to
            
            # Determine the "assigned_from" value
            # If already assigned to someone, use that person's code
            # If first assignment, get the original executive's employee code
            if original_assign_to:
                # This is a reassignment
                assigned_from_code = original_assign_to
            else:
                # This is the first assignment - get original executive's employee code
                # The executive_name might be a name, so we need to get the employee code
                try:
                    original_executive = Employee.objects.filter(
                        Q(firstName__icontains=client_job.candidate.executive_name) | 
                        Q(employeeCode=client_job.candidate.executive_name),
                        del_state=0
                    ).first()
                    assigned_from_code = original_executive.employeeCode if original_executive else client_job.candidate.executive_name
                except Exception as e:
                    logger.warning(f"Could not find employee code for executive '{client_job.candidate.executive_name}': {e}")
                    assigned_from_code = client_job.candidate.executive_name
            
            # Get current user's name for assignment entry
            current_user_name = self.get_current_user_name(request)
            
            
            # OPTIMIZED: Update assignment fields in single operation
            update_fields = {
                'assign_to': assign_to_code,  # Store employee code in DB
                'assign_by': assign_by_code,  # Store employee code in DB
                'assign': 'assigned',  # Set assign status
                'remarks': remarks,  # Store "Profile Assigned" in remarks field
                'assigned_from': assigned_from_code,  # Track previous owner (employee code)
                'transfer_date': timezone.now(),  # Record when assignment happened
            }
            update_fields['transfer_status'] = 'Inactive'
            try:
                b_id, t_id = _resolve_branch_team_by_employee_code(assign_to_code)
                if b_id is not None:
                    update_fields['branch_id'] = b_id
                if t_id is not None:
                    update_fields['team_id'] = t_id
            except Exception:
                pass
            
            # Handle NFD date
            if nfd_date:
                from datetime import datetime
                try:
                    # Parse the NFD date from frontend (YYYY-MM-DD format)
                    new_nfd_date = datetime.strptime(nfd_date, '%Y-%m-%d').date()
                    update_fields['next_follow_up_date'] = new_nfd_date
                except ValueError as e:
                    logger.error(f"Invalid NFD date format: {nfd_date}, error: {e}")
            
            # Clear EJD and IFD on assignment (fresh start for new executive)
            ejd_date = request.data.get('ejd_date')
            ifd_date = request.data.get('ifd_date')
            
            if ejd_date == '' or ejd_date is None:
                update_fields['expected_joining_date'] = None
            
            if ifd_date == '' or ifd_date is None:
                update_fields['interview_date'] = None  # Fixed: correct field name
            
            # OPTIMIZED: Bulk update all fields at once
            for field, value in update_fields.items():
                setattr(client_job, field, value)
            
            # Save the changes
            client_job.save(update_fields=list(update_fields.keys()))
            # Duplicate a new ClientJob row with requested field mapping
            try:
                dup_branch_id = update_fields.get('branch_id')
                dup_team_id = update_fields.get('team_id')
                if dup_branch_id is None or dup_team_id is None:
                    try:
                        b_id2, t_id2 = _resolve_branch_team_by_employee_code(assign_to_code)
                        if dup_branch_id is None:
                            dup_branch_id = b_id2
                        if dup_team_id is None:
                            dup_team_id = t_id2
                    except Exception:
                        pass

                duplicate_job = ClientJob.objects.create(
                    candidate=client_job.candidate,
                    client_name=client_job.client_name,
                    designation=client_job.designation,
                    industry=client_job.industry,
                    current_ctc=client_job.current_ctc,
                    expected_ctc=client_job.expected_ctc,
                    profile_submission=0,
                    profile_submission_date=None,
                    remarks=client_job.remarks,
                    expected_joining_date=client_job.expected_joining_date,
                    interview_date=client_job.interview_date,
                    next_follow_up_date=client_job.next_follow_up_date,
                    assign=None,
                    assign_by=None,
                    assign_to=None,
                    assigned_from=client_job.assigned_from,
                    transfer_date=timezone.now(),
                    transfer_status='Active',
                    profilestatus=client_job.profilestatus,
                    attend=0,
                    attend_date=None,
                    branch_id=dup_branch_id,
                    team_id=dup_team_id,
                    employee_id=assign_to_code,
                    created_by=''  # as requested
                )
                # Immediately set updated_by and updated_at to the assign_by employee
                ClientJob.objects.filter(pk=duplicate_job.pk).update(
                    updated_by=assign_by_code,
                    updated_at=timezone.now()
                )
                logger.info(f"Duplicated ClientJob row created with id {duplicate_job.id} for candidate {client_job.candidate.id}")
            except Exception as dup_err:
                logger.error(f"Error duplicating ClientJob row on assignment: {str(dup_err)}", exc_info=True)

            try:
                candidate_obj = client_job.candidate
                current = candidate_obj.transfer_history or ''
                if current and current.strip():
                    parts = [p.strip() for p in current.split('-') if p.strip()]
                    if parts:
                        if parts[-1] != assign_to_code:
                            candidate_obj.transfer_history = current + '-' + assign_to_code
                    else:
                        if assigned_from_code and assigned_from_code != assign_to_code:
                            candidate_obj.transfer_history = f"{assigned_from_code}-{assign_to_code}"
                        else:
                            candidate_obj.transfer_history = assign_to_code
                else:
                    if assigned_from_code and assigned_from_code != assign_to_code:
                        candidate_obj.transfer_history = f"{assigned_from_code}-{assign_to_code}"
                    else:
                        candidate_obj.transfer_history = assign_to_code
                candidate_obj.save(update_fields=['transfer_history'])
            except Exception:
                pass
            
            # Update candidate's executive_name to store the employee code in the backend
            # The frontend will handle displaying the first and last name
            if client_job.candidate:
                # Store just the employee code in the database
                client_job.candidate.executive_name = assign_to_code
                client_job.candidate.save(update_fields=['executive_name'])
                logger.info(f"Updated candidate {client_job.candidate.id} executive_name to employee code: {assign_to_code}")
                
                # The frontend should look up the employee details using the code to display the name
            
            logger.info(f"Successfully assigned ClientJob {client_job.id} to {assign_to_employee.firstName} ({assign_to_code})")
            
            # Add assignment feedback if provided
            if feedback_text:
                # Convert empty string to None for profile_submission
                profile_submission = request.data.get('profile_submission')
                if profile_submission == '':
                    profile_submission = None
                
                # Log the values for debugging
                logger.info(f"Adding feedback - profile_submission: {profile_submission}, type: {type(profile_submission)}")
                
                client_job.add_feedback(
                    feedback_text=feedback_text,
                    remarks=remarks,
                    nfd_date=nfd_date,
                    entry_by=current_user_name,
                    call_status='assignment',
                    profile_submission=profile_submission
                )
            
            # Create JobAssignmentHistory record for audit trail
            from .models import JobAssignmentHistory
            assignment_reason = 'manual_reassignment' if original_assign_to else 'initial_assignment'
            JobAssignmentHistory.objects.create(
                client_job=client_job,
                candidate=client_job.candidate,
                previous_owner=assigned_from_code,  # Use the resolved assigned_from_code
                new_owner=assign_to_code,
                assigned_by=assign_by_code,
                reason=assignment_reason,
                notes=feedback_text or f"Profile assigned to {assign_to_employee.firstName}",
                created_by=entry_by,
                updated_by=entry_by,
                updated_at=timezone.now()
            )
            logger.info(f"Created JobAssignmentHistory record: {assigned_from_code} -> {assign_to_code} (Reason: {assignment_reason})")
            
            # Update CallDetails events - remove from old employee, add to new employee
            try:
                from events.views import update_events_on_assignment
                logger.info(f"Updating CallDetails events for assignment...")
                update_events_on_assignment(
                    candidate_id=client_job.candidate.id,
                    old_employee_code=assigned_from_code,
                    new_employee_code=assign_to_code
                )
                logger.info(f"Successfully updated CallDetails events")
            except Exception as e:
                logger.error(f"Error updating CallDetails events: {str(e)}", exc_info=True)
                # Don't fail the assignment if event update fails
            try:
                b2_id, t2_id = _resolve_branch_team_by_employee_code(assign_to_code, client_job.id)
                CandidateStatusHistory.create_status_entry(
                    candidate_id=client_job.candidate.id,
                    remarks=remarks or 'Profile Assigned',
                    change_date=timezone.now().date(),
                    created_by=assign_by_code,
                    extra_notes=feedback_text or None,
                    client_job_id=client_job.id,
                    vendor_id=None,
                    client_name=client_job.client_name,
                    profile_submission=None,
                    branch_id=b2_id,
                    team_id=t2_id,
                    employee_id=assign_to_code
                )
            except Exception as e:
                logger.error(f"Error creating status history on assignment: {str(e)}", exc_info=True)
            
            # OPTIMIZED: Get assignment info for response
            assignment_info = client_job.get_assignment_info()
            
            # Determine action type
            action_type = "reassigned" if original_assign_to else "assigned"
            
            # OPTIMIZED: Simplified response data
            response_data = {
                "status": f"Candidate {action_type} successfully",
                "assignment_info": assignment_info,
                "message": f"Candidate {client_job.candidate.candidate_name} {action_type} to {assign_to_employee.firstName} ({assign_to_code}) for client {client_job.client_name}",
                "client_job_id": client_job.id,
                "assign_to": client_job.assign_to,
                "assign_by": client_job.assign_by
            }
            
            logger.info(f"Assignment completed successfully for ClientJob {pk}")
            return Response(response_data)
            
        except ClientJob.DoesNotExist:
            logger.error(f"ClientJob with ID {pk} not found")
            return Response({"error": f"ClientJob with ID {pk} not found"}, status=404)
        except Exception as e:
            logger.error(f"Assignment failed for ClientJob ID {pk}: {str(e)}", exc_info=True)
            return Response({"error": "Assignment failed", "details": str(e)}, status=500)


    @action(detail=True, methods=['get'], url_path='check-assignment-status')
    def check_assignment_status(self, request, pk=None):
        """
        Check assignment status for a specific client job
        Usage: GET /api/candidate/client-jobs/{id}/check-assignment-status/
        """
        try:
            client_job = self.get_object()
            
            from datetime import datetime, timedelta
            from django.utils import timezone
            
            current_datetime = timezone.now()
            
            # Calculate NFD expiry details using common threshold
            nfd_info = {}
            if client_job.next_follow_up_date:
                # Use common expiry threshold
                expiry_cutoff = get_nfd_expiry_threshold()
                is_expired = client_job.next_follow_up_date < expiry_cutoff
                
                nfd_info = {
                    'nfd_date': client_job.next_follow_up_date.strftime('%d/%m/%Y'),
                    'expiry_cutoff': str(expiry_cutoff),
                    'current_datetime': current_datetime.isoformat(),
                    'is_expired': is_expired
                }
            
            status_info = {
                'client_job_id': client_job.id,
                'client_name': client_job.client_name,
                'candidate_name': client_job.candidate.candidate_name,
                'remarks': client_job.remarks,
                'assign_to': client_job.assign_to,
                'nfd_info': nfd_info,
                'assignment_checks': {
                    'is_open_profile': client_job.remarks and client_job.remarks.lower() == 'open profile',
                    'nfd_expired': nfd_info.get('is_expired', False),
                    'is_assignable': client_job.is_assignable(),
                    'has_current_assignment': bool(client_job.assign_to)
                },
                'frontend_should_show_assign_button': client_job.is_assignable(),
                'reason': 'Open profile' if (client_job.remarks and client_job.remarks.lower() == 'open profile') else ('NFD expired' if nfd_info.get('is_expired', False) else 'Not assignable - NFD not expired')
            }
            
            return Response({
                'success': True,
                'status_info': status_info
            })
            
        except Exception as e:
            return Response({
                'error': f'Status check failed: {str(e)}'
            }, status=500)


    @action(detail=True, methods=['get'], url_path='assignment-info')
    def get_assignment_info(self, request, pk=None):
        """Get assignment information for this client job"""
        try:
            client_job = self.get_object()
            assignment_info = client_job.get_assignment_info()
            
            return Response({
                "assignment_info": assignment_info,
                "can_assign": client_job.is_assignable()
            })
            
        except ClientJob.DoesNotExist:
            return Response({"error": f"ClientJob with ID {pk} not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


# ------------------------------
# Education Certificate View
# ------------------------------
class EducationCertificateViewSet(viewsets.ModelViewSet):
    queryset = EducationCertificate.objects.all()
    serializer_class = EducationCertificateSerializer
    
    def get_queryset(self):
        queryset = EducationCertificate.objects.all()
        candidate_id = self.request.query_params.get('candidate', None)
        if candidate_id is not None:
            queryset = queryset.filter(candidate_id=candidate_id)
        return queryset


# ------------------------------
# Experience Company View
# ------------------------------
class ExperienceCompanyViewSet(viewsets.ModelViewSet):
    queryset = ExperienceCompany.objects.all()
    serializer_class = ExperienceCompanySerializer
    
    def get_queryset(self):
        queryset = ExperienceCompany.objects.all()
        candidate_id = self.request.query_params.get('candidate', None)
        if candidate_id is not None:
            queryset = queryset.filter(candidate_id=candidate_id)
        return queryset


# ------------------------------
# Previous Company View
# ------------------------------
class PreviousCompanyViewSet(viewsets.ModelViewSet):
    queryset = PreviousCompany.objects.all()
    serializer_class = PreviousCompanySerializer

    def get_queryset(self):
        queryset = PreviousCompany.objects.all()
        candidate_id = self.request.query_params.get('candidate', None)
        if candidate_id is not None:
            queryset = queryset.filter(candidate_id=candidate_id)
        return queryset


# ------------------------------
# Additional Info View
# ------------------------------
class AdditionalInfoViewSet(viewsets.ModelViewSet):
    queryset = AdditionalInfo.objects.all()
    serializer_class = AdditionalInfoSerializer
    
    def get_queryset(self):
        queryset = AdditionalInfo.objects.all()
        candidate_id = self.request.query_params.get('candidate', None)
        if candidate_id is not None:
            queryset = queryset.filter(candidate_id=candidate_id)
        return queryset



class CandidateRevenueViewSet(viewsets.ModelViewSet):
    queryset = CandidateRevenue.objects.select_related(
        'candidate', 'client_job'
    ).only(
        "id",
        "candidate_id",
        "client_job_id",
        "created_at",
        "updated_at",
        "is_deleted",
        "revenue",
        # candidate essential fields
        "candidate__executive_name",
        "candidate__city",
        # client job fields
        "client_job__client_name",
    )
    serializer_class = CandidateRevenueSerializer
    pagination_class = RevenuePagination  # ENABLE PAGINATION

    def get_queryset(self):
        qs = CandidateRevenue.objects.select_related(
            "candidate",
            "client_job"
        ).filter(is_deleted=False)

        # --------------------------
        #  OPTIMIZED FILTER ORDER 
        # --------------------------

        # 1) Date Range (Best selectivity first)
        from_date = self.request.query_params.get("from_date")
        to_date = self.request.query_params.get("to_date")

        if from_date:
            try:
                date_obj = datetime.strptime(from_date[:10], "%Y-%m-%d").date()
                qs = qs.filter(joining_date__gte=date_obj)
            except Exception:
                pass

        if to_date:
            try:
                date_obj = datetime.strptime(to_date[:10], "%Y-%m-%d").date()
                qs = qs.filter(joining_date__lte=date_obj)
            except Exception:
                pass

        candidate_id = self.request.query_params.get("candidate")
        if candidate_id:
            qs = qs.filter(candidate_id=candidate_id)

        # 2) Branch name Executive codes Candidate
        branch_name = self.request.query_params.get("branch_name")
        if branch_name:
            exec_codes = Employee.objects.filter(
                branch__iexact=branch_name
            ).values_list("employeeCode", flat=True)

            qs = qs.filter(candidate__executive_name__in=exec_codes)

        # 3) Employee Code
        employee_code = self.request.query_params.get("employee")
        if employee_code:
            qs = qs.filter(candidate__executive_name__iexact=employee_code)

        # 4) Client Name - Optimized filtering
        client = self.request.query_params.get("client")
        if client:
            # First try exact match (faster, can use index if available)
            qs = qs.filter(
                candidate__client_jobs__client_name__iexact=client
            )
            
            # If no results and search term is long enough, fall back to contains
            if not qs.exists() and len(client) > 3:
                qs = qs.filter(
                    candidate__client_jobs__client_name__icontains=client
                )
                
            # Only use distinct() if we had to fall back to contains
            if 'icontains' in str(qs.query):
                qs = qs.distinct()

        # 5) City
        city = self.request.query_params.get("city")
        if city:
            qs = qs.filter(candidate__city__iexact=city)

        # --------------------------
        # ORDER BY ID (INDEXED)
        # --------------------------
        return qs.order_by("-id")

    def list(self, request, *args, **kwargs):
        """List revenues with aggregated status counts for header summary.

        Returns normal paginated response plus:
        - claimed_count
        - pending_count
        - processing_count (includes 'Processing' and 'Process')
        - joined_count (by candidate client_job.profilestatus)
        - abscond_count (by candidate client_job.profilestatus)
        """
        queryset = self.filter_queryset(self.get_queryset())

        # Compute global counts on the fully filtered queryset (before pagination)
        processing_q = Q(revenue_status__iexact="Processing") | Q(revenue_status__iexact="Process")

        # Exclude Abscond profiles from status counts
        non_abscond_qs = queryset.exclude(candidate__client_jobs__profilestatus__iexact="Abscond")

        claimed_count = non_abscond_qs.filter(revenue_status__iexact="Claimed").count()
        pending_count = non_abscond_qs.filter(revenue_status__iexact="Pending").count()
        processing_count = non_abscond_qs.filter(processing_q).count()

        # Joined / Abscond derived from latest client jobs' profilestatus; we approximate
        # by filtering on related ClientJob profilestatus. This matches the frontend
        # semantics closely enough for header summaries.
        joined_qs = queryset.filter(candidate__client_jobs__profilestatus__iexact="Joined")
        abscond_qs = queryset.filter(candidate__client_jobs__profilestatus__iexact="Abscond")

        joined_count = joined_qs.count()
        abscond_count = abscond_qs.count()

        # Total revenue should follow the same business rule as the frontend header:
        # only Joined profiles contribute to total, Abscond and others are excluded.
        total_revenue_value = joined_qs.aggregate(total=Sum("revenue"))[["total"] if False else "total"] or 0

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)

            # Attach aggregated counts to the paginated payload
            response.data["claimed_count"] = claimed_count
            response.data["pending_count"] = pending_count
            response.data["processing_count"] = processing_count
            response.data["joined_count"] = joined_count
            response.data["abscond_count"] = abscond_count
            response.data["total_revenue"] = total_revenue_value
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "count": queryset.count(),
                "results": serializer.data,
                "claimed_count": claimed_count,
                "pending_count": pending_count,
                "processing_count": processing_count,
                "joined_count": joined_count,
                "abscond_count": abscond_count,
                "total_revenue": total_revenue_value,
            }
        )

    # Ensure profilestatus on ClientJob is kept in sync when revenues are created/updated
    def _update_clientjob_profilestatus(self, candidate_id, status_value):
        """Update the latest ClientJob's profilestatus for the given candidate.

        Accepts values from either 'profilestatus' or 'profile_status' sent by the frontend.
        Safe no-op if candidate has no client jobs or status_value is falsy.
        """
        try:
            if not (candidate_id and status_value):
                return
            # Prefer most recently updated job; fallback by id
            latest_job = (
                ClientJob.objects
                .filter(candidate_id=candidate_id)
                .order_by('-updated_at', '-id')
                .first()
            )
            if latest_job:
                latest_job.profilestatus = status_value
                latest_job.save(update_fields=['profilestatus', 'updated_at'])
        except Exception as e:
            # Do not block revenue save due to status sync issues
            logger.exception(f"Failed to sync profilestatus for candidate {candidate_id}: {e}")

    def _attach_latest_client_job(self, instance):
        try:
            if instance.client_job_id or not instance.candidate_id:
                return
            latest_job = (
                ClientJob.objects
                .filter(candidate_id=instance.candidate_id)
                .order_by('-updated_at', '-id')
                .first()
            )
            if latest_job:
                instance.client_job = latest_job
                instance.save(update_fields=['client_job', 'updated_at'])
        except Exception as e:
            logger.exception(f"Failed to attach client job for revenue {instance.id}: {e}")

    def perform_create(self, serializer):
        instance = serializer.save()
        # Read from request without requiring serializer field
        status_value = (
            self.request.data.get('profilestatus')
            or self.request.data.get('profile_status')
            or self.request.data.get('profileStatus')
        )
        self._update_clientjob_profilestatus(instance.candidate_id, status_value)
        self._attach_latest_client_job(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        status_value = (
            self.request.data.get('profilestatus')
            or self.request.data.get('profile_status')
            or self.request.data.get('profileStatus')
        )
        self._update_clientjob_profilestatus(instance.candidate_id, status_value)
        self._attach_latest_client_job(instance)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])
        return Response(status=status.HTTP_204_NO_CONTENT)



class CandidateRevenueFeedbackViewSet(viewsets.ModelViewSet):
    queryset = CandidateRevenueFeedback.objects.all()
    serializer_class = CandidateRevenueFeedbackSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        candidate_revenue_id = self.request.query_params.get("candidate_revenue_id")
        if candidate_revenue_id:
            queryset = queryset.filter(candidate_revenue_id=candidate_revenue_id)
        return queryset


# ------------------------------
# Resume Parse API View
# ------------------------------
class WordToPdfConvertAPIView(APIView):
    """
    API view to convert Word documents to PDF
    """
    def post(self, request):
        """
        Convert uploaded Word document to PDF
        """
        try:
            print("=== WordToPdfConvertAPIView POST request received ===")
            
            if 'file' not in request.FILES:
                print("ERROR: No file in request")
                return Response(
                    {'error': 'No file provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            word_file = request.FILES['file']
            print(f"File received: {word_file.name}, size: {word_file.size}, type: {word_file.content_type}")
            
            # Check if file is a Word document
            allowed_types = [
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]
            
            if word_file.content_type not in allowed_types:
                print(f"ERROR: Invalid file type: {word_file.content_type}")
                return Response(
                    {'error': 'Only Word documents (.doc, .docx) are supported'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Test basic imports first
            try:
                print("Testing imports...")
                import tempfile
                import os
                from .utils import convert_docx_to_pdf
                print("All imports successful")
            except Exception as import_error:
                print(f"IMPORT ERROR: {import_error}")
                return Response(
                    {'error': f'Import error: {str(import_error)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Create temporary directory for processing
            with tempfile.TemporaryDirectory() as temp_dir:
                print(f"Created temp directory: {temp_dir}")
                
                # Save uploaded Word file temporarily
                word_filename = word_file.name
                word_path = os.path.join(temp_dir, word_filename)
                print(f"Saving file to: {word_path}")
                
                with open(word_path, 'wb') as f:
                    for chunk in word_file.chunks():
                        f.write(chunk)
                
                print(f"File saved successfully, size: {os.path.getsize(word_path)} bytes")
                
                # Convert Word to PDF
                print("Starting PDF conversion...")
                pdf_path = convert_docx_to_pdf(word_path, temp_dir)
                print(f"PDF conversion result: {pdf_path}")
                
                if pdf_path and os.path.exists(pdf_path):
                    print(f"PDF file exists: {pdf_path}, size: {os.path.getsize(pdf_path)} bytes")
                    
                    # Read PDF content
                    with open(pdf_path, 'rb') as pdf_file:
                        pdf_content = pdf_file.read()
                    
                    if len(pdf_content) > 0:
                        print(f"Returning PDF content: {len(pdf_content)} bytes")
                        response = HttpResponse(
                            pdf_content,
                            content_type='application/pdf'
                        )
                        response['Content-Disposition'] = f'inline; filename="{os.path.splitext(word_filename)[0]}.pdf"'
                        response['Access-Control-Allow-Origin'] = '*'
                        return response
                    else:
                        print("ERROR: Generated PDF is empty")
                        return Response(
                            {'error': 'Generated PDF is empty'}, 
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR
                        )
                else:
                    print("ERROR: PDF file not created")
                    return Response(
                        {'error': 'PDF conversion failed - unable to create PDF file'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
        except Exception as e:
            print(f"CRITICAL ERROR in WordToPdfConvertAPIView: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Critical error: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FileUploadView(APIView):
    """
    API endpoint for handling file uploads.
    """
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request, *args, **kwargs):
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        file_obj = request.FILES['file']
        field_name = request.POST.get('field', '')
        
        # Generate a unique filename
        file_ext = os.path.splitext(file_obj.name)[1]
        filename = f"{uuid.uuid4()}{file_ext}"
        
        # Save the file
        file_path = os.path.join('uploads', field_name, filename)
        saved_path = default_storage.save(file_path, file_obj)
        
        # Get the file URL
        file_url = default_storage.url(saved_path)
        
        # If using local development, prepend the full URL
        if settings.DEBUG:
            file_url = f"http://{request.get_host()}{file_url}"
        
        return Response({
            'success': True,
            'file_url': file_url,
            'file_path': saved_path,
            'field': field_name
        })


class ResumeParseAPIView(APIView):
    """
    API endpoint for parsing resume files.
    Accepts POST requests with resume files and returns parsed data.
    Enhanced to handle Word documents by converting them to PDF first.
    """
    
    def post(self, request):
        """
        Parse a resume file and return extracted information.
        Expects a file in the request data.
        For Word documents, converts to PDF first, then parses.
        """
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        resume_file = request.FILES['file']
        file_to_parse = resume_file
        
        try:
            # Check if it's a Word document that needs conversion
            word_types = [
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]
            
            if resume_file.content_type in word_types:
                # Use alternative parser for Word documents (no PDF conversion needed)
                with tempfile.TemporaryDirectory() as temp_dir:
                    # Save uploaded Word file temporarily
                    word_filename = resume_file.name
                    word_path = os.path.join(temp_dir, word_filename)
                    
                    with open(word_path, 'wb') as f:
                        for chunk in resume_file.chunks():
                            f.write(chunk)
                    
                    # Parse the Word document directly
                    parsed_data = alternative_parse_resume(word_path)
            else:
                # Parse the file directly (PDF or other supported formats)
                parsed_data = parse_resume(resume_file)
            
            if not parsed_data:
                return Response(
                    {'error': 'Failed to parse resume'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response(parsed_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error parsing resume: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



# ========================================
# UNIFIED WORKFLOW API ENDPOINTS
# ========================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clone_candidate_for_client(request):
    """
    Clone an existing candidate for a new client assignment.
    Creates a new candidate record with new profile number and new client job.
    
    Payload:
    {
        "original_candidate_id": 123,
        "original_client_job_id": 456,  // Optional - if not provided, uses first ClientJob
        "new_client_name": "New Company Ltd",
        "new_designation": "Senior Developer",
        "new_executive_name": "John Doe",
        "remarks": "Wait for the clearaction",
        "next_follow_up_date": "2025-10-30",
        "feedback": "Assigned to Bharti AXA Life Insurance Co ltd",
        "job_id": 789,  // Optional - link to job_openings table
        "notes": "Urgent requirement"
    }
    """
    try:
        # Get request data
        original_candidate_id = request.data.get('original_candidate_id')
        original_client_job_id = request.data.get('original_client_job_id')
        new_client_name = request.data.get('new_client_name')
        new_designation = request.data.get('new_designation')
        new_executive_name = request.data.get('new_executive_name')
        remarks = request.data.get('remarks', 'new profile')
        next_follow_up_date = request.data.get('next_follow_up_date')
        feedback = request.data.get('feedback', '')
        job_id = request.data.get('job_id')
        notes = request.data.get('notes', '')
        
        # Validate required fields
        if not all([original_candidate_id, new_client_name, new_designation, new_executive_name]):
            return Response({
                'error': 'Missing required fields: original_candidate_id, new_client_name, new_designation, new_executive_name'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the original client job
        try:
            if original_client_job_id:
                original_client_job = ClientJob.objects.get(
                    id=original_client_job_id,
                    candidate_id=original_candidate_id
                )
            else:
                # If no specific ClientJob provided, use the first one for this candidate
                original_client_job = ClientJob.objects.filter(
                    candidate_id=original_candidate_id
                ).first()
                
                if not original_client_job:
                    return Response({
                        'error': f'No ClientJob found for candidate {original_candidate_id}'
                    }, status=status.HTTP_404_NOT_FOUND)
        except ClientJob.DoesNotExist:
            return Response({
                'error': f'ClientJob {original_client_job_id} not found for candidate {original_candidate_id}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get current user info for audit trail
        current_user_name = get_current_user_name(request.user)  # For feedback entries (with name)
        current_user_code = get_current_user_employee_code(request.user)  # For created_by/updated_by fields
        
        # Get the original candidate's executive (account holder)
        original_candidate_executive = original_client_job.candidate.executive_name
        
        # Permission check: Only the candidate's executive can create new client assignments
        if current_user_code != original_candidate_executive:
            return Response({
                'error': f'Only the candidate\'s account holder ({original_candidate_executive}) can assign to new clients. You are: {current_user_code}',
                'permission_denied': True
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Clone the candidate for new client
        # Use original candidate's executive as the new executive (account holder stays same)
        new_candidate, new_client_job = original_client_job.clone_candidate_for_new_client(
            new_client_name=new_client_name,
            new_designation=new_designation,
            new_executive_name=original_candidate_executive,  # Use original executive, not logged-in user
            created_by=current_user_code  # Track who created it
        )
        
        # Update the new ClientJob with additional fields
        if remarks and remarks != 'new profile':
            new_client_job.remarks = remarks
        
        if job_id:
            # Link to the job opening if provided
            new_client_job.job_id = job_id
        
        # Set assign_to to the current logged-in user (who performed the assignment)
        new_client_job.assign_to = current_user_code
        new_client_job.assign_by = current_user_code
        new_client_job.assign = 'assigned'  # Mark as assigned
        new_client_job.employee_id = current_user_code
        
        new_client_job.save()
        
        # Add feedback if provided
        if feedback:
            new_client_job.add_feedback(
                feedback_text=feedback,
                remarks=remarks or "new profile",
                nfd_date=next_follow_up_date,
                entry_by=current_user_name,
                call_status="assignment"
            )
        
        # Add additional notes if provided
        if notes:
            new_client_job.add_feedback(
                feedback_text=f"Additional notes: {notes}",
                remarks=remarks or "new profile",
                entry_by=current_user_name,
                call_status="notes"
            )
        
        # Set next_follow_up_date AFTER add_feedback to prevent it from being cleared
        # The add_feedback method updates date fields based on remarks, so we need to set NFD last
        if next_follow_up_date:
            from datetime import datetime
            try:
                new_client_job.next_follow_up_date = datetime.strptime(next_follow_up_date, '%Y-%m-%d').date()
                new_client_job.save()  # Save again to persist the NFD
                logger.info(f"Set next_follow_up_date to {next_follow_up_date} for ClientJob {new_client_job.id}")
            except ValueError:
                logger.warning(f"Invalid NFD date format: {next_follow_up_date}")
        
        # Serialize the response
        from .serializers import CandidateSerializer, ClientJobSerializer
        candidate_data = CandidateSerializer(new_candidate).data
        client_job_data = ClientJobSerializer(new_client_job).data
        
        return Response({
            'success': True,
            'message': f'Successfully cloned candidate for new client {new_client_name}',
            'original_candidate_id': original_candidate_id,
            'original_profile_number': original_client_job.candidate.profile_number,
            'new_candidate': candidate_data,
            'new_client_job': client_job_data,
            'cloning_notes': notes
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f" Error in clone_candidate_for_client: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'error': f'Failed to clone candidate: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def claim_open_job(request):
    """
    Atomically claim an open profile job.
    Prevents race conditions when multiple executives try to claim the same job.
    
    Payload:
    {
        "client_job_id": 123,
        "notes": "Taking over this profile"
    }
    """
    try:
        # Get request data
        client_job_id = request.data.get('client_job_id')
        notes = request.data.get('notes', '')
        
        # Validate required fields
        if not client_job_id:
            return Response({
                'error': 'Missing required field: client_job_id'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the client job
        try:
            client_job = ClientJob.objects.get(id=client_job_id)
        except ClientJob.DoesNotExist:
            return Response({
                'error': f'ClientJob {client_job_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get current user info
        current_user_name = get_current_user_name(request.user)
        
        # Get employee code for the claiming user
        try:
            from empreg.models import Employee
            employee = Employee.objects.get(user=request.user, del_state=0)
            claiming_user_code = employee.employeeCode
        except Employee.DoesNotExist:
            return Response({
                'error': 'Employee profile not found for current user'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Attempt to claim the job
        try:
            claimed_job = client_job.claim_open_job(
                claiming_user=claiming_user_code,
                claiming_user_name=current_user_name
            )
            
            # Add additional notes if provided
            if notes:
                claimed_job.add_feedback(
                    feedback_text=f"Claim notes: {notes}",
                    remarks="assigned",
                    entry_by=current_user_name,
                    call_status="notes"
                )
            
            # Create assignment history record
            from .models import JobAssignmentHistory
            JobAssignmentHistory.objects.create(
                client_job=claimed_job,
                candidate=claimed_job.candidate,
                previous_owner=None,  # Was open profile
                new_owner=claiming_user_code,
                assigned_by=claiming_user_code,  # Self-assignment
                reason='claimed_open_job',
                notes=notes,
                created_by=current_user_name,
                updated_by=current_user_name,
                updated_at=timezone.now()
            )
            
            # Serialize the response
            from .serializers import ClientJobSerializer
            client_job_data = ClientJobSerializer(claimed_job).data
            
            return Response({
                'success': True,
                'message': f'Successfully claimed job for candidate {claimed_job.candidate.candidate_name}',
                'claimed_by': current_user_name,
                'claimed_by_code': claiming_user_code,
                'client_job': client_job_data,
                'claim_notes': notes
            }, status=status.HTTP_200_OK)
            
        except ValueError as ve:
            # Job already claimed or not available
            return Response({
                'error': str(ve),
                'job_status': {
                    'id': client_job.id,
                    'current_assign_to': client_job.assign_to,
                    'current_remarks': client_job.remarks,
                    'is_assignable': client_job.is_assignable()
                }
            }, status=status.HTTP_409_CONFLICT)
        
    except Exception as e:
        print(f" Error in claim_open_job: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'error': f'Failed to claim job: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_jobs_as_open(request):
    """
    Manually mark jobs as open profile (unassigned).
    Used for manager override or manual intervention.
    
    Payload:
    {
        "client_job_ids": [123, 456, 789],
        "reason": "manager_override",
        "notes": "Reassigning due to workload balancing"
    }
    """
    try:
        # Get request data
        client_job_ids = request.data.get('client_job_ids', [])
        reason = request.data.get('reason', 'manual_intervention')
        notes = request.data.get('notes', '')
        
        # Validate required fields
        if not client_job_ids:
            return Response({
                'error': 'Missing required field: client_job_ids (array)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get current user info
        current_user_name = get_current_user_name(request.user)
        
        # Process each job
        updated_jobs = []
        failed_jobs = []
        
        for job_id in client_job_ids:
            try:
                client_job = ClientJob.objects.get(id=job_id)
                
                # Store original assignment info for history
                original_assign_to = client_job.assign_to
                
                # Mark as open profile
                client_job.mark_as_open_profile(
                    reason=reason,
                    actor=current_user_name
                )
                
                # Create assignment history record
                from .models import JobAssignmentHistory
                from django.utils import timezone
                JobAssignmentHistory.objects.create(
                    client_job=client_job,
                    candidate=client_job.candidate,
                    previous_owner=original_assign_to,
                    new_owner=None,  # Now open profile
                    assigned_by=current_user_name,
                    reason=reason,
                    notes=notes,
                    created_by=current_user_name,
                    updated_by=current_user_name,
                    updated_at=timezone.now()
                )
                
                updated_jobs.append({
                    'id': job_id,
                    'candidate_name': client_job.candidate.candidate_name,
                    'client_name': client_job.client_name,
                    'previous_assign_to': original_assign_to,
                    'new_status': 'open profile'
                })
                
            except ClientJob.DoesNotExist:
                failed_jobs.append({
                    'id': job_id,
                    'error': 'Job not found'
                })
            except Exception as job_error:
                failed_jobs.append({
                    'id': job_id,
                    'error': str(job_error)
                })
        
        return Response({
            'success': True,
            'message': f'Processed {len(client_job_ids)} jobs - {len(updated_jobs)} updated, {len(failed_jobs)} failed',
            'updated_jobs': updated_jobs,
            'failed_jobs': failed_jobs,
            'reason': reason,
            'notes': notes,
            'marked_by': current_user_name
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f" Error in mark_jobs_as_open: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'error': f'Failed to mark jobs as open: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_assignment_history(request):
    """
    Get assignment history for audit trail.
    
    Query parameters:
    - candidate_id: Filter by candidate
    - client_job_id: Filter by client job
    - assigned_by: Filter by who made the assignment
    - reason: Filter by assignment reason
    - limit: Number of records to return (default: 50)
    """
    try:
        from .models import JobAssignmentHistory
        from .serializers import JobAssignmentHistorySerializer
        
        # Get query parameters
        candidate_id = request.query_params.get('candidate_id')
        client_job_id = request.query_params.get('client_job_id')
        assigned_by = request.query_params.get('assigned_by')
        reason = request.query_params.get('reason')
        limit = int(request.query_params.get('limit', 50))
        
        # Build query
        queryset = JobAssignmentHistory.objects.select_related(
            'candidate', 'client_job'
        ).order_by('-created_at')
        
        # Apply filters
        if candidate_id:
            queryset = queryset.filter(candidate_id=candidate_id)
        if client_job_id:
            queryset = queryset.filter(client_job_id=client_job_id)
        if assigned_by:
            queryset = queryset.filter(assigned_by__icontains=assigned_by)
        if reason:
            queryset = queryset.filter(reason=reason)
        
        # Apply limit
        queryset = queryset[:limit]
        
        # Serialize data
        serializer = JobAssignmentHistorySerializer(queryset, many=True)
        
        return Response({
            'success': True,
            'total_records': len(serializer.data),
            'assignment_history': serializer.data,
            'filters_applied': {
                'candidate_id': candidate_id,
                'client_job_id': client_job_id,
                'assigned_by': assigned_by,
                'reason': reason,
                'limit': limit
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f" Error in get_assignment_history: {str(e)}")
        return Response({
            'error': f'Failed to get assignment history: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def update_expired_nfd_status(request):
    """
    API endpoint to test NFD expiry logic and update expired NFDs
    GET: Test NFD expiry for all candidates
    POST: Update expired NFDs
    """
    if request.method == 'GET':
        # Test mode - check NFD expiry for all candidates
        try:
            from django.utils import timezone
            current_date = timezone.now().date()
            
            print(f" NFD EXPIRY TEST - Current date: {current_date}")
            
            # Get all client jobs with NFD dates
            jobs_with_nfd = ClientJob.objects.filter(
                next_follow_up_date__isnull=False
            ).exclude(next_follow_up_date='').order_by('next_follow_up_date')
            
            print(f" Found {jobs_with_nfd.count()} jobs with NFD dates")
            
            expired_jobs = []
            active_jobs = []
            
            for job in jobs_with_nfd:
                try:
                    # Parse NFD date
                    if isinstance(job.next_follow_up_date, str):
                        nfd_date = datetime.strptime(job.next_follow_up_date, '%Y-%m-%d').date()
                    elif hasattr(job.next_follow_up_date, 'date'):
                        nfd_date = job.next_follow_up_date.date()
                    else:
                        nfd_date = job.next_follow_up_date
                    
                    # Calculate expiry (NFD + 1 day grace period)
                    expiry_date = nfd_date + timedelta(days=1)
                    is_expired = current_date > expiry_date
                    
                    job_info = {
                        'job_id': job.id,
                        'candidate_name': job.candidate.candidate_name if job.candidate else 'Unknown',
                        'nfd_date': str(nfd_date),
                        'expiry_date': str(expiry_date),
                        'is_expired': is_expired,
                        'remarks': job.remarks or 'No remarks'
                    }
                    
                    if is_expired:
                        expired_jobs.append(job_info)
                    else:
                        active_jobs.append(job_info)
                        
                except (ValueError, TypeError, AttributeError) as e:
                    print(f"   Error parsing NFD for job {job.id}: {str(e)}")
                    continue
            
            return Response({
                'success': True,
                'current_date': str(current_date),
                'total_jobs_with_nfd': jobs_with_nfd.count(),
                'expired_jobs': expired_jobs,
                'active_jobs': active_jobs,
                'expired_count': len(expired_jobs),
                'active_count': len(active_jobs)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f" Error in NFD expiry test: {str(e)}")
            return Response({
                'error': f'Failed to test NFD expiry: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    else:  # POST method - Update expired NFDs
        try:
            from django.utils import timezone
            from django.conf import settings
            from datetime import datetime
            
            # Handle both USE_TZ=True and USE_TZ=False
            if settings.USE_TZ:
                current_date = timezone.now().date()
            else:
                current_date = datetime.now().date()
            
            # Check cache first for performance optimization
            cache_key = 'nfd_update_last_run'
            cache_timeout = 30 * 60  # 30 minutes in seconds
            
            try:
                last_run_data = cache.get(cache_key)
                if last_run_data:
                    last_run_time = last_run_data.get('timestamp')
                    if last_run_time:
                        # Handle both timezone-aware and naive datetimes
                        current_time = timezone.now() if settings.USE_TZ else datetime.now()
                        time_since = (current_time - last_run_time).total_seconds()
                        if time_since < cache_timeout:
                            # Return cached response immediately
                            minutes_ago = int(time_since / 60)
                            print(f" NFD AUTO-UPDATE: Skipping update (last update was {minutes_ago} minutes ago)")
                            return Response({
                                'success': True,
                                'message': f'NFD auto-update skipped (last run {minutes_ago} minutes ago)',
                                'updated_count': 0,
                                'cached': True,
                                'current_date': str(current_date),
                                'expiry_threshold': str(get_nfd_expiry_threshold())
                            }, status=status.HTTP_200_OK)
            except Exception as cache_error:
                # If cache fails, log but continue with update
                print(f" Warning: Cache check failed: {str(cache_error)}, continuing with update...")
            
            print(f" NFD AUTO-UPDATE - Current date: {current_date}")
            
            # Use common NFD expiry threshold
            expiry_threshold = get_nfd_expiry_threshold()
            
            # Test with a specific NFD date for debugging
            test_nfd = current_date - timedelta(days=2)  # 2 days ago
            
            print(f"   Current date: {current_date}")
            print(f"   Expiry threshold: {expiry_threshold}")
            print(f"   Test NFD: {test_nfd}")
            print(f"   Is test NFD expired: {test_nfd < expiry_threshold}")
            
            test_jobs = ClientJob.objects.filter(next_follow_up_date=test_nfd)
            print(f" Found {test_jobs.count()} jobs with NFD {test_nfd}")
            
            for job in test_jobs[:3]:  # Show first 3 for debugging
                candidate_name = job.candidate.candidate_name if job.candidate else 'Unknown'
                print(f"   - Job {job.id}: NFD={job.next_follow_up_date}, Candidate={candidate_name}, Remarks='{job.remarks}'")
            
            # Get all expired jobs
            expired_jobs = ClientJob.objects.filter(
                next_follow_up_date__lt=expiry_threshold,
                next_follow_up_date__isnull=False
            )
            
            print(f" Found {expired_jobs.count()} expired jobs to update")
            
            # Show some examples
            for job in expired_jobs[:5]:  # Show first 5 for debugging
                candidate_name = job.candidate.candidate_name if job.candidate else 'Unknown'
                
                print(f"   - Job {job.id}: NFD={job.next_follow_up_date}, Candidate={candidate_name}, Remarks='{job.remarks}'")
        
            updated_count = ClientJob.update_all_expired_nfd_jobs()
            
            # Cache the update timestamp for 30 minutes
            try:
                current_time = timezone.now() if settings.USE_TZ else datetime.now()
                cache.set(cache_key, {
                    'timestamp': current_time,
                    'updated_count': updated_count
                }, cache_timeout)
            except Exception as cache_error:
                # If cache set fails, log but continue
                print(f" Warning: Failed to cache update result: {str(cache_error)}")
            
            print(f" NFD AUTO-UPDATE: Completed - {updated_count} jobs updated, cached for 30 minutes")
            
            return Response({
                'success': True,
                'message': f'NFD auto-update completed - {updated_count} jobs updated',
                'updated_count': updated_count,
                'current_date': str(current_date),
                'expiry_threshold': str(expiry_threshold)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f" Critical error in update_expired_nfd_status: {str(e)}")
            import traceback
            error_traceback = traceback.format_exc()
            print(error_traceback)
            
            # Log detailed error information
            error_details = {
                'error_type': type(e).__name__,
                'error_message': str(e),
                'traceback': error_traceback
            }
            print(f" Error details: {error_details}")
            
            return Response({
                'success': False,
                'error': f'Failed to update expired NFD status: {str(e)}',
                'error_type': type(e).__name__,
                'updated_count': 0
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_expired_nfd_jobs(request):
    """
    API endpoint to check which client jobs have expired NFD dates
    without updating them. Useful for monitoring and debugging.
    """
    try:
        from django.utils import timezone
        
        # Get current datetime
        current_datetime = timezone.now()
        
        # Use common NFD expiry threshold
        expiry_threshold = get_nfd_expiry_threshold()
        
        expired_jobs = ClientJob.objects.filter(
            next_follow_up_date__lt=expiry_threshold,
            next_follow_up_date__isnull=False
        ).exclude(next_follow_up_date='').select_related('candidate')[:50]  # Limit to 50 for performance
        
        expired_job_data = []
        for job in expired_jobs:
            expired_job_data.append({
                'job_id': job.id,
                'candidate_id': job.candidate.id if job.candidate else None,
                'candidate_name': job.candidate.candidate_name if job.candidate else 'Unknown',
                'nfd_date': str(job.next_follow_up_date),
                'remarks': job.remarks or 'No remarks',
                'client_name': job.client_name or 'No client',
                'designation': job.designation or 'No designation',
                'days_expired': (current_datetime.date() - job.next_follow_up_date).days if job.next_follow_up_date else 0
            })
        
        return Response({
            'success': True,
            'current_datetime': current_datetime.isoformat(),
            'expiry_threshold': str(expiry_threshold),
            'expired_jobs_count': len(expired_job_data),
            'expired_jobs': expired_job_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to check expired NFD jobs: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_expired_job_cleanup(request):
    """
    Run the automated cleanup for expired NFD jobs.
    This marks all expired jobs as open profile automatically.
    Should be called periodically (e.g., daily cron job).
    """
    try:
        # Get current user info
        current_user_name = get_current_user_name(request.user)
        
        # Run the cleanup
        updated_count = ClientJob.update_all_expired_nfd_jobs()
        
        return Response({
            'success': True,
            'message': f'Expired job cleanup completed - {updated_count} jobs marked as open profile',
            'updated_count': updated_count,
            'run_by': current_user_name,
            'run_at': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f" Error in run_expired_job_cleanup: {str(e)}")
        return Response({
            'error': f'Failed to run expired job cleanup: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_in_list(request):
    """
    Get all profiles assigned TO the current user (Profile IN).
    Shows profiles where assign_to = current user's employee code.
    Supports pagination and date filtering.
    """
    try:
        # Get current user's employee code (optimized query)
        username = request.user.username
        
        # Normalize username to handle different formats
        # Convert formats like "EMP00040-1", "EMP00040", "Emp00040" to "Emp/00040"
        normalized_username = username
        if username and len(username) >= 8:
            # Remove any suffix like "-1"
            base_username = username.split('-')[0]
            # Check if it matches employee code pattern (EMP or Emp followed by digits)
            if base_username.upper().startswith('EMP') and base_username[3:].isdigit():
                # Normalize to Emp/XXXXX format
                normalized_username = f"Emp/{base_username[3:]}"
                print(f"ProfileIN: Normalized username from '{username}' to '{normalized_username}'")
        
        # Try to find employee using multiple lookup methods
        employee = Employee.objects.filter(
            Q(user=request.user) |                      # By user object
            Q(employeeCode=username) |                  # By original username
            Q(employeeCode=normalized_username) |       # By normalized username
            Q(phone1=username) |                        # By phone1
            Q(phone2=username),                         # By phone2
            del_state=0
        ).only('employeeCode').first()
        
        if employee:
            emp_code = employee.employeeCode
            print(f"ProfileIN: Found employee code: {emp_code}")
            print(f"ProfileIN: Employee code type: {type(emp_code)}, repr: {repr(emp_code)}")
        else:
            # Fallback to normalized username if no employee found
            emp_code = normalized_username if normalized_username != username else username
            print(f"ProfileIN: Using fallback emp_code: {emp_code}")

        # Base query - profiles assigned TO this user (optimized with only/defer)
        queryset = ClientJob.objects.filter(
            assign_to=emp_code,      # Assigned TO current user
            assign='assigned'        # Status is 'assigned'
        ).select_related('candidate').only(
            'id', 'client_name', 'designation', 'current_ctc', 'expected_ctc',
            'remarks', 'next_follow_up_date', 'expected_joining_date', 'interview_date',
            'transfer_date', 'assigned_from', 'assign_to', 'assign_by', 'assign',
            'created_at', 'updated_at',
            'candidate__id', 'candidate__candidate_name', 'candidate__mobile1', 
            'candidate__profile_number', 'candidate__executive_name', 'candidate__city', 
            'candidate__state', 'candidate__source'
        )
        
        # Date filtering - make both fields optional
        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')
        
        if from_date:
            try:
                from_date_obj = datetime.strptime(from_date, '%Y-%m-%d').date()
                queryset = queryset.filter(transfer_date__date__gte=from_date_obj)
                print(f"ProfileIN: Filtering from date: {from_date}")
            except ValueError:
                print(f"ProfileIN: Invalid from_date format: {from_date}")
                
        if to_date:
            try:
                to_date_obj = datetime.strptime(to_date, '%Y-%m-%d').date()
                queryset = queryset.filter(transfer_date__date__lte=to_date_obj)
                print(f"ProfileIN: Filtering to date: {to_date}")
            except ValueError:
                print(f"ProfileIN: Invalid to_date format: {to_date}")
                
        # If no date filters are provided, show records from the last 30 days by default
        if not from_date and not to_date:
            thirty_days_ago = timezone.now().date() - timezone.timedelta(days=30)
            queryset = queryset.filter(transfer_date__date__gte=thirty_days_ago)
            print("ProfileIN: No date filters provided, showing last 30 days of data")
        
        # Additional filters
        client = request.GET.get('client')
        if client:
            queryset = queryset.filter(client_name__icontains=client)
            print(f"ProfileIN: Filtering by client: {client}")
        
        executive = request.GET.get('executive')
        if executive:
            queryset = queryset.filter(
                Q(candidate__executive_name__icontains=executive) |
                Q(assigned_from__icontains=executive)
            )
            print(f"ProfileIN: Filtering by executive: {executive}")
        
        state = request.GET.get('state')
        if state:
            queryset = queryset.filter(candidate__state__icontains=state)
            print(f"ProfileIN: Filtering by state: {state}")
        
        # Order by transfer date (most recent first)
        queryset = queryset.order_by('-transfer_date')
        
        # Pagination parameters
        page = request.GET.get('page', 1)
        page_size = request.GET.get('page_size', 25)
        
        try:
            page = int(page)
            page_size = int(page_size)
        except ValueError:
            page = 1
            page_size = 25
        
        # Early return check using exists() - much faster than count()
        if not queryset.exists():
            print(f"ProfileIN: No profiles found for {emp_code}")
            return Response({
                'success': True,
                'count': 0,
                'page': 1,
                'page_size': page_size,
                'total_pages': 0,
                'data': []
            }, status=status.HTTP_200_OK)
        
        # Get total count for pagination
        total_count = queryset.count()
        print(f"ProfileIN: Found {total_count} profiles assigned to {emp_code}")
        
        # Calculate pagination
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        
        # Paginate the queryset
        paginated_queryset = queryset[start_index:end_index]

        # Serialize the data (with optimized serializer)
        from .serializers import ProfileInSerializer
        serializer = ProfileInSerializer(paginated_queryset, many=True)
        serialized_data = serializer.data
        
        return Response({
            'success': True,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'data': serialized_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"ProfileIN: Error in profile_in_list: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'error': f'Failed to load profile IN data: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_out_list(request):
    """
    Get all profiles assigned FROM the current user (Profile OUT).
    Shows profiles where assigned_from = current user's employee code.
    Supports pagination and date filtering.
    """
    try:
        # Get current user's employee code (optimized query)
        username = request.user.username
        
        # Normalize username to handle different formats
        # Convert formats like "EMP00040-1", "EMP00040", "Emp00040" to "Emp/00040"
        normalized_username = username
        if username and len(username) >= 8:
            # Remove any suffix like "-1"
            base_username = username.split('-')[0]
            # Check if it matches employee code pattern (EMP or Emp followed by digits)
            if base_username.upper().startswith('EMP') and base_username[3:].isdigit():
                # Normalize to Emp/XXXXX format
                normalized_username = f"Emp/{base_username[3:]}"
                print(f"ProfileOUT: Normalized username from '{username}' to '{normalized_username}'")
        
        # Try to find employee using multiple lookup methods
        employee = Employee.objects.filter(
            Q(user=request.user) |                      # By user object
            Q(employeeCode=username) |                  # By original username
            Q(employeeCode=normalized_username) |       # By normalized username
            Q(phone1=username) |                        # By phone1
            Q(phone2=username),                         # By phone2
            del_state=0
        ).only('employeeCode').first()
        
        if employee:
            emp_code = employee.employeeCode
            print(f"ProfileOUT: Found employee code: {emp_code}")
            print(f"ProfileOUT: Employee code type: {type(emp_code)}, repr: {repr(emp_code)}")
        else:
            # Fallback to normalized username if no employee found
            emp_code = normalized_username if normalized_username != username else username
            print(f"ProfileOUT: Using fallback emp_code: {emp_code}")

        # Base query - profiles assigned FROM this user (optimized with only/defer)
        queryset = ClientJob.objects.filter(
            assigned_from=emp_code,    # Assigned FROM current user
            assign='assigned'          # Status is 'assigned'
        ).select_related('candidate').only(
            'id', 'client_name', 'designation', 'current_ctc', 'expected_ctc',
            'remarks', 'next_follow_up_date', 'expected_joining_date', 'interview_date',
            'transfer_date', 'assigned_from', 'assign_to', 'assign_by', 'assign',
            'created_at', 'updated_at',
            'candidate__id', 'candidate__candidate_name', 'candidate__mobile1', 
            'candidate__profile_number', 'candidate__executive_name', 'candidate__city', 
            'candidate__state', 'candidate__source'
        )
        
        # Date filtering - make both fields optional
        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')
        
        if from_date:
            try:
                from_date_obj = datetime.strptime(from_date, '%Y-%m-%d').date()
                queryset = queryset.filter(transfer_date__date__gte=from_date_obj)
                print(f"ProfileOUT: Filtering from date: {from_date}")
            except ValueError:
                print(f"ProfileOUT: Invalid from_date format: {from_date}")
                
        if to_date:
            try:
                to_date_obj = datetime.strptime(to_date, '%Y-%m-%d').date()
                queryset = queryset.filter(transfer_date__date__lte=to_date_obj)
                print(f"ProfileOUT: Filtering to date: {to_date}")
            except ValueError:
                print(f"ProfileOUT: Invalid to_date format: {to_date}")
                
        # If no date filters are provided, show records from the last 30 days by default
        if not from_date and not to_date:
            thirty_days_ago = timezone.now().date() - timezone.timedelta(days=30)
            queryset = queryset.filter(transfer_date__date__gte=thirty_days_ago)
            print("ProfileOUT: No date filters provided, showing last 30 days of data")
        
        # Additional filters
        client = request.GET.get('client')
        if client:
            queryset = queryset.filter(client_name__icontains=client)
            print(f"ProfileOUT: Filtering by client: {client}")
        
        executive = request.GET.get('executive')
        if executive:
            queryset = queryset.filter(
                Q(candidate__executive_name__icontains=executive) |
                Q(assign_to__icontains=executive)
            )
            print(f"ProfileOUT: Filtering by executive: {executive}")
        
        state = request.GET.get('state')
        if state:
            queryset = queryset.filter(candidate__state__icontains=state)
            print(f"ProfileOUT: Filtering by state: {state}")
        
        # Order by transfer date (most recent first)
        queryset = queryset.order_by('-transfer_date')
        
        # Pagination parameters
        page = request.GET.get('page', 1)
        page_size = request.GET.get('page_size', 25)
        
        try:
            page = int(page)
            page_size = int(page_size)
        except ValueError:
            page = 1
            page_size = 25
        
        # Early return check using exists() - much faster than count()
        if not queryset.exists():
            print(f"ProfileOUT: No profiles found for {emp_code}")
            return Response({
                'success': True,
                'count': 0,
                'page': 1,
                'page_size': page_size,
                'total_pages': 0,
                'data': []
            }, status=status.HTTP_200_OK)
        
        # Get total count for pagination
        total_count = queryset.count()
        print(f"ProfileOUT: Found {total_count} profiles assigned from {emp_code}")
        
        # Calculate pagination
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        
        # Paginate the queryset
        paginated_queryset = queryset[start_index:end_index]

        # Serialize the data
        from .serializers import ProfileOutSerializer
        serializer = ProfileOutSerializer(paginated_queryset, many=True)
        
        return Response({
            'success': True,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"ProfileOUT: Error in profile_out_list: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'error': f'Failed to load profile OUT data: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------
# Candidate Status History API Views
# ------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_status_history(request):
    """
    Create a new status history entry for a candidate
    
    Expected payload:
    {
        "candidate_id": 123,
        "remarks": "interested",
        "change_date": "2025-11-14",
        "created_by": "EMP001",
        "extra_notes": "Called candidate, very interested in the role",
        "profile_submission": 1,  # Optional: 1 for Yes, 0 for No
        "profile_submission_date": "2025-11-14"  # Optional: date for profile submission
    }
    
    Delayed First Profile Submission Logic:
    - First entry (e.g., "Interested"): profile_submission = 0, profile_submission_date = NULL
    - Later entry with profile_submission = 1: This becomes the true first submission
    - After first submission: All future entries use profile_submission = 0
    """
    try:
        data = request.data
        
        # Validate required fields
        required_fields = ['candidate_id', 'remarks', 'change_date', 'created_by']
        for field in required_fields:
            if field not in data or not data[field]:
                return Response({
                    'error': f'Missing required field: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        candidate_id = data['candidate_id']
        profile_submission = data.get('profile_submission')
        profile_submission_date = data.get('profile_submission_date')
        employee_id = data.get('employee_id')
        attend_flag = data.get('attend_flag')

        # Normalize attend_flag (still normalize for consistency, but do not block on duplicates here)
        if isinstance(attend_flag, str):
            attend_flag = attend_flag.strip().lower() in ('1', 'true', 'yes')
        elif isinstance(attend_flag, int):
            attend_flag = int(attend_flag) == 1
        else:
            attend_flag = bool(attend_flag) if attend_flag is not None else None

        # Determine branch/team: prefer payload, else resolve from creator employee code and fallback to client job
        branch_id = data.get('branch_id')
        team_id = data.get('team_id')
        try:
            if branch_id in [None, '', 'null'] or team_id in [None, '', 'null']:
                b_id, t_id = _resolve_branch_team_by_employee_code(data.get('created_by'), data.get('client_job_id'))
                if branch_id in [None, '', 'null']:
                    branch_id = b_id
                if team_id in [None, '', 'null']:
                    team_id = t_id
        except Exception:
            pass

        # Check if this is the first profile submission (profile_submission = 1)
        if profile_submission == 1:
            # Check if any previous history entry has profile_submission = 1
            has_previous_submission = CandidateStatusHistory.objects.filter(
                candidate_id=candidate_id,
                profile_submission=1
            ).exists()
            
            if has_previous_submission:
                # This is NOT the first submission, set to 0
                profile_submission = 0
                profile_submission_date = None
                print(f"[DEBUG] Candidate {candidate_id} already has profile submission, setting current to 0")
            else:
                # This IS the first submission, update ClientJob table
                print(f"[DEBUG] First profile submission for candidate {candidate_id}, updating ClientJob")
                try:
                    # Find the ClientJob for this candidate
                    client_job = ClientJob.objects.filter(candidate_id=candidate_id).first()
                    if client_job:
                        client_job.profile_submission = 1
                        if profile_submission_date:
                            client_job.profile_submission_date = profile_submission_date
                        else:
                            client_job.profile_submission_date = data['change_date']
                        client_job.save()
                        print(f"[DEBUG] Updated ClientJob {client_job.id}: profile_submission=1, profile_submission_date={client_job.profile_submission_date}")
                    else:
                        print(f"[WARNING] No ClientJob found for candidate {candidate_id}")
                except Exception as client_job_error:
                    print(f"[ERROR] Failed to update ClientJob: {str(client_job_error)}")
        else:
            # No profile submission in this entry
            profile_submission_date = None
        
        # Create status history entry
        history_entry = CandidateStatusHistory.create_status_entry(
            candidate_id=candidate_id,
            remarks=data['remarks'],
            change_date=data['change_date'],
            created_by=data['created_by'],
            extra_notes=data.get('extra_notes'),
            client_job_id=data.get('client_job_id'),
            vendor_id=data.get('vendor_id'),
            client_name=data.get('client_name'),
            profile_submission=profile_submission,
            attend_flag=attend_flag,
			branch_id=branch_id, 
            team_id=team_id,
            employee_id=employee_id
        )
        
        if history_entry:
            # Update change_date if this is the first submission and profile_submission_date is provided
            if profile_submission == 1 and profile_submission_date:
                history_entry.change_date = profile_submission_date
                history_entry.save()
                print(f"[DEBUG] Updated history entry change_date to {profile_submission_date}")
            
            return Response({
                'success': True,
                'message': 'Status history created successfully',
                'data': {
                    'id': history_entry.id,
                    'candidate_id': history_entry.candidate_id,
                    'client_job_id': history_entry.client_job_id,
                    'vendor_id': history_entry.vendor_id,
                    'client_name': history_entry.client_name,
                    'remarks': history_entry.remarks,
                    'profile_submission': history_entry.profile_submission,
                    'change_date': history_entry.change_date.strftime('%Y-%m-%d'),
                    'created_by': history_entry.created_by,
                    'branch_id': history_entry.branch_id,
                    'team_id': history_entry.team_id,
                    'employee_id': history_entry.employee_id,
                    'created_by_name': history_entry.get_created_by_name(),
                    'extra_notes': history_entry.extra_notes,
                    'created_at': history_entry.created_at.isoformat()
                }
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'error': 'Failed to create status history entry'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        print(f"Error creating status history: {str(e)}")
        return Response({
            'error': f'Failed to create status history: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_candidate_timeline(request, candidate_id):
    """
    Get complete timeline for a candidate
    
    URL: /api/candidates/{candidate_id}/timeline/
    """
    try:
        # Validate candidate exists
        try:
            candidate = Candidate.objects.get(id=candidate_id)
        except Candidate.DoesNotExist:
            return Response({
                'error': f'Candidate {candidate_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get timeline data
        timeline = CandidateStatusHistory.get_candidate_timeline(candidate_id)
        
        timeline_data = []
        for entry in timeline:
            timeline_data.append({
                'id': entry.id,
                'remarks': entry.remarks,
                'client_job_id': entry.client_job_id,
                'vendor_id': entry.vendor_id,
                'client_name': entry.client_name,
                'change_date': entry.change_date.strftime('%Y-%m-%d'),
                'created_by': entry.created_by,
                'created_by_name': entry.get_created_by_name(),
                'extra_notes': entry.extra_notes,
                'created_at': entry.created_at.isoformat()
            })
        
        return Response({
            'success': True,
            'candidate_id': candidate_id,
            'candidate_name': candidate.candidate_name,
            'timeline': timeline_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error getting candidate timeline: {str(e)}")
        return Response({
            'error': f'Failed to get candidate timeline: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_candidate_calendar(request, candidate_id):
    """
    Get calendar-formatted data for a candidate
    
    URL: /api/candidates/{candidate_id}/calendar/
    Query params: year, month (optional)
    """
    try:
        # Validate candidate exists
        try:
            candidate = Candidate.objects.get(id=candidate_id)
        except Candidate.DoesNotExist:
            return Response({
                'error': f'Candidate {candidate_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get optional filters
        year = request.GET.get('year')
        month = request.GET.get('month')
        
        if year:
            try:
                year = int(year)
            except ValueError:
                return Response({
                    'error': 'Invalid year format'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        if month:
            try:
                month = int(month)
                if month < 1 or month > 12:
                    raise ValueError
            except ValueError:
                return Response({
                    'error': 'Invalid month format (must be 1-12)'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get calendar data
        calendar_data = CandidateStatusHistory.get_calendar_data(candidate_id, year, month)
        
        return Response({
            'success': True,
            'candidate_id': candidate_id,
            'candidate_name': candidate.candidate_name,
            'year': year,
            'month': month,
            'calendar_data': calendar_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error getting candidate calendar: {str(e)}")
        return Response({
            'error': f'Failed to get candidate calendar: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_status_history_stats(request):
    """
    Get statistics about status history
    
    URL: /api/candidates/status-history/stats/
    Query params: from_date, to_date, created_by (optional)
    """
    try:
        from django.db.models import Count
        from datetime import datetime, timedelta
        
        # Build base queryset
        queryset = CandidateStatusHistory.objects.all()
        
        # Date filters
        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')
        
        if from_date:
            try:
                from_date_obj = datetime.strptime(from_date, '%Y-%m-%d').date()
                queryset = queryset.filter(change_date__gte=from_date_obj)
            except ValueError:
                return Response({
                    'error': 'Invalid from_date format (use YYYY-MM-DD)'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        if to_date:
            try:
                to_date_obj = datetime.strptime(to_date, '%Y-%m-%d').date()
                queryset = queryset.filter(change_date__lte=to_date_obj)
            except ValueError:
                return Response({
                    'error': 'Invalid to_date format (use YYYY-MM-DD)'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # If no dates provided, default to last 30 days
        if not from_date and not to_date:
            thirty_days_ago = datetime.now().date() - timedelta(days=30)
            queryset = queryset.filter(change_date__gte=thirty_days_ago)
        
        # Created by filter
        created_by = request.GET.get('created_by')
        if created_by:
            queryset = queryset.filter(created_by=created_by)
        
        # Get statistics
        total_entries = queryset.count()
        unique_candidates = queryset.values('candidate_id').distinct().count()
        
        # Status breakdown
        status_breakdown = queryset.values('remarks').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Daily activity (last 7 days)
        seven_days_ago = datetime.now().date() - timedelta(days=7)
        daily_activity = queryset.filter(
            change_date__gte=seven_days_ago
        ).values('change_date').annotate(
            count=Count('id')
        ).order_by('change_date')
        
        return Response({
            'success': True,
            'stats': {
                'total_entries': total_entries,
                'unique_candidates': unique_candidates,
                'status_breakdown': list(status_breakdown),
                'daily_activity': list(daily_activity)
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error getting status history stats: {str(e)}")
        return Response({
            'error': f'Failed to get status history stats: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
