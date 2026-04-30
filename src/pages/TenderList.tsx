import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Grid, List, Building2, FlaskConical, ArrowRight } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { TenderCard } from '@/components/dashboard/TenderCard';

import { useSPVs } from '@/context/SPVContext';
import { useTenders } from '@/hooks/useTenders';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TenderStatus } from '@/types/tender';
import { cn } from '@/lib/utils';



type StatusFilter = 'all' | TenderStatus;

export default function TenderList() {
  const { spvList } = useSPVs();
  const { tenders: dbTenders, loading } = useTenders();
  const allSPVs = spvList;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [spvFilter, setSpvFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Use only DB tenders
  const allTenders = dbTenders;

  const filteredTenders = allTenders
    .filter(t => statusFilter === 'all' || t.status === statusFilter)
    .filter(t => spvFilter === 'all' || t.spvId === spvFilter);

  const statusCounts = {
    all: allTenders.length,
    active: allTenders.filter(t => t.status === 'active').length,
    draft: allTenders.filter(t => t.status === 'draft').length,
    awarded: allTenders.filter(t => t.status === 'awarded').length,
    closed: allTenders.filter(t => t.status === 'closed').length,
  };

  return (
    <Layout>
      <Header 
        title="Tenders" 
        subtitle="Manage all your procurement tenders"
      />
      
      <div className="p-6 space-y-6">
        {/* Demo Banner */}
        <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary/30 bg-primary/5">
          <div className="p-2.5 rounded-full bg-primary/15 shrink-0">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Demo interactiv disponibil</p>
            <p className="text-xs text-muted-foreground">
              Licitația <span className="font-medium text-foreground">Integrated Facility Services – Westend Tower</span> conține date complete: 2 furnizori, oferte BOQ cu prețuri, 2 runde și este gata pentru desemnarea câștigătorului.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0 gap-1.5">
            <Link to="/tenders/tender-demo">
              Deschide Demo
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
              <TabsTrigger value="active">Active ({statusCounts.active})</TabsTrigger>
              <TabsTrigger value="draft">Draft ({statusCounts.draft})</TabsTrigger>
              <TabsTrigger value="awarded">Awarded ({statusCounts.awarded})</TabsTrigger>
              <TabsTrigger value="closed">Closed ({statusCounts.closed})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Select value={spvFilter} onValueChange={setSpvFilter}>
              <SelectTrigger className="h-9 w-[200px] text-sm">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {allSPVs.map(spv => (
                  <SelectItem key={spv.id} value={spv.id}>
                    {spv.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center border rounded-md">
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-8 w-8 rounded-r-none", viewMode === 'grid' && "bg-muted")}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-8 w-8 rounded-l-none", viewMode === 'list' && "bg-muted")}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button asChild>
              <Link to="/tenders/new">
                <Plus className="h-4 w-4 mr-2" />
                New Tender
              </Link>
            </Button>
          </div>
        </div>

        {/* Active SPV filter badge */}
        {spvFilter !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtered by:</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
              <Building2 className="h-3.5 w-3.5" />
              {allSPVs.find(s => s.id === spvFilter)?.name}
              <button
                onClick={() => setSpvFilter('all')}
                className="ml-1 text-primary/60 hover:text-primary"
              >
                ×
              </button>
            </span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading tenders…</div>
        )}

        {/* Tender Grid/List */}
        {!loading && filteredTenders.length > 0 ? (
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 lg:grid-cols-2 gap-4" 
              : "space-y-3"
          )}>
            {filteredTenders.map((tender) => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>
        ) : !loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No tenders found matching your filters.</p>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
