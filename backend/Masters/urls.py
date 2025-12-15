from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SourceViewSet, IndustryViewSet, RemarkViewSet, DepartmentViewSet, DesignationViewSet, EducationViewSet,ExperienceViewSet, CommunicationViewSet,PositionViewSet,BranchViewSet,WorkModeViewSet,GenderViewSet,MaritalStatusViewSet,BloodGroupViewSet,TeamViewSet

router = DefaultRouter()
router.register(r'sources', SourceViewSet)
router.register(r'industries', IndustryViewSet)
router.register(r'remarks', RemarkViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'designations', DesignationViewSet)
router.register(r'educations', EducationViewSet)
router.register(r'experience', ExperienceViewSet)
router.register(r'communications', CommunicationViewSet)
router.register(r'positions', PositionViewSet)
router.register(r'branches', BranchViewSet)
router.register(r'workmodes', WorkModeViewSet)
router.register(r'genders', GenderViewSet)
router.register(r'maritalstatuses', MaritalStatusViewSet)
router.register(r'bloodgroups', BloodGroupViewSet)
router.register(r'teams', TeamViewSet)

urlpatterns = [
    path('', include(router.urls)),
]