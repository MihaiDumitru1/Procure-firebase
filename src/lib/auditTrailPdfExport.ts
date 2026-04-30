import jsPDF from 'jspdf';
import { Tender, TenderRound, EvaluationAuditEntry } from '@/types/tender';

// ─── Audit event types (broader than evaluation-only) ─────────────────────────
export type AuditEventType =
  | 'tender_created'
  | 'tender_published'
  | 'tender_closed'
  | 'invites_sent'
  | 'nda_accepted'
  | 'round_opened'
  | 'round_closed'
  | 'offer_submitted'
  | 'offer_shortlisted'
  | 'offer_rejected'
  | 'question_asked'
  | 'answer_broadcast'
  | 'ai_suggested'
  | 'ai_applied'
  | 'score_set'
  | 'winner_selected'
  | 'evaluation_reset';

export interface AuditEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  actor: string;
  detail: string;
  /** Optional round number for round-scoped events */
  roundNumber?: number;
}

// ─── Build synthetic audit trail from tender data ─────────────────────────────
export function buildTenderAuditTrail(
  tender: Tender,
  evaluationAuditLog: EvaluationAuditEntry[] = []
): AuditEntry[] {
  const entries: AuditEntry[] = [];
  let seq = 0;

  const add = (
    timestamp: string,
    eventType: AuditEventType,
    actor: string,
    detail: string,
    roundNumber?: number
  ) => {
    entries.push({ id: `audit-${seq++}`, timestamp, eventType, actor, detail, roundNumber });
  };

  // 1. Tender created
  add(
    `${tender.createdAt}T08:30:00`,
    'tender_created',
    'Sarah Mitchell (App Admin)',
    `Tender created: "${tender.title}" — Reference: ${tender.referenceCode ?? tender.id}`
  );

  // 2. Invites sent (simulate +2 days)
  const createdDate = new Date(tender.createdAt);
  const inviteDate = new Date(createdDate.getTime() + 2 * 86400000);
  add(
    inviteDate.toISOString(),
    'invites_sent',
    'Sarah Mitchell (App Admin)',
    `Invitations sent to ${tender.rounds.length > 0 ? 'registered suppliers for category: ' + tender.category.replace(/-/g, ' ') : 'selected suppliers'}`
  );

  // 3. NDA acceptances (simulate before participation deadline)
  const ndaDate = new Date(tender.participationDeadline);
  ndaDate.setDate(ndaDate.getDate() - 3);
  const ndaSuppliers = ['CleanPro Services Ltd', 'SecureGuard Inc', 'GreenScape Solutions'];
  ndaSuppliers.slice(0, 3).forEach((name, i) => {
    const d = new Date(ndaDate.getTime() + i * 3600000 * 24);
    add(d.toISOString(), 'nda_accepted', name, `NDA signed and accepted by ${name}`);
  });

  // 4. Rounds
  for (const round of tender.rounds) {
    // Round opened
    add(
      `${round.startDate}T09:00:00`,
      'round_opened',
      'Sarah Mitchell (App Admin)',
      `Round ${round.roundNumber} submission window opened — Deadline: ${round.endDate}`,
      round.roundNumber
    );

    // Offers submitted
    for (const offer of round.offers) {
      add(
        offer.submittedAt + 'T10:00:00',
        'offer_submitted',
        offer.supplierName,
        `Offer submitted by ${offer.supplierName} — Amount: €${offer.amount.toLocaleString('en-GB')} — Round ${round.roundNumber}`,
        round.roundNumber
      );
    }

    // Shortlisted / rejected
    for (const offer of round.offers) {
      if (offer.status === 'shortlisted') {
        const d = new Date(round.endDate + 'T14:00:00');
        d.setDate(d.getDate() + 1);
        add(
          d.toISOString(),
          'offer_shortlisted',
          'Marco Rossi (Tender Organizer)',
          `Offer from ${offer.supplierName} shortlisted for Round ${round.roundNumber + 1}`,
          round.roundNumber
        );
      }
      if (offer.status === 'rejected') {
        const d = new Date(round.endDate + 'T15:00:00');
        d.setDate(d.getDate() + 1);
        add(
          d.toISOString(),
          'offer_rejected',
          'Marco Rossi (Tender Organizer)',
          `Offer from ${offer.supplierName} rejected after Round ${round.roundNumber} review`,
          round.roundNumber
        );
      }
      if (offer.status === 'winner') {
        const d = new Date(round.endDate + 'T16:00:00');
        d.setDate(d.getDate() + 2);
        add(
          d.toISOString(),
          'winner_selected',
          'Marco Rossi (Tender Organizer)',
          `Contract awarded to ${offer.supplierName} — Amount: €${offer.amount.toLocaleString('en-GB')}`,
          round.roundNumber
        );
      }
    }

    // Round closed
    if (round.status === 'completed') {
      add(
        `${round.endDate}T17:00:00`,
        'round_closed',
        'System',
        `Round ${round.roundNumber} submission window closed`,
        round.roundNumber
      );
    }
  }

  // 5. Q&A events
  for (const q of tender.questions) {
    add(
      q.askedAt + 'T11:00:00',
      'question_asked',
      'Supplier (anonymous)',
      `Question submitted for clarification`
    );
    if (q.answer && q.answeredAt) {
      add(
        q.answeredAt + 'T14:30:00',
        'answer_broadcast',
        q.answeredBy ?? 'Organizer',
        `Answer broadcast to all participants (anonymous)`
      );
    }
  }

  // 6. Merge evaluation audit log
  for (const entry of evaluationAuditLog) {
    entries.push({
      id: entry.id,
      timestamp: entry.timestamp,
      eventType: entry.action as AuditEventType,
      actor: entry.actor,
      detail: entry.detail,
    });
  }

  // Sort chronologically
  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return entries;
}

