import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, PieChart, Pie
} from 'recharts';
import { Material, MaterialRequest, RequestedItem, StockMovement } from '../types';
import { TrendingUp, Award, Calendar, Package, ArrowUpRight, BarChart3, PieChart as PieIcon, Activity } from 'lucide-react';

interface StatsChartProps {
  materials: Material[];
  requests: MaterialRequest[];
  others: MaterialRequest[];
  movements?: StockMovement[];
}

const APP_PALETTE = ['#004a99', '#0284c7', '#0284c7', '#f26722', '#eab308', '#8b5cf6', '#10b981', '#64748b'];

export const StatsChart: React.FC<StatsChartProps> = ({ materials, requests, others, movements = [] }) => {
  const [timeFilter, setTimeFilter] = useState<'30days' | '90days' | '12months' | 'all'>('all');
  const [activeChart, setActiveChart] = useState<'both' | 'top' | 'trend'>('both');

  const allRequests = useMemo(() => {
    return [...requests.map(r => ({ ...r, category: 'VTR' })), ...others.map(o => ({ ...o, category: 'Outros' }))];
  }, [requests, others]);

  // Filter requests based on time selection
  const filteredRequests = useMemo(() => {
    if (timeFilter === 'all') return allRequests;

    const now = new Date();
    const cutoff = new Date();

    if (timeFilter === '30days') cutoff.setDate(now.getDate() - 30);
    if (timeFilter === '90days') cutoff.setDate(now.getDate() - 90);
    if (timeFilter === '12months') cutoff.setFullYear(now.getFullYear() - 1);

    return allRequests.filter(req => new Date(req.timestamp) >= cutoff);
  }, [allRequests, timeFilter]);

  // Top Most Requested Materials
  const topMaterialsData = useMemo(() => {
    const counts: Record<string, { quantity: number; orderCount: number }> = {};

    filteredRequests.forEach(req => {
      req.items.forEach((item: RequestedItem) => {
        if (!counts[item.materialId]) {
          counts[item.materialId] = { quantity: 0, orderCount: 0 };
        }
        counts[item.materialId].quantity += item.quantity;
        counts[item.materialId].orderCount += 1;
      });
    });

    const list = Object.entries(counts).map(([id, data]) => {
      const mat = materials.find(m => m.id === id);
      return {
        id,
        name: mat ? mat.name : 'Material Desconhecido',
        code: mat ? mat.code : '---',
        shortName: mat ? (mat.name.length > 22 ? mat.name.substring(0, 22) + '...' : mat.name) : '...',
        quantity: data.quantity,
        orderCount: data.orderCount,
        stock: mat ? mat.stock : 0
      };
    });

    return list.sort((a, b) => b.quantity - a.quantity);
  }, [filteredRequests, materials]);

  const top1Material = topMaterialsData[0] || null;

  // Monthly Consumption Trend Data
  const monthlyTrendData = useMemo(() => {
    if (allRequests.length === 0) return [];

    const monthMap: Record<string, { monthKey: string; label: string; year: number; month: number; totalItems: number; requestCount: number; vtrItems: number; otherItems: number }> = {};

    allRequests.forEach(req => {
      const d = new Date(req.timestamp);
      if (isNaN(d.getTime())) return;

      const year = d.getFullYear();
      const month = d.getMonth(); // 0-indexed
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const label = `${monthNames[month]}/${String(year).slice(-2)}`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          monthKey,
          label,
          year,
          month,
          totalItems: 0,
          requestCount: 0,
          vtrItems: 0,
          otherItems: 0
        };
      }

      const itemCount = req.items.reduce((acc, it) => acc + it.quantity, 0);
      monthMap[monthKey].totalItems += itemCount;
      monthMap[monthKey].requestCount += 1;
      if (req.category === 'VTR') {
        monthMap[monthKey].vtrItems += itemCount;
      } else {
        monthMap[monthKey].otherItems += itemCount;
      }
    });

    const sortedMonths = Object.values(monthMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    return sortedMonths;
  }, [allRequests]);

  // Category Breakdown (VTR vs Outros)
  const categoryBreakdown = useMemo(() => {
    let vtrTotal = 0;
    let otherTotal = 0;

    filteredRequests.forEach(req => {
      const total = req.items.reduce((acc, it) => acc + it.quantity, 0);
      if (req.category === 'VTR') vtrTotal += total;
      else otherTotal += total;
    });

    return [
      { name: 'Viaturas (VTR)', value: vtrTotal, color: '#0284c7' },
      { name: 'Outras Destinações', value: otherTotal, color: '#9333ea' }
    ];
  }, [filteredRequests]);

  // Metrics Stats
  const totalItemsConsumed = useMemo(() => {
    return filteredRequests.reduce((acc, req) => acc + req.items.reduce((sum, i) => sum + i.quantity, 0), 0);
  }, [filteredRequests]);

  const peakMonth = useMemo(() => {
    if (monthlyTrendData.length === 0) return null;
    return [...monthlyTrendData].sort((a, b) => b.totalItems - a.totalItems)[0];
  }, [monthlyTrendData]);

  const avgMonthlyConsumption = useMemo(() => {
    if (monthlyTrendData.length === 0) return 0;
    const total = monthlyTrendData.reduce((acc, m) => acc + m.totalItems, 0);
    return Math.round(total / monthlyTrendData.length);
  }, [monthlyTrendData]);

  if (allRequests.length === 0) {
    return (
      <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200/80 text-center space-y-3">
        <Activity className="mx-auto text-slate-300" size={48} />
        <p className="text-slate-500 font-extrabold text-sm">Sem solicitações registradas para gerar indicadores</p>
        <p className="text-slate-400 text-xs">Os gráficos de materiais mais requisitados e evolução de consumo aparecerão conforme novos pedidos forem registrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Controls Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-slate-200/80 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2.5 bg-blue-50 text-[#004a99] rounded-2xl">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base">Painel de Indicadores & Tendências</h3>
            <p className="text-xs text-slate-400 font-medium">Análise de consumo de materiais e evolução temporal</p>
          </div>
        </div>

        {/* Time Period Filter */}
        <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
          <button 
            onClick={() => setTimeFilter('30days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${timeFilter === '30days' ? 'bg-white shadow text-[#004a99]' : 'text-slate-500 hover:text-slate-800'}`}
          >
            30 Dias
          </button>
          <button 
            onClick={() => setTimeFilter('90days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${timeFilter === '90days' ? 'bg-white shadow text-[#004a99]' : 'text-slate-500 hover:text-slate-800'}`}
          >
            90 Dias
          </button>
          <button 
            onClick={() => setTimeFilter('12months')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${timeFilter === '12months' ? 'bg-white shadow text-[#004a99]' : 'text-slate-500 hover:text-slate-800'}`}
          >
            12 Meses
          </button>
          <button 
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${timeFilter === 'all' ? 'bg-white shadow text-[#004a99]' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Todo Histórico
          </button>
        </div>
      </div>

      {/* Highlights / Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Material Mais Requisitado */}
        <div className="bg-gradient-to-br from-[#004a99] to-[#002d5e] p-6 rounded-3xl text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-4 -bottom-4 opacity-10 text-white">
            <Award size={140} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white/10 rounded-full text-blue-200 backdrop-blur-sm border border-white/10 flex items-center gap-1.5">
                <Award size={12} className="text-amber-400" /> Material #1 Mais Requisitado
              </span>
              <span className="text-xs font-mono font-bold text-blue-200">
                {top1Material?.code || '---'}
              </span>
            </div>
            <h4 className="text-lg font-black text-white leading-snug line-clamp-2">
              {top1Material?.name || 'Nenhum material no período'}
            </h4>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-baseline justify-between">
            <div>
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">Quantidade Solicitada</p>
              <p className="text-3xl font-black text-amber-300 mt-0.5">
                {top1Material ? `${top1Material.quantity} un.` : '0'}
              </p>
            </div>
            {top1Material && totalItemsConsumed > 0 && (
              <span className="text-xs font-extrabold text-blue-100 bg-white/10 px-2.5 py-1 rounded-lg">
                {Math.round((top1Material.quantity / totalItemsConsumed) * 100)}% do total
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Média Mensal de Consumo */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Média Mensal</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800">
              {avgMonthlyConsumption} <span className="text-xs text-slate-400 font-normal">un. / mês</span>
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Baseado no histórico de {monthlyTrendData.length} mês(es) registrado(s).
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 font-semibold flex items-center justify-between">
            <span>Total no período selecionado:</span>
            <span className="font-black text-slate-900">{totalItemsConsumed} un.</span>
          </div>
        </div>

        {/* Card 3: Mês de Pico de Consumo */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mês de Maior Pico</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Calendar size={16} />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800">
              {peakMonth ? peakMonth.label : '---'}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {peakMonth ? `Pico com ${peakMonth.totalItems} unidades requisitadas em ${peakMonth.requestCount} pedidos.` : 'Sem dados.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 font-semibold flex items-center justify-between">
            <span>Categoria VTR vs Outros:</span>
            <span className="font-black text-[#004a99]">
              {categoryBreakdown[0].value} vtr / {categoryBreakdown[1].value} outros
            </span>
          </div>
        </div>

      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CHART 1: Tendência de Consumo por Mês */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
                <TrendingUp size={18} className="text-[#004a99]" /> Tendência de Consumo por Mês
              </h4>
              <p className="text-xs text-slate-400 font-medium">Evolução mensal de itens requisitados</p>
            </div>
            <span className="text-[10px] font-black uppercase px-3 py-1 bg-sky-50 text-sky-700 rounded-full">
              Histórico
            </span>
          </div>

          {monthlyTrendData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-xs text-slate-400 font-bold">
              Sem dados de solicitações para gerar a tendência mensal.
            </div>
          ) : (
            <div className="h-[290px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#004a99" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#004a99" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorVtr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '12px 16px'
                    }}
                    formatter={(value: any, name?: any) => {
                      if (name === 'totalItems') return [`${value} unidades`, 'Total Consumido'];
                      if (name === 'vtrItems') return [`${value} un.`, 'VTRs'];
                      if (name === 'otherItems') return [`${value} un.`, 'Outros'];
                      return [`${value}`, String(name || '')];
                    }}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalItems" 
                    stroke="#004a99" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorConsumption)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="vtrItems" 
                    stroke="#0284c7" 
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1} 
                    fill="url(#colorVtr)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex items-center justify-center gap-6 pt-2 text-[11px] font-extrabold text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#004a99]"></span> Total Consumido
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-500 border border-dashed border-sky-600"></span> Apenas Viaturas (VTR)
            </div>
          </div>
        </div>

        {/* CHART 2: Materiais Mais Requisitados */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Package size={18} className="text-[#004a99]" /> Top Materiais Requisitados
              </h4>
              <p className="text-xs text-slate-400 font-medium">Classificação por volume de saída</p>
            </div>
            <span className="text-[10px] font-black uppercase px-3 py-1 bg-amber-50 text-amber-700 rounded-full">
              Ranking
            </span>
          </div>

          {topMaterialsData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-xs text-slate-400 font-bold">
              Nenhuma requisição no período selecionado.
            </div>
          ) : (
            <div className="h-[290px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topMaterialsData.slice(0, 7)}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="shortName" 
                    type="category" 
                    width={150}
                    tick={{ fontSize: 11, fontWeight: 800, fill: '#334155' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ 
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '10px 14px'
                    }}
                    formatter={(value: any) => [`${value} unidades`, 'Quantidade Requisitada']}
                  />
                  <Bar 
                    dataKey="quantity" 
                    radius={[0, 8, 8, 0]}
                    barSize={20}
                  >
                    {topMaterialsData.slice(0, 7).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={APP_PALETTE[index % APP_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top 3 Quick List */}
          {topMaterialsData.length > 0 && (
            <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              {topMaterialsData.slice(0, 3).map((item, idx) => (
                <div key={item.id} className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase">#{idx + 1} Requisitado</p>
                  <p className="text-xs font-black text-slate-800 truncate" title={item.name}>{item.name}</p>
                  <p className="text-[11px] font-extrabold text-[#004a99]">{item.quantity} un.</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default StatsChart;
