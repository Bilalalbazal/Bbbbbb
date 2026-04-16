// ============================================
// js/checkout.js - إتمام الشراء + واتساب
// ============================================
import { db, collection, getDocs, addDoc, serverTimestamp, doc, getDoc } from './firebase-config.js';
import { getCurrentLang, toggleLang, applyLang, t } from './translate.js';

let deliveryZones = [];
let settings = {};

document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  setupLangToggle();
  init();
});

function setupLangToggle() {
  document.getElementById('langToggle')?.addEventListener('click', () => {
    toggleLang();
    renderCart();
    renderCities();
  });
}

async function init() {
  await Promise.all([loadDeliveryZones(), loadSettings()]);
  renderCart();
  setupConfirmOrder();
}

async function loadDeliveryZones() {
  try {
    const snap = await getDocs(collection(db, 'deliveryZones'));
    deliveryZones = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.active !== false) deliveryZones.push({ id: d.id, ...data });
    });
    renderCities();
  } catch (e) { console.error(e); }
}

async function loadSettings() {
  try {
    const [genSnap, delSnap] = await Promise.all([
      getDoc(doc(db, 'settings', 'general')),
      getDoc(doc(db, 'settings', 'delivery'))
    ]);
    if (genSnap.exists()) Object.assign(settings, genSnap.data());
    if (delSnap.exists()) Object.assign(settings, delSnap.data());
  } catch (e) { console.error(e); }
}

function renderCities() {
  const select = document.getElementById('custCity');
  if (!select) return;
  const lang = getCurrentLang();

  select.innerHTML = `<option value="">${t('select_city')}</option>`;
  deliveryZones.forEach(z => {
    const name = (lang === 'en' && z.nameEn) ? z.nameEn : (z.nameAr || z.name || '');
    const fee = z.price || 0;
    const dur = z.duration || '';
    const label = fee > 0 ? `${name} - ${fee}$` : `${name} - ${t('free_delivery')}`;
    select.innerHTML += `<option value="${z.id}" data-fee="${fee}" data-name="${name}" data-duration="${dur}">${label}</option>`;
  });

  select.addEventListener('change', () => {
    const opt = select.selectedOptions[0];
    const info = document.getElementById('deliveryInfo');
    if (opt && opt.value && opt.dataset.duration) {
      info.textContent = `🕐 ${lang === 'ar' ? 'مدة التوصيل:' : 'Delivery time:'} ${opt.dataset.duration}`;
    } else {
      info.textContent = '';
    }
    updateTotals();
  });
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const countEl = document.getElementById('itemCount');
  if (!container) return;

  const lang = getCurrentLang();
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');

  if (countEl) countEl.textContent = cart.length;

  if (cart.length === 0) {
    container.innerHTML = `<div class="cart-empty"><i class="fas fa-shopping-bag"></i><p>${t('cart_empty')}</p><a href="/products.html" class="btn btn-primary btn-sm" style="margin-top:12px">${t('start_shopping')}</a></div>`;
    updateTotals();
    return;
  }

  container.innerHTML = cart.map((item, i) => {
    const name = (lang === 'en' && item.nameEn) ? item.nameEn : (item.nameAr || '');
    return `
      <div class="cart-item">
        <div class="cart-item-image">
          <img src="${item.image || ''}" alt="${name}" onerror="this.src='https://via.placeholder.com/70'">
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${name}</div>
          <div class="cart-item-price">${item.price}$</div>
        </div>
        <div class="cart-item-qty">
          <button data-action="minus" data-index="${i}">-</button>
          <span>${item.qty || 1}</span>
          <button data-action="plus" data-index="${i}">+</button>
        </div>
        <button class="cart-item-remove" data-index="${i}"><i class="fas fa-trash"></i></button>
      </div>
    `;
  }).join('');

  // Events
  container.querySelectorAll('[data-action="minus"]').forEach(btn => {
    btn.addEventListener('click', () => changeQty(parseInt(btn.dataset.index), -1));
  });
  container.querySelectorAll('[data-action="plus"]').forEach(btn => {
    btn.addEventListener('click', () => changeQty(parseInt(btn.dataset.index), 1));
  });
  container.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeItem(parseInt(btn.dataset.index)));
  });

  updateTotals();
}

