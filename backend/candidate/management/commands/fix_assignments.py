from django.core.management.base import BaseCommand
from candidate.models import ClientJob

class Command(BaseCommand):
    help = 'Fix assignment status for existing client jobs'

    def handle(self, *args, **options):
        self.stdout.write('Checking and fixing assignment statuses...')

        # Get all client jobs
        client_jobs = ClientJob.objects.all()

        updated_count = 0
        for client_job in client_jobs:
            # Check if assign_to exists but assign field is not set
            if client_job.assign_to and (client_job.assign is None or client_job.assign == ''):
                client_job.assign = 'assigned'
                client_job.save()
                updated_count += 1
                self.stdout.write(f'Fixed ClientJob {client_job.id}: set assign="assigned"')
            elif not client_job.assign_to and (client_job.assign is None or client_job.assign == ''):
                client_job.assign = 'null'
                client_job.save()
                updated_count += 1
                self.stdout.write(f'Fixed ClientJob {client_job.id}: set assign="null"')

        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated {updated_count} client jobs')
        )

        # Show some examples
        self.stdout.write('\nExamples of current assignments:')
        for client_job in ClientJob.objects.filter(assign_to__isnull=False)[:5]:
            self.stdout.write(f'ClientJob {client_job.id}: assign="{client_job.assign}", assign_to="{client_job.assign_to}", display_executive="{client_job.get_display_executive()}"')
