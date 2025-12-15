#new model
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import datetime

# -----------------------------
# Shared Audit Fields
# -----------------------------
class AuditFields(models.Model):
    created_by = models.CharField(max_length=100, null=True, blank=True, help_text="Employee code of candidate creator")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.CharField(max_length=100, null=True, blank=True, help_text="Employee code of last updater")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        
    def get_created_by_name(self):
        """
        Get full name of the person who created this record
        Converts employee code to firstName + lastName from Employee table
        
        Returns:
            str: Full name (firstName lastName) or employee code if not found
        """
        if not self.created_by:
            return None
        
        try:
            from empreg.models import Employee
            employee = Employee.objects.get(employeeCode=self.created_by, del_state=0)
            full_name = f"{employee.firstName} {employee.lastName}".strip()
            return full_name if full_name else employee.firstName
        except Exception:
            # If employee not found, return the employee code as is
            return self.created_by
    
    def get_updated_by_name(self):
        """
        Get full name of the person who last updated this record
        Converts employee code to firstName + lastName from Employee table
        
        Returns:
            str: Full name (firstName lastName) or employee code if not found
        """
        if not self.updated_by:
            return None
        
        try:
            from empreg.models import Employee
            employee = Employee.objects.get(employeeCode=self.updated_by, del_state=0)
            full_name = f"{employee.firstName} {employee.lastName}".strip()
            return full_name if full_name else employee.firstName
        except Exception:
            # If employee not found, return the employee code as is
            return self.updated_by
    
    def save(self, *args, **kwargs):
        from django.utils import timezone
        
        # Extract user info from kwargs if provided
        user_info = kwargs.pop('user_info', None)
        
        # Check if this is a new record BEFORE calling super().save()
        # We need to check if pk exists in the database, not just if self.pk is set
        is_new_record = self._state.adding
        
        # For updates, set updated_at and updated_by
        if not is_new_record:  # This is an update (record already exists in database)
            # Set updated_at to current time for updates
            self.updated_at = timezone.now()
            
            # Set updated_by based on priority:
            # 1. From user_info parameter (highest priority)
            # 2. For ClientJob models, use assign_by field
            # 3. For Candidate models, try to get from related ClientJob
            # 4. Keep existing updated_by if none of above work
            
            if user_info:
                # user_info can be employee code or name
                self.updated_by = user_info
            elif hasattr(self, 'assign_by') and self.assign_by:
                # For ClientJob models, use assign_by field
                self.updated_by = self.assign_by
            elif self.__class__.__name__ == 'Candidate':
                # For Candidate models, try to get from related ClientJob
                try:
                    latest_client_job = self.client_jobs.filter(assign_by__isnull=False).order_by('-updated_at').first()
                    if latest_client_job and latest_client_job.assign_by:
                        self.updated_by = latest_client_job.assign_by
                except Exception:
                    pass
        else:  # This is a creation (new record)
            # Do NOT set updated_at on creation - leave it as None
            self.updated_at = None
            
            # Set created_by if user_info is provided
            if user_info and not self.created_by:
                self.created_by = user_info
                
        super().save(*args, **kwargs)


