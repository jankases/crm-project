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
    await checkSession();
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
        if (container) container.innerHTML = htmlText;
        
        const scripts = container ? container.querySelectorAll('script') : [];
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            if (oldScript.src) newScript.src = oldScript.src;
            if (oldScript.innerHTML) newScript.innerHTML = oldScript.innerHTML;
            document.body.appendChild(newScript);
        });
    } catch (error) {
        console.error(error);
        const container = document.getElementById('loginComponent');
        if (container) container.innerHTML = `<div class="alert alert-danger text-center m-3">❌ Failed to load Login.html</div>`;
    }
}

// 🛡️ ฟังก์ชันเช็กเตือนเฉพาะกรณี "กดสร้างใหม่ แล้วมีการพิมพ์ค้างไว้" เท่านั้น
function hasUnsavedChanges() {
    const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    const isVisible = (el) => el && !el.classList.contains('d-none');

    const visitPageView = document.getElementById('view_page_visit');
    const visitFormView = document.getElementById('visitFormView');
    const visitFormTitle = document.getElementById('visitFormTitle')?.innerText || '';

    if (isVisible(visitPageView) && isVisible(visitFormView) && !visitFormTitle.includes('Edit')) {
        const details = document.getElementById('visitDetails')?.value.trim();
        const insight = document.getElementById('visitInsight')?.value.trim();
        const nextAction = document.getElementById('visitNextAction')?.value.trim();

        if (details || insight || nextAction) {
            return appLang === 'en' 
                ? "You have unsaved changes in the New Visit Form. Are you sure you want to leave?" 
                : "คุณมีข้อมูลการเยี่ยมที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?";
        }
    }

    const doctorPageView = document.getElementById('view_page_doctor');
    const doctorAddView = document.getElementById('doctorAddView');

    if (isVisible(doctorPageView) && isVisible(doctorAddView)) {
        const nameEn = document.getElementById('docNameEn')?.value.trim();
        const nameTh = document.getElementById('docNameTh')?.value.trim();
        if (nameEn || nameTh) {
            return appLang === 'en'
                ? "You have unsaved doctor information. Are you sure you want to leave?"
                : "คุณมีข้อมูลแพทย์ที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?";
        }
    }

    return null;
}

/* =========================================
   CRM System - Main Router Engine (app.js)
   ========================================= */

