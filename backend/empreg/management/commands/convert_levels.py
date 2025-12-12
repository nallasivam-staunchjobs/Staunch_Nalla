from django.core.management.base import BaseCommand
from empreg.models import Employee

class Command(BaseCommand):
    help = 'Convert old level format (employee, tl, bm, rm, ceo) to new format (L1, L2, L3, L4, L5)'

    def handle(self, *args, **options):
        # Mapping from old format to new format
        level_conversion = {
            'employee': 'L1',
            'tl': 'L2',
            'bm': 'L3',
            'rm': 'L4',
            'ceo': 'L5'
        }

        updated_count = 0

        # Get all employees with old level format
        for old_level, new_level in level_conversion.items():
            employees = Employee.objects.filter(level=old_level)
            count = employees.count()

            if count > 0:
                # Update all employees with this old level
                employees.update(level=new_level)
                updated_count += count
                self.stdout.write(
                    self.style.SUCCESS(f'Updated {count} employees from "{old_level}" to "{new_level}"')
                )

        if updated_count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully converted {updated_count} employee level records!')
            )
        else:
            self.stdout.write(
                self.style.WARNING('No old level format records found to convert.')
            )
