import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// সরাসরি ইমপোর্ট করছি যাতে অফলাইনেও ভাষা পাওয়া যায়
import en from '../locales/en.json';
import bn from '../locales/bn.json';

// মডিউলার ট্রান্সলেশন ফাইল ইমপোর্ট (JSON)
import productsEn from '../locales/en/products.json';
import productsBn from '../locales/bn/products.json';
import procurementEn from '../locales/en/procurement.json';
import procurementBn from '../locales/bn/procurement.json';
import catalogEn from '../locales/en/catalog.json';
import catalogBn from '../locales/bn/catalog.json';
import commonEn from '../locales/en/common.json';
import commonBn from '../locales/bn/common.json';
import navEn from '../locales/en/nav.json';
import navBn from '../locales/bn/nav.json';

// মডিউল মার্জ করা
const enTranslation = {
  ...en,
  ...commonEn,
  ...navEn,
  products: productsEn,
  procurement: procurementEn,
  catalog: catalogEn
};

const bnTranslation = {
  ...bn,
  ...commonBn,
  ...navBn,
  products: productsBn,
  procurement: procurementBn,
  catalog: catalogBn
};

i18n
  // ইউজারের ভাষা ডিটেক্ট করবে (localStorage বা Browser setting থেকে)
  .use(LanguageDetector)
  // React এর সাথে কানেক্ট করা
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      bn: { translation: bnTranslation }
    },
    // lng: 'en', // Removed - let LanguageDetector decide from localStorage
    fallbackLng: 'en', // ভাষা খুঁজে না পেলে ইংলিশ দেখাবে
    debug: false, // ডেভেলপমেন্টের সময় কনসোলে লগ দেখাবে

    interpolation: {
      escapeValue: false, // React অটোমেটিক XSS হ্যান্ডেল করে
    },

    // Offline Detection Config
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'], // ভাষা সিলেকশন মেমোরিতে সেভ থাকবে
    }
  });

export default i18n;