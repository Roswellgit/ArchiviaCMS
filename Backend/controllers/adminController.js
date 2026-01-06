const path = require('path');
const bcrypt = require('bcrypt'); 
const userModel = require('../models/userModel');
const documentModel = require('../models/documentModel');
const analyticsModel = require('../models/analyticsModel');
const settingsModel = require('../models/settingsModel');
const fileUploadService = require('../services/fileUploadService');
const s3Service = require('../services/s3Service');
const optionModel = require('../models/optionModel');
const emailService = require('../services/emailService');

const pool = require('../db');

// --- HIERARCHICAL CREATION ---

// --- HIERARCHICAL CREATION (Fixed for Pre-Verification) ---

exports.createAccount = async (req, res) => {
  const client = await pool.connect(); // Use transaction for safety
  try {
    const { firstName, lastName, email, password, role, studentProfile } = req.body;
    const requester = req.user; 

    // 1. Basic Validation
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // 2. Permission Logic (Preserved from your code)
    // Students cannot create accounts
    if (!requester.is_admin && !requester.is_super_admin && !requester.is_adviser) {
        return res.status(403).json({ message: 'Permission denied.' });
    }
    // Advisers: Can ONLY create Students
    if (requester.is_adviser && !requester.is_admin && !requester.is_super_admin) {
        if (role !== 'Student') { // Note: Capitalized 'Student' to match your DB options
            return res.status(403).json({ message: 'Advisers can only create Student accounts.' });
        }
    }
    // Admins: Cannot create other Admins/Super Admins
    if (requester.is_admin && !requester.is_super_admin) {
        const restrictedRoles = ['Admin', 'Super Admin'];
        if (restrictedRoles.includes(role)) {
            return res.status(403).json({ message: 'Admins cannot create other Admin-level accounts.' });
        }
    }

    await client.query('BEGIN'); // Start Transaction

    // 3. Check for Existing Email
    const emailCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'User already exists with this email.' });
    }

    // 4. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Determine Boolean Flags based on Role String
    // This maintains backward compatibility with your is_admin/is_super_admin columns
    const isSuperAdmin = role === 'Super Admin';
    const isAdmin = role === 'Admin' || isSuperAdmin;
    const isAdviser = role === 'Advisor' || role === 'Teacher'; // Adjust based on your preferences

    // 6. Insert User (PRE-VERIFIED: is_active=true, is_verified=true)
    const insertUserQuery = `
      INSERT INTO users (
        first_name, last_name, email, password_hash, 
        role, is_admin, is_super_admin, is_adviser, 
        is_active, is_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true) 
      RETURNING id, email, role
    `;
    
    const userResult = await client.query(insertUserQuery, [
      firstName, 
      lastName, 
      email, 
      hashedPassword, 
      role, 
      isAdmin, 
      isSuperAdmin, 
      isAdviser
    ]);

    const newUserId = userResult.rows[0].id;

    // 7. Handle Student Profile (if applicable)
    // Only insert if role is Student AND we have profile data
    if (role === 'Student' && studentProfile) {
      const { yearLevel, strand } = studentProfile;
      // Ensure we treat 'undefined' strand as NULL or empty string
      await client.query(
        `INSERT INTO student_profiles (user_id, year_level, strand) VALUES ($1, $2, $3)`,
        [newUserId, yearLevel, strand || '']
      );
    }

    await client.query('COMMIT'); // Commit Transaction

    emailService.sendWelcomeEmail(email, firstName, password);

    res.status(201).json({
      message: `${role} created successfully.`,
      user: userResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating account:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    client.release();
  }
};