// ─── Color palette ────────────────────────────────────────────────────────────
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
};

const EVENT_COLORS: Record<string, string> = {
  tender_created: C.primary,
  tender_published: C.primary,
  tender_closed: C.muted,
  invites_sent: C.primary,
  nda_accepted: C.awarded,
  round_opened: C.primary,
  round_closed: C.muted,
  offer_submitted: C.awarded,
  offer_shortlisted: C.awarded,
  offer_rejected: C.destructive,
  question_asked: C.muted,
  answer_broadcast: C.primary,
  ai_suggested: C.primary,
  ai_applied: C.primary,
  score_set: C.muted,
  winner_selected: C.awarded,
  evaluation_reset: C.destructive,
};

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

function addHeader(
  doc: jsPDF,
  tender: Tender,
  title: string,
  page: number,
  lang: 'en' | 'ro'
) {
  const W = doc.internal.pageSize.getWidth();
  drawRect(doc, 0, 0, W, 14, C.primary);
  txt(doc, title, 10, 9, 9, '#ffffff', true);
  txt(doc, tender.referenceCode ?? tender.id, W / 2, 9, 8, '#ffffff', false, 'center');
  txt(doc, `${lang === 'ro' ? 'Pagina' : 'Page'} ${page}`, W - 10, 9, 8, '#ffffff', false, 'right');
}

function addFooter(doc: jsPDF, tender: Tender, lang: 'en' | 'ro') {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  drawLine(doc, 10, H - 14, W - 10, H - 14);
  const dateLabel = lang === 'ro' ? 'Generat la' : 'Generated on';
  const idLabel = lang === 'ro' ? 'Referință' : 'Reference';
  const confLabel = lang === 'ro' ? 'CONFIDENȚIAL — Numai pentru uz intern' : 'CONFIDENTIAL — For internal use only';
  txt(doc, `${dateLabel} ${new Date().toLocaleString(lang === 'ro' ? 'ro-RO' : 'en-GB')} · ${idLabel}: ${tender.referenceCode ?? tender.id}`, 10, H - 8, 7, C.muted);
  txt(doc, confLabel, W - 10, H - 8, 7, C.muted, false, 'right');
}

function formatEventType(eventType: string, lang: 'en' | 'ro'): string {
  const labels: Record<string, { en: string; ro: string }> = {
    tender_created:     { en: 'TENDER CREATED',     ro: 'LICITAȚIE CREATĂ' },
    tender_published:   { en: 'PUBLISHED',           ro: 'PUBLICATĂ' },
    tender_closed:      { en: 'CLOSED',              ro: 'ÎNCHISĂ' },
    invites_sent:       { en: 'INVITES SENT',        ro: 'INVITAȚII TRIMISE' },
    nda_accepted:       { en: 'NDA ACCEPTED',        ro: 'NDA ACCEPTAT' },
    round_opened:       { en: 'ROUND OPENED',        ro: 'RUNDĂ DESCHISĂ' },
    round_closed:       { en: 'ROUND CLOSED',        ro: 'RUNDĂ ÎNCHISĂ' },
    offer_submitted:    { en: 'OFFER SUBMITTED',     ro: 'OFERTĂ DEPUSĂ' },
    offer_shortlisted:  { en: 'SHORTLISTED',         ro: 'ACCEPTATĂ' },
    offer_rejected:     { en: 'REJECTED',            ro: 'RESPINSĂ' },
    question_asked:     { en: 'QUESTION',            ro: 'ÎNTREBARE' },
    answer_broadcast:   { en: 'ANSWER BROADCAST',   ro: 'RĂSPUNS TRANSMIS' },
    ai_suggested:       { en: 'AI SUGGESTED',        ro: 'AI SUGERAT' },
    ai_applied:         { en: 'AI APPLIED',          ro: 'AI APLICAT' },
    score_set:          { en: 'SCORE SET',           ro: 'SCOR SETAT' },
    winner_selected:    { en: 'WINNER SELECTED',     ro: 'CÂȘTIGĂTOR SELECTAT' },
    evaluation_reset:   { en: 'EVAL RESET',          ro: 'RESET EVALUARE' },
  };
  return labels[eventType]?.[lang] ?? eventType.replace(/_/g, ' ').toUpperCase();
}

