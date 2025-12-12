-- Manual script to add status history entries for existing candidates
-- Run this in phpMyAdmin or MySQL console

-- Add status history for candidate 196712 (Manikandan)
INSERT INTO `candidate_status_history` 
(`candidate_id`, `client_job_id`, `vendor_id`, `client_name`, `remarks`, `extra_notes`, `change_date`, `created_by`) 
VALUES 
(196712, 196712, NULL, 'Test Client', 'interested', 'Initial candidate status when created', '2025-11-14', 'EMP00100');

-- Add a few more sample entries for testing
INSERT INTO `candidate_status_history` 
(`candidate_id`, `client_job_id`, `vendor_id`, `client_name`, `remarks`, `extra_notes`, `change_date`, `created_by`) 
VALUES 
(196712, 196712, NULL, 'Test Client', 'interview fixed', 'Interview scheduled with client', '2025-11-15', 'EMP00100'),
(196712, 196712, NULL, 'Test Client', 'selected', 'Candidate selected after interview', '2025-11-16', 'EMP00100');

-- Verify the entries were created
SELECT * FROM `candidate_status_history` WHERE `candidate_id` = 196712 ORDER BY `change_date` DESC;

-- Check all status history entries
SELECT 
    id,
    candidate_id,
    client_job_id,
    client_name,
    remarks,
    change_date,
    created_by,
    created_at
FROM `candidate_status_history` 
ORDER BY `created_at` DESC 
LIMIT 10;
