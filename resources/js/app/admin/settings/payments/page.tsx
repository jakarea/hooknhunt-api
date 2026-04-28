import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { Loader2, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { apiMethods } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface PaymentSettings {
  activeGateway: string
  availableGateways: string[]
  sslcommerz: {
    mode: string
    sandboxConfigured: boolean
    liveConfigured: boolean
    sandboxStoreId?: string
    liveStoreId?: string
  }
  eps: {
    mode: string
    sandboxConfigured: boolean
    liveConfigured: boolean
    sandboxStoreId?: string
    liveStoreId?: string
    callbacksConfigured: {
      success: boolean
      fail: boolean
      cancel: boolean
      ipn: boolean
    }
  }
}

export default function Page() {
  const { hasPermission } = usePermissions()
  const { token } = useAuthStore()
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (!hasPermission('system.settings.index')) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}><h3>Access Denied</h3><p>You don't have permission to view this page.</p></div>
  }

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const data = await apiMethods.get<{ success: boolean; data: PaymentSettings }>('/system/settings/payment')
      console.log({ data })
      setSettings(data.data)
    } catch (error) {
      console.error('Error fetching settings:', error)
      showMessage('error', 'Failed to load payment settings')
    } finally {
      setLoading(false)
    }
  }

  const switchGateway = async (gateway: string) => {
    try {
      console.log('[switchGateway] Starting switch to:', gateway)
      setSwitching(gateway)
      const data = await apiMethods.put<{ success: boolean; data: { activeGateway: string } }>('/system/settings/payment/gateway', { gateway })
      console.log('[switchGateway] Response:', data)
      setSettings(prev => ({ ...prev!, activeGateway: data.data.activeGateway }))
      showMessage('success', `Switched to ${gateway.toUpperCase()} successfully`)
    } catch (error) {
      console.error('[switchGateway] Error:', error)
      showMessage('error', 'Failed to switch payment gateway')
    } finally {
      setSwitching(null)
    }
  }

  const testEPS = async (mode: 'sandbox' | 'live') => {
    try {
      setTesting(mode)
      await apiMethods.post('/system/settings/payment/eps/test', { mode })
      showMessage('success', `EPS ${mode} connection test successful`)
    } catch (error) {
      console.error('Error testing EPS:', error)
      showMessage('error', `EPS ${mode} connection test failed`)
    } finally {
      setTesting(null)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  useEffect(() => {
    // Only fetch when token is available to avoid race condition
    if (token) {
      fetchSettings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#ec3137]" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Payment Gateway Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage and configure your payment gateways
            </p>
          </div>

          {/* Message Banner */}
          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              {message.text}
            </div>
          )}

          {/* Active Gateway Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Active Payment Gateway
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SSLCommerz Card */}
              <div
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  settings?.activeGateway === 'sslcommerz'
                    ? 'border-[#ec3137] bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
                onClick={() => settings?.activeGateway !== 'sslcommerz' && switchGateway('sslcommerz')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-6 w-6" />
                    <h3 className="text-lg font-semibold">SSLCommerz</h3>
                  </div>
                  {settings?.activeGateway === 'sslcommerz' && (
                    <span className="bg-[#ec3137] text-white text-xs px-2 py-1 rounded-full">ACTIVE</span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Mode:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{settings?.sslcommerz.mode}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sandbox:</span>
                    <span className={`font-medium flex items-center gap-1 ${
                      settings?.sslcommerz.sandboxConfigured ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {settings?.sslcommerz.sandboxConfigured ? (
                        <><CheckCircle className="h-4 w-4" /> Configured</>
                      ) : (
                        <><XCircle className="h-4 w-4" /> Not Configured</>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Live:</span>
                    <span className={`font-medium flex items-center gap-1 ${
                      settings?.sslcommerz.liveConfigured ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {settings?.sslcommerz.liveConfigured ? (
                        <><CheckCircle className="h-4 w-4" /> Configured</>
                      ) : (
                        <><XCircle className="h-4 w-4" /> Not Configured</>
                      )}
                    </span>
                  </div>
                </div>
                {settings?.activeGateway !== 'sslcommerz' && (
                  <button type="button" className="mt-4 w-full bg-[#ec3137] text-white py-2 rounded-lg hover:bg-[#c9282e] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={(e) => { e.stopPropagation(); switchGateway('sslcommerz'); }}
                  >
                    {switching === 'sslcommerz' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Switching...
                      </>
                    ) : (
                      'Switch to SSLCommerz'
                    )}
                  </button>
                )}
              </div>

              {/* EPS Card */}
              <div
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  settings?.activeGateway === 'eps'
                    ? 'border-[#ec3137] bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
                onClick={() => settings?.activeGateway !== 'eps' && switchGateway('eps')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-6 w-6" />
                    <h3 className="text-lg font-semibold">EPS Payment</h3>
                  </div>
                  {settings?.activeGateway === 'eps' && (
                    <span className="bg-[#ec3137] text-white text-xs px-2 py-1 rounded-full">ACTIVE</span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Mode:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{settings?.eps.mode}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sandbox:</span>
                    <span className={`font-medium flex items-center gap-1 ${
                      settings?.eps.sandboxConfigured ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {settings?.eps.sandboxConfigured ? (
                        <><CheckCircle className="h-4 w-4" /> Configured</>
                      ) : (
                        <><XCircle className="h-4 w-4" /> Not Configured</>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Live:</span>
                    <span className={`font-medium flex items-center gap-1 ${
                      settings?.eps.liveConfigured ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {settings?.eps.liveConfigured ? (
                        <><CheckCircle className="h-4 w-4" /> Configured</>
                      ) : (
                        <><XCircle className="h-4 w-4" /> Not Configured</>
                      )}
                    </span>
                  </div>
                </div>
                {settings?.activeGateway !== 'eps' && (
                  <button type="button" className="mt-4 w-full bg-[#ec3137] text-white py-2 rounded-lg hover:bg-[#c9282e] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={(e) => { e.stopPropagation(); switchGateway('eps'); }}
                  >
                    {switching === 'eps' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Switching...
                      </>
                    ) : (
                      'Switch to EPS'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* EPS Configuration Details */}
          {settings?.activeGateway === 'eps' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                EPS Configuration Details
              </h2>

              {/* Credentials Status */}
              <div className="mb-6">
                <h3 className="font-medium mb-3 text-gray-700 dark:text-gray-300">Credentials</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="font-medium mb-2 text-gray-900 dark:text-white">Sandbox</div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Store ID:</span>
                        <span className="font-mono text-gray-900 dark:text-white">{settings.eps.sandboxStoreId || 'Not Set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Password:</span>
                        <span className="text-gray-900 dark:text-white">••••••••</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Base URL:</span>
                        <span className="text-xs text-gray-500">sandbox.sslcommerz.com</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); testEPS('sandbox'); }}
                      disabled={testing === 'sandbox'}
                      className="mt-3 w-full bg-gray-100 dark:bg-gray-700 py-2 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {testing === 'sandbox' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        'Test Sandbox Connection'
                      )}
                    </button>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="font-medium mb-2 text-gray-900 dark:text-white">Live</div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Store ID:</span>
                        <span className="font-mono text-gray-900 dark:text-white">{settings.eps.liveStoreId || 'Not Set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Password:</span>
                        <span className="text-gray-900 dark:text-white">••••••••</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Base URL:</span>
                        <span className="text-xs text-gray-500">securepay.sslcommerz.com</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => testEPS('live')}
                      disabled={testing === 'live'}
                      className="mt-3 w-full bg-gray-100 dark:bg-gray-700 py-2 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {testing === 'live' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        'Test Live Connection'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Callback URLs Status */}
              <div>
                <h3 className="font-medium mb-3 text-gray-700 dark:text-gray-300">Callback URLs</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className={`border rounded-lg p-3 text-center ${
                    settings.eps.callbacksConfigured.success
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">Success</div>
                    <div className="text-xs mt-1">
                      {settings.eps.callbacksConfigured.success ? (
                        <span className="text-green-600 dark:text-green-400">✓ Configured</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">✗ Missing</span>
                      )}
                    </div>
                  </div>
                  <div className={`border rounded-lg p-3 text-center ${
                    settings.eps.callbacksConfigured.fail
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">Fail</div>
                    <div className="text-xs mt-1">
                      {settings.eps.callbacksConfigured.fail ? (
                        <span className="text-green-600 dark:text-green-400">✓ Configured</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">✗ Missing</span>
                      )}
                    </div>
                  </div>
                  <div className={`border rounded-lg p-3 text-center ${
                    settings.eps.callbacksConfigured.cancel
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">Cancel</div>
                    <div className="text-xs mt-1">
                      {settings.eps.callbacksConfigured.cancel ? (
                        <span className="text-green-600 dark:text-green-400">✓ Configured</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">✗ Missing</span>
                      )}
                    </div>
                  </div>
                  <div className={`border rounded-lg p-3 text-center ${
                    settings.eps.callbacksConfigured.ipn
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">IPN</div>
                    <div className="text-xs mt-1">
                      {settings.eps.callbacksConfigured.ipn ? (
                        <span className="text-green-600 dark:text-green-400">✓ Configured</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">✗ Missing</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration Instructions */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  How to Configure EPS
                </h4>
                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                  <li>Get your EPS sandbox credentials from your EPS account</li>
                  <li>Add them to your <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.env</code> file:
                    <ul className="ml-6 mt-1 space-y-1 list-disc">
                      <li><code className="text-xs bg-blue-100 dark:bg-blue-800 px-1 rounded">EPS_STORE_ID_SANDBOX=your_id</code></li>
                      <li><code className="text-xs bg-blue-100 dark:bg-blue-800 px-1 rounded">EPS_STORE_PASSWORD_SANDBOX=your_password</code></li>
                    </ul>
                  </li>
                  <li>For production, add live credentials and set <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">EPS_MODE=live</code></li>
                  <li>Ensure all callback URLs are publicly accessible</li>
                </ol>
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Important Notice
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>
                    Only one payment gateway can be active at a time. When you switch gateways,
                    customers will only see the selected payment method during checkout.
                    Make sure to test the gateway in sandbox mode before switching to live.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
