import jsPDF from 'jspdf';
import { Tender, TenderRound, OfferScorecard, SelectionCriterion } from '@/types/tender';

interface RoundReportOptions {
  tender: Tender;
  round: TenderRound;
  scorecards?: OfferScorecard[]; // may be partial or empty if evaluation not yet done
  lang?: 'en' | 'ro';
}

// ─── Color palette (matches evaluationPdfExport) ─────────────────────────────
const C = {
  bg: '#ffffff',
  surface: '#f8f9fc',
  border: '#e2e8f0',
  primary: '#4f46e5',
  primaryLight: '#ede9fe',
  text: '#0f172a',
  muted: '#64748b',
  awarded: '#16a34a',
  awardedLight: '#dcfce7',
  destructive: '#dc2626',
  warning: '#d97706',
  rank1: '#f59e0b',
  rank2: '#94a3b8',
  rank3: '#ea580c',
};

function scoreColor(score: number): string {
  if (score >= 80) return C.awarded;
  if (score >= 60) return C.primary;
  if (score >= 40) return C.warning;
  return C.destructive;
}

function rankLabel(rank: number): string {
  return rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `#${rank}`;
}

function drawRect(doc: jsPDF, x: number, y: number, w: number, h: number, fill: string, r = 0) {
  doc.setFillColor(fill);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

function drawLine(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, color = C.border, lw = 0.3) {
  doc.setDrawColor(color);
  doc.setLineWidth(lw);
  doc.line(x1, y1, x2, y2);
}

function txt(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  size = 9,
  color = C.muted,
  bold = false,
  align: 'left' | 'center' | 'right' = 'left'
) {
  doc.setFontSize(size);
  doc.setTextColor(color);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.text(text, x, y, { align });
}

function scoreBar(doc: jsPDF, x: number, y: number, w: number, h: number, score: number) {
  drawRect(doc, x, y, w, h, C.border, 1);
  drawRect(doc, x, y, (score / 100) * w, h, scoreColor(score), 1);
}

function addHeader(doc: jsPDF, tender: Tender, roundNum: number, page: number) {
  const W = doc.internal.pageSize.getWidth();
  drawRect(doc, 0, 0, W, 14, C.primary);
  txt(doc, `ROUND ${roundNum} INTERIM REPORT`, 10, 9, 9, '#ffffff', true);
  txt(doc, tender.title, W / 2, 9, 8, '#ffffff', false, 'center');
  txt(doc, `Page ${page}`, W - 10, 9, 8, '#ffffff', false, 'right');
}

function addFooter(doc: jsPDF, tender: Tender) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  drawLine(doc, 10, H - 14, W - 10, H - 14);
  txt(doc, `Generated ${new Date().toLocaleString('en-GB')} · Tender ID: ${tender.id}`, 10, H - 8, 7, C.muted);
  txt(doc, 'CONFIDENTIAL — For internal use only', W - 10, H - 8, 7, C.muted, false, 'right');
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function exportRoundReportPdf(options: RoundReportOptions): void {
  const { tender, round, scorecards = [], lang = 'en' } = options;
  const locale = lang === 'ro' ? 'ro-RO' : 'en-GB';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 10;
  const CW = W - M * 2;
  let page = 1;
  let y = 22;

  addHeader(doc, tender, round.roundNumber, page);
  addFooter(doc, tender);

  // ── Cover block ─────────────────────────────────────────────────────────────
  drawRect(doc, M, y, CW, 30, C.surface, 3);
  txt(doc, tender.title, M + 6, y + 10, 14, C.text, true);
  txt(doc, `Category: ${tender.category.replace(/-/g, ' ')} · Location: ${tender.location}`, M + 6, y + 18, 8, C.muted);
  txt(doc, `Round ${round.roundNumber} · Period: ${new Date(round.startDate).toLocaleDateString('en-GB')} – ${new Date(round.endDate).toLocaleDateString('en-GB')}`, M + 6, y + 24, 8, C.muted);
  y += 38;

  // Round status badge
  const statusColor = round.status === 'completed' ? C.awarded : round.status === 'active' ? C.primary : C.muted;
  drawRect(doc, M, y, CW, 8, `${statusColor}18`, 2);
  txt(doc, `Round status: ${round.status.toUpperCase()}  ·  Offers received: ${round.offers.length}  ·  Report date: ${new Date().toLocaleDateString('en-GB')}`, M + 6, y + 5.5, 8, statusColor, true);
  y += 14;

  // ── Section 1: Price Comparison Table ─────────────────────────────────────
  txt(doc, 'COMPARATIVE PRICE TABLE', M, y + 5, 9, C.primary, true);
  drawLine(doc, M, y + 7, W - M, y + 7, C.primary, 0.5);
  y += 12;

  if (round.offers.length === 0) {
    txt(doc, 'No offers received in this round.', M + 3, y + 6, 9, C.muted);
    y += 12;
  } else {
    // Sort by amount ascending
    const sortedOffers = [...round.offers].sort((a, b) => a.amount - b.amount);
    const minAmount = sortedOffers[0].amount;
    const maxAmount = sortedOffers[sortedOffers.length - 1].amount;
    const range = maxAmount - minAmount || 1;

    // Table header
    const cols = { rank: M, name: M + 14, amount: M + 80, diff: M + 115, status: M + 145, bar: M + 168 };
    drawRect(doc, M, y, CW, 7, C.surface, 1);
    txt(doc, '#', cols.rank, y + 5, 8, C.muted, true);
    txt(doc, 'Supplier', cols.name, y + 5, 8, C.muted, true);
    txt(doc, 'Amount (€)', cols.amount, y + 5, 8, C.muted, true);
    txt(doc, 'vs. Lowest', cols.diff, y + 5, 8, C.muted, true);
    txt(doc, 'Status', cols.status, y + 5, 8, C.muted, true);
    txt(doc, 'Price Bar', cols.bar, y + 5, 8, C.muted, true);
    y += 9;

    sortedOffers.forEach((offer, idx) => {
      const rowBg = idx % 2 === 0 ? C.bg : C.surface;
      drawRect(doc, M, y, CW, 9, rowBg);

      const rankColor = idx === 0 ? C.rank1 : idx === 1 ? C.rank2 : idx === 2 ? C.rank3 : C.muted;
      txt(doc, rankLabel(idx + 1), cols.rank, y + 6, 7.5, rankColor, true);
      txt(doc, offer.supplierName, cols.name, y + 6, 8, C.text, idx === 0);
      txt(doc, `€${offer.amount.toLocaleString()}`, cols.amount, y + 6, 8, idx === 0 ? C.awarded : C.muted);

      const diffPct = idx === 0 ? '—' : `+${(((offer.amount - minAmount) / minAmount) * 100).toFixed(1)}%`;
      txt(doc, diffPct, cols.diff, y + 6, 8, idx === 0 ? C.awarded : C.warning);

      const statusLabel = offer.status.replace(/-/g, ' ').toUpperCase();
      txt(doc, statusLabel, cols.status, y + 6, 7, C.muted);

      // Bar: visual inverse (cheapest = full bar)
      const barScore = Math.round(100 - ((offer.amount - minAmount) / range) * 60);
      scoreBar(doc, cols.bar, y + 2.5, 26, 3.5, barScore);
      y += 9;
    });
    y += 6;
  }

  // ── Section 2: Selection Criteria scores (if evaluated) ─────────────────────
  const ranked = scorecards.length > 0
    ? [...scorecards]
        .filter(s => s.totalScore !== null)
        .sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0))
        .map((sc, i) => ({ ...sc, rank: i + 1 }))
    : [];

  if (ranked.length > 0) {
    if (y > 220) {
      doc.addPage(); page++;
      addHeader(doc, tender, round.roundNumber, page);
      addFooter(doc, tender);
      y = 22;
    }

    txt(doc, 'EVALUATION SCORECARD — WEIGHTED SCORES', M, y + 5, 9, C.primary, true);
    drawLine(doc, M, y + 7, W - M, y + 7, C.primary, 0.5);
    y += 12;

    // Overall rankings summary
    drawRect(doc, M, y, CW, 7, C.surface, 1);
    txt(doc, 'Rank', M + 2, y + 5, 8, C.muted, true);
    txt(doc, 'Supplier', M + 20, y + 5, 8, C.muted, true);
    txt(doc, 'Amount (€)', M + 90, y + 5, 8, C.muted, true);
    txt(doc, 'Weighted Score', M + 120, y + 5, 8, C.muted, true);
    txt(doc, 'Score Bar', M + 160, y + 5, 8, C.muted, true);
    y += 9;

    ranked.forEach((sc, idx) => {
      const rowBg = idx % 2 === 0 ? C.bg : C.surface;
      drawRect(doc, M, y, CW, 9, rowBg);
      const rankColor = sc.rank === 1 ? C.rank1 : sc.rank === 2 ? C.rank2 : sc.rank === 3 ? C.rank3 : C.muted;
      txt(doc, rankLabel(sc.rank), M + 2, y + 6, 7.5, rankColor, true);
      txt(doc, sc.supplierName, M + 20, y + 6, 8, C.text, sc.rank === 1);
      txt(doc, `€${sc.amount.toLocaleString()}`, M + 90, y + 6, 8, C.muted);
      txt(doc, `${(sc.totalScore ?? 0).toFixed(2)} / 100`, M + 120, y + 6, 8, scoreColor(sc.totalScore ?? 0), true);
      scoreBar(doc, M + 160, y + 2.5, 33, 3.5, sc.totalScore ?? 0);
      y += 9;
    });
    y += 8;

    // ── Per-criterion comparative breakdown ──────────────────────────────────
    if (tender.selectionCriteria.length > 0) {
      txt(doc, 'PER-CRITERION COMPARATIVE EVALUATION', M, y + 5, 9, C.primary, true);
      drawLine(doc, M, y + 7, W - M, y + 7, C.primary, 0.5);
      y += 12;

      for (const criterion of tender.selectionCriteria) {
        if (y > 235) {
          doc.addPage(); page++;
          addHeader(doc, tender, round.roundNumber, page);
          addFooter(doc, tender);
          y = 22;
        }

        // Criterion header
        drawRect(doc, M, y, CW, 10, C.primaryLight, 2);
        txt(doc, `${criterion.name}`, M + 4, y + 4.5, 9, C.primary, true);
        txt(doc, `Weight: ${criterion.weight}%`, W - M - 4, y + 4.5, 8, C.primary, true, 'right');
        if (criterion.description) {
          txt(doc, criterion.description, M + 4, y + 8.5, 7, C.muted);
        }
        y += 13;

        // Column headers
        drawRect(doc, M, y, CW, 6, C.surface, 1);
        txt(doc, 'Supplier', M + 3, y + 4.5, 7.5, C.muted, true);
        txt(doc, 'Score', M + 90, y + 4.5, 7.5, C.muted, true);
        txt(doc, 'Contribution', M + 115, y + 4.5, 7.5, C.muted, true);
        txt(doc, 'Bar', M + 148, y + 4.5, 7.5, C.muted, true);
        txt(doc, 'Justification', M + 163, y + 4.5, 7.5, C.muted, true);
        y += 7;

        ranked.forEach((sc, idx) => {
          const cs = sc.scores.find(s => s.criterionId === criterion.id);
          if (!cs) return;

          const rowH = cs.justification ? 16 : 9;
          if (y + rowH > 275) {
            doc.addPage(); page++;
            addHeader(doc, tender, round.roundNumber, page);
            addFooter(doc, tender);
            y = 22;
          }

          drawRect(doc, M, y, CW, rowH, idx % 2 === 0 ? C.bg : C.surface);
          drawLine(doc, M, y + rowH, W - M, y + rowH);

          txt(doc, sc.supplierName, M + 3, y + 6, 8, C.text, sc.rank === 1);
          const s = cs.score ?? 0;
          txt(doc, `${s}/100`, M + 90, y + 6, 8, scoreColor(s), true);
          txt(doc, `${((s * cs.weight) / 100).toFixed(2)} pts`, M + 115, y + 6, 8, C.muted);
          scoreBar(doc, M + 148, y + 2.5, 13, 3.5, s);

          if (cs.justification) {
            const lines = doc.splitTextToSize(cs.justification, 36);
            txt(doc, lines[0] ?? '', M + 163, y + 6, 6.5, C.muted);
            if (lines[1]) txt(doc, lines[1], M + 163, y + 11, 6.5, C.muted);
          }
          y += rowH;
        });
        y += 6;
      }
    }

    // ── Detailed per-offer scorecards with justifications ────────────────────
    txt(doc, 'DETAILED SCORECARDS WITH JUSTIFICATIONS', M, y + 5, 9, C.primary, true);
    drawLine(doc, M, y + 7, W - M, y + 7, C.primary, 0.5);
    y += 12;

    for (const sc of ranked) {
      if (y > 230) {
        doc.addPage(); page++;
        addHeader(doc, tender, round.roundNumber, page);
        addFooter(doc, tender);
        y = 22;
      }

      const headerBg = sc.rank === 1 ? C.awardedLight : C.primaryLight;
      const headerColor = sc.rank === 1 ? C.awarded : C.primary;
      drawRect(doc, M, y, CW, 14, headerBg, 2);
      txt(doc, `${rankLabel(sc.rank)}  ${sc.supplierName}`, M + 5, y + 9, 11, headerColor, true);
      txt(doc, `€${sc.amount.toLocaleString()}`, W - M - 5, y + 6, 8, C.muted, false, 'right');
      txt(doc, `${(sc.totalScore ?? 0).toFixed(2)} pts`, W - M - 5, y + 12, 11, scoreColor(sc.totalScore ?? 0), true, 'right');
      y += 18;

      // Criteria table
      drawRect(doc, M, y, CW, 6, C.surface);
      txt(doc, 'Criterion', M + 3, y + 4.5, 7.5, C.muted, true);
      txt(doc, 'Wt%', M + 78, y + 4.5, 7.5, C.muted, true);
      txt(doc, 'Score', M + 94, y + 4.5, 7.5, C.muted, true);
      txt(doc, 'Contrib.', M + 113, y + 4.5, 7.5, C.muted, true);
      txt(doc, 'Bar', M + 133, y + 4.5, 7.5, C.muted, true);
      y += 7;

      for (const cs of sc.scores) {
        if (y > 255) {
          doc.addPage(); page++;
          addHeader(doc, tender, round.roundNumber, page);
          addFooter(doc, tender);
          y = 22;
        }
        const rowH = cs.justification ? 18 : 9;
        drawRect(doc, M, y, CW, rowH, C.bg);
        drawLine(doc, M, y + rowH, W - M, y + rowH);

        txt(doc, cs.criterionName, M + 3, y + 6, 8, C.text);
        txt(doc, `${cs.weight}%`, M + 78, y + 6, 8, C.muted);
        const s = cs.score ?? 0;
        txt(doc, `${s}/100`, M + 94, y + 6, 8, scoreColor(s), true);
        txt(doc, `${((s * cs.weight) / 100).toFixed(2)} pts`, M + 113, y + 6, 8, C.muted);
        scoreBar(doc, M + 133, y + 2.5, 28, 3.5, s);

        if (cs.justification) {
          doc.setFontSize(7);
          doc.setTextColor(C.muted);
          doc.setFont('helvetica', 'italic');
          const lines = doc.splitTextToSize(`↳ ${cs.justification}`, CW - 8);
          doc.text(lines[0] ?? '', M + 3, y + 12);
          if (lines[1]) doc.text(lines[1], M + 3, y + 16);
        }
        y += rowH;
      }

      // Weighted total row
      drawRect(doc, M, y, CW, 8, sc.rank === 1 ? C.awardedLight : C.surface);
      txt(doc, 'WEIGHTED TOTAL SCORE', M + 3, y + 5.5, 8, C.text, true);
      txt(doc, `${(sc.totalScore ?? 0).toFixed(2)} / 100`, W - M - 5, y + 6, 10, scoreColor(sc.totalScore ?? 0), true, 'right');
      y += 14;
    }
  }

  // ── Section 3: Offers without evaluation (price only) ─────────────────────
  if (ranked.length === 0 && round.offers.length > 0) {
    if (y > 220) {
      doc.addPage(); page++;
      addHeader(doc, tender, round.roundNumber, page);
      addFooter(doc, tender);
      y = 22;
    }
    txt(doc, 'NOTE: No evaluation scores available for this round.', M, y + 5, 8, C.warning, true);
    txt(doc, 'Evaluation scores must be entered in the AI Evaluation tab to populate comparative criteria scores.', M, y + 11, 8, C.muted);
    y += 18;
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  const safeTitle = tender.title.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30);
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`round-${round.roundNumber}-report-${safeTitle}-${dateStr}.pdf`);
}
