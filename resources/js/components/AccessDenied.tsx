import React from 'react'
import { Alert, Center, Stack, Text } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

interface AccessDeniedProps {
  message: string
}

export function AccessDenied({ message }: AccessDeniedProps) {
  const { t } = useTranslation()
  return (
    <Center mih="100vh">
      <Stack align="center" gap="md" maw={500}>
        <Alert variant="light" color="red" title={t('common.accessDenied')} icon={<IconAlertCircle />}>
          <Text size="sm">{message}</Text>
        </Alert>
      </Stack>
    </Center>
  )
}
