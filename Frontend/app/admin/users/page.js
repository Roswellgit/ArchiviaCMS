'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/apiService'; 
import { getAllUsers, adminUpdateUser, adminDeleteUser } from '../../../services/apiService';
import EditUserModal from '../../../components/EditUserModal';

export default function ManageUsersPage() {
  const { user: currentUser, authLoading } = useAuth();
  const router = useRouter();

  // --- STATE ---
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form Data
  const [newUser, setNewUser] = useState({
    firstName: '', lastName: '', email: '', password: '', 
    role: 'student', schoolId: '', accessLevel: 'Student', groupId: ''
  });
  const [newGroup, setNewGroup] = useState({ name: '' });

  // --- PERMISSIONS ---
  const isSuperAdmin = currentUser?.is_super_admin;
  const isAdmin = currentUser?.is_admin || isSuperAdmin;
  const isAdvisor = currentUser?.is_adviser;
  
  // Allow Advisors to access this page
  const isPrivileged = isAdmin || isAdvisor;

  // --- FETCH DATA ---
  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Users using your existing service
      const usersResponse = await getAllUsers();
      const userList = Array.isArray(usersResponse) ? usersResponse : (usersResponse.data || []);
      
      // Fetch Groups (New Endpoint)
      let groupList = [];
      try {
         const groupsRes = await api.get('/admin/groups');
         groupList = groupsRes.data;
      } catch (e) {
         console.warn("Groups endpoint not ready yet");
      }

      setUsers(userList);
      setGroups(groupList);
    } catch (err) {
      console.error("Failed to load data", err);
      toast.error("Could not load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isPrivileged) {
        router.push('/'); // Redirect if not allowed
      } else {
        fetchData();
      }
    }
  }, [authLoading, isPrivileged]);

  // --- HANDLERS ---

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      // Force role for Advisors
      const payload = { ...newUser };
      
      // If Advisor, FORCE role to Student
      if (isAdvisor && !isAdmin) {
          payload.role = 'student';
          payload.accessLevel = 'Student';
      } else {
          // Map accessLevel dropdown to lowercase role for DB
          payload.role = newUser.accessLevel === 'Advisor' ? 'adviser' : newUser.accessLevel.toLowerCase();
      }

      // Send to your create user endpoint
      await api.post('/admin/users', payload);
      
      toast.success("User created successfully!");
      setShowUserModal(false);
      // Reset Form
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'student', schoolId: '', accessLevel: 'Student', groupId: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create user.");
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/groups', { name: newGroup.name });
      toast.success("Group created successfully!");
      setShowGroupModal(false);
      setNewGroup({ name: '' });
      fetchData(); // Refresh groups
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create group.");
    }
  };

  // ✅ NEW: Delete Group Handler
  const handleDeleteGroup = async (groupId, groupName) => {
    if (!confirm(`Are you sure you want to delete the group "${groupName}"? Students in this group will be unassigned.`)) {
        return;
    }
    try {
        await api.delete(`/admin/groups/${groupId}`);
        toast.success("Group deleted successfully.");
        fetchData();
    } catch (err) {
        console.error("Delete Group Error:", err);
        toast.error(err.response?.data?.message || "Failed to delete group.");
    }
  };

  // Archive Logic
  const initiateArchive = (targetUser) => {
    if (targetUser.id === currentUser.userId) return toast.error("You cannot archive your own account.");
    
    // Quick confirmation toast
    if (confirm(`Are you sure you want to archive ${targetUser.first_name}?`)) {
         adminDeleteUser(targetUser.id, { reason: 'Admin Action' })
            .then(() => { toast.success("User archived."); fetchData(); })
            .catch(() => toast.error("Archive failed."));
    }
  };

  // Edit Logic (Function exists for modal, but button removed)
  const handleEdit = (user) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (userId, updatedData) => {
    try {
      await adminUpdateUser(userId, updatedData); 
      toast.success('User updated.');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchData(); 
    } catch (err) { toast.error('Update failed.'); }
  };


  if (authLoading || loading) return <div className="p-10 text-center">Loading...</div>;
  if (!isPrivileged) return null; 

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isAdvisor ? 'My Students & Groups' : 'User Management'}
          </h1>
          <p className="text-slate-500">
            {isAdvisor ? 'Manage your research groups and student accounts.' : 'Manage all system accounts.'}
          </p>
        </div>
        
        <div className="flex gap-3">
           <button 
            onClick={() => setShowGroupModal(true)}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
           >
            + New Group
           </button>
           <button 
            onClick={() => {
                // Reset form and open modal
                setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'student', schoolId: '', accessLevel: 'Student', groupId: '' });
                setShowUserModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm"
           >
            {isAdvisor ? '+ Add Student' : '+ Add User'}
           </button>
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-600">Name</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Email</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Role</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">
                    <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3">
                            {u.first_name ? u.first_name.charAt(0) : '?'}
                        </div>
                        {u.first_name} {u.last_name}
                    </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                    u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                    u.role === 'adviser' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {u.role || 'Student'}
                  </span>
                </td>
                <td className="px-6 py-4 space-x-3">
                    {/* ❌ REMOVED EDIT BUTTON as requested */}
                    
                    {/* Only show Archive if Admin */}
                    {isAdmin && (
                        <button onClick={() => initiateArchive(u)} className="text-red-500 hover:text-red-700 font-medium">Archive</button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="p-8 text-center text-slate-400">No users found.</div>}
      </div>

      {/* --- GROUPS MANAGEMENT SECTION (ADMINS ONLY) --- */}
      {isAdmin && (
        <div className="mt-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Manage Groups</h2>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-slate-600">Group Name</th>
                            <th className="px-6 py-3 font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {groups.map(g => (
                            <tr key={g.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{g.name}</td>
                                <td className="px-6 py-4">
                                    <button 
                                        onClick={() => handleDeleteGroup(g.id, g.name)}
                                        className="text-red-600 hover:text-red-800 font-medium transition"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {groups.length === 0 && (
                            <tr><td colSpan="2" className="p-6 text-center text-slate-400">No groups found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* --- MODAL 1: CREATE USER --- */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
               <h3 className="text-xl font-bold text-slate-800">
                 {isAdvisor ? 'Create Student Account' : 'Create New User'}
               </h3>
               <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">First Name</label>
                   <input required className="w-full p-2 border rounded-lg" 
                     value={newUser.firstName} onChange={e => setNewUser({...newUser, firstName: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Last Name</label>
                   <input required className="w-full p-2 border rounded-lg" 
                     value={newUser.lastName} onChange={e => setNewUser({...newUser, lastName: e.target.value})} />
                 </div>
               </div>

               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                  <input required type="email" className="w-full p-2 border rounded-lg" 
                    value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
               </div>

               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">School ID</label>
                  <input required className="w-full p-2 border rounded-lg" 
                    value={newUser.schoolId} onChange={e => setNewUser({...newUser, schoolId: e.target.value})} />
               </div>

               {/* ROLE SELECT: HIDDEN FOR ADVISORS (Auto-locked to Student) */}
               {isAdmin && (
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                      <select className="w-full p-2 border rounded-lg"
                        value={newUser.accessLevel}
                        onChange={e => setNewUser({...newUser, accessLevel: e.target.value})}
                      >
                        <option value="Student">Student</option>
                        <option value="Advisor">Advisor</option>
                        <option value="Admin">Admin</option>
                      </select>
                   </div>
               )}

               {/* GROUP SELECT: Visible if creating a Student */}
               {(newUser.accessLevel === 'Student' || isAdvisor) && (
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Assign Group (Optional)</label>
                      <select className="w-full p-2 border rounded-lg"
                        value={newUser.groupId}
                        onChange={e => setNewUser({...newUser, groupId: e.target.value})}
                      >
                        <option value="">-- No Group --</option>
                        {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      {groups.length === 0 && (
                          <p className="text-xs text-orange-500 mt-1">No groups found. Create a group first!</p>
                      )}
                   </div>
               )}

               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Initial Password</label>
                  <input required type="password" className="w-full p-2 border rounded-lg" 
                    value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
               </div>

               <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">
                 Create Account
               </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CREATE GROUP --- */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
               <h3 className="text-xl font-bold text-slate-800">Create Research Group</h3>
               <button onClick={() => setShowGroupModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Group Name</label>
                  <input required className="w-full p-2 border rounded-lg" placeholder="e.g. Research Team A"
                    value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} />
               </div>
               <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">
                 Create Group
               </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: EDIT USER (Existing) --- */}
      <EditUserModal 
        user={selectedUser} 
        isOpen={isEditModalOpen} 
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }} 
        onSave={handleSaveEdit} 
      />

    </div>
  );
}