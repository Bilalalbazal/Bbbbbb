// ============================================
// js/products.js - كل المنتجات مع الفلترة
// ============================================
import { db, collection, getDocs } from './firebase-config.js';
import { getCurrentLang, toggleLang, applyLang, t } from './translate.js';

let allProducts = [];
let allCategories = [];
let currentCat = 'all';

document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  setupLangToggle();
  loadData();
  updateCartCount();
  document.getElementById('searchInput')?.addEventListener('input', renderProducts);
});

function setupLangToggle() {
  document.getElementById('langToggle')?.addEventListener('click', () => {
    toggleLang();
    renderCategories();
    renderProducts();
  });
}

async function loadData() {
  try {
    const [catSnap, prodSnap] = await Promise.all([
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'products'))
    ]);

    allCategories = [];
    catSnap.forEach(d => allCategories.push({ id: d.id, ...d.data() }));

    allProducts = [];
    prodSnap.forEach(d => allProducts.push({ id: d.id, ...d.data() }));

    renderCategories();
    renderProducts();
  } catch (err) {
    console.error('Error:', err);
  }
}

function renderCategories() {
  const container = document.getElementById('categoryFilters');
  if (!container) return;
  const lang = getCurrentLang();

  let html = `<button class="filter-chip ${currentCat === 'all' ? 'active' : ''}" data-cat="all">${t('all')}</button>`;
  allCategories.forEach(c => {
    const name = (lang === 'en' && c.nameEn) ? c.nameEn : (c.nameAr || c.name || '');
    html += `<button class="filter-chip ${currentCat === c.id ? 'active' : ''}" data-cat="${c.id}">${name}</button>`;
  });
  container.innerHTML = html;

  container.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentCat = chip.dataset.cat;
      container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderProducts();
    });
  });
}

function renderProducts() {
  const container = document.getElementById('allProducts');
  const empty = document.getElementById('emptyState');
  if (!container) return;

  const lang = getCurrentLang();
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();

  let filtered = allProducts;
  if (currentCat !== 'all') filtered = filtered.filter(p => p.categoryId === currentCat);
  if (search) filtered = filtered.filter(p => {
    const txt = `${p.nameAr || ''} ${p.nameEn || ''} ${p.name || ''}`.toLowerCase();
    return txt.includes(search);
  });

  if (filtered.length === 0) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  container.innerHTML = filtered.map(p => {
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
            <span class="product-card-btn" onclick="event.preventDefault()"><i class="fas fa-shopping-cart"></i></span>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const el = document.getElementById('cartCount');
  if (el) el.textContent = cart.reduce((s, i) => s + (i.qty || 1), 0);
}
