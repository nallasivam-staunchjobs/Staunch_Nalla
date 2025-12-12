#!/usr/bin/env python3
"""
Fix the actual duplicates found in the database
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection

def fix_duplicates():
    """Fix all duplicates found in the database"""
    print("=" * 80)
    print("FIXING ACTUAL DUPLICATES IN DATABASE")
    print("=" * 80)
    
    # List of call detail IDs with duplicates (from previous check)
    duplicate_call_details = [10, 31, 103, 105, 108, 136, 147, 153, 183, 190, 195]
    
    total_fixes = 0
    
    with connection.cursor() as cursor:
        for call_detail_id in duplicate_call_details:
            print(f"Processing Call Detail ID: {call_detail_id}")
            
            # Get current data
            cursor.execute("""
                SELECT 
                    id,
                    tb_calls_onplan,
                    tb_calls_onothers,
                    tb_calls_profiles,
                    tb_calls_profilesothers,
                    tb_call_emp_id,
                    tb_call_city_id
                FROM tb_call_details 
                WHERE id = %s
            """, [call_detail_id])
            
            result = cursor.fetchone()
            if not result:
                print(f"  Call Detail {call_detail_id} not found")
                continue
                
            call_id, onplan, onothers, profiles, profilesothers, emp_id, city_id = result
            
            print(f"  Employee ID: {emp_id}, City ID: {city_id}")
            print(f"  Before - onplan: {onplan}")
            print(f"  Before - onothers: {onothers}")
            print(f"  Before - profiles: {profiles}")
            print(f"  Before - profilesothers: {profilesothers}")
            
            # Get candidate and employee cities to determine correct placement
            candidate_cities = {}
            
            # Get all candidate IDs from all fields
            all_candidates = set()
            for field_value in [onplan, onothers, profiles, profilesothers]:
                if field_value:
                    candidates = [c.strip() for c in str(field_value).split(',') if c.strip()]
                    all_candidates.update(candidates)
            
            # Get candidate cities
            for candidate_id in all_candidates:
                try:
                    cursor.execute("SELECT city FROM candidate_candidate WHERE id = %s", [candidate_id])
                    city_result = cursor.fetchone()
                    if city_result:
                        candidate_cities[candidate_id] = city_result[0] or ""
                    else:
                        candidate_cities[candidate_id] = ""
                except:
                    candidate_cities[candidate_id] = ""
            
            # Get employee city
            employee_city = ""
            try:
                cursor.execute("SELECT city FROM bl_city WHERE id = %s", [city_id])
                city_result = cursor.fetchone()
                if city_result:
                    employee_city = city_result[0] or ""
            except:
                pass
            
            print(f"  Employee city: '{employee_city}'")
            
            # Separate candidates into correct categories
            correct_onplan = []
            correct_onothers = []
            correct_profiles = []
            correct_profilesothers = []
            
            # Process each candidate
            for candidate_id in all_candidates:
                candidate_city = candidate_cities.get(candidate_id, "")
                
                # Normalize for comparison
                candidate_normalized = candidate_city.strip().lower().replace(' ', '') if candidate_city else ""
                employee_normalized = employee_city.strip().lower().replace(' ', '') if employee_city else ""
                
                should_be_onplan = (candidate_normalized == employee_normalized and candidate_normalized != "")
                
                print(f"    Candidate {candidate_id}: city='{candidate_city}' -> {'onplan' if should_be_onplan else 'onothers'}")
                
                # Check if candidate was in onplan or onothers originally
                was_in_onplan = onplan and candidate_id in str(onplan).split(',')
                was_in_onothers = onothers and candidate_id in str(onothers).split(',')
                was_in_profiles = profiles and candidate_id in str(profiles).split(',')
                was_in_profilesothers = profilesothers and candidate_id in str(profilesothers).split(',')
                
                if was_in_onplan or was_in_onothers:
                    if should_be_onplan:
                        correct_onplan.append(candidate_id)
                    else:
                        correct_onothers.append(candidate_id)
                
                if was_in_profiles or was_in_profilesothers:
                    if should_be_onplan:
                        correct_profiles.append(candidate_id)
                    else:
                        correct_profilesothers.append(candidate_id)
            
            # Create corrected field values
            new_onplan = ','.join(correct_onplan) if correct_onplan else None
            new_onothers = ','.join(correct_onothers) if correct_onothers else None
            new_profiles = ','.join(correct_profiles) if correct_profiles else None
            new_profilesothers = ','.join(correct_profilesothers) if correct_profilesothers else None
            
            print(f"  After  - onplan: {new_onplan}")
            print(f"  After  - onothers: {new_onothers}")
            print(f"  After  - profiles: {new_profiles}")
            print(f"  After  - profilesothers: {new_profilesothers}")
            
            # Update the database
            cursor.execute("""
                UPDATE tb_call_details 
                SET 
                    tb_calls_onplan = %s,
                    tb_calls_onothers = %s,
                    tb_calls_profiles = %s,
                    tb_calls_profilesothers = %s
                WHERE id = %s
            """, [new_onplan, new_onothers, new_profiles, new_profilesothers, call_detail_id])
            
            total_fixes += 1
            print(f"  ✅ Fixed Call Detail {call_detail_id}")
            print("-" * 40)
    
    print(f"Total call details fixed: {total_fixes}")
    print("=" * 80)

if __name__ == "__main__":
    fix_duplicates()
