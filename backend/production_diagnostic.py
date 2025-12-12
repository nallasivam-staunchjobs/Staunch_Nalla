# Production diagnostic endpoint to test what's available on production server

@action(detail=False, methods=['get'], url_path='production-diagnostic')
def production_diagnostic(self, request):
    """
    Diagnostic endpoint to check what's available on production server.
    Use this to identify what's missing that causes calendar-stats to fail.
    """
    
    diagnostic_results = {
        'server_info': {
            'timestamp': timezone.now().isoformat(),
            'django_version': None,
            'python_version': None
        },
        'models_available': {},
        'database_tables': {},
        'imports_working': {},
        'sample_data': {}
    }
    
    try:
        import sys
        import django
        diagnostic_results['server_info']['python_version'] = sys.version
        diagnostic_results['server_info']['django_version'] = django.get_version()
    except Exception as e:
        diagnostic_results['server_info']['error'] = str(e)
    
    # Test 1: Check if models are available
    try:
        from .models import ClientJob, Candidate
        diagnostic_results['models_available']['ClientJob'] = True
        diagnostic_results['models_available']['Candidate'] = True
        
        # Test basic queries
        client_job_count = ClientJob.objects.count()
        candidate_count = Candidate.objects.count()
        
        diagnostic_results['sample_data']['client_jobs_count'] = client_job_count
        diagnostic_results['sample_data']['candidates_count'] = candidate_count
        
    except Exception as e:
        diagnostic_results['models_available']['error'] = str(e)
    
    # Test 2: Check Employee model
    try:
        from empreg.models import Employee
        diagnostic_results['models_available']['Employee'] = True
        
        employee_count = Employee.objects.count()
        diagnostic_results['sample_data']['employees_count'] = employee_count
        
        # Test employee fields
        sample_employee = Employee.objects.first()
        if sample_employee:
            diagnostic_results['sample_data']['employee_fields'] = {
                'has_employeeCode': hasattr(sample_employee, 'employeeCode'),
                'has_firstName': hasattr(sample_employee, 'firstName'),
                'has_lastName': hasattr(sample_employee, 'lastName'),
                'has_del_state': hasattr(sample_employee, 'del_state'),
            }
        
    except Exception as e:
        diagnostic_results['models_available']['Employee_error'] = str(e)
    
    # Test 3: Check serializers
    try:
        from .serializers import CandidateSerializer
        diagnostic_results['imports_working']['CandidateSerializer'] = True
    except Exception as e:
        diagnostic_results['imports_working']['CandidateSerializer_error'] = str(e)
    
    # Test 4: Check database tables exist
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall()]
            diagnostic_results['database_tables']['available'] = tables
            diagnostic_results['database_tables']['has_candidate_clientjob'] = 'candidate_clientjob' in tables
            diagnostic_results['database_tables']['has_empreg_employee'] = 'empreg_employee' in tables
    except Exception as e:
        diagnostic_results['database_tables']['error'] = str(e)
    
    # Test 5: Sample ClientJob data
    try:
        from .models import ClientJob
        sample_job = ClientJob.objects.first()
        if sample_job:
            diagnostic_results['sample_data']['client_job_fields'] = {
                'has_interview_date': hasattr(sample_job, 'interview_date'),
                'has_next_follow_up_date': hasattr(sample_job, 'next_follow_up_date'),
                'has_expected_joining_date': hasattr(sample_job, 'expected_joining_date'),
                'has_candidate': hasattr(sample_job, 'candidate'),
                'interview_date_value': str(sample_job.interview_date) if hasattr(sample_job, 'interview_date') else None,
            }
    except Exception as e:
        diagnostic_results['sample_data']['client_job_error'] = str(e)
    
    # Test 6: Test the enhancement method
    try:
        # Create a simple test candidate data
        test_data = [{'id': 1, 'executive_name': 'TEST001', 'created_by': 'TEST001'}]
        enhanced_data = self._enhance_with_employee_details(test_data)
        diagnostic_results['imports_working']['employee_enhancement'] = True
        diagnostic_results['sample_data']['enhancement_test'] = enhanced_data
    except Exception as e:
        diagnostic_results['imports_working']['employee_enhancement_error'] = str(e)
    
    # Test 7: Test date formatting
    try:
        test_data = [{'created_at': '2025-10-27T10:30:00Z', 'updated_at': '2025-10-27T10:30:00Z'}]
        formatted_data = self._format_dates_in_data(test_data)
        diagnostic_results['imports_working']['date_formatting'] = True
        diagnostic_results['sample_data']['date_format_test'] = formatted_data
    except Exception as e:
        diagnostic_results['imports_working']['date_formatting_error'] = str(e)
    
    return Response({
        'status': 'diagnostic_complete',
        'results': diagnostic_results,
        'recommendations': [
            'Check models_available for missing models',
            'Check database_tables for missing tables',
            'Check imports_working for import errors',
            'Check sample_data for field availability'
        ]
    })
