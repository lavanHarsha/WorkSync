import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppIcon } from '../components/AppIcon';
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Sliders,
  Layers,
  Play,
  Terminal,
  ExternalLink,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState<number>(0);

  const handleDemoPlay = () => {
    if (demoRunning) return;
    setDemoRunning(true);
    setDemoStep(1);
    setTimeout(() => setDemoStep(2), 900);
    setTimeout(() => setDemoStep(3), 1800);
    setTimeout(() => {
      setDemoRunning(false);
    }, 2800);
  };

  const handleInstantDemoLogin = async () => {
    await demoLogin();
    navigate('/dashboard');
  };

  const exampleTemplates = [
    {
      title: 'Email to Slack Notification',
      trigger: 'gmail',
      triggerEvent: 'New Email',
      action: 'slack',
      actionEvent: 'Send Message',
      desc: 'Instant channel notification when critical emails or quarterly reports arrive.',
      tag: 'Most Popular',
    },
    {
      title: 'Form Submissions to Discord',
      trigger: 'google_forms',
      triggerEvent: 'New Response',
      action: 'discord',
      actionEvent: 'Post Message',
      desc: 'Broadcast customer feedback and support inquiries into Discord channels.',
      tag: 'Customer Ops',
    },
    {
      title: 'Stripe Webhooks to Google Sheets',
      trigger: 'webhook',
      triggerEvent: 'Catch Webhook',
      action: 'google_sheets',
      actionEvent: 'Add Row',
      desc: 'Log customer payments and subscriptions directly into live spreadsheet CRM.',
      tag: 'Finance',
    },
    {
      title: 'Hourly Health Check to Teams',
      trigger: 'schedule',
      triggerEvent: 'Every Hour',
      action: 'teams',
      actionEvent: 'Send Message',
      desc: 'Automate periodic system health and uptime dispatches to engineering.',
      tag: 'DevOps',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Zap size={22} fill="currentColor" />
            </div>
            <span className="font-extrabold text-2xl text-slate-900 tracking-tight">WorkSync</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-brand-600 transition-colors">How It Works</a>
            <a href="#templates" className="hover:text-brand-600 transition-colors">Templates</a>
            <Link to="/apps" className="hover:text-brand-600 transition-colors">Integrations</Link>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all"
              >
                Go to Dashboard
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <button
                  onClick={handleInstantDemoLogin}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all border border-indigo-200"
                >
                  <Sparkles size={14} />
                  Demo Mode
                </button>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-brand-600 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-semibold text-sm hover:from-brand-700 hover:to-indigo-700 shadow-md shadow-brand-500/20 transition-all hover:scale-102"
                >
                  Get Started
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
        {/* Glow ambient background circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-brand-200/40 via-purple-200/30 to-sky-200/40 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold mb-8 shadow-xs">
            <Sparkles size={14} className="text-brand-600 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Next-Generation Workflow Automation Platform</span>
          </div>

          {/* Hero text specified in requirements */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] max-w-4xl mx-auto mb-6">
            Automate Your Work.{' '}
            <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Sync Everything.
            </span>
          </h1>

          {/* Subtext specified in requirements */}
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10">
            WorkSync connects your apps and automates repetitive tasks so you can focus on what matters.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold text-base shadow-lg shadow-brand-500/25 hover:from-brand-700 hover:to-indigo-700 transition-all hover:scale-105 active:scale-95"
            >
              Get Started Free
              <ArrowRight size={18} />
            </Link>

            <button
              onClick={handleInstantDemoLogin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-base shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <Sparkles size={18} className="text-brand-600" />
              Explore Live Demo
            </button>
          </div>

          {/* Interactive Flow Visualizer in Hero */}
          <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 relative">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-medium text-slate-400 ml-2">WorkSync Interactive Flow Canvas</span>
              </div>
              <button
                onClick={handleDemoPlay}
                disabled={demoRunning}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors"
              >
                <Play size={13} fill="currentColor" />
                {demoRunning ? 'Simulating...' : 'Simulate Run'}
              </button>
            </div>

            {/* Visual Node Flow */}
            <div className="py-8 grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Trigger Node */}
              <div
                className={`p-5 rounded-2xl border-2 transition-all duration-300 text-left ${
                  demoStep >= 1
                    ? 'border-brand-500 bg-brand-50/50 shadow-md ring-4 ring-brand-100'
                    : 'border-slate-200 bg-slate-50/80'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">1. Trigger</span>
                  {demoStep >= 1 && <span className="text-xs font-semibold text-brand-600">Fired ✓</span>}
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <AppIcon app="gmail" size="md" />
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Gmail</h4>
                    <p className="text-xs text-slate-500">New Email Received</p>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-500 bg-white p-2 rounded-lg border border-slate-200 truncate">
                  filter: subject.includes('Report')
                </div>
              </div>

              {/* Conditions / Processing Node */}
              <div
                className={`p-5 rounded-2xl border-2 transition-all duration-300 text-left ${
                  demoStep >= 2
                    ? 'border-purple-500 bg-purple-50/50 shadow-md ring-4 ring-purple-100'
                    : 'border-slate-200 bg-slate-50/80'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">2. Processing</span>
                  {demoStep >= 2 && <span className="text-xs font-semibold text-purple-600">Passed ✓</span>}
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                    <Sliders size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Condition Rules</h4>
                    <p className="text-xs text-slate-500">Extract & Format Tags</p>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-500 bg-white p-2 rounded-lg border border-slate-200 truncate">
                  {'{{trigger.snippet}} -> format'}
                </div>
              </div>

              {/* Action Node */}
              <div
                className={`p-5 rounded-2xl border-2 transition-all duration-300 text-left ${
                  demoStep >= 3
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-4 ring-emerald-100'
                    : 'border-slate-200 bg-slate-50/80'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">3. Action</span>
                  {demoStep >= 3 && <span className="text-xs font-semibold text-emerald-600">Delivered ✓</span>}
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <AppIcon app="slack" size="md" />
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Slack</h4>
                    <p className="text-xs text-slate-500">Send Channel Message</p>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-500 bg-white p-2 rounded-lg border border-slate-200 truncate">
                  channel: #general
                </div>
              </div>
            </div>

            {/* Bottom status alert banner */}
            <div className="p-3 bg-slate-900 rounded-xl text-left text-xs font-mono text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${demoRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                <span>
                  {demoStep === 0 && 'Engine idle. Click "Simulate Run" above to see live event processing.'}
                  {demoStep === 1 && 'Trigger captured: New email from "Alex Morgan <alex@company.com>"'}
                  {demoStep === 2 && 'Evaluating conditional filters: Subject matched "Report", payload formatted'}
                  {demoStep === 3 && 'Action complete: Message dispatched to Slack #general in 184ms! (200 OK)'}
                </span>
              </div>
              <span className="text-slate-500 hidden sm:inline">Execution Engine: Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-brand-600 text-xs font-bold uppercase tracking-wider">Enterprise Automation</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 mb-4">
              Everything You Need to Automate Seamlessly
            </h2>
            <p className="text-slate-600 text-base">
              WorkSync provides powerful building blocks designed for both non-technical creators and experienced engineers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-brand-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center mb-6">
                <Layers size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Visual Workflow Builder</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Connect triggers, conditional branching, and actions with an intuitive step-by-step canvas.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-brand-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6">
                <Cpu size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Real-Time Execution Engine</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Test and execute workflows instantly. Inspect step-by-step logs, payloads, and millisecond durations.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-brand-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
                <RefreshCw size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Instant Webhook Ingestion</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Receive live HTTP POST webhooks from external tools, Stripe, GitHub, and Shopify with zero configuration.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-brand-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                <Sliders size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Dynamic Template Tags</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Effortlessly pass data between steps using intuitive variables like {'{{trigger.subject}}'} or {'{{trigger.email}}'}.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-brand-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-6">
                <Terminal size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Complete Task Audit History</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Every single run is recorded with complete request/response snapshots, status codes, and debug logs.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-brand-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-6">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Enterprise-Grade Security</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Protected with JWT authentication, encrypted secrets storage, and isolated execution sandboxing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How WorkSync Works Section */}
      <section id="how-it-works" className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-brand-600 text-xs font-bold uppercase tracking-wider">Simple 3-Step Process</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 mb-4">
              How WorkSync Works
            </h2>
            <p className="text-slate-600 text-base">
              Set up high-impact automations in under 2 minutes without writing a single line of code.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center mb-6 shadow-md shadow-indigo-200">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Choose Your Trigger</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Select from Gmail, Google Forms, Sheets, incoming Webhooks, or timed schedules to kick off your automation.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative">
              <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-extrabold flex items-center justify-center mb-6 shadow-md shadow-brand-200">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Configure Rules & Actions</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Map incoming data to outgoing channels like Slack, Discord, or Notion. Add conditional filters to refine what gets processed.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center mb-6 shadow-md shadow-emerald-200">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Test & Sync on Autopilot</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Test with simulated payloads right from the builder, turn it active, and let WorkSync do the heavy lifting 24/7.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Example Workflows Templates Showcase */}
      <section id="templates" className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="text-brand-600 text-xs font-bold uppercase tracking-wider">Ready-Made Templates</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
                Popular Workflows to Get You Started
              </h2>
            </div>
            <Link
              to="/workflows/create"
              className="mt-4 md:mt-0 text-sm font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1.5"
            >
              Build custom workflow <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exampleTemplates.map((tpl, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-lg transition-all group bg-white"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                    {tpl.tag}
                  </span>
                  <div className="flex items-center gap-2">
                    <AppIcon app={tpl.trigger} size="sm" />
                    <ArrowRight size={14} className="text-slate-400" />
                    <AppIcon app={tpl.action} size="sm" />
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1 group-hover:text-brand-600 transition-colors">
                  {tpl.title}
                </h3>
                <p className="text-sm text-slate-600 mb-6">{tpl.desc}</p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">
                    {tpl.triggerEvent} → {tpl.actionEvent}
                  </span>
                  <Link
                    to="/workflows/create"
                    className="font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                  >
                    Use template <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                  <Zap size={16} fill="currentColor" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">WorkSync</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Automate your work. Sync everything. Connecting people, applications, and workflows without limits.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link to="/workflows" className="hover:text-white transition-colors">Workflows</Link></li>
                <li><Link to="/workflows/create" className="hover:text-white transition-colors">Workflow Builder</Link></li>
                <li><Link to="/apps" className="hover:text-white transition-colors">Apps & Connectors</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Integrations</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/apps" className="hover:text-white transition-colors">Gmail & Google Workspace</Link></li>
                <li><Link to="/apps" className="hover:text-white transition-colors">Slack & Discord</Link></li>
                <li><Link to="/apps" className="hover:text-white transition-colors">Webhooks & APIs</Link></li>
                <li><Link to="/apps" className="hover:text-white transition-colors">Microsoft Teams & Notion</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">About WorkSync</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Documentation</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Account Login</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Create Free Account</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
            <p>© {new Date().getFullYear()} WorkSync Inc. All rights reserved.</p>
            <p className="mt-2 sm:mt-0">Built for seamless automation & productivity.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
