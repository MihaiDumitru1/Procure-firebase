import { useState } from 'react';
import { Plus, Trash2, GripVertical, Package } from 'lucide-react';
import { TenderArticle } from '@/types/tender';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ArticlesSectionProps {
  articles: TenderArticle[];
  readOnly?: boolean;
  /** If true, supplier can fill in unit price */
  supplierMode?: boolean;
  /** Called when articles change — for parent persistence */
  onChange?: (articles: TenderArticle[]) => void;
}

export function ArticlesSection({ articles: initialArticles, readOnly = false, supplierMode = false, onChange }: ArticlesSectionProps) {
  const [articles, setArticlesRaw] = useState<TenderArticle[]>(initialArticles);
  const setArticles: typeof setArticlesRaw = (updater) => {
    setArticlesRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      onChange?.(next);
      return next;
    });
  };

  const addArticle = () => {
    const newArticle: TenderArticle = {
      id: `art-${Date.now()}`,
      position: articles.length + 1,
      description: '',
      unit: '',
      quantity: 1,
    };
    setArticles(prev => [...prev, newArticle]);
  };

  const updateArticle = (id: string, field: keyof TenderArticle, value: string | number) => {
    setArticles(prev =>
      prev.map(a => a.id === id ? { ...a, [field]: value } : a)
    );
  };

  const removeArticle = (id: string) => {
    setArticles(prev => {
      const filtered = prev.filter(a => a.id !== id);
      return filtered.map((a, i) => ({ ...a, position: i + 1 }));
    });
  };

  const totalAmount = articles.reduce((sum, a) => {
    const price = a.unitPrice ?? 0;
    return sum + (a.quantity * price);
  }, 0);

  const hasUnitPrices = articles.some(a => a.unitPrice !== undefined);

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">Bill of Quantities / Articles</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {articles.length} item{articles.length !== 1 ? 's' : ''}
          </span>
        </div>
        {!readOnly && !supplierMode && (
          <Button variant="outline" size="sm" onClick={addArticle} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Article
          </Button>
        )}
      </div>

      {articles.length > 0 ? (
        <>
          {/* Header */}
          <div className={cn(
            'grid gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/40 rounded-t-md border border-border',
            supplierMode
              ? 'grid-cols-[32px_1fr_80px_80px_110px_110px_32px]'
              : 'grid-cols-[32px_1fr_80px_80px_32px]'
          )}>
            <span>#</span>
            <span>Description</span>
            <span>Unit</span>
            <span>Qty</span>
            {supplierMode && <span>Unit Price (€)</span>}
            {supplierMode && <span className="text-right">Total (€)</span>}
            <span />
          </div>

          <div className="border border-t-0 border-border rounded-b-md divide-y divide-border">
            {articles.map((article, idx) => {
              const lineTotal = (article.unitPrice ?? 0) * article.quantity;
              return (
                <div
                  key={article.id}
                  className={cn(
                    'grid gap-2 px-3 py-2.5 items-center group hover:bg-muted/20 transition-colors',
                    supplierMode
                      ? 'grid-cols-[32px_1fr_80px_80px_110px_110px_32px]'
                      : 'grid-cols-[32px_1fr_80px_80px_32px]'
                  )}
                >
                  <span className="text-xs text-muted-foreground font-mono">{String(idx + 1).padStart(2, '0')}</span>

                  {readOnly || supplierMode ? (
                    <span className="text-sm text-foreground">{article.description || <span className="text-muted-foreground italic">—</span>}</span>
                  ) : (
                    <Input
                      value={article.description}
                      onChange={e => updateArticle(article.id, 'description', e.target.value)}
                      placeholder="Article description…"
                      className="h-8 text-sm"
                    />
                  )}

                  {readOnly || supplierMode ? (
                    <span className="text-sm text-muted-foreground">{article.unit || '—'}</span>
                  ) : (
                    <Input
                      value={article.unit}
                      onChange={e => updateArticle(article.id, 'unit', e.target.value)}
                      placeholder="m², h, pcs…"
                      className="h-8 text-sm"
                    />
                  )}

                  {readOnly || supplierMode ? (
                    <span className="text-sm text-foreground font-medium">{article.quantity}</span>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      value={article.quantity}
                      onChange={e => updateArticle(article.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                    />
                  )}

                  {supplierMode && (
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={article.unitPrice ?? ''}
                      onChange={e => updateArticle(article.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-8 text-sm"
                    />
                  )}

                  {supplierMode && (
                    <span className={cn(
                      'text-sm font-semibold text-right',
                      lineTotal > 0 ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {lineTotal > 0 ? `€${lineTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </span>
                  )}

                  {!readOnly && !supplierMode ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={() => removeArticle(article.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
          </div>

          {/* Total row */}
          {(supplierMode && hasUnitPrices) || supplierMode ? (
            <div className="mt-2 flex justify-end">
              <div className="flex items-center gap-3 px-4 py-2 rounded-md bg-muted/40 border border-border">
                <span className="text-sm font-medium text-muted-foreground">Total Offer Amount:</span>
                <span className="text-lg font-bold text-foreground">
                  {totalAmount > 0
                    ? `€${totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'}
                </span>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-lg">
          <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            {readOnly ? 'No articles defined for this tender.' : 'No articles added yet. Define the items suppliers should price.'}
          </p>
          {!readOnly && !supplierMode && (
            <Button variant="outline" size="sm" onClick={addArticle} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add First Article
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
