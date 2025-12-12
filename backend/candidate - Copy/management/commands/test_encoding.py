from django.core.management.base import BaseCommand
from candidate.models import ClientJob

class Command(BaseCommand):
    help = 'Test encoding fix for feedback text'

    def handle(self, *args, **options):
        # Test string with problematic character (non-breaking space)
        test_feedback = "He finished the interview for EFL SM waiting for feedback\xa0"
        
        self.stdout.write(f"Original text: {repr(test_feedback)}")
        
        # Test the clean_text function
        try:
            # Get a ClientJob instance to test the add_feedback method
            client_job = ClientJob.objects.first()
            if not client_job:
                self.stdout.write(self.style.ERROR('No ClientJob found to test'))
                return
            
            # Test adding feedback with problematic characters
            client_job.add_feedback(
                feedback_text=test_feedback,
                remarks="Test remark with\xa0non-breaking space",
                entry_by="Test User"
            )
            
            self.stdout.write(f"Cleaned feedback: {repr(client_job.feedback)}")
            self.stdout.write(self.style.SUCCESS('Encoding test passed!'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Encoding test failed: {str(e)}'))
