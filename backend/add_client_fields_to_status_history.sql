-- Add client fields to existing candidate_status_history table
-- Run this script if the table already exists but is missing the new fields

-- Check if the table exists first
SELECT COUNT(*) as table_exists 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'candidate_status_history';

-- Add the new fields if they don't exist
-- Note: These will fail silently if the columns already exist

-- Add client_job_id field
ALTER TABLE `candidate_status_history` 
ADD COLUMN `client_job_id` INT DEFAULT NULL COMMENT 'Reference to client job ID';

-- Add vendor_id field  
ALTER TABLE `candidate_status_history` 
ADD COLUMN `vendor_id` INT DEFAULT NULL COMMENT 'Reference to vendor/client ID';

-- Add client_name field
ALTER TABLE `candidate_status_history` 
ADD COLUMN `client_name` VARCHAR(200) DEFAULT NULL COMMENT 'Client/Vendor name for reference';

-- Add indexes for the new fields
CREATE INDEX `idx_client_job` ON `candidate_status_history` (`client_job_id`);
CREATE INDEX `idx_vendor` ON `candidate_status_history` (`vendor_id`);  
CREATE INDEX `idx_client_name` ON `candidate_status_history` (`client_name`);

-- Verify the table structure
DESCRIBE `candidate_status_history`;

-- Show sample data
SELECT * FROM `candidate_status_history` LIMIT 5;
