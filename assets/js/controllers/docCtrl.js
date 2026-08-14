// ==========================================
// 1. GLOBAL STATE & CACHE FOR DOCTORS ENGINE
// ==========================================
window.DocManagerCache = window.DocManagerCache || {
  isLoaded: false,
  indexLoaded: false,
  doctors: [],
  indexTypes: [],
  indexes: [],
  hospitals: [],
  assignedDoctors: [],
  assignedHospitals: [],
  myAllowedDocIds: [],
  myAllowedTerIds: []
};

window.globalDoctors = [];
window.totalDoctorsCount = 0;
window.globalFilteredDoctors = []; 
window.globalHospitals = [];

window.currentDocSortCol = 'Doc_Name';
window.currentDocSortAsc = true; 

window.currentPage = 1;
window.rowsPerPage = 20;

window._isDocInitRunning = false;
window.isDocInitialLoading = true;
window.docFilterDebounceTimer = null;

window.activeSearchRecognition = null;
window.currentSearchInputId = null;
window.currentSearchBtnId = null;
window.currentSearchIconId = null;

// ==========================================
// 🛠️ 2. UTILITY & UI HELPER FUNCTIONS
// ==========================================
window.safeTranslate = function(key, fallbackText) {
  if (typeof t === 'function') {
    const res = t(key);
    return res !== key ? res : fallbackText;
  }
  return fallbackText;
};

window.getDoctorNameByLang = function(docObj, defaultId) {
  if (!docObj) return defaultId || '-';
  var lang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  if (lang === 'en') return docObj.Doc_Name || docObj.doc_name || docObj.name || defaultId || '-';
  var hasQuestionMarks = docObj.Doc_Name_TH && docObj.Doc_Name_TH.indexOf('???') !== -1;
  if (docObj.Doc_Name_TH && !hasQuestionMarks) return docObj.Doc_Name_TH;
  return docObj.Doc_Name || docObj.doc_name || defaultId || '-';
};

window.switchDoctorView = function(viewId) {
  ['doctorListView', 'doctorAddView', 'doctorEditView', 'doctorProfileView'].forEach(v => { 
    const el = document.getElementById(v); if (el) el.classList.add('d-none'); 
  });
  const target = document.getElementById(viewId); if(target) target.classList.remove('d-none');
  window.scrollTo(0, 0); 

  if (typeof setLanguage === 'function' && typeof currentLang !== 'undefined') {
    setLanguage(currentLang);
  }
};

window.goBackFromDoctorProfile = function() {
  const returnHospId = sessionStorage.getItem('returnToHospId');
  if (returnHospId) {
    sessionStorage.removeItem('returnToHospId');
    if (typeof window.loadComponent === 'function') {
      window.loadComponent('hospital');
    }
  } else {
    window.switchDoctorView('doctorListView');
  }
};

window.initMultiTomSelect = function(id, placeholder) {
  const el = document.getElementById(id);
  if(!el) return;
  if(el.tomselect) el.tomselect.destroy();
  
  if (typeof TomSelect !== 'undefined') {
    new TomSelect(`#${id}`, { 
      plugins: ['remove_button'],
      create: false, 
      searchField: ["text"],
      sortField: { field: "text", direction: "asc" }, 
      placeholder: placeholder, 
      allowEmptyOption: true, 
      dropdownParent: 'body'
    });
  }
};

window.updateTomSelect = function(id, html, placeholder) {
  const el = document.getElementById(id);
  if(!el) return;
  if(el.tomselect) el.tomselect.destroy();
  el.innerHTML = html;
  if (typeof TomSelect !== 'undefined') {
    new TomSelect(`#${id}`, { 
      create: false, 
      searchField: ["text"],
      sortField: { field: "text", direction: "asc" }, 
      placeholder: placeholder, 
      allowEmptyOption: true, 
      dropdownParent: 'body' 
    });
  }
};

