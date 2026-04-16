// ============================================
// js/product-detail.js - صفحة تفاصيل المنتج
// ============================================
import { db, doc, getDoc } from './firebase-config.js';
import { getCurrentLang, toggleLang, applyLang, t } from './translate.js';

let currentProduct = null;
let productId = null;

document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  setupLangToggle();
  loadProduct();
  updateCartCount();
  setupQtyControls();
});

function setupLangToggle() {
  document.getElementById('langToggle')?.addEventListener('click', () => {
    toggleLang();
    if (currentProduct) displayProduct(currentProduct);
  });
}

function setupQtyControls() {
  const input = document.getElementById('qtyInput');
  document.getElementById('qtyMinus')?.addEventListener('click', () => {
    input.value = Math.max(1, parseInt(input.value) - 1);
  });
  document.getElementById('qtyPlus')?.addEventListener('click', () => {
    const max = currentProduct?.stock || 99;
    input.value = Math.min(max, parseInt(input.value) + 1);
  });
}

async function loadProduct() {
  const params = new URLSearchParams(window.location.search);
  productId = params.get('id');
  if (!productId) return;

  try {
    const snap = await getDoc(doc(db, 'products', productId));
    if (!snap.exists()) return;
    currentProduct = snap.data();
    displayProduct(currentProduct);
  } catch (err) {
    console.error('Error:', err);
  }
}

function displayProduct(p) {
  const lang = getCurrentLang();
  const name = (lang === 'en' && p.nameEn) ? p.nameEn : (p.nameAr || p.name || '');
  const desc = (lang === 'en' && p.descEn) ? p.descEn : (p.descAr || p.description || '');
  const cat = (lang === 'en' && p.categoryEn) ? p.categoryEn : (p.categoryAr || p.category || '');

  document.getElementById('productImage').src = p.image || '';
  document.getElementById('productName').textContent = name;
  document.getElementById('productDesc').textContent = desc;
  document.getElementById('productCategory').textContent = cat;
  document.getElementById('productPrice').textContent = `${p.price}$`;
  document.getElementById('breadcrumbName').textContent = name;
  document.title = `TechStore - ${name}`;

  // Old price & discount
  const oldEl = document.getElementById('productOldPrice');
  const discEl = document.getElementById('discountBadge');
  if (p.oldPrice && p.oldPrice > p.price) {
    oldEl.textContent = `${p.oldPrice}$`;
    oldEl.style.display = '';
    const disc = Math.round((1 - p.price / p.oldPrice) * 100);
    discEl.textContent = `-${disc}%`;
    discEl.style.display = '';
  } else {
    oldEl.style.display = 'none';
    discEl.style.display = 'none';
  }

  // Stock
  const stockEl = document.getElementById('stockInfo');
  if (p.stock > 0) {
    stockEl.innerHTML = `${t('stock')}: <span class="in-stock">${p.stock} ${lang === 'ar' ? 'متوفر' : 'Available'}</span>`;
  } else {
    stockEl.innerHTML = `<span class="out-stock">${t('out_of_stock')}</span>`;
  }

  // Reset qty
  document.getElementById('qtyInput').value = 1;
  document.getElementById('qtyInput').max = p.stock || 1;

  // Buy Now
  document.getElementById('buyNowBtn').onclick = () => {
    addToCart();
    window.location.href = '/checkout.html';
  };

  // Add to Cart
  document.getElementById('addToCartBtn').onclick = () => {
    addToCart();
    updateCartCount();
    showToast(t('added_to_cart'), 'success');
  };
}

function addToCart() {
  if (!currentProduct || !productId) return;
  const qty = parseInt(document.getElementById('qtyInput')?.value) || 1;

  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(i => i.id === productId);

  if (existing) {
    existing.qty = (existing.qty || 1) + qty;
  } else {
    cart.push({
      id: productId,
      nameAr: currentProduct.nameAr || currentProduct.name || '',
      nameEn: currentProduct.nameEn || '',
      price: currentProduct.price,
      image: currentProduct.image,
      qty
    });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const el = document.getElementById('cartCount');
  if (el) el.textContent = cart.reduce((s, i) => s + (i.qty || 1), 0);
}

function showToast(msg, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}
