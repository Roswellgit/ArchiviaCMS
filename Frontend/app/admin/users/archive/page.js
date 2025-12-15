'use client';

import { useEffect, useState } from 'react';
import { getAllUsers, adminReactivateUser, adminDeleteUserPermanently } from '../../../../services/apiService';
import { useAuth } from '../../../../context/AuthContext';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function ArchivedUsers() {
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth(); 

  useEffect(() => {
    fetchArchivedUsers();
  }, []);

  const fetchArchivedUsers = async () => {
    try {
      setLoading(true);
      const response = await getAllUsers();
      
      const inactive = response.data.filter(u => !u.is_active);
      setArchivedUsers(inactive);
    } catch (err) {
      toast.error('Failed to fetch archived users.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (userId) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-bold text-slate-800 text-sm">Restore User?</p>
        <p className="text-xs text-slate-500">They will be able to log in again.</p>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={() => toast.dismiss(t.id)} className="text-xs text-slate-500 font-bold px-3 py-1 bg-slate-100 rounded hover:bg-slate-200">Cancel</button>
          <button onClick={() => {
              toast.dismiss(t.id);
              executeRestore(userId);
          }} className="text-xs bg-green-600 text-white font-bold px-3 py-1 rounded hover:bg-green-700">Restore</button>
        </div>
      </div>
    ), { duration: 6000, position: 'top-center', icon: '♻️' });
  };

  const executeRestore = async (userId) => {
    try {
      await adminReactivateUser(userId);
      toast.success('User restored.');
      fetchArchivedUsers(); 
    } catch (err) {
      toast.error('Failed to restore user.');
    }
  };

  
  const handleDelete = (userId) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-bold text-slate-800 text-sm">Delete Permanently?</p>
        <p className="text-xs text-slate-500">This cannot be undone.</p>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={() => toast.dismiss(t.id)} className="text-xs text-slate-500 font-bold px-3 py-1 bg-slate-100 rounded hover:bg-slate-200">Cancel</button>
          <button onClick={() => {
              toast.dismiss(t.id);
              executeDelete(userId);
          }} className="text-xs bg-red-600 text-white font-bold px-3 py-1 rounded hover:bg-red-700">Delete</button>
        </div>
      </div>
    ), { duration: 6000, position: 'top-center', icon: '⚠️' });
  };

  const executeDelete = async (userId) => {
    try {
      await adminDeleteUserPermanently(userId);
      toast.success('User permanently deleted.');
      fetchArchivedUsers();
    } catch (err) {
      toast.error('Failed to delete user.');
    }
  };

  if (loading) return <div className="text-center p-10 text-slate-400">Loading archive...</div>;

  return (
    <div className="space-y-6">
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

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Profile</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {archivedUsers.length === 0 ? (
              <tr><td colSpan="3" className="text-center py-10 text-slate-400 italic">No archived users found.</td></tr>
            ) : (
              archivedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-lg mr-4">
                            {user.first_name.charAt(0)}
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
                      onClick={() => handleRestore(user.id)}
                      className="text-green-600 hover:text-green-800 font-bold bg-green-50 px-4 py-2 rounded-lg transition-colors border border-green-100 hover:border-green-200"
                    >
                      Restore
                    </button>
                    
                    {/* ONLY SHOW DELETE IF SUPER ADMIN */}
                    {currentUser?.is_super_admin && (
                        <button
                            onClick={() => handleDelete(user.id)}
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
    </div>
  );
}