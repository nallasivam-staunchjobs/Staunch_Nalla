#!/usr/bin/env python3
"""
Test script for candidate status history functionality
Run this from the backend directory: python test_status_history.py
"""

import os
import sys
import django
from datetime import date

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from candidate.models import CandidateStatusHistory

def test_status_history():
    print("🧪 Testing Candidate Status History System")
    print("=" * 50)
    
    # Test 1: Create a status history entry
    print("\n1. Testing status history creation...")
    try:
        history_entry = CandidateStatusHistory.create_status_entry(
            candidate_id=999,  # Test candidate ID
            client_job_id=1001,
            vendor_id=501,
            client_name="Test Client Ltd",
            remarks="interested",
            change_date=date.today(),
            created_by="TEST001",
            extra_notes="Test entry created by script"
        )
        
        if history_entry:
            print(f"✅ Status history created successfully: ID {history_entry.id}")
            print(f"   - Candidate ID: {history_entry.candidate_id}")
            print(f"   - Client Job ID: {history_entry.client_job_id}")
            print(f"   - Vendor ID: {history_entry.vendor_id}")
            print(f"   - Client Name: {history_entry.client_name}")
            print(f"   - Remarks: {history_entry.remarks}")
            print(f"   - Change Date: {history_entry.change_date}")
            print(f"   - Created By: {history_entry.created_by}")
        else:
            print("❌ Failed to create status history entry")
            
    except Exception as e:
        print(f"❌ Error creating status history: {e}")
    
    # Test 2: Get timeline for candidate
    print("\n2. Testing timeline retrieval...")
    try:
        timeline = CandidateStatusHistory.get_candidate_timeline(999)
        print(f"✅ Timeline retrieved: {len(timeline)} entries found")
        for entry in timeline[:3]:  # Show first 3 entries
            print(f"   - {entry.change_date}: {entry.remarks} ({entry.client_name or 'No client'})")
    except Exception as e:
        print(f"❌ Error retrieving timeline: {e}")
    
    # Test 3: Get calendar data
    print("\n3. Testing calendar data...")
    try:
        calendar_data = CandidateStatusHistory.get_calendar_data(999, 2025, 11)
        print(f"✅ Calendar data retrieved: {len(calendar_data)} dates with events")
        for date_key, events in list(calendar_data.items())[:3]:  # Show first 3 dates
            print(f"   - {date_key}: {len(events)} event(s)")
    except Exception as e:
        print(f"❌ Error retrieving calendar data: {e}")
    
    # Test 4: Check database table structure
    print("\n4. Checking database table structure...")
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("DESCRIBE candidate_status_history")
            columns = cursor.fetchall()
            print("✅ Table structure:")
            for col in columns:
                print(f"   - {col[0]}: {col[1]} {'(NULL)' if col[2] == 'YES' else '(NOT NULL)'}")
    except Exception as e:
        print(f"❌ Error checking table structure: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Test completed! Check the results above.")
    print("💡 If tests pass, the status history system is ready to use.")

if __name__ == "__main__":
    test_status_history()
