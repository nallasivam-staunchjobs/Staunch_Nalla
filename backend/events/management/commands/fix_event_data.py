"""
Management command to fix corrupted event data
Usage: python manage.py fix_event_data
"""
from django.core.management.base import BaseCommand
from events.models import CallDetails


class Command(BaseCommand):
    help = 'Fix corrupted event data - converts count values to empty strings'

    def handle(self, *args, **options):
        self.stdout.write("=" * 60)
        self.stdout.write("FIXING CORRUPTED EVENT DATA")
        self.stdout.write("=" * 60)
        
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
                    self.stdout.write(f"Event {event.id}: Clearing tb_calls_onplan (was: {value})")
                    event.tb_calls_onplan = ''
                    needs_fix = True
            
            # Check tb_calls_onothers
            if event.tb_calls_onothers:
                value = str(event.tb_calls_onothers).strip()
                if value.isdigit() and len(value) <= 2 and ',' not in value:
                    self.stdout.write(f"Event {event.id}: Clearing tb_calls_onothers (was: {value})")
                    event.tb_calls_onothers = ''
                    needs_fix = True
            
            # Check tb_calls_profiles
            if event.tb_calls_profiles:
                value = str(event.tb_calls_profiles).strip()
                if value.isdigit() and len(value) <= 2 and ',' not in value:
                    self.stdout.write(f"Event {event.id}: Clearing tb_calls_profiles (was: {value})")
                    event.tb_calls_profiles = ''
                    needs_fix = True
            
            # Check tb_calls_profilesothers
            if event.tb_calls_profilesothers:
                value = str(event.tb_calls_profilesothers).strip()
                if value.isdigit() and len(value) <= 2 and ',' not in value:
                    self.stdout.write(f"Event {event.id}: Clearing tb_calls_profilesothers (was: {value})")
                    event.tb_calls_profilesothers = ''
                    needs_fix = True
            
            if needs_fix:
                event.save()
                fixed_count += 1
        
        self.stdout.write("=" * 60)
        self.stdout.write(self.style.SUCCESS(f'✅ Fixed {fixed_count} events'))
        self.stdout.write("=" * 60)
        
        # Show current state
        self.stdout.write("\nCurrent event data (first 5):")
        for event in events[:5]:
            self.stdout.write(f"\nEvent {event.id} ({event.tb_call_plan_data}):")
            self.stdout.write(f"  tb_calls_onplan: '{event.tb_calls_onplan}'")
            self.stdout.write(f"  tb_calls_onothers: '{event.tb_calls_onothers}'")
            self.stdout.write(f"  tb_calls_profiles: '{event.tb_calls_profiles}'")
            self.stdout.write(f"  tb_calls_profilesothers: '{event.tb_calls_profilesothers}'")
