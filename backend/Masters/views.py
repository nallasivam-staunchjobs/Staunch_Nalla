from django.shortcuts import render

# Create your views here.

from rest_framework.response import Response
from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from .models import Source
from .models import Industry
from .models import Remark
from .models import Department
from .models import Designation
from .models import Education
from .models import Experience
from .models import Communication
from .models import Position
from .models import Branch
from .models import WorkMode
from .models import Gender
from .models import MaritalStatus
from .models import BloodGroup
from .models import Team
from .serializers import SourceSerializer
from .serializers import IndustrySerializer
from .serializers import RemarkSerializer
from .serializers import DepartmentSerializer
from .serializers import DesignationSerializer
from .serializers import EducationSerializer
from .serializers import ExperienceSerializer
from .serializers import CommunicationSerializer
from .serializers import PositionSerializer
from .serializers import BranchSerializer
from .serializers import WorkModeSerializer
from .serializers import GenderSerializer
from .serializers import MaritalStatusSerializer
from .serializers import BloodGroupSerializer
from .serializers import TeamSerializer

class SourceViewSet(ModelViewSet):
    queryset = Source.objects.all().order_by('-id')  # Optional: newest first
    serializer_class = SourceSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

class IndustryViewSet(ModelViewSet):
    queryset = Industry.objects.all().order_by('-created_at')
    serializer_class = IndustrySerializer

class RemarkViewSet(ModelViewSet):
    queryset = Remark.objects.all().order_by('-created_at')
    serializer_class = RemarkSerializer

class DepartmentViewSet(ModelViewSet):
    queryset = Department.objects.all().order_by('-id')
    serializer_class = DepartmentSerializer

class DesignationViewSet(ModelViewSet):
    queryset = Designation.objects.all().order_by('-id')
    serializer_class = DesignationSerializer

class EducationViewSet(ModelViewSet):
    queryset = Education.objects.all().order_by('-created_at')
    serializer_class = EducationSerializer

class ExperienceViewSet(ModelViewSet):
    queryset = Experience.objects.all().order_by('-created_at')
    serializer_class =ExperienceSerializer

class CommunicationViewSet(ModelViewSet):
    queryset = Communication.objects.all().order_by('-id')
    serializer_class = CommunicationSerializer

class PositionViewSet(ModelViewSet):
    queryset = Position.objects.all().order_by('-id')
    serializer_class = PositionSerializer

class BranchViewSet(ModelViewSet):
    queryset = Branch.objects.all().order_by('-id')
    serializer_class = BranchSerializer

class WorkModeViewSet(ModelViewSet):
    queryset = WorkMode.objects.all().order_by('-created_at')
    serializer_class = WorkModeSerializer

class GenderViewSet(ModelViewSet):
    queryset = Gender.objects.all().order_by('-id')
    serializer_class = GenderSerializer

class MaritalStatusViewSet(ModelViewSet):
    queryset = MaritalStatus.objects.all()
    serializer_class = MaritalStatusSerializer

class BloodGroupViewSet(ModelViewSet):
    queryset = BloodGroup.objects.all().order_by('-created_at')
    serializer_class = BloodGroupSerializer

    @action(detail=True, methods=['patch'])
    def change_status(self, request, pk=None):
        blood_group = self.get_object()
        new_status = request.data.get("status")

        # Validate if the status is within allowed choices
        if new_status in dict(BloodGroup.STATUS_CHOICES):
            blood_group.status = new_status
            blood_group.save()
            return Response(self.get_serializer(blood_group).data, status=status.HTTP_200_OK)

        return Response(
            {"error": "Invalid status"},
            status=status.HTTP_400_BAD_REQUEST
        )


class TeamViewSet(ModelViewSet):
    queryset = Team.objects.all().prefetch_related('employees').order_by('-created_at')
    serializer_class = TeamSerializer
