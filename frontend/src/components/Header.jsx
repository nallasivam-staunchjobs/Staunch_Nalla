import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Mail, MessageSquare, LogOut, User, Menu, ChevronUp, ChevronDown, ChevronFirst, ChevronLast } from 'lucide-react';
import profileImg from '../assets/profile.jpg';
import { menuItems } from '../data/Data';
import { useAuth } from '../Redux/hooks'; // Assuming this is the correct path to your hook

// Header/Navbar Component
export function Header({ toggleSidebar }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { logout } = useAuth(); // Get the logout function from your auth hook
  const navigate = useNavigate(); // Get the navigate function from react-router-dom

  const handleLogout = () => {
    // This is the correct way to handle logout
    logout(); 
    navigate('/');
  };

  return (
    <div className="flex items-center justify-between px-4 py-[5.5px] shadow bg-white sticky top-0 z-50">
      {/* Left Section: Sidebar Toggle + Search */}
      <div className="flex items-center gap-3">
        {/* Sidebar toggle (hamburger) */}
        <button className="text-gray-700 md:hidden" onClick={toggleSidebar}>
          <Menu className="w-6 h-6" />
        </button>

        {/* Search Input (hidden on small screens)
        <div className="hidden sm:block relative">
          <input
            type="text"
            placeholder="Search"
            className="pl-3 pr-10 py-1 border rounded-full bg-gray-100 focus:outline-none"
          />
        </div> */}
      </div>

      {/* Right Section: Icons + Profile */}
      <div className="flex items-center gap-4">
        <MessageSquare className="w-5 h-5 text-gray-700 cursor-pointer" />
        <Mail className="w-5 h-5 text-gray-700 cursor-pointer" />
        <Bell className="w-5 h-5 text-gray-700 cursor-pointer" />

        {/* Profile Dropdown */}
        <div className="relative">
          <img
            src={profileImg}
            alt="profile"
            className="w-8 h-8 rounded-full cursor-pointer border-2 border-white object-cover"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          />

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-20">
              <button className="flex items-center px-4 py-2 w-full hover:bg-gray-100 text-sm">
                <User className="w-4 h-4 mr-2" />
                My Profile
              </button>
              <button
                onClick={handleLogout} // ✅ Attach the logout handler here
                className="flex items-center px-4 py-2 w-full hover:bg-gray-100 text-sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout {/* ✅ Corrected the button text */}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}