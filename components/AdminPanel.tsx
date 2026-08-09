
import React, { useState, useMemo } from 'react';
import { Material, MaterialRequest, StockMovement } from '../types';
import { 
  Search, Plus, Minus, CheckCircle, XCircle, Download, Database, ClipboardList, 
  Loader2, History, ArrowUpRight, ArrowDownLeft, AlertCircle, BarChart2, 
  FileSpreadsheet, Copy, Check, ExternalLink, RefreshCw, Save, Settings, ShieldCheck, Filter
} from 'lucide-react';
import { 
  exportToExcel, syncToGoogleSheets, getGoogleSheetsUrl, saveGoogleSheetsUrl, 
  GOOGLE_APPS_SCRIPT_CODE, fetchRemoteData 
} from '../services/dataService';
import { GOOGLE_SHEETS_WEBAPP_URL } from '../constants';
import StatsChart from './StatsChart';

interface AdminPanelProps {
  materials: Material[];
  requests: MaterialRequest[];
  others: MaterialRequest[];
  movements: StockMovement[];
  onUpdateStock: (id: string, newStock: number) => void;
  onUpdateRequestStatus: (requestId: string, status: 'Atendido' | 'Cancelado', isOther?: boolean) => void;
  onReloadData?: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  materials, 
  requests, 
  others, 
  movements, 
  onUpdateStock, 
  onUpdateRequestStatus,
  onReloadData 
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'requests' | 'history' | 'sheets'>('dashboard');
  const [requestSubTab, setRequestSubTab] = useState<'vtr' | 'others'>('vtr');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'zero'>('all');
  const [isBusy, setIsBusy] = useState(false);

