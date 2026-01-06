'use client';

const ChecklistItem = ({ isMet, text }) => (
  <li className={`flex items-center gap-2 text-xs font-medium transition-colors ${isMet ? 'text-green-600' : 'text-slate-400'}`}>
    <span className={`w-4 h-4 rounded-full flex items-center justify-center border ${isMet ? 'bg-green-100 border-green-200' : 'bg-slate-100 border-slate-200'}`}>
        {isMet ? '✓' : '•'}
    </span>
    {text}
  </li>
);

export default function PasswordChecklist({ validity }) {
  if (!validity) return null;
  return (
    <div className="p-4 mt-3 bg-slate-50/50 border border-slate-100 rounded-xl">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Requirements</p>
      <ul className="space-y-2">
        <ChecklistItem isMet={validity.hasLength} text="At least 8 characters" />
        <ChecklistItem isMet={validity.hasUpper} text="Use one uppercase letter" />
        <ChecklistItem isMet={validity.hasLower} text="Use one lowercase letter" />
        <ChecklistItem isMet={validity.hasNumber} text="Use one Number" />
        <ChecklistItem isMet={validity.hasSpecial} text="Use one special character" />
      </ul>
    </div>
  );
}