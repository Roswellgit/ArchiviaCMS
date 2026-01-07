import React from 'react';

// --- 1. SUB-COMPONENT: STAT CARD ---
const StatCard = ({ title, value, subtitle, icon, colorClass }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 text-xl`}>
          {icon}
        </div>
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${colorClass} opacity-5 group-hover:scale-110 transition-transform duration-500`}></div>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{value}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-2 font-medium">{subtitle}</p>}
      </div>
    </div>
  </div>
);

// --- 2. SUB-COMPONENT: HORIZONTAL BAR CHART ---
const HorizontalBarChart = ({ data, labelKey, valueKey, colorFrom, colorTo }) => {
  if (!data || data.length === 0) return <EmptyState message="No data available yet" />;

  const maxVal = Math.max(...data.map(d => parseInt(d[valueKey] || 0))) || 1;

  return (
    <div className="space-y-5">
      {data.map((item, idx) => {
        const val = parseInt(item[valueKey] || 0);
        const percent = (val / maxVal) * 100;
        
        return (
          <div key={idx} className="group">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-semibold text-slate-700">{item[labelKey] || 'Unknown'}</span>
              <span className="text-slate-500 font-medium">{val} Papers</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full bg-gradient-to-r ${colorFrom} ${colorTo} shadow-sm relative`}
                style={{ width: `${percent}%`, transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                 <div className="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- 3. SUB-COMPONENT: ACTIVITY TREND CHART (NEW) ---
const ActivityTrendChart = ({ data }) => {
  if (!data || data.length === 0) return <EmptyState message="No timeline data" />;
  
  const maxVal = Math.max(...data.map(d => d.count)) || 1;

  return (
    <div className="flex items-end justify-between h-48 gap-2 pt-4 px-2">
      {data.map((item, idx) => {
        const heightPercent = Math.max((item.count / maxVal) * 100, 5); // Min 5% height
        return (
          <div key={idx} className="flex flex-col items-center flex-1 group cursor-pointer relative">
             {/* Tooltip */}
             <div className="opacity-0 group-hover:opacity-100 mb-2 text-xs font-bold text-white bg-slate-800 py-1 px-2 rounded absolute -top-8 transition-opacity z-10 whitespace-nowrap">
                {item.count} Uploads
             </div>
             {/* Bar */}
             <div 
                className="w-full max-w-[40px] bg-indigo-50 rounded-t-md relative overflow-hidden group-hover:bg-indigo-100 transition-colors"
                style={{ height: `${heightPercent}%` }}
             >
                <div className="absolute bottom-0 left-0 right-0 top-0 bg-indigo-500 opacity-20 group-hover:opacity-40 transition-opacity"></div>
                {/* Top Cap */}
                <div className="h-1 w-full bg-indigo-500 absolute top-0"></div>
             </div>
             {/* Label */}
             <p className="text-[10px] sm:text-xs text-slate-400 mt-2 font-medium truncate w-full text-center">{item.month}</p>
          </div>
        )
      })}
    </div>
  );
};

// --- 4. SUB-COMPONENT: KEYWORD CLOUD (NEW) ---
const KeywordCloud = ({ keywords }) => {
  if (!keywords || keywords.length === 0) return <EmptyState message="No keywords found" />;
  
  const colors = [
    'bg-blue-50 text-blue-700 border-blue-100',
    'bg-emerald-50 text-emerald-700 border-emerald-100', 
    'bg-purple-50 text-purple-700 border-purple-100',
    'bg-orange-50 text-orange-700 border-orange-100',
    'bg-pink-50 text-pink-700 border-pink-100',
  ];

  return (
    <div className="flex flex-wrap gap-2 content-start">
      {keywords.map((k, idx) => (
        <span 
          key={idx}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-transform hover:scale-105 cursor-default ${colors[idx % colors.length]}`}
        >
          #{k.term} <span className="opacity-50 ml-1 text-[10px]">({k.count})</span>
        </span>
      ))}
    </div>
  );
};

// --- 5. SUB-COMPONENT: EMPTY STATE ---
const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4">
    <div className="text-2xl mb-2 opacity-50">📂</div>
    <p className="text-sm text-slate-400 font-medium">{message}</p>
  </div>
);

// --- MAIN DASHBOARD COMPONENT ---