  // Estados da Configuração da Planilha Google
  const [sheetsUrlInput, setSheetsUrlInput] = useState<string>(() => getGoogleSheetsUrl());
  const [copiedCode, setCopiedCode] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.code.includes(searchTerm);
      if (!matchesSearch) return false;
      if (stockFilter === 'low') return m.stock <= 5 && m.stock > 0;
      if (stockFilter === 'zero') return m.stock === 0;
      return true;
    });
  }, [materials, searchTerm, stockFilter]);

  const currentRequests = requestSubTab === 'vtr' ? requests : others;

  const filteredMovements = useMemo(() => {
    const sorted = [...movements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (!searchTerm) return sorted;
    
    return sorted.filter(m => {
      const mat = materials.find(mat => mat.id === m.materialId);
      return mat?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             mat?.code.includes(searchTerm) ||
             m.reason.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [movements, materials, searchTerm]);

  const handleExportStock = () => exportToExcel(materials, 'estoque_lv_dores');
  
  const handleExportRequests = () => {
    const targetRequests = requestSubTab === 'vtr' ? requests : others;
    const flatten = targetRequests.map(r => ({
      ID: r.id,
      Data: new Date(r.timestamp).toLocaleString(),
      [requestSubTab === 'vtr' ? 'VTR' : 'Destino']: r.vtr,
      Status: r.status,
      Itens: r.items.map(i => {
        const mat = materials.find(m => m.id === i.materialId);
        return `${mat?.name || 'Item ('+i.materialId+')'} [${i.quantity}]`;
      }).join('; ')
    }));
    exportToExcel(flatten, `pedidos_${requestSubTab === 'vtr' ? 'viaturas' : 'outros'}_lv_dores`);
  };

  const handleExportHistory = () => {
    const flatten = movements.map(m => {
      const mat = materials.find(mat => mat.id === m.materialId);
      return {
        ID: m.id,
        Data: new Date(m.timestamp).toLocaleString(),
        Código: mat?.code || '',
        Material: mat?.name || 'Material Removido',
        Tipo: m.type,
        Quantidade: m.quantity,
        Motivo: m.reason
      };
    });
    exportToExcel(flatten, 'historico_movimentacoes_lv_dores');
  };

  const handleSync = async () => {
    setIsBusy(true);
    const success = await syncToGoogleSheets({ materials, requests, others, movements });
    setIsBusy(false);
    if (success) alert('Dados sincronizados com a planilha Google!');
  };

  const handleSaveSheetsUrl = () => {
    const trimmed = sheetsUrlInput.trim();
    if (!trimmed.startsWith('http')) {
      alert('Por favor, insira um URL válido de WebApp do Google Script (iniciando com https://script.google.com/...)');
      return;
    }
    saveGoogleSheetsUrl(trimmed);
    setTestStatus({ type: 'success', msg: 'URL salva com sucesso!' });
    if (onReloadData) onReloadData();
  };

  const handleResetSheetsUrl = () => {
    saveGoogleSheetsUrl(GOOGLE_SHEETS_WEBAPP_URL);
    setSheetsUrlInput(GOOGLE_SHEETS_WEBAPP_URL);
    setTestStatus({ type: 'success', msg: 'URL padrão restaurada!' });
    if (onReloadData) onReloadData();
  };

  const handleTestSheetsConnection = async () => {
    setIsBusy(true);
    setTestStatus({ type: 'idle', msg: 'Testando conexão com a planilha...' });
    
    const syncSuccess = await syncToGoogleSheets({ materials, requests, others, movements });
    if (syncSuccess) {
      const remote = await fetchRemoteData();
      if (remote) {
        setTestStatus({ type: 'success', msg: 'Conexão estabelecida e sincronizada com sucesso!' });
        if (onReloadData) onReloadData();
      } else {
        setTestStatus({ type: 'error', msg: 'Dados enviados, mas não foi possível ler de volta. Verifique as permissões no WebApp.' });
      }
    } else {
      setTestStatus({ type: 'error', msg: 'Erro ao conectar. Verifique se o URL do WebApp está correto e público.' });
    }
    setIsBusy(false);
  };

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const totalPending = requests.filter(r => r.status === 'Pendente').length + others.filter(o => o.status === 'Pendente').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Navigation Tabs & Quick Action Export */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white p-3 rounded-3xl shadow-sm border border-slate-200/80">
        
        {/* Horizontal Scrollable Tabs */}
        <div className="flex p-1.5 bg-slate-100/80 rounded-2xl overflow-x-auto no-scrollbar gap-1">
          <button 
            onClick={() => {setActiveTab('dashboard'); setSearchTerm('');}} 
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'dashboard' ? 'bg-white shadow-md text-[#004a99]' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 size={15} /> Indicadores
          </button>

          <button 
            onClick={() => {setActiveTab('stock'); setSearchTerm('');}} 
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'stock' ? 'bg-white shadow-md text-[#004a99]' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database size={15} /> Estoque
          </button>

          <button 
            onClick={() => {setActiveTab('requests'); setSearchTerm('');}} 
            className={`relative px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'requests' ? 'bg-white shadow-md text-[#004a99]' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList size={15} /> Pedidos ({requests.length + others.length})
            {totalPending > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
          </button>

          <button 
            onClick={() => {setActiveTab('history'); setSearchTerm('');}} 
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-white shadow-md text-[#004a99]' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History size={15} /> Histórico
          </button>

          <button 
            onClick={() => {setActiveTab('sheets'); setSearchTerm('');}} 
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'sheets' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <FileSpreadsheet size={15} /> Planilha Google
          </button>
        </div>
        
        {/* Sync & Export Buttons */}
        <div className="flex gap-2">
          <button 
            disabled={isBusy} 
            onClick={handleSync} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-[#004a99] rounded-2xl text-xs font-extrabold hover:bg-blue-100 uppercase tracking-wider transition-all border border-blue-100"
          >
            {isBusy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Sync Nuvem
          </button>

          <button 
            onClick={activeTab === 'stock' ? handleExportStock : activeTab === 'requests' ? handleExportRequests : handleExportHistory} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-extrabold hover:bg-emerald-100 uppercase tracking-wider transition-all border border-emerald-100"
          >
            <Download size={15} /> Excel
          </button>
        </div>
      </div>

      {/* Requests Sub-Tab Selector */}
      {activeTab === 'requests' && (
        <div className="flex p-1.5 bg-white border border-slate-200/80 rounded-2xl w-fit gap-1 shadow-sm">
          <button 
            onClick={() => setRequestSubTab('vtr')} 
            className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
              requestSubTab === 'vtr' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Viaturas ({requests.length})
          </button>
          <button 
            onClick={() => setRequestSubTab('others')} 
            className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
              requestSubTab === 'others' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Outros ({others.length})
          </button>
        </div>
      )}

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <StatsChart materials={materials} requests={requests} others={others} movements={movements} />
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Solicitacoes</p>
               <p className="text-3xl font-black text-slate-800 mt-1">{requests.length + others.length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo total em estoque</p>
               <p className="text-3xl font-black text-emerald-600 mt-1">{materials.reduce((acc, m) => acc + m.stock, 0)} <span className="text-xs font-normal text-slate-400">un.</span></p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registros de Movimentacao</p>
               <p className="text-3xl font-black text-slate-800 mt-1">{movements.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH BAR (For Stock, Requests, History) */}
      {activeTab !== 'dashboard' && activeTab !== 'sheets' && (
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={
                activeTab === 'stock' ? "Pesquisar por nome ou código do material..." : 
                activeTab === 'requests' ? "Buscar por " + (requestSubTab === 'vtr' ? "VTR" : "destino") + " ou código..." : 
                "Filtrar histórico por material ou motivo..."
              }
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#004a99] focus:bg-white text-xs font-bold text-slate-800 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {activeTab === 'stock' && (
            <div className="flex gap-2">
              <button 
                onClick={() => setStockFilter('all')}
                className={`px-3 py-2 rounded-xl text-xs font-bold ${stockFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setStockFilter('low')}
                className={`px-3 py-2 rounded-xl text-xs font-bold ${stockFilter === 'low' ? 'bg-amber-500 text-slate-950' : 'bg-amber-50 text-amber-700'}`}
              >
                Baixo (≤5)
              </button>
              <button 
                onClick={() => setStockFilter('zero')}
                className={`px-3 py-2 rounded-xl text-xs font-bold ${stockFilter === 'zero' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'}`}
              >
                Zerados
              </button>
            </div>
          )}
        </div>
      )}

      {/* STOCK TAB */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Descrição do Material</th>
                  <th className="px-6 py-4">Saldo Atual</th>
                  <th className="px-6 py-4 text-center">Ajuste de Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map(item => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-[11px] font-extrabold text-slate-500">{item.code}</td>
                    <td className="px-6 py-4 font-extrabold text-slate-800">{item.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                        item.stock > 5 ? 'bg-emerald-100 text-emerald-800' :
                        item.stock > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.stock} un.
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <input 
                          key={`${item.id}-${item.stock}`}
                          type="number"
                          min="0"
                          defaultValue={item.stock}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val !== item.stock) {
                              onUpdateStock(item.id, val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-24 px-3 py-2 text-center bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a99] focus:bg-white outline-none font-black text-sm text-slate-800 transition-all shadow-inner"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REQUESTS TAB */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {currentRequests.length === 0 ? (
            <div className="bg-white p-16 text-center rounded-3xl border-2 border-dashed border-slate-200 space-y-2">
              <ClipboardList className="mx-auto text-slate-300" size={56} />
              <p className="text-slate-400 font-extrabold uppercase text-xs tracking-wider">Nenhum pedido registrado nesta categoria</p>
            </div>
          ) : (
            currentRequests.slice().reverse().map(req => (
              <div 
                key={req.id} 
                className={`bg-white p-6 rounded-3xl shadow-sm border transition-all space-y-4 ${
                  req.status === 'Pendente' 
                    ? (requestSubTab === 'vtr' ? 'border-sky-200 bg-sky-50/20 ring-1 ring-sky-300/50' : 'border-purple-200 bg-purple-50/20 ring-1 ring-purple-300/50') 
                    : 'border-slate-200/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3.5 rounded-2xl shadow-md text-white transition-colors ${
                      req.status === 'Pendente' ? (requestSubTab === 'vtr' ? 'bg-sky-600' : 'bg-purple-600') :
                      req.status === 'Atendido' ? 'bg-emerald-600' : 'bg-slate-400'
                    }`}>
                      <ClipboardList size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-black px-3 py-1 rounded-xl uppercase tracking-wider ${
                          requestSubTab === 'vtr' ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {requestSubTab === 'vtr' ? 'VTR ' + req.vtr : req.vtr}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">#{req.id.slice(-6)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase">{new Date(req.timestamp).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                      req.status === 'Atendido' ? 'bg-emerald-100 text-emerald-800' : 
                      req.status === 'Cancelado' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800 shadow-inner'
                    }`}>
                      {req.status}
                    </span>
                    
                    {req.status === 'Pendente' && (
                      <div className="flex gap-2">
                        <button 
                          title="Confirmar Atendimento"
                          onClick={() => onUpdateRequestStatus(req.id, 'Atendido', requestSubTab === 'others')} 
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl shadow-md hover:bg-emerald-700 transition-all active:scale-95 text-xs font-black uppercase"
                        >
                          <CheckCircle size={16} /> Aprovar
                        </button>
                        <button 
                          title="Cancelar e Devolver Saldo"
                          onClick={() => onUpdateRequestStatus(req.id, 'Cancelado', requestSubTab === 'others')} 
                          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl shadow-md hover:bg-rose-700 transition-all active:scale-95 text-xs font-black uppercase"
                        >
                          <XCircle size={16} /> Cancelar
                        </button>
                      </div>
                    )}
                    
                    {req.status === 'Atendido' && (
                      <button 
                        title="Estornar Atendimento"
                        onClick={() => {
                          if(confirm("Deseja realmente estornar este pedido e devolver os itens ao estoque?")) {
                            onUpdateRequestStatus(req.id, 'Cancelado', requestSubTab === 'others');
                          }
                        }} 
                        className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                  </div>
                </div>
                
                {req.status === 'Pendente' && (
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold ${
                    requestSubTab === 'vtr' ? 'text-sky-800 bg-sky-100/80 border border-sky-200' : 'text-purple-800 bg-purple-100/80 border border-purple-200'
                  }`}>
                    <AlertCircle size={16} /> 
                    <span>AGUARDANDO APROVAÇÃO. OS ITENS JÁ FORAM RESERVADOS DO ESTOQUE.</span>
                  </div>
                )}

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-2">
                  {req.items.map((item, idx) => {
                    const material = materials.find(m => m.id === item.materialId);
                    return (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-slate-800 font-extrabold flex-1 mr-4">{material?.name || `Item (${item.materialId})`}</span>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] text-slate-400 font-mono">CÓD: {material?.code || item.materialId}</span>
                           <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 font-black text-slate-900 shadow-sm">x{item.quantity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Data / Hora</th>
                  <th className="px-6 py-4">Material</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Quantidade</th>
                  <th className="px-6 py-4">Motivo / Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Nenhum histórico encontrado.</td>
                  </tr>
                ) : (
                  filteredMovements.map(mov => {
                    const mat = materials.find(m => m.id === mov.materialId);
                    return (
                      <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs font-extrabold text-slate-800">{new Date(mov.timestamp).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{new Date(mov.timestamp).toLocaleTimeString()}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-extrabold text-slate-800 line-clamp-1">{mat?.name || 'Material Removido'}</div>
                          <div className="text-[10px] text-slate-400 font-mono uppercase">{mat?.code}</div>
                        </td>
                        <td className="px-6 py-4">
                          {mov.type === 'Entrada' ? (
                            <div className="flex items-center gap-1 text-emerald-600 font-black text-xs uppercase">
                              <ArrowDownLeft size={16} /> Entrada
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-rose-600 font-black text-xs uppercase">
                              <ArrowUpRight size={16} /> Saída
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-black text-xs ${mov.type === 'Entrada' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {mov.type === 'Entrada' ? '+' : '-'}{mov.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-extrabold uppercase tracking-tight">{mov.reason}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GOOGLE SHEETS TAB */}
      {activeTab === 'sheets' && (
        <div className="space-y-6">
          {/* Card 1: URL Config */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 space-y-5">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg">Integração Google Sheets</h3>
                  <p className="text-xs text-slate-500 font-medium">Sincronize o estoque e pedidos direto em uma planilha Google do Drive.</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-3 py-1 rounded-full uppercase tracking-wider">
                Google Apps Script
              </span>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
                URL do WebApp Implantado
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  value={sheetsUrlInput} 
                  onChange={(e) => setSheetsUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec" 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button 
                  onClick={handleSaveSheetsUrl}
                  className="flex items-center justify-center gap-1.5 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                >
                  <Save size={16} /> Salvar URL
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex gap-2">
                <button 
                  disabled={isBusy}
                  onClick={handleTestSheetsConnection}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 text-[#004a99] rounded-xl text-xs font-extrabold hover:bg-blue-100 transition-all border border-blue-100"
                >
                  {isBusy ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Testar Conexao
                </button>
                <button 
                  onClick={handleResetSheetsUrl}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-extrabold hover:bg-slate-200 transition-all"
                >
                  Restaurar URL Padrão
                </button>
              </div>

              {testStatus.msg && (
                <div className={`text-xs font-bold flex items-center gap-1.5 ${
                  testStatus.type === 'success' ? 'text-emerald-600' : 
                  testStatus.type === 'error' ? 'text-rose-600' : 'text-blue-600'
                }`}>
                  {testStatus.type === 'success' && <CheckCircle size={16} />}
                  {testStatus.type === 'error' && <AlertCircle size={16} />}
                  {testStatus.msg}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Google Apps Script Code */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-100">
              <div>
                <h3 className="font-black text-slate-800 text-base">Código do Google Apps Script</h3>
                <p className="text-xs text-slate-500 font-medium">Cole este script no menu Extensões &gt; Apps Script da sua nova planilha Google.</p>
              </div>
              <button 
                onClick={handleCopyScriptCode}
                className={`flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 ${
                  copiedCode ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                {copiedCode ? 'Código Copiado!' : 'Copiar Código Script'}
              </button>
            </div>

            <div className="relative">
              <pre className="bg-slate-950 text-amber-300 p-5 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-80 custom-scrollbar leading-relaxed border border-slate-800">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
            </div>
          </div>

          {/* Card 3: Instructions */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
            <h3 className="font-black text-slate-800 text-base border-b pb-4 border-slate-100 flex items-center gap-2">
              <Settings size={20} className="text-[#004a99]" /> Passo a Passo para Criar e Conectar uma Nova Planilha
            </h3>

            <ol className="space-y-3 text-xs text-slate-600 list-decimal list-inside leading-relaxed font-medium">
              <li className="pl-1">
                Acesse o <strong className="text-slate-800">Google Drive</strong> (drive.google.com) e crie uma <strong className="text-slate-800">Nova Planilha Google</strong> vazia.
              </li>
              <li className="pl-1">
                No menu superior da planilha, clique em <strong className="text-slate-800">Extensões</strong> &gt; <strong className="text-slate-800">Apps Script</strong>.
              </li>
              <li className="pl-1">
                Apague todo o código existente na tela do editor do Apps Script e <strong className="text-slate-800">cole o código exibido no quadro acima</strong>.
              </li>
              <li className="pl-1">
                Clique no botão azul <strong className="text-slate-800">Implantar</strong> (no canto superior direito) e selecione <strong className="text-slate-800">Nova implantação</strong>.
              </li>
              <li className="pl-1">
                No ícone de engrenagem do menu à esquerda de &quot;Selecione o tipo&quot;, escolha <strong className="text-slate-800">App da Web</strong>.
              </li>
              <li className="pl-1">
                Preencha os campos da implantação:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-slate-500">
                  <li><strong>Executar como:</strong> Eu (seu e-mail)</li>
                  <li><strong>Quem pode acessar:</strong> <span className="text-amber-600 font-black">Qualquer pessoa</span> (Anyone) — <em>essencial para que o app conecte sem pedir login.</em></li>
                </ul>
              </li>
              <li className="pl-1">
                Clique em <strong className="text-slate-800">Implantar</strong>, autorize as permissões solicitadas pela conta do Google.
              </li>
              <li className="pl-1">
                Copie o <strong className="text-slate-800">URL do App da Web</strong> gerado (termina em <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-800">/exec</code>).
              </li>
              <li className="pl-1">
                Cole o URL copiado na caixa acima e clique em <strong className="text-emerald-600 font-extrabold">Salvar URL</strong>.
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

