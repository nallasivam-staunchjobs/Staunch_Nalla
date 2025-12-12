# Move transfer_history from candidate_clientjob to candidate_candidate
from django.db import migrations, models


def move_transfer_history(apps, schema_editor):
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

    def add_column_if_missing(table_name, column_sql):
        with schema_editor.connection.cursor() as cursor:
            try:
                cursor.execute(f"ALTER TABLE `{table_name}` {column_sql}")
            except Exception:
                pass

    def drop_column_if_exists(table_name, column_name):
        if column_exists(table_name, column_name):
            with schema_editor.connection.cursor() as cursor:
                try:
                    cursor.execute(f"ALTER TABLE `{table_name}` DROP COLUMN `{column_name}`")
                except Exception:
                    pass

    # Ensure candidate table has the new column
    candidate_table = 'candidate_candidate'
    clientjob_table = 'candidate_clientjob'

    if not column_exists(candidate_table, 'transfer_history'):
        add_column_if_missing(candidate_table, "ADD COLUMN `transfer_history` longtext NULL")

    # Migrate data from clientjob.transfer_history to candidate.transfer_history (append)
    Candidate = apps.get_model('candidate', 'Candidate')
    ClientJob = apps.get_model('candidate', 'ClientJob')

    from django.db import transaction
    with transaction.atomic():
        qs = ClientJob.objects.exclude(transfer_history__isnull=True).exclude(transfer_history='')
        qs = qs.select_related('candidate').only('transfer_history', 'candidate_id')
        for cj in qs.iterator():
            cand = cj.candidate
            try:
                if cand is None:
                    continue
                existing = cand.transfer_history or ''
                incoming = cj.transfer_history or ''
                if not incoming:
                    continue
                if existing:
                    # Avoid duplicate lines if the same block already present
                    if incoming not in existing:
                        cand.transfer_history = existing + '\n' + incoming
                else:
                    cand.transfer_history = incoming
                cand.save(update_fields=['transfer_history'])
            except Exception:
                # Ignore per-row failures to keep migration resilient
                pass

    # Drop old column from clientjob
    drop_column_if_exists(clientjob_table, 'transfer_history')


class Migration(migrations.Migration):

    dependencies = [
        ('candidate', '0053_add_transfer_fields_clientjob'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(move_transfer_history, reverse_code=migrations.RunPython.noop),
            ],
            state_operations=[
                migrations.RemoveField(
                    model_name='clientjob',
                    name='transfer_history',
                ),
            ],
        )
    ]
