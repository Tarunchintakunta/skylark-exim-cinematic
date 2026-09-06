import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useStore, scrollRef } from '@/store/useStore'

gsap.registerPlugin(ScrollTrigger)

/**
 * One master ScrollTrigger drives the whole film. Lenis smooths the wheel so
 * the camera moves like a dolly rather than a jump cut.
 */
export function useScrollTimeline(containerRef: React.RefObject<HTMLDivElement | null>) {
  const setProgress = useStore((s) => s.setProgress)
  const reduced = useStore((s) => s.reducedMotion)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let lenis: Lenis | null = null
    let rafId = 0
    let tickerFn: ((t: number) => void) | null = null

    // Touch devices scroll better natively; smoothing them fights the platform.
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (!reduced && !coarse) {
      // Short and tight. A long glide keeps moving after the wheel stops, which
      // reads as lag rather than smoothness when every frame is scrubbed to it.
      lenis = new Lenis({
        duration: 0.85,
        lerp: 0.14,
        wheelMultiplier: 1.25,
        smoothWheel: true,
      })
      lenis.on('scroll', ScrollTrigger.update)
      // one ticker for Lenis and GSAP, rather than a second rAF racing it
      const tick = (t: number) => lenis?.raf(t * 1000)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)
      tickerFn = tick
    }

    let lastP = 0
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
        setProgress(p)
      },
    })

    ScrollTrigger.refresh()
    const onResize = () => ScrollTrigger.refresh()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      st.kill()
      if (rafId) cancelAnimationFrame(rafId)
      if (tickerFn) gsap.ticker.remove(tickerFn)
      lenis?.destroy()
    }
  }, [containerRef, setProgress, reduced])
}

/** Scroll to a chapter by its normalised start. */
export function scrollToProgress(p: number) {
  const doc = document.documentElement
  const max = doc.scrollHeight - window.innerHeight
  window.scrollTo({ top: p * max + 4, behavior: 'smooth' })
}
