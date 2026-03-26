import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Types for finance-related data
export interface RecentAccount {
  id: number
  name: string
  code: string
  type: string
  viewedAt: string
}

export interface RecentBank {
  id: number
  name: string
  type: string
  viewedAt: string
}

export interface RecentExpense {
  id: number
  title: string
  amount: number
  viewedAt: string
}

// Optional persistent filters (opt-in, not forced)
export interface FinanceFilters {
  accounts: {
    showInactive: boolean
    activeTab: string
  }
  expenses: {
    selectedStatus: string
  }
  banks: {
    typeFilter: string
  }
}

interface FinanceState {
  // Recent items (shared across pages)
  recentAccounts: RecentAccount[]
  recentBanks: RecentBank[]
  recentExpenses: RecentExpense[]

  // Optional persistent filters (disabled by default)
  filters: FinanceFilters
  persistFilters: boolean // User preference for filter persistence

  // Actions - Recent Items
  addRecentAccount: (account: RecentAccount) => void
  addRecentBank: (bank: RecentBank) => void
  addRecentExpense: (expense: RecentExpense) => void
  clearRecentAccounts: () => void
  clearRecentBanks: () => void
  clearRecentExpenses: () => void

  // Actions - Filters
  setAccountFilters: (filters: Partial<FinanceFilters['accounts']>) => void
  setExpenseFilters: (filters: Partial<FinanceFilters['expenses']>) => void
  setBankFilters: (filters: Partial<FinanceFilters['banks']>) => void
  resetFilters: () => void
  togglePersistFilters: () => void

  // Helpers
  getRecentAccounts: (limit?: number) => RecentAccount[]
  getRecentBanks: (limit?: number) => RecentBank[]
  getRecentExpenses: (limit?: number) => RecentExpense[]
}

const MAX_RECENT_ITEMS = 10

const defaultFilters: FinanceFilters = {
  accounts: {
    showInactive: false,
    activeTab: 'all',
  },
  expenses: {
    selectedStatus: 'all',
  },
  banks: {
    typeFilter: 'all',
  },
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      // Initial state
      recentAccounts: [],
      recentBanks: [],
      recentExpenses: [],
      filters: defaultFilters,
      persistFilters: false, // Disabled by default - user must opt-in

      // Add recent account (max 10 items, sorted by most recent)
      addRecentAccount: (account) => {
        set((state) => {
          // Remove if already exists
          const filtered = state.recentAccounts.filter((a) => a.id !== account.id)
          // Add new item at the beginning
          const updated = [{ ...account, viewedAt: new Date().toISOString() }, ...filtered]
          // Keep only max items
          return { recentAccounts: updated.slice(0, MAX_RECENT_ITEMS) }
        })
      },

      addRecentBank: (bank) => {
        set((state) => {
          const filtered = state.recentBanks.filter((b) => b.id !== bank.id)
          const updated = [{ ...bank, viewedAt: new Date().toISOString() }, ...filtered]
          return { recentBanks: updated.slice(0, MAX_RECENT_ITEMS) }
        })
      },

      addRecentExpense: (expense) => {
        set((state) => {
          const filtered = state.recentExpenses.filter((e) => e.id !== expense.id)
          const updated = [{ ...expense, viewedAt: new Date().toISOString() }, ...filtered]
          return { recentExpenses: updated.slice(0, MAX_RECENT_ITEMS) }
        })
      },

      // Clear recent items
      clearRecentAccounts: () => set({ recentAccounts: [] }),
      clearRecentBanks: () => set({ recentBanks: [] }),
      clearRecentExpenses: () => set({ recentExpenses: [] }),

      // Filter management (only used if persistFilters is true)
      setAccountFilters: (filters) => {
        const state = get()
        if (!state.persistFilters) return // Ignore if persistence is disabled
        set({
          filters: {
            ...state.filters,
            accounts: { ...state.filters.accounts, ...filters },
          },
        })
      },

      setExpenseFilters: (filters) => {
        const state = get()
        if (!state.persistFilters) return
        set({
          filters: {
            ...state.filters,
            expenses: { ...state.filters.expenses, ...filters },
          },
        })
      },

      setBankFilters: (filters) => {
        const state = get()
        if (!state.persistFilters) return
        set({
          filters: {
            ...state.filters,
            banks: { ...state.filters.banks, ...filters },
          },
        })
      },

      resetFilters: () => set({ filters: defaultFilters }),

      togglePersistFilters: () => set((state) => ({ persistFilters: !state.persistFilters })),

      // Helper getters
      getRecentAccounts: (limit = 5) => {
        return get().recentAccounts.slice(0, limit)
      },

      getRecentBanks: (limit = 5) => {
        return get().recentBanks.slice(0, limit)
      },

      getRecentExpenses: (limit = 5) => {
        return get().recentExpenses.slice(0, limit)
      },
    }),
    {
      name: 'finance-storage', // LocalStorage key
      partialize: (state) => ({
        // Only persist these fields
        recentAccounts: state.recentAccounts,
        recentBanks: state.recentBanks,
        recentExpenses: state.recentExpenses,
        filters: state.filters,
        persistFilters: state.persistFilters,
      }),
    }
  )
)
