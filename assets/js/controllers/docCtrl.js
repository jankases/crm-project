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
  products: [],
  users: [],
  territories: [],
  matrixData: [],
  targetData: [],
  teamProdLinks: [],
  sysSettings: [],
  teamList: [],
  assignedDoctors: [],
  assignedHospitals: [],
  myAllowedDocIds: [],
  myAllowedTerIds: []
};

window.globalDoctors = [];
window.totalDoctorsCount = 0;
window.globalFilteredDoctors = []; 
window.globalHospitals = [];
window.globalProducts = [];
window.globalUsers = [];
window.globalTerritories = [];
window.currentTargetDocId = ""; 

window.globalIndexes = [];
window.globalIndexTypes = [];
window.globalMatrixData = [];
window.globalTargetData = [];
window.globalTeamProducts = []; 

window.globalPendingUnlockVisits = []; 
window.globalCurrentDoctorVisits = [];
window.globalCurrentDoctorVisitProducts = [];
window.currentPVisitSortCol = 'date';
window.currentPVisitSortAsc = false;

window.currentPVisitPage = 1;
window.pvisitRowsPerPage = 10;

window.currentDocSortCol = 'Doc_Name';
window.currentDocSortAsc = true; 

window.globalRatingIsLocked = false;
window.globalCurrentUserRole = '';

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

// 🌟 HELPER สำหรับดึงชื่อโรงพยาบาลตามภาษา
window.getHospitalNameByLang = function(hospObj) {
  if (!hospObj) return "Hospital";
  var lang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  if (lang === 'en') {
    return hospObj.Hospital || hospObj.Known_As || "Hospital";
  } else {
    return hospObj.Known_As || hospObj.Hospital || "Hospital";
  }
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
  window.currentTargetDocId = ""; // เคลียร์ ID ป้องกัน Listener ดึง Profile ขึ้นมาใหม่
  const returnHospId = sessionStorage.getItem('returnToHospId');
  if (returnHospId) {
    sessionStorage.removeItem('returnToHospId');
    if (typeof window.loadComponent === 'function') {
      window.loadComponent('hospital');
    } else {
      const hospMenu = document.querySelector('.nav-menu-item[data-page="hospital"]');
      if (hospMenu) hospMenu.click();
    }

    let attempts = 0;
    const checkReady = setInterval(() => {
      attempts++;
      if (typeof window.openViewHospitalProfile === 'function' && window.HospManagerCache && window.HospManagerCache.isLoaded) {
        clearInterval(checkReady);
        setTimeout(() => {
          window.openViewHospitalProfile(returnHospId);
        }, 50);
      } else if (attempts > 60) {
        clearInterval(checkReady);
        window.switchDoctorView('doctorListView');
      }
    }, 100);
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
// 🎤 3. SPEECH SEARCH ENGINE
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
// 📥 4. PERMISSIONS & DROPDOWNS SETUP (i18n Fully Supported)
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

      const [typeRes, idxRes, hospRes, assignRes, terrRes, teamRes, buRes, prodRes, userRes, matrixRes, targetRes, teamProdRes, sysSetRes] = await Promise.all([
        sb.from('IndexType').select('*'),
        sb.from('Index').select('*').order('Value', { ascending: true }),
        fetchFn('Hospitals', q => q.eq('Status', 'Active').order('Hospital', { ascending: true })),
        fetchFn('Assignment'),
        sb.from('Territory').select('*'),
        sb.from('Team').select('*'),
        sb.from('BU').select('*'),
        fetchFn('Products', q => q.order('Product', { ascending: true })),
        fetchFn('Rep_Users'),
        sb.from('Rating_Matrix').select('*'),
        sb.from('Target').select('*'),
        fetchFn('Products_Team'),
        sb.from('System_Settings').select('*')
      ]);

      window.DocManagerCache.indexTypes = typeRes.data || [];
      window.DocManagerCache.indexes = idxRes.data || [];
      window.DocManagerCache.hospitals = hospRes || [];
      window.DocManagerCache.products = prodRes || [];
      window.DocManagerCache.users = userRes || [];
      window.DocManagerCache.territories = terrRes.data || [];
      window.DocManagerCache.matrixData = matrixRes.data || [];
      window.DocManagerCache.targetData = targetRes.data || [];
      window.DocManagerCache.teamProdLinks = teamProdRes || [];
      window.DocManagerCache.sysSettings = sysSetRes.data || [];
      window.DocManagerCache.teamList = teamRes.data || [];

      window.globalIndexTypes = window.DocManagerCache.indexTypes;
      window.globalIndexes = window.DocManagerCache.indexes;
      window.globalHospitals = window.DocManagerCache.hospitals;
      window.globalProducts = window.DocManagerCache.products;
      window.globalUsers = window.DocManagerCache.users;
      window.globalTerritories = window.DocManagerCache.territories;
      window.globalMatrixData = window.DocManagerCache.matrixData;
      window.globalTargetData = window.DocManagerCache.targetData;

      const ratingSetting = (sysSetRes.data || []).find(s => s.Type === 'Rating');
      if (ratingSetting) {
        if (ratingSetting.Status === false) {
          window.globalRatingIsLocked = true;
        } else {
          let startStr = ratingSetting.Start;
          let endStr = ratingSetting.End;
          if (!startStr && !endStr) {
            window.globalRatingIsLocked = false;
          } else {
            const offset = new Date().getTimezoneOffset() * 60000;
            const localISOTime = (new Date(Date.now() - offset)).toISOString().split('T')[0];
            let isWithinRange = true;
            if (startStr && localISOTime < startStr) isWithinRange = false;
            if (endStr && localISOTime > endStr) isWithinRange = false;
            window.globalRatingIsLocked = !isWithinRange;
          }
        }
      } else {
        window.globalRatingIsLocked = true;
      }

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

      let docQuery = sb.from('Doctors').select('Specialty, Type');
      if (!isGlobalViewer) {
        if (allowedDocIds.length > 0) {
          docQuery = docQuery.in('Doc_ID', allowedDocIds);
        } else {
          docQuery = docQuery.eq('Doc_ID', '00000000-0000-0000-0000-000000000000');
        }
      }

      const docDistinctRes = await docQuery;
      const validDocsData = docDistinctRes.data || [];

      window.DocManagerCache.indexLoaded = true;

      // 🌟 ดึงคำแปลสำหรับตัวเลือกเริ่มต้นใน Dropdowns
      const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
      const selectTitleText = (typeof t === 'function') ? t('lbl_doc_title') : '- Select Title -';
      const phSpec = (typeof t === 'function') ? t('opt_all_specialties') : '- All Specialties -';
      const phType = (typeof t === 'function') ? t('opt_all_types') : '- All Types -';

      const getOptionsHtml = (typeName, defaultText) => {
        const typeObj = (window.DocManagerCache.indexTypes || []).find(t => t.Name && t.Name.toLowerCase() === typeName.toLowerCase());
        let html = defaultText ? `<option value="">${defaultText}</option>` : ''; 
        if (typeObj) {
          const items = (window.DocManagerCache.indexes || []).filter(i => i.IndexType_ID === typeObj.IndexType_ID);
          items.forEach(i => html += `<option value="${i.Value}">${i.Value}</option>`);
        }
        return html;
      };

      // 🌟 อัปเดต Title Dropdowns แบบ 2 ภาษา
      window.updateTomSelect('docTitle', getOptionsHtml('Title', selectTitleText), selectTitleText);
      window.updateTomSelect('editDocTitle', getOptionsHtml('Title', selectTitleText), selectTitleText);

      // 🌟 อัปเดต Filter Specialty แบบ 2 ภาษา
      const specSelect = document.getElementById('filterDocSpecialty');
      if (specSelect) {
        const uniqueSpecs = [...new Set(validDocsData.map(d => d.Specialty).filter(v => v && String(v).trim() !== '' && v !== '-'))].sort();
        specSelect.innerHTML = uniqueSpecs.map(s => `<option value="${s}">${s}</option>`).join('');
        window.initMultiTomSelect('filterDocSpecialty', phSpec);
      }

      // 🌟 อัปเดต Filter Doctor Type แบบ 2 ภาษา
      const typeSelect = document.getElementById('filterDocType');
      if (typeSelect) {
        const uniqueTypes = [...new Set(validDocsData.map(d => d.Type).filter(v => v && String(v).trim() !== '' && v !== '-'))].sort();
        typeSelect.innerHTML = uniqueTypes.map(t => `<option value="${t}">${t}</option>`).join('');
        window.initMultiTomSelect('filterDocType', phType);
      }
    }
  } catch (err) {
    console.warn("Dropdown load warning:", err.message);
  }
};