# -----------------------------
# Step 1 - Main Candidate Info
# -----------------------------
class Candidate(AuditFields):
    profile_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    executive_name = models.CharField(max_length=100, help_text="Employee name who created this candidate")
    candidate_name = models.CharField(max_length=100)
    mobile1 = models.CharField(max_length=15)
    mobile2 = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField()
    gender = models.CharField(max_length=100, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    country = models.CharField(max_length=50, blank=True, null=True)
    state = models.CharField(max_length=50, blank=True, null=True)
    city = models.CharField(max_length=50, blank=True, null=True)
    pincode = models.CharField(max_length=10, blank=True, null=True)
    education = models.CharField(max_length=200, blank=True, null=True)
    experience = models.CharField(max_length=200, blank=True, null=True)
    source = models.CharField(max_length=50, blank=True, null=True)
    communication = models.CharField(max_length=50, blank=True, null=True)
    languages = models.JSONField(blank=True, null=True)
    skills = models.JSONField(blank=True, null=True)
    resume_file = models.FileField(upload_to="resumes/", blank=True, null=True)
    resume_parsed_data = models.JSONField(blank=True, null=True)  # Store parsed resume data
    resume_text = models.TextField(blank=True, null=True)         # Raw extracted text
    resume_pdf = models.FileField(                                # Auto-converted PDF (if DOCX)
        upload_to="resumes/converted/", 
        blank=True, null=True
    )
    feedback = models.TextField(blank=True, null=True)
    transfer_history = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        # For candidate creation, set created_by to the executive who created this candidate
        if not self.pk and self.executive_name:  # This is a creation
            # Try to get employee code from executive_name
            try:
                from empreg.models import Employee
                # If executive_name is already an employee code, use it
                if self.executive_name.startswith(('EMP', 'CBE')):
                    self.created_by = self.executive_name
                    print(f" CANDIDATE CREATE: Setting created_by = {self.executive_name} (from employee code)")
                else:
                    # If executive_name is a name, try to find the employee code
                    try:
                        employee = Employee.objects.get(firstName=self.executive_name, del_state=0)
                        self.created_by = employee.employeeCode
                        print(f" CANDIDATE CREATE: Setting created_by = {employee.employeeCode} (from name '{self.executive_name}')")
                    except Employee.DoesNotExist:
                        # If not found, use the executive_name as is
                        self.created_by = self.executive_name
                        print(f" CANDIDATE CREATE: Using executive_name as created_by = {self.executive_name} (employee not found)")
            except Exception as e:
                print(f" Error setting created_by for candidate: {str(e)}")
                self.created_by = self.executive_name
                
        super().save(*args, **kwargs)
    
    class Meta:
        indexes = [
            models.Index(fields=['-updated_at'], name='candidate_updated_at_idx'),
            models.Index(fields=['-created_at'], name='candidate_created_at_idx'),
            models.Index(fields=['executive_name'], name='candidate_executive_idx'),
            models.Index(fields=['city'], name='candidate_city_idx'),
            models.Index(fields=['state'], name='candidate_state_idx'),
            models.Index(fields=['created_by'], name='candidate_created_by_idx'),
            # Indexes to speed up exact-match candidate search
            models.Index(fields=['candidate_name'], name='candidate_name_idx'),
            models.Index(fields=['email'], name='candidate_email_idx'),
            models.Index(fields=['mobile1'], name='candidate_mobile1_idx'),
            models.Index(fields=['mobile2'], name='candidate_mobile2_idx'),
        ]
    
    def __str__(self):
        return f"{self.candidate_name} ({self.profile_number})"


# -----------------------------
# Step 2 - Client & Job Details
# -----------------------------
class ClientJob(AuditFields):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="client_jobs")
    client_name = models.CharField(max_length=100)
    designation = models.CharField(max_length=100)
    industry = models.JSONField(blank=True, null=True)  # Replacing ArrayField
    remarks = models.CharField(max_length=255, blank=True, null=True)
    profilestatus = models.CharField(max_length=255, blank=True, null=True)  # Priority remark field
    interview_date = models.DateTimeField(blank=True, null=True)
    expected_joining_date = models.DateTimeField(blank=True, null=True)
    next_follow_up_date = models.DateField(blank=True, null=True)
    current_ctc = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    expected_ctc = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    # feedback = models.TextField(blank=True, null=True)
    profile_submission = models.IntegerField(default=0)  # 1 for Yes, 0 for No
    profile_submission_date = models.DateField(blank=True, null=True)
    assign = models.CharField(max_length=20, blank=True, null=True)  # 'null' or 'assigned'
    assign_to=models.CharField(max_length=100,blank=True,null=True)
    assigned_from = models.CharField(max_length=255, blank=True, null=True)
    transfer_date = models.DateTimeField(blank=True, null=True)
    transfer_status = models.CharField(max_length=50, blank=True, null=True)
    assign_by=models.CharField(max_length=100,blank=True,null=True)
    attend = models.BooleanField(default=False)
    attend_date = models.DateField(blank=True, null=True)
    branch_id = models.IntegerField(blank=True, null=True)
    team_id = models.IntegerField(blank=True, null=True)
    employee_id = models.CharField(max_length=50, blank=True, null=True)
    
    
    def _normalize_zero_dates(self):
        fields = ['next_follow_up_date', 'profile_submission_date', 'attend_date']
        for field_name in fields:
            value = getattr(self, field_name, None)
            if isinstance(value, str):
                v = value.strip()
                if v.startswith('0000-00-00'):
                    setattr(self, field_name, None)

    def save(self, *args, **kwargs):
        self._normalize_zero_dates()
        super().save(*args, **kwargs)

    def add_assignment(self, assign_to_code, assign_by_code, entry_by="", entry_time=None, reason="manual_reassignment", notes="", update_nfd=True, nfd_days=1):
        """
        Add assignment tracking to feedback and update assignment fields
        Now includes JobAssignmentHistory tracking for complete audit trail
        
        Args:
            assign_to_code: Employee code of person being assigned to
            assign_by_code: Employee code of person making the assignment
            entry_by: Name/identifier of person making the entry
            entry_time: Time of assignment (auto-generated if None)
            reason: Reason for assignment (for JobAssignmentHistory)
            notes: Additional notes for the assignment
            update_nfd: Whether to update NFD for new executive (default: True)
            nfd_days: Number of days to add to current date for NFD (default: 1)
        """
        from datetime import datetime
        
        if entry_time is None:
            entry_time = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        
        # Store original assignment for history tracking
        old_assign_to = self.assign_to
        old_executive = self.candidate.executive_name
        
        # Update assignment fields
        self.assigned_from = old_assign_to  # Track where it was assigned from
        self.assign_to = assign_to_code
        self.assign_by = assign_by_code
        self.assign = 'assigned'  # Set status to 'assigned'
        self.transfer_date = datetime.now()  # Set transfer timestamp
        # Don't manually set updated_by - let AuditFields handle it automatically
        
        # Update candidate's executive name to the new assigned executive's employee code
        try:
            from empreg.models import Employee
            assigned_employee = Employee.objects.get(employeeCode=assign_to_code, del_state=0)
            # Store employee code in executive_name, not full name
            self.candidate.executive_name = assign_to_code
            # Persist employee code for reporting (e.g., Emp/00100)
            self.employee_id = assign_to_code
            # Don't manually set updated_by - let AuditFields handle it automatically
            self.candidate.save()
            print(f"DEBUG ASSIGNMENT: Updated candidate executive from '{old_executive}' to '{assign_to_code}'")
        except Employee.DoesNotExist:
            print(f"WARNING: Could not find employee with code {assign_to_code} to update candidate executive name")
        except Exception as e:
            print(f"WARNING: Error updating candidate executive name: {str(e)}")
        
        # Create JobAssignmentHistory record for audit trail
        from django.utils import timezone
        JobAssignmentHistory.objects.create(
            client_job=self,
            candidate=self.candidate,
            previous_owner=old_assign_to,
            new_owner=assign_to_code,
            assigned_by=assign_by_code,
            reason=reason,
            notes=notes,
            created_by=entry_by,
            updated_by=entry_by,
            updated_at=timezone.now()
        )
        
        # Create feedback entry for assignment tracking
        if old_assign_to:
            feedback_text = f"Candidate reassigned from {old_assign_to} to {assign_to_code}"
            if notes:
                feedback_text += f" - {notes}"
        else:
            feedback_text = f"Candidate assigned to {assign_to_code}"
            if notes:
                feedback_text += f" - {notes}"
            
        # Update NFD to give new executive time to follow up (configurable)
        nfd_date_str = None
        if update_nfd:
            from datetime import datetime, timedelta
            new_nfd_date = datetime.now() + timedelta(days=nfd_days)
            self.next_follow_up_date = new_nfd_date.date()
            nfd_date_str = new_nfd_date.strftime("%Y-%m-%d")
            print(f"DEBUG ASSIGNMENT: Updated NFD to {new_nfd_date.date()} ({nfd_days} days from now)")
        
        # Add assignment feedback entry with updated NFD
        self.add_feedback(
            feedback_text=feedback_text,
            remarks="assigned",
            nfd_date=nfd_date_str,
            entry_by=entry_by,
            entry_time=entry_time,
            call_status="assignment"
        )
        
        print(f"DEBUG ASSIGNMENT: Assigned candidate to {assign_to_code} by {assign_by_code} (Reason: {reason})")

    def reset_assignment(self):
        """
        Reset assignment back to original executive
        Sets assign field to 'null' and clears assignment fields
        """
        self.assign = None
        self.assign_to = None
        self.assign_by = None
        print(f"DEBUG ASSIGNMENT: Reset assignment for ClientJob {self.id} back to original executive")

    def get_assigned_executive_name(self):
        """
        Get the name of the currently assigned executive
        Returns the assigned executive name if available, otherwise returns original executive name
        """
        if self.assign_to:
            try:
                # Import here to avoid circular imports
                from empreg.models import Employee
                # assign_to stores employee code, convert to name for display
                assigned_employee = Employee.objects.get(employeeCode=self.assign_to, del_state=0)
                full_name = f"{assigned_employee.firstName} {assigned_employee.lastName}".strip() or assigned_employee.firstName
                return full_name
            except Employee.DoesNotExist:
                # Fallback to employee code if employee not found
                return self.assign_to
            except Exception as e:
                print(f"WARNING: Error getting assigned executive name: {str(e)}")
                return self.assign_to
        else:
            # Return original executive name if no assignment
            return self.candidate.executive_name

    def get_assignment_info(self):
        """
        Get complete assignment information for display
        """
        return {
            'original_executive': self.candidate.executive_name,
            'assigned_to': self.assign_to,
            'assigned_by': self.assign_by,
            'current_executive': self.get_assigned_executive_name(),
            'is_assigned': bool(self.assign_to),
            'assignment_type': 'specific_job' if self.assign_to else 'original'
        }

    def get_display_executive(self):
        """
        Get the executive name to display for this specific client job
        Based on the assign field status:
        - If assign is 'assigned': show assign_to executive name
        - If assign is 'null' or None: show candidate's original executive name
        """
        print(f"DEBUG get_display_executive: ClientJob {self.id} - assign='{self.assign}', assign_to='{self.assign_to}'")
        
        if self.assign == 'assigned' and self.assign_to:
            # This specific client job has been assigned to someone
            assigned_name = self.get_assigned_executive_name()
            print(f"DEBUG get_display_executive: Returning assigned name: '{assigned_name}'")
            return assigned_name
        else:
            # This client job uses the original candidate's executive (assign is 'null' or None)
            original_name = self.candidate.executive_name
            print(f"DEBUG get_display_executive: Returning original name: '{original_name}'")
            return original_name
            
    def is_owned_by_executive(self, executive_identifier):
        """
        Check if this specific client job is owned by the given executive
        executive_identifier can be either employee code or employee name
        """
        if self.assign_to:
            # Check against specific assignment (assign_to stores employee code)
            if str(self.assign_to) == str(executive_identifier):
                return True
            # Also try to match by name if identifier is a name
            try:
                from empreg.models import Employee
                employee = Employee.objects.get(firstName=executive_identifier, del_state=0)
                return str(self.assign_to) == str(employee.employeeCode)
            except Employee.DoesNotExist:
                return False
        else:
            # Check against original candidate executive
            # Try name comparison first
            if str(self.candidate.executive_name) == str(executive_identifier):
                return True
            # Try code comparison
            try:
                from empreg.models import Employee
                original_employee = Employee.objects.get(firstName=self.candidate.executive_name, del_state=0)
                return str(original_employee.employeeCode) == str(executive_identifier)
            except Employee.DoesNotExist:
                return False

    def add_feedback(self, feedback_text, remarks="", nfd_date=None, ejd_date=None, ifd_date=None, profile_submission=None, profile_submission_date=None, entry_by="", entry_time=None, entry_id=None, call_status="", update_date_fields=True):
        """
        Add or update structured feedback entry to the feedback field
        Format: Feedback-{text}: NFD-{nfd_date} : EJD-{ejd_date} : IFD-{ifd_date} : CallStatus-{call_status} : Remarks-{remarks} : Entry By-{entry_by} : Entry Time{entry_time};
        
        Args:
            entry_id: If provided, updates the existing entry at that index (0-based). If None, creates new entry.
            call_status: Status of the call (e.g., 'call answered', 'call not answered')
            profile_submission: Boolean or int (1/0) or str ('true'/'false') indicating if profile was submitted
            profile_submission_date: Date when profile was submitted
            update_date_fields: If False, skip updating date fields (for non-account holders). Default True.
        """
        from datetime import datetime
        
        # Clean text fields to remove non-breaking spaces and other problematic characters
        def clean_text(text):
            if not text:
                return text
            
            try:
                # Convert to string if not already
                text = str(text)
                
                # Replace non-breaking spaces with regular spaces
                text = text.replace('\xa0', ' ')
                text = text.replace('\u00a0', ' ')  # Alternative non-breaking space
                
                # Replace other common problematic Unicode characters
                text = text.replace('\u2018', "'")  # Left single quotation mark
                text = text.replace('\u2019', "'")  # Right single quotation mark
                text = text.replace('\u201c', '"')  # Left double quotation mark
                text = text.replace('\u201d', '"')  # Right double quotation mark
                text = text.replace('\u2013', '-')  # En dash
                text = text.replace('\u2014', '-')  # Em dash
                text = text.replace('\u2026', '...')  # Horizontal ellipsis
                text = text.replace('\u00b7', '*')  # Middle dot
                text = text.replace('\u2022', '*')  # Bullet
                text = text.replace('\u2010', '-')  # Hyphen
                text = text.replace('\u2011', '-')  # Non-breaking hyphen
                
                # Remove zero-width characters
                text = text.replace('\u200b', '')  # Zero-width space
                text = text.replace('\u200c', '')  # Zero-width non-joiner
                text = text.replace('\u200d', '')  # Zero-width joiner
                text = text.replace('\ufeff', '')  # Byte order mark
                
                # Encode to UTF-8 and decode back to remove remaining problematic characters
                text = text.encode('utf-8', errors='ignore').decode('utf-8')
                
                # Normalize whitespace
                text = ' '.join(text.split())
                
                return text
            except Exception as e:
                print(f"Error cleaning text: {str(e)}")
                # Fallback: ASCII-safe encoding
                try:
                    return str(text).encode('ascii', errors='ignore').decode('ascii')
                except:
                    return "Text encoding error"
        
        feedback_text = clean_text(feedback_text) if feedback_text else ""
        remarks = clean_text(remarks) if remarks else ""
        call_status = clean_text(call_status) if call_status else ""
        entry_by = clean_text(entry_by) if entry_by else ""
        
        print(f"DEBUG MODEL: add_feedback called with feedback_text='{feedback_text}', remarks='{remarks}', entry_id={entry_id}")
        
        # Handle profile_submission conversion
        # Only update when an explicit value is provided. If None, leave existing values unchanged.
        if profile_submission is not None:
            # Convert to proper boolean
            if isinstance(profile_submission, str):
                profile_submission = profile_submission.lower() in ('true', '1', 'yes', 'y')
            elif isinstance(profile_submission, int):
                profile_submission = bool(profile_submission)

            # Update the profile_submission field on the model
            self.profile_submission = profile_submission

            # If profile is being submitted and no date is provided, use current date
            if profile_submission and not profile_submission_date:
                profile_submission_date = datetime.now().date()

            # Update profile_submission_date if provided or if profile is being submitted
            if profile_submission_date:
                self.profile_submission_date = profile_submission_date
        
        if entry_time is None:
            entry_time = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        
        # Build the structured feedback entry based on remark type
        feedback_entry = f"Feedback-{feedback_text}"
        
        # Determine which dates to include based on remarks
        normalized_remarks = remarks.lower().strip() if remarks else ""
        interview_date_remarks = ['interview fixed', 'noshow & rescheduled', 'no show & reschedule']
        joining_date_remarks = ['selected']
        
        if normalized_remarks in interview_date_remarks:
            # For interview fixed/rescheduled - include NFD and IFD only
            if nfd_date:
                feedback_entry += f": NFD-{nfd_date}"
            else:
                feedback_entry += ": NFD-"
            feedback_entry += ": EJD-"  # Empty EJD
            if ifd_date:
                feedback_entry += f": IFD-{ifd_date}"
                
        elif normalized_remarks in joining_date_remarks:
            # For selected - include NFD and EJD only (no IFD)
            if nfd_date:
                feedback_entry += f": NFD-{nfd_date}"
            else:
                feedback_entry += ": NFD-"
            if ejd_date:
                feedback_entry += f": EJD-{ejd_date}"
            else:
                feedback_entry += ": EJD-"
            # No IFD for selected remarks
                
        else:
            # For other remarks - include NFD only
            if nfd_date:
                feedback_entry += f": NFD-{nfd_date}"
            else:
                feedback_entry += ": NFD-"
            feedback_entry += ": EJD-"  # Empty EJD
            # No IFD for other remarks
            
        # Add call status
        feedback_entry += f": CallStatus-{call_status}"
        feedback_entry += f": Remarks-{remarks}"
        feedback_entry += f": Entry By-{entry_by}"
        feedback_entry += f": Entry Time{entry_time};"
        
        print(f"DEBUG MODEL: Built feedback_entry: '{feedback_entry}'")
        print(f"DEBUG MODEL: Current feedback before: '{self.candidate.feedback}'")
        
        # Handle update vs create logic
        if entry_id is not None:
            # Update existing entry
            if self.candidate.feedback:
                entries = self.candidate.feedback.split(';;;;;;')
                if 0 <= entry_id < len(entries):
                    entries[entry_id] = feedback_entry
                    self.candidate.feedback = ';;;;;;'.join(entries)
                    print(f"DEBUG MODEL: Updated entry {entry_id}")
                else:
                    print(f"DEBUG MODEL: Invalid entry_id {entry_id}, creating new entry instead")
                    self.candidate.feedback += ";;;;;;"+feedback_entry
            else:
                print(f"DEBUG MODEL: No existing feedback, creating new entry")
                self.candidate.feedback = feedback_entry
        else:
            # Create new entry
            if self.candidate.feedback:
                self.candidate.feedback += ";;;;;;"+feedback_entry
            else:
                self.candidate.feedback = feedback_entry
            
        # Clean the final feedback string before assignment
        try:
            self.candidate.feedback = clean_text(self.candidate.feedback) if self.candidate.feedback else ""
            print(f"DEBUG MODEL: New feedback after cleaning: '{self.candidate.feedback}'")
        except Exception as e:
            print(f"ERROR MODEL: Failed to clean final feedback: {str(e)}")
            # Fallback to ASCII-safe version
            try:
                self.candidate.feedback = str(self.candidate.feedback).encode('ascii', errors='ignore').decode('ascii') if self.candidate.feedback else ""
            except:
                self.candidate.feedback = "Feedback encoding error"
        
        # Update ClientJob model fields with latest feedback values based on call status/remarks
        from datetime import datetime
        
        # Update remarks if provided
        if remarks:
            self.remarks = remarks
        
        # Only update date fields if update_date_fields is True (account holders only)
        if update_date_fields:
            # Determine which date fields to update based on remarks only
            # Call status is only "call answered" or "call not answered"
            # Following FormStep2 logic for date field visibility
            normalized_remarks = remarks.lower().strip() if remarks else ""
            
            # Define remark categories based on FormStep2 logic
            interview_date_remarks = ['interview fixed', 'noshow & rescheduled', 'no show & reschedule']
            joining_date_remarks = ['selected']
            next_followup_remarks = [
                'call later', 'interested', 'think and get back', 'profile validation',
                'hold', 'no show', 'next round', 'in process', 'position freeze',
                'attend & fb', 'attend & fp', 'nnr/nso', 'not looking for job change',
                'golden egg', 'profile duplicate', 'offer denied'
            ]
            
            # Update date fields based on remark type with conditional clearing
            if normalized_remarks in interview_date_remarks:
                # Interview Fixed: Update NFD and IFD, clear EJD
                if nfd_date:
                    try:
                        if isinstance(nfd_date, str):
                            self.next_follow_up_date = datetime.strptime(nfd_date, "%Y-%m-%d").date()
                        else:
                            self.next_follow_up_date = nfd_date
                        print(f"DEBUG MODEL: Updated next_follow_up_date for remark '{remarks}': {self.next_follow_up_date}")
                    except (ValueError, TypeError):
                        print(f"DEBUG MODEL: Invalid NFD date format: {nfd_date}")
                elif nfd_date is None or nfd_date == '':
                    # Explicitly clear NFD when null or empty string is provided
                    self.next_follow_up_date = None
                    print(f"DEBUG MODEL: Cleared next_follow_up_date for remark '{remarks}' (nfd_date was None or empty)")
                        
                if ifd_date:
                    try:
                        if isinstance(ifd_date, str):
                            self.interview_date = datetime.strptime(ifd_date, "%Y-%m-%d")
                        else:
                            self.interview_date = ifd_date
                        print(f"DEBUG MODEL: Updated interview_date for remark '{remarks}': {self.interview_date}")
                    except (ValueError, TypeError):
                        print(f"DEBUG MODEL: Invalid IFD date format: {ifd_date}")
                
                # Clear EJD for interview fixed
                self.expected_joining_date = None
                print(f"DEBUG MODEL: Cleared expected_joining_date for remark '{remarks}'")
                        
            elif normalized_remarks in joining_date_remarks:
                # Selected: Update NFD and EJD, clear IFD
                if nfd_date:
                    try:
                        if isinstance(nfd_date, str):
                            self.next_follow_up_date = datetime.strptime(nfd_date, "%Y-%m-%d").date()
                        else:
                            self.next_follow_up_date = nfd_date
                        print(f"DEBUG MODEL: Updated next_follow_up_date for remark '{remarks}': {self.next_follow_up_date}")
                    except (ValueError, TypeError):
                        print(f"DEBUG MODEL: Invalid NFD date format: {nfd_date}")
                elif nfd_date is None or nfd_date == '':
                    # Explicitly clear NFD when null or empty string is provided
                    self.next_follow_up_date = None
                    print(f"DEBUG MODEL: Cleared next_follow_up_date for remark '{remarks}' (nfd_date was None or empty)")
                        
                if ejd_date:
                    try:
                        if isinstance(ejd_date, str):
                            self.expected_joining_date = datetime.strptime(ejd_date, "%Y-%m-%d")
                        else:
                            self.expected_joining_date = ejd_date
                        print(f"DEBUG MODEL: Updated expected_joining_date for remark '{remarks}': {self.expected_joining_date}")
                    except (ValueError, TypeError):
                        print(f"DEBUG MODEL: Invalid EJD date format: {ejd_date}")
                
                # Clear IFD for selected
                self.interview_date = None
                print(f"DEBUG MODEL: Cleared interview_date for remark '{remarks}'")
                        
            else:
                # Other remarks: Update NFD only, clear EJD and IFD
                if nfd_date:
                    try:
                        if isinstance(nfd_date, str):
                            self.next_follow_up_date = datetime.strptime(nfd_date, "%Y-%m-%d").date()
                        else:
                            self.next_follow_up_date = nfd_date
                        print(f"DEBUG MODEL: Updated next_follow_up_date for remark '{remarks}': {self.next_follow_up_date}")
                    except (ValueError, TypeError):
                        print(f"DEBUG MODEL: Invalid NFD date format: {nfd_date}")
                elif nfd_date is None or nfd_date == '':
                    # Explicitly clear NFD when null or empty string is provided
                    self.next_follow_up_date = None
                    print(f"DEBUG MODEL: Cleared next_follow_up_date for remark '{remarks}' (nfd_date was None or empty)")
                
                # Clear EJD and IFD for other remarks
                self.expected_joining_date = None
                self.interview_date = None
                print(f"DEBUG MODEL: Cleared expected_joining_date and interview_date for remark '{remarks}'")
        
        # Update profile submission fields if provided
        if profile_submission is not None:
            # Convert to boolean if it's an integer
            if isinstance(profile_submission, int):
                self.profile_submission = bool(profile_submission)
            else:
                self.profile_submission = profile_submission
            print(f"DEBUG MODEL: Updated profile_submission: {self.profile_submission}")
        
        if profile_submission_date:
            try:
                if isinstance(profile_submission_date, str):
                    self.profile_submission_date = datetime.strptime(profile_submission_date, "%Y-%m-%d").date()
                else:
                    self.profile_submission_date = profile_submission_date
                print(f"DEBUG MODEL: Updated profile_submission_date: {self.profile_submission_date}")
            except (ValueError, TypeError) as e:
                print(f"DEBUG MODEL: Invalid profile_submission_date format: {profile_submission_date}, error: {e}")
        elif profile_submission is not None and not profile_submission:
            # Clear submission date if profile_submission is False/0
            self.profile_submission_date = None
            print(f"DEBUG MODEL: Cleared profile_submission_date")
        
        try:
            # Check if this is a new record (first feedback entry)
            is_new_record = self.pk is None
            
            if is_new_record:
                # For new records, save without triggering auto_now on updated_at
                # We'll save all fields but updated_at won't be set until first actual update
                self.save()
                print(f"DEBUG MODEL: New record saved - created_at set")
            else:
                # For existing records, save normally (updated_at will be updated)
                self.candidate.save(update_fields=['feedback'])
                self.save()
                print(f"DEBUG MODEL: Save successful - Updated fields: remarks={self.remarks}, nfd={self.next_follow_up_date}, ejd={self.expected_joining_date}, ifd={self.interview_date}, profile_submission={self.profile_submission}, profile_submission_date={self.profile_submission_date}")
        except Exception as e:
            print(f"DEBUG MODEL: Save failed: {str(e)}")
            raise
    
    def get_feedback_entries(self):
        """
        Parse feedback field and return list of structured feedback entries
        """
        try:
            if not self.candidate.feedback:
                return []
                
            entries = []
                
            # Safety check for feedback content
            if not isinstance(self.candidate.feedback, str):
                print(f"WARNING: feedback is not a string for ClientJob {self.id}: {type(self.candidate.feedback)}")
                return []
                
            # Try different separators based on the actual data format
            raw_entries = []
                
            # Split by semicolons and identify feedback entries
            import re
            parts = self.candidate.feedback.split(';')
            current_entry = ""
            
            for part in parts:
                try:
                    part = part.strip()
                    if not part:
                        continue
                    
                    # Check if this part starts a new feedback entry
                    if part.startswith('Feedback-') or part.startswith('Feedback'):
                        # Save previous entry if exists
                        if current_entry:
                            raw_entries.append(current_entry.strip())
                        current_entry = part
                    elif part.startswith('Profile assigned from'):
                        # Handle profile assignment entries
                        if current_entry:
                            raw_entries.append(current_entry.strip())
                        raw_entries.append(part.strip())
                        current_entry = ""
                    elif any(part.startswith(status + ':') for status in ['Selected', 'Abscond', 'Rejected', 'Hired', 'Dropped']):
                        # Handle legacy status entries (Selected:, Abscond:, etc.)
                        if current_entry:
                            raw_entries.append(current_entry.strip())
                        raw_entries.append(part.strip())
                        current_entry = ""
                    else:
                        # Continue building current entry or add as standalone
                        if part.startswith(':') and any(keyword in part for keyword in ['NFD-', 'EJD-', 'IFD-', 'CallStatus-', 'Remarks-', 'Entry By-', 'Entry Time']):
                            if current_entry:
                                raw_entries.append(current_entry.strip())
                            current_entry = part
                        elif current_entry and ('NFD-' in part or 'InterviewDate-' in part or 'Remarks-' in part or 'Entry By-' in part or 'Entry Time' in part):
                            # This part belongs to the current feedback entry
                            current_entry += " : " + part
                        elif current_entry:
                            # This might be a continuation or new entry
                            if ':' in part and any(keyword in part for keyword in ['NFD-', 'InterviewDate-', 'Remarks-', 'Entry By-', 'Entry Time']):
                                current_entry += " : " + part
                            else:
                                # Save current and start new
                                raw_entries.append(current_entry.strip())
                                current_entry = part
                        else:
                            # Start new entry
                            current_entry = part
                except Exception as part_error:
                    print(f"WARNING: Error processing feedback part for ClientJob {self.id}: {str(part_error)}")
                    continue
            
            # Don't forget the last entry
            if current_entry:
                raw_entries.append(current_entry.strip())

            # Remove exact duplicate raw entries while preserving original order
            try:
                unique_raw_entries = []
                seen_raw = set()
                for raw in raw_entries:
                    try:
                        key = raw.strip() if isinstance(raw, str) else str(raw).strip()
                    except Exception:
                        key = str(raw).strip()
                    if not key:
                        continue
                    if key in seen_raw:
                        continue
                    seen_raw.add(key)
                    unique_raw_entries.append(raw)
                raw_entries = unique_raw_entries
            except Exception as dedup_error:
                print(f"WARNING: Error de-duplicating feedback entries for ClientJob {self.id}: {str(dedup_error)}")

            for entry in raw_entries:
                try:
                    if entry and entry.strip():
                        parsed = self._parse_feedback_entry(entry.strip())
                        if parsed:
                            entries.append(parsed)
                        else:
                            entries.append({
                                'feedback': entry.strip() if entry else '',
                                'nfd_date': '',
                                'nfd_status': '',
                                'ejd_date': '',
                                'ifd_date': '',
                                'interview_date': '',
                                'remarks': '',
                                'executive_name': '',
                                'profile_created_by': '',
                                'call_status': '',
                                'entry_time': ''
                            })
                except Exception as entry_error:
                    print(f"WARNING: Error parsing feedback entry for ClientJob {self.id}: {str(entry_error)}")
                    # Add basic entry as fallback
                    entries.append({
                        'feedback': entry.strip() if entry else '',
                        'nfd_date': '',
                        'nfd_status': '',
                        'ejd_date': '',
                        'ifd_date': '',
                        'interview_date': '',
                        'remarks': '',
                        'executive_name': '',
                        'profile_created_by': '',
                        'call_status': '',
                        'entry_time': ''
                    })

            # Mark the first stored feedback entry (original order) as profile created
            try:
                if entries and isinstance(entries[0], dict):
                    entries[0]['is_profile_created'] = True
            except Exception as mark_error:
                print(f"WARNING: Error marking profile created entry for ClientJob {self.id}: {str(mark_error)}")
            
            # Sort entries by entry_time (date + time) so newest entries come first (LIFO)
            try:
                from datetime import datetime as _dt
                import re as _re

                def _parse_entry_time(entry_dict):
                    if not isinstance(entry_dict, dict):
                        return _dt.min
                    time_str = entry_dict.get('entry_time')
                    if not time_str or not isinstance(time_str, str):
                        return _dt.min
                    time_str = time_str.strip()

                    match = _re.search(r"(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2})(?::(\d{2})(?::(\d{2}))?)?)?", time_str)
                    if not match:
                        return _dt.min

                    day = int(match.group(1))
                    month = int(match.group(2))
                    year = int(match.group(3))
                    hour = int(match.group(4)) if match.group(4) is not None else 0
                    minute = int(match.group(5)) if match.group(5) is not None else 0
                    second = int(match.group(6)) if match.group(6) is not None else 0

                    try:
                        return _dt(year, month, day, hour, minute, second)
                    except Exception:
                        return _dt.min

                entries.sort(key=_parse_entry_time, reverse=True)

                if entries:
                    # Prefer the entry we already marked as profile created (based on original order)
                    existing_profile_entry = None
                    for e in entries:
                        if isinstance(e, dict) and e.get('is_profile_created'):
                            existing_profile_entry = e
                            break

                    # Reset all flags
                    for e in entries:
                        if isinstance(e, dict):
                            e['is_profile_created'] = False

                    # Re-apply the flag to the preferred entry, or fall back to oldest (last) entry
                    if existing_profile_entry is not None:
                        existing_profile_entry['is_profile_created'] = True
                    else:
                        last_entry = entries[-1]
                        if isinstance(last_entry, dict):
                            last_entry['is_profile_created'] = True
            except Exception as sort_error:
                print(f"WARNING: Error sorting feedback entries for ClientJob {self.id}: {str(sort_error)}")
            
            return entries
            
        except Exception as e:
            print(f"ERROR: Critical error in get_feedback_entries for ClientJob {self.id}: {str(e)}")
            # Return basic fallback
            return [{
                'feedback': str(self.candidate.feedback) if getattr(self.candidate, 'feedback', None) else 'Error parsing feedback',
                'nfd_date': '',
                'nfd_status': '',
                'ejd_date': '',
                'ifd_date': '',
                'interview_date': '',
                'remarks': '',
                'executive_name': '',
                'profile_created_by': '',
                'call_status': '',
                'entry_time': ''
            }]
    
    def _parse_feedback_entry(self, entry):
            """
            Parse individual feedback entry string into structured data
            Supports both new structured format and legacy format
            """
            try:
                parsed = {
                    'feedback': '',
                    'nfd_date': '',
                    'nfd_status': '',
                    'ejd_date': '',
                    'ifd_date': '',
                    'interview_date': '',
                    'remarks': '',
                    'executive_name': '',
                    'profile_created_by': '',
                    'call_status': '',
                    'entry_time': ''
                }
                
                # Safety check for entry content
                if not entry or not isinstance(entry, str):
                    return None
                
                # Handle profile assignment entries
                if entry.startswith('Profile assigned from'):
                    parsed['feedback'] = entry
                    # Try to extract timestamp from the end
                    import re
                    time_match = re.search(r'(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})$', entry)
                    if time_match:
                        parsed['entry_time'] = time_match.group(1)
                    return parsed
                
                # Handle legacy status entries (Selected:, Abscond:, etc.)
                if any(entry.startswith(status + ':') for status in ['Selected', 'Abscond', 'Rejected', 'Hired', 'Dropped']):
                    import re
                    # Format: Status:Message:User:Timestamp
                    parts = entry.split(':')
                    if len(parts) >= 4:
                        parsed['feedback'] = f"{parts[0]}: {parts[1]}"
                        parsed['executive_name'] = parts[2] if len(parts) > 2 else ''
                        parsed['entry_time'] = parts[3] if len(parts) > 3 else ''
                    elif len(parts) >= 3:
                        parsed['feedback'] = f"{parts[0]}: {parts[1]}"
                        parsed['executive_name'] = parts[2]
                    else:
                        parsed['feedback'] = entry
                    return parsed
                
                # Check if it's the new structured format (contains feedback markers, NFD, EJD, etc.)
                if ('Feedback' in entry or entry.startswith(('Feedback', ':')) or 
                    any(x in entry for x in ['NFD-', 'EJD-', 'IFD-', 'CallStatus-', 'Remarks-', 'Entry By-', 'Entry Time'])):
                    import re
                    
                    # Initialize default values
                    feedback_text = ''
                    
                    # Handle entries that start with a colon (e.g., ': NFD-2025-11-21:...')
                    if entry.strip().startswith(':'):
                        # Try to extract any text between the colon and NFD
                        colon_match = re.search(r'^:\s*([^:]*?)(?=NFD-|:|\.\s*:|$)', entry.strip())
                        if colon_match and colon_match.group(1).strip():
                            feedback_text = colon_match.group(1).strip()
                    # Handle Feedback- prefixed entries
                    elif 'Feedback-' in entry:
                        # Try to extract text after Feedback- and before NFD or next field
                        feedback_match = re.search(r'Feedback-(.+?)(?=\s*:\s*NFD-|\s*NFD-|$)', entry)
                        if feedback_match:
                            feedback_text = feedback_match.group(1).strip()
                    # Handle Feedback without hyphen
                    elif entry.startswith('Feedback'):
                        no_hyphen_match = re.search(r'Feedback(.+?)(?=\s*:\s*NFD-|\s*NFD-|$)', entry)
                        if no_hyphen_match:
                            feedback_text = no_hyphen_match.group(1).strip()
                    
                    # Clean up the extracted feedback text
                    if feedback_text:
                        feedback_text = feedback_text.strip(' :.-')
                        if feedback_text.startswith(('-', ':')):
                            feedback_text = feedback_text[1:].strip()
                    
                    # Only set feedback text if we have actual content
                    if feedback_text:
                        parsed['feedback'] = feedback_text
                    
                    # Extract NFD date (handle multiple formats)
                    nfd_match = re.search(r'NFD-([^:;]*?)(?:\s*:\s*|;|$)', entry)
                    if nfd_match:
                        nfd_value = nfd_match.group(1).strip()
                        parsed['nfd_date'] = nfd_value
                        
                        # Check if NFD is past date (expired) or future date
                        try:
                            from datetime import datetime
                            # Clean the date string (remove any non-date characters like "(open profile)")
                            clean_nfd_value = re.sub(r'\s*\([^)]*\)', '', nfd_value).strip()
                            
                            # Try to parse the NFD date with different formats
                            date_formats = [
                                ('%d/%m/%Y', "/"),
                                ('%d-%m-%Y', "-"),
                                ('%Y-%m-%d', "-"),
                                ('%d/%m/%y', "/"),
                                ('%d-%m-%y', "-")
                            ]
                            
                            nfd_date = None
                            for fmt, sep in date_formats:
                                if sep in clean_nfd_value:
                                    try:
                                        nfd_date = datetime.strptime(clean_nfd_value, fmt).date()
                                        break
                                    except ValueError:
                                        continue
                            
                            if nfd_date:
                                current_date = datetime.now().date()
                                if nfd_date < current_date:
                                    parsed['nfd_status'] = "PAST (expired)"
                                elif nfd_date > current_date:
                                    parsed['nfd_status'] = "FUTURE (not expired)"
                                else:
                                    parsed['nfd_status'] = "TODAY"
                            else:
                                parsed['nfd_status'] = "INVALID DATE"
                        except Exception as e:
                            parsed['nfd_status'] = f"ERROR: {str(e)}_FORMAT"
                    
                    # Extract EJD date
                    ejd_match = re.search(r'EJD-([^:]*?)(?:\s*:\s*|:|$)', entry)
                    if ejd_match:
                        parsed['ejd_date'] = ejd_match.group(1).strip()
                    
                    # Extract IFD date
                    ifd_match = re.search(r'IFD-([^:]*?)(?:\s*:\s*|:|$)', entry)
                    if ifd_match:
                        parsed['ifd_date'] = ifd_match.group(1).strip()
                    
                    # Extract InterviewDate
                    interview_match = re.search(r'InterviewDate-([^:]*?)(?:\s*:\s*|:|$)', entry)
                    if interview_match:
                        parsed['interview_date'] = interview_match.group(1).strip()
                    
                    # Extract call status
                    call_status_match = re.search(r'CallStatus-([^:]*?)(?:\s*:\s*|:|$)', entry)
                    if call_status_match:
                        parsed['call_status'] = call_status_match.group(1).strip()
                    
                    # Extract remarks (handle both formats)
                    remarks_match = re.search(r'Remarks-([^:]*?)(?:\s*:\s*Entry By-|:Entry By-|$)', entry)
                    if remarks_match:
                        parsed['remarks'] = remarks_match.group(1).strip()
                    
                    # Extract entry by (executive name) - handle both formats
                    entry_by_match = re.search(r'Entry By-([^:]*?)(?:\s*:\s*Entry Time|:Entry Time|$)', entry)
                    if entry_by_match:
                        parsed['executive_name'] = entry_by_match.group(1).strip()

                    # Extract profile created by (if present)
                    profile_created_match = re.search(r'Profile Created By-([^:]*?)(?:\s*:\s*Entry Time|:Entry Time|$)', entry)
                    if profile_created_match:
                        parsed['profile_created_by'] = profile_created_match.group(1).strip()
                        # If no explicit Entry By, use profile created by as executive_name
                        if not parsed['executive_name']:
                            parsed['executive_name'] = parsed['profile_created_by']

                    # Extract entry time (handle multiple formats)
                    # Stop at first semicolon to avoid capturing next entry
                    entry_time_match = re.search(r'Entry Time\s*:?\s*(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})', entry)
                    if entry_time_match:
                        parsed['entry_time'] = entry_time_match.group(1).strip()
                    else:
                        # Fallback: try to capture until semicolon but only the datetime part
                        fallback_match = re.search(r'Entry Time\s*:?\s*([^;:]+?)(?:;|$)', entry)
                        if fallback_match:
                            time_str = fallback_match.group(1).strip()
                            # Only keep if it looks like a datetime (contains digits and hyphens/colons)
                            if re.match(r'\d{2}-\d{2}-\d{4}', time_str):
                                parsed['entry_time'] = time_str
                    
                else:
                    # Legacy format: {text}:{user}:{timestamp}
                    parts = entry.split(':')
                    if len(parts) >= 3:
                        parsed['feedback'] = parts[0].strip()
                        parsed['executive_name'] = parts[1].strip()
                        # Join remaining parts back to reconstruct full timestamp (e.g. "27-03-2024 12:43:39")
                        legacy_time = ':'.join(parts[2:]).strip()
                        parsed['entry_time'] = legacy_time
                    elif len(parts) == 2:
                        parsed['feedback'] = parts[0].strip()
                        parsed['executive_name'] = parts[1].strip()
                    else:
                        parsed['feedback'] = entry.strip()
                
                return parsed
            except Exception as e:
                # Return basic parsing as fallback
                return {
                    'feedback': entry.strip(),
                    'nfd_date': '',
                    'nfd_status': '',
                    'ejd_date': '',
                    'ifd_date': '',
                    'interview_date': '',
                    'remarks': '',
                    'executive_name': '',
                    'profile_created_by': '',
                    'call_status': '',
                    'entry_time': ''
                }



    def check_and_update_expired_nfd(self):
        """
        Enhanced NFD Auto-Update Logic:
        1. Check if ClientJob NFD is expired (past date)
        2. Update ALL expired NFDs in feedback entries (regardless of ClientJob NFD matching)
        3. Preserve non-expired NFDs and entries already marked as "(open profile)"
        4. Update latest feedback entry first, then older entries with expired NFDs
        """
        from datetime import datetime, timedelta
        from django.utils import timezone
        import re
        
        current_datetime = timezone.now()
        updated_any = False
        
        print(f"NFD AUTO-UPDATE CHECK for ClientJob {self.id}:")
        
        # 1. Check if ClientJob NFD is expired
        clientjob_nfd_expired = False
        if self.next_follow_up_date:
            try:
                if self._check_and_update_single_nfd(self.next_follow_up_date, current_datetime, "ClientJob NFD"):
                    clientjob_nfd_expired = True
                    updated_any = True
                    print(f"  ClientJob NFD is EXPIRED")
            except (ValueError, TypeError, AttributeError):
                pass
        
        # 2. ENHANCED: Update ALL expired NFDs in feedback entries (stored on candidate.feedback)
        candidate_feedback = getattr(self.candidate, 'feedback', None)
        if candidate_feedback:
            feedback_updated = self._update_all_expired_feedback_nfds(current_datetime)
            if feedback_updated:
                updated_any = True
        
        return updated_any

    def _check_and_update_single_nfd(self, nfd_value, current_datetime, source_label):
        """
        Check and update a single NFD date
        """
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        try:
            # Parse NFD date
            if isinstance(nfd_value, str):
                # Skip if already marked as expired
                if "(open profile)" in str(nfd_value):
                    return False
                    
                # Parse string date
                nfd_str = str(nfd_value)
                if "-" in nfd_str:
                    if len(nfd_str.split("-")[0]) == 4:  # YYYY-MM-DD format
                        nfd_date = datetime.strptime(nfd_str, '%Y-%m-%d').date()
                    else:  # DD-MM-YYYY format  
                        nfd_date = datetime.strptime(nfd_str, '%d-%m-%Y').date()
                else:
                    return False
            elif hasattr(nfd_value, 'date'):
                nfd_date = nfd_value.date()
            else:
                nfd_date = nfd_value
        except (ValueError, TypeError, AttributeError) as e:
            print(f"  Error parsing {source_label}: {nfd_value} - {str(e)}")
            return False
        
        # Calculate expiry: NFD date + 1 day at 12:00 AM
        expiry_datetime = timezone.make_aware(
            datetime.combine(nfd_date + timedelta(days=1), datetime.min.time())
        )
        
        is_expired = current_datetime >= expiry_datetime
        
        
        
        return is_expired

    def _update_all_expired_feedback_nfds(self, current_datetime):
        """
        Update ONLY the LATEST expired NFD in feedback entries
        - Finds the latest feedback entry with NFD date
        - Updates it to show (open profile) if expired
        - Preserves all other entries unchanged
        - Only processes the most recent entry
        """
        import re
        from datetime import datetime

        # All structured feedback text is stored on the related Candidate instance
        candidate_feedback = getattr(self.candidate, 'feedback', None)
        if not candidate_feedback:
            return False
            
        print(f"  Searching for LATEST expired NFD in feedback entries")
        
        # Split feedback into entries (separated by semicolons)
        feedback_entries = [entry.strip() for entry in candidate_feedback.split(';') if entry.strip()]
        
        if not feedback_entries:
            return False
        
        # NFD patterns to search for
        nfd_patterns = [
            r'NFD-(\d{4}-\d{2}-\d{2})',         # NFD-YYYY-MM-DD (actual format)
            r'\(NFD:\s*(\d{2}/\d{2}/\d{4})\)',  # (NFD: DD/MM/YYYY)
            r'\(NFD:\s*(\d{2}-\d{2}-\d{4})\)',  # (NFD: DD-MM-YYYY)
            r'NFD:\s*(\d{2}/\d{2}/\d{4})',      # NFD: DD/MM/YYYY
            r'NFD:\s*(\d{2}-\d{2}-\d{4})',      # NFD: DD-MM-YYYY
        ]
        
        feedback_updated = False
        current_date = current_datetime.date()
        
        # Check ONLY the LATEST feedback entry for expired NFD
        # Process entries in reverse order (latest first)
        for i in range(len(feedback_entries) - 1, -1, -1):
            entry = feedback_entries[i]
            # Skip if this entry already has "(open profile)"
            if "(open profile)" in entry:
                print(f"  Entry {i+1} already has (open profile), skipping")
                continue
            
            entry_updated = False
            updated_entry = entry
            
            # Search for NFD patterns in this entry
            for pattern in nfd_patterns:
                matches = re.findall(pattern, entry)
                
                for nfd_str in matches:
                    try:
                        # Parse the found NFD date
                        if "/" in nfd_str:  # DD/MM/YYYY format
                            feedback_nfd_date = datetime.strptime(nfd_str, '%d/%m/%Y').date()
                        elif len(nfd_str.split("-")[0]) == 4:  # YYYY-MM-DD format
                            feedback_nfd_date = datetime.strptime(nfd_str, '%Y-%m-%d').date()
                        else:  # DD-MM-YYYY format
                            feedback_nfd_date = datetime.strptime(nfd_str, '%d-%m-%Y').date()
                        
                        # Check if this NFD is expired
                        if feedback_nfd_date < current_date:
                            nfd_status = "PAST (expired)"
                            print(f"  Entry {i+1} NFD {feedback_nfd_date} is EXPIRED - updating")
                            
                            # Update this NFD to show (open profile)
                            expired_display = f"{nfd_str} (open profile)"
                            
                            # Replace in this entry - handle different formats
                            updated_entry = updated_entry.replace(f"NFD-{nfd_str}", f"NFD-{expired_display}")  # NFD-YYYY-MM-DD
                            updated_entry = updated_entry.replace(f"(NFD: {nfd_str})", f"(NFD: {expired_display})")  # (NFD: DD/MM/YYYY)
                            updated_entry = updated_entry.replace(f"NFD: {nfd_str}", f"NFD: {expired_display}")  # NFD: DD/MM/YYYY
                            
                            entry_updated = True
                            feedback_updated = True
                            print(f"  Updated Entry {i+1}: {nfd_str} -> {expired_display}")
                            break  # Only update first NFD per entry
                            
                        elif feedback_nfd_date >= current_date:
                            nfd_status = "FUTURE/TODAY (not expired)"
                            print(f"  Entry {i+1} NFD {feedback_nfd_date} is {nfd_status} - preserving")
                            
                    except (ValueError, TypeError):
                        continue
                
                if entry_updated:
                    break  # Stop after first successful update per entry
            
            # Update this entry in the list
            feedback_entries[i] = updated_entry
            
            # IMPORTANT: Stop after processing the first entry with NFD (latest entry)
            # This ensures only the latest NFD is checked, not all entries
            break
        
        # Save updated feedback on the Candidate if any changes were made
        if feedback_updated:
            self.candidate.feedback = ';'.join(feedback_entries)
            self.candidate.save(update_fields=['feedback'])
            print(f"  Saved updated feedback with LATEST expired NFD marked as (open profile)")
        else:
            print(f"  No expired NFD found in latest feedback entry")
        
        return feedback_updated

    # Class-level cache for NFD updates
    _last_nfd_update = None
    _nfd_update_interval = 30 * 60  # 30 minutes in seconds
    
    @classmethod
    def update_all_expired_nfd_jobs(cls):
        """
        Ultra-fast bulk update method for expired NFD jobs with caching
        Uses raw SQL for maximum performance and prevents frequent updates
        Returns count of updated jobs
        """
        from datetime import timedelta
        from django.utils import timezone
        from django.db import connection
        import time
        
        # Check if we've updated recently (cache mechanism)
        current_time = time.time()
        if (cls._last_nfd_update and 
            current_time - cls._last_nfd_update < cls._nfd_update_interval):
            print(f" NFD AUTO-UPDATE: Skipping update (last update was {int((current_time - cls._last_nfd_update) / 60)} minutes ago)")
            return 0
        
        # Use common NFD expiry threshold from views
        # Import here to avoid circular dependency
        from candidate.views import get_nfd_expiry_threshold
        expiry_cutoff = get_nfd_expiry_threshold()
        
        print(f" NFD AUTO-UPDATE: Starting bulk update (cutoff: {expiry_cutoff})")
        
        # Use raw SQL for maximum performance - bulk update in single query
        with connection.cursor() as cursor:
            # First, count how many records will be updated
            count_sql = """
                SELECT COUNT(*) FROM candidate_clientjob 
                WHERE next_follow_up_date IS NOT NULL 
                AND next_follow_up_date < %s 
                AND assign_to IS NOT NULL
            """
            cursor.execute(count_sql, [expiry_cutoff])
            total_found = cursor.fetchone()[0]
            
            print(f" NFD AUTO-UPDATE: Found {total_found} expired jobs to update")
            
            if total_found == 0:
                cls._last_nfd_update = current_time  # Update cache even if no records
                return 0
            
            # Bulk update all expired jobs - mark assign_to as NULL only
            # Keep remarks and NFD date for frontend display
            update_sql = """
                UPDATE candidate_clientjob 
                SET 
                    assign_to = NULL
                WHERE next_follow_up_date IS NOT NULL 
                AND next_follow_up_date < %s 
                AND assign_to IS NOT NULL
            """
            
            # Execute bulk update
            cursor.execute(update_sql, [expiry_cutoff])
            updated_count = cursor.rowcount
        
        # Update cache
        cls._last_nfd_update = current_time
        
        print(f" NFD AUTO-UPDATE: Bulk updated {updated_count} expired NFD jobs in single query")
        return updated_count
    
    @classmethod
    def force_update_expired_nfd_jobs(cls):
        """
        Force update expired NFD jobs bypassing cache
        Use this for manual/admin triggers
        """
        cls._last_nfd_update = None  # Clear cache
        return cls.update_all_expired_nfd_jobs()
    
    def _is_nfd_expired_simple(self, current_date):
        """
        Fast NFD expiry check without verbose logging
        """
        try:
            if isinstance(self.next_follow_up_date, str):
                nfd_date = datetime.strptime(self.next_follow_up_date, '%Y-%m-%d').date()
            elif hasattr(self.next_follow_up_date, 'date'):
                nfd_date = self.next_follow_up_date.date()
            else:
                nfd_date = self.next_follow_up_date
            
            # NFD expires after: NFD date + 1 day grace period
            nfd_expiry_date = nfd_date + timedelta(days=1)
            return current_date > nfd_expiry_date
        except:
            return False

    def is_nfd_expired(self):
        """
        Check if NFD has expired without modifying database
        Returns True if NFD date has passed the expiry threshold
        """
        if not self.next_follow_up_date:
            return False
            
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        try:
            # Parse NFD date
            if isinstance(self.next_follow_up_date, str):
                # Skip if already contains "(open profile)"
                if "(open profile)" in str(self.next_follow_up_date):
                    return True
                return False
            elif hasattr(self.next_follow_up_date, 'date'):
                nfd_date = self.next_follow_up_date.date()
            else:
                nfd_date = self.next_follow_up_date
                
            # Calculate expiry datetime
            expiry_datetime = timezone.make_aware(
                datetime.combine(nfd_date + timedelta(days=1), datetime.min.time())
            )
            
            return timezone.now() >= expiry_datetime
            
        except (ValueError, TypeError, AttributeError):
            return False

    def get_nfd_display(self):
        """
        Get NFD display string with (open profile) indicator if expired
        """
        if not self.next_follow_up_date:
            return None
            
        if isinstance(self.next_follow_up_date, str):
            return self.next_follow_up_date  # Already formatted
            
        nfd_str = self.next_follow_up_date.strftime('%d-%m-%Y')
        
        if self.is_nfd_expired():
            return f"{nfd_str} (open profile)"
        else:
            return nfd_str
    
    def _update_expired_nfd_fast(self, current_datetime):
        """
        Fast NFD update without verbose logging
        """
        try:
            # Check if already updated on candidate.feedback
            candidate_feedback = getattr(self.candidate, 'feedback', None)
            if candidate_feedback and 'Auto updated to open profile due to expired NFD' in candidate_feedback:
                return False
            
            # Store original data
            original_remarks = self.remarks or ""
            original_nfd = self.next_follow_up_date
            
            # Update to open profile
            self.remarks = 'open profile'
            
            # Create minimal feedback entry
            entry_time = (current_datetime + timedelta(seconds=1)).strftime("%d-%m-%Y %H:%M:%S")
            original_nfd_str = original_nfd.strftime('%d-%m-%Y') if original_nfd else ""
            
            self.add_feedback(
                feedback_text=f"Auto updated to open profile due to expired NFD (Original: {original_remarks})",
                remarks="open profile",
                nfd_date=None,
                entry_by="System Auto-Update",
                entry_time=entry_time,
                call_status="system auto update"
            )
            
            # Clear expired NFD
            self.next_follow_up_date = None
            self.save()
            
            return True
        except Exception as e:
            print(f" Fast update failed for job {self.id}: {str(e)}")
            return False

    def is_assignable(self):
        """
        Check if this client job is assignable
        A job is assignable if:
        1. Remarks are 'open profile', OR
        2. NFD has expired, OR
        3. NFD is null/empty (no follow-up date means assignable)
        """
        # Check if remarks are explicitly 'open profile'
        if self.remarks and self.remarks.lower() == 'open profile':
            return True
            
        # Check if NFD is null/empty (no follow-up date means assignable)
        if not self.next_follow_up_date:
            return True
            
        # Check if NFD has expired
        if self.is_nfd_expired():
            return True
            
        return False

    def clone_candidate_for_new_client(self, new_client_name, new_designation, new_executive_name, created_by="System"):
        """
        Clone the candidate for a new client assignment.
        Creates a new candidate record with new profile number and new client job.
        This allows independent tracking of follow-ups for different clients.
        """
        from datetime import datetime
        import uuid
        
        # Generate new profile number
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = str(uuid.uuid4())[:8]
        new_profile_number = f"PROF_{timestamp}_{random_suffix}"
        
        # Clone candidate with new profile number
        new_candidate = Candidate.objects.create(
            profile_number=new_profile_number,
            executive_name=new_executive_name,
            candidate_name=self.candidate.candidate_name,
            mobile1=self.candidate.mobile1,
            mobile2=self.candidate.mobile2,
            email=self.candidate.email,
            gender=self.candidate.gender,
            dob=self.candidate.dob,
            country=self.candidate.country,
            state=self.candidate.state,
            city=self.candidate.city,
            pincode=self.candidate.pincode,
            education=self.candidate.education,
            experience=self.candidate.experience,
            source=self.candidate.source,
            communication=self.candidate.communication,
            languages=self.candidate.languages,
            skills=self.candidate.skills,
            # Note: Do not copy resume files or parsed data - each client gets fresh tracking
            created_by=created_by,
            updated_by=created_by
        )
        
        # Create new client job for the cloned candidate with CTC copied from original
        new_client_job = ClientJob.objects.create(
            candidate=new_candidate,
            client_name=new_client_name,
            designation=new_designation,
            remarks="new profile",  # Start with fresh status
            current_ctc=self.current_ctc,  # Copy current CTC from original ClientJob
            expected_ctc=self.expected_ctc,  # Copy expected CTC from original ClientJob
            created_by=created_by,
            updated_by=created_by
        )
        
        # # Add initial feedback entry
        # new_client_job.add_feedback(
        #     feedback_text=f"Profile cloned from existing candidate for new client {new_client_name}",
        #     remarks="new profile",
        #     entry_by=created_by,
        #     call_status="profile creation"
        # )
        
        print(f" Cloned candidate {self.candidate.candidate_name} for client {new_client_name}")
        print(f" New profile number: {new_profile_number}")
        
        return new_candidate, new_client_job

    def mark_as_open_profile(self, reason="expired_nfd", actor="System"):
        """
        Mark this client job as open profile (unassigned)
        Used when NFD expires or manual intervention is needed
        """
        from datetime import datetime
        
        # Store original assignment info
        original_assign_to = self.assign_to
        original_assign_by = self.assign_by
        
        # Clear assignment fields
        self.assign_to = None
        self.assign_by = None
        self.remarks = "open profile"
        # Don't manually set updated_by - let AuditFields handle it automatically
        
        # Add feedback entry for the status change
        entry_time = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        feedback_text = f"Profile marked as open - Reason: {reason}"
        if original_assign_to:
            feedback_text += f" (Previously assigned to: {original_assign_to})"
            
        self.add_feedback(
            feedback_text=feedback_text,
            remarks="open profile",
            entry_by=actor,
            entry_time=entry_time,
            call_status="status change"
        )
        
        self.save()
        print(f" Marked ClientJob {self.id} as open profile - Reason: {reason}")

    def claim_open_job(self, claiming_user, claiming_user_name=""):
        """
        Atomically claim an open profile job
        Prevents race conditions when multiple executives try to claim the same job
        """
        from django.db import transaction
        from datetime import datetime
        
        with transaction.atomic():
            # Use select_for_update to prevent race conditions
            job = ClientJob.objects.select_for_update().get(pk=self.pk)
            
            # Check if job is still available for claiming
            if job.assign_to is not None:
                raise ValueError(f"Job {self.id} is already assigned to {job.assign_to}")
                
            if job.remarks and job.remarks.lower() != 'open profile':
                # Check if NFD has expired (making it claimable)
                if not job.is_assignable():
                    raise ValueError(f"Job {self.id} is not available for claiming (Status: {job.remarks})")
            
            # Claim the job
            job.assign_to = claiming_user
            job.assign_by = claiming_user  # Self-assignment when claiming
            job.remarks = "assigned"  # Change from open profile to assigned
            # Don't manually set updated_by - let AuditFields handle it automatically
            # Set employee_id to employee code (e.g., Emp/00100)
            job.employee_id = claiming_user
            
            # Add feedback entry for the claim
            entry_time = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
            job.add_feedback(
                feedback_text=f"Open profile claimed by {claiming_user_name or claiming_user}",
                remarks="assigned",
                entry_by=claiming_user_name or claiming_user,
                entry_time=entry_time,
                call_status="assignment"
            )
            
            job.save()
            print(f" Job {self.id} claimed by {claiming_user}")
            
            return job

    @classmethod
    def mark_all_expired_jobs_open(cls):
        """
        Mark all expired NFD jobs as open profile
        This should be run periodically (e.g., daily cron job)
        """
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        current_datetime = timezone.now()
        
        # Find jobs with expired NFD that are still assigned
        expired_jobs = cls.objects.filter(
            next_follow_up_date__isnull=False,
            assign_to__isnull=False  # Only process assigned jobs
        )
        
        updated_count = 0
        for job in expired_jobs:
            # Check if NFD has expired using the same logic as is_assignable
            nfd_datetime = timezone.make_aware(
                datetime.combine(job.next_follow_up_date, datetime.min.time())
            )
            expiry_threshold = nfd_datetime + timedelta(days=1, hours=12, minutes=1)
            
            if current_datetime >= expiry_threshold:
                job.mark_as_open_profile(reason="expired_nfd", actor="System Auto-Update")
                updated_count += 1
                
        print(f" Marked {updated_count} expired jobs as open profile")
        return updated_count

    # class Meta:
    #     indexes = [
            # models.Index(fields=['next_follow_up_date'], name='clientjob_nfd_idx'),
            # models.Index(fields=['expected_joining_date'], name='clientjob_ejd_idx'),
    #     ]
    
    
    class Meta:
        ordering = ['-updated_at']  # Default ordering: newest first (LIFO)
        indexes = [
            models.Index(fields=['candidate', 'remarks'], name='clientjob_cand_remark_idx'),
            models.Index(fields=['remarks'], name='clientjob_remarks_idx'),
            models.Index(fields=['client_name'], name='clientjob_client_idx'),
            models.Index(fields=['-updated_at'], name='clientjob_updated_at_idx'),
            models.Index(fields=['candidate', '-updated_at'], name='clientjob_cand_updated_idx'),
            models.Index(fields=['next_follow_up_date'], name='clientjob_nfd_idx'),
            models.Index(fields=['expected_joining_date'], name='clientjob_ejd_idx'),
        ]

    def __str__(self):
        return f"{self.client_name} - {self.designation}"


