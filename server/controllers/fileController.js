const File = require('../models/File');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { uploadToCloudinary } = require('../config/cloudinary');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const logActivity = async (userId, fileId, action, details, req) => {
  try {
    await AuditLog.create({ userId, fileId, action, details, ipAddress: req.ip });
  } catch (err) { console.error('Audit Log Error:', err); }
};

exports.uploadFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadPromises = req.files.map(async (file) => {
      const result = await uploadToCloudinary(file.buffer, file.originalname);
      
      const newFile = await File.create({
        ownerId: req.user.id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        fileUrl: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type
      });
      
      await logActivity(req.user.id, newFile._id, 'UPLOAD', `Uploaded ${file.originalname}`, req);
      return newFile;
    });

    const files = await Promise.all(uploadPromises);
    res.status(201).json(files);
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

exports.getFiles = async (req, res) => {
  try {
    const owned = await File.find({ ownerId: req.user.id })
      .populate('sharedWith', 'name email') 
      .sort({ createdAt: -1 });

    const shared = await File.find({ sharedWith: req.user.id })
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ owned, shared });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.shareFile = async (req, res) => {
  try {
    const { fileId, email, emails } = req.body;
    
    let emailList = [];
    if (emails && Array.isArray(emails)) {
      emailList = emails;
    } else if (email) {
      emailList = [email];
    } else {
      return res.status(400).json({ message: 'Please provide email(s).' });
    }

    const file = await File.findOne({ _id: fileId, ownerId: req.user.id });
    if (!file) return res.status(404).json({ message: 'File not found or unauthorized' });

    const results = [];
    
    for (const emailAddress of emailList) {
      const userToShare = await User.findOne({ email: emailAddress.trim() });
      
      if (userToShare) {
        const alreadyShared = file.sharedWith.some(id => id.toString() === userToShare._id.toString());
        
        if (!alreadyShared) {
          file.sharedWith.push(userToShare._id);
          await logActivity(req.user.id, file._id, 'SHARE', `Shared with ${emailAddress}`, req);
          results.push(`${emailAddress} (Success)`);
        } else {
          results.push(`${emailAddress} (Already shared)`);
        }
      } else {
        results.push(`${emailAddress} (User not found)`);
      }
    }

    await file.save();
    res.json({ message: 'Sharing process completed', details: results });

  } catch (error) {
    console.error('Share Error:', error);
    res.status(500).json({ message: 'Share failed' });
  }
};

exports.generateLink = async (req, res) => {
  try {
    const { fileId, expiresInHours } = req.body;
    let hours = parseFloat(expiresInHours);
    if (isNaN(hours) || hours <= 0) hours = 24;

    const file = await File.findOne({ _id: fileId, ownerId: req.user.id });
    if (!file) return res.status(403).json({ message: 'Unauthorized' });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    file.shareLink = { token, expiresAt };
    await file.save();

    await logActivity(req.user.id, file._id, 'LINK_GENERATE', `Generated link expiring in ${hours.toFixed(2)}h`, req);

    res.json({ linkToken: token, expiresAt });
  } catch (error) {
    console.error('Generate Link Error:', error);
    res.status(500).json({ message: 'Error generating link' });
  }
};

exports.accessSharedLink = async (req, res) => {
  try {
    const { token } = req.params;
    const file = await File.findOne({ 'shareLink.token': token }).populate('ownerId', 'name');

    if (!file) return res.status(404).json({ message: 'Link invalid' });

    const isOwner = req.user && file.ownerId._id.toString() === req.user.id;
    const isSharedUser = req.user && file.sharedWith.some(id => id.toString() === req.user.id);
    const isLinkActive = new Date() < new Date(file.shareLink.expiresAt);

    if (isOwner || isSharedUser || isLinkActive) {
      await logActivity(req.user ? req.user.id : null, file._id, 'VIEW_LINK', 'Accessed via shared link', req);

      return res.json({
        id: file._id,
        name: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        resourceType: file.resourceType,
        owner: file.ownerId.name,
        fileUrl: file.fileUrl,
        createdAt: file.createdAt,
        downloadUrl: file.fileUrl
      });
    }

    return res.status(403).json({ message: 'Link expired' });

  } catch (error) {
    console.error('Access Shared Link Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const file = await File.findOne({
      _id: id,
      $or: [{ ownerId: req.user.id }, { sharedWith: req.user.id }]
    });
    
    if (!file) return res.status(403).json({ message: 'Access Denied or File Not Found' });

    res.json({ 
      viewUrl: file.fileUrl,
      downloadUrl: file.fileUrl,
      mimeType: file.mimeType,
      resourceType: file.resourceType,
      originalName: file.originalName
    });
  } catch (error) {
    console.error('Download File Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
exports.proxyDownload = async (req, res) => {
  try {
    const { id } = req.params;
    const file = await File.findOne({
      _id: id,
      $or: [{ ownerId: req.user.id }, { sharedWith: req.user.id }]
    });
    
    if (!file) return res.status(403).json({ message: 'Access Denied or File Not Found' });

    await logActivity(req.user.id, file._id, 'DOWNLOAD', 'Downloaded file', req);

    const response = await axios({
      method: 'GET',
      url: file.fileUrl,
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    const sanitizedFilename = file.originalName.replace(/[^\w\s.-]/g, '_');
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
    res.setHeader('Content-Length', response.data.length);
    res.send(Buffer.from(response.data));

  } catch (error) {
    console.error('Proxy Download Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Download failed', error: error.message });
    }
  }
};

exports.getFileLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const file = await File.findOne({ _id: id, ownerId: req.user.id });
    if (!file) return res.status(403).json({ message: 'Unauthorized' });

    const logs = await AuditLog.find({ fileId: id }).populate('userId', 'name email').sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Get Logs Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.downloadSharedLink = async (req, res) => {
  try {
    const { token } = req.params;

    const file = await File.findOne({ 'shareLink.token': token });

    if (!file) return res.status(404).json({ message: 'Link invalid' });

    const isOwner = req.user && file.ownerId.toString() === req.user.id;
    const isSharedUser = req.user && file.sharedWith.some(id => id.toString() === req.user.id);
    const isLinkActive = new Date() < new Date(file.shareLink.expiresAt);

    if (!isOwner && !isSharedUser && !isLinkActive) {
      return res.status(403).json({ message: 'Link expired' });
    }

    await logActivity(req.user ? req.user.id : null, file._id, 'DOWNLOAD_LINK', 'Downloaded via secure link', req);

    const response = await axios({
      method: 'GET',
      url: file.fileUrl,
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    const sanitizedFilename = file.originalName.replace(/[^\w\s.-]/g, '_');
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
    res.setHeader('Content-Length', response.data.length);
    res.send(Buffer.from(response.data));

  } catch (error) {
    console.error('Shared Link Download Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Download failed', error: error.message });
    }
  }
};

exports.removeAccess = async (req, res) => {
  try {
    const { fileId, userId } = req.body;

    const file = await File.findOne({ _id: fileId, ownerId: req.user.id });
    if (!file) return res.status(404).json({ message: 'File not found or unauthorized' });

    file.sharedWith = file.sharedWith.filter(id => id.toString() !== userId);
    
    await file.save();
    await logActivity(req.user.id, file._id, 'REVOKE_ACCESS', `Removed access for user ${userId}`, req);

    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    console.error('Remove Access Error:', error);
    res.status(500).json({ message: 'Failed to revoke access' });
  }
};