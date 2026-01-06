import React, { useState, useEffect } from 'react';
import { 
  adminCreateUser, 
  getFormOptions, 
  addFormOption, 
  deleteFormOption 
} from '../services/apiService'; // Adjust path if needed

const CreateUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  // Dynamic Options State
  const [options, setOptions] = useState({ roles: [], yearLevels: [], strands: [] });
  
  // Selected Values
  const [role, setRole] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [strand, setStrand] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    if (isOpen) {
      fetchOptions();
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role === 'Super Admin') setIsSuperAdmin(true);
    }
  }, [isOpen]);

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

  // --- Helper: Check if Strand Should Be Visible ---
  const shouldShowStrand = () => {
    // Only show strand if year level is explicitly Grade 11 or 12
    return ['Grade 11', 'Grade 12'].includes(yearLevel);
  };

  // --- Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Only include strand if the logic allows it
    const finalStrand = shouldShowStrand() ? strand : '';

    const payload = {
      ...formData,
      role,
      // Create student profile object only if role is Student
      studentProfile: role === 'Student' ? { yearLevel, strand: finalStrand } : undefined
    };

    try {
      await adminCreateUser(payload);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ firstName: '', lastName: '', email: '', password: '' });
    setRole('');
    setYearLevel('');
    setStrand('');
    setError('');
    onClose();
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // --- Reusable "Manageable Select" Component ---
  const ManageableSelect = ({ label, type, value, setValue, list, isSuperAdmin }) => {
    const [isManaging, setIsManaging] = useState(false);
    const [newItem, setNewItem] = useState('');

    const handleAdd = async () => {
      if (!newItem) return;
      await addFormOption(type, newItem);
      await fetchOptions(); // Refresh list
      setNewItem('');
    };

    const handleDelete = async (item) => {
      if (!window.confirm(`Delete ${item}?`)) return;
      await deleteFormOption(type, item);
      await fetchOptions();
      if (value === item) setValue('');
    };

    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          {isSuperAdmin && (
            <button type="button" onClick={() => setIsManaging(!isManaging)} className="text-xs text-blue-600 underline">
              {isManaging ? 'Done' : '⚙️ Manage'}
            </button>
          )}
        </div>

        {isManaging ? (
          <div className="bg-gray-50 p-2 rounded border border-gray-200">
            <div className="flex gap-2 mb-2">
              <input 
                value={newItem} 
                onChange={(e) => setNewItem(e.target.value)} 
                className="flex-1 px-2 py-1 text-sm border rounded"
                placeholder="New option..."
              />
              <button type="button" onClick={handleAdd} className="bg-blue-600 text-white px-2 rounded text-sm">Add</button>
            </div>
            <ul className="max-h-24 overflow-y-auto">
              {list.map(item => (
                <li key={item} className="flex justify-between text-xs py-1 border-b last:border-0">
                  {item} 
                  <button type="button" onClick={() => handleDelete(item)} className="text-red-500">✕</button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <select 
            value={value} 
            onChange={(e) => setValue(e.target.value)} 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select {label}...</option>
            {list.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">Create New User</h2>
          <button onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm text-center">{error}</div>}

          {/* Standard Fields */}
          <div className="grid grid-cols-2 gap-4">
            <input name="firstName" placeholder="First Name" required value={formData.firstName} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
            <input name="lastName" placeholder="Last Name" required value={formData.lastName} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <input name="email" type="email" placeholder="Email" required value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
          <input name="password" type="password" placeholder="Password" required value={formData.password} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />

          <hr className="border-gray-100 my-2" />

          {/* Role Dropdown */}
          <ManageableSelect 
            label="Role" type="role" 
            value={role} setValue={setRole} 
            list={options.roles} isSuperAdmin={isSuperAdmin} 
          />

          {/* Student Fields */}
          {role === 'Student' && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h3 className="text-blue-800 font-semibold text-sm mb-3">🎓 Student Academic Details</h3>
              
              {/* Year Level - Always Visible for Students */}
              <ManageableSelect 
                label="Year Level" type="yearLevel" 
                value={yearLevel} setValue={setYearLevel} 
                list={options.yearLevels} isSuperAdmin={isSuperAdmin} 
              />

              {/* Strand - CONDITIONAL: Only if Grade 11 or 12 */}
              {shouldShowStrand() && (
                <div className="animate-fade-in">
                  <ManageableSelect 
                    label="Strand / Track" type="strand" 
                    value={strand} setValue={setStrand} 
                    list={options.strands} isSuperAdmin={isSuperAdmin} 
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;