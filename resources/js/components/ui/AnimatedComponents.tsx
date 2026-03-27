/**
 * Animated UI components for Suppliers module.
 *
 * Provides pre-built components with micro-interactions.
 */

import { ReactNode, useRef, useEffect } from 'react'
import { Box, Paper, Button, Group, Text, Loader, Stack } from '@mantine/core'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconLoader,
} from '@tabler/icons-react'
import {
  fadeInTransition,
  cardHoverProps,
  buttonHoverProps,
  createRippleEffect,
  pulseAnimation,
  shimmerAnimation,
  shimmerGradient,
  listItemFadeIn,
  staggerContainer,
  successCheckAnimation,
  errorShakeAnimation,
  initMicroInteractionStyles,
} from '@/utils/microInteractions'

// ============================================================================
// ANIMATED CARD
// ============================================================================

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
  delay?: number
}

/**
 * Card component with fade-in and hover animations
 *
 * @example
 * <AnimatedCard hover>
 *   <Text>Card content</Text>
 * </AnimatedCard>
 */
export function AnimatedCard({
  children,
  className = '',
  onClick,
  hover = true,
  delay = 0,
}: AnimatedCardProps) {
  useEffect(() => {
    initMicroInteractionStyles()
  }, [])

  const hoverProps = hover ? cardHoverProps : {}

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay,
        ease: 'easeOut',
      }}
    >
      <Paper
        shadow="sm"
        radius="md"
        p="md"
        className={`cursor-pointer ${className}`}
        onClick={onClick}
        {...hoverProps}
      >
        {children}
      </Paper>
    </motion.div>
  )
}

// ============================================================================
// ANIMATED BUTTON
// ============================================================================

interface AnimatedButtonProps {
  children: ReactNode
  onClick?: (e: React.MouseEvent) => void
  color?: string
  variant?: string
  loading?: boolean
  leftSection?: ReactNode
  rightSection?: ReactNode
  ripple?: boolean
  className?: string
}

/**
 * Button component with hover, click, and ripple animations
 *
 * @example
 * <AnimatedButton ripple leftSection={<IconPlus />}>
 *   Add Supplier
 * </AnimatedButton>
 */
export function AnimatedButton({
  children,
  onClick,
  color = 'blue',
  variant = 'filled',
  loading = false,
  leftSection,
  rightSection,
  ripple = true,
  className = '',
}: AnimatedButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (ripple && !loading) {
      createRippleEffect(e)
    }
    onClick?.(e)
  }

  return (
    <Button
      color={color}
      variant={variant}
      loading={loading}
      leftSection={leftSection}
      rightSection={rightSection}
      onClick={handleClick}
      className={className}
      styles={(theme) => ({
        root: {
          transition: 'all 0.15s ease-out',
        },
      })}
    >
      {children}
    </Button>
  )
}

// ============================================================================
// SKELETON LOADER
// ============================================================================

interface SkeletonLoaderProps {
  count?: number
  height?: number
}

/**
 * Skeleton loading component with shimmer effect
 *
 * @example
 * <SkeletonLoader count={5} height={60} />
 */
export function SkeletonLoader({ count = 3, height = 60 }: SkeletonLoaderProps) {
  return (
    <Stack gap="sm">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.3,
            delay: i * 0.05,
            ease: 'easeOut',
          }}
        >
          <Box
            h={height}
            style={{
              background: shimmerGradient,
              backgroundSize: '1000px 100%',
              borderRadius: '4px',
            }}
          />
        </motion.div>
      ))}
    </Stack>
  )
}

// ============================================================================
// LIST ITEM WITH ANIMATIONS
// ============================================================================

interface AnimatedListItemProps {
  children: ReactNode
  index?: number
  onClick?: () => void
  isDeleting?: boolean
  className?: string
}

/**
 * List item with fade-in and exit animations
 *
 * @example
 * <AnimatedListItem index={0}>
 *   <Text>Item 1</Text>
 * </AnimatedListItem>
 */