# -----------------------------
# Job Assignment History Tracking
# -----------------------------
class JobAssignmentHistory(AuditFields):
    """
    Track all assignment transitions for audit trail
    Records who assigned what to whom and when
    """
    client_job = models.ForeignKey(ClientJob, on_delete=models.CASCADE, related_name="assignment_history")
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="assignment_history")
    
    # Assignment details
    previous_owner = models.CharField(max_length=100, null=True, blank=True)  # Who had it before
    new_owner = models.CharField(max_length=100, null=True, blank=True)      # Who has it now
    assigned_by = models.CharField(max_length=100, null=True, blank=True)    # Who made the assignment
    
    # Reason and context
    reason = models.CharField(max_length=50, choices=[
        ('initial_assignment', 'Initial Assignment'),
        ('manual_reassignment', 'Manual Reassignment'),
        ('expired_nfd', 'NFD Expired - Auto Open'),
        ('claimed_open_job', 'Claimed Open Job'),
        ('manager_override', 'Manager Override'),
    ], default='manual_reassignment')
    
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.candidate.candidate_name}: {self.previous_owner} -> {self.new_owner} ({self.reason})"


# -----------------------------
# Step 3 - Education Certificates
# -----------------------------
class EducationCertificate(AuditFields):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="education_certificates")
    type = models.CharField(max_length=50)  # 10th, 12th, Diploma, UG, PG
    has_certificate = models.BooleanField(default=None, null=True, blank=True)
    reason = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.type} for {self.candidate}"


