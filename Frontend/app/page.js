'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DocumentList from '../components/DocumentList';
import FilterSidebar from '../components/FilterSidebar';
import { searchDocuments, getFilters, filterDocuments, getPopularSearches } from '../services/apiService';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  
  const currentSearchTerm = searchParams.get('q');
  const isHeroMode = currentSearchTerm === null;

  
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [heroInput, setHeroInput] = useState(''); 

  
  const [availableFilters, setAvailableFilters] = useState({ authors: [], keywords: [], years: [], journals: [] });
  const [popularSearches, setPopularSearches] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({ authors: [], keywords: [], year: null, journal: [], dateRange: null });

  
  useEffect(() => {
    Promise.all([
      getFilters(),             
      getPopularSearches()      
    ]).then(([filtersRes, popRes]) => {
      setAvailableFilters(filtersRes.data || { authors: [], keywords: [], years: [], journals: [] });
      setPopularSearches(Array.isArray(popRes.data) ? popRes.data : []);
    }).catch(err => {
        console.error("Initial load error:", err);
        setPopularSearches([]);
    });
  }, []);

  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!isHeroMode) {
            const term = currentSearchTerm || '';
            const response = await searchDocuments(term);
            setDocuments(response.data || []);
        } else {
            setDocuments([]); 
        }
      } catch (error) {
        console.error("Search failed:", error);
        setDocuments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentSearchTerm, isHeroMode]);

  
  const handleSearch = (term) => {
    if (!term) return; 
    const cleanTerm = typeof term === 'string' ? term : String(term);
    router.push(`/?q=${encodeURIComponent(cleanTerm)}`);
  };

  const handleBrowseAll = () => {
    router.push('/?q='); 
  };

  const handleFilterChange = async (category, value) => {
    if (category === 'reset') {
        setSelectedFilters({ authors: [], keywords: [], year: null, journal: [], dateRange: null });
        const response = await searchDocuments(currentSearchTerm || '');
        setDocuments(response.data);
        return;
    }
    const newFilters = { ...selectedFilters, [category]: value };
    setSelectedFilters(newFilters);
    setIsLoading(true);
    try {
        const response = await filterDocuments(newFilters);
        setDocuments(response.data);
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  
  if (isHeroMode) {
    const safeTrending = Array.isArray(popularSearches) ? popularSearches : [];

    return (
      
      <main className="flex flex-col relative overflow-x-hidden">
        
        {/* Abstract Background Shapes (Fixed to viewport) */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-100/50 rounded-full blur-[120px] opacity-60"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[100px] opacity-70"></div>
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        </div>

        {/* --- HERO SECTION (Full Screen Height) --- */}
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center relative z-10 pb-20">
            <div className="max-w-4xl w-full space-y-12 animate-fade-in flex flex-col items-center">
                
                {/* Brand Header */}
                <div className="space-y-6 flex flex-col items-center">    
                    <div className="flex items-center justify-center gap-4 md:gap-6">
                        <div 
                            className="w-16 h-16 md:w-20 md:h-20 bg-center bg-no-repeat bg-contain"
                            style={{ 
                                backgroundImage: 'var(--brand-icon-url)', 
                                display: 'var(--brand-icon-display, block)' 
                            }}
                        ></div>
                        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight drop-shadow-sm">
                            Archivia
                        </h1>
                    </div>

                    <p className="text-xl md:text-2xl text-slate-500 font-light max-w-2xl mx-auto leading-relaxed">
                        Access academic papers, journals, and articles in one place.
                    </p>
                </div>

                {/* Hero Search Bar */}
                <div className="relative group max-w-2xl w-full mx-auto">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-2xl opacity-20 group-hover:opacity-30 blur-lg transition duration-500"></div>
                    <div className="relative flex items-center bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-transform group-hover:scale-[1.01]">
                        <span className="pl-6 text-slate-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </span>
                        <input 
                            type="text" 
                            placeholder="Search keywords, authors, or titles..." 
                            className="flex-grow px-4 py-5 text-lg text-slate-800 bg-transparent focus:outline-none placeholder-slate-400 text-center md:text-left"
                            value={heroInput} 
                            onChange={(e) => setHeroInput(e.target.value)} 
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(heroInput); }}
                        />
                        <button 
                            className="mr-2 px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all duration-300 shadow-lg hover:shadow-indigo-500/30"
                            onClick={() => handleSearch(heroInput)}
                        >
                            Search
                        </button>
                    </div>
                </div>

                {/* Trending Pills */}
                {safeTrending.length > 0 && (
                    <div className="pt-2 flex flex-col items-center">
                        <p className="text-xs text-slate-400 font-bold mb-4 uppercase tracking-widest">Trending Topics</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {safeTrending.slice(0, 5).map((item, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleSearch(item.term || item)}
                                    className="px-5 py-2 bg-white/60 backdrop-blur-sm border border-slate-200 text-slate-600 text-sm font-semibold rounded-full hover:border-indigo-300 hover:text-indigo-600 hover:bg-white hover:shadow-md transition-all duration-200"
                                >
                                    {item.term || item}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Optional: Scroll Down Indicator */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-slate-400 animate-bounce">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
            </div>
        </div>

        {/* --- BOTTOM SECTION (Below the Fold) --- */}
        <div className="bg-slate-900 text-white py-24 px-4 text-center z-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
                <div className="absolute top-[-50%] left-1/2 transform -translate-x-1/2 w-[800px] h-[800px] bg-indigo-600 rounded-full blur-[180px]"></div>
            </div>
            
            <div className="relative z-10 max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8">
                <div className="text-left md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Explore the Repository</h2>
                    <p className="text-indigo-200 text-lg font-light leading-relaxed">
                        Access uploaded documents, research papers, and articles from our extensive library. Start your academic journey today.
                    </p>
                </div>
                <div className="md:w-auto">
                    <button 
                        onClick={handleBrowseAll}
                        className="inline-flex items-center gap-3 px-10 py-4 bg-white text-slate-900 font-bold rounded-full hover:bg-indigo-50 hover:scale-105 transition-all shadow-2xl text-lg whitespace-nowrap"
                    >
                        Browse All Documents <span>&rarr;</span>
                    </button>
                </div>
            </div>
        </div>
      </main>
    );
  }

  
  return (
    
    <main className="max-w-6xl mx-auto p-4 md:p-8 min-h-screen animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Library Results</h1>
            <p className="text-slate-500 text-sm mt-1">
                Found {documents.length} {documents.length === 1 ? 'document' : 'documents'} matching your criteria.
            </p>
        </div>
        <button 
            onClick={() => router.push('/')}
            className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 hover:border-indigo-200 transition-all shadow-sm"
        >
            <span>&larr;</span> Back to Home
        </button>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <aside className="w-full lg:w-1/4 flex-shrink-0 sticky top-24">
            <FilterSidebar 
                filters={availableFilters} 
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
            />
        </aside>

        <div className="w-full lg:w-3/4">
            <DocumentList 
              documents={documents} 
              isLoading={isLoading}
              searchPerformed={true} 
              onSearch={handleSearch}
              popularSearches={popularSearches}
              initialSearchTerm={currentSearchTerm || ''}
            />
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-slate-400 font-medium">Loading Archivia...</div>}>
      <HomeContent />
    </Suspense>
  );
}