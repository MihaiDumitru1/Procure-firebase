import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SPV, PropertyType } from '@/types/tender';

import { dataProvider, PropertyRow } from '@/data-access';

interface SPVContextValue {
  spvList: SPV[];
  loading: boolean;
  addSPV: (spv: Omit<SPV, 'id'>) => Promise<SPV>;
  refreshSPVs: () => Promise<void>;
}

const SPVContext = createContext<SPVContextValue>({
  spvList: [],
  loading: true,
  addSPV: async () => { throw new Error('SPVProvider not mounted'); },
  refreshSPVs: async () => {},
});

function rowToSPV(row: PropertyRow): SPV {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    address: row.address,
    city: row.city,
    country: row.country,
    propertyType: row.property_type as PropertyType,
    totalArea: Number(row.total_area),
    yearBuilt: row.year_built ? Number(row.year_built) : undefined,
    manager: row.manager ?? '',
    description: row.description || undefined,
  };
}

export function SPVProvider({ children }: { children: ReactNode }) {
  const [spvList, setSpvList] = useState<SPV[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSPVs = async () => {
    try {
      const rows = await dataProvider.properties.list({ orderBy: 'created_at', orderDir: 'asc' });
      const dbSpvs = rows.map(rowToSPV);

      setSpvList(dbSpvs);
    } catch (err) {
      console.error('Error fetching SPVs:', err);
      setSpvList([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSPVs();
  }, []);

  const addSPV = async (spvData: Omit<SPV, 'id'>): Promise<SPV> => {
    const propData = {
      name: spvData.name,
      code: spvData.code,
      address: spvData.address,
      city: spvData.city,
      country: spvData.country,
      property_type: spvData.propertyType,
      total_area: spvData.totalArea,
      year_built: spvData.yearBuilt ?? null,
      manager: spvData.manager,
      description: spvData.description ?? null,
    };

    const id = await dataProvider.properties.create(propData as any);
    const newSPV: SPV = { ...spvData, id };
    setSpvList(prev => [...prev, newSPV]);
    return newSPV;
  };

  const refreshSPVs = async () => {
    setLoading(true);
    await fetchSPVs();
  };

  return (
    <SPVContext.Provider value={{ spvList, loading, addSPV, refreshSPVs }}>
      {children}
    </SPVContext.Provider>
  );
}

export function useSPVs() {
  return useContext(SPVContext);
}
