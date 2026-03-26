import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  Stack,
  Text,
  NumberInput,
  Group,
  Table,
  Badge,
  Alert,
  Paper,
  ScrollArea,
  Button,
  Textarea,
  SimpleGrid,
} from '@mantine/core'
import {
  IconPackage,
  IconScaleOutline,
  IconReceipt,
  IconInfoCircle,
  IconWeight,
  IconCoin,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Purchase Order Item structure
 */
interface PurchaseOrderItem {
  id: number
  quantity: number
  chinaPrice: number
  unitPrice?: number // BDT unit price
  product: {
    id: number
    name: string
  }
}

/**
 * Receiving data submission structure
 */
export type ReceivingData = {
  extra_cost: number
  total_weight: number
  items: Array<{
    id: number
    received_quantity: number
    unit_weight: number
    extra_weight: number
    shipping_cost_per_kg: number
    final_unit_cost: number
  }>
  is_partial_completion?: boolean
  comments?: string
}

/**
 * Modal props structure
 */
interface ReceivingModalProps {
  opened: boolean
  onClose: () => void
  onSubmit: (data: ReceivingData) => Promise<void>
  items: PurchaseOrderItem[]
  exchangeRate: number
  poNumber: string
  totalWeight: number // Total weight from shipped_bd step (in kg)
  shippingCostPerKg: number // Default shipping cost per kg from shipped_bd
}

/**
 * Item input state structure
 */
interface ItemInput {
  received_quantity: number
  unit_weight: number // in grams
  extra_weight: number // in grams, auto-calculated based on weight ratio (read-only display)
  shipping_cost_per_kg: number // per kg, can vary by item
}

/**
 * Weight calculation result
 */
interface WeightCalculation {
  totalWeightKg: number // Total weight from shipped_bd
  totalItemsWeightG: number // Sum of all item weights (unit_weight × qty)
  totalItemsWeightKg: number // Converted to kg
  extraWeightG: number // Difference in grams
  extraWeightKg: number // Difference in kg
}

/**
 * Item calculation result structure
 */
interface ItemCalculation {
  orderedQty: number
  receivedQty: number
  lostQty: number
  foundQty: number
  lostPercentage: number
  foundPercentage: number

  // Weight calculations
  unitWeight: number // in grams
  itemTotalWeightG: number // unit_weight × received_quantity
  extraWeightShareG: number // Extra weight distributed to this item
  extraWeightPerUnitG: number // Extra weight per unit
  totalWeightWithExtraG: number // Item total weight + extra weight share

  // Cost calculations
  chinaPrice: number
  unitPrice: number // BDT
  shippingCostPerKg: number
  shippingCost: number // Calculated shipping cost
  extraCostShare: number // Extra cost distributed to this item
  lostCostShare: number // Lost item cost distributed
  foundCostReduction: number // Found item cost reduction
  adjustment: number // Total adjustment (shipping + extra + lost/found)
  finalUnitCost: number // Adjustment amount (stored in DB)
  landedCost: number // unitPrice + finalUnitCost (display only)
  lostValueBdt: number
}

/**
 * Overall statistics structure
 */
interface OverallStats {
  totalOrdered: number
  totalReceived: number
  totalLost: number
  totalFound: number
  totalLostPercentage: number
  totalLostValueBdt: number
  totalOriginalValueBdt: number
  totalLandedValueBdt: number
  totalFinalUnitCost: number
}

// ============================================================================
// PURE UTILITY FUNCTIONS - Mathematical Calculations
// ============================================================================

/**
 * Safely converts value to number with fallback
 */
const toSafeNumber = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined || value === '') return fallback
  const num = typeof value === 'number' ? value : parseFloat(value)
  if (isNaN(num) || !isFinite(num)) return fallback
  return Math.max(0, num)
}

/**
 * Calculates percentage with division by zero protection
 */
const calculateSafePercentage = (part: number, total: number): number => {
  if (total === 0 || !isFinite(total)) return 0
  const percentage = (part / total) * 100
  return isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : 0
}

/**
 * Calculates weight breakdown
 */
