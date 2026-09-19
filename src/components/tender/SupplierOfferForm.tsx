import { useState, useEffect } from 'react';
import { Upload, Euro, FileText, Send, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TenderArticle, CompulsoryOfferItem } from '@/types/tender';
import { isoToDateInputValue } from '@/lib/dateUtils';

interface SupplierOfferFormProps {
  tenderId: string;
  articles: TenderArticle[];
  compulsoryItems: CompulsoryOfferItem[];
  supplierName: string;
  supplierId: string;
  currentRound: number;
  existingOffer?: any;
  submissionEndDate?: string;
  submissionEndTime?: string;
  participationDeadline?: string;
  onSubmitted: (offer: any) => void;
}

export function SupplierOfferForm({
  tenderId,
  articles,
  compulsoryItems,
  supplierName,
  supplierId,
  currentRound,
  existingOffer,
  submissionEndDate,
  submissionEndTime,
  participationDeadline,
  onSubmitted,
}: SupplierOfferFormProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>(existingOffer?.amount?.toString() ?? '');
  const [notes, setNotes] = useState(existingOffer?.notes ?? '');
  const [articlePrices, setArticlePrices] = useState<Record<string, number>>(
    existingOffer?.articlePrices ?? {}
  );
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>(
    existingOffer?.uploadedDocs ?? {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingOffer);
  const [participationConfirmed, setParticipationConfirmed] = useState(!!existingOffer);

  useEffect(() => {
    if (existingOffer) {
      setAmount(existingOffer.amount?.toString() ?? '');
      setNotes(existingOffer.notes ?? '');
      setArticlePrices(existingOffer.articlePrices ?? {});
      setUploadedDocs(existingOffer.uploadedDocs ?? {});
      setSubmitted(true);
      setParticipationConfirmed(true);
    }
  }, [existingOffer?.id]);

  // Check if submission deadline has passed
  const now = new Date();
  const deadlineStr = submissionEndDate ? isoToDateInputValue(submissionEndDate) : null;
  const deadlineTime = submissionEndTime || '17:00';
  const deadline = deadlineStr ? new Date(`${deadlineStr}T${deadlineTime}:00`) : null;
  const isExpired = deadline ? now > deadline : false;

  // Check participation deadline
  const partDeadline = participationDeadline ? new Date(participationDeadline) : null;
  const partExpired = partDeadline ? now > partDeadline : false;

  const totalFromArticles = articles.length > 0
    ? articles.reduce((sum, a) => sum + (articlePrices[a.id] ?? 0) * (a.quantity ?? 1), 0)
    : null;

  // Check mandatory documents
  const requiredItems = compulsoryItems.filter(item => item.required);
  const missingDocs = requiredItems.filter(item => !uploadedDocs[item.id]);

  const handleFileUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedDocs(prev => ({ ...prev, [itemId]: file.name }));
      toast({ title: 'Document încărcat', description: file.name });
    }
  };

  const handleSubmit = async () => {
    if (isExpired) {
      toast({ title: 'Termen expirat', description: 'Termenul de transmitere a ofertelor a expirat.', variant: 'destructive' });
      return;
    }

    const offerAmount = totalFromArticles ?? parseFloat(amount);
    if (!offerAmount || offerAmount <= 0) {
      toast({ title: 'Eroare', description: 'Introduceți o sumă validă.', variant: 'destructive' });
      return;
    }

    if (missingDocs.length > 0) {
      toast({
        title: 'Documente obligatorii lipsă',
        description: `Încărcați: ${missingDocs.map(d => d.name).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const offer = {
      id: existingOffer?.id || `offer-${Date.now()}`,
      supplierId,
      supplierName,
      amount: offerAmount,
      round: currentRound,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      notes,
      articlePrices,
      uploadedDocs,
      documents: Object.entries(uploadedDocs).map(([itemId, fileName]) => ({
        name: fileName,
        itemId,
      })),
    };

    try {
      onSubmitted(offer);
      setSubmitted(true);
      toast({ title: existingOffer ? 'Ofertă actualizată' : 'Ofertă trimisă', description: `Oferta de €${offerAmount.toLocaleString('ro-RO')} a fost ${existingOffer ? 'actualizată' : 'trimisă'} cu succes.` });
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message, variant: 'destructive' });
    }

    setSubmitting(false);
  };

  // Expired state
  if (isExpired) {
    return (
      <div className="bg-card rounded-lg border border-destructive/30 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-destructive/10">
            <Clock className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Termen expirat</h3>
            <p className="text-sm text-muted-foreground">
              Termenul de transmitere a ofertelor a expirat pe {deadline?.toLocaleString('ro-RO')}.
              {submitted && ' Oferta dvs. anterioară rămâne valabilă.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Participation confirmation step
  if (!participationConfirmed) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">Confirmare participare — Runda {currentRound}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Confirmați participarea la această licitație pentru a putea transmite oferta.
          {partDeadline && !partExpired && (
            <span className="block mt-1 text-amber-600 font-medium">
              Termen limită confirmare: {partDeadline.toLocaleString('ro-RO')}
            </span>
          )}
          {partExpired && (
            <span className="block mt-1 text-destructive font-medium">
              Termenul de confirmare a participării a expirat.
            </span>
          )}
        </p>
        {deadline && (
          <p className="text-xs text-muted-foreground">
            Termenul de transmitere oferte: {deadline.toLocaleString('ro-RO')}
          </p>
        )}
        <div className="flex gap-2">
          <Button onClick={() => setParticipationConfirmed(true)} disabled={partExpired}>
            Confirm participarea
          </Button>
        </div>
      </div>
    );
  }

  // Submitted state with option to modify
  if (submitted) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Ofertă trimisă cu succes</h3>
            <p className="text-sm text-muted-foreground">
              Oferta dvs. de €{(existingOffer?.amount ?? totalFromArticles ?? parseFloat(amount) ?? 0).toLocaleString('ro-RO')} a fost înregistrată pentru Runda {currentRound}.
            </p>
          </div>
        </div>
        {deadline && (
          <p className="text-xs text-muted-foreground mb-3">
            Puteți actualiza oferta și documentele până la: <strong>{deadline.toLocaleString('ro-RO')}</strong>
          </p>
        )}
        <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
          Modifică oferta
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">
            {existingOffer ? 'Modifică oferta' : 'Trimite ofertă'} — Runda {currentRound}
          </h3>
        </div>
        {deadline && (
          <span className="text-xs text-muted-foreground">
            Termen: {deadline.toLocaleString('ro-RO')}
          </span>
        )}
      </div>

      {/* Article pricing */}
      {articles.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Prețuri pe articole</Label>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">#</th>
                  <th className="text-left p-2 font-medium">Articol</th>
                  <th className="text-right p-2 font-medium">Cantitate</th>
                  <th className="text-right p-2 font-medium">Unitate</th>
                  <th className="text-right p-2 font-medium">Preț unitar (€)</th>
                  <th className="text-right p-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {articles.map((art, idx) => (
                  <tr key={art.id} className="hover:bg-muted/30">
                    <td className="p-2 text-muted-foreground">{idx + 1}</td>
                    <td className="p-2">{art.description || '—'}</td>
                    <td className="p-2 text-right">{art.quantity ?? 1}</td>
                    <td className="p-2 text-right text-muted-foreground">{art.unit || '—'}</td>
                    <td className="p-2 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-24 text-right ml-auto h-8"
                        placeholder="0.00"
                        value={articlePrices[art.id] ?? ''}
                        onChange={e => setArticlePrices(prev => ({
                          ...prev,
                          [art.id]: parseFloat(e.target.value) || 0,
                        }))}
                      />
                    </td>
                    <td className="p-2 text-right font-medium">
                      €{((articlePrices[art.id] ?? 0) * (art.quantity ?? 1)).toLocaleString('ro-RO')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-semibold">
                  <td colSpan={5} className="p-2 text-right">Total ofertă:</td>
                  <td className="p-2 text-right text-primary">
                    €{(totalFromArticles ?? 0).toLocaleString('ro-RO')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Flat amount if no articles */}
      {articles.length === 0 && (
        <div className="space-y-2">
          <Label htmlFor="offer-amount">Suma ofertei (€)</Label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="offer-amount"
              type="number"
              step="0.01"
              min="0"
              className="pl-10"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Compulsory documents upload */}
      {requiredItems.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Documente obligatorii</Label>
          {missingDocs.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Toate documentele obligatorii trebuie încărcate înainte de transmiterea ofertei.</span>
            </div>
          )}
          <div className="space-y-2">
            {requiredItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {uploadedDocs[item.id] ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs text-emerald-600">{uploadedDocs[item.id]}</span>
                      <label className="cursor-pointer">
                        <span className="text-xs text-primary hover:underline">Schimbă</span>
                        <input type="file" className="hidden" onChange={e => handleFileUpload(item.id, e)} />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" className="gap-1.5 pointer-events-none">
                        <Upload className="h-3.5 w-3.5" /> Încarcă
                      </Button>
                      <input type="file" className="hidden" onChange={e => handleFileUpload(item.id, e)} />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="offer-notes">Note / Observații (opțional)</Label>
        <Textarea
          id="offer-notes"
          placeholder="Detalii suplimentare despre oferta dvs..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          Oferta va fi trimisă ca <strong>{supplierName}</strong>
        </p>
        <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
          <Send className="h-4 w-4" />
          {submitting ? 'Se trimite...' : existingOffer ? 'Actualizează oferta' : 'Trimite oferta'}
        </Button>
      </div>
    </div>
  );
}
