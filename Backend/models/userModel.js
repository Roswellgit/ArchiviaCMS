const db = require('../db');

// Updated to fetch 'role'
exports.findByEmail = async (email) => {
  const { rows } = await db.query(
    // Make sure to add 'job_title' (or whatever your column name is) to this list!
    'SELECT id, first_name, role, last_name, email, password_hash, is_admin, is_super_admin, is_verified, otp_code, otp_expires, is_active, job_title FROM users WHERE email = $1',
    [email]
  );
  return rows[0];
};

// --- UPDATED ACCOUNT CREATION ---

exports.createAccount = async ({ firstName, lastName, email, passwordHash, role, groupId }) => {
  let isAdmin = false;
  let isSuperAdmin = false;
  let isAdviser = false;

  // Determine flags based on role
  switch (role) {
    case 'superadmin':
    case 'principal': // <--- MOVED 'principal' here if they are the "Owner"
      isSuperAdmin = true;
      isAdmin = true;
      break;
    
    // Admin Level roles
    case 'admin':
    case 'assistant_principal':
    case 'research_coordinator':
      isAdmin = true;
      break;
      
    case 'adviser':
      isAdviser = true;
      break;
      
    default:
      role = 'student';
      break;
  }

  // Ensure groupId is null if not provided (e.g. for admins)
  const groupValue = groupId || null;

  // Added group_id to the INSERT statement
  const { rows } = await db.query(
    `INSERT INTO users 
      (first_name, last_name, email, password_hash, role, is_admin, is_super_admin, is_adviser, is_verified, is_active, group_id) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, TRUE, $9) 
     RETURNING id, first_name, last_name, email, role, is_admin, is_super_admin, is_adviser`,
    [firstName, lastName, email, passwordHash, role, isAdmin, isSuperAdmin, isAdviser, groupValue]
  );
  return rows[0];
};

exports.createGroup = async (name, adviserId) => {
  const { rows } = await db.query(
    'INSERT INTO groups (name, adviser_id) VALUES ($1, $2) RETURNING *',
    [name, adviserId]
  );
  return rows[0];
};

// --- EXISTING METHODS (Updated to handle 'role' column default) ---

exports.createWithOTP = async ({ firstName, lastName, email, passwordHash, otp, otpExpires }) => {
  const { rows } = await db.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, otp_code, otp_expires, is_verified, is_active, role) 
     VALUES ($1, $2, $3, $4, $5, $6, FALSE, TRUE, 'student') 
     RETURNING id, first_name, last_name, email, is_admin, is_super_admin`,
    [firstName, lastName, email, passwordHash, otp, otpExpires]
  );
  return rows[0];
};

exports.create = async ({ firstName, lastName, email, passwordHash }) => {
  const { rows } = await db.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, is_active, role) 
     VALUES ($1, $2, $3, $4, TRUE, 'student') 
     RETURNING id, first_name, last_name, email, is_admin, is_super_admin`,
    [firstName, lastName, email, passwordHash]
  );
  return rows[0];
};

exports.markVerified = async (userId) => {
  await db.query(
    'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires = NULL WHERE id = $1', 
    [userId]
  );
};

// Updated to fetch 'role'
exports.findAll = async () => {
  const { rows } = await db.query('SELECT id, first_name, last_name, email, role, is_admin, is_super_admin, is_adviser, is_verified, is_active, archive_requested FROM users ORDER BY last_name');
  return rows;
};

exports.updateAdminStatus = async (userId, isAdminBoolean) => {
  // If making admin, we might default role to 'admin' if it was 'student'
  const { rows } = await db.query(
    'UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, first_name, last_name, email, is_admin',
    [isAdminBoolean, userId]
  );
  return rows[0];
};

exports.updateUserDetails = async (userId, { first_name, last_name, email, is_admin }) => {
  const { rows } = await db.query(
    `UPDATE users 
     SET first_name = $1, last_name = $2, email = $3, is_admin = $4 
     WHERE id = $5 
     RETURNING id, first_name, last_name, email, role, is_admin, is_active`,
    [first_name, last_name, email, is_admin, userId]
  );
  return rows[0];
};

exports.updateProfile = async (userId, { firstName, lastName, email }) => {
  const { rows } = await db.query(
    `UPDATE users 
     SET first_name = $1, last_name = $2, email = $3
     WHERE id = $4 
     RETURNING id, first_name, last_name, email, role, is_admin`,
    [firstName, lastName, email, userId]
  );
  return rows[0];
};

