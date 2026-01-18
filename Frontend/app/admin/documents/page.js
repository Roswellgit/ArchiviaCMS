'use client';

import { useEffect, useState } from 'react';
import EditDocumentModal from '../../../components/EditDocumentModal'; 
import { 
  searchDocuments, 
  fetchPendingDocs, 
  approveDocument, 
  rejectDocument,
  adminDeleteDocument, 
  adminArchiveDocument, 
  adminUpdateDocument, 
  adminRestoreDocument 
} from '../../../services/apiService'; 
import { useAuth } from '../../../context/AuthContext'; 
import { toast } from 'react-hot-toast';

// --- Reusable Confirmation Modal ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, isDanger }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in border border-gray-100">
        <div className="p-6 text-center">
          <h3 className={`text-lg font-bold mb-2 ${isDanger ? 'text-red-600' : 'text-slate-800'}`}>{title}</h3>
          <p className="text-slate-600 text-sm mb-6">{message}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition">Cancel</button>
            <button onClick={onConfirm} className={`px-4 py-2 text-white font-bold rounded-lg shadow-md transition ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminDocumentManagement() {
  const [documents, setDocuments] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentTab, setCurrentTab] = useState('active'); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- MODAL STATES ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Archive Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [docToArchive, setDocToArchive] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');

  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, type: '', id: null });
  
  const { user } = useAuth(); 

  useEffect(() => { 
    refreshData();
  }, []);

  const refreshData = () => {
    handleSearch(searchTerm);
    fetchPendingQueue();
  };

  const handleSearch = async (term) => {
    try {
      setLoading(true);
      const response = await searchDocuments(term); 
      setDocuments(response.data || []);
      setCurrentPage(1); 
    } catch (err) {
      toast.error('Failed to fetch documents.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingQueue = async () => {
    try {
      const data = await fetchPendingDocs();
      setPendingDocs(data || []);
    } catch (err) {
      console.error("Failed to load pending queue", err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleSearch(searchTerm);
  };

  // --- ACTIONS ---

  const handleApprove = async (docId) => {
    try {
      await approveDocument(docId); 
      toast.success("Document Approved & Published!");
      refreshData();
    } catch (err) {
      console.error(err);
      toast.error("Approval failed.");
    }
  };

  // --- CONFIRMATION HANDLERS ---
  const initiateConfirm = (type, id) => {
    setConfirmConfig({ isOpen: true, type, id });
  };

  const executeConfirmation = async () => {
    const { type, id } = confirmConfig;
    if (!id) return;
    setConfirmConfig({ ...confirmConfig, isOpen: false }); // Close modal immediately

    try {
        if (type === 'reject') {
            await rejectDocument(id);
            toast.success("Document Rejected.");
        } else if (type === 'restore') {
            await adminRestoreDocument(id);
            toast.success("Document restored.");
        } else if (type === 'delete') {
            await adminDeleteDocument(id);
            toast.success("Document permanently deleted.");
        }
        refreshData();
    } catch (err) {
        toast.error(`Action failed: ${err.message || 'Unknown error'}`);
    }
  };

  // --- ARCHIVE HANDLERS ---
  const openArchiveModal = (doc) => {
    setDocToArchive(doc);
    setArchiveReason('');
    setIsArchiveModalOpen(true);
  };

  const executeArchive = async (e) => {
    e.preventDefault();
    if(!docToArchive) return;
    if(!archiveReason.trim()) return toast.error("Please provide a reason.");

    try {
        await adminArchiveDocument(docToArchive.id, { reason: archiveReason });
        toast.success("Document archived.");
        setIsArchiveModalOpen(false);
        setDocToArchive(null);
        refreshData();
    } catch (err) { 
        toast.error("Failed to archive."); 
    }
  };

  const handleEdit = (doc) => { setSelectedDocument(doc); setIsEditModalOpen(true); };

  const handleSave = async (docId, updatedData) => {
    try {
        await adminUpdateDocument(docId, updatedData);
        setIsEditModalOpen(false);
        toast.success('Document updated.');
        refreshData();
    } catch (error) { toast.error("Save failed."); }
  };

  // --- FILTERING ---
  let listToRender = [];
  if (currentTab === 'pending') {
    listToRender = pendingDocs;
  } else {
    listToRender = documents.filter(doc => {
      if (currentTab === 'active') {
        return !doc.archive_requested && !doc.is_archived && doc.status === 'approved'; 
      }
      if (currentTab === 'archived') {
        return doc.archive_requested || doc.is_archived;
      }
      return true;
    });
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = listToRender.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(listToRender.length / itemsPerPage);

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-200 pb-4 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">Documents</h2>
            <p className="text-slate-500 text-sm mt-1">Manage repository content</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => { setCurrentTab('active'); setCurrentPage(1); }}
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${currentTab === 'active' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Library
              </button>
              <button 
                onClick={() => { setCurrentTab('pending'); setCurrentPage(1); }}
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${currentTab === 'pending' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Pending 
                {pendingDocs.length > 0 && <span className="ml-2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingDocs.length}</span>}
              </button>
              <button 
                onClick={() => { setCurrentTab('archived'); setCurrentPage(1); }}
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${currentTab === 'archived' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Archive
              </button>
          </div>
      </div>
      
      {/* Search Bar */}
      {currentTab !== 'pending' && (
        <form onSubmit={handleSearchSubmit} className="relative">
            <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-32 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <button type="submit" className="absolute right-2 top-2 bottom-2 px-6 bg-slate-900 text-white font-bold rounded-lg hover:bg-indigo-600 transition-colors text-sm">
                Search
            </button>
        </form>
      )}

      {/* List */}
      {loading ? (
          <div className="text-center p-10 text-slate-400">Loading library...</div>
      ) : listToRender.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-xl border border-dashed border-slate-200 text-slate-500">
              No {currentTab} documents found.
          </div>
      ) : (
        <>
            <div className="grid gap-4">
            {currentItems.map(doc => (
                <div key={doc.id} className="p-5 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                            <span className="truncate">{doc.title || "Untitled"}</span>
                            {doc.deletion_requested && <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0">Deletion Requested</span>}
                            {currentTab === 'pending' && <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0">Pending</span>}
                        </h3>
                        
                        {currentTab === 'archived' && doc.archive_reason && (
                            <p className="text-xs text-orange-600 font-medium mt-1">Reason: {doc.archive_reason}</p>
                        )}
                        
                        <p className="text-sm text-slate-500 mt-1 truncate">
                            {doc.ai_authors?.length > 0 ? doc.ai_authors.join(', ') : 'Unknown Author'} • {doc.ai_date_created || 'No Date'}
                        </p>
                        
                        <a href={doc.downloadLink || doc.file_url || '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline mt-2 inline-block">
                           View PDF
                        </a>
                    </div>
                    
                    <div className="flex gap-3 items-center shrink-0">
                        {currentTab === 'pending' ? (
                           <>
                             <button onClick={() => handleApprove(doc.id)} className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 shadow-sm transition">
                               Approve
                             </button>
                             <button onClick={() => initiateConfirm('reject', doc.id)} className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 shadow-sm transition">
                               Reject
                             </button>
                           </>
                        ) : (
                           <>
                              {currentTab === 'active' && (
                                  <button onClick={() => handleEdit(doc)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">Edit</button>
                              )}
                              
                              {(currentTab === 'active' && user?.is_super_admin) && <div className="h-4 w-px bg-slate-200"></div>}
                              
                              {currentTab === 'active' ? (
                                    <button onClick={() => openArchiveModal(doc)} className="text-sm font-semibold text-slate-500 hover:text-orange-600">
                                      Archive
                                    </button>
                              ) : (
                                    <button onClick={() => initiateConfirm('restore', doc.id)} className="text-sm font-semibold text-green-600 hover:text-green-800">
                                      Restore
                                    </button>
                              )}
                              
                              {user?.is_super_admin && (
                                  <>
                                      <div className="h-4 w-px bg-slate-200"></div>
                                      <button onClick={() => initiateConfirm('delete', doc.id)} className="text-sm font-semibold text-red-600 hover:text-red-800">
                                        Delete
                                      </button>
                                  </>
                              )}
                           </>
                        )}
                    </div>
                </div>
            ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-4">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm font-bold text-slate-600">Page {currentPage} of {totalPages}</span>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </>
      )}
      
      {/* EDIT MODAL */}
      {isEditModalOpen && <EditDocumentModal document={selectedDocument} onClose={() => setIsEditModalOpen(false)} onSave={handleSave}/>}

      {/* ARCHIVE REASON MODAL */}
      {isArchiveModalOpen && docToArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-gray-100 bg-orange-50 flex justify-between items-center">
               <h3 className="text-lg font-bold text-orange-800">Archive Document</h3>
               <button onClick={() => setIsArchiveModalOpen(false)} className="text-orange-400 hover:text-orange-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={executeArchive} className="p-6 space-y-4">
               <p className="text-slate-600 text-sm">
                 You are archiving <strong>{docToArchive.title}</strong>. It will be hidden from search results.
               </p>

               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason for Archiving</label>
                 <textarea 
                   required
                   className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                   rows="3"
                   placeholder="e.g. Outdated content, duplicate entry..."
                   value={archiveReason}
                   onChange={(e) => setArchiveReason(e.target.value)}
                 ></textarea>
               </div>

               <div className="flex gap-3 justify-end pt-2">
                 <button type="button" onClick={() => setIsArchiveModalOpen(false)} className="px-4 py-2 text-slate-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Cancel</button>
                 <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 shadow-md">Archive</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({...confirmConfig, isOpen: false})}
        onConfirm={executeConfirmation}
        title={
          confirmConfig.type === 'reject' ? 'Reject Document?' : 
          confirmConfig.type === 'restore' ? 'Restore Document?' : 
          'Delete Permanently?'
        }
        message={
          confirmConfig.type === 'reject' ? 'It will be hidden from the public queue.' :
          confirmConfig.type === 'restore' ? 'This document will be visible in the library again.' :
          'This action cannot be undone.'
        }
        confirmText={
          confirmConfig.type === 'reject' ? 'Reject' : 
          confirmConfig.type === 'restore' ? 'Restore' : 
          'Delete'
        }
        isDanger={confirmConfig.type === 'reject' || confirmConfig.type === 'delete'}
      />
    </div>
  );
}