// ============================================
// js/admin.js - لوحة التحكم الكاملة
// Firebase للبيانات + Supabase للصور
// ============================================
import {
  db, auth, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  setDoc, serverTimestamp, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  uploadImage, deleteImage
} from './firebase-config.js';
import { translateText } from './translate.js';

// ===== State =====
let currentImageFile = null;
let currentImageUrl = '';

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupSidebar();
  setupModals();
  setupAutoTranslation();
  setupImageUpload();
});

// ======================================================
// AUTH
// ======================================================
function setupAuth() {
  onAuthStateChanged(auth, user => {
    if (user) {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('adminDashboard').style.display = 'flex';
      initDashboard();
    } else {
      document.getElementById('loginScreen').style.display = 'flex';
      document.getElementById('adminDashboard').style.display = 'none';
    }
  });

  document.getElementById('loginForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    const err = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div> جارٍ الدخول...';

    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      err.style.display = 'block';
      err.textContent = 'بيانات الدخول غير صحيحة';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
    }
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (confirm('هل تريد تسجيل الخروج؟')) signOut(auth);
  });
}

// ======================================================
// SIDEBAR
// ======================================================
function setupSidebar() {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      const tab = link.dataset.tab;
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.getElementById(`tab-${tab}`)?.classList.add('active');
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.getElementById('pageTitle').textContent = link.querySelector('span')?.textContent || '';
      document.getElementById('adminSidebar')?.classList.remove('show');
    });
  });

  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('adminSidebar')?.classList.toggle('show');
  });
  document.getElementById('sidebarClose')?.addEventListener('click', () => {
    document.getElementById('adminSidebar')?.classList.remove('show');
  });
}

// ======================================================
// MODALS
// ======================================================
function setupModals() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('show');
    });
  });
}

function openModal(id) { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }

