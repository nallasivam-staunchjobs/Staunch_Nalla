from django.db import models
from decimal import Decimal
from candidate.models import Candidate

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
# Invoice Model
# -----------------------------
class Invoice(AuditFields):
    PLACEMENT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]

    # Basic Information
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name='invoices',
        null=True,
        blank=True
    )
    candidate_name = models.CharField(max_length=100)
    client_name = models.CharField(max_length=100)
    state = models.CharField(max_length=50)
    emp_code = models.CharField(max_length=50)

    # Financial Details
    ctc = models.DecimalField(max_digits=12, decimal_places=2)
    placement_type = models.CharField(max_length=20, choices=PLACEMENT_TYPE_CHOICES, default='percentage')
    placement_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    placement_fixed = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    placement_amount = models.DecimalField(max_digits=12, decimal_places=2)

    # GST Calculations
    cgst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_gst = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)

    # Invoice Details
    invoice_number = models.CharField(max_length=50, unique=True)
    invoice_date = models.DateField()

    # Client Information
    client_address = models.TextField(blank=True, null=True)
    client_gst = models.CharField(max_length=15, blank=True, null=True)
    client_pan = models.CharField(max_length=10, blank=True, null=True)

    # Status and Metadata
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'),
            ('generated', 'Generated'),
            ('sent', 'Sent'),
            ('paid', 'Paid'),
            ('cancelled', 'Cancelled'),
        ],
        default='draft'
    )

    # File attachments
    invoice_file = models.FileField(upload_to='invoices/', null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.candidate_name} ({self.client_name})"

    def save(self, *args, **kwargs):
        # Auto-calculate placement amount based on type
        if self.placement_type == 'percentage' and self.placement_percent:
            self.placement_amount = (self.ctc * self.placement_percent) / 100
        elif self.placement_type == 'fixed' and self.placement_fixed:
            self.placement_amount = self.placement_fixed

        # Auto-calculate GST based on state
        COMPANY_STATE = "Tamil Nadu"
        if self.state == COMPANY_STATE:
            # Tamil Nadu: CGST + SGST @ 9% each
            self.cgst = self.placement_amount * Decimal('0.09')
            self.sgst = self.placement_amount * Decimal('0.09')
            self.igst = Decimal('0')
        else:
            # Other states: IGST @ 18%
            self.cgst = Decimal('0')
            self.sgst = Decimal('0')
            self.igst = self.placement_amount * Decimal('0.18')

        # Calculate totals
        self.total_gst = self.cgst + self.sgst + self.igst
        self.total_amount = self.placement_amount + self.total_gst

        super().save(*args, **kwargs)
