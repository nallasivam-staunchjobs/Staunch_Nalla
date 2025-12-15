#!/usr/bin/env python3
"""
Standalone script to fix duplicate candidate IDs in tb_call_details
This script identifies and fixes candidates appearing in both onplan/onothers or profiles/profilesothers
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from events.models import CallDetails
from candidate.models import Candidate
from events.views import remove_candidate_from_list


def get_city_name_from_id(city_id):
    """Get city name from city ID"""
    try:
        from locations.models import City
        city = City.objects.get(id=city_id)
        return city.city.strip() if city.city else ""
    except Exception as e:
        print(f"[ERROR] City lookup failed for ID {city_id}: {str(e)}")
        return ""


def fix_duplicate_candidate(call_detail, candidate_id):
    """Fix duplicate candidate in a specific call detail"""
    try:
        candidate_id_str = str(candidate_id)
        fixes_applied = []
        
        # Get candidate info
        try:
            candidate = Candidate.objects.get(id=candidate_id)
        except Candidate.DoesNotExist:
            print(f"[WARNING] Candidate {candidate_id} not found in database")
            return []
        
        # Check if candidate exists in both onplan and onothers
        in_onplan = (call_detail.tb_calls_onplan and 
                    candidate_id_str in str(call_detail.tb_calls_onplan).split(','))
        in_onothers = (call_detail.tb_calls_onothers and 
                      candidate_id_str in str(call_detail.tb_calls_onothers).split(','))
        
        # Check if candidate exists in both profiles and profilesothers
        in_profiles = (call_detail.tb_calls_profiles and 
                      candidate_id_str in str(call_detail.tb_calls_profiles).split(','))
        in_profilesothers = (call_detail.tb_calls_profilesothers and 
                            candidate_id_str in str(call_detail.tb_calls_profilesothers).split(','))
        
        print(f"[VALIDATION] Call Detail {call_detail.id} - Candidate {candidate_id}:")
        print(f"  - in_onplan: {in_onplan}")
        print(f"  - in_onothers: {in_onothers}")
        print(f"  - in_profiles: {in_profiles}")
        print(f"  - in_profilesothers: {in_profilesothers}")
        
        # Fix onplan/onothers duplicates
        if in_onplan and in_onothers:
            print(f"[ERROR] DUPLICATE DETECTED! Candidate {candidate_id} is in BOTH onplan and onothers")
            
            # Get employee and candidate cities for proper placement
            employee_city = get_city_name_from_id(call_detail.tb_call_city_id)
            candidate_city = candidate.city.strip() if candidate.city else ""
            
            # Normalize for comparison
            candidate_city_normalized = candidate_city.strip().lower().replace(' ', '') if candidate_city else ""
            employee_city_normalized = employee_city.strip().lower().replace(' ', '') if employee_city else ""
            
            print(f"  - Employee city: '{employee_city}' (normalized: '{employee_city_normalized}')")
            print(f"  - Candidate city: '{candidate_city}' (normalized: '{candidate_city_normalized}')")
            
            # Determine correct placement
            should_be_onplan = (candidate_city_normalized == employee_city_normalized and 
                               candidate_city_normalized != "")
            
            if should_be_onplan:
                # Remove from onothers, keep in onplan
                old_onothers = call_detail.tb_calls_onothers
                call_detail.tb_calls_onothers = remove_candidate_from_list(call_detail.tb_calls_onothers, candidate_id)
                fixes_applied.append(f"Removed {candidate_id} from onothers: '{old_onothers}' -> '{call_detail.tb_calls_onothers}'")
                print(f"[FIX] Removed candidate {candidate_id} from onothers (correct placement: onplan)")
            else:
                # Remove from onplan, keep in onothers
                old_onplan = call_detail.tb_calls_onplan
                call_detail.tb_calls_onplan = remove_candidate_from_list(call_detail.tb_calls_onplan, candidate_id)
                fixes_applied.append(f"Removed {candidate_id} from onplan: '{old_onplan}' -> '{call_detail.tb_calls_onplan}'")
                print(f"[FIX] Removed candidate {candidate_id} from onplan (correct placement: onothers)")
        
        # Fix profiles/profilesothers duplicates
        if in_profiles and in_profilesothers:
            print(f"[ERROR] DUPLICATE DETECTED! Candidate {candidate_id} is in BOTH profiles and profilesothers")
            
            # Use same logic as above for profiles
            employee_city = get_city_name_from_id(call_detail.tb_call_city_id)
            candidate_city = candidate.city.strip() if candidate.city else ""
            candidate_city_normalized = candidate_city.strip().lower().replace(' ', '') if candidate_city else ""
            employee_city_normalized = employee_city.strip().lower().replace(' ', '') if employee_city else ""
            should_be_profiles = (candidate_city_normalized == employee_city_normalized and 
                                 candidate_city_normalized != "")
            
            if should_be_profiles:
                # Remove from profilesothers, keep in profiles
                old_profilesothers = call_detail.tb_calls_profilesothers
                call_detail.tb_calls_profilesothers = remove_candidate_from_list(call_detail.tb_calls_profilesothers, candidate_id)
                fixes_applied.append(f"Removed {candidate_id} from profilesothers: '{old_profilesothers}' -> '{call_detail.tb_calls_profilesothers}'")
                print(f"[FIX] Removed candidate {candidate_id} from profilesothers (correct placement: profiles)")
            else:
                # Remove from profiles, keep in profilesothers
                old_profiles = call_detail.tb_calls_profiles
                call_detail.tb_calls_profiles = remove_candidate_from_list(call_detail.tb_calls_profiles, candidate_id)
                fixes_applied.append(f"Removed {candidate_id} from profiles: '{old_profiles}' -> '{call_detail.tb_calls_profiles}'")
                print(f"[FIX] Removed candidate {candidate_id} from profiles (correct placement: profilesothers)")
        
        return fixes_applied
        
    except Exception as e:
        print(f"[ERROR] Failed to fix duplicates for candidate {candidate_id}: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return []


def find_and_fix_all_duplicates():
    """Find and fix all duplicate candidates in the database"""
    print("=" * 80)
    print("DUPLICATE CANDIDATE FIXER")
    print("=" * 80)
    
    total_call_details = 0
    total_duplicates_found = 0
    total_fixes_applied = 0
    
    # Get all call details
    call_details = CallDetails.objects.all()
    
    for call_detail in call_details:
        total_call_details += 1
        
        # Get all candidate IDs from all fields
        all_candidate_ids = set()
        
        # Extract candidate IDs from each field
        for field_name in ['tb_calls_onplan', 'tb_calls_onothers', 'tb_calls_profiles', 'tb_calls_profilesothers']:
            field_value = getattr(call_detail, field_name)
            if field_value:
                candidate_ids = [id.strip() for id in str(field_value).split(',') if id.strip()]
                all_candidate_ids.update(candidate_ids)
        
        # Check each candidate for duplicates
        for candidate_id in all_candidate_ids:
            try:
                candidate_id_int = int(candidate_id)
                fixes = fix_duplicate_candidate(call_detail, candidate_id_int)
                
                if fixes:
                    total_duplicates_found += 1
                    total_fixes_applied += len(fixes)
                    
                    # Save the fixes
                    call_detail.save()
                    print(f"[SUCCESS] Applied {len(fixes)} fixes for candidate {candidate_id} in call detail {call_detail.id}")
                    
            except ValueError:
                print(f"[WARNING] Invalid candidate ID: '{candidate_id}' in call detail {call_detail.id}")
                continue
    
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total call details processed: {total_call_details}")
    print(f"Total duplicates found: {total_duplicates_found}")
    print(f"Total fixes applied: {total_fixes_applied}")
    print("=" * 80)


def check_specific_candidate(candidate_id):
    """Check a specific candidate for duplicates"""
    print("=" * 80)
    print(f"CHECKING CANDIDATE {candidate_id} FOR DUPLICATES")
    print("=" * 80)
    
    candidate_id_str = str(candidate_id)
    found_in_call_details = []
    
    # Find all call details containing this candidate
    call_details = CallDetails.objects.filter(
        models.Q(tb_calls_onplan__contains=candidate_id_str) |
        models.Q(tb_calls_onothers__contains=candidate_id_str) |
        models.Q(tb_calls_profiles__contains=candidate_id_str) |
        models.Q(tb_calls_profilesothers__contains=candidate_id_str)
    )
    
    for call_detail in call_details:
        in_onplan = candidate_id_str in str(call_detail.tb_calls_onplan or '').split(',')
        in_onothers = candidate_id_str in str(call_detail.tb_calls_onothers or '').split(',')
        in_profiles = candidate_id_str in str(call_detail.tb_calls_profiles or '').split(',')
        in_profilesothers = candidate_id_str in str(call_detail.tb_calls_profilesothers or '').split(',')
        
        print(f"Call Detail {call_detail.id}:")
        print(f"  - tb_calls_onplan: {call_detail.tb_calls_onplan}")
        print(f"  - tb_calls_onothers: {call_detail.tb_calls_onothers}")
        print(f"  - tb_calls_profiles: {call_detail.tb_calls_profiles}")
        print(f"  - tb_calls_profilesothers: {call_detail.tb_calls_profilesothers}")
        print(f"  - Candidate {candidate_id} in onplan: {in_onplan}")
        print(f"  - Candidate {candidate_id} in onothers: {in_onothers}")
        print(f"  - Candidate {candidate_id} in profiles: {in_profiles}")
        print(f"  - Candidate {candidate_id} in profilesothers: {in_profilesothers}")
        
        # Check for duplicates
        if (in_onplan and in_onothers) or (in_profiles and in_profilesothers):
            print(f"  - [ERROR] DUPLICATE DETECTED!")
            
            # Fix the duplicate
            fixes = fix_duplicate_candidate(call_detail, candidate_id)
            if fixes:
                call_detail.save()
                print(f"  - [SUCCESS] Applied {len(fixes)} fixes")
                for fix in fixes:
                    print(f"    - {fix}")
        else:
            print(f"  - [SUCCESS] No duplicates found")
        
        print()


if __name__ == "__main__":
    import sys
    from django.db import models
    
    if len(sys.argv) > 1:
        # Check specific candidate
        candidate_id = int(sys.argv[1])
        check_specific_candidate(candidate_id)
    else:
        # Check all candidates
        find_and_fix_all_duplicates()
