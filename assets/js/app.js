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

// 🛡️ ฟังก์ชันเช็กข้อมูลพิมพ์ค้างก่อนเปลี่ยนหน้า (ตรวจเฉพาะหน้าปัจจุบันที่โชว์อยู่)
function hasUnsavedChanges() {
    const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    
    // Helper เช็กว่า Element แสดงผลอยู่จริงๆ ไม่ได้โดนซ่อนด้วย d-none
    const isVisible = (el) => el && !el.classList.contains('d-none') && el.offsetWidth > 0 && el.offsetHeight > 0;

    // 1. เช็กฟอร์มบันทึกการเยี่ยม (Visit Form) - ต้องเปิดอยู่ในหน้า Visit จริงๆ
    const visitPageView = document.getElementById('view_page_visit');
    const visitFormView = document.getElementById('visitFormView');
    
    if (isVisible(visitPageView) && isVisible(visitFormView)) {
        const detailsEl = document.getElementById('visitDetails');
        const insightEl = document.getElementById('visitInsight');
        const nextActionEl = document.getElementById('visitNextAction');

        const isDetailsDirty = detailsEl && detailsEl.value !== detailsEl.defaultValue && detailsEl.value.trim() !== '';
        const isInsightDirty = insightEl && insightEl.value !== insightEl.defaultValue && insightEl.value.trim() !== '';
        const isNextActionDirty = nextActionEl && nextActionEl.value !== nextActionEl.defaultValue && nextActionEl.value.trim() !== '';

        if (isDetailsDirty || isInsightDirty || isNextActionDirty) {
            return appLang === 'en' 
                ? "You have unsaved changes in the Visit Form. Are you sure you want to leave?" 
                : "คุณมีข้อมูลการเยี่ยมที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?";
        }
    }

    // 2. เช็กฟอร์มแพทย์ (Doctor Add / Edit) - ต้องเปิดอยู่ในหน้า Doctor จริงๆ
    const doctorPageView = document.getElementById('view_page_doctor');
    const doctorAddView = document.getElementById('doctorAddView');
    const doctorEditView = document.getElementById('doctorEditView');

    if (isVisible(doctorPageView)) {
        if (isVisible(doctorAddView)) {
            const nameEn = document.getElementById('docNameEn')?.value.trim();
            const nameTh = document.getElementById('docNameTh')?.value.trim();
            if (nameEn || nameTh) {
                return appLang === 'en'
                    ? "You have unsaved doctor information. Are you sure you want to leave?"
                    : "คุณมีข้อมูลแพทย์ที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?";
            }
        }

        if (isVisible(doctorEditView)) {
            const editEnEl = document.getElementById('editDocNameEn');
            const editThEl = document.getElementById('editDocNameTh');

            const isEnDirty = editEnEl && editEnEl.value !== editEnEl.defaultValue;
            const isThDirty = editThEl && editThEl.value !== editThEl.defaultValue;

            if (isEnDirty || isThDirty) {
                return appLang === 'en'
                    ? "You have unsaved changes in the Doctor Edit Form. Are you sure you want to leave?"
                    : "คุณมีข้อมูลการแก้ไขแพทย์ที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?";
            }
        }
    }

    return null;
}

/* =========================================
   CRM System - Main Router Engine (app.js)
   ========================================= */

async function loadComponent(page) {
    // 🛡️ ตรวจสอบข้อมูลค้างก่อนเปลี่ยนหน้า
    const confirmMsg = hasUnsavedChanges();
    if (confirmMsg) {
        const userConfirmed = confirm(confirmMsg);
        if (!userConfirmed) {
            return; // ยกเลิกการสลับหน้า อยู่หน้าเดิม
        }
    }

    let url = '';
     
    // ⚡ 1. กำหนด Path โดยใส่ ./ นำหน้า
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

    // ⚡ 4. ซ่อน View หน้าอื่นๆ ใน DOM ทั้งหมด
    const allViews = mainContent.querySelectorAll('.spa-page-view');
    allViews.forEach(v => v.classList.add('d-none'));

    // ⚡ 5. เช็กว่าหน้านี้เคยถูกสร้างไว้ใน DOM หรือยัง (DOM Stacking)
    let pageView = document.getElementById(`view_page_${page}`);

    if (pageView) {
        pageView.classList.remove('d-none');

        // 🌟 UX Standard Fix: บังคับ Reset สลับกลับมาแสดงหน้า List View หลักเสมอเมื่อคลิกเมนู Navbar
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

        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse && navbarCollapse.classList.contains('show')) {
            const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
            if(bsCollapse) bsCollapse.hide();
        }
        return;
    }

    // ⚡ 6. ถ้ายังไม่เคยเปิดหน้านี้ ให้ Fetch โหลด HTML เข้ามาครั้งแรก
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('File not found at ' + url);
        const html = await response.text();
        
        pageView = document.createElement('div');
        pageView.id = `view_page_${page}`;
        pageView.className = 'spa-page-view';
        pageView.innerHTML = html;

        mainContent.appendChild(pageView);

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
