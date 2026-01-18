'use client';

import { useState, useEffect } from 'react';
import { getUserArchiveRequests, adminApproveUserArchive, adminRejectUserArchive } from '../../../services/apiService';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
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
  
  // Modal State
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, type: '', id: null });

  const { user, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || !user.is_super_admin)) router.push('/admin/documents');
  }, [user, authLoading, router]);

  const fetchData = async () => {
    try {
      const res = await getUserArchiveRequests();
      setUserRequests(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { if(user?.is_super_admin) fetchData(); }, [user]);

  // --- HANDLERS ---

  const initiateAction = (type, id) => {
    setConfirmConfig({ isOpen: true, type, id });
  };

  const executeAction = async () => {
    const { type, id } = confirmConfig;
    if (!id) return;
    
    // Close modal immediately
    setConfirmConfig({ ...confirmConfig, isOpen: false });

    try {
        if (type === 'approve') {
            await adminApproveUserArchive(id);
            toast.success("User deactivated successfully.");
        } else if (type === 'reject') {
            await adminRejectUserArchive(id);
            toast.success("Archive request rejected.");
        }
        // Remove from list
        setUserRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) { 
        toast.error("Action failed."); 
    }
  };

  if (!user?.is_super_admin) return null;

  const RequestCard = ({ title, sub, reason, onReject, onRequestApprove, colorClass, btnText }) => (
    <div className={`bg-white p-6 rounded-xl shadow-md border-l-4 ${colorClass} border-y border-r border-slate-100 flex flex-col md:flex-row justify-between items-start gap-4`}>
        <div className="flex-grow">
            <h3 className="font-bold text-lg text-slate-800">{title}</h3>
            <p className="text-xs text-slate-400 font-mono mb-3">{sub}</p>
            <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">&quot;{reason}&quot;</p>
        </div>
        <div className="flex gap-3 shrink-0">
            <button onClick={onReject} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition">Reject</button>
            <button onClick={onRequestApprove} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 shadow transition">{btnText}</button>
        </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-24">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900">User Archive Requests</h1>
        <p className="text-slate-500 text-sm mt-1">Review requests to deactivate or archive user accounts</p>
      </div>

      {loading ? <p className="text-center text-slate-400">Loading requests...</p> : userRequests.length === 0 ? (
          <div className="p-10 bg-white rounded-xl border border-slate-100 text-center text-slate-500 italic">No pending user requests.</div>
      ) : (
          <div className="grid gap-4">
          {userRequests.map(req => (
              <RequestCard 
                  key={req.id} 
                  title={`${req.first_name} ${req.last_name}`} 
                  sub={req.email} 
                  reason={req.archive_reason}
                  colorClass="border-l-orange-500" 
                  btnText="Deactivate User"
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
        title={confirmConfig.type === 'approve' ? 'Deactivate User?' : 'Reject Request?'}
        message={confirmConfig.type === 'approve' 
            ? "Are you sure you want to deactivate this user? They will lose access immediately."
            : "Are you sure you want to reject this request? The user will remain active."}
        confirmText={confirmConfig.type === 'approve' ? 'Deactivate' : 'Reject'}
        isDanger={confirmConfig.type === 'approve'} // Deactivation is the "dangerous" action here
      />
    </div>
  );
}