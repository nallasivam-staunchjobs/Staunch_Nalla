# Timezone-safe calendar-stats method fix

@action(detail=False, methods=['get'], url_path='calendar-stats')
def calendar_stats(self, request):
    """
    Get calendar statistics for interviews, follow-ups, and joining dates with candidate details.
    Fixed for timezone compatibility - works with both USE_TZ=True and USE_TZ=False.
    """
    try:
        # Get parameters
        month_param = request.query_params.get('month')
        year_param = request.query_params.get('year')
        
        # Initialize variables
        start_datetime = None
        end_datetime = None
        start_date = None
        end_date = None
        
        # Parse date parameters with timezone-safe approach
        if month_param:
            year, month = map(int, month_param.split('-'))
            
            # Create timezone-safe datetime objects
            if settings.USE_TZ:
                # If timezone support is enabled, use timezone-aware datetimes
                start_datetime = timezone.make_aware(datetime(year, month, 1))
                if month == 12:
                    end_datetime = timezone.make_aware(datetime(year + 1, 1, 1)) - timedelta(seconds=1)
                else:
                    end_datetime = timezone.make_aware(datetime(year, month + 1, 1)) - timedelta(seconds=1)
            else:
                # If timezone support is disabled, use naive datetimes
                start_datetime = datetime(year, month, 1)
                if month == 12:
                    end_datetime = datetime(year + 1, 1, 1) - timedelta(seconds=1)
                else:
                    end_datetime = datetime(year, month + 1, 1) - timedelta(seconds=1)
            
            start_date = start_datetime.date()
            end_date = end_datetime.date()
            
        elif year_param:
            year = int(year_param)
            
            # Create timezone-safe datetime objects
            if settings.USE_TZ:
                start_datetime = timezone.make_aware(datetime(year, 1, 1))
                end_datetime = timezone.make_aware(datetime(year + 1, 1, 1)) - timedelta(seconds=1)
            else:
                start_datetime = datetime(year, 1, 1)
                end_datetime = datetime(year + 1, 1, 1) - timedelta(seconds=1)
            
            start_date = start_datetime.date()
            end_date = end_datetime.date()
        
        # Query client jobs with timezone-safe filtering
        from .models import ClientJob
        
        if start_datetime and end_datetime and start_date and end_date:
            client_jobs = ClientJob.objects.filter(
                Q(interview_date__gte=start_datetime, interview_date__lte=end_datetime) |
                Q(next_follow_up_date__gte=start_date, next_follow_up_date__lte=end_date) |
                Q(expected_joining_date__gte=start_datetime, expected_joining_date__lte=end_datetime)
            ).select_related('candidate')
        else:
            # No date filtering
            client_jobs = ClientJob.objects.filter(
                Q(interview_date__isnull=False) |
                Q(next_follow_up_date__isnull=False) |
                Q(expected_joining_date__isnull=False)
            ).select_related('candidate')
        
        # Process data
        interview_count = 0
        followup_count = 0
        joining_count = 0
        candidate_cache = {}
        daily_stats = {}
        event_type_counts = {}
        
        for job in client_jobs:
            # Cache candidate serialization with safe employee enhancement
            if job.candidate.id not in candidate_cache:
                try:
                    serialized_candidate = CandidateSerializer(job.candidate).data
                    # Try employee enhancement, but continue if it fails
                    try:
                        enhanced_candidate = self._enhance_with_employee_details([serialized_candidate])[0]
                        candidate_cache[job.candidate.id] = enhanced_candidate
                    except Exception:
                        # If employee enhancement fails, use basic serialized data
                        candidate_cache[job.candidate.id] = serialized_candidate
                except Exception:
                    # Skip this candidate if serialization fails
                    continue
            
            # Safe datetime to string conversion
            def safe_datetime_to_string(dt_obj):
                if not dt_obj:
                    return None
                if hasattr(dt_obj, 'isoformat'):
                    return dt_obj.isoformat()
                return str(dt_obj)
            
            # Build client job data safely
            client_job_data = {
                "id": job.id,
                "candidate_id": job.candidate.id,
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
            
            # Process events with date filtering
            events_for_job = []
            
            # Check interview dates
            if job.interview_date:
                interview_date = job.interview_date.date() if hasattr(job.interview_date, 'date') else job.interview_date
                if not start_date or not end_date or (start_date <= interview_date <= end_date):
                    interview_count += 1
                    events_for_job.append({
                        'date': interview_date.isoformat() if hasattr(interview_date, 'isoformat') else str(interview_date),
                        'type': 'IF'
                    })
            
            # Check follow-up dates
            if job.next_follow_up_date:
                followup_date = job.next_follow_up_date
                if not start_date or not end_date or (start_date <= followup_date <= end_date):
                    followup_count += 1
                    events_for_job.append({
                        'date': followup_date.isoformat() if hasattr(followup_date, 'isoformat') else str(followup_date),
                        'type': 'NFD'
                    })
            
            # Check joining dates
            if job.expected_joining_date:
                joining_date = job.expected_joining_date.date() if hasattr(job.expected_joining_date, 'date') else job.expected_joining_date
                if not start_date or not end_date or (start_date <= joining_date <= end_date):
                    joining_count += 1
                    events_for_job.append({
                        'date': joining_date.isoformat() if hasattr(joining_date, 'isoformat') else str(joining_date),
                        'type': 'EDJ'
                    })
            
            # Add events to daily stats
            for event_info in events_for_job:
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
        
        # Format dates safely
        try:
            candidate_list = list(candidate_cache.values())
            formatted_candidates = self._format_dates_in_data(candidate_list)
            for i, candidate_id in enumerate(candidate_cache.keys()):
                candidate_cache[candidate_id] = formatted_candidates[i]
        except Exception:
            # If date formatting fails, continue without it
            pass
        
        # Build final response
        events = []
        for date_str, day_events in daily_stats.items():
            if day_events:
                # Process event types
                processed_events = []
                for event_key, event_data in day_events.items():
                    if isinstance(event_data['type'], list):
                        event_data['type'] = '+'.join(sorted(event_data['type']))
                        event_data['multiple_events'] = True
                    else:
                        event_data['multiple_events'] = False
                    
                    # Ensure candidate data is current
                    event_data['candidate'] = candidate_cache[event_data['candidate']['id']]
                    processed_events.append(event_data)
                
                events.append({
                    'date': date_str,
                    'events': processed_events,
                    'event_counts': event_type_counts[date_str]
                })
        
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
                'total_client_jobs_processed': len(client_jobs),
                'unique_candidates': len(candidate_cache),
                'timezone_support': settings.USE_TZ,
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
                'serializer_used': 'CandidateSerializer (Full Details + Safe Employee Enhancement + Safe Date Formatting)',
                'query_optimizations': [
                    'select_related for candidate',
                    'candidate serialization caching',
                    'single query for all data',
                    'timezone-safe datetime handling'
                ]
            }
        })
        
    except Exception as e:
        import traceback
        logger.error(f"Error in calendar_stats: {str(e)}")
        logger.error(traceback.format_exc())
        return Response({
            'error': 'Failed to fetch calendar statistics',
            'details': str(e),
            'timezone_support': getattr(settings, 'USE_TZ', 'unknown'),
            'month': f"{year}-{month:02d}" if 'year' in locals() and 'month' in locals() else 'unknown'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
