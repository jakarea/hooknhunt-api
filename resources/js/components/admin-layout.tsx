import { Outlet } from 'react-router-dom'
import { Box } from '@mantine/core'
import { AppSidebarMantine } from './app-sidebar-mantine'
import { SiteHeaderMantine } from './site-header-mantine'
import { useDisclosure } from '@mantine/hooks'
import { useUIStore } from '@/stores/uiStore'

export function AdminLayout() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false)
  // Use Zustand store for desktop sidebar state (so it can be controlled from any page)
  // Note: sidebarCollapsed is inverted - when collapsed=false, desktopOpened=true (sidebar is open)
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const desktopOpened = !sidebarCollapsed

  return (
    <Box style={{ display: 'flex', height: '100vh', backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))' }}>
      {/* Mantine Sidebar */}
      <AppSidebarMantine
        mobileOpened={mobileOpened}
        desktopOpened={desktopOpened}
        toggleMobile={toggleMobile}
        toggleDesktop={toggleSidebar}
      />

      {/* Main Content */}
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <SiteHeaderMantine
          mobileOpened={mobileOpened}
          toggleMobile={toggleMobile}
          toggleDesktop={toggleSidebar}
        />

        {/* Page Content */}
        <Box style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
