/**
 * Micro-interaction animations and transitions for Suppliers module.
 *
 * Provides Framer Motion variants and Mantine transition configs
 * for consistent, delightful animations across the UI.
 */

import { Transition, MantineTransition } from '@mantine/core'

// ============================================================================
// TRANSITION CONFIGS
// ============================================================================

/**
 * Standard fade-in transition
 * Use for: Page loads, modal openings
 */
export const fadeInTransition: MantineTransition = {
  in: { opacity: 1, transform: 'translateY(0)' },
  out: { opacity: 0, transform: 'translateY(-10px)' },
  common: { transform: 'translateY(-10px)' },
  transitionProps: { duration: 200, timingFunction: 'ease-in-out' },
}

/**
 * Slide-in from right transition
 * Use for: Drawers, side panels
 */
export const slideInRight: MantineTransition = {
  in: { opacity: 1, transform: 'translateX(0)' },
  out: { opacity: 0, transform: 'translateX(20px)' },
  common: { transform: 'translateX(20px)' },
  transitionProps: { duration: 250, timingFunction: 'ease-out' },
}

/**
 * Scale-in transition
 * Use for: Modals, popovers
 */
export const scaleIn: MantineTransition = {
  in: { opacity: 1, transform: 'scale(1)' },
  out: { opacity: 0, transform: 'scale(0.95)' },
  common: { transform: 'scale(0.95)', opacity: 0 },
  transitionProps: { duration: 200, timingFunction: 'ease-out' },
}

/**
 * Fast fade transition
 * Use for: Quick toggles, small UI elements
 */
export const fastFade: MantineTransition = {
  in: { opacity: 1 },
  out: { opacity: 0 },
  common: { opacity: 0 },
  transitionProps: { duration: 100, timingFunction: 'ease-out' },
}

// ============================================================================
// HOVER EFFECTS
// ============================================================================

/**
 * Card hover elevation
 * Increases shadow and slight lift on hover
 */
export const cardHoverProps = {
  onMouseEnter: (e: React.MouseEvent) => {
    const card = e.currentTarget as HTMLElement
    card.style.transition = 'all 0.2s ease-out'
    card.style.transform = 'translateY(-2px)'
    card.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)'
  },
  onMouseLeave: (e: React.MouseEvent) => {
    const card = e.currentTarget as HTMLElement
    card.style.transition = 'all 0.2s ease-out'
    card.style.transform = 'translateY(0)'
    card.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
}

/**
 * Button hover effect
 * Smooth background and transform change
 */
export const buttonHoverProps = {
  onMouseEnter: (e: React.MouseEvent) => {
    const button = e.currentTarget as HTMLElement
    button.style.transition = 'all 0.15s ease-out'
    button.style.transform = 'translateY(-1px)'
  },
  onMouseLeave: (e: React.MouseEvent) => {
    const button = e.currentTarget as HTMLElement
    button.style.transition = 'all 0.15s ease-out'
    button.style.transform = 'translateY(0)'
  },
  onMouseDown: (e: React.MouseEvent) => {
    const button = e.currentTarget as HTMLElement
    button.style.transform = 'translateY(0) scale(0.98)'
  },
  onMouseUp: (e: React.MouseEvent) => {
    const button = e.currentTarget as HTMLElement
    button.style.transform = 'translateY(-1px) scale(1)'
  },
}

/**
 * Row hover effect for tables
 * Subtle background highlight
 */
export const tableRowHoverProps = {
  onMouseEnter: (e: React.MouseEvent) => {
    const row = e.currentTarget as HTMLElement
    row.style.transition = 'background-color 0.15s ease-out'
    row.style.backgroundColor = 'rgba(0, 0, 0, 0.02)'
  },
  onMouseLeave: (e: React.MouseEvent) => {
    const row = e.currentTarget as HTMLElement
    row.style.transition = 'background-color 0.15s ease-out'
    row.style.backgroundColor = 'transparent'
  },
}

// ============================================================================
// CLICK ANIMATIONS
// ============================================================================

/**
 * Button click ripple effect
 * Adds visual feedback on button press
 */
