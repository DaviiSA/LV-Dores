
import * as XLSX from 'xlsx';
import { Material, MaterialRequest, RequestedItem, StockMovement } from '../types';
import { RAW_MATERIALS as RAW_STRING, GOOGLE_SHEETS_WEBAPP_URL } from '../constants';

const STORAGE_KEYS = {
  MATERIALS: 'lv_dores_materials',
  REQUESTS: 'lv_dores_requests',
  OTHERS: 'lv_dores_others',
  MOVEMENTS: 'lv_dores_movements',
  SHEETS_URL: 'lv_dores_sheets_url',
};

export const getGoogleSheetsUrl = (): string => {
  return localStorage.getItem(STORAGE_KEYS.SHEETS_URL) || GOOGLE_SHEETS_WEBAPP_URL;
};

export const saveGoogleSheetsUrl = (url: string) => {
  localStorage.setItem(STORAGE_KEYS.SHEETS_URL, url.trim());
};

export const GOOGLE_APPS_SCRIPT_CODE = `function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {
    materials: [],
    requests: [],
    others: [],
    movements: []
  };

  // 1. Materiais
  var sheetMat = ss.getSheetByName("Materiais");
  if (sheetMat) {
    var dataMat = sheetMat.getDataRange().getValues();
    if (dataMat.length > 1) {
      for (var i = 1; i < dataMat.length; i++) {
        var code = String(dataMat[i][0] || '').trim();
        var name = String(dataMat[i][1] || '').trim();
        var stock = Number(dataMat[i][2]) || 0;
        if (code) {
          result.materials.push({ code: code, name: name, stock: stock });
        }
      }
    }
  }

  // 2. Pedidos VTR
  var sheetReq = ss.getSheetByName("Pedidos_VTR");
  if (sheetReq) {
    var dataReq = sheetReq.getDataRange().getValues();
    if (dataReq.length > 1) {
      for (var j = 1; j < dataReq.length; j++) {
        var id = String(dataReq[j][0] || '');
        var vtr = String(dataReq[j][1] || '');
        var timestamp = String(dataReq[j][2] || '');
        var status = String(dataReq[j][3] || '');
        var details = String(dataReq[j][4] || '');
        if (id) {
          result.requests.push({ id: id, vtr: vtr, timestamp: timestamp, status: status, details: details });
        }
      }
    }
  }

  // 3. Pedidos Outros
  var sheetOth = ss.getSheetByName("Pedidos_Outros");
  if (sheetOth) {
    var dataOth = sheetOth.getDataRange().getValues();
    if (dataOth.length > 1) {
      for (var k = 1; k < dataOth.length; k++) {
        var idOth = String(dataOth[k][0] || '');
        var dest = String(dataOth[k][1] || '');
        var tsOth = String(dataOth[k][2] || '');
        var stOth = String(dataOth[k][3] || '');
        var detOth = String(dataOth[k][4] || '');
        if (idOth) {
          result.others.push({ id: idOth, destination: dest, timestamp: tsOth, status: stOth, details: detOth });
        }
      }
    }
  }

  // 4. Histórico / Movimentações
  var sheetMov = ss.getSheetByName("Historico");
  if (sheetMov) {
    var dataMov = sheetMov.getDataRange().getValues();
    if (dataMov.length > 1) {
      for (var m = 1; m < dataMov.length; m++) {
        var idMov = String(dataMov[m][0] || '');
        var matId = String(dataMov[m][1] || '');
        var type = String(dataMov[m][2] || '');
        var qty = Number(dataMov[m][3]) || 0;
        var tsMov = String(dataMov[m][4] || '');
        var reason = String(dataMov[m][5] || '');
        if (idMov) {
          result.movements.push({ id: idMov, materialId: matId, type: type, quantity: qty, timestamp: tsMov, reason: reason });
        }
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (contents.action === "sync") {
      // 1. Materiais
      if (contents.materials) {
        var sheetMat = ss.getSheetByName("Materiais") || ss.insertSheet("Materiais");
        sheetMat.clearContents();
        sheetMat.appendRow(["Código", "Descrição", "Estoque"]);
        var matRows = contents.materials.map(function(m) {
          return [String(m.code), String(m.name), Number(m.stock)];
        });
        if (matRows.length > 0) {
          sheetMat.getRange(2, 1, matRows.length, 3).setValues(matRows);
        }
      }

      // 2. Pedidos VTR
      if (contents.requests) {
        var sheetReq = ss.getSheetByName("Pedidos_VTR") || ss.insertSheet("Pedidos_VTR");
        sheetReq.clearContents();
        sheetReq.appendRow(["ID", "VTR", "Data/Hora", "Status", "Detalhes"]);
        var reqRows = contents.requests.map(function(r) {
          return [String(r.id), String(r.vtr), String(r.timestamp), String(r.status), String(r.details)];
        });
        if (reqRows.length > 0) {
          sheetReq.getRange(2, 1, reqRows.length, 5).setValues(reqRows);
        }
      }

      // 3. Pedidos Outros
      if (contents.others) {
        var sheetOth = ss.getSheetByName("Pedidos_Outros") || ss.insertSheet("Pedidos_Outros");
        sheetOth.clearContents();
        sheetOth.appendRow(["ID", "Destino", "Data/Hora", "Status", "Detalhes"]);
        var othRows = contents.others.map(function(o) {
          return [String(o.id), String(o.destination), String(o.timestamp), String(o.status), String(o.details)];
        });
        if (othRows.length > 0) {
          sheetOth.getRange(2, 1, othRows.length, 5).setValues(othRows);
        }
      }

      // 4. Movimentações
      if (contents.movements) {
        var sheetMov = ss.getSheetByName("Historico") || ss.insertSheet("Historico");
        sheetMov.clearContents();
        sheetMov.appendRow(["ID", "ID Material", "Tipo", "Quantidade", "Data/Hora", "Motivo"]);
        var movRows = contents.movements.map(function(m) {
          return [String(m.id), String(m.materialId), String(m.type), Number(m.quantity), String(m.timestamp), String(m.reason)];
        });
        if (movRows.length > 0) {
          sheetMov.getRange(2, 1, movRows.length, 6).setValues(movRows);
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

/**
 * Busca dados da planilha com timeout e proteção contra duplicidade
 */
export const fetchRemoteData = async (): Promise<{ 
  materials?: Material[], 
  requests?: MaterialRequest[],
  others?: MaterialRequest[],
  movements?: StockMovement[] 
} | null> => {
  const url = getGoogleSheetsUrl();
  if (!url) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort(new Error('Tempo limite de conexão excedido'));
    } catch (e) {
      controller.abort();
    }
  }, 20000);

  try {
    const response = await fetch(`${url}?t=${Date.now()}`, { 
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.warn('Resposta da planilha não é um JSON válido:', text.substring(0, 100));
      return null;
    }

    const result: { materials?: Material[], requests?: MaterialRequest[], others?: MaterialRequest[], movements?: StockMovement[] } = {};

    // 1. Materiais - Sincronização Total
    if (data.materials && Array.isArray(data.materials)) {
      const materialsMap = new Map<string, Material>();
      data.materials.forEach((m: any) => {
        const codeStr = String(m.code || '').trim();
        if (!codeStr || codeStr === 'undefined' || codeStr === 'null') return;
        materialsMap.set(codeStr, {
          id: codeStr,
          code: codeStr,
          name: String(m.name || 'Sem Descrição').trim(),
          stock: Math.max(0, Number(m.stock) || 0)
        });
      });
      result.materials = Array.from(materialsMap.values());
      if (result.materials.length > 0) {
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(result.materials));
      }
    }

    // 2. Solicitações (Viaturas)
    if (data.requests && Array.isArray(data.requests)) {
      result.requests = data.requests.map((r: any) => {
        let items: RequestedItem[] = [];
        try {
          if (r.details) {
            const detailsRaw = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
            items = Array.isArray(detailsRaw) ? detailsRaw : [];
          }
        } catch (e) {
          console.warn('Erro ao processar itens:', r.id);
        }
        return {
          id: String(r.id || `PED-${Date.now()}`),
          vtr: String(r.vtr || 'S/V'),
          timestamp: r.timestamp || new Date().toISOString(),
          status: (r.status || 'Pendente') as any,
          items: items
        };
      }).filter((r: any) => r.items.length > 0);
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(result.requests));
    }

    // 3. Outros (Pessoas, Departamentos, Empresas)
    if (data.others && Array.isArray(data.others)) {
      result.others = data.others.map((r: any) => {
        let items: RequestedItem[] = [];
        try {
          if (r.details) {
            const detailsRaw = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
            items = Array.isArray(detailsRaw) ? detailsRaw : [];
          }
        } catch (e) {
          console.warn('Erro ao processar itens outros:', r.id);
        }
        return {
          id: String(r.id || `OUT-${Date.now()}`),
          vtr: String(r.destination || r.vtr || 'S/D'),
          timestamp: r.timestamp || new Date().toISOString(),
          status: (r.status || 'Pendente') as any,
          items: items
        };
      }).filter((r: any) => r.items.length > 0);
      localStorage.setItem(STORAGE_KEYS.OTHERS, JSON.stringify(result.others));
    }

    // 4. Movimentações (Histórico)
    if (data.movements && Array.isArray(data.movements)) {
      result.movements = data.movements.map((m: any) => ({
        id: String(m.id),
        materialId: String(m.materialId),
        type: m.type as 'Entrada' | 'Saída',
        quantity: Number(m.quantity),
        timestamp: m.timestamp,
        reason: String(m.reason || '')
      }));
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(result.movements));
    }

    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
      console.warn('Busca de dados remotos cancelada ou atingiu o tempo limite (timeout de 20s).');
    } else {
      console.error('Erro ao buscar dados remotos:', error);
    }
    return null;
  }
};

export const initializeMaterials = (): Material[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.MATERIALS) || localStorage.getItem('lv_leste_materials');
  if (stored) {
    const parsed = JSON.parse(stored) as Material[];
    const map = new Map<string, Material>();
    parsed.forEach(m => { if(!map.has(m.code)) map.set(m.code, m); });
    return Array.from(map.values());
  }

  const materialsMap = new Map<string, Material>();
  RAW_STRING.split('\n').forEach((line) => {
    const parts = line.trim().split('\t');
    const code = parts[0]?.trim() || '';
    if (!code) return;

    if (!materialsMap.has(code)) {
      materialsMap.set(code, {
        id: code,
        code: code,
        name: parts.slice(1).join('\t')?.trim() || 'Material sem nome',
        stock: 0, 
      });
    }
  });

  return Array.from(materialsMap.values());
};

export const saveMaterials = (materials: Material[]) => localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
export const getRequests = (): MaterialRequest[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.REQUESTS) || localStorage.getItem('lv_leste_requests') || '[]');
export const saveRequests = (requests: MaterialRequest[]) => localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
export const getOthers = (): MaterialRequest[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.OTHERS) || localStorage.getItem('lv_leste_others') || '[]');
export const saveOthers = (others: MaterialRequest[]) => localStorage.setItem(STORAGE_KEYS.OTHERS, JSON.stringify(others));
export const getMovements = (): StockMovement[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.MOVEMENTS) || localStorage.getItem('lv_leste_movements') || '[]');
export const saveMovements = (movements: StockMovement[]) => localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));

export const exportToExcel = (data: any[], fileName: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const syncToGoogleSheets = async (data: { 
  materials: Material[], 
  requests: MaterialRequest[], 
  others: MaterialRequest[],
  movements: StockMovement[] 
}) => {
  const url = getGoogleSheetsUrl();
  if (!url) return false;

  try {
    const payload = {
      action: 'sync',
      materials: data.materials.map(m => ({ code: m.code, name: m.name, stock: m.stock })),
      requests: data.requests.map(r => ({ id: r.id, vtr: r.vtr, timestamp: r.timestamp, status: r.status, details: JSON.stringify(r.items) })),
      others: data.others.map(o => ({ id: o.id, destination: o.vtr, timestamp: o.timestamp, status: o.status, details: JSON.stringify(o.items) })),
      movements: data.movements.map(m => ({ id: m.id, materialId: m.materialId, type: m.type, quantity: m.quantity, timestamp: m.timestamp, reason: m.reason }))
    };

    // Usando text/plain para evitar problemas de preflight CORS com o Google Apps Script
    await fetch(url, { 
      method: 'POST', 
      mode: 'no-cors', 
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload) 
    });
    
    console.log('Sincronização enviada para a nuvem');
    return true;
  } catch (error) {
    console.error('Erro na sincronização:', error);
    return false;
  }
};
