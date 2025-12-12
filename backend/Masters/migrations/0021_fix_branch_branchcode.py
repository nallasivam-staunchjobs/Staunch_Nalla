# Generated manually to fix branchcode column issue

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Masters', '0020_rename_code_branch_branchcode'),
    ]

    operations = [
        # Check if column exists and add it only if it doesn't exist
        migrations.RunSQL(
            # Forward SQL - Check and add column if needed
            """
            SET @column_exists = (
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'masters_branch' 
                AND COLUMN_NAME = 'branchcode'
            );
            
            SET @sql = IF(@column_exists = 0, 
                'ALTER TABLE masters_branch ADD COLUMN branchcode VARCHAR(10) NULL;', 
                'SELECT "Column branchcode already exists" as message;'
            );
            
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
            """,
            # Reverse SQL - Remove the column if it exists
            """
            SET @column_exists = (
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'masters_branch' 
                AND COLUMN_NAME = 'branchcode'
            );
            
            SET @sql = IF(@column_exists > 0, 
                'ALTER TABLE masters_branch DROP COLUMN branchcode;', 
                'SELECT "Column branchcode does not exist" as message;'
            );
            
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
            """
        ),
        # Update any existing records with default values
        migrations.RunSQL(
            """
            UPDATE masters_branch 
            SET branchcode = CONCAT('BR', LPAD(id, 3, '0'))
            WHERE branchcode IS NULL OR branchcode = '';
            """,
            migrations.RunSQL.noop
        ),
        # Make it unique and not null
        migrations.RunSQL(
            """
            ALTER TABLE masters_branch 
            MODIFY COLUMN branchcode VARCHAR(10) NOT NULL UNIQUE;
            """,
            migrations.RunSQL.noop
        ),
    ]