const calculateWeightBreakdown = (
  items: PurchaseOrderItem[],
  itemInputs: Record<number, ItemInput>,
  totalWeightKg: number
): WeightCalculation => {
  // Calculate total items weight in grams
  const totalItemsWeightG = items.reduce((sum, item) => {
    const input = itemInputs[item.id]
    const unitWeight = toSafeNumber(input?.unit_weight)
    const receivedQty = toSafeNumber(input?.received_quantity, item.quantity)
    return sum + (unitWeight * receivedQty)
  }, 0)

  const totalItemsWeightKg = totalItemsWeightG / 1000
  const totalWeightG = totalWeightKg * 1000
  const extraWeightG = Math.max(0, totalWeightG - totalItemsWeightG)
  const extraWeightKg = extraWeightG / 1000

  return {
    totalWeightKg,
    totalItemsWeightG,
    totalItemsWeightKg,
    extraWeightG,
    extraWeightKg,
  }
}

/**
 * Calculates item-level breakdown with weight-based cost distribution
 */
const calculateItemBreakdown = (
  item: PurchaseOrderItem,
  input: ItemInput,
  weightCalc: WeightCalculation,
  extraCostBdt: number,
  exchangeRate: number
): ItemCalculation => {
  // Basic quantities
  const orderedQty = toSafeNumber(item.quantity)
  const receivedQty = toSafeNumber(input?.received_quantity, item.quantity)
  const lostQty = Math.max(0, orderedQty - receivedQty)
  const foundQty = Math.max(0, receivedQty - orderedQty)

  // Percentages
  const lostPercentage = calculateSafePercentage(lostQty, orderedQty)
  const foundPercentage = calculateSafePercentage(foundQty, orderedQty)

  // Weight calculations
  const unitWeight = toSafeNumber(input?.unit_weight)
  const itemTotalWeightG = unitWeight * receivedQty

  // Use manual input for extra weight (per unit × received quantity)
  const extraWeightPerUnitG = toSafeNumber(input?.extra_weight)
  const extraWeightShareG = extraWeightPerUnitG * receivedQty
  const totalWeightWithExtraG = itemTotalWeightG + extraWeightShareG

  // Weight ratio (for cost distribution)
  const weightRatio = weightCalc.totalItemsWeightG > 0
    ? itemTotalWeightG / weightCalc.totalItemsWeightG
    : 0

  // Cost calculations
  const chinaPrice = toSafeNumber(item.chinaPrice)
  const unitPrice = toSafeNumber(item.unitPrice, chinaPrice * exchangeRate)
  const shippingCostPerKg = toSafeNumber(input?.shipping_cost_per_kg)

  // Shipping cost based on total weight (item weight + extra weight share)
  const shippingCost = (totalWeightWithExtraG / 1000) * shippingCostPerKg

  // Extra cost distributed by weight ratio
  const extraCostShare = extraCostBdt * weightRatio

  // Lost item cost (adjust for any amount of lost items)
  const lostValueBdt = lostQty * unitPrice
  let lostCostShare = 0
  if (lostQty > 0) {
    lostCostShare = lostValueBdt / receivedQty
  }

  // Found item cost reduction
  const foundCostReduction = foundQty > 0 ? (foundQty * unitPrice) / receivedQty : 0

  // Total adjustment
  const adjustment = shippingCost + extraCostShare + lostCostShare - foundCostReduction

  // Calculate per-unit adjustment (divide total adjustment by received quantity)
  const finalUnitCost = receivedQty > 0 ? adjustment / receivedQty : 0

  return {
    orderedQty,
    receivedQty,
    lostQty,
    foundQty,
    lostPercentage,
    foundPercentage,
    unitWeight,
    itemTotalWeightG,
    extraWeightShareG,
    extraWeightPerUnitG,
    totalWeightWithExtraG,
    chinaPrice,
    unitPrice,
    shippingCostPerKg,
    shippingCost,
    extraCostShare,
    lostCostShare,
    foundCostReduction,
    adjustment,
    finalUnitCost, // This is stored in DB (per-unit adjustment)
    landedCost: unitPrice + finalUnitCost, // Display only
    lostValueBdt,
  }
}

/**
 * Calculates overall statistics
 */
