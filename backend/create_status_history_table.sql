-- Create candidate_status_history table
-- This script creates the table structure for tracking candidate status changes

CREATE TABLE IF NOT EXISTS `candidate_status_history` (
  `id` INT NOT NULL AUTO_INCREMENT,
  
  -- Candidate reference
  `candidate_id` INT NOT NULL,
  
  -- Client Job reference (optional)
  `client_job_id` INT DEFAULT NULL,
  
  -- Vendor/Client ID reference (optional)
  `vendor_id` INT DEFAULT NULL,
  
  -- Client/Vendor name for reference (optional)
  `client_name` VARCHAR(200) DEFAULT NULL,
  
  -- The actual remarks value (interested, interviewfixed, noshow, selected, etc.)
  `remarks` VARCHAR(100) NOT NULL,
  
  -- Extra notes if needed (optional)
  `extra_notes` TEXT DEFAULT NULL,
  
  -- On which date this remark/status happened
  `change_date` DATE NOT NULL,
  
  -- Who updated the remark/status
  `created_by` VARCHAR(50) NOT NULL,
  
  -- Exact time record created
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  
  -- Indexes for speed
  KEY `idx_candidate` (`candidate_id`),
  KEY `idx_client_job` (`client_job_id`),
  KEY `idx_vendor` (`vendor_id`),
  KEY `idx_date_remarks` (`change_date`, `remarks`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_client_name` (`client_name`),
  
  -- Foreign key constraint (optional, can be added later)
  CONSTRAINT `fk_candidate_history_candidate` 
    FOREIGN KEY (`candidate_id`)
    REFERENCES `candidate_candidate` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert some sample data for testing
INSERT INTO `candidate_status_history` 
(`candidate_id`, `client_job_id`, `vendor_id`, `client_name`, `remarks`, `extra_notes`, `change_date`, `created_by`) 
VALUES 
(101, 1001, 501, 'TCS', 'interested', 'Initial candidate contact', '2025-11-14', 'EMP00012'),
(101, 1001, 501, 'TCS', 'interview fixed', 'Interview scheduled with client', '2025-11-15', 'EMP00012'),
(101, 1001, 501, 'TCS', 'attend', 'Candidate attended technical round', '2025-11-16', 'EMP00012'),
(101, 1001, 501, 'TCS', 'noshow', 'Candidate did not attend HR round', '2025-11-17', 'EMP00012'),
(101, 1001, 501, 'TCS', 'selected', 'Offer released to candidate', '2025-11-20', 'EMP00012'),
(101, 1001, 501, 'TCS', 'joined', 'Candidate joined on client location', '2025-11-25', 'EMP00012');

-- Verify the table was created successfully
DESCRIBE `candidate_status_history`;

-- Check sample data
SELECT * FROM `candidate_status_history` ORDER BY `change_date` DESC LIMIT 10;
