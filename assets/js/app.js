// assets/js/app.js

// 1. ฟังก์ชันตรวจสอบ Session จังหวะเข้าใช้งาน
function checkAuthSession() {
  const userStr = sessionStorage.getItem('crmUser');
  
  if (!userStr) {
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

// 2. ฟังก์ชัน Logout กลาง
function handleLogout() {
  sessionStorage.clear();
  localStorage.clear();
  window.location.href = './';
}

// 3. เริ่มทำงานเมื่อโหลดหน้า index.html
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = checkAuthSession();
  if (currentUser) {
    console.log('LoggedIn as:', currentUser.Email || currentUser.email);
    
    const nameEl = document.getElementById('displayUserName') || document.getElementById('navUserName');
    if (nameEl) {
      nameEl.innerText = currentUser.Rep_Name || currentUser.rep_name || currentUser.Email || currentUser.email || '-';
    }
  }
});

// ==========================================
// 🚀 APP ROUTER & LIFECYCLE MANAGEMENT (DOM STACKING VERSION)
// ==========================================

window.addEventListener('load', async () => {
    await loadLoginComponent();
    checkSession();
    if (typeof setLanguage === 'function' && typeof currentLang !== 'undefined') {
        setLanguage(currentLang);
    }
});

async function loadLoginComponent() {
    try {
        const response = await fetch('Login.html');
        if (!response.ok) throw new Error("File Login.html not found");
        const htmlText = await response.text();
        const container = document.getElementById('loginComponent');
        container.innerHTML = htmlText;
        
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            if (oldScript.src) newScript.src = oldScript.src;
            if (oldScript.innerHTML) newScript.innerHTML = oldScript.innerHTML;
            document.body.appendChild(newScript);
        });
    } catch (error) {
        console.error(error);
        document.getElementById('loginComponent').innerHTML = `<div class="alert alert-danger text-center m-3">❌ Failed to load Login.html</div>`;
    }
}

/* =========================================
   CRM System - Main Router Engine (app.js)
   ========================================= */

