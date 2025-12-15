# Idempotently drop 'remarks' column from candidate_candidate if it exists
from django.db import migrations


def drop_candidate_remarks(apps, schema_editor):
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

    table = 'candidate_candidate'
    if column_exists(table, 'remarks'):
        with schema_editor.connection.cursor() as cursor:
            try:
                cursor.execute("ALTER TABLE `candidate_candidate` DROP COLUMN `remarks`")
            except Exception:
                # ignore if cannot drop for any reason
                pass


class Migration(migrations.Migration):

    dependencies = [
        ('candidate', '0054_move_transfer_history_to_candidate'),
    ]

    operations = [
        migrations.RunPython(drop_candidate_remarks, reverse_code=migrations.RunPython.noop),
    ]
