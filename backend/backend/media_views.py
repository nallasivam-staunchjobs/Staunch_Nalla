from django.http import HttpResponse, Http404
from django.conf import settings
from django.utils.http import http_date
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_GET
import os
import mimetypes
from wsgiref.util import FileWrapper

@require_GET
@cache_control(max_age=3600)
def serve_pdf(request, path):
    """
    Custom view to serve PDF files without X-Frame-Options restrictions
    """
    # Construct the full file path
    full_path = os.path.join(settings.MEDIA_ROOT, path)

    # Security check - ensure the file is within MEDIA_ROOT
    if not full_path.startswith(settings.MEDIA_ROOT):
        raise Http404("File not found")

    # Check if file exists
    if not os.path.exists(full_path):
        raise Http404("File not found")

    # Check if it's a PDF file
    if not path.lower().endswith('.pdf'):
        raise Http404("Only PDF files are allowed")

    # Get file stats
    statobj = os.stat(full_path)

    # Determine content type
    content_type, encoding = mimetypes.guess_type(full_path)
    content_type = content_type or 'application/pdf'

    # Create response
    response = HttpResponse(FileWrapper(open(full_path, 'rb')), content_type=content_type)
    response["Last-Modified"] = http_date(statobj.st_mtime)
    response["Content-Length"] = statobj.st_size

    # Explicitly remove X-Frame-Options to allow iframe embedding
    # Don't set X-Frame-Options header at all to allow iframe embedding

    return response
