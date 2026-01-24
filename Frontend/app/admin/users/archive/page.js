'use client';

import { useEffect, useState } from 'react';
import { getAllUsers, adminReactivateUser, adminDeleteUserPermanently } from '../../../../services/apiService';
import { useAuth } from '../../../../context/AuthContext';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// --- Reusable Confirmation Modal ---
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
            <button onClick={onConfirm} className={`px-4 py-2 text-white font-bold rounded-lg shadow-md transition ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
              {confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ArchivedUsers() {
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth(); 
  
  // BULK STATE
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal State (id: null means bulk)
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, type: '', id: null });

  useEffect(() => {
    fetchArchivedUsers();
  }, []);

  const fetchArchivedUsers = async () => {
    try {
      setLoading(true);
      const response = await getAllUsers();
      
      const allUsers = Array.isArray(response) ? response : (response.data || []);
      const inactive = allUsers.filter(u => !u.is_active);
      
      setArchivedUsers(inactive);
      setSelectedIds([]); // Reset
    } catch (err) {
      toast.error('Failed to fetch archived users.');
    } finally {
      setLoading(false);
    }
  };

  // --- BULK SELECTION HANDLERS ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(archivedUsers.map(u => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  // --- HANDLERS ---
  const initiateAction = (type, id = null) => {
    setConfirmConfig({ isOpen: true, type, id });
  };

  const executeAction = async () => {
    const { type, id } = confirmConfig;
    
    // Close immediately
    setConfirmConfig({ ...confirmConfig, isOpen: false });

    try {
        const idsToProcess = id ? [id] : selectedIds;

        if (type === 'restore') {
            await Promise.all(idsToProcess.map(uid => adminReactivateUser(uid)));
            toast.success(`${idsToProcess.length > 1 ? 'Users' : 'User'} restored successfully.`);
        } else if (type === 'delete') {
            await Promise.all(idsToProcess.map(uid => adminDeleteUserPermanently(uid)));
            toast.success(`${idsToProcess.length > 1 ? 'Users' : 'User'} permanently deleted.`);
        }
        
        // Refresh list
        fetchArchivedUsers();
        
    } catch (err) {
        toast.error(`Failed to ${type} user(s).`);
    }
  };

  if (loading) return <div className="text-center p-10 text-slate-400">Loading archive...</div>;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
            <h2 className="text-3xl font-extrabold text-slate-900">Archived Users</h2>
            <p className="text-slate-500 text-sm mt-1">View and restore deactivated accounts</p>
        </div>
        <Link href="/admin/users">
          <button className="px-5 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition shadow-sm flex items-center gap-2">
            <span>&larr;</span> Back to Active Users
          </button>
        </Link>
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && currentUser?.is_super_admin && (
          <div className="bg-slate-800 text-white p-3 rounded-xl flex justify-between items-center animate-fade-in mb-4 shadow-lg">
              <span className="font-bold text-sm px-2">
                  {selectedIds.length} selected
              </span>
              <div className="flex gap-2">
                  <button 
                      onClick={() => initiateAction('restore', null)} 
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition"
                  >
                      Restore Selected
                  </button>
                  <button 
                      onClick={() => initiateAction('delete', null)} 
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition shadow-sm"
                  >
                      Delete Selected
                  </button>
              </div>
          </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              {/* SELECT ALL */}
              {currentUser?.is_super_admin && (
                  <th className="px-6 py-4 w-10">
                      <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          onChange={handleSelectAll}
                          checked={archivedUsers.length > 0 && selectedIds.length === archivedUsers.length}
                      />
                  </th>
              )}
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Profile</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {archivedUsers.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-10 text-slate-400 italic">No archived users found.</td></tr>
            ) : (
              archivedUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(user.id) ? 'bg-indigo-50/30' : ''}`}>
                  {/* CHECKBOX */}
                  {currentUser?.is_super_admin && (
                      <td className="px-6 py-4">
                          <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              checked={selectedIds.includes(user.id)}
                              onChange={(e) => handleSelectOne(e, user.id)}
                          />
                      </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-lg mr-4">
                            {user.first_name?.charAt(0)}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-700">{user.first_name} {user.last_name}</div>
                            <div className="text-sm text-slate-400">{user.email}</div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.is_admin ? (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Former Admin
                      </span>
                    ) : (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-slate-50 text-slate-400 border border-slate-100">
                        Former User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      onClick={() => initiateAction('restore', user.id)}
                      className="text-green-600 hover:text-green-800 font-bold bg-green-50 px-4 py-2 rounded-lg transition-colors border border-green-100 hover:border-green-200"
                    >
                      Restore
                    </button>
                    
                    {/* ONLY SHOW DELETE IF SUPER ADMIN */}
                    {currentUser?.is_super_admin && (
                        <button
                            onClick={() => initiateAction('delete', user.id)}
                            className="text-white font-bold bg-red-600 px-4 py-2 rounded-lg transition-colors hover:bg-red-700 shadow-sm"
                        >
                            Delete Permanently
                        </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* REUSABLE CONFIRMATION MODAL */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={executeAction}
        title={
            confirmConfig.type === 'restore' 
            ? (confirmConfig.id ? 'Restore User?' : `Restore ${selectedIds.length} Users?`)
            : (confirmConfig.id ? 'Delete Permanently?' : `Delete ${selectedIds.length} Users?`)
        }
        message={
            confirmConfig.type === 'restore' 
            ? "These users will be reactivated and able to log in again."
            : "Are you sure? This action cannot be undone."
        }
        confirmText={confirmConfig.type === 'restore' ? 'Restore' : 'Delete'}
        isDanger={confirmConfig.type === 'delete'}
      />
    </div>
  );
}