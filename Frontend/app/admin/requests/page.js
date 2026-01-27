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
  const [selectedIds, setSelectedIds] = useState([]);
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
      setSelectedIds([]);
    } catch (error) {
      console.error(`Failed to fetch ${filterType} requests`, error);
      toast.error("Failed to load requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };
  const formatReason = (text) => {
    if (!text) return "No reason provided";
    try {
        if (typeof text === 'string' && (text.startsWith('{') || text.startsWith('['))) {
            const parsed = JSON.parse(text);
            return parsed.reason || text;
        }
        if (typeof text === 'object' && text.reason) {
            return text.reason;
        }
    } catch (e) {
        return text;
    }
    return text;
  };
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(requests.map(req => req.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(itemId => itemId !== id));
    }
  };
  
  const initiateAction = (action, id = null) => {
    setConfirmConfig({ isOpen: true, action, id });
  };

  const executeAction = async () => {
    const { action, id } = confirmConfig;
    setConfirmConfig({ ...confirmConfig, isOpen: false });

    try {
        const idsToProcess = id ? [id] : selectedIds;

        if (action === 'approve') {
            if (filterType === 'archiving') {
                await Promise.all(idsToProcess.map(reqId => adminApproveArchive(reqId)));
                toast.success(`${idsToProcess.length} document(s) archived`);
            } else {
                await Promise.all(idsToProcess.map(reqId => adminApproveDeletion(reqId)));
                toast.success(`${idsToProcess.length} document(s) deleted`);
            }
        } else if (action === 'reject') {
            if (filterType === 'archiving') {
                await Promise.all(idsToProcess.map(reqId => adminRejectArchive(reqId)));
                toast.success(`${idsToProcess.length} request(s) rejected`);
            } else {
                await Promise.all(idsToProcess.map(reqId => adminRejectDeletion(reqId)));
                toast.success(`${idsToProcess.length} request(s) rejected`);
            }
        }
        
        fetchRequests();
    } catch (error) {
        toast.error(`${action === 'approve' ? 'Approval' : 'Rejection'} failed`);
        console.error(error);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4 border-b border-gray-200 pb-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">
            {filterType === 'archiving' ? 'Document Archiving Requests' : 'Deletion Requests'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">Manage pending requests from users</p>
        </div>

        {/* SELECT ALL TOGGLE */}
        {requests.length > 0 && (
            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                <input 
                    type="checkbox" 
                    id="selectAllRequests"
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    onChange={handleSelectAll}
                    checked={requests.length > 0 && selectedIds.length === requests.length}
                />
                <label htmlFor="selectAllRequests" className="text-sm font-bold text-slate-600 cursor-pointer select-none">
                    Select All
                </label>
            </div>
        )}
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
          <div className="sticky top-4 z-40 bg-indigo-600 text-white p-4 rounded-xl shadow-lg flex justify-between items-center animate-fade-in mb-6">
              <span className="font-bold text-sm px-2">
                  {selectedIds.length} requests selected
              </span>
              <div className="flex gap-3">
                  <button 
                      onClick={() => initiateAction('reject', null)} 
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition"
                  >
                      Reject Selected
                  </button>
                  <button 
                      onClick={() => initiateAction('approve', null)} 
                      className="bg-white text-indigo-700 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-50 transition shadow-sm"
                  >
                      Approve Selected
                  </button>
              </div>
          </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center border border-gray-100">
          <p className="text-gray-500 text-lg">No pending {filterType} requests found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div key={request.id} className={`bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-all ${selectedIds.includes(request.id) ? 'ring-2 ring-indigo-500 bg-indigo-50/10' : ''}`}>
              
              <div className="flex items-start gap-4 flex-grow">
                  {/* CHECKBOX */}
                  <input 
                      type="checkbox" 
                      className="mt-1.5 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={selectedIds.includes(request.id)}
                      onChange={(e) => handleSelectOne(e, request.id)}
                  />

                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg text-gray-900">{request.title || "Untitled Document"}</h3>
                    
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-slate-700">Reason:</span> {
                        formatReason(
                            filterType === 'archiving' 
                            ? request.archive_reason 
                            : request.deletion_reason
                        )
                      }
                    </p>

                    <div className="flex gap-3 text-xs text-gray-400 mt-1">
                        <span>Requested by: <span className="text-indigo-600 font-medium">{request.user_name || "Unknown User"}</span></span>
                        <span>•</span>
                        <span>Date: {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto pl-9 md:pl-0">
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
        title={
            confirmConfig.action === 'approve' 
            ? (confirmConfig.id ? 'Approve Request?' : `Approve ${selectedIds.length} Requests?`)
            : (confirmConfig.id ? 'Reject Request?' : `Reject ${selectedIds.length} Requests?`)
        }
        message={
            confirmConfig.action === 'approve' 
            ? "Are you sure you want to approve? This action cannot be undone."
            : "Are you sure you want to reject this request?"
        }
        confirmText={confirmConfig.action === 'approve' ? 'Approve' : 'Reject'}
        isDanger={confirmConfig.action === 'reject'}
      />
    </div>
  );
}