'use client';
import { useState, useEffect } from 'react';
import { getDeletionRequests, adminApproveDeletion, adminRejectDeletion } from '../../../services/apiService';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || !user.is_super_admin)) router.push('/admin/documents');
  }, [user, authLoading, router]);

  const fetchRequests = async () => {
    try {
      const res = await getDeletionRequests();
      setRequests(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { if(user?.is_super_admin) fetchRequests(); }, [user]);

  
  const handleApprove = (id) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-bold text-slate-900 text-sm">Approve deletion?</p>
        <p className="text-xs text-slate-500">This file will be lost forever.</p>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={() => toast.dismiss(t.id)} className="text-xs font-bold px-3 py-1 bg-slate-100 rounded hover:bg-slate-200 text-slate-600">Cancel</button>
          <button onClick={() => {
              executeApprove(id);
              toast.dismiss(t.id);
          }} className="text-xs bg-red-600 text-white font-bold px-3 py-1 rounded hover:bg-red-700">Confirm Delete</button>
        </div>
      </div>
    ), { duration: 6000, position: 'top-center', icon: '🗑️' });
  };

  const executeApprove = async (id) => {
    try {
        await adminApproveDeletion(id);
        toast.success("Deleted.");
        setRequests(requests.filter(r => r.id !== id));
    } catch (err) { toast.error("Failed."); }
  };

  const handleReject = async (id) => {
    try {
        await adminRejectDeletion(id);
        toast.success("Rejected.");
        setRequests(requests.filter(r => r.id !== id));
    } catch (err) { toast.error("Failed."); }
  };

  if (!user?.is_super_admin) return null;

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900">Deletion Requests</h1>
        <p className="text-slate-500 text-sm mt-1">Review user requests to remove documents</p>
      </div>
      
      {loading ? <p className="text-center text-slate-400">Loading requests...</p> : requests.length === 0 ? (
        <div className="p-10 bg-white rounded-xl border border-slate-100 text-center text-slate-500 italic">No pending requests.</div>
      ) : (
        <div className="grid gap-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white p-6 rounded-xl shadow-md border-l-4 border-l-red-500 border-y border-r border-slate-100 flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-grow">
                    <h3 className="font-bold text-lg text-slate-800">{req.title}</h3>
                    <p className="text-xs text-slate-400 font-mono mb-3">{req.filename}</p>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Reason</span>
                        <p className="text-slate-700 italic">&quot;{req.deletion_reason}&quot;</p>
                    </div>
                </div>
                <div className="flex gap-3 shrink-0 self-center md:self-start">
                    <button onClick={() => handleReject(req.id)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition">Keep File</button>
                    <button onClick={() => handleApprove(req.id)} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md hover:shadow-lg transition">Approve Delete</button>
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}