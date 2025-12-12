#!/usr/bin/env python3
"""
Simple script to check candidate 2089 specifically
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

def check_candidate_2089():
    """Check candidate 2089 in database using raw SQL"""
    print("=" * 80)
    print("CHECKING CANDIDATE 2089 IN DATABASE")
    print("=" * 80)
    
    with connection.cursor() as cursor:
        # Find all call details containing candidate 2089
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
            WHERE 
                tb_calls_onplan LIKE '%2089%' OR
                tb_calls_onothers LIKE '%2089%' OR
                tb_calls_profiles LIKE '%2089%' OR
                tb_calls_profilesothers LIKE '%2089%'
        """)
        
        results = cursor.fetchall()
        
        if not results:
            print("No call details found containing candidate 2089")
            return
        
        print(f"Found {len(results)} call details containing candidate 2089:")
        print()
        
        for row in results:
            call_detail_id, onplan, onothers, profiles, profilesothers, emp_id, city_id = row
            
            print(f"Call Detail ID: {call_detail_id}")
            print(f"Employee ID: {emp_id}")
            print(f"City ID: {city_id}")
            print(f"tb_calls_onplan: {onplan}")
            print(f"tb_calls_onothers: {onothers}")
            print(f"tb_calls_profiles: {profiles}")
            print(f"tb_calls_profilesothers: {profilesothers}")
            
            # Check if 2089 is in multiple fields
            candidate_2089_str = "2089"
            
            in_onplan = onplan and candidate_2089_str in str(onplan).split(',')
            in_onothers = onothers and candidate_2089_str in str(onothers).split(',')
            in_profiles = profiles and candidate_2089_str in str(profiles).split(',')
            in_profilesothers = profilesothers and candidate_2089_str in str(profilesothers).split(',')
            
            print(f"Candidate 2089 appears in:")
            if in_onplan:
                print("  - tb_calls_onplan: YES")
            if in_onothers:
                print("  - tb_calls_onothers: YES")
            if in_profiles:
                print("  - tb_calls_profiles: YES")
            if in_profilesothers:
                print("  - tb_calls_profilesothers: YES")
            
            # Check for duplicates
            if (in_onplan and in_onothers) or (in_profiles and in_profilesothers):
                print("  *** DUPLICATE DETECTED! ***")
            else:
                print("  No duplicates found")
            
            print("-" * 40)

def check_all_duplicates():
    """Check for any duplicates in the database"""
    print("=" * 80)
    print("CHECKING FOR ALL DUPLICATES IN DATABASE")
    print("=" * 80)
    
    with connection.cursor() as cursor:
        # Find call details that might have duplicates
        cursor.execute("""
            SELECT 
                id,
                tb_calls_onplan,
                tb_calls_onothers,
                tb_calls_profiles,
                tb_calls_profilesothers
            FROM tb_call_details 
            WHERE 
                (tb_calls_onplan IS NOT NULL AND tb_calls_onplan != '' AND
                 tb_calls_onothers IS NOT NULL AND tb_calls_onothers != '') OR
                (tb_calls_profiles IS NOT NULL AND tb_calls_profiles != '' AND
                 tb_calls_profilesothers IS NOT NULL AND tb_calls_profilesothers != '')
            LIMIT 50
        """)
        
        results = cursor.fetchall()
        duplicates_found = 0
        
        for row in results:
            call_detail_id, onplan, onothers, profiles, profilesothers = row
            
            # Get candidate IDs from each field
            onplan_ids = set(str(onplan).split(',')) if onplan else set()
            onothers_ids = set(str(onothers).split(',')) if onothers else set()
            profiles_ids = set(str(profiles).split(',')) if profiles else set()
            profilesothers_ids = set(str(profilesothers).split(',')) if profilesothers else set()
            
            # Check for overlaps
            onplan_onothers_overlap = onplan_ids.intersection(onothers_ids)
            profiles_profilesothers_overlap = profiles_ids.intersection(profilesothers_ids)
            
            if onplan_onothers_overlap or profiles_profilesothers_overlap:
                duplicates_found += 1
                print(f"Call Detail ID: {call_detail_id}")
                
                if onplan_onothers_overlap:
                    print(f"  Candidates in BOTH onplan and onothers: {onplan_onothers_overlap}")
                
                if profiles_profilesothers_overlap:
                    print(f"  Candidates in BOTH profiles and profilesothers: {profiles_profilesothers_overlap}")
                
                print("-" * 40)
        
        print(f"Total duplicates found: {duplicates_found}")

if __name__ == "__main__":
    check_candidate_2089()
    print()
    check_all_duplicates()
