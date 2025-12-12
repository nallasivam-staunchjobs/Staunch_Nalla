from rest_framework import serializers
from .models import Employee

class EmployeeSerializer(serializers.ModelSerializer):
    # Note: username and confirmPassword are no longer in the model
    password = serializers.CharField(write_only=True, required=False)

    # Removed to_representation method - we now store L1, L2, L3, L4, L5 directly in database

    class Meta:
        model = Employee
        fields = [
            # Basic Info
            'id', 'user', 'password', 'firstName', 'lastName', 'employeeCode',
            'branch', 'profilePhoto',

            # Contact Info
            'officialEmail', 'personalEmail', 'phone1', 'phone2',

            # Personal Details
            'gender', 'bloodGroup', 'dateOfBirth', 'maritalStatus',
            'permanentAddress', 'currentAddress',

            # Emergency Contacts
            'emergencyContact1Name', 'emergencyContact1Phone',

            # Reference Contact
            'referenceContactName', 'referenceContactPhone',

            # Job Details
            'department', 'position', 'ctc', 'joiningDate', 'level',
            'reportingManager', 'workMode',

            # Education & Experience
            'degree', 'specialization', 'yearsOfExperience',
            'experienceDetails', 'lastCompany',

            # Documents (proofType, proofDocument, additionalDocuments removed from model)
            'aadhaarNumber', 'aadhaarFront', 'aadhaarBack',
            'panNumber', 'panFiles', 'offerLetterFiles',
            'relievingLetterFiles', 'payslipFiles',
            # Banking Details
            'bankName', 'accountHolderName', 'accountNumber',
            'ifscCode', 'upiNumber',

            # Additional
            'status', 'remarks', 'del_state', 'deleted_at',
        ]
        read_only_fields = ['user', 'del_state', 'deleted_at']

    def validate_phone1(self, value):
        """Validate phone1 format"""
        if value and len(value) < 10:
            raise serializers.ValidationError("Phone number must be at least 10 digits.")
        return value

    def validate_phone2(self, value):
        """Validate phone2 format"""
        if value and len(value) < 10:
            raise serializers.ValidationError("Phone number must be at least 10 digits.")
        return value

    def validate_employeeCode(self, value):
        """Validate employee code uniqueness"""
        if value:
            # Check if employee code already exists (excluding current instance)
            existing = Employee.objects.filter(employeeCode=value)
            if self.instance:
                existing = existing.exclude(id=self.instance.id)
            if existing.exists():
                raise serializers.ValidationError("Employee code already exists.")
        return value

    def validate_officialEmail(self, value):
        """Validate official email uniqueness"""
        if value:
            # Check if official email already exists (excluding current instance)
            existing = Employee.objects.filter(officialEmail=value)
            if self.instance:
                existing = existing.exclude(id=self.instance.id)
            if existing.exists():
                raise serializers.ValidationError("Official email already exists.")
        return value