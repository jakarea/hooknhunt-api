import { ActionIcon, useMantineColorScheme } from '@mantine/core'
import { IconSun, IconMoon } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

export function ThemeToggleMantine() {
  const { setColorScheme } = useMantineColorScheme()
  const { t } = useTranslation()

  // Get current color scheme from localStorage or use system preference
  const getCurrentScheme = (): 'light' | 'dark' => {
    const stored = localStorage.getItem('mantine-color-scheme-value')
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  const toggleTheme = () => {
    const currentScheme = getCurrentScheme()
    const newScheme = currentScheme === 'light' ? 'dark' : 'light'
    setColorScheme(newScheme)
  }

  const currentScheme = getCurrentScheme()

  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="lg"
      radius="md"
      aria-label={t('common.toggleColorScheme')}
      onClick={toggleTheme}
    >
      {currentScheme === 'light' ? (
        <IconMoon stroke={1.5} />
      ) : (
        <IconSun stroke={1.5} />
      )}
    </ActionIcon>
  )
}