export function AnimatedListItem({
  children,
  index = 0,
  onClick,
  isDeleting = false,
  className = '',
}: AnimatedListItemProps) {
  return (
    <AnimatePresence mode="wait">
      {!isDeleting && (
        <motion.div
          key={`item-${index}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{
            duration: 0.3,
            delay: index * 0.05,
            ease: 'easeOut',
          }}
        >
          <Box
            p="sm"
            className={`cursor-pointer hover:bg-gray-50 rounded ${className}`}
            onClick={onClick}
          >
            {children}
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// SUCCESS/ERROR NOTIFICATIONS
// ============================================================================

interface StatusNotificationProps {
  type: 'success' | 'error' | 'warning'
  title: string
  message?: string
  onClose?: () => void
}

/**
 * Animated status notification with icon
 *
 * @example
 * <StatusNotification type="success" title="Success!" message="Supplier created" />
 */
export function StatusNotification({
  type,
  title,
  message,
  onClose,
}: StatusNotificationProps) {
  const icons = {
    success: <IconCheck size={24} />,
    error: <IconX size={24} />,
    warning: <IconAlertTriangle size={24} />,
  }

  const colors = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
  } as const

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Paper
        shadow="sm"
        radius="md"
        p="md"
        withBorder
        style={{ borderColor: `var(--mantine-color-${colors[type]}-6)` }}
      >
        <Group gap="sm">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 10,
            }}
            style={{ color: `var(--mantine-color-${colors[type]}-6)` }}
          >
            {icons[type]}
          </motion.div>
          <Stack gap={0}>
            <Text fw={600}>{title}</Text>
            {message && (
              <Text size="sm" c="dimmed">
                {message}
              </Text>
            )}
          </Stack>
        </Group>
      </Paper>
    </motion.div>
  )
}

// ============================================================================
// LOADING SPINNER
// ============================================================================

interface LoadingSpinnerProps {
  size?: number
  label?: string
}

/**
 * Animated loading spinner with pulse effect
 *
 * @example
 * <LoadingSpinner size={24} label="Loading suppliers..." />
 */
export function LoadingSpinner({ size = 24, label }: LoadingSpinnerProps) {
  return (
    <Stack align="center" gap="xs">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <Loader size={size} />
      </motion.div>
      {label && (
        <motion.div
          {...pulseAnimation}
        >
          <Text size="sm" c="dimmed">
            {label}
          </Text>
        </motion.div>
      )}
    </Stack>
  )
}

// ============================================================================
// COUNT-UP NUMBER
// ============================================================================

interface CountUpNumberProps {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
}

/**
 * Number component with count-up animation
 *
 * @example
 * <CountUpNumber end={150} prefix="৳" />
 */
export function CountUpNumber({
  end,
  duration = 1000,
  prefix = '',
  suffix = '',
  className = '',
}: CountUpNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const start = 0
    const startTime = performance.now()
    const difference = end - start

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3) // Ease out cubic

      const current = start + (difference * easeProgress)
      element.textContent = `${prefix}${Math.round(current)}${suffix}`

      if (progress < 1) {
        requestAnimationFrame(update)
      } else {
        element.textContent = `${prefix}${end}${suffix}`
      }
    }

    requestAnimationFrame(update)
  }, [end, duration, prefix, suffix])

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  )
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

interface AnimatedProgressBarProps {
  value: number
  max?: number
  color?: string
  height?: number
  label?: string
  showLabel?: boolean
}

/**
 * Progress bar with smooth fill animation
 *
 * @example
 * <AnimatedProgressBar value={75} label="Loading..." />
 */
export function AnimatedProgressBar({
  value,
  max = 100,
  color = 'blue',
  height = 8,
  label,
  showLabel = false,
}: AnimatedProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100)

  return (
    <Stack gap={showLabel ? 'xs' : 0}>
      {showLabel && label && (
        <Text size="sm" c="dimmed">
          {label}
        </Text>
      )}
      <Box
        h={height}
        bg="gray.2"
        style={{ borderRadius: '4px', overflow: 'hidden', position: 'relative' }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            height: '100%',
            backgroundColor: `var(--mantine-color-${color}-6)`,
            borderRadius: '4px',
          }}
        />
      </Box>
    </Stack>
  )
}

// ============================================================================
// TOGGLE SWITCH
// ============================================================================

interface AnimatedToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

/**
 * Toggle switch with smooth animation
 *
 * @example
 * <AnimatedToggle checked={isActive} onChange={setIsActive} label="Active" />
 */
export function AnimatedToggle({
  checked,
  onChange,
  label,
  disabled = false,
}: AnimatedToggleProps) {
  return (
    <Group gap="sm">
      <motion.div
        className="toggle-switch"
        style={{
          width: '50px',
          height: '26px',
          borderRadius: '13px',
          backgroundColor: checked ? 'var(--mantine-color-blue-6)' : '#e0e0e0',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'all 0.2s ease-out',
        }}
        onClick={() => !disabled && onChange(!checked)}
        whileHover={disabled ? {} : { scale: 1.02 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
      >
        <motion.div
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: 'white',
            position: 'absolute',
            top: '2px',
            left: '2px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
          animate={{
            left: checked ? '26px' : '2px',
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.div>
      {label && (
        <Text size="sm" c={disabled ? 'dimmed' : 'white'}>
          {label}
        </Text>
      )}
    </Group>
  )
}

// ============================================================================
// EXPANDABLE SECTION
// ============================================================================

interface ExpandableSectionProps {
  children: ReactNode
  label: string
  defaultOpen?: boolean
}

/**
 * Expandable section with smooth height animation
 *
 * @example
 * <ExpandableSection label="Advanced Options">
 *   <AdvancedOptions />
 * </ExpandableSection>
 */
export function ExpandableSection({
  children,
  label,
  defaultOpen = false,
}: ExpandableSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState(defaultOpen ? 'auto' : '0px')

  useEffect(() => {
    if (contentRef.current) {
      if (isOpen) {
        const scrollHeight = contentRef.current.scrollHeight
        setHeight(`${scrollHeight}px`)
        setTimeout(() => setHeight('auto'), 300)
      } else {
        const scrollHeight = contentRef.current.scrollHeight
        setHeight(`${scrollHeight}px`)
        setTimeout(() => setHeight('0px'), 0)
      }
    }
  }, [isOpen])

  return (
    <Stack gap="xs">
    <Group
      justify="space-between"
      onClick={() => setIsOpen(!isOpen)}
      style={{ cursor: 'pointer' }}
    >
      <Text fw={600}>{label}</Text>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ fontSize: '12px' }}
      >
        ▼
      </motion.div>
    </Group>
    <Box
      ref={contentRef}
      style={{
        overflow: 'hidden',
        height,
        transition: 'height 0.3s ease-out',
      }}
    >
      {children}
    </Box>
  </Stack>
  )
}

// ============================================================================
// STAGGERED LIST
// ============================================================================

interface StaggeredListProps {
  items: ReactNode[]
  className?: string
}

/**
 * List with staggered fade-in animations
 *
 * @example
 * <StaggeredList items={[<Item1 />, <Item2 />, <Item3 />]} />
 */
export function StaggeredList({ items, className = '' }: StaggeredListProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={className}
    >
      {items.map((item, index) => (
        <motion.div key={index} variants={listItemFadeIn}>
          {item}
        </motion.div>
      ))}
    </motion.div>
  )
}

// ============================================================================
// EXPORT ALL COMPONENTS
// ============================================================================

export {
  fadeInTransition,
  cardHoverProps,
  buttonHoverProps,
  pulseAnimation,
  shimmerAnimation,
  successCheckAnimation,
  errorShakeAnimation,
}
