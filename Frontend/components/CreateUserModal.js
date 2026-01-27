import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  adminCreateUser, 
  getFormOptions, 
  addFormOption, 
  deleteFormOption 
} from '../services/apiService'; 
import { useAuth } from '../context/AuthContext';
const ManageableSelect = ({ label, type, value, setValue, list, canManage, fetchOptions }) => {
  const [isManaging, setIsManaging] = useState(false);
  const [newItem, setNewItem] = useState('');

  const handleAdd = async () => {
    if (!newItem) return;
    try {
      await addFormOption(type, newItem);
      await fetchOptions(); 
      setNewItem('');
    } catch (err) {
      alert("Failed to add option. It might already exist.");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item}?`)) return;
    try {
      await deleteFormOption(type, item);
      await fetchOptions();
      if (value === item) setValue('');
    } catch (err) {
      alert("Failed to delete option");
    }
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {canManage && (
          <button 
            type="button" 
            onClick={() => setIsManaging(!isManaging)} 
            className="text-xs text-blue-600 underline hover:text-blue-800 font-semibold cursor-pointer"
          >
            {isManaging ? 'Done' : '⚙️ Manage Options'}
          </button>
        )}
      </div>

      {isManaging ? (
        <div className="bg-gray-50 p-2 rounded border border-gray-200 animate-fade-in">
          <div className="flex gap-2 mb-2">
            <input value={newItem} onChange={(e) => setNewItem(e.target.value)} className="flex-1 px-2 py-1 text-sm border rounded" placeholder={`New ${label}...`} />
            <button type="button" onClick={handleAdd} className="bg-blue-600 text-white px-2 rounded text-sm hover:bg-blue-700">Add</button>
          </div>
          <ul className="max-h-24 overflow-y-auto">
            {list.map(item => (
              <li key={item} className="flex justify-between text-xs py-1 border-b last:border-0 items-center">
                <span>{item}</span>
                <button type="button" onClick={() => handleDelete(item)} className="text-red-500 hover:text-red-700 font-bold px-1">✕</button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <select value={value} onChange={(e) => setValue(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" required>
          <option value="">Select {label}...</option>
          {list.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}
    </div>
  );
};

const CreateUserModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const roleName = (user?.role || '').toLowerCase();
  const isAdvisor = !!user?.is_adviser || roleName === 'adviser' || roleName === 'advisor';
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', schoolId: '', 
  });

  const [options, setOptions] = useState({ roles: [], yearLevels: [], strands: [] });
  const [roleTitle, setRoleTitle] = useState(''); 
  const [accessLevel, setAccessLevel] = useState(''); 
  const [yearLevel, setYearLevel] = useState('');
  const [strand, setStrand] = useState('');
  const [section, setSection] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canManageOptions, setCanManageOptions] = useState(false);
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const effectiveRoles = isAdvisor ? ['Student'] : options.roles;

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
      if (user) {
        const canManage = !!user.is_super_admin || !!user.is_admin || roleName === 'super admin' || roleName === 'principal' || roleName === 'admin'; 
        setCanManageOptions(canManage);
        if (isAdvisor) setRoleTitle('Student');
      }
    }
  }, [isOpen, user, isAdvisor, roleName]);

  const getAccessLevels = () => {
    if (!user) return [];
    const isSuper = !!user.is_super_admin || roleName === 'super admin' || roleName === 'principal';
    const isAdmin = !!user.is_admin || roleName === 'admin';
    if (isSuper) return ['Admin', 'Advisor', 'Student']; 
    if (isAdmin) return ['Advisor', 'Student'];
    if (isAdvisor) return ['Student'];
    return [];
  };

  useEffect(() => {
    if (isOpen) {
        const levels = getAccessLevels();
        if (levels.length === 1) setAccessLevel(levels[0]);
    }
  }, [isOpen, user]);

  const fetchOptions = async () => {
    try {
      const { data } = await getFormOptions();
      setOptions({
        roles: data.roles || [],
        yearLevels: data.yearLevels || [],
        strands: data.strands || []
      });
    } catch (err) {
      console.error("Failed to load options", err);
    }
  };

  const shouldShowStrand = () => ['Grade 11', 'Grade 12'].includes(yearLevel);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const finalStrand = shouldShowStrand() ? strand : '';
    const payload = {
      ...formData,
      role: roleTitle,       
      accessLevel: accessLevel, 
      studentProfile: accessLevel === 'Student' ? { yearLevel, strand: finalStrand, section } : undefined
    };

    try {
      await adminCreateUser(payload);
      onSuccess(); 
      handleClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create user.';
      setError(msg);
      document.getElementById('modal-scroll-area')?.scrollTo(0,0);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ firstName: '', lastName: '', email: '', schoolId: '' });
    setRoleTitle(isAdvisor ? 'Student' : ''); 
    setAccessLevel('');
    setYearLevel('');
    setStrand('');
    setSection('');
    setError('');
    onClose();
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  if (!isOpen || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in p-4">
      
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col relative">
        
        {/* HEADER */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl shrink-0">
          <h2 className="text-xl font-bold text-gray-800">Create New User</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none">&times;</button>
        </div>

        {/* BODY */}
        <form 
            id="modal-scroll-area"
            onSubmit={handleSubmit} 
            className="p-6 space-y-4 overflow-y-auto flex-1"
        >
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100">{error}</div>}

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">First Name</label>
                <input 
                  autoFocus 
                  name="firstName" 
                  required 
                  value={formData.firstName} 
                  onChange={handleChange} 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Last Name</label>
                <input name="lastName" required value={formData.lastName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          
          <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {accessLevel === 'Student' ? 'Student ID' : 'Admin/Faculty ID'}
              </label>
              <input name="schoolId" required value={formData.schoolId} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
              <input name="email" type="email" required value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 flex items-start gap-2">
             <span>🔒</span>
             <p>A secure random password will be automatically generated and sent to the user via email.</p>
          </div>

          <hr className="border-gray-100 my-2" />

          <ManageableSelect 
            label="Job Title / Role Name" 
            type="role" 
            value={roleTitle} 
            setValue={setRoleTitle} 
            list={effectiveRoles} 
            canManage={canManageOptions} 
            fetchOptions={fetchOptions}
          />

          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System Permissions</label>
              <select 
                value={accessLevel} 
                onChange={(e) => setAccessLevel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                {getAccessLevels().length > 1 && <option value="">Select Access Level...</option>}
                {getAccessLevels().map(level => (
                    <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">This determines what the user can do in the system.</p>
          </div>

          {accessLevel === 'Student' && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-slide-down mt-4">
              <h3 className="text-blue-800 font-semibold text-sm mb-3 flex items-center gap-2">🎓 Student Academic Details</h3>
              <ManageableSelect label="Year Level" type="yearLevel" value={yearLevel} setValue={setYearLevel} list={options.yearLevels} canManage={canManageOptions} fetchOptions={fetchOptions} />
              
              <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. A, B, St. Augustine" className="w-full px-4 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              {shouldShowStrand() && (
                <div className="animate-fade-in">
                  <ManageableSelect label="Strand / Track" type="strand" value={strand} setValue={setStrand} list={options.strands} canManage={canManageOptions} fetchOptions={fetchOptions} />
                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 pb-2">
            <button type="button" onClick={handleClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm disabled:opacity-50">
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CreateUserModal;