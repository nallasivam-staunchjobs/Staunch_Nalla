from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Employee(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    # username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    password = models.CharField(max_length=128, null=True, blank=True)
    # confirmPassword = models.CharField(max_length=128, null=True, blank=True)
    phone1 = models.CharField(max_length=15, null=True, blank=True)
    phone2 = models.CharField(max_length=15, null=True, blank=True)
    officialEmail = models.EmailField(unique=True, null=True, blank=True) # Corrected
    personalEmail = models.EmailField(null=True, blank=True) # Corrected
    firstName = models.CharField(max_length=100, default='Default') # Corrected
    lastName = models.CharField(max_length=100, default='Default') # Corrected
    gender = models.CharField(max_length=10, null=True, blank=True)
    bloodGroup = models.CharField(max_length=3, null=True, blank=True)
    dateOfBirth = models.DateField(null=True, blank=True)
    maritalStatus = models.CharField(max_length=20, default='Single') # Corrected
    department = models.CharField(max_length=100, null=True, blank=True)
    position = models.CharField(max_length=100, null=True, blank=True)
    degree = models.CharField(max_length=100, null=True, blank=True)
    specialization = models.CharField(max_length=100, null=True, blank=True)
    ctc = models.IntegerField(null=True, blank=True)
    yearsOfExperience = models.IntegerField(null=True, blank=True) # Corrected
    experienceDetails = models.TextField(null=True, blank=True)
    lastCompany = models.CharField(max_length=100, null=True, blank=True)
    joiningDate = models.DateField(null=True, blank=True) # Corrected
    employeeCode = models.CharField(max_length=50, unique=True, null=True, blank=True)
    branch = models.CharField(max_length=100, null=True, blank=True)
    level = models.CharField(max_length=50, null=True, blank=True)
    workMode = models.CharField(max_length=50, null=True, blank=True) # Corrected
    profilePhoto = models.ImageField(upload_to='profile_photos/', null=True, blank=True) # Corrected
    # proofDocument = models.FileField(upload_to='proof_documents/', null=True, blank=True) # Corrected
    # additionalDocuments = models.FileField(upload_to='additional_documents/', null=True, blank=True)
    # proofType = models.CharField(max_length=50, null=True, blank=True) # Corrected
    reportingManager = models.CharField(max_length=100, null=True, blank=True, db_column='reportingManager_id')
    referenceContactName = models.CharField(max_length=100, null=True, blank=True) # Corrected
    referenceContactPhone = models.CharField(max_length=15, null=True, blank=True) # Corrected
    emergencyContact1Name = models.CharField(max_length=100, null=True, blank=True)
    emergencyContact1Phone = models.CharField(max_length=15, null=True, blank=True)
    permanentAddress = models.TextField(null=True, blank=True) # Corrected
    currentAddress = models.TextField(null=True, blank=True)

    # Banking Details
    bankName = models.CharField(max_length=100, null=True, blank=True)
    accountHolderName = models.CharField(max_length=100, null=True, blank=True)
    accountNumber = models.CharField(max_length=50, null=True, blank=True)
    ifscCode = models.CharField(max_length=20, null=True, blank=True)
    upiNumber = models.CharField(max_length=100, null=True, blank=True)
    # Document Details
    aadhaarNumber = models.CharField(max_length=20, null=True, blank=True)
    aadhaarFront = models.FileField(upload_to='documents/aadhaar/', null=True, blank=True)
    aadhaarBack = models.FileField(upload_to='documents/aadhaar/', null=True, blank=True)
    panNumber = models.CharField(max_length=20, null=True, blank=True)
    panFiles = models.FileField(upload_to='documents/pan/', null=True, blank=True)
    offerLetterFiles = models.FileField(upload_to='documents/offer_letters/', null=True, blank=True)
    relievingLetterFiles = models.FileField(upload_to='documents/relieving_letters/', null=True, blank=True)
    payslipFiles = models.FileField(upload_to='documents/payslips/', null=True, blank=True)

    # Employee Status
    status = models.CharField(max_length=20, default='Active', choices=[
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    ])

    remarks = models.TextField(null=True, blank=True)
    del_state = models.IntegerField(default=0)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.firstName} {self.lastName} ({self.employeeCode})"

    def clean(self):
        from django.core.exceptions import ValidationError

        # Ensure phone1 is provided
        if not self.phone1:
            raise ValidationError('Phone number is required for login')

        # Ensure employee code is unique and properly formatted
        if self.employeeCode:
            # Normalize employee code format (preserve slash for continuous numbering)
            self.employeeCode = self.employeeCode.upper()

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)