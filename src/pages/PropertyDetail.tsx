import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, AreaChart, Calendar, Plus, Layers } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { useTenders } from '@/hooks/useTenders';
import { useSPVs } from '@/context/SPVContext';
import { Button } from '@/components/ui/button';
import { TenderCard } from '@/components/dashboard/TenderCard';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { TenderStatus } from '@/types/tender';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  'office': 'bg-blue-100 text-blue-700',
  'retail': 'bg-purple-100 text-purple-700',
  'industrial': 'bg-orange-100 text-orange-700',
  'residential': 'bg-green-100 text-green-700',
  'mixed-use': 'bg-teal-100 text-teal-700',
  'logistics': 'bg-yellow-100 text-yellow-700',
  'other': 'bg-muted text-muted-foreground',
};

type StatusFilter = 'all' | TenderStatus;

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const { spvList } = useSPVs();
  const spv = spvList.find(s => s.id === id);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  if (!spv) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Property not found</h2>
            <p className="text-muted-foreground mb-4">This SPV doesn't exist in the portfolio.</p>
            <Button asChild>
              <Link to="/properties">Back to Properties</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const { tenders: allDbTenders } = useTenders();
  const spvTenders = allDbTenders.filter(t => t.spvId === spv.id);
  const filteredTenders = statusFilter === 'all'
    ? spvTenders
    : spvTenders.filter(t => t.status === statusFilter);

  const statusCounts = {
    all: spvTenders.length,
    active: spvTenders.filter(t => t.status === 'active').length,
    draft: spvTenders.filter(t => t.status === 'draft').length,
    awarded: spvTenders.filter(t => t.status === 'awarded').length,
    closed: spvTenders.filter(t => t.status === 'closed').length,
  };

  const totalOffers = spvTenders.reduce((acc, t) =>
    acc + t.rounds.reduce((a, r) => a + r.offers.length, 0), 0);

  return (
    <Layout>
      <Header title={spv.name} subtitle={`${spv.code} · ${propertyTypeLabels[spv.propertyType]}`} />

      <div className="p-6 space-y-6">
        {/* Back */}
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/properties">
            <ArrowLeft className="h-4 w-4" />
            Back to Properties
          </Link>
        </Button>

        {/* Property Info Card */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-start gap-5">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h2 className="text-xl font-bold text-foreground">{spv.name}</h2>
                <span className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full",
                  propertyTypeColors[spv.propertyType]
                )}>
                  {propertyTypeLabels[spv.propertyType]}
                </span>
                <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                  {spv.code}
                </span>
              </div>

              {spv.description && (
                <p className="text-sm text-muted-foreground mb-4">{spv.description}</p>
              )}

              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{spv.address}, {spv.city}, {spv.country}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AreaChart className="h-4 w-4" />
                  <span>{spv.totalArea.toLocaleString()} m²</span>
                </div>
                {spv.yearBuilt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Built {spv.yearBuilt}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="shrink-0 hidden sm:grid grid-cols-3 gap-4 text-center">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xl font-bold text-foreground">{statusCounts.active}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Active</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xl font-bold text-foreground">{spvTenders.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xl font-bold text-foreground">{totalOffers}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Offers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tenders section */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
              <TabsTrigger value="active">Active ({statusCounts.active})</TabsTrigger>
              <TabsTrigger value="draft">Draft ({statusCounts.draft})</TabsTrigger>
              <TabsTrigger value="awarded">Awarded ({statusCounts.awarded})</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button asChild>
            <Link to="/tenders/new">
              <Plus className="h-4 w-4 mr-2" />
              New Tender
            </Link>
          </Button>
        </div>

        {filteredTenders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTenders.map((tender) => (
              <TenderCard key={tender.id} tender={tender} showSpv={false} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card rounded-lg border border-border">
            <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No tenders for this filter</p>
            <p className="text-sm text-muted-foreground mt-1">Create a tender for {spv.name} to get started.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