export const createRippleEffect = (event: React.MouseEvent, color: string = 'rgba(255, 255, 255, 0.3)') => {
  const button = event.currentTarget as HTMLElement
  const ripple = document.createElement('span')
  const diameter = Math.max(button.clientWidth, button.clientHeight)
  const radius = diameter / 2

  const rect = button.getBoundingClientRect()

  ripple.style.width = ripple.style.height = `${diameter}px`
  ripple.style.left = `${event.clientX - rect.left - radius}px`
  ripple.style.top = `${event.clientY - rect.top - radius}px`
  ripple.style.position = 'absolute'
  ripple.style.borderRadius = '50%'
  ripple.style.transform = 'scale(0)'
  ripple.style.animation = 'ripple 0.6s linear-out'
  ripple.style.backgroundColor = color
  ripple.style.pointerEvents = 'none'

  // Remove existing ripples
  const existingRipple = button.getElementsByClassName('ripple')[0]
  if (existingRipple) {
    existingRipple.remove()
  }

  ripple.classList.add('ripple')
  button.appendChild(ripple)

  // Remove ripple after animation
  setTimeout(() => {
    ripple.remove()
  }, 600)
}

/**
 * Add ripple animation styles to document
 */
export const initRippleStyles = () => {
  if (document.getElementById('ripple-styles')) return

  const style = document.createElement('style')
  style.id = 'ripple-styles'
  style.textContent = `
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
    .ripple {
      position: relative;
      overflow: hidden;
    }
  `
  document.head.appendChild(style)
}

// ============================================================================
// LOADING STATES
// ============================================================================

/**
 * Pulse animation for loading indicators
 */
export const pulseAnimation = {
  initial: { opacity: 0.6 },
  animate: { opacity: 1 },
  transition: {
    duration: 0.8,
    repeat: Infinity,
    reverse: true,
    ease: 'easeInOut',
  },
}

/**
 * Spinner animation config
 */
export const spinnerAnimation = {
  initial: { rotate: 0 },
  animate: { rotate: 360 },
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: 'linear',
  },
}

/**
 * Skeleton shimmer effect
 */
export const shimmerAnimation = {
  initial: { backgroundPosition: '-1000px 0' },
  animate: { backgroundPosition: '1000px 0' },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'linear',
  },
}

/**
 * Skeleton shimmer gradient
 */
export const shimmerGradient = 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)'

// ============================================================================
// SUCCESS/ERROR FEEDBACK
// ============================================================================

/**
 * Success checkmark animation
 */
export const successCheckAnimation = {
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: {
    duration: 0.5,
    ease: 'easeInOut',
  },
}

/**
 * Error shake animation
 */
export const errorShakeAnimation = {
  initial: { x: 0 },
  animate: {
    x: [0, -10, 10, -10, 10, -5, 5, 0],
  },
  transition: {
    duration: 0.5,
    ease: 'easeInOut',
  },
}

/**
 * Confetti animation for celebrations
 */
export const confettiAnimation = {
  initial: { y: -20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: {
    duration: 0.6,
    ease: 'bounceOut',
  },
}

// ============================================================================
// LIST ANIMATIONS
// ============================================================================

/**
 * Stagger children animation
 * Animates list items one after another
 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

/**
 * List item fade-in
 */
export const listItemFadeIn = {
  hidden: { opacity: 0, x: -20 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    }
  },
}

/**
 * List item slide-in
 */
export const listItemSlideIn = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    }
  },
}

// ============================================================================
// FORM INTERACTIONS
// ============================================================================

/**
 * Input focus animation
 */
export const inputFocusProps = {
  onFocus: (e: React.FocusEvent) => {
    const input = e.currentTarget as HTMLElement
    input.style.transition = 'all 0.2s ease-out'
    input.style.transform = 'scale(1.01)'
    input.style.boxShadow = '0 0 0 3px rgba(33, 150, 243, 0.1)'
  },
  onBlur: (e: React.FocusEvent) => {
    const input = e.currentTarget as HTMLElement
    input.style.transition = 'all 0.2s ease-out'
    input.style.transform = 'scale(1)'
    input.style.boxShadow = 'none'
  },
}

/**
 * Checkbox animation
 */
export const checkboxAnimation = {
  unchecked: { scale: 1 },
  checked: {
    scale: [1, 0.8, 1.1, 1],
    transition: { duration: 0.3, ease: 'easeOut' }
  },
}

/**
 * Switch toggle animation
 */