// ─── Per-round audit PDF ───────────────────────────────────────────────────────
export function exportRoundAuditPdf(
  tender: Tender,
  round: TenderRound,
  allEntries: AuditEntry[],
  lang: 'en' | 'ro' = 'en'
): void {
  const roundEntries = allEntries.filter(
    e => !e.roundNumber || e.roundNumber === round.roundNumber
  );

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 10;
  const CW = W - M * 2;
  let page = 1;
  let y = 22;

  const headerTitle = lang === 'ro'
    ? `JURNAL AUDIT — RUNDA ${round.roundNumber}`
    : `AUDIT TRAIL — ROUND ${round.roundNumber}`;

  addHeader(doc, tender, headerTitle, page, lang);
  addFooter(doc, tender, lang);

  // Cover block
  drawRect(doc, M, y, CW, 28, C.surface, 3);
  txt(doc, tender.title, M + 6, y + 9, 14, C.text, true);
  txt(doc, `${tender.referenceCode ?? tender.id}`, M + 6, y + 16, 9, C.primary, true);
  txt(doc, `${lang === 'ro' ? 'Runda' : 'Round'} ${round.roundNumber} · ${new Date(round.startDate).toLocaleDateString(lang === 'ro' ? 'ro-RO' : 'en-GB')} – ${new Date(round.endDate).toLocaleDateString(lang === 'ro' ? 'ro-RO' : 'en-GB')}`, M + 6, y + 23, 8, C.muted);
  y += 36;

  const sectionLabel = lang === 'ro' ? 'ACTIVITĂȚI ÎNREGISTRATE — RUNDA ' : 'RECORDED ACTIVITIES — ROUND ';
  txt(doc, sectionLabel + round.roundNumber, M, y + 5, 9, C.primary, true);
  drawLine(doc, M, y + 7, W - M, y + 7, C.primary, 0.5);
  y += 14;

  _renderAuditRows(doc, roundEntries, M, CW, W, y, page, tender, round.roundNumber, lang);

  const safeTitle = tender.title.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30);
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`audit-round-${round.roundNumber}-${safeTitle}-${dateStr}.pdf`);
}

// ─── Full tender audit PDF ────────────────────────────────────────────────────
export function exportFullAuditPdf(
  tender: Tender,
  allEntries: AuditEntry[],
  lang: 'en' | 'ro' = 'en'
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 10;
  const CW = W - M * 2;
  let page = 1;
  let y = 22;

  const headerTitle = lang === 'ro' ? 'JURNAL COMPLET DE AUDIT' : 'FULL TENDER AUDIT TRAIL';

  addHeader(doc, tender, headerTitle, page, lang);
  addFooter(doc, tender, lang);

  // Cover block
  drawRect(doc, M, y, CW, 34, C.surface, 3);
  txt(doc, tender.title, M + 6, y + 9, 14, C.text, true);
  txt(doc, `${tender.referenceCode ?? tender.id}`, M + 6, y + 17, 9, C.primary, true);
  txt(doc, `${tender.category.replace(/-/g, ' ')} · ${tender.location}`, M + 6, y + 24, 8, C.muted);
  const reportDateLabel = lang === 'ro' ? 'Data raportului' : 'Report date';
  txt(doc, `${reportDateLabel}: ${new Date().toLocaleDateString(lang === 'ro' ? 'ro-RO' : 'en-GB')} · ${lang === 'ro' ? 'Total activități' : 'Total activities'}: ${allEntries.length}`, M + 6, y + 30, 8, C.muted);
  y += 42;

  // Summary stats block
  const statBg = C.primaryLight;
  const roundCount = tender.rounds.length;
  const offerCount = tender.rounds.reduce((acc, r) => acc + r.offers.length, 0);
  const questionCount = tender.questions.length;

  drawRect(doc, M, y, CW, 12, statBg, 2);
  const statsLabel = lang === 'ro'
    ? `${roundCount} runde  ·  ${offerCount} oferte  ·  ${questionCount} întrebări  ·  Status: ${tender.status.toUpperCase()}`
    : `${roundCount} rounds  ·  ${offerCount} offers  ·  ${questionCount} questions  ·  Status: ${tender.status.toUpperCase()}`;
  txt(doc, statsLabel, W / 2, y + 8, 9, C.primary, true, 'center');
  y += 20;

  const sectionLabel = lang === 'ro' ? 'CRONOLOGIE COMPLETĂ A ACTIVITĂȚILOR' : 'COMPLETE ACTIVITY TIMELINE';
  txt(doc, sectionLabel, M, y + 5, 9, C.primary, true);
  drawLine(doc, M, y + 7, W - M, y + 7, C.primary, 0.5);
  y += 14;

  _renderAuditRows(doc, allEntries, M, CW, W, y, page, tender, undefined, lang);

  const safeTitle = tender.title.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30);
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`audit-full-${safeTitle}-${dateStr}.pdf`);
}

