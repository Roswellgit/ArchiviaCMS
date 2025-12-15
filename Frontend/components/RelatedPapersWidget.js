'use client';
import { useMemo } from 'react';

export default function RelatedPapersWidget({ currentDoc, allDocs = [], onSelectDoc }) {
  
  const relatedDocs = useMemo(() => {
    if (!currentDoc || !allDocs || allDocs.length === 0) return [];
    const getKeywords = (doc) => {
      if (!doc || !doc.ai_keywords) return [];
      if (Array.isArray(doc.ai_keywords)) return doc.ai_keywords;
      if (typeof doc.ai_keywords === 'string') {
        try { return Array.isArray(JSON.parse(doc.ai_keywords)) ? JSON.parse(doc.ai_keywords) : []; } 
        catch (e) { return doc.ai_keywords.split(',').map(s => s.trim()); }
      }
      return [];
    };

    const currentKeywords = getKeywords(currentDoc);
    if (currentKeywords.length === 0) return [];

    return allDocs
      .filter(doc => doc.id !== currentDoc.id)
      .map(doc => {
        const docKeywords = getKeywords(doc);
        return { ...doc, matchScore: docKeywords.filter(k => currentKeywords.includes(k)).length };
      })
      .filter(doc => doc.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 2); 
  }, [currentDoc, allDocs]);

  if (relatedDocs.length === 0) return null;

  return (
    <div className="w-full mt-8 pt-6 border-t border-slate-100">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">You Might Also Like</h3>
      <div className="grid grid-cols-1 gap-3">
        {relatedDocs.map(doc => (
          <div key={doc.id} onClick={() => onSelectDoc(doc)} className="group p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer">
            <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors line-clamp-1">{doc.title}</h4>
            <p className="text-xs text-slate-500 mt-1">Matched {doc.matchScore} topics</p>
          </div>
        ))}
      </div>
    </div>
  );
}