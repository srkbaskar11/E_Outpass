CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    roll_no VARCHAR(50) UNIQUE,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20),
    role VARCHAR(20) CHECK (role IN ('student','warden','gate')),
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE outpass_requests (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES users(id),
    destination VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    return_time TIMESTAMP NOT NULL,
    contact_details VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE status_history (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES outpass_requests(id),
    status VARCHAR(20) NOT NULL,
    changed_by INT REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW(),
    remarks TEXT
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES users(id),
    request_id INT REFERENCES outpass_requests(id),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE qr_tokens (
    id SERIAL PRIMARY KEY,
    request_id INT UNIQUE REFERENCES outpass_requests(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_outpass_requests_modtime
BEFORE UPDATE ON outpass_requests
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
