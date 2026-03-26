import type { ReactNode } from 'react'
import { Stack, Paper, Title, Text, Group, Button } from '@mantine/core'

interface FormWrapperProps {
  title?: string
  description?: string
  onSubmit: (e: React.FormEvent) => void | Promise<void>
  children: ReactNode
  submitLabel?: string
  cancelLabel?: string
  onCancel?: () => void
  loading?: boolean
  disabled?: boolean
  actions?: ReactNode
}

export function FormWrapper({
  title,
  description,
  onSubmit,
  children,
  submitLabel = 'Submit',
  cancelLabel,
  onCancel,
  loading = false,
  disabled = false,
  actions,
}: FormWrapperProps) {
  return (
    <Paper
      component="form"
      onSubmit={onSubmit}
      p={{ base: 'sm', md: 'md' }}
      withBorder
    >
      <Stack gap="lg">
        {(title || description) && (
          <>
            {title && <Title order={3}>{title}</Title>}
            {description && (
              <Text size="sm" c="dimmed">
                {description}
              </Text>
            )}
          </>
        )}

        <Stack gap="md">{children}</Stack>

        {/* Action buttons */}
        {actions ? (
          actions
        ) : (
          <Group mt="md" gap="sm">
            {onCancel && (
              <Button
                type="button"
                variant="default"
                onClick={onCancel}
                disabled={loading || disabled}
                fullWidth
              >
                {cancelLabel}
              </Button>
            )}
            <Button
              type="submit"
              loading={loading}
              disabled={disabled}
              fullWidth
            >
              {submitLabel}
            </Button>
          </Group>
        )}
      </Stack>
    </Paper>
  )
}

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
  description?: string
}

export function FormField({
  label,
  required,
  error,
  children,
  description,
}: FormFieldProps) {
  return (
    <Stack gap={4}>
      <Group gap={4} align="flex-start">
        <Text size="sm" fw={500}>
          {label}
          {required && <Text span c="red">*</Text>}
        </Text>
      </Group>

      {children}

      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}

      {description && !error && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
    </Stack>
  )
}
