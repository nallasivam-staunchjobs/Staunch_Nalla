from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from events.models import Event
from datetime import datetime, timedelta
import random

class Command(BaseCommand):
    help = 'Create sample events for testing'

    def handle(self, *args, **options):
        # Get or create a user for the events
        user, created = User.objects.get_or_create(
            username='admin',
            defaults={'email': 'admin@example.com', 'is_staff': True, 'is_superuser': True}
        )
        if created:
            user.set_password('admin123')
            user.save()
            self.stdout.write(f'Created admin user with password: admin123')

        # Sample data
        employees = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson']
        clients = ['Acme Corp', 'Tech Solutions', 'Global Industries', 'Innovate Ltd', 'Future Systems']
        states = ['Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh']
        cities = ['Chennai', 'Bangalore', 'Coimbatore', 'Madurai', 'Kochi']
        positions = ['Software Engineer', 'Project Manager', 'Business Analyst', 'Team Lead', 'Developer']
        sources = ['LinkedIn', 'Referral', 'Website', 'Cold Call', 'Email Campaign']
        branches = ['MDU', 'CBE', 'CHN', 'BLR']
        plans = ['P1', 'P2', 'P3', 'P4', 'P5']
        statuses = ['scheduled', 'in_progress', 'completed', 'cancelled']
        priorities = ['low', 'medium', 'high', 'urgent']
        meeting_types = ['In-Person', 'Phone Call', 'Video Call', 'Email', 'Online']

        # Clear existing events
        Event.objects.all().delete()
        self.stdout.write('Cleared existing events')

        # Create events for the current month and next month
        today = datetime.now().date()
        start_date = today.replace(day=1)  # First day of current month
        end_date = (start_date + timedelta(days=62)).replace(day=1) - timedelta(days=1)  # Last day of next month

        events_created = 0
        current_date = start_date

        while current_date <= end_date:
            # Create 2-5 events per day randomly
            num_events = random.randint(0, 5)

            for _ in range(num_events):
                # Random time between 9 AM and 6 PM
                hour = random.randint(9, 17)
                minute = random.choice([0, 15, 30, 45])
                time = f"{hour:02d}:{minute:02d}:00"

                event = Event.objects.create(
                    plan=random.choice(plans),
                    employee_name=random.choice(employees),
                    client_name=random.choice(clients),
                    state=random.choice(states),
                    city=random.choice(cities),
                    position=random.choice(positions),
                    source=random.choice(sources),
                    branch=random.choice(branches),
                    date=current_date,
                    time=time,
                    duration=random.choice([30, 45, 60, 90, 120]),
                    remarks=f"Meeting with {random.choice(clients)} regarding {random.choice(['project discussion', 'requirement analysis', 'proposal presentation', 'follow-up meeting', 'contract negotiation'])}",
                    status=random.choice(statuses),
                    priority=random.choice(priorities),
                    meeting_type=random.choice(meeting_types),
                    created_by=user
                )
                events_created += 1

            current_date += timedelta(days=1)

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {events_created} sample events from {start_date} to {end_date}'
            )
        )

        # Show breakdown by branch and plan
        for branch in branches:
            branch_count = Event.objects.filter(branch=branch).count()
            self.stdout.write(f'{branch}: {branch_count} events')

        for plan in plans:
            plan_count = Event.objects.filter(plan=plan).count()
            self.stdout.write(f'{plan}: {plan_count} events')
