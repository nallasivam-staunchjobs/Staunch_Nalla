from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Create events tables manually'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Create tb_call_plan table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS `tb_call_plan` (
                    `id` int(11) NOT NULL AUTO_INCREMENT,
                    `tb_call_plan_data` varchar(20) DEFAULT NULL,
                    `tb_call_emp_id` int(11) DEFAULT NULL,
                    `tb_call_vendor_id` int(11) DEFAULT NULL,
                    `tb_call_info` text DEFAULT NULL,
                    `tb_call_startdate` datetime NOT NULL,
                    `tb_call_todate` datetime NOT NULL,
                    `tb_call_status` int(11) NOT NULL DEFAULT 1,
                    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)
            
            # Create tb_call_details table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS `tb_call_details` (
                    `id` int(11) NOT NULL AUTO_INCREMENT,
                    `tb_call_plan_id` int(11) DEFAULT NULL,
                    `tb_call_plan_data` varchar(20) NOT NULL DEFAULT 'P1',
                    `tb_call_emp_id` int(11) NOT NULL DEFAULT 1,
                    `tb_call_client_id` int(11) NOT NULL DEFAULT 1,
                    `tb_call_state_id` varchar(100) DEFAULT NULL,
                    `tb_call_city_id` varchar(100) DEFAULT NULL,
                    `tb_call_channel` varchar(200) NOT NULL DEFAULT 'General Position',
                    `tb_call_channel_id` int(11) DEFAULT NULL,
                    `tb_call_source_id` varchar(100) DEFAULT NULL,
                    `tb_call_description` text NOT NULL DEFAULT 'Event description',
                    `tb_call_startdate` datetime NOT NULL,
                    `tb_call_todate` datetime NOT NULL,
                    `tb_calls_onplan` text DEFAULT NULL,
                    `tb_calls_onothers` text DEFAULT NULL,
                    `tb_calls_profiles` text DEFAULT NULL,
                    `tb_calls_profilesothers` text DEFAULT NULL,
                    `tb_call_status` int(11) NOT NULL DEFAULT 1,
                    `tb_call_add_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `tb_call_up_date` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                    `employee_name` varchar(200) DEFAULT NULL,
                    `client_name` varchar(200) DEFAULT NULL,
                    `source_name` varchar(200) DEFAULT NULL,
                    PRIMARY KEY (`id`),
                    KEY `tb_call_plan_id` (`tb_call_plan_id`),
                    CONSTRAINT `tb_call_details_ibfk_1` FOREIGN KEY (`tb_call_plan_id`) REFERENCES `tb_call_plan` (`id`) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)
            
        self.stdout.write(self.style.SUCCESS('[SUCCESS] Events tables created successfully!'))
