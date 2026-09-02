// =========================================
// CRM System - Language Dictionary & Functions
// =========================================

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
  
  // เคลียร์ Cache ระบบ
  if (window.DocManagerCache) window.DocManagerCache.isLoaded = false;
  if (window.VisitManagerCache) window.VisitManagerCache.isLoaded = false;
  if (window.HospManagerCache) window.HospManagerCache.isLoaded = false;

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

    // 2. อัปเดตเมนู iPad Sidebar Rail
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
 
 // 🛡️ ฟังก์ชันตรวจสอบ Session และคำนวณ ID สิทธิ์ล่วงหน้าครั้งเดียว (Pure Server-Side Preparation)
// 🛡️ ฟังก์ชันตรวจสอบ Session และคำนวณ ID สิทธิ์ล่วงหน้า (Rep, Territory, Doctor)
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
        
        const roleUpper = String(uRole).toUpperCase().trim();
        const sb = window.supabaseClient || window.supabase;
        
        // 🌟 ========================================================
        // 🔐 DATA PERMISSION ARCHITECTURE FLAGS
        // 🌟 ========================================================
        window.myUserRole = roleUpper;
        window.myUserBuId = user.BU_ID || user.bu_id || null;
        window.myUserTeamId = user.Team_ID || user.team_id || null;
        window.myUserTerritoryId = user.Territory_ID || user.territory_id || user.Area_ID || null;
        
        const adminRoles = ['ADMIN', 'STAFF', 'DIRECTOR', 'EXECUTIVE', 'SYSTEM ADMIN'];
        window.myIsGlobalViewer = adminRoles.indexOf(roleUpper) !== -1;
        window.myIsProductManager = roleUpper.indexOf('PRODUCT MANAGER') !== -1 || roleUpper === 'PM';
        window.myIsBuHead = !window.myIsGlobalViewer && !window.myIsProductManager && 
                            (roleUpper.indexOf('BU') !== -1 || roleUpper.indexOf('HEAD') !== -1);
        window.myIsManager = !window.myIsGlobalViewer && !window.myIsProductManager && !window.myIsBuHead && 
                             (roleUpper.indexOf('MANAGER') !== -1 || roleUpper.indexOf('LEAD') !== -1);
        window.myIsSalesRole = !window.myIsGlobalViewer && !window.myIsProductManager && !window.myIsBuHead && !window.myIsManager;

        // 🌟 [PRE-CALCULATE PERMISSION IDS]: คำนวณ Rep, Territory และ Doctor IDs ล่วงหน้า
        var myAllowedRepIds = [String(user.Rep_ID || user.id || '').trim()];
        var myAllowedTerIds = [];
        var myAllowedDocIds = [];

        if (!window.myIsGlobalViewer && sb) {
            try {
                if (window.myIsProductManager) {
                    var pmProdsRaw = sessionStorage.getItem('pmProducts');
                    var pmProdIds = pmProdsRaw ? JSON.parse(pmProdsRaw) : [];

                    if (pmProdIds.length > 0) {
                        const { data: vpDocs } = await sb.from('Visit_Products').select('Visit_ID').in('Product_ID', pmProdIds);
                        const vIds = (vpDocs || []).map(vp => vp.Visit_ID);
                        if (vIds.length > 0) {
                            const { data: vLogs } = await sb.from('Visit_Logs').select('Doc_ID').in('Visit_ID', vIds);
                            (vLogs || []).forEach(v => {
                                var did = String(v.Doc_ID).trim();
                                if (did && myAllowedDocIds.indexOf(did) === -1) myAllowedDocIds.push(did);
                            });
                        }
                    }
                } else if (window.myIsBuHead && window.myUserBuId) {
                    const { data: teams } = await sb.from('Team').select('Team_ID').eq('BU_ID', window.myUserBuId);
                    const teamIds = (teams || []).map(t => String(t.Team_ID));
                    
                    if (teamIds.length > 0) {
                        const { data: terrs } = await sb.from('Territory').select('Territory_ID').in('Team_ID', teamIds);
                        myAllowedTerIds = (terrs || []).map(t => String(t.Territory_ID));
                        
                        const { data: users } = await sb.from('Rep_Users').select('Rep_ID').in('BU_ID', [window.myUserBuId]);
                        (users || []).forEach(u => {
                            var uid = String(u.Rep_ID).trim();
                            if (uid && myAllowedRepIds.indexOf(uid) === -1) myAllowedRepIds.push(uid);
                        });
                    }
                } else if (window.myIsManager && window.myUserTeamId) {
                    const { data: terrs } = await sb.from('Territory').select('Territory_ID').eq('Team_ID', window.myUserTeamId);
                    myAllowedTerIds = (terrs || []).map(t => String(t.Territory_ID));

                    const { data: users } = await sb.from('Rep_Users').select('Rep_ID').eq('Team_ID', window.myUserTeamId);
                    (users || []).forEach(u => {
                        var uid = String(u.Rep_ID).trim();
                        if (uid && myAllowedRepIds.indexOf(uid) === -1) myAllowedRepIds.push(uid);
                    });
                } else if (window.myIsSalesRole && window.myUserTerritoryId) {
                    myAllowedTerIds = [String(window.myUserTerritoryId)];
                }

                // 🏥 คำนวณ Doctor IDs ผ่าน Assignment ตารางพื้นที่สำหรับ BU Head / Manager / Sales Rep
                if (!window.myIsProductManager && myAllowedTerIds.length > 0) {
                    const { data: assignRes } = await sb.from('Assignment').select('Account_ID, Type, Territory_ID').in('Territory_ID', myAllowedTerIds);
                    (assignRes || []).forEach(a => {
                        if (a.Type === 'Doctor') {
                            var docId = String(a.Account_ID).trim();
                            if (docId && myAllowedDocIds.indexOf(docId) === -1) {
                                myAllowedDocIds.push(docId);
                            }
                        }
                    });
                }
            } catch(err) {
                console.warn("Pre-calculate permission IDs warning:", err);
            }
        }

        window.myAllowedRepIds = myAllowedRepIds;
        window.myAllowedTerIds = myAllowedTerIds;
        window.myAllowedDocIds = myAllowedDocIds;

        // 🔒 แสดง Admin Tools เฉพาะ ADMIN / GLOBAL ตัวจริงเท่านั้น
        const adminItems = document.querySelectorAll('.admin-only');
        adminItems.forEach(el => {
            if (window.myIsGlobalViewer) {
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
            
            const expireReason = sessionStorage.getItem('session_expired_reason');
            const alertBanner = document.getElementById('loginAlertBanner');
            
            if (expireReason === 'idle_timeout' && alertBanner) {
                const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
                const msgText = appLang === 'en' 
                    ? '⏳ Session expired due to 30 mins of inactivity. Please log in again.' 
                    : '⏳ หมดเวลาการเชื่อมต่อเนื่องจากไม่มีการใช้งานระบบเกิน 30 นาที กรุณาเข้าสู่ระบบใหม่อีกครั้ง';
                
                alertBanner.className = 'alert alert-warning border-0 shadow-xs text-start mb-4 py-2.5 px-3 fade-in-up';
                alertBanner.style.borderRadius = '14px';
                alertBanner.style.fontSize = '0.85rem';
                alertBanner.innerHTML = `<div class="d-flex align-items-center gap-2"><i class="fa-solid fa-clock-rotate-left text-warning fs-5"></i><span>${msgText}</span></div>`;
                
                sessionStorage.removeItem('session_expired_reason');
            }
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

        // เคลียร์ Cache ของผู้ใช้ในทุก Controller
        if (window.DocManagerCache) window.DocManagerCache.isLoaded = false;
        if (window.VisitManagerCache) window.VisitManagerCache.isLoaded = false;
        if (window.HospManagerCache) window.HospManagerCache.isLoaded = false;

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
const IDLE_TIMEOUT_MINUTES = 30;
const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000;

function resetIdleTimer() {
    idleLastActivity = Date.now();
}

function checkIdleStatus() {
    const userStr = sessionStorage.getItem('crmUser');
    if (!userStr) return; 

    const currentTime = Date.now();
    if (currentTime - idleLastActivity > IDLE_TIMEOUT_MS) {
        console.log('Session expired due to inactivity.');
        
        sessionStorage.setItem('session_expired_reason', 'idle_timeout');
        
        if (typeof logout === 'function') {
            logout();
        } else {
            sessionStorage.clear();
            window.location.reload();
        }
    }
}

function initIdleTimeout() {
    const activeEvents = ['mousemove', 'keydown', 'mousedown', 'click', 'scroll', 'touchstart'];
    
    activeEvents.forEach(event => {
        document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    setInterval(checkIdleStatus, 60000);
}

initIdleTimeout();
