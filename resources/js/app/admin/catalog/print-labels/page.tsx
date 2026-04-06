import { usePermissions } from '@/hooks/usePermissions'

export default function PrintLabelsPage() {
  const { hasPermission } = usePermissions()

  if (!hasPermission('catalog.products.index')) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}><h3>Access Denied</h3><p>You don't have permission to view this page.</p></div>
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Print Labels</h1>
      <p className="text-muted-foreground">Barcode</p>
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Content will be displayed here</p>
      </div>
    </div>
  )
}
