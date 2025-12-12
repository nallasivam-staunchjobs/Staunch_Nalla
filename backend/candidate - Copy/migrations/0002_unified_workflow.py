# Generated migration for unified workflow implementation

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('candidate', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='JobAssignmentHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_by', models.CharField(blank=True, max_length=100, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_by', models.CharField(blank=True, max_length=100, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('previous_owner', models.CharField(blank=True, max_length=100, null=True)),
                ('new_owner', models.CharField(blank=True, max_length=100, null=True)),
                ('assigned_by', models.CharField(blank=True, max_length=100, null=True)),
                ('reason', models.CharField(choices=[
                    ('initial_assignment', 'Initial Assignment'),
                    ('manual_reassignment', 'Manual Reassignment'),
                    ('expired_nfd', 'NFD Expired - Auto Open'),
                    ('claimed_open_job', 'Claimed Open Job'),
                    ('manager_override', 'Manager Override'),
                ], default='manual_reassignment', max_length=50)),
                ('notes', models.TextField(blank=True, null=True)),
                ('candidate', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignment_history', to='candidate.candidate')),
                ('client_job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignment_history', to='candidate.clientjob')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