window.getIndexValues = function(typeName) {
  const typeObj = (window.DocManagerCache.indexTypes || []).find(t => t.Name && t.Name.toLowerCase() === typeName.toLowerCase());
  if (!typeObj) return [];
  
  let items = (window.DocManagerCache.indexes || []).filter(i => i.IndexType_ID === typeObj.IndexType_ID);

  if (typeName.toLowerCase() === 'adoption') {
    const order = ['High', 'Medium-High', 'Medium', 'Medium-Low', 'Low', 'Non User'];
    items.sort((a, b) => {
      let indexA = order.indexOf(a.Value);
      let indexB = order.indexOf(b.Value);
      if (indexA === -1) indexA = 99;
      if (indexB === -1) indexB = 99;
      return indexA - indexB;
    });
  } else if (typeName.toLowerCase() === 'potential') {
    const order = ['High', 'Medium', 'Low', 'No'];
    items.sort((a, b) => {
      let indexA = order.indexOf(a.Value);
      let indexB = order.indexOf(b.Value);
      if (indexA === -1) indexA = 99;
      if (indexB === -1) indexB = 99;
      return indexA - indexB;
    });
  }

  return items.map(i => i.Value);
};

// ==========================================
// 📊 5. SERVER-SIDE PAGINATION
// ==========================================
window.loadDoctors = async function(forceReload = false) {
  const tbody = document.getElementById('doctorTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary mb-2"></div><div class="text-muted small">Loading Doctors...</div></td></tr>`;

  try {
    const sb = window.supabaseClient || window.supabase;
    if (!sb) throw new Error("Supabase client not initialized");

    let query = sb.from('Doctors').select('*', { count: 'exact' });

    const isGlobalViewer = window.DocManagerCache.isGlobalViewer;
    const allowedDocIds = window.DocManagerCache.myAllowedDocIds || [];

    if (!isGlobalViewer) {
      if (allowedDocIds.length > 0) {
        query = query.in('Doc_ID', allowedDocIds);
      } else {
        query = query.eq('Doc_ID', '00000000-0000-0000-0000-000000000000'); 
      }
    }

    const smartSearchInput = document.getElementById('smartDocSearchInput');
    const rawSearchVal = smartSearchInput ? smartSearchInput.value.trim().toLowerCase() : '';

    if (rawSearchVal) {
      const searchTerms = rawSearchVal.split(/\s+/);
      for (let i = 0; i < searchTerms.length; i++) {
        const term = searchTerms[i];
        const matchedHospIds = (window.DocManagerCache.hospitals || [])
          .filter(h => {
            const hName = String(h.Hospital || '').toLowerCase();
            const hKnown = String(h.Known_As || '').toLowerCase();
            return hName.includes(term) || hKnown.includes(term);
          })
          .map(h => h.Hospital_ID);

        let orConditions = [`Doc_Name.ilike.%${term}%`, `Doc_Name_TH.ilike.%${term}%`];
        if (matchedHospIds.length > 0) {
          orConditions.push(`Hospital_ID.in.(${matchedHospIds.slice(0, 50).join(',')})`);
        }
        query = query.or(orConditions.join(','));
      }
    }

    const specEl = document.getElementById('filterDocSpecialty');
    const typeEl = document.getElementById('filterDocType');

    const selectedSpecs = specEl && specEl.tomselect ? specEl.tomselect.getValue() : [];
    const selectedTypes = typeEl && typeEl.tomselect ? typeEl.tomselect.getValue() : [];

    if (Array.isArray(selectedSpecs) && selectedSpecs.length > 0) query = query.in('Specialty', selectedSpecs);
    if (Array.isArray(selectedTypes) && selectedTypes.length > 0) query = query.in('Type', selectedTypes);

    const sortCol = window.currentDocSortCol || 'Doc_Name';
    query = query.order(sortCol, { ascending: window.currentDocSortAsc });

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

  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';

  if (data.length === 0) {
    if (document.getElementById('doctorPaginationContainer')) {
      document.getElementById('doctorPaginationContainer').classList.add('d-none');
    }
    const msgNoData = appLang === 'en' ? 'No doctors found.' : 'ไม่พบข้อมูลแพทย์';
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5"><i class="fa-solid fa-folder-open fs-3 mb-2 d-block text-muted"></i>${msgNoData}</td></tr>`;
    return;
  }

  if (document.getElementById('doctorPaginationContainer')) {
    document.getElementById('doctorPaginationContainer').classList.remove('d-none');
  }

  const startIndex = ((window.currentPage - 1) * rows) + 1;
  const endIndex = Math.min(startIndex + data.length - 1, totalItems);

  if (document.getElementById('doctorPageInfo')) {
    document.getElementById('doctorPageInfo').innerText = appLang === 'en'
      ? `Showing ${startIndex} to ${endIndex} of ${totalItems} entries`
      : `แสดง ${startIndex} ถึง ${endIndex} จาก ${totalItems} รายการ`;
  }

  let htmlBuffer = '';
  const editBtnText = appLang === 'en' ? 'Edit' : 'แก้ไข';

  data.forEach(d => {
    const isStatusActive = (d.Status === 'Active');
    const badge = isStatusActive ? 'badge-soft-success' : 'badge-soft-danger';
    const statusTextShow = isStatusActive 
      ? (appLang === 'en' ? 'Active' : 'ใช้งาน') 
      : (appLang === 'en' ? 'Inactive' : 'ไม่ใช้งาน');
    
    const docNameEnShow = d.Doc_Name || d.doc_name || '-';
    const docNameThShow = (d.Doc_Name_TH && d.Doc_Name_TH.indexOf('???') === -1) ? d.Doc_Name_TH : '-';
    
    const actionButton = `<button class="btn btn-sm btn-premium-secondary fw-bold" onclick="window.openEditDoctorView('${d.Doc_ID}')"><i class="fa-solid fa-pen me-1"></i> ${editBtnText}</button>`;
    
    // 🌟 แปลชื่อโรงพยาบาลในตารางหลัก
    const hospObj = (window.DocManagerCache.hospitals || []).find(h => String(h.Hospital_ID).toLowerCase() === String(d.Hospital_ID).toLowerCase());
    const hospNameShow = window.getHospitalNameByLang(hospObj);

    const nameCellLink = `<a href="#" class="table-visit-link" onclick="window.openViewDoctorProfile('${d.Doc_ID}'); return false;"><i class="fa-solid fa-user-doctor me-2 text-primary"></i>${docNameEnShow}</a>`;

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

  if (typeof window.renderDoctorPaginationControls === 'function') {
    window.renderDoctorPaginationControls(totalPages);
  }
};

window.renderDoctorPaginationControls = function(totalPages) {
  if (typeof window.renderGlobalPagination === 'function') {
    window.renderGlobalPagination('doctorPagination', window.currentPage, totalPages, 'goToDoctorPage');
  }
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

// 🌟 HELPER สลับ TAB โปรไฟล์แพทย์ (รองรับ 2 ภาษา + การันตีเนื้อหาไม่โปร่งใส)
window.switchDoctorProfileTab = function(btnOrTarget, targetPaneId) {
  let cleanId = 'tab-doc-info';
  let targetBtn = null;

  if (btnOrTarget && btnOrTarget.nodeType) {
    targetBtn = btnOrTarget;
    if (targetPaneId) cleanId = String(targetPaneId).replace('#', '');
  } else if (typeof btnOrTarget === 'string' && btnOrTarget.trim() !== '') {
    cleanId = btnOrTarget.replace('#', '');
  }

  // 1. เคลียร์ active จากปุ่มแท็บทั้งหมด
  document.querySelectorAll('#docProfileTabs .nav-link').forEach(b => b.classList.remove('active'));

  // 2. เคลียร์ active และ show จากเนื้อหาแท็บทุกตัว (แก้ไขอาการเนื้อหาล่องหน)
  document.querySelectorAll('#doctorProfileView .tab-pane').forEach(p => {
    p.classList.remove('active', 'show');
  });

  // 3. ค้นหาปุ่มแท็บเป้าหมาย
  if (!targetBtn) {
    if (cleanId === 'tab-doc-info') targetBtn = document.getElementById('tab-btn-info');
    else if (cleanId === 'tab-doc-history') targetBtn = document.getElementById('tab-btn-history');
    else if (cleanId === 'tab-doc-target') targetBtn = document.getElementById('tab-btn-target');
  }
  if (targetBtn) targetBtn.classList.add('active');

  // 4. แสดงเนื้อหา Pane โดยใส่ทั้ง active และ show
  const targetPane = document.getElementById(cleanPaneId);
  if (targetPane) {
    targetPane.classList.add('active', 'show');
  }
};

// ==========================================
// 🏥 6. WORKPLACE DYNAMIC ROW ENGINE
// ==========================================
window.clearWorkplaceContainer = function(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const selects = container.querySelectorAll('.hospital-select');
  selects.forEach(s => { if (s.tomselect) s.tomselect.destroy(); });
  container.innerHTML = '';
};

window.removeWorkplaceRow = function(btn) {
  const row = btn.closest('.workplace-row');
  const sel = row.querySelector('.hospital-select');
  if (sel && sel.tomselect) sel.tomselect.destroy();
  row.remove();
};

window.addWorkplaceRow = function(containerId, radioGroupName, hospId = '', isPrimary = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'row align-items-center workplace-row mb-2';
  const selectId = 'hosp_sel_' + Math.random().toString(36).substr(2, 9);

  let optionsHtml = '<option value="">- Search and Select Hospital -</option>';
  (window.DocManagerCache.hospitals || []).forEach(h => {
    const selected = h.Hospital_ID === hospId ? 'selected' : '';
    const showName = window.getHospitalNameByLang(h);
    optionsHtml += `<option value="${h.Hospital_ID}" ${selected}>${showName}</option>`;
  });

  const checked = isPrimary ? 'checked' : '';

  row.innerHTML = `
    <div class="col-sm-12 col-md-7 mb-2 mb-md-0">
      <select class="form-select hospital-select bg-white border-primary" id="${selectId}" required>
        ${optionsHtml}
      </select>
    </div>
    <div class="col-sm-8 col-md-3">
      <div class="form-check pt-1 px-3 py-2 bg-light rounded border">
        <input class="form-check-input primary-radio" type="radio" name="${radioGroupName}" value="true" ${checked} required style="cursor:pointer; transform: scale(1.2); margin-top:0.3rem;">
        <label class="form-check-label text-dark fw-bold ms-2" style="cursor:pointer;">Primary</label>
      </div>
    </div>
    <div class="col-sm-4 col-md-2 text-end">
      <button type="button" class="btn btn-sm btn-outline-danger w-100 fw-bold rounded-pill" onclick="window.removeWorkplaceRow(this)"><i class="fa-solid fa-trash me-1"></i> Remove</button>
    </div>
  `;
  container.appendChild(row);

  if (typeof TomSelect !== 'undefined') {
    new TomSelect(`#${selectId}`, {
      create: false, 
      searchField: ["text"], 
      sortField: { field: "text", direction: "asc" },
      placeholder: "- Search and Select Hospital -", 
      allowEmptyOption: true, 
      dropdownParent: 'body'
    });
  }
};

window.extractWorkplaces = function(containerId) {
  const container = document.getElementById(containerId);
  const rows = container ? container.querySelectorAll('.workplace-row') : [];
  const workplaces = [];
  rows.forEach(row => {
    const hospId = row.querySelector('.hospital-select').value;
    const isPrimary = row.querySelector('.primary-radio').checked;
    if (hospId) workplaces.push({ hospitalId: hospId, isPrimary: isPrimary });
  });
  return workplaces;
};

// ==========================================
// 📝 7. FORM ACTIONS (ADD, EDIT, PROFILE, TARGET CALL)
// ==========================================
window.openAddDoctorView = function() {
  if (document.getElementById('addDoctorForm')) document.getElementById('addDoctorForm').reset();
  
  const clearTs = (id) => { const el = document.getElementById(id); if (el && el.tomselect) el.tomselect.clear(); };
  clearTs('docTitle');
  clearTs('docSpecialty');
  clearTs('docType');

  window.clearWorkplaceContainer('workplaceContainerAdd');
  window.addWorkplaceRow('workplaceContainerAdd', 'primaryWpAdd', '', true);
  window.switchDoctorView('doctorAddView');
};

window.checkPendingDCR = async function(docId) {
  try {
    const sb = window.supabaseClient || window.supabase;
    const { data, error } = await sb.from('DCR').select('Status, Action').eq('Ref_ID', docId).eq('Status', 'Pending');
    if (error) throw error;
    
    const badgeContainer = document.getElementById('editDcrStatusBadge');
    if (badgeContainer) {
      badgeContainer.innerHTML = (data && data.length > 0) ? `<span class="badge badge-soft-warning fs-6"><i class="fa-solid fa-hourglass-half me-1"></i>Pending (${data[0].Action})</span>` : '';
    }
  } catch (err) { console.error("Error check DCR:", err); }
};

window.openEditDoctorView = function(id) {
  const d = (window.globalDoctors || []).find(x => x.Doc_ID === id || x.id === id); 
  if(!d) return;
  
  document.getElementById('editDocId').value = d.Doc_ID || d.id; 
  
  const setTsVal = (elId, val) => { const el = document.getElementById(elId); if(el && el.tomselect) el.tomselect.setValue(val); else if (el) el.value = val; };
  setTsVal('editDocTitle', d.Title || d.title || '');
  setTsVal('editDocSpecialty', d.Specialty || d.specialty || '');
  setTsVal('editDocType', d.Type || d.type || '');
  
  document.getElementById('editDocNameEn').value = d.Doc_Name || d.nameEn || ''; 
  document.getElementById('editDocNameTh').value = d.Doc_Name_TH || d.nameTh || ''; 
  document.getElementById('editDocEmail').value = d.Email || d.email || '';
  document.getElementById('editDocMobile').value = d.Mobile || d.mobile || '';
  document.getElementById('editDocPrivacy').value = d.Privacy_Policy || d.privacy || 'Yes';
  document.getElementById('editDocTos').value = d.Terms_of_Service || d.tos || 'Yes';
  document.getElementById('editDocStatus').value = d.Status || d.status || 'Active';

  window.clearWorkplaceContainer('workplaceContainerEdit');
  let parsedWp = [];
  try { if (d.Workplaces_JSON || d.workplacesJson) parsedWp = JSON.parse(d.Workplaces_JSON || d.workplacesJson); } catch(e) {}
  
  if (parsedWp.length > 0) {
    parsedWp.forEach(wp => window.addWorkplaceRow('workplaceContainerEdit', 'primaryWpEdit', wp.hospitalId, wp.isPrimary));
  } else {
    window.addWorkplaceRow('workplaceContainerEdit', 'primaryWpEdit', d.Hospital_ID || d.hospitalId, true);
  }

  window.checkPendingDCR(d.Doc_ID || d.id); 
  window.switchDoctorView('doctorEditView');
};

window.openViewDoctorProfile = async function(id, targetTab = '#tab-doc-info') {
  window.currentTargetDocId = id; 
  const d = (window.globalDoctors || []).find(x => x.Doc_ID === id || x.id === id); 
  if(!d) return;

  // 🌟 ดึงภาษาปัจจุบันของระบบ
  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  const primaryBadgeText = appLang === 'en' ? 'Primary' : 'หลัก';
  const allProdsText = (typeof t === 'function') ? t('opt_all_products') : (appLang === 'en' ? '- All Products -' : '- ผลิตภัณฑ์ทั้งหมด -');

  // 1. เติมชื่อแพทย์บน Header
  const titleEl = document.getElementById('viewDocTitleName');
  if (titleEl) {
    titleEl.innerText = `👨‍⚕️ ${d.Title || d.title || ''} ${d.Doc_Name || d.nameEn || ''} ${d.Doc_Name_TH ? `(${d.Doc_Name_TH})` : ''}`;
  }

  // 2. เติมข้อมูลลงใน Input
  if (document.getElementById('viewDocSpecialty')) document.getElementById('viewDocSpecialty').value = d.Specialty || d.specialty || '-';
  if (document.getElementById('viewDocType')) document.getElementById('viewDocType').value = d.Type || d.type || '-';
  if (document.getElementById('viewDocStatus')) document.getElementById('viewDocStatus').value = d.Status || d.status || 'Active';
  if (document.getElementById('viewDocEmail')) document.getElementById('viewDocEmail').value = d.Email || d.email || '-';
  if (document.getElementById('viewDocMobile')) document.getElementById('viewDocMobile').value = d.Mobile || d.mobile || '-';

  // 🌟 3. วาด Workplace History แบบ 2 ภาษา (ทั้งชื่อ รพ. และป้าย Primary)
  let wpHTML = '';
  let parsedWp = [];
  try { if (d.Workplaces_JSON || d.workplacesJson) parsedWp = JSON.parse(d.Workplaces_JSON || d.workplacesJson); } catch(e) {}
  
  if(parsedWp.length > 0) {
    parsedWp.forEach(wp => {
      const isPrimary = wp.isPrimary ? `<span class="badge badge-soft-info ms-2">${primaryBadgeText}</span>` : '';
      const hospObj = (window.DocManagerCache.hospitals || []).find(h => String(h.Hospital_ID).toLowerCase() === String(wp.hospitalId).toLowerCase());
      const hospName = window.getHospitalNameByLang(hospObj);
      wpHTML += `<div class="py-2 px-3 bg-white border rounded-3 mb-2">🏥 <span class="fw-bold text-dark">${hospName}</span> ${isPrimary}</div>`;
    });
  } else {
    const hospObj = (window.DocManagerCache.hospitals || []).find(h => String(h.Hospital_ID).toLowerCase() === String(d.Hospital_ID || d.hospitalId).toLowerCase());
    const hospName = window.getHospitalNameByLang(hospObj);
    wpHTML = `<div class="py-2 px-3 bg-white border rounded-3 mb-2">🏥 <span class="fw-bold text-dark">${hospName}</span> <span class="badge badge-soft-info ms-2">${primaryBadgeText}</span></div>`;
  }

  if (document.getElementById('viewWorkplaceContainer')) {
    document.getElementById('viewWorkplaceContainer').innerHTML = wpHTML;
  }

  // 🌟 4. ตัวเลือก Dropdown ผลิตภัณฑ์แบบ 2 ภาษา
  let phtml = `<option value="">${allProdsText}</option>`;
  if (typeof window.globalProducts !== 'undefined') {
    window.globalProducts.forEach(p => phtml += `<option value="${p.Product_ID}">${p.Product}</option>`);
  }
  if (document.getElementById('filterProfileVisitProduct')) {
    document.getElementById('filterProfileVisitProduct').innerHTML = phtml;
  }

  // 5. ควบคุมปุ่มและ Banner สิทธิ์ Rating (Target Call)
  const addProdBtn = document.getElementById('btnAddRatingProduct');
  const lockBanner = document.getElementById('ratingLockBanner');
  
  if (window.globalRatingIsLocked && window.globalCurrentUserRole !== 'Admin') {
    if (addProdBtn) addProdBtn.style.display = 'none';
    if (lockBanner) lockBanner.style.display = 'block';
  } else {
    if (addProdBtn) addProdBtn.style.display = 'inline-block';
    if (lockBanner) lockBanner.style.display = 'none';
  }

  // 6. โหลดข้อมูล Tab ย่อย
  window.loadDoctorVisitHistory(id);
  await window.loadDoctorRatings(id);

  // 🌟 7. เปิด View และสั่ง Active หน้า Tab ด้วย Bootstrap Native API
  window.switchDoctorView('doctorProfileView');
  
  const targetTabSelector = targetTab || '#tab-doc-info';
  const tabEl = document.querySelector(`#doctorProfileView .nav-link[data-bs-target="${targetTabSelector}"]`);
  
  if (tabEl && typeof bootstrap !== 'undefined') {
    const tab = bootstrap.Tab.getOrCreateInstance(tabEl);
    tab.show();
  }
};

window.handleAddDoctor = async function(e) {
  e.preventDefault(); 
  
  const workplaces = window.extractWorkplaces('workplaceContainerAdd');
  if (workplaces.length === 0) return alert("❌ Please add at least 1 workplace."); 
  if (!workplaces.some(w => w.isPrimary)) return alert("❌ Please select a Primary hospital."); 
  
  const hospIds = workplaces.map(w => w.hospitalId);
  if (hospIds.length !== new Set(hospIds).size) return alert("❌ Duplicate hospitals found. Please review."); 
  
  const primaryHospId = workplaces.find(w => w.isPrimary).hospitalId;

  const btn = document.getElementById('submitDoctorBtn'); 
  btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>Processing...`;

  let crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
  const whoUpdated = crmUser ? (crmUser.Email || crmUser.Rep_Name || "User") : "Unknown";

  const payload = {
    Title: document.getElementById('docTitle').value, 
    Doc_Name: document.getElementById('docNameEn').value.trim(),
    Doc_Name_TH: document.getElementById('docNameTh').value.trim(),
    Specialty: document.getElementById('docSpecialty').value, 
    Type: document.getElementById('docType').value,   
    Hospital_ID: primaryHospId, 
    Workplaces_JSON: JSON.stringify(workplaces), 
    Email: document.getElementById('docEmail').value.trim(),
    Mobile: document.getElementById('docMobile').value.trim(),
    Privacy_Policy: document.getElementById('docPrivacy').value,
    Terms_of_Service: document.getElementById('docTos').value,
    Status: 'Active',
    Whoupdated: whoUpdated
  };

  try {
    const dcrPayload = { Action: 'Add Doctor', Requested_Data: JSON.stringify(payload), Status: 'Pending', Whoupdated: whoUpdated };
    const sb = window.supabaseClient || window.supabase;
    const { error } = await sb.from('DCR').insert([dcrPayload]);
    if (error) throw error;
    
    alert("✅ DCR submitted successfully. Waiting for Admin approval.");
    window.switchDoctorView('doctorListView'); 
    await window.loadDoctors(true); 

  } catch (err) { alert("❌ Error: " + err.message); } 
  finally { btn.disabled = false; btn.innerHTML = "Submit DCR"; }
};

window.handleUpdateDoctor = async function(e) {
  e.preventDefault(); 

  const workplaces = window.extractWorkplaces('workplaceContainerEdit');
  if (workplaces.length === 0) return alert("❌ Please add at least 1 workplace."); 
  if (!workplaces.some(w => w.isPrimary)) return alert("❌ Please select a Primary hospital."); 
  
  const hospIds = workplaces.map(w => w.hospitalId);
  if (hospIds.length !== new Set(hospIds).size) return alert("❌ Duplicate hospitals found. Please review."); 
  
  const primaryHospId = workplaces.find(w => w.isPrimary).hospitalId;

  const btn = document.getElementById('updateDoctorBtn'); 
  btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>Processing...`;

  const docId = document.getElementById('editDocId').value;
  let crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
  const whoUpdated = crmUser ? (crmUser.Email || crmUser.Rep_Name || "User") : "Unknown";

  const payload = {
    Title: document.getElementById('editDocTitle').value, 
    Doc_Name: document.getElementById('editDocNameEn').value.trim(),
    Doc_Name_TH: document.getElementById('editDocNameTh').value.trim(),
    Specialty: document.getElementById('editDocSpecialty').value,
    Type: document.getElementById('editDocType').value,
    Hospital_ID: primaryHospId, 
    Workplaces_JSON: JSON.stringify(workplaces), 
    Email: document.getElementById('editDocEmail').value.trim(),
    Mobile: document.getElementById('docMobile').value.trim(),
    Privacy_Policy: document.getElementById('editDocPrivacy').value,
    Terms_of_Service: document.getElementById('editDocTos').value,
    Status: document.getElementById('editDocStatus').value,
    Whoupdated: whoUpdated
  };

  try {
    const dcrPayload = { Ref_ID: docId, Action: 'Edit Doctor', Requested_Data: JSON.stringify(payload), Status: 'Pending', Whoupdated: whoUpdated };
    const sb = window.supabaseClient || window.supabase;
    const { error } = await sb.from('DCR').insert([dcrPayload]);
    if (error) throw error;
    
    alert("✅ DCR submitted successfully. Waiting for Admin approval.");
    window.switchDoctorView('doctorListView'); 
    await window.loadDoctors(true); 

  } catch (err) { alert("❌ Error: " + err.message); } 
  finally { btn.disabled = false; btn.innerHTML = "Submit DCR"; }
};

// ==========================================
// 📅 8. DOCTOR PROFILE VISIT HISTORY & TARGET CALL
// ==========================================
window.clearProfileVisitFilters = function() {
  if (document.getElementById('filterProfileVisitStart')) document.getElementById('filterProfileVisitStart').value = '';
  if (document.getElementById('filterProfileVisitEnd')) document.getElementById('filterProfileVisitEnd').value = '';
  if (document.getElementById('filterProfileVisitProduct')) document.getElementById('filterProfileVisitProduct').value = '';
  window.filterAndRenderDoctorVisits();
};

window.sortDoctorVisits = function(col) {
  if (window.currentPVisitSortCol === col) {
    window.currentPVisitSortAsc = !window.currentPVisitSortAsc;
  } else {
    window.currentPVisitSortCol = col;
    window.currentPVisitSortAsc = (col === 'date') ? false : true; 
  }
  window.filterAndRenderDoctorVisits();
};

window.loadDoctorVisitHistory = async function(docId) {
  const tbody = document.getElementById('viewVisitHistoryBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Loading... <i class="fa-solid fa-spinner fa-spin text-primary"></i></td></tr>';
  
  try {
    const sb = window.supabaseClient || window.supabase;
    const [visitRes, vpRes, dcrRes] = await Promise.all([
      sb.from('Visit_Logs').select('*').eq('Doc_ID', docId).order('Visit_Date', { ascending: false }),
      sb.from('Visit_Products').select('*'),
      sb.from('DCR').select('Ref_ID').eq('Action', 'Unlock Visit').eq('Status', 'Pending')
    ]);

    if (visitRes.error) throw visitRes.error;
    
    window.globalCurrentDoctorVisits = visitRes.data || [];
    window.globalCurrentDoctorVisitProducts = vpRes.data || [];
    window.globalPendingUnlockVisits = (dcrRes.data || []).map(d => d.Ref_ID);

    window.currentPVisitPage = 1;
    window.filterAndRenderDoctorVisits();

  } catch(err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">❌ Load failed: ${err.message}</td></tr>`;
  }
};

window.changePVisitRowsPerPage = function() {
  const selectEl = document.getElementById('pvisitRowsPerPage');
  window.pvisitRowsPerPage = parseInt(selectEl.value) || 10;
  window.currentPVisitPage = 1;
  window.filterAndRenderDoctorVisits();
};

window.goToPVisitPage = function(page) {
  window.currentPVisitPage = page;
  window.filterAndRenderDoctorVisits();
};

window.filterAndRenderDoctorVisits = function() {
  const tbody = document.getElementById('viewVisitHistoryBody');
  if (!tbody) return;

  const startDateTerm = document.getElementById('filterProfileVisitStart') ? document.getElementById('filterProfileVisitStart').value : '';
  const endDateTerm = document.getElementById('filterProfileVisitEnd') ? document.getElementById('filterProfileVisitEnd').value : '';
  const prodTerm = document.getElementById('filterProfileVisitProduct') ? document.getElementById('filterProfileVisitProduct').value : '';

  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';

  let filtered = (window.globalCurrentDoctorVisits || []).filter(v => {
    let matchDate = true;
    if (startDateTerm || endDateTerm) {
      const vDate = new Date(v.Visit_Date);
      vDate.setHours(0, 0, 0, 0); 
      
      if (startDateTerm) {
        const sDate = new Date(startDateTerm);
        sDate.setHours(0, 0, 0, 0);
        if (vDate < sDate) matchDate = false;
      }
      if (endDateTerm) {
        const eDate = new Date(endDateTerm);
        eDate.setHours(23, 59, 59, 999);
        if (vDate > eDate) matchDate = false;
      }
    }

    const visitProds = (window.globalCurrentDoctorVisitProducts || [])
      .filter(vp => String(vp.Visit_ID) === String(v.Visit_ID))
      .map(vp => String(vp.Product_ID));

    const matchProd = (prodTerm === "") || visitProds.includes(String(prodTerm));

    return matchDate && matchProd;
  });

  const sortCol = window.currentPVisitSortCol || 'date';
  const sortAsc = window.currentPVisitSortAsc || false;

  filtered.sort((a, b) => {
    let valA, valB;
    if (sortCol === 'date') {
      valA = new Date(a.Visit_Date || 0).getTime();
      valB = new Date(b.Visit_Date || 0).getTime();
    } else if (sortCol === 'user') {
      valA = (a.Whoupdated || '').toLowerCase();
      valB = (b.Whoupdated || '').toLowerCase();
    } else if (sortCol === 'territory') {
      valA = (a.Territory_ID || '').toLowerCase();
      valB = (b.Territory_ID || '').toLowerCase();
    } else if (sortCol === 'status') {
      valA = (a.Status || '').toLowerCase();
      valB = (b.Status || '').toLowerCase();
    } else {
      valA = (a.Purpose || '').toLowerCase();
      valB = (b.Purpose || '').toLowerCase();
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const totalItems = filtered.length;
  const rows = parseInt(window.pvisitRowsPerPage) || 10;
  const totalPages = Math.ceil(totalItems / rows);

  if (totalItems === 0) {
    if (document.getElementById('pvisitPaginationContainer')) {
      document.getElementById('pvisitPaginationContainer').classList.add('d-none');
    }
    const noDataMsg = appLang === 'en' ? 'No visit history found.' : 'ไม่พบประวัติการเยี่ยม';
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4"><i class="fa-solid fa-folder-open fs-4 mb-2 d-block text-muted"></i>${noDataMsg}</td></tr>`;
    return;
  }

  if (document.getElementById('pvisitPaginationContainer')) {
    document.getElementById('pvisitPaginationContainer').classList.remove('d-none');
  }

  const currentPage = window.currentPVisitPage || 1;
  const startIndex = (currentPage - 1) * rows;
  const endIndex = Math.min(startIndex + rows, totalItems);
  const pageData = filtered.slice(startIndex, endIndex);

  if (document.getElementById('pvisitPageInfo')) {
    document.getElementById('pvisitPageInfo').innerText = appLang === 'en'
      ? `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} entries`
      : `แสดง ${startIndex + 1} ถึง ${endIndex} จาก ${totalItems} รายการ`;
  }

  let htmlBuffer = '';
  pageData.forEach(v => {
    const dateStr = v.Visit_Date ? new Date(v.Visit_Date).toLocaleDateString(appLang === 'en' ? 'en-US' : 'th-TH') : '-';

    let statusBadgeClass = 'badge-soft-success';
    let statusText = v.Status || 'Submitted';
    if (statusText === 'Draft') {
      statusBadgeClass = 'badge-soft-warning';
      statusText = appLang === 'en' ? 'Draft' : 'ฉบับร่าง';
    } else if (statusText === 'Submitted') {
      statusText = appLang === 'en' ? 'Submitted' : 'ส่งแล้ว';
    }

    const matchedVps = (window.globalCurrentDoctorVisitProducts || []).filter(vp => String(vp.Visit_ID) === String(v.Visit_ID));
    let prodBadges = '-';
    if (matchedVps.length > 0) {
      prodBadges = matchedVps.map(vp => {
        const pObj = (window.globalProducts || []).find(p => String(p.Product_ID) === String(vp.Product_ID));
        const pName = pObj ? pObj.Product : vp.Product_ID;
        return `<span class="badge badge-soft-product me-1 mb-1">${pName}</span>`;
      }).join('');
    }

    htmlBuffer += `
      <tr class="align-middle">
        <td class="text-center fw-bold">${dateStr}</td>
        <td class="fw-bold text-dark">${v.Whoupdated || '-'}</td>
        <td class="text-center"><span class="badge badge-soft-primary">${v.Territory_ID || '-'}</span></td>
        <td>${prodBadges}</td>
        <td><small class="text-secondary">${v.Purpose || '-'}</small></td>
        <td class="text-center"><span class="badge ${statusBadgeClass}">${statusText}</span></td>
      </tr>`;
  });

  tbody.innerHTML = htmlBuffer;

  if (typeof window.renderGlobalPagination === 'function') {
    window.renderGlobalPagination('pvisitPagination', currentPage, totalPages, 'goToPVisitPage');
  }
};

window.clearRatingTable = function() {
  const tbody = document.getElementById('ratingTableBody');
  if (!tbody) return;
  const selects = tbody.querySelectorAll('select');
  selects.forEach(s => { if(s.tomselect) s.tomselect.destroy(); });
  tbody.innerHTML = '';
};

window.loadDoctorRatings = async function(docId) {
  const tbody = document.getElementById('ratingTableBody');
  if (!tbody) return;

  window.clearRatingTable();
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Loading... <i class="fa-solid fa-spinner fa-spin text-primary"></i></td></tr>';
  
  try {
      const sb = window.supabaseClient || window.supabase;
      const { data, error } = await sb.from('Rating').select('*').eq('Doc_ID', docId);

      if (error) throw error;
      window.renderRatingTable(data); 
  } catch(err) {
      console.error("Error fetching ratings:", err);
      window.clearRatingTable();
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">❌ Error: ${err.message}</td></tr>`;
  }
};

window.renderRatingTable = function(ratings) {
  window.clearRatingTable();
  const tbody = document.getElementById('ratingTableBody');
  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  
  // 🌟 FIX 点 2: แปลข้อความ Empty State ตาราง Rating
  if(!Array.isArray(ratings) || ratings.length === 0) {
      const noDataMsg = appLang === 'en' ? 'No data. Click "Add Product"' : 'ไม่มีข้อมูล กรุณากด "เพิ่มผลิตภัณฑ์"';
      tbody.innerHTML = `<tr class="no-data"><td colspan="6" class="text-center text-muted py-4">${noDataMsg}</td></tr>`;
      return;
  }

  try {
      ratings.forEach(row => {
          window.addRatingRowHTML(
              row.Product_ID || '', 
              row.Adoption || '', 
              row.Potential || '', 
              row.Classification || '', 
              row.Target || ''
          );
      });
  } catch (e) {
      window.clearRatingTable();
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">❌ Render Error: ${e.message}</td></tr>`;
  }
};

window.addNewRatingRow = function() {
  const tbody = document.getElementById('ratingTableBody');
  if (!tbody) return;
  const noData = tbody.querySelector('.no-data');
  if(noData) {
      const selects = noData.querySelectorAll('select');
      selects.forEach(s => { if(s.tomselect) s.tomselect.destroy(); });
      noData.remove();
  }
  window.addRatingRowHTML('', '', '', '', '');
};

window.addRatingRowHTML = function(prodId, adopt, pot, cls, tgt) {
  const tbody = document.getElementById('ratingTableBody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  const selectId = 'tgt_prod_' + Math.random().toString(36).substr(2, 9);
  const adoptId = 'tgt_adopt_' + Math.random().toString(36).substr(2, 9);
  const potId = 'tgt_pot_' + Math.random().toString(36).substr(2, 9);

  const isAdmin = (window.globalCurrentUserRole === 'Admin');
  const canEdit = isAdmin || !window.globalRatingIsLocked;
  const disabledAttr = canEdit ? '' : 'disabled';

  let prodOpts = '<option value="">- Select -</option>';
  if (typeof window.globalProducts !== 'undefined') {
      window.globalProducts.forEach(p => {
          const sel = String(p.Product_ID) === String(prodId) ? 'selected' : '';
          prodOpts += `<option value="${p.Product_ID}" ${sel}>${p.Product}</option>`; 
      });
  }

  let adoptOpts = '<option value="">- Select -</option>';
  window.getIndexValues('Adoption').forEach(a => {
      const sel = a === adopt ? 'selected' : '';
      adoptOpts += `<option value="${a}" ${sel}>${a}</option>`;
  });

  let potOpts = '<option value="">- Select -</option>';
  window.getIndexValues('Potential').forEach(p => {
      const sel = p === pot ? 'selected' : '';
      potOpts += `<option value="${p}" ${sel}>${p}</option>`;
  });

  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  const saveBtnText = appLang === 'en' ? 'Save' : 'บันทึก';
  const lockedText = appLang === 'en' ? 'Locked' : 'ถูกล็อก';

  // 🌟 FIX 点 3: แสดงข้อความบนปุ่ม Save และ Locked ตามภาษาที่ถูกต้อง
  let actionHtml = '';
  if (canEdit) {
      actionHtml = `<button class="btn btn-sm btn-premium-primary fw-bold px-3" onclick="window.saveTargetCallRow(this)"><i class="fa-solid fa-floppy-disk me-1"></i> ${saveBtnText}</button>`;
  } else {
      actionHtml = `<span class="badge badge-soft-secondary"><i class="fa-solid fa-lock me-1"></i> ${lockedText}</span>`;
  }

  tr.innerHTML = `
      <td>
          <select class="form-select form-select-sm rating-product border-primary shadow-none" id="${selectId}" ${disabledAttr}>
              ${prodOpts}
          </select>
      </td>
      <td><select class="form-select form-select-sm rating-adopt shadow-none" id="${adoptId}" ${disabledAttr}>${adoptOpts}</select></td>
      <td><select class="form-select form-select-sm rating-pot shadow-none" id="${potId}" ${disabledAttr}>${potOpts}</select></td>
      <td>
          <input type="text" class="form-control form-control-sm text-center rating-class fw-bold text-primary shadow-none" value="${cls}" readonly style="background-color:#e9ecef;">
      </td>
      <td>
          <input type="number" class="form-control form-control-sm text-center rating-target fw-bold text-success shadow-none" value="${tgt}" readonly style="background-color:#e9ecef;">
      </td>
      <td class="text-center">
          ${actionHtml}
      </td>
  `;
  tbody.appendChild(tr);

  if (!disabledAttr && typeof TomSelect !== 'undefined') {
      new TomSelect(`#${selectId}`, { create: false, placeholder: "- Select -", allowEmptyOption: true, dropdownParent: 'body' });
      new TomSelect(`#${adoptId}`, { create: false, placeholder: "- Select -", allowEmptyOption: true, dropdownParent: 'body' });
      new TomSelect(`#${potId}`, { create: false, placeholder: "- Select -", allowEmptyOption: true, dropdownParent: 'body' });
  }
};

window.saveTargetCallRow = async function(btn) {
  const tr = btn.closest('tr');
  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  
  const selectedProductId = tr.querySelector('.rating-product').value;
  const adoptVal = tr.querySelector('.rating-adopt').value;
  const potVal = tr.querySelector('.rating-pot').value;
  const classificationValue = tr.querySelector('.rating-class').value;
  const targetValue = tr.querySelector('.rating-target').value;

  // 🌟 FIX 点 4: แปล Alert แจ้งเตือนเมื่อกรอกข้อมูลไม่ครบ
  if(!selectedProductId || !adoptVal || !potVal) {
      const errMsg = appLang === 'en' ? "❌ Missing fields: Product, Adoption or Potential." : "❌ กรุณากรอกข้อมูลให้ครบถ้วน: ผลิตภัณฑ์, Adoption หรือ Potential";
      alert(errMsg);
      return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  let crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
  const whoUpdated = crmUser ? (crmUser.Email || crmUser.Rep_Name || "User") : "User";

  const payload = {
      Doc_ID: window.currentTargetDocId,
      Product_ID: selectedProductId,
      Adoption: adoptVal,
      Potential: potVal,
      Classification: classificationValue,
      Target: targetValue ? parseInt(targetValue) : 0,
      Whoupdated: whoUpdated, 
      Whenupdated: new Date().toISOString()
  };

  try {
      const sb = window.supabaseClient || window.supabase;
      const { error } = await sb.from('Rating').upsert(payload, { onConflict: 'Doc_ID, Product_ID' });
      if (error) throw error;

      // 🌟 FIX 点 5: แปลข้อความปุ่มกดเมื่อบันทึกสำเร็จ
      const savedText = appLang === 'en' ? 'Saved' : 'บันทึกแล้ว';
      const saveBtnText = appLang === 'en' ? 'Save' : 'บันทึก';

      btn.innerHTML = `<i class="fa-solid fa-check me-1"></i> ${savedText}`;
      setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-floppy-disk me-1"></i> ${saveBtnText}`;
      }, 2000);

  } catch(err) {
      const saveBtnText = appLang === 'en' ? 'Save' : 'บันทึก';
      alert("❌ Save failed: " + err.message);
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-floppy-disk me-1"></i> ${saveBtnText}`;
  }
};

window.goToQuickAddCall = function() {
  sessionStorage.setItem('returnToDocId', window.currentTargetDocId);
  if (typeof window.loadComponent === 'function') window.loadComponent('visit');
};

// ==========================================
// 🚀 9. SAFE INITIALIZATION ENGINE & LISTENERS
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
  

// 🌟 FIX: ฟัง Event appLanguageChanged ให้สลับภาษาครอบคลุมทั้ง Dropdowns, ตารางหลัก และหน้า Doctor Profile
if (!window._isDocLangListenerAttached) {
  window.addEventListener('appLanguageChanged', function() {
    
    // 1. 🌟 อัปเดต Placeholder ของ Dropdown Specialty และ Type ให้สลับภาษา Realtime
    const phSpec = (typeof t === 'function') ? t('opt_all_specialties') : '- All Specialties -';
    const phType = (typeof t === 'function') ? t('opt_all_types') : '- All Types -';
    
    const specEl = document.getElementById('filterDocSpecialty');
    if (specEl && specEl.tomselect) {
      specEl.tomselect.settings.placeholder = phSpec;
      specEl.tomselect.input.setAttribute('placeholder', phSpec);
      specEl.tomselect.refreshOptions(false);
    }

    const typeEl = document.getElementById('filterDocType');
    if (typeEl && typeEl.tomselect) {
      typeEl.tomselect.settings.placeholder = phType;
      typeEl.tomselect.input.setAttribute('placeholder', phType);
      typeEl.tomselect.refreshOptions(false);
    }

    // 2. ถ้าระบบอยู่ที่หน้าตารางหลัก ให้รีเรนเดอร์ตาราง
    if (typeof window.renderDoctorTableServerSide === 'function' && window.globalDoctors.length > 0) {
      window.renderDoctorTableServerSide();
    }
    
    // 3. ถ้าระบบเปิดหน้า Doctor Profile อยู่ ให้รีเรนเดอร์ Profile เพื่อเปลี่ยนภาษาชื่อโรงพยาบาลและปุ่มกด
    const profileView = document.getElementById('doctorProfileView');
    if (profileView && !profileView.classList.contains('d-none') && window.currentTargetDocId) {
      window.openViewDoctorProfile(window.currentTargetDocId);
    }
  });
  window._isDocLangListenerAttached = true;
}

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

setTimeout(() => {
  if (document.getElementById('doctorTableBody')) {
    window.initDoctorPage(true);
  }
}, 100);
