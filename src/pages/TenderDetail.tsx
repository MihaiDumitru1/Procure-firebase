import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Euro, Edit, Trash2, Play, Pause, Building2, Lock, Trophy, Eye, ListChecks, Target, Sparkles, ClipboardList, Hash, Bell, Send, UserPlus } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';

import { useSPVs } from '@/context/SPVContext';
import { useTenderById } from '@/hooks/useTenders';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { DocumentsSection } from '@/components/tender/DocumentsSection';
import { QuestionsSection } from '@/components/tender/QuestionsSection';
import { OffersSection } from '@/components/tender/OffersSection';
import { ArticlesSection } from '@/components/tender/ArticlesSection';
import { CompulsoryOfferSection } from '@/components/tender/CompulsoryOfferSection';
import { SelectionCriteriaSection } from '@/components/tender/SelectionCriteriaSection';
import { EvaluationScorecard } from '@/components/tender/EvaluationScorecard';
import { SupplierOfferForm } from '@/components/tender/SupplierOfferForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { dataProvider } from '@/data-access';
import { useToast } from '@/hooks/use-toast';
import { TenderArticle, CompulsoryOfferItem, SelectionCriterion } from '@/types/tender';
import { serviceCategories } from '@/data/categories';

export default function TenderDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { role, fullName, user } = useAuth();
  const { spvList } = useSPVs();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { tender, loading } = useTenderById(id);
  const isMock = false;

  const spv = tender
    ? (spvList.find(s => s.id === tender.spvId) ?? null)
    : null;

  // ─── Role helpers (based on real authenticated user) ──────────────────────
  const isSupplier = role === 'supplier';
  const isAdminOrOrganizer =
    role === 'app-admin' || role === 'tender-organizer' || role === 'procurement-officer';
  const canEdit = role === 'app-admin' || role === 'tender-organizer' || role === 'procurement-officer';

  const [tenderStatus, setTenderStatus] = useState(tender?.status ?? 'draft');
  const [localArticles, setLocalArticles] = useState<TenderArticle[]>(tender?.articles ?? []);
  const [localCompulsory, setLocalCompulsory] = useState<CompulsoryOfferItem[]>(tender?.compulsoryOfferItems ?? []);
  const [localCriteria, setLocalCriteria] = useState<SelectionCriterion[]>(tender?.selectionCriteria ?? []);
  const [localQuestions, setLocalQuestions] = useState<any[]>(tender?.questions ?? []);
  const [localDocuments, setLocalDocuments] = useState<any[]>(tender?.documents ?? []);
  const [winnerInfo, setWinnerInfo] = useState<{ name: string; amount: number } | null>(null);

  // Sync local state when tender loads/changes from Firestore
  useEffect(() => {
    if (!tender) return;
    setTenderStatus(tender.status);
    setLocalArticles(tender.articles ?? []);
    setLocalCompulsory(tender.compulsoryOfferItems ?? []);
    setLocalCriteria(tender.selectionCriteria ?? []);
    setLocalQuestions(tender.questions ?? []);
    setLocalDocuments(tender.documents ?? []);
    const w = tender.rounds.flatMap(r => r.offers).find(o => o.status === 'winner');
    setWinnerInfo(w ? { name: w.supplierName, amount: w.amount } : null);
  }, [tender?.id, tender?.status, tender?.articles?.length]);

  // ─── Firestore update helper ─────────────────────────────────────────────
  const updateTenderField = async (fields: Record<string, any>) => {
    if (isMock || !id) return; // Don't persist mock data changes
    try {
      const clean = JSON.parse(JSON.stringify(fields)); // strip undefined
      await dataProvider.tenders.update(id, clean);
    } catch (err: any) {
      console.error('Failed to update tender:', err);
      toast({ title: 'Eroare', description: err.message, variant: 'destructive' });
    }
  };

  // ─── Action handlers ─────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (isMock) { toast({ title: 'Demo', description: 'Licitația demo nu poate fi modificată.', variant: 'destructive' }); return; }
    setTenderStatus('active');
    await updateTenderField({ status: 'active' });
    toast({ title: 'Licitație publicată', description: 'Statusul a fost schimbat în Activă.' });
  };

  const handleClose = async () => {
    if (isMock) return;
    setTenderStatus('closed');
    await updateTenderField({ status: 'closed' });
    toast({ title: 'Licitație închisă' });
  };

  const handleDelete = async () => {
    if (isMock) { toast({ title: 'Demo', description: 'Licitația demo nu poate fi ștearsă.', variant: 'destructive' }); return; }
    if (!confirm('Sigur vrei să ștergi această licitație?')) return;
    try {
      await dataProvider.tenders.delete(id!);
      toast({ title: 'Licitație ștearsă' });
      navigate('/tenders');
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message, variant: 'destructive' });
    }
  };

  const handleArticlesChange = (articles: TenderArticle[]) => {
    setLocalArticles(articles);
    updateTenderField({ articles });
  };

  const handleCompulsoryChange = (items: CompulsoryOfferItem[]) => {
    setLocalCompulsory(items);
    updateTenderField({ compulsory_offer_items: items });
  };

  const handleCriteriaChange = (criteria: SelectionCriterion[]) => {
    setLocalCriteria(criteria);
    updateTenderField({ selection_criteria: criteria });
  };

  const handleQuestionsChange = (questions: any[]) => {
    setLocalQuestions(questions);
    updateTenderField({ questions });
  };

  const handleDocumentsChange = (documents: any[]) => {
    setLocalDocuments(documents);
    updateTenderField({ documents });
  };

  // ─── Supplier offer submission ────────────────────────────────────────────
  const [localRounds, setLocalRounds] = useState<any[]>(tender?.rounds ?? []);

  useEffect(() => {
    if (tender?.rounds) setLocalRounds(tender.rounds);
  }, [tender?.rounds?.length]);

  const handleOfferSubmitted = async (offer: any) => {
    // Add offer to the current round
    const updatedRounds = localRounds.map(r => {
      if (r.roundNumber === tender?.currentRound) {
        return { ...r, offers: [...(r.offers ?? []), offer] };
      }
      return r;
    });
    // If no rounds exist, create one
    if (updatedRounds.length === 0) {
      updatedRounds.push({
        id: `round-1`,
        roundNumber: 1,
        startDate: new Date().toISOString(),
        endDate: tender?.submissionEndDate ?? new Date().toISOString(),
        status: 'active',
        offers: [offer],
      });
    }
    setLocalRounds(updatedRounds);
    await updateTenderField({ rounds: updatedRounds });
  };

  // ─── Invite Suppliers Dialog ──────────────────────────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  const [invitedSuppliers, setInvitedSuppliers] = useState<any[]>([]);
  const [inviting, setInviting] = useState(false);

  // Load invited suppliers when tender loads
  useEffect(() => {
    if (!id || isMock) return;
    (async () => {
      try {
        const [suppliers, invitations] = await Promise.all([
          dataProvider.suppliers.list(),
          dataProvider.invitations.listByTenderId(id),
        ]);
        setAllSuppliers(suppliers);
        const ids = invitations.map(i => i.supplier_id);
        setInvitedIds(ids);
        setInvitedSuppliers(
          ids.map(sid => {
            const s = suppliers.find(sup => sup.id === sid);
            const inv = invitations.find(i => i.supplier_id === sid);
            return s ? { ...s, invitationStatus: inv?.status ?? 'sent' } : null;
          }).filter(Boolean)
        );
      } catch (err) {
        console.error('Error loading invited suppliers:', err);
      }
    })();
  }, [id, isMock]);

  const openInviteDialog = async () => {
    setInviteOpen(true);
    setSelectedSupplierIds([]);
    if (allSuppliers.length === 0) {
      try {
        const suppliers = await dataProvider.suppliers.list();
        setAllSuppliers(suppliers);
      } catch (err) {
        console.error('Error loading suppliers:', err);
      }
    }
  };

  const handleInviteSuppliers = async () => {
    if (!id || selectedSupplierIds.length === 0) return;
    setInviting(true);
    try {
      await dataProvider.invitations.createBatch(id, selectedSupplierIds, 'sent', user?.uid ?? '');
      const newInvited = selectedSupplierIds.map(sid => {
        const s = allSuppliers.find(sup => sup.id === sid);
        return s ? { ...s, invitationStatus: 'sent' } : null;
      }).filter(Boolean);
      setInvitedIds(prev => [...prev, ...selectedSupplierIds]);
      setInvitedSuppliers(prev => [...prev, ...newInvited]);
      setSelectedSupplierIds([]);
      toast({ title: 'Furnizori invitați', description: `${selectedSupplierIds.length} furnizor(i) au fost invitați la licitație.` });
      setInviteOpen(false);
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message, variant: 'destructive' });
    }
    setInviting(false);
  };

  const toggleSupplier = (suppId: string) => {
    setSelectedSupplierIds(prev =>
      prev.includes(suppId) ? prev.filter(id => id !== suppId) : [...prev, suppId]
    );
  };

  // ─── Edit Tender Dialog ───────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    spv_id: '',
    location: '',
    budget: '',
    participation_deadline: '',
    participation_deadline_time: '17:00',
    submission_end_date: '',
    submission_end_time: '17:00',
    min_participants: 3,
  });

  const openEditDialog = () => {
    if (!tender) return;
    setEditForm({
      title: tender.title,
      description: tender.description,
      category: tender.category,
      spv_id: tender.spvId,
      location: tender.location,
      budget: tender.budget ?? '',
      participation_deadline: tender.participationDeadline?.split('T')[0] ?? '',
      participation_deadline_time: tender.participationDeadlineTime ?? '17:00',
      submission_end_date: tender.submissionEndDate?.split('T')[0] ?? '',
      submission_end_time: tender.submissionEndTime ?? '17:00',
      min_participants: tender.minParticipants,
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    try {
      const selectedSpv = spvList.find(s => s.id === editForm.spv_id);
      await updateTenderField({
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
        spv_id: editForm.spv_id,
        location: selectedSpv ? `${selectedSpv.address}, ${selectedSpv.city}` : editForm.location,
        budget: editForm.budget,
        participation_deadline: editForm.participation_deadline ? new Date(editForm.participation_deadline).toISOString() : null,
        participation_deadline_time: editForm.participation_deadline_time,
        submission_end_date: editForm.submission_end_date ? new Date(editForm.submission_end_date).toISOString() : null,
        submission_end_time: editForm.submission_end_time,
        min_participants: editForm.min_participants,
      });
      toast({ title: 'Tender actualizat' });
      setEditOpen(false);
      // Reload page to reflect changes
      window.location.reload();
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[80vh]">
          <p className="text-muted-foreground">Loading tender…</p>
        </div>
      </Layout>
    );
  }

  if (!tender) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Tender not found</h2>
            <p className="text-muted-foreground mb-4">The tender you're looking for doesn't exist.</p>
            <Button asChild>
              <Link to="/tenders">Back to Tenders</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleWinnerSelected = (_offerId: string, name: string, amount: number) => {
    setWinnerInfo({ name, amount });
    setTenderStatus('awarded');
    updateTenderField({ status: 'awarded' });
  };

  const categoryLabel = t.categories[tender.category as keyof typeof t.categories] ?? tender.category;

  return (
    <Layout>
      <Header
        title={tender.title}
        subtitle={categoryLabel}
      />

      <div className="p-6 space-y-6">
        {/* Back Link & Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="gap-2">
            <Link to="/tenders">
              <ArrowLeft className="h-4 w-4" />
              {t.common.backToTenders}
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            {isSupplier && tenderStatus !== 'active' && (
              <Badge variant="outline" className="gap-1.5 text-muted-foreground border-border">
                <Eye className="h-3 w-3" />
                {t.common.viewOnly}
              </Badge>
            )}
            {isSupplier && tenderStatus === 'active' && (
              <Button
                variant="default"
                className="gap-2"
                onClick={() => {
                  const el = document.getElementById('supplier-offer-form');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <Send className="h-4 w-4" />
                Trimite ofertă
              </Button>
            )}
            {canEdit && (
              <>
                {tenderStatus === 'draft' && (
                  <Button variant="outline" className="gap-2" onClick={handlePublish}>
                    <Play className="h-4 w-4" />
                    {t.common.publishTender}
                  </Button>
                )}
                {tenderStatus === 'active' && (
                  <Button variant="outline" className="gap-2" onClick={handleClose}>
                    <Pause className="h-4 w-4" />
                    {t.common.closeTender}
                  </Button>
                )}
                <Button variant="outline" className="gap-2" onClick={openInviteDialog}>
                  <UserPlus className="h-4 w-4" />
                  Invită furnizori
                </Button>
                <Button variant="outline" size="icon" onClick={openEditDialog}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Winner Banner — visible to all roles */}
        {(tenderStatus === 'awarded' || winnerInfo) && winnerInfo && (
          <div className="flex items-center gap-4 p-5 rounded-xl border-2 border-status-awarded bg-status-awarded/5">
            <div className="p-3 rounded-full bg-status-awarded/20">
              <Trophy className="h-6 w-6 text-status-awarded" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-status-awarded mb-0.5">{t.tender.tenderAwarded}</p>
              {isSupplier ? (
                <p className="text-xl font-bold text-foreground">Licitația a fost atribuită</p>
              ) : (
                <p className="text-xl font-bold text-foreground">{winnerInfo.name}</p>
              )}
              <p className="text-sm text-muted-foreground">{t.tender.winnerSelected}</p>
            </div>
            <div className="text-right">
              {!isSupplier && (
                <p className="text-2xl font-bold text-status-awarded">€{winnerInfo.amount.toLocaleString()}</p>
              )}
              <p className="text-xs text-muted-foreground">{t.tender.awardedAmount}</p>
            </div>
          </div>
        )}

        {/* Supplier closed / result notification banner */}
        {isSupplier && (tenderStatus === 'closed' || tenderStatus === 'awarded') && (
          <div className={cn(
            "flex items-start gap-4 p-4 rounded-xl border",
            tenderStatus === 'awarded'
              ? "border-status-awarded/40 bg-status-awarded/5"
              : "border-border bg-muted/30"
          )}>
            <div className={cn(
              "p-2.5 rounded-full shrink-0",
              tenderStatus === 'awarded' ? "bg-status-awarded/20" : "bg-muted"
            )}>
              {tenderStatus === 'awarded'
                ? <Trophy className="h-5 w-5 text-status-awarded" />
                : <Bell className="h-5 w-5 text-muted-foreground" />
              }
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground mb-0.5">
                {tenderStatus === 'awarded' ? 'Licitație atribuită' : 'Licitație închisă'}
              </p>
              <p className="text-sm text-muted-foreground">
                {tenderStatus === 'awarded'
                  ? 'Procesul de selecție s-a finalizat. Câștigătorul a fost ales. Vă mulțumim pentru participare.'
                  : 'Această licitație a fost închisă. Nu mai pot fi depuse oferte sau întrebări.'}
              </p>
            </div>
          </div>
        )}


        {/* Overview Card */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <StatusBadge status={tenderStatus}>
                  {tenderStatus.charAt(0).toUpperCase() + tenderStatus.slice(1)}
                </StatusBadge>
                <span className="text-sm text-muted-foreground">
                  {t.common.round} {tender.currentRound} {t.common.of} {tender.totalRounds}
                </span>
                {/* Reference code badge */}
                {tender.referenceCode && (
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    <Hash className="h-3 w-3" />
                    {tender.referenceCode}
                  </span>
                )}
              </div>

              <p className="text-muted-foreground mb-4">{tender.description}</p>

              <div className="flex flex-wrap gap-6 text-sm">
                {spv && (
                  <Link
                    to={`/properties/${spv.id}`}
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Building2 className="h-4 w-4" />
                    <span>{spv.name}</span>
                  </Link>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{tender.location}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{t.tender.participationDeadline}: {new Date(tender.participationDeadline).toLocaleDateString()} {tender.participationDeadlineTime}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{t.tender.submissionCloses}: {new Date(tender.submissionEndDate).toLocaleDateString()} {tender.submissionEndTime}</span>
                </div>
                {tender.budget && isAdminOrOrganizer && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    <Euro className="h-4 w-4" />
                    <span className="font-medium text-foreground">{t.tender.budget}: {tender.budget}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{t.common.internal}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-sm text-muted-foreground mb-1">{t.common.created}</div>
              <div className="font-medium">{new Date(tender.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* Invited Suppliers */}
        {!isSupplier && invitedSuppliers.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Furnizori invitați</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {invitedSuppliers.length}
                </span>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openInviteDialog}>
                <UserPlus className="h-3.5 w-3.5" /> Invită alții
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {invitedSuppliers.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/20">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {(s.name || '?').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.fiscal_code || ''}</p>
                  </div>
                  <Badge variant={s.invitationStatus === 'accepted' ? 'default' : 'secondary'} className="text-xs shrink-0">
                    {s.invitationStatus === 'sent' ? 'Invitat' : s.invitationStatus === 'accepted' ? 'Acceptat' : s.invitationStatus}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="articles">
          <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
            <TabsTrigger value="articles">
              {t.tender.tabs.articles}
              {localArticles.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">({localArticles.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="compulsory">
              {t.tender.tabs.offerContent}
              {localCompulsory.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">({localCompulsory.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="criteria">
              {t.tender.tabs.selectionCriteria}
              {localCriteria.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">({localCriteria.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents">{t.tender.tabs.documents}</TabsTrigger>
            <TabsTrigger value="questions">
              {t.tender.tabs.qa}
              {localQuestions.filter(q => !q.answer).length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-status-active/20 text-status-active-foreground">
                  {localQuestions.filter(q => !q.answer).length}
                </span>
              )}
            </TabsTrigger>
            {!isSupplier && (
              <TabsTrigger value="offers">
                {t.tender.tabs.offers}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({localRounds.reduce((acc, r) => acc + (r.offers ?? []).length, 0)})
                </span>
              </TabsTrigger>
            )}
            {isSupplier && (
              <TabsTrigger value="offers">
                Oferta mea
              </TabsTrigger>
            )}
            {!isSupplier && tender.selectionCriteria.length > 0 && (
              <TabsTrigger value="evaluation" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {t.tender.tabs.aiEvaluation}
              </TabsTrigger>
            )}
            {!isSupplier && (
              <TabsTrigger value="audit" className="gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                {t.tender.tabs.auditTrail}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="articles" className="mt-4">
            <ArticlesSection articles={localArticles} readOnly={!canEdit} onChange={handleArticlesChange} />
          </TabsContent>

          <TabsContent value="compulsory" className="mt-4">
            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">{t.tender.tabs.offerContent}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {localCompulsory.length} item{localCompulsory.length !== 1 ? 's' : ''}
                </span>
              </div>
              <CompulsoryOfferSection
                items={localCompulsory}
                canEdit={canEdit}
                supplierMode={isSupplier}
                onChange={handleCompulsoryChange}
              />
            </div>
          </TabsContent>

          <TabsContent value="criteria" className="mt-4">
            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">{t.tender.tabs.selectionCriteria}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {localCriteria.length} criteria
                </span>
              </div>
              <SelectionCriteriaSection criteria={localCriteria} canEdit={canEdit} onChange={handleCriteriaChange} />
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <DocumentsSection documents={localDocuments} hideInternal={isSupplier} />
          </TabsContent>

          <TabsContent value="questions" className="mt-4">
            <QuestionsSection
              questions={localQuestions}
              canAnswer={isAdminOrOrganizer}
              canAsk={isSupplier}
              supplierName={isSupplier ? (fullName || user?.email || 'Furnizor') : undefined}
              tenderStatus={tenderStatus}
              onChange={handleQuestionsChange}
            />
          </TabsContent>

          <TabsContent value="offers" className="mt-4 space-y-4">
              {isSupplier && tenderStatus === 'active' && (
                <div id="supplier-offer-form">
                  <SupplierOfferForm
                    tenderId={tender.id}
                    articles={localArticles}
                    supplierName={fullName || user?.email || 'Furnizor'}
                    supplierId={user?.uid ?? ''}
                    currentRound={tender.currentRound}
                    onSubmitted={handleOfferSubmitted}
                  />
                </div>
              )}
              <OffersSection
                rounds={localRounds}
                currentRound={tender.currentRound}
                tenderId={tender.id}
                onWinnerSelected={handleWinnerSelected}
                readOnly={isSupplier || !canEdit}
              />
          </TabsContent>

          {!isSupplier && tender.selectionCriteria.length > 0 && (
            <TabsContent value="evaluation" className="mt-4">
              <EvaluationScorecard tender={tender} onWinnerSelected={handleWinnerSelected} />
            </TabsContent>
          )}

          {!isSupplier && (
            <TabsContent value="audit" className="mt-4">
              <AuditTrailTab tender={tender} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Edit Tender Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editează licitația</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Titlu *</Label>
              <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Descriere</Label>
              <Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categorie</Label>
                <Select value={editForm.category} onValueChange={val => setEditForm(f => ({ ...f, category: val }))}>
                  <SelectTrigger><SelectValue placeholder="Selectează..." /></SelectTrigger>
                  <SelectContent>
                    {serviceCategories.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Proprietate / SPV *</Label>
                <Select value={editForm.spv_id} onValueChange={val => setEditForm(f => ({ ...f, spv_id: val }))}>
                  <SelectTrigger><SelectValue placeholder="Selectează..." /></SelectTrigger>
                  <SelectContent>
                    {spvList.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} — {s.city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Buget</Label>
              <Input value={editForm.budget} onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))} placeholder="ex: €100,000 – €150,000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Deadline participare</Label>
                <Input type="date" value={editForm.participation_deadline} onChange={e => setEditForm(f => ({ ...f, participation_deadline: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Ora</Label>
                <Input type="time" value={editForm.participation_deadline_time} onChange={e => setEditForm(f => ({ ...f, participation_deadline_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Deadline oferte</Label>
                <Input type="date" value={editForm.submission_end_date} onChange={e => setEditForm(f => ({ ...f, submission_end_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Ora</Label>
                <Input type="time" value={editForm.submission_end_time} onChange={e => setEditForm(f => ({ ...f, submission_end_time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Minim participanți</Label>
              <Input type="number" min={1} value={editForm.min_participants} onChange={e => setEditForm(f => ({ ...f, min_participants: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Anulează</Button>
            <Button onClick={handleSaveEdit}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Suppliers Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Invită furnizori la licitație
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto py-2">
            {allSuppliers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nu există furnizori. Adaugă furnizori din secțiunea Suppliers.</p>
            )}
            {allSuppliers.map(s => {
              const alreadyInvited = invitedIds.includes(s.id);
              const isSelected = selectedSupplierIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    alreadyInvited ? "border-border bg-muted/30 opacity-60 cursor-default" : isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                  )}
                >
                  <Checkbox
                    checked={isSelected || alreadyInvited}
                    disabled={alreadyInvited}
                    onCheckedChange={() => !alreadyInvited && toggleSupplier(s.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.fiscal_code}</p>
                    {alreadyInvited && (
                      <p className="text-xs text-primary mt-0.5">Deja invitat</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Anulează</Button>
            <Button onClick={handleInviteSuppliers} disabled={inviting || selectedSupplierIds.length === 0} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {inviting ? 'Se trimite...' : `Invită (${selectedSupplierIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

// ─── Inline Audit Trail Tab ────────────────────────────────────────────────────
import { buildTenderAuditTrail, exportRoundAuditPdf, exportFullAuditPdf, AuditEntry } from '@/lib/auditTrailPdfExport';
import { FileDown, Clock } from 'lucide-react';

function AuditTrailTab({ tender }: { tender: import('@/types/tender').Tender }) {
  const { t, language } = useLanguage();
  const entries: AuditEntry[] = buildTenderAuditTrail(tender, []);

  const EVENT_ICON_COLORS: Record<string, string> = {
    tender_created: 'bg-primary/20 text-primary',
    tender_published: 'bg-primary/20 text-primary',
    invites_sent: 'bg-primary/20 text-primary',
    nda_accepted: 'bg-status-awarded/20 text-status-awarded',
    round_opened: 'bg-primary/20 text-primary',
    round_closed: 'bg-muted text-muted-foreground',
    offer_submitted: 'bg-status-awarded/20 text-status-awarded',
    offer_shortlisted: 'bg-status-awarded/20 text-status-awarded',
    offer_rejected: 'bg-destructive/20 text-destructive',
    question_asked: 'bg-muted text-muted-foreground',
    answer_broadcast: 'bg-primary/20 text-primary',
    winner_selected: 'bg-status-awarded/20 text-status-awarded',
    ai_suggested: 'bg-primary/10 text-primary',
    ai_applied: 'bg-primary/10 text-primary',
    score_set: 'bg-muted text-muted-foreground',
    evaluation_reset: 'bg-destructive/10 text-destructive',
    tender_closed: 'bg-muted text-muted-foreground',
  };

  function formatEventLabel(eventType: string): string {
    const labels: Record<string, { en: string; ro: string }> = {
      tender_created:   { en: 'Tender Created', ro: 'Licitație Creată' },
      tender_published: { en: 'Tender Published', ro: 'Licitație Publicată' },
      tender_closed:    { en: 'Tender Closed', ro: 'Licitație Închisă' },
      invites_sent:     { en: 'Invitations Sent', ro: 'Invitații Trimise' },
      nda_accepted:     { en: 'NDA Accepted', ro: 'NDA Acceptat' },
      round_opened:     { en: 'Round Opened', ro: 'Rundă Deschisă' },
      round_closed:     { en: 'Round Closed', ro: 'Rundă Închisă' },
      offer_submitted:  { en: 'Offer Submitted', ro: 'Ofertă Depusă' },
      offer_shortlisted:{ en: 'Offer Shortlisted', ro: 'Ofertă Acceptată' },
      offer_rejected:   { en: 'Offer Rejected', ro: 'Ofertă Respinsă' },
      question_asked:   { en: 'Question Asked', ro: 'Întrebare Adresată' },
      answer_broadcast: { en: 'Answer Broadcast', ro: 'Răspuns Transmis' },
      ai_suggested:     { en: 'AI Evaluated', ro: 'Evaluat AI' },
      ai_applied:       { en: 'AI Applied', ro: 'AI Aplicat' },
      score_set:        { en: 'Score Set', ro: 'Scor Setat' },
      winner_selected:  { en: 'Winner Selected', ro: 'Câștigător Selectat' },
      evaluation_reset: { en: 'Evaluation Reset', ro: 'Evaluare Resetată' },
    };
    return labels[eventType]?.[language as 'en' | 'ro'] ?? eventType.replace(/_/g, ' ');
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-card rounded-lg border border-border p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">{t.auditTrail.title}</h3>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {entries.length} {language === 'ro' ? 'activități' : 'activities'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tender.rounds.map(round => (
            <Button
              key={round.id}
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => exportRoundAuditPdf(tender, round, entries, language as 'en' | 'ro')}
            >
              <FileDown className="h-3.5 w-3.5" />
              {t.auditTrail.roundAudit.replace('{n}', String(round.roundNumber))}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => exportFullAuditPdf(tender, entries, language as 'en' | 'ro')}
          >
            <FileDown className="h-3.5 w-3.5" />
            {t.auditTrail.finalAudit}
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-lg border border-border p-5">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t.auditTrail.noEntries}</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-0">
              {entries.map((entry, idx) => {
                const colorClass = EVENT_ICON_COLORS[entry.eventType] ?? 'bg-muted text-muted-foreground';
                const ts = new Date(entry.timestamp);
                const dateStr = ts.toLocaleDateString(language === 'ro' ? 'ro-RO' : 'en-GB');
                const timeStr = ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const isLast = idx === entries.length - 1;

                return (
                  <div key={entry.id} className={`relative flex gap-4 ${isLast ? '' : 'pb-5'}`}>
                    {/* Icon dot */}
                    <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background ${colorClass}`}>
                      <span className="text-xs font-bold">{idx + 1}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1.5">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs font-semibold text-foreground">
                          {formatEventLabel(entry.eventType)}
                        </span>
                        {entry.roundNumber && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                            {language === 'ro' ? 'Runda' : 'Round'} {entry.roundNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{entry.detail}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{entry.actor}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground font-mono">{dateStr} {timeStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
