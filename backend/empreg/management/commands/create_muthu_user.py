from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group
from empreg.models import Employee
from django.db import transaction

class Command(BaseCommand):
    help = 'Create Muthu user and employee record for login'

    def handle(self, *args, **options):
        try:
            with transaction.atomic():
                # Check if user already exists
                username = 'Muthu'
                if User.objects.filter(username=username).exists():
                    self.stdout.write(f"User '{username}' already exists")
                    user = User.objects.get(username=username)
                else:
                    # Create Django User
                    user = User.objects.create_user(
                        username=username,
                        email='muthuprakash@staunchjobs.in',
                        password='MuthuSJ',
                        first_name='Muthu',
                        last_name='Prakash'
                    )
                    self.stdout.write(f"Created user: {username}")

                # Create or get CEO group
                ceo_group, created = Group.objects.get_or_create(name='ceo')
                if created:
                    self.stdout.write("Created CEO group")

                # Add user to CEO group
                user.groups.add(ceo_group)

                # Check if employee already exists
                if Employee.objects.filter(phone1='9940720523').exists():
                    self.stdout.write("Employee with phone 9940720523 already exists")
                    employee = Employee.objects.get(phone1='9940720523')
                    # Update the user link if needed
                    if not employee.user:
                        employee.user = user
                        employee.save()
                        self.stdout.write("Linked existing employee to user")
                else:
                    # Create Employee record
                    employee = Employee.objects.create(
                        user=user,
                        firstName='Muthu',
                        lastName='Prakash',
                        phone1='9940720523',
                        phone2='8220416176',
                        employeeCode='AD102',
                        officialEmail='muthuprakash@staunchjobs.in',
                        level='ceo',
                        position='CEO',
                        department='Management'
                    )
                    self.stdout.write(f"Created employee: {employee.firstName} ({employee.employeeCode})")

                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully created/updated login for Muthu\n'
                        f'Username: {username}\n'
                        f'Password: MuthuSJ\n'
                        f'Phone: 9940720523\n'
                        f'Employee Code: AD102'
                    )
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating user: {str(e)}')
            )
