'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import api, { getAllUsers, adminDeleteUser, getFormOptions } from '../../../services/apiService';

// --- Reusable Confirmation Modal (High Z-Index for overlays) ---
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
            <button onClick={onConfirm} className={`px-4 py-2 text-white font-bold rounded-lg shadow-md transition ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ManageUsersPage() {
  const { user: currentUser, authLoading } = useAuth();
  const router = useRouter();

  // --- STATE ---
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [options, setOptions] = useState({ yearLevels: [], strands: [] });
  const [loading, setLoading] = useState(true);
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  
  // Archive Modal State
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [userToArchive, setUserToArchive] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');

  // General Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState({ 
    isOpen: false, 
    action: null, // 'deleteGroup' | 'removeMember'
    data: null, 
    title: '', 
    message: '' 
  });

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');

  // Form Data
  const [newUser, setNewUser] = useState({
    firstName: '', lastName: '', email: '', password: '', 
    role: 'student', schoolId: '', accessLevel: '', groupId: '',
    yearLevel: '', strand: '', section: ''
  });
  const [newGroup, setNewGroup] = useState({ name: '' });

  // --- PERMISSIONS ---
  const isSuperAdmin = currentUser?.is_super_admin;
  const isAdmin = currentUser?.is_admin || isSuperAdmin;
  const isAdvisor = currentUser?.is_adviser;
  const isPrivileged = isAdmin || isAdvisor;

  // --- FETCH DATA ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const usersResponse = await getAllUsers();
      const allUsers = Array.isArray(usersResponse) ? usersResponse : (usersResponse.data || []);
      const activeUsers = allUsers.filter(u => u.is_active); 

      let groupList = [];
      try {
         const groupsRes = await api.get('/admin/groups');
         groupList = groupsRes.data;
      } catch (e) { console.warn("Groups endpoint not ready"); }

      try {
        const { data } = await getFormOptions();
        setOptions({
          yearLevels: data.yearLevels || [],
          strands: data.strands || []
        });
      } catch (e) { console.error("Failed to fetch options"); }

      setUsers(activeUsers);
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
        router.push('/'); 
      } else {
        fetchData();
        if (isSuperAdmin) setNewUser(prev => ({...prev, accessLevel: 'Admin'}));
        else if (isAdmin) setNewUser(prev => ({...prev, accessLevel: 'Advisor'}));
        else if (isAdvisor) setNewUser(prev => ({...prev, accessLevel: 'Student'}));
      }
    }
  }, [authLoading, isPrivileged, isSuperAdmin, isAdmin, isAdvisor]);

  // --- CONFIRMATION HANDLERS ---
  
  const promptDeleteGroup = (groupId, groupName) => {
    setConfirmConfig({
      isOpen: true,
      action: 'deleteGroup',
      data: { groupId },
      title: 'Delete Group?',
      message: `Are you sure you want to delete "${groupName}"? This action cannot be undone.`
    });
  };

  const promptRemoveMember = (userId) => {
    setConfirmConfig({
      isOpen: true,
      action: 'removeMember',
      data: { userId },
      title: 'Remove Student?',
      message: 'Are you sure you want to remove this student from the group?'
    });
  };

  const executeConfirmation = async () => {
    const { action, data } = confirmConfig;
    if (!action) return;

    try {
      if (action === 'deleteGroup') {
          await api.delete(`/admin/groups/${data.groupId}`);
          toast.success("Group deleted.");
          fetchData();
      } else if (action === 'removeMember') {
          await api.delete(`/admin/groups/${selectedGroup.id}/members/${data.userId}`);
          toast.success("Student removed.");
          fetchGroupMembers(selectedGroup.id);
          fetchData();
      }
    } catch (err) {
      toast.error("Action failed. Please try again.");
      console.error(err);
    } finally {
      setConfirmConfig({ ...confirmConfig, isOpen: false });
    }
  };

  // --- OTHER HANDLERS ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...newUser,
        studentProfile: (newUser.accessLevel === 'Student' || isAdvisor) ? {
            yearLevel: newUser.yearLevel,
            strand: newUser.strand,
            section: newUser.section
        } : undefined
      };

      if (isAdvisor) {
          payload.role = 'student';
          payload.accessLevel = 'Student';
      } else {
          payload.role = newUser.accessLevel === 'Advisor' ? 'adviser' : newUser.accessLevel.toLowerCase();
      }

      await api.post('/admin/users', payload);
      toast.success("User created successfully!");
      setShowUserModal(false);
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'student', schoolId: '', accessLevel: '', groupId: '', yearLevel: '', strand: '', section: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user.");
    }
  };

  const openMembersModal = async (group) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
    fetchGroupMembers(group.id);
  };

  const fetchGroupMembers = async (groupId) => {
    try {
        const res = await api.get(`/admin/groups/${groupId}/members`);
        setGroupMembers(res.data);
    } catch (err) { toast.error("Failed to fetch group members."); }
  };

  const handleAddMember = async () => {
    if (!selectedStudentToAdd) return toast.error("Please select a student.");
    try {
        await api.post(`/admin/groups/${selectedGroup.id}/members`, { userId: selectedStudentToAdd });
        toast.success("Student added to group.");
        setSelectedStudentToAdd('');
        fetchGroupMembers(selectedGroup.id);
        fetchData(); 
    } catch (err) { toast.error(err.response?.data?.message || "Failed to add student."); }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/groups', { name: newGroup.name });
      toast.success("Group created successfully!");
      setShowGroupModal(false);
      setNewGroup({ name: '' });
      fetchData(); 
    } catch (err) { toast.error("Failed to create group."); }
  };

  const initiateArchive = (targetUser) => {
    if (targetUser.id === currentUser.userId) return toast.error("Cannot archive yourself.");
    setUserToArchive(targetUser);
    setArchiveReason(''); 
    setShowArchiveModal(true);
  };

  const handleConfirmArchive = async (e) => {
    e.preventDefault();
    if (!archiveReason.trim()) return toast.error("Please provide a reason.");

    try {
      await adminDeleteUser(userToArchive.id, { reason: archiveReason });
      toast.success("User archived successfully.");
      setShowArchiveModal(false);
      setUserToArchive(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Archive failed.");
    }
  };

  if (authLoading || loading) return <div className="p-10 text-center">Loading...</div>;

  const availableStudents = users.filter(u => u.role === 'student');
  const shouldShowStrand = ['Grade 11', 'Grade 12'].includes(newUser.yearLevel);

  return (
    <div className="space-y-6 pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isAdvisor ? 'My Students & Groups' : 'User Management'}
          </h1>
          <p className="text-slate-500">Manage research groups and system accounts.</p>
        </div>
        
        <div className="flex gap-3">
           {isAdmin && (
             <Link href="/admin/users/archive">
               <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition shadow-sm">
                 View Archived
               </button>
             </Link>
           )}
           <button onClick={() => setShowGroupModal(true)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition">+ New Group</button>
           <button onClick={() => setShowUserModal(true)} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm">
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
                <td className="px-6 py-4 font-medium text-slate-900">{u.first_name} {u.last_name}</td>
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
                <td className="px-6 py-4">
                    {isAdmin && <button onClick={() => initiateArchive(u)} className="text-red-500 hover:text-red-700 font-medium">Archive</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* GROUPS MANAGEMENT */}
      <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Manage Groups</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                      <tr><th className="px-6 py-3 font-semibold text-slate-600">Group Name</th><th className="px-6 py-3 font-semibold text-slate-600">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {groups.map(g => (
                          <tr key={g.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 font-medium text-slate-900">{g.name}</td>
                              <td className="px-6 py-4 flex gap-4">
                                  <button onClick={() => openMembersModal(g)} className="text-indigo-600 hover:text-indigo-800 font-medium transition">Manage Members</button>
                                  {isAdmin && <button onClick={() => promptDeleteGroup(g.id, g.name)} className="text-red-600 hover:text-red-800 font-medium transition">Delete Group</button>}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* REUSABLE CONFIRMATION MODAL */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onClose={() => setConfirmConfig({...confirmConfig, isOpen: false})}
        onConfirm={executeConfirmation}
        isDanger={true}
        confirmText="Yes, Proceed"
      />

      {/* --- ARCHIVE USER MODAL (Has Text Input) --- */}
      {showArchiveModal && userToArchive && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-gray-100 bg-red-50 flex justify-between items-center">
               <h3 className="text-lg font-bold text-red-800">Archive User</h3>
               <button onClick={() => setShowArchiveModal(false)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleConfirmArchive} className="p-6 space-y-4">
               <p className="text-slate-600 text-sm">
                 Are you sure you want to archive <strong>{userToArchive.first_name} {userToArchive.last_name}</strong>?
                 They will no longer be able to log in.
               </p>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">Reason for Archiving</label>
                 <textarea 
                   required
                   className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                   rows="3"
                   placeholder="e.g. Graduated, Transferred, Policy Violation..."
                   value={archiveReason}
                   onChange={(e) => setArchiveReason(e.target.value)}
                 ></textarea>
               </div>

               <div className="flex gap-3 justify-end pt-2">
                 <button type="button" onClick={() => setShowArchiveModal(false)} className="px-4 py-2 text-slate-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Cancel</button>
                 <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700">Archive User</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE GROUP MEMBERS */}
      {showMembersModal && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                   <div><h3 className="text-xl font-bold text-slate-800">Manage Members</h3><p className="text-sm text-slate-500">Group: {selectedGroup.name}</p></div>
                   <button onClick={() => setShowMembersModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <label className="block text-sm font-bold text-indigo-900 mb-2">Add Active Student to Group</label>
                        <div className="flex gap-2">
                            <select className="flex-1 p-2 border border-indigo-200 rounded-lg text-sm" value={selectedStudentToAdd} onChange={(e) => setSelectedStudentToAdd(e.target.value)}>
                                <option value="">-- Select Student --</option>
                                {availableStudents.map(student => (
                                    <option key={student.id} value={student.id}>{student.first_name} {student.last_name} ({student.email})</option>
                                ))}
                            </select>
                            <button onClick={handleAddMember} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition">Add</button>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-700 mb-3">Current Members ({groupMembers.length})</h4>
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2 text-right">Action</th></tr></thead>
                                <tbody className="divide-y">
                                    {groupMembers.map(member => (
                                        <tr key={member.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-900">{member.first_name} {member.last_name}</td>
                                            <td className="px-4 py-3 text-slate-500">{member.email}</td>
                                            <td className="px-4 py-3 text-right">
                                              <button onClick={() => promptRemoveMember(member.id)} className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 px-2 py-1 rounded">Remove</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- CREATE USER MODAL --- */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="text-xl font-bold text-slate-800">{isAdvisor ? 'Create Student Account' : 'Create New User'}</h3>
               <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4 overflow-y-auto">
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-sm font-bold text-slate-700 mb-1">First Name</label><input required className="w-full p-2 border rounded-lg" value={newUser.firstName} onChange={e => setNewUser({...newUser, firstName: e.target.value})} /></div>
                 <div><label className="block text-sm font-bold text-slate-700 mb-1">Last Name</label><input required className="w-full p-2 border rounded-lg" value={newUser.lastName} onChange={e => setNewUser({...newUser, lastName: e.target.value})} /></div>
               </div>

               <div><label className="block text-sm font-bold text-slate-700 mb-1">Email</label><input required type="email" className="w-full p-2 border rounded-lg" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} /></div>
               <div><label className="block text-sm font-bold text-slate-700 mb-1">School ID</label><input required className="w-full p-2 border rounded-lg" value={newUser.schoolId} onChange={e => setNewUser({...newUser, schoolId: e.target.value})} /></div>

               {!isAdvisor && (
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Select Role to Create</label>
                      <select 
                        required 
                        className="w-full p-2 border rounded-lg" 
                        value={newUser.accessLevel} 
                        onChange={e => setNewUser({...newUser, accessLevel: e.target.value})}
                      >
                        <option value="">-- Choose Role --</option>
                        {isSuperAdmin && <option value="Admin">Admin</option>}
                        {(isAdmin && !isSuperAdmin) && <option value="Advisor">Advisor</option>}
                      </select>
                   </div>
               )}

               {(newUser.accessLevel === 'Student' || isAdvisor) && (
                   <div className="bg-blue-50 p-4 rounded-xl space-y-4 border border-blue-100 mt-4">
                      <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">🎓 Academic Details</p>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Year Level</label>
                        <select required className="w-full p-2 border rounded-lg bg-white" value={newUser.yearLevel} onChange={e => setNewUser({...newUser, yearLevel: e.target.value})}>
                            <option value="">Select Year Level...</option>
                            {options.yearLevels.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Section</label>
                        <input required className="w-full p-2 border rounded-lg bg-white" placeholder="e.g. St. Thomas" value={newUser.section} onChange={e => setNewUser({...newUser, section: e.target.value})} />
                      </div>

                      {shouldShowStrand && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Strand / Track</label>
                            <select required className="w-full p-2 border rounded-lg bg-white" value={newUser.strand} onChange={e => setNewUser({...newUser, strand: e.target.value})}>
                                <option value="">Select Strand...</option>
                                {options.strands.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Assign to Group (Optional)</label>
                        <select className="w-full p-2 border rounded-lg bg-white" value={newUser.groupId} onChange={e => setNewUser({...newUser, groupId: e.target.value})}>
                            <option value="">-- No Group --</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      </div>
                   </div>
               )}

               <div><label className="block text-sm font-bold text-slate-700 mb-1">Temporary Password</label><input required type="password" className="w-full p-2 border rounded-lg" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} /></div>

               <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">Create Account</button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
               <h3 className="text-xl font-bold text-slate-800">Create Research Group</h3>
               <button onClick={() => setShowGroupModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
               <div><label className="block text-sm font-bold text-slate-700 mb-1">Group Name</label><input required className="w-full p-2 border rounded-lg" placeholder="e.g. Research Team A" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} /></div>
               <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">Create Group</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}