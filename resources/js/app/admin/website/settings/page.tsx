'use client'

import { useState, useEffect } from 'react'
import {
  Box, Stack, Group, Title, Text, Card, TextInput, Textarea,
  Button, Alert, Tabs, Badge, CopyButton, ActionIcon, Tooltip,
  NumberInput, Switch, Divider, SimpleGrid, Code,
} from '@mantine/core'
import {
  IconBrandFacebook,
  IconBrandGoogle,
  IconCheck,
  IconAlertCircle,
  IconInfoCircle,
  IconTruckDelivery,
  IconCalculator,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { getWebsiteSettings, updateWebsiteSettings, type WebsiteSettings } from '@/utils/websiteApi'
import { api } from '@/lib/api'

interface DeliverySettings {
  baseWeight: number
  insideDhaka: {
    baseCharge: number
    perKgCharge: number
  }
  outsideDhaka: {
    baseCharge: number
    perKgCharge: number
  }
  flatRate: {
    enabled: boolean
    baseCharge: number
    perKgCharge: number
  }
  freeDelivery: {
    enabled: boolean
    minAmount: number
  }
}

export default function WebsiteSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<WebsiteSettings>({
    facebook_pixel_id: null,
    facebook_pixel_code: null,
    google_analytics_id: null,
    google_analytics_code: null,
    google_tag_manager_id: null,
    google_tag_manager_code: null,
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [originalSettings, setOriginalSettings] = useState<WebsiteSettings>({
    facebook_pixel_id: null,
    facebook_pixel_code: null,
    google_analytics_id: null,
    google_analytics_code: null,
    google_tag_manager_id: null,
    google_tag_manager_code: null,
  })

  // Delivery Settings
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({
    baseWeight: 2,
    insideDhaka: { baseCharge: 60, perKgCharge: 15 },
    outsideDhaka: { baseCharge: 120, perKgCharge: 20 },
    flatRate: { enabled: false, baseCharge: 100, perKgCharge: 25 },
    freeDelivery: { enabled: false, minAmount: 0 },
  })
  const [originalDeliverySettings, setOriginalDeliverySettings] = useState<DeliverySettings>({
    baseWeight: 2,
    insideDhaka: { baseCharge: 60, perKgCharge: 15 },
    outsideDhaka: { baseCharge: 120, perKgCharge: 20 },
    flatRate: { enabled: false, baseCharge: 100, perKgCharge: 25 },
    freeDelivery: { enabled: false, minAmount: 0 },
  })
  const [deliveryHasChanges, setDeliveryHasChanges] = useState(false)

  // Test calculator state
  const [testWeight, setTestWeight] = useState(2)
  const [testDivision, setTestDivision] = useState('dhaka')
  const [testResult, setTestResult] = useState<{ charge: number; breakdown: any } | null>(null)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await getWebsiteSettings()
      const data = res.data || {}
      setSettings(data)
      setOriginalSettings(data)
      // Also fetch delivery settings
      await fetchDeliverySettings()
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to load settings', color: 'red' })
    } finally {
      setLoading(false)
    }
  }

  const fetchDeliverySettings = async () => {
    try {
      const response = await api.get('website-admin/delivery-settings')
      console.log('Delivery settings raw axios response:', response)
      console.log('Response.data (Laravel response):', response.data)

      // axios response.data is the Laravel response { success: true, data: {...} }
      if (response.data.success) {
        setDeliverySettings(response.data.data)
        setOriginalDeliverySettings(response.data.data)
      } else {
        console.error('API returned success:false', response.data)
        notifications.show({ title: 'Error', message: response.data.message || 'Failed to load delivery settings', color: 'red' })
      }
    } catch (error) {
      console.error('Error fetching delivery settings:', error)
      notifications.show({ title: 'Error', message: 'Failed to load delivery settings', color: 'red' })
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateWebsiteSettings(settings)
      setOriginalSettings(settings)
      setHasChanges(false)
      notifications.show({ title: 'Success', message: 'Settings saved successfully', color: 'green' })
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to save settings', color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDeliverySettings = async () => {
    try {
      setSaving(true)


      // Transform to snake_case for backend
      const payload = {
        base_weight: deliverySettings.baseWeight,
        inside_dhaka: {
          base_charge: deliverySettings.insideDhaka?.baseCharge ?? 60,
          per_kg_charge: deliverySettings.insideDhaka?.perKgCharge ?? 15,
        },
        outside_dhaka: {
          base_charge: deliverySettings.outsideDhaka?.baseCharge ?? 120,
          per_kg_charge: deliverySettings.outsideDhaka?.perKgCharge ?? 20,
        },
        flat_rate: {
          enabled: deliverySettings.flatRate?.enabled ?? false,
          base_charge: deliverySettings.flatRate?.baseCharge ?? 100,
          per_kg_charge: deliverySettings.flatRate?.perKgCharge ?? 25,
        },
        free_delivery: {
          enabled: deliverySettings.freeDelivery?.enabled ?? false,
          minAmount: deliverySettings.freeDelivery?.minAmount ?? 0,
        },
      }

      console.log('Sending payload:', payload)

      const response = await api.put('website-admin/delivery-settings', payload)
      console.log('Save API response:', response)
      console.log('Save response.data:', response.data)

      if (response.data.success) {
        setOriginalDeliverySettings(deliverySettings)
        setDeliveryHasChanges(false)
        notifications.show({ title: 'Success', message: 'Delivery settings saved successfully', color: 'green' })
      } else {
        throw new Error(response.data.message || 'Failed to save')
      }
    } catch (error) {
      console.error('Save error:', error)
      notifications.show({ title: 'Error', message: 'Failed to save delivery settings', color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof WebsiteSettings>(key: K, value: WebsiteSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const updateDeliverySetting = (path: string, value: any) => {
    setDeliverySettings((prev) => {
      const newData = { ...prev }
      const keys = path.split('.')
      let current: any = newData
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newData
    })
    setDeliveryHasChanges(true)
  }

  const handleCalculate = async () => {
    try {
      setCalculating(true)
      const response = await api.post('website-admin/delivery-settings/calculate', {
        weight: testWeight,
        division: testDivision,
      })
      if (response.data.success) {
        setTestResult(response.data.data)
      }
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to calculate delivery charge', color: 'red' })
    } finally {
      setCalculating(false)
    }
  }

  const calculateCharge = (weight: number, baseCharge: number, perKgCharge: number) => {
    const baseWeight = deliverySettings.baseWeight ?? 2
    if (weight <= baseWeight) {
      return baseCharge
    }
    const additionalKg = Math.ceil(weight - baseWeight)
    return baseCharge + (additionalKg * perKgCharge)
  }

  const isFacebookConfigured = !!(settings.facebook_pixel_id || settings.facebook_pixel_code)
  const isGAConfigured = !!(settings.google_analytics_id || settings.google_analytics_code)
  const isGTMConfigured = !!(settings.google_tag_manager_id || settings.google_tag_manager_code)

  if (loading) {
    return (
      <Box p="xl">
        <Text>Loading...</Text>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', xl: 'xl' }}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>Website Settings</Title>
            <Text size="sm" c="dimmed">Configure tracking codes for analytics and marketing</Text>
          </div>
          {hasChanges && (
            <Badge color="orange" variant="light">Unsaved changes</Badge>
          )}
        </Group>

        {/* Info Alert */}
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            Add your tracking IDs and codes from Facebook (Meta Pixel), Google Analytics, and Google Tag Manager.
            These will be injected into your website for tracking and analytics.
          </Text>
        </Alert>

        {/* Tracking Code Tabs */}
        <Card withBorder p="md">
          <Tabs defaultValue="facebook">
            <Tabs.List>
              <Tabs.Tab value="facebook" leftSection={<IconBrandFacebook size={16} />}>
                Facebook
                {isFacebookConfigured && <Badge size="xs" color="green" ml="xs">Active</Badge>}
              </Tabs.Tab>
              <Tabs.Tab value="analytics" leftSection={<IconBrandGoogle size={16} />}>
                Google Analytics
                {isGAConfigured && <Badge size="xs" color="green" ml="xs">Active</Badge>}
              </Tabs.Tab>
              <Tabs.Tab value="gtm" leftSection={<IconBrandGoogle size={16} />}>
                Google Tag Manager
                {isGTMConfigured && <Badge size="xs" color="green" ml="xs">Active</Badge>}
              </Tabs.Tab>
              <Tabs.Tab value="delivery" leftSection={<IconTruckDelivery size={16} />}>
                Delivery Charges
                {deliveryHasChanges && <Badge size="xs" color="orange" ml="xs">Modified</Badge>}
              </Tabs.Tab>
            </Tabs.List>

            {/* Facebook Pixel */}
            <Tabs.Panel value="facebook" pt="md">
              <Stack gap="md">
                <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                  <Text size="sm">
                    Add your Facebook Pixel ID or the complete tracking script. Find your pixel ID in{' '}
                    <Text span component="a" href="https://business.facebook.com/events_manager" target="_blank" c="blue" inherit>
                      Events Manager
                    </Text>.
                  </Text>
                </Alert>

                <Stack gap="sm">
                  <TextInput
                    label="Facebook Pixel ID"
                    placeholder="e.g., 1234567890123456"
                    description="Your Facebook Pixel ID (15-16 digit number)"
                    value={settings.facebook_pixel_id || ''}
                    onChange={(e) => updateSetting('facebook_pixel_id', e.currentTarget.value || null)}
                  />

                  <Textarea
                    label="Facebook Pixel Code (Optional)"
                    placeholder="<script>...your complete pixel script...</script>"
                    description="Or paste the complete tracking script if you prefer"
                    minRows={4}
                    value={settings.facebook_pixel_code || ''}
                    onChange={(e) => updateSetting('facebook_pixel_code', e.currentTarget.value || null)}
                  />
                </Stack>
              </Stack>
            </Tabs.Panel>

            {/* Google Analytics */}
            <Tabs.Panel value="analytics" pt="md">
              <Stack gap="md">
                <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                  <Text size="sm">
                    Add your Google Analytics Measurement ID or tracking code. Find your ID in{' '}
                    <Text span component="a" href="https://analytics.google.com/" target="_blank" c="blue" inherit>
                      Google Analytics Admin
                    </Text>.
                  </Text>
                </Alert>

                <Stack gap="sm">
                  <TextInput
                    label="Google Analytics ID (GA4)"
                    placeholder="e.g., G-XXXXXXXXXX"
                    description="Your Google Analytics 4 Measurement ID"
                    value={settings.google_analytics_id || ''}
                    onChange={(e) => updateSetting('google_analytics_id', e.currentTarget.value || null)}
                  />

                  <Textarea
                    label="Google Analytics Code (Optional)"
                    placeholder="<script async src="https://www.googletagmanager.com/gtag/js?..."></script>"
                    description="Or paste the complete tracking script"
                    minRows={4}
                    value={settings.google_analytics_code || ''}
                    onChange={(e) => updateSetting('google_analytics_code', e.currentTarget.value || null)}
                  />
                </Stack>
              </Stack>
            </Tabs.Panel>

            {/* Google Tag Manager */}
            <Tabs.Panel value="gtm" pt="md">
              <Stack gap="md">
                <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                  <Text size="sm">
                    Add your Google Tag Manager ID or container snippet. Find your ID in{' '}
                    <Text span component="a" href="https://tagmanager.google.com/" target="_blank" c="blue" inherit>
                      Google Tag Manager
                    </Text>.
                  </Text>
                </Alert>

                <Stack gap="sm">
                  <TextInput
                    label="GTM Container ID"
                    placeholder="e.g., GTM-XXXXXXX"
                    description="Your Google Tag Manager Container ID"
                    value={settings.google_tag_manager_id || ''}
                    onChange={(e) => updateSetting('google_tag_manager_id', e.currentTarget.value || null)}
                  />

                  <Textarea
                    label="GTM Container Snippet (Optional)"
                    placeholder="<script>(function(w,d,s,l,i){...})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>"
                    description="Or paste the complete GTM container snippet"
                    minRows={4}
                    value={settings.google_tag_manager_code || ''}
                    onChange={(e) => updateSetting('google_tag_manager_code', e.currentTarget.value || null)}
                  />
                </Stack>
              </Stack>
            </Tabs.Panel>

            {/* Delivery Charges */}
            <Tabs.Panel value="delivery" pt="md">
              <Stack gap="md">
                <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                  <Text size="sm">
                    Configure delivery charges for different zones. Charges are calculated based on package weight.
                    Base weight is {deliverySettings.baseWeight} KG - if weight is within this limit, only base charge applies.
                    After that, per KG rate is added for each additional KG (rounded up).
                  </Text>
                </Alert>

                <Tabs defaultValue="zones">
                  <Tabs.List>
                    <Tabs.Tab value="zones">Zone Rates</Tabs.Tab>
                    <Tabs.Tab value="flat">Flat Rate</Tabs.Tab>
                    <Tabs.Tab value="free">Free Delivery</Tabs.Tab>
                    <Tabs.Tab value="calculator">Test Calculator</Tabs.Tab>
                  </Tabs.List>

                  {/* Zone Rates */}
                  <Tabs.Panel value="zones" pt="md">
                    <Stack gap="md">
                      <Card withBorder p="md">
                        <Title order={4} mb="sm">Base Weight Configuration</Title>
                        <NumberInput
                          label="Base Weight (KG)"
                          description="Weight limit for base charge application"
                          min={0.5}
                          max={50}
                          step={0.5}
                          value={deliverySettings.baseWeight}
                          onChange={(value) => updateDeliverySetting('baseWeight', value || 2)}
                        />
                      </Card>

                      <SimpleGrid cols={{ base: 1, md: 2 }}>
                        {/* Inside Dhaka */}
                        <Card withBorder p="md">
                          <Title order={4} mb="md">Inside Dhaka</Title>
                          <Stack gap="sm">
                            <NumberInput
                              label={`Base Charge (first ${deliverySettings.baseWeight} KG)`}
                              description="Charge for packages within base weight"
                              prefix="৳"
                              min={0}
                              value={deliverySettings.insideDhaka?.baseCharge ?? 60}
                              onChange={(value) => updateDeliverySetting('insideDhaka.baseCharge', value ?? 60)}
                            />
                            <NumberInput
                              label="Per KG Charge (after base weight)"
                              description="Charge for each additional KG"
                              prefix="৳"
                              min={0}
                              value={deliverySettings.insideDhaka?.perKgCharge ?? 15}
                              onChange={(value) => updateDeliverySetting('insideDhaka.perKgCharge', value ?? 15)}
                            />
                            <Divider />
                            <Text size="xs" c="dimmed">
                              Example: {deliverySettings.baseWeight} KG = ৳{deliverySettings.insideDhaka?.baseCharge ?? 60} |
                              {deliverySettings.baseWeight + 1} KG = ৳{calculateCharge(deliverySettings.baseWeight + 1, deliverySettings.insideDhaka?.baseCharge ?? 60, deliverySettings.insideDhaka?.perKgCharge ?? 15)}
                            </Text>
                          </Stack>
                        </Card>

                        {/* Outside Dhaka */}
                        <Card withBorder p="md">
                          <Title order={4} mb="md">Outside Dhaka</Title>
                          <Stack gap="sm">
                            <NumberInput
                              label={`Base Charge (first ${deliverySettings.baseWeight} KG)`}
                              description="Charge for packages within base weight"
                              prefix="৳"
                              min={0}
                              value={deliverySettings.outsideDhaka?.baseCharge ?? 120}
                              onChange={(value) => updateDeliverySetting('outsideDhaka.baseCharge', value ?? 120)}
                            />
                            <NumberInput
                              label="Per KG Charge (after base weight)"
                              description="Charge for each additional KG"
                              prefix="৳"
                              min={0}
                              value={deliverySettings.outsideDhaka?.perKgCharge ?? 20}
                              onChange={(value) => updateDeliverySetting('outsideDhaka.perKgCharge', value ?? 20)}
                            />
                            <Divider />
                            <Text size="xs" c="dimmed">
                              Example: {deliverySettings.baseWeight} KG = ৳{deliverySettings.outsideDhaka?.baseCharge ?? 120} |
                              {deliverySettings.baseWeight + 1} KG = ৳{calculateCharge(deliverySettings.baseWeight + 1, deliverySettings.outsideDhaka?.baseCharge ?? 120, deliverySettings.outsideDhaka?.perKgCharge ?? 20)}
                            </Text>
                          </Stack>
                        </Card>
                      </SimpleGrid>
                    </Stack>
                  </Tabs.Panel>

                  {/* Flat Rate */}
                  <Tabs.Panel value="flat" pt="md">
                    <Stack gap="md">
                      <Alert icon={<IconInfoCircle size={16} />} color="yellow" variant="light">
                        <Text size="sm">
                          When flat rate is enabled, it overrides Inside/Outside Dhaka rates and applies the same charge everywhere.
                        </Text>
                      </Alert>

                      <Card withBorder p="md">
                        <Stack gap="md">
                          <Switch
                            label="Enable Flat Rate"
                            description="Apply same delivery charge for all locations"
                            checked={deliverySettings.flatRate?.enabled ?? false}
                            onChange={(e) => updateDeliverySetting('flatRate.enabled', e.currentTarget.checked)}
                          />

                          {deliverySettings.flatRate?.enabled && (
                            <>
                              <Divider />
                              <NumberInput
                                label={`Base Charge (first ${deliverySettings.baseWeight} KG)`}
                                description="Charge for packages within base weight (applies everywhere)"
                                prefix="৳"
                                min={0}
                                value={deliverySettings.flatRate?.baseCharge ?? 100}
                                onChange={(value) => updateDeliverySetting('flatRate.baseCharge', value ?? 100)}
                              />
                              <NumberInput
                                label="Per KG Charge (after base weight)"
                                description="Charge for each additional KG"
                                prefix="৳"
                                min={0}
                                value={deliverySettings.flatRate?.perKgCharge ?? 25}
                                onChange={(value) => updateDeliverySetting('flatRate.perKgCharge', value ?? 25)}
                              />
                              <Divider />
                              <Text size="xs" c="dimmed">
                                Example: {deliverySettings.baseWeight} KG = ৳{deliverySettings.flatRate?.baseCharge ?? 100} |
                                {deliverySettings.baseWeight + 1} KG = ৳{calculateCharge(deliverySettings.baseWeight + 1, deliverySettings.flatRate?.baseCharge ?? 100, deliverySettings.flatRate?.perKgCharge ?? 25)}
                              </Text>
                            </>
                          )}
                        </Stack>
                      </Card>
                    </Stack>
                  </Tabs.Panel>

                  {/* Free Delivery */}
                  <Tabs.Panel value="free" pt="md">
                    <Stack gap="md">
                      <Alert icon={<IconInfoCircle size={16} />} color="green" variant="light">
                        <Text size="sm">
                          Offer free delivery when order amount reaches minimum threshold. This applies to all zones.
                        </Text>
                      </Alert>

                      <Card withBorder p="md">
                        <Stack gap="md">
                          <Switch
                            label="Enable Free Delivery"
                            description="Offer free delivery based on order amount"
                            checked={deliverySettings.freeDelivery?.enabled ?? false}
                            onChange={(e) => updateDeliverySetting('freeDelivery.enabled', e.currentTarget.checked)}
                          />

                          {deliverySettings.freeDelivery?.enabled && (
                            <>
                              <Divider />
                              <NumberInput
                                label="Minimum Order Amount"
                                description="Orders with this amount or higher get free delivery"
                                prefix="৳"
                                min={0}
                                step={100}
                                value={deliverySettings.freeDelivery?.minAmount ?? 0}
                                onChange={(value) => updateDeliverySetting('freeDelivery.minAmount', value ?? 0)}
                              />
                              <Text size="xs" c="dimmed">
                                Orders of ৳{deliverySettings.freeDelivery?.minAmount ?? 0} or more will have free delivery.
                              </Text>
                            </>
                          )}
                        </Stack>
                      </Card>
                    </Stack>
                  </Tabs.Panel>

                  {/* Test Calculator */}
                  <Tabs.Panel value="calculator" pt="md">
                    <Stack gap="md">
                      <Alert icon={<IconCalculator size={16} />} color="blue" variant="light">
                        <Text size="sm">
                          Test the delivery charge calculation with different weight and division values.
                        </Text>
                      </Alert>

                      <Card withBorder p="md">
                        <Stack gap="md">
                          <Group grow>
                            <NumberInput
                              label="Weight (KG)"
                              min={0.1}
                              step={0.5}
                              value={testWeight}
                              onChange={(value) => setTestWeight(value || 1)}
                            />
                            <TextInput
                              label="Division"
                              placeholder="e.g., dhaka, chittagong"
                              value={testDivision}
                              onChange={(e) => setTestDivision(e.currentTarget.value)}
                            />
                          </Group>

                          <Button onClick={handleCalculate} loading={calculating} leftSection={<IconCalculator size={16} />}>
                            Calculate Charge
                          </Button>

                          {testResult && (
                            <>
                              <Divider label="Result" labelPosition="left" />
                              <Stack gap="sm">
                                <Group justify="space-between">
                                  <Text fw={500}>Total Charge:</Text>
                                  <Text size="xl" fw={700} c="green">
                                    ৳{testResult.charge}
                                  </Text>
                                </Group>
                                <Code block>{JSON.stringify(testResult.breakdown, null, 2)}</Code>
                              </Stack>
                            </>
                          )}
                        </Stack>
                      </Card>
                    </Stack>
                  </Tabs.Panel>
                </Tabs>

                {/* Delivery Save Button */}
                {deliveryHasChanges && (
                  <Group justify="flex-end">
                    <Button
                      size="md"
                      onClick={handleSaveDeliverySettings}
                      loading={saving}
                      leftSection={<IconCheck size={16} />}
                    >
                      Save Delivery Settings
                    </Button>
                  </Group>
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Card>

        {/* Save Button */}
        <Group justify="flex-end">
          <Button
            size="md"
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges}
            leftSection={<IconCheck size={16} />}
          >
            Save Settings
          </Button>
        </Group>
      </Stack>
    </Box>
  )
}
