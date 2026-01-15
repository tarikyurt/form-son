-- update_v2.sql
-- Run this in phpMyAdmin to update the database for new features

-- 1. Add Header Image column to forms table
ALTER TABLE forms ADD COLUMN header_image VARCHAR(255) DEFAULT NULL;

-- 2. Add 'Has Details' flag to fields table (for conditional text input)
ALTER TABLE fields ADD COLUMN has_details TINYINT(1) DEFAULT 0;
