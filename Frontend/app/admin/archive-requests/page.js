'use client';

import { useState, useEffect } from 'react';
import { getUserArchiveRequests, adminApproveUserArchive, adminRejectUserArchive } from '../../../services/apiService';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
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
            <button onClick={onConfirm} className={`px-4 py-2 text-white font-bold rounded-lg shadow-md transition ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
              {confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminArchiveRequestsPage() {
  const [userRequests, setUserRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, type: '', id: null });

  const { user, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || !user.is_super_admin)) router.push('/admin/documents');
  }, [user, authLoading, router]);

  const fetchData = async () => {
    try {
      const res = await getUserArchiveRequests();
      setUserRequests(res.data || res);
      setSelectedRequestIds([]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { if(user?.is_super_admin) fetchData(); }, [user]);
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRequestIds(userRequests.map(r => r.id));
    } else {
      setSelectedRequestIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedRequestIds(prev => [...prev, id]);
    } else {
      setSelectedRequestIds(prev => prev.filter(item => item !== id));
    }
  };

  const initiateAction = (type, id = null) => {
    setConfirmConfig({ isOpen: true, type, id });
  };

  const executeAction = async () => {
    const { type, id } = confirmConfig;
    setConfirmConfig({ ...confirmConfig, isOpen: false });

    try {
        const idsToProcess = id ? [id] : selectedRequestIds;

        if (type === 'approve') {
            await Promise.all(idsToProcess.map(reqId => adminApproveUserArchive(reqId)));
            toast.success(`${idsToProcess.length > 1 ? 'Users' : 'User'} deactivated successfully.`);
        } else if (type === 'reject') {
            await Promise.all(idsToProcess.map(reqId => adminRejectUserArchive(reqId)));
            toast.success(`${idsToProcess.length > 1 ? 'Requests' : 'Request'} rejected.`);
        }
        fetchData();
    } catch (err) { 
        toast.error("Action failed."); 
        console.error(err);
    }
  };

  if (!user?.is_super_admin) return null;
  const RequestCard = ({ req, onReject, onRequestApprove }) => (
    <div className={`bg-white p-6 rounded-xl shadow-md border-l-4 border-l-orange-500 border-y border-r border-slate-100 flex flex-col md:flex-row justify-between items-start gap-4 transition-all ${selectedRequestIds.includes(req.id) ? 'ring-2 ring-orange-400 bg-orange-50/10' : ''}`}>
        
        <div className="flex items-start gap-4 flex-grow">
            {/* CHECKBOX */}
            <input 
                type="checkbox" 
                className="mt-1.5 w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                checked={selectedRequestIds.includes(req.id)}
                onChange={(e) => handleSelectOne(e, req.id)}
            />

            <div>
                <h3 className="font-bold text-lg text-slate-800">
                    {req.first_name} {req.last_name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mb-3">{req.email}</p>
                <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
                    &quot;{req.archive_reason}&quot;
                </p>
            </div>
        </div>

        <div className="flex gap-3 shrink-0 ml-9 md:ml-0 w-full md:w-auto">
            <button onClick={onReject} className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition text-sm">Reject</button>
            <button onClick={onRequestApprove} className="flex-1 md:flex-none px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 shadow transition text-sm">Deactivate User</button>
        </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-24">
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
            <h1 className="text-2xl font-extrabold text-slate-900">User Archive Requests</h1>
            <p className="text-slate-500 text-sm mt-1">Review requests to deactivate or archive user accounts</p>
        </div>
        
        {/* SELECT ALL TOGGLE */}
        {userRequests.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                <input 
                    type="checkbox" 
                    id="selectAllRequests"
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    onChange={handleSelectAll}
                    checked={userRequests.length > 0 && selectedRequestIds.length === userRequests.length}
                />
                <label htmlFor="selectAllRequests" className="text-sm font-bold text-slate-600 cursor-pointer select-none">
                    Select All
                </label>
            </div>
        )}
      </div>

      {/* BULK ACTION BAR */}
      {selectedRequestIds.length > 0 && (
          <div className="sticky top-4 z-40 bg-orange-600 text-white p-4 rounded-xl shadow-lg flex justify-between items-center animate-fade-in">
              <span className="font-bold text-sm px-2">
                  {selectedRequestIds.length} requests selected
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
                      className="bg-white text-orange-700 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-orange-50 transition shadow-sm"
                  >
                      Deactivate Selected
                  </button>
              </div>
          </div>
      )}

      {loading ? <p className="text-center text-slate-400">Loading requests...</p> : userRequests.length === 0 ? (
          <div className="p-10 bg-white rounded-xl border border-slate-100 text-center text-slate-500 italic">No pending user requests.</div>
      ) : (
          <div className="grid gap-4">
          {userRequests.map(req => (
              <RequestCard 
                  key={req.id} 
                  req={req}
                  onReject={() => initiateAction('reject', req.id)}
                  onRequestApprove={() => initiateAction('approve', req.id)}
              />
          ))}
          </div>
      )}

      {/* REUSABLE CONFIRMATION MODAL */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={executeAction}
        title={
            confirmConfig.type === 'approve' 
            ? (confirmConfig.id ? 'Deactivate User?' : `Deactivate ${selectedRequestIds.length} Users?`)
            : (confirmConfig.id ? 'Reject Request?' : `Reject ${selectedRequestIds.length} Requests?`)
        }
        message={
            confirmConfig.type === 'approve' 
            ? "Are you sure you want to deactivate these users? They will lose access immediately."
            : "Are you sure you want to reject these requests? The users will remain active."
        }
        confirmText={confirmConfig.type === 'approve' ? 'Deactivate' : 'Reject'}
        isDanger={confirmConfig.type === 'approve'}
      />
    </div>
  );
}