// ======================================================
// IMAGE UPLOAD (Supabase)
// ======================================================
function setupImageUpload() {
  const fileInput = document.getElementById('prodImageFile');
  const area = document.getElementById('fileUploadArea');
  const preview = document.getElementById('uploadPreview');
  const placeholder = document.getElementById('uploadPlaceholder');
  const previewImg = document.getElementById('previewImg');
  const removeBtn = document.getElementById('removeImageBtn');

  if (!fileInput) return;

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showToast('حجم الصورة يتجاوز 5MB', 'error');
    if (!file.type.startsWith('image/')) return showToast('يرجى اختيار ملف صورة', 'error');

    currentImageFile = file;
    const reader = new FileReader();
    reader.onload = ev => {
      previewImg.src = ev.target.result;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  // Drag & Drop
  ['dragenter', 'dragover'].forEach(evt => {
    area?.addEventListener(evt, e => { e.preventDefault(); area.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    area?.addEventListener(evt, e => { e.preventDefault(); area.classList.remove('dragover'); });
  });
  area?.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      currentImageFile = file;
      const reader = new FileReader();
      reader.onload = ev => {
        previewImg.src = ev.target.result;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  });

  removeBtn?.addEventListener('click', () => {
    currentImageFile = null;
    currentImageUrl = '';
    fileInput.value = '';
    preview.style.display = 'none';
    placeholder.style.display = '';
    document.getElementById('prodImageUrl').value = '';
  });

  // URL preview
  document.getElementById('prodImageUrl')?.addEventListener('input', e => {
    const url = e.target.value;
    if (url && url.startsWith('http')) {
      previewImg.src = url;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
      currentImageFile = null;
      currentImageUrl = url;
    }
  });
}

function resetImageUpload() {
  currentImageFile = null;
  currentImageUrl = '';
  const fileInput = document.getElementById('prodImageFile');
  if (fileInput) fileInput.value = '';
  const preview = document.getElementById('uploadPreview');
  const placeholder = document.getElementById('uploadPlaceholder');
  if (preview) preview.style.display = 'none';
  if (placeholder) placeholder.style.display = '';
  const urlInput = document.getElementById('prodImageUrl');
  if (urlInput) urlInput.value = '';
}

// ======================================================
// AUTO TRANSLATION
// ======================================================
function setupAutoTranslation() {
  const pairs = [
    ['prodNameAr', 'prodNameEn', 'ar', 'en'],
    ['prodNameEn', 'prodNameAr', 'en', 'ar'],
    ['prodDescAr', 'prodDescEn', 'ar', 'en'],
    ['prodDescEn', 'prodDescAr', 'en', 'ar'],
    ['catNameAr', 'catNameEn', 'ar', 'en'],
    ['catNameEn', 'catNameAr', 'en', 'ar'],
    ['zoneNameAr', 'zoneNameEn', 'ar', 'en'],
    ['zoneNameEn', 'zoneNameAr', 'en', 'ar'],
  ];

  const timers = {};

  pairs.forEach(([srcId, targetId, from, to]) => {
    document.getElementById(srcId)?.addEventListener('input', e => {
      clearTimeout(timers[srcId]);
      timers[srcId] = setTimeout(async () => {
        const val = e.target.value.trim();
        if (!val) return;
        const targetEl = document.getElementById(targetId);
        // Only auto-translate if target is empty or was auto-filled
        if (targetEl && (!targetEl.value || targetEl.dataset.auto === 'true')) {
          const translated = await translateText(val, from, to);
          targetEl.value = translated;
          targetEl.dataset.auto = 'true';
        }
      }, 800);
    });

    // Mark as manually edited
    document.getElementById(targetId)?.addEventListener('input', e => {
      e.target.dataset.auto = 'false';
    });
  });
}

// ======================================================
// INIT DASHBOARD
// ======================================================
function initDashboard() {
  loadStats();
  loadProducts();
  loadCategories();
  loadOrders();
  loadDeliveryZones();
  loadSettings();

  document.getElementById('addProductBtn')?.addEventListener('click', openAddProduct);
  document.getElementById('saveProductBtn')?.addEventListener('click', saveProduct);
  document.getElementById('addCategoryBtn')?.addEventListener('click', openAddCategory);
  document.getElementById('saveCategoryBtn')?.addEventListener('click', saveCategory);
  document.getElementById('addDeliveryZoneBtn')?.addEventListener('click', openAddZone);
  document.getElementById('saveDeliveryZoneBtn')?.addEventListener('click', saveZone);
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
  document.getElementById('saveDeliverySettingsBtn')?.addEventListener('click', saveDeliverySettings);
  document.getElementById('orderStatusFilter')?.addEventListener('change', loadOrders);
}

// ======================================================
// STATS
// ======================================================
async function loadStats() {
  try {
    const [pSnap, oSnap, cSnap] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'orders')),
      getDocs(collection(db, 'categories'))
    ]);

    document.getElementById('statProducts').textContent = pSnap.size;
    document.getElementById('statOrders').textContent = oSnap.size;
    document.getElementById('statCategories').textContent = cSnap.size;

    let rev = 0;
    oSnap.forEach(d => { const data = d.data(); if (data.status !== 'cancelled') rev += (data.total || 0); });
    document.getElementById('statRevenue').textContent = `$${rev.toFixed(0)}`;
  } catch (e) { console.error(e); }
}

// ======================================================
// PRODUCTS
// ======================================================
async function loadProducts() {
  try {
    const snap = await getDocs(collection(db, 'products'));
    const tbody = document.getElementById('productsTableBody');

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">لا توجد منتجات - أضف منتجك الأول!</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    snap.forEach(ds => {
      const p = ds.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${p.image || ''}" alt="" onerror="this.src='https://via.placeholder.com/50'"></td>
        <td>${p.nameAr || p.name || '-'}</td>
        <td>${p.nameEn || '-'}</td>
        <td>${p.categoryAr || p.category || '-'}</td>
        <td><strong>${p.price || 0}$</strong></td>
        <td>${p.stock || 0}</td>
        <td>${p.featured ? '<i class="fas fa-star featured-star"></i>' : '-'}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn action-btn-edit" data-id="${ds.id}"><i class="fas fa-edit"></i></button>
            <button class="action-btn action-btn-delete" data-id="${ds.id}"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.action-btn-edit').forEach(b => b.addEventListener('click', () => openEditProduct(b.dataset.id)));
    tbody.querySelectorAll('.action-btn-delete').forEach(b => b.addEventListener('click', () => deleteProduct(b.dataset.id)));
  } catch (e) { console.error(e); }
}

