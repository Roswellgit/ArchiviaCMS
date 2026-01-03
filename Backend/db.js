const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionString = process.env.DATABASE_URL;

// Check if DATABASE_URL is missing to prevent obscure errors
if (!connectionString) {
  console.error('ERROR: DATABASE_URL is not defined in your environment variables.');
}

const pool = new Pool({
  connectionString: connectionString,
  // Neon requires SSL. We use rejectUnauthorized: false to allow the connection 
  // without manually bundling the CA certificate, which is standard for this setup.
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

module.exports = pool;