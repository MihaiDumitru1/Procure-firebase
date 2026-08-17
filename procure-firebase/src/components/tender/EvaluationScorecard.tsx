import { useState, useCallback } from 'react';
import {
  Sparkles, Trophy, RotateCcw, Info, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Clock, BarChart3, Medal, FileDown
} from 'lucide-react';
import { Tender, OfferScorecard, CriterionScore, EvaluationAuditEntry, AiEvaluationSuggestion } from '@/types/tender';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { exportEvaluationPdf } from '@/lib/evaluationPdfExport';
import { exportRoundReportPdf } from '@/lib/roundReportPdfExport';
import { useLanguage } from '@/i18n/LanguageContext';
import { dataProvider } from '@/data-access';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EvaluationScorecardProps {
  tender: Tender;
  onWinnerSelected?: (offerId: string, supplierName: string, amount: number) => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function computeTotal(scores: CriterionScore[]): number | null {
  if (scores.some(s => s.score === null)) return null;
  return scores.reduce((sum, s) => sum + (s.score! * s.weight) / 100, 0);
}

function buildInitialScorecards(tender: Tender): OfferScorecard[] {
  const offerMap = new Map<string, (typeof tender.rounds[0]['offers'][0])>();
  for (const round of tender.rounds) {
    for (const offer of round.offers) {
      if (offer.status !== 'rejected') {
        const existing = offerMap.get(offer.supplierId);
        if (!existing || offer.round > existing.round) {
          offerMap.set(offer.supplierId, offer);
        }
      }
    }
  }

  return Array.from(offerMap.values()).map(offer => ({
    offerId: offer.id,
    supplierName: offer.supplierName,
    amount: offer.amount,
    totalScore: null,
    scores: tender.selectionCriteria.map(c => ({
      criterionId: c.id,
      criterionName: c.name,
      weight: c.weight,
      score: null,
      aiSuggested: null,
      justification: '',
    })),
  }));
}

// ─── Real AI evaluation via API ───────────────────────────────────────────────

async function fetchAiEvaluation(
  scorecards: OfferScorecard[],
  tender: Tender
): Promise<AiEvaluationSuggestion[]> {
  const offers = scorecards.map(sc => {
    const allOffers = tender.rounds.flatMap(r => r.offers);
    const latestOffer = allOffers
      .filter(o => o.supplierId === sc.offerId.split('-')[0] || o.id === sc.offerId)
      .sort((a, b) => b.round - a.round)[0];
    const documentNames = latestOffer?.documents.map(d => d.name) ?? [];
    const round = latestOffer?.round ?? 1;
    return {
      offerId: sc.offerId,
      supplierName: sc.supplierName,
      amount: sc.amount,
      documentNames,
      round,
    };
  });

  const result = await dataProvider.ai.evaluateOffers({
    tenderTitle: tender.title,
    tenderDescription: tender.description,
    tenderCategory: tender.category,
    selectionCriteria: tender.selectionCriteria,
    offers,
    currency: 'EUR',
  });

  return result.evaluations as AiEvaluationSuggestion[];
}

// ─── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ value, aiValue }: { value: number | null; aiValue?: number | null }) {
  const pct = value !== null ? value : 0;
  const color =
    pct >= 80 ? 'bg-status-awarded' :
    pct >= 60 ? 'bg-status-active' :
    pct >= 40 ? 'bg-yellow-500' : 'bg-destructive';

  return (
    <div className="relative h-2 bg-muted rounded-full overflow-visible">
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${pct}%` }}
      />
      {aiValue !== null && aiValue !== undefined && value === null && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-primary bg-background"
          style={{ left: `calc(${aiValue}% - 6px)` }}
          title={`AI suggestion: ${aiValue}`}
        />
      )}
    </div>
  );
}

// ─── Rank Medal ───────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = {
    1: 'bg-yellow-400/20 text-yellow-600 border-yellow-400/40',
    2: 'bg-slate-300/30 text-slate-600 border-slate-300/60',
    3: 'bg-orange-400/20 text-orange-600 border-orange-400/40',
  };
  const labels: Record<number, string> = { 1: '🥇 1st', 2: '🥈 2nd', 3: '🥉 3rd' };
  return (
    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', colors[rank] ?? 'bg-muted text-muted-foreground border-border')}>
      {labels[rank] ?? `#${rank}`}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function EvaluationScorecard({ tender, onWinnerSelected }: EvaluationScorecardProps) {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [scorecards, setScorecards] = useState<OfferScorecard[]>(() => buildInitialScorecards(tender));
  const [aiSuggestions, setAiSuggestions] = useState<AiEvaluationSuggestion[] | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [expandedOffer, setExpandedOffer] = useState<string | null>(scorecards[0]?.offerId ?? null);
  const [auditLog, setAuditLog] = useState<EvaluationAuditEntry[]>([]);
  const [confirmWinner, setConfirmWinner] = useState<{ offerId: string; supplierName: string; amount: number } | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [awardedWinner, setAwardedWinner] = useState<{ name: string; amount: number } | null>(null);

  const rankedScorecards = [...scorecards]
    .map(sc => ({ ...sc, totalScore: computeTotal(sc.scores) }))
    .sort((a, b) => {
      if (a.totalScore === null && b.totalScore === null) return 0;
      if (a.totalScore === null) return 1;
      if (b.totalScore === null) return -1;
      return b.totalScore - a.totalScore;
    })
    .map((sc, idx) => ({ ...sc, rank: sc.totalScore !== null ? idx + 1 : undefined }));

  const addAudit = useCallback((action: EvaluationAuditEntry['action'], detail: string) => {
    setAuditLog(prev => [
      {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action,
        actor: 'Marco Rossi (Tender Organizer)',
        detail,
      },
      ...prev,
    ]);
  }, []);

  const updateScore = useCallback((offerId: string, criterionId: string, score: number, justification?: string) => {
    setScorecards(prev => prev.map(sc => {
      if (sc.offerId !== offerId) return sc;
      return {
        ...sc,
        scores: sc.scores.map(s =>
          s.criterionId !== criterionId ? s :
          { ...s, score, justification: justification ?? s.justification }
        ),
      };
    }));
    addAudit('score_set', `Score set: ${score}/100 for ${scorecards.find(s => s.offerId === offerId)?.supplierName} — criterion "${tender.selectionCriteria.find(c => c.id === criterionId)?.name}"`);
  }, [scorecards, tender.selectionCriteria, addAudit]);

  const applyAiSuggestion = useCallback((offerId: string) => {
    if (!aiSuggestions) return;
    const suggestion = aiSuggestions.find(s => s.offerId === offerId);
    if (!suggestion) return;

    setScorecards(prev => prev.map(sc => {
      if (sc.offerId !== offerId) return sc;
      return {
        ...sc,
        scores: sc.scores.map(s => {
          const aiScore = suggestion.scores.find(as => as.criterionId === s.criterionId);
          if (!aiScore) return s;
          return { ...s, score: aiScore.score, aiSuggested: aiScore.score, justification: aiScore.justification };
        }),
      };
    }));
    addAudit('ai_applied', `AI scores applied for offer: ${suggestion.supplierName}`);
    toast({ title: 'AI scores applied', description: `AI scores applied for ${suggestion.supplierName}.` });
  }, [aiSuggestions, addAudit, toast]);

  const applyAllAiSuggestions = useCallback(() => {
    if (!aiSuggestions) return;
    setScorecards(prev => prev.map(sc => {
      const suggestion = aiSuggestions.find(s => s.offerId === sc.offerId);
      if (!suggestion) return sc;
      return {
        ...sc,
        scores: sc.scores.map(s => {
          const aiScore = suggestion.scores.find(as => as.criterionId === s.criterionId);
          if (!aiScore) return s;
          return { ...s, score: aiScore.score, aiSuggested: aiScore.score, justification: aiScore.justification };
        }),
      };
    }));
    addAudit('ai_applied', 'AI scores applied for all offers');
    toast({ title: 'AI scores applied', description: 'All AI-suggested scores have been applied.' });
  }, [aiSuggestions, addAudit, toast]);

  const runAiEvaluation = async () => {
    setIsAiLoading(true);
    addAudit('ai_suggested', 'AI evaluation initiated for all offers');
    try {
      const suggestions = await fetchAiEvaluation(scorecards, tender);
      setAiSuggestions(suggestions);
      setScorecards(prev => prev.map(sc => {
        const sug = suggestions.find(s => s.offerId === sc.offerId);
        if (!sug) return sc;
        return {
          ...sc,
          scores: sc.scores.map(s => {
            const aiScore = sug.scores.find(as => as.criterionId === s.criterionId);
            return aiScore ? { ...s, aiSuggested: aiScore.score } : s;
          }),
        };
      }));
      toast({
        title: t.evaluation.aiComplete,
        description: t.evaluation.aiCompleteDesc,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI evaluation failed';
      toast({ title: 'AI Evaluation Failed', description: message, variant: 'destructive' });
      addAudit('ai_suggested', `AI evaluation failed: ${message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const resetEvaluation = () => {
    setScorecards(buildInitialScorecards(tender));
    setAiSuggestions(null);
    addAudit('evaluation_reset', 'Evaluation fully reset');
    toast({ title: 'Evaluation reset', description: 'All scores have been cleared.' });
  };

  const allScored = rankedScorecards.every(sc => sc.totalScore !== null);
  const aiRecommended = aiSuggestions?.find(s => s.recommendWinner);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* ── Header toolbar ─────────────────────────────────────────────────── */}
        <div className="bg-card rounded-lg border border-border p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              AI-Assisted Offer Evaluation
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rankedScorecards.filter(s => s.totalScore !== null).length}/{rankedScorecards.length} offers fully evaluated
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={resetEvaluation}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowAudit(v => !v)}
            >
              <Clock className="h-3.5 w-3.5" />
              Audit Trail
              {auditLog.length > 0 && (
                <span className="ml-1 text-xs bg-muted text-muted-foreground px-1.5 rounded-full">
                  {auditLog.length}
                </span>
              )}
            </Button>

            {/* Round interim report export */}
            {tender.rounds.length > 0 && (
              <div className="flex items-center gap-1">
                {tender.rounds.map(round => (
                  <Button
                    key={round.id}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      exportRoundReportPdf({
                        tender,
                        round,
                        scorecards: rankedScorecards.filter(s => s.totalScore !== null),
                      })
                    }
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Round {round.roundNumber} Report
                  </Button>
                ))}
              </div>
            )}

            {/* Final evaluation PDF */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={rankedScorecards.filter(s => s.totalScore !== null).length === 0}
              onClick={() =>
                exportEvaluationPdf({
                  tender,
                  scorecards: rankedScorecards,
                  auditLog,
                  winnerName: awardedWinner?.name ?? null,
                  winnerAmount: awardedWinner?.amount ?? null,
                })
              }
            >
              <FileDown className="h-3.5 w-3.5" />
              Final Report PDF
            </Button>

            {aiSuggestions && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 border-primary/40 text-primary hover:bg-primary/5"
                onClick={applyAllAiSuggestions}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Apply All AI Scores
              </Button>
            )}
            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-sm"
              onClick={runAiEvaluation}
              disabled={isAiLoading}
            >
              {isAiLoading ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  AI analysing...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  {aiSuggestions ? 'Re-evaluate with AI' : 'Evaluate with AI'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── AI recommendation banner ───────────────────────────────────────── */}
        {aiSuggestions && aiRecommended && (
          <div className="flex items-center gap-4 p-4 rounded-xl border border-primary/30 bg-primary/5">
            <div className="p-2 rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-0.5">AI Recommendation</p>
              <p className="font-semibold text-foreground">{aiRecommended.supplierName}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {aiSuggestions.find(s => s.offerId === aiRecommended.offerId)?.overallComment}
              </p>
            </div>
            <Badge variant="outline" className="text-primary border-primary/30 shrink-0">Winner Candidate</Badge>
          </div>
        )}

        {/* ── Final ranking summary ──────────────────────────────────────────── */}
        {allScored && (
          <div className="bg-card rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Medal className="h-4 w-4 text-yellow-500" />
              Final Ranking
            </h4>
            <div className="space-y-2">
              {rankedScorecards.map(sc => (
                <div key={sc.offerId} className="flex items-center gap-3">
                  {sc.rank && <RankBadge rank={sc.rank} />}
                  <span className="text-sm font-medium text-foreground flex-1">{sc.supplierName}</span>
                  <span className="text-xs text-muted-foreground">€{sc.amount.toLocaleString()}</span>
                  <span className={cn(
                    'text-sm font-bold tabular-nums',
                    sc.totalScore! >= 80 ? 'text-status-awarded' : sc.totalScore! >= 65 ? 'text-status-active' : 'text-destructive'
                  )}>
                    {sc.totalScore?.toFixed(1)}/100
                  </span>
                  {sc.rank === 1 && !tender.rounds.flatMap(r => r.offers).find(o => o.status === 'winner') && (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-status-awarded hover:bg-status-awarded/90 text-white"
                      onClick={() => setConfirmWinner({ offerId: sc.offerId, supplierName: sc.supplierName, amount: sc.amount })}
                    >
                      <Trophy className="h-3.5 w-3.5" />
                      Select Winner
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Per-offer scorecards ───────────────────────────────────────────── */}
        {rankedScorecards.map(sc => {
          const isExpanded = expandedOffer === sc.offerId;
          const completedCount = sc.scores.filter(s => s.score !== null).length;
          const aiSug = aiSuggestions?.find(s => s.offerId === sc.offerId);

          return (
            <div
              key={sc.offerId}
              className={cn(
                'bg-card rounded-lg border transition-all',
                sc.rank === 1 && allScored ? 'border-status-awarded/50' : 'border-border'
              )}
            >
              <button
                className="w-full flex items-center gap-3 p-4 text-left"
                onClick={() => setExpandedOffer(isExpanded ? null : sc.offerId)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{sc.supplierName}</span>
                    {sc.rank !== undefined && <RankBadge rank={sc.rank} />}
                    {aiSug?.recommendWinner && (
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20" variant="outline">
                        <Sparkles className="h-3 w-3 mr-1" />AI recommends
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-muted-foreground">€{sc.amount.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">
                      {completedCount}/{sc.scores.length} criteria evaluated
                    </span>
                    {sc.totalScore !== null && (
                      <span className={cn(
                        'text-xs font-bold',
                        sc.totalScore >= 80 ? 'text-status-awarded' : sc.totalScore >= 60 ? 'text-status-active' : 'text-destructive'
                      )}>
                        Total score: {sc.totalScore.toFixed(1)}/100
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {aiSug && sc.scores.every(s => s.score === null) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5 text-xs"
                      onClick={e => { e.stopPropagation(); applyAiSuggestion(sc.offerId); }}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Apply AI
                    </Button>
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              <div className="px-4 pb-2">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/40 transition-all duration-500"
                    style={{ width: `${(completedCount / sc.scores.length) * 100}%` }}
                  />
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  {aiSug && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{aiSug.overallComment}</span>
                    </div>
                  )}

                  {sc.scores.map(criterionScore => {
                    const criterion = tender.selectionCriteria.find(c => c.id === criterionScore.criterionId);
                    const aiForCriterion = aiSug?.scores.find(s => s.criterionId === criterionScore.criterionId);

                    return (
                      <div key={criterionScore.criterionId} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{criterionScore.criterionName}</span>
                            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                              {criterionScore.weight}%
                            </span>
                            {criterion?.description && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[260px] text-xs">
                                  {criterion.description}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {aiForCriterion && criterionScore.score === null && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="text-xs cursor-pointer border-primary/30 text-primary hover:bg-primary/5"
                                    onClick={() => {
                                      updateScore(sc.offerId, criterionScore.criterionId, aiForCriterion.score, aiForCriterion.justification);
                                    }}
                                  >
                                    <Sparkles className="h-2.5 w-2.5 mr-1" />
                                    AI: {aiForCriterion.score}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[260px] text-xs">
                                  {aiForCriterion.justification}<br />
                                  <span className="text-primary font-medium">Click to apply</span>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <span className={cn(
                              'text-sm font-bold tabular-nums min-w-[3rem] text-right',
                              criterionScore.score === null ? 'text-muted-foreground' :
                              criterionScore.score >= 80 ? 'text-status-awarded' :
                              criterionScore.score >= 60 ? 'text-status-active' : 'text-destructive'
                            )}>
                              {criterionScore.score !== null ? `${criterionScore.score}/100` : '—/100'}
                            </span>
                          </div>
                        </div>

                        <ScoreBar value={criterionScore.score} aiValue={criterionScore.aiSuggested} />

                        <Slider
                          min={0}
                          max={100}
                          step={1}
                          value={[criterionScore.score ?? 0]}
                          onValueChange={([val]) => updateScore(sc.offerId, criterionScore.criterionId, val)}
                          className="py-1"
                        />

                        {criterionScore.score !== null && (
                          <p className="text-xs text-muted-foreground">
                            Weighted contribution:{' '}
                            <span className="font-medium text-foreground">
                              {((criterionScore.score * criterionScore.weight) / 100).toFixed(2)} points
                            </span>
                          </p>
                        )}

                        <Textarea
                          placeholder="Add a justification for this score..."
                          className="text-xs min-h-[56px] resize-none"
                          value={criterionScore.justification}
                          onChange={e => {
                            setScorecards(prev => prev.map(s => {
                              if (s.offerId !== sc.offerId) return s;
                              return {
                                ...s,
                                scores: s.scores.map(cs =>
                                  cs.criterionId === criterionScore.criterionId
                                    ? { ...cs, justification: e.target.value }
                                    : cs
                                ),
                              };
                            }));
                          }}
                        />
                      </div>
                    );
                  })}

                  {sc.totalScore !== null && (
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-sm font-semibold text-foreground">Weighted total score</span>
                      <span className={cn(
                        'text-xl font-bold tabular-nums',
                        sc.totalScore >= 80 ? 'text-status-awarded' :
                        sc.totalScore >= 60 ? 'text-status-active' : 'text-destructive'
                      )}>
                        {sc.totalScore.toFixed(2)}/100
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Audit Trail ───────────────────────────────────────────────────── */}
        {showAudit && (
          <div className="bg-card rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Audit Trail — Evaluation
            </h4>
            {auditLog.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No actions recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {auditLog.map(entry => (
                  <div key={entry.id} className="flex items-start gap-3 text-xs">
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {new Date(entry.timestamp).toLocaleTimeString('en-GB')}
                    </span>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-xs font-medium shrink-0',
                      entry.action === 'ai_suggested' || entry.action === 'ai_applied' ? 'bg-primary/10 text-primary' :
                      entry.action === 'winner_selected' ? 'bg-status-awarded/10 text-status-awarded' :
                      entry.action === 'evaluation_reset' ? 'bg-destructive/10 text-destructive' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {entry.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-foreground">{entry.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Confirm winner dialog ──────────────────────────────────────────── */}
        <AlertDialog open={!!confirmWinner} onOpenChange={open => !open && setConfirmWinner(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-status-awarded" />
                Select Tender Winner
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>Based on the completed evaluation, you are proposing to award the contract to:</p>
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
                    <p className="font-semibold text-foreground">{confirmWinner?.supplierName}</p>
                    <p className="text-lg font-bold text-status-awarded">€{confirmWinner?.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Weighted score: {rankedScorecards.find(s => s.offerId === confirmWinner?.offerId)?.totalScore?.toFixed(2)}/100
                    </p>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20 text-xs text-destructive">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>This action will mark the tender as <strong>Awarded</strong> and notify all participants. This cannot be undone.</span>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-status-awarded text-white hover:bg-status-awarded/90"
                onClick={() => {
                  if (!confirmWinner) return;
                  setAwardedWinner({ name: confirmWinner.supplierName, amount: confirmWinner.amount });
                  onWinnerSelected?.(confirmWinner.offerId, confirmWinner.supplierName, confirmWinner.amount);
                  addAudit('winner_selected', `Contract awarded to ${confirmWinner.supplierName} — €${confirmWinner.amount.toLocaleString()}`);
                  toast({
                    title: '🏆 Winner confirmed',
                    description: `${confirmWinner.supplierName} has been awarded this tender.`,
                  });
                  setConfirmWinner(null);
                }}
              >
                <Trophy className="h-4 w-4 mr-1.5" />
                Award Tender
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
