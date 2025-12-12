"""
Script to fix corrupted event data
Converts count values to empty strings so they can be properly populated
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'HR_CRM.settings')
django.setup()

from events.models import CallDetails

def fix_corrupted_data():
    """Fix events that have count values instead of candidate IDs"""
    print("=" * 60)
    print("FIXING CORRUPTED EVENT DATA")
    print("=" * 60)
    
    # Get all events
    events = CallDetails.objects.all()
    fixed_count = 0
    
    for event in events:
        needs_fix = False
        
        # Check tb_calls_onplan
        if event.tb_calls_onplan:
            value = str(event.tb_calls_onplan).strip()
            # If it's a single digit number (count), clear it
            if value.isdigit() and len(value) <= 2 and ',' not in value:
                print(f"Event {event.id}: Clearing tb_calls_onplan (was: {value})")
                event.tb_calls_onplan = ''
                needs_fix = True
        
        # Check tb_calls_onothers
        if event.tb_calls_onothers:
            value = str(event.tb_calls_onothers).strip()
            if value.isdigit() and len(value) <= 2 and ',' not in value:
                print(f"Event {event.id}: Clearing tb_calls_onothers (was: {value})")
                event.tb_calls_onothers = ''
                needs_fix = True
        
        # Check tb_calls_profiles
        if event.tb_calls_profiles:
            value = str(event.tb_calls_profiles).strip()
            if value.isdigit() and len(value) <= 2 and ',' not in value:
                print(f"Event {event.id}: Clearing tb_calls_profiles (was: {value})")
                event.tb_calls_profiles = ''
                needs_fix = True
        
        # Check tb_calls_profilesothers
        if event.tb_calls_profilesothers:
            value = str(event.tb_calls_profilesothers).strip()
            if value.isdigit() and len(value) <= 2 and ',' not in value:
                print(f"Event {event.id}: Clearing tb_calls_profilesothers (was: {value})")
                event.tb_calls_profilesothers = ''
                needs_fix = True
        
        if needs_fix:
            event.save()
            fixed_count += 1
    
    print("=" * 60)
    print(f"✅ Fixed {fixed_count} events")
    print("=" * 60)
    
    # Show current state
    print("\nCurrent event data:")
    for event in events[:5]:  # Show first 5 events
        print(f"\nEvent {event.id} ({event.tb_call_plan_data}):")
        print(f"  tb_calls_onplan: '{event.tb_calls_onplan}'")
        print(f"  tb_calls_onothers: '{event.tb_calls_onothers}'")
        print(f"  tb_calls_profiles: '{event.tb_calls_profiles}'")
        print(f"  tb_calls_profilesothers: '{event.tb_calls_profilesothers}'")

if __name__ == '__main__':
    fix_corrupted_data()
