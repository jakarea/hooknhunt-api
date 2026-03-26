import { Group, Burger, Text, Avatar, Menu, UnstyledButton, rem, Box } from '@mantine/core'
import {
  IconChevronDown,
  IconSettings,
  IconSearch,
  IconBell,
  IconLogout,
  IconUser,
  IconRefresh,
  IconLanguage,
} from '@tabler/icons-react'
import { ThemeToggleMantine } from '@/components/theme-toggle-mantine'
import { useAuthStore } from '@/stores/authStore'
import { usePermissions } from '@/hooks/usePermissions'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface HeaderProps {
  mobileOpened: boolean
  toggleMobile: () => void
  toggleDesktop: () => void
}

export function SiteHeaderMantine({
  mobileOpened,
  toggleMobile,
  toggleDesktop,
}: HeaderProps) {
  const { user, logout } = useAuthStore()
  const { refreshPermissions } = usePermissions()
  const { t, i18n } = useTranslation()
  const currentLanguage = i18n.language

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'U'
    const names = user.name.split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }
    return names[0][0].toUpperCase()
  }

  const handleLogout = () => {
    logout()
  }

  const handleRefreshPermissions = async () => {
    await refreshPermissions()
  }

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }
  return (
    <Box
      h="3.5rem"
      bd="1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))"
      bg="light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))"
    >
      <Group h="100%" px="md" justify="space-between">
        <Group>
          {/* Mobile Burger Menu */}
          <Burger
            opened={mobileOpened}
            onClick={toggleMobile}
            hiddenFrom="md"
            size="sm"
          />

          {/* Desktop Burger Menu - Always show hamburger icon */}
          <Burger
            opened={false}
            onClick={toggleDesktop}
            visibleFrom="md"
            size="sm"
          />

          <Group gap="xs" display={{ base: 'none', sm: 'flex' }}>
            <Text fw={700} size="lg" c="red" style={{ lineHeight: 1 }}>
              H
            </Text>
            <Text fw={600} size="lg">
              {t('common.appName')}
            </Text>
          </Group>

          {/* Mobile logo */}
          <Text fw={700} size="lg" c="red" display={{ base: 'block', sm: 'none' }}>
            H
          </Text>
        </Group>

        <Group gap="xs">
          {/* Search */}
          <UnstyledButton
            display={{ base: 'none', xs: 'flex' }}
            p="0.5rem"
            styles={{
              root: {
                borderRadius: 'var(--mantine-radius-default)',
                '&:hover': {
                  backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))',
                },
              },
            }}
            component={Link}
            to="/search"
          >
            <IconSearch
              style={{ width: rem(20), height: rem(20) }}
              stroke={1.5}
            />
          </UnstyledButton>

          {/* Notifications */}
          <UnstyledButton
            p="0.5rem"
            styles={{
              root: {
                borderRadius: 'var(--mantine-radius-default)',
                '&:hover': {
                  backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))',
                },
              },
            }}
            component={Link}
            to="/notifications"
          >
            <IconBell
              style={{ width: rem(20), height: rem(20) }}
              stroke={1.5}
            />
          </UnstyledButton>

          {/* Theme Toggle */}
          <ThemeToggleMantine />

          {/* User Menu */}
          <Menu
            shadow="md"
            width={200}
            position="bottom-end"
            withArrow
          >
            <Menu.Target>
              <UnstyledButton
                display="flex"
                style={{ alignItems: 'center', gap: '0.5rem' }}
                p="0.25rem 0.5rem"
                styles={{
                  root: {
                    borderRadius: 'var(--mantine-radius-default)',
                    '&:hover': {
                      backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))',
                    },
                  },
                }}
              >
                <Avatar
                  src={null}
                  alt="User"
                  radius="xl"
                  color="red"
                  size="sm"
                >
                  {getUserInitials()}
                </Avatar>
                <Group gap={4} display={{ base: 'none', md: 'flex' }}>
                  <Text size="sm" fw={500}>
                    {user?.name || 'User'}
                  </Text>
                  <IconChevronDown
                    style={{ width: rem(14), height: rem(14) }}
                    stroke={1.5}
                  />
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>{t('common.account')}</Menu.Label>
              <Menu.Item
                leftSection={<IconUser style={{ width: rem(16), height: rem(16) }} />}
                component={Link}
                to="/profile"
              >
                {t('common.myProfile')}
              </Menu.Item>
              <Menu.Item
                leftSection={<IconRefresh style={{ width: rem(16), height: rem(16) }} />}
                onClick={handleRefreshPermissions}
              >
                {t('common.refreshPermissions')}
              </Menu.Item>

              <Menu.Divider />

              <Menu.Label>{t('common.system')}</Menu.Label>
              <Menu.Item
                leftSection={<IconSettings style={{ width: rem(16), height: rem(16) }} />}
                component={Link}
                to="/settings/general"
              >
                {t('common.settings')}
              </Menu.Item>

              <Menu.Divider />

              <Menu.Label>{t('common.language')}</Menu.Label>
              <Menu.Item
                leftSection={<IconLanguage style={{ width: rem(16), height: rem(16) }} />}
                onClick={() => changeLanguage('en')}
                rightSection={currentLanguage === 'en' ? '✓' : undefined}
              >
                {t('common.english')}
              </Menu.Item>
              <Menu.Item
                leftSection={<IconLanguage style={{ width: rem(16), height: rem(16) }} />}
                onClick={() => changeLanguage('bn')}
                rightSection={currentLanguage === 'bn' ? '✓' : undefined}
              >
                {t('common.bengali')}
              </Menu.Item>

              <Menu.Divider />

              <Menu.Item
                leftSection={<IconLogout style={{ width: rem(16), height: rem(16) }} />}
                color="red"
                onClick={handleLogout}
              >
                {t('common.logout')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Box>
  )
}
