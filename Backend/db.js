const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const useSSL = isProduction || process.env.DB_SSL === 'true';

const connectionString = process.env.DATABASE_URL;


if (!connectionString) {
  console.error('ERROR: DATABASE_URL is not defined in your environment variables.');
}

const pool = new Pool({
  connectionString: connectionString,

  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

module.exports = pool;