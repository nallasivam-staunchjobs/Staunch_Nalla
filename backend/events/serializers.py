from rest_framework import serializers
from .models import CallDetails
from Masters.models import Source
from .constants import ALL_INDIA_STATES_LIST, ALL_INDIA_CITIES_WITH_STATE
# Employee and Vendor models accessed via DatabaseQueryHelper to avoid duplication


class CallDetailsNameResolutionMixin:
    """Mixin class to handle name resolution for CallDetails serializers"""
    
    def get_branch(self, obj):
        """Get branch information from employee data using Django ORM"""
        # Use shared helper from views to avoid duplication
        from .views import DatabaseQueryHelper
        employee_data = DatabaseQueryHelper.get_employee_by_id(obj.tb_call_emp_id, include_branch_level=True)
        return employee_data.get('branch') if employee_data else None
    
    def get_branch_name(self, obj):
        """Get branch name - same as branch for now"""
        return self.get_branch(obj)
    
    def get_employee_name(self, obj):
        """Get employee name from employee ID using Django ORM"""
        # Use shared helper from views to avoid duplication
        from .views import DatabaseQueryHelper
        employee_data = DatabaseQueryHelper.get_employee_by_id(obj.tb_call_emp_id)
        return employee_data.get('fullName', 'Unknown Employee') if employee_data else 'Unknown Employee'
    
    def get_client_name(self, obj):
        """Get client name from client ID using Django ORM"""
        # Use shared helper from views to avoid duplication
        from .views import DatabaseQueryHelper
        vendor_data = DatabaseQueryHelper.get_vendor_by_id(obj.tb_call_client_id)
        return vendor_data.get('vendor_name', 'Unknown Client') if vendor_data else 'Unknown Client'
    
    def get_source_name(self, obj):
        """Get source name from Masters app Source model using Django ORM"""
        try:
            source = Source.objects.filter(
                id=obj.tb_call_source_id, 
                status='Active'
            ).first()
            
            if source:
                return source.name
            
            return f'Source {obj.tb_call_source_id}' if obj.tb_call_source_id else 'Unknown Source'
                
        except Exception as e:
            return f'Source {obj.tb_call_source_id}' if obj.tb_call_source_id else 'Unknown Source'
    
    def get_city_name(self, obj):
        """Get city name from locations.City model - OPTIMIZED with caching"""
        if not obj.tb_call_city_id:
            return 'Unknown City'
        
        try:
            city_id = int(obj.tb_call_city_id)
            
            # Use cached dictionary for O(1) lookup instead of repeated database queries
            if not hasattr(self, '_city_cache'):
                # Build cache on first access (only once per serializer instance)
                from locations.models import City
                self._city_cache = {
                    city.id: city.city 
                    for city in City.objects.all().only('id', 'city')
                }
            
            return self._city_cache.get(city_id, f'City {city_id}')
        except (ValueError, TypeError, Exception):
            return f'City {obj.tb_call_city_id}'
    
    def get_state_name(self, obj):
        """Get state name from locations.State model - OPTIMIZED with caching"""
        if not obj.tb_call_state_id:
            return 'Unknown State'
        
        try:
            state_id = int(obj.tb_call_state_id)
            
            # Use cached dictionary for O(1) lookup instead of repeated database queries
            if not hasattr(self, '_state_cache'):
                # Build cache on first access (only once per serializer instance)
                from locations.models import State
                self._state_cache = {
                    state.id: state.state 
                    for state in State.objects.all().only('id', 'state')
                }
            
            return self._state_cache.get(state_id, f'State {state_id}')
        except (ValueError, TypeError, Exception):
            return f'State {obj.tb_call_state_id}'
    
    def get_position_name(self, obj):
        """Get position name from position ID using Masters Position model"""
        try:
            # First check if tb_call_channel already contains the name (not ID)
            if obj.tb_call_channel and not obj.tb_call_channel.isdigit():
                return obj.tb_call_channel
            
            # If tb_call_channel contains ID or is empty, try to resolve from tb_call_channel_id
            position_id = obj.tb_call_channel_id or obj.tb_call_channel
            if position_id:
                try:
                    from Masters.models import Position
                    position = Position.objects.filter(
                        id=int(position_id),
                        name__isnull=False
                    ).exclude(name='').first()
                    
                    if position:
                        return position.name
                except (ImportError, ValueError):
                    pass
            
            return obj.tb_call_channel if obj.tb_call_channel else 'Unknown Position'
        except Exception as e:
            return obj.tb_call_channel if obj.tb_call_channel else 'Unknown Position'
    
    # CamelCase versions for frontend compatibility
    def get_employeeName(self, obj):
        """CamelCase version for frontend compatibility"""
        return self.get_employee_name(obj)
    
    def get_clientName(self, obj):
        """CamelCase version for frontend compatibility"""
        return self.get_client_name(obj)
    
    def get_sourceName(self, obj):
        """CamelCase version for frontend compatibility"""
        return self.get_source_name(obj)
    
    # Call statistics count methods
    def get_tb_calls_onplan_count(self, obj):
        """Get count of candidates in tb_calls_onplan"""
        from .views import get_candidate_count
        return get_candidate_count(obj.tb_calls_onplan)
    
    def get_tb_calls_onothers_count(self, obj):
        """Get count of candidates in tb_calls_onothers"""
        from .views import get_candidate_count
        return get_candidate_count(obj.tb_calls_onothers)
    
    def get_tb_calls_profiles_count(self, obj):
        """Get count of candidates in tb_calls_profiles"""
        from .views import get_candidate_count
        return get_candidate_count(obj.tb_calls_profiles)
    
    def get_tb_calls_profilesothers_count(self, obj):
        """Get count of candidates in tb_calls_profilesothers"""
        from .views import get_candidate_count
        return get_candidate_count(obj.tb_calls_profilesothers)


