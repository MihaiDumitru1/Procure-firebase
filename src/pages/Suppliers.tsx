import { useState, useEffect } from 'react';
import { Search, Filter, Mail, Phone, Plus, UserPlus, Shield, X, ChevronDown, ChevronUp, Tag, UserCheck, UserX, KeyRound, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { serviceCategories } from '@/data/categories';
import { Supplier, SupplierContact } from '@/types/tender';
import { cn } from '@/lib/utils';
import { dataProvider } from '@/data-access';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

function getCategoryLabel(value: string) {
  return serviceCategories.find(c => c.value === value)?.label ?? value;
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

function dbRowToSupplier(row: Record<string, unknown>): Supplier {
  const contacts = (row.contacts as SupplierContact[] | null) ?? [];
  return {
    id: row.id as string,
    name: row.name as string,
    fiscalCode: row.fiscal_code as string,
    categories: (row.categories as string[]) ?? [],
    activeOffers: Number(row.active_offers ?? 0),
    totalContracts: Number(row.total_contracts ?? 0),
    createdBy: (row.created_by as string) ?? '',
    createdAt: (row.created_at as string) ?? '',
    contacts,
  };
}

// ─── Create Account Dialog ───────────────────────────────────────────────────

interface CreateAccountDialogProps {
  contact: SupplierContact;
  supplierCompany: string;
  open: boolean;
  onClose: () => void;
  onCreated: (contactId: string, userId: string) => void;
}

function CreateAccountDialog({ contact, supplierCompany, open, onClose, onCreated }: CreateAccountDialogProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!password || password.length < 6) errs.password = 'Minim 6 caractere';
    if (password !== confirmPassword) errs.confirmPassword = 'Parolele nu coincid';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const data = await dataProvider.users.create({
          email: contact.email,
          password,
          full_name: contact.name,
          role: 'supplier',
          company: supplierCompany,
        });
      if (data.error) {
        toast({ title: 'Eroare', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Cont creat cu succes', description: `${contact.email} poate accesa acum platforma.` });
        onCreated(contact.id, data.user?.id ?? 'linked');
        setPassword(''); setConfirmPassword(''); setErrors({});
        onClose();
      }
    } catch {
      toast({ title: 'Eroare de rețea', variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Crează cont de acces
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md bg-muted/50 px-4 py-3 space-y-1">
            <p className="text-sm font-medium text-foreground">{contact.name}</p>
            <p className="text-xs text-muted-foreground">{contact.email}</p>
            <p className="text-xs text-muted-foreground italic">{supplierCompany}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Se va crea un cont cu rolul <span className="font-semibold text-foreground">Supplier</span>. Contactul va putea accesa Portalul Furnizori cu emailul de mai sus.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="ca-pwd">Parolă inițială <span className="text-destructive">*</span></Label>
            <Input id="ca-pwd" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minim 6 caractere" />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ca-pwd2">Confirmă parola <span className="text-destructive">*</span></Label>
            <Input id="ca-pwd2" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repetă parola" />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Anulează</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserCheck className="h-4 w-4 mr-1" />}
            Crează cont
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Contact Dialog ───────────────────────────────────────────────────────

interface AddContactDialogProps {
  supplier: Supplier;
  open: boolean;
  onClose: () => void;
  onAdd: (supplierId: string, contact: SupplierContact) => void;
  isAppAdmin: boolean;
}

function AddContactDialog({ supplier, open, onClose, onAdd, isAppAdmin }: AddContactDialogProps) {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Numele este obligatoriu';
    if (!email.trim()) errs.email = 'Emailul este obligatoriu';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Email invalid';
    if (createAccount) {
      if (!password || password.length < 6) errs.password = 'Minim 6 caractere';
      if (password !== confirmPassword) errs.confirmPassword = 'Parolele nu coincid';
    }
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);

    let linkedUserId: string | undefined;

    if (createAccount && isAppAdmin) {
      try {
        const data = await dataProvider.users.create({
            email: email.trim(),
            password,
            full_name: name.trim(),
            role: 'supplier',
            company: supplier.name,
          });
        if (data.error) {
          toast({ title: 'Eroare creare cont', description: data.error, variant: 'destructive' });
          setSaving(false);
          return;
        }
        linkedUserId = data.user?.id;
        toast({ title: 'Cont creat', description: `${email.trim()} poate accesa acum platforma.` });
      } catch {
        toast({ title: 'Eroare de rețea', variant: 'destructive' });
        setSaving(false);
        return;
      }
    }

    onAdd(supplier.id, {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      addedBy: user?.uid ?? '',
      addedByRole: role ?? 'app-admin',
      linkedUserId,
    });
    setName(''); setEmail(''); setPhone(''); setPassword(''); setConfirmPassword('');
    setCreateAccount(false); setErrors({});
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Adaugă Contact – {supplier.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Nume complet <span className="text-destructive">*</span></Label>
            <Input id="c-name" value={name} onChange={e => setName(e.target.value)} placeholder="ex. Ion Popescu" />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Adresă email <span className="text-destructive">*</span></Label>
            <Input id="c-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ion@companie.ro" />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">Telefon <span className="text-muted-foreground text-xs">(opțional)</span></Label>
            <Input id="c-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+40 123 456 789" />
          </div>

          {isAppAdmin && (
            <div className="rounded-md border border-border p-3 space-y-3">
              <button
                type="button"
                className="flex items-center gap-2 w-full text-left"
                onClick={() => setCreateAccount(v => !v)}
              >
                <div className={cn(
                  'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors',
                  createAccount ? 'bg-primary border-primary' : 'border-border'
                )}>
                  {createAccount && <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className="text-sm font-medium text-foreground">Crează și cont de acces în platformă</span>
              </button>
              {createAccount && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Parolă inițială <span className="text-destructive">*</span></Label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minim 6 caractere" className="h-9 text-sm" />
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Confirmă parola <span className="text-destructive">*</span></Label>
                    <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repetă parola" className="h-9 text-sm" />
                    {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Anulează</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Adaugă Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Supplier Dialog ──────────────────────────────────────────────────────

interface AddSupplierDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (supplier: Supplier) => void;
}

function AddSupplierDialog({ open, onClose, onAdd }: AddSupplierDialogProps) {
  const { user, role } = useAuth();
  const [name, setName] = useState('');
  const [fiscalCode, setFiscalCode] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [contacts, setContacts] = useState<{ name: string; email: string; phone: string }[]>([
    { name: '', email: '', phone: '' },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleCategory = (val: string) => {
    setSelectedCategories(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const updateContact = (idx: number, field: string, value: string) => {
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const addContactRow = () => setContacts(prev => [...prev, { name: '', email: '', phone: '' }]);
  const removeContactRow = (idx: number) => setContacts(prev => prev.filter((_, i) => i !== idx));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Numele furnizorului este obligatoriu';
    if (!fiscalCode.trim()) errs.fiscalCode = 'Codul fiscal este obligatoriu';
    if (selectedCategories.length === 0) errs.categories = 'Selectează cel puțin o categorie';
    contacts.forEach((c, i) => {
      if (!c.name.trim()) errs[`contact_${i}_name`] = 'Nume obligatoriu';
      if (!c.email.trim()) errs[`contact_${i}_email`] = 'Email obligatoriu';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) errs[`contact_${i}_email`] = 'Email invalid';
    });
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const newSupplier: Supplier = {
      id: crypto.randomUUID(),
      name: name.trim(),
      fiscalCode: fiscalCode.trim(),
      categories: selectedCategories,
      activeOffers: 0,
      totalContracts: 0,
      createdBy: user?.uid ?? '',
      createdAt: new Date().toISOString().slice(0, 10),
      contacts: contacts
        .filter(c => c.name.trim() && c.email.trim())
        .map((c, i) => ({
          id: crypto.randomUUID(),
          name: c.name.trim(),
          email: c.email.trim(),
          phone: c.phone.trim() || undefined,
          addedBy: user?.uid ?? '',
          addedByRole: role ?? 'app-admin',
        })),
    };
    onAdd(newSupplier);
    setName(''); setFiscalCode(''); setSelectedCategories([]);
    setContacts([{ name: '', email: '', phone: '' }]); setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Adaugă Furnizor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informații companie</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="s-name">Nume companie <span className="text-destructive">*</span></Label>
                <Input id="s-name" value={name} onChange={e => setName(e.target.value)} placeholder="ex. CleanPro Services SRL" />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="s-fiscal">CUI / Cod Fiscal <span className="text-destructive">*</span></Label>
                <Input id="s-fiscal" value={fiscalCode} onChange={e => setFiscalCode(e.target.value)} placeholder="ex. RO12345678" />
                {errors.fiscalCode && <p className="text-xs text-destructive">{errors.fiscalCode}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Categorii servicii <span className="text-destructive">*</span></Label>
              <div className="flex flex-wrap gap-2 p-3 rounded-md border border-input bg-background min-h-[44px]">
                {serviceCategories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.value)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-full border transition-colors font-medium',
                      selectedCategories.includes(cat.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {errors.categories && <p className="text-xs text-destructive">{errors.categories}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contacte de invitație</h3>
              <Button type="button" variant="outline" size="sm" onClick={addContactRow} className="gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Adaugă rând
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Aceste contacte vor primi invitațiile la licitații. Conturile de acces pot fi create ulterior din cardul furnizorului.</p>

            {contacts.map((c, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg bg-muted/40 border border-border">
                <div className="col-span-12 sm:col-span-4 space-y-1">
                  <Label className="text-xs">Nume <span className="text-destructive">*</span></Label>
                  <Input value={c.name} onChange={e => updateContact(idx, 'name', e.target.value)} placeholder="Nume complet" className="h-9 text-sm" />
                  {errors[`contact_${idx}_name`] && <p className="text-xs text-destructive">{errors[`contact_${idx}_name`]}</p>}
                </div>
                <div className="col-span-12 sm:col-span-4 space-y-1">
                  <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
                  <Input type="email" value={c.email} onChange={e => updateContact(idx, 'email', e.target.value)} placeholder="email@companie.ro" className="h-9 text-sm" />
                  {errors[`contact_${idx}_email`] && <p className="text-xs text-destructive">{errors[`contact_${idx}_email`]}</p>}
                </div>
                <div className="col-span-10 sm:col-span-3 space-y-1">
                  <Label className="text-xs">Telefon <span className="text-muted-foreground">(opt.)</span></Label>
                  <Input value={c.phone} onChange={e => updateContact(idx, 'phone', e.target.value)} placeholder="+40 ..." className="h-9 text-sm" />
                </div>
                <div className="col-span-2 sm:col-span-1 pt-5">
                  {contacts.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeContactRow(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Anulează</Button>
          <Button onClick={handleSubmit}>
            <Plus className="h-4 w-4 mr-1" />
            Adaugă Furnizor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Supplier Dialog ─────────────────────────────────────────────────────

interface EditSupplierDialogProps {
  supplier: Supplier;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Supplier) => void;
}

function EditSupplierDialog({ supplier, open, onClose, onSave }: EditSupplierDialogProps) {
  const [name, setName] = useState(supplier.name);
  const [fiscalCode, setFiscalCode] = useState(supplier.fiscalCode);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([...supplier.categories]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleCategory = (val: string) => {
    setSelectedCategories(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Numele furnizorului este obligatoriu';
    if (!fiscalCode.trim()) errs.fiscalCode = 'Codul fiscal este obligatoriu';
    if (selectedCategories.length === 0) errs.categories = 'Selectează cel puțin o categorie';
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({
      ...supplier,
      name: name.trim(),
      fiscalCode: fiscalCode.trim(),
      categories: selectedCategories,
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Editează Furnizor
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="e-name">Nume companie <span className="text-destructive">*</span></Label>
              <Input id="e-name" value={name} onChange={e => setName(e.target.value)} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="e-fiscal">CUI / Cod Fiscal <span className="text-destructive">*</span></Label>
              <Input id="e-fiscal" value={fiscalCode} onChange={e => setFiscalCode(e.target.value)} />
              {errors.fiscalCode && <p className="text-xs text-destructive">{errors.fiscalCode}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categorii servicii <span className="text-destructive">*</span></Label>
            <div className="flex flex-wrap gap-2 p-3 rounded-md border border-input bg-background min-h-[44px]">
              {serviceCategories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.value)}
                  className={cn(
                    'px-3 py-1 text-xs rounded-full border transition-colors font-medium',
                    selectedCategories.includes(cat.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            {errors.categories && <p className="text-xs text-destructive">{errors.categories}</p>}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Anulează</Button>
          <Button onClick={handleSubmit}>
            <Pencil className="h-4 w-4 mr-1" />
            Salvează
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Suppliers() {
  const { role } = useAuth();
  const { toast } = useToast();

  const isAppAdmin = role === 'app-admin';
  const isTenderOrganizer = role === 'tender-organizer' || role === 'procurement-officer';
  const canAddSupplier = isAppAdmin;
  const canAddContact = isAppAdmin || isTenderOrganizer;
  const canCreateAccount = isAppAdmin;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addContactTarget, setAddContactTarget] = useState<Supplier | null>(null);
  const [createAccountTarget, setCreateAccountTarget] = useState<{ contact: SupplierContact; supplier: Supplier } | null>(null);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [editContactTarget, setEditContactTarget] = useState<{ contact: SupplierContact; supplier: Supplier } | null>(null);
  const [editContactForm, setEditContactForm] = useState({ name: '', email: '', phone: '' });
  const [expandedContacts, setExpandedContacts] = useState<Set<string>>(new Set());

  // Load suppliers from DB, fallback to mock for demo
  useEffect(() => {
    (async () => {
      try {
        const data = await dataProvider.suppliers.list();
        if (data && data.length > 0) {
          setSuppliers(data.map(r => dbRowToSupplier(r as Record<string, unknown>)));
        } else {
          setSuppliers([]);
        }
      } catch {
        setSuppliers([]);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.categories.some(c => getCategoryLabel(c).toLowerCase().includes(search.toLowerCase()))
  );

  const toggleContacts = (id: string) => {
    setExpandedContacts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const persistSupplier = async (supplier: Supplier) => {
    try {
      const payload = {
        id: supplier.id,
        name: supplier.name || '',
        fiscal_code: supplier.fiscalCode || '',
        categories: supplier.categories || [],
        contacts: supplier.contacts || [],
        active_offers: supplier.activeOffers ?? 0,
        total_contracts: supplier.totalContracts ?? 0,
        created_by: supplier.createdBy || null,
        created_at: supplier.createdAt || new Date().toISOString(),
      };
      await dataProvider.suppliers.upsert(payload as any);
    } catch (error: any) {
      console.error('Failed to persist supplier:', error);
      toast({ title: 'Eroare salvare', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddSupplier = async (supplier: Supplier) => {
    setSuppliers(prev => [...prev, supplier]);
    await persistSupplier(supplier);
    toast({ title: 'Furnizor adăugat', description: `${supplier.name} a fost salvat.` });
  };

  const handleAddContact = async (supplierId: string, contact: SupplierContact) => {
    setSuppliers(prev =>
      prev.map(s => s.id === supplierId ? { ...s, contacts: [...s.contacts, contact] } : s)
    );
    // Persist updated contacts
    const updated = suppliers.find(s => s.id === supplierId);
    if (updated) {
      await persistSupplier({ ...updated, contacts: [...updated.contacts, contact] });
    }
  };

  const handleAccountCreated = async (supplierId: string, contactId: string, userId: string) => {
    const updatedSuppliers = suppliers.map(s =>
      s.id === supplierId
        ? { ...s, contacts: s.contacts.map(c => c.id === contactId ? { ...c, linkedUserId: userId } : c) }
        : s
    );
    setSuppliers(updatedSuppliers);
    const updated = updatedSuppliers.find(s => s.id === supplierId);
    if (updated) {
      await persistSupplier(updated);
    }
  };

  const handleEditSupplier = async (updated: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s));
    await persistSupplier(updated);
    toast({ title: 'Furnizor actualizat', description: `${updated.name} a fost salvat.` });
  };

  const handleDeleteContact = async (supplier: Supplier, contactId: string) => {
    if (!confirm('Sigur vrei să ștergi acest contact?')) return;
    const updated = { ...supplier, contacts: supplier.contacts.filter(c => c.id !== contactId) };
    setSuppliers(prev => prev.map(s => s.id === supplier.id ? updated : s));
    await persistSupplier(updated);
    toast({ title: 'Contact șters' });
  };

  const openEditContact = (contact: SupplierContact, supplier: Supplier) => {
    setEditContactForm({ name: contact.name, email: contact.email, phone: contact.phone || '' });
    setEditContactTarget({ contact, supplier });
  };

  const handleSaveEditContact = async () => {
    if (!editContactTarget) return;
    const { contact, supplier } = editContactTarget;
    const updatedContacts = supplier.contacts.map(c =>
      c.id === contact.id ? { ...c, name: editContactForm.name, email: editContactForm.email, phone: editContactForm.phone } : c
    );
    const updated = { ...supplier, contacts: updatedContacts };
    setSuppliers(prev => prev.map(s => s.id === supplier.id ? updated : s));
    await persistSupplier(updated);
    setEditContactTarget(null);
    toast({ title: 'Contact actualizat' });
  };

  if (loading) {
    return (
      <Layout>
        <Header title="Furnizori" subtitle="Se încarcă..." />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header
        title="Furnizori"
        subtitle="Gestionează directorul de furnizori și contactele de invitație"
      />

      <div className="p-6 space-y-6">
        {/* Role indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          Vizualizat ca <span className="font-semibold text-foreground capitalize">{(role ?? '').replace('-', ' ')}</span>
          {isAppAdmin && <Badge variant="outline" className="text-xs border-primary text-primary ml-1">Acces complet</Badge>}
          {isTenderOrganizer && !isAppAdmin && <Badge variant="outline" className="text-xs ml-1">Poate adăuga contacte</Badge>}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Caută furnizori sau categorii..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtre
          </Button>
          {canAddSupplier && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adaugă Furnizor
            </Button>
          )}
        </div>

        {/* Suppliers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(supplier => {
            const contactsExpanded = expandedContacts.has(supplier.id);
            const linkedCount = supplier.contacts.filter(c => c.linkedUserId).length;
            return (
              <div
                key={supplier.id}
                className="bg-card rounded-lg border border-border p-5 hover:shadow-card-hover transition-shadow animate-fade-in flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {supplier.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{supplier.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{supplier.fiscalCode}</p>
                  </div>
                  {isAppAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                      onClick={() => setEditTarget(supplier)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Categories */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {supplier.categories.map(cat => (
                    <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                      <Tag className="h-2.5 w-2.5" />
                      {getCategoryLabel(cat)}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
                  <div>
                    <span className="text-muted-foreground">Oferte active: </span>
                    <span className="font-medium text-foreground">{supplier.activeOffers}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contracte: </span>
                    <span className="font-medium text-foreground">{supplier.totalContracts}</span>
                  </div>
                </div>

                {/* Contacts collapsible */}
                <div className="mt-4 pt-4 border-t border-border">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-sm font-medium text-foreground hover:text-primary transition-colors"
                    onClick={() => toggleContacts(supplier.id)}
                  >
                    <span className="flex items-center gap-2">
                      Contacte ({supplier.contacts.length})
                      {linkedCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
                          <UserCheck className="h-3 w-3" />
                          {linkedCount} cu cont
                        </span>
                      )}
                    </span>
                    {contactsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {contactsExpanded && (
                    <div className="mt-3 space-y-2.5">
                      {supplier.contacts.map(contact => (
                        <div key={contact.id} className="rounded-md bg-muted/50 px-3 py-2 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{contact.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {contact.linkedUserId ? (
                                 <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium whitespace-nowrap">
                                   <UserCheck className="h-3 w-3" />
                                   Cont activ
                                 </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full bg-muted text-muted-foreground font-medium whitespace-nowrap">
                                  <UserX className="h-3 w-3" />
                                  Fără cont
                                </span>
                              )}
                              {isAppAdmin && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                                    onClick={() => openEditContact(contact, supplier)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleDeleteContact(supplier, contact.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{contact.email}</span>
                          </div>
                          {contact.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                          {/* Create account button — only if no account yet and user is admin */}
                          {canCreateAccount && !contact.linkedUserId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs mt-1 gap-1 text-muted-foreground hover:text-primary"
                              onClick={() => setCreateAccountTarget({ contact, supplier })}
                            >
                              <KeyRound className="h-3 w-3" />
                              Crează cont de acces
                            </Button>
                          )}
                        </div>
                      ))}

                      {canAddContact && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-1 gap-1.5 text-xs h-8"
                          onClick={() => setAddContactTarget(supplier)}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Adaugă Contact
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-base font-medium">Niciun furnizor găsit</p>
            <p className="text-sm mt-1">Ajustează căutarea sau adaugă un furnizor nou.</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {addOpen && (
        <AddSupplierDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onAdd={handleAddSupplier}
        />
      )}
      {addContactTarget && (
        <AddContactDialog
          supplier={addContactTarget}
          open={!!addContactTarget}
          onClose={() => setAddContactTarget(null)}
          onAdd={handleAddContact}
          isAppAdmin={isAppAdmin}
        />
      )}
      {createAccountTarget && (
        <CreateAccountDialog
          contact={createAccountTarget.contact}
          supplierCompany={createAccountTarget.supplier.name}
          open={!!createAccountTarget}
          onClose={() => setCreateAccountTarget(null)}
          onCreated={(contactId, userId) => {
            handleAccountCreated(createAccountTarget.supplier.id, contactId, userId);
            setCreateAccountTarget(null);
          }}
        />
      )}
      {editTarget && (
        <EditSupplierDialog
          supplier={editTarget}
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEditSupplier}
        />
      )}

      {/* Edit Contact Dialog */}
      {editContactTarget && (
        <Dialog open={!!editContactTarget} onOpenChange={() => setEditContactTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Editează contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Nume</Label>
                <Input
                  value={editContactForm.name}
                  onChange={e => setEditContactForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nume contact"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editContactForm.email}
                  onChange={e => setEditContactForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplu.ro"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input
                  value={editContactForm.phone}
                  onChange={e => setEditContactForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+40 7xx xxx xxx"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditContactTarget(null)}>Anulează</Button>
              <Button onClick={handleSaveEditContact}>Salvează</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
