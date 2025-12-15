from django.db import models

# Create your models here.
class Source(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Deactive', 'Deactive'),
    )

    name = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Team(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Deactive', 'Deactive'),
    ]

    name = models.CharField(max_length=100)
    employees = models.ManyToManyField('empreg.Employee', related_name='teams', blank=True)
    branch = models.ForeignKey('Masters.Branch', on_delete=models.PROTECT, related_name='teams', null=True, blank=True)
    status = models.CharField(max_length=8, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'masters_teams'

    def __str__(self):
        return self.name

class Industry(models.Model):
    name = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=[('Active', 'Active'), ('Deactive', 'Deactive')], default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Remark(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Deactive', 'Deactive'),
    ]

    name = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Department(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Deactive', 'Deactive'),
    )

    name = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Designation(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Deactive', 'Deactive'),
    )

    name = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Education(models.Model):
    name = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=[('Active', 'Active'), ('Deactive', 'Deactive')], default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Experience(models.Model):
    name = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=[('Active', 'Active'), ('Deactive', 'Deactive')], default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Communication(models.Model):
    name = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=10, choices=[('Active', 'Active'), ('Deactive', 'Deactive')])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Position(models.Model):
    name = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=10, choices=[('Active', 'Active'), ('Deactive', 'Deactive')], default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Branch(models.Model):
    name = models.CharField(max_length=100, unique=True)
    branchcode = models.CharField(max_length=10, unique=True, help_text="Branch code (e.g., MUM, DEL, BLR)")
    status = models.CharField(max_length=20, choices=[('Active', 'Active'), ('Deactive', 'Deactive')], default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.branchcode})"

class WorkMode(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Deactive', 'Deactive'),
    )

    name = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Gender(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Deactive', 'Deactive'),
    )

    name = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class MaritalStatus(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Deactive', 'Deactive'),
    )

    name = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class BloodGroup(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Deactive', 'Deactive'),
    ]

    name = models.CharField(max_length=10, unique=True)
    status = models.CharField(max_length=8, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

