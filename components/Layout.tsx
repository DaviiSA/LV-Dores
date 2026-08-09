
import React from 'react';
import { Home as HomeIcon, ShieldCheck, Truck, UserCheck, FileSpreadsheet, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { ENERGISA_COLORS } from '../constants';
import CrossedLightnings from './CrossedLightnings';
import { View } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onNavigate: (view: View) => void;
  isSyncing?: boolean;
  lastUpdate?: string;
  pendingRequestsCount?: number;
  onRefresh?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  onNavigate,
  isSyncing = false,
  lastUpdate,
  pendingRequestsCount = 0,
  onRefresh
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-amber-400 selection:text-slate-950 pb-20 md:pb-6">
      {/* Top Banner / Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#002f66] via-[#004a99] to-[#00224d] text-white shadow-md border-b-2 border-amber-400">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* Logo & Brand Title */}
          <div 
            className="flex items-center gap-3 cursor-pointer group py-1" 
            onClick={() => onNavigate('Home')}
          >
            <div className="bg-white/95 p-2 rounded-xl shadow-lg ring-2 ring-amber-400/50 group-hover:scale-105 transition-transform duration-200 flex items-center justify-center">
              <CrossedLightnings size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black tracking-tight leading-none text-white">
                  Linha Viva <span className="text-amber-300">Dores</span>
                </h1>
              </div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-amber-400/90 flex items-center gap-1 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                DCMD
              </p>
            </div>
          </div>

          {/* Controls & Sync Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Sync Badge */}
            {lastUpdate && (
              <div className="hidden sm:flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-semibold text-slate-100 border border-white/15">
                {isSyncing ? (
                  <RefreshCw size={13} className="animate-spin text-amber-300" />
                ) : (
                  <CheckCircle2 size={13} className="text-emerald-400" />
                )}
                <span>{isSyncing ? 'Sincronizando...' : `Atualizado: ${lastUpdate}`}</span>
              </div>
            )}

            {/* Manual Sync Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isSyncing}
                title="Sincronizar com a nuvem"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all border border-white/10 disabled:opacity-50"
              >
                <RefreshCw size={18} className={isSyncing ? 'animate-spin text-amber-300' : ''} />
              </button>
            )}

            {/* Home Quick Button if not on Home */}
            {currentView !== 'Home' && (
              <button 
                onClick={() => onNavigate('Home')}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all"
              >
                <HomeIcon size={16} />
                <span className="hidden xs:inline">Início</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 md:py-8">
        {children}
      </main>

      {/* Mobile Floating Bottom Bar for Touch Devices */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 text-slate-400 px-3 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => onNavigate('Home')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-3 rounded-xl transition-all ${
            currentView === 'Home' ? 'text-amber-400 bg-amber-400/10' : 'hover:text-slate-200'
          }`}
        >
          <HomeIcon size={20} />
          <span>Início</span>
        </button>

        <button
          onClick={() => onNavigate('Request')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-3 rounded-xl transition-all ${
            currentView === 'Request' ? 'text-sky-400 bg-sky-400/10' : 'hover:text-slate-200'
          }`}
        >
          <Truck size={20} />
          <span>Pedir VTR</span>
        </button>

        <button
          onClick={() => onNavigate('OtherRequest')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-3 rounded-xl transition-all ${
            currentView === 'OtherRequest' ? 'text-purple-400 bg-purple-400/10' : 'hover:text-slate-200'
          }`}
        >
          <UserCheck size={20} />
          <span>Outros</span>
        </button>

        <button
          onClick={() => onNavigate('Admin')}
          className={`relative flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-3 rounded-xl transition-all ${
            currentView === 'Admin' ? 'text-amber-400 bg-amber-400/10' : 'hover:text-slate-200'
          }`}
        >
          <ShieldCheck size={20} />
          <span>Admin</span>
          {pendingRequestsCount > 0 && (
            <span className="absolute top-0 right-2 w-4 h-4 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow">
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </nav>

      {/* Desktop Footer */}
      <footer className="hidden md:block border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Linha Viva Dores</span>
            <span className="text-slate-300">•</span>
            <span>Sistema Inteligente de Controle de Estoque</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">Produzido por Davi</span>
            <div className="flex gap-1.5 ml-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#004a99]" title="Azul"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffcc00]" title="Amarelo"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#f26722]" title="Laranja"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

