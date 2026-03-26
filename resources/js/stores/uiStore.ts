import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  mobileMenuOpen: boolean
  loading: boolean
  toastMessage: string | null
  toastType: 'success' | 'error' | 'info' | null
  toggleSidebar: () => void
  setMobileMenuOpen: (open: boolean) => void
  setLoading: (loading: boolean) => void
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
  hideToast: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  loading: false,
  toastMessage: null,
  toastType: null,
  toggleSidebar: () =>
    set((state) => ({
      sidebarCollapsed: !state.sidebarCollapsed,
    })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setLoading: (loading) => set({ loading }),
  showToast: (message, type) =>
    set({ toastMessage: message, toastType: type }),
  hideToast: () => set({ toastMessage: null, toastType: null }),
}))
