import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Clock, Trophy, Eye, MessageSquare, Upload,
  CheckCircle2, AlertCircle, Calendar, Building2, Euro, ArrowRight
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';

import { useSPVs } from '@/context/SPVContext';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dataProvider } from '@/data-access';
import { Tender } from '@/types/tender';

type FilterTab = 'all' | 'active' | 'awarded' | 'closed';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Ciornă',
  active: 'Activă',
  awarded: 'Atribuită',
  closed: 'Închisă',
};

export default function SupplierPortal() {
  const { fullName, user } = useAuth();
  const { spvList } = useSPVs();
  const [tab, setTab] = useState<FilterTab>('all');
  const [invitedTenders, setInvitedTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    (async () => {
      setLoading(true);

      // Find which supplier(s) the current user is linked to via contacts
      const allSuppliers = await dataProvider.suppliers.list();
      const mySupplierIds = (allSuppliers ?? [])
        .filter((s: any) => {
          const contacts = s.contacts as any[];
          return contacts?.some((c: any) => c.linkedUserId === user.uid || c.email === user.email);
        })
        .map((s: any) => s.id);

      if (mySupplierIds.length === 0) {
        // Fallback: show demo tenders for demo purposes
        setInvitedTenders([]);
        setLoading(false);
        return;
      }

      // Get invitations
      const invitations = await dataProvider.invitations.listBySupplierIds(mySupplierIds);

      if (invitations.length === 0) {
        // Still show demo
        setInvitedTenders([]);
        setLoading(false);
        return;
      }

      const tenderIds = [...new Set(invitations.map((i: any) => i.tender_id))];
      const tenderRows = await Promise.all(
        tenderIds.map(id => dataProvider.tenders.getById(id))
      ).then(results => results.filter(Boolean));

      const dbTenders: Tender[] = (tenderRows ?? []).map((row: any) => ({
        id: row.id,
        referenceCode: row.reference_code,
        title: row.title,
        description: row.description,
        category: row.category,
        status: row.status,
        createdAt: row.created_at,
        participationDeadline: row.participation_deadline,
        participationDeadlineTime: row.participation_deadline_time,
        submissionStartDate: row.submission_start_date,
        submissionStartTime: row.submission_start_time,
        submissionEndDate: row.submission_end_date,
        submissionEndTime: row.submission_end_time,
        minParticipants: row.min_participants,
        budget: row.budget,
        location: row.location,
        spvId: row.spv_id ?? '',
        documents: row.documents ?? [],
        questions: row.questions ?? [],
        rounds: row.rounds ?? [],
        articles: row.articles ?? [],
        compulsoryOfferItems: row.compulsory_offer_items ?? [],
        selectionCriteria: row.selection_criteria ?? [],
        currentRound: row.current_round,
        totalRounds: row.total_rounds,
        createdBy: row.created_by ?? '',
      }));

      // Include demo tenders + DB invited tenders
      const demoTenders: any[] = [];
      setInvitedTenders([...demoTenders, ...dbTenders]);
      setLoading(false);
    })();
  }, [user]);

  const supplierTenders = invitedTenders;

  const filtered = supplierTenders.filter(t => {
    if (tab === 'all') return true;
    return t.status === tab;
  });

  const counts = {
    all: supplierTenders.length,
    active: supplierTenders.filter(t => t.status === 'active').length,
    awarded: supplierTenders.filter(t => t.status === 'awarded').length,
    closed: supplierTenders.filter(t => t.status === 'closed').length,
  };

  const getMyOffer = (tenderId: string) => {
    const t = supplierTenders.find(t => t.id === tenderId);
    if (!t) return null;
    const allOffers = t.rounds.flatMap(r => r.offers);
    return allOffers[0] ?? null;
  };

  const getDeadline = (tenderId: string) => {
    const t = supplierTenders.find(t => t.id === tenderId);
    if (!t) return null;
    return t.submissionEndDate ?? null;
  };

  const isDeadlineSoon = (deadline: string | null) => {
    if (!deadline) return false;
    const d = new Date(deadline);
    const now = new Date();
    return d > now && (d.getTime() - now.getTime()) < 1000 * 60 * 60 * 24 * 3;
  };

  const isDeadlinePast = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const totalOffers = supplierTenders.reduce(
    (a, t) => a + t.rounds.flatMap(r => r.offers).length, 0
  );
  const wonCount = supplierTenders.filter(t => {
    const o = getMyOffer(t.id);
    return o?.status === 'winner';
  }).length;
  const openQuestions = supplierTenders.reduce(
    (a, t) => a + (t.questions?.filter(q => !q.answer).length ?? 0), 0
  );

  return (
    <Layout>
      <Header
        title="Portal Furnizor"
        subtitle={`Bun venit${fullName ? `, ${fullName}` : ''}! Gestionați ofertele și participările la licitații.`}
      />

      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={<FileText className="h-5 w-5 text-primary" />}
            label="Licitații active"
            value={counts.active}
            bg="bg-primary/10"
            onClick={() => {
              setTab('active');
              document.getElementById('my-tenders')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
          <SummaryCard
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            label="Oferte trimise"
            value={totalOffers}
            bg="bg-amber-100 dark:bg-amber-950/30"
            onClick={() => {
              setTab('all');
              document.getElementById('my-tenders')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
          <SummaryCard
            icon={<Trophy className="h-5 w-5 text-emerald-600" />}
            label="Câștigate"
            value={wonCount}
            bg="bg-emerald-100 dark:bg-emerald-950/30"
            onClick={() => {
              setTab('awarded');
              document.getElementById('my-tenders')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
          <SummaryCard
            icon={<MessageSquare className="h-5 w-5 text-violet-600" />}
            label="Întrebări deschise"
            value={openQuestions}
            bg="bg-violet-100 dark:bg-violet-950/30"
            onClick={() => {
              setTab('all');
              document.getElementById('my-tenders')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        </div>

        {/* Tender list */}
        <div id="my-tenders" className="bg-card rounded-xl border border-border scroll-mt-20">
          <div className="flex items-center justify-between p-4 border-b border-border flex-wrap gap-2">
            <h2 className="font-semibold text-base">Licitațiile mele</h2>
            <Tabs value={tab} onValueChange={v => setTab(v as FilterTab)}>
              <TabsList className="bg-muted/50 h-8">
                <TabsTrigger value="all" className="text-xs h-6 px-3">Toate ({counts.all})</TabsTrigger>
                <TabsTrigger value="active" className="text-xs h-6 px-3">Active ({counts.active})</TabsTrigger>
                <TabsTrigger value="awarded" className="text-xs h-6 px-3">Câștigate ({counts.awarded})</TabsTrigger>
                <TabsTrigger value="closed" className="text-xs h-6 px-3">Închise ({counts.closed})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="divide-y divide-border">
            {loading && (
              <div className="py-8 text-center text-sm text-muted-foreground">Se încarcă...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nicio licitație găsită.
              </div>
            )}
            {!loading && filtered.map(tender => {
              const offer = getMyOffer(tender.id);
              const deadline = getDeadline(tender.id);
              const spv = spvList.find(s => s.id === tender.spvId);
              const soon = isDeadlineSoon(deadline);
              const past = isDeadlinePast(deadline);
              const tenderOpenQ = tender.questions?.filter(q => !q.answer).length ?? 0;
              const isWinner = offer?.status === 'winner';

              return (
                <div key={tender.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className={cn(
                    "mt-0.5 p-2 rounded-lg shrink-0",
                    isWinner ? "bg-amber-100 dark:bg-amber-950/40" : "bg-muted"
                  )}>
                    {isWinner
                      ? <Trophy className="h-5 w-5 text-amber-600" />
                      : <FileText className="h-5 w-5 text-muted-foreground" />
                    }
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-medium text-sm leading-tight">{tender.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{spv?.name ?? '—'}</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-xs text-muted-foreground capitalize">{tender.category}</span>
                        </div>
                      </div>
                      <StatusBadge status={tender.status}>
                        {STATUS_LABELS[tender.status] ?? tender.status}
                      </StatusBadge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {offer && (
                        offer.status === 'winner' ? (
                          <Badge className="gap-1 text-xs bg-amber-500 hover:bg-amber-500 text-white">
                            <Trophy className="h-3 w-3" /> Câștigător
                          </Badge>
                        ) : offer.status === 'submitted' ? (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Ofertă trimisă
                          </Badge>
                        ) : offer.status === 'rejected' ? (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertCircle className="h-3 w-3" /> Respinsă
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Upload className="h-3 w-3" /> În lucru
                          </Badge>
                        )
                      )}
                      {!offer && tender.status === 'active' && (
                        <Badge variant="outline" className="gap-1 text-xs border-dashed text-muted-foreground">
                          <Upload className="h-3 w-3" /> Ofertă nesubmisă
                        </Badge>
                      )}

                      {offer?.amount && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Euro className="h-3 w-3" />
                          {offer.amount.toLocaleString('ro-RO')} EUR
                        </span>
                      )}

                      {deadline && !past && (
                        <span className={cn(
                          "flex items-center gap-1 text-xs",
                          soon ? "text-amber-600 font-medium" : "text-muted-foreground"
                        )}>
                          <Calendar className="h-3 w-3" />
                          Termen: {new Date(deadline).toLocaleDateString('ro-RO')}
                          {soon && ' ⚠'}
                        </span>
                      )}

                      {tenderOpenQ > 0 && (
                        <span className="flex items-center gap-1 text-xs text-violet-600">
                          <MessageSquare className="h-3 w-3" />
                          {tenderOpenQ} întrebare{tenderOpenQ > 1 ? 'i' : ''} fără răspuns
                        </span>
                      )}
                    </div>
                  </div>

                  <Button asChild size="sm" variant="ghost" className="shrink-0 gap-1.5 text-xs">
                    <Link to={`/tenders/${tender.id}`}>
                      <Eye className="h-3.5 w-3.5" /> Vizualizează
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info box */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Ce poți face ca Furnizor?</p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>Vizualizezi licitațiile la care ești invitat</li>
            <li>Trimiți și actualizezi ofertele tale</li>
            <li>Adaugi documente tehnice și financiare</li>
            <li>Pui întrebări organizatorului licitației</li>
            <li>Verifici statusul ofertei și notificările</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}

function SummaryCard({ icon, label, value, bg, onClick }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl border border-border p-4 flex items-center gap-3 text-left w-full transition-all",
        onClick && "hover:border-primary/40 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
      )}
    >
      <div className={cn("p-2 rounded-lg shrink-0", bg)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </button>
  );
}
