import { useState } from 'react';
import { Plus, Trash2, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SelectionCriterion } from '@/types/tender';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SelectionCriteriaSectionProps {
  criteria: SelectionCriterion[];
  canEdit?: boolean;
  onChange?: (criteria: SelectionCriterion[]) => void;
}

export function SelectionCriteriaSection({
  criteria: initialCriteria,
  canEdit = false,
  onChange,
}: SelectionCriteriaSectionProps) {
  const [criteria, setCriteria] = useState<SelectionCriterion[]>(initialCriteria);

  const update = (updated: SelectionCriterion[]) => {
    setCriteria(updated);
    onChange?.(updated);
  };

  const totalWeight = criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const isValid = totalWeight === 100;

  const addCriterion = () => {
    const remaining = Math.max(0, 100 - totalWeight);
    update([
      ...criteria,
      {
        id: `sc-${Date.now()}`,
        name: '',
        weight: remaining,
        description: '',
      },
    ]);
  };

  const updateCriterion = (id: string, field: keyof SelectionCriterion, value: string | number) => {
    update(criteria.map(c => (c.id === id ? { ...c, [field]: field === 'weight' ? Number(value) || 0 : value } : c)));
  };

  const removeCriterion = (id: string) => {
    update(criteria.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className={cn(
        'flex items-center gap-2 p-3 rounded-md border text-xs',
        isValid
          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400'
          : 'bg-amber-50/60 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400',
      )}>
        {isValid ? (
          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
        )}
        <span>
          {isValid
            ? 'Criteria weights sum to 100% — valid configuration.'
            : `Total weight: ${totalWeight}% — must equal 100% before publishing.`}
        </span>
        <div className="ml-auto font-bold text-sm">
          {totalWeight}%
        </div>
      </div>

      {/* Weight bar visualisation */}
      {criteria.length > 0 && (
        <div className="space-y-1">
          <div className="flex rounded-full overflow-hidden h-2.5 bg-muted">
            {criteria.map((c, i) => (
              <div
                key={c.id}
                style={{ width: `${c.weight}%`, backgroundColor: COLORS[i % COLORS.length] }}
                className="transition-all duration-300"
                title={`${c.name || 'Unnamed'}: ${c.weight}%`}
              />
            ))}
            {totalWeight < 100 && (
              <div style={{ width: `${100 - totalWeight}%` }} className="bg-border" />
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {criteria.map((c, i) => (
              <div key={c.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span>{c.name || 'Unnamed'}</span>
                <span className="font-medium text-foreground">{c.weight}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Criteria list */}
      {criteria.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className={cn(
            'grid gap-3 px-4 py-2.5 text-xs font-medium text-muted-foreground bg-muted/40 border-b border-border',
            canEdit
              ? 'grid-cols-[1fr_100px_80px_32px]'
              : 'grid-cols-[1fr_100px]',
          )}>
            <span>Criterion</span>
            <span>Weight</span>
            {canEdit && <span>Visual</span>}
            {canEdit && <span />}
          </div>

          <div className="divide-y divide-border">
            {criteria.map((c, i) => (
              <div
                key={c.id}
                className={cn(
                  'grid gap-3 px-4 py-3 items-start group transition-colors hover:bg-muted/10',
                  canEdit
                    ? 'grid-cols-[1fr_100px_80px_32px]'
                    : 'grid-cols-[1fr_100px]',
                )}
              >
                {/* Name + description */}
                {canEdit ? (
                  <div className="space-y-1.5">
                    <Input
                      value={c.name}
                      onChange={e => updateCriterion(c.id, 'name', e.target.value)}
                      placeholder="Criterion name…"
                      className="h-8 text-sm"
                    />
                    <Textarea
                      value={c.description ?? ''}
                      onChange={e => updateCriterion(c.id, 'description', e.target.value)}
                      placeholder="What this criterion evaluates (optional)…"
                      className="text-xs min-h-[48px] resize-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-0.5 pt-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <p className="text-sm font-medium text-foreground">{c.name || <span className="italic text-muted-foreground">Unnamed</span>}</p>
                    </div>
                    {c.description && (
                      <p className="text-xs text-muted-foreground pl-4.5">{c.description}</p>
                    )}
                  </div>
                )}

                {/* Weight input / badge */}
                {canEdit ? (
                  <div className="relative pt-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={c.weight}
                      onChange={e => updateCriterion(c.id, 'weight', e.target.value)}
                      className="h-8 text-sm pr-7"
                    />
                    <span className="absolute right-2.5 top-1/2 mt-0.5 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                  </div>
                ) : (
                  <div className="pt-1">
                    <Badge variant="outline" className="font-bold text-sm">
                      {c.weight}%
                    </Badge>
                  </div>
                )}

                {/* Mini bar */}
                {canEdit && (
                  <div className="flex items-center pt-3">
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        style={{
                          width: `${c.weight}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                        className="h-full transition-all duration-300"
                      />
                    </div>
                  </div>
                )}

                {/* Remove */}
                {canEdit && (
                  <div className="flex justify-center pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={() => removeCriterion(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {criteria.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-lg">
          <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            {canEdit
              ? 'No selection criteria defined. Add weighted criteria to evaluate offers objectively.'
              : 'No selection criteria defined for this tender.'}
          </p>
          {canEdit && (
            <Button type="button" variant="outline" size="sm" onClick={addCriterion} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add First Criterion
            </Button>
          )}
        </div>
      )}

      {/* Add button */}
      {canEdit && criteria.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCriterion}
          className="w-full border-dashed gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Criterion
        </Button>
      )}
    </div>
  );
}

// Distinct palette that works in both light and dark modes
const COLORS = [
  'hsl(221 83% 53%)',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(346 77% 53%)',
  'hsl(262 83% 58%)',
  'hsl(188 94% 43%)',
];
