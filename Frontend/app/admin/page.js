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

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [stats, setStats] = useState(null);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [docArchives, setDocArchives] = useState([]);
  const [userArchives, setUserArchives] = useState([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState('uploads'); // 'uploads' | 'docArchives' | 'userArchives'

  // Permission Helper
  const isPrivileged = user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Advisor';

  // --- FETCH DATA ---
  const fetchAllData = async () => {
    try {
      // 1. Always fetch Analytics
      const statsRes = await getAdminAnalytics();
      setStats(statsRes.data);

      // 2. Only fetch Action Items if Admin/Advisor
      if (isPrivileged) {
        const [uploadsRes, docArcRes, userArcRes] = await Promise.all([
            getPendingDocuments(),
            getDocArchiveRequests(),
            getUserArchiveRequests()
        ]);
        setPendingUploads(uploadsRes.data || uploadsRes);
        setDocArchives(docArcRes.data || docArcRes);
        setUserArchives(userArcRes.data || userArcRes);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchAllData();
  }, [user, isPrivileged]);

  // --- HANDLERS ---
  
  const handleAction = async (type, id, action) => {
      const confirmMsg = `Are you sure you want to ${action} this request?`;
      if (!window.confirm(confirmMsg)) return;

      try {
          if (type === 'upload') {
              if(action === 'approve') await approveDocument(id);
              else await rejectDocument(id);
          } 
          else if (type === 'docArchive') {
              if(action === 'approve') await approveDocArchive(id);
              else await rejectDocArchive(id);
          }
          else if (type === 'userArchive') {
              if(action === 'approve') await approveUserArchive(id);
              else await rejectUserArchive(id);
          }
          
          toast.success("Success!");
          fetchAllData(); // Refresh list immediately
      } catch (err) {
          toast.error("Action failed");
          console.error(err);
      }
  };

  if (loading) return <div className="p-20 text-center text-slate-400">Loading dashboard...</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-200 pb-6">
        <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {isPrivileged ? 'Admin Dashboard' : 'Analytics Hub'}
            </h2>
            <p className="text-slate-500 mt-1">Overview for {user?.firstName}.</p>
        </div>
      </div>

      {/* --- SECTION 1: STATS CARDS (Admins Only) --- */}
      {isPrivileged && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats?.totalUsers || 0}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Documents</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats?.totalDocuments || 0}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Tasks</p>
                <h3 className="text-3xl font-extrabold text-orange-600 mt-2">
                    {pendingUploads.length + docArchives.length + userArchives.length}
                </h3>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl shadow-sm text-white flex flex-col justify-center">
                <Link href="/admin/users" className="text-sm font-bold bg-indigo-600 hover:bg-indigo-500 py-2 px-4 rounded-lg text-center transition">
                    Manage Users
                </Link>
            </div>
        </div>
      )}

      {/* --- SECTION 2: PENDING ACTION CENTER (Admins Only) --- */}
      {isPrivileged && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h3 className="font-bold text-lg text-slate-800">Action Center</h3>
                  
                  {/* TABS */}
                  <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                      <button 
                          onClick={() => setActiveTab('uploads')}
                          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'uploads' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                          Uploads ({pendingUploads.length})
                      </button>
                      <button 
                          onClick={() => setActiveTab('docArchives')}
                          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'docArchives' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                          Doc Archives ({docArchives.length})
                      </button>
                      <button 
                          onClick={() => setActiveTab('userArchives')}
                          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'userArchives' ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                          User Archives ({userArchives.length})
                      </button>
                  </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                  {/* UPLOADS LIST */}
                  {activeTab === 'uploads' && (
                      <table className="w-full text-left text-sm">
                          <tbody className="divide-y divide-gray-50">
                              {pendingUploads.length === 0 ? <tr className="p-4 text-center text-gray-400 block w-full"><td>No pending uploads.</td></tr> : 
                              pendingUploads.map(item => (
                                  <tr key={item.id} className="hover:bg-gray-50">
                                      <td className="p-4 font-medium">{item.title}</td>
                                      <td className="p-4 text-gray-500">{item.author_name}</td>
                                      <td className="p-4 text-right space-x-2">
                                          <button onClick={() => handleAction('upload', item.id, 'approve')} className="text-green-600 font-bold text-xs hover:underline">Approve</button>
                                          <button onClick={() => handleAction('upload', item.id, 'reject')} className="text-red-500 font-bold text-xs hover:underline">Reject</button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  )}

                  {/* DOC ARCHIVES LIST */}
                  {activeTab === 'docArchives' && (
                      <table className="w-full text-left text-sm">
                          <tbody className="divide-y divide-gray-50">
                              {docArchives.length === 0 ? <tr className="p-4 text-center text-gray-400 block w-full"><td>No document requests.</td></tr> : 
                              docArchives.map(item => (
                                  <tr key={item.id} className="hover:bg-gray-50">
                                      <td className="p-4 font-medium">{item.title}</td>
                                      <td className="p-4 text-gray-500 italic">"{item.archive_reason}"</td>
                                      <td className="p-4 text-right space-x-2">
                                          <button onClick={() => handleAction('docArchive', item.id, 'approve')} className="text-white bg-red-500 px-2 py-1 rounded text-xs font-bold">Archive</button>
                                          <button onClick={() => handleAction('docArchive', item.id, 'reject')} className="text-gray-500 font-bold text-xs hover:underline">Decline</button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  )}

                  {/* USER ARCHIVES LIST */}
                  {activeTab === 'userArchives' && (
                      <table className="w-full text-left text-sm">
                          <tbody className="divide-y divide-gray-50">
                              {userArchives.length === 0 ? <tr className="p-4 text-center text-gray-400 block w-full"><td>No user requests.</td></tr> : 
                              userArchives.map(item => (
                                  <tr key={item.id} className="hover:bg-gray-50">
                                      <td className="p-4 font-medium">{item.first_name} {item.last_name}</td>
                                      <td className="p-4 text-gray-500 italic">"{item.archive_reason}"</td>
                                      <td className="p-4 text-right space-x-2">
                                          <button onClick={() => handleAction('userArchive', item.id, 'approve')} className="text-white bg-red-600 px-2 py-1 rounded text-xs font-bold">Deactivate</button>
                                          <button onClick={() => handleAction('userArchive', item.id, 'reject')} className="text-gray-500 font-bold text-xs hover:underline">Decline</button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  )}
              </div>
          </div>
      )}

      {/* --- SECTION 3: ANALYTICS (Visible to Everyone, content adapts inside component) --- */}
      <div className="pt-4">
         <h3 className="font-bold text-xl text-slate-800 mb-4">Research Analytics</h3>
         <AnalyticsDashboard stats={stats} role={user?.role} />
      </div>

    </div>
  );
}