import React from 'react'
import { Loader, Center, Text, Stack } from '@mantine/core'
import { useTranslation } from 'react-i18next'

export function LoadingState() {
  const { t } = useTranslation()
  return (
    <Center mih="100vh">
      <Stack align="center" gap="md">
        <Loader size="lg" color="red" />
        <Text size="sm" c="dimmed">{t('common.loading')}</Text>
      </Stack>
    </Center>
  )
}
