import { create } from 'zustand'
import { chapters, chapterAt, type Chapter } from '@/timeline/chapters'

export type Quality = 'high' | 'medium' | 'low'

interface AppState {
  progress: number
  chapter: Chapter
  chapterIndex: number
  ready: boolean
  loadPct: number
  quality: Quality
  reducedMotion: boolean
  webglOk: boolean
  menuOpen: boolean
  rfqSent: boolean
  setProgress: (p: number) => void
  setReady: (r: boolean) => void
  setLoadPct: (n: number) => void
  setQuality: (q: Quality) => void
  setReducedMotion: (b: boolean) => void
  setWebglOk: (b: boolean) => void
  setMenuOpen: (b: boolean) => void
  setRfqSent: (b: boolean) => void
}

const detectQuality = (): Quality => {
  if (typeof window === 'undefined') return 'high'
  const w = window.innerWidth
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8
  const dpr = window.devicePixelRatio || 1
  if (w < 700 || mem <= 4) return 'low'
  if (w < 1300 || dpr > 2.5 || mem <= 6) return 'medium'
  return 'high'
}

const detectReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const useStore = create<AppState>((set) => ({
  progress: 0,
  chapter: chapters[0],
  chapterIndex: 0,
  ready: false,
  loadPct: 0,
  quality: detectQuality(),
  reducedMotion: detectReduced(),
  webglOk: true,
  menuOpen: false,
  rfqSent: false,
  setProgress: (p) =>
    set((s) => {
      const c = chapterAt(p)
      if (c.index === s.chapterIndex) return { progress: p }
      return { progress: p, chapter: c, chapterIndex: c.index }
    }),
  setReady: (ready) => set({ ready }),
  setLoadPct: (loadPct) => set({ loadPct }),
  setQuality: (quality) => set({ quality }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setWebglOk: (webglOk) => set({ webglOk }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setRfqSent: (rfqSent) => set({ rfqSent }),
}))

/**
 * Live scroll progress read outside React (per animation frame) so the R3F
 * render loop never triggers a React re-render.
 */
export const scrollRef = { current: 0, velocity: 0 }