function openAddProduct() {
  document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> إضافة منتج جديد';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('prodCurrentImage').value = '';
  resetImageUpload();

  // Reset auto-translate flags
  ['prodNameEn', 'prodDescEn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.dataset.auto = 'true';
  });

  loadCategoryOptions();
  openModal('productModal');
}

async function openEditProduct(id) {
  try {
    const snap = await getDoc(doc(db, 'products', id));
    if (!snap.exists()) return;
    const p = snap.data();

    document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-edit"></i> تعديل المنتج';
    document.getElementById('productId').value = id;
    document.getElementById('prodNameAr').value = p.nameAr || p.name || '';
    document.getElementById('prodNameEn').value = p.nameEn || '';
    document.getElementById('prodDescAr').value = p.descAr || p.description || '';
    document.getElementById('prodDescEn').value = p.descEn || '';
    document.getElementById('prodPrice').value = p.price || '';
    document.getElementById('prodOldPrice').value = p.oldPrice || '';
    document.getElementById('prodStock').value = p.stock ?? 0;
    document.getElementById('prodFeatured').checked = p.featured || false;
    document.getElementById('prodCurrentImage').value = p.image || '';

    // Mark fields as manually filled
    ['prodNameEn', 'prodDescEn'].forEach(el => {
      const e = document.getElementById(el);
      if (e) e.dataset.auto = 'false';
    });

    // Show current image
    resetImageUpload();
    if (p.image) {
      currentImageUrl = p.image;
      document.getElementById('previewImg').src = p.image;
      document.getElementById('uploadPreview').style.display = 'block';
      document.getElementById('uploadPlaceholder').style.display = 'none';
    }

    await loadCategoryOptions(p.categoryId);
    openModal('productModal');
  } catch (e) { console.error(e); }
}

async function loadCategoryOptions(selectedId = '') {
  const select = document.getElementById('prodCategory');
  if (!select) return;
  try {
    const snap = await getDocs(collection(db, 'categories'));
    select.innerHTML = '<option value="">اختر الفئة</option>';
    snap.forEach(ds => {
      const c = ds.data();
      select.innerHTML += `<option value="${ds.id}" ${ds.id === selectedId ? 'selected' : ''}>${c.nameAr || c.name || ''} / ${c.nameEn || ''}</option>`;
    });
  } catch (e) { console.error(e); }
}

