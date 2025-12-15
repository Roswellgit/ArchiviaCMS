'use client';

import { useEffect, useState } from 'react';
import EditDocumentModal from '../../../components/EditDocumentModal'; 
import { searchDocuments, adminDeleteDocument, adminArchiveDocument, adminUpdateDocument, adminRestoreDocument } from '../../../services/apiService'; 
import { useAuth } from '../../../context/AuthContext'; 
import { toast } from 'react-hot-toast';

export default function AdminDocumentManagement() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  
  const [currentTab, setCurrentTab] = useState('active'); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  const { user } = useAuth(); 

  useEffect(() => { handleSearch(''); }, []);

  const handleSearch = async (term) => {
    try {
      setLoading(true);
      const response = await searchDocuments(term); 
      setDocuments(response.data);
      setCurrentPage(1); 
    } catch (err) {
      toast.error('Failed to fetch documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleSearch(searchTerm);
  };

  
  const handleArchive = (docId) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-slate-800 text-sm">Reason for archiving:</p>
        <form 
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const reason = e.target.elements.reason.value;
            if (!reason.trim()) return toast.error("Reason is required");
            executeArchive(docId, reason);
            toast.dismiss(t.id);
          }}
        >
          <input 
            name="reason" 
            placeholder="Type reason..." 
            className="border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            autoFocus
          />
          <div className="flex gap-2 justify-end pt-1">
             <button type="button" onClick={() => toast.dismiss(t.id)} className="text-xs text-slate-500 font-bold px-2 py-1 hover:bg-slate-100 rounded">Cancel</button>
             <button type="submit" className="text-xs bg-indigo-600 text-white font-bold px-3 py-1 rounded hover:bg-indigo-700">Archive</button>
          </div>
        </form>
      </div>
    ), { duration: 2000, position: 'top-center', icon: '📂' });
  };

  const executeArchive = async (docId, reason) => {
    try {
        await adminArchiveDocument(docId, reason);
        toast.success("Document archived.");
        handleSearch(searchTerm);
    } catch (err) { toast.error("Failed to archive."); }
  };

  
  const handleRestore = async (docId) => {
    try {
        await adminRestoreDocument(docId);
        toast.success("Document restored.");
        handleSearch(searchTerm);
    } catch (err) {
        toast.error("Restore failed.");
    }
  };

  
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
    ), { duration: 6000, position: 'top-center', icon: '⚠️' });
  };

  const executeDelete = async (docId) => {
    try {
        await adminDeleteDocument(docId);
        toast.success("Document deleted.");
        handleSearch(searchTerm);
    } catch (err) { toast.error("Delete failed."); }
  };

  const handleEdit = (doc) => { setSelectedDocument(doc); setIsModalOpen(true); };

  const handleSave = async (docId, updatedData) => {
    try {
        await adminUpdateDocument(docId, updatedData);
        setIsModalOpen(false);
        toast.success('Document updated.');
        handleSearch(searchTerm); 
    } catch (error) { toast.error("Save failed."); }
  };

  
  const filteredDocuments = documents.filter(doc => {
      if (currentTab === 'active') return !doc.archive_requested;
      if (currentTab === 'archived') return doc.archive_requested;
      return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-200 pb-4 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">Documents</h2>
            <p className="text-slate-500 text-sm mt-1">Manage repository content</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setCurrentTab('active')}
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${currentTab === 'active' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Library
              </button>
              <button 
                onClick={() => setCurrentTab('archived')}
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${currentTab === 'archived' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Archive
              </button>
          </div>
      </div>
      
      {/* Search Bar */}
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

      {/* List */}
      {loading ? (
          <div className="text-center p-10 text-slate-400">Loading library...</div>
      ) : filteredDocuments.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-xl border border-dashed border-slate-200 text-slate-500">
              No {currentTab} documents found.
          </div>
      ) : (
        <>
            <div className="grid gap-4">
            {currentItems.map(doc => (
                <div key={doc.id} className="p-5 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                            {doc.title || "Untitled"}
                            {doc.deletion_requested && <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Deletion Requested</span>}
                        </h3>
                        {currentTab === 'archived' && doc.archive_reason && (
                            <p className="text-xs text-orange-600 font-medium mt-1">Reason: {doc.archive_reason}</p>
                        )}
                        <p className="text-sm text-slate-500 mt-1">
                            {doc.ai_authors?.length > 0 ? doc.ai_authors.join(', ') : 'Unknown Author'} • {doc.ai_date_created || 'No Date'}
                        </p>
                    </div>
                    
                    <div className="flex gap-3 items-center">
                        {currentTab === 'active' && (
                            <button onClick={() => handleEdit(doc)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">Edit</button>
                        )}
                        
                        {(currentTab === 'active' && user?.is_super_admin) && <div className="h-4 w-px bg-slate-200"></div>}
                        
                        {/* Action Buttons */}
                        {currentTab === 'active' ? (
                             <button onClick={() => handleArchive(doc.id)} className="text-sm font-semibold text-slate-500 hover:text-orange-600">
                                Archive
                             </button>
                        ) : (
                             
                             <button onClick={() => handleRestore(doc.id)} className="text-sm font-semibold text-green-600 hover:text-green-800">
                                Restore
                             </button>
                        )}
                        
                        {/* Super Admin Delete */}
                        {user?.is_super_admin && (
                            <>
                                <div className="h-4 w-px bg-slate-200"></div>
                                <button onClick={() => handlePermanentDelete(doc.id)} className="text-sm font-semibold text-red-600 hover:text-red-800">
                                    Delete
                                </button>
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
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm font-bold text-slate-600">Page {currentPage} of {totalPages}</span>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </>
      )}
      
      {isModalOpen && <EditDocumentModal document={selectedDocument} onClose={() => setIsModalOpen(false)} onSave={handleSave}/>}
    </div>
  );
}