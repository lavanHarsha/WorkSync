import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  User,
  Lock,
  Bell,
  Key,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Shield,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'api'>('profile');

  // Profile Form
  const [name, setName] = useState(user?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityMsg, setSecurityMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preferences Form
  const [emailNotifs, setEmailNotifs] = useState(user?.preferences?.emailNotifications ?? true);
  const [wfNotifs, setWfNotifs] = useState(user?.preferences?.workflowNotifications ?? true);
  const [autoRetry, setAutoRetry] = useState(user?.preferences?.autoRetryFailed ?? false);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefMsg, setPrefMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Copy Key state
  const [copiedKey, setCopiedKey] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await api.updateProfile({ name });
      if (res.success) {
        setProfileMsg({ type: 'success', text: 'Profile details updated successfully' });
        await refreshUser();
      }
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setSecurityMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setSecurityMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    setSecuritySaving(true);
    setSecurityMsg(null);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setSecurityMsg({ type: 'success', text: 'Password successfully updated' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      setSecurityMsg({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setPrefSaving(true);
    setPrefMsg(null);
    try {
      const res = await api.updatePreferences({
        emailNotifications: emailNotifs,
        workflowNotifications: wfNotifs,
        autoRetryFailed: autoRetry,
      });
      if (res.success) {
        setPrefMsg({ type: 'success', text: 'Preferences saved successfully' });
        await refreshUser();
      }
    } catch (err: any) {
      setPrefMsg({ type: 'error', text: err.message || 'Failed to save preferences' });
    } finally {
      setPrefSaving(false);
    }
  };

  const handleCopyWebhookKey = () => {
    if (user?.webhookKey) {
      navigator.clipboard.writeText(user.webhookKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Bell },
    { id: 'api', label: 'API & Webhooks', icon: Key },
  ];

  return (
    <div className="space-y-6 pb-16 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Settings & Account
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your personal credentials, notification preferences, and webhook API access
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
                isActive
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
            <p className="text-xs text-slate-500">Update your account name and email address</p>
          </div>

          {profileMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {profileMsg.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Your email address is your primary login identifier.
              </p>
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-70"
            >
              {profileSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{profileSaving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Change Password</h3>
            <p className="text-xs text-slate-500">Ensure your account uses a strong, unique password</p>
          </div>

          {securityMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                securityMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {securityMsg.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              )}
              <span>{securityMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={securitySaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-70"
            >
              {securitySaving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              <span>{securitySaving ? 'Updating...' : 'Change Password'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Notification Preferences</h3>
            <p className="text-xs text-slate-500">Configure how and when WorkSync alerts you</p>
          </div>

          {prefMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{prefMsg.text}</span>
            </div>
          )}

          <div className="space-y-4 max-w-lg">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Email Notifications</h4>
                <p className="text-[11px] text-slate-500">Receive summary reports on automated runs</p>
              </div>
              <button
                type="button"
                onClick={() => setEmailNotifs(!emailNotifs)}
                className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 ${
                  emailNotifs ? 'bg-brand-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Workflow Error Alerts</h4>
                <p className="text-[11px] text-slate-500">Instant notification when a task fails execution</p>
              </div>
              <button
                type="button"
                onClick={() => setWfNotifs(!wfNotifs)}
                className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 ${
                  wfNotifs ? 'bg-brand-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Auto-Retry Failed Tasks</h4>
                <p className="text-[11px] text-slate-500">Automatically retry failed steps up to 3 times</p>
              </div>
              <button
                type="button"
                onClick={() => setAutoRetry(!autoRetry)}
                className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 ${
                  autoRetry ? 'bg-brand-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={prefSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-70"
            >
              {prefSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save Preferences</span>
            </button>
          </div>
        </div>
      )}

      {/* API & Webhooks Tab */}
      {activeTab === 'api' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">WorkSync API & Inbound Webhooks</h3>
            <p className="text-xs text-slate-500">
              Use your personal key to authenticate programmatic requests to WorkSync
            </p>
          </div>

          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Personal Webhook Key
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={user?.webhookKey || 'ws_live_key_sample'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhookKey}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shrink-0"
                >
                  {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                cURL Example Trigger
              </label>
              <pre className="p-4 bg-slate-950 text-emerald-400 text-xs rounded-xl overflow-x-auto font-mono">
{`curl -X POST "${window.location.origin}/api/workflows/webhook/YOUR_WEBHOOK_ID" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "customer.signup",
    "customer": { "name": "Alex", "email": "alex@company.com" }
  }'`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone / Logout */}
      <div className="p-6 rounded-3xl bg-white border border-rose-100 shadow-xs flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Session Management</h4>
          <p className="text-xs text-slate-500">Sign out of your active WorkSync workspace session</p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold border border-rose-200 transition-colors"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
