# Move feedback from candidate_clientjob to candidate_candidate and drop from clientjob
from django.db import migrations, models


def move_feedback(apps, schema_editor):
    def column_exists(table_name, column_name):
        with schema_editor.connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = %s
                  AND COLUMN_NAME = %s
                """,
                [table_name, column_name],
            )
            return cursor.fetchone()[0] > 0

    def safe_exec(sql):
        with schema_editor.connection.cursor() as cursor:
            try:
                cursor.execute(sql)
            except Exception:
                pass

    candidate_table = 'candidate_candidate'
    clientjob_table = 'candidate_clientjob'

    # Ensure candidate.feedback exists before migration (place before transfer_history by adding after resume_pdf)
    if not column_exists(candidate_table, 'feedback'):
        # Add after resume_pdf to keep it before transfer_history
        safe_exec("ALTER TABLE `candidate_candidate` ADD COLUMN `feedback` longtext NULL AFTER `resume_pdf`")

    # Backfill: append all clientjob.feedback into candidate.feedback (joined by ';;;;;;')
    Candidate = apps.get_model('candidate', 'Candidate')
    ClientJob = apps.get_model('candidate', 'ClientJob')

    from django.db import transaction
    with transaction.atomic():
        # Iterate per candidate to avoid GROUP_CONCAT limits
        cand_ids = Candidate.objects.values_list('id', flat=True)
        for cid in cand_ids:
            try:
                jobs = ClientJob.objects.filter(candidate_id=cid).exclude(feedback__isnull=True).exclude(feedback='').values_list('feedback', flat=True)
                joined = ''
                for fb in jobs:
                    if not fb:
                        continue
                    if joined:
                        joined += ';;;;;;' + fb
                    else:
                        joined = fb
                if joined:
                    Candidate.objects.filter(id=cid).update(feedback=joined)
            except Exception:
                # continue on errors
                pass

    # Drop old clientjob.feedback column
    if column_exists(clientjob_table, 'feedback'):
        safe_exec("ALTER TABLE `candidate_clientjob` DROP COLUMN `feedback`")


class Migration(migrations.Migration):

    dependencies = [
        ('candidate', '0055_drop_candidate_remarks_column'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(move_feedback, reverse_code=migrations.RunPython.noop),
            ],
            state_operations=[
                migrations.RemoveField(
                    model_name='clientjob',
                    name='feedback',
                ),
            ],
        )
    ]
