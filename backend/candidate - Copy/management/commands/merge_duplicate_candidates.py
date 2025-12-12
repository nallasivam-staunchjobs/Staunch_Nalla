from django.core.management.base import BaseCommand
from candidate.models import Candidate, ClientJob
from django.db import transaction

class Command(BaseCommand):
    help = 'Merge duplicate candidates and consolidate their client jobs'

    def handle(self, *args, **options):
        """
        Find duplicate candidates (same name + mobile) and merge them
        """

        # Find candidates with same name and mobile
        duplicates = {}

        for candidate in Candidate.objects.all():
            key = f"{candidate.candidate_name.lower()}_{candidate.mobile1}"
            if key not in duplicates:
                duplicates[key] = []
            duplicates[key].append(candidate)

        merged_count = 0

        with transaction.atomic():
            for key, candidate_list in duplicates.items():
                if len(candidate_list) > 1:
                    self.stdout.write(f"Found {len(candidate_list)} duplicates for: {key}")

                    # Keep the first candidate (or one with most complete data)
                    primary_candidate = candidate_list[0]
                    duplicate_candidates = candidate_list[1:]

                    self.stdout.write(f"Keeping candidate ID {primary_candidate.id} as primary")

                    # Move all client jobs from duplicates to primary candidate
                    for duplicate in duplicate_candidates:
                        # Update all client jobs to point to primary candidate
                        client_jobs = ClientJob.objects.filter(candidate=duplicate)
                        for job in client_jobs:
                            job.candidate = primary_candidate
                            job.save()
                            self.stdout.write(f"  Moved ClientJob {job.id} ({job.client_name}) to primary candidate")

                        # Delete the duplicate candidate
                        self.stdout.write(f"  Deleting duplicate candidate ID {duplicate.id}")
                        duplicate.delete()
                        merged_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'Successfully merged {merged_count} duplicate candidates')
        )
