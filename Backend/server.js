require('dotenv').config();

if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
  console.error("FATAL ERROR: Missing required environment variables.");
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const authRoutes = require('./routes/auth'); 
const documentRoutes = require('./routes/documents');
const adminRoutes = require('./routes/admin'); 
const settingsRoutes = require('./routes/settings'); 
const documentModel = require('./models/documentModel'); 

const app = express();
const port = process.env.PORT || 3001; 

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://archivia-frontend.vercel.app' 
  ],
  credentials: true 
}));

app.use(express.json()); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/documents', documentRoutes);
app.use('/api/auth', authRoutes); 
app.use('/api/admin', adminRoutes); 
app.use('/api/settings', settingsRoutes); 
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

app.listen(port, async () => {
  console.log(`Backend server running on port ${port}`);
  
  // === OPTIMIZATION: Run in background (Non-blocking) ===
  // We removed 'await' so the server startup doesn't hang here.
  console.log("Initializing background auto-archive check...");
  
  documentModel.autoArchiveOldDocuments()
    .then(() => console.log("Background auto-archive check completed."))
    .catch(err => console.error("Background auto-archive check failed:", err));

  // 2. Schedule to run on the 1st of every month at midnight (00:00)
  cron.schedule('0 0 1 * *', async () => {
    console.log('Running scheduled monthly auto-archive job...');
    try {
      await documentModel.autoArchiveOldDocuments();
      console.log('Monthly auto-archive job completed.');
    } catch (error) {
      console.error('Scheduled auto-archive failed:', error);
    }
  });
});