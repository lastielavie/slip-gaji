/**
 * Slip Gaji Teknisi Generator — Pandora Stack
 * Pure Client-Side HTML + JS using SheetJS, jsPDF, and JSZip.
 */

(function () {
  'use strict';

  // --- State Variables ---
  let appState = {
    technicians: [],
    categories: [],
    potonganCols: [],
    periode: '',
    catatan: '',
    fileName: '',
    sheetUsed: '',
    selectedTeknisiIndex: 0,
    zipFormat: 'folder', // 'folder' | 'zip'
    availableSheets: [],
    rawWorkbook: null
  };

  // --- DOM Elements ---
  const dropzone = document.getElementById('dropzone');
  const excelFileInput = document.getElementById('excelFileInput');
  const fileInfoBox = document.getElementById('fileInfoBox');
  const displayFileName = document.getElementById('displayFileName');
  const displaySheetName = document.getElementById('displaySheetName');
  const sheetSelector = document.getElementById('sheetSelector');
  const btnLoadFolderFile = document.getElementById('btnLoadFolderFile');
  const displayTotalTeknisi = document.getElementById('displayTotalTeknisi');
  const dataStatusBadge = document.getElementById('dataStatusBadge');
  const btnResetFile = document.getElementById('btnResetFile');

  const mainContentArea = document.getElementById('mainContentArea');
  const periodeInput = document.getElementById('periodeInput');
  const catatanInput = document.getElementById('catatanInput');

  // Stats
  const statTeknisiCount = document.getElementById('statTeknisiCount');
  const statCabangCount = document.getElementById('statCabangCount');
  const statBrutoTotal = document.getElementById('statBrutoTotal');
  const statPotonganTotal = document.getElementById('statPotonganTotal');
  const statNettTotal = document.getElementById('statNettTotal');

  // Adjuster
  const teknisiSelect = document.getElementById('teknisiSelect');
  const activeTeknisiName = document.getElementById('activeTeknisiName');
  const activeTeknisiCabang = document.getElementById('activeTeknisiCabang');
  const activeBrutoVal = document.getElementById('activeBrutoVal');
  const activePotVal = document.getElementById('activePotVal');
  const activeNettVal = document.getElementById('activeNettVal');
  const kualifikasiTableBody = document.getElementById('kualifikasiTableBody');
  const potonganTableBody = document.getElementById('potonganTableBody');
  const btnPreviewSelected = document.getElementById('btnPreviewSelected');
  const btnDownloadSelected = document.getElementById('btnDownloadSelected');

  // Summary Table
  const tableSearchInput = document.getElementById('tableSearchInput');
  const summaryTableBody = document.getElementById('summaryTableBody');
  const batchCountLabel = document.getElementById('batchCountLabel');
  const btnDownloadZip = document.getElementById('btnDownloadZip');

  // Modal Preview
  const previewModal = document.getElementById('previewModal');
  const previewModalTitle = document.getElementById('previewModalTitle');
  const previewModalSubtitle = document.getElementById('previewModalSubtitle');
  const slipPaper = document.getElementById('slipPaper');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnDownloadFromModal = document.getElementById('btnDownloadFromModal');
  let currentPreviewTeknisi = null;

  // Progress Overlay
  const progressOverlay = document.getElementById('progressOverlay');
  const progressTitle = document.getElementById('progressTitle');
  const progressDesc = document.getElementById('progressDesc');
  const progressBar = document.getElementById('progressBar');

  // --- Helper Functions ---
  function rupiah(v) {
    if (v === null || v === undefined || isNaN(v)) {
      v = 0.0;
    }
    v = parseFloat(v);
    const absStr = Math.round(Math.abs(v)).toLocaleString('id-ID');
    return v < 0 ? `Rp (${absStr})` : `Rp ${absStr}`;
  }

  function safeFileName(teks, cadangan = 'TANPA-NAMA') {
    const aman = String(teks || '').replace(/[^A-Za-z0-9 _.-]/g, '-').replace(/^[ .-]|[ .-]$/g, '').trim();
    return (aman.substring(0, 80) || cadangan);
  }

  // --- Dynamic Column Categorization ---
  function getDynamicCategories(columns) {
    const EXCLUDE_OMZET = new Set(['total', 'jasa (total)', 'jasa', '(total)', 'keseluruhan']);
    const EXCLUDE_BH = new Set(['(aturan)', 'aturan', 'total', 'nett', 'net', '(total)', 'keseluruhan']);

    function getBaseCategoryName(cat) {
      return cat.replace(/\s*\((lama|baru|old|new|proporsional|flat|tarif.*)\)/i, '').trim();
    }

    const omzetCols = [];
    const bhCols = [];

    columns.forEach(col => {
      const cStrip = String(col).trim();
      const cLow = cStrip.toLowerCase();

      if (cLow.startsWith('omzet ')) {
        const cat = cStrip.substring(6).trim();
        if (!EXCLUDE_OMZET.has(cat.toLowerCase())) {
          omzetCols.push({ original: cStrip, cat: cat });
        }
      } else if (cLow.startsWith('bagi hasil ')) {
        const cat = cStrip.substring(11).trim();
        if (!EXCLUDE_BH.has(cat.toLowerCase())) {
          bhCols.push({ original: cStrip, cat: cat });
        }
      }
    });

    const categoryMap = new Map();

    // Check if any omzet columns have (Lama) and (Baru) variants
    const splitBases = new Set();
    omzetCols.forEach(o => {
      if (/\((lama|baru|old|new)\)/i.test(o.cat)) {
        splitBases.add(getBaseCategoryName(o.cat).toLowerCase());
      }
    });

    // 1. Process Omzet columns
    omzetCols.forEach(o => {
      const base = getBaseCategoryName(o.cat);
      const isSplit = splitBases.has(base.toLowerCase()) && /\((lama|baru|old|new)\)/i.test(o.cat);

      if (isSplit) {
        // Keep as separate category: e.g. "Mati Total (Lama)" or "Mati Total (Baru)"
        const isLama = /\((lama|old)\)/i.test(o.cat);
        const matchingBhCol = bhCols.find(b => b.cat.toLowerCase() === o.cat.toLowerCase())?.original ||
                              bhCols.find(b => getBaseCategoryName(b.cat).toLowerCase() === base.toLowerCase())?.original || null;

        categoryMap.set(o.cat, {
          name: o.cat,
          omzetCols: [o.original],
          bhCols: matchingBhCol ? [matchingBhCol] : [],
          isSplit: true,
          variant: isLama ? 'lama' : 'baru',
          baseCategory: base,
          defaultRate: isLama ? 0.32 : 0.35
        });
      } else {
        // Direct matching with Bagi Hasil
        const matchingBhCol = bhCols.find(b => b.cat.toLowerCase() === o.cat.toLowerCase())?.original;
        categoryMap.set(o.cat, {
          name: o.cat,
          omzetCols: [o.original],
          bhCols: matchingBhCol ? [matchingBhCol] : []
        });
      }
    });

    // 2. Associate or add remaining Bagi Hasil columns
    bhCols.forEach(b => {
      const base = getBaseCategoryName(b.cat);
      if (splitBases.has(base.toLowerCase())) {
        // Shared BH for split variants is already referenced by matchingBhCol
        return;
      }

      if (categoryMap.has(b.cat)) {
        if (!categoryMap.get(b.cat).bhCols.includes(b.original)) {
          categoryMap.get(b.cat).bhCols.push(b.original);
        }
      } else {
        categoryMap.set(b.cat, {
          name: b.cat,
          omzetCols: [],
          bhCols: [b.original]
        });
      }
    });

    return Array.from(categoryMap.values());
  }

  function getDynamicPotonganCols(columns, categories) {
    const knownSummary = new Set([
      'nama teknisi', 'teknisi', 'nama', 'cabang', 'lokasi kerja', 'baris', 'no', 'nik', 'jabatan',
      'bank', 'rekening', 'atas nama', 'data rekening', 'status karyawan', 'informasi',
      'total laba kotor jasa service hp', 'penerimaan bagi hasil', 'pendapatan lain-lain',
      'total pendapatan', 'bagi hasil nett',
      'omzet jasa (total)', 'omzet total', 'omzet jasa',
      'bagi hasil (aturan)', 'bagi hasil total', 'bagi_hasil',
      'total bagi hasil (aturan)', 'total bagi hasil',
      'pembanding 30%', 'selisih', 'efektif %',
      'total potongan', 'total_potongan',
      'gaji teknisi', 'gaji_teknisi',
      'nett bagi hasil', 'nett_bagi_hasil', 'nett',
      'cadangan 7 tahun / bulan', 'cadangan 7 tahun', 'total cadangan 7 tahun'
    ]);

    const catColsLower = new Set();
    categories.forEach(cat => {
      catColsLower.add(`omzet ${cat.name}`.toLowerCase());
      catColsLower.add(`bagi hasil ${cat.name}`.toLowerCase());
      if (cat.omzetCols) {
        cat.omzetCols.forEach(col => catColsLower.add(String(col).toLowerCase()));
      }
      if (cat.bhCols) {
        cat.bhCols.forEach(col => catColsLower.add(String(col).toLowerCase()));
      }
    });

    const potCols = [];
    columns.forEach(col => {
      const cStr = String(col).trim();
      const cLow = cStr.toLowerCase();

      if (!cStr || knownSummary.has(cLow) || catColsLower.has(cLow)) return;
      if (cLow.startsWith('unnamed:') || cLow.startsWith('pembanding ')) return;
      if (cLow.includes('tabungan')) return; // ignore savings columns

      potCols.push(cStr);
    });

    return potCols;
  }

  // --- Cross-reference Bank / Payment Metadata from FINAL Sheet ---
  function extractBankInfoFromFinalSheet(workbook) {
    const bankInfoMap = {};
    let finalSheetName = null;
    for (const name of workbook.SheetNames) {
      if (name.toUpperCase().includes('FINAL')) {
        finalSheetName = name;
        break;
      }
    }
    if (!finalSheetName) return bankInfoMap;

    const worksheet = workbook.Sheets[finalSheetName];
    if (!worksheet) return bankInfoMap;

    const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    let headerRowIdx = -1;

    for (let i = 0; i < Math.min(15, rawJson.length); i++) {
      const row = rawJson[i];
      const hasNama = row.some(v => String(v).toUpperCase() === 'NAMA' || String(v).toUpperCase() === 'NAMA TEKNISI');
      const hasBank = row.some(v => String(v).toUpperCase().includes('BANK') || String(v).toUpperCase().includes('REKENING'));
      if (hasNama && hasBank) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) return bankInfoMap;

    const rows = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIdx, defval: '' });
    rows.forEach(r => {
      let rawName = String(r['NAMA'] || r['NAMA TEKNISI'] || r['TEKNISI'] || '').trim();
      if (!rawName) return;
      const key = rawName.toUpperCase();
      const bank = String(r['BANK'] || '').trim();
      const rekening = String(r['DATA REKENING'] || r['REKENING'] || '').trim();
      const status = String(r['STATUS KARYAWAN'] || '').trim();
      const nik = String(r['NIK'] || '').trim();

      bankInfoMap[key] = { bank, rekening, status, nik };
    });

    return bankInfoMap;
  }

  // --- Parse Sheet RAW (Detailed Qualification Breakdown) ---
  function parseRawSheet(worksheet, sheetName, fileName, workbook, bankInfoMap = {}) {
    const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rawJson || rawJson.length === 0) {
      throw new Error(`Sheet '${sheetName}' tidak memiliki data.`);
    }

    // Detect period string and header row
    let autoPeriode = '';
    let headerRowIdx = 0;

    for (let i = 0; i < Math.min(10, rawJson.length); i++) {
      const row = rawJson[i];
      const rowText = row.map(v => String(v).trim()).join(' ');

      if (rowText.includes('Periode:') && !autoPeriode) {
        const parts = rowText.split('Periode:');
        if (parts.length > 1) {
          autoPeriode = parts[1].split(/[\u00B7\u2022|•\t\n]|Tarif:/i)[0].trim();
        }
      }

      if (row.some(v => String(v).toUpperCase().includes('NAMA TEKNISI') || String(v).toUpperCase() === 'TEKNISI')) {
        headerRowIdx = i;
        break;
      }
    }

    // Convert with detected header row
    const rows = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIdx, defval: 0 });
    if (!rows || rows.length === 0) {
      throw new Error('Tidak ditemukan data teknisi setelah baris header.');
    }

    // Normalize column names
    const columns = Object.keys(rows[0] || {}).map(c => String(c).trim());
    const categories = getDynamicCategories(columns);
    const potCols = getDynamicPotonganCols(columns, categories);

    // Build map: column header name -> Excel column letter (e.g. 'Bagi Hasil Mati Total' -> 'O')
    // Used to read cell formulas for dynamic % multiplier extraction
    const colLetterMap = new Map();
    const rawHeaderRow = rawJson[headerRowIdx] || [];
    rawHeaderRow.forEach((cellVal, colIdx) => {
      const name = String(cellVal || '').trim();
      if (name) colLetterMap.set(name, XLSX.utils.encode_col(colIdx));
    });

    /**
     * Read the Excel formula of the BH (shared) cell for a given row and extract
     * the per-column multipliers. Handles both dot (0.375) and comma (0,375) decimal.
     * Returns e.g. { F: 0.375, G: 0.405 } or null if formula not found/parseable.
     */
    function parseSplitRates(bhColName, sheetRowNum) {
      const bhColLetter = colLetterMap.get(bhColName);
      if (!bhColLetter) return null;
      const cell = worksheet[bhColLetter + sheetRowNum];
      if (!cell || !cell.f) return null;
      // Normalize European comma decimal: "0,375" -> "0.375"
      const formula = cell.f.replace(/(\d),(\d)/g, '$1.$2');
      // Match patterns like (F5*0.375) or (F5 * 0.375)
      const matches = [...formula.matchAll(/\(([A-Z]+)\d+\s*\*\s*([0-9.]+)\)/gi)];
      if (!matches.length) return null;
      const rates = {};
      matches.forEach(m => { rates[m[1].toUpperCase()] = parseFloat(m[2]); });
      return rates;
    }

    // Identify key column names
    let colTeknisi = 'TEKNISI';
    let colCabang = 'CABANG';
    let colBruto = null;
    let colTotalPot = null;
    let colNett = null;
    let colGajiTeknisi = null;
    let colCadanganBulan = null;
    let colCadanganTotal = null;
    let colOmzetTotal = null;

    columns.forEach(c => {
      const cu = c.toUpperCase();
      if (cu === 'NAMA TEKNISI' || cu === 'TEKNISI') colTeknisi = c;
      else if (cu === 'CABANG') colCabang = c;
      else if (cu === 'BAGI HASIL (ATURAN)' || cu === 'BAGI HASIL' || cu === 'BAGI_HASIL' || cu === 'BRUTO') colBruto = c;
      else if (cu === 'TOTAL POTONGAN' || cu === 'TOTAL_POTONGAN') colTotalPot = c;
      else if (cu === 'NETT BAGI HASIL' || cu === 'NETT' || cu === 'BAGI HASIL NETT') colNett = c;
      else if (c.toLowerCase() === 'gaji teknisi' || c.toLowerCase() === 'pendapatan lain-lain') colGajiTeknisi = c;
      else if (c.toLowerCase() === 'cadangan 7 tahun / bulan') colCadanganBulan = c;
      else if (c.toLowerCase() === 'total cadangan 7 tahun') colCadanganTotal = c;
      else if (c.toLowerCase() === 'omzet jasa (total)' || c.toLowerCase() === 'omzet total') colOmzetTotal = c;
    });

    const technicians = [];
    const invalidTeknisiNames = new Set(['TOTAL', 'NAN', 'NONE', '', 'UNNAMED: 0', 'TIDAK ADA TEKNISI']);

    rows.forEach((row, rowIndex) => {
      // sheetRowNum: 1-based Excel row number for this data row
      // headerRowIdx is 0-based; header row = Excel row (headerRowIdx+1); first data = Excel row (headerRowIdx+2)
      const sheetRowNum = headerRowIdx + 2 + rowIndex;
      const rawName = String(row[colTeknisi] || '').trim();
      if (!rawName || invalidTeknisiNames.has(rawName.toUpperCase())) {
        return;
      }

      const cabang = String(row[colCabang] || '-').trim();
      const totalOmzetJasa = colOmzetTotal ? (parseFloat(row[colOmzetTotal]) || 0.0) : 0.0;

      // Extract categories
      const kualifikasi = [];
      const processedBases = new Set();

      categories.forEach(catDef => {
        if (catDef.isSplit) {
          const baseKey = catDef.baseCategory.toLowerCase();
          if (processedBases.has(baseKey)) return;
          processedBases.add(baseKey);

          // Find Lama and Baru definitions for this base category
          const variants = categories.filter(c => c.isSplit && c.baseCategory.toLowerCase() === baseKey);
          const lamaDef = variants.find(v => v.variant === 'lama');
          const baruDef = variants.find(v => v.variant === 'baru');

          const omzetLama = lamaDef ? (parseFloat(row[lamaDef.omzetCols[0]]) || 0.0) : 0.0;
          const omzetBaru = baruDef ? (parseFloat(row[baruDef.omzetCols[0]]) || 0.0) : 0.0;

          let bhLama = 0.0;
          let bhBaru = 0.0;
          let akadLama = 0.0;
          let akadBaru = 0.0;

          // Shared Bagi Hasil column (e.g. 'Bagi Hasil Mati Total')
          const sharedBhCol = lamaDef?.bhCols[0] || baruDef?.bhCols[0];
          const totalBh = sharedBhCol ? (parseFloat(row[sharedBhCol]) || 0.0) : 0.0;

          // Try to read actual % multipliers from the Excel cell formula first
          const formulaRates = sharedBhCol ? parseSplitRates(sharedBhCol, sheetRowNum) : null;
          const lamaColLetter = lamaDef ? colLetterMap.get(lamaDef.omzetCols[0]) : null;
          const baruColLetter = baruDef ? colLetterMap.get(baruDef.omzetCols[0]) : null;

          if (formulaRates && (lamaColLetter || baruColLetter)) {
            // Use exact rates parsed from the Excel formula — most accurate
            akadLama = lamaColLetter && formulaRates[lamaColLetter] !== undefined ? formulaRates[lamaColLetter] : 0.0;
            akadBaru = baruColLetter && formulaRates[baruColLetter] !== undefined ? formulaRates[baruColLetter] : 0.0;
            bhLama = omzetLama * akadLama;
            bhBaru = omzetBaru * akadBaru;
          } else {
            // Fallback: split totalBh proportionally by omzet weight when formula not available
            const totalOmzetSplit = omzetLama + omzetBaru;
            if (totalOmzetSplit > 0) {
              bhLama = omzetLama > 0 ? totalBh * (omzetLama / totalOmzetSplit) : 0.0;
              bhBaru = totalBh - bhLama;
              akadLama = omzetLama > 0 ? (bhLama / omzetLama) : 0.0;
              akadBaru = omzetBaru > 0 ? (bhBaru / omzetBaru) : 0.0;
            } else {
              // No omzet data at all
              bhLama = 0.0; bhBaru = totalBh;
              akadLama = 0.0; akadBaru = 0.0;
            }
          }

          if (lamaDef && (omzetLama > 0 || bhLama !== 0)) {
            kualifikasi.push({
              cat: lamaDef.name,
              omzet: omzetLama,
              akadPct: akadLama,
              bh: bhLama
            });
          }

          if (baruDef && (omzetBaru > 0 || bhBaru !== 0)) {
            kualifikasi.push({
              cat: baruDef.name,
              omzet: omzetBaru,
              akadPct: akadBaru,
              bh: bhBaru
            });
          }
        } else {
          // Regular category
          let omzet = 0.0;
          catDef.omzetCols.forEach(col => {
            omzet += (parseFloat(row[col]) || 0.0);
          });

          let bh = 0.0;
          catDef.bhCols.forEach(col => {
            bh += (parseFloat(row[col]) || 0.0);
          });

          if (omzet > 0 || bh !== 0) {
            let akadPct = 0.0;
            if (omzet > 0) {
              akadPct = bh / omzet;
            } else if (catDef.name.toLowerCase().includes('persaudaraan') && totalOmzetJasa > 0) {
              akadPct = bh / totalOmzetJasa;
            }

            kualifikasi.push({
              cat: catDef.name,
              omzet: omzet,
              akadPct: akadPct,
              bh: bh
            });
          }
        }
      });

      // Topup gaji / Pendapatan lain-lain
      let topupGaji = 0.0;
      if (colGajiTeknisi && row[colGajiTeknisi]) {
        topupGaji = parseFloat(row[colGajiTeknisi]) || 0.0;
        if (topupGaji !== 0) {
          kualifikasi.push({
            cat: 'Topup Gaji',
            omzet: 0.0,
            akadPct: 0.0,
            bh: topupGaji
          });
        }
      }

      // Bruto calculation: sum of all bh items
      let bruto = kualifikasi.reduce((sum, item) => sum + item.bh, 0);
      if (!bruto && colBruto && row[colBruto] !== undefined && row[colBruto] !== '') {
        bruto = parseFloat(row[colBruto]) || 0.0;
        if (topupGaji !== 0 && !colBruto.toLowerCase().includes('total')) {
          bruto += topupGaji;
        }
      }

      // Potongan
      const potongan = [];
      potCols.forEach(pCol => {
        const pVal = parseFloat(row[pCol]) || 0.0;
        potongan.push({
          label: pCol,
          val: pVal
        });
      });

      let totalPot = 0.0;
      if (colTotalPot && row[colTotalPot] !== undefined && row[colTotalPot] !== '') {
        totalPot = parseFloat(row[colTotalPot]) || 0.0;
      }
      if (!totalPot && potongan.length > 0) {
        totalPot = potongan.reduce((sum, item) => sum + item.val, 0);
      }

      const nett = bruto - totalPot;

      // Cadangan 7 Tahun
      const cadanganBulan = colCadanganBulan ? (parseFloat(row[colCadanganBulan]) || 0.0) : 0.0;
      const cadanganTotal = colCadanganTotal ? (parseFloat(row[colCadanganTotal]) || 0.0) : 0.0;

      // Bank metadata lookup from FINAL sheet cross-reference
      const bankInfo = bankInfoMap[rawName.toUpperCase()] ||
        Object.entries(bankInfoMap).find(([k]) => rawName.toUpperCase().includes(k) || k.includes(rawName.toUpperCase()))?.[1] || {};

      technicians.push({
        nama: rawName,
        cabang: cabang,
        bank: bankInfo.bank || '',
        rekening: bankInfo.rekening || '',
        status: bankInfo.status || 'MITRA',
        nik: bankInfo.nik || '',
        categories: kualifikasi,
        topupGaji: topupGaji,
        bruto: bruto,
        potongan: potongan,
        totalPotongan: totalPot,
        nett: nett,
        cadanganBulan: cadanganBulan,
        cadanganTotal: cadanganTotal,
        rawRow: row
      });
    });

    return {
      technicians,
      categories: categories.map(c => c.name),
      potCols,
      autoPeriode,
      sheetUsed: sheetName
    };
  }

  // --- Parse Sheet FINAL (Payroll Summary View) ---
  function parseFinalSheet(worksheet, sheetName, fileName, workbook) {
    const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rawJson || rawJson.length === 0) {
      throw new Error(`Sheet '${sheetName}' tidak memiliki data.`);
    }

    let autoPeriode = '';
    let headerRowIdx = -1;

    for (let i = 0; i < Math.min(15, rawJson.length); i++) {
      const row = rawJson[i];
      const rowText = row.map(v => String(v).trim()).join(' ');

      if (!autoPeriode) {
        const monthMatch = rowText.match(/(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+\d{4}/i);
        if (monthMatch) {
          autoPeriode = monthMatch[0];
        } else if (rowText.includes('Periode:')) {
          autoPeriode = rowText.split('Periode:')[1].split(/[\u00B7\u2022|•\t\n]|Tarif:/i)[0].trim();
        }
      }

      if (row.some(v => String(v).toUpperCase() === 'NAMA') &&
          row.some(v => String(v).toUpperCase().includes('TOTAL') || String(v).toUpperCase().includes('BAGI HASIL') || String(v).toUpperCase().includes('POTONGAN'))) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      throw new Error(`Header tidak dapat dideteksi pada sheet '${sheetName}'.`);
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIdx, defval: 0 });
    const columns = Object.keys(rows[0] || {}).map(c => String(c).trim());

    let colNama = 'NAMA';
    let colCabang = 'LOKASI KERJA';
    let colStatus = 'STATUS KARYAWAN';
    let colBank = 'BANK';
    let colRekening = 'DATA REKENING';
    let colOmzetService = null;
    let colBhService = null;
    let colLainLain = null;
    let colBruto = null;
    let colTotalPot = null;
    let colNett = null;

    columns.forEach(c => {
      const cu = c.toUpperCase();
      if (cu === 'NAMA' || cu === 'NAMA TEKNISI' || cu === 'TEKNISI') colNama = c;
      else if (cu === 'LOKASI KERJA' || cu === 'CABANG') colCabang = c;
      else if (cu === 'STATUS KARYAWAN' || cu === 'STATUS') colStatus = c;
      else if (cu === 'BANK') colBank = c;
      else if (cu === 'DATA REKENING' || cu === 'REKENING') colRekening = c;
      else if (cu.includes('TOTAL LABA KOTOR') || cu.includes('OMZET')) colOmzetService = c;
      else if (cu.includes('PENERIMAAN BAGI HASIL') || cu === 'BAGI HASIL') colBhService = c;
      else if (cu.includes('PENDAPATAN LAIN') || cu === 'GAJI TEKNISI') colLainLain = c;
      else if (cu === 'TOTAL PENDAPATAN' || cu === 'TOTAL BAGI HASIL' || cu === 'BRUTO') colBruto = c;
      else if (cu === 'TOTAL POTONGAN') colTotalPot = c;
      else if (cu === 'BAGI HASIL NETT' || cu === 'NETT BAGI HASIL' || cu === 'NETT') colNett = c;
    });

    const knownNonPot = new Set([
      'no', 'nik', 'nama', 'jabatan', 'lokasi kerja', 'bank', 'rekening', 'atas nama',
      'data rekening', 'status karyawan', 'informasi',
      'total laba kotor jasa service hp', 'penerimaan bagi hasil', 'pendapatan lain-lain',
      'total pendapatan', 'total potongan', 'bagi hasil nett'
    ]);

    const potCols = [];
    columns.forEach(col => {
      const cStr = String(col).trim();
      const cLow = cStr.toLowerCase();
      if (!cStr || knownNonPot.has(cLow) || cLow.startsWith('unnamed:')) return;
      potCols.push(cStr);
    });

    const technicians = [];
    const invalidNames = new Set([
      'TOTAL', 'NAN', 'NONE', '', 'UNNAMED: 0', 'TIDAK ADA TEKNISI',
      'PREPARED BY', 'APPROVED BY', 'DENI DARMAWAN', 'OWNER MADINAH GROUP',
      'CORCOMM', 'FINANCE & ACC MANAGER', 'HR MANAGER'
    ]);

    rows.forEach(row => {
      const rawName = String(row[colNama] || '').trim();
      if (!rawName || invalidNames.has(rawName.toUpperCase())) return;

      const cabang = String(row[colCabang] || '-').trim();
      const status = String(row[colStatus] || 'MITRA').trim();
      const bank = String(row[colBank] || '').trim();
      const rekening = String(row[colRekening] || '').trim();

      const omzet = colOmzetService ? (parseFloat(row[colOmzetService]) || 0.0) : 0.0;
      const bh = colBhService ? (parseFloat(row[colBhService]) || 0.0) : 0.0;
      const akadPct = omzet > 0 ? (bh / omzet) : 0.0;

      const kualifikasi = [
        {
          cat: 'Jasa Service HP',
          omzet: omzet,
          akadPct: akadPct,
          bh: bh
        }
      ];

      const lainVal = colLainLain ? (parseFloat(row[colLainLain]) || 0.0) : 0.0;
      if (lainVal !== 0) {
        kualifikasi.push({
          cat: 'Pendapatan Lain-lain',
          omzet: 0.0,
          akadPct: 0.0,
          bh: lainVal
        });
      }

      let bruto = kualifikasi.reduce((sum, item) => sum + item.bh, 0);
      if (!bruto && colBruto && row[colBruto] !== undefined) {
        bruto = parseFloat(row[colBruto]) || 0.0;
      }

      const potongan = [];
      potCols.forEach(pCol => {
        const pVal = parseFloat(row[pCol]) || 0.0;
        potongan.push({
          label: pCol,
          val: pVal
        });
      });

      let totalPot = 0.0;
      if (colTotalPot && row[colTotalPot] !== undefined) {
        totalPot = parseFloat(row[colTotalPot]) || 0.0;
      }
      if (!totalPot && potongan.length > 0) {
        totalPot = potongan.reduce((sum, item) => sum + item.val, 0);
      }

      const nett = bruto - totalPot;

      technicians.push({
        nama: rawName,
        cabang: cabang,
        bank: bank,
        rekening: rekening,
        status: status,
        nik: String(row['NIK'] || '').trim(),
        categories: kualifikasi,
        topupGaji: lainVal,
        bruto: bruto,
        potongan: potongan,
        totalPotongan: totalPot,
        nett: nett,
        cadanganBulan: 0.0,
        cadanganTotal: 0.0,
        rawRow: row
      });
    });

    return {
      technicians,
      categories: ['Jasa Service HP'],
      potCols,
      autoPeriode,
      sheetUsed: sheetName
    };
  }

  // --- Unified Workbook Parser ---
  function parseExcelData(dataBuffer, fileName, preferredSheetName = null) {
    let workbook = appState.rawWorkbook;
    if (dataBuffer) {
      workbook = XLSX.read(dataBuffer, { type: 'array' });
      appState.rawWorkbook = workbook;
    }

    if (!workbook) {
      throw new Error('Berkas Excel tidak valid.');
    }

    // Detect candidate sheets (prefer sheets with actual payroll/summary content)
    const candidateSheets = [];
    workbook.SheetNames.forEach(name => {
      const nu = name.toUpperCase();
      if (nu.includes('RAW') || nu.includes('FINAL') || nu.includes('BAGI HASIL') || nu.includes('SLIP')) {
        candidateSheets.push(name);
      }
    });

    if (candidateSheets.length === 0) {
      candidateSheets.push(workbook.SheetNames[0]);
    }
    appState.availableSheets = candidateSheets;

    // Determine target sheet
    let sheetName = preferredSheetName;
    if (!sheetName || !workbook.SheetNames.includes(sheetName)) {
      sheetName = candidateSheets.find(s => s.toUpperCase().includes('RAW')) ||
                  candidateSheets.find(s => s.toUpperCase().includes('FINAL')) ||
                  candidateSheets[0];
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error(`Sheet '${sheetName}' tidak ditemukan dalam workbook.`);
    }

    // Check if FINAL format or RAW format
    const isFinal = sheetName.toUpperCase().includes('FINAL');
    if (isFinal) {
      return parseFinalSheet(worksheet, sheetName, fileName, workbook);
    } else {
      const bankInfoMap = extractBankInfoFromFinalSheet(workbook);
      return parseRawSheet(worksheet, sheetName, fileName, workbook, bankInfoMap);
    }
  }

  // --- UI Update Functions ---
  function updateAllViews() {
    updateStatsRibbon();
    populateTeknisiDropdown();
    updateActiveAdjuster();
    renderSummaryTable();
    batchCountLabel.textContent = `${appState.technicians.length} slip PDF siap di-generate`;
  }

  function updateStatsRibbon() {
    const count = appState.technicians.length;
    const cabangSet = new Set(appState.technicians.map(t => t.cabang));
    const totalBruto = appState.technicians.reduce((s, t) => s + t.bruto, 0);
    const totalPotongan = appState.technicians.reduce((s, t) => s + t.totalPotongan, 0);
    const totalNett = appState.technicians.reduce((s, t) => s + t.nett, 0);

    statTeknisiCount.textContent = count;
    statCabangCount.textContent = cabangSet.size;
    statBrutoTotal.textContent = rupiah(totalBruto);
    statPotonganTotal.textContent = rupiah(totalPotongan);
    statNettTotal.textContent = rupiah(totalNett);
  }

  function populateTeknisiDropdown() {
    teknisiSelect.innerHTML = '';
    appState.technicians.forEach((t, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${t.nama} (${t.cabang})`;
      if (idx === appState.selectedTeknisiIndex) {
        opt.selected = true;
      }
      teknisiSelect.appendChild(opt);
    });
  }

  function updateActiveAdjuster() {
    if (appState.technicians.length === 0) return;
    const tek = appState.technicians[appState.selectedTeknisiIndex];
    if (!tek) return;

    activeTeknisiName.textContent = tek.nama;
    activeTeknisiCabang.textContent = tek.cabang;
    activeBrutoVal.textContent = rupiah(tek.bruto);
    activePotVal.textContent = rupiah(tek.totalPotongan);
    activeNettVal.textContent = rupiah(tek.nett);

    // Render Kualifikasi Table
    kualifikasiTableBody.innerHTML = '';
    if (tek.categories.length === 0) {
      kualifikasiTableBody.innerHTML = `<tr><td colspan="4" class="text-muted" style="text-align:center; padding:18px;">Tidak ada rincian kualifikasi.</td></tr>`;
    } else {
      tek.categories.forEach((k, catIdx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${k.cat}</strong></td>
          <td class="col-num">
            <input type="number" step="1000" class="edit-input-num input-omzet" data-cat-idx="${catIdx}" value="${k.omzet}">
          </td>
          <td class="col-num">
            <span class="acad-badge" id="akadLabel_${catIdx}">${k.akadPct > 0 ? `${(k.akadPct * 100).toFixed(1).replace('.', ',')}%` : '-'}</span>
          </td>
          <td class="col-num">
            <input type="number" step="1000" class="edit-input-num input-bh" data-cat-idx="${catIdx}" value="${k.bh}">
          </td>
        `;
        kualifikasiTableBody.appendChild(tr);
      });
    }

    // Render Potongan Table
    potonganTableBody.innerHTML = '';
    if (tek.potongan.length === 0) {
      potonganTableBody.innerHTML = `<tr><td colspan="2" class="text-muted" style="text-align:center; padding:18px;">Tidak ada jenis potongan.</td></tr>`;
    } else {
      tek.potongan.forEach((p, potIdx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.label}</td>
          <td class="col-num">
            <input type="number" step="1000" class="edit-input-num input-pot" data-pot-idx="${potIdx}" value="${p.val}">
          </td>
        `;
        potonganTableBody.appendChild(tr);
      });
    }

    attachAdjusterInputEvents(tek);
  }

  function attachAdjusterInputEvents(tek) {
    // Omzet changes
    kualifikasiTableBody.querySelectorAll('.input-omzet').forEach(input => {
      input.addEventListener('input', (e) => {
        const catIdx = parseInt(e.target.dataset.catIdx, 10);
        const newOmzet = parseFloat(e.target.value) || 0.0;
        tek.categories[catIdx].omzet = newOmzet;

        // Auto update akad %
        const bh = tek.categories[catIdx].bh;
        tek.categories[catIdx].akadPct = newOmzet > 0 ? (bh / newOmzet) : 0.0;
        const akadSpan = document.getElementById(`akadLabel_${catIdx}`);
        if (akadSpan) {
          akadSpan.textContent = tek.categories[catIdx].akadPct > 0 ? `${(tek.categories[catIdx].akadPct * 100).toFixed(1).replace('.', ',')}%` : '-';
        }

        recalculateTeknisi(tek);
      });
    });

    // Bagi Hasil changes
    kualifikasiTableBody.querySelectorAll('.input-bh').forEach(input => {
      input.addEventListener('input', (e) => {
        const catIdx = parseInt(e.target.dataset.catIdx, 10);
        const newBh = parseFloat(e.target.value) || 0.0;
        tek.categories[catIdx].bh = newBh;

        // Auto update akad %
        const omzet = tek.categories[catIdx].omzet;
        tek.categories[catIdx].akadPct = omzet > 0 ? (newBh / omzet) : 0.0;
        const akadSpan = document.getElementById(`akadLabel_${catIdx}`);
        if (akadSpan) {
          akadSpan.textContent = tek.categories[catIdx].akadPct > 0 ? `${(tek.categories[catIdx].akadPct * 100).toFixed(1).replace('.', ',')}%` : '-';
        }

        recalculateTeknisi(tek);
      });
    });

    // Potongan changes
    potonganTableBody.querySelectorAll('.input-pot').forEach(input => {
      input.addEventListener('input', (e) => {
        const potIdx = parseInt(e.target.dataset.potIdx, 10);
        const newVal = parseFloat(e.target.value) || 0.0;
        tek.potongan[potIdx].val = newVal;

        recalculateTeknisi(tek);
      });
    });
  }

  function recalculateTeknisi(tek) {
    // Bruto = sum of all bh
    tek.bruto = tek.categories.reduce((sum, item) => sum + item.bh, 0);

    // Total Potongan = sum of all potongan
    tek.totalPotongan = tek.potongan.reduce((sum, item) => sum + item.val, 0);

    // Nett = bruto - totalPotongan
    tek.nett = tek.bruto - tek.totalPotongan;

    // Update active bar
    activeBrutoVal.textContent = rupiah(tek.bruto);
    activePotVal.textContent = rupiah(tek.totalPotongan);
    activeNettVal.textContent = rupiah(tek.nett);

    // Update global stats
    updateStatsRibbon();

    // Update table row
    updateSummaryTableRow(tek);
  }

  function renderSummaryTable() {
    summaryTableBody.innerHTML = '';
    const query = (tableSearchInput.value || '').toLowerCase().trim();

    appState.technicians.forEach((t, idx) => {
      if (query && !t.nama.toLowerCase().includes(query) && !t.cabang.toLowerCase().includes(query)) {
        return;
      }

      const tr = document.createElement('tr');
      tr.id = `summaryRow_${idx}`;
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><strong>${t.nama}</strong></td>
        <td><span class="active-cabang">${t.cabang}</span></td>
        <td class="col-num">${rupiah(t.bruto)}</td>
        <td class="col-num text-danger">${rupiah(t.totalPotongan)}</td>
        <td class="col-num text-success"><strong>${rupiah(t.nett)}</strong></td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn-icon btn-row-edit" data-idx="${idx}" title="Sesuaikan Data" aria-label="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
            <button type="button" class="btn-icon btn-row-preview" data-idx="${idx}" title="Preview Slip" aria-label="Preview">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button type="button" class="btn-icon btn-row-download" data-idx="${idx}" title="Unduh PDF" aria-label="Download">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          </div>
        </td>
      `;
      summaryTableBody.appendChild(tr);
    });

    // Row action events
    summaryTableBody.querySelectorAll('.btn-row-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        appState.selectedTeknisiIndex = idx;
        teknisiSelect.value = idx;
        updateActiveAdjuster();
        teknisiSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    summaryTableBody.querySelectorAll('.btn-row-preview').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        openPreviewModal(appState.technicians[idx]);
      });
    });

    summaryTableBody.querySelectorAll('.btn-row-download').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        downloadSinglePdf(appState.technicians[idx]);
      });
    });
  }

  function updateSummaryTableRow(tek) {
    const idx = appState.technicians.indexOf(tek);
    if (idx === -1) return;
    const tr = document.getElementById(`summaryRow_${idx}`);
    if (tr) {
      tr.children[3].textContent = rupiah(tek.bruto);
      tr.children[4].textContent = rupiah(tek.totalPotongan);
      tr.children[5].innerHTML = `<strong>${rupiah(tek.nett)}</strong>`;
    }
  }

  // --- Visual Slip Paper Preview (HTML) ---
  function openPreviewModal(tek) {
    currentPreviewTeknisi = tek;
    previewModalTitle.textContent = `Preview Slip Bagi Hasil — ${tek.nama}`;
    previewModalSubtitle.textContent = `Cabang ${tek.cabang} &bull; Periode: ${appState.periode}`;

    const logoMadinahSrc = window.SLIP_LOGOS?.madinah || '';
    const logoMFlashSrc = window.SLIP_LOGOS?.mflash || '';
    const catatanTxt = catatanInput.value || '';

    // Build kualifikasi rows
    let kualHtml = '';
    if (tek.categories.length === 0) {
      kualHtml = `<tr><td colspan="4" style="color: #6b7280; font-style: italic;">(rincian kualifikasi tidak ditemukan)</td></tr>`;
    } else {
      tek.categories.forEach(k => {
        const omzetStr = k.omzet > 0 ? rupiah(k.omzet) : '-';
        const akadStr = k.akadPct > 0 ? `${(k.akadPct * 100).toFixed(1).replace('.', ',')}%` : '-';
        kualHtml += `
          <tr>
            <td>${k.cat}</td>
            <td style="text-align: right;">${omzetStr}</td>
            <td style="text-align: right;">${akadStr}</td>
            <td style="text-align: right;">${rupiah(k.bh)}</td>
          </tr>
        `;
      });
    }

    // Build potongan rows
    let potHtml = '';
    let hasPot = false;
    tek.potongan.forEach(p => {
      if (p.val !== 0) {
        hasPot = true;
        potHtml += `
          <tr>
            <td>${p.label}</td>
            <td style="text-align: right;">${rupiah(p.val)}</td>
          </tr>
        `;
      }
    });
    if (!hasPot) {
      potHtml = `<tr><td colspan="2" style="color: #6b7280; font-style: italic;">(tidak ada potongan)</td></tr>`;
    }

    // Cadangan 7 tahun
    let cadanganHtml = '';
    if (tek.cadanganBulan !== 0 || tek.cadanganTotal !== 0) {
      cadanganHtml = `<div class="paper-cadangan-box">`;
      if (tek.cadanganBulan !== 0) {
        cadanganHtml += `<div class="paper-cadangan-row"><span>Cadangan 7 Tahun / bulan</span><span>${rupiah(tek.cadanganBulan)}</span></div>`;
      }
      if (tek.cadanganTotal !== 0) {
        cadanganHtml += `<div class="paper-cadangan-row"><span>Total Cadangan 7 Tahun</span><span>${rupiah(tek.cadanganTotal)}</span></div>`;
      }
      cadanganHtml += `</div>`;
    }

    // Assemble paper
    slipPaper.innerHTML = `
      <div class="paper-header">
        <img src="${logoMadinahSrc}" alt="Logo Madinah" class="paper-logo-madinah">
        <img src="${logoMFlashSrc}" alt="Logo MFlash" class="paper-logo-mflash">
      </div>

      <div class="paper-title">SLIP BAGI HASIL TEKNISI MADINAH FLASH</div>
      <hr class="paper-divider">

      <div class="paper-info-grid">
        <span class="paper-info-label">Nama</span><span>: ${tek.nama}</span>
        <span class="paper-info-label">Jabatan</span><span>: ${tek.status ? `Teknisi (${tek.status})` : 'Teknisi'}</span>
        <span class="paper-info-label">Divisi</span><span>: MFlash — ${tek.cabang}</span>
        <span class="paper-info-label">Periode</span><span>: ${appState.periode}</span>
        ${tek.rekening ? `<span class="paper-info-label">Rekening</span><span>: ${tek.rekening}</span>` : ''}
      </div>

      <table class="paper-table">
        <thead class="paper-table-header">
          <tr>
            <th>PENDAPATAN PER KUALIFIKASI</th>
            <th class="align-right">OMZET</th>
            <th class="align-right">AKAD</th>
            <th class="align-right">BAGI HASIL</th>
          </tr>
        </thead>
        <tbody>
          ${kualHtml}
          <tr class="total-row">
            <td colspan="3">Total Bruto Bagi Hasil</td>
            <td style="text-align: right;">${rupiah(tek.bruto)}</td>
          </tr>
        </tbody>
      </table>

      <table class="paper-table">
        <thead class="paper-table-header">
          <tr>
            <th>POTONGAN</th>
            <th class="align-right" style="width: 140px;">JUMLAH</th>
          </tr>
        </thead>
        <tbody>
          ${potHtml}
          <tr class="total-row">
            <td>Total Potongan</td>
            <td style="text-align: right;">${rupiah(tek.totalPotongan)}</td>
          </tr>
        </tbody>
      </table>

      <div class="paper-nett-banner">
        <span>NETT BAGI HASIL</span>
        <span>${rupiah(tek.nett)}</span>
      </div>

      ${cadanganHtml}

      <div class="paper-notes-box">
        <div class="paper-notes-title">Catatan</div>
        <div class="paper-notes-content">${catatanTxt || '-'}</div>
      </div>

      <div class="paper-signatures">
        <div class="signature-col">
          <div class="signature-line"></div>
          <span>Teknisi</span>
        </div>
        <div class="signature-col">
          <div class="signature-line"></div>
          <span>Kepala Cabang</span>
        </div>
        <div class="signature-col">
          <div class="signature-line"></div>
          <span>Finance</span>
        </div>
      </div>
    `;

    previewModal.style.display = 'flex';
  }

  function closePreviewModal() {
    previewModal.style.display = 'none';
    currentPreviewTeknisi = null;
  }

  // --- jsPDF Vector PDF Generator ---
  function buildPdfDoc(tek, periodeTxt, catatanTxt) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const lebar = 210;
    const m = 18;

    doc.setProperties({
      title: `Slip Bagi Hasil — ${tek.nama} (${tek.cabang})`,
      author: 'Madinah Flash',
      subject: 'Slip Bagi Hasil Teknisi',
      creator: 'Pandora Stack'
    });

    // Logos at top (y = 14)
    if (window.SLIP_LOGOS?.madinah) {
      try {
        doc.addImage(window.SLIP_LOGOS.madinah, 'PNG', m, 14, 20, 20);
      } catch (err) {
        console.warn('Gagal memuat logo madinah ke PDF:', err);
      }
    }
    if (window.SLIP_LOGOS?.mflash) {
      try {
        doc.addImage(window.SLIP_LOGOS.mflash, 'PNG', lebar - m - 34, 14, 34, 24);
      } catch (err) {
        console.warn('Gagal memuat logo mflash ke PDF:', err);
      }
    }

    // Header title at y = 42
    let y = 42;
    doc.setTextColor(31, 56, 100); // RGB(0.12, 0.22, 0.39)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('SLIP BAGI HASIL TEKNISI MADINAH FLASH', lebar / 2, y, { align: 'center' });
    y += 4;

    // Header divider line at y = 46
    doc.setDrawColor(31, 56, 100);
    doc.setLineWidth(0.42); // 1.2 pt
    doc.line(m, y, lebar - m, y);
    y += 8;

    // Identity rows
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9.5);
    const idRows = [
      ['Nama', tek.nama],
      ['Jabatan', tek.status ? `Teknisi (${tek.status})` : 'Teknisi'],
      ['Divisi', `MFlash — ${tek.cabang}`],
      ['Periode', periodeTxt]
    ];
    if (tek.rekening) {
      idRows.push(['Rekening', tek.rekening]);
    }

    idRows.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, m, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`: ${val}`, m + 24, y);
      y += 5.4;
    });
    y += 2.6;

    // Helper table header
    function drawTableHeader(title, hasCols = true) {
      doc.setFillColor(31, 56, 100);
      doc.rect(m, y, lebar - 2 * m, 5.6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(title, m + 2, y + 3.8);

      if (hasCols) {
        doc.text('OMZET', lebar - m - 46, y + 3.8, { align: 'right' });
        doc.text('AKAD', lebar - m - 30, y + 3.8, { align: 'right' });
        doc.text('BAGI HASIL', lebar - m - 2, y + 3.8, { align: 'right' });
      } else {
        doc.text('JUMLAH', lebar - m - 2, y + 3.8, { align: 'right' });
      }

      doc.setTextColor(0, 0, 0);
      y += 5.6 + 4.2;
    }

    // --- 1. Pendapatan Table ---
    drawTableHeader('PENDAPATAN PER KUALIFIKASI', true);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    if (tek.categories.length === 0) {
      doc.text('(rincian kualifikasi tidak ditemukan)', m + 2, y);
      y += 5;
    } else {
      tek.categories.forEach(k => {
        doc.text(String(k.cat), m + 2, y);
        const omzetStr = k.omzet > 0 ? rupiah(k.omzet) : '-';
        const akadStr = k.akadPct > 0 ? `${(k.akadPct * 100).toFixed(1).replace('.', ',')}%` : '-';
        doc.text(omzetStr, lebar - m - 46, y, { align: 'right' });
        doc.text(akadStr, lebar - m - 30, y, { align: 'right' });
        doc.text(rupiah(k.bh), lebar - m - 2, y, { align: 'right' });
        y += 4.8;
      });
    }

    y -= 1;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(lebar - m - 52, y, lebar - m, y);
    y += 3.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Total Bruto Bagi Hasil', m + 2, y);
    doc.text(rupiah(tek.bruto), lebar - m - 2, y, { align: 'right' });
    y += 7.0;

    // --- 2. Potongan Table ---
    drawTableHeader('POTONGAN', false);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    let hasPot = false;
    tek.potongan.forEach(p => {
      if (p.val !== 0) {
        hasPot = true;
        doc.text(String(p.label), m + 2, y);
        doc.text(rupiah(p.val), lebar - m - 2, y, { align: 'right' });
        y += 4.8;
      }
    });

    if (!hasPot) {
      doc.text('(tidak ada potongan)', m + 2, y);
      y += 4.8;
    }

    y -= 1;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(lebar - m - 52, y, lebar - m, y);
    y += 3.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Total Potongan', m + 2, y);
    doc.text(rupiah(tek.totalPotongan), lebar - m - 2, y, { align: 'right' });
    y += 7.0;

    // --- 3. Nett Banner ---
    doc.setFillColor(219, 234, 205); // RGB(0.86, 0.92, 0.84)
    doc.rect(m, y, lebar - 2 * m, 7.5, 'F');
    doc.setTextColor(13, 89, 38); // RGB(0.05, 0.35, 0.15)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('NETT BAGI HASIL', m + 2, y + 5.0);
    doc.text(rupiah(tek.nett), lebar - m - 2, y + 5.0, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 7.5 + 5.0;

    // --- 4. Cadangan 7 Tahun ---
    if (tek.cadanganBulan !== 0 || tek.cadanganTotal !== 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      if (tek.cadanganBulan !== 0) {
        doc.text('Cadangan 7 Tahun / bulan', m + 2, y);
        doc.text(rupiah(tek.cadanganBulan), lebar - m - 2, y, { align: 'right' });
        y += 4.5;
      }
      if (tek.cadanganTotal !== 0) {
        doc.text('Total Cadangan 7 Tahun', m + 2, y);
        doc.text(rupiah(tek.cadanganTotal), lebar - m - 2, y, { align: 'right' });
        y += 4.5;
      }
      y += 2;
    } else {
      y += 2;
    }

    // --- 5. Catatan Box ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Catatan', m, y);
    y += 2.5;

    const tinggiKotak = 16;
    doc.setLineWidth(0.2);
    doc.setDrawColor(179, 179, 179);
    doc.rect(m, y, lebar - 2 * m, tinggiKotak, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const barisCatatan = String(catatanTxt || '').split('\n');
    let yy = y + 4.0;
    barisCatatan.slice(0, 4).forEach(baris => {
      doc.text(baris.substring(0, 110), m + 2, yy);
      yy += 3.8;
    });
    y += tinggiKotak + 20;

    // --- 6. Signatures ---
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    const sigCols = [
      { x: m + 8, label: 'Teknisi' },
      { x: lebar / 2 - 16, label: 'Kepala Cabang' },
      { x: lebar - m - 40, label: 'Finance' }
    ];

    sigCols.forEach(({ x, label }) => {
      doc.line(x, y, x + 32, y);
      doc.text(label, x + 16, y + 4.5, { align: 'center' });
    });

    return doc;
  }

  function downloadSinglePdf(tek) {
    const periodeTxt = periodeInput.value || appState.periode || 'Periode';
    const catatanTxt = catatanInput.value || '';
    const doc = buildPdfDoc(tek, periodeTxt, catatanTxt);

    const cabSafe = safeFileName(tek.cabang, 'CABANG');
    const namaSafe = safeFileName(tek.nama, 'TEKNISI');
    const fileName = `Slip Bagi Hasil — ${cabSafe} - ${namaSafe}.pdf`;

    doc.save(fileName);
  }

  // --- Batch ZIP Generator (JSZip) ---
  async function generateAndDownloadZip() {
    if (appState.technicians.length === 0) {
      alert('Tidak ada data teknisi untuk diunduh.');
      return;
    }

    const zip = new JSZip();
    const periodeTxt = periodeInput.value || appState.periode || 'Periode';
    const catatanTxt = catatanInput.value || '';
    const isZipPerCabang = document.querySelector('input[name="zipFormat"]:checked')?.value === 'zip';

    // Show Progress
    progressOverlay.style.display = 'flex';
    progressTitle.textContent = 'Menyusun Berkas Slip Gaji PDF...';
    progressBar.style.width = '0%';

    const total = appState.technicians.length;
    let completed = 0;

    // Group technicians by cabang
    const cabangMap = new Map();
    appState.technicians.forEach(tek => {
      const cab = tek.cabang || 'UMUM';
      if (!cabangMap.has(cab)) {
        cabangMap.set(cab, []);
      }
      cabangMap.get(cab).push(tek);
    });

    // Small delay helper for UI update
    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    try {
      if (isZipPerCabang) {
        // Create sub-zip per cabang
        for (const [cab, list] of cabangMap.entries()) {
          const cabFolder = safeFileName(cab, 'CABANG');
          const subZip = new JSZip();

          for (const tek of list) {
            const doc = buildPdfDoc(tek, periodeTxt, catatanTxt);
            const pdfBlob = doc.output('blob');
            const pdfName = `${cabFolder} - ${safeFileName(tek.nama)}.pdf`;
            subZip.file(pdfName, pdfBlob);

            completed++;
            const pct = Math.round((completed / total) * 70);
            progressBar.style.width = `${pct}%`;
            progressDesc.textContent = `Membuat PDF ${completed} dari ${total} (${tek.nama})`;
            await sleep(5);
          }

          const subBlob = await subZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
          zip.file(`${cabFolder}.zip`, subBlob);
        }
      } else {
        // Folder per cabang inside single master zip
        for (const [cab, list] of cabangMap.entries()) {
          const cabFolder = safeFileName(cab, 'CABANG');

          for (const tek of list) {
            const doc = buildPdfDoc(tek, periodeTxt, catatanTxt);
            const pdfBlob = doc.output('blob');
            const pdfName = `${cabFolder} - ${safeFileName(tek.nama)}.pdf`;
            zip.file(`${cabFolder}/${pdfName}`, pdfBlob);

            completed++;
            const pct = Math.round((completed / total) * 70);
            progressBar.style.width = `${pct}%`;
            progressDesc.textContent = `Membuat PDF ${completed} dari ${total} (${tek.nama})`;
            await sleep(5);
          }
        }
      }

      // Final ZIP compression
      progressTitle.textContent = 'Mengompresi Arsip ZIP...';
      progressDesc.textContent = 'Membungkus seluruh berkas PDF ke dalam file .zip...';

      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (metadata) => {
          const pct = 70 + Math.round(metadata.percent * 0.3);
          progressBar.style.width = `${pct}%`;
        }
      );

      const zipFileName = `slip_gaji_teknisi_${safeFileName(periodeTxt)}.zip`;
      saveAs(zipBlob, zipFileName);

      progressBar.style.width = '100%';
      progressDesc.textContent = `Selesai! Berkas ${zipFileName} berhasil diunduh.`;
      await sleep(600);
    } catch (err) {
      console.error('Error batch generating ZIP:', err);
      alert('Terjadi kesalahan saat membuat file ZIP: ' + err.message);
    } finally {
      progressOverlay.style.display = 'none';
    }
  }

  // --- Event Listeners Setup ---
  function initEvents() {
    // Dropzone Drag & Drop
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFileInput(files[0]);
      }
    });

    dropzone.addEventListener('click', () => {
      excelFileInput.click();
    });

    excelFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileInput(e.target.files[0]);
      }
    });

    btnResetFile.addEventListener('click', resetAllData);

    // Period and Notes
    periodeInput.addEventListener('input', (e) => {
      appState.periode = e.target.value;
    });

    catatanInput.addEventListener('input', (e) => {
      appState.catatan = e.target.value;
    });

    // Adjuster Technician Select
    teknisiSelect.addEventListener('change', (e) => {
      appState.selectedTeknisiIndex = parseInt(e.target.value, 10) || 0;
      updateActiveAdjuster();
    });

    // Adjuster Tabs
    document.querySelectorAll('.adjuster-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.adjuster-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        e.currentTarget.classList.add('active');
        const targetId = e.currentTarget.dataset.tab;
        const targetEl = document.getElementById(targetId);
        if (targetEl) targetEl.classList.add('active');
      });
    });

    // Preview / Download Active Technician
    btnPreviewSelected.addEventListener('click', () => {
      if (appState.technicians.length > 0) {
        openPreviewModal(appState.technicians[appState.selectedTeknisiIndex]);
      }
    });

    btnDownloadSelected.addEventListener('click', () => {
      if (appState.technicians.length > 0) {
        downloadSinglePdf(appState.technicians[appState.selectedTeknisiIndex]);
      }
    });

    // Search in Summary Table
    tableSearchInput.addEventListener('input', renderSummaryTable);

    // Batch Download
    btnDownloadZip.addEventListener('click', generateAndDownloadZip);

    // Sheet Selector change
    if (sheetSelector) {
      sheetSelector.addEventListener('change', (e) => {
        switchSheet(e.target.value);
      });
    }

    // Quick-load current folder file button
    if (btnLoadFolderFile) {
      btnLoadFolderFile.addEventListener('click', async (e) => {
        e.stopPropagation();
        const targetFileName = 'Bagi hasil teknisi 24 Agustus - 23 September 2026 JATIMULYA.xlsx';
        try {
          const resp = await fetch(encodeURIComponent(targetFileName));
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
          }
          const buffer = await resp.arrayBuffer();
          handleArrayBuffer(buffer, targetFileName);
        } catch (err) {
          console.warn('Gagal memuat otomatis file dari folder:', err);
          alert('Tidak dapat memuat berkas otomatis (mungkin browser memblokir fetch lokal pada protokol file://).\nSilakan pilih atau seret file "' + targetFileName + '" langsung ke area kotak unggah.');
          excelFileInput.click();
        }
      });
    }

    // Modal
    btnCloseModal.addEventListener('click', closePreviewModal);
    previewModal.addEventListener('click', (e) => {
      if (e.target === previewModal) closePreviewModal();
    });
    btnDownloadFromModal.addEventListener('click', () => {
      if (currentPreviewTeknisi) {
        downloadSinglePdf(currentPreviewTeknisi);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && previewModal.style.display === 'flex') {
        closePreviewModal();
      }
    });
  }

  // --- Switch Sheet in Current Workbook ---
  function switchSheet(newSheetName) {
    if (!appState.rawWorkbook) return;
    try {
      const parsed = parseExcelData(null, appState.fileName, newSheetName);
      appState.technicians = parsed.technicians;
      appState.categories = parsed.categories;
      appState.potonganCols = parsed.potCols;
      if (parsed.autoPeriode) {
        appState.periode = parsed.autoPeriode;
        periodeInput.value = appState.periode;
      }
      appState.sheetUsed = parsed.sheetUsed;
      appState.selectedTeknisiIndex = 0;

      displaySheetName.textContent = parsed.sheetUsed;
      displayTotalTeknisi.textContent = parsed.technicians.length;
      dataStatusBadge.textContent = `${parsed.technicians.length} Teknisi Terbaca`;

      updateAllViews();
    } catch (err) {
      console.error('Gagal beralih sheet:', err);
      alert('Gagal beralih sheet:\n' + err.message);
    }
  }

  function setupSheetSelector() {
    if (appState.availableSheets.length > 1) {
      sheetSelector.innerHTML = '';
      appState.availableSheets.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        if (s === appState.sheetUsed) opt.selected = true;
        sheetSelector.appendChild(opt);
      });
      sheetSelector.style.display = 'inline-block';
      displaySheetName.style.display = 'none';
    } else {
      sheetSelector.style.display = 'none';
      displaySheetName.style.display = 'inline';
      displaySheetName.textContent = appState.sheetUsed;
    }
  }

  // --- File Reader Handler ---
  function handleArrayBuffer(buffer, fileName) {
    try {
      const parsed = parseExcelData(buffer, fileName);

      appState.technicians = parsed.technicians;
      appState.categories = parsed.categories;
      appState.potonganCols = parsed.potCols;
      appState.periode = parsed.autoPeriode || '24 Juli 2026 – 23 Agustus 2026';
      appState.fileName = fileName;
      appState.sheetUsed = parsed.sheetUsed;
      appState.selectedTeknisiIndex = 0;

      // Populate header inputs
      periodeInput.value = appState.periode;

      // UI state changes
      displayFileName.textContent = fileName;
      displaySheetName.textContent = parsed.sheetUsed;
      displayTotalTeknisi.textContent = parsed.technicians.length;

      // Setup sheet selector dropdown
      setupSheetSelector();

      fileInfoBox.style.display = 'block';
      dropzone.style.display = 'none';
      btnResetFile.style.display = 'inline-flex';
      mainContentArea.style.display = 'block';

      dataStatusBadge.textContent = `${parsed.technicians.length} Teknisi Terbaca`;
      dataStatusBadge.classList.add('success');

      updateAllViews();
    } catch (err) {
      console.error('Gagal memproses file Excel:', err);
      alert('Gagal memproses file Excel:\n' + err.message);
    }
  }

  function handleFileInput(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      handleArrayBuffer(e.target.result, file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  function resetAllData() {
    appState = {
      technicians: [],
      categories: [],
      potonganCols: [],
      periode: '',
      catatan: '',
      fileName: '',
      sheetUsed: '',
      selectedTeknisiIndex: 0,
      zipFormat: 'folder',
      availableSheets: [],
      rawWorkbook: null
    };

    excelFileInput.value = '';
    sheetSelector.style.display = 'none';
    sheetSelector.innerHTML = '';
    displaySheetName.style.display = 'inline';
    displaySheetName.textContent = '-';

    fileInfoBox.style.display = 'none';
    dropzone.style.display = 'block';
    btnResetFile.style.display = 'none';
    mainContentArea.style.display = 'none';

    dataStatusBadge.textContent = 'Belum Ada File';
    dataStatusBadge.classList.remove('success');
  }

  // --- Initializer ---
  document.addEventListener('DOMContentLoaded', initEvents);
})();
