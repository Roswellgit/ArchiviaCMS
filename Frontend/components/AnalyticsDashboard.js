import React from 'react';

const SimpleBarChart = ({ data, labelKey, valueKey, color }) => {
  if (!data || data.length === 0) return <p className="text-gray-400 text-sm">No data available</p>;

  // Find max value to scale the bars
  const maxVal = Math.max(...data.map(item => parseInt(item[valueKey] || 0)));

  return (
    <div className="space-y-3 mt-4">
      {data.map((item, index) => {
        const value = parseInt(item[valueKey] || 0);
        const percentage = maxVal > 0 ? (value / maxVal) * 100 : 0;
        
        return (
          <div key={index} className="w-full">
            <div className="flex justify-between text-xs mb-1 font-semibold text-gray-600">
              <span>{item[labelKey] || 'Unknown'}</span>
              <span>{value} Papers</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${color}`} 
                style={{ width: `${percentage}%`, transition: 'width 1s ease-in-out' }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const StatCard = ({ title, count, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{count}</p>
    </div>
    <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-xl`}>
      {icon}
    </div>
  </div>
);

export default function AnalyticsDashboard({ stats, role }) {
  if (!stats) return <div className="animate-pulse h-64 bg-gray-100 rounded-2xl"></div>;

  const isStudent = role === 'Student';

  return (
    <div className="space-y-6">
      
      {/* 1. TOP CARDS (Role Dependent) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Research Papers" count={stats.totalDocuments} icon="📚" color="bg-blue-500 text-blue-600" />
        
        {!isStudent && (
          <>
            <StatCard title="Total Users" count={stats.totalUsers} icon="👥" color="bg-indigo-500 text-indigo-600" />
            <StatCard title="Active Users" count={stats.activeUsers} icon="🟢" color="bg-emerald-500 text-emerald-600" />
            <StatCard title="Pending Requests" count={stats.pendingRequests} icon="🔔" color="bg-orange-500 text-orange-600" />
          </>
        )}
        
        {isStudent && (
           <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-2xl shadow text-white md:col-span-3">
             <h3 className="text-lg font-bold">🎓 Student Research Hub</h3>
             <p className="text-indigo-100 text-sm mt-1">{stats.message}</p>
           </div>
        )}
      </div>

      {/* 2. CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart A: By Strand */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Research Output by Strand</h3>
          <p className="text-xs text-gray-400 mb-4">Comparison of approved documents across tracks</p>
          <SimpleBarChart 
            data={stats.documentsByStrand} 
            labelKey="strand" 
            valueKey="count" 
            color="bg-blue-500" 
          />
        </div>

        {/* Chart B: By Year Level */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Output by Year Level</h3>
          <p className="text-xs text-gray-400 mb-4">Academic level contributions</p>
          <SimpleBarChart 
            data={stats.documentsByYear} 
            labelKey="year_level" 
            valueKey="count" 
            color="bg-purple-500" 
          />
        </div>

      </div>

      {/* 3. ADMIN ONLY: Trends & Searches */}
      {!isStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Top Searches */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🔥 Top Search Terms</h3>
              <div className="flex flex-wrap gap-2">
                {stats.topSearches?.map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium border border-gray-200">
                    {s.term} <span className="text-gray-400 text-xs ml-1">({s.count})</span>
                  </span>
                ))}
                {!stats.topSearches?.length && <p className="text-gray-400">No search data yet.</p>}
              </div>
           </div>
           
           {/* Simple Status Panel */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">System Status</h3>
              <div className="space-y-2 text-sm text-gray-600">
                 <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span>Pending Documents Review</span>
                    <span className="font-bold text-orange-500">{stats.pendingDocsCount}</span>
                 </div>
                 <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span>System Status</span>
                    <span className="font-bold text-emerald-500">Operational</span>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}