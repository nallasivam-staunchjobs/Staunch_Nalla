from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobOpeningViewSet

router = DefaultRouter()
router.register(r'job-openings', JobOpeningViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
