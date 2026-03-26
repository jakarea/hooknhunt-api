'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Select,
  TextInput,
  Table,
  Badge,
  ActionIcon,
  Modal,
  NumberInput,
  LoadingOverlay,
  Card,
  SimpleGrid,
  Alert,
  Paper,
} from '@mantine/core';
import { IconEdit, IconCheck, IconRefresh, IconCurrencyTaka } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import api from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';

interface Payroll {
  id: number;
  user_id: number;
  user: {
    id: number;
    name: string;
    profile?: {
      designation?: string;
      department?: {
        id: number;
        name: string;
      };
    };
  };
  month_year: string;
  basic_salary: number;
  bonus: number;
  deductions: number;
  net_payable: number;
  status: 'generated' | 'paid';
  payment_date?: string;
  created_at: string;
}

export default function PayrollPage() {
  const { hasPermission } = usePermissions();

  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [monthYear, setMonthYear] = useState<string>(
    new Date().toISOString().slice(0, 7) // Current month in YYYY-MM format
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [payModalOpened, setPayModalOpened] = useState(false);
  const [generateModalOpened, setGenerateModalOpened] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [editBonus, setEditBonus] = useState<number>(0);
  const [editDeductions, setEditDeductions] = useState<number>(0);

  // Calculate stats
  const stats = {
    totalRecords: payroll.length,
    totalNetPayable: payroll.reduce((sum, p) => {
      const netPayable = typeof p.net_payable === 'string' ? parseFloat(p.net_payable) : p.net_payable;
      return sum + netPayable;
    }, 0),
    paidCount: payroll.filter((p) => p.status === 'paid').length,
    pendingCount: payroll.filter((p) => p.status === 'generated').length,
  };

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (monthYear) params.month_year = monthYear;
      if (statusFilter !== 'all') params.status = statusFilter;

      console.log('Fetching payroll with params:', params);

      const response = await api.get(`/hrm/payrolls`, { params });

      console.log('Payroll API response:', response.data);

      // Handle Laravel pagination response
      // Structure: response.data.data.data contains the actual array
      const data = Array.isArray(response.data?.data?.data)
        ? response.data.data.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];

      console.log('Extracted payroll data:', data);

      setPayroll(data);

      if (data.length === 0) {
        notifications.show({
          title: 'No Data',
          message: `No payroll records found for ${monthYear}`,
          color: 'blue',
        });
      }
    } catch (error: unknown) {
      console.error('Payroll fetch error:', error);
      const errorObj = error as { response?: { data?: { message?: string } }; message?: string };
      notifications.show({
        title: 'Error',
        message: errorObj.response?.data?.message || errorObj.message || 'Failed to load payroll data',
        color: 'red',
      });
      setPayroll([]); // Ensure payroll is always an array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [monthYear, statusFilter]);

  const handleGeneratePayroll = async () => {
    if (!hasPermission('hrm.payroll.process')) return;

    try {
      await api.post(`/hrm/payrolls/generate`, { month_year: monthYear });

      notifications.show({
        title: 'Success',
        message: `Payroll generated for ${monthYear}`,
        color: 'green',
      });

      setGenerateModalOpened(false);
      fetchPayroll();
    } catch (error: unknown) {
      const errorObj = error as { response?: { data?: { message?: string } } };
      notifications.show({
        title: 'Error',
        message: errorObj.response?.data?.message || 'Failed to generate payroll',
        color: 'red',
      });
    }
  };

  const openEditModal = (record: Payroll) => {
    if (!hasPermission('hrm.payroll.edit')) return;

    console.log('Opening edit modal for record:', record);

    setSelectedPayroll(record);

    // Convert string values to numbers for NumberInput
    const bonus = typeof record.bonus === 'string' ? parseFloat(record.bonus) : record.bonus;
    const deductions = typeof record.deductions === 'string' ? parseFloat(record.deductions) : record.deductions;

    console.log('Bonus:', bonus, 'Deductions:', deductions);

    setEditBonus(bonus);
    setEditDeductions(deductions);
    setEditModalOpened(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPayroll || !hasPermission('hrm.payroll.edit')) return;

    try {
      await api.put(`/hrm/payrolls/${selectedPayroll.id}`, {
        bonus: editBonus,
        deductions: editDeductions,
      });

      notifications.show({
        title: 'Success',
        message: 'Payroll updated successfully',
        color: 'green',
      });

      setEditModalOpened(false);
      fetchPayroll();
    } catch (error: unknown) {
      const errorObj = error as { response?: { data?: { message?: string } } };
      notifications.show({
        title: 'Error',
        message: errorObj.response?.data?.message || 'Failed to update payroll',
        color: 'red',
      });
    }
  };

  const openPayModal = (record: Payroll) => {
    if (!hasPermission('hrm.payroll.pay')) return;
    setSelectedPayroll(record);
    setPayModalOpened(true);
  };

  const handlePay = async () => {
    if (!selectedPayroll || !hasPermission('hrm.payroll.pay')) return;

    try {
      await api.post(`/hrm/payrolls/${selectedPayroll.id}/pay`, {});

      notifications.show({
        title: 'Success',
        message: `Payment processed for ${selectedPayroll.user?.name || 'Employee'}`,
        color: 'green',
      });

      setPayModalOpened(false);
      fetchPayroll();
    } catch (error: unknown) {
      const errorObj = error as { response?: { data?: { message?: string } } };
      notifications.show({
        title: 'Error',
        message: errorObj.response?.data?.message || 'Failed to process payment',
        color: 'red',
      });
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `৳${num.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Real-time calculation of net payable in edit modal
  const calculatedNetPayable = useMemo(() => {
    if (!selectedPayroll) return 0;

    // Convert basic_salary from string to number if needed
    const basicSalary = typeof selectedPayroll.basic_salary === 'string'
      ? parseFloat(selectedPayroll.basic_salary)
      : selectedPayroll.basic_salary;

    return basicSalary + editBonus - editDeductions;
  }, [selectedPayroll, editBonus, editDeductions]);

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack >
        {/* Header */}
        <Box>
          <Group justify="space-between">
            <Box>
              <Title order={1} className="text-lg md:text-xl lg:text-2xl">Payroll Management</Title>
              <Text c="dimmed" className="text-sm md:text-base">Manage employee salaries and payments</Text>
            </Box>
            <Group >
              <ActionIcon
                variant="light"
                size="lg"
                onClick={fetchPayroll}
                loading={loading}
              >
                <IconRefresh size={18} />
              </ActionIcon>
              {hasPermission('hrm.payroll.process') && (
                <Button
                  leftSection={<IconCurrencyTaka size={16} />}
                  onClick={() => setGenerateModalOpened(true)}
                  color="green"
                >
                  Generate Payroll
                </Button>
              )}
            </Group>
          </Group>
        </Box>

        {/* Stats Dashboard */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <Text size="xs" c="dimmed">Total Records</Text>
            </Group>
            <Text size="xl" fw={700}>{stats.totalRecords}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <Text size="xs" c="dimmed">Total Net Payable</Text>
            </Group>
            <Text size="xl" fw={700}>{formatCurrency(stats.totalNetPayable)}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <Text size="xs" c="dimmed">Paid</Text>
            </Group>
            <Text size="xl" fw={700} c="green">{stats.paidCount}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <Text size="xs" c="dimmed">Pending</Text>
            </Group>
            <Text size="xl" fw={700} c="orange">{stats.pendingCount}</Text>
          </Card>
        </SimpleGrid>

        {/* Filters */}
        <Card withBorder p="md" radius="md">
          <Group wrap="nowrap">
            <TextInput
              type="month"
              label="Month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              style={{ flex: 1 }}
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || 'all')}
              data={[
                { value: 'all', label: 'All Statuses' },
                { value: 'generated', label: 'Generated' },
                { value: 'paid', label: 'Paid' },
              ]}
              style={{ flex: 1 }}
            />
          </Group>
        </Card>

        {/* Payroll Table */}
        <Card withBorder p="0" radius="md" shadow="sm" pos="relative">
          <LoadingOverlay visible={loading} />
          <Table.ScrollContainer minWidth={1000}>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Employee</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th>Designation</Table.Th>
                  <Table.Th>Basic Salary</Table.Th>
                  <Table.Th>Bonus</Table.Th>
                  <Table.Th>Deductions</Table.Th>
                  <Table.Th>Net Payable</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Payment Date</Table.Th>
                  {(hasPermission('hrm.payroll.edit') || hasPermission('hrm.payroll.pay') || hasPermission('hrm.payroll.approve')) && <Table.Th>Actions</Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loading ? (
                  <Table.Tr>
                    <Table.Td colSpan={10}>
                      <Text ta="center" c="dimmed">
                        Loading...
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : payroll.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={10}>
                      <Text ta="center" c="dimmed">
                        No payroll records found
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  payroll.map((record) => (
                    <Table.Tr key={record.id}>
                      <Table.Td fw={500}>{record.user?.name || 'Unknown'}</Table.Td>
                      <Table.Td>{record.user?.profile?.department?.name || '-'}</Table.Td>
                      <Table.Td>{record.user?.profile?.designation || '-'}</Table.Td>
                      <Table.Td>{formatCurrency(record.basic_salary)}</Table.Td>
                      <Table.Td>{formatCurrency(record.bonus)}</Table.Td>
                      <Table.Td c="red">{formatCurrency(record.deductions)}</Table.Td>
                      <Table.Td fw={700}>{formatCurrency(record.net_payable)}</Table.Td>
                      <Table.Td>
                        <Badge
                          color={record.status === 'paid' ? 'green' : 'orange'}
                          variant="light"
                        >
                          {record.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {record.payment_date
                          ? new Date(record.payment_date).toLocaleDateString()
                          : '-'}
                      </Table.Td>
                      {(hasPermission('hrm.payroll.edit') || hasPermission('hrm.payroll.pay') || hasPermission('hrm.payroll.approve')) && (
                        <Table.Td>
                          <Group gap={4}>
                            {record.status === 'generated' && (
                              <>
                                {hasPermission('hrm.payroll.edit') && (
                                  <ActionIcon
                                    size="sm"
                                    color="blue"
                                    onClick={() => openEditModal(record)}
                                    variant="subtle"
                                  >
                                    <IconEdit size={16} />
                                  </ActionIcon>
                                )}
                                {(hasPermission('hrm.payroll.pay') || hasPermission('hrm.payroll.approve')) && (
                                  <ActionIcon
                                    size="sm"
                                    color="green"
                                    onClick={() => openPayModal(record)}
                                    variant="subtle"
                                  >
                                    <IconCheck size={16} />
                                  </ActionIcon>
                                )}
                              </>
                            )}
                          </Group>
                        </Table.Td>
                      )}
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>

        {/* Generate Payroll Confirmation Modal */}
        <Modal
          opened={generateModalOpened}
          onClose={() => setGenerateModalOpened(false)}
          title="Generate Payroll"
          centered
        >
          <Stack >
            <Alert color="blue">
              <Text size="sm">
                This will generate payroll records for all active employees for{' '}
                <strong>{monthYear}</strong>. Make sure this hasn't been generated already.
              </Text>
            </Alert>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setGenerateModalOpened(false)}>
                Cancel
              </Button>
              <Button color="green" onClick={handleGeneratePayroll}>
                Generate
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Edit Payroll Modal */}
        <Modal
          opened={editModalOpened}
          onClose={() => setEditModalOpened(false)}
          title="Adjust Payroll"
          centered
        >
          <Stack >
            {selectedPayroll && (
              <>
                <Text size="sm">
                  <strong>Employee:</strong> {selectedPayroll.user?.name || 'Unknown'}
                </Text>
                <Text size="sm">
                  <strong>Basic Salary:</strong> {formatCurrency(selectedPayroll.basic_salary)}
                </Text>

                <NumberInput
                  label="Bonus"
                  value={editBonus}
                  onChange={(v) => setEditBonus(v === '' ? 0 : Number(v))}
                  min={0}
                  prefix="৳"
                  decimalScale={2}
                  fixedDecimalScale
                />

                <NumberInput
                  label="Deductions"
                  value={editDeductions}
                  onChange={(v) => setEditDeductions(v === '' ? 0 : Number(v))}
                  min={0}
                  prefix="৳"
                  decimalScale={2}
                  fixedDecimalScale
                />

                <Paper withBorder p="sm" bg="gray.0">
                  <Group justify="space-between">
                    <Text fw={500}>Net Payable:</Text>
                    <Text fw={700} size="lg">
                      {formatCurrency(calculatedNetPayable)}
                    </Text>
                  </Group>
                </Paper>

                <Group justify="flex-end">
                  <Button variant="default" onClick={() => setEditModalOpened(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit}>Save Changes</Button>
                </Group>
              </>
            )}
          </Stack>
        </Modal>

        {/* Pay Confirmation Modal */}
        <Modal
          opened={payModalOpened}
          onClose={() => setPayModalOpened(false)}
          title="Process Payment"
          centered
        >
          <Stack >
            {selectedPayroll && (
              <>
                <Alert color="green">
                  <Text size="sm">
                    Process payment for <strong>{selectedPayroll.user?.name || 'Employee'}</strong>?
                  </Text>
                </Alert>

                <Paper withBorder p="md">
                  <Stack >
                    <Group justify="space-between">
                      <Text size="sm">Employee:</Text>
                      <Text fw={500}>{selectedPayroll.user?.name || 'Unknown'}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Net Payable:</Text>
                      <Text fw={700}>{formatCurrency(selectedPayroll.net_payable)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Month:</Text>
                      <Text>{selectedPayroll.month_year}</Text>
                    </Group>
                  </Stack>
                </Paper>

                <Group justify="flex-end">
                  <Button variant="default" onClick={() => setPayModalOpened(false)}>
                    Cancel
                  </Button>
                  <Button color="green" onClick={handlePay}>
                    Confirm Payment
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        </Modal>
      </Stack>
    </Box>
  );
}
