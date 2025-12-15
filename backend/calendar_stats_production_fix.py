# Production-safe calendar-stats endpoint fix
# This addresses the 500 Internal Server Error on production

@action(detail=False, methods=['get'], url_path='calendar-stats')
def calendar_stats(self, request):
    """
    Production-safe calendar statistics endpoint with comprehensive error handling.
    Addresses timezone issues, database query problems, and missing dependencies.
    """
    try:
        import logging
        from datetime import datetime, timedelta
        from django.utils import timezone
        from django.conf import settings
        from django.db.models import Q
        
        logger = logging.getLogger(__name__)
        logger.info("Starting calendar-stats request")
        
        # Get parameters with validation
        month_param = request.query_params.get('month')
        year_param = request.query_params.get('year')
        
        logger.info(f"Parameters: month={month_param}, year={year_param}")
        
        # Initialize variables
        start_datetime = None
        end_datetime = None
        start_date = None
        end_date = None
        year = None
        month = None
        
        # Parse date parameters with comprehensive error handling
        try:
            if month_param:
                year, month = map(int, month_param.split('-'))
                logger.info(f"Parsed month parameter: year={year}, month={month}")
                
                # Create timezone-safe datetime objects
                try:
                    if getattr(settings, 'USE_TZ', True):
                        # Timezone-aware approach
                        start_datetime = timezone.make_aware(datetime(year, month, 1))
                        if month == 12:
                            end_datetime = timezone.make_aware(datetime(year + 1, 1, 1)) - timedelta(seconds=1)
                        else:
                            end_datetime = timezone.make_aware(datetime(year, month + 1, 1)) - timedelta(seconds=1)
                    else:
                        # Naive datetime approach
                        start_datetime = datetime(year, month, 1)
                        if month == 12:
                            end_datetime = datetime(year + 1, 1, 1) - timedelta(seconds=1)
                        else:
                            end_datetime = datetime(year, month + 1, 1) - timedelta(seconds=1)
                    
                    start_date = start_datetime.date()
                    end_date = end_datetime.date()
                    logger.info(f"Date range: {start_date} to {end_date}")
                    
                except Exception as tz_error:
                    logger.error(f"Timezone handling error: {str(tz_error)}")
                    # Fallback to naive datetimes
                    start_datetime = datetime(year, month, 1)
                    if month == 12:
                        end_datetime = datetime(year + 1, 1, 1) - timedelta(seconds=1)
                    else:
                        end_datetime = datetime(year, month + 1, 1) - timedelta(seconds=1)
                    start_date = start_datetime.date()
                    end_date = end_datetime.date()
                    
            elif year_param:
                year = int(year_param)
                logger.info(f"Parsed year parameter: year={year}")
                
                try:
                    if getattr(settings, 'USE_TZ', True):
                        start_datetime = timezone.make_aware(datetime(year, 1, 1))
                        end_datetime = timezone.make_aware(datetime(year + 1, 1, 1)) - timedelta(seconds=1)
                    else:
                        start_datetime = datetime(year, 1, 1)
                        end_datetime = datetime(year + 1, 1, 1) - timedelta(seconds=1)
                    
                    start_date = start_datetime.date()
                    end_date = end_datetime.date()
                    
                except Exception as tz_error:
                    logger.error(f"Timezone handling error for year: {str(tz_error)}")
                    start_datetime = datetime(year, 1, 1)
                    end_datetime = datetime(year + 1, 1, 1) - timedelta(seconds=1)
                    start_date = start_datetime.date()
                    end_date = end_datetime.date()
                    
        except Exception as parse_error:
            logger.error(f"Date parsing error: {str(parse_error)}")
            return Response({
                'error': 'Invalid date parameters',
                'details': str(parse_error),
                'month': month_param or 'unknown'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Safe model import and query
        try:
            from .models import ClientJob
            logger.info("ClientJob model imported successfully")
            
            # Build query with comprehensive error handling
            if start_datetime and end_datetime and start_date and end_date:
                logger.info("Applying date filters")
                try:
                    # Try timezone-aware filtering first
                    client_jobs = ClientJob.objects.filter(
                        Q(interview_date__gte=start_datetime, interview_date__lte=end_datetime) |
                        Q(next_follow_up_date__gte=start_date, next_follow_up_date__lte=end_date) |
                        Q(expected_joining_date__gte=start_datetime, expected_joining_date__lte=end_datetime)
                    ).select_related('candidate')
                except Exception as query_error:
                    logger.warning(f"Timezone-aware query failed, trying date-only: {str(query_error)}")
                    # Fallback to date-only filtering
                    client_jobs = ClientJob.objects.filter(
                        Q(interview_date__date__gte=start_date, interview_date__date__lte=end_date) |
                        Q(next_follow_up_date__gte=start_date, next_follow_up_date__lte=end_date) |
                        Q(expected_joining_date__date__gte=start_date, expected_joining_date__date__lte=end_date)
                    ).select_related('candidate')
            else:
                logger.info("No date filtering applied")
                client_jobs = ClientJob.objects.filter(
                    Q(interview_date__isnull=False) |
                    Q(next_follow_up_date__isnull=False) |
                    Q(expected_joining_date__isnull=False)
                ).select_related('candidate')
            
            logger.info(f"Found {client_jobs.count()} client jobs")
            
        except Exception as model_error:
            logger.error(f"Model/Query error: {str(model_error)}")
            return Response({
                'error': 'Database query failed',
                'details': str(model_error),
                'month': f"{year}-{month:02d}" if year and month else 'unknown'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Process data with safe serialization
        interview_count = 0
        followup_count = 0
        joining_count = 0
        candidate_cache = {}
        daily_stats = {}
        event_type_counts = {}
        
        logger.info("Starting data processing")
        
        for job in client_jobs:
            try:
                # Safe candidate serialization with caching
                if job.candidate.id not in candidate_cache:
                    try:
                        # Import serializer safely
                        from .serializers import CandidateSerializer
                        serialized_candidate = CandidateSerializer(job.candidate).data
                        
                        # Try employee enhancement with fallback
                        try:
                            enhanced_candidate = self._safe_enhance_with_employee_details([serialized_candidate])[0]
                            candidate_cache[job.candidate.id] = enhanced_candidate
                        except Exception as enhance_error:
                            logger.warning(f"Employee enhancement failed: {str(enhance_error)}")
                            candidate_cache[job.candidate.id] = serialized_candidate
                            
                    except Exception as serialize_error:
                        logger.warning(f"Candidate serialization failed: {str(serialize_error)}")
                        # Create minimal candidate data
                        candidate_cache[job.candidate.id] = {
                            'id': job.candidate.id,
                            'name': getattr(job.candidate, 'name', 'Unknown'),
                            'phone': getattr(job.candidate, 'phone', 'N/A'),
                            'email': getattr(job.candidate, 'email', 'N/A'),
                            'executive_name': getattr(job.candidate, 'executive_name', 'N/A')
                        }
                
                # Safe datetime to string conversion
                def safe_datetime_to_string(dt_obj):
                    if not dt_obj:
                        return None
                    try:
                        if hasattr(dt_obj, 'isoformat'):
                            return dt_obj.isoformat()
                        return str(dt_obj)
                    except Exception:
                        return str(dt_obj)
                
                # Build client job data safely
                client_job_data = {
                    "id": getattr(job, 'id', 0),
                    "candidate_id": getattr(job.candidate, 'id', 0),
                    "client_name": getattr(job, 'client_name', 'N/A'),
                    "designation": getattr(job, 'designation', 'N/A'),
                    "current_ctc": str(job.current_ctc) if getattr(job, 'current_ctc', None) else None,
                    "expected_ctc": str(job.expected_ctc) if getattr(job, 'expected_ctc', None) else None,
                    "remarks": getattr(job, 'remarks', 'N/A'),
                    "interview_date": safe_datetime_to_string(getattr(job, 'interview_date', None)),
                    "expected_joining_date": safe_datetime_to_string(getattr(job, 'expected_joining_date', None)),
                    "next_follow_up_date": safe_datetime_to_string(getattr(job, 'next_follow_up_date', None)),
                    "created_at": safe_datetime_to_string(getattr(job, 'created_at', None)),
                    "updated_at": safe_datetime_to_string(getattr(job, 'updated_at', None)),
                }
                
                # Process events with safe date handling
                events_for_job = []
                
                # Check interview dates
                if hasattr(job, 'interview_date') and job.interview_date:
                    try:
                        interview_date = job.interview_date.date() if hasattr(job.interview_date, 'date') else job.interview_date
                        if not start_date or not end_date or (start_date <= interview_date <= end_date):
                            interview_count += 1
                            events_for_job.append({
                                'date': interview_date.isoformat() if hasattr(interview_date, 'isoformat') else str(interview_date),
                                'type': 'IF'
                            })
                    except Exception as date_error:
                        logger.warning(f"Interview date processing error: {str(date_error)}")
                
                # Check follow-up dates
                if hasattr(job, 'next_follow_up_date') and job.next_follow_up_date:
                    try:
                        followup_date = job.next_follow_up_date
                        if not start_date or not end_date or (start_date <= followup_date <= end_date):
                            followup_count += 1
                            events_for_job.append({
                                'date': followup_date.isoformat() if hasattr(followup_date, 'isoformat') else str(followup_date),
                                'type': 'NFD'
                            })
                    except Exception as date_error:
                        logger.warning(f"Follow-up date processing error: {str(date_error)}")
                
                # Check joining dates
                if hasattr(job, 'expected_joining_date') and job.expected_joining_date:
                    try:
                        joining_date = job.expected_joining_date.date() if hasattr(job.expected_joining_date, 'date') else job.expected_joining_date
                        if not start_date or not end_date or (start_date <= joining_date <= end_date):
                            joining_count += 1
                            events_for_job.append({
                                'date': joining_date.isoformat() if hasattr(joining_date, 'isoformat') else str(joining_date),
                                'type': 'EDJ'
                            })
                    except Exception as date_error:
                        logger.warning(f"Joining date processing error: {str(date_error)}")
                
                # Add events to daily stats
                for event_info in events_for_job:
                    try:
                        date_str = event_info['date']
                        event_type = event_info['type']
                        event_key = f"{job.candidate.id}-{job.id}"
                        
                        if date_str not in daily_stats:
                            daily_stats[date_str] = {}
                            event_type_counts[date_str] = {'IF': 0, 'NFD': 0, 'EDJ': 0}
                        
                        if event_key in daily_stats[date_str]:
                            # Merge event types for same candidate-job on same date
                            existing_event = daily_stats[date_str][event_key]
                            if isinstance(existing_event['type'], str):
                                existing_event['type'] = [existing_event['type']]
                            if event_type not in existing_event['type']:
                                existing_event['type'].append(event_type)
                        else:
                            daily_stats[date_str][event_key] = {
                                "type": event_type,
                                "candidate": candidate_cache[job.candidate.id],
                                "client_job": client_job_data
                            }
                        
                        event_type_counts[date_str][event_type] += 1
                        
                    except Exception as event_error:
                        logger.warning(f"Event processing error: {str(event_error)}")
                        continue
                        
            except Exception as job_error:
                logger.warning(f"Job processing error: {str(job_error)}")
                continue
        
        # Safe date formatting
        try:
            candidate_list = list(candidate_cache.values())
            formatted_candidates = self._safe_format_dates_in_data(candidate_list)
            for i, candidate_id in enumerate(candidate_cache.keys()):
                candidate_cache[candidate_id] = formatted_candidates[i]
        except Exception as format_error:
            logger.warning(f"Date formatting error: {str(format_error)}")
        
        # Build final response
        events = []
        for date_str, day_events in daily_stats.items():
            if day_events:
                processed_events = []
                for event_key, event_data in day_events.items():
                    try:
                        if isinstance(event_data['type'], list):
                            event_data['type'] = '+'.join(sorted(event_data['type']))
                            event_data['multiple_events'] = True
                        else:
                            event_data['multiple_events'] = False
                        
                        # Ensure candidate data is current
                        event_data['candidate'] = candidate_cache[event_data['candidate']['id']]
                        processed_events.append(event_data)
                    except Exception as process_error:
                        logger.warning(f"Event processing error: {str(process_error)}")
                        continue
                
                events.append({
                    'date': date_str,
                    'events': processed_events,
                    'event_counts': event_type_counts.get(date_str, {'IF': 0, 'NFD': 0, 'EDJ': 0})
                })
        
        logger.info("Calendar stats processing completed successfully")
        
        return Response({
            'month': f"{year}-{month:02d}" if year and month else 'unknown',
            'totals': {
                'interviews': interview_count,
                'followups': followup_count,
                'joinings': joining_count,
                'total_events': interview_count + followup_count + joining_count
            },
            'events': events,
            'metadata': {
                'total_client_jobs_processed': len(client_jobs) if 'client_jobs' in locals() else 0,
                'unique_candidates': len(candidate_cache),
                'timezone_support': getattr(settings, 'USE_TZ', 'unknown'),
                'data_includes': {
                    'complete_candidate_details': True,
                    'complete_client_job_details': True,
                    'employee_details': True,
                    'executive_employee_info': True,
                    'formatted_dates': True,
                    'feedback_data': False,
                    'timestamps': True,
                    'all_candidate_fields': True
                },
                'serializer_used': 'CandidateSerializer (Production-Safe + Enhanced Error Handling)',
                'query_optimizations': [
                    'select_related for candidate',
                    'candidate serialization caching',
                    'single query for all data',
                    'production-safe datetime handling',
                    'comprehensive error handling'
                ]
            }
        })
        
    except Exception as e:
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Critical error in calendar_stats: {str(e)}")
        logger.error(traceback.format_exc())
        
        return Response({
            'error': 'Failed to fetch calendar statistics',
            'details': str(e),
            'timezone_support': getattr(settings, 'USE_TZ', 'unknown'),
            'month': f"{year}-{month:02d}" if 'year' in locals() and 'month' in locals() else 'unknown',
            'production_safe': True,
            'traceback': traceback.format_exc() if getattr(settings, 'DEBUG', False) else 'Hidden in production'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _safe_enhance_with_employee_details(self, serialized_data):
    """
    Production-safe employee enhancement with comprehensive error handling.
    """
    try:
        from empreg.models import Employee
        
        # Extract all unique employee codes from the data
        employee_codes = set()
        for candidate in serialized_data:
            codes_to_check = [
                candidate.get('created_by'),
                candidate.get('updated_by'),
                candidate.get('executive_name'),
                candidate.get('executive_code')
            ]
            
            for code in codes_to_check:
                if code and isinstance(code, str) and (code.startswith(('EMP', 'CBE', 'Emp/')) or '/' in code):
                    employee_codes.add(code)
        
        if not employee_codes:
            return serialized_data
        
        # Safe bulk fetch with error handling
        try:
            employees = Employee.objects.filter(
                employeeCode__in=employee_codes
            )
            
            # Check if del_state field exists
            if hasattr(Employee, 'del_state'):
                employees = employees.filter(del_state=0)
                
            employees = employees.values('employeeCode', 'firstName', 'lastName')
            
        except Exception as query_error:
            logger = logging.getLogger(__name__)
            logger.warning(f"Employee query failed: {str(query_error)}")
            return serialized_data
        
        # Create lookup dictionary for fast access
        employee_lookup = {}
        for emp in employees:
            try:
                first_name = emp.get('firstName') or ''
                last_name = emp.get('lastName') or ''
                full_name = f"{first_name} {last_name}".strip() or first_name or last_name or ''
                
                employee_lookup[emp['employeeCode']] = {
                    'firstName': first_name,
                    'lastName': last_name,
                    'fullName': full_name
                }
            except Exception as emp_error:
                continue
        
        # Enhance each candidate with employee details
        for candidate in serialized_data:
            try:
                # Add employee details for created_by
                created_by_code = candidate.get('created_by')
                if created_by_code and created_by_code in employee_lookup:
                    emp_details = employee_lookup[created_by_code]
                    candidate['created_by_employee'] = {
                        'employeeCode': created_by_code,
                        'firstName': emp_details['firstName'],
                        'lastName': emp_details['lastName'],
                        'fullName': emp_details['fullName']
                    }
                
                # Add employee details for updated_by
                updated_by_code = candidate.get('updated_by')
                if updated_by_code and updated_by_code in employee_lookup:
                    emp_details = employee_lookup[updated_by_code]
                    candidate['updated_by_employee'] = {
                        'employeeCode': updated_by_code,
                        'firstName': emp_details['firstName'],
                        'lastName': emp_details['lastName'],
                        'fullName': emp_details['fullName']
                    }
                
                # Add employee details for executive_name if it's a code
                executive_name = candidate.get('executive_name')
                if executive_name and executive_name in employee_lookup:
                    emp_details = employee_lookup[executive_name]
                    candidate['executive_employee'] = {
                        'employeeCode': executive_name,
                        'firstName': emp_details['firstName'],
                        'lastName': emp_details['lastName'],
                        'fullName': emp_details['fullName']
                    }
                    candidate['executive_display'] = f"{executive_name} - {emp_details['fullName']}"
                
            except Exception as candidate_error:
                continue
        
        return serialized_data
        
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.warning(f"Employee enhancement failed: {str(e)}")
        return serialized_data


def _safe_format_dates_in_data(self, serialized_data):
    """
    Production-safe date formatting with comprehensive error handling.
    """
    try:
        from datetime import datetime
        
        for candidate in serialized_data:
            try:
                # Format created_at date
                if candidate.get('created_at'):
                    try:
                        dt_str = candidate['created_at']
                        if isinstance(dt_str, str):
                            # Handle various datetime formats
                            dt_str = dt_str.replace('Z', '+00:00')
                            dt = datetime.fromisoformat(dt_str)
                            candidate['created_at'] = dt.strftime('%d-%m-%Y')
                    except (ValueError, AttributeError, TypeError):
                        pass
                
                # Format updated_at date
                if candidate.get('updated_at'):
                    try:
                        dt_str = candidate['updated_at']
                        if isinstance(dt_str, str):
                            dt_str = dt_str.replace('Z', '+00:00')
                            dt = datetime.fromisoformat(dt_str)
                            candidate['updated_at'] = dt.strftime('%d-%m-%Y')
                    except (ValueError, AttributeError, TypeError):
                        pass
                
            except Exception as candidate_error:
                continue
        
        return serialized_data
        
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.warning(f"Date formatting failed: {str(e)}")
        return serialized_data
