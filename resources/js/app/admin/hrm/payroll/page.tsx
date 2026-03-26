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
  Divider,
  Grid,
} from '@mantine/core';
import { IconEdit, IconCheck, IconRefresh, IconCurrencyTaka, IconEye, IconPrinter, IconFileDescription, IconSend, IconDownload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import api from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';

interface Payroll {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    staffProfile?: {
      designation?: string;
      department?: {
        id: number;
        name: string;
      };
      bankAccountName?: string;
      bankAccountNumber?: string;
      bankName?: string;
      bankBranch?: string;
    };
  };
  monthYear: string;
  basicSalary: number | string;
  houseRent: number | string;
  medicalAllowance: number | string;
  conveyanceAllowance: number | string;
  overtimeHourlyRate: number | string;
  totalOvertimeHours: number | string;
  overtimeAmount: number | string;
  bonus: number | string;
  deductions: number | string;
  netPayable: number | string;
  grossSalary?: number;
  status: 'generated' | 'processing' | 'paid';
  paymentDate?: string | null;
  createdAt: string;
}

interface Bank {
  id: number;
  name: string;
  accountNumber?: string;
  balance?: number;
  accountType?: string;
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
  const [viewModalOpened, setViewModalOpened] = useState(false);
  const [payAllModalOpened, setPayAllModalOpened] = useState(false);
  const [salarySheetModalOpened, setSalarySheetModalOpened] = useState(false);
  const [salarySheetPreviewModalOpened, setSalarySheetPreviewModalOpened] = useState(false);
  const [bankLetterData, setBankLetterData] = useState<any>(null);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [editHouseRent, setEditHouseRent] = useState<number>(0);
  const [editMedicalAllowance, setEditMedicalAllowance] = useState<number>(0);
  const [editConveyanceAllowance, setEditConveyanceAllowance] = useState<number>(0);
  const [editTotalOvertimeHours, setEditTotalOvertimeHours] = useState<number>(0);
  const [editBonus, setEditBonus] = useState<number>(0);
  const [editDeductions, setEditDeductions] = useState<number>(0);

  // Bank account selection for payment
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [banksLoading, setBanksLoading] = useState(false);

  // Salary sheet form
  const [companyName, setCompanyName] = useState('Hook & Hunt');
  const [proprietorName, setProprietorName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate stats
  const stats = {
    totalRecords: payroll.length,
    totalNetPayable: payroll.reduce((sum, p) => {
      const netPayable = typeof p.netPayable === 'string' ? parseFloat(p.netPayable) : p.netPayable;
      return sum + (netPayable || 0);
    }, 0),
    paidCount: payroll.filter((p) => p.status === 'paid').length,
    pendingCount: payroll.filter((p) => p.status === 'generated').length,
    processingCount: payroll.filter((p) => p.status === 'processing').length,
  };

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (monthYear) params.month_year = monthYear;
      if (statusFilter !== 'all') params.status = statusFilter;


      const response = await api.get(`/hrm/payrolls`, { params });


      // Handle Laravel pagination response
      // Structure: response.data.data.data contains the actual array
      const data = Array.isArray(response.data?.data?.data)
        ? response.data.data.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];


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

  // Fetch banks for payment selection
  const fetchBanks = async () => {
    setBanksLoading(true);
    try {
      const response = await api.get(`/finance/banks`);
      const banksData = response.data?.data || response.data || [];
      setBanks(Array.isArray(banksData) ? banksData : []);

      // Set default bank to first available bank if none selected
      if (!selectedBankId && Array.isArray(banksData) && banksData.length > 0) {
        setSelectedBankId(banksData[0].id);
      }
    } catch (error: unknown) {
      console.error('Failed to fetch banks:', error);
      notifications.show({
        title: 'Warning',
        message: 'Could not load bank accounts',
        color: 'yellow',
      });
    } finally {
      setBanksLoading(false);
    }
  };

  // Fetch banks on component mount
  useEffect(() => {
    fetchBanks();
  }, []);

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


    setSelectedPayroll(record);

