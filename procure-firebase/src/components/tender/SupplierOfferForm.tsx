import { useState } from 'react';
import { Upload, Euro, FileText, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TenderArticle } from '@/types/tender';

interface SupplierOfferFormProps {
  tenderId: string;
  articles: TenderArticle[];
  supplierName: string;
  supplierId: string;
  currentRound: number;
  existingOffer?: any;
  onSubmitted: (offer: any) => void;
}

export function SupplierOfferForm({
  tenderId,
  articles,
  supplierName,
  supplierId,
  currentRound,
  existingOffer,
  onSubmitted,
}: SupplierOfferFormProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>(existingOffer?.amount?.toString() ?? '');
  const [notes, setNotes] = useState(existingOffer?.notes ?? '');
  const [articlePrices, setArticlePrices] = useState<Record<string, number>>(
    existingOffer?.articlePrices ?? {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingOffer);

  const totalFromArticles = articles.length > 0
    ? articles.reduce((sum, a) => sum + (articlePrices[a.id] ?? 0) * (a.quantity ?? 1), 0)
    : null;

  const handleSubmit = async () => {
    const offerAmount = totalFromArticles ?? parseFloat(amount);
    if (!offerAmount || offerAmount <= 0) {
      toast({ title: 'Eroare', description: 'Introduceți o sumă validă.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    const offer = {
      id: `offer-${Date.now()}`,
      supplierId,
      supplierName,
      amount: offerAmount,
      round: currentRound,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      notes,
      articlePrices,
      documents: [],
    };

    try {
      onSubmitted(offer);
      setSubmitted(true);
      toast({ title: 'Ofertă trimisă', description: `Oferta de €${offerAmount.toLocaleString('ro-RO')} a fost trimisă cu succes.` });
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message, variant: 'destructive' });
    }

    setSubmitting(false);
  };

  if (submitted && !existingOffer) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Ofertă trimisă cu succes</h3>
            <p className="text-sm text-muted-foreground">
              Oferta dvs. de €{(totalFromArticles ?? parseFloat(amount)).toLocaleString('ro-RO')} a fost înregistrată pentru Runda {currentRound}.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
          Modifică oferta
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <Send className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">
          {existingOffer ? 'Modifică oferta' : 'Trimite ofertă'} — Runda {currentRound}
        </h3>
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
