
const db = require('../db');


exports.getSettings = async () => {
  const { rows } = await db.query('SELECT setting_key, setting_value FROM system_settings');
  return rows;
};


exports.updateSettings = async (settingsObject) => {
  console.log('[Backend Model] Starting to update settings...'); 

  const promises = Object.entries(settingsObject).map(([key, value]) => {
    return db.query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES ($1, $2)
       ON CONFLICT (setting_key) DO UPDATE
       SET setting_value = $2`,
      [key, value]
    );
  });
  
  const results = await Promise.allSettled(promises);
  
  results.forEach(result => {
    if (result.status === 'rejected') {
      console.error("A database query failed:", result.reason);
    }
  });
  
  console.log('[Backend Model] Settings updated. Fetching new settings...'); 
  
  return exports.getSettings();
};

exports.resetToDefault = async () => {
  await db.query('TRUNCATE TABLE system_settings');

  await db.query(
    `INSERT INTO system_settings (setting_key, setting_value) VALUES
      ('backgroundColor', '#ffffff'),
      ('foregroundColor', '#171717'),
      ('navbarBrandText', 'Archivia'),
      ('navbarBgColor', '#1e293b'),
      ('navbarTextColor', '#ffffff'),
      ('navbarLinkColor', '#ffffff'),
      ('navbarBrandFont', 'var(--font-geist-sans)'),
      ('navbarBrandSize', '1.5rem'),
      ('navbarBrandWeight', '700'),
      ('backgroundImage', 'none'),
      ('brandIconUrl', 'none')`
  );
  return exports.getSettings();
};