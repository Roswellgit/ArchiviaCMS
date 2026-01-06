'use client';

import { useEffect, useState } from 'react';
import { getAllUsers, adminUpdateUser, adminDeleteUser } from '../../../services/apiService';
import { useAuth } from '../../../context/AuthContext';
import EditUserModal from '../../../components/EditUserModal';
import CreateUserModal from '../../../components/CreateUserModal'; // <--- IMPORT THIS
import { toast } from 'react-hot-toast';
import Link from 'next/link'; 

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: adminUser } = useAuth();

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // <--- NEW STATE

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getAllUsers();
      // Handle response.data or direct array
      const userList = Array.isArray(response) ? response : (response.data || []);
      // Filter for active users
      setUsers(userList.filter(u => u.is_active || u.isActive));
    } catch (err) {
      toast.error('Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  const initiateArchive = (targetUser) => {
    if (targetUser.id === adminUser.userId) return toast.error("You cannot archive your own account.");
    if (targetUser.is_super_admin && !adminUser.is_super_admin) return toast.error("Access Denied: Super Admin protected.");
    
    // Check if Super Admin (Direct Action) or Admin (Reason Required)
    if (adminUser.is_super_admin) {
        toast((t) => (
            <div className="flex flex-col gap-2">
              <p className="font-bold text-slate-800 text-sm">Archive User?</p>
              <p className="text-xs text-slate-500">Archive <span className="font-bold">{targetUser.first_name}</span> immediately?</p>
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => toast.dismiss(t.id)} className="text-xs text-slate-500 font-bold px-3 py-1 bg-slate-100 rounded hover:bg-slate-200">Cancel</button>
                <button onClick={() => {
                    adminDeleteUser(targetUser.id)
                        .then(() => { toast.success("User archived.", { id: t.id }); fetchUsers(); })
                        .catch(() => toast.error("Archive failed.", { id: t.id }));
                }} className="text-xs bg-red-600 text-white font-bold px-3 py-1 rounded hover:bg-red-700">Confirm</button>
              </div>
            </div>
        ), { duration: 2000, icon: '⚠️' });
    } else {
        // Admin Request Mode
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[300px]">
              <p className="font-bold text-slate-800 text-sm">Request Archive:</p>
              <p className="text-xs text-slate-500">Reason for archiving <span className="font-bold">{targetUser.first_name}</span>?</p>
              <form 
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const reason = e.target.elements.reason.value;
                  if (!reason.trim()) return toast.error("Reason is required", { id: t.id });
                  
                  adminDeleteUser(targetUser.id, { reason })
                      .then(() => { toast.success("Request sent.", { id: t.id }); fetchUsers(); })
                      .catch(() => toast.error("Request failed.", { id: t.id }));
                }}
              >
                <input 
                  name="reason" 
                  placeholder="Type reason..." 
                  className="border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
                <div className="flex gap-2 justify-end pt-1">
                   <button type="button" onClick={() => toast.dismiss(t.id)} className="text-xs text-slate-500 font-bold px-3 py-1.5 hover:bg-slate-100 rounded">Cancel</button>
                   <button type="submit" className="text-xs bg-red-600 text-white font-bold px-3 py-1.5 rounded hover:bg-red-700">Send Request</button>
                </div>
              </form>
            </div>
        ), { duration: 2000, icon: '📂' });
    }
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
      {/* Header with Create Button */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 pb-4 border-b border-slate-200">
        <div>
            <h2 className="text-3xl font-extrabold text-slate-900">User Management</h2>
            <p className="text-slate-500 text-sm mt-1">Manage accounts and permissions</p>
        </div>
        
        <div className="flex gap-3">
            {/* CREATE BUTTON */}
            <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center gap-2"
            >
                <span className="text-xl leading-none font-light">+</span> Create User
            </button>

            <Link href="/admin/users/archive">
                <button className="px-5 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition shadow-sm">
                    View Archives
                </button>
            </Link>
        </div>
      </div>

      {/* Users Table */}
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
                            {user.first_name ? user.first_name.charAt(0) : '?'}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-900">{user.first_name} {user.last_name}</div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Display 'role' string if available, else fallback to booleans */}
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full 
                        ${user.role === 'Super Admin' ? 'bg-purple-100 text-purple-700' : 
                          user.role === 'Admin' ? 'bg-indigo-100 text-indigo-700' :
                          user.role === 'Advisor' ? 'bg-orange-100 text-orange-800' :
                          user.role === 'Student' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-600'}`}>
                        {user.role || (user.is_super_admin ? 'Super Admin' : user.is_admin ? 'Admin' : 'User')}
                    </span>
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

      {/* Edit Modal */}
      <EditUserModal 
        user={selectedUser} 
        isOpen={isEditModalOpen} 
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }} 
        onSave={handleSave} 
      />

      {/* NEW: Create User Modal */}
      <CreateUserModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchUsers} // Refresh list after create
      />
    </div>
  );
}