import React from 'react';
import {
  Mail,
  Table,
  FileText,
  MessageSquare,
  Webhook,
  Clock,
  Headphones,
  Users,
  BookOpen,
  GitBranch,
  Layers,
} from 'lucide-react';

interface AppIconProps {
  app: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBackground?: boolean;
  className?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  app,
  size = 'md',
  showBackground = true,
  className = '',
}) => {
  const norm = (app || '').toLowerCase().replace(/[\s-]/g, '_');

  const sizeClasses = {
    sm: 'w-6 h-6 p-1 rounded-md text-xs',
    md: 'w-9 h-9 p-2 rounded-lg text-sm',
    lg: 'w-12 h-12 p-2.5 rounded-xl text-base',
    xl: 'w-16 h-16 p-3.5 rounded-2xl text-xl',
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 24,
    xl: 32,
  };

  const iconSize = iconSizes[size];

  let config = {
    icon: Layers,
    bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    name: 'App',
  };

  switch (norm) {
    case 'gmail':
      config = {
        icon: Mail,
        bg: 'bg-red-50 text-red-600 border border-red-100',
        name: 'Gmail',
      };
      break;
    case 'slack':
      config = {
        icon: MessageSquare,
        bg: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100',
        name: 'Slack',
      };
      break;
    case 'google_sheets':
    case 'sheets':
      config = {
        icon: Table,
        bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
        name: 'Sheets',
      };
      break;
    case 'google_forms':
    case 'forms':
      config = {
        icon: FileText,
        bg: 'bg-purple-50 text-purple-600 border border-purple-100',
        name: 'Forms',
      };
      break;
    case 'webhook':
    case 'webhooks':
      config = {
        icon: Webhook,
        bg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
        name: 'Webhook',
      };
      break;
    case 'schedule':
      config = {
        icon: Clock,
        bg: 'bg-sky-50 text-sky-600 border border-sky-100',
        name: 'Schedule',
      };
      break;
    case 'discord':
      config = {
        icon: Headphones,
        bg: 'bg-blue-50 text-blue-600 border border-blue-100',
        name: 'Discord',
      };
      break;
    case 'teams':
    case 'microsoft_teams':
      config = {
        icon: Users,
        bg: 'bg-violet-50 text-violet-600 border border-violet-100',
        name: 'Teams',
      };
      break;
    case 'notion':
      config = {
        icon: BookOpen,
        bg: 'bg-zinc-100 text-zinc-900 border border-zinc-200',
        name: 'Notion',
      };
      break;
    case 'github':
      config = {
        icon: GitBranch,
        bg: 'bg-neutral-100 text-neutral-800 border border-neutral-200',
        name: 'GitHub',
      };
      break;
  }

  const IconComponent = config.icon;

  if (!showBackground) {
    return (
      <span className={`inline-flex items-center justify-center ${className}`}>
        <IconComponent size={iconSize} />
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center font-medium shadow-sm transition-transform duration-200 ${sizeClasses[size]} ${config.bg} ${className}`}
      title={config.name}
    >
      <IconComponent size={iconSize} />
    </div>
  );
};
