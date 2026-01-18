'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  getDeletionRequests, 
  adminApproveDeletion, 
  adminRejectDeletion,
  getArchiveRequests, 
  adminApproveArchive, 
  adminRejectArchive 
} from '../../../services/apiService';
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

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, action: '', id: null });

  const searchParams = useSearchParams();
  const filterType = searchParams.get('filter') || 'deletion'; 

  useEffect(() => {
    fetchRequests();
  }, [filterType]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let response;
      if (filterType === 'archiving') {
        response = await getArchiveRequests();
      } else {
        response = await getDeletionRequests();
      }
      
      const data = response && response.data ? response.data : [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(`Failed to fetch ${filterType} requests`, error);
      toast.error("Failed to load requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  
  const initiateAction = (action, id) => {
    setConfirmConfig({ isOpen: true, action, id });
  };

  const executeAction = async () => {
    const { action, id } = confirmConfig;
    if (!id) return;

    // Close modal immediately for better UX
    setConfirmConfig({ ...confirmConfig, isOpen: false });

    try {
      if (action === 'approve') {
          if (filterType === 'archiving') {
            await adminApproveArchive(id);
            toast.success('Document archived');
          } else {
            await adminApproveDeletion(id);
            toast.success('Document deleted');
          }
      } else if (action === 'reject') {
          if (filterType === 'archiving') {
            await adminRejectArchive(id);
            toast.success('Archive request rejected');
          } else {
            await adminRejectDeletion(id);
            toast.success('Deletion request rejected');
          }
      }
      fetchRequests(); // Refresh list
    } catch (error) {
      toast.error(`${action === 'approve' ? 'Approval' : 'Rejection'} failed`);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {filterType === 'archiving' ? 'Document Archiving Requests' : 'Deletion Requests'}
        </h1>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center border border-gray-100">
          <p className="text-gray-500 text-lg">No pending {filterType} requests found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-gray-900">{request.title || "Untitled Document"}</h3>
                
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-slate-700">Reason:</span> {
                    filterType === 'archiving' 
                      ? (request.archive_reason || "No reason provided") 
                      : (request.deletion_reason || "No reason provided")
                  }
                </p>

                <div className="flex gap-3 text-xs text-gray-400 mt-1">
                   <span>Requested by: <span className="text-indigo-600 font-medium">{request.user_name || "Unknown User"}</span></span>
                   <span>•</span>
                   <span>Date: {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                <button 
                    onClick={() => initiateAction('reject', request.id)} 
                    className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Reject
                </button>
                <button 
                    onClick={() => initiateAction('approve', request.id)} 
                    className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={executeAction}
        title={confirmConfig.action === 'approve' ? 'Approve Request?' : 'Reject Request?'}
        message={confirmConfig.action === 'approve' 
            ? "Are you sure you want to approve this request? This action cannot be undone."
            : "Are you sure you want to reject this request?"}
        confirmText={confirmConfig.action === 'approve' ? 'Approve' : 'Reject'}
        isDanger={confirmConfig.action === 'reject'}
      />
    </div>
  );
}