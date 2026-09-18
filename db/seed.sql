INSERT INTO users (name, roll_no, email, phone, role, password_hash) VALUES
('Alice', 'S001', 'alice@example.com', '1234567890', 'student', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'),
('Bob', 'S002', 'bob@example.com', '1234567891', 'student', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'),
('Charlie', 'S003', 'charlie@example.com', '1234567892', 'student', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'),
('Dr. Smith', 'W001', 'smith@example.com', '1234567893', 'warden', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'),
('Gate Officer', 'G001', 'gate@example.com', '1234567894', 'gate', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW');

INSERT INTO outpass_requests (student_id, destination, reason, departure_time, return_time, contact_details, status) VALUES
(1, 'Home', 'Family Function', NOW() + interval '1 day', NOW() + interval '3 days', '9876543210', 'Approved'),
(2, 'City', 'Shopping', NOW() + interval '1 day', NOW() + interval '2 days', '9876543211', 'Rejected'),
(3, 'Hospital', 'Medical', NOW() + interval '1 day', NOW() + interval '1 day 5 hours', '9876543212', 'Pending');

INSERT INTO status_history (request_id, status, changed_by, remarks) VALUES
(1, 'Pending', 1, NULL),
(1, 'Approved', 4, 'Allowed'),
(2, 'Pending', 2, NULL),
(2, 'Rejected', 4, 'Denied due to exams'),
(3, 'Pending', 3, NULL);

INSERT INTO notifications (student_id, request_id, message, is_read) VALUES
(1, 1, 'Your outpass request #1 to Home has been Approved.', FALSE),
(2, 2, 'Your outpass request #2 to City has been Rejected. Remarks: Denied due to exams', FALSE);

INSERT INTO qr_tokens (request_id, token, expires_at) VALUES
(1, 'TEST-QR-ALICE-001', NOW() + interval '30 days');
