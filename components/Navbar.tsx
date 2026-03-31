import React, { useState } from 'react';
import { Share2, Zap, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const links = ["About", "Security", "FAQ", "Donate"];

  return (
    <nav className="p-6 max-w-7xl mx-auto w-full z-50 relative border-b border-slate-800/50">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2 z-50 cursor-pointer" onClick={() => window.location.href = '/'}>
          <Share2 className="text-emerald-500 w-8 h-8" />
          <span className="text-2xl font-bold tracking-tight text-white">
            YourSafe<span className="text-emerald-500">Share</span>
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
          {links.map(link => (
            <a key={link} href={`#${link.toLowerCase()}`} className="hover:text-emerald-400 transition-colors">
              {link}
            </a>
          ))}
          <div className="text-emerald-400 flex items-center hover:text-emerald-300 cursor-pointer bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <Zap className="w-4 h-4 mr-1.5" /> 
            <span>P2P Encrypted</span>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden z-50 text-white hover:text-emerald-400 transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>

        {/* Mobile Nav Overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 bg-slate-900/95 flex flex-col items-center justify-center space-y-8 text-xl font-medium text-slate-300 md:hidden z-40 animate-[fadeIn_0.2s_ease-out]">
            {links.map(link => (
              <a key={link} href={`#${link.toLowerCase()}`} onClick={() => setIsMenuOpen(false)} className="hover:text-emerald-400">
                {link}
              </a>
            ))}
            <div className="text-emerald-400 flex items-center">
              <Zap className="w-5 h-5 mr-2" /> End-to-End Encrypted
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};