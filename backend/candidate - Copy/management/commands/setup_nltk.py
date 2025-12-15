"""
Django management command to download required NLTK data
Usage: python manage.py setup_nltk
"""

import os
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Download required NLTK data for resume parsing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-download even if data exists',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(' Setting up NLTK data for resume parsing...'))

        # Set environment variables to prevent threading issues
        os.environ['OPENBLAS_NUM_THREADS'] = '1'
        os.environ['OMP_NUM_THREADS'] = '1'

        try:
            import nltk

            # Download required NLTK data
            required_data = [
                'stopwords',
                'punkt',
                'averaged_perceptron_tagger',
                'wordnet',
                'omw-1.4'
            ]

            for data_name in required_data:
                try:
                    self.stdout.write(f' Downloading {data_name}...')
                    nltk.download(data_name, quiet=True)
                    self.stdout.write(self.style.SUCCESS(f' {data_name} downloaded successfully'))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f' Failed to download {data_name}: {e}'))

            # Test if stopwords work
            try:
                from nltk.corpus import stopwords
                english_stopwords = stopwords.words('english')
                self.stdout.write(self.style.SUCCESS(f' NLTK setup complete! Found {len(english_stopwords)} English stopwords'))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f' NLTK test failed: {e}'))

        except ImportError:
            self.stdout.write(self.style.ERROR(' NLTK not installed. Please install: pip install nltk'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f' Error setting up NLTK: {e}'))
