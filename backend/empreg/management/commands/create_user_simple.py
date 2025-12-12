from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group
from django.db import transaction, connection

class Command(BaseCommand):
    help = 'Create user for login using direct SQL to avoid model issues'

    def handle(self, *args, **options):
        try:
            with transaction.atomic():
                # Create or get Django User
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

                # Use direct SQL to create employee record to avoid model validation issues
                with connection.cursor() as cursor:
                    # Check if employee exists
                    cursor.execute("SELECT id FROM empreg_employee WHERE phone1 = %s", ['9940720523'])
                    existing = cursor.fetchone()

                    if existing:
                        # Update existing employee
                        cursor.execute("""
                            UPDATE empreg_employee
                            SET user_id = %s, firstName = %s, lastName = %s, employeeCode = %s,
                                officialEmail = %s, level = %s, position = %s, del_state = 0
                            WHERE phone1 = %s
                        """, [user.id, 'Muthu', 'Prakash', 'AD102', 'muthuprakash@staunchjobs.in', 'ceo', 'CEO', '9940720523'])
                        self.stdout.write("Updated existing employee record")
                    else:
                        # Insert new employee record with only essential fields
                        cursor.execute("""
                            INSERT INTO empreg_employee
                            (user_id, firstName, lastName, phone1, phone2, employeeCode,
                             officialEmail, level, position, del_state)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, [user.id, 'Muthu', 'Prakash', '9940720523', '8220416176', 'AD102',
                              'muthuprakash@staunchjobs.in', 'ceo', 'CEO', 0])
                        self.stdout.write("Created new employee record")

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
                    self.stdout.write('🎉 You can now login with phone: 9940720523 and password: MuthuSJ')
                else:
                    self.stdout.write(self.style.ERROR('❌ Login test failed'))

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error: {str(e)}')
            )
