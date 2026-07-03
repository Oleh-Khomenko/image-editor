import type { FilterName } from '@/shared/models/edit-operation';

export interface FilterOption {
  title: string;
  value: FilterName | null;
}

export const FILTER_OPTIONS: FilterOption[] = [
  { title: 'None', value: null },
  { title: 'Grayscale', value: 'grayscale' },
  { title: 'Sepia', value: 'sepia' },
];