// ─── Shared row renderer ──────────────────────────────────────────────────────
function _renderAuditRows(
  doc: jsPDF,
  entries: AuditEntry[],
  M: number,
  CW: number,
  W: number,
  startY: number,
  startPage: number,
  tender: Tender,
  roundNumber: number | undefined,
  lang: 'en' | 'ro'
) {
  let y = startY;
  let page = startPage;
  const headerTitle = roundNumber !== undefined
    ? (lang === 'ro' ? `JURNAL AUDIT — RUNDA ${roundNumber}` : `AUDIT TRAIL — ROUND ${roundNumber}`)
    : (lang === 'ro' ? 'JURNAL COMPLET DE AUDIT' : 'FULL TENDER AUDIT TRAIL');

  if (entries.length === 0) {
    const noDataLabel = lang === 'ro' ? 'Nu au fost înregistrate activități.' : 'No audit entries recorded yet.';
    txt(doc, noDataLabel, M + 3, y + 6, 9, C.muted);
    return;
  }

  // Column headers
  drawRect(doc, M, y, CW, 7, C.surface, 1);
  const hTimestamp = lang === 'ro' ? 'Dată/Oră' : 'Timestamp';
  const hAction = lang === 'ro' ? 'Acțiune' : 'Action';
  const hActor = lang === 'ro' ? 'Actor' : 'Actor';
  const hDetail = lang === 'ro' ? 'Detaliu' : 'Detail';
  txt(doc, '#', M + 2, y + 5, 7.5, C.muted, true);
  txt(doc, hTimestamp, M + 10, y + 5, 7.5, C.muted, true);
  txt(doc, hAction, M + 46, y + 5, 7.5, C.muted, true);
  txt(doc, hActor, M + 86, y + 5, 7.5, C.muted, true);
  txt(doc, hDetail, M + 130, y + 5, 7.5, C.muted, true);
  y += 9;

  entries.forEach((entry, idx) => {
    const detailLines = doc.splitTextToSize(entry.detail, 62);
    const rowH = detailLines.length > 1 ? 14 : 9;

    if (y + rowH > 265) {
      doc.addPage();
      page++;
      addHeader(doc, tender, headerTitle, page, lang);
      addFooter(doc, tender, lang);
      y = 22;
    }

    const rowBg = idx % 2 === 0 ? C.bg : C.surface;
    drawRect(doc, M, y, CW, rowH, rowBg);
    drawLine(doc, M, y + rowH, W - M, y + rowH);

    // Seq number
    txt(doc, `${idx + 1}.`, M + 2, y + 6, 7, C.muted);

    // Timestamp
    const ts = new Date(entry.timestamp);
    const dateStr = ts.toLocaleDateString(lang === 'ro' ? 'ro-RO' : 'en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const timeStr = ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    txt(doc, dateStr, M + 10, y + 5.5, 7, C.muted);
    txt(doc, timeStr, M + 10, y + 10.5, 6.5, C.muted);

    // Action badge
    const evColor = EVENT_COLORS[entry.eventType] ?? C.muted;
    const evLabel = formatEventType(entry.eventType, lang);
    const badgeW = 36;
    drawRect(doc, M + 46, y + 1.5, badgeW, 6, `${evColor}22`, 1);
    doc.setFontSize(5.5);
    doc.setTextColor(evColor);
    doc.setFont('helvetica', 'bold');
    doc.text(evLabel, M + 46 + badgeW / 2, y + 5.5, { align: 'center' });

    // Actor
    const actorLines = doc.splitTextToSize(entry.actor, 38);
    txt(doc, actorLines[0] ?? '', M + 86, y + 6, 7, C.text);
    if (actorLines[1]) txt(doc, actorLines[1], M + 86, y + 10.5, 6.5, C.muted);

    // Detail
    txt(doc, detailLines[0] ?? '', M + 130, y + 6, 7, C.text);
    if (detailLines[1]) txt(doc, detailLines[1], M + 130, y + 10.5, 6.5, C.muted);

    y += rowH;
  });
}
