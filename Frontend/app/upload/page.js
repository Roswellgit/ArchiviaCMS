'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext'; 
import UploadForm from '../../components/UploadForm';

export default function UploadPage() {
  const router = useRouter();
  const { user, authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user?.is_super_admin) {
        router.push('/'); 
    }
  }, [user, authLoading, router]);

  const handleUploadSuccess = () => {
    router.push('/'); 
  };

  if (authLoading || user?.is_super_admin) return null; 

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
          Upload New Paper
        </h1>
        <p className="mt-2 text-lg text-gray-500">
          Upload a new file below to add a new document to the repository.
        </p>
      </header>

      <div className="max-w-xl mx-auto">
        <UploadForm onUploadSuccess={handleUploadSuccess} />

        {/* COPYWRIGHT / AGREEMENT NOTICE */}
        <div className="mt-6 border-t border-gray-100 pt-6 text-center">
            <p className="text-xs text-gray-400 leading-relaxed px-4">
                By uploading this document, you confirm that you have the right to distribute it 
                and you agree that other users will be able to <strong>view, download, and share</strong> this content 
            </p>
        </div>
      </div>
    </main>
  );
}