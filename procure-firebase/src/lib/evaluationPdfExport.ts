import jsPDF from 'jspdf';
import { OfferScorecard, EvaluationAuditEntry, Tender } from '@/types/tender';

interface ExportOptions {
  tender: Tender;
  scorecards: OfferScorecard[];
  auditLog: EvaluationAuditEntry[];
  winnerName?: string | null;
  winnerAmount?: number | null;
  lang?: 'en' | 'ro';
}

const C = {
  bg: '#ffffff', surface: '#f8f9fc', border: '#e2e8f0',
  primary: '#4f46e5', primaryLight: '#ede9fe',
  text: '#0f172a', muted: '#64748b',
  awarded: '#16a34a', awardedLight: '#dcfce7',
  destructive: '#dc2626', warning: '#d97706',
  rank1: '#f59e0b', rank2: '#94a3b8', rank3: '#ea580c',
};

function scoreColor(s: number) { return s >= 80 ? C.awarded : s >= 60 ? C.primary : s >= 40 ? C.warning : C.destructive; }
function rankLabel(r: number) { return r === 1 ? '1st' : r === 2 ? '2nd' : r === 3 ? '3rd' : `#${r}`; }

function drawRect(doc: jsPDF, x: number, y: number, w: number, h: number, fill: string, r = 0) {
  doc.setFillColor(fill); doc.roundedRect(x, y, w, h, r, r, 'F');
}
function drawLine(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, color = C.border, lw = 0.3) {
  doc.setDrawColor(color); doc.setLineWidth(lw); doc.line(x1, y1, x2, y2);
}
function label(doc: jsPDF, text: string, x: number, y: number, size = 9, color = C.muted, bold = false) {
  doc.setFontSize(size); doc.setTextColor(color); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.text(text, x, y);
}
function scoreBar(doc: jsPDF, x: number, y: number, w: number, h: number, score: number) {
  drawRect(doc, x, y, w, h, C.border, 1);
  drawRect(doc, x, y, (score / 100) * w, h, scoreColor(score), 1);
}

function addPageHeader(doc: jsPDF, tender: Tender, page: number, lang: 'en' | 'ro') {
  const W = doc.internal.pageSize.getWidth();
  drawRect(doc, 0, 0, W, 14, C.primary);
  const title = lang === 'ro' ? 'RAPORT DE EVALUARE LICITAȚIE' : 'TENDER EVALUATION REPORT';
  doc.setFontSize(9); doc.setTextColor('#ffffff'); doc.setFont('helvetica', 'bold');
  doc.text(title, 10, 9);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(tender.referenceCode ?? tender.title, W / 2, 9, { align: 'center' });
  doc.text(`${lang === 'ro' ? 'Pagina' : 'Page'} ${page}`, W - 10, 9, { align: 'right' });
}

function addPageFooter(doc: jsPDF, tender: Tender, lang: 'en' | 'ro') {
  const W = doc.internal.pageSize.getWidth(); const H = doc.internal.pageSize.getHeight();
  drawLine(doc, 10, H - 14, W - 10, H - 14);
  const confLabel = lang === 'ro' ? 'CONFIDENȚIAL — Numai pentru uz intern' : 'CONFIDENTIAL — For internal use only';
  doc.setFontSize(7); doc.setTextColor(C.muted); doc.setFont('helvetica', 'normal');
  doc.text(`${lang === 'ro' ? 'Generat la' : 'Generated on'} ${new Date().toLocaleString(lang === 'ro' ? 'ro-RO' : 'en-GB')} · ${tender.referenceCode ?? tender.id}`, 10, H - 8);
  doc.text(confLabel, W - 10, H - 8, { align: 'right' });
}