export default function AnalyticsDashboard({ stats, role }) {
  if (!stats) return <div className="animate-pulse h-96 bg-slate-100 rounded-2xl"></div>;

  const isStudent = role === 'Student';
  const topStrand = stats.documentsByStrand?.[0];
  const totalCount = stats.totalDocuments || 0;

  // --- MOCK DATA (Replace with stats.uploadTrend / stats.topKeywords in future) ---
  const mockTrendData = stats.uploadTrend || [
     { month: 'Aug', count: 12 }, { month: 'Sep', count: 19 }, 
     { month: 'Oct', count: 8 }, { month: 'Nov', count: 24 }, 
     { month: 'Dec', count: 32 }, { month: 'Jan', count: 15 }
  ];

  const mockKeywords = stats.topKeywords || [
     { term: 'Machine Learning', count: 45 }, { term: 'Climate Change', count: 32 },
     { term: 'Mental Health', count: 28 }, { term: 'Agriculture', count: 21 },
     { term: 'IoT', count: 19 }, { term: 'Renewable Energy', count: 15 },
     { term: 'Covid-19', count: 12 }, { term: 'Robotics', count: 10 }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. WELCOME BANNER (For Students) */}
      {isStudent && (
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
           <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-2">Student Research Hub</h2>
              <p className="text-indigo-100 max-w-2xl">
                 Welcome to the analytics dashboard. Here you can see the research contributions from different strands and year levels across the campus.
              </p>
           </div>
           {/* Decorative Background */}
           <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
              <svg width="300" height="300" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,79.6,-46.3C87.4,-33.5,90.1,-18,88.5,-3.3C86.9,11.4,81,25.3,71.6,37.3C62.2,49.3,49.3,59.4,35.3,66.4C21.3,73.4,6.2,77.3,-8.2,75.5C-22.6,73.7,-36.3,66.2,-48.6,56.7C-60.9,47.2,-71.8,35.7,-78.3,21.9C-84.8,8.1,-86.9,-8,-82.2,-22.4C-77.5,-36.8,-66,-49.5,-52.8,-57.1C-39.6,-64.7,-24.7,-67.2,-10.4,-68.6C3.9,-70,18.2,-70.3,30.5,-83.6L44.7,-76.4Z" transform="translate(100 100)" />
              </svg>
           </div>
        </div>
      )}

      {/* 2. KEY METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Total Papers" 
            value={totalCount} 
            icon="📚" 
            colorClass="bg-blue-500 text-blue-600" 
        />
        
        <StatCard 
            title="Top Strand" 
            value={topStrand ? topStrand.strand : "N/A"} 
            subtitle={topStrand ? `${topStrand.count} contributions` : "No data"}
            icon="🏆" 
            colorClass="bg-amber-500 text-amber-600" 
        />
        
        {/* Only show Total Users to Privileged. */}
        {!isStudent && (
            <StatCard 
                title="Total Users" 
                value={stats.totalUsers || 0} 
                icon="👥" 
                colorClass="bg-indigo-500 text-indigo-600" 
            />
        )}

        {/* Dynamic Card */}
        {isStudent ? (
             <StatCard 
                title="System Status" 
                value="Online" 
                icon="🟢" 
                colorClass="bg-emerald-500 text-emerald-600" 
            />
        ) : (
             <StatCard 
                title="Top Search" 
                value={stats.topSearches?.[0]?.term || "N/A"} 
                subtitle="Most frequent query"
                icon="🔍" 
                colorClass="bg-purple-500 text-purple-600" 
            />
        )}
      </div>

      {/* 3. NEW SECTION: ACTIVITY & TOPICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* Upload Trends (2/3 width) */}
         <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-slate-800">Research Activity</h3>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wide">Last 6 Months</span>
             </div>
             <p className="text-sm text-slate-500 mb-6">Volume of research papers uploaded to the system.</p>
             <ActivityTrendChart data={mockTrendData} />
         </div>

         {/* Trending Topics (1/3 width) */}
         <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Trending Topics</h3>
             </div>
             <KeywordCloud keywords={mockKeywords} />
         </div>
      </div>

      {/* 4. CHARTS SECTION (Strands & Years) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Strand Chart */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Contributions by Strand</h3>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full uppercase tracking-wide">Track Analysis</span>
            </div>
            <HorizontalBarChart 
                data={stats.documentsByStrand} 
                labelKey="strand" 
                valueKey="count" 
                colorFrom="from-blue-500"
                colorTo="to-blue-400"
            />
        </div>

        {/* Year Level Chart */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Contributions by Year Level</h3>
                <span className="px-3 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded-full uppercase tracking-wide">Academic Year</span>
            </div>
             <HorizontalBarChart 
                data={stats.documentsByYear} 
                labelKey="year_level" 
                valueKey="count" 
                colorFrom="from-purple-600"
                colorTo="to-indigo-500"
            />
        </div>
      </div>

      {/* 5. ADMIN ONLY: SEARCH INSIGHTS */}
      {!isStudent && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-slate-800">Top Search Trends</h3>
                 <span className="text-xs font-medium text-slate-400">Most frequent queries</span>
             </div>
             
             <div className="p-6">
                 {stats.topSearches && stats.topSearches.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                         {stats.topSearches.map((item, idx) => (
                             <div key={idx} className="flex items-center p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all">
                                 <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-sm mr-3">
                                     {idx + 1}
                                 </span>
                                 <div className="flex-1 min-w-0">
                                     <p className="text-sm font-bold text-slate-700 truncate capitalize">{item.term}</p>
                                     <p className="text-xs text-slate-400">{item.count} searches</p>
                                 </div>
                             </div>
                         ))}
                     </div>
                 ) : (
                     <EmptyState message="No search data recorded yet." />
                 )}
             </div>
          </div>
      )}
    </div>
  );
}