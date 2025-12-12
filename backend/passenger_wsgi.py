#!/usr/bin/env python3
"""
WSGI configuration for cPanel deployment
This file is used by cPanel's Python app hosting
"""

import sys
import os

# Set environment variables to prevent OpenBLAS/NLTK threading issues
os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
os.environ.setdefault('OMP_NUM_THREADS', '1')
os.environ.setdefault('MKL_NUM_THREADS', '1')
os.environ.setdefault('NUMEXPR_NUM_THREADS', '1')

# Add your project directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Set the Django settings module to production settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.production_settings')

# Import Django's WSGI application
try:
    from django.core.wsgi import get_wsgi_application
    application = get_wsgi_application()

except Exception as e:

    raise
