import type { FilterName } from '@/core/operations/types';

export interface FilterOption {
  title: string;
  value: FilterName | null;
}

export const FILTER_OPTIONS: FilterOption[] = [
  { title: 'None', value: null },
  { title: 'Grayscale', value: 'grayscale' },
  { title: 'Sepia', value: 'sepia' },
];
