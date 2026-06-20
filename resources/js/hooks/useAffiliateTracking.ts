import { useEffect, useState } from 'react'

const REFERRAL_KEY = 'affiliate_referral_code'

/**
 * Hook to track affiliate referral codes
 * Captures `ref` parameter from URL and stores LAST one (overwrites previous)
 * Returns { referralCode, referralId } for use in components
 *
 * Usage in App.tsx (runs on every navigation):
 * useAffiliateTracking()
 *
 * Usage in components (read stored value):
 * const { referralCode, referralId } = useAffiliateTracking()
 */
export function useAffiliateTracking() {
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralId, setReferralId] = useState<string | null>(null)

  useEffect(() => {
    // Track URL changes throughout the app lifetime
    const trackReferral = () => {
      const params = new URLSearchParams(window.location.search)
      const refCode = params.get('ref')

      if (refCode && refCode.trim()) {
        // New referral code found - OVERWRITE previous one
        localStorage.setItem(REFERRAL_KEY, refCode.trim())
        setReferralCode(refCode.trim())
        console.log('[Affiliate] Referral code stored:', refCode)
      } else {
        // No new ref parameter, load from localStorage if exists
        const storedCode = localStorage.getItem(REFERRAL_KEY)
        if (storedCode) {
          setReferralCode(storedCode)
        }
      }
    }

    // Track on initial load
    trackReferral()

    // Track on popstate (back/forward button)
    window.addEventListener('popstate', trackReferral)
    return () => window.removeEventListener('popstate', trackReferral)
  }, [])

  return {
    referralCode,
    referralId,
  }
}

/**
 * Get the stored referral code
 * Returns the LAST/MOST RECENT referral code stored
 */
export function getReferralCode(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFERRAL_KEY)
}

/**
 * Clear the stored referral code
 */
export function clearReferralCode(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(REFERRAL_KEY)
}

/**
 * Set referral code manually
 */
export function setReferralCode(code: string): void {
  if (typeof window === 'undefined') return
  if (code && code.trim()) {
    localStorage.setItem(REFERRAL_KEY, code.trim())
  }
}
