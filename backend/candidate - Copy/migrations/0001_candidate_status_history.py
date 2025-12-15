# Generated migration for candidate_status_history table

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('candidate', '0001_initial'),  # Adjust based on your latest migration
    ]

    operations = [
        migrations.CreateModel(
            name='CandidateStatusHistory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('candidate_id', models.IntegerField(help_text='Reference to candidate ID')),
                ('client_job_id', models.IntegerField(blank=True, null=True, help_text='Reference to client job ID')),
                ('vendor_id', models.IntegerField(blank=True, null=True, help_text='Reference to vendor/client ID')),
                ('client_name', models.CharField(max_length=200, blank=True, null=True, help_text='Client/Vendor name for reference')),
                ('remarks', models.CharField(max_length=100, help_text='Status/remark value (interested, selected, etc.)')),
                ('extra_notes', models.TextField(blank=True, null=True, help_text='Additional notes if needed')),
                ('change_date', models.DateField(help_text='Date when this status change occurred')),
                ('created_by', models.CharField(max_length=50, help_text='Employee code who made this change')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Exact timestamp when record was created')),
            ],
            options={
                'db_table': 'candidate_status_history',
                'ordering': ['-change_date', '-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='CandidateStatusHistory',
            index=models.Index(fields=['candidate_id'], name='idx_candidate'),
        ),
        migrations.AddIndex(
            model_name='CandidateStatusHistory',
            index=models.Index(fields=['client_job_id'], name='idx_client_job'),
        ),
        migrations.AddIndex(
            model_name='CandidateStatusHistory',
            index=models.Index(fields=['vendor_id'], name='idx_vendor'),
        ),
        migrations.AddIndex(
            model_name='CandidateStatusHistory',
            index=models.Index(fields=['change_date', 'remarks'], name='idx_date_remarks'),
        ),
        migrations.AddIndex(
            model_name='CandidateStatusHistory',
            index=models.Index(fields=['created_by'], name='idx_created_by'),
        ),
        migrations.AddIndex(
            model_name='CandidateStatusHistory',
            index=models.Index(fields=['client_name'], name='idx_client_name'),
        ),
    ]
