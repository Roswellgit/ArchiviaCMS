'use client';

import { useEffect, useState } from 'react';
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

export default function AdminDocumentManagement() {
  const [documents, setDocuments] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentTab, setCurrentTab] = useState('active'); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- MODAL STATES ---

  const [selectedDocument, setSelectedDocument] = useState(null);

  // Archive Modal State (Only used for Archive because it needs a reason input)
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [docToArchive, setDocToArchive] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  
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

  // --- HELPER: Format Authors ---
  // Keeps the logic to shorten the list, but allows the text itself to wrap
  const formatAuthors = (authors) => {
    if (!authors) return 'Unknown Author';
    if (typeof authors === 'string') return authors;
    if (Array.isArray(authors)) {
        if (authors.length === 0) return 'Unknown Author';
        if (authors.length > 2) {
            return `${authors[0]}, ${authors[1]} et al.`;
        }
        return authors.join(', ');
    }
    return 'Unknown Author';
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

  // --- TOAST CONFIRMATION FOR REJECT ---
  const handleReject = (docId) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-bold text-slate-800 text-sm">Reject this document?</p>
        <p className="text-xs text-slate-500">It will be hidden from the public.</p>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={() => toast.dismiss(t.id)} className="text-xs text-slate-500 font-bold px-3 py-1 bg-slate-100 rounded hover:bg-slate-200">Cancel</button>
          <button onClick={() => {
             executeReject(docId);
             toast.dismiss(t.id);
          }} className="text-xs bg-red-600 text-white font-bold px-3 py-1 rounded hover:bg-red-700">Confirm Reject</button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center', icon: '🚫' }); 
  };

  const executeReject = async (docId) => {
    try {
      await rejectDocument(docId);
      toast.success("Document Rejected.");
      fetchPendingQueue();
    } catch (err) {
      console.error(err);
      toast.error("Rejection failed.");
    }
  };

  // --- ARCHIVE LOGIC (Modal required for input) ---
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
        console.error(err);
    }
  };

  const handleRestore = async (docId) => {
    try {
        await adminRestoreDocument(docId);
        toast.success("Document restored.");
        refreshData();
    } catch (err) {
        toast.error("Restore failed.");
    }
  };

  // --- TOAST CONFIRMATION FOR DELETE ---
  const handlePermanentDelete = (docId) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-bold text-slate-800 text-sm">Permanently delete?</p>
        <p className="text-xs text-slate-500">This action cannot be undone.</p>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={() => toast.dismiss(t.id)} className="text-xs text-slate-500 font-bold px-3 py-1 bg-slate-100 rounded hover:bg-slate-200">Cancel</button>
          <button onClick={() => {
             executeDelete(docId);
             toast.dismiss(t.id);
          }} className="text-xs bg-red-600 text-white font-bold px-3 py-1 rounded hover:bg-red-700">Delete</button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center', icon: '⚠️' }); 
  };

  const executeDelete = async (docId) => {
    try {
        await adminDeleteDocument(docId);
        toast.success("Document deleted.");
        refreshData();
    } catch (err) { toast.error("Delete failed."); }
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
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      
      {/* HEADER: Centered Alignment */}
      <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-200 pb-4 gap-4">
          <div className="w-full md:w-auto text-center md:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900">Documents</h2>
            <p className="text-slate-500 text-sm mt-1">Manage repository content</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
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
                    
                    {/* FIX: 
                       1. 'flex-1 min-w-0' ensures the text container shrinks to available space.
                       2. Removed 'truncate' from children so they wrap.
                       3. Added 'break-words' to force wrapping on long strings.
                    */}
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-bold text-slate-800 break-words leading-tight">
                                {doc.title || "Untitled"}
                            </h3>
                            
                            {/* Badges */}
                            {doc.deletion_requested && <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0">Deletion Requested</span>}
                            {currentTab === 'pending' && <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0">Pending</span>}
                        </div>
                        
                        {currentTab === 'archived' && doc.archive_reason && (
                            <p className="text-xs text-orange-600 font-medium break-words bg-orange-50 p-1 rounded border border-orange-100 inline-block">Reason: {doc.archive_reason}</p>
                        )}
                        
                        <p className="text-sm text-slate-500 break-words">
                            {formatAuthors(doc.ai_authors)} • {doc.ai_date_created || 'No Date'}
                        </p>
                        
                        <a href={doc.downloadLink || doc.file_url || '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline inline-block font-medium">
                           View PDF
                        </a>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3 items-center shrink-0 w-full md:w-auto mt-2 md:mt-0">
                        {currentTab === 'pending' ? (
                           <>
                             <button onClick={() => handleApprove(doc.id)} className="flex-1 md:flex-none px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 shadow-sm transition">
                               Approve
                             </button>
                             <button onClick={() => handleReject(doc.id)} className="flex-1 md:flex-none px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 shadow-sm transition">
                               Reject
                             </button>
                           </>
                        ) : (
                           <>
                             
                              
                              {(currentTab === 'active' && user?.is_super_admin) && <div className="hidden md:block h-4 w-px bg-slate-200"></div>}
                              
                              {currentTab === 'active' ? (
                                    <button onClick={() => openArchiveModal(doc)} className="text-sm font-semibold text-slate-500 hover:text-orange-600">
                                      Archive
                                    </button>
                              ) : (
                                    <button onClick={() => handleRestore(doc.id)} className="text-sm font-semibold text-green-600 hover:text-green-800">
                                      Restore
                                    </button>
                              )}
                              
                              {user?.is_super_admin && (
                                  <>
                                      <div className="hidden md:block h-4 w-px bg-slate-200"></div>
                                      <button onClick={() => handlePermanentDelete(doc.id)} className="text-sm font-semibold text-red-600 hover:text-red-800">
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
    </div>
  );
}