class ExperienceCompany(AuditFields):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="experience_companies")

    offer_letter = models.BooleanField(default=None, null=True, blank=True)
    offer_letter_reason = models.CharField(max_length=255, blank=True, null=True)

    payslip = models.BooleanField(default=None, null=True, blank=True)
    payslip_reason = models.CharField(max_length=255, blank=True, null=True)

    relieving_letter = models.BooleanField(default=None, null=True, blank=True)
    relieving_letter_reason = models.CharField(max_length=255, blank=True, null=True)

    notice_period = models.CharField(max_length=50, blank=True, null=True)

    incentives = models.BooleanField(default=None, null=True, blank=True)
    incentive_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    incentive_proof = models.BooleanField(default=None, null=True, blank=True)
    incentive_proof_reason = models.CharField(max_length=255, blank=True, null=True)

    more_than_15_months = models.BooleanField(default=None, null=True, blank=True)

    first_salary = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    current_salary = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return f"Experience for {self.candidate}"


class PreviousCompany(AuditFields):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="previous_companies")
    experience_company = models.ForeignKey(ExperienceCompany, on_delete=models.CASCADE, related_name="previous_companies")

    offer_letter = models.BooleanField(default=None, null=True, blank=True)
    offer_letter_reason = models.CharField(max_length=255, blank=True, null=True)

    payslip = models.BooleanField(default=None, null=True, blank=True)
    payslip_reason = models.CharField(max_length=255, blank=True, null=True)

    relieving_letter = models.BooleanField(default=None, null=True, blank=True)
    relieving_letter_reason = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Previous Company for {self.candidate}"

