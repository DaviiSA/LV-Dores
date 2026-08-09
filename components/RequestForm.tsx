
import React, { useState } from 'react';
import { Material, RequestedItem } from '../types';
import { VTRS } from '../constants';
import { Search, Plus, Trash2, Send, ChevronRight, PackageOpen, Loader2, Minus, Truck, UserCheck, CheckCircle2, ShoppingBag, X } from 'lucide-react';

interface RequestFormProps {
  materials: (Material & { availableStock: number })[];
  onSubmit: (vtr: string, items: RequestedItem[]) => Promise<void> | void;
  mode?: 'vtr' | 'others';
}

const RequestForm: React.FC<RequestFormProps> = ({ materials, onSubmit, mode = 'vtr' }) => {
  const [step, setStep] = useState(1);
  const [selectedVtr, setSelectedVtr] = useState('');
  const [customDestination, setCustomDestination] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [vtrSearch, setVtrSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low'>('all');
  const [cart, setCart] = useState<RequestedItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredVtrs = VTRS.filter(vtr => vtr.includes(vtrSearch));

  const availableMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.code.includes(searchTerm);
    if (!matchesSearch) return false;
    if (filterMode === 'low') return m.availableStock <= 5 && m.availableStock > 0;
    return m.availableStock > 0;
  });

  const displayRequester = mode === 'others' ? customDestination : selectedVtr;

  const addToCart = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    if (!material) return;

    const existing = cart.find(i => i.materialId === materialId);
    if (existing) {
      if (existing.quantity < material.availableStock) {
        setCart(cart.map(i => i.materialId === materialId ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        alert(`Saldo máximo atingido! Há apenas ${material.availableStock} unidades disponíveis no estoque.`);
      }
    } else {
      setCart([...cart, { materialId, quantity: 1 }]);
    }
  };

  const removeFromCart = (materialId: string) => {
    setCart(cart.filter(i => i.materialId !== materialId));
  };

  const updateQuantity = (materialId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.materialId === materialId) {
        const material = materials.find(m => m.id === materialId);
        const max = material?.availableStock || 0;
        const newQty = Math.max(1, Math.min(item.quantity + delta, max));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleFinish = async () => {
    const requester = mode === 'others' ? customDestination : selectedVtr;
    if (!requester) {
      alert(mode === 'others' ? 'Informe o destino (Pessoa/Depto/Empresa).' : 'Selecione uma viatura.');
      setStep(1);
      return;
    }
    if (cart.length === 0) {
      alert('Selecione ao menos um material.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(requester, cart);
      setCart([]);
      setSelectedVtr('');
      setCustomDestination('');
      setStep(1);
    } catch (e) {
      alert("Falha ao enviar solicitação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCartItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 max-w-4xl mx-auto">
      
      {/* Visual Stepper */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Step 1 */}
          <div 
            onClick={() => step > 1 && setStep(1)} 
            className={`flex items-center gap-2 cursor-pointer ${step >= 1 ? 'opacity-100' : 'opacity-40'}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
              step === 1 ? (mode === 'others' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'bg-[#004a99] text-white shadow-md') :
              step > 1 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {step > 1 ? <CheckCircle2 size={18} /> : 1}
            </div>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline">
              {mode === 'others' ? 'Destino' : 'Viatura'}
            </span>
          </div>

          <div className={`flex-1 h-1 mx-3 rounded-full transition-colors ${step >= 2 ? (mode === 'others' ? 'bg-purple-600' : 'bg-[#004a99]') : 'bg-slate-100'}`}></div>

          {/* Step 2 */}
          <div 
            onClick={() => step > 2 && setStep(2)} 
            className={`flex items-center gap-2 cursor-pointer ${step >= 2 ? 'opacity-100' : 'opacity-40'}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
              step === 2 ? (mode === 'others' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'bg-[#004a99] text-white shadow-md') :
              step > 2 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {step > 2 ? <CheckCircle2 size={18} /> : 2}
            </div>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline">Materiais</span>
          </div>

          <div className={`flex-1 h-1 mx-3 rounded-full transition-colors ${step >= 3 ? (mode === 'others' ? 'bg-purple-600' : 'bg-[#004a99]') : 'bg-slate-100'}`}></div>

          {/* Step 3 */}
          <div className={`flex items-center gap-2 ${step >= 3 ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
              step === 3 ? (mode === 'others' ? 'bg-purple-600 text-white shadow-md' : 'bg-emerald-600 text-white shadow-md') : 'bg-slate-100 text-slate-500'
            }`}>
              3
            </div>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline">Confirmar</span>
          </div>
        </div>
      </div>

      {/* STEP 1: DESTINATION OR VTR SELECTION */}
      {step === 1 && (
        mode === 'others' ? (
          <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-slate-200/80 max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
                <UserCheck size={28} />
              </div>
              <h2 className="text-2xl font-black text-slate-800">Identificação de Saída</h2>
              <p className="text-xs text-slate-500 font-medium">Informe quem está retirando os materiais ou a qual departamento se destinam.</p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">
                  Pessoa / Departamento / Empresa Terceira
                </label>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Ex: Carlos Silva - Manutenção Subestações" 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-purple-600 focus:bg-white text-slate-800 font-bold outline-none transition-all placeholder:text-slate-300"
                  value={customDestination}
                  onChange={(e) => setCustomDestination(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && customDestination.trim() && setStep(2)}
                />
              </div>

              <button 
                onClick={() => customDestination.trim() && setStep(2)}
                disabled={!customDestination.trim()}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-purple-200 active:scale-98 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                Avançar para Seleção de Materiais
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
                  <Truck size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Selecione a Viatura (VTR)</h2>
                  <p className="text-xs text-slate-500 font-medium">Escolha qual viatura receberá o material de linha viva.</p>
                </div>
              </div>

              {/* VTR Search filter */}
              <div className="relative w-full sm:w-48">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar VTR..." 
                  value={vtrSearch} 
                  onChange={(e) => setVtrSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {filteredVtrs.map(vtr => (
                <button
                  key={vtr}
                  onClick={() => { setSelectedVtr(vtr); setStep(2); }}
                  className={`py-4 px-3 rounded-2xl border-2 font-black text-base transition-all flex flex-col items-center justify-center gap-1 active:scale-95 ${
                    selectedVtr === vtr 
                      ? 'border-[#004a99] bg-blue-50 text-[#004a99] shadow-md ring-2 ring-blue-200' 
                      : 'border-slate-100 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-white'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">VTR</span>
                  <span>{vtr}</span>
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {/* STEP 2: SELECT MATERIALS */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Header Requester Banner */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Solicitante:</span>
              <span className={`text-xs font-black px-3 py-1 rounded-xl uppercase tracking-wider ${
                mode === 'others' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-[#004a99]'
              }`}>
                {mode === 'others' ? displayRequester : `VTR ${displayRequester}`}
              </span>
            </div>
            <button 
              onClick={() => setStep(1)} 
              className="text-xs text-slate-500 font-bold hover:text-slate-800 underline"
            >
              Alterar
            </button>
          </div>

          {/* Search & Material List */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
            
            {/* Search Input & Quick Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Pesquisar por descrição ou código do material..."
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#004a99] focus:bg-white outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    filterMode === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({materials.filter(m => m.availableStock > 0).length})
                </button>
                <button
                  onClick={() => setFilterMode('low')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    filterMode === 'low' ? 'bg-amber-500 text-slate-950' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Estoque Baixo
                </button>
              </div>
            </div>

            {/* Materials Scrollable Container */}
            <div className="max-h-[460px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {availableMaterials.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <PackageOpen size={48} className="mx-auto opacity-25" />
                  <p className="text-xs font-bold">Nenhum material encontrado com este filtro.</p>
                </div>
              ) : (
                availableMaterials.map(mat => {
                  const inCart = cart.find(c => c.materialId === mat.id);
                  return (
                    <div 
                      key={mat.id} 
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        inCart 
                          ? 'bg-blue-50/60 border-blue-200 ring-1 ring-blue-300' 
                          : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex-1 mr-3 space-y-0.5">
                        <p className="text-xs font-extrabold text-slate-800 line-clamp-1">{mat.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>CÓD: <strong className="text-slate-600">{mat.code}</strong></span>
                          <span>•</span>
                          <span className={`font-extrabold ${mat.availableStock <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            SALDO: {mat.availableStock}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {inCart ? (
                          <div className="flex items-center bg-white rounded-xl border border-blue-200 p-1 shadow-sm">
                            <button 
                              onClick={() => {
                                if (inCart.quantity === 1) removeFromCart(mat.id);
                                else updateQuantity(mat.id, -1);
                              }}
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-7 text-center font-black text-xs text-[#004a99]">{inCart.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(mat.id, 1)}
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(mat.id)}
                            className={`flex items-center gap-1 px-3 py-2 text-xs font-extrabold rounded-xl text-white active:scale-95 transition-all shadow-sm ${
                              mode === 'others' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[#004a99] hover:bg-blue-800'
                            }`}
                          >
                            <Plus size={16} /> Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sticky Floating Bottom Bar for Mobile / Next Step */}
          {cart.length > 0 && (
            <div className="sticky bottom-20 md:bottom-6 z-40 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-800 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">{cart.length} produto{cart.length > 1 ? 's' : ''} ({totalCartItems} un.)</p>
                  <p className="text-[10px] text-amber-400 font-semibold">Pronto para revisão</p>
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider text-white shadow-lg transition-all ${
                  mode === 'others' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                Revisar Pedido <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: CONFIRMATION */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 space-y-6">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <ShoppingBag className={mode === 'others' ? 'text-purple-600' : 'text-[#004a99]'} size={24} />
                Resumo da Solicitação
              </h2>
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                mode === 'others' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-[#004a99]'
              }`}>
                {mode === 'others' ? 'Saída Outros' : 'Pedido VTR'}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destino / Solicitante</p>
              <p className="text-base font-extrabold text-slate-800 mt-0.5">
                {mode === 'others' ? displayRequester : `VTR ${displayRequester}`}
              </p>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Itens Selecionados ({cart.length})</p>
              
              {cart.map(item => {
                const material = materials.find(m => m.id === item.materialId);
                return (
                  <div key={item.materialId} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="flex-1 mr-4">
                      <p className="text-xs font-extrabold text-slate-800">{material?.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">CÓD: {material?.code} • Saldo em Estoque: {material?.availableStock}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-slate-100 rounded-xl p-1">
                        <button 
                          onClick={() => updateQuantity(item.materialId, -1)}
                          className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-all"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-black text-xs text-slate-800">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.materialId, 1)}
                          className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button 
                        onClick={() => removeFromCart(item.materialId)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Remover item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all"
              >
                + Adicionar Mais Itens
              </button>

              <button
                onClick={handleFinish}
                disabled={isSubmitting}
                className={`flex-1 py-4 px-6 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all disabled:opacity-50 ${
                  mode === 'others' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                {isSubmitting ? 'Enviando Solicitação...' : 'Confirmar e Enviar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestForm;