// ==========================================
// 🎤 3. SPEECH SEARCH ENGINE (VOICE SEARCH)
// ==========================================
window.toggleSpeechSearch = function(inputId, btnId, iconId) {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    var msgNoMic = appLang === 'en' ? "Sorry, your browser does not support voice dictation." : "ขออภัยครับ เบราว์เซอร์ของคุณไม่รองรับระบบสั่งงานด้วยเสียง";
    if (window.showToast) return window.showToast(msgNoMic, "error");
    return alert(msgNoMic);
  }

  if (window.activeSearchRecognition && window.currentSearchInputId === inputId) {
    window.stopSpeechSearch();
    return;
  }

  if (window.activeSearchRecognition) {
    window.stopSpeechSearch();
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  window.activeSearchRecognition = new SpeechRecognition();
  window.activeSearchRecognition.lang = 'th-TH';
  window.activeSearchRecognition.continuous = false;
  window.activeSearchRecognition.interimResults = false;

  window.currentSearchInputId = inputId;
  window.currentSearchBtnId = btnId;
  window.currentSearchIconId = iconId;

  const btn = document.getElementById(btnId);
  const icon = document.getElementById(iconId);

  if (btn && icon) {
    btn.classList.add('mic-active');
    icon.classList.add('fa-fade');
  }

  window.activeSearchRecognition.onresult = function(event) {
    let spokenText = event.results[0][0].transcript.trim();
    const inputEl = document.getElementById(inputId);
    if (inputEl && spokenText) {
      inputEl.value = spokenText;
      window.debouncedFilterDoctors();
    }
    window.stopSpeechSearch();
  };

  window.activeSearchRecognition.onerror = window.stopSpeechSearch;
  window.activeSearchRecognition.onend = window.stopSpeechSearch;
  window.activeSearchRecognition.start();
};

window.stopSpeechSearch = function() {
  if (window.activeSearchRecognition) {
    window.activeSearchRecognition.stop();
    window.activeSearchRecognition = null;
  }
  if (window.currentSearchBtnId && window.currentSearchIconId) {
    const btn = document.getElementById(window.currentSearchBtnId);
    const icon = document.getElementById(window.currentSearchIconId);
    if (btn && icon) {
      btn.classList.remove('mic-active');
      icon.classList.remove('fa-fade');
    }
  }
  window.currentSearchInputId = null;
  window.currentSearchBtnId = null;
  window.currentSearchIconId = null;
};

