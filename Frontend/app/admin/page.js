'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AnalyticsDashboard from '../../components/AnalyticsDashboard';
import { 
  getAdminAnalytics, 
  getPendingDocuments, approveDocument, rejectDocument,
  getDocArchiveRequests, approveDocArchive, rejectDocArchive,
  getUserArchiveRequests, approveUserArchive, rejectUserArchive,
  getDeletionRequests, approveDeletion, rejectDeletion 
} from '../../services/apiService';
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, isDanger, showReasonInput }) => {
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setReason('');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleConfirm = () => {
    if (showReasonInput && !reason.trim()) {
      return toast.error("Please provide a reason.");
    }
    onConfirm(reason);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in relative">
        <div className="p-6 text-center">
          <h3 className={`text-lg font-bold mb-2 ${isDanger ? 'text-red-600' : 'text-slate-800'}`}>{title}</h3>
          <p className="text-slate-600 text-sm mb-4">{message}</p>
          
          {/* Reason Input */}
          {showReasonInput && (
            <textarea
              className="w-full p-2 border border-slate-300 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-red-500 outline-none"
              placeholder="Enter reason for rejection..."
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition">Cancel</button>
            <button onClick={handleConfirm} className={`px-4 py-2 text-white font-bold rounded-lg shadow-md transition ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-emerald-600'}`}>
              {confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
const RequestTable = ({ title, items, type, onAction, emptyMsg, colorClass, icon }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col w-full h-full">
    {/* Header */}
    <div className={`px-6 py-4 border-b border-slate-50 ${colorClass} bg-opacity-5 flex justify-between items-center`}>
       <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className={`font-bold text-lg ${colorClass}`}>{title}</h3>
       </div>
       <span className={`px-2 py-1 rounded-xs font-bold bg-white border border-slate-100 shadow-sm ${colorClass}`}>
          {items.length} Pending
       </span>
    </div>
    
    {/* Table Body */}
    <div className="overflow-y-auto max-h-[300px] flex-grow">
      <table className="w-full text-left text-sm">
        <tbody className="divide-y divide-slate-50">
          {items.length === 0 ? (
            <tr className="p-8 text-center text-slate-400 block w-full">
              <td className="py-10 italic">{emptyMsg}</td>
            </tr>
          ) : (
            items.map(item => {
              const reasonText = item.reason || item.archive_reason || item.deletion_reason || item.request_reason;
              const viewLink = item.downloadLink || item.filepath; 

              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 align-top">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-700 block mb-1">
                          {item.title || `${item.first_name} ${item.last_name}`}
                        </p>
                        {/* VIEW BUTTON */}
                        {viewLink && (
                           <a 
                             href={viewLink} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded hover:bg-blue-100 hover:text-blue-600 transition-colors"
                             title="View Document"
                           >
                             👁️ View
                           </a>
                        )}
                      </div>

                      {item.author_name && <p className="text-xs text-slate-400">By: {item.author_name}</p>}
                      
                      {reasonText && (
                        <p className="text-xs text-slate-500 italic bg-slate-50 p-1 rounded mt-1 border border-slate-100 inline-block">
                          "{reasonText}"
                        </p>
                      )}
                  </td>
                  <td className="p-4 align-top w-[180px]">
                      <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => onAction(type, item.id, 'approve')} 
                            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => onAction(type, item.id, 'reject')} 
                            className="px-3 py-1.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            Reject
                          </button>
                      </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default function AdminDashboardPage() {
  const { user, authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [docArchives, setDocArchives] = useState([]);
  const [userArchives, setUserArchives] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, type: '', id: null, action: '' });
  const isSuperAdmin = user?.is_super_admin;
  const isAdmin = user?.is_admin || isSuperAdmin;
  const isAdvisor = user?.is_adviser; 
  const isPrivileged = isAdmin || isAdvisor;
  const fetchAllData = async () => {
    try {
      try {
        const statsRes = await getAdminAnalytics();
        setStats(statsRes.data);
      } catch (e) { console.error("Stats error", e); }

      if (isAdmin) {
        getPendingDocuments().then(res => setPendingUploads(res.data || res)).catch(e => console.error("Uploads error", e));
        
        if (isSuperAdmin) {
            getDocArchiveRequests().then(res => setDocArchives(res.data || res)).catch(e => console.error("Doc Archive error", e));
            getUserArchiveRequests().then(res => setUserArchives(res.data || res)).catch(e => console.error("User Archive error", e));
            getDeletionRequests().then(res => setDeletionRequests(res.data || res)).catch(e => console.error("Deletion requests error", e));
        }
      }
    } catch (err) {
      console.error("Global fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
        fetchAllData();
    }
  }, [user, authLoading, isPrivileged]);
  const initiateAction = (type, id, action) => {
      setConfirmConfig({ isOpen: true, type, id, action });
  };

  const executeAction = async (reasonInput) => {
      const { type, id, action } = confirmConfig;
      if (!type || !id) return;
      const payload = reasonInput ? { reason: reasonInput } : {};

      try {
          if (type === 'upload') {
              action === 'approve' ? await approveDocument(id) : await rejectDocument(id, payload);
          } else if (type === 'docArchive') {
              action === 'approve' ? await approveDocArchive(id) : await rejectDocArchive(id);
          } else if (type === 'userArchive') {
              action === 'approve' ? await approveUserArchive(id) : await rejectUserArchive(id);
          } else if (type === 'deletion') {
              action === 'approve' ? await approveDeletion(id) : await rejectDeletion(id);
          }
          
          toast.success(`${action === 'approve' ? 'Approved' : 'Rejected'} successfully!`);
          fetchAllData(); 
      } catch (err) {
          toast.error("Action failed. Check console.");
          console.error(err);
      } finally {
          setConfirmConfig({ ...confirmConfig, isOpen: false });
      }
  };

  if (loading || authLoading) return <div className="p-20 text-center text-slate-400">Loading dashboard...</div>;

  return (
    <>
      <div className="space-y-12 animate-fade-in pb-24">
        
        {/* HEADER */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {isPrivileged ? 'Admin Dashboard' : 'Analytics Hub'}
          </h2>
          <p className="text-slate-500 mt-1">Welcome back, {user?.firstName}.</p>
        </div>

        {/* --- SECTION 1: STATS --- */}
        {isPrivileged && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</p>
                  <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats?.totalUsers || 0}</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Documents</p>
                  <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats?.totalDocuments || 0}</h3>
              </div>

              {isAdmin && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Tasks</p>
                      <h3 className="text-3xl font-extrabold text-orange-600 mt-2">
                          {isSuperAdmin 
                              ? pendingUploads.length + docArchives.length + userArchives.length + deletionRequests.length
                              : pendingUploads.length
                          }
                      </h3>
                  </div>
              )}
              
              <div className="bg-slate-900 p-5 rounded-2xl shadow-sm text-white flex flex-col justify-center gap-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Quick Actions</p>
                  <Link href="/admin/users" className="flex items-center justify-between hover:bg-white/10 p-2 -mx-2 rounded transition-colors group">
                    <span className="font-bold text-sm">Manage Users</span>
                    <span className="text-slate-400 group-hover:text-white transition-colors">&rarr;</span>
                  </Link>
                  {isAdmin && (
                      <>
                          <div className="border-t border-white/10"></div>
                          <Link href="/admin/documents" className="flex items-center justify-between hover:bg-white/10 p-2 -mx-2 rounded transition-colors group">
                            <span className="font-bold text-sm">Manage Documents</span>
                            <span className="text-slate-400 group-hover:text-white transition-colors">&rarr;</span>
                          </Link>
                      </>
                  )}
              </div>
          </div>
        )}

        {/* --- SECTION 2: GRID --- */}
        {isAdmin && (
            <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-800 border-l-4 border-indigo-600 pl-4">Pending Requests</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                    <div className={!isSuperAdmin ? "lg:col-span-2" : ""}>
                        <RequestTable 
                          title="Document Approvals" 
                          items={pendingUploads} 
                          type="upload" 
                          onAction={initiateAction} 
                          emptyMsg="No new documents to review."
                          colorClass="text-indigo-600"
                          icon="📄"
                        />
                    </div>

                    {isSuperAdmin && (
                      <>
                          <RequestTable 
                              title="Document Deletion Requests" 
                              items={deletionRequests} 
                              type="deletion" 
                              onAction={initiateAction} 
                              emptyMsg="No pending deletion requests."
                              colorClass="text-red-700"
                              icon="🗑️"
                          />

                          <RequestTable 
                              title="Document Archive Requests" 
                              items={docArchives} 
                              type="docArchive" 
                              onAction={initiateAction} 
                              emptyMsg="No document archive requests."
                              colorClass="text-orange-600"
                              icon="📦"
                          />

                          <RequestTable 
                              title="User Archive Requests" 
                              items={userArchives} 
                              type="userArchive" 
                              onAction={initiateAction} 
                              emptyMsg="No user archive requests."
                              colorClass="text-rose-600"
                              icon="👤"
                          />
                      </>
                    )}
                </div>
            </div>
        )}

        {/* --- SECTION 3: ANALYTICS --- */}
        <div className="mt-12 pt-12 border-t border-slate-200">
            <h3 className="text-2xl font-bold text-slate-800 mb-8 border-l-4 border-blue-500 pl-4">Research Analytics</h3>
            <AnalyticsDashboard stats={stats} user={user} />
        </div>

      </div>

      {/* MODAL IS NOW PORTALED OUTSIDE THE SCROLL FLOW */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({...confirmConfig, isOpen: false})}
        onConfirm={executeAction}
        title={confirmConfig.action === 'approve' ? 'Approve Request?' : 'Reject Request?'}
        message={`Are you sure you want to ${confirmConfig.action} this request?`}
        confirmText={confirmConfig.action === 'approve' ? 'Approve' : 'Reject'}
        isDanger={confirmConfig.action === 'reject'}
        showReasonInput={confirmConfig.action === 'reject'}
      />
    </>
  );
}