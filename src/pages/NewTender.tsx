import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  CalendarIcon, Plus, Trash2, Upload, FileText, Lock, Globe,
  ChevronRight, Building2, ClipboardList, FileSignature,
  Clock, Users, Layers, CheckCircle2, X, Package, ListChecks, Target,
} from 'lucide-react';
import { TenderArticle, CompulsoryOfferItem, SelectionCriterion, Supplier } from '@/types/tender';
import { CompulsoryOfferSection } from '@/components/tender/CompulsoryOfferSection';
import { SelectionCriteriaSection } from '@/components/tender/SelectionCriteriaSection';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ServiceCategory } from '@/types/tender';
import { useToast } from '@/hooks/use-toast';
import { useSPVs } from '@/context/SPVContext';
import { useAuth } from '@/hooks/useAuth';
import { dataProvider } from '@/data-access';
import { serviceCategories } from '@/data/categories';
import { Switch } from '@/components/ui/switch';

// ─── Schema ────────────────────────────────────────────────────────────────────

const roundSchema = z.object({
  id: z.string(),
  roundNumber: z.number(),
  submissionStartDate: z.date({ required_error: 'Start date required' }),
  submissionStartTime: z.string().min(1, 'Start time required'),
  submissionEndDate: z.date({ required_error: 'End date required' }),
  submissionEndTime: z.string().min(1, 'End time required'),
});

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(120),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  category: z.string().min(1, 'Please select a service category'),
  spvId: z.string().min(1, 'Please select a property'),
  budget: z.string().optional(),
  participationDeadlineDate: z.date({ required_error: 'Participation deadline date required' }),
  participationDeadlineTime: z.string().min(1, 'Participation deadline time required'),
  minParticipants: z.coerce.number().int().min(1, 'Minimum 1 participant'),
  rounds: z.array(roundSchema).min(1),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<ServiceCategory, string> = {
  'technical-maintenance': 'Technical Maintenance',
  cleaning: 'Cleaning',
  landscaping: 'Landscaping',
  security: 'Security',
  'waste-management': 'Waste Management',
  'pest-control': 'Pest Control',
  other: 'Other',
};

interface FileEntry {
  id: string;
  name: string;
  size: string;
  type: 'public' | 'internal';
  isNda?: boolean;
}

