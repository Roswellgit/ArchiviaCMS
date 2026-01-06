const db = require('../db');

// --- 1. EXISTING SEARCH LOGGING ---
exports.logSearch = async (term) => {
  if (!term || term.trim() === '') return;
  
  const cleanTerm = term.trim().toLowerCase();
  
  const query = `
    INSERT INTO search_analytics (term, count, last_searched_at)
    VALUES ($1, 1, NOW())
    ON CONFLICT (term) 
    DO UPDATE SET 
      count = search_analytics.count + 1, 
      last_searched_at = NOW();
  `;
  
  try {
    await db.query(query, [cleanTerm]);
  } catch (err) {
    console.error("Error logging search:", err.message);
  }
};

exports.getTopSearches = async (limit = 5) => {
  try {
    const { rows } = await db.query(
      'SELECT term, count FROM search_analytics ORDER BY count DESC LIMIT $1',
      [limit]
    );
    return rows;
  } catch (err) {
    console.error("Error getting top searches:", err.message);
    return [];
  }
};

// --- 2. NEW: ANALYTICS BY USER ATTRIBUTES ---

// Groups approved documents based on the Uploader's Strand
exports.getDocumentsByStrand = async () => {
  try {
    const query = `
      SELECT u.strand, COUNT(d.id) as count
      FROM documents d
      JOIN users u ON d.user_id = u.id
      WHERE d.status = 'approved' AND u.strand IS NOT NULL
      GROUP BY u.strand
      ORDER BY count DESC
    `;
    const { rows } = await db.query(query);
    return rows;
  } catch (err) {
    console.error("Error getting documents by strand:", err.message);
    return [];
  }
};

// Groups approved documents based on the Uploader's Year Level
exports.getDocumentsByYearLevel = async () => {
  try {
    const query = `
      SELECT u.year_level, COUNT(d.id) as count
      FROM documents d
      JOIN users u ON d.user_id = u.id
      WHERE d.status = 'approved' AND u.year_level IS NOT NULL
      GROUP BY u.year_level
      ORDER BY u.year_level ASC
    `;
    const { rows } = await db.query(query);
    return rows;
  } catch (err) {
    console.error("Error getting documents by year level:", err.message);
    return [];
  }
};

// --- 3. NEW: ANALYTICS BY DOCUMENT ATTRIBUTES ---

// Groups approved documents by Subject (Requires 'subject' column in documents table)
exports.getDocumentsBySubject = async () => {
  try {
    // Note: Ensure your 'documents' table has a 'subject' column. 
    // If not, run: ALTER TABLE documents ADD COLUMN subject VARCHAR(255);
    const query = `
      SELECT subject, COUNT(*) as count
      FROM documents
      WHERE status = 'approved' AND subject IS NOT NULL
      GROUP BY ai_keywords
      ORDER BY count DESC
      LIMIT 10
    `;
    const { rows } = await db.query(query);
    return rows;
  } catch (err) {
    // Fail silently or return empty if column doesn't exist yet
    console.error("Error getting documents by subject (Check if column exists):", err.message);
    return [];
  }
};

// Bonus: Uploads over the last 6 months
exports.getUploadTrends = async () => {
  try {
    const query = `
      SELECT TO_CHAR(upload_date, 'Mon') as month, COUNT(*) as count
      FROM documents
      WHERE upload_date > CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(upload_date, 'Mon'), DATE_TRUNC('month', upload_date)
      ORDER BY DATE_TRUNC('month', upload_date)
    `;
    const { rows } = await db.query(query);
    return rows;
  } catch (err) {
    console.error("Error getting upload trends:", err.message);
    return [];
  }
};

exports.getMostViewedDocuments = async () => {
  const { rows } = await db.query(
    `SELECT title, views, year_level 
     FROM documents 
     WHERE status = 'approved' 
     ORDER BY views DESC 
     LIMIT 5`
  );
  return rows;
};

exports.getFailedSearches = async () => {
  // Returns terms where the system returned 0 documents
  const { rows } = await db.query(
    `SELECT term, count FROM search_analytics WHERE avg_results_found = 0 ORDER BY count DESC LIMIT 10`
  );
  return rows;
};

exports.getActivityHeatmap = async () => {
  const { rows } = await db.query(`
    SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
    FROM search_analytics
    GROUP BY hour
    ORDER BY hour ASC
  `);
  return rows;
};

exports.getKeywordTrends = async () => {
  // This is a bit complex in SQL, essentially splitting strings by comma and counting
  // Simplest version if keywords are a text string "tag1, tag2":
  const { rows } = await db.query(`
    SELECT unnest(string_to_array(ai_keywords, ',')) as tag, COUNT(*) 
    FROM documents 
    WHERE status = 'approved' 
    GROUP BY tag 
    ORDER BY count DESC 
    LIMIT 15
  `);
  return rows;
};