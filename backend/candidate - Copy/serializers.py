# new
from rest_framework import serializers
from .models import (
    Candidate, ClientJob, EducationCertificate,
    ExperienceCompany, PreviousCompany, AdditionalInfo, CandidateRevenue, CandidateRevenueFeedback,
    JobAssignmentHistory, CandidateStatusHistory
)

# --------------------------------
# Additional Info Serializer
# --------------------------------
class AdditionalInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdditionalInfo
        fields = "__all__"

# --------------------------------
# Experience Company Serializer
# --------------------------------
class ExperienceCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExperienceCompany
        fields = "__all__"

# --------------------------------
# Previous Company Serializer
# --------------------------------
class PreviousCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = PreviousCompany
        fields = "__all__"

# --------------------------------
# Education Certificate Serializer
# --------------------------------
class EducationCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationCertificate
        fields = "__all__"

# --------------------------------
# Client Job Serializer
# --------------------------------
class ClientJobSerializer(serializers.ModelSerializer):
    # Computed fields for assignment information
    current_executive_name = serializers.SerializerMethodField()
    display_executive_name = serializers.SerializerMethodField()
    assignment_info = serializers.SerializerMethodField()
    can_assign = serializers.SerializerMethodField()
    is_open_profile = serializers.SerializerMethodField()
    nfd_expired = serializers.SerializerMethodField()
    assignment_status = serializers.SerializerMethodField()
    nfd_display = serializers.SerializerMethodField()  # NEW: For frontend display
    effective_remark = serializers.SerializerMethodField()  # Priority: profilestatus > remarks
    remark_source = serializers.SerializerMethodField()  # Indicates source: 'profilestatus' or 'remarks'
    
    # Audit fields - display full names instead of employee codes
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ClientJob
        fields = "__all__"
    
    def to_representation(self, instance):
        """Override to sanitize feedback field before serialization"""
        representation = super().to_representation(instance)
        
        # Sanitize feedback field to prevent ASCII encoding errors
        if 'feedback' in representation and representation['feedback']:
            try:
                feedback = representation['feedback']
                # Replace non-breaking spaces and special characters
                feedback = feedback.replace('\xa0', ' ')
                feedback = feedback.replace('\u2018', "'")  # Left single quotation mark
                feedback = feedback.replace('\u2019', "'")  # Right single quotation mark
                feedback = feedback.replace('\u201c', '"')  # Left double quotation mark
                feedback = feedback.replace('\u201d', '"')  # Right double quotation mark
                feedback = feedback.replace('\u2013', '-')  # En dash
                feedback = feedback.replace('\u2014', '-')  # Em dash
                feedback = feedback.replace('\u2026', '...')  # Horizontal ellipsis
                
                # Encode to UTF-8 and decode back to remove remaining problematic characters
                feedback = feedback.encode('utf-8', errors='ignore').decode('utf-8')
                
                # Normalize whitespace
                feedback = ' '.join(feedback.split())
                
                representation['feedback'] = feedback
            except Exception:
                # Fallback: ASCII-safe encoding
                try:
                    representation['feedback'] = representation['feedback'].encode('ascii', errors='ignore').decode('ascii')
                except:
                    pass  # Keep original if all else fails
        
        return representation
    
    def get_created_by_name(self, obj):
        """Get full name of person who created this record"""
        return obj.get_created_by_name()
    
    def get_updated_by_name(self, obj):
        """Get full name of person who last updated this record"""
        return obj.get_updated_by_name()

    def get_current_executive_name(self, obj):
        """Get the name of the currently assigned executive"""
        return obj.get_assigned_executive_name()

    def get_display_executive_name(self, obj):
        """Get the executive name to display for this specific client job"""
        return obj.get_display_executive()

    def get_assignment_info(self, obj):
        """Get complete assignment information"""
        return obj.get_assignment_info()

    def get_can_assign(self, obj):
        """Check if this client job can be assigned (open profile OR expired NFD)"""
        return obj.is_assignable()

    def get_is_open_profile(self, obj):
        """Check if this job is explicitly marked as open profile"""
        return obj.remarks and obj.remarks.lower() == 'open profile'

    def get_nfd_expired(self, obj):
        """Check if NFD has expired using common threshold"""
        if not obj.next_follow_up_date:
            return False

        from datetime import datetime
        from candidate.views import get_nfd_expiry_threshold
        import logging

        logger = logging.getLogger(__name__)

        try:
            # Handle both string and date formats for next_follow_up_date
            if isinstance(obj.next_follow_up_date, str):
                # Parse string date (format: YYYY-MM-DD)
                nfd_date = datetime.strptime(obj.next_follow_up_date, '%Y-%m-%d').date()
            elif hasattr(obj.next_follow_up_date, 'date'):
                # Handle datetime object
                nfd_date = obj.next_follow_up_date.date()
            else:
                # Handle date object
                nfd_date = obj.next_follow_up_date

            # Use common expiry threshold
            expiry_threshold = get_nfd_expiry_threshold()
            return nfd_date < expiry_threshold

        except (ValueError, TypeError, AttributeError) as e:
            # Use logging with safe string formatting to avoid Unicode issues
            try:
                logger.error("Error parsing NFD date in serializer for job %s: %s - %s",
                           getattr(obj, 'id', 'unknown'),
                           str(obj.next_follow_up_date),
                           str(e))
            except Exception:
                # Fallback if even logging fails
                logger.error("Error parsing NFD date in serializer - Unicode encoding issue")
            return False

    def get_nfd_display(self, obj):
        """
        Get NFD display string for frontend
        Returns: "NFD: Oct 31 (open profile)" if expired, or "NFD: Oct 31" if active
        """
        if not obj.next_follow_up_date:
            return None
        
        try:
            from datetime import datetime
            
            # Handle different date formats
            if isinstance(obj.next_follow_up_date, str):
                nfd_date = datetime.strptime(obj.next_follow_up_date, '%Y-%m-%d').date()
            elif hasattr(obj.next_follow_up_date, 'date'):
                nfd_date = obj.next_follow_up_date.date()
            else:
                nfd_date = obj.next_follow_up_date
            
            # Format date as "Oct 31"
            date_str = nfd_date.strftime('%b %d')
            
            # Check if expired and unassigned
            is_expired = self.get_nfd_expired(obj)
            is_unassigned = not obj.assign_to
            
            if is_expired and is_unassigned:
                return f"NFD: {date_str} (open profile)"
            else:
                return f"NFD: {date_str}"
                
        except Exception:
            return str(obj.next_follow_up_date) if obj.next_follow_up_date else None

    def get_effective_remark(self, obj):
        """
        Get effective remark with priority logic:
        1. If profilestatus has a valid value (not null, not empty, not "null"), use that
        2. Otherwise, fallback to remarks field from database
        """
        # Check if profilestatus has a valid value
        if (obj.profilestatus and 
            obj.profilestatus.strip() and 
            obj.profilestatus.strip().lower() != "null"):
            return obj.profilestatus
        # Fallback to original remarks field
        elif obj.remarks and obj.remarks.strip():
            return obj.remarks
        else:
            return None

    def get_remark_source(self, obj):
        """
        Indicates the source of the effective remark for frontend color logic:
        - 'profilestatus': Remark comes from profilestatus (apply colors)
        - 'remarks': Remark comes from remarks field (plain text only)
        - None: No remark available
        """
        # Check if profilestatus has a valid value
        if (obj.profilestatus and 
            obj.profilestatus.strip() and 
            obj.profilestatus.strip().lower() != "null"):
            return 'profilestatus'
        # Fallback to original remarks field
        elif obj.remarks and obj.remarks.strip():
            return 'remarks'
        else:
            return None

    def get_assignment_status(self, obj):
        """Get detailed assignment status for frontend logic"""
        nfd_expired = self.get_nfd_expired(obj)
        is_unassigned = not obj.assign_to
        
        return {
            'can_assign': obj.is_assignable(),
            'is_open_profile': obj.remarks and obj.remarks.lower() == 'open profile',
            'nfd_expired': nfd_expired,
            'has_assignment': bool(obj.assign_to),
            'assignment_reason': 'open_profile' if (obj.remarks and obj.remarks.lower() == 'open profile') else ('nfd_expired' if (nfd_expired and is_unassigned) else 'not_assignable'),
            'nfd_display': self.get_nfd_display(obj)  # Include display string
        }

