// ============================================
// Firebase + Supabase Configuration - TechStore Pro
// ============================================

// 🔵 Firebase (للبيانات والمصادقة فقط)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  setDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🟢 Supabase (للصور والفيديو فقط)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ===== Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyAuYnxHceSoDDQ2pu68Uxy8rVqo2C99C1A",
  authDomain: "techstore-34c97.firebaseapp.com",
  projectId: "techstore-34c97",
  messagingSenderId: "584678414925",
  appId: "1:584678414925:web:6ed953f704e669cd4bda04"
};

// تشغيل Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ===== Supabase Config =====
const supabaseUrl = "https://yxkornpmtpbvysssfuty.supabase.co";
const supabaseKey = "sb_publishable_4d7Q0xaF1s195X6um8LlvQ_Iz_fT-a0";
export const supabase = createClient(supabaseUrl, supabaseKey);

// ===== دالة رفع الصور على Supabase Storage =====
export async function uploadImage(file, folder = "products") {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error("خطأ في رفع الصورة:", error);
    throw error;
  }
}

// ===== دالة حذف صورة من Supabase =====
export async function deleteImage(imageUrl) {
  try {
    if (!imageUrl || !imageUrl.includes('supabase')) return;
    
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/storage/v1/object/public/images/');
    if (pathParts.length < 2) return;
    
    const filePath = pathParts[1];
    
    const { error } = await supabase.storage
      .from('images')
      .remove([filePath]);
    
    if (error) throw error;
  } catch (error) {
    console.warn("خطأ في حذف الصورة:", error);
  }
}

// ===== Re-export Firestore functions =====
export { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  setDoc, 
  serverTimestamp,
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
};