export function exportEvaluationPdf(options: ExportOptions): void {
  const { tender, scorecards, auditLog, winnerName, winnerAmount, lang = 'en' } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const MARGIN = 10;
  const CONTENT_W = W - MARGIN * 2;
  let page = 1;

  const ranked = [...scorecards]
    .filter(s => s.totalScore !== null)
    .sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0))
    .map((sc, i) => ({ ...sc, rank: i + 1 }));

  addPageHeader(doc, tender, page, lang);
  addPageFooter(doc, tender, lang);
  let y = 22;

  // Title block
  drawRect(doc, MARGIN, y, CONTENT_W, 28, C.surface, 3);
  doc.setFontSize(16); doc.setTextColor(C.text); doc.setFont('helvetica', 'bold');
  doc.text(tender.title, MARGIN + 6, y + 10);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(C.muted);
  doc.text(`${lang === 'ro' ? 'Categorie' : 'Category'}: ${tender.category.replace(/-/g, ' ')} · ${tender.location}`, MARGIN + 6, y + 18);
  doc.text(`${lang === 'ro' ? 'Data raportului' : 'Report date'}: ${new Date().toLocaleDateString(lang === 'ro' ? 'ro-RO' : 'en-GB')}`, MARGIN + 6, y + 24);
  y += 36;

  // Winner banner
  if (winnerName && winnerAmount) {
    drawRect(doc, MARGIN, y, CONTENT_W, 20, C.awardedLight, 3);
    doc.setFontSize(8); doc.setTextColor(C.awarded); doc.setFont('helvetica', 'bold');
    doc.text(lang === 'ro' ? 'CONTRACT ATRIBUIT' : 'CONTRACT AWARDED', MARGIN + 5, y + 7);
    doc.setFontSize(13); doc.text(winnerName, MARGIN + 5, y + 14);
    doc.setFontSize(10); doc.text(`€${winnerAmount.toLocaleString()}`, W - MARGIN - 5, y + 12, { align: 'right' });
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(lang === 'ro' ? 'Valoare contract' : 'Awarded amount', W - MARGIN - 5, y + 17, { align: 'right' });
    y += 28;
  }

  // Final ranking
  label(doc, lang === 'ro' ? 'CLASAMENT FINAL' : 'FINAL RANKING', MARGIN, y + 5, 9, C.primary, true);
  drawLine(doc, MARGIN, y + 7, W - MARGIN, y + 7, C.primary, 0.5);
  y += 12;

  const cols = { rank: MARGIN, name: MARGIN + 18, amount: MARGIN + 90, score: MARGIN + 120, bar: MARGIN + 148 };
  drawRect(doc, MARGIN, y, CONTENT_W, 7, C.surface, 1);
  const headers = lang === 'ro'
    ? ['#', 'Furnizor', 'Valoare (€)', 'Scor Ponderat', 'Bară']
    : ['#', 'Supplier', 'Amount (€)', 'Weighted Score', 'Bar'];
  [cols.rank, cols.name, cols.amount, cols.score, cols.bar].forEach((x, i) => label(doc, headers[i], x, y + 5, 8, C.muted, true));
  y += 9;

  ranked.forEach((sc, idx) => {
    drawRect(doc, MARGIN, y, CONTENT_W, 9, idx % 2 === 0 ? C.bg : C.surface);
    const rankColor = sc.rank === 1 ? C.rank1 : sc.rank === 2 ? C.rank2 : sc.rank === 3 ? C.rank3 : C.muted;
    doc.setFontSize(8); doc.setTextColor(rankColor); doc.setFont('helvetica', 'bold');
    doc.text(rankLabel(sc.rank), cols.rank, y + 6);
    doc.setTextColor(C.text); doc.setFont('helvetica', sc.rank === 1 ? 'bold' : 'normal');
    doc.text(sc.supplierName, cols.name, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(C.muted);
    doc.text(`€${sc.amount.toLocaleString()}`, cols.amount, y + 6);
    doc.setTextColor(scoreColor(sc.totalScore ?? 0)); doc.setFont('helvetica', 'bold');
    doc.text(`${(sc.totalScore ?? 0).toFixed(2)} / 100`, cols.score, y + 6);
    scoreBar(doc, cols.bar, y + 2, 44, 4, sc.totalScore ?? 0);
    y += 9;
  });

  y += 6;

  // Criteria weights
  label(doc, lang === 'ro' ? 'CRITERII DE SELECȚIE ȘI PONDERI' : 'SELECTION CRITERIA & WEIGHTS', MARGIN, y + 5, 9, C.primary, true);
  drawLine(doc, MARGIN, y + 7, W - MARGIN, y + 7, C.primary, 0.5);
  y += 12;

  tender.selectionCriteria.forEach((c, i) => {
    if (y > 255) { doc.addPage(); page++; addPageHeader(doc, tender, page, lang); addPageFooter(doc, tender, lang); y = 22; }
    drawRect(doc, MARGIN, y, CONTENT_W, 7, i % 2 === 0 ? C.bg : C.surface);
    label(doc, c.name, MARGIN + 3, y + 5, 8, C.text);
    label(doc, `${c.weight}%`, W - MARGIN - 3, y + 5, 8, C.primary, true);
    y += 7;
  });

  y += 4;

  // Per-offer scorecards
  for (const sc of ranked) {
    if (y > 220) { doc.addPage(); page++; addPageHeader(doc, tender, page, lang); addPageFooter(doc, tender, lang); y = 22; }
    const headerBg = sc.rank === 1 ? C.awardedLight : C.primaryLight;
    const headerColor = sc.rank === 1 ? C.awarded : C.primary;
    drawRect(doc, MARGIN, y, CONTENT_W, 14, headerBg, 2);
    doc.setFontSize(11); doc.setTextColor(headerColor); doc.setFont('helvetica', 'bold');
    doc.text(`${rankLabel(sc.rank)}  ${sc.supplierName}`, MARGIN + 5, y + 9);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`€${sc.amount.toLocaleString()}`, W - MARGIN - 5, y + 6, { align: 'right' });
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(scoreColor(sc.totalScore ?? 0));
    doc.text(`${(sc.totalScore ?? 0).toFixed(2)} pts`, W - MARGIN - 5, y + 12, { align: 'right' });
    y += 18;

    const criCols = { name: MARGIN + 3, weight: MARGIN + 80, score: MARGIN + 105, contrib: MARGIN + 130, bar: MARGIN + 160 };
    drawRect(doc, MARGIN, y, CONTENT_W, 6, C.surface);
    const criHeaders = lang === 'ro'
      ? ['Criteriu', 'Pond.%', 'Scor', 'Contribuție', 'Vizual']
      : ['Criterion', 'Weight', 'Score', 'Contribution', 'Visual'];
    [[criCols.name, criHeaders[0]], [criCols.weight, criHeaders[1]], [criCols.score, criHeaders[2]], [criCols.contrib, criHeaders[3]], [criCols.bar, criHeaders[4]]].forEach(([x, h]) => label(doc, h as string, x as number, y + 4.5, 7.5, C.muted, true));
    y += 7;

    for (const cs of sc.scores) {
      if (y > 255) { doc.addPage(); page++; addPageHeader(doc, tender, page, lang); addPageFooter(doc, tender, lang); y = 22; }
      const rowH = cs.justification ? 18 : 9;
      drawRect(doc, MARGIN, y, CONTENT_W, rowH, C.bg);
      drawLine(doc, MARGIN, y + rowH, W - MARGIN, y + rowH);
      label(doc, cs.criterionName, criCols.name, y + 6, 8, C.text);
      label(doc, `${cs.weight}%`, criCols.weight, y + 6, 8, C.muted);
      const s = cs.score ?? 0;
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(scoreColor(s));
      doc.text(`${s}/100`, criCols.score, y + 6);
      label(doc, `${((s * cs.weight) / 100).toFixed(2)} pts`, criCols.contrib, y + 6, 8, C.muted);
      scoreBar(doc, criCols.bar, y + 2, 35, 4, s);
      if (cs.justification) {
        doc.setFontSize(7); doc.setTextColor(C.muted); doc.setFont('helvetica', 'italic');
        const lines = doc.splitTextToSize(`↳ ${cs.justification}`, CONTENT_W - 8);
        doc.text(lines[0], criCols.name, y + 12);
        if (lines[1]) doc.text(lines[1], criCols.name, y + 16);
      }
      y += rowH;
    }

    drawRect(doc, MARGIN, y, CONTENT_W, 8, sc.rank === 1 ? C.awardedLight : C.surface);
    label(doc, lang === 'ro' ? 'SCOR TOTAL PONDERAT' : 'WEIGHTED TOTAL', MARGIN + 3, y + 5.5, 8, C.text, true);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(scoreColor(sc.totalScore ?? 0));
    doc.text(`${(sc.totalScore ?? 0).toFixed(2)} / 100`, W - MARGIN - 5, y + 6, { align: 'right' });
    y += 14;
  }

  // Audit trail
  if (auditLog.length > 0) {
    doc.addPage(); page++;
    addPageHeader(doc, tender, page, lang);
    addPageFooter(doc, tender, lang);
    y = 22;
    label(doc, lang === 'ro' ? 'JURNAL DE AUDIT EVALUARE' : 'EVALUATION AUDIT TRAIL', MARGIN, y + 5, 11, C.primary, true);
    drawLine(doc, MARGIN, y + 7, W - MARGIN, y + 7, C.primary, 0.5);
    y += 14;
    const actionColors: Record<string, string> = { ai_suggested: C.primary, ai_applied: C.primary, winner_selected: C.awarded, evaluation_reset: C.destructive, score_set: C.muted };
    [...auditLog].reverse().forEach((entry, idx) => {
      if (y > 265) { doc.addPage(); page++; addPageHeader(doc, tender, page, lang); addPageFooter(doc, tender, lang); y = 22; }
      drawRect(doc, MARGIN, y, CONTENT_W, 10, idx % 2 === 0 ? C.bg : C.surface);
      const ts = new Date(entry.timestamp).toLocaleString(lang === 'ro' ? 'ro-RO' : 'en-GB', { timeStyle: 'short', dateStyle: 'short' });
      label(doc, ts, MARGIN + 3, y + 6.5, 7.5, C.muted);
      const aColor = actionColors[entry.action] ?? C.muted;
      const aLabel = entry.action.replace(/_/g, ' ').toUpperCase();
      drawRect(doc, MARGIN + 32, y + 2, 28, 6, `${aColor}22`, 1);
      doc.setFontSize(6.5); doc.setTextColor(aColor); doc.setFont('helvetica', 'bold');
      doc.text(aLabel, MARGIN + 46, y + 6.5, { align: 'center' });
      const detail = doc.splitTextToSize(entry.detail, CONTENT_W - 75);
      label(doc, detail[0], MARGIN + 65, y + 6.5, 7.5, C.text);
      y += 10;
    });
  }

  const safeTitle = tender.title.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`evaluation-report-${safeTitle}-${dateStr}.pdf`);
}