# -----------------------------
# Step 3 - Additional Info
# -----------------------------
class AdditionalInfo(AuditFields):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="additional_info")

    has_two_wheeler = models.BooleanField(default=None, null=True, blank=True)
    two_wheeler_license = models.BooleanField(default=None, null=True, blank=True)
    license_expected_date = models.CharField(max_length=100, blank=True, null=True)
    has_laptop = models.BooleanField(default=None, null=True, blank=True)

    def __str__(self):
        return f"Additional info for {self.candidate}"

# -----------------------------
# Step 4 - Candidate Feedback
# -----------------------------
# class CandidateFeedback(AuditFields):
#     candidate = models.ForeignKey(
#         Candidate,
#         on_delete=models.CASCADE,
#         related_name="feedbacks"
#     )
#     client_job = models.ForeignKey(
#         'ClientJob',
#         on_delete=models.CASCADE,
#         related_name="feedbacks",
#         null=True,
#         blank=True
#     )
#     feedback_text = models.TextField(blank=True, null=True)
   

#     def __str__(self):
#         return f"Feedback for {self.candidate.candidate_name} ({self.candidate.profile_number})"

class CandidateRevenue(AuditFields):
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name="revenues"
    )
    client_job = models.ForeignKey(
        'ClientJob',
        on_delete=models.CASCADE,
        related_name='revenue_records',
        null=True,
        blank=True,
        help_text='The client job this revenue record is associated with'
    )
    joining_date = models.DateField(default=None, null=True, blank=True)
    accountable_ctc = models.CharField(max_length=50, default=None, null=True, blank=True)
    offer_ctc = models.CharField(max_length=50, default=None, null=True, blank=True)
    percentage = models.CharField(max_length=50, default=None, null=True, blank=True)
    amount = models.CharField(max_length=50, default=None, null=True, blank=True)
    revenue = models.CharField(max_length=50, default=None, null=True, blank=True)
    revenue_status = models.CharField(default=None, null=True, blank=True ,max_length=50)
    itbr_date = models.DateField(default=None, null=True, blank=True)
    erd_date = models.DateField(default=None, null=True, blank=True)
    br_date = models.DateField(default=None, null=True, blank=True)
    invoice_file = models.FileField(upload_to="invoices/", null=True, blank=True)
    invoice_number = models.CharField(default=None, null=True, blank=True,max_length=50)   # changed to CharField
    is_deleted = models.BooleanField(default=False)
    change_history = models.TextField(null=True, blank=True)

    def clean(self):
        super().clean()

        has_percentage = self.percentage is not None
        has_amount = self.amount is not None

        # Forbid having both values at the same time; allow both empty/None
        if has_percentage and has_amount:
            raise ValidationError("Fill either percentage OR amount, not both.")
    
    def save(self, *args, **kwargs):
        # Append history when tracked fields change on update
        if self.pk is not None:
            try:
                old = CandidateRevenue.objects.get(pk=self.pk)
            except CandidateRevenue.DoesNotExist:
                old = None

            if old is not None:
                tracked_fields = [
                    ("accountable_ctc", "Accountable CTC"),
                    ("offer_ctc", "Offer CTC"),
                    ("percentage", "Percentage"),
                    ("amount", "Amount"),
                    ("revenue", "Revenue"),
                ]

                changes = []
                for field_name, label in tracked_fields:
                    old_val = getattr(old, field_name)
                    new_val = getattr(self, field_name)
                    if old_val != new_val:
                        changes.append(f"{label}: {old_val} -> {new_val}")

                if changes:
                    timestamp = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
                    entry = f"[{timestamp}] " + " | ".join(changes)

                    if self.change_history:
                        self.change_history = f"{self.change_history}\n{entry}"
                    else:
                        self.change_history = entry

        super().save(*args, **kwargs)
    
    class Meta:
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
            models.Index(fields=["joining_date"]),
            models.Index(fields=["candidate"]),
            models.Index(fields=["client_job"]),
        ]

    def __str__(self):
        return f"Revenue for {self.candidate.candidate_name} ({self.candidate.profile_number})"

