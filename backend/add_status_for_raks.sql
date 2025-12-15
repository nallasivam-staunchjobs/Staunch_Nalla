-- Add status history for candidate 196713 (raks)
INSERT INTO `candidate_status_history` 
(`candidate_id`, `client_job_id`, `vendor_id`, `client_name`, `remarks`, `extra_notes`, `change_date`, `created_by`) 
VALUES 
(196713, 196713, NULL, 'Matrimony Directory', 'interested', 'Initial candidate status when created', '2025-11-14', 'Emp/00100');

-- Verify the entry was created
SELECT * FROM `candidate_status_history` WHERE `candidate_id` = 196713 ORDER BY `change_date` DESC;
