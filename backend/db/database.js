// db/database.js
const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database file path
const dbPath = process.env.DB_PATH || path.join(__dirname, 'media_queue.db');

// Create database connection
const db = new sqlite3(dbPath, { verbose: console.log });

// Initialize database with schema
const initializeDatabase = async () => {
  try {
    // Read schema SQL
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    // Split the schema into individual statements
    const statements = schemaSQL
      .split(';')
      .filter(statement => statement.trim() !== '')
      .map(statement => statement + ';');
    
    // Execute each statement
    db.exec('BEGIN TRANSACTION;');
    statements.forEach(statement => {
      db.exec(statement);
    });
    db.exec('COMMIT;');
    
    // Create admin user if it doesn't exist
    const adminExists = db.prepare('SELECT 1 FROM users WHERE username = ?').get('admin');
    
    if (!adminExists) {
      // In a real app, you'd want to hash this password
      db.prepare(`
        INSERT INTO users (username, password, role, first_name, last_name, email,created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run('admin', 'adminpassword', 'admin', 'jack', 'j', 'jozwikch@sheridancollege.ca');
      
      console.log('Created default admin user');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Export database and initialization function
module.exports = {
  db,
  initializeDatabase
};