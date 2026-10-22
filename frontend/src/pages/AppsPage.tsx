import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { IAppDefinition } from '../types';
import { AppIcon } from '../components/AppIcon';
import { Modal } from '../components/Modal';
import {
  Grid,
  Search,
  CheckCircle2,
  ExternalLink,
  Shield,
  Key,
  RefreshCw,
  Loader2,
  Plug,
  Sparkles,
} from 'lucide-react';

export const AppsPage: React.FC = () => {
  const [apps, setApps] = useState<IAppDefinition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Connection modal state
  const [selectedApp, setSelectedApp] = useState<IAppDefinition | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  const fetchApps = async () => {
    try {
      setIsLoading(true);
      const data = await api.getApps();
      if (data.success) {
        setApps(data.apps);
      }
    } catch (err) {
      console.error('Failed to load apps catalog:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleOpenConnect = (app: IAppDefinition) => {
    setSelectedApp(app);
    setApiKeyInput(app.connected ? '••••••••••••••••••••••••' : '');
    setConnectionSuccess(false);
  };

  const handleConnect = async () => {
    if (!selectedApp) return;
    setIsConnecting(true);
    try {
      const res = await api.connectApp(selectedApp.id, {
        simulated: true,
        token: apiKeyInput || 'ws_token_' + Math.random().toString(36).substring(2, 10),
      });
      if (res.success) {
        setConnectionSuccess(true);
        setApps((prev) =>
          prev.map((a) => (a.id === selectedApp.id ? { ...a, connected: true } : a))
        );
        setTimeout(() => {
          setSelectedApp(null);
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to connect app:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!selectedApp) return;
    setIsConnecting(true);
    try {
      const res = await api.disconnectApp(selectedApp.id);
      if (res.success) {
        setApps((prev) =>
          prev.map((a) => (a.id === selectedApp.id ? { ...a, connected: false } : a))
        );
        setSelectedApp(null);
      }
    } catch (err) {
      console.error('Failed to disconnect app:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const categories = ['All', 'Communication', 'Productivity', 'Developer Tools', 'Forms & Surveys'];

  const filteredApps = apps.filter((app) => {
    const matchesCategory = activeCategory === 'All' || app.category === activeCategory;
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          App Marketplace & Integrations
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Connect your favorite apps and cloud services to automate workflows with WorkSync
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search integrations..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 focus:bg-white"
          />
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* Apps Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="text-brand-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500">Loading integration marketplace...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-brand-300 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <AppIcon app={app.id} size="lg" />
                  {app.connected ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      Connected
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                      Not Connected
                    </span>
                  )}
                </div>

                <div className="mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {app.category}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                    {app.name}
                  </h3>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mb-6 line-clamp-3">
                  {app.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {app.triggers?.length || 0} Triggers · {app.actions?.length || 0} Actions
                </span>

                <button
                  type="button"
                  onClick={() => handleOpenConnect(app)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    app.connected
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-500/20'
                  }`}
                >
                  {app.connected ? 'Manage' : 'Connect'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Integration Setup Modal */}
      <Modal
        isOpen={Boolean(selectedApp)}
        onClose={() => setSelectedApp(null)}
        title={
          selectedApp && (
            <div className="flex items-center gap-3">
              <AppIcon app={selectedApp.id} size="sm" />
              <span>Connect {selectedApp.name}</span>
            </div>
          )
        }
        maxWidth="md"
      >
        {selectedApp && (
          <div className="space-y-6">
            <p className="text-xs text-slate-600">
              Authorize WorkSync to securely exchange triggers and execute actions on behalf of your {selectedApp.name} account.
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Shield size={14} className="text-brand-600" />
                <span>Simulated OAuth 2.0 / API Credentials</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  API Key or Access Token
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key size={14} />
                  </div>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter API key or leave blank for auto-token"
                    className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-800"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Mock/simulation layer active: WorkSync securely generates simulated credentials for this academic environment.
              </p>
            </div>

            {connectionSuccess && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Successfully authenticated and synced connection!</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {selectedApp.connected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isConnecting}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  Disconnect App
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20"
                >
                  {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
                  <span>{selectedApp.connected ? 'Save & Reconnect' : 'Authorize & Connect'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
