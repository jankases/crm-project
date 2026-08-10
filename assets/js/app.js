// assets/js/app.js

// 1. ฟังก์ชันตรวจสอบ Session จังหวะเข้าใช้งาน
function checkAuthSession() {
  const userStr = sessionStorage.getItem('crmUser');
  
  if (!userStr) {
    // ถ้าไม่มี Session ให้สลับแสดงผลหน้า Login (ไม่ต้องย้าย URL)
    const loginComponent = document.getElementById('loginComponent');
    const appContainer = document.getElementById('appContainer');
    
    if (loginComponent) {
      loginComponent.classList.remove('d-none');
      loginComponent.style.display = 'block';
    }
    if (appContainer) {
      appContainer.style.display = 'none';
    }
    return false;
  }
  
  try {
    return JSON.parse(userStr);
  } catch (e) {
    console.error("Invalid session data", e);
    return false;
  }
}

// 2. ฟังก์ชัน Logout กลาง (ล้าง Session และ Refresh กลับมาหน้าแรกของ Repository)
function handleLogout() {
  // ล้างข้อมูล User และ Flag ทั้งหมด
  sessionStorage.clear();
  localStorage.clear();
  
  // สั่ง Reload กลับมาหน้าแรกของ Repo (ใช้ ./ ป้องกันปัญหา Path คลาดเคลื่อนบน GitHub Pages)
  window.location.href = './';
}

// 3. เริ่มทำงานเมื่อโหลดหน้า index.html
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = checkAuthSession();
  if (currentUser) {
    console.log('LoggedIn as:', currentUser.Email || currentUser.email);
    
    // แสดงชื่อ User บน Navbar
    const nameEl = document.getElementById('displayUserName') || document.getElementById('navUserName');
    if (nameEl) {
      nameEl.innerText = currentUser.Rep_Name || currentUser.rep_name || currentUser.Email || currentUser.email || '-';
    }
  }
});
