from django.db import models
from django.utils import timezone


class CallDetails(models.Model):
    """
    Model for tb_call_details table - matches frontend Events.jsx expectations
    """
    STATUS_CHOICES = [
        (0, 'Inactive'),
        (1, 'Active'),
        (2, 'Completed'),
        (3, 'Cancelled'),
    ]
    
    # Call plan ID reference (no foreign key) - matches database column name
    tb_call_plan_id = models.IntegerField(null=True, blank=True)
    tb_call_plan_data = models.CharField(max_length=20, default='P1')
    tb_call_emp_id = models.IntegerField(default=1)
    tb_call_client_id = models.IntegerField(default=1)
    tb_call_state_id = models.CharField(max_length=100, null=True, blank=True)
    tb_call_city_id = models.CharField(max_length=100, null=True, blank=True)
    tb_call_channel = models.CharField(max_length=200, default='General Position')
    tb_call_channel_id = models.IntegerField(null=True, blank=True)
    tb_call_source_id = models.CharField(max_length=100, null=True, blank=True)
    tb_call_description = models.TextField(default='Event description')
    tb_call_startdate = models.DateTimeField()
    tb_call_todate = models.DateTimeField()
    
    # Call outcome fields - store comma-separated candidate IDs
    tb_calls_onplan = models.TextField(null=True, blank=True)
    tb_calls_onothers = models.TextField(null=True, blank=True)
    tb_calls_profiles = models.TextField(null=True, blank=True)
    tb_calls_profilesothers = models.TextField(null=True, blank=True)
    
    # Status and timestamps
    tb_call_status = models.IntegerField(choices=STATUS_CHOICES, default=1)
    tb_call_add_date = models.DateTimeField(auto_now_add=True)
    tb_call_up_date = models.DateTimeField(auto_now=True)
    
    # Additional fields for frontend compatibility
    employee_name = models.CharField(max_length=200, null=True, blank=True)
    client_name = models.CharField(max_length=200, null=True, blank=True)
    source_name = models.CharField(max_length=200, null=True, blank=True)
    
    class Meta:
        db_table = 'tb_call_details'
        verbose_name = 'Call Detail'
        verbose_name_plural = 'Call Details'
        ordering = ['-tb_call_add_date']
    
    def __str__(self):
        return f"Call Detail {self.tb_call_plan_data} - {self.tb_call_channel}"
    
    @property
    def is_active(self):
        return self.tb_call_status == 1
    
    @property
    def call_duration(self):
        if self.tb_call_startdate and self.tb_call_todate:
            return (self.tb_call_todate - self.tb_call_startdate).total_seconds() / 3600  # in hours
        return 1.0  # Default 1 hour
    
    @property
    def call_plan_info(self):
        """Return call plan info for frontend compatibility"""
        return {'tb_call_plan_data': self.tb_call_plan_data}
    
    def get_calls_onplan_safe(self):
        """Return calls on plan, ensuring it's never None"""
        return self.tb_calls_onplan or ''
    
    def get_calls_onothers_safe(self):
        """Return calls on others, ensuring it's never None"""
        return self.tb_calls_onothers or ''
    
    def get_calls_profiles_safe(self):
        """Return profiles, ensuring it's never None"""
        return self.tb_calls_profiles or ''
    
    def get_calls_profilesothers_safe(self):
        """Return profiles on others, ensuring it's never None"""
        return self.tb_calls_profilesothers or ''
    
    def save(self, *args, **kwargs):
        """
        Override save to sanitize text fields before saving to database
        Prevents Unicode encoding errors
        """
        # Sanitize text fields
        if self.tb_call_description:
            self.tb_call_description = self._sanitize_text(self.tb_call_description)
        
        if self.tb_call_channel:
            self.tb_call_channel = self._sanitize_text(self.tb_call_channel)
        
        if self.employee_name:
            self.employee_name = self._sanitize_text(self.employee_name)
        
        if self.client_name:
            self.client_name = self._sanitize_text(self.client_name)
        
        if self.source_name:
            self.source_name = self._sanitize_text(self.source_name)
        
        super().save(*args, **kwargs)
    
    @staticmethod
    def _sanitize_text(text):
        """
        Sanitize text to prevent Unicode encoding errors
        Replaces problematic Unicode characters with ASCII-safe equivalents
        """
        if not text:
            return text
        
        try:
            replacements = {
                '\xa0': ' ',      # Non-breaking space → regular space
                '\u2018': "'",    # Left single quote → apostrophe
                '\u2019': "'",    # Right single quote → apostrophe
                '\u201c': '"',    # Left double quote → quote
                '\u201d': '"',    # Right double quote → quote
                '\u2013': '-',    # En dash → hyphen
                '\u2014': '-',    # Em dash → hyphen
                '\u2026': '...',  # Ellipsis → three dots
                '\u00a0': ' ',    # Non-breaking space (alternative)
            }
            
            sanitized = str(text)
            for unicode_char, replacement in replacements.items():
                sanitized = sanitized.replace(unicode_char, replacement)
            
            # Encode to UTF-8 and decode back to ensure compatibility
            return sanitized.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
        except Exception:
            # Fallback: encode as ASCII, ignoring errors
            return str(text).encode('ascii', errors='ignore').decode('ascii')
