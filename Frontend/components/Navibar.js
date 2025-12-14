'use client'; 

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; 
import { useAuth } from '../context/AuthContext'; 
import { useState } from 'react'; 

export default function Navbar() {
  const { user, logout, isAuthenticated, authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter(); 
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // New state for mobile menu

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const shouldShowLoginLink = !isAuthenticated && pathname !== '/login' && pathname !== '/register';
  
  const isAdmin = user?.is_admin;
  const isSuperAdmin = user?.is_super_admin;

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/login'); 
    router.refresh(); 
  };

  if (authLoading) return null;

  const navStyle = {
    backgroundColor: 'var(--navbar-bg-color)',
    color: 'var(--navbar-text-color)', 
  };

  const brandStyle = {
    fontFamily: 'var(--navbar-brand-font)',
    fontSize: 'var(--navbar-brand-size)',
    fontWeight: 'var(--navbar-brand-weight)',
    color: 'var(--navbar-text-color)', 
  };
  
  const linkStyle = {
    color: 'var(--navbar-link-color)', 
  };

  return (
    <nav style={navStyle} className="sticky top-0 z-50 backdrop-blur-md border-b border-gray-200/50 transition-all duration-300">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center py-4">
          
          {/* Brand Logo */}
          <Link href={isAdmin ? "/admin" : "/"} style={brandStyle} className="hover:opacity-80 flex items-center transition-opacity">
            <div className="navbar-brand-icon"></div> 
            <span className="navbar-brand-text-from-css">Archivia</span>
          </Link>

          {/* Mobile Menu Button (Hamburger) */}
          <button 
            className="md:hidden p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={toggleMobileMenu}
            style={{ color: 'var(--navbar-text-color)' }}
          >
            {isMobileMenuOpen ? (
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Desktop Menu */}
          <ul className="hidden md:flex space-x-8 items-center font-medium text-sm">
            {!isAuthPage && !isAdmin && ( 
              <li>
                <Link href="/" style={linkStyle} className="hover:text-indigo-600 transition-colors">
                    Search
                </Link>
              </li>
            )}
            
            {isAuthenticated && !isAdmin && (
              <li><Link href="/upload" style={linkStyle} className="hover:text-indigo-600 transition-colors">Upload</Link></li>
            )}

            {isAuthenticated ? (
              <li className="relative">
                <button onClick={toggleDropdown} className="group flex items-center gap-2 py-1.5 px-3 rounded-full hover:bg-black/5 transition-colors" style={{ color: 'var(--navbar-text-color)' }}>
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase text-xs border border-indigo-200">
                    {user?.firstName?.charAt(0)}
                  </div>
                  <span className="font-semibold">{user?.firstName}</span>
                  
                  {isSuperAdmin ? (
                    <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">SA</span>
                  ) : isAdmin ? (
                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Admin</span>
                  ) : null}

                  <svg className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 animate-fade-in origin-top-right ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">My Account</p>
                    </div>
                    
                    {user?.is_admin && (
                      <div className="border-b border-gray-100 pb-1 mb-1">
                        <Link href="/admin/users" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium">Manage Users</Link>
                        <Link href="/admin/documents" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium">Manage Documents</Link>
                        {isSuperAdmin && <Link href="/admin/requests" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium">Deletion Requests</Link>}
                        {isSuperAdmin && <Link href="/admin/archive-requests" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium">Archive Requests</Link>}
                        <Link href="/admin/theme" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium">Manage Theme</Link>
                      </div>
                    )}
                    
                    {!isAdmin && (
                        <Link href="/my-uploads" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600">My Submissions</Link>
                    )}

                    <Link href="/profile" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600">Profile Settings</Link>
                    
                    <div className="border-t border-gray-100 mt-1 pt-1">
                        <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium">Sign Out</button>
                    </div>
                  </div>
                )}
              </li>
            ) : (
              <div className="flex items-center space-x-3">
                {shouldShowLoginLink && <Link href="/login" style={{ color: 'var(--navbar-link-color)' }} className="px-4 py-2 hover:text-indigo-600 transition-colors font-medium">Sign In</Link>}
                {!isAuthPage && <Link href="/register" className="px-5 py-2.5 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 hover:shadow-indigo-300 transition-all transform hover:-translate-y-0.5">Get Started</Link>}
              </div>
            )}
          </ul>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 pt-2">
             <ul className="flex flex-col space-y-4 font-medium text-sm bg-white/50 backdrop-blur-md rounded-xl p-4 shadow-lg">
                {!isAuthPage && !isAdmin && ( 
                  <li>
                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="block text-slate-700 hover:text-indigo-600">Search</Link>
                  </li>
                )}
                {isAuthenticated && !isAdmin && (
                  <li><Link href="/upload" onClick={() => setIsMobileMenuOpen(false)} className="block text-slate-700 hover:text-indigo-600">Upload</Link></li>
                )}
                
                {isAuthenticated ? (
                  <>
                    <li className="pt-2 border-t border-gray-200">
                      <span className="block text-xs text-gray-400 uppercase tracking-wider mb-2">My Account ({user?.firstName})</span>
                      <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-slate-700">Profile Settings</Link>
                      {!isAdmin && <Link href="/my-uploads" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-slate-700">My Submissions</Link>}
                      {isAdmin && (
                        <>
                          <Link href="/admin/users" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-indigo-600">Manage Users</Link>
                          <Link href="/admin/documents" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-indigo-600">Manage Documents</Link>
                        </>
                      )}
                      <button onClick={handleLogout} className="block w-full text-left py-2 text-red-600 mt-2">Sign Out</button>
                    </li>
                  </>
                ) : (
                  <li className="pt-2 border-t border-gray-200 flex flex-col gap-3">
                     {shouldShowLoginLink && <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="block text-slate-700">Sign In</Link>}
                     {!isAuthPage && <Link href="/register" onClick={() => setIsMobileMenuOpen(false)} className="block text-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg">Get Started</Link>}
                  </li>
                )}
             </ul>
          </div>
        )}
      </div>
    </nav>
  );
}