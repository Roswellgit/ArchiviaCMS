'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import RelatedPapersWidget from './RelatedPapersWidget';

const getSafeList = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            const cleaned = data.replace(/[\[\]"'{}]/g, '');
            return cleaned.split(',').map(s => s.trim()).filter(s => s);
        }
    }
    return [];
};

export default function PreviewModal({ document: activeDoc, onClose, allDocs, onSelectDoc }) {
  
  const [viewMode, setViewMode] = useState('abstract'); 
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  
  useEffect(() => {
    const scrollContainer = document.getElementById('modal-content');
    if (scrollContainer) scrollContainer.scrollTop = 0;
  }, [activeDoc, viewMode]);

  if (!activeDoc || !mounted) return null;

  const previewUrls = getSafeList(activeDoc.preview_urls);
  const aiKeywords = getSafeList(activeDoc.ai_keywords);
  const aiAuthors = getSafeList(activeDoc.ai_authors);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-center items-center p-4">
      {/* Dark Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[1200px] h-[90vh] flex flex-col overflow-hidden ring-1 ring-white/20 animate-fade-in">
        
        {/* === HEADER === */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-10">
          <div className="flex items-center gap-4">
             <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 hidden sm:block">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
             </div>
             
             {/* VIEW TOGGLE BUTTONS */}
             <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('abstract')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'abstract' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Abstract & Info
                </button>
                <button 
                    onClick={() => setViewMode('preview')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'preview' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Document Preview
                </button>
             </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* === MAIN SCROLLABLE AREA === */}
        <div className="flex-1 overflow-y-auto bg-slate-50" id="modal-content">
            
            {/* --- VIEW 1: ABSTRACT & METADATA --- */}
            {viewMode === 'abstract' && (
                <div className="max-w-4xl mx-auto p-8 md:p-12 bg-white min-h-full shadow-sm">
                    {/* Title & Header */}
                    <div className="mb-8 text-center md:text-left">
                        <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-full mb-3 border border-indigo-100">
                            {activeDoc.ai_journal || "Research Paper"}
                        </span>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
                            {activeDoc.title || "Untitled Document"}
                        </h1>
                        <p className="text-slate-500 font-medium text-lg">
                            {aiAuthors.join(', ') || "Unknown Authors"}
                        </p>
                        <div className="mt-2 text-slate-400 text-sm">
                            Published: {activeDoc.ai_date_created || "Unknown Date"}
                        </div>
                    </div>

                    {/* Abstract Text */}
                    <div className="prose max-w-none mb-10">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Abstract</h3>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-line text-justify">
                            {activeDoc.ai_abstract || "No abstract available for this document."}
                        </p>
                    </div>

                    {/* Metatags / Keywords */}
                    {aiKeywords.length > 0 && (
                        <div className="mb-10">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Keywords / Metatags</h3>
                            <div className="flex flex-wrap gap-2">
                                {aiKeywords.map((k, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">
                                        #{k}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions Row */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-100">
                        {activeDoc.downloadLink ? (
                            <a 
                                href={activeDoc.downloadLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition shadow-lg text-center flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Download Full PDF
                            </a>
                        ) : (
                            <a href="/login" className="px-8 py-3 bg-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-300 transition text-center">
                                Login to Download
                            </a>
                        )}
                        
                        <button 
                            onClick={() => setViewMode('preview')}
                            className="px-8 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition text-center"
                        >
                            View Document Preview
                        </button>
                    </div>

                    {/* Related Papers Footer */}
                    <div className="mt-16">
                        <RelatedPapersWidget 
                            currentDoc={activeDoc}
                            allDocs={allDocs}
                            onSelectDoc={onSelectDoc}
                        />
                    </div>
                </div>
            )}

            {/* --- VIEW 2: IMAGE PREVIEW --- */}
            {viewMode === 'preview' && (
                <div className="p-8 pb-20">
                    <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
                        {previewUrls.length > 0 ? (
                            previewUrls.map((url, index) => (
                                <div key={index} className="relative shadow-lg w-full bg-white rounded-lg overflow-hidden border border-slate-200">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img 
                                        src={url} 
                                        alt={`Page ${index + 1}`} 
                                        className="w-full h-auto" 
                                        loading="lazy"
                                    />
                                    
                                    {/* Login Wall Blur (if applicable) */}
                                    {index === 3 && !activeDoc.downloadLink && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-md">
                                            <div className="bg-white p-8 rounded-2xl shadow-2xl text-center border border-slate-100">
                                                <p className="font-bold text-slate-900 text-lg mb-2">Read Full Document</p>
                                                <a href="/login" className="inline-block w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
                                                    Login to Access
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center w-full">
                                <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center text-slate-400">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                </div>
                                <p className="text-slate-400 text-lg font-medium">Preview images unavailable.</p>
                            </div>
                        )}
                        
                        <button 
                            onClick={() => setViewMode('abstract')}
                            className="mt-8 text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-2"
                        >
                            <span>&larr;</span> Back to Abstract
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>,
    document.body
  );
}