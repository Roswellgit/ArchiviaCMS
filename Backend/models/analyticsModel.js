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
    // FIX: Joined 'student_profiles' (sp) to find 'strand'
    const query = `
      SELECT sp.strand, COUNT(d.id) as count
      FROM documents d
      JOIN student_profiles sp ON d.user_id = sp.user_id
      WHERE d.status = 'approved' AND sp.strand IS NOT NULL
      GROUP BY sp.strand
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
    // FIX: Joined 'student_profiles' (sp) to find 'year_level'
    const query = `
      SELECT sp.year_level, COUNT(d.id) as count
      FROM documents d
      JOIN student_profiles sp ON d.user_id = sp.user_id
      WHERE d.status = 'approved' AND sp.year_level IS NOT NULL
      GROUP BY sp.year_level
      ORDER BY sp.year_level ASC
    `;
    const { rows } = await db.query(query);
    return rows;
  } catch (err) {
    console.error("Error getting documents by year level:", err.message);
    return [];
  }
};

// --- 3. NEW: ANALYTICS BY DOCUMENT ATTRIBUTES ---

// Groups approved documents by Subject
exports.getDocumentsBySubject = async () => {
  try {
    // Note: Ensure your 'documents' table has a 'subject' column.
    const query = `
      SELECT subject, COUNT(*) as count
      FROM documents
      WHERE status = 'approved' AND subject IS NOT NULL
      GROUP BY subject
      ORDER BY count DESC
      LIMIT 10
    `;
    const { rows } = await db.query(query);
    return rows;
  } catch (err) {
    console.error("Error getting documents by subject:", err.message);
    return [];
  }
};

// Bonus: Uploads over the last 6 months
exports.getUploadTrends = async () => {
  try {
    // FIX: Swapped to 'created_at' to match your schema
    const query = `
      SELECT TO_CHAR(created_at, 'Mon') as month, COUNT(*) as count
      FROM documents
      WHERE status = 'approved' 
      AND created_at > CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `;
    const { rows } = await db.query(query);
    return rows;
  } catch (err) {
    console.error("Error getting upload trends:", err.message);
    return [];
  }
};

exports.getMostViewedDocuments = async () => {
  try {
    // FIX: Removed 'year_level' from SELECT because documents table doesn't have it
    const { rows } = await db.query(
        `SELECT title, views 
         FROM documents 
         WHERE status = 'approved' 
         ORDER BY views DESC 
         LIMIT 5`
    );
    return rows;
  } catch (err) {
    console.error("Error getting most viewed:", err.message);
    return [];
  }
};

exports.getFailedSearches = async () => {
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
  try {
    // FIX: Using jsonb_array_elements_text because ai_keywords is JSONB
    const query = `
      SELECT term, COUNT(*) as count
      FROM documents, jsonb_array_elements_text(ai_keywords) as term
      WHERE status = 'approved'
      GROUP BY term
      ORDER BY count DESC
      LIMIT 15
    `;
    const { rows } = await db.query(query);
    return rows;
  } catch (err) {
    console.error("Error getting keyword trends:", err.message);
    return [];
  }
};