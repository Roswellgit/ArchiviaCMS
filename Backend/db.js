const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

if (!process.env.DATABASE_URL) {
    // Fallback for local development if DATABASE_URL is not set
    // This preserves your original local config if you don't use the URL string
    pool.options = {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    };
}

module.exports = {
  query: (text, params) => pool.query(text, params),
};