async function loadComponent(page) {
    let url = '';
     
    // ⚡ 1. กำหนด Path โดยใส่ ./ นำหน้า และเช็กชื่อไฟล์ให้ตรงกับโครงสร้างจริง
    switch(page) {
        case 'dashboard': url = './pages/Dashboard.html'; break;
        case 'visit': url = './pages/ManageVisits.html'; break;
        case 'doctor': url = './pages/ManageDoctors.html'; break;
        case 'hospital': url = './pages/ManageHospitals.html'; break;
        case 'organization': url = './pages/ManageOrganization.html'; break; 
        case 'target': url = './pages/ManageTarget.html'; break;
        case 'matrix': url = './pages/ManageMatrix.html'; break; 
        case 'assignment': url = './pages/ManageAssignment.html'; break;
        case 'indexData': url = './pages/ManageIndex.html'; break;
        case 'dcr': url = './pages/ManageDCR.html'; break;
        case 'media': url = './pages/ManageMedia.html'; break;
        case 'user': url = './pages/ManageUsers.html'; break;
        default: 
            page = 'visit'; 
            url = './pages/ManageVisits.html'; 
    }

    // ⚡ 2. อัปเดตสถานะ Active บน Navbar Menu
    const menuItems = document.querySelectorAll('.nav-menu-item');
    menuItems.forEach(item => item.classList.remove('active'));

    const targetMenu = document.querySelector(`.nav-menu-item[data-page="${page}"]`);
    if (targetMenu) {
        targetMenu.classList.add('active');
    }

    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    // ⚡ 3. ลบตัว Loading System... ดั้งเดิมออกจากหน้าจอเฉพาะการโหลดครั้งแรก
    const initialLoading = mainContent.querySelector('.text-center.py-5.text-muted');
    if (initialLoading) {
        initialLoading.remove();
    }

    // ⚡ 4. ซ่อน View หน้าอื่นๆ ที่เคยถูกเรนเดอร์ไว้ใน DOM ทั้งหมด
    const allViews = mainContent.querySelectorAll('.spa-page-view');
    allViews.forEach(v => v.classList.add('d-none'));

    // ⚡ 5. เช็กว่าหน้านี้เคยถูกสร้างไว้ใน DOM หรือยัง (DOM Stacking)
    let pageView = document.getElementById(`view_page_${page}`);

    if (pageView) {
        // 🚀 ถ้ามี View ใน DOM อยู่แล้ว ให้เปิดโชว์ทันที 0s
        pageView.classList.remove('d-none');

        // 🌟 UX Standard Fix: บังคับ Reset สลับกลับมาแสดงหน้า List View หลักเสมอเมื่อคลิกเปลี่ยนเมนูบน Navbar
        if (page === 'doctor') {
            if (typeof window.switchDoctorView === 'function') {
                window.switchDoctorView('doctorListView');
            }
            if (typeof window.initDoctorPage === 'function') {
                window.initDoctorPage(false);
            }
        } else if (page === 'visit') {
            if (typeof window.switchVisitView === 'function') {
                window.switchVisitView('visitListView');
            }
            if (typeof window.initVisitPage === 'function') {
                window.initVisitPage(false);
            }
        }

        // ซ่อน Navbar Mobile เมื่อมีการเลือกเมนู
        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse && navbarCollapse.classList.contains('show')) {
            const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
            if(bsCollapse) bsCollapse.hide();
        }
        return;
    }

    // ⚡ 6. ถ้ายังไม่เคยเปิดหน้านี้เลย ให้ทำการ Fetch โหลดไฟล์ HTML เข้ามาครั้งแรก
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('File not found at ' + url);
        const html = await response.text();
        
        // สร้าง Container สวม View ใหม่
        pageView = document.createElement('div');
        pageView.id = `view_page_${page}`;
        pageView.className = 'spa-page-view';
        pageView.innerHTML = html;

        mainContent.appendChild(pageView);

        // สั่ง Init Controller ครั้งแรกด้วย (false) เพื่ออ่าน Cache
        if (page === 'doctor') {
            if (typeof window.switchDoctorView === 'function') {
                window.switchDoctorView('doctorListView');
            }
            if (typeof window.initDoctorPage === 'function') {
                window.initDoctorPage(false);
            }
        } else if (page === 'visit') {
            if (typeof window.switchVisitView === 'function') {
                window.switchVisitView('visitListView');
            }
            if (typeof window.initVisitPage === 'function') {
                window.initVisitPage(false);
            }
        }

        // ประมวลผลสคริปต์ย่อยใน View (ถ้ามี)
        const scriptElements = pageView.querySelectorAll('script');
        scriptElements.forEach(s => {
            if (s.src && s.src.includes('controllers/')) return;
            const code = s.textContent || s.innerText;
            const newScript = document.createElement('script');
            if (s.src) {
                newScript.src = s.src;
            } else if (code) {
                newScript.text = code;
            }
            document.head.appendChild(newScript).parentNode.removeChild(newScript);
        });
        
        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse && navbarCollapse.classList.contains('show')) {
             const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
             if(bsCollapse) bsCollapse.hide();
        }
        
        if (typeof setLanguage === 'function' && typeof currentLang !== 'undefined') {
            setLanguage(currentLang);
        }

    } catch (error) {
        console.error('Error loading component:', error);
        const errDiv = document.createElement('div');
        errDiv.className = 'spa-page-view';
        errDiv.innerHTML = `<div class="alert alert-danger m-4 text-center fw-bold">❌ Failed to load page (${url}) - Please check file path.</div>`;
        mainContent.appendChild(errDiv);
    }
}
function checkSession() {
    const userStr = sessionStorage.getItem('crmUser');
    const loginScreen = document.getElementById('loginScreen'); 
    const appContainer = document.getElementById('appContainer');

    if (userStr) {
        const user = JSON.parse(userStr);
        
        if (loginScreen) {
            loginScreen.classList.remove('d-flex');
            loginScreen.classList.add('d-none');
        }
        if (appContainer) appContainer.style.display = 'block';
        
        const nameDisplay = document.getElementById('displayUserName');
        const roleDisplay = document.getElementById('displayUserRole');
        const dName = user.Rep_Name || user.rep_name || user.name || user.Email || user.email;
        const uRole = user.Role || user.role || 'User';
        
        if(nameDisplay) nameDisplay.innerText = dName; 
        if(roleDisplay) roleDisplay.innerText = uRole;
        
        const adminItems = document.querySelectorAll('.admin-only');
        adminItems.forEach(el => {
            if (String(uRole).toLowerCase() === 'admin') {
                el.style.setProperty('display', 'block', 'important');
            } else {
                el.style.setProperty('display', 'none', 'important');
            }
        });

        loadComponent('visit');

    } else {
        if (loginScreen) {
            loginScreen.classList.remove('d-none');
            loginScreen.classList.add('d-flex');
        }
        if (appContainer) appContainer.style.display = 'none';
    }
}

async function logout() {
    try {
        var btn = document.getElementById('logoutBtn');
        if (btn) btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Logging out...';

        sessionStorage.clear();
        localStorage.clear();

        if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }
    } catch (e) {
        console.error("Logout Error:", e);
    } finally {
        window.location.reload(true);
    }
}
