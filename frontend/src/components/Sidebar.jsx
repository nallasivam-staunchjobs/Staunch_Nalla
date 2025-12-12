import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  ChevronUp,
  ChevronDown,

  ChevronLast,
} from 'lucide-react';
import { menuItems } from '../data/Data';
import { useAuth } from '../Redux/hooks'; // ✅ using your custom hook

function Sidebar({ isOpen, toggleSidebar }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openSubDropdown, setOpenSubDropdown] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, userRole } = useAuth(); // ✅ from hooks

  const toggleDropdown = (title) => {
    setOpenDropdown((prev) => (prev === title ? null : title));
  };

  const toggleSubDropdown = (title) => {
    setOpenSubDropdown((prev) => (prev === title ? null : title));
  };

  // const handleLogout = () => {
  //   localStorage.clear(); // clear tokens, roles, etc.
  //   logout();             // reset redux state
  //   navigate('/login');   // redirect to login page
  // };

  const handleLogout = () => {
    -   localStorage.clear(); // ❌ don’t nuke everything
    -   logout();             // reset redux state
    -   navigate('/login');   // redirect to login page
    +   logout();             // ✅ clears only auth keys
    +   navigate('/');        // ✅ always go back to login route
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
        <div
          className={`flex items-center justify-between w-full px-4 ${isOpen ? 'py-[8.5px]' : 'py-[10.5px]'
            } border-b border-gray-300`}
        >
          {isOpen && <h2 className="text-xl font-bold">Sidebar</h2>}
          <button
            className="text-gray-700 hover:text-black"
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
              // ✅ CORRECTED LOGIC: Check if requiredRole exists and if the user's role is NOT included in it.
              if (item.requiredRole && !item.requiredRole.includes(userRole)) {
                return null;
              }

              const isParentActive = item.subMenu?.some(
                (sub) =>
                  location.pathname === sub.path ||
                  sub.subMenuItems?.some((ss) => location.pathname === ss.path)
              );

              return (
                <li key={item.title}>
                  {item.path ? (
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center text-sm  space-x-2 px-4 py-2 rounded-md transition ${isActive
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
                      className={`cursor-pointer flex items-center justify-between text-sm px-4 py-2 rounded-md  transition ${isParentActive || openDropdown === item.title
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
                          const hasSubItems =
                            subItem.subMenuItems?.length > 0;
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
                                    onClick={() =>
                                      toggleSubDropdown(subItem.title)
                                    }
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

        {/* ✅ Logout Button at the bottom */}
        <div className="p-2 border-t border-gray-300">
          <button
            onClick={handleLogout}
            className={`flex items-center w-full text-sm px-4 py-2 rounded-md transition
              ${isOpen ? 'justify-start' : 'justify-center'}
              text-red-600 hover:bg-red-100 hover:text-red-700
            `}
            title="Logoutasdfghj"
          >
            <LogOut size={18} className={`${isOpen ? 'mr-2' : ''}`} />
            {isOpen && <span>Logoutasdfghjkl</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
