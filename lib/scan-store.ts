"use client";

// Zustand store for the current + previous scan, used for diff view in Phase 5.
// In Phase 1 we just keep the current scan.

import { create } from "zustand";
import type { Scan } from "./types";

type ScanState = {
  current: Scan | null;
  previous: Scan | null;
  setScan: (s: Scan) => void;
  clear: () => void;
};

export const useScanStore = create<ScanState>((set) => ({
  current: null,
  previous: null,
  setScan: (s) =>
    set((state) => ({
      previous: state.current,
      current: s,
    })),
  clear: () => set({ current: null, previous: null }),
}));
