import { useState, useEffect, useCallback } from 'react';
import { Tender } from '@/types/tender';
import { useAuth } from '@/hooks/useAuth';
import { dataProvider, TenderRow } from '@/data-access';

function safeArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
  }
  return [];
}

function mapRowToTender(row: TenderRow): Tender {
  return {
    id: row.id,
    referenceCode: row.reference_code ?? undefined,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status as Tender['status'],
    createdAt: row.created_at,
    participationDeadline: row.participation_deadline,
    participationDeadlineTime: row.participation_deadline_time ?? '17:00',
    submissionStartDate: row.submission_start_date,
    submissionStartTime: row.submission_start_time ?? '09:00',
    submissionEndDate: row.submission_end_date,
    submissionEndTime: row.submission_end_time ?? '17:00',
    minParticipants: row.min_participants,
    budget: row.budget ?? undefined,
    location: row.location ?? '',
    spvId: row.spv_id ?? '',
    documents: safeArray(row.documents),
    questions: safeArray(row.questions),
    rounds: safeArray(row.rounds),
    articles: safeArray(row.articles),
    compulsoryOfferItems: safeArray(row.compulsory_offer_items),
    selectionCriteria: safeArray(row.selection_criteria),
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
    createdBy: row.created_by ?? '',
  };
}

export function useTenders() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTenders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rows = await dataProvider.tenders.list({ orderBy: 'created_at', orderDir: 'desc' });
      setTenders(rows.map(mapRowToTender));
    } catch (err) {
      console.error('Error fetching tenders:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTenders();
  }, [fetchTenders]);

  return { tenders, loading, refetch: fetchTenders };
}

export function useTenderById(id: string | undefined) {
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!id || !user) return;
    setLoading(true);
    dataProvider.tenders.getById(id)
      .then((row) => {
        setTender(row ? mapRowToTender(row) : null);
        setLoading(false);
      })
      .catch(() => {
        setTender(null);
        setLoading(false);
      });
  }, [id, user]);

  return { tender, loading };
}

interface InvitedTender extends Tender {
  invitationStatus: string;
}

export function useSupplierTenders(supplierIds: string[]) {
  const [tenders, setTenders] = useState<InvitedTender[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || supplierIds.length === 0) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const invitations = await dataProvider.invitations.listBySupplierIds(supplierIds);

        if (invitations.length === 0) {
          setTenders([]);
          setLoading(false);
          return;
        }

        const tenderIds = [...new Set(invitations.map(i => i.tender_id))];

        // Fetch each tender
        const tenderRows = await Promise.all(
          tenderIds.map(id => dataProvider.tenders.getById(id))
        );

        setTenders(
          tenderRows
            .filter((r): r is TenderRow => r !== null)
            .map(row => {
              const inv = invitations.find(i => i.tender_id === row.id);
              return {
                ...mapRowToTender(row),
                invitationStatus: inv?.status ?? 'pending',
              };
            })
        );
      } catch (err) {
        console.error('Error fetching supplier tenders:', err);
      }
      setLoading(false);
    })();
  }, [user, supplierIds.join(',')]);

  return { tenders, loading };
}