async function saveProduct() {
  const btn = document.getElementById('saveProductBtn');
  const id = document.getElementById('productId').value;
  const nameAr = document.getElementById('prodNameAr').value.trim();
  let nameEn = document.getElementById('prodNameEn').value.trim();
  const descAr = document.getElementById('prodDescAr').value.trim();
  let descEn = document.getElementById('prodDescEn').value.trim();
  const categoryId = document.getElementById('prodCategory').value;
  const price = parseFloat(document.getElementById('prodPrice').value) || 0;
  const oldPrice = parseFloat(document.getElementById('prodOldPrice').value) || null;
  const stock = parseInt(document.getElementById('prodStock').value) || 0;
  const featured = document.getElementById('prodFeatured').checked;
  const externalUrl = document.getElementById('prodImageUrl').value.trim();
  const currentImg = document.getElementById('prodCurrentImage').value;

  if (!nameAr || !categoryId || !price) {
    return showToast('يرجى ملء الاسم والفئة والسعر', 'error');
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner spinner-sm"></div> جارٍ الحفظ...';

  try {
    // Auto translate if empty
    if (!nameEn) nameEn = await translateText(nameAr, 'ar', 'en');
    if (!descEn && descAr) descEn = await translateText(descAr, 'ar', 'en');

    // Handle image
    let imageUrl = currentImg || currentImageUrl;

    if (currentImageFile) {
      // Upload to Supabase
      const progressEl = document.getElementById('uploadProgress');
      const statusEl = document.getElementById('uploadStatus');
      const fillEl = document.getElementById('progressFill');

      if (progressEl) progressEl.style.display = 'block';
      if (statusEl) statusEl.textContent = 'جارٍ رفع الصورة...';
      if (fillEl) fillEl.style.width = '50%';

      imageUrl = await uploadImage(currentImageFile, 'products');

      if (fillEl) fillEl.style.width = '100%';
      if (statusEl) statusEl.textContent = 'تم الرفع بنجاح!';

      // Delete old image if it was from Supabase
      if (currentImg && currentImg.includes('supabase') && currentImg !== imageUrl) {
        await deleteImage(currentImg);
      }
    } else if (externalUrl) {
      imageUrl = externalUrl;
    }

    if (!imageUrl) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> <span>حفظ المنتج</span>';
      return showToast('يرجى إضافة صورة للمنتج', 'error');
    }

    // Get category names
    let categoryAr = '', categoryEn = '';
    try {
      const catSnap = await getDoc(doc(db, 'categories', categoryId));
      if (catSnap.exists()) {
        categoryAr = catSnap.data().nameAr || catSnap.data().name || '';
        categoryEn = catSnap.data().nameEn || '';
      }
    } catch (e) {}

    const data = {
      nameAr, nameEn, descAr, descEn,
      categoryId, categoryAr, categoryEn,
      price, oldPrice, stock, featured,
      image: imageUrl,
      updatedAt: serverTimestamp()
    };

    if (id) {
      await updateDoc(doc(db, 'products', id), data);
      showToast('تم تحديث المنتج بنجاح ✅', 'success');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, 'products'), data);
      showToast('تم إضافة المنتج بنجاح ✅', 'success');
    }

    closeModal('productModal');
    loadProducts();
    loadStats();

  } catch (error) {
    console.error('Save product error:', error);
    showToast('حدث خطأ: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> <span>حفظ المنتج</span>';
    const progressEl = document.getElementById('uploadProgress');
    if (progressEl) setTimeout(() => progressEl.style.display = 'none', 2000);
  }
}

async function deleteProduct(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
  try {
    // Delete image from Supabase
    const snap = await getDoc(doc(db, 'products', id));
    if (snap.exists() && snap.data().image) {
      await deleteImage(snap.data().image);
    }
    await deleteDoc(doc(db, 'products', id));
    showToast('تم حذف المنتج', 'success');
    loadProducts();
    loadStats();
  } catch (e) {
    console.error(e);
    showToast('حدث خطأ', 'error');
  }
}

// ======================================================
// CATEGORIES
// ======================================================
async function loadCategories() {
  try {
    const snap = await getDocs(collection(db, 'categories'));
    const tbody = document.getElementById('categoriesTableBody');

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد فئات - أضف فئتك الأولى!</td></tr>';
      return;
    }

    const prodSnap = await getDocs(collection(db, 'products'));
    const counts = {};
    prodSnap.forEach(d => { const cid = d.data().categoryId; if (cid) counts[cid] = (counts[cid] || 0) + 1; });

    tbody.innerHTML = '';
    snap.forEach(ds => {
      const c = ds.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.nameAr || c.name || '-'}</td>
        <td>${c.nameEn || '-'}</td>
        <td><i class="${c.icon || 'fas fa-tag'}"></i> ${c.icon || '-'}</td>
        <td>${counts[ds.id] || 0}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn action-btn-edit" data-id="${ds.id}"><i class="fas fa-edit"></i></button>
            <button class="action-btn action-btn-delete" data-id="${ds.id}"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.action-btn-edit').forEach(b => b.addEventListener('click', () => openEditCategory(b.dataset.id)));
    tbody.querySelectorAll('.action-btn-delete').forEach(b => b.addEventListener('click', () => deleteCategory(b.dataset.id)));
  } catch (e) { console.error(e); }
}

