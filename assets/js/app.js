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

// ==========================================
// 🚀 APP ROUTER & LIFECYCLE MANAGEMENT
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
        // ดึง Login.html จาก Root Directory ตรงๆ
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

async function loadComponent(page) {
    let url = '';
     
    switch(page) {
        case 'dashboard': url = 'pages/Dashboard.html'; break;
        case 'visit': url = 'pages/ManageVisits.html'; break;
        case 'doctor': url = 'pages/ManageDoctors.html'; break;
        case 'hospital': url = 'pages/ManageHospitals.html'; break;
        case 'organization': url = 'pages/ManageOrganization.html'; break; 
        case 'target': url = 'pages/ManageTarget.html'; break;
        case 'matrix': url = 'pages/ManageMatrix.html'; break; 
        case 'assignment': url = 'pages/ManageAssignment.html'; break;
        case 'indexData': url = 'pages/ManageIndex.html'; break;
        case 'dcr': url = 'pages/ManageDCR.html'; break;
        case 'media': url = 'pages/ManageMedia.html'; break;
        case 'user': url = 'pages/ManageUsers.html'; break;
        default: 
            page = 'visit'; 
            url = 'pages/ManageVisits.html'; 
    }

    const menuItems = document.querySelectorAll('.nav-menu-item');
    menuItems.forEach(item => item.classList.remove('active'));

    const targetMenu = document.querySelector(`.nav-menu-item[data-page="${page}"]`);
    if (targetMenu) {
        targetMenu.classList.add('active');
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('File not found ' + url);
        const html = await response.text();
        
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = html;

     // 🌟 สั่งรัน Controller เมื่อโหลดหน้า View เสร็จแล้ว
        if (page === 'doctor') {
            if (typeof window.initDoctorPage === 'function') {
                window.initDoctorPage(true);
            }
        } else if (page === 'visit') {
            if (typeof window.initVisitPage === 'function') {
                window.initVisitPage(true);
            }
        }

        // ประมวลผลเฉพาะสคริปต์ใน Component (ยกเว้น Controllers ที่โหลดไปแล้ว)
        const scriptElements = mainContent.querySelectorAll('script');
        scriptElements.forEach(s => {
            if (s.src && s.src.includes('controllers/')) return; // ข้ามการโหลดซ้ำ
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
        document.getElementById('mainContent').innerHTML = `<div class="alert alert-danger m-4 text-center fw-bold">❌ Failed to load page (${url})</div>`;
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

        // 📌 สั่งโหลดหน้า visit และเรียก Init ใหม่เพื่อบังคับดึง Data ล่าสุดตาม Session
        loadComponent('visit');
        setTimeout(() => {
            if (typeof window.initVisitPage === 'function') {
                window.initVisitPage();
            }
        }, 100);

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
