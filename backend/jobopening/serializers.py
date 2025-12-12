from rest_framework import serializers
from .models import JobOpening

class JobOpeningSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobOpening
        fields = [
            "id", "job_title", "company_name",'designation', "ctc", "experience",
            "state", "city", "skills", "languages", "short_description",
            "job_description", "contact_person", "contact_number",
            "is_active", "posted_date", "created_by", "created_at",
            "updated_by", "updated_at"
        ]
        read_only_fields = ["id", "posted_date", "created_at", "updated_at"]

    def validate_skills(self, value):
        """Ensure skills is a list"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Skills must be a list")
        return value

    def validate_languages(self, value):
        """Ensure languages is a list"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Languages must be a list")
        return value

    def validate_contact_number(self, value):
        """Basic validation for contact number"""
        if not value.isdigit() or len(value) < 10:
            raise serializers.ValidationError("Contact number must be at least 10 digits")
        return value
