// ============================================
// js/app.js - الصفحة الرئيسية
// ============================================
import { db, collection, getDocs } from './firebase-config.js';
import { getCurrentLang, toggleLang, applyLang, t } from './translate.js';

document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  setupLangToggle();
  loadFeaturedProducts();
  updateCartCount();
});

function setupLangToggle() {
  document.getElementById('langToggle')?.addEventListener('click', () => {
    toggleLang();
    loadFeaturedProducts();
  });
}

async function loadFeaturedProducts() {
  const container = document.getElementById('featuredProducts');
  if (!container) return;

  const lang = getCurrentLang();

  try {
    const snap = await getDocs(collection(db, 'products'));
    let products = [];
    snap.forEach(d => products.push({ id: d.id, ...d.data() }));

    // Featured first
    products.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    products = products.slice(0, 8);

    // Update count
    const countEl = document.getElementById('productCount');
    if (countEl) countEl.textContent = snap.size;

    if (products.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><p>${t('no_products')}</p></div>`;
      return;
    }

    container.innerHTML = products.map(p => productCard(p, lang)).join('');
  } catch (err) {
    console.error('Error:', err);
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>حدث خطأ في تحميل المنتجات</p></div>`;
  }
}

function productCard(p, lang) {
  const name = (lang === 'en' && p.nameEn) ? p.nameEn : (p.nameAr || p.name || '');
  const cat = (lang === 'en' && p.categoryEn) ? p.categoryEn : (p.categoryAr || p.category || '');
  const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;

  return `
    <a href="/product-detail.html?id=${p.id}" class="product-card">
      <div class="product-card-image">
        <img src="${p.image || ''}" alt="${name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x220?text=No+Image'">
        <span class="product-badge">${cat}</span>
        ${disc > 0 ? `<span class="product-discount-badge">-${disc}%</span>` : ''}
      </div>
      <div class="product-card-body">
        <span class="product-card-category">${cat}</span>
        <div class="product-card-rating">★★★★★</div>
        <h3 class="product-card-name">${name}</h3>
        <div class="product-card-footer">
          <div>
            <span class="product-card-price">${p.price}$</span>
            ${p.oldPrice ? `<span class="product-card-old-price">${p.oldPrice}$</span>` : ''}
          </div>
          <span class="product-card-btn" onclick="event.preventDefault()"><i class="fas fa-arrow-left"></i></span>
        </div>
      </div>
    </a>
  `;
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const el = document.getElementById('cartCount');
  if (el) el.textContent = cart.reduce((s, i) => s + (i.qty || 1), 0);
}
