-- db/schema.sql

-- Users table for authentication with extended user information
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student', 'faculty', 'admin')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  preferred_name TEXT,
  email TEXT NOT NULL UNIQUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME,
  profile_image TEXT
);

-- Media items table
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  duration INTEGER, -- in seconds for still images, NULL for videos
  display_order INTEGER, -- for sorting in the display queue
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  created_at DATETIME NOT NULL,
  approved_at DATETIME,
  approved_by INTEGER,
  metadata TEXT, -- JSON string with additional data
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Settings table for global configuration
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at DATETIME NOT NULL,
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value, updated_at) 
VALUES 
  ('default_image_duration', '10', datetime('now')),
  ('auto_approve', 'false', datetime('now')),
  ('upload_path', 'uploads', datetime('now')),
  ('content_rotation', 'equal', datetime('now'));