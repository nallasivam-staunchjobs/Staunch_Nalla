from rest_framework.routers import DefaultRouter
from .views import StateViewSet, CityViewSet

router = DefaultRouter()
router.register(r'masters/states', StateViewSet, basename='masters-states')
router.register(r'candidate/cities', CityViewSet, basename='candidate-cities')

urlpatterns = router.urls
