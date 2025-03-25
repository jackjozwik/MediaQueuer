// controllers/authController.js
const jwt = require('jsonwebtoken');
const { db } = require('../db/database');

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Token expiration (24 hours)
const TOKEN_EXPIRATION = '24h';

// User login
const login = async (req, res) => {
  const { username, password } = req.body;
  
  // Validate request
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and password are required' 
    });
  }
  
  try {
    // Find user in database
    // Note: In a production app, you should hash passwords and use bcrypt to compare
    const user = db.prepare(`
      SELECT id, username, role, first_name, last_name, preferred_name, email
      FROM users WHERE username = ? AND password = ?
    `).get(username, password);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        preferredName: user.preferred_name,
        email: user.email,
        profileImage: user.profile_image  // Add this line
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRATION }
    );
    
    // Return user info and token
    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          preferredName: user.preferred_name,
          email: user.email
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Register new user (open for first user, then admin only)
const registerUser = async (req, res) => {
  const { username, password, role, firstName, lastName, preferredName, email } = req.body;
  
  // Validate request
  if (!username || !password || !role || !firstName || !lastName || !email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username, password, role, firstName, lastName, and email are required' 
    });
  }
  
  // Validate role
  if (!['student', 'faculty', 'admin'].includes(role)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid role. Must be student, faculty, or admin' 
    });
  }
  
  try {
    // Check if any users exist (first user can be admin)
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    
    // If not first user, check if requester is admin
    if (userCount > 0) {
      // Get token from request
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Registration is only available to admins after the first user' 
        });
      }
      
      const token = authHeader.split(' ')[1];
      
      try {
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if admin
        if (decoded.role !== 'admin') {
          return res.status(403).json({ 
            success: false, 
            message: 'Only admins can register new users' 
          });
        }
      } catch (err) {
        return res.status(403).json({ 
          success: false, 
          message: 'Invalid token' 
        });
      }
    }
    
    // Check if username already exists
    const existingUser = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
    
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }
    
    // Check if email already exists
    const existingEmail = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
    
    if (existingEmail) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }
    
    // Insert new user
    const result = db.prepare(`
      INSERT INTO users (
        username, password, role, first_name, last_name, 
        preferred_name, email, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      username, 
      password, 
      role, 
      firstName, 
      lastName, 
      preferredName || firstName,
      email
    );
    
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Register public user (always sets role to 'student')
const registerPublicUser = async (req, res) => {
  const { username, password, firstName, lastName, preferredName, email } = req.body;
  
  // Validate request
  if (!username || !password || !firstName || !lastName || !email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username, password, firstName, lastName, and email are required' 
    });
  }
  
  try {
    // Check if username already exists
    const existingUser = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
    
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }
    
    // Check if email already exists
    const existingEmail = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
    
    if (existingEmail) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }
    
    // Always set role to 'student' for public registrations
    const role = 'student';
    
    // Insert new user
    const result = db.prepare(`
      INSERT INTO users (
        username, password, role, first_name, last_name, 
        preferred_name, email, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      username, 
      password, 
      role, 
      firstName, 
      lastName, 
      preferredName || firstName,
      email
    );
    
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('Public register error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get current user info
const getCurrentUser = async (req, res) => {
  try {
    // Fetch user from database
    const user = db.prepare(`
      SELECT id, username, role, first_name, last_name, preferred_name, email
      FROM users WHERE id = ?
    `).get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    return res.json({
      success: true,
      data: { 
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          preferredName: user.preferred_name,
          email: user.email,
          profileImage: user.profile_image  
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

module.exports = {
  login,
  registerUser,
  registerPublicUser,
  getCurrentUser
};