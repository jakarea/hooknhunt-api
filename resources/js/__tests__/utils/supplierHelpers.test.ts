/**
 * Pure helper functions tests for Suppliers.
 *
 * Run with: npm test
 */

import { describe, it, expect } from '@jest/globals'
import type { Supplier } from '@/types/supplier'
import {
  isSupplierActive,
  getSupplierStatusLabel,
  getSupplierStatusColor,
  formatWalletBalance,
  hasSufficientBalance,
  getAvailableCredit,
  getPrimaryContact,
  hasWhatsApp,
  getWhatsAppLink,
  hasWeChatPay,
  hasAlipay,
  getPaymentMethods,
  hasShopInfo,
  getShopDisplayName,
  isValidShopUrl,
  supplierMatchesSearch,
  filterSuppliersBySearch,
  filterSuppliersByStatus,
  sortSuppliersByName,
  sortSuppliersByDate,
  getSupplierDisplayText,
  getSupplierInitials,
  truncateSupplierName,
  isSupplierComplete,
  getSupplierCompleteness,
  areSuppliersEqual,
  getSupplierChanges,
} from '@/utils/supplierHelpers'

describe('Supplier Status Helpers', () => {
  const activeSupplier: Supplier = {
    id: 1,
    name: 'Test Supplier',
    email: 'test@example.com',
    phone: '123456',
    whatsapp: null,
    shopName: null,
    shopUrl: null,
    contactPerson: null,
    wechatId: null,
    wechatQrUrl: null,
    wechatQrFile: null,
    alipayId: null,
    alipayQrUrl: null,
    alipayQrFile: null,
    address: null,
    isActive: true,
    walletBalance: 1000,
    creditLimit: 5000,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  }

  const inactiveSupplier: Supplier = {
    ...activeSupplier,
    isActive: false,
  }

  it('should check if supplier is active', () => {
    expect(isSupplierActive(activeSupplier)).toBe(true)
    expect(isSupplierActive(inactiveSupplier)).toBe(false)
  })

  it('should get supplier status label', () => {
    expect(getSupplierStatusLabel(activeSupplier)).toBe('Active')
    expect(getSupplierStatusLabel(inactiveSupplier)).toBe('Inactive')
  })

  it('should get supplier status color', () => {
    expect(getSupplierStatusColor(activeSupplier)).toBe('green')
    expect(getSupplierStatusColor(inactiveSupplier)).toBe('gray')
  })
})

