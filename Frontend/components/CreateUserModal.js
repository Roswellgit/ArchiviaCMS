import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // 👈 IMPORT THIS
import { 
  adminCreateUser, 
  getFormOptions, 
  addFormOption, 
  deleteFormOption 
} from '../services/apiService'; 
import { useAuth } from '../context/AuthContext'; 

// --- HELPER: Manageable Select (Unchanged) ---
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

// --- HELPER: Password Requirement (Unchanged) ---
const RequirementItem = ({ met, text }) => (
  <li className={`flex items-center gap-2 text-xs ${met ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
    <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${met ? 'bg-emerald-100' : 'bg-slate-100'}`}>
      {met ? '✓' : '•'}
    </span>
    {text}
  </li>
);

const CreateUserModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth(); 

  // 1. ADD MOUNTED STATE FOR NEXT.JS PORTAL SAFETY
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const roleName = (user?.role || '').toLowerCase();
  const isAdvisor = !!user?.is_adviser || roleName === 'adviser' || roleName === 'advisor';

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', schoolId: '', 
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
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidity, setPasswordValidity] = useState({
    hasLength: false, hasUpper: false, hasLower: false, hasNumber: false, hasSpecial: false,
  });

  // Lock background scroll when modal is open
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

  useEffect(() => {
    const pwd = formData.password || '';
    setPasswordValidity({
        hasLength: pwd.length >= 8,
        hasUpper: /[A-Z]/.test(pwd),
        hasLower: /[a-z]/.test(pwd),
        hasNumber: /[0-9]/.test(pwd),
        hasSpecial: /[^A-Za-z0-9]/.test(pwd),
    });
  }, [formData.password]);

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

    const allValid = Object.values(passwordValidity).every(Boolean);
    if (!allValid) {
        setError("Password does not meet complexity requirements.");
        setLoading(false);
        document.getElementById('modal-scroll-area')?.scrollTo(0,0);
        return;
    }

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
    setFormData({ firstName: '', lastName: '', email: '', password: '', schoolId: '' });
    setRoleTitle(isAdvisor ? 'Student' : ''); 
    setAccessLevel('');
    setYearLevel('');
    setStrand('');
    setSection('');
    setError('');
    setShowPassword(false);
    onClose();
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // 2. CHECK IF MOUNTED BEFORE RENDERING PORTAL
  if (!isOpen || !mounted) return null;

  // 3. USE PORTAL TO ATTACH TO BODY
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

          {/* Password Field */}
          <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Temporary Password</label>
              <div className="relative">
               <input 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={formData.password} 
                  onChange={handleChange} 
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none pr-10 ${error && error.includes('complexity') ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-500'}`} 
                />
               <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
               >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
               </button>
              </div>

              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">Requirements:</p>
                <ul className="grid grid-cols-2 gap-1">
                  <RequirementItem met={passwordValidity.hasLength} text="8+ Characters" />
                  <RequirementItem met={passwordValidity.hasUpper} text="Uppercase Letter" />
                  <RequirementItem met={passwordValidity.hasLower} text="Lowercase Letter" />
                  <RequirementItem met={passwordValidity.hasNumber} text="Number (0-9)" />
                  <RequirementItem met={passwordValidity.hasSpecial} text="Special Character (!@#...)" />
                </ul>
              </div>
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
    document.body // 👈 ATTACH TO BODY
  );
};

export default CreateUserModal;