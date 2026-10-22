import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  GitBranch,
  PlusCircle,
  Grid,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  ChevronRight,
  Bell,
  Search,
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Workflows', path: '/workflows', icon: GitBranch },
    { name: 'Create Workflow', path: '/workflows/create', icon: PlusCircle, highlight: true },
    { name: 'Apps', path: '/apps', icon: Grid },
    { name: 'Task History', path: '/history', icon: History },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 z-30 sticky top-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-accent flex items-center justify-center text-white shadow-sm">
            <Zap size={18} fill="currentColor" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">WorkSync</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 rounded-lg hover:bg-slate-100"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Overlay on mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200/80 flex flex-col z-50 transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Zap size={20} fill="currentColor" />
            </div>
            <div>
              <div className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-1.5">
                WorkSync
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-200">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Automation Platform</p>
            </div>
          </NavLink>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            if (item.highlight) {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 my-2 ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/25'
                      : 'bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? 'text-white' : 'text-indigo-600'} />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight size={14} className="opacity-60" />
                </NavLink>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-100 text-brand-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  size={18}
                  className={isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}
                />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout Bottom Section */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm shrink-0">
                {user?.name ? user.name.slice(0, 2) : 'WS'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-800 truncate">{user?.name || 'User'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'user@worksync.io'}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200/80"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 hidden md:flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="font-semibold text-slate-800 capitalize">
              {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Webhook Endpoint pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Engine Status: <strong>Online</strong></span>
            </div>

            <NavLink
              to="/settings"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Settings"
            >
              <Bell size={18} />
            </NavLink>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
