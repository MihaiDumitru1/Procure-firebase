import { useState } from 'react';
import { FileText, Upload, Lock, Globe, Download, Trash2 } from 'lucide-react';
import { Document } from '@/types/tender';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface DocumentsSectionProps {
  documents: Document[];
  canUpload?: boolean;
  /** When true, hides the Internal tab (for supplier view) */
  hideInternal?: boolean;
}

export function DocumentsSection({ documents, canUpload = true, hideInternal = false }: DocumentsSectionProps) {
  const [activeTab, setActiveTab] = useState<'public' | 'internal'>('public');
  
  const publicDocs = documents.filter(d => d.type === 'public');
  const internalDocs = documents.filter(d => d.type === 'internal');

  const renderDocument = (doc: Document) => (
    <div 
      key={doc.id}
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
    >
      <div className="p-2 rounded-md bg-primary/10">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
        <p className="text-xs text-muted-foreground">
          {doc.size} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()} by {doc.uploadedBy}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Download className="h-4 w-4" />
        </Button>
        {canUpload && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Documents</h3>
        {canUpload && (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'public' | 'internal')}>
        <TabsList className="w-full justify-start bg-muted/50 mb-4">
          <TabsTrigger value="public" className="gap-2">
            <Globe className="h-4 w-4" />
            Public ({publicDocs.length})
          </TabsTrigger>
          {!hideInternal && (
            <TabsTrigger value="internal" className="gap-2">
              <Lock className="h-4 w-4" />
              Internal ({internalDocs.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="public" className="mt-0">
          {publicDocs.length > 0 ? (
            <div className="space-y-2">
              {publicDocs.map(renderDocument)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No public documents uploaded yet.
            </p>
          )}
        </TabsContent>

        {!hideInternal && (
          <TabsContent value="internal" className="mt-0">
            {internalDocs.length > 0 ? (
              <div className="space-y-2">
                {internalDocs.map(renderDocument)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No internal documents uploaded yet.
              </p>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
