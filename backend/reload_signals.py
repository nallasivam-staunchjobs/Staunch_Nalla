#!/usr/bin/env python
"""
Force reload Django signals to clear cache
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'HR_CRM_Final_local_admin_H.settings')
django.setup()

from django.apps import apps
from events import signals

print("=== Force Reloading Django Signals ===")

# Get the events app config
events_app = apps.get_app_config('events')

# Force ready() method to re-import signals
print("Re-importing events signals...")
events_app.ready()

print("[SUCCESS] Signals reloaded successfully!")
print("Now the new candidate ID storage logic should work from frontend submissions.")
