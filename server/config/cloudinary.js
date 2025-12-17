const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (buffer, originalName) => {
  return new Promise((resolve, reject) => {
    const ext = originalName.split('.').pop().toLowerCase();
    const isPdf = ext === 'pdf';
    const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
    const isDoc = ['doc', 'docx', 'txt', 'ppt', 'pptx'].includes(ext);
    
    const resourceType = (isPdf || isExcel || isDoc) ? 'raw' : 'auto';
    
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: 'nua-files', 
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

module.exports = { uploadToCloudinary };