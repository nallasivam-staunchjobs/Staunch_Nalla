# vendors/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VendorLeadViewSet, VendorViewSet, VendorStatusViewSet

router = DefaultRouter()
router.register(r'leads', VendorLeadViewSet, basename='lead')
router.register(r'vendors', VendorViewSet, basename='vendor')
router.register(r'status', VendorStatusViewSet, basename='status')

urlpatterns = [
    path('', include(router.urls)),
]