exports.createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    const requester = req.user;

    if (!requester.is_adviser && !requester.is_admin && !requester.is_super_admin) {
        return res.status(403).json({ message: 'Only Advisers or Admins can create groups.' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Group name is required.' });
    }

    const newGroup = await userModel.createGroup(name, requester.id);

    res.status(201).json({ message: 'Group created successfully', group: newGroup });

  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ... (KEEP ALL EXISTING METHODS BELOW EXACTLY AS THEY WERE) ...
exports.getDashboardStats = async (req, res) => {
  try {
    const users = await userModel.findAll();
    const documents = await documentModel.findAll(true); 
    const topSearches = await analyticsModel.getTopSearches(5); 

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active).length;
    const totalDocuments = documents.length;
    
    const deletionRequests = documents.filter(d => d.deletion_requested).length;
    const archiveRequests = documents.filter(d => d.archive_requested).length;
    const userRequests = users.filter(u => u.archive_requested).length;
    const pendingDocs = documents.filter(d => d.status === 'pending').length;

    const pendingRequests = deletionRequests + archiveRequests + userRequests + pendingDocs;

    res.json({ totalUsers, activeUsers, totalDocuments, pendingRequests, topSearches });
  } catch (err) {
    console.error("Analytics Error:", err.message);
    res.status(500).send('Server error fetching stats');
  }
};

exports.getPendingDocuments = async (req, res) => {
  try {
    const docs = await documentModel.findPending();
    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pending documents' });
  }
};

exports.approveDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await documentModel.updateStatus(id, 'approved');
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json({ message: 'Document approved successfully', doc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve document' });
  }
};

exports.rejectDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await documentModel.updateStatus(id, 'rejected');
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json({ message: 'Document rejected', doc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject document' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await userModel.findAll();
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, is_admin } = req.body; 
    if (typeof is_admin !== 'boolean') return res.status(400).json({ message: 'Invalid admin status specified.' });

    const updatedUser = await userModel.updateUserDetails(id, { first_name, last_name, email, is_admin });
    if (!updatedUser) return res.status(404).json({ message: 'User not found.' });
    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    if (err.code === '23505') return res.status(400).json({ message: 'Email already in use.' });
    res.status(500).send('Server error');
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.query.permanent === 'true') {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ message: "Only Super Admins can permanently delete users." });
        }
        const deletedCount = await userModel.deletePermanently(id);
        if (deletedCount === 0) return res.status(404).json({ message: 'User not found.' });
        return res.json({ message: 'User permanently deleted.' });
    }
    
    if (req.user.is_super_admin) {
        const deactivatedUser = await userModel.deactivate(id);
        if (!deactivatedUser) return res.status(404).json({ message: 'User not found.' });
        return res.json({ message: 'User deactivated successfully.' });
    }

    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: "Reason required for archiving request." });

    const requestedUser = await userModel.submitArchiveRequest(id, reason);
    if (!requestedUser) return res.status(404).json({ message: 'User not found.' });

    res.json({ message: 'User archive request submitted to Super Admin.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const reactivatedUser = await userModel.reactivate(id);
    if (!reactivatedUser) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User reactivated successfully.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getUserArchiveRequests = async (req, res) => {
  try {
    const requests = await userModel.findAllArchiveRequests();
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.approveUserArchive = async (req, res) => {
  try {
    if (!req.user.is_super_admin) return res.status(403).json({ message: "Access Denied." });
    const { id } = req.params;
    const user = await userModel.deactivate(id);
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ message: "User archive request approved." });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.rejectUserArchive = async (req, res) => {
  try {
    if (!req.user.is_super_admin) return res.status(403).json({ message: "Access Denied." });
    const { id } = req.params;
    await userModel.revokeArchiveRequest(id);
    res.json({ message: "User archive request rejected." });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.adminUpdateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, ai_authors, ai_date_created } = req.body;
    const updatedDoc = await documentModel.adminUpdate(id, { title, ai_authors, ai_date_created });
    if (!updatedDoc) return res.status(404).json({ message: "Document not found." });
    res.json(updatedDoc);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.adminDeleteDocument = async (req, res) => {
  try {
    if (!req.user.is_super_admin) return res.status(403).json({ message: "Only Super Admins can permanently delete documents." });
    const { id } = req.params;
    const file = await documentModel.adminFindFileById(id);
    if (!file) return res.status(404).json({ message: "Document not found." });
    const deletedCount = await documentModel.adminDeleteById(id);
    if (deletedCount > 0) {
      await s3Service.deleteFromS3(file.filename); 
      res.json({ message: `Document '${file.filename}' deleted successfully.` });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.adminRequestArchive = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ message: "Reason required." });
        const archivedDoc = await documentModel.submitArchiveRequest(id, reason);
        if (!archivedDoc) return res.status(404).json({ message: "Document not found." });
        res.json({ message: "Document has been flagged for archive review." });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.restoreDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await documentModel.revokeArchiveRequest(id);
    if (!result) return res.status(404).json({ message: "Document not found." });
    res.json({ message: "Document restored successfully." });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getArchiveRequests = async (req, res) => {
  try {
    const requests = await documentModel.findAllArchiveRequests();
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.approveArchive = async (req, res) => {
  try {
    if (!req.user.is_super_admin) return res.status(403).json({ message: "Access Denied. Only Super Admins can approve archives." });
    const { id } = req.params;
    const file = await documentModel.adminFindFileById(id);
    if (!file) return res.status(404).json({ message: "Document not found." });
    const deletedCount = await documentModel.adminDeleteById(id);
    if (deletedCount > 0) {
      await s3Service.deleteFromS3(file.filename);
      res.json({ message: "Archive request approved. Document permanently deleted." });
    }
  } catch (err) {
    console.error("Approve Archive Error:", err);
    res.status(500).send('Server error');
  }
};

exports.rejectArchive = async (req, res) => {
  try {
    if (!req.user.is_super_admin) return res.status(403).json({ message: "Access Denied." });
    const { id } = req.params;
    await documentModel.revokeArchiveRequest(id);
    res.json({ message: "Archive request rejected." });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.getDeletionRequests = async (req, res) => {
  try {
    const requests = await documentModel.findAllDeletionRequests();
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.approveDeletion = async (req, res) => {
  try {
    if (!req.user.is_super_admin) return res.status(403).json({ message: "Only Super Admins can approve deletions." });
    const { id } = req.params;
    const file = await documentModel.adminFindFileById(id);
    if (!file) return res.status(404).json({ message: "Document not found." });
    const deletedCount = await documentModel.adminDeleteById(id);
    if (deletedCount > 0) {
      await s3Service.deleteFromS3(file.filename);
      res.json({ message: "Deletion request approved. Document deleted." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.rejectDeletion = async (req, res) => {
  try {
    if (!req.user.is_super_admin) return res.status(403).json({ message: "Access Denied." });
    const { id } = req.params;
    await documentModel.revokeDeletionRequest(id);
    res.json({ message: "Request rejected. Document kept." });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const newSettings = req.body;
    const updatedSettingsArray = await settingsModel.updateSettings(newSettings);
    const settingsObject = updatedSettingsArray.reduce((acc, item) => {
      acc[item.setting_key] = item.setting_value;
      return acc;
    }, {});
    res.json(settingsObject);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error updating settings');
  }
};

exports.resetSettings = async (req, res) => {
  try {
    const defaultSettingsArray = await settingsModel.resetToDefault();
    const settingsObject = defaultSettingsArray.reduce((acc, item) => {
      acc[item.setting_key] = item.setting_value;
      return acc;
    }, {});
    res.json(settingsObject);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error resetting settings');
  }
};

exports.uploadIcon = (req, res) => {
  fileUploadService.uploadIcon.single('icon')(req, res, async function (err) {
    if (err) return res.status(400).json({ message: err.message || 'Upload error' });
    if (!req.file) return res.status(400).send('An icon file is required.');
    try {
      const filename = `favicon-${Date.now()}${path.extname(req.file.originalname)}`;
      await s3Service.uploadToS3(req.file, filename, true);   
      res.status(200).json({ message: 'Icon uploaded to S3.' });
    } catch (dbErr) {
      console.error(dbErr);
      res.status(500).json({ message: 'Failed to upload icon to S3.'});
    }
  });
};

exports.uploadBgImage = (req, res) => {
  fileUploadService.uploadBgImage.single('bg-image')(req, res, async function (err) {
    if (err) return res.status(400).json({ message: err.message || 'Upload error' });
    if (!req.file) return res.status(400).send('An image file is required.');
    try {
      const filename = `system-background-${Date.now()}${path.extname(req.file.originalname)}`;
      const imageUrl = await s3Service.uploadToS3(req.file, filename, true); 
      await settingsModel.updateSettings({ backgroundImage: `url(${imageUrl})` });
      res.status(200).json({ message: 'Background image updated!', imageUrl: `url(${imageUrl})` });
    } catch (dbErr) {
      console.error(dbErr);
      res.status(500).json({ message: 'Failed to save background image.'});
    }
  });
};

exports.uploadBrandIcon = (req, res) => {
  fileUploadService.uploadBrandIcon.single('brand-icon')(req, res, async function (err) {
    if (err) return res.status(400).json({ message: err.message || 'Upload error' });
    if (!req.file) return res.status(400).send('An icon file is required.');
    try {
      const filename = `brand-icon-${Date.now()}${path.extname(req.file.originalname)}`;
      const iconUrl = await s3Service.uploadToS3(req.file, filename, true);
      await settingsModel.updateSettings({ brandIconUrl: `url(${iconUrl})` });
      res.status(200).json({ message: 'Brand icon updated!', iconUrl: `url(${iconUrl})` });
    } catch (dbErr) {
      console.error(dbErr);
      res.status(500).json({ message: 'Failed to save brand icon.'});
    }
  });
};

exports.removeBgImage = async (req, res) => {
  try {
    await settingsModel.updateSettings({ backgroundImage: 'none' });
    res.status(200).json({ message: 'Background image removed.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove background image.' });
  }
};

exports.removeBrandIcon = async (req, res) => {
  try {
    await settingsModel.updateSettings({ brandIconUrl: 'none' });
    res.status(200).json({ message: 'Brand icon removed.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove brand icon.' });
  }
};

exports.getPendingDocuments = async (req, res) => {
  try {
    const docs = await documentModel.findPending();
    res.json(docs);
  } catch (err) {
    console.error("Error fetching pending docs:", err.message);
    res.status(500).send('Server error');
  }
};

exports.approveDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await documentModel.updateStatus(id, 'approved');
    if (!updated) return res.status(404).json({ message: "Document not found" });
    res.json({ message: "Document approved successfully." });
  } catch (err) {
    console.error("Error approving document:", err.message);
    res.status(500).send('Server error');
  }
};

exports.rejectDocument = async (req, res) => {
  try {
    const { id } = req.params;
    // You can delete it or set status to 'rejected'
    const updated = await documentModel.updateStatus(id, 'rejected'); 
    if (!updated) return res.status(404).json({ message: "Document not found" });
    res.json({ message: "Document rejected." });
  } catch (err) {
    console.error("Error rejecting document:", err.message);
    res.status(500).send('Server error');
  }
};

exports.getFormOptions = async (req, res) => {
  try {
    // UPDATED QUERY: Order by Type first, then by Value (Alphabetical)
    // If you want them sorted by when you added them, change 'value ASC' to 'id ASC'
    const query = `SELECT * FROM form_options ORDER BY type, value ASC`;
    
    const { rows } = await pool.query(query);
    
    // Transform flat DB rows into grouped object
    const grouped = rows.reduce((acc, item) => {
      const key = item.type + 's'; // e.g., 'roles', 'strands'
      if (!acc[key]) acc[key] = [];
      acc[key].push(item.value);
      return acc;
    }, { roles: [], strands: [], yearLevels: [] });

    // OPTIONAL: Custom Sort for Year Levels (Because "Grade 10" comes before "Grade 2" alphabetically)
    if (grouped.yearLevels) {
        grouped.yearLevels.sort((a, b) => {
            // Extract the number from "Grade 7"
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
    }

    res.json(grouped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching options' });
  }
};

exports.addFormOption = async (req, res) => {
  try {
    const { type, value } = req.body;
    if (!type || !value) return res.status(400).json({ message: 'Type and Value required' });
    
    await optionModel.add(type, value);
    res.status(201).json({ message: 'Option added' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Option already exists' });
    res.status(500).json({ message: 'Error adding option' });
  }
};

exports.deleteFormOption = async (req, res) => {
  try {
    const { type, value } = req.body;
    await optionModel.remove(type, value);
    res.json({ message: 'Option removed' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting option' });
  }
};