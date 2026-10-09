import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useStore, scrollRef } from '@/store/useStore'
import { chapterAt } from '@/timeline/chapters'

gsap.registerPlugin(ScrollTrigger)

/**
 * One master ScrollTrigger drives the whole film. Lenis smooths the wheel so
 * the camera moves like a dolly rather than a jump cut.
 */
export function useScrollTimeline(containerRef: React.RefObject<HTMLDivElement | null>) {
  const setChapter = useStore((s) => s.setChapter)
  const reduced = useStore((s) => s.reducedMotion)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let lenis: Lenis | null = null
    let tickerFn: ((t: number) => void) | null = null

    // Touch devices scroll better natively; smoothing them fights the platform.
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (!reduced && !coarse) {
      // Short and tight. A long glide keeps moving after the wheel stops, which
      // reads as lag rather than smoothness when every frame is scrubbed to it.
      // duration and lerp are two different smoothing models: passing both
      // leaves the feel to whichever the installed version happens to prefer,
      // so this sets lerp alone, which is the frame-rate independent one.
      lenis = new Lenis({
        lerp: 0.12,
        wheelMultiplier: 1,
        smoothWheel: true,
      })
      lenis.on('scroll', ScrollTrigger.update)
      // One ticker for Lenis and GSAP, rather than a second rAF racing it.
      // Lenis goes first, so everything else on the ticker this frame (the
      // film, the copy, the progress bar) reads this frame's scroll, not last
      // frame's.
      const tick = (t: number) => lenis?.raf(t * 1000)
      gsap.ticker.add(tick, false, true)
      gsap.ticker.lagSmoothing(0)
      tickerFn = tick
    }

    let lastP = 0
    let lastChapter = -1
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress
        scrollRef.velocity = p - lastP
        lastP = p
        scrollRef.current = p
        // React hears about the scroll only when the chapter changes
        const c = chapterAt(p)
        if (c.index !== lastChapter) {
          lastChapter = c.index
          setChapter(c)
        }
      },
    })

    // ScrollTrigger already refreshes itself, debounced, on resize
    ScrollTrigger.refresh()

    return () => {
      st.kill()
      if (tickerFn) gsap.ticker.remove(tickerFn)
      lenis?.destroy()
    }
  }, [containerRef, setChapter, reduced])
}

/** Scroll to a chapter by its normalised start. */
export function scrollToProgress(p: number) {
  const doc = document.documentElement
  const max = doc.scrollHeight - window.innerHeight
  const reduced = useStore.getState().reducedMotion
  window.scrollTo({ top: p * max + 4, behavior: reduced ? 'auto' : 'smooth' })
}

/**
 * Run `fn` on gsap.ticker with the scroll progress, only on frames where the
 * scroll actually moved. Everything on the page that animates per frame goes
 * through this, so there is one loop per frame and an idle page does no work.
 */
export function useScrollFrame(fn: (p: number) => void, deps: React.DependencyList = []) {
  useEffect(() => {
    let last = NaN
    const tick = () => {
      const p = scrollRef.current
      if (p === last) return
      last = p
      fn(p)
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
