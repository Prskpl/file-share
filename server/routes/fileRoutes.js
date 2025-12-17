const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { 
  uploadFiles, 
  getFiles, 
  shareFile, 
  generateLink, 
  downloadFile, 
  accessSharedLink, 
  getFileLogs,
  proxyDownload, 
  downloadSharedLink,
  removeAccess
} = require('../controllers/fileController');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 } 
});

router.post('/upload', protect, upload.array('files', 5), uploadFiles);
router.get('/dashboard', protect, getFiles);
router.post('/share', protect, shareFile);
router.post('/generate-link', protect, generateLink);
router.get('/download/:id', protect, downloadFile);
router.get('/proxy-download/:id', protect, proxyDownload); 
router.delete('/share/remove', protect, removeAccess);
router.get('/logs/:id', protect, getFileLogs);
router.get('/shared-download/:token', protect, downloadSharedLink); 

router.get('/secure-link/:token', protect, accessSharedLink);

module.exports = router;