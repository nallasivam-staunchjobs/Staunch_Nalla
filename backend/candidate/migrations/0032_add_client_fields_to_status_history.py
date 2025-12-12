# Generated migration to add client fields to CandidateStatusHistory

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('candidate', '0031_alter_candidatestatushistory_id'),
    ]

    operations = [
        # Add new fields to CandidateStatusHistory
        migrations.AddField(
            model_name='candidatestatushistory',
            name='client_job_id',
            field=models.IntegerField(blank=True, null=True, help_text='Reference to client job ID'),
        ),
        migrations.AddField(
            model_name='candidatestatushistory',
            name='vendor_id',
            field=models.IntegerField(blank=True, null=True, help_text='Reference to vendor/client ID'),
        ),
        migrations.AddField(
            model_name='candidatestatushistory',
            name='client_name',
            field=models.CharField(max_length=200, blank=True, null=True, help_text='Client/Vendor name for reference'),
        ),
        
        # Add indexes for the new fields
        migrations.AddIndex(
            model_name='candidatestatushistory',
            index=models.Index(fields=['client_job_id'], name='idx_client_job'),
        ),
        migrations.AddIndex(
            model_name='candidatestatushistory',
            index=models.Index(fields=['vendor_id'], name='idx_vendor'),
        ),
        migrations.AddIndex(
            model_name='candidatestatushistory',
            index=models.Index(fields=['client_name'], name='idx_client_name'),
        ),
    ]