export const switchAnimation = {
  off: { backgroundColor: '#e0e0e0' },
  on: {
    backgroundColor: '#228be6',
    transition: { duration: 0.2, ease: 'easeInOut' }
  },
}

// ============================================================================
// MODAL/DRAWER ANIMATIONS
// ============================================================================

/**
 * Modal backdrop fade
 */
export const modalBackdropProps = {
  transition: { duration: 200, timingFunction: 'ease-out' },
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 },
}

/**
 * Modal content scale
 */
export const modalContentProps = {
  transition: { duration: 200, timingFunction: 'ease-out' },
  initial: { opacity: 0, transform: 'scale(0.95)' },
  in: { opacity: 1, transform: 'scale(1)' },
  out: { opacity: 0, transform: 'scale(0.95)' },
}

/**
 * Drawer slide-in
 */
export const drawerTransitionProps = {
  transition: { duration: 250, timingFunction: 'ease-out' },
  initial: { transform: 'translateX(100%)' },
  in: { transform: 'translateX(0)' },
  out: { transform: 'translateX(100%)' },
}

// ============================================================================
// NOTIFICATION ANIMATIONS
// ============================================================================

/**
 * Notification slide-in from top
 */
export const notificationSlideIn = {
  initial: { transform: 'translateY(-100%)', opacity: 0 },
  animate: { transform: 'translateY(0)', opacity: 1 },
  exit: { transform: 'translateY(-100%)', opacity: 0 },
  transition: { duration: 300, ease: 'easeOut' },
}

/**
 * Notification slide-in from right
 */
export const notificationSlideInRight = {
  initial: { transform: 'translateX(100%)', opacity: 0 },
  animate: { transform: 'translateX(0)', opacity: 1 },
  exit: { transform: 'translateX(100%)', opacity: 0 },
  transition: { duration: 300, ease: 'easeOut' },
}

/**
 * Progress bar animation
 */
export const progressAnimation = {
  initial: { width: '0%' },
  animate: { width: '100%' },
  transition: { duration: 300, ease: 'easeOut' },
}

// ============================================================================
// ICON ANIMATIONS
// ============================================================================

/**
 * Spin animation for loading icons
 */
export const iconSpin = {
  animate: { rotate: 360 },
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: 'linear',
  },
}

/**
 * Bounce animation for attention
 */
export const iconBounce = {
  animate: {
    y: [0, -5, 0],
  },
  transition: {
    duration: 0.5,
    repeat: Infinity,
    ease: 'easeInOut',
  },
}

/**
 * Pulse animation for icons
 */
export const iconPulse = {
  animate: {
    scale: [1, 1.1, 1],
  },
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: 'easeInOut',
  },
}

/**
 * Shake animation for alerts
 */
export const iconShake = {
  animate: {
    rotate: [0, -10, 10, -10, 10, 0],
  },
  transition: {
    duration: 0.4,
    ease: 'easeInOut',
  },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Add smooth scroll to element
 */
export const smoothScrollTo = (element: HTMLElement, offset = 0) => {
  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
  const offsetPosition = elementPosition - offset

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  })
}

/**
 * Animate number change
 */
export const animateNumber = (
  element: HTMLElement,
  start: number,
  end: number,
  duration: number = 1000
) => {
  const startTime = performance.now()
  const difference = end - start

  const update = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeProgress = 1 - Math.pow(1 - progress, 3) // Ease out cubic

    const current = start + (difference * easeProgress)
    element.textContent = Math.round(current).toString()

    if (progress < 1) {
      requestAnimationFrame(update)
    } else {
      element.textContent = end.toString()
    }
  }

  requestAnimationFrame(update)
}

/**
 * Animate height for accordion/expandable
 */
export const animateHeight = (
  element: HTMLElement,
  targetHeight: number,
  duration: number = 300
) => {
  const startHeight = element.offsetHeight
  const difference = targetHeight - startHeight
  const startTime = performance.now()

  const update = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeProgress = 1 - Math.pow(1 - progress, 3) // Ease out cubic

    const current = startHeight + (difference * easeProgress)
    element.style.height = `${current}px`

    if (progress < 1) {
      requestAnimationFrame(update)
    } else {
      element.style.height = `${targetHeight}px`
    }
  }

  requestAnimationFrame(update)
}

/**
 * Initialize all micro-interaction styles
 */
export const initMicroInteractionStyles = () => {
  initRippleStyles()
}