describe('Supplier Wallet Helpers', () => {
  it('should format wallet balance', () => {
    expect(formatWalletBalance(1234.56)).toBe('৳1234.56')
    expect(formatWalletBalance(0)).toBe('৳0.00')
    expect(formatWalletBalance(100, '$')).toBe('$100.00')
  })

  it('should check sufficient balance', () => {
    const supplier: Supplier = {
      id: 1,
      name: 'Test',
      email: 'test@example.com',
      phone: null,
      whatsapp: null,
      shopName: null,
      shopUrl: null,
      contactPerson: null,
      wechatId: null,
      wechatQrUrl: null,
      wechatQrFile: null,
      alipayId: null,
      alipayQrUrl: null,
      alipayQrFile: null,
      address: null,
      isActive: true,
      walletBalance: 100,
      creditLimit: 500,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    expect(hasSufficientBalance(supplier, 50)).toBe(true)
    expect(hasSufficientBalance(supplier, 150)).toBe(false)
  })

  it('should calculate available credit', () => {
    const supplier: Supplier = {
      id: 1,
      name: 'Test',
      email: 'test@example.com',
      phone: null,
      whatsapp: null,
      shopName: null,
      shopUrl: null,
      contactPerson: null,
      wechatId: null,
      wechatQrUrl: null,
      wechatQrFile: null,
      alipayId: null,
      alipayQrUrl: null,
      alipayQrFile: null,
      address: null,
      isActive: true,
      walletBalance: 100,
      creditLimit: 500,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    expect(getAvailableCredit(supplier)).toBe(400)
  })
})

describe('Supplier Contact Helpers', () => {
  it('should get primary contact', () => {
    const supplierWithEmail: Supplier = {
      id: 1,
      name: 'Test',
      email: 'test@example.com',
      phone: null,
      whatsapp: null,
      shopName: null,
      shopUrl: null,
      contactPerson: null,
      wechatId: null,
      wechatQrUrl: null,
      wechatQrFile: null,
      alipayId: null,
      alipayQrUrl: null,
      alipayQrFile: null,
      address: null,
      isActive: true,
      walletBalance: 0,
      creditLimit: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    const supplierWithPhone: Supplier = {
      ...supplierWithEmail,
      email: '',
      phone: '123456',
    }

    expect(getPrimaryContact(supplierWithEmail)).toBe('test@example.com')
    expect(getPrimaryContact(supplierWithPhone)).toBe('123456')
  })

  it('should check if supplier has WhatsApp', () => {
    const withWhatsApp: Supplier = {
      id: 1,
      name: 'Test',
      email: 'test@example.com',
      phone: null,
      whatsapp: '123456',
      shopName: null,
      shopUrl: null,
      contactPerson: null,
      wechatId: null,
      wechatQrUrl: null,
      wechatQrFile: null,
      alipayId: null,
      alipayQrUrl: null,
      alipayQrFile: null,
      address: null,
      isActive: true,
      walletBalance: 0,
      creditLimit: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    const withoutWhatsApp: Supplier = {
      ...withWhatsApp,
      whatsapp: null,
    }

    expect(hasWhatsApp(withWhatsApp)).toBe(true)
    expect(hasWhatsApp(withoutWhatsApp)).toBe(false)
  })

  it('should get WhatsApp link', () => {
    const supplier: Supplier = {
      id: 1,
      name: 'Test',
      email: 'test@example.com',
      phone: null,
      whatsapp: '1234567890',
      shopName: null,
      shopUrl: null,
      contactPerson: null,
      wechatId: null,
      wechatQrUrl: null,
      wechatQrFile: null,
      alipayId: null,
      alipayQrUrl: null,
      alipayQrFile: null,
      address: null,
      isActive: true,
      walletBalance: 0,
      creditLimit: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    expect(getWhatsAppLink(supplier)).toBe('https://wa.me/1234567890')
  })
})

describe('Supplier Payment Helpers', () => {
  it('should check if supplier has WeChat Pay', () => {
    const withWeChat: Supplier = {
      id: 1,
      name: 'Test',
      email: 'test@example.com',
      phone: null,
      whatsapp: null,
      shopName: null,
      shopUrl: null,
      contactPerson: null,
      wechatId: 'abc123',
      wechatQrUrl: null,
      wechatQrFile: null,
      alipayId: null,
      alipayQrUrl: null,
      alipayQrFile: null,
      address: null,
      isActive: true,
      walletBalance: 0,
      creditLimit: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    const withoutWeChat: Supplier = {
      ...withWeChat,
      wechatId: null,
    }

    expect(hasWeChatPay(withWeChat)).toBe(true)
    expect(hasWeChatPay(withoutWeChat)).toBe(false)
  })

  it('should check if supplier has Alipay', () => {
    const withAlipay: Supplier = {
      id: 1,
      name: 'Test',
      email: 'test@example.com',
      phone: null,
      whatsapp: null,
      shopName: null,
      shopUrl: null,
      contactPerson: null,
      wechatId: null,
      wechatQrUrl: null,
      wechatQrFile: null,
      alipayId: 'xyz789',
      alipayQrUrl: null,
      alipayQrFile: null,
      address: null,
      isActive: true,
      walletBalance: 0,
      creditLimit: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    const withoutAlipay: Supplier = {
      ...withAlipay,
      alipayId: null,
    }

    expect(hasAlipay(withAlipay)).toBe(true)
    expect(hasAlipay(withoutAlipay)).toBe(false)
  })

  it('should get payment methods', () => {
    const withBoth: Supplier = {
      id: 1,
      name: 'Test',
      email: 'test@example.com',
      phone: null,
      whatsapp: null,
      shopName: null,
      shopUrl: null,
      contactPerson: null,
      wechatId: 'abc',
      wechatQrUrl: null,
      wechatQrFile: null,
      alipayId: 'xyz',
      alipayQrUrl: null,
      alipayQrFile: null,
      address: null,
      isActive: true,
      walletBalance: 0,
      creditLimit: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    const methods = getPaymentMethods(withBoth)
    expect(methods).toContain('wechat')
    expect(methods).toContain('alipay')
    expect(methods).toContain('wallet')
    expect(methods).toContain('bank')
  })
})

describe('Supplier Shop Helpers', () => {
  it('should check if supplier has shop info', () => {
    const withShop: Supplier = {
      id: 1,
      name: 'Test',
      email: 'test@example.com',
      phone: null,
      whatsapp: null,
      shopName: 'My Shop',
      shopUrl: null,
      contactPerson: null,
      wechatId: null,
      wechatQrUrl: null,
      wechatQrFile: null,
      alipayId: null,
      alipayQrUrl: null,
      alipayQrFile: null,
      address: null,
      isActive: true,
      walletBalance: 0,
      creditLimit: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    const withoutShop: Supplier = {
      ...withShop,
      shopName: null,
    }

    expect(hasShopInfo(withShop)).toBe(true)
    expect(hasShopInfo(withoutShop)).toBe(false)
  })

  it('should get shop display name', () => {
    const withShopName: Supplier = {
      id: 1,
      name: 'John Doe',
      email: 'test@example.com',
      phone: null,
      whatsapp: null,
      shopName: 'My Shop',
      shopUrl: null,
      contactPerson: null,
      wechatId: null,
      wechatQrUrl: null,
      wechatQrFile: null,
      alipayId: null,
      alipayQrUrl: null,
      alipayQrFile: null,
      address: null,
      isActive: true,
      walletBalance: 0,
      creditLimit: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    const withoutShopName: Supplier = {
      ...withShopName,
      shopName: null,
    }

    expect(getShopDisplayName(withShopName)).toBe('My Shop')
    expect(getShopDisplayName(withoutShopName)).toBe('John Doe')
  })

  it('should validate shop URL', () => {
    expect(isValidShopUrl('https://example.com')).toBe(true)
    expect(isValidShopUrl('http://example.com')).toBe(true)
    expect(isValidShopUrl('not-a-url')).toBe(false)
    expect(isValidShopUrl('')).toBe(false)
  })
})

describe('Supplier Search/Filter Helpers', () => {
  const suppliers: Supplier[] = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123456',
      whatsapp: null,
      shopName: null,
      shopUrl: null,
      contactPerson: null,
      wechatId: null,
      wechatQrUrl: null,
      wechatQrFile: null,
      alipayId: null,
      alipayQrUrl: null,
      alipayQrFile: null,
      address: null,
      isActive: true,
      walletBalance: 0,
      creditLimit: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '789012',
      whatsapp: null,
      shopName: null,
      shopUrl: null,
      contactPerson: null,
      wechatId: null,
      wechatQrUrl: null,
      wechatQrFile: null,
      alipayId: null,
      alipayQrUrl: null,
      alipayQrFile: null,
      address: null,
      isActive: false,
      walletBalance: 0,
      creditLimit: 0,
      createdAt: '2024-01-02',
      updatedAt: '2024-01-02',
    },
  ]

  it('should check if supplier matches search', () => {
    expect(supplierMatchesSearch(suppliers[0], 'john')).toBe(true)
    expect(supplierMatchesSearch(suppliers[0], 'JOHN')).toBe(true)
    expect(supplierMatchesSearch(suppliers[0], '123456')).toBe(true)
    expect(supplierMatchesSearch(suppliers[0], 'xyz')).toBe(false)
  })

  it('should filter suppliers by search', () => {
    const filtered = filterSuppliersBySearch(suppliers, 'john')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('John Doe')
  })

  it('should filter suppliers by status', () => {
    const active = filterSuppliersByStatus(suppliers, true)
    expect(active).toHaveLength(1)
    expect(active[0].isActive).toBe(true)

    const inactive = filterSuppliersByStatus(suppliers, false)
    expect(inactive).toHaveLength(1)
    expect(inactive[0].isActive).toBe(false)
  })

  it('should sort suppliers by name', () => {
    const sorted = sortSuppliersByName(suppliers, 'asc')
    expect(sorted[0].name).toBe('Jane Smith')
    expect(sorted[1].name).toBe('John Doe')
  })

  it('should sort suppliers by date', () => {
    const sorted = sortSuppliersByDate(suppliers, 'desc')
    expect(sorted[0].name).toBe('Jane Smith')
    expect(sorted[1].name).toBe('John Doe')
  })
})

describe('Supplier Display Helpers', () => {
  const supplier: Supplier = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '123456',
    whatsapp: null,
    shopName: null,
    shopUrl: null,
    contactPerson: null,
    wechatId: null,
    wechatQrUrl: null,
    wechatQrFile: null,
    alipayId: null,
    alipayQrUrl: null,
    alipayQrFile: null,
    address: null,
    isActive: true,
    walletBalance: 0,
    creditLimit: 0,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  }

  it('should get supplier display text', () => {
    expect(getSupplierDisplayText(supplier)).toBe('John Doe (john@example.com)')
  })

  it('should get supplier initials', () => {
    expect(getSupplierInitials(supplier)).toBe('JD')
  })

  it('should truncate supplier name', () => {
    const longName: Supplier = {
      ...supplier,
      name: 'Very Long Supplier Name That Should Be Truncated',
    }

    expect(truncateSupplierName(longName, 20)).toBe('Very Long Supplier...')
    expect(truncateSupplierName(supplier, 20)).toBe('John Doe')
  })
})

describe('Supplier Validation Helpers', () => {
  it('should check if supplier is complete', () => {
    const complete: Partial<Supplier> = {
      id: 1,
      name: 'John',
      email: 'john@example.com',
      isActive: true,
      phone: null,
      whatsapp: null,
      shopName: null,
      shopUrl: null,
      contactPerson: null,
      wechatId: null,
      wechatQrUrl: null,
      wechatQrFile: null,
      alipayId: null,
      alipayQrUrl: null,
      alipayQrFile: null,
      address: null,
      walletBalance: 0,
      creditLimit: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    const incomplete: Partial<Supplier> = {
      ...complete,
      name: '',
    }

    expect(isSupplierComplete(complete)).toBe(true)
    expect(isSupplierComplete(incomplete)).toBe(false)
  })

  it('should calculate supplier completeness', () => {
    const supplier: Partial<Supplier> = {
      id: 1,
      name: 'John',
      email: 'john@example.com',
      phone: '123456',
      isActive: true,
      whatsapp: null,
      shopName: null,
      shopUrl: null,
      contactPerson: null,
      wechatId: null,
      wechatQrUrl: null,
      wechatQrFile: null,
      alipayId: null,
      alipayQrUrl: null,
      alipayQrFile: null,
      address: null,
      walletBalance: 0,
      creditLimit: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    const completeness = getSupplierCompleteness(supplier)
    expect(completeness).toBeGreaterThan(0)
    expect(completeness).toBeLessThanOrEqual(100)
  })
})

describe('Supplier Comparison Helpers', () => {
  const supplier1: Supplier = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '123456',
    whatsapp: null,
    shopName: null,
    shopUrl: null,
    contactPerson: null,
    wechatId: null,
    wechatQrUrl: null,
    wechatQrFile: null,
    alipayId: null,
    alipayQrUrl: null,
    alipayQrFile: null,
    address: null,
    isActive: true,
    walletBalance: 0,
    creditLimit: 0,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  }

  const supplier2: Supplier = {
    ...supplier1,
    id: 2,
  }

  const supplier3: Supplier = {
    ...supplier1,
    name: 'Jane Doe',
  }

  it('should compare suppliers for equality', () => {
    expect(areSuppliersEqual(supplier1, supplier2)).toBe(true)
    expect(areSuppliersEqual(supplier1, supplier3)).toBe(false)
  })

  it('should get changed fields', () => {
    const changes = getSupplierChanges(supplier1, { name: 'Jane Doe' })
    expect(changes).toContain('name')

    const noChanges = getSupplierChanges(supplier1, {})
    expect(noChanges).toHaveLength(0)
  })
})
