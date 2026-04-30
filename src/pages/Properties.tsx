import { useState } from 'react';
// SPV state managed via SPVContext
import { Link } from 'react-router-dom';
import { Building2, MapPin, AreaChart, Layers, Plus, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { useTenders } from '@/hooks/useTenders';
import { useSPVs } from '@/context/SPVContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { PropertyType } from '@/types/tender';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const propertyTypeLabels: Record<string, string> = {
  'office': 'Office',
  'retail': 'Retail',
  'industrial': 'Industrial',
  'residential': 'Residential',
  'mixed-use': 'Mixed Use',
  'logistics': 'Logistics',
  'other': 'Other',
};

const propertyTypeColors: Record<string, string> = {
  'office': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'retail': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'industrial': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'residential': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'mixed-use': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'logistics': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'other': 'bg-muted text-muted-foreground',
};

const EMPTY_FORM = {
  name: '',
  code: '',
  address: '',
  city: '',
  country: '',
  propertyType: '' as PropertyType | '',
  totalArea: '',
  yearBuilt: '',
  manager: '',
  description: '',
};

export default function Properties() {
  const { role, fullName } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'app-admin';

  const { spvList, addSPV, loading } = useSPVs();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const totalArea = spvList.reduce((sum, s) => sum + s.totalArea, 0);
  const { tenders: allDbTenders } = useTenders();
  const totalActive = allDbTenders.filter(t => t.status === 'active').length;

  const handleChange = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const isValid =
    form.name.trim() &&
    form.code.trim() &&
    form.address.trim() &&
    form.city.trim() &&
    form.country.trim() &&
    form.propertyType &&
    form.totalArea &&
    !isNaN(Number(form.totalArea)) &&
    Number(form.totalArea) > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      const newSPV = await addSPV({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        propertyType: form.propertyType as PropertyType,
        totalArea: Number(form.totalArea),
        yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : undefined,
        manager: form.manager.trim() || fullName || 'Admin',
        description: form.description.trim() || undefined,
      });

      setForm(EMPTY_FORM);
      setOpen(false);

      toast({
        title: 'Proprietate adăugată',
        description: `${newSPV.name} (${newSPV.code}) a fost adăugată cu succes.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'A apărut o eroare.';
      toast({
        title: 'Eroare',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Header title="Properties (SPVs)" subtitle="Manage your property portfolio and their procurement activities" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header
        title="Properties (SPVs)"
        subtitle="Manage your property portfolio and their procurement activities"
      />

      <div className="p-6 space-y-6">
        {/* Summary row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{spvList.length}</p>
              <p className="text-sm text-muted-foreground">Properties</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <AreaChart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{(totalArea / 1000).toFixed(0)}k m²</p>
              <p className="text-sm text-muted-foreground">Total Managed Area</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalActive}</p>
              <p className="text-sm text-muted-foreground">Active Tenders</p>
            </div>
          </div>
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">All Properties</h2>
          {isAdmin && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          )}
        </div>

        {/* SPV Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {spvList.map((spv) => {
            const spvTenders = allDbTenders.filter(t => t.spvId === spv.id);
            const activeTenders = spvTenders.filter(t => t.status === 'active').length;
            const draftTenders = spvTenders.filter(t => t.status === 'draft').length;

            return (
              <Link
                key={spv.id}
                to={`/properties/${spv.id}`}
                className="block bg-card rounded-lg border border-border p-5 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all animate-fade-in"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    propertyTypeColors[spv.propertyType]
                  )}>
                    {propertyTypeLabels[spv.propertyType]}
                  </span>
                </div>

                {/* Name & code */}
                <h3 className="font-semibold text-foreground">{spv.name}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{spv.code}</p>

                {/* Location */}
                <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{spv.city}, {spv.country}</span>
                </div>

                {/* Area */}
                <p className="text-sm text-muted-foreground mt-1">
                  {spv.totalArea.toLocaleString()} m²
                  {spv.yearBuilt && <span className="ml-2">· Built {spv.yearBuilt}</span>}
                </p>

                {/* Divider */}
                <div className="border-t border-border mt-4 pt-4 flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-status-active" />
                    <span className="text-xs text-muted-foreground">{activeTenders} active tender{activeTenders !== 1 ? 's' : ''}</span>
                  </div>
                  {draftTenders > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                      <span className="text-xs text-muted-foreground">{draftTenders} draft</span>
                    </div>
                  )}
                  {spvTenders.length === 0 && (
                    <span className="text-xs text-muted-foreground">No tenders yet</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Add Property Dialog — only app-admin */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adaugă proprietate nouă</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Row: Name + Code */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-name">Nume proprietate *</Label>
                <Input
                  id="prop-name"
                  placeholder="ex. Westend Tower"
                  value={form.name}
                  onChange={e => handleChange('name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-code">Cod *</Label>
                <Input
                  id="prop-code"
                  placeholder="ex. WOT-006"
                  value={form.code}
                  onChange={e => handleChange('code', e.target.value)}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="prop-address">Adresă *</Label>
              <Input
                id="prop-address"
                placeholder="ex. Bockenheimer Landstrasse 51"
                value={form.address}
                onChange={e => handleChange('address', e.target.value)}
              />
            </div>

            {/* City + Country */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-city">Oraș *</Label>
                <Input
                  id="prop-city"
                  placeholder="ex. Frankfurt"
                  value={form.city}
                  onChange={e => handleChange('city', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-country">Țară *</Label>
                <Input
                  id="prop-country"
                  placeholder="ex. Germany"
                  value={form.country}
                  onChange={e => handleChange('country', e.target.value)}
                />
              </div>
            </div>

            {/* Property Type */}
            <div className="space-y-1.5">
              <Label>Tip proprietate *</Label>
              <Select value={form.propertyType} onValueChange={v => handleChange('propertyType', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează tipul..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(propertyTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Area + Year */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-area">Suprafață totală (m²) *</Label>
                <Input
                  id="prop-area"
                  type="number"
                  min="1"
                  placeholder="ex. 12000"
                  value={form.totalArea}
                  onChange={e => handleChange('totalArea', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-year">Anul construirii</Label>
                <Input
                  id="prop-year"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  placeholder="ex. 2010"
                  value={form.yearBuilt}
                  onChange={e => handleChange('yearBuilt', e.target.value)}
                />
              </div>
            </div>

            {/* Manager */}
            <div className="space-y-1.5">
              <Label htmlFor="prop-manager">Manager proprietate</Label>
              <Input
                id="prop-manager"
                placeholder={fullName || 'Nume manager'}
                value={form.manager}
                onChange={e => handleChange('manager', e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="prop-desc">Descriere</Label>
              <Textarea
                id="prop-desc"
                placeholder="Descriere scurtă a proprietății..."
                rows={3}
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Anulează
            </Button>
            <Button onClick={handleSave} disabled={!isValid || saving}>
              {saving ? 'Se salvează...' : 'Adaugă proprietate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