function openAddCategory() {
  document.getElementById('categoryModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> إضافة فئة جديدة';
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryId').value = '';
  document.getElementById('catNameEn').dataset.auto = 'true';
  openModal('categoryModal');
}

async function openEditCategory(id) {
  try {
    const snap = await getDoc(doc(db, 'categories', id));
    if (!snap.exists()) return;
    const c = snap.data();
    document.getElementById('categoryModalTitle').innerHTML = '<i class="fas fa-edit"></i> تعديل الفئة';
    document.getElementById('categoryId').value = id;
    document.getElementById('catNameAr').value = c.nameAr || c.name || '';
    document.getElementById('catNameEn').value = c.nameEn || '';
    document.getElementById('catNameEn').dataset.auto = 'false';
    document.getElementById('catIcon').value = c.icon || '';
    openModal('categoryModal');
  } catch (e) { console.error(e); }
}

async function saveCategory() {
  const id = document.getElementById('categoryId').value;
  const nameAr = document.getElementById('catNameAr').value.trim();
  let nameEn = document.getElementById('catNameEn').value.trim();
  const icon = document.getElementById('catIcon').value.trim();

  if (!nameAr) return showToast('يرجى إدخال اسم الفئة', 'error');
  if (!nameEn) nameEn = await translateText(nameAr, 'ar', 'en');

  const data = { nameAr, nameEn, icon: icon || 'fas fa-tag', updatedAt: serverTimestamp() };

  try {
    if (id) {
      await updateDoc(doc(db, 'categories', id), data);
      showToast('تم تحديث الفئة ✅', 'success');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, 'categories'), data);
      showToast('تم إضافة الفئة ✅', 'success');
    }
    closeModal('categoryModal');
    loadCategories();
    loadStats();
  } catch (e) { console.error(e); showToast('حدث خطأ', 'error'); }
}

async function deleteCategory(id) {
  if (!confirm('هل أنت متأكد؟ سيتم حذف الفئة فقط وليس المنتجات.')) return;
  try {
    await deleteDoc(doc(db, 'categories', id));
    showToast('تم حذف الفئة', 'success');
    loadCategories();
    loadStats();
  } catch (e) { console.error(e); showToast('حدث خطأ', 'error'); }
}