class CallDetailsSerializer(CallDetailsNameResolutionMixin, serializers.ModelSerializer):
    """
    Serializer for CallDetails model - matches frontend expectations
    """
    is_active = serializers.ReadOnlyField()
    call_duration = serializers.ReadOnlyField()
    call_plan_info = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_tb_call_status_display', read_only=True)
    branch = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    employee_name = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    city_name = serializers.SerializerMethodField()
    state_name = serializers.SerializerMethodField()
    position_name = serializers.SerializerMethodField()
    
    # Add count fields for frontend
    tb_calls_onplan_count = serializers.SerializerMethodField()
    tb_calls_onothers_count = serializers.SerializerMethodField()
    tb_calls_profiles_count = serializers.SerializerMethodField()
    tb_calls_profilesothers_count = serializers.SerializerMethodField()
    
    def to_representation(self, instance):
        """
        Override to sanitize text fields before returning to prevent Unicode encoding errors
        """
        data = super().to_representation(instance)
        
        # Sanitize text fields that may contain Unicode characters
        text_fields = ['tb_call_description', 'tb_call_channel', 'employee_name', 
                      'client_name', 'source_name']
        
        for field in text_fields:
            if field in data and data[field]:
                data[field] = self._sanitize_text(data[field])
        
        return data
    
    @staticmethod
    def _sanitize_text(text):
        """
        Sanitize text to prevent Unicode encoding errors
        """
        if not text:
            return text
        
        try:
            replacements = {
                '\xa0': ' ',      # Non-breaking space
                '\u2018': "'",    # Left single quote
                '\u2019': "'",    # Right single quote
                '\u201c': '"',    # Left double quote
                '\u201d': '"',    # Right double quote
                '\u2013': '-',    # En dash
                '\u2014': '-',    # Em dash
                '\u2026': '...',  # Ellipsis
                '\u00a0': ' ',    # Non-breaking space (alternative)
            }
            
            sanitized = str(text)
            for unicode_char, replacement in replacements.items():
                sanitized = sanitized.replace(unicode_char, replacement)
            
            return sanitized.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
        except Exception:
            return str(text).encode('ascii', errors='ignore').decode('ascii')
    
    class Meta:
        model = CallDetails
        fields = [
            'id', 'tb_call_plan_id', 'call_plan_info', 'tb_call_plan_data',
            'tb_call_emp_id', 'tb_call_client_id', 'tb_call_state_id', 'tb_call_city_id',
            'tb_call_channel', 'tb_call_channel_id', 'tb_call_source_id', 'tb_call_description',
            'tb_call_startdate', 'tb_call_todate', 'tb_calls_onplan', 'tb_calls_onothers',
            'tb_calls_profiles', 'tb_calls_profilesothers', 'tb_call_status',
            'status_display', 'is_active', 'call_duration', 'call_plan_info',
            'tb_call_add_date', 'tb_call_up_date', 'employee_name', 'client_name', 'source_name',
            'branch', 'branch_name', 'city_name', 'state_name', 'position_name',
            'tb_calls_onplan_count', 'tb_calls_onothers_count', 'tb_calls_profiles_count', 'tb_calls_profilesothers_count'
        ]
        read_only_fields = [
            'tb_call_add_date', 'tb_call_up_date', 'is_active', 'call_duration',
            'status_display', 'call_plan_info'
        ]
    
    def validate(self, data):
        """
        Validate call details data - only accept numeric database IDs for state/city
        """
        # VALIDATE STATE ID - NO MAPPING, ONLY VALIDATION
        if 'tb_call_state_id' in data:
            state_input = data['tb_call_state_id']
            
            # Only accept numeric state IDs - no name mapping
            if isinstance(state_input, str) and not state_input.isdigit():
                raise serializers.ValidationError(f"State ID must be numeric, received: '{state_input}'")
        
        # VALIDATE CITY ID - NO MAPPING, ONLY VALIDATION
        if 'tb_call_city_id' in data:
            city_input = data['tb_call_city_id']
            
            # Only accept numeric city IDs - no name mapping
            if isinstance(city_input, str) and not city_input.isdigit():
                raise serializers.ValidationError(f"City ID must be numeric, received: '{city_input}'")
        
        if 'tb_call_startdate' in data and 'tb_call_todate' in data:
            if data['tb_call_startdate'] >= data['tb_call_todate']:
                raise serializers.ValidationError("Start date must be before end date")
        
        return data