function changeQty(index, delta) {
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  if (cart[index]) {
    cart[index].qty = Math.max(1, (cart[index].qty || 1) + delta);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
  }
}

function removeItem(index) {
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
}

function updateTotals() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const subtotal = cart.reduce((s, i) => s + (i.price * (i.qty || 1)), 0);

  const select = document.getElementById('custCity');
  const opt = select?.selectedOptions[0];
  let fee = parseFloat(opt?.dataset?.fee || 0);

  // Free delivery check
  const freeMin = settings.freeDeliveryMin || 0;
  if (freeMin > 0 && subtotal >= freeMin) fee = 0;

  // If delivery disabled
  if (settings.enabled === false) fee = 0;

  const total = subtotal + fee;

  document.getElementById('subtotal').textContent = `${subtotal}$`;
  document.getElementById('deliveryFee').textContent = `${fee}$`;
  document.getElementById('totalAmount').textContent = `${total}$`;
}

function setupConfirmOrder() {
  document.getElementById('confirmOrder')?.addEventListener('click', async () => {
    const lang = getCurrentLang();
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) return showToast(t('cart_empty'), 'warning');

    const name = document.getElementById('custName')?.value?.trim();
    const phone = document.getElementById('custPhone')?.value?.trim();
    const citySelect = document.getElementById('custCity');
    const cityId = citySelect?.value;
    const cityName = citySelect?.selectedOptions[0]?.dataset?.name || '';
    const address = document.getElementById('custAddress')?.value?.trim();
    const notes = document.getElementById('custNotes')?.value?.trim() || '';

    if (!name || !phone || !cityId || !address) {
      return showToast(t('fill_all'), 'error');
    }

    const subtotal = cart.reduce((s, i) => s + (i.price * (i.qty || 1)), 0);
    let fee = parseFloat(citySelect?.selectedOptions[0]?.dataset?.fee || 0);
    const freeMin = settings.freeDeliveryMin || 0;
    if (freeMin > 0 && subtotal >= freeMin) fee = 0;
    if (settings.enabled === false) fee = 0;
    const total = subtotal + fee;

    // Save to Firebase
    try {
      await addDoc(collection(db, 'orders'), {
        customerName: name,
        customerPhone: phone,
        city: cityName,
        cityId,
        address,
        notes,
        items: cart,
        subtotal,
        deliveryFee: fee,
        total,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    } catch (e) { console.error('Save order error:', e); }

    // WhatsApp
    let msg = `🛒 *طلب جديد - TechStore*\n\n`;
    msg += `👤 ${name}\n📱 ${phone}\n🏙 ${cityName}\n📍 ${address}\n`;
    if (notes) msg += `📝 ${notes}\n`;
    msg += `\n📦 *المنتجات:*\n`;
    cart.forEach((item, i) => {
      msg += `${i + 1}. ${item.nameAr || item.nameEn} × ${item.qty} = ${item.price * item.qty}$\n`;
    });
    msg += `\n💰 المجموع: ${subtotal}$\n🚚 التوصيل: ${fee}$\n✅ *الإجمالي: ${total}$*`;

    const waNum = (settings.whatsappNumber || '+9647700000000').replace(/[^0-9+]/g, '');
    window.open(`https://wa.me/${waNum.replace('+', '')}?text=${encodeURIComponent(msg)}`, '_blank');

    localStorage.removeItem('cart');
    renderCart();
    showToast(lang === 'ar' ? 'تم إرسال الطلب بنجاح!' : 'Order sent successfully!', 'success');
  });
}

function showToast(msg, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) { container = document.createElement('div'); container.className = 'toast-container'; container.id = 'toastContainer'; document.body.appendChild(container); }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}
