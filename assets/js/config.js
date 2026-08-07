// =========================================
// CRM System - Global Configuration
// =========================================

// กุญแจสาธารณะ (Publishable Key) สำหรับฝั่ง Frontend ปลอดภัยที่จะเปิดเผย
const SUPABASE_URL = 'https://trrfwszgscftnybhhsor.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_SyOGO6gN7DGYmj0ltcvokg_y3WOtZdH'; 

// สร้างตัวเชื่อมต่อ Database ให้ทุกหน้าจอสามารถเรียกใช้งานได้
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
