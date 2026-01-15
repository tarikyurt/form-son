CREATE DATABASE IF NOT EXISTS sth_forms;
USE sth_forms;

-- Users table for Admin authentication
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    permissions JSON DEFAULT NULL, -- Stores ["fill", "edit", "delete"]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forms table
CREATE TABLE IF NOT EXISTS forms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Form Fields (Questions) table
CREATE TABLE IF NOT EXISTS fields (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_id INT NOT NULL,
    label VARCHAR(255) NOT NULL,
    field_type ENUM('text', 'textarea', 'number', 'date', 'checkbox', 'radio', 'select', 'file') NOT NULL,
    options JSON DEFAULT NULL, -- For radio, checkbox, select (store as JSON array)
    required TINYINT(1) DEFAULT 0,
    order_index INT DEFAULT 0,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

-- Submissions table (Header for a filled form)
CREATE TABLE IF NOT EXISTS submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_id INT NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

-- Submission Answers (Actual data)
CREATE TABLE IF NOT EXISTS submission_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    field_id INT NOT NULL,
    answer_value TEXT, -- Stores text, number, or JSON for multiple values
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE
);

-- Insert default admin user (username: admin, password: password123)
-- Password hash generated for 'password123' (You should likely change this in production)
-- This is a raw bcrypt hash for 'password123' for demonstration purposes
INSERT IGNORE INTO users (username, password_hash) VALUES 
('admin', '$2b$10$YourHashedPasswordHereOrHandleInCode');