class CallDetailsListSerializer(CallDetailsNameResolutionMixin, serializers.ModelSerializer):
    """
    Simplified serializer for listing call details - with frontend compatibility and call statistics
    """
    is_active = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_tb_call_status_display', read_only=True)
    call_plan_data = serializers.CharField(source='tb_call_plan_data', read_only=True)
    call_plan_info = serializers.ReadOnlyField()
    call_duration = serializers.ReadOnlyField()
    
    # Frontend compatibility - camelCase field mappings
    employeeName = serializers.SerializerMethodField()
    clientName = serializers.SerializerMethodField()
    sourceName = serializers.SerializerMethodField()
    branch = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    employee_name = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    city_name = serializers.SerializerMethodField()
    state_name = serializers.SerializerMethodField()
    position_name = serializers.SerializerMethodField()
    
    def to_representation(self, instance):
        """Override to add count fields while keeping raw IDs and sanitize text"""
        data = super().to_representation(instance)
        
        # Import count helper function
        from .views import get_candidate_count
        
        # Sanitize text fields to prevent Unicode encoding errors
        text_fields = ['tb_call_description', 'tb_call_channel', 'employee_name', 
                      'client_name', 'source_name']
        
        for field in text_fields:
            if field in data and data[field]:
                data[field] = self._sanitize_text(data[field])
        
        return data
    
    @staticmethod
    def _sanitize_text(text):
        """
        Sanitize text to prevent Unicode encoding errors
        """
        if not text:
            return text
        
        try:
            replacements = {
                '\xa0': ' ',      # Non-breaking space
                '\u2018': "'",    # Left single quote
                '\u2019': "'",    # Right single quote
                '\u201c': '"',    # Left double quote
                '\u201d': '"',    # Right double quote
                '\u2013': '-',    # En dash
                '\u2014': '-',    # Em dash
                '\u2026': '...',  # Ellipsis
                '\u00a0': ' ',    # Non-breaking space (alternative)
            }
            
            sanitized = str(text)
            for unicode_char, replacement in replacements.items():
                sanitized = sanitized.replace(unicode_char, replacement)
            
            return sanitized.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
        except Exception:
            return str(text).encode('ascii', errors='ignore').decode('ascii')
    
    class Meta:
        model = CallDetails
        fields = [
            'id', 'call_plan_data', 'tb_call_plan_data', 'tb_call_plan_id', 'tb_call_emp_id', 'tb_call_client_id',
            'tb_call_channel', 'tb_call_startdate', 'tb_call_todate', 'tb_call_status', 'status_display',
            'is_active', 'tb_call_add_date', 'tb_call_description', 'call_plan_info', 'call_duration',
            'employee_name', 'client_name', 'source_name', 'employeeName', 'clientName', 'sourceName',
            'tb_call_state_id', 'tb_call_city_id', 'tb_call_source_id',
            'tb_calls_onplan', 'tb_calls_onothers', 'tb_calls_profiles', 'tb_calls_profilesothers',
            'branch', 'branch_name', 'city_name', 'state_name', 'position_name'
        ]
