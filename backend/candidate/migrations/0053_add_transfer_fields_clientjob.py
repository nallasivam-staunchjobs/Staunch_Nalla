# Add transfer_status and transfer_history to candidate_clientjob after transfer_date
from django.db import migrations, models


def add_transfer_fields(apps, schema_editor):
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

    table = 'candidate_clientjob'

    if not column_exists(table, 'transfer_status'):
        safe_exec("ALTER TABLE `candidate_clientjob` ADD COLUMN `transfer_status` varchar(50) NULL AFTER `transfer_date`")

    if not column_exists(table, 'transfer_history'):
        # Place after transfer_status to preserve intended order
        safe_exec("ALTER TABLE `candidate_clientjob` ADD COLUMN `transfer_history` longtext NULL AFTER `transfer_status`")


class Migration(migrations.Migration):

    dependencies = [
        ('candidate', '0052_sync_branch_team_fields'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_transfer_fields, reverse_code=migrations.RunPython.noop),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='clientjob',
                    name='transfer_status',
                    field=models.CharField(max_length=50, blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='clientjob',
                    name='transfer_history',
                    field=models.TextField(blank=True, null=True),
                ),
            ],
        )
    ]