    // Convert string values to numbers for NumberInput
    const toNum = (val: number | string) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(Number(num)) ? 0 : Number(num);
    };

    setEditHouseRent(toNum(record.houseRent));
    setEditMedicalAllowance(toNum(record.medicalAllowance));
    setEditConveyanceAllowance(toNum(record.conveyanceAllowance));
    setEditTotalOvertimeHours(toNum(record.totalOvertimeHours));
    setEditBonus(toNum(record.bonus));
    setEditDeductions(toNum(record.deductions));
    setEditModalOpened(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPayroll || !hasPermission('hrm.payroll.edit')) return;

    try {
      await api.put(`/hrm/payrolls/${selectedPayroll.id}`, {
        house_rent: editHouseRent,
        medical_allowance: editMedicalAllowance,
        conveyance_allowance: editConveyanceAllowance,
        total_overtime_hours: editTotalOvertimeHours,
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

  const openViewModal = (record: Payroll) => {
    setSelectedPayroll(record);
    setViewModalOpened(true);
  };

  const handlePay = async () => {
    if (!selectedPayroll || !hasPermission('hrm.payroll.pay')) return;

    if (!selectedBankId) {
      notifications.show({
        title: 'Required',
        message: 'Please select a bank account for payment',
        color: 'orange',
      });
      return;
    }

    try {
      const response = await api.post(`/hrm/payrolls/${selectedPayroll.id}/pay`, {
        bank_id: selectedBankId,
      });

      // Show success message with new balance if available
      const newBalance = response.data?.data?.new_balance;
      const balanceMsg = newBalance !== undefined
        ? `New balance: ${formatCurrency(newBalance)}`
        : '';

      notifications.show({
        title: 'Success',
        message: `Payment processed for ${selectedPayroll.user?.name || 'Employee'}${balanceMsg ? '. ' + balanceMsg : ''}`,
        color: 'green',
      });

      setPayModalOpened(false);
      setSelectedBankId(null); // Reset for next payment
      fetchPayroll();
      fetchBanks(); // Refresh bank balances
    } catch (error: unknown) {
      const errorObj = error as { response?: { data?: { message?: string } } };
      notifications.show({
        title: 'Error',
        message: errorObj.response?.data?.message || 'Failed to process payment',
        color: 'red',
      });
    }
  };

  const openPayAllModal = () => {
    const pendingCount = payroll.filter((p) => p.status === 'generated').length;
    if (pendingCount === 0) {
      notifications.show({
        title: 'No Pending Payments',
        message: 'There are no pending salaries to pay.',
        color: 'blue',
      });
      return;
    }
    setPayAllModalOpened(true);
  };

  const handleGenerateSalarySheet = async () => {
    if (!selectedBankId) {
      notifications.show({
        title: 'Required',
        message: 'Please select the bank account from which salaries will be transferred.',
        color: 'orange',
      });
      return;
    }

    if (!companyName || !proprietorName) {
      notifications.show({
        title: 'Required',
        message: 'Please fill in all required fields.',
        color: 'orange',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Get the selected bank's account number
      const selectedBank = banks.find((b) => b.id === selectedBankId);
      const bankAccountNumber = selectedBank?.accountNumber || '';

      const response = await api.post('/hrm/payrolls/process-sheet', {
        bank_id: selectedBankId,
        month_year: monthYear,
        company_name: companyName,
        account_number: bankAccountNumber,
        proprietor_name: proprietorName,
      });

      // Store the full response data including payroll_ids
      // Note: apiMethods.post returns res.data directly, which is the Laravel response body
      const bankLetterData = {
        ...response.data?.bank_letter,
        payroll_ids: response.data?.payroll_ids,
        amountInWords: response.data?.amount_in_words,
      };

      console.log('Full Response:', response);
      console.log('Response.data:', response.data);
      console.log('Bank Letter Data:', bankLetterData);
      console.log('Employees:', bankLetterData?.employees);

      setBankLetterData(bankLetterData);
      setPayAllModalOpened(false);
      setSalarySheetModalOpened(true);

      notifications.show({
        title: 'Success',
        message: 'Salary sheet generated successfully! Please review and confirm.',
        color: 'green',
      });
    } catch (error: unknown) {
      const errorObj = error as { response?: { data?: { message?: string } } };
      notifications.show({
        title: 'Error',
        message: errorObj.response?.data?.message || 'Failed to generate salary sheet',
        color: 'red',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!hasPermission('hrm.payroll.pay')) return;

    if (!selectedBankId) {
      notifications.show({
        title: 'Required',
        message: 'Please select a bank account.',
        color: 'orange',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Get payroll IDs from the stored data (returned from process-sheet API)
      const payrollIds = bankLetterData?.payroll_ids || [];

      if (payrollIds.length === 0) {
        notifications.show({
          title: 'No Processing Payrolls',
          message: 'No payroll records found in processing status.',
          color: 'orange',
        });
        return;
      }

      const response = await api.post('/hrm/payrolls/confirm-payment', {
        payroll_ids: payrollIds,
        bank_id: selectedBankId,
      });

      const data = response.data?.data;
      notifications.show({
        title: 'Payment Confirmed',
        message: `Successfully paid ${data?.paid_count || 0} employees. Total: ${formatCurrency(data?.total_amount || 0)}`,
        color: 'green',
      });

      setSalarySheetModalOpened(false);
      setBankLetterData(null);
      setSelectedBankId(null);
      fetchPayroll();
      fetchBanks();
    } catch (error: unknown) {
      const errorObj = error as { response?: { data?: { message?: string } } };
      notifications.show({
        title: 'Error',
        message: errorObj.response?.data?.message || 'Failed to confirm payment',
        color: 'red',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreviewSalarySheet = async () => {
    const processingPayrolls = payroll.filter((p) => p.status === 'processing');

    if (processingPayrolls.length === 0) {
      notifications.show({
        title: 'No Processing Payrolls',
        message: 'Please generate salary sheet first to preview.',
        color: 'orange',
      });
      return;
    }

    // Build preview data from existing processing payrolls
    const totalAmount = processingPayrolls.reduce((sum, p) => {
      const netPayable = typeof p.netPayable === 'string' ? parseFloat(p.netPayable) : p.netPayable;
      return sum + (netPayable || 0);
    }, 0);

    const salarySheetData = processingPayrolls.map((p) => ({
      employee_name: p.user.name,
      account_name: p.user.staffProfile?.bankAccountName || p.user.name,
      account_number: p.user.staffProfile?.bankAccountNumber || 'N/A',
      amount: typeof p.netPayable === 'string' ? parseFloat(p.netPayable) : p.netPayable,
      remark: p.monthYear,
    }));

    const dateObj = new Date(monthYear + '-01');
    const monthName = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear();

    // Find the selected bank to get account details
    const selectedBank = banks.find((b) => b.id === selectedBankId);

    setBankLetterData({
      date: new Date().toLocaleDateString('en-GB'),
      company_name: companyName,
      company_account_number: selectedBank?.accountNumber || '',
      bank_name: selectedBank?.name || '',
      branch_name: selectedBank?.branch || 'Main Branch',
      month_year: monthYear,
      month_name: monthName,
      year: year.toString(),
      employees: salarySheetData,
      proprietor_name: proprietorName,
      total_amount: totalAmount,
      payroll_ids: processingPayrolls.map((p) => p.id),
    });

    setSalarySheetPreviewModalOpened(true);
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined || amount === '') {
      return '৳0';
    }
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) {
      return '৳0';
    }
    const rounded = Math.round(num);
    return `৳${rounded.toLocaleString('en-BD')}`;
  };

  // Real-time calculation of net payable in edit modal
  const calculatedNetPayable = useMemo(() => {
    if (!selectedPayroll) return 0;

    // Convert basicSalary and overtime_hourly_rate from string to number if needed
    const toNum = (val: number | string | undefined) => {
      if (val === undefined || val === null) return 0;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(Number(num)) ? 0 : Number(num);
    };

    const basicSalary = toNum(selectedPayroll.basicSalary);
    const overtimeHourlyRate = toNum(selectedPayroll.overtimeHourlyRate);

    // Calculate overtime amount
    const overtimeAmount = overtimeHourlyRate * editTotalOvertimeHours;

    // Net payable = basic + house_rent + medical + conveyance + overtime + bonus - deductions
    return basicSalary + editHouseRent + editMedicalAllowance + editConveyanceAllowance + overtimeAmount + editBonus - editDeductions;
  }, [selectedPayroll, editHouseRent, editMedicalAllowance, editConveyanceAllowance, editTotalOvertimeHours, editBonus, editDeductions]);

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
                className="text-lg md:text-xl lg:text-2xl"
                onClick={fetchPayroll}
                loading={loading}
              >
                <IconRefresh size={18} />
              </ActionIcon>
              {hasPermission('hrm.payroll.process') && (
                <>
                  <Button
                    variant="light"
                    leftSection={<IconRefresh size={16} />}
                    onClick={() => setGenerateModalOpened(true)}
                  >
                    Generate
                  </Button>
                  <Button
                    leftSection={<IconFileDescription size={16} />}
                    onClick={() => setPayAllModalOpened(true)}
                    color="blue"
                    disabled={payroll.filter((p) => p.status === 'generated' || p.status === 'processing').length === 0}
                  >
                    Salary Sheet ({payroll.filter((p) => p.status === 'generated' || p.status === 'processing').length})
                  </Button>
                  {payroll.filter((p) => p.status === 'processing').length > 0 && (
                    <Button
                      leftSection={<IconEye size={16} />}
                      onClick={handlePreviewSalarySheet}
                      color="green"
                    >
                      Preview
                    </Button>
                  )}
                </>
              )}
            </Group>
          </Group>
        </Box>

        {/* Stats Dashboard */}
        <SimpleGrid cols={{ base: 2, md: 3, lg: 5 }} spacing="md">
          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <Text className="text-xs md:text-sm" c="dimmed">Total Records</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>{stats.totalRecords}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <Text className="text-xs md:text-sm" c="dimmed">Total Net Payable</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>{formatCurrency(stats.totalNetPayable)}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <Text className="text-xs md:text-sm" c="dimmed">Paid</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="green">{stats.paidCount}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <Text className="text-xs md:text-sm" c="dimmed">Pending</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="orange">{stats.pendingCount}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <Text className="text-xs md:text-sm" c="dimmed">Processing</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="yellow">{stats.processingCount}</Text>
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
              className="flex-1"
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || 'all')}
              data={[
                { value: 'all', label: 'All Statuses' },
                { value: 'generated', label: 'Generated' },
                { value: 'processing', label: 'Processing' },
                { value: 'paid', label: 'Paid' },
              ]}
              className="flex-1"
            />
          </Group>
        </Card>

        {/* Payroll Table */}
        <Card withBorder p="0" radius="md" shadow="sm" pos="relative">
          <LoadingOverlay visible={loading} />
          <Table.ScrollContainer minWidth={1200}>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Employee</Table.Th>
                  <Table.Th>Basic</Table.Th>
                  <Table.Th>House Rent</Table.Th>
                  <Table.Th>Medical</Table.Th>
                  <Table.Th>Conveyance</Table.Th>
                  <Table.Th>Overtime</Table.Th>
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
                    <Table.Td colSpan={13}>
                      <Text ta="center" c="dimmed">
                        Loading...
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : payroll.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={13}>
                      <Text ta="center" c="dimmed">
                        No payroll records found
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  payroll.map((record) => {
                    // Helper to get numeric value
                    const toNum = (val: number | string | undefined) => {
                      if (val === undefined || val === null) return 0;
                      return typeof val === 'string' ? parseFloat(val) : val;
                    };

                    const hours = toNum(record.totalOvertimeHours);
                    const rate = toNum(record.overtimeHourlyRate);
                    const amount = toNum(record.overtimeAmount);

                    return (
                      <Table.Tr key={record.id}>
                        <Table.Td fw={500}>
                          <div>{record.user?.name || 'Unknown'}</div>
                          <Text size="xs" c="dimmed">{record.user?.staffProfile?.designation || '-'}</Text>
                        </Table.Td>
                        <Table.Td>{formatCurrency(record.basicSalary)}</Table.Td>
                        <Table.Td>{formatCurrency(record.houseRent)}</Table.Td>
                        <Table.Td>{formatCurrency(record.medicalAllowance)}</Table.Td>
                        <Table.Td>{formatCurrency(record.conveyanceAllowance)}</Table.Td>
                        <Table.Td>
                          {hours > 0 ? (
                            <Text size="sm">
                              {formatCurrency(rate)} × {Math.round(hours)} = <Text span fw={700} c="blue">{formatCurrency(amount)}</Text>
                            </Text>
                          ) : (
                            <Text c="dimmed" size="sm">-</Text>
                          )}
                        </Table.Td>
                        <Table.Td c="green">{formatCurrency(record.bonus)}</Table.Td>
                        <Table.Td c="red">{formatCurrency(record.deductions)}</Table.Td>
                        <Table.Td fw={700} c="green.6">{formatCurrency(record.netPayable)}</Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              record.status === 'paid' ? 'green' :
                              record.status === 'processing' ? 'yellow' : 'orange'
                            }
                            variant="light"
                          >
                            {record.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {record.paymentDate
                            ? new Date(record.paymentDate).toLocaleDateString()
                            : '-'}
                        </Table.Td>
                        {(hasPermission('hrm.payroll.edit') || hasPermission('hrm.payroll.pay') || hasPermission('hrm.payroll.approve')) && (
                          <Table.Td>
                            <Group gap={4}>
                              {/* View Button - Always visible */}
                              <ActionIcon
                                className="text-sm md:text-base"
                                color="gray"
                                onClick={() => openViewModal(record)}
                                variant="subtle"
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                              {record.status === 'generated' && (
                                <>
                                  {hasPermission('hrm.payroll.edit') && (
                                    <ActionIcon
                                      className="text-sm md:text-base"
                                      color="blue"
                                      onClick={() => openEditModal(record)}
                                      variant="subtle"
                                    >
                                      <IconEdit size={16} />
                                    </ActionIcon>
                                  )}
                                  {(hasPermission('hrm.payroll.pay') || hasPermission('hrm.payroll.approve')) && (
                                    <ActionIcon
                                      className="text-sm md:text-base"
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
                    );
                  })
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
              <Text className="text-sm md:text-base">
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
          size="lg"
        >
          <Stack>
            {selectedPayroll && (
              <>
                <Text className="text-sm md:text-base">
                  <strong>Employee:</strong> {selectedPayroll.user?.name || 'Unknown'}
                </Text>

                <Paper withBorder p="sm" bg="blue.0">
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" fw={500}>Basic Salary:</Text>
                      <Text size="sm">{formatCurrency(selectedPayroll.basicSalary)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" fw={500}>Overtime Hourly Rate:</Text>
                      <Text size="sm">{formatCurrency(selectedPayroll.overtimeHourlyRate)}</Text>
                    </Group>
                  </Stack>
                </Paper>

                <SimpleGrid cols={{ base: 1, md: 2 }}>
                  <NumberInput
                    label="House Rent"
                    value={editHouseRent}
                    onChange={(v) => setEditHouseRent(v === '' ? 0 : Number(v))}
                    min={0}
                    prefix="৳"
                  />

                  <NumberInput
                    label="Medical Allowance"
                    value={editMedicalAllowance}
                    onChange={(v) => setEditMedicalAllowance(v === '' ? 0 : Number(v))}
                    min={0}
                    prefix="৳"
                  />

                  <NumberInput
                    label="Conveyance Allowance"
                    value={editConveyanceAllowance}
                    onChange={(v) => setEditConveyanceAllowance(v === '' ? 0 : Number(v))}
                    min={0}
                    prefix="৳"
                  />

                  <NumberInput
                    label="Total Overtime Hours"
                    value={editTotalOvertimeHours}
                    onChange={(v) => setEditTotalOvertimeHours(v === '' ? 0 : Number(v))}
                    min={0}
                  />

                  <NumberInput
                    label="Bonus"
                    value={editBonus}
                    onChange={(v) => setEditBonus(v === '' ? 0 : Number(v))}
                    min={0}
                    prefix="৳"
                  />

                  <NumberInput
                    label="Deductions"
                    value={editDeductions}
                    onChange={(v) => setEditDeductions(v === '' ? 0 : Number(v))}
                    min={0}
                    prefix="৳"
                  />
                </SimpleGrid>

                <Paper withBorder p="sm" bg="green.0">
                  <Group justify="space-between">
                    <Text fw={500}>Net Payable:</Text>
                    <Text fw={700} className="text-lg md:text-xl lg:text-2xl" c="green.7">
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
          <Stack>
            {selectedPayroll && (
              <>
                <Alert color="green">
                  <Text className="text-sm md:text-base">
                    Process payment for <strong>{selectedPayroll.user?.name || 'Employee'}</strong>?
                  </Text>
                </Alert>

                <Paper withBorder p="md">
                  <Stack>
                    <Group justify="space-between">
                      <Text className="text-sm md:text-base">Employee:</Text>
                      <Text fw={500}>{selectedPayroll.user?.name || 'Unknown'}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text className="text-sm md:text-base">Net Payable:</Text>
                      <Text fw={700}>{formatCurrency(selectedPayroll.netPayable)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text className="text-sm md:text-base">Month:</Text>
                      <Text>{selectedPayroll.monthYear}</Text>
                    </Group>
                  </Stack>
                </Paper>

                {/* Bank Account Selection */}
                <Select
                  label="Pay From Bank Account"
                  placeholder="Select bank account"
                  data={banks.map((bank) => ({
                    value: String(bank.id),
                    label: `${bank.name}${bank.accountNumber ? ' - ' + bank.accountNumber : ''}${bank.balance !== undefined ? ' (Balance: ' + formatCurrency(bank.balance) + ')' : ''}`,
                  }))}
                  value={selectedBankId ? String(selectedBankId) : null}
                  onChange={(value) => setSelectedBankId(value ? Number(value) : null)}
                  searchable
                  nothingFoundMessage="No bank accounts found"
                  required
                  disabled={banksLoading}
                />

                <Group justify="flex-end">
                  <Button variant="default" onClick={() => setPayModalOpened(false)}>
                    Cancel
                  </Button>
                  <Button color="green" onClick={handlePay} disabled={!selectedBankId || banksLoading}>
                    Confirm Payment
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        </Modal>

        {/* Salary Slip View Modal */}
        <Modal
          opened={viewModalOpened}
          onClose={() => setViewModalOpened(false)}
          title={
            <Group gap="sm">
              <IconFileDescription size={20} />
              <Text className="text-lg md:text-xl">Salary Slip</Text>
            </Group>
          }
          centered
          size={800}
        >
          {selectedPayroll && (
            <Paper id="salary-slip" withBorder p="xl" shadow="sm">
              {/* Header */}
              <Stack gap="md">
                {/* Company Header */}
                <Paper bg="gray.0" p="md" radius="md">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Title order={3} c="red">Hook & Hunt</Title>
                      <Text size="sm" c="dimmed">Multi-Channel Sales Operation</Text>
                    </div>
                    <Badge
                      size="lg"
                      color={selectedPayroll.status === 'paid' ? 'green' : 'orange'}
                      variant="filled"
                    >
                      {selectedPayroll.status.toUpperCase()}
                    </Badge>
                  </Group>
                </Paper>

                {/* Employee Info */}
                <Paper withBorder p="md" radius="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Text size="sm" c="dimmed">Employee Name</Text>
                      <Text fw={600} className="text-base md:text-lg">{selectedPayroll.user?.name || 'Unknown'}</Text>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Text size="sm" c="dimmed">Designation</Text>
                      <Text fw={500}>{selectedPayroll.user?.staffProfile?.designation || '-'}</Text>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Text size="sm" c="dimmed">Department</Text>
                      <Text>{selectedPayroll.user?.staffProfile?.department?.name || '-'}</Text>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Text size="sm" c="dimmed">Pay Period</Text>
                      <Text fw={500}>{selectedPayroll.monthYear}</Text>
                    </Grid.Col>
                  </Grid>
                </Paper>

                {/* Earnings Section */}
                <div>
                  <Title order={5} c="green" mb="xs">
                    <Group gap="xs">
                      <IconCurrencyTaka size={18} />
                      Earnings
                    </Group>
                  </Title>
                  <Paper withBorder p="0" radius="md">
                    <Table>
                      <Table.Thead>
                        <Table.Tr bg="green.0">
                          <Table.Th>Description</Table.Th>
                          <Table.Th ta="right">Amount (৳)</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        <Table.Tr>
                          <Table.Td>Basic Salary</Table.Td>
                          <Table.Td ta="right">{formatCurrency(selectedPayroll.basicSalary)}</Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>House Rent</Table.Td>
                          <Table.Td ta="right">{formatCurrency(selectedPayroll.houseRent)}</Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>Medical Allowance</Table.Td>
                          <Table.Td ta="right">{formatCurrency(selectedPayroll.medicalAllowance)}</Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>Conveyance Allowance</Table.Td>
                          <Table.Td ta="right">{formatCurrency(selectedPayroll.conveyanceAllowance)}</Table.Td>
                        </Table.Tr>
                        {Number(selectedPayroll.overtimeAmount || 0) > 0 && (
                          <Table.Tr>
                            <Table.Td>
                              Overtime ({selectedPayroll.totalOvertimeHours} hrs × {formatCurrency(selectedPayroll.overtimeHourlyRate)})
                            </Table.Td>
                            <Table.Td ta="right">{formatCurrency(selectedPayroll.overtimeAmount)}</Table.Td>
                          </Table.Tr>
                        )}
                        {Number(selectedPayroll.bonus || 0) > 0 && (
                          <Table.Tr>
                            <Table.Td>Bonus</Table.Td>
                            <Table.Td ta="right">{formatCurrency(selectedPayroll.bonus)}</Table.Td>
                          </Table.Tr>
                        )}
                        <Table.Tr fw={700} bg="green.0">
                          <Table.Td>Total Earnings</Table.Td>
                          <Table.Td ta="right" c="green">
                            {formatCurrency(
                              (Number(selectedPayroll.basicSalary) || 0) +
                              (Number(selectedPayroll.houseRent) || 0) +
                              (Number(selectedPayroll.medicalAllowance) || 0) +
                              (Number(selectedPayroll.conveyanceAllowance) || 0) +
                              (Number(selectedPayroll.overtimeAmount) || 0) +
                              (Number(selectedPayroll.bonus) || 0)
                            )}
                          </Table.Td>
                        </Table.Tr>
                      </Table.Tbody>
                    </Table>
                  </Paper>
                </div>

                {/* Deductions Section */}
                {Number(selectedPayroll.deductions || 0) > 0 && (
                  <div>
                    <Title order={5} c="red" mb="xs">
                      Deductions
                    </Title>
                    <Paper withBorder p="0" radius="md">
                      <Table>
                        <Table.Thead>
                          <Table.Tr bg="red.0">
                            <Table.Th>Description</Table.Th>
                            <Table.Th ta="right">Amount (৳)</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          <Table.Tr>
                            <Table.Td>Deductions</Table.Td>
                            <Table.Td ta="right" c="red">{formatCurrency(selectedPayroll.deductions)}</Table.Td>
                          </Table.Tr>
                          <Table.Tr fw={700} bg="red.0">
                            <Table.Td>Total Deductions</Table.Td>
                            <Table.Td ta="right" c="red">{formatCurrency(selectedPayroll.deductions)}</Table.Td>
                          </Table.Tr>
                        </Table.Tbody>
                      </Table>
                    </Paper>
                  </div>
                )}

                {/* Net Payable */}
                <Paper bg="blue.0" p="md" radius="md">
                  <Group justify="space-between" align="center">
                    <Text className="text-lg md:text-xl" fw={600}>Net Payable</Text>
                    <Text
                      className="text-2xl md:text-3xl lg:text-4xl"
                      fw={700}
                      c="blue"
                    >
                      {formatCurrency(selectedPayroll.netPayable)}
                    </Text>
                  </Group>
                </Paper>

                {/* Payment Info */}
                {selectedPayroll.status === 'paid' && selectedPayroll.paymentDate && (
                  <Paper withBorder p="sm" radius="md">
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Payment Date</Text>
                      <Text fw={500}>{new Date(selectedPayroll.paymentDate).toLocaleDateString()}</Text>
                    </Group>
                  </Paper>
                )}

                {/* Footer */}
                <Divider />
                <Text ta="center" size="xs" c="dimmed">
                  This is a computer-generated salary slip. Signature not required.
                </Text>
              </Stack>
            </Paper>
          )}

          {/* Action Buttons */}
          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              leftSection={<IconPrinter size={16} />}
              onClick={() => {
                window.print();
              }}
            >
              Print
            </Button>
            <Button onClick={() => setViewModalOpened(false)}>Close</Button>
          </Group>
        </Modal>

        {/* Salary Sheet Generation Modal */}
        <Modal
          opened={payAllModalOpened}
          onClose={() => setPayAllModalOpened(false)}
          title={
            <Group gap="sm">
              <IconFileDescription size={20} />
              <Text className="text-lg md:text-xl">Generate Salary Sheet</Text>
            </Group>
          }
          centered
          size="lg"
        >
          <Stack>
            <Alert color="blue">
              <Text className="text-sm md:text-base">
                Generate salary sheet for <strong>{payroll.filter((p) => p.status === 'generated' || p.status === 'processing').length} pending employees</strong> for <strong>{monthYear}</strong>.
                This will create a bank transfer letter for payment processing.
              </Text>
            </Alert>

            {/* Summary of pending payments */}
            <Paper withBorder p="md">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text className="text-sm md:text-base">Total Employees:</Text>
                  <Text fw={600}>{payroll.filter((p) => p.status === 'generated' || p.status === 'processing').length}</Text>
                </Group>
                <Group justify="space-between">
                  <Text className="text-sm md:text-base">Total Amount:</Text>
                  <Text fw={700} className="text-lg md:text-xl" c="green">
                    {formatCurrency(
                      payroll
                        .filter((p) => p.status === 'generated' || p.status === 'processing')
                        .reduce((sum, p) => sum + (Number(p.netPayable) || 0), 0)
                    )}
                  </Text>
                </Group>
              </Stack>
            </Paper>

            {/* Bank Account Selection */}
            <Select
              label="Pay From Bank Account"
              placeholder="Select bank account"
              description="The bank account from which salaries will be transferred"
              data={banks.map((bank) => ({
                value: String(bank.id),
                label: `${bank.name}${bank.accountNumber ? ' - ' + bank.accountNumber : ''}${bank.balance !== undefined ? ' (Balance: ' + formatCurrency(bank.balance) + ')' : ''}`,
              }))}
              value={selectedBankId ? String(selectedBankId) : null}
              onChange={(value) => setSelectedBankId(value ? Number(value) : null)}
              searchable
              nothingFoundMessage="No bank accounts found"
              required
              disabled={banksLoading}
            />

            {/* Company Details Form */}
            <Paper withBorder p="md" bg="gray.0">
              <Stack gap="sm">
                <Text fw={600} className="text-sm md:text-base">Bank Letter Details</Text>

                <TextInput
                  label="Company Name"
                  placeholder="e.g., Hook & Hunt"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />

                <TextInput
                  label="Proprietor/Authorized Signatory Name"
                  placeholder="e.g., Md. Jakarea Parvez"
                  value={proprietorName}
                  onChange={(e) => setProprietorName(e.target.value)}
                  required
                />
              </Stack>
            </Paper>

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setPayAllModalOpened(false)}>
                Cancel
              </Button>
              <Button
                color="blue"
                onClick={handleGenerateSalarySheet}
                disabled={!selectedBankId || banksLoading || isProcessing}
                loading={isProcessing}
                leftSection={<IconSend size={16} />}
              >
                Generate Salary Sheet
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Bank Letter Preview Modal */}
        <Modal
          opened={salarySheetModalOpened}
          onClose={() => setSalarySheetModalOpened(false)}
          title={
            <Group gap="sm">
              <IconFileDescription size={20} />
              <Text className="text-lg md:text-xl">Bank Transfer Letter</Text>
            </Group>
          }
          centered
          size={900}
        >
          {bankLetterData && bankLetterData.employees ? (
            <Stack>
              {/* Bank Letter Paper */}
              <Paper id="bank-letter" withBorder p="xl" shadow="sm">
                <Stack gap="md">
                  {/* Letter Header */}
                  <Stack gap={0}>
                    <Group justify="space-between">
                      <Text ta="right" className="text-sm md:text-base">
                        Date: <strong>{bankLetterData.date}</strong>
                      </Text>
                    </Group>
                  </Stack>

                  {/* Letter Body */}
                  <Box>
                    <Text className="text-base md:text-lg" mb="md">
                      The <strong>Branch Manager</strong>,<br />
                      {bankLetterData.bank_name}<br />
                      {bankLetterData.branch_name || 'Main Branch'}
                    </Text>

                    <Text className="text-base md:text-lg" mb="md">
                      <strong>Subject:</strong> Request for Bulk Salary Transfer
                    </Text>

                    <Text className="text-base md:text-lg" mb="md">
                      Dear Sir/Madam,
                    </Text>

                    <Text className="text-base md:text-lg" mb="md" style={{ lineHeight: 1.8 }}>
                      We request you to transfer the following amounts to the accounts of our employees as per the details given below. Please debit our account <strong>{bankLetterData.company_account_number}</strong> and credit the respective accounts.
                    </Text>
                  </Box>

                  {/* Employee Table */}
                  <Table withBorder withColumnBorders striped="odd">
                    <Table.Thead bg="gray.2">
                      <Table.Tr>
                        <Table.Th ta="center">SI</Table.Th>
                        <Table.Th>Employee Name</Table.Th>
                        <Table.Th>Account Number</Table.Th>
                        <Table.Th ta="right">Amount (৳)</Table.Th>
                        <Table.Th>Remark</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {bankLetterData?.employees?.map((emp: any, index: number) => (
                        <Table.Tr key={index}>
                          <Table.Td ta="center">{index + 1}</Table.Td>
                          <Table.Td>{emp.employee_name}</Table.Td>
                          <Table.Td>{emp.account_number}</Table.Td>
                          <Table.Td ta="right">{formatCurrency(emp.amount)}</Table.Td>
                          <Table.Td>{emp.remark}</Table.Td>
                        </Table.Tr>
                      ))}
                      <Table.Tr fw={700} bg="blue.0">
                        <Table.Td colSpan={3} ta="right">Total:</Table.Td>
                        <Table.Td ta="right" c="blue" className="text-lg md:text-xl">{formatCurrency(bankLetterData.total_amount)}</Table.Td>
                        <Table.Td></Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>

                  {/* Amount in Words */}
                  <Paper withBorder p="sm" bg="blue.0">
                    <Text className="text-base md:text-lg">
                      <strong>Total Amount in Words:</strong> {bankLetterData.amountInWords || bankLetterData.amount_in_words}
                    </Text>
                  </Paper>

                  {/* Letter Footer */}
                  <Box mt="xl">
                    <Text className="text-base md:text-lg" mb="xs">
                      Thank you for your cooperation.
                    </Text>
                    <Text className="text-base md:text-lg">
                      Yours faithfully,
                    </Text>
                    <Group mt="md" justify="space-between">
                      <Box>
                        <Text fw={700} className="text-lg md:text-xl">{bankLetterData.company_name}</Text>
                        <Text c="dimmed" className="text-sm md:text-base">(Proprietor/Authorized Signatory)</Text>
                      </Box>
                    </Group>
                  </Box>
                </Stack>
              </Paper>

              {/* Action Buttons */}
              <Group justify="flex-end">
                <Button
                  variant="default"
                  leftSection={<IconPrinter size={16} />}
                  onClick={() => {
                    window.print();
                  }}
                >
                  Print Letter
                </Button>
                <Button
                  color="green"
                  onClick={handleConfirmPayment}
                  loading={isProcessing}
                  disabled={isProcessing}
                  leftSection={<IconSend size={16} />}
                >
                  Confirm Payment
                </Button>
              </Group>
            </Stack>
          ) : (
            <Text c="red">No data available. Please try generating the salary sheet again.</Text>
          )}
        </Modal>

        {/* Salary Sheet Preview Modal - For viewing existing processing payrolls */}
        <Modal
          opened={salarySheetPreviewModalOpened}
          onClose={() => setSalarySheetPreviewModalOpened(false)}
          title={
            <Group gap="sm">
              <IconFileDescription size={20} />
              <Text className="text-lg md:text-xl">Salary Sheet Preview</Text>
            </Group>
          }
          centered
          size={900}
        >
          {bankLetterData && bankLetterData.employees ? (
            <Stack>
              {/* Bank Letter Paper */}
              <Paper id="salary-sheet-preview" withBorder p="xl" shadow="sm">
                <Stack gap="md">
                  {/* Letter Header */}
                  <Stack gap={0}>
                    <Group justify="space-between">
                      <Text ta="right" className="text-sm md:text-base">
                        Date: <strong>{bankLetterData.date}</strong>
                      </Text>
                    </Group>
                  </Stack>

                  {/* Letter Body */}
                  <Box>
                    <Text className="text-base md:text-lg" mb="md">
                      The <strong>Branch Manager</strong>,<br />
                      {bankLetterData.bank_name}<br />
                      {bankLetterData.branch_name || 'Main Branch'}
                    </Text>

                    <Text className="text-base md:text-lg" mb="md">
                      <strong>Subject:</strong> Request for Bulk Salary Transfer
                    </Text>

                    <Text className="text-base md:text-lg" mb="md">
                      Dear Sir/Madam,
                    </Text>

                    <Text className="text-base md:text-lg" mb="md" style={{ lineHeight: 1.8 }}>
                      We request you to transfer the following amounts to the accounts of our employees as per the details given below. Please debit our account <strong>{bankLetterData.company_account_number}</strong> and credit the respective accounts.
                    </Text>
                  </Box>

                  {/* Employee Table */}
                  <Table withBorder withColumnBorders striped="odd">
                    <Table.Thead bg="gray.2">
                      <Table.Tr>
                        <Table.Th ta="center">SI</Table.Th>
                        <Table.Th>Employee Name</Table.Th>
                        <Table.Th>Account Number</Table.Th>
                        <Table.Th ta="right">Amount (৳)</Table.Th>
                        <Table.Th>Remark</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {bankLetterData.employees.map((emp: any, index: number) => (
                        <Table.Tr key={index}>
                          <Table.Td ta="center">{index + 1}</Table.Td>
                          <Table.Td>{emp.employee_name}</Table.Td>
                          <Table.Td>{emp.account_number}</Table.Td>
                          <Table.Td ta="right">{formatCurrency(emp.amount)}</Table.Td>
                          <Table.Td>{emp.remark}</Table.Td>
                        </Table.Tr>
                      ))}
                      <Table.Tr fw={700} bg="blue.0">
                        <Table.Td colSpan={3} ta="right">Total:</Table.Td>
                        <Table.Td ta="right" c="blue" className="text-lg md:text-xl">{formatCurrency(bankLetterData.total_amount)}</Table.Td>
                        <Table.Td></Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>

                  {/* Amount in Words */}
                  <Paper withBorder p="sm" bg="blue.0">
                    <Text className="text-base md:text-lg">
                      <strong>Total Amount:</strong> {formatCurrency(bankLetterData.total_amount)}
                    </Text>
                  </Paper>

                  {/* Letter Footer */}
                  <Box mt="xl">
                    <Text className="text-base md:text-lg" mb="xs">
                      Thank you for your cooperation.
                    </Text>
                    <Text className="text-base md:text-lg">
                      Yours faithfully,
                    </Text>
                    <Group mt="md" justify="space-between">
                      <Box>
                        <Text fw={700} className="text-lg md:text-xl">{bankLetterData.company_name}</Text>
                        <Text c="dimmed" className="text-sm md:text-base">(Proprietor/Authorized Signatory)</Text>
                      </Box>
                    </Group>
                  </Box>
                </Stack>
              </Paper>

              {/* Action Buttons */}
              <Group justify="flex-end">
                <Button
                  variant="default"
                  leftSection={<IconPrinter size={16} />}
                  onClick={() => {
                    const printContent = document.getElementById('salary-sheet-preview');
                    if (printContent) {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write('<html><head><title>Salary Sheet</title>');
                        printWindow.document.write('<style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}</style>');
                        printWindow.document.write('</head><body>');
                        printWindow.document.write(printContent.innerHTML);
                        printWindow.document.write('</body></html>');
                        printWindow.document.close();
                        printWindow.print();
                      }
                    }
                  }}
                >
                  Print / Download PDF
                </Button>
                <Button
                  color="blue"
                  leftSection={<IconFileDescription size={16} />}
                  onClick={() => {
                    setSalarySheetPreviewModalOpened(false);
                    setPayAllModalOpened(true);
                  }}
                >
                  Edit & Confirm
                </Button>
              </Group>
            </Stack>
          ) : (
            <Text c="red">No salary sheet data available.</Text>
          )}
        </Modal>
      </Stack>
    </Box>
  );
}
