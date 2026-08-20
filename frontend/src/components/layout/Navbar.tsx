import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { User, LogOut, Settings } from 'lucide-react';
import { authService } from '@services/auth.service';
import { getUser } from '@utils/auth';

export const Navbar: React.FC = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const user = getUser();
  const firstName = user?.name ? user.name.split(' ')[0] : 'User';

  const handleLogout = () => {
    authService.logout();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) => 
    `text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:outline-none ${
      isActive 
        ? 'bg-brand-yellow text-bg-dark shadow-[0_4px_15px_rgba(255,214,0,0.15)]' 
        : 'text-gray-300 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <nav className="sticky top-0 z-40 glass-nav shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left: Logo */}
          <div 
            className="flex-shrink-0 flex items-center cursor-pointer gap-2 focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:outline-none rounded-lg p-1" 
            onClick={() => navigate('/events')}
            tabIndex={0}
            role="link"
            aria-label="SpotMe Home"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/events'); }}
          >
            <span className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-text-hi">
              <span className="w-7 h-7 border-[1.5px] border-brand-yellow rounded-[6px] relative inline-block">
                <span className="absolute inset-1.5 bg-brand-yellow rounded-[2px]" />
              </span>
              Spot<span className="text-brand-yellow">Me</span>
            </span>
          </div>

          {/* Center: Links */}
          <div className="hidden md:flex space-x-2">
            <NavLink to="/events" className={linkClass}>
              My Events
            </NavLink>
            <NavLink to="/create-event" className={linkClass}>
              Create Event
            </NavLink>
            <NavLink to="/find-my-photos" className={linkClass}>
              Find My Photos
            </NavLink>
            <NavLink to="/upload-photos" className={linkClass}>
              Upload Photos
            </NavLink>
          </div>

          {/* Right: Profile Dropdown */}
          <div className="flex items-center relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              aria-label="User Profile menu"
            >
              <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-2 rounded-full">
                <User className="w-4 h-4 text-brand-yellow" />
              </div>
              <span className="font-semibold text-sm text-gray-300 hidden sm:block">{firstName}</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-16 w-64 bg-surface-dark border border-white/10 rounded-2xl shadow-2xl py-2.5 z-50 animate-[slide-in_0.2s_ease-out] overflow-hidden">
                {/* User Details Header */}
                <div className="px-4 py-3.5 border-b border-white/5 bg-white/[0.01]">
                  <p className="text-sm font-bold text-white">{user?.name || 'User Name'}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email || 'user@example.com'}</p>
                </div>
                
                {/* Options */}
                <div className="py-1 px-1">
                  <button
                    className="w-full text-left px-3.5 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-brand-yellow rounded-xl flex items-center gap-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-brand-yellow"
                  >
                    <Settings className="w-4 h-4" />
                    Change Password
                  </button>
                </div>
                
                <div className="border-t border-white/5 py-1 px-1 mt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-brand-yellow"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
