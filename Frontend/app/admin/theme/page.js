'use client';

import { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { 
  getSettings, 
  adminUpdateSettings, 
  adminUploadBgImage, 
  adminRemoveBgImage, 
  adminUploadBrandIcon, 
  adminRemoveBrandIcon, 
  adminResetSettings 
} from '../../../services/apiService';
import { toast } from 'react-hot-toast';
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

export default function AdminThemeManagement() {
  const [settings, setSettings] = useState({
    backgroundColor: '#f8fafc', 
    foregroundColor: '#0f172a', 
    navbarBrandText: 'Archivia',
    navbarBgColor: '#ffffff', 
    navbarTextColor: '#334155', 
    navbarLinkColor: '#64748b',
    navbarBrandFont: 'var(--font-geist-sans)', 
    navbarBrandSize: '1.5rem', 
    navbarBrandWeight: '800',
    backgroundImage: 'none', 
    brandIconUrl: 'none',
  });
  
  const [bgImageFile, setBgImageFile] = useState(null);
  const [brandIconFile, setBrandIconFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, type: '' });
  useEffect(() => {
    getSettings().then(res => { 
        setSettings(prev => ({ ...prev, ...res.data })); 
        setLoading(false); 
    })
    .catch(() => { 
        toast.error('Failed to load settings.'); 
        setLoading(false); 
    });
  }, []);
  const handleSettingChange = (e) => setSettings({ ...settings, [e.target.name]: e.target.value });
  const handleColorChange = (key, val) => setSettings({ ...settings, [key]: val });

  const submitSettings = async (e) => {
    e.preventDefault(); 
    setLoading(true);
    try { 
        await adminUpdateSettings(settings); 
        toast.success('Global theme updated.'); 
    } catch { 
        toast.error('Update failed.'); 
    } finally { 
        setLoading(false); 
    }
  };
  const handleBgSubmit = async () => {
      if (!bgImageFile) return toast.error("Please select a background file first."); 
      setLoading(true);
      const fd = new FormData(); 
      fd.append('bg-image', bgImageFile);
      try { 
          const r = await adminUploadBgImage(fd); 
          setSettings(prev => ({...prev, backgroundImage: r.data.imageUrl})); 
          toast.success("Background updated."); 
      } catch(err){ 
          toast.error("Failed to upload background."); 
      } finally { 
          setLoading(false); 
      }
  };

  const handleBrandSubmit = async () => {
      if (!brandIconFile) return toast.error("Please select an icon file first."); 
      setLoading(true);
      const fd = new FormData(); 
      fd.append('brand-icon', brandIconFile);
      try { 
          const r = await adminUploadBrandIcon(fd); 
          setSettings(prev => ({...prev, brandIconUrl: r.data.iconUrl})); 
          toast.success("Brand icon updated."); 
      } catch(err){ 
          toast.error("Failed to upload icon."); 
      } finally { 
          setLoading(false); 
      }
  };
  const initiateConfirm = (type) => {
    setConfirmConfig({ isOpen: true, type });
  };

  const executeAction = async () => {
    const { type } = confirmConfig;
    setConfirmConfig({ ...confirmConfig, isOpen: false });
    setLoading(true);

    try {
        if (type === 'reset') {
            const res = await adminResetSettings(); 
            setSettings(prev => ({ ...prev, ...res.data })); 
            toast.success('Theme reset to defaults.');
        } else if (type === 'removeBg') {
            await adminRemoveBgImage(); 
            setSettings(prev => ({...prev, backgroundImage: 'none'})); 
            toast.success("Background image removed.");
        } else if (type === 'removeBrand') {
            await adminRemoveBrandIcon(); 
            setSettings(prev => ({...prev, brandIconUrl: 'none'})); 
            toast.success("Brand icon removed.");
        }
    } catch (err) {
        toast.error('Action failed.');
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  if (loading && !settings.navbarBrandText) return <div className="p-10 text-center">Loading theme...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-24">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
            <h2 className="text-3xl font-extrabold text-slate-900">Theme Customization</h2>
            <p className="text-slate-500 mt-1">Branding and appearance settings</p>
        </div>
        <button onClick={() => initiateConfirm('reset')} className="text-sm font-bold text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition">Reset Defaults</button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={submitSettings} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Colors */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Color Palette</h3>
            <div className="space-y-8">
                {/* 1. Page Background */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Page Background</label>
                        <span className="text-xs font-mono text-slate-500">{settings.backgroundColor}</span>
                    </div>
                    <div className="flex gap-4 items-start">
                        <HexColorPicker color={settings.backgroundColor} onChange={(c) => handleColorChange('backgroundColor', c)} style={{ width: '100%', height: '120px' }} />
                        <div className="w-16 h-16 rounded-xl border-2 border-slate-100 shadow-sm shrink-0" style={{ backgroundColor: settings.backgroundColor }}></div>
                    </div>
                </div>

                {/* 2. Navbar Background */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Navbar Background</label>
                        <span className="text-xs font-mono text-slate-500">{settings.navbarBgColor}</span>
                    </div>
                    <div className="flex gap-4 items-start">
                        <HexColorPicker color={settings.navbarBgColor} onChange={(c) => handleColorChange('navbarBgColor', c)} style={{ width: '100%', height: '120px' }} />
                        <div className="w-16 h-16 rounded-xl border-2 border-slate-100 shadow-sm shrink-0" style={{ backgroundColor: settings.navbarBgColor }}></div>
                    </div>
                </div>

                {/* 3. Text Color */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Primary Text</label>
                        <span className="text-xs font-mono text-slate-500">{settings.navbarTextColor}</span>
                    </div>
                    <div className="flex gap-4 items-start">
                        <HexColorPicker color={settings.navbarTextColor} onChange={(c) => handleColorChange('navbarTextColor', c)} style={{ width: '100%', height: '120px' }} />
                        <div className="w-16 h-16 rounded-xl border-2 border-slate-100 shadow-sm shrink-0" style={{ backgroundColor: settings.navbarTextColor }}></div>
                    </div>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: Typography & Assets */}
        <div className="flex flex-col gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-grow">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Typography & Brand</h3>
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Brand Name</label>
                        <input name="navbarBrandText" value={settings.navbarBrandText} onChange={handleSettingChange} className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Font Family</label>
                        <select name="navbarBrandFont" value={settings.navbarBrandFont} onChange={handleSettingChange} className="w-full p-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="var(--font-geist-sans)">Geist Sans (Modern)</option>
                            <option value="var(--font-geist-mono)">Geist Mono (Tech)</option>
                            <option value="Arial, sans-serif">Arial (Classic)</option>
                            <option value="Georgia, serif">Georgia (Formal)</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Font Size</label>
                            <input name="navbarBrandSize" value={settings.navbarBrandSize} onChange={handleSettingChange} className="w-full p-3 border border-slate-200 rounded-xl" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Font Weight</label>
                            <input name="navbarBrandWeight" value={settings.navbarBrandWeight} onChange={handleSettingChange} className="w-full p-3 border border-slate-200 rounded-xl" />
                        </div>
                    </div>
                </div>
                <button type="submit" disabled={loading} className="mt-8 w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition shadow-lg disabled:opacity-50">
                    {loading ? 'Saving...' : 'Save Visual Settings'}
                </button>
            </div>

            {/* Asset Uploads Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bg Image Upload */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                     <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-slate-800">Background Image</h4>
                        {settings.backgroundImage !== 'none' && (
                            <button type="button" onClick={() => initiateConfirm('removeBg')} className="text-xs text-red-500 font-bold hover:underline">Remove</button>
                        )}
                     </div>
                     <div className="space-y-3">
                        <input type="file" onChange={(e) => setBgImageFile(e.target.files[0])} className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                        <button type="button" onClick={handleBgSubmit} className="w-full py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition text-xs">Upload BG</button>
                     </div>
                  </div>

                  {/* Brand Icon Upload */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                     <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-slate-800">Brand Icon</h4>
                        {settings.brandIconUrl !== 'none' && (
                            <button type="button" onClick={() => initiateConfirm('removeBrand')} className="text-xs text-red-500 font-bold hover:underline">Remove</button>
                        )}
                     </div>
                     <div className="space-y-3">
                        <input type="file" onChange={(e) => setBrandIconFile(e.target.files[0])} className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                        <button type="button" onClick={handleBrandSubmit} className="w-full py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition text-xs">Upload Icon</button>
                     </div>
                  </div>
            </div>
        </div>
      </form>

      {/* REUSABLE CONFIRMATION MODAL */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({...confirmConfig, isOpen: false})}
        onConfirm={executeAction}
        title={confirmConfig.type === 'reset' ? 'Reset Theme?' : 'Remove Asset?'}
        message={confirmConfig.type === 'reset' 
            ? "This will revert all theme settings to default. This cannot be undone." 
            : "Are you sure you want to remove this image/icon?"}
        confirmText={confirmConfig.type === 'reset' ? 'Reset' : 'Remove'}
        isDanger={true}
      />
    </div>
  );
}