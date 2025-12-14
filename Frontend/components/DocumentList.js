'use client';
import { useState, useEffect } from 'react';
import PreviewModal from './PreviewModal';
import { getCitation } from '../services/apiService';

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

export default function DocumentList({ 
    documents = [], 
    isLoading = false, 
    searchPerformed = false, 
    onSearch = () => {}, 
    popularSearches = [],
    initialSearchTerm = '' 
}) {
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    
    const [activeCiteMenu, setActiveCiteMenu] = useState(null); 
    const [copyFeedback, setCopyFeedback] = useState(null); 

    const itemsPerPage = 6; 

    useEffect(() => {
        if (typeof initialSearchTerm === 'string') setSearchTerm(initialSearchTerm);
    }, [initialSearchTerm]);

    useEffect(() => { setCurrentPage(1); }, [documents]);

    useEffect(() => {
        const handleClickOutside = () => setActiveCiteMenu(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        onSearch(searchTerm);
    };

    const handleCite = async (e, doc, style) => {
        e.stopPropagation(); 
        const meta = {
            title: doc.title,
            authors: getSafeList(doc.ai_authors).join(', '),
            date: doc.ai_date_created,
            journal: doc.ai_journal || "N/A"
        };

        try {
            setCopyFeedback({ id: doc.id, text: 'Generating...' });
            const res = await getCitation(meta, style);
            await navigator.clipboard.writeText(res.data.citation);
            
            setCopyFeedback({ id: doc.id, text: 'Copied!' });
            setTimeout(() => {
                setCopyFeedback(null);
                setActiveCiteMenu(null);
            }, 2000);
        } catch (err) {
            setCopyFeedback({ id: doc.id, text: 'Error' });
        }
    };

    const toggleCiteMenu = (e, docId) => {
        e.stopPropagation();
        setActiveCiteMenu(activeCiteMenu === docId ? null : docId);
    };

    const safePopularSearches = Array.isArray(popularSearches) ? popularSearches : [];
    const safeDocuments = Array.isArray(documents) ? documents : [];
    const isDataError = documents && !Array.isArray(documents);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentDocuments = safeDocuments.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(safeDocuments.length / itemsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-6">
            
            {/* --- TOP BAR: SEARCH & TRENDING --- */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <form onSubmit={handleFormSubmit} className="flex gap-3">
                    <div className="relative flex-grow">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                        />
                    </div>
                    <button type="submit" className="py-2.5 px-6 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-md text-sm">
                        Search
                    </button>
                </form>
                
                {safePopularSearches.length > 0 && (
                    <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Quick Tags:</span>
                        {safePopularSearches.map((item, idx) => (
                            <button 
                                key={item.term || idx} 
                                onClick={() => onSearch(item.term)} 
                                className="px-2.5 py-1 bg-white border border-slate-200 text-slate-500 text-xs font-medium rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors whitespace-nowrap"
                            >
                                {item.term}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* --- RESULTS LIST --- */}
            <div className="min-h-[400px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-sm font-medium">Searching repository...</p>
                    </div>
                ) : isDataError ? (
                    <div className="text-center py-10 bg-red-50 rounded-xl border border-red-100 text-red-600 font-medium">
                        Unable to load documents.
                    </div>
                ) : !searchPerformed && safeDocuments.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium">Enter a keyword above to search the library.</p>
                    </div>
                ) : safeDocuments.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-600 font-bold text-lg">No matches found.</p>
                        <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            {currentDocuments.map((doc) => {
                                try {
                                    const aiAuthors = getSafeList(doc.ai_authors);
                                    const aiKeywords = getSafeList(doc.ai_keywords).slice(0, 6);
                                    const isMenuOpen = activeCiteMenu === doc.id;

                                    return (
                                        <div 
                                            key={doc.id} 
                                            onClick={() => setSelectedDoc(doc)}
                                            className="group relative bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-200 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                                        >
                                            {/* Header Row */}
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wide border border-indigo-100">
                                                            {doc.ai_journal || "Scholarly Article"}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            {doc.ai_date_created || 'Date Unknown'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-xl font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                                                        {doc.title || "Untitled Document"}
                                                    </h3>
                                                </div>

                                                {/* Cite Button */}
                                                <div className="relative shrink-0">
                                                    <button
                                                        onClick={(e) => toggleCiteMenu(e, doc.id)}
                                                        className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                                        Cite
                                                    </button>

                                                    {isMenuOpen && (
                                                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden animate-fade-in">
                                                            {copyFeedback && copyFeedback.id === doc.id ? (
                                                                <div className="px-3 py-2 text-xs font-bold text-green-600 bg-green-50 text-center">
                                                                    {copyFeedback.text}
                                                                </div>
                                                            ) : (
                                                                <div className="py-1">
                                                                    {['APA', 'MLA', 'BibTeX', 'Harvard'].map(style => (
                                                                        <button key={style} onClick={(e) => handleCite(e, doc, style)} className="block w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                                                            {style}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Authors */}
                                            <p className="text-sm text-slate-500 mt-2 font-medium italic">
                                                {aiAuthors.length > 0 ? aiAuthors.join(', ') : 'Unknown Authors'}
                                            </p>

                                            {/* Abstract Snippet */}
                                            <p className="text-sm text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                                                {doc.ai_abstract || "No abstract available."}
                                            </p>

                                            {/* Keywords */}
                                            {aiKeywords.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                                                    {aiKeywords.map((k, i) => (
                                                        <span key={i} className="px-2 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                                            #{k}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                } catch (err) { return null; }
                            })}
                        </div>

                        {/* --- PAGINATION --- */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-10">
                                <button 
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    &larr;
                                </button>
                                <span className="text-sm font-bold text-slate-600">
                                    Page {currentPage} <span className="text-slate-400 font-normal">of {totalPages}</span>
                                </span>
                                <button 
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    &rarr;
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {selectedDoc && (
                <PreviewModal 
                    document={selectedDoc} 
                    allDocs={safeDocuments}
                    onSelectDoc={setSelectedDoc}
                    onClose={() => setSelectedDoc(null)} 
                />
            )}
        </div>
    );
}