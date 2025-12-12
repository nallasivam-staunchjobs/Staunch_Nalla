from rest_framework import serializers
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
from empreg.models import Employee

class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = ['id', 'name', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']

class IndustrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Industry
        fields = '__all__'

class RemarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Remark
        fields = ['id', 'name', 'status', 'created_at']

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class DesignationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Designation
        fields = '__all__'

class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = '__all__'

class ExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        fields = '__all__'

class CommunicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Communication
        fields = '__all__'

class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = '__all__'

class BranchSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source='branchcode')  # Map 'code' to 'branchcode' field

    class Meta:
        model = Branch
        fields = ['id', 'name', 'code', 'status', 'created_at']

class WorkModeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkMode
        fields = '__all__'

class GenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gender
        fields = '__all__'

class MaritalStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaritalStatus
        fields = '__all__'

class BloodGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloodGroup
        fields = ['id', 'name', 'status', 'created_at']

class TeamSerializer(serializers.ModelSerializer):
    employees = serializers.PrimaryKeyRelatedField(many=True, queryset=Employee.objects.all(), required=False)
    employees_count = serializers.IntegerField(source='employees.count', read_only=True)
    branch = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Team
        fields = ['id', 'name', 'status', 'created_at', 'branch', 'employees', 'employees_count']
        read_only_fields = ['id', 'created_at', 'employees_count']
