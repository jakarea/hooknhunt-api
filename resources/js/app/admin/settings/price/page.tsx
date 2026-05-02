import { useState, useMemo, useEffect } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { apiMethods } from '@/lib/api'
import { notifications } from '@mantine/notifications'

interface PricingSettings {
  wholesaleProfitPercentage: number
  wholesaleOfferPercentage: number
  retailProfitPercentage: number
  retailOfferPercentage: number
}

const DEFAULT_SETTINGS: PricingSettings = {
  wholesaleProfitPercentage: 100,
  wholesaleOfferPercentage: 25,
  retailProfitPercentage: 100,
  retailOfferPercentage: 25,
}

export default function Page() {
  const { hasPermission } = usePermissions()

  if (!hasPermission('system.settings.index')) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}><h3>Access Denied</h3><p>You don't have permission to view this page.</p></div>
  }

  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [demoCost, setDemoCost] = useState<number>(100)

  // Fetch existing settings on page load
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiMethods.get<{ success: boolean; data: { settings: PricingSettings } }>('/system/settings/pricing')
        if (response?.data?.settings) {
          setSettings(response.data.settings)
        }
      } catch (error) {
        // Silently use defaults if API fails
        console.log('Using default pricing settings (API unavailable)')
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // Calculate demo prices
  const demoPrices = useMemo(() => {
    const wholesalePrice = demoCost + (demoCost * settings.wholesaleProfitPercentage / 100)
    const wholesaleOffer = wholesalePrice - (wholesalePrice * settings.wholesaleOfferPercentage / 100)
    const retailPrice = demoCost + (demoCost * settings.retailProfitPercentage / 100)
    const retailOffer = retailPrice - (retailPrice * settings.retailOfferPercentage / 100)

    return {
      wholesalePrice: wholesalePrice.toFixed(2),
      wholesaleOffer: wholesaleOffer.toFixed(2),
      retailPrice: retailPrice.toFixed(2),
      retailOffer: retailOffer.toFixed(2),
    }
  }, [demoCost, settings])

  const saveSettings = async () => {
    try {
      setSaving(true)
      await apiMethods.put('/system/settings/pricing', { settings })
      notifications.show({
        title: 'Success',
        message: 'Settings saved successfully!',
        color: 'green',
      })
    } catch (error) {
      console.error('Error saving pricing settings:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to save settings',
        color: 'red',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ec3137]"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
          <h1 className="text-3xl font-bold">Pricing Settings</h1>
          <p className="text-muted-foreground">Configure profit and offer percentages</p>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="space-y-6">
              {/* Wholesale Section */}
              <div>
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Wholesale Pricing</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Profit Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={settings.wholesaleProfitPercentage}
                      onChange={(e) => setSettings({ ...settings, wholesaleProfitPercentage: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ec3137] focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Offer Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={settings.wholesaleOfferPercentage}
                      onChange={(e) => setSettings({ ...settings, wholesaleOfferPercentage: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ec3137] focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Retail Section */}
              <div>
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Retail Pricing</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Profit Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={settings.retailProfitPercentage}
                      onChange={(e) => setSettings({ ...settings, retailProfitPercentage: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ec3137] focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Offer Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={settings.retailOfferPercentage}
                      onChange={(e) => setSettings({ ...settings, retailOfferPercentage: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ec3137] focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Demo Calculation Section - Compact */}
              <div className="bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Input */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sample Cost:</label>
                    <div className="flex items-center">
                      <span className="text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        value={demoCost}
                        onChange={(e) => setDemoCost(Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                      />
                    </div>
                  </div>

                  {/* Results - inline */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600 dark:text-gray-400">WS:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">${demoPrices.wholesalePrice}</span>
                      <span className="text-green-600 dark:text-green-400">(${demoPrices.wholesaleOffer})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600 dark:text-gray-400">RT:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">${demoPrices.retailPrice}</span>
                      <span className="text-green-600 dark:text-green-400">(${demoPrices.retailOffer})</span>
                    </div>
                  </div>

                  {/* Formula hint */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                    Price = Cost + (Cost × Profit%)
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={saving}
                  className="bg-[#ec3137] text-white px-6 py-2 rounded-lg hover:bg-[#c9282e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
