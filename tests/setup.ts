import { vi } from 'vitest';

// Vuetify reads these browser APIs on mount; happy-dom does not provide them
vi.stubGlobal(
  'matchMedia',
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
);

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  },
);

vi.stubGlobal('visualViewport', {
  width: 1024,
  height: 768,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});
