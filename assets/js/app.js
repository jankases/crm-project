/* =========================================
   CRM System - Main Router Engine (app.js)
   ========================================= */

// ⚡ ฟังก์ชันเช็กว่าฟอร์มปัจจุบันมีข้อมูลพิมพ์ค้างไว้หรือไม่
function hasUnsavedChanges() {
    const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    
    // 1. เช็กฟอร์ม Visit (ManageVisits)
    const visitFormView = document.getElementById('visitFormView');
    if (visitFormView && !visitFormView.classList.contains('d-none')) {
        const details = document.getElementById('visitDetails')?.value.trim();
        const insight = document.getElementById('visitInsight')?.value.trim();
        const nextAction = document.getElementById('visitNextAction')?.value.trim();
        const docVal = window.tomSelectDocInstance ? window.tomSelectDocInstance.getValue() : '';
        const prodVal = window.tomSelectProdInstance ? window.tomSelectProdInstance.getValue() : '';

        // ถ้ามีการพิมพ์รายละเอียด หรือเลือกหมอ/สินค้าค้างไว้
        if (details || insight || nextAction || docVal || (Array.isArray(prodVal) && prodVal.length > 0)) {
            return appLang === 'en' 
                ? "You have unsaved changes in the Visit Form. Are you sure you want to leave?" 
                : "คุณมีข้อมูลการเยี่ยมที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?";
        }
    }

    // 2. เช็กฟอร์ม Doctor Add/Edit (ManageDoctors)
    const doctorAddView = document.getElementById('doctorAddView');
    const doctorEditView = document.getElementById('doctorEditView');

    if (doctorAddView && !doctorAddView.classList.contains('d-none')) {
        const nameEn = document.getElementById('docNameEn')?.value.trim();
        const nameTh = document.getElementById('docNameTh')?.value.trim();
        if (nameEn || nameTh) {
            return appLang === 'en'
                ? "You have unsaved doctor information. Are you sure you want to leave?"
                : "คุณมีข้อมูลแพทย์ที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?";
        }
    }

    if (doctorEditView && !doctorEditView.classList.contains('d-none')) {
        const nameEn = document.getElementById('editDocNameEn')?.value.trim();
        const nameTh = document.getElementById('editDocNameTh')?.value.trim();
        if (nameEn || nameTh) {
            return appLang === 'en'
                ? "You have unsaved changes in the Doctor Edit Form. Are you sure you want to leave?"
                : "คุณมีข้อมูลการแก้ไขแพทย์ที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?";
        }
    }

    return null; // ไม่มีข้อมูลค้าง ผ่านได้เลย
}

async function loadComponent(page) {
    // 🛡️ 0. ตรวจสอบข้อมูลค้างก่อนเปลี่ยนหน้า
    const confirmMsg = hasUnsavedChanges();
    if (confirmMsg) {
        const userConfirmed = confirm(confirmMsg);
        if (!userConfirmed) {
            return; // ผู้ใช้กด "ยกเลิก" ให้ค้างไว้ที่หน้าเดิม
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

    const menuItems = document.querySelectorAll('.nav-menu-item');
    menuItems.forEach(item => item.classList.remove('active'));

    const targetMenu = document.querySelector(`.nav-menu-item[data-page="${page}"]`);
    if (targetMenu) {
        targetMenu.classList.add('active');
    }

    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    // ลบตัว Loading System... ตั้งต้นเฉพาะครั้งแรก
    const initialLoading = mainContent.querySelector('.text-center.py-5.text-muted');
    if (initialLoading) {
        initialLoading.remove();
    }

    // ซ่อน View หน้าอื่นๆ ใน DOM ทั้งหมด
    const allViews = mainContent.querySelectorAll('.spa-page-view');
    allViews.forEach(v => v.classList.add('d-none'));

    // เช็กว่าหน้านี้เคยถูกสร้างไว้ใน DOM หรือยัง (DOM Stacking)
    let pageView = document.getElementById(`view_page_${page}`);

    if (pageView) {
        pageView.classList.remove('d-none');

        // 🌟 พากลับมาแสดงหน้า List View หลักเสมอ และรีเซ็ตการแสดงผล
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

    // ถ้ายังไม่เคยเปิดหน้านี้ ให้ Fetch HTML มาเรนเดอร์ครั้งแรก
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