class CandidateRevenueFeedback(AuditFields):
    candidate_revenue = models.ForeignKey(
        CandidateRevenue,
        on_delete=models.CASCADE,
        related_name="feedbacks"
    )
    
    feedback = models.TextField()
    
    def __str__(self):
        return f"Feedback for {self.candidate_revenue.candidate.candidate_name} ({self.candidate_revenue.candidate.profile_number})"


# -----------------------------
# Utility Functions for Audit Fields
# -----------------------------
def get_user_info_from_request(request):
    """
    Extract user information (employee code) from request
    This can be used when saving models to track who created/updated the record
    
    Usage in views:
        user_info = get_user_info_from_request(request)
        instance.save(user_info=user_info)
    
    Returns:
        str: Employee code or username
    """
    try:
        # Try to get from request.user (if using Django authentication)
        if hasattr(request, 'user') and request.user.is_authenticated:
            # If user has employee code, use it
            if hasattr(request.user, 'employee_code'):
                return request.user.employee_code
            # Otherwise use username
            return request.user.username
        
        # Try to get from request headers (if using custom auth)
        if hasattr(request, 'META'):
            user_code = request.META.get('HTTP_X_USER_CODE')
            if user_code:
                return user_code
        
        # Try to get from request data
        if hasattr(request, 'data'):
            user_code = request.data.get('user_code') or request.data.get('employee_code')
            if user_code:
                return user_code
        
        return None
    except Exception as e:
        print(f"Error getting user info from request: {str(e)}")
        return None


