import { useState, useEffect } from 'react';
import { Euro, FileText, CheckCircle2, XCircle, Clock, Star, Trophy, AlertTriangle, User, Calendar, Package, Download } from 'lucide-react';
import { TenderRound, Offer } from '@/types/tender';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { isoToDateInputValue } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';

interface OffersSectionProps {
  rounds: TenderRound[];
  currentRound: number;
  tenderId: string;
  onWinnerSelected?: (offerId: string, supplierName: string, amount: number) => void;
  onRoundsChange?: (rounds: TenderRound[]) => void;
  readOnly?: boolean;
  articles?: any[];
  submissionEndDate?: string;
  submissionEndTime?: string;
}

const statusIcons: Record<Offer['status'], React.ReactNode> = {
  'submitted': <Clock className="h-4 w-4" />,
  'under-review': <Clock className="h-4 w-4" />,
  'shortlisted': <Star className="h-4 w-4" />,
  'rejected': <XCircle className="h-4 w-4" />,
  'winner': <Trophy className="h-4 w-4" />,
};

export function OffersSection({ rounds, currentRound, tenderId, onWinnerSelected, onRoundsChange, readOnly = false, articles = [], submissionEndDate, submissionEndTime }: OffersSectionProps) {
  const { toast } = useToast();
  const activeRoundId = rounds.find(r => r.roundNumber === currentRound)?.id || rounds[0]?.id;
  const [viewOffer, setViewOffer] = useState<Offer | null>(null);
  const [newRoundOpen, setNewRoundOpen] = useState(false);
  const [newRoundEndDate, setNewRoundEndDate] = useState('');
  const [newRoundEndTime, setNewRoundEndTime] = useState('17:00');

  // Global fallback deadline (tender-level), used only if a round has no endDate
  const now = new Date();
  const tenderDeadlineStr = submissionEndDate ? isoToDateInputValue(submissionEndDate) : null;
  const tenderDeadlineTime = submissionEndTime || '17:00';
  const tenderDeadline = tenderDeadlineStr ? new Date(`${tenderDeadlineStr}T${tenderDeadlineTime}:00`) : null;

  const isRoundClosed = (round: TenderRound) => {
    const roundEnd = round?.endDate ? new Date(round.endDate) : tenderDeadline;
    return roundEnd ? now > roundEnd : false;
  };

  // Map article IDs to names for display
  const articleMap: Record<string, string> = {};
  (articles ?? []).forEach((a: any) => { articleMap[a.id] = a.description || a.name || a.id; });

  // Local state to track winner selection (in a real app this would persist to DB)
  const [localRounds, setLocalRounds] = useState<TenderRound[]>(rounds);

  useEffect(() => {
    setLocalRounds(rounds);
  }, [rounds]);

  const handleAddNewRound = () => {
    if (!newRoundEndDate) {
      toast({ title: 'Eroare', description: 'Selectați o dată de închidere pentru noua rundă.', variant: 'destructive' });
      return;
    }
    const nextRoundNumber = Math.max(0, ...localRounds.map(r => r.roundNumber)) + 1;
    const newRound: TenderRound = {
      id: `round-${nextRoundNumber}-${Date.now()}`,
      roundNumber: nextRoundNumber,
      startDate: new Date().toISOString(),
      endDate: new Date(`${newRoundEndDate}T${newRoundEndTime}:00`).toISOString(),
      status: 'active',
      offers: [],
    };
    const updated = [...localRounds, newRound];
    setLocalRounds(updated);
    onRoundsChange?.(updated);
    setNewRoundOpen(false);
    setNewRoundEndDate('');
    toast({ title: 'Rundă nouă creată', description: `Runda ${nextRoundNumber} a fost pornită.` });
  };
  const [confirmOffer, setConfirmOffer] = useState<{ offerId: string; supplierName: string; amount: number } | null>(null);

  // Find winner across all rounds
  const winnerOffer = localRounds
    .flatMap(r => r.offers)
    .find(o => o.status === 'winner');

  const handleSelectWinner = (offer: Offer) => {
    setConfirmOffer({ offerId: offer.id, supplierName: offer.supplierName, amount: offer.amount });
  };

  const confirmSelectWinner = () => {
    if (!confirmOffer) return;
    const { offerId, supplierName, amount } = confirmOffer;

    setLocalRounds(prev =>
      prev.map(round => ({
        ...round,
        offers: round.offers.map(o => ({
          ...o,
          status: o.id === offerId ? 'winner' : o.status === 'winner' ? 'shortlisted' : o.status,
        })),
      }))
    );

    onWinnerSelected?.(offerId, supplierName, amount);
    setConfirmOffer(null);

    toast({
      title: 'Winner selected',
      description: `${supplierName} has been awarded this tender at €${amount.toLocaleString()}.`,
    });
  };

  const handleDownloadOffer = (offer: Offer) => {
    const lines: string[] = [];
    lines.push(`Ofertă — ${offer.supplierName}`);
    lines.push(`Status: ${offer.status}`);
    lines.push(`Runda: ${offer.round}`);
    lines.push(`Sumă totală: €${offer.amount.toLocaleString()}`);
    lines.push(`Trimisă la: ${new Date(offer.submittedAt || Date.now()).toLocaleString('ro-RO')}`);
    lines.push('');
    if ((offer as any).articlePrices && Object.keys((offer as any).articlePrices).length > 0) {
      lines.push('Prețuri pe articole:');
      Object.entries((offer as any).articlePrices).forEach(([artId, price]) => {
        lines.push(`  ${articleMap[artId] || artId}: €${Number(price).toLocaleString()}`);
      });
      lines.push('');
    }
    if ((offer as any).notes) {
      lines.push(`Note: ${(offer as any).notes}`);
      lines.push('');
    }
    if ((offer.documents ?? []).length > 0) {
      lines.push('Documente:');
      (offer.documents ?? []).forEach((doc: any) => lines.push(`  - ${doc.name}`));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oferta-${offer.supplierName.replace(/\s+/g, '-')}-runda${offer.round}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderOffer = (offer: Offer, roundClosed: boolean) => (
    <div
      key={offer.id}
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border transition-colors',
        offer.status === 'winner'
          ? 'border-status-awarded bg-status-awarded/5'
          : 'border-border hover:bg-muted/30'
      )}
    >
      <div className={cn(
        'p-2 rounded-full',
        offer.status === 'winner' ? 'bg-status-awarded/20 text-status-awarded' : 'bg-muted text-muted-foreground'
      )}>
        {statusIcons[offer.status]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{offer.supplierName}</span>
          <StatusBadge status={offer.status}>
            {offer.status.replace('-', ' ')}
          </StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground">
          Submitted {new Date(offer.submittedAt || Date.now()).toLocaleDateString()}
        </p>
      </div>

      <div className="text-right">
        {roundClosed ? (
          <p className="text-lg font-semibold text-foreground">
            €{offer.amount.toLocaleString()}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Vizibil după închidere</p>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
          <FileText className="h-3 w-3" />
          <span>{(offer.documents ?? []).length} documents</span>
        </div>
      </div>

      <div className="flex gap-2">
        {roundClosed && (
          <>
            <Button variant="outline" size="sm" onClick={() => setViewOffer(offer)}>View</Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleDownloadOffer(offer)}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        {!readOnly && roundClosed && offer.status !== 'winner' && offer.status !== 'rejected' && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-status-awarded/40 text-status-awarded hover:bg-status-awarded/10 hover:text-status-awarded"
            onClick={() => handleSelectWinner(offer)}
          >
            <Trophy className="h-3.5 w-3.5" />
            Select Winner
          </Button>
        )}
        {!readOnly && offer.status === 'under-review' && (
          <>
            <Button variant="outline" size="sm" className="text-status-awarded hover:text-status-awarded">
              Shortlist
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              Reject
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Winner banner */}
      {winnerOffer && (
        <div className="flex items-center gap-4 p-5 rounded-xl border-2 border-status-awarded bg-status-awarded/5 mb-2">
          <div className="p-3 rounded-full bg-status-awarded/20">
            <Trophy className="h-6 w-6 text-status-awarded" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-status-awarded mb-0.5">Tender Awarded</p>
            <p className="text-lg font-bold text-foreground">{winnerOffer.supplierName}</p>
            <p className="text-sm text-muted-foreground">
              Winning offer submitted {new Date(winnerOffer.submittedAt || Date.now()).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-status-awarded">€{winnerOffer.amount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Awarded amount</p>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Offers by Round</h3>
          <Button variant="outline" size="sm" onClick={() => setNewRoundOpen(true)} disabled={readOnly}>
            Start New Round
          </Button>
        </div>

        {localRounds.length > 0 ? (
          <Tabs defaultValue={activeRoundId}>
            <TabsList className="w-full justify-start bg-muted/50 mb-4">
              {localRounds.map((round) => (
                <TabsTrigger key={round.id} value={round.id} className="gap-2">
                  Round {round.roundNumber}
                  <StatusBadge status={round.status} className="ml-1">
                    {round.status}
                  </StatusBadge>
                </TabsTrigger>
              ))}
            </TabsList>

            {localRounds.map((round) => (
              <TabsContent key={round.id} value={round.id} className="mt-0">
                <div className="mb-4 p-3 rounded-lg bg-muted/30 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Period: </span>
                    <span className="font-medium">
                      {new Date(round.startDate).toLocaleDateString()} - {new Date(round.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Offers: </span>
                    <span className="font-medium">{round.offers.length}</span>
                  </div>
                </div>

                {round.offers.length > 0 ? (
                  <div className="space-y-3">
                    {round.offers.map(offer => renderOffer(offer, isRoundClosed(round)))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No offers received in this round yet.
                  </p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              No rounds have been started yet.
            </p>
            <Button onClick={() => setNewRoundOpen(true)} disabled={readOnly}>Start First Round</Button>
          </div>
        )}
      </div>

      {/* Confirm winner dialog */}
      <AlertDialog open={!!confirmOffer} onOpenChange={(open) => !open && setConfirmOffer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-status-awarded" />
              Confirm Winner Selection
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to award this tender to:</p>
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
                  <p className="font-semibold text-foreground">{confirmOffer?.supplierName}</p>
                  <p className="text-lg font-bold text-status-awarded">
                    €{confirmOffer?.amount.toLocaleString()}
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
              onClick={confirmSelectWinner}
            >
              <Trophy className="h-4 w-4 mr-1.5" />
              Award Tender
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Offer Dialog */}
      <Dialog open={!!viewOffer} onOpenChange={() => setViewOffer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>Detalii ofertă</span>
              {viewOffer && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleDownloadOffer(viewOffer)}>
                  <Download className="h-3.5 w-3.5" /> Descarcă
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewOffer && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                  {viewOffer.supplierName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{viewOffer.supplierName}</p>
                  <StatusBadge status={viewOffer.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Sumă ofertă</p>
                  <p className="text-lg font-semibold text-primary">€{viewOffer.amount.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Runda</p>
                  <p className="text-lg font-semibold">{viewOffer.round}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Trimisă la</p>
                </div>
                <p className="text-sm">{new Date(viewOffer.submittedAt || Date.now()).toLocaleString('ro-RO')}</p>
              </div>

              {(viewOffer as any).notes && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Note</p>
                  <p className="text-sm">{(viewOffer as any).notes}</p>
                </div>
              )}

              {(viewOffer as any).articlePrices && Object.keys((viewOffer as any).articlePrices).length > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Prețuri pe articole</p>
                  </div>
                  <div className="space-y-1">
                    {Object.entries((viewOffer as any).articlePrices).map(([artId, price]) => (
                      <div key={artId} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{articleMap[artId] || artId}</span>
                        <span className="font-medium">€{Number(price).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(viewOffer.documents ?? []).length > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Documente ({(viewOffer.documents ?? []).length})</p>
                  </div>
                  <div className="space-y-1">
                    {(viewOffer.documents ?? []).map((doc, i) => (
                      <p key={i} className="text-sm">{doc.name}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Round Dialog */}
      <Dialog open={newRoundOpen} onOpenChange={setNewRoundOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pornește o rundă nouă</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Dată închidere</Label>
              <Input type="date" value={newRoundEndDate} onChange={e => setNewRoundEndDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-1.5">
              <Label>Ora</Label>
              <Input type="time" value={newRoundEndTime} onChange={e => setNewRoundEndTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRoundOpen(false)}>Anulează</Button>
            <Button onClick={handleAddNewRound}>Pornește runda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