# --------------------------------
# Candidate List Serializer (Optimized for list views)
# --------------------------------
class CandidateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for candidate list views - excludes heavy nested data"""
    class Meta:
        model = Candidate
        fields = [
            "id", "profile_number", "executive_name", "candidate_name",
            "mobile1", "mobile2", "email", "gender", "dob",
            "country", "state", "city", "pincode",
            "education", "experience", "source", "communication",
            "created_by", "created_at", "updated_by", "updated_at",
        ]

# --------------------------------
# Candidate Revenue Serializer (Minimal for search results)
# --------------------------------
class CandidateRevenueMinimalSerializer(serializers.ModelSerializer):
    """Lightweight serializer for candidate revenue in search results"""
    class Meta:
        model = CandidateRevenue
        fields = ["joining_date"]

# --------------------------------
# Candidate Serializer (Full details)
# --------------------------------
class CandidateSerializer(serializers.ModelSerializer):
    # Nested relationships (read-only) - TEMPORARILY DISABLED FOR PERFORMANCE
    client_jobs = ClientJobSerializer(many=True, read_only=True)
    candidaterevenue = CandidateRevenueMinimalSerializer(source='revenues', many=True, read_only=True)
    # education_certificates = EducationCertificateSerializer(many=True, read_only=True)
    # experience_companies = ExperienceCompanySerializer(many=True, read_only=True)
    # previous_companies = PreviousCompanySerializer(many=True, read_only=True)
    # additional_info = AdditionalInfoSerializer(many=True, read_only=True)
    
    # Computed fields for executive information
    # executive_code = serializers.SerializerMethodField()  # Temporarily disabled for performance
    executive_display = serializers.SerializerMethodField()  # Full name display
    
    # Audit fields - display full names instead of employee codes
    # created_by_name = serializers.SerializerMethodField()  # Temporarily disabled for performance
    # updated_by_name = serializers.SerializerMethodField()  # Temporarily disabled for performance

    class Meta:
        model = Candidate
        fields = [
            "id", "profile_number", "executive_name", "candidate_name",
            "mobile1", "mobile2", "email", "gender", "dob",
            "country", "state", "city", "pincode",
            "education", "experience", "source", "communication",
            "languages", "skills", "resume_file",
            "created_by", "created_at", "updated_by", "updated_at",
            # "created_by_name", "updated_by_name",  # Disabled for performance
            "client_jobs",  # Only client_jobs enabled for performance
            "candidaterevenue",  # Revenue data with joining_date
            # "education_certificates", "experience_companies", "previous_companies",
            # "additional_info",
            "resume_parsed_data", "resume_text", "resume_pdf",
            # "executive_code",  # Disabled for performance
            "executive_display",  # Full name of executive
        ]
        extra_kwargs = {
            "resume_parsed_data": {"read_only": True},
            "resume_text": {"read_only": True},
            "resume_pdf": {"read_only": True},
        }

    def get_created_by_name(self, obj):
        """Get full name of person who created this record"""
        return obj.get_created_by_name()
    
    def get_updated_by_name(self, obj):
        """Get full name of person who last updated this record"""
        return obj.get_updated_by_name()

    def get_executive_code(self, obj):
        """Get the executive employee code"""
        return obj.created_by or obj.profile_number or 'N/A'

    def get_executive_display(self, obj):
        """Get formatted executive display: just the employee name"""
        name = obj.executive_name
        
        if not name:
            return 'N/A'
        
        # Try to get from cache first
        try:
            if '_employee_cache' not in self.context:
                self.context['_employee_cache'] = {}
            
            cache = self.context['_employee_cache']
            
            # Check if already cached
            if name in cache:
                return cache[name]
            
            # Not in cache, look it up
            from empreg.models import Employee
            from django.db.models import Q
            import logging
            
            logger = logging.getLogger(__name__)
            
            # Normalize the code for lookup - try multiple variations
            normalized_code = name.upper().replace('/', '').replace('_', '').replace(' ', '')
            lowercase_code = name.lower()
            
            # Try to find employee by code with different formats
            employee = Employee.objects.filter(
                Q(employeeCode__iexact=name) |
                Q(employeeCode__iexact=normalized_code) |
                Q(employeeCode__iexact=lowercase_code) |
                Q(employeeCode__icontains=name),  # Partial match as fallback
                del_state=0
            ).only('employeeCode', 'firstName', 'lastName').first()
            
            # Debug logging
            if not employee:
                logger.warning(f"Employee not found for code: {name} (normalized: {normalized_code})")
            
            # Determine display name - Return full name (FirstName LastName)
            if employee:
                first_name = employee.firstName or ''
                last_name = employee.lastName or ''
                full_name = f"{first_name} {last_name}".strip()
                display_name = full_name if full_name else employee.employeeCode
            else:
                display_name = name
            
            # Cache the result
            cache[name] = display_name
            return display_name
            
        except Exception as e:
            # If lookup fails, return the original name
            return name


class CandidateRevenueSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source="candidate.candidate_name", read_only=True)
    executive_name = serializers.CharField(source="candidate.executive_name", read_only=True)
    candidate_state = serializers.CharField(source="candidate.state", read_only=True)
    # Removed client_name SerializerMethodField to improve performance
    # Frontend can fetch client names separately if needed

    class Meta:
        model = CandidateRevenue
        fields = "__all__"

class CandidateRevenueFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidateRevenueFeedback
        fields = "__all__"

# --------------------------------
# Job Assignment History Serializer
# --------------------------------
class JobAssignmentHistorySerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source="candidate.candidate_name", read_only=True)
    client_name = serializers.CharField(source="client_job.client_name", read_only=True)
    designation = serializers.CharField(source="client_job.designation", read_only=True)

    class Meta:
        model = JobAssignmentHistory
        fields = "__all__"

class CandidateSearchSerializer(serializers.ModelSerializer):
    """Lightweight serializer for search results without nested relationships"""
    class Meta:
        model = Candidate
        fields = [
            "id", "profile_number", "executive_name", "candidate_name",
            "mobile1", "mobile2", "email", "gender", "dob",
            "country", "state", "city", "pincode",
            "education", "experience", "source", "communication",
            "languages", "skills",
            "created_by", "created_at", "updated_by", "updated_at"
        ]

# --------------------------------
# Profile IN Serializer
# --------------------------------
class ProfileInSerializer(serializers.ModelSerializer):
    """Serializer for Profile IN - profiles assigned TO the current user"""
    # Full candidate data
    candidate = CandidateListSerializer(read_only=True)
    
    # Quick access fields for table display
    candidate_name = serializers.CharField(source='candidate.candidate_name', read_only=True)
    mobile_no = serializers.CharField(source='candidate.mobile1', read_only=True)
    profile_number = serializers.CharField(source='candidate.profile_number', read_only=True)
    
    # Transfer tracking
    date_of_transfer = serializers.DateTimeField(source='transfer_date', read_only=True)
    assigned_from = serializers.CharField(read_only=True)  # Track who assigned it from
    assigned_from_name = serializers.SerializerMethodField()  # Employee name who assigned it
    assign_to_name = serializers.SerializerMethodField()  # Employee name who it's assigned to (current owner)

    class Meta:
        model = ClientJob
        fields = [
            'id',
            'candidate',  # Full candidate object
            'candidate_name',
            'mobile_no',
            'profile_number',
            'client_name',
            'designation',
            'current_ctc',
            'expected_ctc',
            'remarks',
            'next_follow_up_date',
            'expected_joining_date',
            'interview_date',
            'date_of_transfer',
            'assigned_from',
            'assigned_from_name',
            'assign_to',
            'assign_to_name',
            'assign_by',
            'assign',
            'feedback',
            'created_at',
            'updated_at'
        ]
    
    def get_assigned_from_name(self, obj):
        """Get the full name of the employee who assigned this profile"""
        if not obj.assigned_from:
            return None
        
        try:
            from empreg.models import Employee
            employee = Employee.objects.filter(
                employeeCode=obj.assigned_from,
                del_state=0
            ).first()
            
            if employee:
                first_name = employee.firstName or ''
                last_name = employee.lastName or ''
                full_name = f"{first_name} {last_name}".strip()
                return full_name if full_name else obj.assigned_from
            else:
                return obj.assigned_from  # Fallback to employee code
        except Exception as e:
            print(f"ProfileInSerializer: Error getting employee name for {obj.assigned_from}: {e}")
            return obj.assigned_from  # Fallback to employee code
    
    def get_assign_to_name(self, obj):
        """Get the full name of the employee who currently owns this profile"""
        if not obj.assign_to:
            return None
        
        try:
            from empreg.models import Employee
            employee = Employee.objects.filter(
                employeeCode=obj.assign_to,
                del_state=0
            ).first()
            
            if employee:
                first_name = employee.firstName or ''
                last_name = employee.lastName or ''
                full_name = f"{first_name} {last_name}".strip()
                return full_name if full_name else obj.assign_to
            else:
                return obj.assign_to  # Fallback to employee code
        except Exception as e:
            print(f"ProfileInSerializer: Error getting employee name for {obj.assign_to}: {e}")
            return obj.assign_to  # Fallback to employee code

# --------------------------------
# Profile OUT Serializer
# --------------------------------
class ProfileOutSerializer(serializers.ModelSerializer):
    """Serializer for Profile OUT - profiles assigned FROM the current user"""
    # Full candidate data
    candidate = CandidateListSerializer(read_only=True)
    
    # Quick access fields for table display
    candidate_name = serializers.CharField(source='candidate.candidate_name', read_only=True)
    mobile_no = serializers.CharField(source='candidate.mobile1', read_only=True)
    profile_number = serializers.CharField(source='candidate.profile_number', read_only=True)
    
    # Transfer tracking
    date_of_transfer = serializers.DateTimeField(source='transfer_date', read_only=True)
    assigned_to = serializers.CharField(source='assign_to', read_only=True)  # Employee code
    assigned_to_name = serializers.SerializerMethodField()  # Employee name who received it
    assign_to_name = serializers.SerializerMethodField()  # Alias for consistency
    assigned_from_name = serializers.SerializerMethodField()  # Employee name who assigned it from

    class Meta:
        model = ClientJob
        fields = [
            'id',
            'candidate',  # Full candidate object
            'candidate_name',
            'mobile_no',
            'profile_number',
            'client_name',
            'designation',
            'current_ctc',
            'expected_ctc',
            'remarks',
            'next_follow_up_date',
            'expected_joining_date',
            'interview_date',
            'date_of_transfer',
            'assigned_to',
            'assigned_to_name',
            'assign_to_name',
            'assigned_from',
            'assigned_from_name',
            'assign_by',
            'assign',
            'feedback',
            'created_at',
            'updated_at'
        ]

    def get_assigned_to_name(self, obj):
        """Get the full name of the employee who received the assignment"""
        if not obj.assign_to:
            return None
        
        try:
            from empreg.models import Employee
            employee = Employee.objects.filter(
                employeeCode=obj.assign_to,
                del_state=0
            ).first()
            
            if employee:
                first_name = employee.firstName or ''
                last_name = employee.lastName or ''
                full_name = f"{first_name} {last_name}".strip()
                return full_name if full_name else obj.assign_to
            else:
                return obj.assign_to  # Fallback to employee code
        except Exception as e:
            print(f"ProfileOutSerializer: Error getting employee name for {obj.assign_to}: {e}")
            return obj.assign_to  # Fallback to employee code
    
    def get_assign_to_name(self, obj):
        """Alias for assigned_to_name for consistency"""
        return self.get_assigned_to_name(obj)
    
    def get_assigned_from_name(self, obj):
        """Get the full name of the employee who assigned this profile"""
        if not obj.assigned_from:
            return None
        
        try:
            from empreg.models import Employee
            employee = Employee.objects.filter(
                employeeCode=obj.assigned_from,
                del_state=0
            ).first()
            
            if employee:
                first_name = employee.firstName or ''
                last_name = employee.lastName or ''
                full_name = f"{first_name} {last_name}".strip()
                return full_name if full_name else obj.assigned_from
            else:
                return obj.assigned_from  # Fallback to employee code
        except Exception as e:
            print(f"ProfileOutSerializer: Error getting employee name for {obj.assigned_from}: {e}")
            return obj.assigned_from  # Fallback to employee code


# --------------------------------
# Candidate Status History Serializer
# --------------------------------
class CandidateStatusHistorySerializer(serializers.ModelSerializer):
    """Serializer for Candidate Status History with profile submission support"""
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CandidateStatusHistory
        fields = [
            'id',
            'candidate_id',
            'client_job_id',
            'vendor_id',
            'client_name',
            'remarks',
            'profile_submission',
            'extra_notes',
            'change_date',
            'created_by',
            'created_by_name',
            'created_at'
        ]
    
    def get_created_by_name(self, obj):
        """Get full name of the person who created this record"""
        if not obj.created_by:
            return None
        
        try:
            from empreg.models import Employee
            employee = Employee.objects.get(employeeCode=obj.created_by, del_state=0)
            full_name = f"{employee.firstName} {employee.lastName}".strip()
            return full_name if full_name else employee.firstName
        except Exception:
            return obj.created_by
    
    def create(self, validated_data):
        """Create a new status history entry"""
        return CandidateStatusHistory.objects.create(**validated_data)


            