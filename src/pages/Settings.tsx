import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { serviceCategories as initialCategories } from '@/data/categories';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ServiceCategoryItem } from '@/types/tender';
import { Plus, Pencil, Trash2, Check, X, Tag, Users, ShieldCheck, KeyRound, Loader2, ShieldAlert, Building2, UserCircle2 } from 'lucide-react';
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
import { dataProvider } from '@/data-access';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type AppRole = 'app-admin' | 'tender-organizer' | 'procurement-officer' | 'supplier';

const ROLE_LABELS: Record<string, string> = {
  'app-admin': 'App Admin',
  'tender-organizer': 'Tender Organizer',
  'procurement-officer': 'Procurement Officer',
  supplier: 'Supplier',
};

const INTERNAL_ROLES: AppRole[] = ['app-admin', 'tender-organizer', 'procurement-officer'];
const MANAGEABLE_ROLES: AppRole[] = ['app-admin', 'tender-organizer', 'procurement-officer', 'supplier'];

interface PlatformUser {
  id: string;
  email: string;
  full_name: string;
  role: string | null;
  created_at: string;
  company?: string;
}

type UserForm = { full_name: string; email: string; password: string; role: AppRole; company: string };
const emptyForm: UserForm = { full_name: '', email: '', password: '', role: 'tender-organizer', company: '' };
type SupplierForm = { full_name: string; email: string; password: string; company: string; supplier_id: string };
const emptySupplierForm: SupplierForm = { full_name: '', email: '', password: '', company: '', supplier_id: '' };

