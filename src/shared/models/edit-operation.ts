export type FilterName = 'grayscale' | 'sepia';

export interface CropOp {
  type: 'crop';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AdjustOp {
  type: 'adjust';
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface FilterOp {
  type: 'filter';
  name: FilterName;
}

export type EditOperation = CropOp | AdjustOp | FilterOp;

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
}
