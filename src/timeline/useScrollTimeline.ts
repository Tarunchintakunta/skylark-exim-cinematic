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

    if (!reduced) {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
        wheelMultiplier: 1.0,
        touchMultiplier: 1.6,
        syncTouch: true,
      })
      lenis.on('scroll', ScrollTrigger.update)
      const raf = (time: number) => {
        lenis?.raf(time)
        rafId = requestAnimationFrame(raf)
      }
      rafId = requestAnimationFrame(raf)
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
