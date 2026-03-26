export default {
  title: 'Procurement',
  suppliers: 'Suppliers',
  orders: 'Orders',
  purchaseOrders: 'Purchase Orders',
  createPO: 'Create PO',
  purchaseReturns: 'Purchase Returns',
  returns: 'Purchase Returns',
  products: 'Products',

  // Suppliers Page
  suppliersPage: {
    title: 'Suppliers',
    subtitle: 'Manage supplier information and contacts',
    addSupplier: 'Add Supplier',
    searchPlaceholder: 'Search suppliers by name, email, or phone...',
    filterAll: 'All',
    filterActive: 'Active',
    filterInactive: 'Inactive',
    noSuppliersFound: 'No suppliers found',
    active: 'Active',
    inactive: 'Inactive',
    shopName: 'Shop Name',
    tableHeaders: {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      whatsapp: 'WhatsApp',
      shopName: 'Shop',
      contactPerson: 'Contact Person',
      status: 'Status',
      actions: 'Actions'
    },
    actions: {
      view: 'View',
      edit: 'Edit',
      delete: 'Delete'
    },
    details: {
      loading: 'Loading...',
      notFound: 'Supplier not found',
      error: 'Error',
      companyName: 'Company Name',
      website: 'Website',
      wechatPay: 'WeChat Pay',
      alipay: 'Alipay',
      qrCode: 'QR Code',
      wechatId: 'WeChat ID',
      alipayId: 'Alipay ID',
      lostItemsHistory: 'Lost Items History',
      loadingLostItems: 'Loading lost items...',
      noLostItems: 'No lost items found for this supplier',
      productsLinked: 'Products linked to this supplier',
      loadingProducts: 'Loading products...',
      noProductsLinked: 'No products linked to this supplier yet',
      cost: 'Cost',
      sku: 'SKU',
      lost: 'Lost',
      orderNumber: 'Order',
      orderDate: 'Order Date',
      lostQuantity: 'Lost Quantity',
      lostCost: 'Lost Cost'
    },
    form: {
      title: 'Supplier Information',
      basicInfo: 'Basic Information',
      contactInfo: 'Contact Information',
      paymentInfo: 'Payment Information',
      shopInfo: 'Shop Information',
      name: 'Supplier Name',
      namePlaceholder: 'Enter supplier name',
      namePlaceholderExample: 'e.g., Shenzhen Electronics Co.',
      nameDescription: 'Official company or supplier name',
      email: 'Email',
      emailPlaceholder: 'email@company.com',
      emailDescription: 'Business email address',
      phone: 'Phone Number',
      phonePlaceholder: 'Enter phone number',
      phoneDescription: 'Primary contact phone',
      whatsapp: 'WhatsApp Number',
      whatsappPlaceholder: 'Enter WhatsApp number',
      whatsappDescription: 'For quick communication',
      contactPerson: 'Contact Person',
      contactPersonPlaceholder: 'Name of contact person',
      contactPersonDescription: 'Primary point of contact',
      shopName: 'Shop Name',
      shopNamePlaceholder: 'Enter shop name',
      shopNamePlaceholderSimple: 'Shop or store name',
      shopNameDescription: "Supplier's shop or store name",
      shopUrl: 'Shop URL',
      shopUrlPlaceholder: 'https://example.com',
      shopUrlDescription: 'Online shop website link',
      wechatId: 'WeChat ID',
      wechatIdPlaceholder: 'Enter WeChat ID',
      wechatIdPlaceholderSimple: 'WeChat Pay ID',
      wechatIdDescription: 'WeChat identification for payment',
      wechatQrFile: 'WeChat QR Code',
      wechatQrFilePlaceholder: 'Upload QR code image',
      wechatQrFileDescription: 'Upload WeChat payment QR code',
      wechatQrUrl: 'WeChat QR Code URL',
      wechatQrUrlPlaceholder: 'https://example.com/qr.jpg',
      wechatQrUrlDescription: 'Link to WeChat QR code image',
      alipayId: 'Alipay ID',
      alipayIdPlaceholder: 'Enter Alipay ID',
      alipayIdPlaceholderSimple: 'Alipay account ID',
      alipayIdDescription: 'Alipay identification for payment',
      alipayQrFile: 'Alipay QR Code',
      alipayQrFilePlaceholder: 'Upload QR code image',
      alipayQrFileDescription: 'Upload Alipay payment QR code',
      alipayQrUrl: 'Alipay QR Code URL',
      alipayQrUrlPlaceholder: 'https://example.com/qr.jpg',
      alipayQrUrlDescription: 'Link to Alipay QR code image',
      address: 'Address',
      addressPlaceholder: 'Enter full address',
      addressPlaceholderSimple: 'Complete business address',
      addressDescription: 'Complete business address',
      isActive: 'Active Supplier',
      isActiveDescription: 'Enable this supplier for orders',
      isActiveDescriptionSimple: 'Enable this supplier for placing orders',
      create: 'Create Supplier',
      update: 'Update Supplier',
      cancel: 'Cancel',
      validation: {
        nameRequired: 'Supplier name is required',
        emailRequired: 'Email is required',
        emailInvalid: 'Please enter a valid email address',
        urlInvalid: 'Please enter a valid URL'
      }
    },
    notifications: {
      loading: 'Loading suppliers...',
      refreshed: 'Refreshed',
      refreshedMessage: 'Suppliers list refreshed',
      created: 'Supplier Created',
      createdMessage: '{{name}} has been successfully created',
      updated: 'Supplier Updated',
      updatedMessage: '{{name}} has been successfully updated',
      deleted: 'Supplier Deleted',
      deletedMessage: '{{name}} has been successfully deleted',
      errorLoading: 'Failed to load suppliers. Please try again.',
      errorCreating: 'Failed to create supplier. Please try again.',
      errorUpdating: 'Failed to update supplier. Please try again.',
      errorDeleting: 'Failed to delete supplier. Please try again.',
      deleteConfirm: 'Delete Supplier?',
      deleteConfirmMessage: 'Are you sure you want to delete {{name}}? This action cannot be undone.'
    },
    viewSupplier: 'View Details',
    products: 'Products',
    drawer: {
      createTitle: 'Add New Supplier',
      updateTitle: 'Edit Supplier',
      createDescription: 'Add a new supplier to your procurement network',
      updateDescription: 'Update supplier information and contact details',
      website: 'Website',
      wechatPay: 'WeChat Pay',
      alipay: 'Alipay',
      removePreview: 'Remove preview',
      uploadQrCode: 'Upload QR code image'
    }
  },

  // Returns Page
  returnsPage: {
    title: 'Purchase Returns',
    subtitle: 'Manage purchase returns and refunds'
  },

  // Products Page
  productsPage: {
    title: 'Procurement Products',
    subtitle: 'Manage products for purchase from suppliers',
    addProduct: 'Add Product',
    editProduct: 'Edit Product',
    name: 'Name',
    namePlaceholder: 'Enter product name',
    category: 'Category',
    brand: 'Brand',
    suppliers: 'Suppliers',
    status: 'Status',
    basicInfo: 'Basic Information',
    selectCategory: 'Select category',
    selectBrand: 'Select brand',
    selectThumbnail: 'Select Thumbnail',
    changeThumbnail: 'Change Thumbnail',
    selectSupplier: 'Select supplier',
    costPrice: 'Cost Price',
    supplierSku: 'Supplier SKU',
    productLinks: 'Product URLs',
    noSuppliers: 'No suppliers added yet',
    supplier: 'Supplier',
    productId: 'Product ID',
    productInfo: 'Product Information',
    thumbnail: 'Thumbnail',
    slug: 'Slug',
    productUrls: 'Product URLs',
    noProductUrls: 'No product URLs added',
    viewSupplier: 'View Details',
    statusOptions: {
      draft: 'Draft',
      published: 'Published'
    }
  },

  // Orders List Page
  ordersPage: {
    title: 'Purchase Orders',
    subtitle: 'Manage purchase orders from Chinese suppliers',
    statistics: {
      totalOrders: 'Total Orders',
      draftOrders: 'Draft Orders',
      activeOrders: 'Active Orders',
      completedOrders: 'Completed Orders',
      totalValueRmb: 'Total Value (RMB)'
    },
    filters: {
      title: 'Filters',
      status: 'Status',
      allStatuses: 'All Statuses',
      supplier: 'Supplier',
      allSuppliers: 'All Suppliers',
      search: 'Search',
      searchPlaceholder: 'PO number',
      fromDate: 'From Date',
      toDate: 'To Date'
    },
    statuses: {
      draft: 'Draft',
      paymentConfirmed: 'Payment Confirmed',
      supplierDispatched: 'Supplier Dispatched',
      warehouseReceived: 'Warehouse Received',
      shippedBd: 'Shipped to BD',
      arrivedBd: 'Arrived BD',
      inTransitBogura: 'In Transit to Bogura',
      receivedHub: 'Received at Hub',
      partiallyCompleted: 'Partially Completed',
      completed: 'Completed',
      lost: 'Lost'
    },
    tableHeaders: {
      poNumber: 'PO Number',
      supplier: 'Supplier',
      orderDate: 'Order Date',
      status: 'Status',
      totalRmb: 'Total (RMB)',
      totalBdt: 'Total (BDT)',
      items: 'Items',
      actions: 'Actions'
    },
    actions: {
      view: 'View',
      edit: 'Edit',
      delete: 'Delete'
    },
    notifications: {
      loading: 'Loading orders...',
      refreshed: 'Data refreshed',
      noOrdersFound: 'No purchase orders found',
      created: 'Purchase order created successfully',
      updated: 'Purchase order updated successfully',
      deleted: 'Purchase order deleted successfully',
      errorLoading: 'Failed to load purchase orders',
      errorCreating: 'Failed to create purchase order',
      errorUpdating: 'Failed to update purchase order',
      errorDeleting: 'Failed to delete purchase order'
    },
    deleteConfirm: {
      title: 'Delete Purchase Order?',
      message: 'Are you sure you want to delete {{poNumber}}?',
      warning: 'This action cannot be undone. All order data will be permanently removed.',
      cancel: 'Cancel',
      confirm: 'Delete'
    },
    details: {
      title: 'Purchase Order Details',
      orderInformation: 'Order Information',
      orderDate: 'Order Date',
      expectedDate: 'Expected Date',
      exchangeRate: 'Exchange Rate',
      courierTracking: 'Courier / Tracking',
      lotNumber: 'Lot Number',
      bdTracking: 'BD Tracking',
      statusTimeline: 'Status Timeline',
      orderItems: 'Order Items',
      items: 'Items ({{count}})',
      product: 'Product',
      quantity: 'Quantity',
      unitPrice: 'Unit Price (RMB)',
      total: 'Total',
      shippingCost: 'Shipping Cost',
      totals: {
        itemsTotalRmb: 'Items Total (RMB)',
        itemsTotalBdt: 'Items Total (BDT)',
        shippingCost: 'Shipping Cost',
        itemShippingCosts: 'Item Shipping Costs',
        extraCost: 'Extra Cost',
        grandTotal: 'Grand Total',
        note: '* Additional costs will be added as order progresses'
      },
      alerts: {
        draft: 'This order is in Draft status. You can still edit the order items and details. Once you confirm the order, it will be locked and the PO number will be generated.',
        partiallyCompleted: 'This order has been partially completed. Some items were missing during receiving. The order has been processed with the received quantities and refunds have been auto-credited to the supplier wallet. The order is now locked and cannot be modified.',
        completed: 'This order has been completed. All status updates and inventory have been processed. The order is now locked and cannot be modified.'
      },
      actions: {
        editOrder: 'Edit Order',
        back: 'Back',
        confirmOrder: 'Confirm Order',
        nextStatus: 'Next: {{status}}',
        approveStock: 'Approve & Stock',
        approveConfirm: {
          title: 'Approve & Stock Order?',
          message: 'Are you sure you want to approve {{poNumber}} and update inventory?',
          warning: 'This will process the received items and update stock levels. This action cannot be undone.',
          partialWarning: 'This order was partially completed with some missing items. Only the received quantities will be stocked.',
          cancel: 'Cancel',
          confirm: 'Approve & Stock'
        },
        editComments: 'Edit Comments',
        editData: {
          title: 'Edit {{status}} Data',
          success: 'Data updated successfully'
        }
      },
      statusUpdate: {
        draft: {
          title: 'Confirm Order',
          message: 'You are about to confirm this order. Please verify and set the CNY to BDT exchange rate. This rate will be used for all calculations and will update the currency table.',
          exchangeRate: 'Exchange Rate (¥1 = ৳?)',
          exchangeRateDescription: 'How much ৳ (BDT) for ¥1 (CNY)?'
        },
        paymentConfirmed: {
          title: 'Supplier Dispatching',
          message: 'Supplier is dispatching the order. Please enter the international courier details.',
          courierName: 'Courier Name',
          courierPlaceholder: 'DHL, FedEx, UPS, etc.',
          trackingNumber: 'Tracking Number',
          trackingPlaceholder: 'International tracking number'
        },
        warehouseReceived: {
          title: 'Ship to Bangladesh',
          message: 'Shipment is being sent to Bangladesh. Please enter the lot number for tracking.',
          lotNumber: 'Lot Number',
          lotPlaceholder: 'e.g., LOT-202602-001'
        },
        shippedBd: {
          title: 'Arrived in Bangladesh',
          message: 'Goods have arrived in Bangladesh. Please enter the transport type and total shipping cost. This cost will be distributed across items by their price when calculating actual product cost.',
          transportType: 'Transport Type',
          selectTransport: 'Select transport type',
          byAir: 'By Air',
          byShip: 'By Ship',
          shippingCost: 'Total Shipping Cost (BDT)',
          shippingCostDescription: 'Total cost for this transport (will be distributed across items)',
          itemsList: 'Items in this order ({{count}}):',
          total: 'Total'
        },
        arrivedBd: {
          title: 'In Transit to Bogura',
          message: 'Goods are in transit to Bogura. Please enter the BD courier tracking number.',
          bdCourierTracking: 'BD Courier Tracking',
          bdPlaceholder: 'Pathao, Steadfast, RedX, etc.'
        },
        comments: 'Comments / Notes',
        commentsPlaceholder: 'Add any notes or comments about this status change...',
        commentsDescription: 'Optional: Document any important details, issues, or notes',
        update: 'Update Status',
        transitionDescription: 'Update order status to the next stage'
      }
    }
  },

  // Receiving Modal
  receivingModal: {
    title: 'Receive Goods - PO {{poNumber}}',
    validation: {
      error: 'Validation Error',
      unitWeightRequired: 'Please enter unit weight for {{productName}}'
    },
    summary: {
      title: 'Receiving Summary',
      manualReviewRequired: 'Manual Review Required',
      partialCompletion: 'Partial Completion',
      total: 'Total',
      units: 'units',
      received: 'Received',
      lost: 'Lost',
      found: 'Found',
      extra: 'extra',
      manualReviewWarning: '⚠️ Lost percentage exceeds 10% threshold. Refund of {{lostValue}} BDT requires manual review.',
      partialWarning: '⚠️ Some items are missing ({{lostUnits}} units). Order will be marked as <strong>Partially Completed</strong> and refund of {{lostValue}} BDT will be auto-credited to supplier wallet.',
      foundItemsInfo: '✓ {{foundUnits}} extra units received. Found items reduce cost proportionally.',
      autoCreditSuccess: '✓ Lost percentage within 10% threshold. Refund will be auto-credited to supplier wallet.'
    },
    extraCost: {
      label: 'Extra Cost (BDT)',
      description: 'Additional shipping, handling, or customs costs. Will be distributed across items by value ratio.'
    },
    shippingCost: {
      label: 'Shipping Cost (BDT)',
      description: 'Total shipping cost from China to Bangladesh. Will be distributed across received items by value ratio.'
    },
    table: {
      headers: {
        item: 'Item',
        ordered: 'Ordered',
        received: 'Received',
        lost: 'Lost',
        found: 'Found',
        unitWeight: 'Unit Weight (g)',
        extraWeight: 'Extra Weight (g)',
        originalCost: 'Original Cost',
        adjustment: 'Adjustment',
        finalCost: 'Final Cost'
      },
      chinaPrice: 'China Price'
    },
    costAdjustment: {
      title: 'Cost Adjustment (Lost Items Distributed)',
      itemBreakdown: 'Lost items value ({{lostValue}} BDT) has been distributed across {{receivedUnits}} received units. Adjustment per unit: ৳ {{adjustmentPerUnit}}',
      itemNote: 'Original cost: ৳ {{originalCost}} → Final cost: ৳ {{finalCost}} (Increase: ৳ {{increase}})'
    },
    costDistribution: {
      title: 'Cost Distribution Method',
      description: 'Extra cost is distributed across items based on their received value ratio (china_price × received_quantity). Final unit cost = china_price + (extra_cost ÷ received_quantity)'
    },
    actions: {
      cancel: 'Cancel',
      submitForReview: 'Submit for Review',
      confirmPartial: 'Confirm Partial Receipt',
      confirm: 'Confirm Receipt'
    },
    comments: {
      label: 'Comments',
      placeholder: 'Add any notes about this receiving (optional)',
      description: 'Optional: Document any important details, issues, or notes about this receiving'
    }
  },

  // Lost and Found Items Section
  lostAndFound: {
    title: 'Lost and Found Items',
    tableHeaders: {
      product: 'Product',
      ordered: 'Ordered',
      received: 'Received',
      lost: 'Lost',
      found: 'Found',
      unitPrice: 'Unit Price',
      lostCost: 'Lost Cost'
    },
    summary: {
      totalLostCost: 'Total Lost Items Cost',
      description: 'This amount represents the value of items that were lost during shipment'
    }
  }
}