exports.deactivate = async (userId) => {
  const { rows } = await db.query(
    'UPDATE users SET is_active = FALSE, archive_requested = FALSE, archive_reason = NULL WHERE id = $1 RETURNING id', 
    [userId]
  );
  return rows[0];
};

exports.deletePermanently = async (userId) => {
  const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [userId]);
  return rowCount;
};

exports.reactivate = async (userId) => {
  const { rows } = await db.query(
    'UPDATE users SET is_active = TRUE WHERE id = $1 RETURNING id', 
    [userId]
  );
  return rows[0];
};

exports.submitArchiveRequest = async (id, reason) => {
  const { rows } = await db.query(
    'UPDATE users SET archive_requested = TRUE, archive_reason = $1 WHERE id = $2 RETURNING id',
    [reason, id]
  );
  return rows[0];
};

exports.findAllArchiveRequests = async () => {
  const { rows } = await db.query(
    'SELECT id, first_name, last_name, email, role, archive_reason FROM users WHERE archive_requested = TRUE ORDER BY last_name'
  );
  return rows;
};

exports.revokeArchiveRequest = async (id) => {
  const { rows } = await db.query(
    'UPDATE users SET archive_requested = FALSE, archive_reason = NULL WHERE id = $1 RETURNING id',
    [id]
  );
  return rows[0];
};

exports.createGoogleUser = async ({ email, firstName, lastName, passwordHash }) => {
  const { rows } = await db.query(
    `INSERT INTO users 
     (first_name, last_name, email, password_hash, is_verified, is_active, role) 
     VALUES ($1, $2, $3, $4, TRUE, TRUE, 'student') 
     RETURNING id, first_name, last_name, email, is_admin`,
    [firstName, lastName, email, passwordHash] 
  );
  return rows[0];
};

exports.saveResetToken = async (email, token, expires) => {
  await db.query(
    'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
    [token, expires, email]
  );
};

exports.findByResetToken = async (token) => {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
    [token]
  );
  return rows[0];
};

exports.updatePassword = async (userId, passwordHash) => {
  await db.query(
    'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
    [passwordHash, userId]
  );
};

// Updated to fetch 'role'
exports.findById = async (id) => {
  const { rows } = await db.query(
    'SELECT id, first_name, last_name, email, role, is_admin, is_super_admin, is_active FROM users WHERE id = $1', 
    [id]
  );
  return rows[0];
};

exports.savePendingUpdate = async (userId, updateData, otp, expiry) => {
  const query = `
    UPDATE users 
    SET update_otp = $1, update_otp_expires = $2, pending_update_data = $3 
    WHERE id = $4
  `;
  await db.query(query, [otp, expiry, JSON.stringify(updateData), userId]);
};

exports.getPendingUpdate = async (userId) => {
  const query = 'SELECT update_otp, update_otp_expires, pending_update_data FROM users WHERE id = $1';
  const { rows } = await db.query(query, [userId]);
  return rows[0];
};

exports.clearPendingUpdate = async (userId) => {
  const query = `
    UPDATE users 
    SET update_otp = NULL, update_otp_expires = NULL, pending_update_data = NULL 
    WHERE id = $1
  `;
  await db.query(query, [userId]);
};

exports.applyUserUpdate = async (userId, data) => {
  const fields = [];
  const values = [];
  let index = 1;

  if (data.firstName) {
    fields.push(`first_name = $${index++}`);
    values.push(data.firstName);
  }
  if (data.lastName) {
    fields.push(`last_name = $${index++}`);
    values.push(data.lastName);
  }
  if (data.email) {
    fields.push(`email = $${index++}`);
    values.push(data.email);
  }
  if (data.password_hash) {
    fields.push(`password_hash = $${index++}`);
    values.push(data.password_hash);
  }

  if (fields.length === 0) return;

  values.push(userId);
  const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${index}`;
  
  await db.query(query, values);
};

// Add this helper function to check for existing students in a group
exports.checkGroupHasStudent = async (groupId) => {
  const { rows } = await db.query(
    `SELECT id FROM users WHERE group_id = $1 AND role = 'student'`, 
    [groupId]
  );
  return rows.length > 0; // Returns true if a student exists
};