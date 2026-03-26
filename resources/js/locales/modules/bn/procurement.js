export default {
  title: 'ক্রয়',
  suppliers: 'সরবরাহকারী',
  orders: 'অর্ডার',
  purchaseOrders: 'ক্রয় অর্ডার',
  createPO: 'নতুন অর্ডার',
  purchaseReturns: 'ক্রয় ফেরত',
  returns: 'ক্রয় ফেরত',
  products: 'পণ্য',

  // Suppliers Page
  suppliersPage: {
    title: 'সরবরাহকারী',
    subtitle: 'সরবরাহকারী তথ্য এবং যোগাযোগ পরিচালনা করুন',
    addSupplier: 'সরবরাহকারী যোগ করুন',
    searchPlaceholder: 'নাম, ইমেইল বা ফোন দিয়ে সরবরাহকারী খুঁজুন...',
    filterAll: 'সব',
    filterActive: 'সক্রিয়',
    filterInactive: 'নিষ্ক্রিয়',
    noSuppliersFound: 'কোনো সরবরাহকারী পাওয়া যায়নি',
    active: 'সক্রিয়',
    inactive: 'নিষ্ক্রিয়',
    shopName: 'দোকানের নাম',
    tableHeaders: {
      name: 'নাম',
      email: 'ইমেইল',
      phone: 'ফোন',
      whatsapp: 'হোয়াটসঅ্যাপ',
      shopName: 'দোকান',
      contactPerson: 'যোগাযোগ ব্যক্তি',
      status: 'অবস্থা',
      actions: 'পদক্ষেপ'
    },
    actions: {
      view: 'দেখুন',
      edit: 'সম্পাদনা',
      delete: 'মুছুন'
    },
    details: {
      loading: 'লোড হচ্ছে...',
      notFound: 'সরবরাহকারী পাওয়া যায়নি',
      error: 'ত্রুটি',
      companyName: 'কোম্পানির নাম',
      website: 'ওয়েবসাইট',
      wechatPay: 'উইচ্যাট পে',
      alipay: 'আলিপে',
      qrCode: 'QR কোড',
      wechatId: 'উইচ্যাট আইডি',
      alipayId: 'আলিপে আইডি',
      lostItemsHistory: 'হারিয়ে যাওয়া আইটেমের ইতিহাস',
      loadingLostItems: 'হারিয়ে যাওয়া আইটেম লোড হচ্ছে...',
      noLostItems: 'এই সরবরাহকারীর জন্য কোনো হারিয়ে যাওয়া আইটেম পাওয়া যায়নি',
      productsLinked: 'এই সরবরাহকারীর সাথে যুক্ত পণ্য',
      loadingProducts: 'পণ্য লোড হচ্ছে...',
      noProductsLinked: 'এখনও কোনো পণ্য এই সরবরাহকারীর সাথে যুক্ত করা হয়নি',
      cost: 'খরচ',
      sku: 'SKU',
      lost: 'হারিয়েছে',
      orderNumber: 'অর্ডার',
      orderDate: 'অর্ডার তারিখ',
      lostQuantity: 'হারানো পরিমাণ',
      lostCost: 'হারানো খরচ'
    },
    form: {
      title: 'সরবরাহকারী তথ্য',
      basicInfo: 'মৌলিক তথ্য',
      contactInfo: 'যোগাযোগ তথ্য',
      paymentInfo: 'পেমেন্ট তথ্য',
      shopInfo: 'দোকান তথ্য',
      name: 'সরবরাহকারীর নাম',
      namePlaceholder: 'সরবরাহকারীর নাম লিখুন',
      namePlaceholderExample: 'যেমন, শেনজেন ইলেকট্রনিক্স কোম্পানি',
      nameDescription: 'অফিসিয়াল কোম্পানি বা সরবরাহকারীর নাম',
      email: 'ইমেইল',
      emailPlaceholder: 'email@company.com',
      emailDescription: 'ব্যবসায়িক ইমেইল ঠিকানা',
      phone: 'ফোন নম্বর',
      phonePlaceholder: 'ফোন নম্বর লিখুন',
      phoneDescription: 'প্রাথমিক যোগাযোগ ফোন',
      whatsapp: 'হোয়াটসঅ্যাপ নম্বর',
      whatsappPlaceholder: 'হোয়াটসঅ্যাপ নম্বর লিখুন',
      whatsappDescription: 'দ্রুত যোগাযোগের জন্য',
      contactPerson: 'যোগাযোগ ব্যক্তি',
      contactPersonPlaceholder: 'যোগাযোগ ব্যক্তির নাম',
      contactPersonDescription: 'প্রাথমিক যোগাযোগের ব্যক্তি',
      shopName: 'দোকানের নাম',
      shopNamePlaceholder: 'দোকানের নাম লিখুন',
      shopNamePlaceholderSimple: 'দোকান বা স্টোরের নাম',
      shopNameDescription: 'সরবরাহকারীর দোকান বা স্টোরের নাম',
      shopUrl: 'দোকানের URL',
      shopUrlPlaceholder: 'https://example.com',
      shopUrlDescription: 'অনলাইন দোকানের ওয়েবসাইট লিঙ্ক',
      wechatId: 'উইচ্যাট আইডি',
      wechatIdPlaceholder: 'উইচ্যাট আইডি লিখুন',
      wechatIdPlaceholderSimple: 'উইচ্যাট পে আইডি',
      wechatIdDescription: 'পেমেন্টের জন্য উইচ্যাট আইডেন্টিফিকেশন',
      wechatQrFile: 'উইচ্যাট QR কোড',
      wechatQrFilePlaceholder: 'QR কোড ইমেজ আপলোড করুন',
      wechatQrFileDescription: 'উইচ্যাট পেমেন্ট QR কোড আপলোড করুন',
      wechatQrUrl: 'উইচ্যাট QR কোড URL',
      wechatQrUrlPlaceholder: 'https://example.com/qr.jpg',
      wechatQrUrlDescription: 'উইচ্যাট QR কোড ইমেজের লিঙ্ক',
      alipayId: 'আলিপে আইডি',
      alipayIdPlaceholder: 'আলিপে আইডি লিখুন',
      alipayIdPlaceholderSimple: 'আলিপে অ্যাকাউন্ট আইডি',
      alipayIdDescription: 'পেমেন্টের জন্য আলিপে আইডেন্টিফিকেশন',
      alipayQrFile: 'আলিপে QR কোড',
      alipayQrFilePlaceholder: 'QR কোড ইমেজ আপলোড করুন',
      alipayQrFileDescription: 'আলিপে পেমেন্ট QR কোড আপলোড করুন',
      alipayQrUrl: 'আলিপে QR কোড URL',
      alipayQrUrlPlaceholder: 'https://example.com/qr.jpg',
      alipayQrUrlDescription: 'আলিপে QR কোড ইমেজের লিঙ্ক',
      address: 'ঠিকানা',
      addressPlaceholder: 'সম্পূর্ণ ঠিকানা লিখুন',
      addressPlaceholderSimple: 'সম্পূর্ণ ব্যবসায়িক ঠিকানা',
      addressDescription: 'সম্পূর্ণ ব্যবসায়িক ঠিকানা',
      isActive: 'সক্রিয় সরবরাহকারী',
      isActiveDescription: 'এই সরবরাহকারীর জন্য অর্ডার সক্ষম করুন',
      isActiveDescriptionSimple: 'অর্ডার করার জন্য এই সরবরাহকারী সক্ষম করুন',
      create: 'সরবরাহকারী তৈরি করুন',
      update: 'সরবরাহকারী আপডেট করুন',
      cancel: 'বাতিল',
      validation: {
        nameRequired: 'সরবরাহকারীর নাম প্রয়োজন',
        emailRequired: 'ইমেইল প্রয়োজন',
        emailInvalid: 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন',
        urlInvalid: 'অনুগ্রহ করে একটি সঠিক URL লিখুন'
      }
    },
    notifications: {
      loading: 'সরবরাহকারী লোড হচ্ছে...',
      refreshed: 'রিফ্রেশ করা হয়েছে',
      refreshedMessage: 'সরবরাহকারী তালিকা রিফ্রেশ করা হয়েছে',
      created: 'সরবরাহকারী তৈরি করা হয়েছে',
      createdMessage: '{{name}} সফলভাবে তৈরি করা হয়েছে',
      updated: 'সরবরাহকারী আপডেট করা হয়েছে',
      updatedMessage: '{{name}} সফলভাবে আপডেট করা হয়েছে',
      deleted: 'সরবরাহকারী মুছে ফেলা হয়েছে',
      deletedMessage: '{{name}} সফলভাবে মুছে ফেলা হয়েছে',
      errorLoading: 'সরবরাহকারী লোড করতে ব্যর্থ। আবার চেষ্টা করুন।',
      errorCreating: 'সরবরাহকারী তৈরি করতে ব্যর্থ। আবার চেষ্টা করুন।',
      errorUpdating: 'সরবরাহকারী আপডেট করতে ব্যর্থ। আবার চেষ্টা করুন।',
      errorDeleting: 'সরবরাহকারী মুছে ফেলতে ব্যর্থ। আবার চেষ্টা করুন।',
      deleteConfirm: 'সরবরাহকারী মুছে ফেলবেন?',
      deleteConfirmMessage: 'আপনি কি নিশ্চিত যে আপনি {{name}} মুছে ফেলতে চান? এই পদক্ষেপটি পূর্বাবস্থায় ফেরানো যাবে না।'
    },
    viewSupplier: 'বিস্তারিত দেখুন',
    products: 'পণ্য',
    drawer: {
      createTitle: 'নতুন সরবরাহকারী যোগ করুন',
      updateTitle: 'সরবরাহকারী সম্পাদনা করুন',
      createDescription: 'আপনার ক্রয় নেটওয়ার্কে একটি নতুন সরবরাহকারী যোগ করুন',
      updateDescription: 'সরবরাহকারী তথ্য এবং যোগাযোগের বিবরণ আপডেট করুন',
      website: 'ওয়েবসাইট',
      wechatPay: 'উইচ্যাট পে',
      alipay: 'আলিপে',
      removePreview: 'প্রিভিউ মুছুন',
      uploadQrCode: 'QR কোড ইমেজ আপলোড করুন'
    }
  },

  // Returns Page
  returnsPage: {
    title: 'ক্রয় ফেরত',
    subtitle: 'ক্রয় ফেরত এবং রিফান্ড পরিচালনা করুন'
  },

  // Products Page
  productsPage: {
    title: 'ক্রয় পণ্য',
    subtitle: 'সরবরাহকারীদের কাছ থেকে কেনার জন্য পণ্য পরিচালনা করুন',
    addProduct: 'পণ্য যোগ করুন',
    editProduct: 'পণ্য সম্পাদনা করুন',
    name: 'নাম',
    namePlaceholder: 'পণ্যের নাম লিখুন',
    category: 'বিভাগ',
    brand: 'ব্র্যান্ড',
    suppliers: 'সরবরাহকারী',
    status: 'অবস্থা',
    basicInfo: 'মৌলিক তথ্য',
    selectCategory: 'বিভাগ নির্বাচন করুন',
    selectBrand: 'ব্র্যান্ড নির্বাচন করুন',
    selectThumbnail: 'থাম্বনেইল নির্বাচন করুন',
    changeThumbnail: 'থাম্বনেইল পরিবর্তন করুন',
    selectSupplier: 'সরবরাহকারী নির্বাচন করুন',
    costPrice: 'ক্রয় মূল্য',
    supplierSku: 'সরবরাহকারী SKU',
    productLinks: 'পণ্যের URL',
    noSuppliers: 'এখনও কোনো সরবরাহকারী যোগ করা হয়নি',
    supplier: 'সরবরাহকারী',
    productId: 'পণ্য আইডি',
    productInfo: 'পণ্য তথ্য',
    thumbnail: 'থাম্বনেইল',
    slug: 'স্লাগ',
    productUrls: 'পণ্যের URL',
    noProductUrls: 'কোনো পণ্য URL যোগ করা হয়নি',
    viewSupplier: 'বিস্তারিত দেখুন',
    statusOptions: {
      draft: 'খসড়া',
      published: 'প্রকাশিত'
    }
  },

  // Orders List Page
  ordersPage: {
    title: 'ক্রয় অর্ডার',
    subtitle: 'চীনা সরবরাহকারীদের কাছ থেকে ক্রয় অর্ডার পরিচালনা করুন',
    statistics: {
      totalOrders: 'মোট অর্ডার',
      draftOrders: 'খসড়া অর্ডার',
      activeOrders: 'সক্রিয় অর্ডার',
      completedOrders: 'সম্পন্ন অর্ডার',
      totalValueRmb: 'মোট মূল্য (RMB)'
    },
    filters: {
      title: 'ফিল্টার',
      status: 'অবস্থা',
      allStatuses: 'সকল অবস্থা',
      supplier: 'সরবরাহকারী',
      allSuppliers: 'সকল সরবরাহকারী',
      search: 'খুঁজুন',
      searchPlaceholder: 'অর্ডার নম্বর',
      fromDate: 'শুরু তারিখ',
      toDate: 'শেষ তারিখ'
    },
    statuses: {
      draft: 'খসড়া',
      paymentConfirmed: 'পেমেন্ট নিশ্চিত',
      supplierDispatched: 'সরবরাহকারী প্রেরিত',
      warehouseReceived: 'গুদামে প্রাপ্ত',
      shippedBd: 'বাংলাদেশে প্রেরিত',
      arrivedBd: 'বাংলাদেশে এসেছে',
      inTransitBogura: 'বগুড়ার পথে',
      receivedHub: 'হাবে প্রাপ্ত',
      partiallyCompleted: 'আংশিক সম্পন্ন',
      completed: 'সম্পন্ন',
      lost: 'হারিয়ে গেছে'
    },
    tableHeaders: {
      poNumber: 'অর্ডার নম্বর',
      supplier: 'সরবরাহকারী',
      orderDate: 'অর্ডার তারিখ',
      status: 'অবস্থা',
      totalRmb: 'মোট (RMB)',
      totalBdt: 'মোট (BDT)',
      items: 'আইটেম',
      actions: 'পদক্ষেপ'
    },
    actions: {
      view: 'দেখুন',
      edit: 'সম্পাদনা',
      delete: 'মুছুন'
    },
    notifications: {
      loading: 'অর্ডার লোড হচ্ছে...',
      refreshed: 'তথ্য রিফ্রেশ করা হয়েছে',
      noOrdersFound: 'কোনো ক্রয় অর্ডার পাওয়া যায়নি',
      created: 'ক্রয় অর্ডার সফলভাবে তৈরি করা হয়েছে',
      updated: 'ক্রয় অর্ডার সফলভাবে আপডেট করা হয়েছে',
      deleted: 'ক্রয় অর্ডার সফলভাবে মুছে ফেলা হয়েছে',
      errorLoading: 'ক্রয় অর্ডার লোড করতে ব্যর্থ',
      errorCreating: 'ক্রয় অর্ডার তৈরি করতে ব্যর্থ',
      errorUpdating: 'ক্রয় অর্ডার আপডেট করতে ব্যর্থ',
      errorDeleting: 'ক্রয় অর্ডার মুছে ফেলতে ব্যর্থ'
    },
    deleteConfirm: {
      title: 'ক্রয় অর্ডার মুছে ফেলবেন?',
      message: 'আপনি কি নিশ্চিত যে আপনি {{poNumber}} মুছে ফেলতে চান?',
      warning: 'এই পদক্ষেপটি পূর্বাবস্থায় ফেরানো যাবে না। সকল অর্ডার তথ্য স্থায়ীভাবে মুছে যাবে।',
      cancel: 'বাতিল',
      confirm: 'মুছুন'
    },
    details: {
      title: 'ক্রয় অর্ডার বিস্তারিত',
      orderInformation: 'অর্ডার তথ্য',
      orderDate: 'অর্ডার তারিখ',
      expectedDate: 'প্রত্যাশিত তারিখ',
      exchangeRate: 'বিনিময় হার',
      courierTracking: 'কুরিয়ার / ট্র্যাকিং',
      lotNumber: 'লট নম্বর',
      bdTracking: 'বিডি ট্র্যাকিং',
      statusTimeline: 'অবস্থা সময়রেখা',
      orderItems: 'অর্ডার আইটেম',
      items: 'আইটেম ({{count}})',
      product: 'পণ্য',
      quantity: 'পরিমাণ',
      unitPrice: 'একক মূল্য (RMB)',
      total: 'মোট',
      shippingCost: 'শিপিং খরচ',
      totals: {
        itemsTotalRmb: 'আইটেম মোট (RMB)',
        itemsTotalBdt: 'আইটেম মোট (BDT)',
        shippingCost: 'শিপিং খরচ',
        itemShippingCosts: 'আইটেম শিপিং খরচ',
        extraCost: 'অতিরিক্ত খরচ',
        grandTotal: 'সর্বমোট',
        note: '* অর্ডার অগ্রসর হওয়ার সাথে সাথে অতিরিক্ত খরচ যোগ করা হবে'
      },
      alerts: {
        draft: 'এই অর্ডারটি খসড়া অবস্থায় আছে। আপনি এখনও অর্ডার আইটেম এবং বিবরণ সম্পাদনা করতে পারেন। একবার আপনি অর্ডারটি নিশ্চিত করলে, এটি লক হয়ে যাবে এবং অর্ডার নম্বর তৈরি করা হবে।',
        partiallyCompleted: 'এই অর্ডারটি আংশিকভাবে সম্পন্ন হয়েছে। গ্রহণের সময় কিছু আইটেম নিখোঁজ ছিল। অর্ডারটি প্রাপ্ত পরিমাণ সহ প্রক্রিয়া করা হয়েছে এবং রিফান্ড স্বয়ংক্রিয়ভাবে সরবরাহকারী ওয়ালেটে জমা হয়েছে। অর্ডারটি এখন লক হয়ে গেছে এবং পরিবর্তন করা যাবে না।',
        completed: 'এই অর্ডারটি সম্পন্ন হয়েছে। সমস্ত স্ট্যাটাস আপডেট এবং ইনভেন্টরি প্রক্রিয়া করা হয়েছে। অর্ডারটি এখন লক হয়ে গেছে এবং পরিবর্তন করা যাবে না।'
      },
      actions: {
        editOrder: 'অর্ডার সম্পাদনা',
        back: 'পিছনে',
        confirmOrder: 'অর্ডার নিশ্চিত করুন',
        nextStatus: 'পরবর্তী: {{status}}',
        approveStock: 'অনুমোদন ও স্টক',
        approveConfirm: {
          title: 'অর্ডার অনুমোদন ও স্টক করবেন?',
          message: 'আপনি কি নিশ্চিত যে আপনি {{poNumber}} অনুমোদন করতে এবং ইনভেন্টরি আপডেট করতে চান?',
          warning: 'এটি প্রাপ্ত আইটেমগুলি প্রক্রিয়া করবে এবং স্টক লেভেল আপডেট করবে। এই পদক্ষেপটি পূর্বাবস্থায় ফেরানো যাবে না।',
          partialWarning: 'এই অর্ডারটি কিছু নিখোঁজ আইটেম সহ আংশিকভাবে সম্পন্ন হয়েছে। শুধুমাত্র প্রাপ্ত পরিমাণ স্টক করা হবে।',
          cancel: 'বাতিল',
          confirm: 'অনুমোদন ও স্টক'
        },
        editComments: 'মন্তব্য সম্পাদনা',
        editData: {
          title: '{{status}} তথ্য সম্পাদনা',
          success: 'তথ্য সফলভাবে আপডেট করা হয়েছে'
        }
      },
      statusUpdate: {
        draft: {
          title: 'অর্ডার নিশ্চিত করুন',
          message: 'আপনি এই অর্ডারটি নিশ্চিত করতে চলেছেন। অনুগ্রহ করে CNY থেকে BDT বিনিময় হার যাচাই এবং সেট করুন। এই হারটি সমস্ত গণনার জন্য ব্যবহৃত হবে এবং মুদ্রা সারণী আপডেট করবে।',
          exchangeRate: 'বিনিময় হার (¥1 = ৳?)',
          exchangeRateDescription: '¥1 (CNY) এর জন্য কত ৳ (BDT)?'
        },
        paymentConfirmed: {
          title: 'সরবরাহকারী প্রেরণা',
          message: 'সরবরাহকারী অর্ডার প্রেরণ করছেন। আন্তর্জাতিক কুরিয়ার বিবরণ লিখুন।',
          courierName: 'কুরিয়ারের নাম',
          courierPlaceholder: 'DHL, FedEx, UPS, ইত্যাদি।',
          trackingNumber: 'ট্র্যাকিং নম্বর',
          trackingPlaceholder: 'আন্তর্জাতিক ট্র্যাকিং নম্বর'
        },
        warehouseReceived: {
          title: 'বাংলাদেশে প্রেরণ করুন',
          message: 'চালান বাংলাদেশে প্রেরণ করা হচ্ছে। ট্র্যাকিংয়ের জন্য লট নম্বর লিখুন।',
          lotNumber: 'লট নম্বর',
          lotPlaceholder: 'যেমন, LOT-202602-001'
        },
        shippedBd: {
          title: 'বাংলাদেশে এসেছে',
          message: 'পণ্য বাংলাদেশে এসেছে। পরিবহন ধরন এবং মোট শিপিং খরচ লিখুন। এই খরচটি আইটেমগুলির দাম অনুযায়ী বিতরণ করা হবে যখন প্রকৃত পণ্য খরচ গণনা করা হবে।',
          transportType: 'পরিবহন ধরন',
          selectTransport: 'পরিবহন ধরন নির্বাচন করুন',
          byAir: 'আকাশপথে',
          byShip: 'জাহাজে',
          shippingCost: 'মোট শিপিং খরচ (BDT)',
          shippingCostDescription: 'এই পরিবহনের মোট খরচ (আইটেমগুলিতে বিতরণ করা হবে)',
          itemsList: 'এই অর্ডারে আইটেম ({{count}}):',
          total: 'মোট'
        },
        arrivedBd: {
          title: 'বগুড়ার পথে',
          message: 'পণ্য বগুড়ার পথে আছে। বিডি কুরিয়ার ট্র্যাকিং নম্বর লিখুন।',
          bdCourierTracking: 'বিডি কুরিয়ার ট্র্যাকিং',
          bdPlaceholder: 'Pathao, Steadfast, RedX, ইত্যাদি।'
        },
        comments: 'মন্তব্য / নোট',
        commentsPlaceholder: 'এই স্ট্যাটাস পরিবর্তন সম্পর্কে কোনো নোট বা মন্তব্য যোগ করুন...',
        commentsDescription: 'ঐচ্ছিক: কোনো গুরুত্বপূর্ণ বিবরণ, সমস্যা বা নোট নথিভুক্ত করুন',
        update: 'স্ট্যাটাস আপডেট করুন',
        transitionDescription: 'অর্ডার স্ট্যাটাস পরবর্তী ধাপে আপডেট করুন'
      }
    }
  },

  // Receiving Modal
  receivingModal: {
    title: 'পণ্য গ্রহণ - PO {{poNumber}}',
    validation: {
      error: 'যাচাইকরণ ত্রুটি',
      unitWeightRequired: 'অনুগ্রহ করে {{productName}} এর জন্য একক ওজন লিখুন'
    },
    summary: {
      title: 'গ্রহণ সারসংক্ষেপ',
      manualReviewRequired: 'ম্যানুয়াল রিভিউ প্রয়োজন',
      partialCompletion: 'আংশিক সমাপ্তি',
      total: 'মোট',
      units: 'একক',
      received: 'প্রাপ্ত',
      lost: 'হারিয়েছে',
      found: 'পাওয়া গেছে',
      extra: 'অতিরিক্ত',
      manualReviewWarning: '⚠️ হারিয়ে যাওয়া শতাংশ ১০% সীমা অতিক্রম করেছে। {{lostValue}} BDT রিফান্ড ম্যানুয়াল রিভিউ প্রয়োজন।',
      partialWarning: '⚠️ কিছু আইটেম নিখোঁজ ({{lostUnits}} একক)। অর্ডার <strong>আংশিক সম্পন্ন</strong> হিসাবে চিহ্নিত করা হবে এবং {{lostValue}} BDT রিফান্ড স্বয়ংক্রিয়ভাবে সরবরাহকারী ওয়ালেটে জমা হবে।',
      foundItemsInfo: '✓ {{foundUnits}} অতিরিক্ত একক প্রাপ্ত হয়েছে। পাওয়া আইটেম খরচ আনুপাতিকভাবে কমিয়ে দেয়।',
      autoCreditSuccess: '✓ হারিয়ে যাওয়া শতাংশ ১০% সীমার মধ্যে। রিফান্ড স্বয়ংক্রিয়ভাবে সরবরাহকারী ওয়ালেটে জমা হবে।'
    },
    extraCost: {
      label: 'অতিরিক্ত খরচ (BDT)',
      description: 'অতিরিক্ত শিপিং, হ্যান্ডলিং বা কাস্টমস খরচ। মূল্য অনুপাত অনুযায়ী আইটেমগুলিতে বিতরণ করা হবে।'
    },
    shippingCost: {
      label: 'শিপিং খরচ (BDT)',
      description: 'চীনা থেকে বাংলাদেশে মোট শিপিং খরচ। মূল্য অনুপাত অনুযায়ী প্রাপ্ত আইটেমগুলিতে বিতরণ করা হবে।'
    },
    table: {
      headers: {
        item: 'আইটেম',
        ordered: 'অর্ডার করা',
        received: 'প্রাপ্ত',
        lost: 'হারিয়েছে',
        found: 'পাওয়া গেছে',
        unitWeight: 'একক ওজন (g)',
        extraWeight: 'অতিরিক্ত ওজন (g)',
        originalCost: 'মূল খরচ',
        adjustment: 'সমন্বয়',
        finalCost: 'চূড়ান্ত খরচ'
      },
      chinaPrice: 'চীনা মূল্য'
    },
    costAdjustment: {
      title: 'খরচ সমন্বয় (হারিয়ে যাওয়া আইটেম বিতরণ)',
      itemBreakdown: 'হারিয়ে যাওয়া আইটেম মান ({{lostValue}} BDT) {{receivedUnits}} প্রাপ্ত এককে বিতরণ করা হয়েছে। প্রতি একক সমন্বয়: ৳ {{adjustmentPerUnit}}',
      itemNote: 'মূল খরচ: ৳ {{originalCost}} → চূড়ান্ত খরচ: ৳ {{finalCost}} (বৃদ্ধি: ৳ {{increase}})'
    },
    costDistribution: {
      title: 'খরচ বিতরণ পদ্ধতি',
      description: 'অতিরিক্ত খরচ প্রাপ্ত মূল্য অনুপাত অনুযায়ী আইটেমগুলিতে বিতরণ করা হয় (china_price × received_quantity)। চূড়ান্ত একক খরচ = china_price + (extra_cost ÷ received_quantity)'
    },
    actions: {
      cancel: 'বাতিল',
      submitForReview: 'রিভিউয়ের জন্য জমা দিন',
      confirmPartial: 'আংশিক গ্রহণ নিশ্চিত করুন',
      confirm: 'গ্রহণ নিশ্চিত করুন'
    },
    comments: {
      label: 'মন্তব্য',
      placeholder: 'এই গ্রহণ সম্পর্কে কোনো নোট যোগ করুন (ঐচ্ছিক)',
      description: 'ঐচ্ছিক: এই গ্রহণ সম্পর্কে কোনো গুরুত্বপূর্ণ বিবরণ, সমস্যা বা নোট নথিভুক্ত করুন'
    }
  },

  // Lost and Found Items Section
  lostAndFound: {
    title: 'হারিয়ে যাওয়া এবং পাওয়া আইটেম',
    tableHeaders: {
      product: 'পণ্য',
      ordered: 'অর্ডার করা',
      received: 'প্রাপ্ত',
      lost: 'হারিয়েছে',
      found: 'পাওয়া গেছে',
      unitPrice: 'একক মূল্য',
      lostCost: 'হারানো খরচ'
    },
    summary: {
      totalLostCost: 'মোট হারানো আইটেমের খরচ',
      description: 'এই পরিমাণটি চালানের সময় হারিয়ে যাওয়া আইটেমগুলির মূল্য নির্দেশ করে'
    }
  }
}
