import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Bell, Mail, MessageSquare, LogOut, User, Menu, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ChevronFirst, ChevronLast } from 'lucide-react';
import profileImg from '../assets/profile.jpg';
import { menuItems } from '../data/Data';
import logo from '/Logo.png?url';
import { useAuth } from '../Redux/hooks';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../Redux/authSlice';


// Header/Navbar Component
export function Header({ toggleSidebar, isOpen }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    // Add event listener when dropdown is open
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <div className={`flex items-center justify-between px-4 shadow bg-white sticky top-0 z-50 py-[6.5px]`}>
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
        <div className="relative" ref={dropdownRef}>
          <img
            src={profileImg}
            alt="profile"
            className="w-8 h-8 rounded-full cursor-pointer border-2 border-white object-cover"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          />


          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-sm">
              {/* User Info Header */}
              <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user?.firstName || user?.username || 'User'}
                    </p>
                    <p className="text-xs text-gray-600">{user?.level ? `Level ${user.level}` : 'Online'}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <button
                  onClick={() => {
                    navigate('/my-profile');
                    setDropdownOpen(false);
                  }}
                  className="flex items-center px-3 w-full text-left hover:bg-blue-50 text-sm text-gray-700 transition-all duration-300 group border-l-4 border-transparent hover:border-blue-500"
                >
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200 transition-colors">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 group-hover:text-blue-700">My Profile</p>
                    <p className="text-xs text-gray-500">Manage personal information</p>
                  </div>
                </button>

                <div className="my-2 mx-5 border-t border-gray-100"></div>

                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 w-full text-left hover:bg-red-50 text-sm text-gray-700 transition-all duration-300 group border-l-4 border-transparent hover:border-red-500"
                >
                  <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-red-200 transition-colors">
                    <LogOut className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 group-hover:text-red-700">Sign Out</p>
                    <p className="text-xs text-gray-500">End current session</p>
                  </div>
                </button>
              </div>

              {/* Footer */}
              <div className="px-3 py-1 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">StaunchJobs HR System</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sidebar Component
