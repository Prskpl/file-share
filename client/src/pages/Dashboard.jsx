import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  UploadCloud, File, Share2, Download, Link as LinkIcon, Loader2, 
  History, X, Eye, ExternalLink, FileText, Copy, Check, Plus, 
  Trash2, UserMinus, Clock, Users, Grid, List, Search, MoreVertical 
} from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('owned');
  const [files, setFiles] = useState({ owned: [], shared: [] });
  const [uploading, setUploading] = useState(false);
  
  const [viewMode, setViewMode] = useState('grid'); 
  const [searchQuery, setSearchQuery] = useState('');

  const [shareModal, setShareModal] = useState({ isOpen: false, file: null });
  const [logModal, setLogModal] = useState({ isOpen: false, logs: [] });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, file: null });
  
  const [expiryHours, setExpiryHours] = useState(24);
  const [generatedLink, setGeneratedLink] = useState(null); 
  const [copySuccess, setCopySuccess] = useState(false); 

  const [emailInput, setEmailInput] = useState('');
  const [emailList, setEmailList] = useState([]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const { data } = await api.get('/files/dashboard');
      setFiles(data);
    } catch (err) { console.error("Failed to load files"); }
  };

  const handleUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));

    setUploading(true);
    try {
      await api.post('/files/upload', formData);
      await fetchFiles();
      alert('Files uploaded successfully!');
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      const fileInfo = await api.get(`/files/download/${id}`);
      const response = await api.get(`/files/proxy-download/${id}`, {
        responseType: 'blob',
        timeout: 60000 
      });

      const blob = new Blob([response.data], { type: fileInfo.data.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileInfo.data.originalName;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

    } catch (err) {
      console.error("Download error", err);
      alert("Download failed.");
    }
  };

  const handleView = async (id) => {
    try {
      const { data } = await api.get(`/files/download/${id}`);
      const extension = data.originalName.split('.').pop().toLowerCase();
      const viewableTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'mp4', 'webm', 'ogg'];
      
      if (viewableTypes.includes(extension)) {
        window.open(data.viewUrl, '_blank', 'noopener,noreferrer');
      } else {
        setPreviewModal({ isOpen: true, file: { ...data, id } });
      }
    } catch (err) { 
      console.error('View error:', err);
      alert('Access Denied'); 
    }
  };

  const generateLink = async () => {
    try {
      const { data } = await api.post('/files/generate-link', { 
        fileId: shareModal.file._id, 
        expiresInHours: parseFloat(expiryHours) 
      });
      const link = `${window.location.origin}/shared/${data.linkToken}`;
      setGeneratedLink(link);
      setCopySuccess(false);
    } catch (err) { alert('Error generating link'); }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleAddEmail = (e) => {
    e.preventDefault();
    const email = emailInput.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) return;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    if (emailList.includes(email)) {
      alert("Email already added.");
      return;
    }
    setEmailList([...emailList, email]);
    setEmailInput('');
  };

  const handleRemoveEmail = (emailToRemove) => {
    setEmailList(emailList.filter(email => email !== emailToRemove));
  };

  const handleShareUser = async () => {
    if (emailList.length === 0) {
      alert("Please add at least one email to share.");
      return;
    }
    try {
      const { data } = await api.post('/files/share', { 
        fileId: shareModal.file._id, 
        emails: emailList 
      });
      alert(`Status:\n${data.details.join('\n')}`);
      setEmailList([]);
      setEmailInput('');
      fetchFiles(); 
      closeShareModal();
    } catch (err) { alert('Share failed'); }
  };

  const handleRevokeAccess = async (userId) => {
    if (!confirm("Are you sure you want to remove access for this user?")) return;
    try {
      await api.delete('/files/share/remove', { 
        data: { fileId: shareModal.file._id, userId } 
      });
      const updatedFile = { 
        ...shareModal.file, 
        sharedWith: shareModal.file.sharedWith.filter(u => u._id !== userId) 
      };
      setShareModal({ ...shareModal, file: updatedFile });
      fetchFiles(); 
    } catch (err) { alert('Failed to revoke access'); }
  };

  const closeShareModal = () => {
    setShareModal({ isOpen: false, file: null });
    setGeneratedLink(null);
    setExpiryHours(24);
    setEmailList([]);
    setEmailInput('');
  };

  const viewLogs = async (fileId) => {
    try {
      const { data } = await api.get(`/files/logs/${fileId}`);
      setLogModal({ isOpen: true, logs: data });
    } catch (err) { alert('Could not fetch logs'); }
  };

  
  const filteredFiles = (activeTab === 'owned' ? files.owned : files.shared).filter(f => 
    f.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop().toLowerCase();
    const iconColors = {
      pdf: 'text-red-500 bg-red-50',
      doc: 'text-blue-500 bg-blue-50',
      docx: 'text-blue-500 bg-blue-50',
      xls: 'text-green-500 bg-green-50',
      xlsx: 'text-green-500 bg-green-50',
      ppt: 'text-orange-500 bg-orange-50',
      pptx: 'text-orange-500 bg-orange-50',
      zip: 'text-purple-500 bg-purple-50',
      fig: 'text-pink-500 bg-pink-50'
    };
    return iconColors[ext] || 'text-slate-500 bg-slate-50';
  };

  const FileCard = ({ file, isOwner }) => (
    <div className="group bg-white rounded-2xl border-2 border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-4 rounded-xl ${getFileIcon(file.originalName)} transition-transform group-hover:scale-110`}>
            <File size={28} strokeWidth={2} />
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => handleView(file._id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="View"><Eye size={18} /></button>
            <button onClick={() => handleDownload(file._id)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Download"><Download size={18} /></button>
            {isOwner && (
              <>
                <button onClick={() => setShareModal({ isOpen: true, file: file })} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all" title="Share"><Share2 size={18} /></button>
                <button onClick={() => viewLogs(file._id)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Logs"><History size={18} /></button>
              </>
            )}
          </div>
        </div>
        <h3 className="font-semibold text-slate-900 truncate mb-2 text-lg" title={file.originalName}>{file.originalName}</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          <span className="text-slate-400 flex items-center gap-1"><Clock size={14} />{new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
        {isOwner && file.sharedWith && file.sharedWith.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <Users size={14} />
            <span>Shared with {file.sharedWith.length} {file.sharedWith.length === 1 ? 'person' : 'people'}</span>
          </div>
        )}
      </div>
    </div>
  );

  const FileRow = ({ file, isOwner }) => (
    <div className="group bg-white hover:bg-slate-50 border-b border-slate-100 transition-colors last:border-b-0">
      <div className="px-6 py-4 flex items-center gap-4">
        <div className={`p-2.5 rounded-lg ${getFileIcon(file.originalName)}`}>
          <File size={20} strokeWidth={2} />
        </div>
        
        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
          <div className="col-span-6 md:col-span-5">
            <h3 className="font-semibold text-slate-900 truncate" title={file.originalName}>{file.originalName}</h3>
          </div>
          <div className="col-span-3 md:col-span-2 text-sm text-slate-500">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </div>
          <div className="hidden md:flex col-span-3 text-sm text-slate-500 items-center gap-1">
            <Clock size={14} />
            {new Date(file.createdAt).toLocaleDateString()}
          </div>
          {isOwner && (
             <div className="hidden md:flex col-span-2 text-sm text-slate-500 items-center gap-1">
               {file.sharedWith?.length > 0 && <><Users size={14} /> {file.sharedWith.length}</>}
             </div>
          )}
        </div>
        
        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => handleView(file._id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="View"><Eye size={18} /></button>
          <button onClick={() => handleDownload(file._id)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Download"><Download size={18} /></button>
          {isOwner && (
            <>
              <button onClick={() => setShareModal({ isOpen: true, file: file })} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg" title="Share"><Share2 size={18} /></button>
              <button onClick={() => viewLogs(file._id)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="Logs"><History size={18} /></button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">My Drive</h1>
            <p className="text-slate-500">Manage and share your files securely</p>
          </div>
          
          <label className={`flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-800 cursor-pointer transition-all shadow-lg shadow-blue-200 hover:shadow-xl ${uploading ? 'opacity-75' : ''}`}>
            {uploading ? <Loader2 className="animate-spin" size={22} /> : <UploadCloud size={22} />}
            <span className="font-semibold">{uploading ? 'Uploading...' : 'Upload Files'}</span>
            <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        {/* Toolbar: Tabs + Search + View Toggle */}
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-2 mb-6 shadow-sm flex flex-col md:flex-row justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('owned')} 
              className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === 'owned' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Owned by me
            </button>
            <button 
              onClick={() => setActiveTab('shared')} 
              className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === 'shared' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Shared with me
            </button>
          </div>

          {/* Search & View Controls */}
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm"
              />
            </div>
            
            {/* View Toggle */}
            <div className="flex gap-1 border-2 border-slate-200 rounded-xl p-1 bg-white">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'
                }`}
                title="Grid view"
              >
                <Grid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'
                }`}
                title="List view"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Files Display */}
        {filteredFiles.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-4">
              <File size={32} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No files found</h3>
            <p className="text-slate-500">
              {searchQuery ? `No results for "${searchQuery}"` : 'Upload your first file to get started'}
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                {filteredFiles.map(f => <FileCard key={f._id} file={f} isOwner={activeTab === 'owned'} />)}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm animate-in fade-in duration-500">
                {/* List Header */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <div className="w-10"></div> {/* Icon spacer */}
                  <div className="flex-1 grid grid-cols-12 gap-4">
                    <div className="col-span-6 md:col-span-5">Name</div>
                    <div className="col-span-3 md:col-span-2">Size</div>
                    <div className="hidden md:block col-span-3">Date</div>
                    {activeTab === 'owned' && <div className="hidden md:block col-span-2">Shared</div>}
                  </div>
                  <div className="w-24 text-center">Actions</div>
                </div>
                {/* List Rows */}
                {filteredFiles.map(f => <FileRow key={f._id} file={f} isOwner={activeTab === 'owned'} />)}
              </div>
            )}
          </>
        )}

        {/* -----------------------------------------------------------------------
            MODALS
           ----------------------------------------------------------------------- */}

        {/* Share Modal */}
        {shareModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-5 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Share File</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Manage access and permissions</p>
                </div>
                <button onClick={closeShareModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X size={22} /></button>
              </div>
              <div className="p-6 space-y-6">
                {/* Add People */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-100">
                  <label className="block text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><Users size={18} className="text-violet-600" /> Add People</label>
                  <form onSubmit={handleAddEmail} className="flex gap-2 mb-4">
                    <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="user@example.com" className="flex-1 border-2 border-violet-200 p-3 rounded-xl text-sm focus:border-violet-500 focus:outline-none transition-colors bg-white" />
                    <button type="submit" className="bg-violet-600 text-white px-4 py-3 rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-200"><Plus size={20} /></button>
                  </form>
                  <div className="flex flex-wrap gap-2 mb-4 min-h-[60px] border-2 border-violet-100 rounded-xl p-3 bg-white">
                    {emailList.length === 0 && <span className="text-sm text-slate-400 italic p-1">No emails added yet</span>}
                    {emailList.map((email) => (
                      <div key={email} className="flex items-center gap-2 bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 px-4 py-2 rounded-full text-sm font-medium border border-violet-200">
                        {email} <button onClick={() => handleRemoveEmail(email)} className="hover:text-violet-900 transition-colors"><X size={16} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleShareUser} disabled={emailList.length === 0} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3.5 rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-200">Share with {emailList.length} {emailList.length !== 1 ? 'Users' : 'User'}</button>
                </div>
                {/* People with Access */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <label className="block text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><Users size={18} className="text-slate-600" /> People with Access</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {shareModal.file?.sharedWith?.length > 0 ? (
                      shareModal.file.sharedWith.map(user => (
                        <div key={user._id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
                            <div><div className="text-sm font-semibold text-slate-900">{user.name}</div><div className="text-xs text-slate-500">{user.email}</div></div>
                          </div>
                          <button onClick={() => handleRevokeAccess(user._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all" title="Remove Access"><UserMinus size={18} /></button>
                        </div>
                      ))
                    ) : <p className="text-sm text-slate-400 italic text-center py-4">Not shared with anyone yet</p>}
                  </div>
                </div>
                {/* Generate Link */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
                  <label className="block text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><LinkIcon size={18} className="text-emerald-600" /> Generate Secure Link</label>
                  <div className="flex gap-2 mb-4">
                    <select className="flex-1 border-2 border-emerald-200 p-3 rounded-xl bg-white text-sm focus:border-emerald-500 focus:outline-none transition-colors" value={expiryHours} onChange={(e) => { setExpiryHours(e.target.value); setGeneratedLink(null); }}>
                      <option value={2/60}>2 Minutes</option><option value={5/60}>5 Minutes</option><option value={15/60}>15 Minutes</option><option value="1">1 Hour</option><option value="24">24 Hours</option><option value="168">7 Days</option>
                    </select>
                    <button onClick={generateLink} className="bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-semibold">Generate</button>
                  </div>
                  {generatedLink && (
                    <div className="bg-white p-4 rounded-xl border-2 border-emerald-200 animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="text-xs text-emerald-700 font-semibold mb-2 uppercase tracking-wide">Secure Link Generated</p>
                      <div className="flex items-center gap-2 mb-2">
                        <input readOnly value={generatedLink} className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none" />
                        <button onClick={copyToClipboard} className="p-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white transition-all shadow-md" title="Copy">{copySuccess ? <Check size={18} /> : <Copy size={18} />}</button>
                      </div>
                      <p className="text-xs text-slate-500">🔒 Authenticated users only</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal - UPDATED: Only Download Button */}
        {previewModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-300 relative">
              <button onClick={() => setPreviewModal({ isOpen: false, file: null })} className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X size={22} /></button>
              <div className="flex flex-col items-center text-center pt-4">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${getFileIcon(previewModal.file?.originalName || '')} bg-opacity-20`}><FileText size={40} /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 break-all">{previewModal.file?.originalName}</h3>
                <p className="text-slate-500 mb-6">Preview is not available for this file type.</p>
                <div className="space-y-3 w-full">
                  <button onClick={() => { handleDownload(previewModal.file?.id); setPreviewModal({ isOpen: false, file: null }); }} className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"><Download size={20} /> Download File</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs Modal */}
        {logModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                <div><h3 className="text-xl font-bold text-slate-900">Activity Logs</h3><p className="text-sm text-slate-500">Recent interactions with this file</p></div>
                <button onClick={() => setLogModal({ isOpen: false, logs: [] })} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X size={22} /></button>
              </div>
              <div className="overflow-y-auto p-6">
                {logModal.logs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400"><History size={48} className="mx-auto mb-3 opacity-20" /><p>No activity recorded yet</p></div>
                ) : (
                  <div className="space-y-4">
                    {logModal.logs.map((log, index) => (
                      <div key={index} className="flex gap-4 items-start p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                        <div className={`mt-1 p-2 rounded-full ${log.action === 'download' ? 'bg-emerald-100 text-emerald-600' : log.action === 'view' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>{log.action === 'download' ? <Download size={14} /> : <Eye size={14} />}</div>
                        <div><p className="text-sm font-medium text-slate-900"><span className="font-bold">{log.action}</span> by {log.userId?.name || 'Unknown'}</p><p className="text-xs text-slate-500 mt-1">{log.details}</p><p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><Clock size={12} />{new Date(log.createdAt).toLocaleString()}</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;