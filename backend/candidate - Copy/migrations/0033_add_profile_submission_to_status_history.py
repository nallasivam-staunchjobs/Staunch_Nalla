# Generated migration for adding profile_submission field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('candidate', '0032_add_client_fields_to_status_history'),
    ]

    operations = [
        migrations.AddField(
            model_name='candidatestatushistory',
            name='profile_submission',
            field=models.IntegerField(
                blank=True, 
                null=True, 
                help_text='Profile submission status (1=Yes, 0=No)'
            ),
        ),
    ]
