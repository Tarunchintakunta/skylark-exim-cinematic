import { create } from 'zustand'
import { chapters, type Chapter } from '@/timeline/chapters'

export type Quality = 'high' | 'medium' | 'low'

interface AppState {
  chapter: Chapter
  chapterIndex: number
  ready: boolean
  loadPct: number
  quality: Quality
  reducedMotion: boolean
  webglOk: boolean
  menuOpen: boolean
  rfqSent: boolean
  /** called by the scroll timeline only when the chapter actually changes */
  setChapter: (c: Chapter) => void
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
  chapter: chapters[0],
  chapterIndex: 0,
  ready: false,
  loadPct: 0,
  quality: detectQuality(),
  reducedMotion: detectReduced(),
  webglOk: true,
  menuOpen: false,
  rfqSent: false,
  setChapter: (c) => set({ chapter: c, chapterIndex: c.index }),
  setReady: (ready) => set({ ready }),
  setLoadPct: (loadPct) => set({ loadPct }),
  setQuality: (quality) => set({ quality }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setWebglOk: (webglOk) => set({ webglOk }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setRfqSent: (rfqSent) => set({ rfqSent }),
}))

/**
 * Live scroll progress, written by the master ScrollTrigger and read outside
 * React on gsap.ticker by everything that moves per frame: the film, the copy,
 * the progress bar, the camera. It is never React state; the store only hears
 * about chapter changes.
 */
export const scrollRef = { current: 0, velocity: 0 }
