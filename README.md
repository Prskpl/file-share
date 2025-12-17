# NUA - Secure File Sharing Application

A production-ready, full-stack file sharing application similar to Google Drive. Built with the MERN stack, it features secure file uploads, role-based access control, expiring links, and activity logging.

## 🚀 Features

- **User Authentication**: Secure Login/Register with JWT.
- **File Management**: Upload (Bulk), View, and Download files.
- **Smart Previews**: Preview Images/PDFs directly.
- **Secure Sharing**:
  - Share with specific users via email.
  - Generate public links with **custom expiry** (2 mins, 1 hour, 24 hour, etc.).
  - Revoke access for specific users.
- **Security**:
  - Backend-enforced authorization (IDOR protection).
  - Secure Proxy Downloads (hides actual cloud URLs).
- **Audit Logs**: Track who uploaded, viewed, or downloaded files.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Axios, Lucide React.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB Atlas.
- **Storage**: Cloudinary (for persistent file storage).
- **Security**: BCrypt, JWT, Helmet, CORS.

## 📦 Installation & Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/nua-file-share.git
   cd nua-file-share