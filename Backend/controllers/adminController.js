const path = require('path');
const bcrypt = require('bcrypt'); 
const userModel = require('../models/userModel');
const documentModel = require('../models/documentModel');
const analyticsModel = require('../models/analyticsModel');
const settingsModel = require('../models/settingsModel');
const fileUploadService = require('../services/fileUploadService');
const s3Service = require('../services/s3Service');
const optionModel = require('../models/optionModel');
const emailService = require('../services/emailService'); // ✅ Ensure imported
const aiService = require('../services/aiService');
const pool = require('../db');

// ✅ HELPER: Generate Secure Random Password
const generateSecurePassword = (length = 12) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  // Ensure strict requirements are met
  password += "A"; 
  password += "a"; 
  password += "1"; 
  password += "!"; 
  
  // Fill the rest randomly
  for (let i = 0; i < length - 4; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// ==========================================
// 1. ACCOUNT & GROUP CREATION
// ==========================================

exports.createAccount = async (req, res) => {
  const client = await pool.connect(); 
  try {
    const { firstName, lastName, email, role, accessLevel, schoolId, studentProfile, groupId } = req.body;
    const requester = req.user; 

    if (!firstName || !lastName || !email || !accessLevel || !schoolId) {
      return res.status(400).json({ message: 'All fields (including ID) are required' });
    }

    const tempPassword = generateSecurePassword();
    const password = tempPassword; 

    let finalRole = role;
    if (requester.is_super_admin) {
        if (accessLevel !== 'Admin') return res.status(403).json({ message: 'Super Admins are only authorized to create Admin accounts.' });
        finalRole = 'admin';
    } else if (requester.is_admin) {
        if (accessLevel !== 'Advisor') return res.status(403).json({ message: 'Admins are only authorized to create Advisor accounts.' });
        finalRole = 'adviser';
    } else if (requester.is_adviser) {
        if (accessLevel !== 'Student') return res.status(403).json({ message: 'Advisors are only authorized to create Student accounts.' });
        finalRole = 'student';
    } else {
        return res.status(403).json({ message: 'Permission denied.' });
    }

    await client.query('BEGIN'); 

    const emailCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'User already exists with this email.' });
    }

    const idCheck = await client.query('SELECT id FROM users WHERE school_id = $1', [schoolId]);
    if (idCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: `The ID '${schoolId}' is already in use by another user.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isSuperAdminFlag = finalRole === 'superadmin';
    const isAdminFlag = finalRole === 'admin' || isSuperAdminFlag;
    const isAdviserFlag = finalRole === 'adviser';
    
    const insertUserQuery = `
      INSERT INTO users (
        first_name, last_name, email, password_hash, 
        role, is_admin, is_super_admin, is_adviser, 
        is_active, is_verified, school_id, group_id, force_password_change
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true, $9, $10, true) 
      RETURNING id, email, role
    `;
    
    const finalGroupId = (groupId && groupId !== '') ? groupId : null;

    const userResult = await client.query(insertUserQuery, [
      firstName, lastName, email, hashedPassword, finalRole, 
      isAdminFlag, isSuperAdminFlag, isAdviserFlag, schoolId, finalGroupId
    ]);

    const newUserId = userResult.rows[0].id;

    if (accessLevel === 'Student' && studentProfile) {
      const { yearLevel, strand, section } = studentProfile;
      await client.query(
        `INSERT INTO student_profiles (user_id, year_level, strand, section) VALUES ($1, $2, $3, $4)`,
        [newUserId, yearLevel, strand || '', section || '']
      );
    }

    await client.query('COMMIT'); 
    
    emailService.sendWelcomeEmail(email, firstName, password).catch(console.error);

    res.status(201).json({
      message: `Account created successfully as ${finalRole}.`,
      user: userResult.rows[0],
      tempPassword: tempPassword 
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
    const { name, adviserId } = req.body; 
    const requester = req.user;

    if (!requester.is_adviser && !requester.is_admin && !requester.is_super_admin) {
        return res.status(403).json({ message: 'Only Advisers or Admins can create groups.' });
    }

    if (!name) return res.status(400).json({ message: 'Group name is required.' });

    let finalAdviserId;
    if (requester.is_adviser) {
        finalAdviserId = requester.id;
    } else {
        finalAdviserId = adviserId || null; 
    }

    try {
        const newGroup = await userModel.createGroup(name, finalAdviserId);
        res.status(201).json({ message: 'Group created successfully', group: newGroup });
    } catch (modelErr) {
        if (modelErr.message === 'Group name already exists' || modelErr.code === '23505') {
            return res.status(409).json({ message: 'A group with this name already exists.' });
        }
        throw modelErr;
    }

  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getAllGroups = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM groups ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching groups' });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const requester = req.user;

    if (!requester.is_admin && !requester.is_super_admin) {
        return res.status(403).json({ message: "Only Admins can delete groups." });
    }

    const success = await userModel.deleteGroup(id);
    if (!success) return res.status(404).json({ message: "Group not found." });

    res.json({ message: "Group deleted successfully." });

  } catch (err) {
    console.error("Delete Group Error:", err);
    res.status(500).json({ message: "Server error deleting group." });
  }
};

// ==========================================
// 2. USER MANAGEMENT
// ==========================================

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

// ==========================================
// 3. DOCUMENT MANAGEMENT (UPDATED)
// ==========================================

exports.getPendingDocuments = async (req, res) => {
  try {
    // 1. Get raw documents from DB
    const docs = await documentModel.findPending();

    // 2. ✅ FIX: Generate Presigned S3 URLs for each document
    // This turns "documents/file.pdf" into a clickable "https://s3.amazonaws.com/..." link
    const docsWithLinks = await Promise.all(docs.map(async (doc) => {
        if (doc.filepath) {
            try {
                // Ensure s3Service is imported at the top of your file!
                const url = await s3Service.getPresignedUrl(doc.filepath);
                return { ...doc, downloadLink: url };
            } catch (e) {
                console.error(`Error signing URL for ${doc.filename}:`, e.message);
                return doc; 
            }
        }
        return doc;
    }));

    res.json(docsWithLinks);
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

    // ✅ NOTIFICATION: Notify User of Approval
    const owner = await userModel.getDocumentOwnerEmail(id);
    if (owner) {
        emailService.sendDocumentStatusUpdate(owner.email, owner.first_name, owner.title, 'approved')
            .catch(err => console.error("Email Error (Approval):", err.message));
    }

    res.json({ message: 'Document approved successfully', doc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve document' });
  }
};

// ✅ ROBUST REJECTION FUNCTION
exports.rejectDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 🛡️ SAFETY CHECK 1: Handle missing body to prevent crash
    const { reason } = req.body || {}; 

    // 1. Update status in DB
    const doc = await documentModel.updateStatus(id, 'rejected');
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // 2. Email Notification (Wrapped in its own try/catch so it doesn't crash the response)
    try {
        const owner = await userModel.getDocumentOwnerEmail(id);
        
        if (owner && owner.email) {
            await emailService.sendDocumentStatusUpdate(
                owner.email, 
                owner.first_name, 
                owner.title, 
                'rejected', 
                reason || 'No specific reason provided.'
            );
        } else {
            console.warn(`[Notification Warning] No owner found for doc ${id}, skipping email.`);
        }
    } catch (emailErr) {
        // Log error but DO NOT fail the request. The document is already rejected.
        console.error("Email/DB Notification Failed (Non-fatal):", emailErr.message);
    }

    res.json({ message: 'Document rejected successfully', doc });

  } catch (error) {
    console.error("Reject Document Fatal Error:", error); 
    res.status(500).json({ error: 'Failed to reject document' });
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

        // ✅ NOTIFICATION: Notify Super Admins
        const superAdminEmails = await userModel.getSuperAdminEmails();
        const doc = await documentModel.adminFindFileById(id); 
        
        emailService.sendSuperAdminRequestAlert(
            superAdminEmails, 
            'Archive', 
            doc ? doc.title : 'Unknown Document', 
            req.user.firstName,
            reason
        ).catch(err => console.error("Email Error (Archive Request):", err.message));

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

// ==========================================
// 4. REQUEST MANAGEMENT (UPDATED)
// ==========================================

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
    
    // Get info BEFORE deletion to send email
    const owner = await userModel.getDocumentOwnerEmail(id); 
    const file = await documentModel.adminFindFileById(id);
    
    if (!file) return res.status(404).json({ message: "Document not found." });
    
    const deletedCount = await documentModel.adminDeleteById(id);
    
    if (deletedCount > 0) {
      await s3Service.deleteFromS3(file.filename);
      
      // ✅ NOTIFICATION: Notify Owner
      if (owner) {
          emailService.sendRequestOutcome(owner.email, 'Archive', file.title, 'Approved and Completed')
            .catch(err => console.error("Email Error (Archive Approved):", err.message));
      }

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
    
    const owner = await userModel.getDocumentOwnerEmail(id);
    const file = await documentModel.adminFindFileById(id);
    
    if (!file) return res.status(404).json({ message: "Document not found." });
    
    const deletedCount = await documentModel.adminDeleteById(id);
    
    if (deletedCount > 0) {
      await s3Service.deleteFromS3(file.filename);
      
      // ✅ NOTIFICATION: Notify Owner
      if (owner) {
          emailService.sendRequestOutcome(owner.email, 'Deletion', file.title, 'Approved and Deleted')
            .catch(err => console.error("Email Error (Deletion Approved):", err.message));
      }

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

// ==========================================
// 5. ANALYTICS & DASHBOARD
// ==========================================

exports.getDashboardStats = async (req, res) => {
  try {
    const users = await userModel.findAll();
    const documents = await documentModel.findAll(true);

    const [
      topSearches,
      uploadTrend,
      topKeywords,
      documentsByStrand,
      documentsByYear
    ] = await Promise.all([
      analyticsModel.getTopSearches(5),
      analyticsModel.getUploadTrends(),        
      analyticsModel.getKeywordTrends(),       
      analyticsModel.getDocumentsByStrand(),
      analyticsModel.getDocumentsByYearLevel()
    ]);

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active).length;
    const totalDocuments = documents.length;
    
    const deletionRequests = documents.filter(d => d.deletion_requested).length;
    const archiveRequests = documents.filter(d => d.archive_requested).length;
    const userRequests = users.filter(u => u.archive_requested).length;
    const pendingDocs = documents.filter(d => d.status === 'pending').length;

    const pendingRequests = deletionRequests + archiveRequests + userRequests + pendingDocs;

    res.json({
      totalUsers,
      activeUsers,
      totalDocuments,
      pendingRequests,
      topSearches,
      uploadTrend,
      topKeywords,
      documentsByStrand,
      documentsByYear
    });

  } catch (err) {
    console.error("Analytics Error:", err.message);
    res.status(500).send('Server error fetching stats');
  }
};

exports.getAnalyticsAiInsight = async (req, res) => {
  try {
    const [
      users, documents, topSearches, uploadTrend, topKeywords
    ] = await Promise.all([
      userModel.findAll(),
      documentModel.findAll(true),
      analyticsModel.getTopSearches(5),
      analyticsModel.getUploadTrends(),
      analyticsModel.getKeywordTrends()
    ]);

    const analysisData = {
      totalUsers: users.length,
      totalDocuments: documents.length,
      topSearches,
      uploadTrend,
      topKeywords
    };

    const insightText = await aiService.generateDashboardInsight(analysisData);
    res.json({ insight: insightText });

  } catch (err) {
    console.error('AI Insight Controller Error:', err);
    res.status(500).json({ insight: "Automated insight could not be generated at this time." });
  }
};

// ==========================================
// 6. SETTINGS & FORM OPTIONS
// ==========================================

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

exports.getFormOptions = async (req, res) => {
  try {
    const query = `SELECT * FROM form_options ORDER BY type, value ASC`;
    const { rows } = await pool.query(query);
    
    const grouped = rows.reduce((acc, item) => {
      const key = item.type + 's';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item.value);
      return acc;
    }, { roles: [], strands: [], yearLevels: [] });

    if (grouped.yearLevels) {
        grouped.yearLevels.sort((a, b) => {
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

// ==========================================
// 7. GROUP MEMBERSHIP MANAGEMENT
// ==========================================

exports.getGroupMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const members = await userModel.getGroupMembers(id);
    res.json(members);
  } catch (err) {
    console.error("Fetch Members Error:", err);
    res.status(500).json({ message: "Error fetching group members" });
  }
};

exports.addStudentToGroup = async (req, res) => {
  try {
    const { userId } = req.body;
    const groupId = req.params.id;

    if (!userId) return res.status(400).json({ message: "User ID is required." });

    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    
    if (user.role !== 'student') {
        return res.status(400).json({ message: "Only students can be added to research groups." });
    }

    await userModel.assignStudentToGroup(userId, groupId);
    res.json({ message: "Student assigned to group successfully." });

  } catch (err) {
    console.error("Add Member Error:", err);
    res.status(500).json({ message: "Error adding student to group." });
  }
};

exports.removeStudentFromGroup = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) return res.status(400).json({ message: "User ID is required." });

    await userModel.removeStudentFromGroup(userId);
    res.json({ message: "Student removed from group successfully." });
  } catch (err) {
    console.error("Remove Member Error:", err);
    res.status(500).json({ message: "Error removing student from group." });
  }
};