# -----------------------------
# Candidate Status History Model
# -----------------------------
class CandidateStatusHistory(models.Model):
    """
    Track all status changes for candidates with calendar system support
    """
    attend_flag = models.BooleanField(default=False, help_text="Attendance flag for the status change")
    candidate_id = models.IntegerField(help_text="Reference to candidate ID")
    client_job_id = models.IntegerField(blank=True, null=True, help_text="Reference to client job ID")
    vendor_id = models.IntegerField(blank=True, null=True, help_text="Reference to vendor/client ID")
    client_name = models.CharField(max_length=200, blank=True, null=True, help_text="Client/Vendor name for reference")
    remarks = models.CharField(max_length=100, help_text="Status/remark value (interested, selected, etc.)")
    profile_submission = models.IntegerField(blank=True, null=True, help_text="Profile submission status (1=Yes, 0=No)")
    extra_notes = models.TextField(blank=True, null=True, help_text="Additional notes if needed")
    change_date = models.DateField(help_text="Date when this status change occurred")
    created_by = models.CharField(max_length=50, help_text="Employee code who made this change")
    branch_id = models.IntegerField(blank=True, null=True)
    team_id = models.IntegerField(blank=True, null=True)
    employee_id = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, help_text="Exact timestamp when record was created")
    

    class Meta:
        db_table = 'candidate_status_history'
        indexes = [
            models.Index(fields=['candidate_id'], name='idx_candidate'),
            models.Index(fields=['client_job_id'], name='idx_client_job'),
            models.Index(fields=['vendor_id'], name='idx_vendor'),
            models.Index(fields=['change_date', 'remarks'], name='idx_date_remarks'),
            models.Index(fields=['created_by'], name='idx_created_by'),
            models.Index(fields=['client_name'], name='idx_client_name'),
            models.Index(fields=['attend_flag'], name='idx_attend_flag'),
            models.Index(fields=['profile_submission'], name='idx_profile_submission'),
        ]
        ordering = ['-change_date', '-created_at']

    def __str__(self):
        return f"Candidate {self.candidate_id} - {self.remarks} on {self.change_date}"

    def get_candidate(self):
        """Get the related candidate object"""
        try:
            return Candidate.objects.get(id=self.candidate_id)
        except Candidate.DoesNotExist:
            return None

    def get_created_by_name(self):
        """Get full name of the person who created this record"""
        if not self.created_by:
            return None
        
        try:
            from empreg.models import Employee
            employee = Employee.objects.get(employeeCode=self.created_by, del_state=0)
            full_name = f"{employee.firstName} {employee.lastName}".strip()
            return full_name if full_name else employee.firstName
        except Exception:
            return self.created_by

    
    # @classmethod
    # def create_status_entry(cls, candidate_id, remarks, change_date, created_by, extra_notes=None,
    #                     client_job_id=None, vendor_id=None, client_name=None, profile_submission=None, attend_flag=None,
    #                     branch_id=None, team_id=None, employee_id=None):
    #     """
    #     Create a new status history entry if it doesn't already exist
        
    #     Args:
    #         candidate_id: ID of the candidate
    #         remarks: Status/remark (interested, selected, etc.)
    #         change_date: Date when status changed (YYYY-MM-DD format)
    #         created_by: Employee code who made the change
    #         extra_notes: Optional additional notes
    #         client_job_id: Optional client job ID
    #         vendor_id: Optional vendor/client ID
    #         client_name: Optional client/vendor name
    #         profile_submission: Optional profile submission status (1=Yes, 0=No)
    #         attend_flag: Optional attendance flag for this status (True/False)
    #     """
    #     try:
    #         if not change_date:
    #             change_date = timezone.now().date()
    #         if isinstance(change_date, str):
    #             try:
    #                 change_date = datetime.strptime(change_date, "%Y-%m-%d").date()
    #             except Exception:
    #                 pass
    #         if attend_flag is None:
    #             attend_flag = False
    #         if profile_submission is not None:
    #             try:
    #                 profile_submission = 1 if int(profile_submission) == 1 else 0
    #             except Exception:
    #                 profile_submission = None
    #         if remarks and remarks.strip().lower() == "interested":
    #             exists = cls.objects.filter(
    #                 candidate_id=candidate_id,
    #                 remarks="Interested",
    #                 change_date=change_date
    #             ).exists()
    #             if exists:
    #                 print(f" 'Interested' status already exists for candidate {candidate_id} on {change_date}")
    #                 return None

    #         # For non profile-submission entries, avoid creating exact duplicates
    #         if profile_submission != 1:
    #             existing_entry = cls.objects.filter(
    #                 candidate_id=candidate_id,
    #                 remarks=remarks,
    #                 client_job_id=client_job_id,
    #                 change_date=change_date
    #             ).first()
                
    #             if existing_entry:
    #                 print(f"Status entry already exists for candidate {candidate_id}: {remarks}")
    #                 return existing_entry

    #         # Handle profile submission (latest-only semantics)
    #         if profile_submission == 1:
    #             # Ensure this new entry becomes the ONLY one with profile_submission = 1
    #             # for the given (candidate_id, client_job_id). Older ones are downgraded to 0.
    #             try:
    #                 previous_qs = cls.objects.filter(
    #                     candidate_id=candidate_id,
    #                     client_job_id=client_job_id,
    #                     profile_submission=1
    #                 )
    #                 if previous_qs.exists():
    #                     previous_qs.update(profile_submission=0)
    #             except Exception as e:
    #                 print(f" Failed to reset previous profile submissions: {str(e)}")

    #             # Sync ClientJob's profile submission fields to this latest date
    #             try:
    #                 client_job = ClientJob.objects.filter(id=client_job_id).first()
    #                 if client_job:
    #                     client_job.profile_submission = 1
    #                     client_job.profile_submission_date = change_date
    #                     client_job.save()
    #             except Exception as e:
    #                 print(f" Failed to update ClientJob: {str(e)}")
    #         # Ensure profile_submission is never NULL at database level
    #         # Some database schemas define this column as NOT NULL, so default to 0 when omitted
    #         if profile_submission is None:
    #             profile_submission = 0
            
    #         # Create the new entry
    #         return cls.objects.create(
    #             candidate_id=candidate_id,
    #             client_job_id=client_job_id,
    #             vendor_id=vendor_id,
    #             client_name=client_name,
    #             remarks=remarks,
    #             profile_submission=profile_submission,
    #             attend_flag=attend_flag,
    #             change_date=change_date,
    #             created_by=created_by,
    @classmethod
    def create_status_entry(cls, candidate_id, remarks, change_date, created_by, extra_notes=None,
                        client_job_id=None, vendor_id=None, client_name=None, profile_submission=None, attend_flag=None,
                        branch_id=None, team_id=None, employee_id=None):
        """
        Create a new status history entry if it doesn't already exist
        
        Args:
            candidate_id: ID of the candidate
            remarks: Status/remark (interested, selected, etc.)
            change_date: Date when status changed (YYYY-MM-DD format)
            created_by: Employee code who made the change
            extra_notes: Optional additional notes
            client_job_id: Optional client job ID
            vendor_id: Optional vendor/client ID
            client_name: Optional client/vendor name
            profile_submission: Optional profile submission status (1=Yes, 0=No)
            attend_flag: Optional attendance flag for this status (True/False)
        """
        try:
            if not change_date:
                change_date = timezone.now().date()
            if isinstance(change_date, str):
                try:
                    change_date = datetime.strptime(change_date, "%Y-%m-%d").date()
                except Exception:
                    pass
            if attend_flag is None:
                attend_flag = False
            if profile_submission is not None:
                try:
                    profile_submission = 1 if int(profile_submission) == 1 else 0
                except Exception:
                    profile_submission = None
            if remarks and remarks.strip().lower() == "interested":
                exists = cls.objects.filter(
                    candidate_id=candidate_id,
                    remarks="Interested",
                    change_date=change_date
                ).exists()
                if exists:
                    print(f" 'Interested' status already exists for candidate {candidate_id} on {change_date}")
                    return None

            # If this is an attendance entry, ensure only ONE attend_flag=True row per
            # candidate/job/date. Additional calls on the same date should still be
            # stored as normal status rows (attend_flag=False) so remarks can be recorded.
            if attend_flag is True:
                existing_attendance = cls.objects.filter(
                    candidate_id=candidate_id,
                    client_job_id=client_job_id,
                    change_date=change_date,
                    attend_flag=True
                ).first()
                if existing_attendance:
                    # Demote this entry to a non-attendance status row while keeping
                    # the original attendance record unique.
                    attend_flag = False

            # Existing generic de-dup (keep as is for non-attendance rows)
            existing_entry = cls.objects.filter(
                candidate_id=candidate_id,
                remarks=remarks,
                client_job_id=client_job_id,
                change_date=change_date
            ).first()
            
            if existing_entry:
                print(f"Status entry already exists for candidate {candidate_id}: {remarks}")
                return existing_entry

            # Handle profile submission
            if profile_submission == 1:
                has_previous_submission = cls.objects.filter(
                    candidate_id=candidate_id,
                    client_job_id=client_job_id,
                    profile_submission=1
                ).exists()
                
                if has_previous_submission:
                    profile_submission = 0
                else:
                    try:
                        client_job = ClientJob.objects.filter(id=client_job_id).first()
                        if client_job:
                            client_job.profile_submission = 1
                            client_job.profile_submission_date = change_date
                            client_job.save()
                    except Exception as e:
                        print(f" Failed to update ClientJob: {str(e)}")

            # Default employee_id to created_by if not provided
            if not employee_id:
                employee_id = created_by

            # Ensure profile_submission is never None at DB level
            if profile_submission is None:
                profile_submission = 0

            # Create the new entry
            return cls.objects.create(
                candidate_id=candidate_id,
                client_job_id=client_job_id,
                vendor_id=vendor_id,
                client_name=client_name,
                remarks=remarks,
                profile_submission=profile_submission,
                attend_flag=attend_flag,
                change_date=change_date,
                created_by=created_by,
                extra_notes=extra_notes,
                branch_id=branch_id,
                team_id=team_id,
                employee_id=employee_id
            )
            
        except Exception as e:
            print(f" Error in create_status_entry: {str(e)}")
            return None

    @classmethod
    def get_candidate_timeline(cls, candidate_id):
        """
        Get complete timeline for a candidate
        
        Returns:
            QuerySet: All status history entries for the candidate, ordered by date
        """
        return cls.objects.filter(candidate_id=candidate_id).order_by('-change_date', '-created_at')

    @classmethod
    def get_calendar_data(cls, candidate_id, year=None, month=None):
        """
        Get calendar-formatted data for a candidate
        
        Args:
            candidate_id: ID of the candidate
            year: Optional year filter
            month: Optional month filter
            
        Returns:
            dict: Calendar data with dates as keys and status info as values
        """
        queryset = cls.objects.filter(candidate_id=candidate_id)
        
        if year:
            queryset = queryset.filter(change_date__year=year)
        if month:
            queryset = queryset.filter(change_date__month=month)
            
        calendar_data = {}
        for entry in queryset:
            date_key = entry.change_date.strftime('%Y-%m-%d')
            if date_key not in calendar_data:
                calendar_data[date_key] = []
            
            calendar_data[date_key].append({
                'id': entry.id,
                'remarks': entry.remarks,
                'extra_notes': entry.extra_notes,
                'client_job_id': entry.client_job_id,
                'vendor_id': entry.vendor_id,
                'client_name': entry.client_name,
                'created_by': entry.created_by,
                'created_by_name': entry.get_created_by_name(),
                'created_at': entry.created_at.isoformat()
            })
            
        return calendar_data


