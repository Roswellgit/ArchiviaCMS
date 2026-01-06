'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  getDeletionRequests, 
  adminApproveDeletion, 
  adminRejectDeletion,
  getArchiveRequests, 
  adminApproveArchive, 
  adminRejectArchive 
} from '../../../services/apiService';
import { useAuth } from '../../../context/AuthContext'; 
import { toast } from 'react-hot-toast';

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const searchParams = useSearchParams();
  const filterType = searchParams.get('filter') || 'deletion'; 

  useEffect(() => {
    fetchRequests();
  }, [filterType]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let response;
      
      // 1. Fetch the raw response object
      if (filterType === 'archiving') {
        response = await getArchiveRequests();
      } else {
        response = await getDeletionRequests();
      }
      
      // 2. Extract .data from the axios response
      // Check if response.data exists and is an array, otherwise default to empty array
      const data = response && response.data ? response.data : [];
      
      if (Array.isArray(data)) {
        setRequests(data);
      } else {
        console.error("API returned non-array data:", data);
        setRequests([]);
      }

    } catch (error) {
      console.error(`Failed to fetch ${filterType} requests`, error);
      toast.error("Failed to load requests");
      setRequests([]); // Ensure requests remains an array on error
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!confirm('Are you sure you want to approve this request?')) return;
    try {
      if (filterType === 'archiving') {
        await adminApproveArchive(id);
        toast.success('Document archived successfully');
      } else {
        await adminApproveDeletion(id);
        toast.success('Document deletion approved');
      }
      fetchRequests(); 
    } catch (error) {
      console.error("Approval error", error);
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    if (!confirm('Are you sure you want to reject this request?')) return;
    try {
      if (filterType === 'archiving') {
        await adminRejectArchive(id);
        toast.success('Archive request rejected');
      } else {
        await adminRejectDeletion(id);
        toast.success('Deletion request rejected');
      }
      fetchRequests(); 
    } catch (error) {
      console.error("Rejection error", error);
      toast.error('Failed to reject request');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {filterType === 'archiving' ? 'Document Archiving Requests' : 'Deletion Requests'}
        </h1>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center border border-gray-100">
          <p className="text-gray-500 text-lg">No pending {filterType} requests found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-gray-900">{request.title || "Untitled Document"}</h3>
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Reason:</span> {request.reason || "No reason provided"}
                </p>
                <div className="flex gap-3 text-xs text-gray-400 mt-1">
                   <span>Requested by: {request.user_name || request.user_email || "Unknown"}</span>
                   <span>•</span>
                   <span>Date: {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={() => handleReject(request.id)}
                  className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleApprove(request.id)}
                  className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}