const calculateOverallStats = (
  itemCalculations: ItemCalculation[]
): OverallStats => {
  const stats = itemCalculations.reduce(
    (acc, calc) => ({
      totalOrdered: acc.totalOrdered + calc.orderedQty,
      totalReceived: acc.totalReceived + calc.receivedQty,
      totalLost: acc.totalLost + calc.lostQty,
      totalFound: acc.totalFound + calc.foundQty,
      totalOriginalValueBdt: acc.totalOriginalValueBdt + (calc.receivedQty * calc.unitPrice),
      totalFinalUnitCost: acc.totalFinalUnitCost + (calc.receivedQty * calc.finalUnitCost),
    }),
    {
      totalOrdered: 0,
      totalReceived: 0,
      totalLost: 0,
      totalFound: 0,
      totalOriginalValueBdt: 0,
      totalFinalUnitCost: 0,
    }
  )

  const totalLostValueBdt = itemCalculations.reduce((sum, calc) => sum + calc.lostValueBdt, 0)
  const totalLandedValueBdt = stats.totalOriginalValueBdt + stats.totalFinalUnitCost
  const totalLostPercentage = calculateSafePercentage(stats.totalLost, stats.totalOrdered)

  return {
    ...stats,
    totalLostValueBdt,
    totalLandedValueBdt,
    totalLostPercentage,
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates unit weight input
 */
const isValidUnitWeight = (weight: number): boolean => {
  const safeWeight = toSafeNumber(weight)
  return safeWeight > 0 && isFinite(safeWeight)
}

/**
 * Validates all item inputs
 */
const validateItemInputs = (
  items: PurchaseOrderItem[],
  itemInputs: Record<number, ItemInput>,
  weightCalc: WeightCalculation
): { isValid: boolean; errors: Array<{ message: string }> } => {
  const errors: Array<{ message: string }> = []

  // Validate unit weights
  for (const item of items) {
    const input = itemInputs[item.id]
    const unitWeight = toSafeNumber(input?.unit_weight)

    if (!isValidUnitWeight(unitWeight)) {
      errors.push({
        message: `Please enter unit weight for "${item.product.name}"`,
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// UI COMPONENTS (Pure Functions)
// ============================================================================

/**
 * Renders weight breakdown info card
 */
const WeightBreakdownCard = ({
  weightCalc,
  t,
}: {
  weightCalc: WeightCalculation
  t: (key: string) => string
}) => {
  return (
    <Paper withBorder p="md" radius="md" bg="blue.0">
      <Stack gap="xs">
        <Group gap="xs">
          <IconWeight size={18} style={{ color: '#228BE6' }} />
          <Text fw={600} size="sm">Weight Breakdown</Text>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 3 }}>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Total Shipment Weight</Text>
            <Text size="lg" fw={700} c="blue">
              {Number(weightCalc.totalWeightKg).toFixed(2)} kg
            </Text>
          </Stack>

          <Stack gap={0}>
            <Text size="xs" c="dimmed">Items Weight</Text>
            <Text size="lg" fw={700} c="blue">
              {Number(weightCalc.totalItemsWeightKg).toFixed(2)} kg
            </Text>
            <Text size="xs" c="dimmed">
              ({Number(weightCalc.totalItemsWeightG).toLocaleString()} g)
            </Text>
          </Stack>

          <Stack gap={0}>
            <Text size="xs" c="dimmed">Extra Weight</Text>
            <Text size="lg" fw={700} c={weightCalc.extraWeightG > 0 ? 'orange' : 'green'}>
              {Number(weightCalc.extraWeightG).toFixed(0)} g
            </Text>
            <Text size="xs" c="dimmed">
              ({Number(weightCalc.extraWeightKg).toFixed(3)} kg)
            </Text>
          </Stack>
        </SimpleGrid>

        {weightCalc.extraWeightG > 0 && (
          <Alert variant="light" color="blue" radius="sm" style={{ marginTop: 8 }}>
            <Text size="xs">
              Extra weight will be distributed to items based on their weight ratio for accurate shipping cost calculation.
            </Text>
          </Alert>
        )}
      </Stack>
    </Paper>
  )
}

/**
 * Renders summary alert based on PER-ITEM loss analysis
 */
const SummaryAlert = ({
  stats,
  calculations,
  t,
}: {
  stats: OverallStats
  calculations: Record<number, ItemCalculation>
  t: (key: string, params?: any) => string
}) => {
  const hasAnyLostItems = Object.values(calculations).some(calc => calc.lostQty > 0)
  const hasAnyFoundItems = Object.values(calculations).some(calc => calc.foundQty > 0)

  const hasAnyIssues = hasAnyLostItems || hasAnyFoundItems
  const color = hasAnyIssues ? 'orange' : 'teal'

  return (
    <Alert color={color} variant="light">
      <Stack gap="xs">
        <Group gap="xs">
          <IconPackage size={18} />
          <Text fw={600}>{t('procurement.receivingModal.summary.title')}</Text>
        </Group>

        <Text size="sm">
          Total: <strong>{stats.totalOrdered}</strong> units → Received: <strong>{stats.totalReceived}</strong> units
          {stats.totalLost > 0 && (
            <> · Lost: <strong>{stats.totalLost}</strong> units ({stats.totalLostPercentage.toFixed(1)}%)</>
          )}
          {stats.totalFound > 0 && (
            <> · Found: <strong>{stats.totalFound}</strong> units (extra)</>
          )}
        </Text>

        {hasAnyIssues && (
          <Text size="sm" c="orange" fw={500}>
            <IconInfoCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
            Costs will be adjusted to reflect lost/found items.
          </Text>
        )}
      </Stack>
    </Alert>
  )
}

/**
 * Renders items table with new columns
 */
const ItemsTable = ({
  items,
  calculations,
  itemInputs,
  submitting,
  onInputChange,
  exchangeRate,
  t,
}: {
  items: PurchaseOrderItem[]
  calculations: Record<number, ItemCalculation>
  itemInputs: Record<number, ItemInput>
  submitting: boolean
  onInputChange: (itemId: number, field: keyof ItemInput, value: number) => void
  exchangeRate: number
  t: (key: string) => string
}) => {
  return (
    <ScrollArea.Autosize mah={450}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Item</Table.Th>
            <Table.Th style={{ textAlign: 'center' }}>Ordered</Table.Th>
            <Table.Th style={{ textAlign: 'center' }}>Received</Table.Th>
            <Table.Th style={{ textAlign: 'center' }}>Unit Weight (g)</Table.Th>
            <Table.Th style={{ textAlign: 'center' }}>Extra Weight (g)</Table.Th>
            <Table.Th style={{ textAlign: 'center' }}>Weight (kg)</Table.Th>
            <Table.Th style={{ textAlign: 'center' }}>Shipping (৳/kg)</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>Unit Cost</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>Final Cost</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>Adjustment</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((item) => {
            const calc = calculations[item.id]
            const input = itemInputs[item.id]

            // Calculate unit price for display (even without calc)
            const displayUnitPrice = calc?.unitPrice || (item.chinaPrice * exchangeRate)
            const receivedQty = input?.received_quantity || item.quantity
            const landedCost = calc?.landedCost || displayUnitPrice
            const adjustment = calc?.adjustment || 0

            return (
              <Table.Tr key={item.id}>
                <Table.Td>
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>{item.product.name}</Text>
                    <Text size="xs" c="dimmed">
                      China: ¥{item.chinaPrice || 0}
                    </Text>
                  </Stack>
                </Table.Td>

                <Table.Td ta="center">
                  <Badge color="gray">{item.quantity || 0}</Badge>
                </Table.Td>

                <Table.Td ta="center">
                  <NumberInput
                    value={input?.received_quantity || item.quantity}
                    onChange={(val) => onInputChange(item.id, 'received_quantity', typeof val === 'number' ? val : parseFloat(val) || 0)}
                    min={0}
                    size="xs"
                    style={{ width: 80 }}
                    disabled={submitting}
                  />
                </Table.Td>

                <Table.Td ta="center">
                  <NumberInput
                    value={input?.unit_weight || 0}
                    onChange={(val) => onInputChange(item.id, 'unit_weight', typeof val === 'number' ? val : parseFloat(val) || 0)}
                    min={0}
                    size="xs"
                    style={{ width: 100 }}
                    disabled={submitting}
                    required
                  />
                </Table.Td>

                <Table.Td ta="center">
                  <Text size="sm" c="dimmed" fw={500}>
                    {calc?.extraWeightPerUnitG || 0} g
                  </Text>
                </Table.Td>

                <Table.Td ta="center">
                  <Text size="sm" c="dimmed" fw={500}>
                    {calc
                      ? calc.totalWeightWithExtraG < 1000
                        ? Math.round(calc.totalWeightWithExtraG) + ' g'
                        : (calc.totalWeightWithExtraG / 1000).toFixed(2) + ' kg'
                      : '-'}
                  </Text>
                  {calc && calc.totalWeightWithExtraG > 0 && (
                    <Text size="xs" c="blue" style={{ display: 'block', marginTop: 2 }}>
                      ({((calc.unitWeight || 0) * (calc.receivedQty || 0) / 1000).toFixed(2)} kg + {(calc.extraWeightShareG / 1000).toFixed(2)} kg)
                    </Text>
                  )}
                </Table.Td>

                <Table.Td ta="center">
                  <Group gap={4} justify="center">
                    <Text size="xs" c="dimmed">৳</Text>
                    <NumberInput
                      value={input?.shipping_cost_per_kg || 0}
                      onChange={(val) => onInputChange(item.id, 'shipping_cost_per_kg', typeof val === 'number' ? val : parseFloat(val) || 0)}
                      min={0}
                      size="xs"
                      style={{ width: 100 }}
                      disabled={submitting}
                      decimalScale={2}
                    />
                  </Group>
                </Table.Td>

                <Table.Td ta="right">
                  <Text size="sm">৳{displayUnitPrice.toFixed(2)}</Text>
                </Table.Td>

                <Table.Td ta="right">
                  <Text size="sm" fw={700} c="blue">
                    ৳{landedCost.toFixed(2)}
                  </Text>
                </Table.Td>

                <Table.Td ta="right">
                  <Stack gap={0}>
                    <Text size="sm" c={adjustment > 0 ? 'orange' : adjustment < 0 ? 'green' : 'dimmed'} fw={500}>
                      {adjustment !== 0 ? (adjustment > 0 ? '+' : '') : ''}৳{adjustment.toFixed(2)}
                    </Text>
                    {calc && (calc.shippingCost > 0 || calc.extraCostShare > 0) && (
                      <Text size="xs" c="dimmed">
                        Ship: ৳{calc.shippingCost.toFixed(2)}
                        {calc.extraCostShare > 0 && ` + Extra: ৳${calc.extraCostShare.toFixed(2)}`}
                      </Text>
                    )}
                  </Stack>
                </Table.Td>

                <Table.Td ta="right">
                  <Text size="sm" fw={700} c="violet">
                    ৳{(landedCost * receivedQty).toFixed(2)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea.Autosize>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Receiving Modal Component - Redesigned with Weight-Based Cost Distribution
 */
export default function ReceivingModal({
  opened,
  onClose,
  onSubmit,
  items,
  exchangeRate,
  poNumber,
  totalWeight,
  shippingCostPerKg,
}: ReceivingModalProps) {
  const { t } = useTranslation()

  // ============================================================================
  // STATE
  // ============================================================================

  const [submitting, setSubmitting] = useState(false)
  const [extraCost, setExtraCost] = useState(0)
  const [comments, setComments] = useState('')
  const [itemInputs, setItemInputs] = useState<Record<number, ItemInput>>({})

  // ============================================================================
  // MEMOIZED CALCULATIONS
  // ============================================================================

  // Initialize inputs when modal opens
  useEffect(() => {
    if (opened && items.length > 0) {
      const defaults: Record<number, ItemInput> = {}

      items.forEach((item) => {
        defaults[item.id] = {
          received_quantity: toSafeNumber(item.quantity),
          unit_weight: toSafeNumber(item.unitWeight) || 0,
          extra_weight: 0, // Start at 0, will be auto-calculated when unit weights are entered
          // Use item's individual shipping_cost_per_kg from database, fallback to global default
          shipping_cost_per_kg: toSafeNumber(item.shippingCostPerKg) || shippingCostPerKg,
        }
      })
      setItemInputs(defaults)
    }
  }, [opened, items, shippingCostPerKg])

  // Auto-calculate extra weights when unit weights change
  const unitWeightsString = JSON.stringify(items.map(item => ({
    id: item.id,
    unit_weight: itemInputs[item.id]?.unit_weight || 0,
    received_quantity: itemInputs[item.id]?.received_quantity || item.quantity
  })))

  useEffect(() => {
    if (opened && items.length > 0 && Object.keys(itemInputs).length > 0) {
      // Check if all items have unit weights > 0
      const allHaveUnitWeights = items.every(item => {
        const input = itemInputs[item.id]
        return input && input.unit_weight > 0
      })

      if (allHaveUnitWeights) {
        // Calculate total extra weight to distribute
        const totalWeightG = totalWeight * 1000 // Convert kg to g
        const totalItemsWeightG = items.reduce((sum, item) => {
          const input = itemInputs[item.id]
          return sum + (input?.unit_weight || 0) * (input?.received_quantity || item.quantity)
        }, 0)
        const extraWeightG = Math.max(0, totalWeightG - totalItemsWeightG)

        console.log('🐛 Auto-calculating extra weights:', {
          totalWeightKg: totalWeight,
          totalItemsWeightG: totalItemsWeightG / 1000,
          extraWeightG: extraWeightG,
          extraWeightKg: extraWeightG / 1000
        })

        // Update extra weights for all items
        setItemInputs(prev => {
          const updated = { ...prev }
          let needsUpdate = false

          items.forEach(item => {
            const input = updated[item.id]
            if (input && totalItemsWeightG > 0) {
              const itemTotalWeightG = input.unit_weight * input.received_quantity
              const weightRatio = itemTotalWeightG / totalItemsWeightG
              const extraWeightShareG = extraWeightG * weightRatio
              const extraWeightPerUnitG = input.received_quantity > 0 ? Math.round(extraWeightShareG / input.received_quantity) : 0

              // Only update if value changed
              if (input.extra_weight !== extraWeightPerUnitG) {
                console.log(`🐛 Item ${item.id}:`, {
                  unitWeight: input.unit_weight,
                  receivedQty: input.received_quantity,
                  weightRatio: (weightRatio * 100).toFixed(2) + '%',
                  oldExtraWeight: input.extra_weight,
                  newExtraWeight: extraWeightPerUnitG
                })

                updated[item.id] = {
                  ...input,
                  extra_weight: extraWeightPerUnitG
                }
                needsUpdate = true
              }
            }
          })

          // Only update state if something changed
          return needsUpdate ? updated : prev
        })
      }
    }
  }, [opened, items, totalWeight, unitWeightsString])

  /**
   * Calculate weight breakdown
   */
  const weightCalc = useMemo(() => {
    if (Object.keys(itemInputs).length === 0) {
      return {
        totalWeightKg: totalWeight,
        totalItemsWeightG: 0,
        totalItemsWeightKg: 0,
        extraWeightG: 0,
        extraWeightKg: 0,
      }
    }
    return calculateWeightBreakdown(items, itemInputs, totalWeight)
  }, [items, itemInputs, totalWeight])

  /**
   * Calculate item breakdowns with cost distribution
   */
  const itemCalculations = useMemo(() => {
    const calcs: Record<number, ItemCalculation> = {}

    if (Object.keys(itemInputs).length === 0) {
      return calcs
    }

    items.forEach((item) => {
      const input = itemInputs[item.id]
      if (input && input.unit_weight > 0) {
        calcs[item.id] = calculateItemBreakdown(
          item,
          input,
          weightCalc,
          extraCost,
          exchangeRate
        )
      }
    })

    return calcs
  }, [items, itemInputs, weightCalc, extraCost, exchangeRate])

  /**
   * Calculate overall statistics
   */
  const overallStats = useMemo(() => {
    return calculateOverallStats(Object.values(itemCalculations))
  }, [itemCalculations])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles item input changes
   */
  const handleInputChange = useCallback(
    (itemId: number, field: keyof ItemInput, value: number) => {
      setItemInputs((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [field]: toSafeNumber(value),
        },
      }))
    },
    []
  )

  /**
   * Validates and submits the receiving data
   */
  const handleSubmit = useCallback(async () => {
    // Validate inputs
    const validation = validateItemInputs(items, itemInputs, weightCalc)

    if (!validation.isValid) {
      const firstError = validation.errors[0]
      notifications.show({
        title: t('common.error'),
        message: firstError.message,
        color: 'red',
      })
      return
    }

    // Check if all items have calculations
    const itemsWithoutCalc = items.filter(item => !itemCalculations[item.id])
    if (itemsWithoutCalc.length > 0) {
      notifications.show({
        title: t('common.error'),
        message: 'Please complete all item inputs before submitting',
        color: 'red',
      })
      return
    }

    // Prepare submission data
    const hasAnyLostItems = Object.values(itemCalculations).some(calc => calc.lostQty > 0)
    const hasAnyFoundItems = Object.values(itemCalculations).some(calc => calc.foundQty > 0)
    const isPartiallyCompleted = hasAnyLostItems || hasAnyFoundItems

    const submitData: ReceivingData = {
      extra_cost: toSafeNumber(extraCost),
      total_weight: totalWeight,
      is_partial_completion: isPartiallyCompleted,
      comments: comments.trim() || undefined,
      items: items.map((item) => {
        const calc = itemCalculations[item.id]
        const input = itemInputs[item.id]
        return {
          id: item.id,
          received_quantity: toSafeNumber(input?.received_quantity, item.quantity),
          unit_weight: toSafeNumber(input?.unit_weight),
          extra_weight: toSafeNumber(input?.extra_weight), // Use user input
          shipping_cost_per_kg: toSafeNumber(input?.shipping_cost_per_kg),
          final_unit_cost: toSafeNumber(calc?.finalUnitCost),
        }
      }),
    }

    try {
      setSubmitting(true)
      await onSubmit(submitData)
      onClose()
    } catch (error: any) {
      console.error('Failed to submit receiving:', error)
      // Error handling is done in the parent component
    } finally {
      setSubmitting(false)
    }
  }, [items, itemInputs, itemCalculations, weightCalc, extraCost, totalWeight, comments, onSubmit, onClose, t])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="95%"
      title={
        <Group gap="xs" align="center">
          <IconPackage size={20} />
          <Text fw={600}>Receive Goods - {poNumber}</Text>
          {totalWeight > 0 && (
            <>
              <Text c="dimmed">•</Text>
              <Text size="sm" c="blue" fw={500}>{totalWeight} kg</Text>
            </>
          )}
        </Group>
      }
      styles={{
        title: { fontSize: '1.2rem' },
      }}
    >
      <Stack gap="md">
        {/* Summary Alert */}
        <SummaryAlert stats={overallStats} calculations={itemCalculations} t={t} />

        {/* Extra Cost Input */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <IconCoin size={18} style={{ color: '#228BE6' }} />
              <Text fw={600} size="sm">Extra Cost (BDT)</Text>
            </Group>
            <Group gap="xs" wrap="nowrap">
              <Text size="sm" fw={600} c="dimmed">৳</Text>
              <NumberInput
                value={extraCost}
                onChange={(val) => setExtraCost(toSafeNumber(val))}
                min={0}
                style={{ width: 180 }}
                size="md"
                disabled={submitting}
                decimalScale={2}
              />
            </Group>
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            Additional costs (customs, handling, etc.) - will be distributed to items by weight ratio
          </Text>
        </Paper>

        {/* Items Table */}
        <Paper withBorder p="md" radius="md">
          <ItemsTable
            items={items}
            calculations={itemCalculations}
            itemInputs={itemInputs}
            submitting={submitting}
            onInputChange={handleInputChange}
            exchangeRate={exchangeRate}
            t={t}
          />
        </Paper>

        {/* Cost Summary */}
        <Paper withBorder p="md" radius="md" bg="gray.0">
          <Stack gap="xs">
            <Group gap="xs">
              <IconReceipt size={16} />
              <Text size="sm" fw={600}>Cost Summary</Text>
            </Group>
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Stack gap={0}>
                <Text size="xs" c="dimmed">Total Original Value</Text>
                <Text size="lg" fw={700}>৳{overallStats.totalOriginalValueBdt.toFixed(2)}</Text>
              </Stack>
              <Stack gap={0}>
                <Text size="xs" c="dimmed">Total Landed Value</Text>
                <Text size="lg" fw={700} c="blue">৳{overallStats.totalLandedValueBdt.toFixed(2)}</Text>
              </Stack>
            </SimpleGrid>
          </Stack>
        </Paper>

        {/* Comments Field */}
        <Textarea
          label="Notes"
          placeholder="Add any notes about this receiving..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          minRows={2}
          maxRows={4}
          disabled={submitting}
        />

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            color={
              Object.values(itemCalculations).some(calc => calc.lostQty > 0 || calc.foundQty > 0)
                ? 'orange'
                : 'teal'
            }
          >
            {Object.values(itemCalculations).some(calc => calc.lostQty > 0 || calc.foundQty > 0)
              ? 'Confirm Partial Reception'
              : 'Confirm Reception'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
