import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: 'vhi09o.easypanel.host',
  port: 9905,
  user: 'mysql',
  password: 'fb6e90710fbec5629cb1',
  database: 'sixcontrol',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database tables
export async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Create users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role ENUM('user', 'admin', 'reseller') DEFAULT 'user',
        telegram_name VARCHAR(255),
        telegram_user_id VARCHAR(255),
        request_credits INT DEFAULT 5,
        credits_reset_date DATE,
        exp_date BIGINT,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_telegram_user_id (telegram_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Create request_logs table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS request_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        username VARCHAR(255) NOT NULL,
        media_type ENUM('movie', 'tv') NOT NULL,
        tmdb_id INT NOT NULL,
        media_title VARCHAR(500),
        request_status ENUM('success', 'failed', 'pending') DEFAULT 'pending',
        error_message TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at),
        INDEX idx_tmdb_id (tmdb_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Create sessions table for express-session
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(128) PRIMARY KEY,
        expires BIGINT UNSIGNED NOT NULL,
        data TEXT,
        INDEX idx_expires (expires)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Create login_attempts table for security
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45),
        success BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Get user by username
export async function getUserByUsername(username) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

// Create or update user
export async function upsertUser(userData) {
  try {
    const {
      username,
      password,
      email,
      role,
      telegram_name,
      telegram_user_id,
      exp_date,
      status
    } = userData;
    
    // Calculate credits based on role
    let credits = 5; // default for user
    if (role === 'admin') credits = 999999;
    else if (role === 'reseller') credits = 25;
    
    // Calculate next reset date (first day of next month)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    const resetDate = nextMonth.toISOString().split('T')[0];
    
    const [result] = await pool.execute(
      `INSERT INTO users 
        (username, password, email, role, telegram_name, telegram_user_id, 
         request_credits, credits_reset_date, exp_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        password = VALUES(password),
        email = VALUES(email),
        role = VALUES(role),
        telegram_name = VALUES(telegram_name),
        telegram_user_id = VALUES(telegram_user_id),
        exp_date = VALUES(exp_date),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP`,
      [username, password, email, role || 'user', telegram_name, telegram_user_id, 
       credits, resetDate, exp_date, status || 'Active']
    );
    
    return result;
  } catch (error) {
    console.error('Error upserting user:', error);
    throw error;
  }
}

// Log request
export async function logRequest(logData) {
  try {
    const {
      user_id,
      username,
      media_type,
      tmdb_id,
      media_title,
      request_status,
      error_message,
      ip_address,
      user_agent
    } = logData;
    
    const [result] = await pool.execute(
      `INSERT INTO request_logs 
        (user_id, username, media_type, tmdb_id, media_title, request_status, 
         error_message, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, username, media_type, tmdb_id, media_title, request_status || 'pending',
       error_message, ip_address, user_agent]
    );
    
    return result;
  } catch (error) {
    console.error('Error logging request:', error);
    throw error;
  }
}

// Decrease user credits
export async function decreaseUserCredits(userId) {
  try {
    const [result] = await pool.execute(
      'UPDATE users SET request_credits = request_credits - 1 WHERE id = ? AND request_credits > 0',
      [userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error decreasing credits:', error);
    throw error;
  }
}

// Reset monthly credits
export async function resetMonthlyCredits() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Reset credits for users where reset date is today or past
    await pool.execute(`
      UPDATE users 
      SET 
        request_credits = CASE 
          WHEN role = 'admin' THEN 999999
          WHEN role = 'reseller' THEN 25
          ELSE 5
        END,
        credits_reset_date = DATE_ADD(credits_reset_date, INTERVAL 1 MONTH)
      WHERE credits_reset_date <= ?
    `, [today]);
    
    console.log('✅ Monthly credits reset completed');
  } catch (error) {
    console.error('Error resetting monthly credits:', error);
    throw error;
  }
}

// Get user request logs
export async function getUserRequestLogs(userId, limit = 50) {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM request_logs 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );
    return rows;
  } catch (error) {
    console.error('Error getting request logs:', error);
    throw error;
  }
}

// Log login attempt
export async function logLoginAttempt(username, ipAddress, success) {
  try {
    await pool.execute(
      'INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)',
      [username, ipAddress, success]
    );
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
}

export default pool;