interface SectionProps {
  number: number;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function Section({ number, icon, title, subtitle, children }: SectionProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 bg-muted/30 border-b border-border">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
          {number}
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-primary">{icon}</span>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function DateTimeField({
  label,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  dateError,
  timeError,
  description,
}: {
  label: string;
  dateValue?: Date;
  timeValue: string;
  onDateChange: (d: Date | undefined) => void;
  onTimeChange: (t: string) => void;
  dateError?: string;
  timeError?: string;
  description?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'flex-1 justify-start text-left font-normal h-10',
                !dateValue && 'text-muted-foreground',
                dateError && 'border-destructive',
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
              {dateValue ? format(dateValue, 'dd MMM yyyy') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={onDateChange}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="time"
            value={timeValue}
            onChange={(e) => onTimeChange(e.target.value)}
            className={cn('pl-9 w-32 h-10', timeError && 'border-destructive')}
          />
        </div>
      </div>
      {(dateError || timeError) && (
        <p className="text-xs text-destructive">{dateError || timeError}</p>
      )}
    </div>
  );
}

// ─── Round Card ───────────────────────────────────────────────────────────────

function RoundCard({
  index,
  control,
  canRemove,
  onRemove,
  errors,
}: {
  index: number;
  control: any;
  canRemove: boolean;
  onRemove: () => void;
  errors: any;
}) {
  return (
    <div className="border border-border rounded-lg p-4 bg-muted/20 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
            {index + 1}
          </div>
          <span className="font-medium text-sm text-foreground">Round {index + 1}</span>
        </div>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name={`rounds.${index}.submissionStartDate`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Submission Opens</FormLabel>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'flex-1 justify-start text-left font-normal h-9 text-sm',
                          !field.value && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 flex-shrink-0" />
                        {field.value ? format(field.value, 'dd MMM yyyy') : 'Start date'}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <FormField
                  control={control}
                  name={`rounds.${index}.submissionStartTime`}
                  render={({ field: tf }) => (
                    <div className="relative">
                      <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input type="time" value={tf.value} onChange={tf.onChange} className="pl-8 w-28 h-9 text-sm" />
                    </div>
                  )}
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`rounds.${index}.submissionEndDate`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Submission Closes</FormLabel>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'flex-1 justify-start text-left font-normal h-9 text-sm',
                          !field.value && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 flex-shrink-0" />
                        {field.value ? format(field.value, 'dd MMM yyyy') : 'End date'}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <FormField
                  control={control}
                  name={`rounds.${index}.submissionEndTime`}
                  render={({ field: tf }) => (
                    <div className="relative">
                      <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input type="time" value={tf.value} onChange={tf.onChange} className="pl-8 w-28 h-9 text-sm" />
                    </div>
                  )}
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

// ─── Document Upload Area ──────────────────────────────────────────────────────

function DocumentUploadArea({
  label,
  description,
  icon,
  files,
  onAdd,
  onRemove,
  accent,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  files: FileEntry[];
  onAdd: (entry: FileEntry) => void;
  onRemove: (id: string) => void;
  accent: 'primary' | 'warning';
}) {
  const accentCls = accent === 'primary'
    ? 'border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary'
    : 'border-secondary/50 bg-secondary/10 hover:bg-secondary/20 text-secondary-foreground';
  const iconBg = accent === 'primary' ? 'bg-primary/10 text-primary' : 'bg-secondary/20 text-secondary-foreground';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    Array.from(fileList).forEach((f) => {
      const sizeKB = f.size / 1024;
      const sizeStr = sizeKB < 1024 ? `${sizeKB.toFixed(0)} KB` : `${(sizeKB / 1024).toFixed(1)} MB`;
      onAdd({
        id: `${Date.now()}-${Math.random()}`,
        name: f.name,
        size: sizeStr,
        type: accent === 'primary' ? 'public' : 'internal',
      });
    });
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn('p-1.5 rounded-md', iconBg)}>{icon}</span>
          <span className="font-medium text-sm text-foreground">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground ml-8">{description}</p>
      </div>

      <label className={cn(
        'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors',
        accentCls,
      )}>
        <Upload className="h-5 w-5" />
        <span className="text-xs font-medium">Click to upload files</span>
        <input type="file" multiple className="hidden" onChange={handleFileChange} />
      </label>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2.5 p-2.5 rounded-md border border-border bg-muted/20 group">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 text-sm text-foreground truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground">{f.size}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                onClick={() => onRemove(f.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NDA Upload ────────────────────────────────────────────────────────────────

function NdaUploadArea({ file, onAdd, onRemove }: {
  file: FileEntry | null;
  onAdd: (f: FileEntry) => void;
  onRemove: () => void;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const sizeKB = f.size / 1024;
    const sizeStr = sizeKB < 1024 ? `${sizeKB.toFixed(0)} KB` : `${(sizeKB / 1024).toFixed(1)} MB`;
    onAdd({ id: `nda-${Date.now()}`, name: f.name, size: sizeStr, type: 'public', isNda: true });
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <FileSignature className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground">NDA Template</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload your NDA template with blank fields for supplier identification data (company name, address, etc.).
            Suppliers will fill in their details when accepting participation.
          </p>
        </div>
      </div>

      {file ? (
        <div className="flex items-center gap-2.5 p-3 rounded-md border border-border bg-muted/20 group">
          <div className="p-1.5 rounded bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <span className="flex-1 text-sm font-medium text-foreground truncate">{file.name}</span>
          <span className="text-xs text-muted-foreground">{file.size}</span>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onRemove}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center gap-3 p-4 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors">
          <Upload className="h-5 w-5 text-primary" />
          <span className="text-sm text-primary font-medium">Upload NDA template (PDF / DOCX)</span>
          <input type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={handleChange} />
        </label>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function NewTender() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { spvList } = useSPVs();
  const { user } = useAuth();

  const [ndaFile, setNdaFile] = useState<FileEntry | null>(null);
  const [publicDocs, setPublicDocs] = useState<FileEntry[]>([]);
  const [internalDocs, setInternalDocs] = useState<FileEntry[]>([]);
  const [articles, setArticles] = useState<TenderArticle[]>([]);
  const [compulsoryItems, setCompulsoryItems] = useState<CompulsoryOfferItem[]>([]);
  const [selectionCriteria, setSelectionCriteria] = useState<SelectionCriterion[]>([]);

  // Supplier invitation state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Tender structure toggles — organizer chooses which optional sections to include
  const [includeNda, setIncludeNda] = useState(true);
  const [includeParticipation, setIncludeParticipation] = useState(true);
  const [includeArticles, setIncludeArticles] = useState(true);
  const [includeCompulsory, setIncludeCompulsory] = useState(true);
  const [includeCriteria, setIncludeCriteria] = useState(true);
  const [includeDocuments, setIncludeDocuments] = useState(true);

  useEffect(() => {
    dataProvider.suppliers.list().then((data) => {
      if (data) {
        setSuppliers(data.map((s: any) => ({
          id: s.id,
          name: s.name,
          fiscalCode: s.fiscal_code,
          categories: s.categories ?? [],
          contacts: s.contacts ?? [],
          activeOffers: s.active_offers ?? 0,
          totalContracts: s.total_contracts ?? 0,
          createdBy: s.created_by ?? '',
          createdAt: s.created_at,
        })));
      }
    });
  }, []);

  const addArticle = () => {
    setArticles(prev => [...prev, {
      id: `art-${Date.now()}`,
      position: prev.length + 1,
      description: '',
      unit: '',
      quantity: 1,
    }]);
  };

  const updateArticle = (id: string, field: keyof TenderArticle, value: string | number) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const removeArticle = (id: string) => {
    setArticles(prev => {
      const filtered = prev.filter(a => a.id !== id);
      return filtered.map((a, i) => ({ ...a, position: i + 1 }));
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      budget: '',
      participationDeadlineTime: '17:00',
      minParticipants: 3,
      rounds: [
        {
          id: 'round-1',
          roundNumber: 1,
          submissionStartTime: '09:00',
          submissionEndTime: '17:00',
        } as any,
      ],
    },
  });

  const { fields, append, remove } = (() => {
    const rounds = form.watch('rounds') || [];
    return {
      fields: rounds.map((r: any, i: number) => ({ ...r, fieldId: r.id || `field-${i}` })),
      append: (val: any) => form.setValue('rounds', [...rounds, val]),
      remove: (idx: number) => form.setValue('rounds', rounds.filter((_: any, i: number) => i !== idx)),
    };
  })();

  const addRound = () => {
    const existing = form.getValues('rounds');
    append({
      id: `round-${Date.now()}`,
      roundNumber: existing.length + 1,
      submissionStartDate: undefined,
      submissionStartTime: '09:00',
      submissionEndDate: undefined,
      submissionEndTime: '17:00',
    });
  };

  const saveTenderToDb = async (data: FormValues, status: 'draft' | 'active') => {
    if (!user) return;
    setSaving(true);

    const spv = spvList.find(s => s.id === data.spvId);
    const now = new Date().toISOString();
    const toIso = (d: Date | undefined | null) =>
      d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : now;

    const tenderRow = {
      title: data.title,
      description: data.description || '',
      category: data.category || 'other',
      status,
      participation_deadline: toIso(data.participationDeadlineDate),
      participation_deadline_time: data.participationDeadlineTime || '17:00',
      submission_start_date: toIso(data.rounds?.[0]?.submissionStartDate),
      submission_start_time: data.rounds?.[0]?.submissionStartTime ?? '09:00',
      submission_end_date: toIso(data.rounds?.[0]?.submissionEndDate),
      submission_end_time: data.rounds?.[0]?.submissionEndTime ?? '17:00',
      min_participants: data.minParticipants ?? 3,
      budget: data.budget || null,
      location: spv ? `${spv.address}, ${spv.city}` : '',
      spv_id: data.spvId || null,
      documents: includeDocuments ? [...publicDocs, ...internalDocs] : [],
      questions: [],
      rounds: (data.rounds || []).map((r, i) => ({
        id: r.id,
        roundNumber: i + 1,
        startDate: toIso(r.submissionStartDate),
        endDate: toIso(r.submissionEndDate),
        status: 'upcoming',
        offers: [],
      })),
      articles: includeArticles ? articles : [],
      compulsory_offer_items: includeCompulsory ? compulsoryItems : [],
      selection_criteria: includeCriteria ? selectionCriteria : [],
      current_round: 1,
      total_rounds: data.rounds.length,
      created_by: user.uid,
    };

    let tenderId: string;
    try {
      tenderId = await dataProvider.tenders.create(tenderRow);
    } catch (error: any) {
      toast({ title: 'Error saving tender', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Create invitations for selected suppliers
    if (tenderId && selectedSupplierIds.length > 0) {
      await dataProvider.invitations.createBatch(
        tenderId,
        selectedSupplierIds,
        status === 'active' ? 'sent' : 'pending',
        user.uid,
      );
    }

    setSaving(false);
    toast({
      title: status === 'active' ? 'Tender published!' : 'Draft saved',
      description: status === 'active'
        ? `"${data.title}" published. ${selectedSupplierIds.length} supplier(s) invited.`
        : 'You can continue editing at any time.',
    });
    navigate('/tenders');
  };

  const onSubmit = (data: FormValues) => saveTenderToDb(data, 'active');
  const onFormError = (errors: any) => {
    const firstError = Object.values(errors)[0] as any;
    const msg = firstError?.message || firstError?.root?.message || 'Please fill in all required fields';
    toast({ title: 'Validation error', description: String(msg), variant: 'destructive' });
    console.log('Form validation errors:', errors);
  };
  const onSaveDraft = () => {
    const data = form.getValues();
    // Minimal validation for draft
    if (!data.title || data.title.length < 3) {
      toast({ title: 'Title required', description: 'Please enter a tender title.', variant: 'destructive' });
      return;
    }
    saveTenderToDb(data as FormValues, 'draft');
  };

  const toggleSupplier = (id: string) => {
    setSelectedSupplierIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <Layout>
      <Header
        title="New Tender"
        subtitle="Create a new procurement tender for facility management services"
      />

      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className="space-y-6 max-w-4xl mx-auto">

            {/* ── 1. General Information ─────────────────────────────────── */}
            <Section
              number={1}
              icon={<ClipboardList className="h-4 w-4" />}
              title="General Information"
              subtitle="Basic tender identification and scope"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tender Title <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Annual Cleaning Services – Westend Tower 2025" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Category <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {serviceCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="spvId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property (SPV) <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Select a property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {spvList.map((spv) => (
                            <SelectItem key={spv.id} value={spv.id}>
                              <div className="flex flex-col">
                                <span>{spv.name}</span>
                                <span className="text-xs text-muted-foreground">{spv.city} · {spv.code}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the scope of services, key requirements, and any special conditions…"
                            className="min-h-[120px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Indicative Budget
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. €150,000 – €200,000" {...field} />
                      </FormControl>
                      <FormDescription>Optional. Internal only — never visible to suppliers.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Section>

            {/* ── Tender Structure picker ─────────────────────────────────── */}
            <Section
              number={2}
              icon={<Layers className="h-4 w-4" />}
              title="Tender Structure"
              subtitle="Choose which optional sections to include in this tender"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'nda', label: 'NDA Document', desc: 'Suppliers must accept an NDA template before submitting offers', value: includeNda, set: setIncludeNda },
                  { key: 'participation', label: 'Participation Terms', desc: 'Confirmation deadline & minimum number of participants', value: includeParticipation, set: setIncludeParticipation },
                  { key: 'articles', label: 'Articles / Bill of Quantities', desc: 'Line items that suppliers must price', value: includeArticles, set: setIncludeArticles },
                  { key: 'compulsory', label: 'Compulsory Offer Content', desc: 'Documents every supplier must upload', value: includeCompulsory, set: setIncludeCompulsory },
                  { key: 'criteria', label: 'Selection Criteria', desc: 'Weighted criteria for evaluating offers', value: includeCriteria, set: setIncludeCriteria },
                  { key: 'documents', label: 'Tender Documents', desc: 'Public & internal documents attached to the tender', value: includeDocuments, set: setIncludeDocuments },
                ].map(item => (
                  <label
                    key={item.key}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      item.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30',
                    )}
                  >
                    <Switch checked={item.value} onCheckedChange={item.set} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Section>

            {/* ── NDA Document ────────────────────────────────────────────── */}
            {includeNda && (
            <Section
              number={3}
              icon={<FileSignature className="h-4 w-4" />}
              title="NDA Document"
              subtitle="Suppliers must accept the NDA template before they can submit an offer"
            >
              <NdaUploadArea
                file={ndaFile}
                onAdd={setNdaFile}
                onRemove={() => setNdaFile(null)}
              />
            </Section>
            )}

            {/* ── Participation Terms ─────────────────────────────────────── */}
            {includeParticipation && (
            <Section
              number={includeNda ? 4 : 3}
              icon={<Users className="h-4 w-4" />}
              title="Participation Terms"
              subtitle="Confirmation deadline and minimum number of participants"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="participationDeadlineDate"
                  render={({ field }) => (
                    <FormField
                      control={form.control}
                      name="participationDeadlineTime"
                      render={({ field: tf }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Participation Deadline <span className="text-destructive">*</span></FormLabel>
                          <FormDescription>Last date & time for suppliers to confirm participation{includeNda ? ' and accept the NDA' : ''}.</FormDescription>
                          <DateTimeField
                            label=""
                            dateValue={field.value}
                            timeValue={tf.value || '17:00'}
                            onDateChange={field.onChange}
                            onTimeChange={tf.onChange}
                            dateError={form.formState.errors.participationDeadlineDate?.message}
                            timeError={form.formState.errors.participationDeadlineTime?.message}
                          />
                        </FormItem>
                      )}
                    />
                  )}
                />

                <FormField
                  control={form.control}
                  name="minParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min. Participants <span className="text-destructive">*</span></FormLabel>
                      <FormDescription>Minimum confirmed participants to proceed to offer phase.</FormDescription>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={99}
                            className="w-24"
                            {...field}
                          />
                        </FormControl>
                        <span className="text-sm text-muted-foreground">suppliers</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Section>
            )}

            {/* ── 4. Invite Suppliers ────────────────────────────────────── */}
            <Section
              number={4}
              icon={<Users className="h-4 w-4" />}
              title="Invite Suppliers"
              subtitle="Select suppliers to participate in this tender"
            >
              <div className="space-y-3">
                {suppliers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nu există furnizori. Adaugă furnizori din secțiunea Suppliers.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {suppliers.map(s => (
                      <label
                        key={s.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedSupplierIds.includes(s.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/30"
                        )}
                      >
                        <Checkbox
                          checked={selectedSupplierIds.includes(s.id)}
                          onCheckedChange={() => toggleSupplier(s.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.fiscalCode} · {s.categories.join(', ')} · {s.contacts.length} contact(e)
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {selectedSupplierIds.length > 0 && (
                  <p className="text-xs text-primary font-medium">
                    {selectedSupplierIds.length} furnizor(i) selectat(i) pentru invitare
                  </p>
                )}
              </div>
            </Section>

            {/* ── 5. Bidding Rounds ──────────────────────────────────────── */}
            <Section
              number={5}
              icon={<Layers className="h-4 w-4" />}
              title="Bidding Rounds"
              subtitle="Define submission windows for each negotiation round"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  All suppliers see the same deadlines. Additional rounds can be added after the tender is published.
                </div>

                {fields.map((field, idx) => (
                  <RoundCard
                    key={field.fieldId}
                    index={idx}
                    control={form.control}
                    canRemove={fields.length > 1}
                    onRemove={() => remove(idx)}
                    errors={form.formState.errors.rounds?.[idx]}
                  />
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRound}
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Round
                </Button>
              </div>
            </Section>

            {/* ── 6. Articles / Bill of Quantities ───────────────────────── */}
            {includeArticles && (
            <Section
              number={6}
              icon={<Package className="h-4 w-4" />}
              title="Articles / Bill of Quantities"
              subtitle="Define line items that suppliers must price in their offer"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground">
                  <Package className="h-3.5 w-3.5 flex-shrink-0" />
                  Suppliers will fill in unit prices for each article when submitting their offer. Total amount is calculated automatically.
                </div>

                {articles.length > 0 && (
                  <div className="grid grid-cols-[32px_1fr_90px_80px_32px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/40 rounded-t-md border border-border">
                    <span>#</span>
                    <span>Description</span>
                    <span>Unit</span>
                    <span>Quantity</span>
                    <span />
                  </div>
                )}

                {articles.length > 0 && (
                  <div className="border border-t-0 border-border rounded-b-md divide-y divide-border">
                    {articles.map((article, idx) => (
                      <div key={article.id} className="grid grid-cols-[32px_1fr_90px_80px_32px] gap-2 px-3 py-2.5 items-center group hover:bg-muted/20 transition-colors">
                        <span className="text-xs text-muted-foreground font-mono">{String(idx + 1).padStart(2, '0')}</span>
                        <Input
                          value={article.description}
                          onChange={e => updateArticle(article.id, 'description', e.target.value)}
                          placeholder="Article description…"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={article.unit}
                          onChange={e => updateArticle(article.id, 'unit', e.target.value)}
                          placeholder="m², h, pcs…"
                          className="h-8 text-sm"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={article.quantity}
                          onChange={e => updateArticle(article.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                          onClick={() => removeArticle(article.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addArticle}
                  className="w-full border-dashed gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add Article
                </Button>
              </div>
            </Section>
            )}

            {/* ── 7. Compulsory Offer Content ────────────────────────────── */}
            {includeCompulsory && (
            <Section
              number={7}
              icon={<ListChecks className="h-4 w-4" />}
              title="Compulsory Offer Content"
              subtitle="Documents every supplier must upload to complete their offer"
            >
              <CompulsoryOfferSection
                items={compulsoryItems}
                canEdit={true}
                onChange={setCompulsoryItems}
              />
            </Section>
            )}

            {/* ── 8. Selection Criteria ──────────────────────────────────── */}
            {includeCriteria && (
            <Section
              number={8}
              icon={<Target className="h-4 w-4" />}
              title="Selection Criteria"
              subtitle="Weighted evaluation criteria — must sum to 100%"
            >
              <SelectionCriteriaSection
                criteria={selectionCriteria}
                canEdit={true}
                onChange={setSelectionCriteria}
              />
            </Section>
            )}

            {/* ── 9. Documents ───────────────────────────────────────────── */}
            {includeDocuments && (
            <Section
              number={9}
              icon={<FileText className="h-4 w-4" />}
              title="Tender Documents"
              subtitle="Upload documents for participants and internal use"
            >
              <div className="space-y-6">
                <DocumentUploadArea
                  label="Public Documents"
                  description="Visible to all participating suppliers — technical specs, scope of work, site plans, etc."
                  icon={<Globe className="h-4 w-4" />}
                  files={publicDocs}
                  onAdd={(f) => setPublicDocs((prev) => [...prev, f])}
                  onRemove={(id) => setPublicDocs((prev) => prev.filter((f) => f.id !== id))}
                  accent="primary"
                />

                <Separator />

                <DocumentUploadArea
                  label="Internal Documents"
                  description="Only visible to tender organizers and admins — budget analysis, evaluation matrices, notes."
                  icon={<Lock className="h-4 w-4" />}
                  files={internalDocs}
                  onAdd={(f) => setInternalDocs((prev) => [...prev, f])}
                  onRemove={(id) => setInternalDocs((prev) => prev.filter((f) => f.id !== id))}
                  accent="warning"
                />
              </div>
            </Section>
            )}

            {/* ── Summary bar ───────────────────────────────────────────── */}
            <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur border-t border-border -mx-6 px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>
                  {fields.length} round{fields.length !== 1 ? 's' : ''} ·{' '}
                  {articles.length} article{articles.length !== 1 ? 's' : ''} ·{' '}
                  {compulsoryItems.length} req. doc{compulsoryItems.length !== 1 ? 's' : ''} ·{' '}
                  {selectionCriteria.reduce((s, c) => s + c.weight, 0)}% criteria weight ·{' '}
                  {selectedSupplierIds.length} supplier{selectedSupplierIds.length !== 1 ? 's' : ''}
                  {ndaFile ? ' · NDA attached' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => navigate('/tenders')} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" variant="secondary" onClick={onSaveDraft} disabled={saving}>
                  {saving ? 'Saving…' : 'Save as Draft'}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Publishing…' : 'Publish Tender'}
                  {!saving && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
