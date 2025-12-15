from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include, re_path
from .media_views import serve_pdf
from empreg.views import LoginView   # import your custom view

urlpatterns = [
    path('admin/', admin.site.urls),

    # Use your custom login view
    path('api/login/', LoginView.as_view(), name='api_login'),

    # App routes
    path('api/empreg/', include('empreg.urls')),
    path('api/vendors/', include('vendor.urls')),
    path('api/masters/', include('Masters.urls')),
    path('api/', include('candidate.urls')),
    path('api/', include('invoice.urls')),
    path('api/', include('jobopening.urls')),
    path('api/', include('events.urls')),
    path('api/', include('locations.urls')),

    # PDF serving
    re_path(r'^media/(?P<path>.*\.pdf)$', serve_pdf, name='serve_pdf'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
