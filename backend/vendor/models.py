# vendors/models.py
from django.db import models
from django.utils import timezone
import random
import string

class VendorLeadQuerySet(models.QuerySet):
    def status(self):
        # Modify this logic if needed - here we filter only non-rejected leads
        return self.exclude(status='rejected')

class VendorLeadManager(models.Manager):
    def get_queryset(self):
        return VendorLeadQuerySet(self.model, using=self._db)

    def status(self):
        return self.get_queryset().status()

class VendorLead(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('converted', 'Converted'),
        ('rejected', 'Rejected'),
    ]

    vendor_name = models.CharField(max_length=255,blank=True, null=True)
    contact_person = models.CharField(max_length=255,blank=True, null=True)
    designation = models.CharField(max_length=255,blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    contact_no1 = models.CharField(max_length=20,blank=True, null=True)
    contact_no2 = models.CharField(max_length=20, blank=True, null=True)
    company_type = models.CharField(max_length=255,blank=True, null=True)
    nfd = models.DateField(blank=True, null=True)  # Next follow-up date
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(default=timezone.now)

    objects = VendorLeadManager()

    def __str__(self):
        return self.vendor_name

class VendorQuerySet(models.QuerySet):
    def active(self):
        """Return only non-deleted vendors"""
        return self.filter(del_state=0)

    def deleted(self):
        """Return only soft-deleted vendors"""
        return self.filter(del_state=1)

class VendorManager(models.Manager):
    def get_queryset(self):
        return VendorQuerySet(self.model, using=self._db).filter(del_state=0)

    def active(self):
        """Return only non-deleted vendors"""
        return self.get_queryset()

    def deleted(self):
        """Return only soft-deleted vendors"""
        return VendorQuerySet(self.model, using=self._db).filter(del_state=1)

    def with_deleted(self):
        """Return all vendors including deleted ones"""
        return VendorQuerySet(self.model, using=self._db)

class Vendor(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
    ]

    vendor_code = models.CharField(max_length=20, unique=True)
    vendor_name = models.CharField(max_length=255, blank=True, null=True)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    designation = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    contact_no1 = models.CharField(max_length=15, blank=True, null=True)
    contact_no2 = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    company_type = models.CharField(max_length=255, blank=True, null=True)
    pan_no = models.CharField(max_length=10, blank=True, null=True)
    rc_no = models.CharField(max_length=100, blank=True, null=True)
    contract_copy = models.FileField(upload_to='contracts/', blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    # Soft delete fields
    del_state = models.IntegerField(default=0, help_text="0=Active, 1=Deleted")
    deleted_at = models.DateTimeField(blank=True, null=True)

    # Custom manager
    objects = VendorManager()

    def __str__(self):
        return self.vendor_name or self.vendor_code

    def soft_delete(self):
        """Soft delete the vendor"""
        self.del_state = 1
        self.deleted_at = timezone.now()
        self.save()

    def restore(self):
        """Restore a soft-deleted vendor"""
        self.del_state = 0
        self.deleted_at = None
        self.save()

def generate_vendor_code():
    return 'VEN' + ''.join(random.choices(string.digits, k=6))

class GSTDetail(models.Model):
    vendor = models.ForeignKey(Vendor, related_name='gst_details', on_delete=models.CASCADE)
    gst_no = models.CharField(max_length=20)
    state = models.CharField(max_length=100)

    def __str__(self):
        return self.gst_no