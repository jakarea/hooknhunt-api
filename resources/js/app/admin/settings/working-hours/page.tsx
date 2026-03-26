import { useState, useEffect } from 'react'
import {
  Box,
  Stack,
  Group,
  Text,
  Button,
  Card,
  TextInput,
  NumberInput,
  LoadingOverlay,
  Paper,
  ActionIcon,
} from '@mantine/core'
import { TimeInput } from '@mantine/dates'
import { IconClock, IconRefresh } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'

interface WorkingHoursSettings {
  workStartTime: string
  workEndTime: string
  breakDuration: number
  gracePeriod: number
}

const defaultSettings: WorkingHoursSettings = {
  workStartTime: '09:00',
  workEndTime: '18:00',
  breakDuration: 60,
  gracePeriod: 15,
}

export default function WorkingHoursSettingsPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<WorkingHoursSettings>(defaultSettings)

  // Fetch settings from API
  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/system/settings')

      // The API returns grouped settings: { general: [...], hrm: [...], ... }
      const groupedSettings = response.data

      // Extract HRM settings
      const hrmSettings = groupedSettings.hrm || []

      // Parse settings into our form state
      const parsedSettings: WorkingHoursSettings = { ...defaultSettings }

      hrmSettings.forEach((item: any) => {
        const key = item.key
        const value = item.value

        switch (key) {
          case 'work_start_time':
            parsedSettings.workStartTime = value || defaultSettings.workStartTime
            break
          case 'work_end_time':
            parsedSettings.workEndTime = value || defaultSettings.workEndTime
            break
          case 'break_duration_minutes':
            parsedSettings.breakDuration = parseInt(value) || defaultSettings.breakDuration
            break
          case 'grace_period_minutes':
            parsedSettings.gracePeriod = parseInt(value) || defaultSettings.gracePeriod
            break
        }
      })

      setSettings(parsedSettings)
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Failed to fetch settings:', error)
      notifications.show({
        title: t('common.error'),
        message: t('settings.workingHoursConfig.error.loadFailed'),
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  // Save settings to API
  const handleSave = async () => {
    try {
      setSaving(true)

      // Prepare settings array for bulk update
      const settingsToUpdate = [
        {
          key: 'work_start_time',
          value: settings.workStartTime,
          group: 'hrm',
        },
        {
          key: 'work_end_time',
          value: settings.workEndTime,
          group: 'hrm',
        },
        {
          key: 'break_duration_minutes',
          value: String(settings.breakDuration),
          group: 'hrm',
        },
        {
          key: 'grace_period_minutes',
          value: String(settings.gracePeriod),
          group: 'hrm',
        },
      ]

      await api.post('/system/settings/update', { settings: settingsToUpdate })

      notifications.show({
        title: t('common.success'),
        message: t('settings.workingHoursConfig.success.saved'),
        color: 'green',
      })
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Failed to save settings:', error)
      const errorObj = error as { response?: { data?: { message?: string } } }
      notifications.show({
        title: t('common.error'),
        message: errorObj.response?.data?.message || t('settings.workingHoursConfig.error.saveFailed'),
        color: 'red',
      })
    } finally {
      setSaving(false)
    }
  }

  // Reset to defaults
  const handleReset = () => {
    setSettings(defaultSettings)
    notifications.show({
      title: t('common.info'),
      message: t('settings.workingHoursConfig.info.resetToDefaults'),
      color: 'blue',
    })
  }

  // Load settings on mount
  useEffect(() => {
    fetchSettings()
  }, [])

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Box>
            <Text className="text-lg md:text-xl lg:text-2xl" fw={700}>
              {t('settings.workingHoursConfig.title')}
            </Text>
            <Text className="text-sm md:text-base" c="dimmed">
              {t('settings.workingHoursConfig.subtitle')}
            </Text>
          </Box>
          <ActionIcon
            variant="light"
            onClick={fetchSettings}
            loading={loading}
          >
            <IconRefresh size={18} />
          </ActionIcon>
        </Group>

        {/* Settings Card */}
        <Card withBorder p="md" radius="md" shadow="sm" pos="relative">
          <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

          <Stack gap="lg">
            {/* Work Start Time */}
            <Stack gap="xs">
              <Text className="text-sm md:text-base" fw={500}>
                {t('settings.workingHoursConfig.workStartTime')}
              </Text>
              <TimeInput
                label={t('settings.workingHoursConfig.workStartTimeLabel')}
                value={settings.workStartTime}
                onChange={(value) => setSettings({ ...settings, workStartTime: value || '' })}
                format="24"
                className="text-base md:text-lg"
              />
              <Text className="text-xs md:text-sm" c="dimmed">
                {t('settings.workingHoursConfig.workStartTimeHint')}
              </Text>
            </Stack>

            {/* Work End Time */}
            <Stack gap="xs">
              <Text className="text-sm md:text-base" fw={500}>
                {t('settings.workingHoursConfig.workEndTime')}
              </Text>
              <TimeInput
                label={t('settings.workingHoursConfig.workEndTimeLabel')}
                value={settings.workEndTime}
                onChange={(value) => setSettings({ ...settings, workEndTime: value || '' })}
                format="24"
                className="text-base md:text-lg"
              />
              <Text className="text-xs md:text-sm" c="dimmed">
                {t('settings.workingHoursConfig.workEndTimeHint')}
              </Text>
            </Stack>

            {/* Break Duration */}
            <Stack gap="xs">
              <Text className="text-sm md:text-base" fw={500}>
                {t('settings.workingHoursConfig.breakDuration')}
              </Text>
              <NumberInput
                label={t('settings.workingHoursConfig.breakDurationLabel')}
                value={settings.breakDuration}
                onChange={(value) => setSettings({ ...settings, breakDuration: value || 0 })}
                min={0}
                max={240}
                step={15}
                suffix={` ${t('settings.workingHoursConfig.minutes')}`}
                className="text-base md:text-lg"
              />
              <Text className="text-xs md:text-sm" c="dimmed">
                {t('settings.workingHoursConfig.breakDurationHint')}
              </Text>
            </Stack>

            {/* Grace Period */}
            <Stack gap="xs">
              <Text className="text-sm md:text-base" fw={500}>
                {t('settings.workingHoursConfig.gracePeriod')}
              </Text>
              <NumberInput
                label={t('settings.workingHoursConfig.gracePeriodLabel')}
                value={settings.gracePeriod}
                onChange={(value) => setSettings({ ...settings, gracePeriod: value || 0 })}
                min={0}
                max={60}
                step={5}
                suffix={` ${t('settings.workingHoursConfig.minutes')}`}
                className="text-base md:text-lg"
              />
              <Text className="text-xs md:text-sm" c="dimmed">
                {t('settings.workingHoursConfig.gracePeriodHint')}
              </Text>
            </Stack>

            {/* Summary */}
            <Paper withBorder p="md" radius="md" bg="gray.0">
              <Stack gap="xs">
                <Group gap="xs">
                  <IconClock size={16} />
                  <Text className="text-sm md:text-base" fw={500}>
                    {t('settings.workingHoursConfig.summaryTitle')}
                  </Text>
                </Group>
                <Text className="text-xs md:text-sm" c="dimmed">
                  {t('settings.workingHoursConfig.summary', {
                    start: settings.workStartTime,
                    end: settings.workEndTime,
                    breakHours: Math.floor(settings.breakDuration / 60),
                    breakMinutes: settings.breakDuration % 60,
                    grace: settings.gracePeriod,
                  })}
                </Text>
              </Stack>
            </Paper>

            {/* Actions */}
            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={handleReset}
                disabled={saving}
              >
                {t('settings.workingHoursConfig.resetToDefaults')}
              </Button>
              <Button
                onClick={handleSave}
                loading={saving}
              >
                {t('common.save')}
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Box>
  )
}
