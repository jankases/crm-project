// assets/js/app.js

// 1. ฟังก์ชันตรวจสอบ Session จังหวะเข้าใช้งาน
function checkAuthSession() {
  const user = sessionStorage.getItem('crmUser');
  if (!user) {
    // ถ้าไม่มี Session ให้ส่งกลับหน้า Login
    window.location.href = '/login.html';
    return false;
  }
  return JSON.parse(user);
}

// 2. ฟังก์ชัน Logout กลาง (ล้างทุกอย่างในที่เดียว)
function handleLogout() {
  // ล้างข้อมูล User และ Flag การแจ้งเตือนทั้งหมด
  sessionStorage.removeItem('crmUser');
  sessionStorage.removeItem('hasShownDraftReminder');
  sessionStorage.clear();
  
  // ส่งกลับหน้า Login
  window.location.href = '/login.html';
}

// 3. เริ่มทำงานเมื่อโหลดหน้า index.html
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = checkAuthSession();
  if (currentUser) {
    console.log('LoggedIn as:', currentUser.Email);
    // แสดงชื่อ User บน Navbar
    const nameEl = document.getElementById('navUserName');
    if (nameEl) nameEl.innerText = currentUser.Rep_Name || currentUser.Email;
  }
});
