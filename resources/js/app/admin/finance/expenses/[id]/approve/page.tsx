import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Stack, Group, Button, Text, Paper, Alert, Loader, Center, SimpleGrid, NumberFormatter } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCheck } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { approveExpense, getExpense } from '@/utils/api'
import { hasPermission } from '@/hooks/usePermissions'

export default function ApproveExpensePage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [expense, setExpense] = useState<any>(null)

  useEffect(() => {
    if (!hasPermission('finance.expenses.approve')) {
      navigate('/finance/expenses')
      return
    }

    if (id) {
      loadExpense()
    }
  }, [id])

  const loadExpense = async () => {
    try {
      const response: any = await getExpense(Number(id))
      const expenseData = response.data?.data || response.data

      if (expenseData.is_approved) {
        notifications.show({
          title: 'Already Approved',
          message: 'This expense has already been approved',
          color: 'blue',
        })
        navigate('/finance/expenses')
        return
      }

      setExpense(expenseData)
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load expense details',
        color: 'red',
      })
      navigate('/finance/expenses')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!expense) return

    setApproving(true)
    try {
      await approveExpense(expense.id)

      notifications.show({
        title: 'Success',
        message: 'Expense approved successfully',
        color: 'green',
        icon: <IconCheck size={20} />,
      })

      // Redirect back to expenses list after 1.5 seconds
      setTimeout(() => {
        navigate('/finance/expenses')
      }, 1500)
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || error.message || 'Failed to approve expense',
        color: 'red',
      })
    } finally {
      setApproving(false)
    }
  }

  const handleCancel = () => {
    navigate('/finance/expenses')
  }

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" />
      </Center>
    )
  }

  if (!expense) {
    return (
      <Container size="xl" p="xl">
        <Alert color="red">Expense not found</Alert>
      </Container>
    )
  }

  return (
    <Container size="xl" p="xl">
      <Stack gap="md">
        {/* Header */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Stack gap={0}>
              <Text size="xl" fw={700}>Approve Expense</Text>
              <Text size="sm" c="dimmed">Review and approve this expense</Text>
            </Stack>
            <Group>
              <Button variant="light" onClick={handleCancel} disabled={approving}>
                Cancel
              </Button>
              <Button
                color="green"
                onClick={handleApprove}
                loading={approving}
                leftSection={<IconCheck size={18} />}
              >
                Approve Expense
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Expense Details */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Text fw={600} size="lg">Expense Information</Text>

            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Stack gap="xs">
                <Text size="xs" c="dimmed">Title</Text>
                <Text fw={500}>{expense.title}</Text>
              </Stack>

              <Stack gap="xs">
                <Text size="xs" c="dimmed">Amount</Text>
                <Text fw={700} size="lg" c="green">
                  <NumberFormatter value={expense.amount} decimalScale={2} thousandSeparator /> BDT
                </Text>
              </Stack>

              <Stack gap="xs">
                <Text size="xs" c="dimmed">Expense Date</Text>
                <Text>{new Date(expense.expense_date).toLocaleDateString()}</Text>
              </Stack>

              <Stack gap="xs">
                <Text size="xs" c="dimmed">Reference Number</Text>
                <Text>{expense.reference_number || '-'}</Text>
              </Stack>
            </SimpleGrid>

            {expense.notes && (
              <>
                <Text size="xs" c="dimmed">Notes</Text>
                <Text size="sm">{expense.notes}</Text>
              </>
            )}

            {expense.account && (
              <Stack gap="xs">
                <Text size="xs" c="dimmed">Account</Text>
                <Text>{expense.account.name} ({expense.account.code})</Text>
              </Stack>
            )}
          </Stack>
        </Paper>

        {/* Warning Message */}
        <Alert color="orange" variant="light">
          <Stack gap="xs">
            <Text fw={600}>Important Notice</Text>
            <Text size="sm">
              By approving this expense:
              {expense.payment_account_id && (
                <> - Bank account will be debited by ৳{Number(expense.amount).toFixed(2)} BDT</>
              )}
              {!expense.payment_account_id && (
                <>- Supplier wallet will be debited by ৳{Number(expense.amount).toFixed(2)} BDT</>
              )}
              <br />
              - This action cannot be undone
              <br />
              - Transaction will be recorded in financial history
            </Text>
          </Stack>
        </Alert>
      </Stack>
    </Container>
  )
}