// ======================================================
// ORDERS
// ======================================================
async function loadOrders() {
  try {
    const snap = await getDocs(collection(db, 'orders'));
    const tbody = document.getElementById('ordersTableBody');
    const recentBody = document.getElementById('recentOrdersBody');
    const filterVal = document.getElementById('orderStatusFilter')?.value || 'all';

    let orders = [];
    snap.forEach(ds => orders.push({ id: ds.id, ...ds.data() }));

    // Sort newest first
    orders.sort((a, b) => {
      const da = a.createdAt?.toDate?.() || new Date(0);
      const db2 = b.createdAt?.toDate?.() || new Date(0);
      return db2 - da;
    });

    // Filter
    let filtered = orders;
    if (filterVal !== 'all') filtered = orders.filter(o => o.status === filterVal);

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" class="text-center">لا توجد طلبات</td></tr>';
    } else {
      tbody.innerHTML = filtered.map((o, i) => {
        const date = o.createdAt?.toDate?.()?.toLocaleDateString('ar') || '-';
        const items = (o.items || []).map(it => `${it.nameAr || it.nameEn || ''} ×${it.qty}`).join('، ');
        return `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${o.customerName || '-'}</strong></td>
            <td>${o.customerPhone || '-'}</td>
            <td>${o.city || '-'}</td>
            <td style="max-width:180px;white-space:normal;font-size:.8rem">${items || '-'}</td>
            <td>${o.subtotal || 0}$</td>
            <td>${o.deliveryFee || 0}$</td>
            <td><strong>${o.total || 0}$</strong></td>
            <td><span class="status-badge status-${o.status || 'pending'}">${statusText(o.status)}</span></td>
            <td style="font-size:.8rem">${date}</td>
            <td>
              <div class="action-btns">
                <button class="action-btn action-btn-view" data-id="${o.id}" title="عرض"><i class="fas fa-eye"></i></button>
                <select class="status-select" data-id="${o.id}">
                  <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
                  <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>جارٍ التجهيز</option>
                  <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>تم التوصيل</option>
                  <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                </select>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Status change
      tbody.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('change', async e => {
          try {
            await updateDoc(doc(db, 'orders', e.target.dataset.id), { status: e.target.value, updatedAt: serverTimestamp() });
            showToast('تم تحديث حالة الطلب', 'success');
            loadOrders();
            loadStats();
          } catch (er) { showToast('حدث خطأ', 'error'); }
        });
      });

      // View order
      tbody.querySelectorAll('.action-btn-view').forEach(btn => {
        btn.addEventListener('click', () => viewOrder(btn.dataset.id, orders));
      });
    }

    // Recent (Dashboard)
    if (orders.length === 0) {
      recentBody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد طلبات</td></tr>';
    } else {
      recentBody.innerHTML = orders.slice(0, 5).map((o, i) => {
        const date = o.createdAt?.toDate?.()?.toLocaleDateString('ar') || '-';
        return `
          <tr>
            <td>${i + 1}</td>
            <td>${o.customerName || '-'}</td>
            <td>${o.city || '-'}</td>
            <td><strong>${o.total || 0}$</strong></td>
            <td><span class="status-badge status-${o.status || 'pending'}">${statusText(o.status)}</span></td>
            <td style="font-size:.85rem">${date}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (e) { console.error(e); }
}

function viewOrder(id, orders) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  const date = o.createdAt?.toDate?.()?.toLocaleString('ar') || '-';
  const body = document.getElementById('orderDetailBody');

  body.innerHTML = `
    <div class="order-detail-grid">
      <div class="order-detail-section">
        <h4><i class="fas fa-user"></i> معلومات العميل</h4>
        <div class="order-detail-row"><span>الاسم:</span><strong>${o.customerName || '-'}</strong></div>
        <div class="order-detail-row"><span>الهاتف:</span><strong>${o.customerPhone || '-'}</strong></div>
        <div class="order-detail-row"><span>المدينة:</span><strong>${o.city || '-'}</strong></div>
        <div class="order-detail-row"><span>العنوان:</span><strong>${o.address || '-'}</strong></div>
        ${o.notes ? `<div class="order-detail-row"><span>ملاحظات:</span><strong>${o.notes}</strong></div>` : ''}
      </div>
      <div class="order-detail-section">
        <h4><i class="fas fa-box"></i> المنتجات</h4>
        ${(o.items || []).map(it => `
          <div class="order-product-item">
            <img src="${it.image || ''}" alt="" onerror="this.src='https://via.placeholder.com/50'">
            <div style="flex:1">
              <div style="font-weight:600">${it.nameAr || it.nameEn || ''}</div>
              <div style="font-size:.85rem;color:var(--dark-2)">${it.price}$ × ${it.qty}</div>
            </div>
            <strong>${it.price * it.qty}$</strong>
          </div>
        `).join('')}
      </div>
      <div class="order-detail-section">
        <h4><i class="fas fa-calculator"></i> الحساب</h4>
        <div class="order-detail-row"><span>المجموع:</span><strong>${o.subtotal || 0}$</strong></div>
        <div class="order-detail-row"><span>التوصيل:</span><strong>${o.deliveryFee || 0}$</strong></div>
        <div class="order-detail-row" style="font-size:1.1rem;color:var(--primary)"><span>الإجمالي:</span><strong>${o.total || 0}$</strong></div>
      </div>
      <div class="order-detail-section">
        <h4><i class="fas fa-info-circle"></i> حالة الطلب</h4>
        <div class="order-detail-row"><span>الحالة:</span><span class="status-badge status-${o.status || 'pending'}">${statusText(o.status)}</span></div>
        <div class="order-detail-row"><span>التاريخ:</span><strong>${date}</strong></div>
      </div>
    </div>
  `;
  openModal('orderDetailModal');
}

function statusText(s) {
  return { pending: 'قيد الانتظار', processing: 'جارٍ التجهيز', delivered: 'تم التوصيل', cancelled: 'ملغي', completed: 'مكتمل' }[s] || s || 'قيد الانتظار';
}

// ======================================================
// DELIVERY ZONES
// ======================================================
async function loadDeliveryZones() {
  try {
    const snap = await getDocs(collection(db, 'deliveryZones'));
    const tbody = document.getElementById('deliveryZonesBody');
    const summary = document.getElementById('deliverySummary');

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد مناطق توصيل - أضف مناطقك!</td></tr>';
      if (summary) summary.innerHTML = '';
      return;
    }

    let zones = [];
    snap.forEach(ds => zones.push({ id: ds.id, ...ds.data() }));

    // Summary
    const activeCount = zones.filter(z => z.active !== false).length;
    const avgPrice = zones.reduce((s, z) => s + (z.price || 0), 0) / zones.length;
    if (summary) {
      summary.innerHTML = `
        <div class="delivery-stat"><i class="fas fa-map-marker-alt" style="color:var(--primary)"></i><div><div class="d-label">إجمالي المناطق</div><div class="d-value">${zones.length}</div></div></div>
        <div class="delivery-stat"><i class="fas fa-check-circle" style="color:var(--success)"></i><div><div class="d-label">مناطق نشطة</div><div class="d-value">${activeCount}</div></div></div>
        <div class="delivery-stat"><i class="fas fa-dollar-sign" style="color:var(--warning)"></i><div><div class="d-label">متوسط السعر</div><div class="d-value">${avgPrice.toFixed(1)}$</div></div></div>
      `;
    }

    tbody.innerHTML = '';
    zones.forEach(z => {
      const active = z.active !== false;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${z.nameAr || z.name || '-'}</td>
        <td>${z.nameEn || '-'}</td>
        <td><strong>${z.price || 0}$</strong></td>
        <td>${z.duration || '-'}</td>
        <td><span class="status-badge ${active ? 'status-active' : 'status-inactive'}">${active ? 'نشطة' : 'متوقفة'}</span></td>
        <td>
          <div class="action-btns">
            <button class="action-btn action-btn-edit" data-id="${z.id}"><i class="fas fa-edit"></i></button>
            <button class="action-btn action-btn-delete" data-id="${z.id}"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.action-btn-edit').forEach(b => b.addEventListener('click', () => openEditZone(b.dataset.id)));
    tbody.querySelectorAll('.action-btn-delete').forEach(b => b.addEventListener('click', () => deleteZone(b.dataset.id)));
  } catch (e) { console.error(e); }
}

function openAddZone() {
  document.getElementById('deliveryModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> إضافة منطقة توصيل';
  document.getElementById('deliveryForm').reset();
  document.getElementById('deliveryZoneId').value = '';
  document.getElementById('zoneActive').checked = true;
  document.getElementById('zoneNameEn').dataset.auto = 'true';
  openModal('deliveryModal');
}

async function openEditZone(id) {
  try {
    const snap = await getDoc(doc(db, 'deliveryZones', id));
    if (!snap.exists()) return;
    const z = snap.data();
    document.getElementById('deliveryModalTitle').innerHTML = '<i class="fas fa-edit"></i> تعديل منطقة التوصيل';
    document.getElementById('deliveryZoneId').value = id;
    document.getElementById('zoneNameAr').value = z.nameAr || z.name || '';
    document.getElementById('zoneNameEn').value = z.nameEn || '';
    document.getElementById('zoneNameEn').dataset.auto = 'false';
    document.getElementById('zonePrice').value = z.price || 0;
    document.getElementById('zoneDuration').value = z.duration || '';
    document.getElementById('zoneActive').checked = z.active !== false;
    openModal('deliveryModal');
  } catch (e) { console.error(e); }
}

async function saveZone() {
  const id = document.getElementById('deliveryZoneId').value;
  const nameAr = document.getElementById('zoneNameAr').value.trim();
  let nameEn = document.getElementById('zoneNameEn').value.trim();
  const price = parseFloat(document.getElementById('zonePrice').value) || 0;
  const duration = document.getElementById('zoneDuration').value.trim();
  const active = document.getElementById('zoneActive').checked;

  if (!nameAr) return showToast('يرجى إدخال اسم المنطقة', 'error');
  if (!nameEn) nameEn = await translateText(nameAr, 'ar', 'en');

  const data = { nameAr, nameEn, price, duration: duration || '1-3 أيام', active, updatedAt: serverTimestamp() };

  try {
    if (id) {
      await updateDoc(doc(db, 'deliveryZones', id), data);
      showToast('تم تحديث المنطقة ✅', 'success');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, 'deliveryZones'), data);
      showToast('تم إضافة المنطقة ✅', 'success');
    }
    closeModal('deliveryModal');
    loadDeliveryZones();
  } catch (e) { console.error(e); showToast('حدث خطأ', 'error'); }
}

async function deleteZone(id) {
  if (!confirm('هل أنت متأكد من حذف هذه المنطقة؟')) return;
  try {
    await deleteDoc(doc(db, 'deliveryZones', id));
    showToast('تم حذف المنطقة', 'success');
    loadDeliveryZones();
  } catch (e) { console.error(e); showToast('حدث خطأ', 'error'); }
}

// ======================================================
// SETTINGS
// ======================================================
async function loadSettings() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'general'));
    if (snap.exists()) {
      const s = snap.data();
      document.getElementById('storeNameAr').value = s.storeNameAr || 'تك ستور';
      document.getElementById('storeNameEn').value = s.storeNameEn || 'TechStore';
      document.getElementById('whatsappNumber').value = s.whatsappNumber || '';
      document.getElementById('currency').value = s.currency || '$';
    }
    const dSnap = await getDoc(doc(db, 'settings', 'delivery'));
    if (dSnap.exists()) {
      document.getElementById('enableDelivery').checked = dSnap.data().enabled !== false;
      document.getElementById('freeDeliveryMin').value = dSnap.data().freeDeliveryMin || 0;
    }
  } catch (e) { console.error(e); }
}

async function saveSettings() {
  try {
    await setDoc(doc(db, 'settings', 'general'), {
      storeNameAr: document.getElementById('storeNameAr').value.trim(),
      storeNameEn: document.getElementById('storeNameEn').value.trim(),
      whatsappNumber: document.getElementById('whatsappNumber').value.trim(),
      currency: document.getElementById('currency').value.trim(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    showToast('تم حفظ الإعدادات ✅', 'success');
  } catch (e) { console.error(e); showToast('حدث خطأ', 'error'); }
}

async function saveDeliverySettings() {
  try {
    await setDoc(doc(db, 'settings', 'delivery'), {
      enabled: document.getElementById('enableDelivery').checked,
      freeDeliveryMin: parseFloat(document.getElementById('freeDeliveryMin').value) || 0,
      updatedAt: serverTimestamp()
    }, { merge: true });
    showToast('تم حفظ إعدادات التوصيل ✅', 'success');
  } catch (e) { console.error(e); showToast('حدث خطأ', 'error'); }
}

// ======================================================
// TOAST
// ======================================================
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-20px)'; setTimeout(() => toast.remove(), 300); }, 3000);
}
