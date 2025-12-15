const db = require('../db');

exports.logSearch = async (term) => {
  if (!term || term.trim() === '') return;
  
  const cleanTerm = term.trim().toLowerCase();
  
  
  const query = `
    INSERT INTO search_analytics (term, count, last_searched_at)
    VALUES ($1, 1, NOW())
    ON CONFLICT (term) 
    DO UPDATE SET count = search_analytics.count + 1, last_searched_at = NOW()
  `;
  
  try {
    await db.query(query, [cleanTerm]);
  } catch (err) {
    console.error("Error logging search:", err.message);
  }
};

exports.getTopSearches = async (limit = 5) => {
  const { rows } = await db.query(
    'SELECT term, count FROM search_analytics ORDER BY count DESC LIMIT $1',
    [limit]
  );
  return rows;
};