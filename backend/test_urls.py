#!/usr/bin/env python3
"""
Test script to check if URL patterns are properly configured
Run this from the backend directory: python test_urls.py
"""

import os
import sys
import django
from django.urls import reverse
from django.test import Client

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

def test_status_history_urls():
    print("🧪 Testing Status History URL Patterns")
    print("=" * 50)
    
    try:
        # Test URL reverse lookup
        print("\n1. Testing URL reverse lookup...")
        
        create_url = reverse('create-status-history')
        print(f"✅ create-status-history URL: {create_url}")
        
        timeline_url = reverse('get-candidate-timeline', kwargs={'candidate_id': 123})
        print(f"✅ get-candidate-timeline URL: {timeline_url}")
        
        calendar_url = reverse('get-candidate-calendar', kwargs={'candidate_id': 123})
        print(f"✅ get-candidate-calendar URL: {calendar_url}")
        
        stats_url = reverse('get-status-history-stats')
        print(f"✅ get-status-history-stats URL: {stats_url}")
        
    except Exception as e:
        print(f"❌ URL reverse lookup failed: {e}")
        return False
    
    try:
        # Test URL accessibility
        print("\n2. Testing URL accessibility...")
        client = Client()
        
        # Test GET request to create endpoint (should return 405 Method Not Allowed)
        response = client.get('/api/candidate/status-history/create/')
        print(f"GET /api/candidate/status-history/create/ - Status: {response.status_code}")
        
        # Test GET request to timeline endpoint
        response = client.get('/api/candidate/candidates/123/timeline/')
        print(f"GET /api/candidate/candidates/123/timeline/ - Status: {response.status_code}")
        
        # Test GET request to calendar endpoint
        response = client.get('/api/candidate/candidates/123/calendar/')
        print(f"GET /api/candidate/candidates/123/calendar/ - Status: {response.status_code}")
        
    except Exception as e:
        print(f"❌ URL accessibility test failed: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎯 URL pattern test completed!")
    return True

if __name__ == "__main__":
    test_status_history_urls()
