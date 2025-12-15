from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group
from empreg.models import Employee
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Migrate old system users to new Django User/Employee structure'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating it',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        # Old system user data from SQL file
        old_users = [
            {
                'username': 'Muthu',
                'password': 'MuthuSJ',
                'firstName': 'Muthu',
                'lastName': 'Prakash',
                'phone1': '9940720523',
                'phone2': '8220416176',
                'employeeCode': 'AD102',
                'email': 'muthuprakash@staunchjobs.in',
                'role': 'ceo',
                'position': 'CEO'
            },
            {
                'username': 'Vinitha',
                'password': 'Newpassword',
                'firstName': 'Vinitha',
                'lastName': '',
                'phone1': '8220909468',
                'phone2': '9940720523',
                'employeeCode': 'AD101',
                'email': '',
                'role': 'bm',
                'position': 'Head'
            }
            # Add more users as needed from your SQL file
        ]

        if dry_run:
            self.stdout.write("DRY RUN - No changes will be made")

        created_count = 0
        updated_count = 0

        for user_data in old_users:
            try:
                with transaction.atomic():
                    if dry_run:
                        self.stdout.write(f"Would create/update user: {user_data['username']}")
                        continue

                    # Create or get Django User
                    user, user_created = User.objects.get_or_create(
                        username=user_data['username'],
                        defaults={
                            'email': user_data['email'],
                            'first_name': user_data['firstName'],
                            'last_name': user_data['lastName'],
                            'is_active': True
                        }
                    )

                    # Set password (always update in case it changed)
                    user.set_password(user_data['password'])
                    user.save()

                    # Create or get group
                    group, group_created = Group.objects.get_or_create(
                        name=user_data['role']
                    )
                    user.groups.add(group)

                    # Create or update Employee
                    employee, emp_created = Employee.objects.get_or_create(
                        phone1=user_data['phone1'],
                        defaults={
                            'user': user,
                            'firstName': user_data['firstName'],
                            'lastName': user_data['lastName'],
                            'phone2': user_data['phone2'],
                            'employeeCode': user_data['employeeCode'],
                            'officialEmail': user_data['email'],
                            'level': user_data['role'],  # Store database level (ceo, bm, etc.)
                            'position': user_data['position'],
                            'del_state': 0
                        }
                    )

                    if not emp_created:
                        # Update existing employee
                        employee.user = user
                        employee.firstName = user_data['firstName']
                        employee.lastName = user_data['lastName']
                        employee.employeeCode = user_data['employeeCode']
                        employee.level = user_data['role']
                        employee.officialEmail = user_data['email']
                        employee.position = user_data['position']
                        employee.save()
                        updated_count += 1
                    else:
                        created_count += 1

                    self.stdout.write(
                        f"{'Created' if user_created else 'Updated'} user: {user_data['username']} "
                        f"(Phone: {user_data['phone1']}, Code: {user_data['employeeCode']})"
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error processing {user_data['username']}: {str(e)}")
                )

        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Migration completed! Created: {created_count}, Updated: {updated_count}'
                )
            )

            # Test login for Muthu
            self.stdout.write("\nTesting login for Muthu...")
            try:
                from django.contrib.auth import authenticate
                user = authenticate(username='Muthu', password='MuthuSJ')
                if user:
                    self.stdout.write(self.style.SUCCESS("✓ Muthu login test successful"))
                else:
                    self.stdout.write(self.style.ERROR("✗ Muthu login test failed"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Login test error: {str(e)}"))
