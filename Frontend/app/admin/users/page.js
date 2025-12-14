'use client';

import { useEffect, useState } from 'react';
import { getAllUsers, adminUpdateUser, adminDeleteUser } from '../../../services/apiService';
import { useAuth } from '../../../context/AuthContext';
import EditUserModal from '../../../components/EditUserModal';
import RequestModal from '../../../components/RequestModal'; 
import { toast } from 'react-hot-toast';
import Link from 'next/link'; 

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: adminUser } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [userToArchive, setUserToArchive] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getAllUsers();
      setUsers(response.data.filter(u => u.is_active));
    } catch (err) {
      toast.error('Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  const initiateArchive = (targetUser) => {
    if (targetUser.id === adminUser.userId) return toast.error("You cannot archive your own account.");
    if (targetUser.is_super_admin && !adminUser.is_super_admin) return toast.error("Access Denied: Super Admin protected.");
    setUserToArchive(targetUser);
    setIsArchiveModalOpen(true);
  };

  const handleConfirmArchive = async (reason) => {
    try {
        if (adminUser.is_super_admin) {
             await adminDeleteUser(userToArchive.id);
             toast.success('User archived.');
        } else {
             if (!reason.trim()) return toast.error("Reason is required.");
             await adminDeleteUser(userToArchive.id, { reason });
             toast.success('Archive request submitted.');
        }
        setIsArchiveModalOpen(false);
        setUserToArchive(null);
        fetchUsers(); 
    } catch (err) { toast.error('Action failed.'); }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleSave = async (userId, updatedData) => {
    if (userId === adminUser.userId && !updatedData.is_admin) return toast.error("Cannot remove own admin status.");
    try {
      await adminUpdateUser(userId, updatedData); 
      toast.success('User updated.');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers(); 
    } catch (err) { toast.error('Update failed.'); }
  };

  if (loading) return <div className="text-center p-10 text-slate-400">Loading users...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
            <h2 className="text-3xl font-extrabold text-slate-900">User Management</h2>
            <p className="text-slate-500 text-sm mt-1">Manage accounts and permissions</p>
        </div>
        <Link href="/admin/users/archive">
          <button className="px-5 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition shadow-sm">
            View Archives
          </button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Profile</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => {
              const isPending = user.archive_requested;
              const isDisabled = user.id === adminUser.userId || isPending || (user.is_super_admin && !adminUser.is_super_admin);

              return (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg mr-4">
                            {user.first_name.charAt(0)}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-900">{user.first_name} {user.last_name}</div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_admin ? (
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${user.is_super_admin ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {user.is_super_admin ? 'Super Admin' : 'Admin'}
                      </span>
                    ) : (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-slate-100 text-slate-600">User</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(user)} className="text-indigo-600 hover:text-indigo-900 font-semibold mr-4">Edit</button>
                    <button
                      onClick={() => initiateArchive(user)}
                      className={`font-semibold ${isDisabled ? 'text-slate-300 cursor-not-allowed' : isPending ? 'text-orange-500' : 'text-red-500 hover:text-red-700'}`}
                      disabled={isDisabled}
                    >
                      {isPending ? 'Pending' : (adminUser.is_super_admin ? 'Archive' : 'Request Archive')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && <div className="p-8 text-center text-slate-400">No active users found.</div>}
      </div>

      <EditUserModal 
        user={selectedUser} 
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }} 
        onSave={handleSave} 
      />
      
      <RequestModal 
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        onSubmit={handleConfirmArchive}
        title="Confirm User Action"
        message={<p>Archive user <span className="font-bold text-slate-900">{userToArchive?.first_name}</span>?</p>}
        actionLabel={adminUser.is_super_admin ? "Archive User" : "Send Request"}
        confirmColor="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
}