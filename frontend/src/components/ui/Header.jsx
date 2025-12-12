import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';

const Header = ({ onMenuToggle, isMenuOpen = false }) => {
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigationItems = [
    { label: 'Candidates', path: '/candidate-profile-modal', icon: 'Users' },
    { label: 'Scheduling', path: '/interview-scheduling-hub', icon: 'Calendar' },
    { label: 'Analytics', path: '/recruitment-analytics-dashboard', icon: 'BarChart3' },
    { label: 'Documents', path: '/document-management-system', icon: 'FileText' },
  ];

  const moreItems = [
    { label: 'Bulk Management', path: '/bulk-candidate-management', icon: 'Settings' },
    { label: 'User Management', path: '/user-management-console', icon: 'Shield' },
  ];

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const handleUserMenuToggle = () => {
    setUserMenuOpen(!userMenuOpen);
    setMoreMenuOpen(false);
  };

  const handleMoreMenuToggle = () => {
    setMoreMenuOpen(!moreMenuOpen);
    setUserMenuOpen(false);
  };

  const handleLogout = () => {
    // Logout logic here
    console.log('Logout clicked');
    setUserMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border backdrop-blur-sm">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left Section - Logo and Mobile Menu */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="lg:hidden"
          >
            <Icon name={isMenuOpen ? 'X' : 'Menu'} size={20} />
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <Icon name="Users" size={18} color="white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-foreground">Candidate Manager</h1>
            </div>
          </div>
        </div>

        {/* Center Section - Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navigationItems?.map((item) => (
            <a
              key={item?.path}
              href={item?.path}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-smooth ${
                isActivePath(item?.path)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon name={item?.icon} size={16} />
              <span>{item?.label}</span>
            </a>
          ))}
          
          {/* More Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMoreMenuToggle}
              className="flex items-center space-x-2"
            >
              <Icon name="MoreHorizontal" size={16} />
              <span>More</span>
              <Icon name="ChevronDown" size={14} />
            </Button>
            
            {moreMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-popover border border-border rounded-md shadow-moderate z-50">
                <div className="py-1">
                  {moreItems?.map((item) => (
                    <a
                      key={item?.path}
                      href={item?.path}
                      className={`flex items-center space-x-2 px-3 py-2 text-sm transition-smooth ${
                        isActivePath(item?.path)
                          ? 'bg-accent text-accent-foreground'
                          : 'text-popover-foreground hover:bg-muted'
                      }`}
                      onClick={() => setMoreMenuOpen(false)}
                    >
                      <Icon name={item?.icon} size={16} />
                      <span>{item?.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Right Section - User Menu */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
            <span>Welcome back,</span>
            <span className="font-medium text-foreground">Sarah Johnson</span>
          </div>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUserMenuToggle}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <Icon name="User" size={16} color="white" />
              </div>
              <Icon name="ChevronDown" size={14} className="hidden sm:block" />
            </Button>
            
            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-popover border border-border rounded-md shadow-moderate z-50">
                <div className="py-1">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-popover-foreground">Sarah Johnson</p>
                    <p className="text-xs text-muted-foreground">HR Manager</p>
                  </div>
                  <a
                    href="/profile"
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth"
                  >
                    <Icon name="User" size={16} />
                    <span>Profile</span>
                  </a>
                  <a
                    href="/settings"
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth"
                  >
                    <Icon name="Settings" size={16} />
                    <span>Settings</span>
                  </a>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth text-left"
                  >
                    <Icon name="LogOut" size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Mobile Navigation Overlay */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-background z-40 animate-fade-in">
          <nav className="p-4 space-y-2">
            {[...navigationItems, ...moreItems]?.map((item) => (
              <a
                key={item?.path}
                href={item?.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-md text-base font-medium transition-smooth ${
                  isActivePath(item?.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
                onClick={onMenuToggle}
              >
                <Icon name={item?.icon} size={20} />
                <span>{item?.label}</span>
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;