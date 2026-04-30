export interface ServiceCategoryItem {
  id: string;
  label: string;
  value: string;
}

export const serviceCategories: ServiceCategoryItem[] = [
  { id: 'cat-1', label: 'Technical Maintenance', value: 'technical-maintenance' },
  { id: 'cat-2', label: 'Cleaning', value: 'cleaning' },
  { id: 'cat-3', label: 'Landscaping', value: 'landscaping' },
  { id: 'cat-4', label: 'Security', value: 'security' },
  { id: 'cat-5', label: 'Waste Management', value: 'waste-management' },
  { id: 'cat-6', label: 'Pest Control', value: 'pest-control' },
  { id: 'cat-7', label: 'Elevator & Escalator', value: 'elevator-escalator' },
  { id: 'cat-8', label: 'Fire Safety', value: 'fire-safety' },
  { id: 'cat-9', label: 'Other', value: 'other' },
];
