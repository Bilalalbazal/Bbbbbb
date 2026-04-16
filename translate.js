// ============================================
// js/translate.js - نظام الترجمة AR <-> EN
// ============================================

const TRANSLATE_API = "https://api.mymemory.translated.net/get";

/**
 * ترجمة نص
 */
export async function translateText(text, from = "ar", to = "en") {
  if (!text || text.trim() === "") return "";
  try {
    const res = await fetch(`${TRANSLATE_API}?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData) {
      return data.responseData.translatedText;
    }
    return text;
  } catch (err) {
    console.warn("Translation failed:", err);
    return text;
  }
}

/**
 * كشف اللغة
 */
export function detectLanguage(text) {
  return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
}

/**
 * ترجمة تلقائية مع كشف اللغة
 */
export async function autoTranslate(text) {
  const lang = detectLanguage(text);
  if (lang === "ar") {
    return { ar: text, en: await translateText(text, "ar", "en") };
  } else {
    return { ar: await translateText(text, "en", "ar"), en: text };
  }
}

// ===== قاموس واجهة المستخدم =====
export const UI = {
  home:              { ar: "الرئيسية",         en: "Home" },
  products:          { ar: "المنتجات",          en: "Products" },
  store_name:        { ar: "تك ستور",           en: "TechStore" },
  hero_title:        { ar: "اكتشف أحدث الأجهزة الإلكترونية", en: "Discover Latest Electronics" },
  hero_sub:          { ar: "هواتف وإكسسوارات بأسعار لا تُقاوم", en: "Phones & Accessories at Unbeatable Prices" },
  start_shopping:    { ar: "ابدأ التسوق",       en: "Start Shopping" },
  featured:          { ar: "منتجات مميزة",      en: "Featured Products" },
  all_products:      { ar: "كل المنتجات",       en: "All Products" },
  all:               { ar: "الكل",              en: "All" },
  buy_now:           { ar: "اشترِ الآن",        en: "Buy Now" },
  add_to_cart:       { ar: "أضف للسلة",         en: "Add to Cart" },
  stock:             { ar: "المخزون",            en: "Stock" },
  out_of_stock:      { ar: "نفذ المخزون",       en: "Out of Stock" },
  checkout:          { ar: "إتمام الشراء",       en: "Checkout" },
  full_name:         { ar: "الاسم الكامل",       en: "Full Name" },
  phone:             { ar: "رقم الهاتف",         en: "Phone Number" },
  city:              { ar: "المدينة",            en: "City" },
  address:           { ar: "العنوان التفصيلي",   en: "Detailed Address" },
  subtotal:          { ar: "المجموع",            en: "Subtotal" },
  delivery_fee:      { ar: "التوصيل",            en: "Delivery" },
  total:             { ar: "الإجمالي",           en: "Total" },
  confirm_order:     { ar: "تأكيد الطلب عبر واتساب", en: "Confirm via WhatsApp" },
  select_city:       { ar: "اختر المدينة",       en: "Select City" },
  free_delivery:     { ar: "توصيل مجاني",        en: "Free Delivery" },
  search:            { ar: "بحث...",             en: "Search..." },
  no_products:       { ar: "لا توجد منتجات",     en: "No Products Found" },
  footer:            { ar: "جميع الحقوق محفوظة", en: "All Rights Reserved" },
  product_c:         { ar: "منتج",               en: "Products" },
  customers:         { ar: "عميل",               en: "Customers" },
  rating:            { ar: "تقييم",              en: "Rating" },
  cart_empty:        { ar: "السلة فارغة",         en: "Cart is Empty" },
  added_to_cart:     { ar: "تمت الإضافة للسلة",   en: "Added to Cart" },
  fill_all:          { ar: "يرجى ملء جميع الحقول", en: "Please fill all fields" },
  order_details:     { ar: "تفاصيل الطلب",       en: "Order Details" },
  notes:             { ar: "ملاحظات (اختياري)",   en: "Notes (Optional)" },
  back_to_store:     { ar: "العودة للمتجر",       en: "Back to Store" },
  description:       { ar: "الوصف",              en: "Description" },
};

/**
 * الحصول على النص حسب اللغة الحالية
 */
export function t(key) {
  const lang = getCurrentLang();
  return UI[key]?.[lang] || key;
}

/**
 * الحصول على اللغة
 */
export function getCurrentLang() {
  return localStorage.getItem("lang") || "ar";
}

/**
 * تبديل اللغة
 */
export function toggleLang() {
  const curr = getCurrentLang();
  const next = curr === "ar" ? "en" : "ar";
  localStorage.setItem("lang", next);
  applyLang();
  return next;
}

/**
 * تطبيق اللغة على كل الصفحة
 */
export function applyLang() {
  const lang = getCurrentLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (UI[key]?.[lang]) el.textContent = UI[key][lang];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (UI[key]?.[lang]) el.placeholder = UI[key][lang];
  });

  // تحديث زر اللغة
  const label = document.getElementById("langLabel");
  if (label) label.textContent = lang === "ar" ? "EN" : "عربي";
}
