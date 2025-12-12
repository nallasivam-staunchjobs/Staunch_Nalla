from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    CandidateViewSet, ClientJobViewSet, EducationCertificateViewSet,
    ExperienceCompanyViewSet, PreviousCompanyViewSet, AdditionalInfoViewSet,
    ResumeParseAPIView, WordToPdfConvertAPIView, CandidateRevenueViewSet, CandidateRevenueFeedbackViewSet,
    FileUploadView, update_expired_nfd_status, check_expired_nfd_jobs,
    # Unified Workflow endpoints
    clone_candidate_for_client, claim_open_job, mark_jobs_as_open,
    get_assignment_history, run_expired_job_cleanup, 
    # Profile IN/OUT endpoints
    profile_in_list, profile_out_list,
    # Status History endpoints
    create_status_history, get_candidate_timeline, get_candidate_calendar, get_status_history_stats
)

router = DefaultRouter()
router.register(r'candidates', CandidateViewSet, basename='candidate')
router.register(r'client-jobs', ClientJobViewSet, basename='client-job')
router.register(r'education-certificates', EducationCertificateViewSet, basename='education-certificate')
router.register(r'experience-companies', ExperienceCompanyViewSet, basename='experience-company')
router.register(r'previous-companies', PreviousCompanyViewSet, basename='previous-company')
router.register(r'additional-info', AdditionalInfoViewSet, basename='additional-info')
router.register(r'candidate-revenues', CandidateRevenueViewSet)
router.register(r'candidate-revenue-feedbacks', CandidateRevenueFeedbackViewSet)

urlpatterns = [
    path('parse-resume/', ResumeParseAPIView.as_view(), name='parse-resume'),
    path('convert-word-to-pdf/', WordToPdfConvertAPIView.as_view(), name='convert-word-to-pdf'),
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path('update-expired-nfd/', update_expired_nfd_status, name='update-expired-nfd'),
    path('check-expired-nfd/', check_expired_nfd_jobs, name='check-expired-nfd'),

    # ========================================
    # UNIFIED WORKFLOW API ENDPOINTS
    # ========================================
    path('clone-candidate/', clone_candidate_for_client, name='clone-candidate-for-client'),
    path('claim-job/', claim_open_job, name='claim-open-job'),
    path('mark-jobs-open/', mark_jobs_as_open, name='mark-jobs-as-open'),
    path('assignment-history/', get_assignment_history, name='get-assignment-history'),
    path('cleanup-expired-jobs/', run_expired_job_cleanup, name='run-expired-job-cleanup'),
    
    # ========================================
    # PROFILE IN/OUT ENDPOINTS
    # ========================================
    path('candidates/profile-in/', profile_in_list, name='profile-in-list'),
    path('candidates/profile-out/', profile_out_list, name='profile-out-list'),
    
    # ========================================
    # STATUS HISTORY ENDPOINTS
    # ========================================
    path('status-history/create/', create_status_history, name='create-status-history'),
    path('candidates/<int:candidate_id>/timeline/', get_candidate_timeline, name='get-candidate-timeline'),
    path('candidates/<int:candidate_id>/calendar/', get_candidate_calendar, name='get-candidate-calendar'),
    path('status-history/stats/', get_status_history_stats, name='get-status-history-stats'),
] + router.urls