// ==========================================
// 📥 4. PERMISSIONS & DROPDOWNS SETUP
// ==========================================
window.loadIndexDropdowns = async function(forceReload = false) {
  try {
    const sb = window.supabaseClient || window.supabase;
    if (!sb) return;

    var crmUser = null;
    try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}
    var myRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || crmUser.User_ID || '').trim() : '';

    if (forceReload || !window.DocManagerCache.indexLoaded || window.DocManagerCache.ownerId !== myRepId) {
      window.DocManagerCache.ownerId = myRepId;

      const fetchFn = typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords : async function(tbl, modifier) {
        let q = sb.from(tbl).select('*'); if (modifier) q = modifier(q);
        const r = await q; return r.data || [];
      };

      const [typeRes, idxRes, hospRes, assignRes, terrRes, teamRes, buRes, docDistinctRes] = await Promise.all([
        sb.from('IndexType').select('*'),
        sb.from('Index').select('*').order('Value', { ascending: true }),
        fetchFn('Hospitals', q => q.eq('Status', 'Active').order('Hospital', { ascending: true })),
        fetchFn('Assignment'),
        sb.from('Territory').select('*'),
        sb.from('Team').select('*'),
        sb.from('BU').select('*'),
        sb.from('Doctors').select('Specialty, Type') // 🌟 ดึงข้อมูล Specialty และ Doctor Type ทั้งหมดมาดึง Distinct
      ]);

      window.DocManagerCache.indexTypes = typeRes.data || [];
      window.DocManagerCache.indexes = idxRes.data || [];
      window.DocManagerCache.hospitals = hospRes || [];

      // --- 🌟 คำนวณสิทธิ์ตาม HIERARCHY MAPPING ---
      var uRoleUpper = crmUser ? String(crmUser.Role || crmUser.role || '').trim().toUpperCase() : '';
      var rawScope = crmUser ? String(crmUser.Territory_ID || crmUser.territory_id || crmUser.Territory || crmUser.Team_ID || crmUser.BU_ID || '').trim() : '';

      var isGlobalViewer = false;
      var adminRoles = ['ADMIN', 'STAFF', 'DIRECTOR', 'EXECUTIVE', 'PRODUCT MANAGER'];
      if (adminRoles.indexOf(uRoleUpper) !== -1 || rawScope.toUpperCase() === 'ALL') {
        isGlobalViewer = true;
      }

      var allowedTerIds = [];
      var allowedDocIds = [];

      if (!isGlobalViewer) {
        var isBuHead = uRoleUpper.indexOf('BU') !== -1 || uRoleUpper.indexOf('HEAD') !== -1;
        var isManager = uRoleUpper.indexOf('MANAGER') !== -1;

        if (isBuHead) {
          var matchedBu = (buRes.data || buRes || []).find(b => String(b.BU_ID) === rawScope || String(b.BU) === rawScope);
          var targetBuId = matchedBu ? String(matchedBu.BU_ID) : rawScope;
          
          var buTeams = (teamRes.data || teamRes || []).filter(t => String(t.BU_ID) === targetBuId || String(t.BU) === rawScope);
          var buTeamIds = buTeams.map(t => String(t.Team_ID));
          
          var terrs = (terrRes.data || terrRes || []).filter(ter => buTeamIds.indexOf(String(ter.Team_ID)) !== -1 || String(ter.BU_ID) === targetBuId);
          terrs.forEach(ter => allowedTerIds.push(String(ter.Territory_ID)));

        } else if (isManager) {
          var matchedTeam = (teamRes.data || teamRes || []).find(t => String(t.Team_ID) === rawScope || String(t.Team) === rawScope);
          var targetTeamId = matchedTeam ? String(matchedTeam.Team_ID) : rawScope;
          
          var terrs = (terrRes.data || terrRes || []).filter(t => String(t.Team_ID) === targetTeamId);
          terrs.forEach(t => allowedTerIds.push(String(t.Territory_ID)));
          if (allowedTerIds.length === 0 && rawScope) allowedTerIds.push(rawScope);

        } else { 
          if (rawScope) allowedTerIds.push(rawScope);
        }

        var allowedTerIdsMap = {}; 
        allowedTerIds.forEach(id => allowedTerIdsMap[id] = true);
        
        var myAssignments = (assignRes || []).filter(a => allowedTerIdsMap[String(a.Territory_ID || a.Territory)]);
        myAssignments.forEach(a => { 
          if (a.Type === 'Doctor') allowedDocIds.push(String(a.Account_ID)); 
        });
      }

      window.DocManagerCache.isGlobalViewer = isGlobalViewer;
      window.DocManagerCache.myAllowedTerIds = allowedTerIds;
      window.DocManagerCache.myAllowedDocIds = allowedDocIds;
      window.DocManagerCache.indexLoaded = true;

      // 🌟 เติม Dropdown Specialty (กรองเฉพาะที่มีใน Data จริงเท่านั้น)
      const specSelect = document.getElementById('filterDocSpecialty');
      if (docDistinctRes.data && specSelect) {
        const uniqueSpecs = [...new Set(docDistinctRes.data.map(d => d.Specialty).filter(v => v && v.trim() !== '' && v !== '-'))].sort();
        specSelect.innerHTML = uniqueSpecs.map(s => `<option value="${s}">${s}</option>`).join('');
        window.initMultiTomSelect('filterDocSpecialty', '- All Specialties -');
      }

      // 🌟 เติม Dropdown Doctor Type (กรองเฉพาะที่มีใน Data จริงเท่านั้น)
      const typeSelect = document.getElementById('filterDocType');
      if (docDistinctRes.data && typeSelect) {
        const uniqueTypes = [...new Set(docDistinctRes.data.map(d => d.Type).filter(v => v && v.trim() !== '' && v !== '-'))].sort();
        typeSelect.innerHTML = uniqueTypes.map(t => `<option value="${t}">${t}</option>`).join('');
        window.initMultiTomSelect('filterDocType', '- All Types -');
      }
    }
  } catch (err) {
    console.warn("Dropdown load warning:", err.message);
  }
};