export function Sidebar({ isOpen, toggleSidebar }) {
  const [openDropdown, setOpenDropdown] = useState(() => {
    const saved = localStorage.getItem('sidebarOpenDropdown');
    return saved ? JSON.parse(saved) : null;
  });
  const [openSubDropdown, setOpenSubDropdown] = useState(() => {
    const saved = localStorage.getItem('sidebarOpenSubDropdown');
    return saved ? JSON.parse(saved) : null;
  });
  const location = useLocation();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Clear dropdown states when on dashboard/home page on component mount
  useEffect(() => {
    const currentPath = location.pathname;

    // Clear dropdowns only when on dashboard/home and they were persisted from localStorage
    if (currentPath === '/dashboard' || currentPath === '/' || currentPath === '/home') {
      // Only clear if they were loaded from localStorage (not user interaction)
      const savedDropdown = localStorage.getItem('sidebarOpenDropdown');
      const savedSubDropdown = localStorage.getItem('sidebarOpenSubDropdown');

      if (savedDropdown) {
        setOpenDropdown(null);
        localStorage.removeItem('sidebarOpenDropdown');
      }

      if (savedSubDropdown) {
        setOpenSubDropdown(null);
        localStorage.removeItem('sidebarOpenSubDropdown');
      }
    }
  }, []); // Only run on mount

  const handleLogout = () => {
    // Clear sidebar state from localStorage on logout
    localStorage.removeItem('sidebarOpenDropdown');
    localStorage.removeItem('sidebarOpenSubDropdown');
    dispatch(logout());
    navigate('/');
  };


  const toggleDropdown = (title) => {
    const newState = openDropdown === title ? null : title;
    setOpenDropdown(newState);
    localStorage.setItem('sidebarOpenDropdown', JSON.stringify(newState));
  };


  const toggleSubDropdown = (title) => {
    const newState = openSubDropdown === title ? null : title;
    setOpenSubDropdown(newState);
    localStorage.setItem('sidebarOpenSubDropdown', JSON.stringify(newState));
  };

  return (
    <>
      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 bg-opacity-30 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed md:static top-0 left-0 z-50 flex flex-col justify-between text-black bg-white h-full transition-all duration-300
          ${isOpen ? 'w-50' : 'w-16'} 
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          md:h-screen md:translate-x-0 `}
      >
        {/* Header Section with Toggle Button */}
        <div className={`flex items-center justify-between w-full px-4 py-[7.2px] border-b border-gray-300`}>
          <img src={logo} className={` ${isOpen ? "w-14 h-8" : "w-10 h-5"}`} alt="Staunch Jobs" />
          {isOpen && <h2 className="text-[16px] font-bold">StaunchJobs</h2>}
          <button
            className="text-gray-700 hover:text-black p-1"
            onClick={toggleSidebar}
            title="Toggle Sidebar"
          >
            {isOpen ? <ChevronLeft /> : <ChevronLast />}
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto scrollbar-desktop">
          <ul className="flex flex-col p-2 space-y-1">
            {menuItems.map((item) => {
              const isParentActive = item.subMenu?.some(
                (sub) =>
                  location.pathname === sub.path ||
                  sub.subMenuItems?.some((ss) => location.pathname === ss.path)
              );

              if (item.requiredRole && !item.requiredRole.includes(userRole)) {
                return null;
              }

              return (
                <li key={item.title}>
                  {item.path ? (
                    <NavLink
                      to={item.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={({ isActive }) =>
                        `flex items-center text-sm space-x-2 px-4 py-2 rounded-md transition ${isActive
                          ? 'bg-gray-200 text-black'
                          : 'hover:bg-gray-200'
                        }`
                      }
                    >
                      {React.createElement(item.icon, { size: 18 })}
                      {isOpen && <span>{item.title}</span>}
                    </NavLink>
                  ) : (
                    <div
                      onClick={() => toggleDropdown(item.title)}
                      className={`cursor-pointer flex items-center justify-between text-sm px-4 py-2 rounded-md transition ${isParentActive || openDropdown === item.title
                        ? 'bg-gray-200 text-black'
                        : 'hover:bg-gray-200'
                        }`}
                    >
                      <div className="flex items-center space-x-2">
                        {React.createElement(item.icon, { size: 18 })}
                        {isOpen && <span>{item.title}</span>}
                      </div>
                      {isOpen && (
                        <div>
                          {openDropdown === item.title || isParentActive ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submenus */}
                  {item.subMenu &&
                    (openDropdown === item.title || isParentActive) &&
                    isOpen && (
                      <ul className="ml-6 mt-1 space-y-1">
                        {item.subMenu.map((subItem) => {
                          if (subItem.onClick === 'logout') {
                            return (
                              <li key={subItem.title}>
                                <button
                                  onClick={handleLogout}
                                  className="flex items-center space-x-2 text-sm px-3 py-1 rounded-md transition hover:text-red-500 w-full text-left"
                                >
                                  {subItem.icon && React.createElement(subItem.icon, { size: 18 })}
                                  <span>{subItem.title}</span>
                                </button>
                              </li>
                            );
                          }

                          const hasSubItems = subItem.subMenuItems?.length > 0;
                          const isActiveSub =
                            location.pathname === subItem.path ||
                            subItem.subMenuItems?.some(
                              (s) => location.pathname === s.path
                            );


                          return (
                            <li key={subItem.title}>
                              {hasSubItems ? (
                                <>
                                  <div
                                    onClick={() => toggleSubDropdown(subItem.title)}
                                    className={`flex justify-between items-center cursor-pointer text-sm px-3 py-1 rounded-md transition ${openSubDropdown === subItem.title ||
                                      isActiveSub
                                      ? 'text-red-500 border-l-2 border-red-500'
                                      : 'hover:text-red-500'
                                      }`}
                                  >
                                    <span>{subItem.title}</span>
                                    {openSubDropdown === subItem.title ||
                                      isActiveSub ? (
                                      <ChevronUp size={12} />
                                    ) : (
                                      <ChevronDown size={12} />
                                    )}
                                  </div>
                                  <ul className="pl-4 mt-1 space-y-1">
                                    {openSubDropdown === subItem.title &&
                                      subItem.subMenuItems.map((subSub) => (
                                        <li key={subSub.title}>
                                          <NavLink
                                            to={subSub.path}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={({ isActive }) =>
                                              `block text-xs px-3 py-1 rounded-md transition ${isActive
                                                ? 'text-red-500 border-l-2 border-red-500'
                                                : 'hover:text-red-500'
                                              }`
                                            }
                                          >
                                            {subSub.title}
                                          </NavLink>
                                        </li>
                                      ))}
                                  </ul>
                                </>
                              ) : (
                                <NavLink
                                  to={subItem.path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={({ isActive }) =>
                                    `block text-sm px-3 py-1 rounded-md transition ${isActive
                                      ? 'text-red-500 border-l-2 border-red-500'
                                      : 'hover:text-red-500'
                                    }`
                                  }
                                >
                                  {subItem.title}
                                </NavLink>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </>
  );
}


// All Other Components
// Button Component
export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) {
  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'btn-blue',
    secondary: 'btn-secondary',
    danger: 'btn-red',
    outline: 'btn-outline',
    green: 'btn-green'
  };

  const sizeClasses = {
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg'
  };

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

// Input Component
export function Input({
  label,
  error,
  className = '',
  required = false,
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        className={`form-input ${error ? 'form-input-error' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// Select Component
export function Select({
  label,
  options = [],
  error,
  className = '',
  required = false,
  placeholder = 'Select an option',
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        className={`form-select ${error ? 'form-input-error' : ''} ${className}`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option, index) => (
          <option key={index} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// Textarea Component
export function Textarea({
  label,
  error,
  className = '',
  required = false,
  rows = 3,
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        className={`form-textarea ${error ? 'form-input-error' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// Checkbox Component
export function Checkbox({
  label,
  error,
  className = '',
  ...props
}) {
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        className={`form-radio ${className}`}
        {...props}
      />
      {label && (
        <label className="ml-2 text-sm text-gray-700">
          {label}
        </label>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// Modal Component
export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-4xl' }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${maxWidth}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Card Component
export function Card({ title, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

// Status Badge Component
export function StatusBadge({ status, children }) {
  const statusClasses = {
    active: 'status-active',
    inactive: 'status-inactive',
    suspended: 'status-suspended'
  };

  return (
    <span className={`status-badge ${statusClasses[status] || 'status-inactive'}`}>
      {children}
    </span>
  );
}

// Custom Dropdown Component
export function CustomDropdown({
  options = [],
  value,
  onChange,
  placeholder = "Select option",
  isSearchable = true,
  isClearable = true,
  isDisabled = false,
  noOptionsMessage = "No options found",
  tabIndex,
  className = "",
  error = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option && option.label && option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find selected option
  const selectedOption = options.find(option => option.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleOptionSelect(filteredOptions[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  const handleInputClick = () => {
    if (isDisabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(-1);
    if (!isOpen) setIsOpen(true);
  };

  const handleOptionSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm('');
  };

  const displayValue = isOpen && isSearchable ? searchTerm : (selectedOption?.label || '');

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Input Container */}
      <div
        className={`
          relative w-full min-h-[28px] h-[28px] px-3 py-1
          border rounded-md shadow-sm cursor-pointer
          flex items-center justify-between
          text-xs font-light
          transition-colors duration-200
          ${error
            ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500'
            : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-500'
          }
          ${isDisabled
            ? 'bg-gray-100 cursor-not-allowed'
            : 'bg-white hover:border-gray-400'
          }
          ${isOpen ? 'ring-1' : ''}
        `}
        onClick={handleInputClick}
      >
        {/* Input/Display */}
        {isSearchable ? (
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            placeholder={selectedOption ? selectedOption.label : placeholder}
            disabled={isDisabled}
            tabIndex={tabIndex}
            className={`
              flex-1 outline-none bg-transparent text-xs font-light
              ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              ${selectedOption && !isOpen ? 'text-gray-900' : 'text-gray-500'}
            `}
            style={{ caretColor: isOpen ? 'auto' : 'transparent' }}
          />
        ) : (
          <span className={`flex-1 text-xs font-light ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        )}

        {/* Icons */}
        <div className="flex items-center space-x-1">
          {/* Clear Button */}
          {isClearable && selectedOption && !isDisabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Dropdown Arrow */}
          <svg
            className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
          {filteredOptions.length > 0 ? (
            <ul ref={listRef} className="py-1">
              {filteredOptions.map((option, index) => (
                <li
                  key={option.id ? `${option.id}-${option.value}` : `${option.value}-${index}`}
                  onClick={() => handleOptionSelect(option)}
                  className={`
                    px-3 py-2 text-xs font-light cursor-pointer transition-colors
                    ${index === highlightedIndex
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-gray-900 hover:bg-gray-50'
                    }
                    ${selectedOption?.value === option.value
                      ? 'bg-blue-100 text-blue-900 font-medium'
                      : ''
                    }
                  `}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-xs text-gray-500 text-center">
              {noOptionsMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Custom Multi Select Component
export function CustomMultiSelect({
  options = [],
  value = [],
  onChange,
  placeholder = "Select options",
  isSearchable = true,
  isDisabled = false,
  noOptionsMessage = "No options found",
  tabIndex,
  className = "",
  error = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter options based on search term and exclude already selected
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !value.includes(option.value)
  );

  // Get selected options
  const selectedOptions = options.filter(option => value.includes(option.value));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleOptionSelect(filteredOptions[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  const handleInputClick = () => {
    if (isDisabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(-1);
    if (!isOpen) setIsOpen(true);
  };

  const handleOptionSelect = (option) => {
    const newValue = [...value, option.value];
    onChange(newValue.map(val => ({ value: val, label: options.find(opt => opt.value === val)?.label || val })));
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleRemoveOption = (optionValue, e) => {
    e.stopPropagation();
    const newValue = value.filter(val => val !== optionValue);
    onChange(newValue.map(val => ({ value: val, label: options.find(opt => opt.value === val)?.label || val })));
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange([]);
    setSearchTerm('');
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Input Container */}
      <div
        className={`
          relative w-full min-h-[28px] px-2 py-1 
          border rounded-md shadow-sm cursor-pointer
          flex items-center justify-between
          text-xs font-light
          transition-colors duration-200
          ${error
            ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500'
            : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-500'
          }
        `}
        onClick={handleInputClick}
      >
        {/* Selected options as badges */}
        <div className="flex flex-wrap gap-1 items-center flex-1">
          {selectedOptions.map(option => (
            <span
              key={option.value}
              className="flex items-center text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full"
              onClick={(e) => e.stopPropagation()}
            >
              {option.label}
              {!isDisabled && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveOption(option.value, e)}
                  className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}

          {isSearchable && (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              placeholder={value.length === 0 ? placeholder : ''}
              disabled={isDisabled}
              tabIndex={tabIndex}
              className={`
                flex-1 outline-none bg-transparent text-xs font-light
                ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                min-w-0
              `}
              style={{ caretColor: isOpen ? 'auto' : 'transparent' }}
            />
          )}
        </div>

        {/* Icons */}
        <div className="flex items-center space-x-1">
          {value.length > 0 && !isDisabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <svg
            className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
          {filteredOptions.length > 0 ? (
            <ul ref={listRef} className="py-1">
              {filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  onClick={() => handleOptionSelect(option)}
                  className={`
                    px-3 py-2 text-xs font-light cursor-pointer transition-colors
                    ${index === highlightedIndex
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-xs text-gray-500 text-center">
              {noOptionsMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}