async function loadComponent(page) {
    const confirmMsg = hasUnsavedChanges();
    if (confirmMsg) {
        const userConfirmed = confirm(confirmMsg);
        if (!userConfirmed) {
            return;
        }
    }

    let url = '';
     
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

    // 1. อัปเดตเมนู Desktop Navbar
    const menuItems = document.querySelectorAll('.nav-menu-item');
    menuItems.forEach(item => item.classList.remove('active'));

    const targetMenu = document.querySelector(`.nav-menu-item[data-page="${page}"]`);
    if (targetMenu) {
        targetMenu.classList.add('active');
    }

    // 🌟 2. เพิ่มส่วนนี้: อัปเดตเมนู iPad Sidebar Rail ให้ไฮไลต์สี active ตามกันทันที!
    const ipadMenuItems = document.querySelectorAll('.sidebar-icon-btn');
    ipadMenuItems.forEach(item => item.classList.remove('active'));

    const targetIpadMenu = document.querySelector(`.sidebar-icon-btn.menu-${page}`);
    if (targetIpadMenu) {
        targetIpadMenu.classList.add('active');
    }

    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    const initialLoading = mainContent.querySelector('.text-center.py-5.text-muted');
    if (initialLoading) {
        initialLoading.remove();
    }

    const allViews = mainContent.querySelectorAll('.spa-page-view');
    allViews.forEach(v => v.classList.add('d-none'));

    let pageView = document.getElementById(`view_page_${page}`);

    if (pageView) {
        pageView.classList.remove('d-none');

        if (page === 'doctor') {
            if (typeof window.switchDoctorView === 'function') {
                window.switchDoctorView('doctorListView');
            }
            if (typeof window.initDoctorPage === 'function') {
                await window.initDoctorPage(false);
            }
        } else if (page === 'visit') {
            if (typeof window.switchVisitView === 'function') {
                window.switchVisitView('visitListView');
            }
            if (typeof window.initVisitPage === 'function') {
                await window.initVisitPage(false);
            }
        }

        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse && navbarCollapse.classList.contains('show')) {
            const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
            if(bsCollapse) bsCollapse.hide();
        }
        return;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('File not found at ' + url);
        const html = await response.text();
        
        pageView = document.createElement('div');
        pageView.id = `view_page_${page}`;
        pageView.className = 'spa-page-view';
        pageView.innerHTML = html;

        mainContent.appendChild(pageView);

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

        if (page === 'doctor') {
            if (typeof window.switchDoctorView === 'function') {
                window.switchDoctorView('doctorListView');
            }
            if (typeof window.initDoctorPage === 'function') {
                await window.initDoctorPage(false);
            }
        } else if (page === 'visit') {
            if (typeof window.switchVisitView === 'function') {
                window.switchVisitView('visitListView');
            }
            if (typeof window.initVisitPage === 'function') {
                await window.initVisitPage(false);
            }
        }
        
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

async function checkSession() {
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
        
        // 🌟 [แก้สิทธิ์หลุด]: กำหนดค่า Flags สิทธิ์ระดับผู้บริหารให้ถูกต้องตั้งแต่เริ่มเปิดเว็บ
        const roleUpper = String(uRole).toUpperCase().trim();
        window.myIsGlobalViewer = ['ADMIN', 'STAFF', 'DIRECTOR', 'EXECUTIVE', 'PRODUCT MANAGER'].indexOf(roleUpper) !== -1;
        window.myIsBuHead = roleUpper.indexOf('BU') !== -1 || roleUpper.indexOf('HEAD') !== -1;
        window.myIsManager = roleUpper.indexOf('MANAGER') !== -1;
        window.myIsSalesRole = !window.myIsGlobalViewer && !window.myIsBuHead && !window.myIsManager;

        const adminItems = document.querySelectorAll('.admin-only');
        adminItems.forEach(el => {
            if (window.myIsGlobalViewer || window.myIsBuHead || window.myIsManager) {
                el.style.setProperty('display', 'block', 'important');
            } else {
                el.style.setProperty('display', 'none', 'important');
            }
        });

        await loadComponent('visit');

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

// ==========================================
// 🛡️ IDLE TIMEOUT SECURITY (Auto Logout)
// ==========================================

let idleLastActivity = Date.now();
const IDLE_TIMEOUT_MINUTES = 30; // ตั้งค่าเวลาที่ต้องการ (หน่วย: นาที)
const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000;

// 1. ฟังก์ชันรีเซ็ตเวลา เมื่อมีการเคลื่อนไหว
function resetIdleTimer() {
    idleLastActivity = Date.now();
}

// 2. ฟังก์ชันตรวจสอบเวลาว่าเกินกำหนดหรือยัง
function checkIdleStatus() {
    const userStr = sessionStorage.getItem('crmUser');
    // ถ้ายังไม่ได้ Login ไม่ต้องทำงาน
    if (!userStr) return; 

    const currentTime = Date.now();
    // ถ้าเวลาปัจจุบัน ห่างจากเวลาที่มีการขยับครั้งล่าสุด เกินที่กำหนดไว้
    if (currentTime - idleLastActivity > IDLE_TIMEOUT_MS) {
        console.log('Session expired due to inactivity.');
        alert('⏳ หมดเวลาการเชื่อมต่อเนื่องจากไม่มีการใช้งานระบบ\nกรุณาเข้าสู่ระบบใหม่อีกครั้ง');
        
        // เรียกใช้ฟังก์ชัน logout() ที่คุณมีอยู่แล้ว
        if (typeof logout === 'function') {
            logout();
        } else if (typeof handleLogout === 'function') {
            handleLogout();
        } else {
            sessionStorage.clear();
            window.location.reload();
        }
    }
}

// 3. ฟังก์ชันเริ่มต้นดักจับ Event ต่างๆ ทั่วทั้งหน้าจอ
function initIdleTimeout() {
    // รายการ Event ที่จะถือว่าผู้ใช้ "ยังใช้งานอยู่" (รองรับทั้ง PC และ iPad)
    const activeEvents = ['mousemove', 'keydown', 'mousedown', 'click', 'scroll', 'touchstart'];
    
    activeEvents.forEach(event => {
        document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    // ตั้งเวลาให้ระบบคอยแอบตรวจสอบเงียบๆ ทุกๆ 1 นาที (60000 ms)
    setInterval(checkIdleStatus, 60000);
}

// 4. สั่งให้เริ่มทำงานทันทีเมื่อโหลดไฟล์ app.js เสร็จ
initIdleTimeout();
