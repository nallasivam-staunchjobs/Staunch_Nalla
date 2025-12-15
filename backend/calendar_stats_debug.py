# Enhanced calendar-stats method with better error handling for production debugging

@action(detail=False, methods=['get'], url_path='calendar-stats')
def calendar_stats(self, request):
    """
    Get calendar statistics for interviews, follow-ups, and joining dates with candidate details.
    Enhanced with production error handling and debugging.
    """
    
    def safe_isoformat(date_obj):
        """Safely convert date object to ISO format string"""
        if not date_obj:
            return None
        if hasattr(date_obj, 'isoformat'):
            return date_obj.isoformat()
        return str(date_obj)
    
    try:
        # Step 1: Parameter validation with detailed logging
        month_param = request.query_params.get('month')
        year_param = request.query_params.get('year')
        
        logger.info(f"[CALENDAR-STATS] Request params - month: {month_param}, year: {year_param}")
        
        # Initialize date filtering variables
        start_datetime = None
        end_datetime = None
        start_date = None
        end_date = None
        
        # Step 2: Date range parsing with enhanced error handling
        try:
            if month_param:
                year, month = map(int, month_param.split('-'))
                start_datetime = timezone.make_aware(datetime(year, month, 1))
                if month == 12:
                    end_datetime = timezone.make_aware(datetime(year + 1, 1, 1)) - timedelta(seconds=1)
                else:
                    end_datetime = timezone.make_aware(datetime(year, month + 1, 1)) - timedelta(seconds=1)
                start_date = start_datetime.date()
                end_date = end_datetime.date()
                logger.info(f"[CALENDAR-STATS] Date range: {start_date} to {end_date}")
            elif year_param:
                year = int(year_param)
                start_datetime = timezone.make_aware(datetime(year, 1, 1))
                end_datetime = timezone.make_aware(datetime(year + 1, 1, 1)) - timedelta(seconds=1)
                start_date = start_datetime.date()
                end_date = end_datetime.date()
                logger.info(f"[CALENDAR-STATS] Year range: {start_date} to {end_date}")
        except (ValueError, AttributeError) as e:
            logger.error(f"[CALENDAR-STATS] Date parsing error: {str(e)}")
            return Response({"error": f"Invalid date format: {str(e)}"}, status=400)
        
        # Step 3: Database query with error handling
        try:
            from .models import ClientJob
            logger.info("[CALENDAR-STATS] ClientJob model imported successfully")
            
            # Build query with date filtering
            if start_datetime and end_datetime and start_date and end_date:
                client_jobs = ClientJob.objects.filter(
                    Q(interview_date__gte=start_datetime, interview_date__lte=end_datetime) |
                    Q(next_follow_up_date__gte=start_date, next_follow_up_date__lte=end_date) |
                    Q(expected_joining_date__gte=start_datetime, expected_joining_date__lte=end_datetime)
                ).select_related('candidate')
            else:
                client_jobs = ClientJob.objects.filter(
                    Q(interview_date__isnull=False) |
                    Q(next_follow_up_date__isnull=False) |
                    Q(expected_joining_date__isnull=False)
                ).select_related('candidate')
            
            logger.info(f"[CALENDAR-STATS] Found {client_jobs.count()} client jobs")
            
        except Exception as e:
            logger.error(f"[CALENDAR-STATS] Database query error: {str(e)}")
            return Response({
                'error': 'Database query failed',
                'details': str(e),
                'step': 'client_jobs_query'
            }, status=500)
        
        # Step 4: Process data with enhanced error handling
        try:
            interview_count = 0
            followup_count = 0
            joining_count = 0
            candidate_cache = {}
            event_tracker = {}
            
            logger.info("[CALENDAR-STATS] Starting data processing")
            
            for job in client_jobs:
                try:
                    # Cache candidate serialization
                    if job.candidate.id not in candidate_cache:
                        try:
                            serialized_candidate = CandidateSerializer(job.candidate).data
                            logger.debug(f"[CALENDAR-STATS] Serialized candidate {job.candidate.id}")
                            
                            # Try employee enhancement with fallback
                            try:
                                enhanced_candidate = self._enhance_with_employee_details([serialized_candidate])[0]
                                candidate_cache[job.candidate.id] = enhanced_candidate
                                logger.debug(f"[CALENDAR-STATS] Enhanced candidate {job.candidate.id} with employee details")
                            except Exception as enhance_error:
                                logger.warning(f"[CALENDAR-STATS] Employee enhancement failed for candidate {job.candidate.id}: {str(enhance_error)}")
                                candidate_cache[job.candidate.id] = serialized_candidate
                                
                        except Exception as serialization_error:
                            logger.error(f"[CALENDAR-STATS] Candidate serialization failed for {job.candidate.id}: {str(serialization_error)}")
                            continue
                    
                    # Build client job data safely
                    client_job_data = {
                        "id": job.id,
                        "candidate_id": job.candidate.id,
                        "client_name": getattr(job, 'client_name', 'N/A'),
                        "designation": getattr(job, 'designation', 'N/A'),
                        "current_ctc": str(job.current_ctc) if getattr(job, 'current_ctc', None) else None,
                        "expected_ctc": str(job.expected_ctc) if getattr(job, 'expected_ctc', None) else None,
                        "remarks": getattr(job, 'remarks', 'N/A'),
                        "interview_date": safe_isoformat(getattr(job, 'interview_date', None)),
                        "expected_joining_date": safe_isoformat(getattr(job, 'expected_joining_date', None)),
                        "next_follow_up_date": safe_isoformat(getattr(job, 'next_follow_up_date', None)),
                        "created_at": safe_isoformat(getattr(job, 'created_at', None)),
                        "updated_at": safe_isoformat(getattr(job, 'updated_at', None)),
                    }
                    
                    # Process event dates
                    event_dates = []
                    
                    # Check interview dates
                    if job.interview_date:
                        if not start_date or not end_date or (start_date <= job.interview_date.date() <= end_date):
                            interview_count += 1
                            event_dates.append({
                                'date': job.interview_date.date().isoformat(),
                                'type': 'IF'
                            })
                    
                    # Check follow-up dates
                    if job.next_follow_up_date:
                        if not start_date or not end_date or (start_date <= job.next_follow_up_date <= end_date):
                            followup_count += 1
                            event_dates.append({
                                'date': safe_isoformat(job.next_follow_up_date),
                                'type': 'NFD'
                            })
                    
                    # Check joining dates
                    if job.expected_joining_date:
                        if not start_date or not end_date or (start_date <= job.expected_joining_date.date() <= end_date):
                            joining_count += 1
                            event_dates.append({
                                'date': job.expected_joining_date.date().isoformat(),
                                'type': 'EDJ'
                            })
                    
                    # Process events with consolidation
                    for event_info in event_dates:
                        date_str = event_info['date']
                        event_type = event_info['type']
                        event_key = f"{job.candidate.id}-{job.id}"
                        
                        if date_str not in event_tracker:
                            event_tracker[date_str] = {}
                        
                        if event_key in event_tracker[date_str]:
                            existing_event = event_tracker[date_str][event_key]
                            if isinstance(existing_event['type'], str):
                                existing_event['type'] = [existing_event['type']]
                            if event_type not in existing_event['type']:
                                existing_event['type'].append(event_type)
                        else:
                            event_tracker[date_str][event_key] = {
                                "type": event_type,
                                "candidate": candidate_cache[job.candidate.id],
                                "client_job": client_job_data
                            }
                            
                except Exception as job_error:
                    logger.error(f"[CALENDAR-STATS] Error processing job {job.id}: {str(job_error)}")
                    continue
            
            logger.info(f"[CALENDAR-STATS] Processing complete - Events: {len(event_tracker)}")
            
        except Exception as e:
            logger.error(f"[CALENDAR-STATS] Data processing error: {str(e)}")
            return Response({
                'error': 'Data processing failed',
                'details': str(e),
                'step': 'data_processing'
            }, status=500)
        
        # Step 5: Format final response with error handling
        try:
            daily_stats = {}
            event_type_counts = {}
            
            # Try date formatting with fallback
            try:
                candidate_list = list(candidate_cache.values())
                formatted_candidates = self._format_dates_in_data(candidate_list)
                for i, candidate_id in enumerate(candidate_cache.keys()):
                    candidate_cache[candidate_id] = formatted_candidates[i]
                logger.info("[CALENDAR-STATS] Date formatting completed")
            except Exception as date_format_error:
                logger.warning(f"[CALENDAR-STATS] Date formatting failed: {str(date_format_error)}")
                # Continue without date formatting
            
            # Build final response
            for date_str, date_events in event_tracker.items():
                daily_stats[date_str] = []
                event_type_counts[date_str] = {'IF': 0, 'NFD': 0, 'EDJ': 0}
                
                for event_key, event_data in date_events.items():
                    if isinstance(event_data['type'], list):
                        for event_type in event_data['type']:
                            event_type_counts[date_str][event_type] += 1
                        event_data['type'] = '+'.join(sorted(event_data['type']))
                        event_data['multiple_events'] = True
                    else:
                        event_type_counts[date_str][event_data['type']] += 1
                        event_data['multiple_events'] = False
                    
                    event_data['candidate'] = candidate_cache[event_data['candidate']['id']]
                    daily_stats[date_str].append(event_data)
            
            # Convert to list format
            events = []
            for date_str, day_events in daily_stats.items():
                if day_events:
                    events.append({
                        'date': date_str,
                        'events': day_events,
                        'event_counts': event_type_counts[date_str]
                    })
            
            logger.info(f"[CALENDAR-STATS] Response built successfully - {len(events)} event days")
            
            return Response({
                'month': f"{year}-{month:02d}" if 'year' in locals() and 'month' in locals() else 'unknown',
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
                    'serializer_used': 'CandidateSerializer (Full Details + Employee Enhancement + Date Formatting)',
                    'query_optimizations': [
                        'select_related for candidate',
                        'candidate serialization caching',
                        'single query for all data'
                    ]
                }
            })
            
        except Exception as e:
            logger.error(f"[CALENDAR-STATS] Response formatting error: {str(e)}")
            return Response({
                'error': 'Response formatting failed',
                'details': str(e),
                'step': 'response_formatting'
            }, status=500)
        
    except Exception as e:
        import traceback
        logger.error(f"[CALENDAR-STATS] Unexpected error: {str(e)}")
        logger.error(traceback.format_exc())
        return Response({
            'error': 'Unexpected server error',
            'details': str(e),
            'traceback': traceback.format_exc()[:1000],  # Limit traceback size
            'month': f"{year}-{month:02d}" if 'year' in locals() and 'month' in locals() else 'unknown'
        }, status=500)
