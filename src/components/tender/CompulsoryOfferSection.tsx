import { useState } from 'react';
import { Plus, Trash2, Upload, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { CompulsoryOfferItem } from '@/types/tender';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UploadedFile {
  itemId: string;
  fileName: string;
  fileSize: string;
}

interface CompulsoryOfferSectionProps {
  items: CompulsoryOfferItem[];
  /** organizer can add/edit items */
  canEdit?: boolean;
  /** supplier mode: shows upload buttons per item */
  supplierMode?: boolean;
  onChange?: (items: CompulsoryOfferItem[]) => void;
}

export function CompulsoryOfferSection({
  items: initialItems,
  canEdit = false,
  supplierMode = false,
  onChange,
}: CompulsoryOfferSectionProps) {
  const [items, setItems] = useState<CompulsoryOfferItem[]>(initialItems);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);

  const update = (updated: CompulsoryOfferItem[]) => {
    setItems(updated);
    onChange?.(updated);
  };

  const addItem = () => {
    const next: CompulsoryOfferItem = {
      id: `coi-${Date.now()}`,
      position: items.length + 1,
      name: '',
      description: '',
      required: true,
    };
    update([...items, next]);
  };

  const updateItem = (id: string, field: keyof CompulsoryOfferItem, value: string | boolean | number) => {
    update(items.map(i => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const removeItem = (id: string) => {
    update(
      items
        .filter(i => i.id !== id)
        .map((i, idx) => ({ ...i, position: idx + 1 })),
    );
    setUploads(prev => prev.filter(u => u.itemId !== id));
  };

  const handleUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeKB = file.size / 1024;
    const sizeStr = sizeKB < 1024 ? `${sizeKB.toFixed(0)} KB` : `${(sizeKB / 1024).toFixed(1)} MB`;
    setUploads(prev => {
      const without = prev.filter(u => u.itemId !== itemId);
      return [...without, { itemId, fileName: file.name, fileSize: sizeStr }];
    });
    e.target.value = '';
  };

  const removeUpload = (itemId: string) =>
    setUploads(prev => prev.filter(u => u.itemId !== itemId));

  const uploadFor = (itemId: string) => uploads.find(u => u.itemId === itemId);

  return (
    <div className="space-y-4">
      {/* Info bar */}
      <div className="flex items-start gap-2 p-3 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground">
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span>
          {supplierMode
            ? 'Upload one file per required item. All mandatory items must be provided before submitting your offer.'
            : 'Define the documents every participating supplier must upload as part of their offer. Required items block submission if missing.'}
        </span>
      </div>

      {items.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Table header */}
          <div className={cn(
            'grid gap-3 px-4 py-2.5 text-xs font-medium text-muted-foreground bg-muted/40 border-b border-border',
            supplierMode
              ? 'grid-cols-[32px_1fr_80px_180px]'
              : canEdit
                ? 'grid-cols-[32px_1fr_80px_80px_32px]'
                : 'grid-cols-[32px_1fr_80px]',
          )}>
            <span>#</span>
            <span>Document</span>
            <span>Required</span>
            {supplierMode && <span>Upload</span>}
            {canEdit && !supplierMode && <span className="text-center">Actions</span>}
          </div>

          <div className="divide-y divide-border">
            {items.map((item, idx) => {
              const uploaded = uploadFor(item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    'grid gap-3 px-4 py-3 items-start group transition-colors hover:bg-muted/10',
                    supplierMode
                      ? 'grid-cols-[32px_1fr_80px_180px]'
                      : canEdit
                        ? 'grid-cols-[32px_1fr_80px_80px_32px]'
                        : 'grid-cols-[32px_1fr_80px]',
                    uploaded && item.required && 'bg-emerald-50/40 dark:bg-emerald-950/20',
                  )}
                >
                  {/* Position */}
                  <span className="text-xs text-muted-foreground font-mono pt-2">
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  {/* Name + description */}
                  {canEdit && !supplierMode ? (
                    <div className="space-y-1.5">
                      <Input
                        value={item.name}
                        onChange={e => updateItem(item.id, 'name', e.target.value)}
                        placeholder="Document name…"
                        className="h-8 text-sm"
                      />
                      <Textarea
                        value={item.description ?? ''}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Short description (optional)…"
                        className="text-xs min-h-[48px] resize-none"
                      />
                    </div>
                  ) : (
                    <div className="space-y-0.5 pt-1">
                      <p className="text-sm font-medium text-foreground">{item.name || <span className="italic text-muted-foreground">Unnamed item</span>}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  )}

                  {/* Required toggle / badge */}
                  {canEdit && !supplierMode ? (
                    <div className="flex flex-col items-center gap-1 pt-2">
                      <Switch
                        checked={item.required}
                        onCheckedChange={v => updateItem(item.id, 'required', v)}
                        id={`req-${item.id}`}
                      />
                      <Label htmlFor={`req-${item.id}`} className="text-xs text-muted-foreground cursor-pointer">
                        {item.required ? 'Yes' : 'No'}
                      </Label>
                    </div>
                  ) : (
                    <div className="pt-2">
                      <Badge
                        variant={item.required ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {item.required ? 'Required' : 'Optional'}
                      </Badge>
                    </div>
                  )}

                  {/* Supplier upload cell */}
                  {supplierMode && (
                    <div className="pt-1">
                      {uploaded ? (
                        <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/30 border border-border group/up">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="text-xs text-foreground truncate flex-1">{uploaded.fileName}</span>
                          <button
                            type="button"
                            onClick={() => removeUpload(item.id)}
                            className="opacity-0 group-hover/up:opacity-100 text-destructive hover:text-destructive transition-opacity"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-border cursor-pointer hover:bg-muted/20 transition-colors text-xs text-muted-foreground">
                          <Upload className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>Upload file</span>
                          <input type="file" className="hidden" onChange={e => handleUpload(item.id, e)} />
                        </label>
                      )}
                    </div>
                  )}

                  {/* Remove button */}
                  {canEdit && !supplierMode && (
                    <div className="flex justify-center pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-lg">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            {canEdit
              ? 'No required documents defined yet. Add items that suppliers must upload.'
              : 'No compulsory documents required for this tender.'}
          </p>
          {canEdit && (
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add First Item
            </Button>
          )}
        </div>
      )}

      {/* Add button */}
      {canEdit && items.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="w-full border-dashed gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      )}

      {/* Supplier upload progress */}
      {supplierMode && items.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40 border border-border text-sm">
          <CheckCircle2 className={cn(
            'h-4 w-4 flex-shrink-0',
            uploads.filter(u => items.find(i => i.id === u.itemId && i.required)).length === items.filter(i => i.required).length
              ? 'text-emerald-600'
              : 'text-muted-foreground',
          )} />
          <span>
            <span className="font-medium">
              {uploads.filter(u => items.find(i => i.id === u.itemId && i.required)).length}
              /{items.filter(i => i.required).length}
            </span>
            {' '}required documents uploaded
          </span>
        </div>
      )}
    </div>
  );
}
