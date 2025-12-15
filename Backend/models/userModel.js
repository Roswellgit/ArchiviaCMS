const db = require('../db');

exports.findByEmail = async (email) => {
  const { rows } = await db.query(
    'SELECT id, first_name, last_name, email, password_hash, is_admin, is_super_admin, is_verified, otp_code, otp_expires, is_active FROM users WHERE email = $1', 
    [email]
  );
  return rows[0];
};

exports.createWithOTP = async ({ firstName, lastName, email, passwordHash, otp, otpExpires }) => {
  const { rows } = await db.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, otp_code, otp_expires, is_verified, is_active) 
     VALUES ($1, $2, $3, $4, $5, $6, FALSE, TRUE) 
     RETURNING id, first_name, last_name, email, is_admin, is_super_admin`,
    [firstName, lastName, email, passwordHash, otp, otpExpires]
  );
  return rows[0];
};

exports.create = async ({ firstName, lastName, email, passwordHash }) => {
  const { rows } = await db.query(
    'INSERT INTO users (first_name, last_name, email, password_hash, is_active) VALUES ($1, $2, $3, $4, TRUE) RETURNING id, first_name, last_name, email, is_admin, is_super_admin',
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

exports.findAll = async () => {
  const { rows } = await db.query('SELECT id, first_name, last_name, email, is_admin, is_super_admin, is_verified, is_active, archive_requested FROM users ORDER BY last_name');
  return rows;
};

exports.updateAdminStatus = async (userId, isAdminBoolean) => {
  const { rows } = await db.query(
    'UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, first_name, last_name, email, is_admin, is_super_admin',
    [isAdminBoolean, userId]
  );
  return rows[0];
};

exports.updateUserDetails = async (userId, { first_name, last_name, email, is_admin }) => {
  const { rows } = await db.query(
    `UPDATE users 
     SET first_name = $1, last_name = $2, email = $3, is_admin = $4 
     WHERE id = $5 
     RETURNING id, first_name, last_name, email, is_admin, is_active, is_super_admin`,
    [first_name, last_name, email, is_admin, userId]
  );
  return rows[0];
};

exports.updateProfile = async (userId, { firstName, lastName, email }) => {
  const { rows } = await db.query(
    `UPDATE users 
     SET first_name = $1, last_name = $2, email = $3
     WHERE id = $4 
     RETURNING id, first_name, last_name, email, is_admin, is_active, is_super_admin`,
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
    'SELECT id, first_name, last_name, email, archive_reason FROM users WHERE archive_requested = TRUE ORDER BY last_name'
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
     (first_name, last_name, email, password_hash, is_verified, is_active) 
     VALUES ($1, $2, $3, $4, TRUE, TRUE) 
     RETURNING id, first_name, last_name, email, is_admin, is_super_admin`,
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

exports.findById = async (id) => {
  const { rows } = await db.query(
    'SELECT id, first_name, last_name, email, is_admin, is_super_admin, is_active FROM users WHERE id = $1', 
    [id]
  );
  return rows[0];
};