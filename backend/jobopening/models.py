from django.db import models

# -----------------------------
# Shared Audit Fields
# -----------------------------
class AuditFields(models.Model):
    created_by = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.CharField(max_length=100, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

# -----------------------------
# Job Opening Model
# -----------------------------
class JobOpening(AuditFields):
    # Job Information (Step 1)
    job_title = models.CharField(max_length=200)
    company_name = models.CharField(max_length=200)
    designation=models.CharField(max_length=200)
    ctc = models.CharField(max_length=100)  # Can be range like "5-8 LPA"
    experience = models.CharField(max_length=100)  # Can be range like "2-5 years"
    state = models.CharField(max_length=100)
    city = models.CharField(max_length=100)

    # Skill Requirements (Step 2)
    skills = models.JSONField(default=list, blank=True)  # Array of skills
    languages = models.JSONField(default=list, blank=True)  # Array of languages
    short_description = models.TextField()
    job_description = models.TextField()

    # Contact Details (Step 3)
    contact_person = models.CharField(max_length=200)
    contact_number = models.CharField(max_length=15)

    # Additional fields
    is_active = models.BooleanField(default=True)
    posted_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-posted_date']
        verbose_name = 'Job Opening'
        verbose_name_plural = 'Job Openings'

    def __str__(self):
        return f"{self.job_title} at {self.company_name}"
