const pool = require('../db');

const getAll = async () => {
  const { rows } = await pool.query('SELECT type, value FROM form_options ORDER BY value ASC');
  return rows;
};

const add = async (type, value) => {
  const { rows } = await pool.query(
    'INSERT INTO form_options (type, value) VALUES ($1, $2) RETURNING *',
    [type, value]
  );
  return rows[0];
};

const remove = async (type, value) => {
  await pool.query(
    'DELETE FROM form_options WHERE type = $1 AND value = $2',
    [type, value]
  );
};

module.exports = { getAll, add, remove };