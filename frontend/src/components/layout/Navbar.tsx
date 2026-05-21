import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo */}
          <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => navigate('/events')}>
            <span className="text-2xl font-bold text-black tracking-tight">
              Grab<span className="text-[#FFD600]">Pic</span>
            </span>
          </div>

          {/* Center: Links */}
          <div className="hidden md:flex space-x-4">
            <Link to="/events" className="text-gray-700 hover:bg-[#FFD600] hover:text-black px-4 py-2 rounded-lg font-medium transition-all">
              My Events
            </Link>
            <Link to="/create-event" className="text-gray-700 hover:bg-[#FFD600] hover:text-black px-4 py-2 rounded-lg font-medium transition-all">
              Create Event
            </Link>
            <Link to="/find-my-photos" className="text-gray-700 hover:bg-[#FFD600] hover:text-black px-4 py-2 rounded-lg font-medium transition-all">
              Find My Photos
            </Link>
            <Link to="/upload-photos" className="text-gray-700 hover:bg-[#FFD600] hover:text-black px-4 py-2 rounded-lg font-medium transition-all">
              Upload Photos
            </Link>
          </div>

          {/* Right: Profile Dropdown */}
          <div className="flex items-center relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
            >
              <span className="font-medium text-gray-700 hidden sm:block">{firstName}</span>
              <div className="bg-[#FFD600]/20 p-1.5 rounded-full">
                <User className="w-5 h-5 text-gray-800" />
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-14 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                {/* User Details Header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-black">{user?.name || 'User Name'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || 'user@example.com'}</p>
                </div>
                
                {/* Options */}
                <div className="py-1">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#FFD600] flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Change Password
                  </button>
                </div>
                
                <div className="border-t border-gray-100 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
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
