import { FileText, Users, Clock, Award } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { TenderCard } from '@/components/dashboard/TenderCard';

import { useTenders } from '@/hooks/useTenders';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, fullName } = useAuth();
  const { tenders: dbTenders, loading } = useTenders();

  const allTenders = dbTenders;

  const activeTenders = allTenders.filter(t => t.status === 'active');
  const draftTenders = allTenders.filter(t => t.status === 'draft');
  const totalOffers = allTenders.reduce((acc, t) => acc + (t.rounds ?? []).reduce((a, r) => a + (r.offers ?? []).length, 0), 0);
  const pendingReview = allTenders.reduce((acc, t) => acc + (t.rounds ?? []).reduce((a, r) => a + (r.offers ?? []).filter(o => o.status === 'under review' || o.status === 'pending').length, 0), 0);
  const awardedTenders = allTenders.filter(t => t.status === 'awarded');

  const displayName = fullName || user?.email?.split('@')[0] || 'there';

  return (
    <Layout>
      <Header 
        title="Dashboard" 
        subtitle={`Welcome back, ${displayName}. Here's what's happening with your tenders.`}
      />
      
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Active Tenders" 
            value={activeTenders.length}
            subtitle="Currently accepting offers"
            icon={FileText}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard 
            title="Total Offers" 
            value={totalOffers}
            subtitle="Across all tenders"
            icon={Users}
          />
          <StatCard 
            title="Pending Review" 
            value={pendingReview}
            subtitle="Offers awaiting evaluation"
            icon={Clock}
          />
          <StatCard 
            title="Awarded This Year" 
            value={awardedTenders.length}
            subtitle="Contracts finalized"
            icon={Award}
            trend={{ value: 8, isPositive: true }}
          />
        </div>

        {/* Active Tenders */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Active Tenders</h2>
            <Button asChild>
              <Link to="/tenders/new">
                <Plus className="h-4 w-4 mr-2" />
                New Tender
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeTenders.map((tender) => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>
        </div>

        {/* Draft Tenders */}
        {draftTenders.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Drafts</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {draftTenders.map((tender) => (
                <TenderCard key={tender.id} tender={tender} />
              ))}
            </div>
          </div>
        )}

        {/* Recently Awarded */}
        {awardedTenders.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Recently Awarded</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {awardedTenders.map((tender) => (
                <TenderCard key={tender.id} tender={tender} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
