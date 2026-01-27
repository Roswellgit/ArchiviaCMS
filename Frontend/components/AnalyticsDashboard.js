import React, { useRef, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../services/apiService';
const StatCard = ({ title, value, subtitle, icon, colorClass }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group print:border-slate-300 print:shadow-none print:break-inside-avoid">
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 text-xl print:bg-transparent print:p-0 print:text-slate-800`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">{title}</p>
        <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{value}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-2 font-medium">{subtitle}</p>}
      </div>
    </div>
  </div>
);
const KeywordCloud = ({ keywords }) => {
  if (!keywords || keywords.length === 0) return <div className="text-sm text-slate-400">No keywords found</div>;
  
  const colors = [
    'bg-blue-50 text-blue-700 border-blue-100 print:border-slate-300 print:text-black',
    'bg-emerald-50 text-emerald-700 border-emerald-100 print:border-slate-300 print:text-black', 
    'bg-purple-50 text-purple-700 border-purple-100 print:border-slate-300 print:text-black',
    'bg-orange-50 text-orange-700 border-orange-100 print:border-slate-300 print:text-black',
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((k, idx) => (
        <span 
          key={idx}
          className={`px-3 py-1 text-xs font-bold rounded-full border ${colors[idx % colors.length]}`}
        >
          {k.term} <span className="opacity-60 ml-1">({k.count})</span>
        </span>
      ))}
    </div>
  );
};
const SearchList = ({ searches }) => {
  if (!searches || searches.length === 0) return <div className="text-sm text-slate-400">No recent searches</div>;

  return (
    <div className="space-y-3">
      {searches.slice(0, 8).map((s, idx) => (
        <div key={idx} className="flex justify-between items-center group cursor-default">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300 w-4">#{idx + 1}</span>
            <span className="text-sm font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">
              {s.term}
            </span>
          </div>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all">
            {s.count}
          </span>
        </div>
      ))}
    </div>
  );
};
const HorizontalBarChart = ({ data, labelKey, valueKey, colorFrom, colorTo }) => {
  if (!data || data.length === 0) return <div className="text-sm text-slate-400">No data available</div>;

  const maxVal = Math.max(...data.map(d => parseInt(d[valueKey] || 0))) || 1;

  return (
    <div className="space-y-4">
      {data.map((item, idx) => {
        const val = parseInt(item[valueKey] || 0);
        const percent = (val / maxVal) * 100;
        
        return (
          <div key={idx} className="group print:break-inside-avoid">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-slate-700">{item[labelKey] || 'Unknown'}</span>
              <span className="text-slate-500">{val}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden print:bg-slate-200">
              <div 
                className={`h-full rounded-full bg-gradient-to-r ${colorFrom} ${colorTo} print:bg-slate-600 print:!bg-none`}
                style={{ width: `${percent}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default function AnalyticsDashboard({ stats, user }) {
  const componentRef = useRef();
  const [aiInsight, setAiInsight] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [paperSize, setPaperSize] = useState('a4');
  const isSuperAdmin = user?.is_super_admin;
  const isAdmin = user?.is_admin || isSuperAdmin;
  const isAdviser = user?.is_adviser;
  const canPrint = isAdmin || isAdviser;
  const isStudent = !isAdmin && !isAdviser;
  useEffect(() => {
    const fetchInsight = async () => {
      if (!stats) return; 
      
      setLoadingAi(true);
      try {
        const response = await api.get('/admin/analytics/insight');
        if (response.data && response.data.insight) {
           setAiInsight(response.data.insight);
        } else {
           setAiInsight("Automated insight is currently unavailable.");
        }
      } catch (err) {
        console.error("Failed to fetch AI insight", err);
        setAiInsight("Analytics data is presented in the charts below.");
      } finally {
        setLoadingAi(false);
      }
    };

    fetchInsight();
  }, [stats]); 

  const handlePrint = () => {
    window.print();
  };

  if (!stats) return <div className="animate-pulse h-96 bg-slate-100 rounded-2xl"></div>;

  const topStrand = stats.documentsByStrand?.[0];
  const totalCount = stats.totalDocuments || 0;
  const trendData = stats.uploadTrend || [];
  const keywordData = stats.topKeywords || [];
  const searchData = stats.topSearches || [];

  return (
    <div ref={componentRef} className="space-y-8 animate-fade-in print:bg-white print:p-0 print:space-y-6">
      
      {/* --- DYNAMIC PRINT STYLES --- */}
      <style type="text/css" media="print">
        {`
          @page {
            size: ${paperSize} portrait; 
            margin: 1cm;
          }
          body {
            font-size: ${paperSize === 'legal' ? '14px' : '12px'};
          }
        `}
      </style>

      {/* --- PRINT ONLY HEADER --- */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-8">
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900">Analytics Report</h1>
                <p className="text-sm text-slate-500 mt-1">ArchiviaCMS Generated Document ({paperSize.toUpperCase()})</p>
            </div>
            <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* --- SCREEN HEADER & ACTIONS --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
         <div>
            <h1 className="text-2xl font-bold text-slate-800">Analytics Dashboard</h1>
            <p className="text-sm text-slate-500">Overview of system performance and research trends</p>
         </div>
         
         {/* Only show Print options for privileged users */}
         {canPrint && (
           <div className="flex items-center gap-3">
              <select 
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-3 py-2 shadow-sm"
              >
                <option value="a4">A4 Paper</option>
                <option value="letter">Letter (8.5" x 11")</option>
                <option value="legal">Legal (8.5" x 14")</option>
              </select>

              <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition shadow-sm"
              >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                  Print Report
              </button>
           </div>
         )}
      </div>

      {/* 1. WELCOME BANNER (Only for actual Students) */}
      {isStudent && (
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden print:hidden">
           <div className="relative z-10">
             <h2 className="text-2xl font-bold mb-2">Student Research Hub</h2>
             <p className="text-indigo-100 max-w-2xl">
                Welcome to the analytics dashboard. Here you can see the research contributions from different strands and year levels across the campus.
             </p>
           </div>
           <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
             <svg width="300" height="300" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
               <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,79.6,-46.3C87.4,-33.5,90.1,-18,88.5,-3.3C86.9,11.4,81,25.3,71.6,37.3C62.2,49.3,49.3,59.4,35.3,66.4C21.3,73.4,6.2,77.3,-8.2,75.5C-22.6,73.7,-36.3,66.2,-48.6,56.7C-60.9,47.2,-71.8,35.7,-78.3,21.9C-84.8,8.1,-86.9,-8,-82.2,-22.4C-77.5,-36.8,-66,-49.5,-52.8,-57.1C-39.6,-64.7,-24.7,-67.2,-10.4,-68.6C3.9,-70,18.2,-70.3,30.5,-83.6L44.7,-76.4Z" transform="translate(100 100)" />
             </svg>
           </div>
        </div>
      )}

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
        <StatCard title="Total Papers" value={totalCount} icon="📚" colorClass="bg-blue-500 text-blue-600" />
        <StatCard title="Top Strand" value={topStrand ? topStrand.strand : "N/A"} subtitle={topStrand ? `${topStrand.count} contributions` : "No data"} icon="🏆" colorClass="bg-amber-500 text-amber-600" />
        
        {/* Logic: Privileged Users see Total Users and Top Search */}
        {!isStudent && (
             <>
                <StatCard title="Total Users" value={stats.totalUsers || 0} icon="👥" colorClass="bg-indigo-500 text-indigo-600" />
                <StatCard title="Top Search" value={stats.topSearches?.[0]?.term || "N/A"} subtitle="Most frequent query" icon="🔍" colorClass="bg-purple-500 text-purple-600" />
             </>
        )}
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:grid-cols-1 print:gap-8">
         
         {/* LEFT: Activity Graph */}
         <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 print:border-slate-300 print:break-inside-avoid">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Research Activity</h3>
                <span className="text-xs font-medium text-slate-400 print:hidden">Last 6 Months</span>
             </div>
             
             <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{fontSize: 12}} />
                    <YAxis allowDecimals={false} tick={{fontSize: 12}} />
                    <Tooltip 
                      cursor={{fill: '#F8FAFC'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar dataKey="count" name="Uploads" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
         </div>

         {/* RIGHT: AI Insight & Keywords & Searches */}
         <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-6 print:border-slate-300 print:break-inside-avoid">
             
             {/* --- AI INSIGHT --- */}
             {(!isStudent || canPrint) && (
               <div className="hidden print:block">
                   <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-xl font-bold text-slate-800">AI Analysis</h3>
                      <span className="text-indigo-500">✨</span>
                   </div>
                   
                   <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-white p-5 border border-indigo-50 print:border-0 print:p-0 print:bg-white">
                     {loadingAi ? (
                       <span className="text-sm font-medium text-slate-400">Generating insight...</span>
                     ) : (
                       <p className="text-sm text-slate-600 leading-relaxed italic font-medium print:text-black">
                         "{aiInsight}"
                       </p>
                     )}
                   </div>
               </div>
             )}

             {/* --- KEYWORDS (Trending Topics) --- */}
             <div className="print:border-t print:border-slate-100 print:pt-6">
               <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Trending Keywords</h4>
               <KeywordCloud keywords={keywordData} />
             </div>

             <div className="border-t border-slate-100"></div>

             {/* --- TRENDING SEARCHES (Added Here) --- */}
             <div>
               <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Trending Searches</h4>
               <SearchList searches={searchData} />
             </div>
         </div>
      </div>

      {/* --- BOTTOM SECTION: DEMOGRAPHICS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-2">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 print:border-slate-300 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Contributions by Strand</h3>
            <HorizontalBarChart 
                data={stats.documentsByStrand} 
                labelKey="strand" 
                valueKey="count" 
                colorFrom="from-blue-500" 
                colorTo="to-blue-400" 
            />
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 print:border-slate-300 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Contributions by Year</h3>
             <HorizontalBarChart 
                data={stats.documentsByYear} 
                labelKey="year_level" 
                valueKey="count" 
                colorFrom="from-purple-600" 
                colorTo="to-indigo-500" 
            />
        </div>
      </div>

      {/* --- FOOTER FOR PRINT --- */}
      <div className="hidden print:block text-center text-xs text-slate-400 mt-10 pt-10 border-t border-slate-200">
        &copy; {new Date().getFullYear()} ArchiviaCMS. Confidential Internal Report.
      </div>
    </div>
  );
}