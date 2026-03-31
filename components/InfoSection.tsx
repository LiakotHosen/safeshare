import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InfoSectionProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}

export const InfoSection: React.FC<InfoSectionProps> = ({ icon: Icon, title, children }) => (
  <div className="flex flex-col md:flex-row gap-6 mb-16 items-start group">
    <div className="bg-slate-800 p-4 rounded-2xl shrink-0 border border-slate-700 group-hover:border-emerald-500/50 transition-colors duration-300">
      <Icon className="w-8 h-8 text-emerald-500" />
    </div>
    <div className="text-left">
      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">{title}</h3>
      <div className="text-slate-400 leading-relaxed max-w-2xl">
        {children}
      </div>
    </div>
  </div>
);