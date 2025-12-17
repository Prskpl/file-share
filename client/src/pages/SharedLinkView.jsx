import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { File, Download, AlertTriangle, Lock, Eye } from 'lucide-react';

const SharedLinkView = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem('nua_user');
    if (!user) {
      navigate('/login', { state: { from: `/shared/${token}` } });
      return;
    }

    api.get(`/files/secure-link/${token}`)
      .then(res => {
        setFile(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Link invalid, expired, or unauthorized.');
        setLoading(false);
      });
  }, [token, navigate]);

  const handleDownload = async () => {
    try {
      const response = await api.get(`/files/shared-download/${token}`, {
        responseType: 'blob', 
      });

      const blob = new Blob([response.data], { 
        type: file.mimeType || 'application/octet-stream' 
      });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name); 
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

    } catch (err) {
      console.error("Download error", err);
      alert("Download failed. The link might be expired or invalid.");
    }
  };

  const handleView = () => {
    if (file?.fileUrl) window.open(file.fileUrl, '_blank');
  };

  if (loading) return <div className="text-center mt-20 font-medium text-slate-500">Verifying Secure Access...</div>;

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="text-center">
        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">{error}</h2>
        <button onClick={() => navigate('/')} className="mt-4 text-brand-600 hover:underline">Return to Dashboard</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white max-w-sm w-full p-8 rounded-2xl shadow-xl text-center">
        <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <File size={32} />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
            <Lock size={14} className="text-green-600" />
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Secure Access Granted</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">{file.name}</h2>
        <p className="text-slate-500 text-sm mb-6">Shared by {file.owner} • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
        
        <div className="flex flex-col gap-3">
            <button onClick={handleDownload} className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700 transition flex items-center justify-center gap-2">
            <Download size={20} /> Download File
            </button>
            <button onClick={handleView} className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 transition flex items-center justify-center gap-2">
            <Eye size={20} /> View in Browser
            </button>
        </div>
      </div>
    </div>
  );
};

export default SharedLinkView;