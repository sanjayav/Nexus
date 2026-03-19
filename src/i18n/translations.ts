export type Language = 'EN' | 'हिंदी' | '简体中文' | 'عربي';

export const translations = {
  EN: {
    // Navigation
    nav: {
      home: 'Home',
      workbench: 'Workbench',
      frameworks: 'Frameworks',
      evidenceVault: 'Evidence Vault',
      analytics: 'Analytics',
      publish: 'Publish',
      admin: 'Admin',
    },
    // Login
    login: {
      title: 'Welcome to Aeiforo',
      subtitle: 'Assurance-Grade ESG Reporting Platform',
      email: 'Email',
      password: 'Password',
      signin: 'Sign In',
      demo: 'Demo Credentials Pre-filled',
    },
    // Home
    home: {
      title: 'Reporting Command Center',
      period: 'Period',
      regionMode: 'Region Mode',
      integrity: 'Integrity',
      verified: 'Verified',
      pipeline: {
        setup: 'Setup',
        dma: 'DMA',
        collection: 'Collection',
        review: 'Review',
        publish: 'Publish',
      },
      riskStrip: 'Risk Alerts',
      criticalGaps: 'Critical gaps blocking publish',
      missingEvidence: 'Missing evidence files',
      expiringCerts: 'Expiring certificates (< 30 days)',
      nextActions: 'Next Actions',
      continueDMA: 'Continue DMA for climate topics',
      resolveGaps: 'Resolve {count} gaps across BU/Sites',
      reviewSubmissions: 'Review {count} submissions ready for approval',
    },
    // Workbench
    workbench: {
      title: 'Workbench',
      subtitle: 'Central hub for tasks, DMA/materiality, reviews, and gap resolutions',
      tabs: {
        tasks: 'Tasks & Gaps',
        dma: 'DMA / Materiality',
        reviews: 'Review & Approvals',
      },
      readyToPublish: 'Ready to publish: {count} modules',
      criticalGaps: 'Critical gaps: {count}',
      filters: {
        all: 'All tasks',
        mine: 'My tasks',
        critical: 'Critical',
        dueThisWeek: 'Due this week',
      },
    },
    // Organization Setup
    orgSetup: {
      title: 'Organization Setup',
      subtitle: 'Configure your reporting environment, frameworks, and governance model',
      regionMode: 'Region Mode',
      dataResidency: 'Data Residency',
      defaultLanguage: 'Default Language',
      entityHierarchy: 'Entity Hierarchy',
      roles: 'Roles (RBAC)',
      frameworkPacks: 'Framework Packs Enabled',
      methodLibraries: 'Method Libraries',
      save: 'Save Configuration',
      saved: 'Saved',
    },
    // Common
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      export: 'Export',
      import: 'Import',
      search: 'Search',
      filter: 'Filter',
      loading: 'Loading...',
      noData: 'No data available',
      error: 'An error occurred',
      success: 'Success',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      finish: 'Finish',
      logout: 'Logout',
    },
  },
  'हिंदी': {
    nav: {
      home: 'होम',
      workbench: 'कार्यक्षेत्र',
      frameworks: 'फ्रेमवर्क',
      evidenceVault: 'साक्ष्य भंडार',
      analytics: 'विश्लेषण',
      publish: 'प्रकाशित करें',
      admin: 'व्यवस्थापक',
    },
    login: {
      title: 'Aeiforo में आपका स्वागत है',
      subtitle: 'आश्वासन-ग्रेड ESG रिपोर्टिंग प्लेटफॉर्म',
      email: 'ईमेल',
      password: 'पासवर्ड',
      signin: 'साइन इन करें',
      demo: 'डेमो क्रेडेंशियल्स पूर्व-भरी हुई',
    },
    home: {
      title: 'रिपोर्टिंग कमांड सेंटर',
      period: 'अवधि',
      regionMode: 'क्षेत्र मोड',
      integrity: 'अखंडता',
      verified: 'सत्यापित',
      pipeline: { setup: 'सेटअप', dma: 'DMA', collection: 'संग्रह', review: 'समीक्षा', publish: 'प्रकाशित करें' },
      riskStrip: 'जोखिम अलर्ट',
      criticalGaps: 'प्रकाशन को ब्लॉक करने वाले महत्वपूर्ण अंतर',
      missingEvidence: 'गायब साक्ष्य फाइलें',
      expiringCerts: 'समाप्त होने वाले प्रमाणपत्र (< 30 दिन)',
      nextActions: 'अगली कार्रवाई',
      continueDMA: 'जलवायु विषयों के लिए DMA जारी रखें',
      resolveGaps: 'BU/साइटों में {count} अंतरों को हल करें',
      reviewSubmissions: 'अनुमोदन के लिए तैयार {count} सबमिशन की समीक्षा करें',
    },
    workbench: {
      title: 'कार्यक्षेत्र',
      subtitle: 'कार्य, DMA/महत्व, समीक्षा और अंतर समाधान के लिए केंद्रीय हब',
      tabs: { tasks: 'कार्य और अंतर', dma: 'DMA / महत्व', reviews: 'समीक्षा और अनुमोदन' },
      readyToPublish: 'प्रकाशित करने के लिए तैयार: {count} मॉड्यूल',
      criticalGaps: 'महत्वपूर्ण अंतर: {count}',
      filters: { all: 'सभी कार्य', mine: 'मेरे कार्य', critical: 'महत्वपूर्ण', dueThisWeek: 'इस सप्ताह देय' },
    },
    orgSetup: {
      title: 'संगठन सेटअप',
      subtitle: 'अपनी रिपोर्टिंग वातावरण, फ्रेमवर्क और शासन मॉडल कॉन्फ़िगर करें',
      regionMode: 'क्षेत्र मोड',
      dataResidency: 'डेटा निवास',
      defaultLanguage: 'डिफ़ॉल्ट भाषा',
      entityHierarchy: 'इकाई पदानुक्रम',
      roles: 'भूमिकाएं (RBAC)',
      frameworkPacks: 'सक्षम फ्रेमवर्क पैक',
      methodLibraries: 'विधि पुस्तकालय',
      save: 'कॉन्फ़िगरेशन सहेजें',
      saved: 'सहेजा गया',
    },
    common: {
      save: 'सहेजें', cancel: 'रद्द करें', delete: 'हटाएं', edit: 'संपादित करें', view: 'देखें',
      export: 'निर्यात', import: 'आयात', search: 'खोज', filter: 'फ़िल्टर', loading: 'लोड हो रहा है...',
      noData: 'कोई डेटा उपलब्ध नहीं', error: 'एक त्रुटि हुई', success: 'सफलता', confirm: 'पुष्टि करें',
      back: 'वापस', next: 'अगला', finish: 'समाप्त', logout: 'लॉग आउट',
    },
  },
  '简体中文': {
    // Navigation
    nav: {
      home: '主页',
      workbench: '工作台',
      frameworks: '框架',
      evidenceVault: '证据库',
      analytics: '分析',
      publish: '发布',
      admin: '管理',
    },
    // Login
    login: {
      title: '欢迎来到Aeiforo',
      subtitle: '保证级ESG报告平台',
      email: '邮箱',
      password: '密码',
      signin: '登录',
      demo: '演示凭据已预填',
    },
    // Home
    home: {
      title: '报告指挥中心',
      period: '期间',
      regionMode: '区域模式',
      integrity: '完整性',
      verified: '已验证',
      pipeline: {
        setup: '设置',
        dma: 'DMA',
        collection: '收集',
        review: '审核',
        publish: '发布',
      },
      riskStrip: '风险警报',
      criticalGaps: '阻止发布的关键差距',
      missingEvidence: '缺失的证据文件',
      expiringCerts: '即将到期的证书（< 30天）',
      nextActions: '下一步行动',
      continueDMA: '继续气候主题的DMA',
      resolveGaps: '解决跨BU/站点的{count}个差距',
      reviewSubmissions: '审核{count}个准备批准的提交',
    },
    // Workbench
    workbench: {
      title: '工作台',
      subtitle: '任务、DMA/重要性、审核和差距解决的中心枢纽',
      tabs: {
        tasks: '任务与差距',
        dma: 'DMA / 重要性',
        reviews: '审核与批准',
      },
      readyToPublish: '准备发布：{count}个模块',
      criticalGaps: '关键差距：{count}',
      filters: {
        all: '所有任务',
        mine: '我的任务',
        critical: '关键',
        dueThisWeek: '本周到期',
      },
    },
    // Organization Setup
    orgSetup: {
      title: '组织设置',
      subtitle: '配置您的报告环境、框架和治理模型',
      regionMode: '区域模式',
      dataResidency: '数据驻留',
      defaultLanguage: '默认语言',
      entityHierarchy: '实体层次结构',
      roles: '角色（RBAC）',
      frameworkPacks: '启用的框架包',
      methodLibraries: '方法库',
      save: '保存配置',
      saved: '已保存',
    },
    // Common
    common: {
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      view: '查看',
      export: '导出',
      import: '导入',
      search: '搜索',
      filter: '筛选',
      loading: '加载中...',
      noData: '无可用数据',
      error: '发生错误',
      success: '成功',
      confirm: '确认',
      back: '返回',
      next: '下一步',
      finish: '完成',
      logout: '登出',
    },
  },
  'عربي': {
    // Navigation
    nav: {
      home: 'الرئيسية',
      workbench: 'مساحة العمل',
      frameworks: 'الأطر',
      evidenceVault: 'مخزن الأدلة',
      analytics: 'التحليلات',
      publish: 'نشر',
      admin: 'الإدارة',
    },
    // Login
    login: {
      title: 'مرحباً بك في Aeiforo',
      subtitle: 'منصة تقارير ESG معتمدة',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      signin: 'تسجيل الدخول',
      demo: 'تم ملء بيانات الاعتماد التجريبية مسبقاً',
    },
    // Home
    home: {
      title: 'مركز قيادة التقارير',
      period: 'الفترة',
      regionMode: 'وضع المنطقة',
      integrity: 'النزاهة',
      verified: 'تم التحقق',
      pipeline: {
        setup: 'الإعداد',
        dma: 'DMA',
        collection: 'الجمع',
        review: 'المراجعة',
        publish: 'النشر',
      },
      riskStrip: 'تنبيهات المخاطر',
      criticalGaps: 'الفجوات الحرجة التي تمنع النشر',
      missingEvidence: 'ملفات الأدلة المفقودة',
      expiringCerts: 'الشهادات منتهية الصلاحية (< 30 يوماً)',
      nextActions: 'الإجراءات التالية',
      continueDMA: 'متابعة DMA لموضوعات المناخ',
      resolveGaps: 'حل {count} فجوة عبر BU/المواقع',
      reviewSubmissions: 'مراجعة {count} تقديم جاهز للموافقة',
    },
    // Workbench
    workbench: {
      title: 'مساحة العمل',
      subtitle: 'المركز المركزي للمهام والـ DMA/الأهمية والمراجعات وحلول الفجوات',
      tabs: {
        tasks: 'المهام والفجوات',
        dma: 'DMA / الأهمية',
        reviews: 'المراجعة والموافقات',
      },
      readyToPublish: 'جاهز للنشر: {count} وحدة',
      criticalGaps: 'الفجوات الحرجة: {count}',
      filters: {
        all: 'جميع المهام',
        mine: 'مهامي',
        critical: 'حرجة',
        dueThisWeek: 'مستحقة هذا الأسبوع',
      },
    },
    // Organization Setup
    orgSetup: {
      title: 'إعداد المنظمة',
      subtitle: 'تكوين بيئة التقارير والأطر ونموذج الحوكمة',
      regionMode: 'وضع المنطقة',
      dataResidency: 'إقامة البيانات',
      defaultLanguage: 'اللغة الافتراضية',
      entityHierarchy: 'التسلسل الهرمي للكيان',
      roles: 'الأدوار (RBAC)',
      frameworkPacks: 'حزم الأطر الممكّنة',
      methodLibraries: 'مكتبات الطرق',
      save: 'حفظ التكوين',
      saved: 'تم الحفظ',
    },
    // Common
    common: {
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      view: 'عرض',
      export: 'تصدير',
      import: 'استيراد',
      search: 'بحث',
      filter: 'تصفية',
      loading: 'جاري التحميل...',
      noData: 'لا توجد بيانات متاحة',
      error: 'حدث خطأ',
      success: 'نجح',
      confirm: 'تأكيد',
      back: 'رجوع',
      next: 'التالي',
      finish: 'إنهاء',
      logout: 'تسجيل الخروج',
    },
  },
};

export function getTranslation(lang: Language, key: string): string {
  const keys = key.split('.');
  let value: any = translations[lang as keyof typeof translations];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || key;
}

export function t(lang: Language, key: string, params?: Record<string, string | number>): string {
  let text = getTranslation(lang, key);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      text = text.replace(`{${key}}`, String(value));
    });
  }
  
  return text;
}