export default function Settings() {
  const { user, role, fullName, updatePassword } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'app-admin';

  // ── Service Categories ────────────────────────────────────────────────────
  const [categories, setCategories] = useState<ServiceCategoryItem[]>(initialCategories);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatLabel, setEditingCatLabel] = useState('');
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [addingNewCat, setAddingNewCat] = useState(false);

  const startEditCat = (cat: ServiceCategoryItem) => { setEditingCatId(cat.id); setEditingCatLabel(cat.label); };
  const saveEditCat = (id: string) => {
    if (!editingCatLabel.trim()) return;
    setCategories(prev => prev.map(c => c.id === id ? { ...c, label: editingCatLabel.trim() } : c));
    setEditingCatId(null); setEditingCatLabel('');
  };
  const cancelEditCat = () => { setEditingCatId(null); setEditingCatLabel(''); };
  const deleteCat = (id: string) => setCategories(prev => prev.filter(c => c.id !== id));
  const addCat = () => {
    if (!newCategoryLabel.trim()) return;
    const value = newCategoryLabel.trim().toLowerCase().replace(/\s+/g, '-');
    setCategories(prev => [...prev, { id: `cat-${Date.now()}`, label: newCategoryLabel.trim(), value }]);
    setNewCategoryLabel(''); setAddingNewCat(false);
  };

  // ── User Management ───────────────────────────────────────────────────────
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [userForm, setUserForm] = useState<UserForm>(emptyForm);
  const [userFormErrors, setUserFormErrors] = useState<Partial<Record<keyof UserForm, string>>>({});
  const [savingUser, setSavingUser] = useState(false);

  // ── Supplier User Management ──────────────────────────────────────────────
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<PlatformUser | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplierForm);
  const [supplierFormErrors, setSupplierFormErrors] = useState<Partial<Record<keyof SupplierForm, string>>>({});
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);

  const internalUsers = platformUsers.filter(u => u.role !== 'supplier');
  const supplierUsers = platformUsers.filter(u => u.role === 'supplier');

  const loadUsers = async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    try {
      const data = await dataProvider.users.list();
      if (Array.isArray(data)) setPlatformUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    }
    setUsersLoading(false);
  };

  useEffect(() => { loadUsers(); }, [isAdmin]);

  const openAddUser = () => { setEditingUser(null); setUserForm(emptyForm); setUserFormErrors({}); setUserDialogOpen(true); };
  const openEditUser = (u: PlatformUser) => {
    setEditingUser(u);
    setUserForm({ full_name: u.full_name, email: u.email, password: '', role: (u.role as AppRole) || 'tender-organizer', company: u.company || '' });
    setUserFormErrors({});
    setUserDialogOpen(true);
  };

  const openAddSupplier = () => { setEditingSupplier(null); setSupplierForm(emptySupplierForm); setSupplierFormErrors({}); setSupplierDialogOpen(true); loadSuppliersList(); };
  const openEditSupplier = (u: PlatformUser) => {
    setEditingSupplier(u);
    setSupplierForm({ full_name: u.full_name, email: u.email, password: '', company: u.company || '', supplier_id: '' });
    setSupplierFormErrors({});
    setSupplierDialogOpen(true);
    loadSuppliersList().then(suppliers => {
      // Try to find matching supplier by company name
      const match = suppliers.find((s: any) => s.name === u.company);
      if (match) setSupplierForm(f => ({ ...f, supplier_id: match.id, company: match.name }));
    });
  };

  const loadSuppliersList = async () => {
    try {
      const list = await dataProvider.suppliers.list();
      setSuppliersList(list);
      return list;
    } catch { return []; }
  };

  const validateUserForm = () => {
    const errs: Partial<Record<keyof UserForm, string>> = {};
    if (!userForm.email.trim() || !/\S+@\S+\.\S+/.test(userForm.email)) errs.email = 'Email valid obligatoriu';
    if (!editingUser && !userForm.password) errs.password = 'Parola este obligatorie';
    if (!editingUser && userForm.password && userForm.password.length < 6) errs.password = 'Minim 6 caractere';
    return errs;
  };

  const validateSupplierForm = () => {
    const errs: Partial<Record<keyof SupplierForm, string>> = {};
    if (!supplierForm.email.trim() || !/\S+@\S+\.\S+/.test(supplierForm.email)) errs.email = 'Email valid obligatoriu';
    if (!editingSupplier && !supplierForm.password) errs.password = 'Parola este obligatorie';
    if (!editingSupplier && supplierForm.password && supplierForm.password.length < 6) errs.password = 'Minim 6 caractere';
    if (!supplierForm.supplier_id && !supplierForm.company.trim()) errs.company = 'Selectează un furnizor';
    return errs;
  };

  const saveUser = async () => {
    const errs = validateUserForm();
    if (Object.keys(errs).length) { setUserFormErrors(errs); return; }
    setSavingUser(true);

    try {
      if (editingUser) {
        const body: Record<string, string> = {
          user_id: editingUser.id,
          full_name: userForm.full_name,
          role: userForm.role,
        };
        if (userForm.password) body.password = userForm.password;
        await dataProvider.users.update(body);
        const data = {} as any;
        if (data.error) { toast({ title: 'Eroare', description: data.error, variant: 'destructive' }); }
        else { toast({ title: 'Utilizator actualizat' }); await loadUsers(); }
      } else {
        const data = await dataProvider.users.create({ email: userForm.email, password: userForm.password, full_name: userForm.full_name, role: userForm.role });
        if (data.error) { toast({ title: 'Eroare', description: data.error, variant: 'destructive' }); }
        else { toast({ title: 'Utilizator creat' }); await loadUsers(); }
      }
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message, variant: 'destructive' });
    }
    setSavingUser(false);
    setUserDialogOpen(false);
  };

  const saveSupplier = async () => {
    const errs = validateSupplierForm();
    if (Object.keys(errs).length) { setSupplierFormErrors(errs); return; }
    setSavingSupplier(true);

    try {
      if (editingSupplier) {
        const body: Record<string, string> = {
          user_id: editingSupplier.id,
          full_name: supplierForm.full_name,
          role: 'supplier',
          company: supplierForm.company,
        };
        if (supplierForm.password) body.password = supplierForm.password;
        await dataProvider.users.update(body);
        if (supplierForm.supplier_id) {
          await linkUserToSupplier(editingSupplier.id, supplierForm.email, supplierForm.full_name, supplierForm.supplier_id);
        }
        toast({ title: 'Furnizor actualizat' }); await loadUsers();
      } else {
        const data = await dataProvider.users.create({ email: supplierForm.email, password: supplierForm.password, full_name: supplierForm.full_name, role: 'supplier', company: supplierForm.company });
        if (data.error) { toast({ title: 'Eroare', description: data.error, variant: 'destructive' }); }
        else {
          if (supplierForm.supplier_id && data.id) {
            await linkUserToSupplier(data.id, supplierForm.email, supplierForm.full_name, supplierForm.supplier_id);
          }
          toast({ title: 'Cont furnizor creat' }); await loadUsers();
        }
      }
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message, variant: 'destructive' });
    }
    setSavingSupplier(false);
    setSupplierDialogOpen(false);
  };

  const linkUserToSupplier = async (userId: string, email: string, fullName: string, supplierId: string) => {
    try {
      const supplier = await dataProvider.suppliers.getById(supplierId);
      if (!supplier) return;
      const contacts = supplier.contacts ?? [];
      if (contacts.some((c: any) => c.linkedUserId === userId || c.email === email)) return;
      const newContact = {
        id: `contact-${Date.now()}`,
        name: fullName,
        email,
        phone: '',
        addedBy: user?.uid ?? '',
        addedByRole: 'app-admin',
        linkedUserId: userId,
      };
      await dataProvider.suppliers.upsert({
        ...supplier,
        contacts: [...contacts, newContact],
      } as any);
    } catch (err) {
      console.error('Failed to link user to supplier:', err);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const data = await dataProvider.users.delete(userId) as any;
      if (data.error) toast({ title: 'Eroare', description: data.error, variant: 'destructive' });
      else { toast({ title: 'Utilizator șters' }); await loadUsers(); }
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message, variant: 'destructive' });
    }
  };

  // ── Change Password ────────────────────────────────────────────────────────
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPassword.length < 6) { setPwError('Parola trebuie să aibă minim 6 caractere.'); return; }
    if (newPassword !== confirmPassword) { setPwError('Parolele nu coincid.'); return; }
    setPwLoading(true);
    const { error } = await updatePassword(newPassword);
    setPwLoading(false);
    if (error) setPwError('Eroare la schimbarea parolei.');
    else {
      toast({ title: 'Parola a fost schimbată cu succes.' });
      setPwDialogOpen(false);
      setNewPassword(''); setConfirmPassword('');
    }
  };

  const roleBadgeVariant = (r: string) => r === 'app-admin' ? 'default' : 'secondary';

  return (
    <Layout>
      <Header title="Settings" subtitle="Manage your account and preferences" />

      <div className="p-6 max-w-3xl space-y-8">

        {/* Profile */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Profile</h3>
          <div className="flex items-center gap-6 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                {(fullName || user?.email || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Input value={ROLE_LABELS[role ?? ''] ?? role ?? ''} disabled />
            </div>
          </div>
        </div>

        {/* Internal User Management — app-admin only */}
        {isAdmin && (
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold">Utilizatori Interni</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Admin only</Badge>
                <Button size="sm" className="gap-1.5" onClick={openAddUser}>
                  <Plus className="h-3.5 w-3.5" /> Adaugă Utilizator
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Utilizatori cu roluri interne: App Admin, Tender Organizer, Procurement Officer.
            </p>

            {usersLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă utilizatorii...
              </div>
            ) : (
              <div className="space-y-2">
                {internalUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs bg-muted">
                        {(u.full_name || u.email).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">{u.full_name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Badge variant={roleBadgeVariant(u.role ?? '')} className="text-xs shrink-0">
                      {ROLE_LABELS[u.role ?? ''] ?? u.role}
                    </Badge>
                    {u.id === user?.uid && (
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => openEditUser(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {u.id !== user?.uid && (
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => deleteUser(u.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                {internalUsers.length === 0 && !usersLoading && (
                  <p className="text-sm text-muted-foreground text-center py-4">Niciun utilizator intern.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Supplier Users — app-admin only */}
        {isAdmin && (
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold">Utilizatori Furnizori</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Admin only</Badge>
                <Button size="sm" className="gap-1.5" onClick={openAddSupplier}>
                  <Plus className="h-3.5 w-3.5" /> Adaugă Furnizor
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Conturi de acces pentru furnizorii externi. Fiecare cont este asociat cu o companie furnizoare.
            </p>

            {usersLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă furnizorii...
              </div>
            ) : (
              <div className="space-y-2">
                {supplierUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs bg-muted text-foreground font-semibold">
                        {(u.company || u.full_name || u.email).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium leading-none truncate">{u.full_name || '—'}</p>
                        {u.company && (
                          <span className="text-xs text-muted-foreground">· {u.company}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                    </div>
                    {u.company && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground max-w-[120px] truncate">{u.company}</span>
                      </div>
                    )}
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Supplier
                    </Badge>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => openEditSupplier(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => deleteUser(u.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {supplierUsers.length === 0 && !usersLoading && (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <UserCircle2 className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Niciun cont de furnizor creat.</p>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={openAddSupplier}>
                      <Plus className="h-3.5 w-3.5" /> Adaugă primul furnizor
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Service Categories — app-admin only */}
        {isAdmin && (
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold">Service Categories</h3>
              </div>
              <Badge variant="secondary" className="text-xs">Admin only</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Manage the master list of service categories used across tenders and suppliers.
            </p>

            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                  {editingCatId === cat.id ? (
                    <>
                      <Input
                        className="h-7 flex-1 text-sm"
                        value={editingCatLabel}
                        onChange={e => setEditingCatLabel(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEditCat(cat.id); if (e.key === 'Escape') cancelEditCat(); }}
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => saveEditCat(cat.id)}><Check className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={cancelEditCat}><X className="h-3.5 w-3.5" /></Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{cat.label}</span>
                      <span className="text-xs text-muted-foreground font-mono">{cat.value}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditCat(cat)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteCat(cat.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                </div>
              ))}
              {addingNewCat ? (
                <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-background px-3 py-2">
                  <Input
                    className="h-7 flex-1 text-sm"
                    placeholder="Category name…"
                    value={newCategoryLabel}
                    onChange={e => setNewCategoryLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addCat(); if (e.key === 'Escape') { setAddingNewCat(false); setNewCategoryLabel(''); } }}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={addCat}><Check className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => { setAddingNewCat(false); setNewCategoryLabel(''); }}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="mt-1 gap-1.5" onClick={() => setAddingNewCat(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add Category
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive emails for important updates</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">New Offers</p>
                <p className="text-sm text-muted-foreground">Get notified when suppliers submit offers</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Questions</p>
                <p className="text-sm text-muted-foreground">Get notified when suppliers ask questions</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Securitate</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">Schimbați parola contului dvs.</p>
              <Button variant="outline" className="gap-2" onClick={() => setPwDialogOpen(true)}>
                <KeyRound className="h-4 w-4" /> Schimbă Parola
              </Button>
            </div>
          </div>
        </div>

        {/* Roles & Permissions Matrix */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-semibold">Drepturi pe Roluri</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Comparație completă a permisiunilor pentru fiecare rol din platformă.
          </p>
          <RolesMatrix />
        </div>
      </div>

      {/* Add / Edit Internal User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editează Utilizator' : 'Adaugă Utilizator Intern'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nume complet</Label>
              <Input
                placeholder="ex. Maria Ionescu"
                value={userForm.full_name}
                onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="ex. maria@companie.ro"
                value={userForm.email}
                onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                disabled={!!editingUser}
              />
              {userFormErrors.email && <p className="text-xs text-destructive">{userFormErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>{editingUser ? 'Parolă nouă (opțional)' : 'Parolă *'}</Label>
              <Input
                type="password"
                placeholder={editingUser ? 'Lăsați gol pentru a păstra parola actuală' : 'Minim 6 caractere'}
                value={userForm.password}
                onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
              />
              {userFormErrors.password && <p className="text-xs text-destructive">{userFormErrors.password}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Rol *</Label>
              <Select value={userForm.role} onValueChange={v => setUserForm(f => ({ ...f, role: v as AppRole }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERNAL_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Anulează</Button>
            <Button onClick={saveUser} disabled={savingUser}>
              {savingUser && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingUser ? 'Salvează' : 'Adaugă'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Supplier User Dialog */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Editează Cont Furnizor' : 'Adaugă Cont Furnizor'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Furnizor (companie) *</Label>
              <Select
                value={supplierForm.supplier_id}
                onValueChange={val => {
                  const s = suppliersList.find(s => s.id === val);
                  setSupplierForm(f => ({ ...f, supplier_id: val, company: s?.name ?? '' }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectează furnizor..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliersList.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} {s.fiscal_code ? `(${s.fiscal_code})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {supplierFormErrors.company && <p className="text-xs text-destructive">{supplierFormErrors.company}</p>}
              {suppliersList.length === 0 && (
                <p className="text-xs text-muted-foreground">Nu există furnizori. Creează mai întâi un furnizor în secțiunea Suppliers.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Nume persoană de contact</Label>
              <Input
                placeholder="ex. Ion Popescu"
                value={supplierForm.full_name}
                onChange={e => setSupplierForm(f => ({ ...f, full_name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="ex. contact@furnizor.ro"
                value={supplierForm.email}
                onChange={e => setSupplierForm(f => ({ ...f, email: e.target.value }))}
                disabled={!!editingSupplier}
              />
              {supplierFormErrors.email && <p className="text-xs text-destructive">{supplierFormErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>{editingSupplier ? 'Parolă nouă (opțional)' : 'Parolă *'}</Label>
              <Input
                type="password"
                placeholder={editingSupplier ? 'Lăsați gol pentru a păstra parola actuală' : 'Minim 6 caractere'}
                value={supplierForm.password}
                onChange={e => setSupplierForm(f => ({ ...f, password: e.target.value }))}
              />
              {supplierFormErrors.password && <p className="text-xs text-destructive">{supplierFormErrors.password}</p>}
            </div>

            <div className="rounded-md bg-muted/50 border border-border px-3 py-2.5 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                Rolul <strong>Supplier</strong> se atribuie automat. Furnizorul va putea accesa doar <em>Portal Furnizor</em>.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Anulează</Button>
            <Button onClick={saveSupplier} disabled={savingSupplier}>
              {savingSupplier && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingSupplier ? 'Salvează' : 'Creează Cont'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Schimbă Parola</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Parolă nouă</Label>
              <Input
                type="password"
                placeholder="Minim 6 caractere"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmă parola</Label>
              <Input
                type="password"
                placeholder="Repetă parola"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPwDialogOpen(false)}>Anulează</Button>
              <Button type="submit" disabled={pwLoading}>
                {pwLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Schimbă Parola
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

// ─── Roles & Permissions Matrix ───────────────────────────────────────────────

type Permission = 'full' | 'view' | 'own' | 'none';

interface PermRow {
  category: string;
  feature: string;
  admin: Permission;
  organizer: Permission;
  officer: Permission;
  supplier: Permission;
}

const PERM_ROWS: PermRow[] = [
  // Dashboard & proprietăți
  { category: 'Platformă', feature: 'Dashboard & statistici', admin: 'full', organizer: 'view', officer: 'view', supplier: 'none' },
  { category: 'Platformă', feature: 'Proprietăți (SPV-uri)', admin: 'full', organizer: 'view', officer: 'view', supplier: 'none' },
  { category: 'Platformă', feature: 'Categorii servicii', admin: 'full', organizer: 'none', officer: 'none', supplier: 'none' },
  { category: 'Platformă', feature: 'Gestionare utilizatori', admin: 'full', organizer: 'none', officer: 'none', supplier: 'none' },
  // Furnizori
  { category: 'Furnizori', feature: 'Director master furnizori', admin: 'full', organizer: 'view', officer: 'view', supplier: 'none' },
  { category: 'Furnizori', feature: 'Adăugare / editare furnizori', admin: 'full', organizer: 'none', officer: 'none', supplier: 'none' },
  { category: 'Furnizori', feature: 'Persoane de contact pentru invitații', admin: 'full', organizer: 'full', officer: 'view', supplier: 'none' },
  // Licitații
  { category: 'Licitații', feature: 'Creare licitație nouă', admin: 'full', organizer: 'full', officer: 'none', supplier: 'none' },
  { category: 'Licitații', feature: 'Editare licitație (documente, criterii, runde)', admin: 'full', organizer: 'full', officer: 'none', supplier: 'none' },
  { category: 'Licitații', feature: 'Vizualizare toate licitațiile', admin: 'full', organizer: 'full', officer: 'view', supplier: 'none' },
  { category: 'Licitații', feature: 'Vizualizare licitații proprii (invitat)', admin: 'none', organizer: 'none', officer: 'none', supplier: 'own' },
  { category: 'Licitații', feature: 'Vizualizare buget intern', admin: 'full', organizer: 'full', officer: 'none', supplier: 'none' },
  { category: 'Licitații', feature: 'Documente interne confidențiale', admin: 'full', organizer: 'full', officer: 'none', supplier: 'none' },
  // Oferte
  { category: 'Oferte', feature: 'Vizualizare toate ofertele', admin: 'full', organizer: 'full', officer: 'view', supplier: 'none' },
  { category: 'Oferte', feature: 'Trimitere ofertă proprie', admin: 'none', organizer: 'none', officer: 'none', supplier: 'own' },
  { category: 'Oferte', feature: 'Gestionare runde de negociere', admin: 'full', organizer: 'full', officer: 'none', supplier: 'none' },
  { category: 'Oferte', feature: 'Desemnare câștigător', admin: 'full', organizer: 'full', officer: 'none', supplier: 'none' },
  // Evaluare
  { category: 'Evaluare', feature: 'Evaluare AI oferte', admin: 'full', organizer: 'full', officer: 'none', supplier: 'none' },
  { category: 'Evaluare', feature: 'Scorecard manual', admin: 'full', organizer: 'full', officer: 'view', supplier: 'none' },
  { category: 'Evaluare', feature: 'Export rapoarte PDF', admin: 'full', organizer: 'full', officer: 'view', supplier: 'none' },
  // Întrebări
  { category: 'Comunicare', feature: 'Răspuns la întrebări furnizori', admin: 'full', organizer: 'full', officer: 'none', supplier: 'none' },
  { category: 'Comunicare', feature: 'Trimitere întrebări (ca furnizor)', admin: 'none', organizer: 'none', officer: 'none', supplier: 'own' },
  // Cont
  { category: 'Cont', feature: 'Schimbare parolă proprie', admin: 'full', organizer: 'full', officer: 'full', supplier: 'full' },
];

const PERM_CONFIG: Record<Permission, { label: string; className: string; dot: string }> = {
  full:  { label: 'Complet',      className: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  view:  { label: 'Vizualizare',  className: 'bg-primary/10 text-primary', dot: 'bg-primary' },
  own:   { label: 'Propriu',      className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  none:  { label: '—',            className: 'text-muted-foreground/40', dot: '' },
};

function PermCell({ perm }: { perm: Permission }) {
  const cfg = PERM_CONFIG[perm];
  if (perm === 'none') return <span className="text-muted-foreground/40 text-xs">—</span>;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full',
      cfg.className
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function RolesMatrix() {
  const categories = Array.from(new Set(PERM_ROWS.map(r => r.category)));

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left px-4 py-3 font-semibold text-foreground w-[40%]">Funcționalitate</th>
            <th className="text-center px-3 py-3 font-semibold text-foreground">
              <div className="flex flex-col items-center gap-0.5">
                <span>App Admin</span>
                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">A</Badge>
              </div>
            </th>
            <th className="text-center px-3 py-3 font-semibold text-foreground">
              <div className="flex flex-col items-center gap-0.5">
                <span>Tender Organizer</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">TO</Badge>
              </div>
            </th>
            <th className="text-center px-3 py-3 font-semibold text-foreground">
              <div className="flex flex-col items-center gap-0.5">
                <span>Procurement Officer</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">PO</Badge>
              </div>
            </th>
            <th className="text-center px-3 py-3 font-semibold text-foreground">
              <div className="flex flex-col items-center gap-0.5">
                <span>Supplier</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">S</Badge>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => {
            const rows = PERM_ROWS.filter(r => r.category === cat);
            return rows.map((row, idx) => (
              <tr
                key={row.feature}
                className={cn(
                  "border-b border-border last:border-0 transition-colors hover:bg-muted/20",
                  idx === 0 && "border-t-2 border-t-border"
                )}
              >
                <td className="px-4 py-2.5">
                  {idx === 0 && (
                    <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                      {cat}
                    </span>
                  )}
                  <span className="text-sm">{row.feature}</span>
                </td>
                <td className="px-3 py-2.5 text-center"><PermCell perm={row.admin} /></td>
                <td className="px-3 py-2.5 text-center"><PermCell perm={row.organizer} /></td>
                <td className="px-3 py-2.5 text-center"><PermCell perm={row.officer} /></td>
                <td className="px-3 py-2.5 text-center"><PermCell perm={row.supplier} /></td>
              </tr>
            ));
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-muted/20 border-t border-border text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Legendă:</span>
        {(Object.entries(PERM_CONFIG) as [Permission, typeof PERM_CONFIG[Permission]][])
          .filter(([k]) => k !== 'none')
          .map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
              <strong>{cfg.label}</strong>
              {key === 'full' && ' – creare, editare, ștergere'}
              {key === 'view' && ' – doar citire'}
              {key === 'own' && ' – doar resurse proprii'}
            </span>
          ))
        }
      </div>
    </div>
  );
}

