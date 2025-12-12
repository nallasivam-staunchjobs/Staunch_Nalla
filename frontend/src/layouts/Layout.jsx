

import React, { useState, useEffect } from 'react';
import { Header, Sidebar } from '../components/UIComponents';
import { Outlet } from 'react-router-dom';

function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on route/content click in mobile view
  const handleContentClick = () => {
    if (window.innerWidth < 768 && isSidebarOpen) {
      setIsSidebarOpen(false);
      // Clear sidebar dropdown states when closing on mobile
      localStorage.removeItem('sidebarOpenDropdown');
      localStorage.removeItem('sidebarOpenSubDropdown');
    }
  };

  // Close sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize(); // set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-row transition-all duration-300 bg-white">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={() => {
          setIsSidebarOpen(!isSidebarOpen);
          // Clear sidebar dropdown states when toggling from sidebar button
          if (isSidebarOpen) {
            localStorage.removeItem('sidebarOpenDropdown');
            localStorage.removeItem('sidebarOpenSubDropdown');
          }
        }}
      />

      {/* Overlay (optional for mobile if you want click outside to close) */}
      {isSidebarOpen && window.innerWidth < 768 && (
        <div
          className="fixed inset-0 bg-transparent "
          onClick={() => {
            setIsSidebarOpen(false);
            // Clear sidebar dropdown states when closing via overlay
            localStorage.removeItem('sidebarOpenDropdown');
            localStorage.removeItem('sidebarOpenSubDropdown');
          }}
        />
      )}

      {/* Right Side: Navbar + Content */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden transition-all duration-300 ">
        {/* Navbar */}
        <Header toggleSidebar={() => {
          setIsSidebarOpen(!isSidebarOpen);
          // Clear sidebar dropdown states when toggling
          if (isSidebarOpen) {
            localStorage.removeItem('sidebarOpenDropdown');
            localStorage.removeItem('sidebarOpenSubDropdown');
          }
        }} />

        {/* Main Content */}
        {/* overflow-y-auto scrollbar-desktop */}
        <div
          className="flex-1 overflow-y-auto scrollbar-desktop p-2.5 bg-gray-100"
          onClick={handleContentClick}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Layout;


