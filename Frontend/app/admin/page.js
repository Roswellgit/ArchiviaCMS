'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AnalyticsDashboard from '../../components/AnalyticsDashboard';

// API Imports
import { 
  getAdminAnalytics, 
  getPendingDocuments, approveDocument, rejectDocument,
  getDocArchiveRequests, approveDocArchive, rejectDocArchive,
  getUserArchiveRequests, approveUserArchive, rejectUserArchive
} from '../../services/apiService';

// --- HELPER: CONFIRMATION MODAL ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, isDanger }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in">
        <div className="p-6 text-center">
          <h3 className={`text-lg font-bold mb-2 ${isDanger ? 'text-red-600' : 'text-slate-800'}`}>{title}</h3>
          <p className="text-slate-600 text-sm mb-6">{message}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition">Cancel</button>
            <button onClick={onConfirm} className={`px-4 py-2 text-white font-bold rounded-lg shadow-md transition ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-emerald-600'}`}>
              {confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- HELPER COMPONENT: REQUEST TABLE ---
const RequestTable = ({ title, items, type, onAction, emptyMsg, colorClass, icon }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col w-full">
    {/* Header */}
    <div className={`px-6 py-4 border-b border-slate-50 ${colorClass} bg-opacity-5 flex justify-between items-center`}>
       <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className={`font-bold text-lg ${colorClass}`}>{title}</h3>
       </div>
       <span className={`px-2 py-1 rounded text-xs font-bold bg-white border border-slate-100 shadow-sm ${colorClass}`}>
          {items.length} Pending
       </span>
    </div>
    
    {/* Table Body */}
    <div className="overflow-y-auto max-h-[350px]">
      <table className="w-full text-left text-sm">
        <tbody className="divide-y divide-slate-50">
          {items.length === 0 ? (
            <tr className="p-8 text-center text-slate-400 block w-full">
              <td className="py-10 italic">{emptyMsg}</td>
            </tr>
          ) : (
            items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                <td className="p-4 align-top">
                   <p className="font-bold text-slate-700 block mb-1">
                      {item.title || `${item.first_name} ${item.last_name}`}
                   </p>
                   {item.author_name && <p className="text-xs text-slate-400">By: {item.author_name}</p>}
                   {item.archive_reason && <p className="text-xs text-slate-500 italic bg-slate-50 p-1 rounded mt-1 border border-slate-100 inline-block">"{item.archive_reason}"</p>}
                </td>
                <td className="p-4 text-right align-top space-x-2 w-[160px]">
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
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default function AdminDashboardPage() {
  const { user, authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [stats, setStats] = useState(null);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [docArchives, setDocArchives] = useState([]);
  const [userArchives, setUserArchives] = useState([]);

  // Modal State
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, type: '', id: null, action: '' });

  // Role Checks
  const isSuperAdmin = user?.is_super_admin;
  const isAdmin = user?.is_admin || isSuperAdmin;
  const isAdvisor = user?.is_adviser; 
  const isPrivileged = isAdmin || isAdvisor;

  // --- SAFE FETCH DATA ---
  const fetchAllData = async () => {
    try {
      // 1. Fetch Stats (Independent)
      try {
        const statsRes = await getAdminAnalytics();
        setStats(statsRes.data);
      } catch (e) { console.error("Stats error", e); }

      // 2. Fetch Lists (Only if Admin)
      if (isAdmin) {
        // Everyone (Admins) fetches Pending Documents
        getPendingDocuments().then(res => setPendingUploads(res.data || res)).catch(e => console.error("Uploads error", e));
        
        // ✅ UPDATE: Only fetch Archive requests if Super Admin
        if (isSuperAdmin) {
            getDocArchiveRequests().then(res => setDocArchives(res.data || res)).catch(e => console.error("Doc Archive error", e));
            getUserArchiveRequests().then(res => setUserArchives(res.data || res)).catch(e => console.error("User Archive error", e));
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

  // --- ACTION HANDLERS ---
  
  const initiateAction = (type, id, action) => {
      setConfirmConfig({ isOpen: true, type, id, action });
  };

  const executeAction = async () => {
      const { type, id, action } = confirmConfig;
      if (!type || !id) return;

      try {
          if (type === 'upload') {
              action === 'approve' ? await approveDocument(id) : await rejectDocument(id);
          } else if (type === 'docArchive') {
              action === 'approve' ? await approveDocArchive(id) : await rejectDocArchive(id);
          } else if (type === 'userArchive') {
              action === 'approve' ? await approveUserArchive(id) : await rejectUserArchive(id);
          }
          
          toast.success(`${action === 'approve' ? 'Approved' : 'Rejected'} successfully!`);
          fetchAllData(); // Refresh data
      } catch (err) {
          toast.error("Action failed. Check console.");
          console.error(err);
      } finally {
          setConfirmConfig({ ...confirmConfig, isOpen: false });
      }
  };

  if (loading || authLoading) return <div className="p-20 text-center text-slate-400">Loading dashboard...</div>;

  return (
    <div className="space-y-12 animate-fade-in pb-24">
      
      {/* HEADER */}
      <div className="border-b border-gray-200 pb-6">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isPrivileged ? 'Admin Dashboard' : 'Analytics Hub'}
        </h2>
        <p className="text-slate-500 mt-1">Welcome back, {user?.firstName}.</p>
      </div>

      {/* --- SECTION 1: STATS CARDS --- */}
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
                        {/* Only calculate relevant tasks based on role */}
                        {isSuperAdmin 
                            ? pendingUploads.length + docArchives.length + userArchives.length 
                            : pendingUploads.length
                        }
                    </h3>
                </div>
            )}
            
            {/* QUICK ACTIONS CARD */}
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

      {/* --- SECTION 2: SEPARATE PENDING MODULES --- */}
      {isAdmin && (
          <div className="space-y-6">
              <h3 className="text-2xl font-bold text-slate-800 border-l-4 border-indigo-600 pl-4">Pending Requests</h3>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  
                  {/* 1. DOCUMENT APPROVALS (Visible to all Admins) */}
                  <div className={isSuperAdmin ? "xl:col-span-2" : "xl:col-span-2"}>
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

                  {/* 2. DOCUMENT ARCHIVE REQUESTS (Super Admin Only) */}
                  {isSuperAdmin && (
                    <RequestTable 
                        title="Document Archive Requests" 
                        items={docArchives} 
                        type="docArchive" 
                        onAction={initiateAction} 
                        emptyMsg="No document archive requests."
                        colorClass="text-orange-600"
                        icon="📦"
                    />
                  )}

                  {/* 3. USER ARCHIVE REQUESTS (Super Admin Only) */}
                  {isSuperAdmin && (
                    <RequestTable 
                        title="User Archive Requests" 
                        items={userArchives} 
                        type="userArchive" 
                        onAction={initiateAction} 
                        emptyMsg="No user archive requests."
                        colorClass="text-red-600"
                        icon="👤"
                    />
                  )}
              </div>
          </div>
      )}

      {/* --- SECTION 3: ANALYTICS --- */}
      <div className="mt-12 pt-12 border-t border-slate-200">
          <h3 className="text-2xl font-bold text-slate-800 mb-8 border-l-4 border-blue-500 pl-4">Research Analytics</h3>
          <AnalyticsDashboard stats={stats} user={user} />
      </div>

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({...confirmConfig, isOpen: false})}
        onConfirm={executeAction}
        title={confirmConfig.action === 'approve' ? 'Approve Request?' : 'Reject Request?'}
        message={`Are you sure you want to ${confirmConfig.action} this request?`}
        confirmText={confirmConfig.action === 'approve' ? 'Approve' : 'Reject'}
        isDanger={confirmConfig.action === 'reject'}
      />

    </div>
  );
}