// ==========================================
// 📊 5. SERVER-SIDE PAGINATION & SMART SEARCH
// ==========================================
window.loadDoctors = async function(forceReload = false) {
  const tbody = document.getElementById('doctorTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary mb-2"></div><div class="text-muted small">Loading Doctors...</div></td></tr>`;

  try {
    const sb = window.supabaseClient || window.supabase;
    if (!sb) throw new Error("Supabase client not initialized");

    let query = sb.from('Doctors').select('*', { count: 'exact' });

    // 🌟 สิทธิ์การเข้าถึงข้อมูลตาม Assignment
    const isGlobalViewer = window.DocManagerCache.isGlobalViewer;
    const allowedDocIds = window.DocManagerCache.myAllowedDocIds || [];

    if (!isGlobalViewer) {
      if (allowedDocIds.length > 0) {
        query = query.in('Doc_ID', allowedDocIds);
      } else {
        query = query.eq('Doc_ID', '00000000-0000-0000-0000-000000000000'); 
      }
    }

    // 🌟 1. SMART SEARCH (หมอ + โรงพยาบาล)
    const smartSearchInput = document.getElementById('smartDocSearchInput');
    const rawSearchVal = smartSearchInput ? smartSearchInput.value.trim().toLowerCase() : '';

    if (rawSearchVal) {
      const searchTerms = rawSearchVal.split(/\s+/);
      
      for (let i = 0; i < searchTerms.length; i++) {
        const term = searchTerms[i];
        
        // ค้นหาโรงพยาบาลที่แมปคำค้นหาเจอ
        const matchedHospIds = (window.DocManagerCache.hospitals || [])
          .filter(h => {
            const hName = String(h.Hospital || '').toLowerCase();
            const hKnown = String(h.Known_As || '').toLowerCase();
            return hName.includes(term) || hKnown.includes(term);
          })
          .map(h => h.Hospital_ID);

        // สร้าง OR Condition สำหรับค้นหา Doc_Name, Doc_Name_TH หรือ Hospital_ID
        let orConditions = [`Doc_Name.ilike.%${term}%`, `Doc_Name_TH.ilike.%${term}%`];
        if (matchedHospIds.length > 0) {
          orConditions.push(`Hospital_ID.in.(${matchedHospIds.slice(0, 50).join(',')})`);
        }

        query = query.or(orConditions.join(','));
      }
    }

    // 🌟 2. FILTERS (Specialty & Doctor Type)
    const specEl = document.getElementById('filterDocSpecialty');
    const typeEl = document.getElementById('filterDocType');

    const selectedSpecs = specEl && specEl.tomselect ? specEl.tomselect.getValue() : [];
    const selectedTypes = typeEl && typeEl.tomselect ? typeEl.tomselect.getValue() : [];

    if (Array.isArray(selectedSpecs) && selectedSpecs.length > 0) query = query.in('Specialty', selectedSpecs);
    if (Array.isArray(selectedTypes) && selectedTypes.length > 0) query = query.in('Type', selectedTypes);

    // Sorting
    const sortCol = window.currentDocSortCol || 'Doc_Name';
    query = query.order(sortCol, { ascending: window.currentDocSortAsc });

    // Pagination
    const page = window.currentPage || 1;
    const limit = parseInt(window.rowsPerPage) || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const res = await query;
    if (res.error) throw res.error;

    window.globalDoctors = res.data || [];
    window.totalDoctorsCount = res.count || 0;

    window.renderDoctorTableServerSide();

    const filterGroup = document.getElementById('doctorFilterZoneGroup');
    if (filterGroup) filterGroup.classList.add('ready');

  } catch (err) {
    console.error("Load Doctors Error:", err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">❌ Load Failed: ${err.message}</td></tr>`;
  }
};

window.renderDoctorTableServerSide = function() {
  const tbody = document.getElementById('doctorTableBody');
  if (!tbody) return;

  const data = window.globalDoctors || [];
  const totalItems = window.totalDoctorsCount || 0;
  const rows = parseInt(window.rowsPerPage) || 20;
  const totalPages = Math.ceil(totalItems / rows);

  // 🌟 ดึงภาษาปัจจุบันของระบบ
  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';

  // 1. กรณีไม่มีข้อมูล
  if (data.length === 0) {
    if (document.getElementById('doctorPaginationContainer')) {
      document.getElementById('doctorPaginationContainer').classList.add('d-none');
    }
    const msgNoData = appLang === 'en' ? 'No doctors found.' : 'ไม่พบข้อมูลแพทย์';
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5"><i class="fa-solid fa-folder-open fs-3 mb-2 d-block text-muted"></i>${msgNoData}</td></tr>`;
    return;
  }

  // 2. แสดงตัวควบคุม Pagination
  if (document.getElementById('doctorPaginationContainer')) {
    document.getElementById('doctorPaginationContainer').classList.remove('d-none');
  }

  const startIndex = ((window.currentPage - 1) * rows) + 1;
  const endIndex = Math.min(startIndex + data.length - 1, totalItems);

  // 🌟 สรุปจำนวนรายการแบบ 2 ภาษา
  if (document.getElementById('doctorPageInfo')) {
    document.getElementById('doctorPageInfo').innerText = appLang === 'en'
      ? `Showing ${startIndex} to ${endIndex} of ${totalItems} entries`
      : `แสดง ${startIndex} ถึง ${endIndex} จาก ${totalItems} รายการ`;
  }

  // 3. วาดแถวข้อมูลในตาราง
  let htmlBuffer = '';
  const editBtnText = appLang === 'en' ? 'Edit' : 'แก้ไข';

  data.forEach(d => {
    // 🌟 แปลสถานะ
    const isStatusActive = (d.Status === 'Active');
    const badge = isStatusActive ? 'badge-soft-success' : 'badge-soft-danger';
    const statusTextShow = isStatusActive 
      ? (appLang === 'en' ? 'Active' : 'ใช้งาน') 
      : (appLang === 'en' ? 'Inactive' : 'ไม่ใช้งาน');
    
    // ดึงชื่อแพทย์ภาษาไทย/อังกฤษ (ป้องกันบั๊กเครื่องหมาย ???)
    const docNameShow = window.getDoctorNameByLang(d, d.Doc_ID);
    const docNameThShow = (d.Doc_Name_TH && d.Doc_Name_TH.indexOf('???') === -1) ? d.Doc_Name_TH : '-';
    
    // 🌟 ปุ่มแก้ไขแบบ 2 ภาษา
    const actionButton = `<button class="btn btn-sm btn-premium-secondary fw-bold" onclick="window.openEditDoctorView('${d.Doc_ID}')"><i class="fa-solid fa-pen me-1"></i> ${editBtnText}</button>`;
    
    const hospObj = (window.DocManagerCache.hospitals || []).find(h => String(h.Hospital_ID).toLowerCase() === String(d.Hospital_ID).toLowerCase());
    const hospNameShow = hospObj ? (hospObj.Known_As || hospObj.Hospital) : '-';

    const nameCellLink = `<a href="#" class="table-visit-link" onclick="window.openViewDoctorProfile('${d.Doc_ID}'); return false;"><i class="fa-solid fa-user-doctor me-2 text-primary"></i>${docNameShow}</a>`;

    htmlBuffer += `
      <tr>
        <td class="text-start ps-3">${nameCellLink}</td>
        <td class="fw-medium text-secondary">${docNameThShow}</td>
        <td><span class="badge badge-soft-product">${d.Specialty || '-'}</span></td>
        <td class="text-secondary"><small><i class="fa-regular fa-hospital me-1 text-primary"></i>${hospNameShow}</small></td>
        <td class="text-center"><span class="badge ${badge}">${statusTextShow}</span></td>
        <td class="text-center">${actionButton}</td>
      </tr>`;
  });

  tbody.innerHTML = htmlBuffer;

  // 🌟 เรียกปรับปุ่ม Prev/Next หน้า Pagination
  if (typeof window.renderDoctorPaginationControls === 'function') {
    window.renderDoctorPaginationControls(totalPages);
  }
};

 if (!window._isDocLangListenerAttached) {
  window.addEventListener('appLanguageChanged', function() {
    if (typeof window.renderDoctorTableServerSide === 'function' && window.globalDoctors.length > 0) {
      window.renderDoctorTableServerSide();
    }
  });
  window._isDocLangListenerAttached = true;
}

window.renderDoctorPaginationControls = function(totalPages) {
  // เรียกใช้ฟังก์ชันกลางจาก utils.js
  window.renderGlobalPagination('doctorPagination', window.currentPage, totalPages, 'goToDoctorPage');
};

window.goToDoctorPage = function(page) {
  window.currentPage = page;
  window.loadDoctors(true);
};

window.changeRowsPerPage = function() {
  const selectEl = document.getElementById('doctorRowsPerPage');
  window.rowsPerPage = parseInt(selectEl.value) || 20;
  window.currentPage = 1;
  window.loadDoctors(true);
};

window.filterDoctors = function() {
  if (window.isDocInitialLoading) return;
  window.currentPage = 1;
  window.loadDoctors(true);
};

window.debouncedFilterDoctors = function() {
  if (window.isDocInitialLoading) return;
  if (window.docFilterDebounceTimer) clearTimeout(window.docFilterDebounceTimer);
  window.docFilterDebounceTimer = setTimeout(function() { window.filterDoctors(); }, 300);
};

window.clearDoctorFilters = function() {
  const clearTs = (id) => {
    const el = document.getElementById(id);
    if (el && el.tomselect) el.tomselect.clear();
  };
  if (document.getElementById('smartDocSearchInput')) document.getElementById('smartDocSearchInput').value = '';
  clearTs('filterDocSpecialty');
  clearTs('filterDocType');
  window.filterDoctors();
};

window.sortDoctors = function(col) {
  const dbColMap = { 'Doc_Name': 'Doc_Name', 'Doc_Name_TH': 'Doc_Name_TH', 'Specialty': 'Specialty', 'Status': 'Status' };
  const targetCol = dbColMap[col] || 'Doc_Name';

  if (window.currentDocSortCol === targetCol) {
    window.currentDocSortAsc = !window.currentDocSortAsc; 
  } else {
    window.currentDocSortCol = targetCol;
    window.currentDocSortAsc = true; 
  }
  window.loadDoctors(true);
};

window.forceReloadDoctors = async function() {
  await window.loadIndexDropdowns(true);
  await window.loadDoctors(true);
};

// ==========================================
// 🚀 6. SAFE INITIALIZATION ENGINE
// ==========================================
window.initDoctorPage = async function(forceReload = false) {
  if (window._isDocInitRunning) return;
  window._isDocInitRunning = true;
  window.isDocInitialLoading = true;

  try {
    await window.loadIndexDropdowns(forceReload); 
    await window.loadDoctors(forceReload);
  } catch (err) {
    console.error("Init Doctors Failed:", err);
  } finally {
    window.isDocInitialLoading = false;
    window._isDocInitRunning = false;
  }
};

// SPA DOM WATCHER (SINGLE SAFE BINDING)
if (!window._docObserverAttached) {
  const docObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && (node.id === 'doctorTableBody' || (node.querySelector && node.querySelector('#doctorTableBody')))) {
            window.initDoctorPage(false);
          }
        });
      }
    });
  });
  docObserver.observe(document.body, { childList: true, subtree: true });
  window._docObserverAttached = true;
}

// Direct Trigger
setTimeout(() => {
  if (document.getElementById('doctorTableBody')) {
    window.initDoctorPage(true);
  }
}, 100);
