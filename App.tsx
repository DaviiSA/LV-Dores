
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import AdminPanel from './components/AdminPanel';
import RequestForm from './components/RequestForm';
import { Material, MaterialRequest, View, RequestedItem, StockMovement } from './types';
import { 
  initializeMaterials, 
  saveMaterials, 
  getRequests, 
  saveRequests, 
  getOthers,
  saveOthers,
  getMovements,
  saveMovements,
  syncToGoogleSheets,
  fetchRemoteData 
} from './services/dataService';
import { ADMIN_PASSWORD } from './constants';
import { ShieldAlert, UserCheck, Lock, ArrowRight, Database, Loader2, RefreshCw, Clock, CheckCircle2, Truck } from 'lucide-react';
import CrossedLightnings from './components/CrossedLightnings';

const App: React.FC = () => {
  const [view, setView] = useState<View>('Home');
  const [materials, setMaterials] = useState<Material[]>(() => initializeMaterials());
  const [requests, setRequests] = useState<MaterialRequest[]>(() => getRequests());
  const [others, setOthers] = useState<MaterialRequest[]>(() => getOthers());
  const [movements, setMovements] = useState<StockMovement[]>(() => getMovements());
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleTimeString());
  
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const pendingSyncRef = useRef<boolean>(false);

  const loadGlobalData = useCallback(async (isManual = true) => {
    if (pendingSyncRef.current && !isManual) return;
    if (isManual) setIsSyncing(true);
    
    try {
      const remote = await fetchRemoteData();
      if (remote) {
        let updated = false;
        if (remote.materials && remote.materials.length > 0) {
          setMaterials(remote.materials);
          updated = true;
        }
        if (remote.requests) setRequests(remote.requests);
        if (remote.others) setOthers(remote.others);
        if (remote.movements) setMovements(remote.movements);
        
        setLastUpdate(new Date().toLocaleTimeString());
        if (isManual && updated) alert('Dados sincronizados com a nuvem!');
      } else if (isManual) {
        alert('Não foi possível buscar dados da nuvem. Verifique a conexão ou o script da planilha.');
      }
    } catch (e) {
      console.error("Erro no carregamento:", e);
      if (isManual) alert('Erro ao carregar dados. Tente novamente.');
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGlobalData(true);
    const interval = setInterval(() => loadGlobalData(false), 90000);
    return () => clearInterval(interval);
  }, [loadGlobalData]);

  const triggerSync = async (mats: Material[], reqs: MaterialRequest[], oths: MaterialRequest[], movs: StockMovement[]) => {
    setIsSyncing(true);
    pendingSyncRef.current = true;
    await syncToGoogleSheets({ materials: mats, requests: reqs, others: oths, movements: movs });
    setTimeout(() => {
      pendingSyncRef.current = false;
      loadGlobalData(false);
    }, 5000);
  };

  const handleUpdateStock = (id: string, newStock: number) => {
    const material = materials.find(m => m.id === id);
    if (!material) return;

    const diff = newStock - material.stock;
    if (diff === 0) return;

    // Gerar log de movimentação
    const newMovement: StockMovement = {
      id: `MOV-${Date.now()}-${id}`,
      materialId: id,
      type: diff > 0 ? 'Entrada' : 'Saída',
      quantity: Math.abs(diff),
      timestamp: new Date().toISOString(),
      reason: 'Ajuste Manual Administrativo'
    };

    const updatedMats = materials.map(m => m.id === id ? { ...m, stock: Math.max(0, newStock) } : m);
    const updatedMovs = [...movements, newMovement];

    setMaterials(updatedMats);
    setMovements(updatedMovs);
    saveMaterials(updatedMats);
    saveMovements(updatedMovs);
    triggerSync(updatedMats, requests, others, updatedMovs);
  };

  const handleAddRequest = async (vtr: string, items: RequestedItem[], isOther: boolean = false) => {
    // 1. Gerar movimentações de saída (Reserva imediata de estoque)
    const newMovements: StockMovement[] = items.map(item => ({
      id: `MOV-${Date.now()}-${item.materialId}`,
      materialId: item.materialId,
      type: 'Saída',
      quantity: item.quantity,
      timestamp: new Date().toISOString(),
      reason: `Reserva ${isOther ? 'OUTROS (' + vtr + ')' : 'VTR ' + vtr} (Pendente)`
    }));

    // 2. Abatimento local do estoque (Reserva)
    const updatedMaterials = materials.map(m => {
      const r = items.find(i => i.materialId === m.id);
      return r ? { ...m, stock: Math.max(0, m.stock - r.quantity) } : m;
    });

    // 3. Novo pedido inicia como PENDENTE
    const newRequest: MaterialRequest = {
      id: `${isOther ? 'OUT' : 'PED'}-${Date.now().toString(36).toUpperCase()}`,
      vtr,
      timestamp: new Date().toISOString(),
      items,
      status: 'Pendente'
    };
    
    let updatedRequests = [...requests];
    let updatedOthers = [...others];
    
    if (isOther) {
      updatedOthers = [...others, newRequest];
    } else {
      updatedRequests = [...requests, newRequest];
    }
    
    const updatedMovs = [...movements, ...newMovements];
    
    setMaterials(updatedMaterials);
    setRequests(updatedRequests);
    setOthers(updatedOthers);
    setMovements(updatedMovs);
    saveMaterials(updatedMaterials);
    saveRequests(updatedRequests);
    saveOthers(updatedOthers);
    saveMovements(updatedMovs);
    
    await triggerSync(updatedMaterials, updatedRequests, updatedOthers, updatedMovs);
    alert(`Solicitação ${isOther ? '(' + vtr + ')' : 'da VTR ' + vtr} enviada com sucesso! Aguarde a confirmação do administrativo.`);
  };

  const handleUpdateRequestStatus = (requestId: string, status: 'Atendido' | 'Cancelado', isOther: boolean = false) => {
    let currentMaterials = [...materials];
    let currentMovements = [...movements];

    const updateRequestList = (list: MaterialRequest[]) => list.map(req => {
      if (req.id === requestId) {
        if (status === 'Atendido' && req.status === 'Pendente') {
          // Apenas atualiza o motivo do log para confirmar o atendimento
          currentMovements.push({
            id: `MOV-CONF-${Date.now()}-${req.id}`,
            materialId: req.items[0]?.materialId || '', // Log genérico de confirmação
            type: 'Saída',
            quantity: 0,
            timestamp: new Date().toISOString(),
            reason: `Atendimento Confirmado ${isOther ? 'OUTROS (' + req.vtr + ')' : 'VTR ' + req.vtr}`
          });
        }
        
        if (status === 'Cancelado' && req.status !== 'Cancelado') {
          // Devolver itens ao estoque gera log de entrada (Estorno)
          req.items.forEach(item => {
            const mIdx = currentMaterials.findIndex(m => m.id === item.materialId);
            if (mIdx !== -1) {
              currentMaterials[mIdx] = { ...currentMaterials[mIdx], stock: currentMaterials[mIdx].stock + item.quantity };
              currentMovements.push({
                id: `MOV-RECON-${Date.now()}-${item.materialId}`,
                materialId: item.materialId,
                type: 'Entrada',
                quantity: item.quantity,
                timestamp: new Date().toISOString(),
                reason: `Cancelamento/Estorno Pedido ${isOther ? 'OUTROS (' + req.vtr + ')' : 'VTR ' + req.vtr}`
              });
            }
          });
        }
        return { ...req, status };
      }
      return req;
    });

    let updatedRequests = [...requests];
    let updatedOthers = [...others];

    if (isOther) {
      updatedOthers = updateRequestList(others);
    } else {
      updatedRequests = updateRequestList(requests);
    }
    
    setMaterials(currentMaterials);
    setRequests(updatedRequests);
    setOthers(updatedOthers);
    setMovements(currentMovements);
    saveMaterials(currentMaterials);
    saveRequests(updatedRequests);
    saveOthers(updatedOthers);
    saveMovements(currentMovements);
    triggerSync(currentMaterials, updatedRequests, updatedOthers, currentMovements);
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setPassInput('');
    } else {
      alert('Senha incorreta!');
    }
  };

  const pendingRequestsCount = requests.filter(r => r.status === 'Pendente').length + others.filter(o => o.status === 'Pendente').length;
  const lowStockCount = materials.filter(m => m.stock <= 5).length;
  const totalStockItems = materials.reduce((acc, m) => acc + m.stock, 0);

  if (isLoading && materials.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md mb-6 ring-1 ring-white/20 animate-bounce">
          <CrossedLightnings size={48} />
        </div>
        <Loader2 size={36} className="text-amber-400 animate-spin mb-3" />
        <p className="text-slate-300 font-bold uppercase text-xs tracking-widest">Carregando Linha Viva Dores...</p>
      </div>
    );
  }

  return (
    <Layout 
      currentView={view} 
      onNavigate={(v) => {
        setView(v);
        if (v !== 'Admin') setIsAdminAuthenticated(false);
      }}
      isSyncing={isSyncing}
      lastUpdate={lastUpdate}
      pendingRequestsCount={pendingRequestsCount}
      onRefresh={() => loadGlobalData(true)}
    >
      {view === 'Home' && (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto py-2">
          
          {/* Main Hero Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#003366] via-[#004a99] to-[#001f44] text-white p-6 sm:p-10 shadow-2xl border border-blue-800/50">
            {/* Background Decorative Graphic */}
            <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
              <CrossedLightnings size={280} />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  Almoxarifado & Logística
                </div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                  Linha Viva <span className="text-amber-400">Dores</span>
                </h2>
                <p className="text-slate-200 text-sm max-w-xl font-medium leading-relaxed">
                  Gerenciamento em tempo real do estoque de materiais, solicitações das viaturas de campo e saídas administrativas. Produzido por Davi.
                </p>
              </div>

              {/* Quick Sync Button */}
              <div className="flex flex-col sm:items-end gap-2 w-full md:w-auto">
                <button 
                  onClick={() => loadGlobalData(true)}
                  disabled={isSyncing}
                  className={`flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-extrabold text-xs tracking-wider uppercase shadow-xl transition-all active:scale-95 ${
                    isSyncing 
                      ? 'bg-amber-400 text-slate-950 animate-pulse' 
                      : 'bg-white text-[#004a99] hover:bg-amber-400 hover:text-slate-950 shadow-white/10'
                  }`}
                >
                  <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Sincronizando...' : 'Atualizar Dados'}
                </button>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-semibold px-1">
                  <Clock size={12} className="text-amber-400" />
                  <span>Sincronizado às {lastUpdate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Itens Cadastrados</p>
                <p className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{materials.length}</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Database size={22} />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Estoque Total</p>
                <p className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{totalStockItems}</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 size={22} />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Estoque Baixo (≤5)</p>
                <p className={`text-xl sm:text-2xl font-black mt-0.5 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                  {lowStockCount}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                <ShieldAlert size={22} />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pedidos Pendentes</p>
                <p className={`text-xl sm:text-2xl font-black mt-0.5 ${pendingRequestsCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {pendingRequestsCount}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${pendingRequestsCount > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                <UserCheck size={22} />
              </div>
            </div>
          </div>

          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Action 1: Pedido VTR */}
            <button 
              onClick={() => setView('Request')} 
              className="group relative text-left bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px]"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors duration-300 mb-5 shadow-inner">
                  <Truck size={28} />
                </div>
                <h3 className="text-xl font-extrabold text-slate-800 mb-1 group-hover:text-sky-600 transition-colors">
                  Solicitação para Viaturas
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Solicitar materiais de linha viva para abastecimento das VTRs cadastradas.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-extrabold text-sky-600">
                <span>Fazer Pedido VTR</span>
                <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>

            {/* Action 2: Outras Saídas */}
            <button 
              onClick={() => setView('OtherRequest')} 
              className="group relative text-left bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px]"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300 mb-5 shadow-inner">
                  <UserCheck size={28} />
                </div>
                <h3 className="text-xl font-extrabold text-slate-800 mb-1 group-hover:text-purple-600 transition-colors">
                  Outras Saídas
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Registrar retiradas de materiais por colaboradores, departamentos ou terceiros.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-extrabold text-purple-600">
                <span>Registrar Saída</span>
                <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>

            {/* Action 3: Painel Administrador */}
            <button 
              onClick={() => setView('Admin')} 
              className="group relative text-left bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px]"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors duration-300 mb-5 shadow-inner">
                  <ShieldAlert size={28} />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-extrabold text-slate-800 group-hover:text-amber-600 transition-colors">
                    Administrativo
                  </h3>
                  {pendingRequestsCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse">
                      {pendingRequestsCount} pendente{pendingRequestsCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Aprovação de pedidos, edição de estoque, relatórios e integração com Google Sheets.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-extrabold text-amber-600">
                <span>Acessar Painel</span>
                <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      )}

      {view === 'Admin' && (
        !isAdminAuthenticated ? (
          <div className="max-w-md mx-auto my-10 px-4 animate-in zoom-in-95 duration-300">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200/80 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner ring-4 ring-amber-50/50">
                <Lock size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800">Painel do Administrador</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Digite a senha de acesso administrativo para visualizar o estoque e pedidos.
                </p>
              </div>

              <form onSubmit={handleAdminAuth} className="space-y-4">
                <div className="relative">
                  <input 
                    autoFocus 
                    type="password" 
                    placeholder="Senha DCMD" 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-amber-400 focus:bg-white text-center text-xl font-black tracking-widest text-slate-800 outline-none transition-all placeholder:text-slate-300" 
                    value={passInput} 
                    onChange={(e) => setPassInput(e.target.value)} 
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-4 bg-gradient-to-r from-[#004a99] to-[#003366] text-white rounded-2xl font-extrabold text-sm shadow-lg hover:opacity-95 active:scale-98 transition-all"
                >
                  Autenticar Acesso
                </button>
              </form>
              
              <button 
                onClick={() => setView('Home')} 
                className="text-xs text-slate-400 font-bold hover:text-slate-600 transition-colors"
              >
                Voltar ao Início
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between px-6">
               <div className="flex items-center gap-2 text-[#004a99] font-extrabold text-xs tracking-wider uppercase">
                  {isSyncing ? <Loader2 size={16} className="animate-spin text-amber-500" /> : <Database size={16} className="text-emerald-500" />}
                  {isSyncing ? 'Sincronizando com Nuvem...' : 'Base Conectada ao Google Sheets'}
               </div>
               <div className="text-[11px] text-slate-400 font-semibold">Leitura: {lastUpdate}</div>
            </div>
            <AdminPanel 
              materials={materials} 
              requests={requests} 
              others={others}
              movements={movements}
              onUpdateStock={handleUpdateStock}
              onUpdateRequestStatus={handleUpdateRequestStatus}
              onReloadData={() => loadGlobalData(true)}
            />
          </div>
        )
      )}

      {view === 'Request' && (
        <RequestForm 
          materials={materials.map(m => ({ ...m, availableStock: m.stock }))} 
          onSubmit={handleAddRequest} 
        />
      )}

      {view === 'OtherRequest' && (
        <RequestForm 
          materials={materials.map(m => ({ ...m, availableStock: m.stock }))} 
          onSubmit={(dest, items) => handleAddRequest(dest, items, true)}
          mode="others"
        />
      )}
    </Layout>
  );
};

export default App;
