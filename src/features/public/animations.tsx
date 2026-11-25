import { animate, motion, useInView, useReducedMotion, useScroll, useTransform, type Variants } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'

const EASE = [0.16, 1, 0.3, 1] as const

/** Scroll-triggered reveal with a soft blur + lift. Triggers once as the element enters view. */
export function Reveal({ children, delay = 0, y = 28, className = '' }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/** Alias for call sites that prefer the explicit scroll-reveal name. */
export const ScrollReveal = Reveal

const wordVariants: Variants = {
  hidden: { opacity: 0, y: '0.6em', rotateX: -35, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' },
}

export function RevealText({ text, className = '', delay = 0, wordDelay = 0.045 }: { text: string; className?: string; delay?: number; wordDelay?: number }) {
  const reduceMotion = useReducedMotion()
  const words = text.split(' ')
  return (
    <motion.span
      className={className}
      style={{ perspective: 800, display: 'inline-block' }}
      initial={reduceMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, amount: 0.3, margin: '0px 0px -10% 0px' }}
      transition={{ staggerChildren: wordDelay, delayChildren: delay }}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="inline-block origin-bottom"
          variants={reduceMotion ? undefined : wordVariants}
          transition={{ duration: 0.9, ease: EASE }}
        >
          {word}
          {index < words.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </motion.span>
  )
}

export function ParallaxImage({ src, alt, className = '', imageClassName = '', speed = 0.14 }: { src: string; alt: string; className?: string; imageClassName?: string; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [`-${speed * 100}px`, `${speed * 100}px`])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1, 1.08])
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        style={reduceMotion ? undefined : { y, scale }}
        className={`size-full object-cover ${imageClassName}`}
      />
    </div>
  )
}

export function CountUp({ value, suffix = '', duration = 1.6 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(reduceMotion ? value : 0)

  useEffect(() => {
    if (!inView || reduceMotion) return
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    })
    return () => controls.stop()
  }, [inView, value, duration, reduceMotion])

  return <span ref={ref}>{display}{suffix}</span>
}

export function GoldRule({ className = '' }: { className?: string }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.span
      className={`block h-px origin-left bg-gradient-to-r from-champagne via-champagne/50 to-transparent ${className}`}
      initial={reduceMotion ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 1.1, ease: EASE }}
      aria-hidden="true"
    />
  )
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  return <motion.div className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-champagne" style={{ scaleX: scrollYProgress }} aria-hidden="true" />
}
