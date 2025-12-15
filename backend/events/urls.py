from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CallDetailsViewSet

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'call-details', CallDetailsViewSet, basename='calldetails')

# The API URLs are now determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
]

# Available endpoints:
# GET /api/call-details/ - List all call details
# POST /api/call-details/ - Create a new call detail
# GET /api/call-details/{id}/ - Retrieve a specific call detail
# PUT /api/call-details/{id}/ - Update a specific call detail
# DELETE /api/call-details/{id}/ - Delete a specific call detail
# GET /api/call-details/active_calls/ - Get active call details
# GET /api/call-details/today_calls/ - Get today's call details
# GET /api/call-details/by_plan/ - Get call details by plan (requires plan_id param)
# GET /api/call-details/stats/ - Get call details statistics
# GET /api/call-details/dropdown_data/ - Get comprehensive dropdown data for forms
# GET /api/call-details/employees/ - Get employees dropdown data
# GET /api/call-details/vendors/ - Get vendors dropdown data
# GET /api/call-details/cities/ - Get cities dropdown data
# GET /api/call-details/sources/ - Get sources dropdown data
# GET /api/call-details/branches/ - Get branches dropdown data
# GET /api/call-details/channels/ - Get channels dropdown data
# POST /api/call-details/{id}/update_statistics/ - Update call statistics
# GET /api/call-details/{id}/statistics/ - Get call statistics
# GET /api/call-details/candidate_statistics/ - Get candidate statistics (requires candidate_id param)
# GET /api/call-details/plan_statistics/ - Get plan statistics (requires plan_id param)
# GET /api/call-details/available-plans/ - Get available plans for employee on date (requires employee_name and date params)
