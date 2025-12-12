from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group
from empreg.models import Employee
from django.db import transaction

class Command(BaseCommand):
    help = 'Fix login for Muthu user'

    def handle(self, *args, **options):
        try:
            with transaction.atomic():
                # Create or get Muthu user
                user, user_created = User.objects.get_or_create(
                    username='9940720523',  # Use phone as username
                    defaults={
                        'email': 'muthuprakash@staunchjobs.in',
                        'first_name': 'Muthu',
                        'last_name': 'Prakash',
                        'is_active': True
                    }
                )

                # Set password
                user.set_password('MuthuSJ')
                user.save()

                # Create or get CEO group
                ceo_group, created = Group.objects.get_or_create(name='ceo')
                user.groups.add(ceo_group)

                # Create or update Employee
                employee, emp_created = Employee.objects.get_or_create(
                    phone1='9940720523',
                    defaults={
                        'user': user,
                        'firstName': 'Muthu',
                        'lastName': 'Prakash',
                        'phone2': '8220416176',
                        'employeeCode': 'AD102',
                        'officialEmail': 'muthuprakash@staunchjobs.in',
                        'level': 'ceo',
                        'position': 'CEO',
                        'del_state': 0
                    }
                )

                if not emp_created:
                    # Update existing employee
                    employee.user = user
                    employee.firstName = 'Muthu'
                    employee.lastName = 'Prakash'
                    employee.employeeCode = 'AD102'
                    employee.level = 'ceo'
                    employee.officialEmail = 'muthuprakash@staunchjobs.in'
                    employee.position = 'CEO'
                    employee.save()

                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Successfully {"created" if user_created else "updated"} Muthu login\n'
                        f'Phone: 9940720523\n'
                        f'Password: MuthuSJ\n'
                        f'Employee Code: AD102\n'
                        f'Role: CEO'
                    )
                )

                # Test login
                from django.contrib.auth import authenticate
                test_user = authenticate(username='9940720523', password='MuthuSJ')
                if test_user:
                    self.stdout.write(self.style.SUCCESS('✅ Login test successful!'))
                else:
                    self.stdout.write(self.style.ERROR('❌ Login test failed'))

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error: {str(e)}')
            )
