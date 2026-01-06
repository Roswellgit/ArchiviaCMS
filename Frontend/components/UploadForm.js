'use client';

import { useState } from 'react';
import { uploadDocument } from '../services/apiService';
import { toast } from 'react-hot-toast'; 

export default function UploadForm({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false); 
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      toast.error('Please select a file to upload.'); 
      return;
    }

    
    if (file.size === 0) {
      toast.error('The file is empty. Please upload a valid PDF.');
      return;
    }

    setLoading(true); 
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    toast.promise(uploadDocument(formData, (progressEvent) => {
      const percentCompleted = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0;
      setUploadProgress(percentCompleted);
    }), {
        loading: 'Uploading and analyzing document...',
        success: (response) => {
          setFile(null);
          event.target.reset(); 
          if (onUploadSuccess) onUploadSuccess();
          return `Successfully uploaded: ${response.data.title}`;
        },
        error: (error) => error.response?.data?.message || 'Upload failed.'
    }).finally(() => { setLoading(false); });
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Upload Research Paper</h2>
        <p className="text-slate-500 mt-2">PDF files only. The AI will automatically extract metadata.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="group relative border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer">
          <input
            type="file"
            id="file"
            onChange={(event) => setFile(event.target.files[0])}
            accept="application/pdf"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            required
          />
          <div className="space-y-2 pointer-events-none">
             {file ? (
                <div className="text-indigo-600 font-bold flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    {file.name}
                </div>
             ) : (
                <>
                    <p className="text-slate-600 font-medium">Click to browse or drag file here</p>
                    <p className="text-xs text-slate-400">Maximum file size: 10MB</p>
                </>
             )}
          </div>
        </div>

        {loading && (
          <div className="w-full">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading} 
          className="w-full py-3.5 px-6 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-600 hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing Document...' : 'Upload & Analyze'}
        </button>
      </form>
    </div>
  );
}