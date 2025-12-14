'use client';

import { useEffect, useState } from 'react';
import EditDocumentModal from './EditDocumentModal'; 
import { getMyUploads, updateDocument, requestDeletion } from '../services/apiService';
import { toast } from 'react-hot-toast'; 

export default function MyUploadsList() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  useEffect(() => { fetchUploads(); }, []);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const response = await getMyUploads();
      setDocuments(response.data);
    } catch (err) { toast.error('Fetch failed.'); } 
    finally { setLoading(false); }
  };

  const handleEdit = (doc) => { setSelectedDocument(doc); setIsModalOpen(true); };

  const handleSave = async (docId, updatedData) => {
    try { await updateDocument(docId, updatedData); await fetchUploads(); toast.success("Saved."); } 
    catch (e) { toast.error("Save failed."); }
  };

  const handleDeleteRequest = (doc) => {
    if (doc.deletion_requested) return toast("Request already pending.");
    
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[300px]">
        <p className="font-bold text-slate-800 text-sm">Reason for deletion:</p>
        <p className="text-xs text-slate-500">Why do you want to delete <span className="font-bold">{doc.title}</span>?</p>
        <form 
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const reason = e.target.elements.reason.value;
            if (!reason.trim()) return toast.error("Reason is required", { id: t.id });
            
            // Execute request
            requestDeletion(doc.id, reason)
                .then(() => {
                    toast.success("Request sent.", { id: t.id });
                    fetchUploads();
                })
                .catch(() => toast.error("Request failed.", { id: t.id }));
          }}
        >
          <textarea 
            name="reason" 
            placeholder="Type reason..." 
            className="border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[60px]"
            autoFocus
          />
          <div className="flex gap-2 justify-end pt-1">
             <button type="button" onClick={() => toast.dismiss(t.id)} className="text-xs text-slate-500 font-bold px-3 py-1.5 hover:bg-slate-100 rounded">Cancel</button>
             <button type="submit" className="text-xs bg-red-600 text-white font-bold px-3 py-1.5 rounded hover:bg-red-700">Submit Request</button>
          </div>
        </form>
      </div>
    ), { duration: Infinity, position: 'top-center', icon: '🗑️' });
  };
  
  if (loading) return <p className="text-center text-slate-400 p-10">Loading...</p>;

  return (
    <div className="space-y-4">
      {documents.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-500 font-medium">You haven&apos;t uploaded any documents.</p>
            <a href="/upload" className="mt-4 inline-block px-6 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 transition">Upload Now</a>
        </div>
      ) : (
        documents.map(doc => (
            <div key={doc.id} className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">{doc.title || "Untitled"}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700">Authors:</span> {doc.ai_authors?.length ? doc.ai_authors.join(', ') : 'N/A'}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <span>{doc.ai_date_created || 'Date Unknown'}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => handleEdit(doc)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition">Edit</button>
                    <button
                        onClick={() => handleDeleteRequest(doc)}
                        disabled={doc.deletion_requested}
                        className={`px-4 py-2 text-white font-bold rounded-lg transition shadow-sm ${doc.deletion_requested ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}
                    >
                        {doc.deletion_requested ? "Pending" : "Delete"}
                    </button>
                </div>
            </div>
        ))
      )}
      
      {isModalOpen && <EditDocumentModal document={selectedDocument} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
    </div>
  );
}