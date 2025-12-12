from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, LoginView, get_employee_info, get_next_employee_code, generate_employee_code

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('login/', LoginView.as_view(), name='login'),
    path('employee-info/', get_employee_info, name='employee-info'),
    path('next-employee-code/<str:branch_code>/', get_next_employee_code, name='next-employee-code'),
    path('generate-employee-code/', generate_employee_code, name='generate-employee-code'),
]