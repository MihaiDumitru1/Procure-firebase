import { Link } from 'react-router-dom';
import { Calendar, MapPin, FileText, MessageCircle, Building2 } from 'lucide-react';
import { Tender } from '@/types/tender';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { useSPVs } from '@/context/SPVContext';

interface TenderCardProps {
  tender: Tender;
  className?: string;
  showSpv?: boolean;
}

const categoryLabels: Record<string, string> = {
  'technical-maintenance': 'Technical Maintenance',
  'cleaning': 'Cleaning',
  'landscaping': 'Landscaping',
  'security': 'Security',
  'waste-management': 'Waste Management',
  'pest-control': 'Pest Control',
  'other': 'Other',
};

export function TenderCard({ tender, className, showSpv = true }: TenderCardProps) {
  const publicDocs = (tender.documents ?? []).filter(d => d.type === 'public').length;
  const unansweredQuestions = (tender.questions ?? []).filter(q => !q.answer).length;
  const { spvList } = useSPVs();
  const spv = spvList.find(s => s.id === tender.spvId);

  return (
    <Link 
      to={`/tenders/${tender.id}`}
      className={cn(
        "block bg-card rounded-lg border border-border p-5 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all animate-fade-in",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {categoryLabels[tender.category]}
            </span>
            <StatusBadge status={tender.status}>
              {tender.status.charAt(0).toUpperCase() + tender.status.slice(1)}
            </StatusBadge>
          </div>
          
          <h3 className="font-semibold text-foreground truncate">{tender.title}</h3>
          
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {tender.description}
          </p>

          {showSpv && spv && (
            <Link
              to={`/properties/${spv.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline"
            >
              <Building2 className="h-3.5 w-3.5" />
              {spv.name}
            </Link>
          )}
          
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{tender.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Closes {new Date(tender.submissionEndDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div className="text-right shrink-0">
          {tender.budget && (
            <p className="text-sm font-semibold text-foreground">{tender.budget}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Round {tender.currentRound}/{tender.totalRounds}
          </p>
          
          <div className="mt-3 flex items-center justify-end gap-3 text-muted-foreground">
            <div className="flex items-center gap-1" title="Public documents">
              <FileText className="h-4 w-4" />
              <span className="text-xs">{publicDocs}</span>
            </div>
            {unansweredQuestions > 0 && (
              <div className="flex items-center gap-1 text-status-active-foreground" title="Pending questions">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">{unansweredQuestions}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
