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
  allowedHospIds: [], 
  filters: { name: [], spec: [], type: [], hosp: [], page: 1, rows: 20, sortCol: 'nameEn', sortAsc: true } 
};

window.globalDoctors = [];
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

window.currentDocSortCol = 'nameEn';
window.currentDocSortAsc = true; 

window.globalRatingIsLocked = false;
window.globalCurrentUserRole = '';

window.currentPage = 1;
window.rowsPerPage = 20;

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

window.updateTomSelect = function(id, html, placeholder) {
  const el = document.getElementById(id);
  if(!el) return;
  if(el.tomselect) el.tomselect.destroy();
  el.innerHTML = html;
  new TomSelect(`#${id}`, { 
    create: false, 
    searchField: ["text"],
    sortField: { field: "text", direction: "asc" }, 
    placeholder: placeholder, 
    allowEmptyOption: true, 
    maxOptions: null,
    dropdownParent: 'body' 
  });
};

window.initMultiTomSelect = function(id, placeholder) {
  const el = document.getElementById(id);
  if(!el) return;
  if(el.tomselect) el.tomselect.destroy();
  
  new TomSelect(`#${id}`, { 
    plugins: ['remove_button'],
    create: false, 
    searchField: ["text"],
    sortField: { field: "text", direction: "asc" }, 
    placeholder: placeholder, 
    allowEmptyOption: true, 
    maxOptions: null,
    dropdownParent: 'body'
  });
};

// ==========================================
// 🎤 3. SPEECH SEARCH ENGINE
// ==========================================
window.searchAndSelectTomSelect = function(selectId, keyword) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;
  const searchKey = keyword.toLowerCase();
  if (selectEl.tomselect) {
    const ts = selectEl.tomselect; 
    ts.focus(); 
    ts.setTextboxValue(keyword); 
    const options = ts.options; 
    let matchedId = null;
    for (let id in options) { 
      const text = (options[id].text || '').toLowerCase();
      if (text.includes(searchKey)) { matchedId = id; break; }
    }
    if (matchedId) {
      if (selectEl.hasAttribute('multiple')) {
        ts.addItem(matchedId); 
      } else {
        ts.setValue(matchedId);
      }
      ts.setTextboxValue(''); 
      ts.blur();
    }
  } else {
    selectEl.value = keyword; 
    selectEl.dispatchEvent(new Event('change'));
  }
};

window.toggleSpeechSearch = function(inputId, btnId, iconId) {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    return alert("ขออภัยครับ เบราว์เซอร์ของคุณไม่รองรับระบบสั่งงานด้วยเสียง");
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
      if (inputEl.tagName === 'SELECT') {
        window.searchAndSelectTomSelect(inputId, spokenText);
      } else {
        inputEl.value = spokenText;
      }
      window.filterDoctors();
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
// 📥 4. DATA LOADING & DROPDOWNS SETUP
// ==========================================
window.loadIndexDropdowns = async function(forceReload = false) {
  try {
    let crmUser = null;
    try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}

    window.globalCurrentUserRole = crmUser ? String(crmUser.Role || crmUser.role || '').trim() : '';
    const rawScope = crmUser ? String(crmUser.Team_ID || crmUser.teamId || crmUser.Team || crmUser.Territory_ID || crmUser.territoryId || crmUser.Territory || '').trim() : '';

    window.DocManagerCache = window.DocManagerCache || {};

    if (forceReload || !window.DocManagerCache.indexLoaded) {
      const fetchFn = typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords : async function(tbl, modifier) {
        let q = window.supabaseClient.from(tbl).select('*'); if (modifier) q = modifier(q);
        const r = await q; return r.data || [];
      };

      const [typeRes, idxRes, allHospitals, allProductsList, userRes, terrRes, matrixRes, targetRes, teamProdRes, sysSetRes, teamRes] = await Promise.all([
        window.supabaseClient.from('IndexType').select('*'),
        window.supabaseClient.from('Index').select('*').order('Value', { ascending: true }),
        fetchFn('Hospitals', q => q.eq('Status', 'Active').order('Hospital', { ascending: true })),
        fetchFn('Products', q => q.order('Product', { ascending: true })),
        fetchFn('Rep_Users'), 
        window.supabaseClient.from('Territory').select('*'),
        window.supabaseClient.from('Rating_Matrix').select('*'),
        window.supabaseClient.from('Target').select('*'),
        fetchFn('Products_Team'),
        window.supabaseClient.from('System_Settings').select('*'),
        window.supabaseClient.from('Team').select('*')
      ]);
      
      window.DocManagerCache.indexTypes = typeRes.data || [];
      window.DocManagerCache.indexes = idxRes.data || [];
      window.DocManagerCache.hospitals = allHospitals || []; 
      window.DocManagerCache.products = allProductsList || [];
      window.DocManagerCache.users = userRes || []; 
      window.DocManagerCache.territories = terrRes.data || [];
      window.DocManagerCache.matrixData = matrixRes.data || [];
      window.DocManagerCache.targetData = targetRes.data || [];
      window.DocManagerCache.teamProdLinks = teamProdRes || [];
      window.DocManagerCache.sysSettings = sysSetRes.data || [];
      window.DocManagerCache.teamList = teamRes.data || [];
      window.DocManagerCache.indexLoaded = true;
    }

    window.globalIndexTypes = window.DocManagerCache.indexTypes;
    window.globalIndexes = window.DocManagerCache.indexes;
    window.globalHospitals = window.DocManagerCache.hospitals; 
    window.globalProducts = window.DocManagerCache.products;
    window.globalUsers = window.DocManagerCache.users; 
    window.globalTerritories = window.DocManagerCache.territories;
    window.globalMatrixData = window.DocManagerCache.matrixData;
    window.globalTargetData = window.DocManagerCache.targetData;
    const sysSettings = window.DocManagerCache.sysSettings;
    const globalTeamList = window.DocManagerCache.teamList;
    const teamProdLinks = window.DocManagerCache.teamProdLinks;

    const ratingSetting = sysSettings.find(s => s.Type === 'Rating');
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

    let isGlobalViewer = false;
    if (!rawScope || rawScope.toUpperCase().startsWith('ALL')) isGlobalViewer = true;
    const globalRoles = ['ADMIN', 'STAFF', 'DIRECTOR', 'EXECUTIVE', 'PRODUCT MANAGER'];
    if (globalRoles.includes(window.globalCurrentUserRole.toUpperCase())) isGlobalViewer = true;
    if (crmUser) {
      Object.values(crmUser).forEach(val => {
        if (typeof val === 'string' && val.trim().toUpperCase().startsWith('ALL')) isGlobalViewer = true;
      });
    }

    let allowedTeamIds = [];

    if (isGlobalViewer) {
      allowedTeamIds = globalTeamList.map(t => String(t.Team_ID));
    } else {
      let matchedTeam = globalTeamList.find(t => String(t.Team_ID) === rawScope || String(t.Team) === rawScope);
      let matchedTerr = window.globalTerritories.find(t => String(t.Territory_ID) === rawScope || String(t.Territory) === rawScope);

      if (window.globalCurrentUserRole === 'Manager' || window.globalCurrentUserRole === 'Sales Manager') {
        if (matchedTeam) { allowedTeamIds.push(String(matchedTeam.Team_ID)); } 
        else if (rawScope) { allowedTeamIds.push(rawScope); }
      } else if (window.globalCurrentUserRole === 'BU Head') {
        const buTeams = globalTeamList.filter(t => String(t.BU_ID) === rawScope || String(t.BU) === rawScope);
        buTeams.forEach(t => allowedTeamIds.push(String(t.Team_ID)));
      } else { 
        if (matchedTerr && matchedTerr.Team_ID) { allowedTeamIds.push(String(matchedTerr.Territory_ID)); } 
        else if (rawScope) { allowedTeamIds.push(rawScope); }
      }
    }

    if (isGlobalViewer) {
      window.globalTeamProducts = window.globalProducts;
    } else {
      let filteredProducts = window.globalProducts.filter(p => {
        let pTeam = String(p.Team_ID || p.team_id || '');
        let pId = String(p.Product_ID || p.product_id || p.id || '');
        let matchLink = teamProdLinks.some(tp => {
          let tpTeam = String(tp.Team_ID || tp.team_id || '');
          let tpProd = String(tp.Product_ID || tp.product_id || '');
          let tpStatus = String(tp.Status || 'Active').toLowerCase();
          return allowedTeamIds.includes(tpTeam) && tpProd === pId && tpStatus === 'active';
        });
        let matchTeam = allowedTeamIds.includes(pTeam);
        return matchLink || matchTeam;
      });
      window.globalTeamProducts = filteredProducts.length > 0 ? filteredProducts : window.globalProducts;
    }

    const getOptionsHtml = (typeName, defaultText) => {
      const typeObj = window.globalIndexTypes.find(t => t.Name.toLowerCase() === typeName.toLowerCase());
      let html = defaultText ? `<option value="">${defaultText}</option>` : ''; 
      if (typeObj) {
        const items = window.globalIndexes.filter(i => i.IndexType_ID === typeObj.IndexType_ID);
        items.forEach(i => html += `<option value="${i.Value}">${i.Value}</option>`);
      }
      return html;
    };

    window.updateTomSelect('docTitle', getOptionsHtml('Title', '- Select Title -'), '- Select Title -');
    window.updateTomSelect('editDocTitle', getOptionsHtml('Title', '- Select Title -'), '- Select Title -');
    window.updateTomSelect('docSpecialty', getOptionsHtml('Specialty', '- Select Specialty -'), '- Select Specialty -');
    window.updateTomSelect('editDocSpecialty', getOptionsHtml('Specialty', '- Select Specialty -'), '- Select Specialty -');
    window.updateTomSelect('docType', getOptionsHtml('DoctorType', '- Select Type -'), '- Select Type -');
    window.updateTomSelect('editDocType', getOptionsHtml('DoctorType', '- Select Type -'), '- Select Type -');

  } catch (err) { console.error("Error loading index dropdowns:", err.message); }
};

window.getIndexValues = function(typeName) {
  const typeObj = window.globalIndexTypes.find(t => t.Name.toLowerCase() === typeName.toLowerCase());
  if (!typeObj) return [];
  
  let items = window.globalIndexes.filter(i => i.IndexType_ID === typeObj.IndexType_ID);

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
// 📊 5. DOCTOR LIST & FILTER ENGINE
// ==========================================
window.loadDoctors = async function(forceReload = false) {
  const tbody = document.getElementById('doctorTableBody');
  const filterGroup = document.getElementById('doctorFilterZoneGroup');
  window.DocManagerCache = window.DocManagerCache || {};

  if (forceReload || !window.DocManagerCache.isLoaded) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5">Loading data... <i class="fa-solid fa-spinner fa-spin text-primary"></i></td></tr>`;
    try {
      let crmUser = null;
      try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}

      const userRole = crmUser ? String(crmUser.Role || crmUser.role || '').trim() : '';
      const rawScope = crmUser ? String(crmUser.Team_ID || crmUser.teamId || crmUser.Team || crmUser.Territory_ID || crmUser.territoryId || crmUser.Territory || '').trim() : '';

      const fetchFn = typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords : async function(tbl, modifier) {
        let q = window.supabaseClient.from(tbl).select('*'); if (modifier) q = modifier(q);
        const r = await q; return r.data || [];
      };

      const [allDoctors, assignRes, pendingAddRes, pendingEditRes] = await Promise.all([
        fetchFn('Doctors', q => q.order('Doc_Name', { ascending: true })),
        fetchFn('Assignment'),
        window.supabaseClient.from('DCR').select('*').eq('Action', 'Add Doctor').eq('Status', 'Pending'),
        window.supabaseClient.from('DCR').select('Ref_ID').eq('Action', 'Edit Doctor').eq('Status', 'Pending')
      ]);

      const assignments = assignRes || [];
      const territories = window.DocManagerCache.territories || [];
      const teams = window.DocManagerCache.teamList || [];
      
      let isGlobalViewer = false;
      if (!rawScope || rawScope.toUpperCase().startsWith('ALL')) isGlobalViewer = true;
      const globalRoles = ['ADMIN', 'STAFF', 'DIRECTOR', 'EXECUTIVE', 'PRODUCT MANAGER'];
      if (globalRoles.includes(userRole.toUpperCase())) isGlobalViewer = true;
      if (crmUser) {
        Object.values(crmUser).forEach(val => {
          if (typeof val === 'string' && val.trim().toUpperCase().startsWith('ALL')) isGlobalViewer = true;
        });
      }

      let allowedTerIds = [];
      if (!isGlobalViewer) {
        let matchedTeam = teams.find(t => String(t.Team_ID) === rawScope || String(t.Team) === rawScope);
        let matchedTerr = territories.find(t => String(t.Territory_ID) === rawScope || String(t.Territory) === rawScope);

        if (userRole === 'Manager' || userRole === 'Sales Manager') {
          if (matchedTeam) {
            const terrs = territories.filter(t => String(t.Team_ID) === String(matchedTeam.Team_ID));
            terrs.forEach(t => allowedTerIds.push(String(t.Territory_ID)));
          } else if (rawScope) {
            const terrs = territories.filter(t => String(t.Team_ID) === rawScope);
            terrs.forEach(t => allowedTerIds.push(String(t.Territory_ID)));
          }
        } else if (userRole === 'BU Head') {
          const buTeams = teams.filter(t => String(t.BU_ID) === rawScope || String(t.BU) === rawScope);
          buTeams.forEach(t => {
            const terrs = territories.filter(ter => String(ter.Team_ID) === String(t.Team_ID));
            terrs.forEach(ter => allowedTerIds.push(String(ter.Territory_ID)));
          });
        } else {
          if (matchedTerr) {
            allowedTerIds.push(String(matchedTerr.Territory_ID));
          } else if (rawScope) {
            allowedTerIds.push(rawScope);
          }
        }
      }

      let allowedDocIds = [];
      let allowedHospIds = [];
      if (!isGlobalViewer) {
        const myAssignments = assignments.filter(a => allowedTerIds.includes(String(a.Territory_ID || a.Territory)));
        allowedDocIds = myAssignments.filter(a => a.Type === 'Doctor').map(a => String(a.Account_ID));
        allowedHospIds = myAssignments.filter(a => a.Type === 'Hospital').map(a => String(a.Account_ID));
      }

      let visibleDoctors = allDoctors;
      if (!isGlobalViewer) {
        visibleDoctors = allDoctors.filter(d => allowedDocIds.includes(String(d.Doc_ID)));
      }

      const pendingEditIds = (pendingEditRes.data || []).map(d => d.Ref_ID);

      let list = visibleDoctors.map(d => {
        const h = window.DocManagerCache.hospitals.find(x => x.Hospital_ID === d.Hospital_ID);
        return {
          id: d.Doc_ID, title: d.Title, nameEn: d.Doc_Name, nameTh: d.Doc_Name_TH,
          specialty: d.Specialty, type: d.Type, hospitalId: d.Hospital_ID, hospitalName: h ? (h.Known_As || h.Hospital) : null,
          workplacesJson: d.Workplaces_JSON, privacy: d.Privacy_Policy, tos: d.Terms_of_Service, email: d.Email, mobile: d.Mobile, 
          status: d.Status, 
          isPendingDcr: false,
          hasPendingEdit: pendingEditIds.includes(d.Doc_ID)
        };
      });

      const pendingAddDcrs = pendingAddRes.data || [];
      if (pendingAddDcrs.length > 0) {
        pendingAddDcrs.forEach(d => {
          try {
            const req = typeof d.Requested_Data === 'string' ? JSON.parse(d.Requested_Data) : d.Requested_Data;
            const h = window.DocManagerCache.hospitals.find(x => x.Hospital_ID === req.Hospital_ID);
            list.unshift({
              id: d.DCR_ID, title: req.Title || '', nameEn: req.Doc_Name || 'ไม่ระบุชื่อ', nameTh: req.Doc_Name_TH || '-',
              specialty: req.Specialty || '-', type: req.Type || '-', hospitalName: h ? (h.Known_As || h.Hospital) : '-',
              status: 'Pending DCR', isPendingDcr: true, hasPendingEdit: false
            });
          } catch(e) {}
        });
      }

      window.DocManagerCache.doctors = list;
      window.DocManagerCache.allowedHospIds = allowedHospIds; 
      window.DocManagerCache.isGlobalViewer = isGlobalViewer;
      window.DocManagerCache.isLoaded = true;
    } catch (err) { 
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">❌ Load Failed: ${err.message}</td></tr>`; 
      return;
    }
  }

  window.globalDoctors = window.DocManagerCache.doctors;
  const allowedHospIds = window.DocManagerCache.allowedHospIds;
  const isGlobalViewer = window.DocManagerCache.isGlobalViewer;
  
  const filterDocSelect = document.getElementById('filterDocName');
  if (filterDocSelect) {
    filterDocSelect.innerHTML = '';
    window.globalDoctors.forEach(d => {
      const nameThShow = d.nameTh ? ` (${d.nameTh})` : '';
      const opt = document.createElement('option'); 
      opt.value = d.id; 
      opt.textContent = `${d.nameEn}${nameThShow}`; 
      filterDocSelect.appendChild(opt);
    });
    window.initMultiTomSelect('filterDocName', window.safeTranslate('opt_all_doctors', '- ทั้งหมด -'));
  }

  const filterHospSelect = document.getElementById('filterDocWorkplace');
  if (filterHospSelect) {
    filterHospSelect.innerHTML = '';
    
    let validHospIds = new Set();
    if (isGlobalViewer) {
      window.DocManagerCache.hospitals.forEach(h => validHospIds.add(String(h.Hospital_ID)));
    } else {
      allowedHospIds.forEach(id => validHospIds.add(id));
    }
    
    const filterHospitalsList = window.DocManagerCache.hospitals.filter(h => validHospIds.has(String(h.Hospital_ID)));

    filterHospitalsList.forEach(h => {
      const knownAsShow = h.Known_As ? ` (${h.Known_As})` : '';
      const opt = document.createElement('option'); 
      opt.value = h.Hospital_ID; 
      opt.textContent = `${h.Hospital}${knownAsShow}`; 
      filterHospSelect.appendChild(opt);
    });
    window.initMultiTomSelect('filterDocWorkplace', window.safeTranslate('opt_all_hospitals', '- ทั้งหมด -'));
  }

  const filterSpecSelect = document.getElementById('filterDocSpecialty');
  if (filterSpecSelect) {
    filterSpecSelect.innerHTML = '';
    const uniqueSpecs = [...new Set(window.globalDoctors.map(d => d.specialty).filter(v => v && v !== '-'))].sort();
    uniqueSpecs.forEach(spec => {
      const opt = document.createElement('option');
      opt.value = spec;
      opt.textContent = spec;
      filterSpecSelect.appendChild(opt);
    });
    window.initMultiTomSelect('filterDocSpecialty', window.safeTranslate('opt_all_specialties', '- ทั้งหมด -'));
  }

  const filterTypeSelect = document.getElementById('filterDocType');
  if (filterTypeSelect) {
    filterTypeSelect.innerHTML = '';
    const uniqueTypes = [...new Set(window.globalDoctors.map(d => d.type).filter(v => v && v !== '-'))].sort();
    uniqueTypes.forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      filterTypeSelect.appendChild(opt);
    });
    window.initMultiTomSelect('filterDocType', window.safeTranslate('opt_all_types', '- ทั้งหมด -'));
  }

  if (window.DocManagerCache.filters) {
    const f = window.DocManagerCache.filters;
    const docEl = document.getElementById('filterDocName');
    const hospEl = document.getElementById('filterDocWorkplace');
    const specEl = document.getElementById('filterDocSpecialty');
    const typeEl = document.getElementById('filterDocType'); 
    const rowsEl = document.getElementById('doctorRowsPerPage');

    if (docEl && docEl.tomselect && f.name && f.name.length > 0) docEl.tomselect.setValue(f.name);
    if (hospEl && hospEl.tomselect && f.hosp && f.hosp.length > 0) hospEl.tomselect.setValue(f.hosp);
    if (specEl && specEl.tomselect && f.spec && f.spec.length > 0) specEl.tomselect.setValue(f.spec);
    if (typeEl && typeEl.tomselect && f.type && f.type.length > 0) typeEl.tomselect.setValue(f.type);
    if (rowsEl) rowsEl.value = f.rows || 20;

    window.currentPage = f.page || 1;
    window.rowsPerPage = f.rows || 20;
    window.currentDocSortCol = f.sortCol || 'nameEn';
    window.currentDocSortAsc = f.sortAsc !== undefined ? f.sortAsc : true;
  }

  window.filterDoctors(false); 

  if (filterGroup) {
    filterGroup.classList.add('ready');
  }
};

window.forceReloadDoctors = async function() {
  const btn = document.getElementById('btnRefreshDoctors');
  if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
  await window.loadIndexDropdowns(true);
  await window.loadDoctors(true);
  if (btn) btn.innerHTML = `<i class="fa-solid fa-arrows-rotate me-1"></i> <span data-i18n="btn_refresh">Refresh</span>`;
};

window.clearDoctorFilters = function() {
  const clearTs = (id) => {
    const el = document.getElementById(id);
    if (el && el.tomselect) {
      el.tomselect.clear();
    } else if (el) {
      el.value = '';
    }
  };
  
  clearTs('filterDocName');
  clearTs('filterDocWorkplace');
  clearTs('filterDocSpecialty');
  clearTs('filterDocType');
  
  window.filterDoctors();
};

window.sortDoctors = function(col) {
  if (window.currentDocSortCol === col) {
    window.currentDocSortAsc = !window.currentDocSortAsc; 
  } else {
    window.currentDocSortCol = col;
    window.currentDocSortAsc = true; 
  }

  ['nameEn', 'nameTh', 'specialty', 'hospital', 'status'].forEach(c => {
    const icon = document.getElementById('icon-sort-doc-' + c);
    if (icon) {
      if (c === window.currentDocSortCol) {
        icon.className = window.currentDocSortAsc ? 'fa-solid fa-sort-up text-primary ms-1' : 'fa-solid fa-sort-down text-primary ms-1';
      } else {
        icon.className = 'fa-solid fa-sort text-muted ms-1';
      }
    }
  });

  window.filterDoctors(false); 
};

window.filterDoctors = function(resetPage = true) {
  const getTsVals = (id) => {
    const el = document.getElementById(id);
    if (el && el.tomselect) {
      let val = el.tomselect.getValue();
      return Array.isArray(val) ? val : (val ? [val] : []);
    }
    return [];
  };

  const nameTermIds = getTsVals('filterDocName');
  const hospTermIds = getTsVals('filterDocWorkplace');
  const specTerms = getTsVals('filterDocSpecialty');
  const typeTerms = getTsVals('filterDocType');

  if (resetPage) window.currentPage = 1; 

  window.DocManagerCache.filters = {
    name: nameTermIds,
    spec: specTerms,
    type: typeTerms,
    hosp: hospTermIds,
    page: window.currentPage,
    rows: window.rowsPerPage,
    sortCol: window.currentDocSortCol,
    sortAsc: window.currentDocSortAsc
  };

  const filtered = window.globalDoctors.filter(d => {
    const matchName = (nameTermIds.length === 0) || nameTermIds.includes(String(d.id));
    const matchSpec = (specTerms.length === 0) || specTerms.includes(String(d.specialty));
    const matchType = (typeTerms.length === 0) || typeTerms.includes(String(d.type));
    
    const matchHosp = (hospTermIds.length === 0) || hospTermIds.some(hId => {
      if (String(d.hospitalId) === String(hId)) return true;
      try {
        const wps = JSON.parse(d.workplacesJson || '[]');
        return wps.some(wp => String(wp.hospitalId) === String(hId));
      } catch(e) { return false; }
    });

    return matchName && matchSpec && matchType && matchHosp;
  });

  filtered.sort((a, b) => {
    let valA = '', valB = '';

    if (window.currentDocSortCol === 'nameEn') {
      valA = (a.nameEn || '').toLowerCase(); valB = (b.nameEn || '').toLowerCase();
    } else if (window.currentDocSortCol === 'nameTh') {
      valA = (a.nameTh || '').toLowerCase(); valB = (b.nameTh || '').toLowerCase();
    } else if (window.currentDocSortCol === 'specialty') {
      valA = (a.specialty || '').toLowerCase(); valB = (b.specialty || '').toLowerCase();
    } else if (window.currentDocSortCol === 'hospital') {
      valA = (a.hospitalName || '').toLowerCase(); valB = (b.hospitalName || '').toLowerCase();
    } else if (window.currentDocSortCol === 'status') {
      valA = (a.status || '').toLowerCase(); valB = (b.status || '').toLowerCase();
    }

    if (valA < valB) return window.currentDocSortAsc ? -1 : 1;
    if (valA > valB) return window.currentDocSortAsc ? 1 : -1;
    return 0;
  });

  window.globalFilteredDoctors = filtered;
  window.renderDoctorTable(); 
};

window.changeRowsPerPage = function() {
  const selectEl = document.getElementById('doctorRowsPerPage');
  window.rowsPerPage = parseInt(selectEl.value);
  window.currentPage = 1;
  window.DocManagerCache.filters.rows = window.rowsPerPage;
  window.DocManagerCache.filters.page = 1;
  window.renderDoctorTable();
};

window.goToPage = function(page) {
  const totalPages = Math.ceil(window.globalFilteredDoctors.length / window.rowsPerPage);
  if (page < 1 || page > totalPages) return;
  window.currentPage = page;
  window.DocManagerCache.filters.page = page;
  window.renderDoctorTable();
};

window.renderDoctorTable = function() {
  const tbody = document.getElementById('doctorTableBody'); 
  if(!tbody) return;
  tbody.innerHTML = '';
  
  const data = window.globalFilteredDoctors;

  if(!Array.isArray(data) || data.length === 0) {
    if(document.getElementById('doctorPaginationContainer')) document.getElementById('doctorPaginationContainer').classList.add('d-none');
    return tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-5"><i class="fa-solid fa-folder-open fs-3 mb-2 d-block text-muted"></i>No matching records found.</td></tr>';
  }
  
  if(document.getElementById('doctorPaginationContainer')) document.getElementById('doctorPaginationContainer').classList.remove('d-none');

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / window.rowsPerPage);
  if (window.currentPage > totalPages) window.currentPage = totalPages;
  if (window.currentPage < 1) window.currentPage = 1;

  const startIndex = (window.currentPage - 1) * window.rowsPerPage;
  const endIndex = Math.min(startIndex + window.rowsPerPage, totalItems);
  
  document.getElementById('doctorPageInfo').innerText = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} entries`;

  const paginatedData = data.slice(startIndex, endIndex);

  paginatedData.forEach(d => {
    let badge = 'badge-soft-success';
    let statusText = d.status || 'Active';
    let btnEditText = window.safeTranslate('btn_edit', 'Edit');
    let actionButton = `<button class="btn btn-sm btn-premium-secondary fw-bold" onclick="openEditDoctorView('${d.id}')"><i class="fa-solid fa-pen"></i> ${btnEditText}</button>`;

    if (d.isPendingDcr) {
      badge = 'badge-soft-pending';
      statusText = '⏳ Pending (DCR)';
      actionButton = `<span class="text-muted small"><i class="fa-solid fa-clock"></i> Waiting for Admin</span>`;
    } else if (d.status === 'Inactive') {
      badge = 'badge-soft-danger';
    }

    const pendingEditTag = d.hasPendingEdit ? `<span class="badge badge-soft-warning ms-2" style="font-size:0.75rem;">⏳ Pending Edit</span>` : '';
    const nameEnShow = d.nameEn || '-';
    
    const nameCellLink = d.isPendingDcr ? 
      `<span class="fw-bold text-dark"><i class="fa-solid fa-user-doctor me-2 text-warning"></i>${nameEnShow}</span>` : 
      `<a href="#" class="table-visit-link" onclick="openViewDoctorProfile('${d.id}'); return false;"><i class="fa-solid fa-user-doctor me-2 text-primary"></i>${nameEnShow}</a>${pendingEditTag}`;

    tbody.innerHTML += `
      <tr>
        <td class="text-start ps-3">${nameCellLink}</td>
        <td class="fw-medium text-secondary">${d.nameTh || '-'}</td>
        <td><span class="badge badge-soft-product">${d.specialty || '-'}</span></td>
        <td class="text-secondary"><small><i class="fa-regular fa-hospital me-1 text-primary"></i>${d.hospitalName || '-'}</small></td>
        <td class="text-center"><span class="badge ${badge}">${statusText}</span></td>
        <td class="text-center">${actionButton}</td>
      </tr>`;
  });

  window.renderPaginationControls(totalPages);
};

window.renderPaginationControls = function(totalPages) {
  const ul = document.getElementById('doctorPagination');
  if(!ul) return;
  let html = '';

  html += `<li class="page-item ${window.currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link shadow-xs" href="#" onclick="goToPage(${window.currentPage - 1}); return false;">&laquo; Prev</a>
          </li>`;

  let startPage = Math.max(1, window.currentPage - 2);
  let endPage = Math.min(totalPages, window.currentPage + 2);

  if (startPage > 1) {
      html += `<li class="page-item"><a class="page-link shadow-xs" href="#" onclick="goToPage(1); return false;">1</a></li>`;
      if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>`;
  }

  for (let i = startPage; i <= endPage; i++) {
      html += `<li class="page-item ${window.currentPage === i ? 'active' : ''}">
                <a class="page-link shadow-xs" href="#" onclick="goToPage(${i}); return false;">${i}</a>
              </li>`;
  }

  if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>`;
      html += `<li class="page-item"><a class="page-link shadow-xs" href="#" onclick="goToPage(${totalPages}); return false;">${totalPages}</a></li>`;
  }

  html += `<li class="page-item ${window.currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link shadow-xs" href="#" onclick="goToPage(${window.currentPage + 1}); return false;">Next &raquo;</a>
          </li>`;

  ul.innerHTML = html;
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
  window.DocManagerCache.hospitals.forEach(h => {
    const selected = h.Hospital_ID === hospId ? 'selected' : '';
    const showName = h.Known_As ? `${h.Hospital} (${h.Known_As})` : h.Hospital;
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
      <button type="button" class="btn btn-sm btn-outline-danger w-100 fw-bold rounded-pill" onclick="removeWorkplaceRow(this)"><i class="fa-solid fa-trash me-1"></i> Remove</button>
    </div>
  `;
  container.appendChild(row);

  new TomSelect(`#${selectId}`, {
    create: false, 
    searchField: ["text"], 
    sortField: { field: "text", direction: "asc" },
    placeholder: "- Search and Select Hospital -", 
    allowEmptyOption: true, 
    maxOptions: null,
    dropdownParent: 'body'
  });
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
// 📝 7. FORM ACTIONS (ADD, EDIT, PROFILE)
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
    const { data, error } = await window.supabaseClient.from('DCR').select('Status, Action').eq('Ref_ID', docId).eq('Status', 'Pending');
    if (error) throw error;
    
    const badgeContainer = document.getElementById('editDcrStatusBadge');
    if (badgeContainer) {
      badgeContainer.innerHTML = (data && data.length > 0) ? `<span class="badge badge-soft-warning fs-6"><i class="fa-solid fa-hourglass-half me-1"></i>Pending (${data[0].Action})</span>` : '';
    }
  } catch (err) { console.error("Error check DCR:", err); }
};

window.openEditDoctorView = function(id) {
  const d = window.globalDoctors.find(x => x.id === id); 
  if(!d) return;
  
  document.getElementById('editDocId').value = d.id; 
  
  const setTsVal = (elId, val) => { const el = document.getElementById(elId); if(el && el.tomselect) el.tomselect.setValue(val); else if (el) el.value = val; };
  setTsVal('editDocTitle', d.title || '');
  setTsVal('editDocSpecialty', d.specialty || '');
  setTsVal('editDocType', d.type || '');
  
  document.getElementById('editDocNameEn').value = d.nameEn || ''; 
  document.getElementById('editDocNameTh').value = d.nameTh || ''; 
  document.getElementById('editDocEmail').value = d.email || '';
  document.getElementById('editDocMobile').value = d.mobile || '';
  document.getElementById('editDocPrivacy').value = d.privacy || 'Yes';
  document.getElementById('editDocTos').value = d.tos || 'Yes';
  document.getElementById('editDocStatus').value = d.status || 'Active';

  window.clearWorkplaceContainer('workplaceContainerEdit');
  let parsedWp = [];
  try { if (d.workplacesJson) parsedWp = JSON.parse(d.workplacesJson); } catch(e) {}
  
  if (parsedWp.length > 0) {
    parsedWp.forEach(wp => window.addWorkplaceRow('workplaceContainerEdit', 'primaryWpEdit', wp.hospitalId, wp.isPrimary));
  } else {
    window.addWorkplaceRow('workplaceContainerEdit', 'primaryWpEdit', d.hospitalId, true);
  }

  window.checkPendingDCR(d.id); 
  window.switchDoctorView('doctorEditView');
};

window.openViewDoctorProfile = async function(id, targetTab = '#tab-doc-info') {
  window.currentTargetDocId = id; 
  const d = window.globalDoctors.find(x => x.id === id); 
  if(!d) return;

  document.getElementById('viewDocTitleName').innerText = `👨‍⚕️ ${d.title || ''} ${d.nameEn || ''} ${d.nameTh ? `(${d.nameTh})` : ''}`;
  document.getElementById('viewDocSpecialty').value = d.specialty || '-';
  document.getElementById('viewDocType').value = d.type || '-';
  document.getElementById('viewDocStatus').value = d.status || 'Active';
  document.getElementById('viewDocEmail').value = d.email || '-';
  document.getElementById('viewDocMobile').value = d.mobile || '-';

  let wpHTML = '';
  let parsedWp = [];
  try { if (d.workplacesJson) parsedWp = JSON.parse(d.workplacesJson); } catch(e) {}
  
  if(parsedWp.length > 0) {
    parsedWp.forEach(wp => {
      const isPrimary = wp.isPrimary ? '<span class="badge badge-soft-info ms-2">Primary</span>' : '';
      const hospObj = window.DocManagerCache.hospitals.find(h => h.Hospital_ID === wp.hospitalId);
      const hospName = hospObj ? (hospObj.Known_As || hospObj.Hospital) : "Hospital";
      wpHTML += `<div class="py-2 px-3 bg-white border rounded-3 mb-2">🏥 <span class="fw-bold text-dark">${hospName}</span> ${isPrimary}</div>`;
    });
  } else {
    const hospObj = window.DocManagerCache.hospitals.find(h => h.Hospital_ID === d.hospitalId);
    const hospName = hospObj ? (hospObj.Known_As || hospObj.Hospital) : "Primary Hospital";
    wpHTML = `<div class="py-2 px-3 bg-white border rounded-3 mb-2">🏥 <span class="fw-bold text-dark">${hospName}</span> <span class="badge badge-soft-info ms-2">Primary</span></div>`;
  }
  document.getElementById('viewWorkplaceContainer').innerHTML = wpHTML;

  let phtml = '<option value="">- All Products -</option>';
  if (typeof window.globalTeamProducts !== 'undefined') {
    window.globalTeamProducts.forEach(p => phtml += `<option value="${p.Product_ID}">${p.Product}</option>`);
  }
  document.getElementById('filterProfileVisitProduct').innerHTML = phtml;

  const addProdBtn = document.getElementById('btnAddRatingProduct');
  const lockBanner = document.getElementById('ratingLockBanner');
  
  if (window.globalRatingIsLocked && window.globalCurrentUserRole !== 'Admin') {
    if (addProdBtn) addProdBtn.style.display = 'none';
    if (lockBanner) lockBanner.style.display = 'block';
  } else {
    if (addProdBtn) addProdBtn.style.display = 'inline-block';
    if (lockBanner) lockBanner.style.display = 'none';
  }

  window.loadDoctorVisitHistory(id);
  await window.loadDoctorRatings(id);

  const tabEl = document.querySelector(`#doctorProfileView .nav-link[data-bs-target="${targetTab}"]`);
  if(tabEl) { 
    const tab = new bootstrap.Tab(tabEl); 
    tab.show(); 
  } else {
    const firstTabEl = document.querySelector('#doctorProfileView .nav-link');
    if(firstTabEl) { const tab = new bootstrap.Tab(firstTabEl); tab.show(); }
  }

  window.switchDoctorView('doctorProfileView');
};

// ==========================================
// 📅 8. DOCTOR PROFILE VISIT HISTORY TAB
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
  
  ['date', 'user', 'territory', 'products', 'purpose', 'status'].forEach(c => {
    const icon = document.getElementById('icon-sort-pvisit-' + c);
    if (icon) {
      if (c === window.currentPVisitSortCol) {
        icon.className = window.currentPVisitSortAsc ? 'fa-solid fa-sort-up text-primary ms-1' : 'fa-solid fa-sort-down text-primary ms-1';
      } else {
        icon.className = 'fa-solid fa-sort text-muted ms-1';
      }
    }
  });
  
  window.filterAndRenderDoctorVisits();
};

window.loadDoctorVisitHistory = async function(docId) {
  const tbody = document.getElementById('viewVisitHistoryBody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Loading... <i class="fa-solid fa-spinner fa-spin text-primary"></i></td></tr>';
  
  try {
    const [visitRes, vpRes, dcrRes] = await Promise.all([
      window.supabaseClient.from('Visit_Logs').select('*').eq('Doc_ID', docId).order('Visit_Date', { ascending: false }),
      window.supabaseClient.from('Visit_Products').select('*'),
      window.supabaseClient.from('DCR').select('Ref_ID').eq('Action', 'Unlock Visit').eq('Status', 'Pending')
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
  window.pvisitRowsPerPage = parseInt(selectEl.value);
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

  let filtered = window.globalCurrentDoctorVisits.filter(v => {
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

    const visitProds = window.globalCurrentDoctorVisitProducts.filter(vp => String(vp.Visit_ID) === String(v.Visit_ID)).map(vp => String(vp.Product_ID));
    const matchProd = (prodTerm === "") || visitProds.includes(String(prodTerm));

    return matchDate && matchProd;
  });

  const mappedData = filtered.map(v => {
    const isPendingUnlock = window.globalPendingUnlockVisits.includes(v.Visit_ID);
    let badge = (v.Status === 'Submitted') ? 'badge-soft-success' : 'badge-soft-pending';
    let statusShow = (v.Status === 'Submitted') ? '✅ Submitted' : '⏳ Pending';

    if (isPendingUnlock) {
      badge = 'badge-soft-secondary';
      statusShow = '⏳ Pending Unlock';
    }

    const rawWho = v.Whoupdated || v.whoupdated || v.Sales_Rep || v.sales_rep || v.Created_By || '';
    const rawRepId = v.Rep_ID || v.rep_id || v.User_ID || v.user_id || '';
    const rawTerrId = v.Territory_ID || v.territory_id || '';

    const userObj = window.globalUsers.find(u => {
      const uEmail = String(u.Email || u.email || '').toLowerCase().trim();
      const uRepId = String(u.Rep_ID || u.rep_id || u.ID || u.id || '').trim();
      const vWhoStr = String(rawWho).toLowerCase().trim();
      const vRepStr = String(rawRepId).trim();
      return (uEmail !== '' && vWhoStr !== '' && uEmail === vWhoStr) || 
             (uRepId !== '' && vRepStr !== '' && uRepId === vRepStr) || 
             (uEmail !== '' && vRepStr !== '' && uEmail === vRepStr.toLowerCase());
    });
    const repNameShow = userObj ? (userObj.Rep_Name || userObj.rep_name || userObj.Name || userObj.name || rawWho) : (rawWho || '-');

    const visitProds = window.globalCurrentDoctorVisitProducts.filter(vp => String(vp.Visit_ID) === String(v.Visit_ID)).map(vp => String(vp.Product_ID));
    let prodNames = [];
    let prodBadges = '';
    if (visitProds.length > 0) {
        visitProds.forEach(pid => {
            const pObj = window.globalProducts.find(p => String(p.Product_ID) === pid);
            const pName = pObj ? pObj.Product : pid;
            prodNames.push(pName);
            prodBadges += `<span class="badge badge-soft-product me-1 mb-1">${pName}</span>`;
        });
    } else {
        prodBadges = '<span class="text-muted small">-</span>';
    }

    const terrObj = window.globalTerritories.find(t => {
      const tId = String(t.Territory_ID || t.territory_id || t.id || '').toLowerCase().trim();
      const vTerrStr = String(rawTerrId).toLowerCase().trim();
      return tId !== '' && vTerrStr !== '' && tId === vTerrStr;
    });
    const terrNameShow = terrObj ? (terrObj.Territory || terrObj.territory || terrObj.Territory_Name || rawTerrId) : (rawTerrId || '-');

    return {
       ...v,
       mappedUser: repNameShow,
       mappedTerritory: terrNameShow,
       mappedProductsTxt: prodNames.join(', '),
       mappedProductsHtml: prodBadges,
       mappedStatusShow: statusShow,
       mappedBadge: badge
    };
  });

  mappedData.sort((a, b) => {
    let valA = '', valB = '';
    if (window.currentPVisitSortCol === 'date') {
      valA = a.Visit_Date || ''; valB = b.Visit_Date || '';
    } else if (window.currentPVisitSortCol === 'user') {
      valA = a.mappedUser.toLowerCase(); valB = b.mappedUser.toLowerCase();
    } else if (window.currentPVisitSortCol === 'territory') {
      valA = a.mappedTerritory.toLowerCase(); valB = b.mappedTerritory.toLowerCase();
    } else if (window.currentPVisitSortCol === 'products') {
      valA = a.mappedProductsTxt.toLowerCase(); valB = b.mappedProductsTxt.toLowerCase();
    } else if (window.currentPVisitSortCol === 'purpose') {
      valA = (a.Purpose || '').toLowerCase(); valB = (b.Purpose || '').toLowerCase();
    } else if (window.currentPVisitSortCol === 'status') {
      valA = (a.Status || '').toLowerCase(); valB = (b.Status || '').toLowerCase();
    }

    if (valA < valB) return window.currentPVisitSortAsc ? -1 : 1;
    if (valA > valB) return window.currentPVisitSortAsc ? 1 : -1;
    return 0;
  });

  tbody.innerHTML = '';
  const pagCont = document.getElementById('pvisitPaginationContainer');

  if(mappedData.length === 0) {
    if (pagCont) pagCont.classList.add('d-none');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No visit history found.</td></tr>';
    return;
  }

  if (pagCont) pagCont.classList.remove('d-none');

  const totalItems = mappedData.length;
  const totalPages = Math.ceil(totalItems / window.pvisitRowsPerPage);
  if (window.currentPVisitPage > totalPages) window.currentPVisitPage = totalPages;
  if (window.currentPVisitPage < 1) window.currentPVisitPage = 1;

  const startIndex = (window.currentPVisitPage - 1) * window.pvisitRowsPerPage;
  const endIndex = Math.min(startIndex + window.pvisitRowsPerPage, totalItems);

  document.getElementById('pvisitPageInfo').innerText = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} entries`;

  const paginatedData = mappedData.slice(startIndex, endIndex);

  paginatedData.forEach(v => {
    const dateStr = v.Visit_Date ? new Date(v.Visit_Date).toLocaleDateString('th-TH') : '-';
    tbody.innerHTML += `
      <tr class="align-middle">
        <td class="text-center fw-bold">
          <a href="#" class="table-visit-link" onclick="goToEditCall('${v.Visit_ID || v.visit_id || v.id || ''}'); return false;" title="Edit/View">
            ${dateStr}
          </a>
        </td>
        <td class="fw-bold text-dark">${v.mappedUser}</td>
        <td class="text-center"><span class="badge badge-soft-product">${v.mappedTerritory}</span></td>
        <td>${v.mappedProductsHtml}</td>
        <td><small>${v.Purpose || '-'}</small></td>
        <td class="text-center"><span class="badge ${v.mappedBadge}">${v.mappedStatusShow}</span></td>
      </tr>
    `;
  });

  window.renderPVisitPaginationControls(totalPages);
};

window.renderPVisitPaginationControls = function(totalPages) {
  const ul = document.getElementById('pvisitPagination');
  if (!ul) return;
  let html = '';

  html += `<li class="page-item ${window.currentPVisitPage === 1 ? 'disabled' : ''}">
            <a class="page-link shadow-xs" href="#" onclick="goToPVisitPage(${window.currentPVisitPage - 1}); return false;">&laquo; Prev</a>
          </li>`;

  let startPage = Math.max(1, window.currentPVisitPage - 2);
  let endPage = Math.min(totalPages, window.currentPVisitPage + 2);

  if (startPage > 1) {
      html += `<li class="page-item"><a class="page-link shadow-xs" href="#" onclick="goToPVisitPage(1); return false;">1</a></li>`;
      if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>`;
  }

  for (let i = startPage; i <= endPage; i++) {
      html += `<li class="page-item ${window.currentPVisitPage === i ? 'active' : ''}">
                <a class="page-link shadow-xs" href="#" onclick="goToPVisitPage(${i}); return false;">${i}</a>
              </li>`;
  }

  if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>`;
      html += `<li class="page-item"><a class="page-link shadow-xs" href="#" onclick="goToPVisitPage(${totalPages}); return false;">${totalPages}</a></li>`;
  }

  html += `<li class="page-item ${window.currentPVisitPage === totalPages ? 'disabled' : ''}">
            <a class="page-link shadow-xs" href="#" onclick="goToPVisitPage(${window.currentPVisitPage + 1}); return false;">Next &raquo;</a>
          </li>`;

  ul.innerHTML = html;
};

window.goToQuickAddCall = function() {
  sessionStorage.setItem('returnToDocId', window.currentTargetDocId);
  
  const allMenus = document.querySelectorAll('.nav-link, a, button, .menu-item');
  allMenus.forEach(btn => {
    const txt = btn.textContent || btn.innerText;
    if (txt && (txt.trim().includes('บันทึกเยี่ยม') || txt.trim().includes('Visit Logs')) && !txt.includes('Add Call')) {
      btn.click();
    }
  });

  let attempts = 0;
  const checkReady = setInterval(() => {
    attempts++;
    if (typeof window.openAddVisitModal === 'function') {
      clearInterval(checkReady);
      window.openAddVisitModal(window.currentTargetDocId); 
    } else if (attempts > 30) {
      clearInterval(checkReady);
      alert("Please switch to 'Visit Logs' menu manually.");
    }
  }, 100);
};

window.goToEditCall = function(visitId) {
  if (!visitId || visitId === "undefined") {
    return alert("❌ Visit ID not found.");
  }
  sessionStorage.setItem('returnToDocId', window.currentTargetDocId);

  const allMenus = document.querySelectorAll('.nav-link, a, button, .menu-item');
  allMenus.forEach(btn => {
    const txt = btn.textContent || btn.innerText;
    if (txt && (txt.trim().includes('บันทึกเยี่ยม') || txt.trim().includes('Visit Logs')) && !txt.includes('Add Call')) {
      btn.click();
    }
  });

  let attempts = 0;
  const checkReady = setInterval(() => {
    attempts++;
    if (typeof window.openEditVisitModal === 'function' && window.globalVisits && window.globalVisits.length > 0) {
      clearInterval(checkReady);
      window.openEditVisitModal(visitId, window.currentTargetDocId);
    } else if (attempts > 50) { 
      clearInterval(checkReady);
      alert("Data is taking too long to load. Please click the edit button manually on the Visit Logs page.");
    }
  }, 100);
};

// ==========================================
// 🎯 9. TARGET CALL & RATING ENGINE
// ==========================================
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
      const { data, error } = await window.supabaseClient
          .from('Rating')
          .select('*')
          .eq('Doc_ID', docId);

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
  
  if(!Array.isArray(ratings) || ratings.length === 0) {
      tbody.innerHTML = '<tr class="no-data"><td colspan="6" class="text-center text-muted py-4">No data. Click "Add Product"</td></tr>';
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
  if (typeof window.globalTeamProducts !== 'undefined') {
      window.globalTeamProducts.forEach(p => {
          const sel = String(p.Product_ID) === String(prodId) ? 'selected' : '';
          prodOpts += `<option value="${p.Product_ID}" ${sel}>${p.Product}</option>`; 
      });
  }
  
  let isMyProduct = window.globalTeamProducts.some(p => String(p.Product_ID) === String(prodId));
  if (prodId && !isMyProduct) {
      const existingProd = window.globalProducts.find(p => String(p.Product_ID) === String(prodId));
      if (existingProd) {
           prodOpts += `<option value="${existingProd.Product_ID}" selected>${existingProd.Product}</option>`; 
      }
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

  let actionHtml = '';
  if (canEdit) {
      actionHtml = `<button class="btn btn-sm btn-premium-primary fw-bold px-3" onclick="saveTargetCallRow(this)"><i class="fa-solid fa-floppy-disk me-1"></i> Save</button>`;
  } else {
      actionHtml = `<span class="badge badge-soft-secondary"><i class="fa-solid fa-lock me-1"></i> Locked</span>`;
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

  if (!disabledAttr) {
      const tsProd = new TomSelect(`#${selectId}`, { create: false, searchField: ["text"], sortField: { field: "text", direction: "asc" }, placeholder: "- Select Product -", allowEmptyOption: true, dropdownParent: 'body' });
      const tsAdopt = new TomSelect(`#${adoptId}`, { create: false, placeholder: "- Select -", allowEmptyOption: true, dropdownParent: 'body' });
      const tsPot = new TomSelect(`#${potId}`, { create: false, placeholder: "- Select -", allowEmptyOption: true, dropdownParent: 'body' });
      
      tsProd.on('change', function() { window.triggerCalcTarget(document.getElementById(selectId)); });
      tsAdopt.on('change', function() { window.triggerCalcTarget(document.getElementById(adoptId)); });
      tsPot.on('change', function() { window.triggerCalcTarget(document.getElementById(potId)); });
  }
};

window.triggerCalcTarget = function(element) {
  const tr = element.closest('tr');
  const prodId = tr.querySelector('.rating-product').value;
  const adopt = tr.querySelector('.rating-adopt').value;
  const pot = tr.querySelector('.rating-pot').value;
  
  const classInput = tr.querySelector('.rating-class');
  const targetInput = tr.querySelector('.rating-target');
  
  let calcClass = "";

  if (prodId && adopt && pot) {
      const matrixRow = window.globalMatrixData.find(m => m.Adoption === adopt && m.Potential === pot);
      if (matrixRow) {
          calcClass = matrixRow.Classification || "";
      }
  }
  classInput.value = calcClass;

  if (prodId && calcClass) {
      const targetRow = window.globalTargetData.find(t => 
          String(t.Product_ID) === String(prodId) && 
          t.Classification === calcClass
      );
      targetInput.value = targetRow ? (targetRow.Target !== undefined ? targetRow.Target : "") : "";
  } else {
      targetInput.value = "";
  }
};

window.saveTargetCallRow = async function(btn) {
  const tr = btn.closest('tr');
  
  const selectedProductId = tr.querySelector('.rating-product').value;
  const adoptVal = tr.querySelector('.rating-adopt').value;
  const potVal = tr.querySelector('.rating-pot').value;
  const classificationValue = tr.querySelector('.rating-class').value;
  const targetValue = tr.querySelector('.rating-target').value;

  if(!selectedProductId || !adoptVal || !potVal) {
      alert("❌ Missing fields: Product, Adoption or Potential.");
      return;
  }

  const allProductSelects = document.querySelectorAll('#ratingTableBody .rating-product');
  let duplicateCount = 0;
  allProductSelects.forEach(select => {
      if (select.value === selectedProductId) duplicateCount++;
  });

  if (duplicateCount > 1) {
      alert("❌ Cannot save: This product already exists.");
      return; 
  }
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  let crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
  const whoUpdated = crmUser ? (crmUser.Email || crmUser.Rep_Name || "System_User") : "System_User";

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
      const { error } = await window.supabaseClient
          .from('Rating')
          .upsert(payload, { onConflict: 'Doc_ID, Product_ID' });

      if (error) throw error;

      btn.className = 'btn btn-sm btn-premium-primary fw-bold px-3';
      btn.innerHTML = '<i class="fa-solid fa-check me-1"></i> Saved';
      
      setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i> Save';
      }, 2000);

  } catch(err) {
      console.error("Save error:", err);
      alert("❌ Save failed: " + err.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i> Save';
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

  const isDuplicate = window.globalDoctors.some(d => {
    const matchEN = payload.Doc_Name && d.nameEn && d.nameEn.toLowerCase().trim() === payload.Doc_Name.toLowerCase().trim();
    const matchTH = payload.Doc_Name_TH && d.nameTh && d.nameTh.toLowerCase().trim() === payload.Doc_Name_TH.toLowerCase().trim();
    return matchEN || matchTH;
  });

  if (isDuplicate) {
    alert(`❌ Cannot save! Doctor "${payload.Doc_Name || payload.Doc_Name_TH}" already exists or is pending approval.`);
    btn.disabled = false; btn.innerHTML = "Submit DCR"; return; 
  }

  try {
    const dcrPayload = { Action: 'Add Doctor', Requested_Data: JSON.stringify(payload), Status: 'Pending', Whoupdated: whoUpdated };
    const { error } = await window.supabaseClient.from('DCR').insert([dcrPayload]);
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
    Mobile: document.getElementById('editDocMobile').value.trim(),
    Privacy_Policy: document.getElementById('editDocPrivacy').value,
    Terms_of_Service: document.getElementById('editDocTos').value,
    Status: document.getElementById('editDocStatus').value,
    Whoupdated: whoUpdated
  };

  try {
    const dcrPayload = { Ref_ID: docId, Action: 'Edit Doctor', Requested_Data: JSON.stringify(payload), Status: 'Pending', Whoupdated: whoUpdated };
    const { error } = await window.supabaseClient.from('DCR').insert([dcrPayload]);
    if (error) throw error;
    
    alert("✅ DCR submitted successfully. Waiting for Admin approval.");
    window.switchDoctorView('doctorListView'); 
    await window.loadDoctors(true); 

  } catch (err) { alert("❌ Error: " + err.message); } 
  finally { btn.disabled = false; btn.innerHTML = "Submit DCR"; }
};

// ==========================================
// 🚀 10. AUTO INITIALIZATION (SPA COMPATIBLE)
// ==========================================
window.initDoctorPage = async function() {
  await window.loadIndexDropdowns(); 
  await window.loadDoctors();

  const directViewDocId = sessionStorage.getItem('directViewDocId');
  if (directViewDocId) {
    sessionStorage.removeItem('directViewDocId');
    window.openViewDoctorProfile(directViewDocId, '#tab-doc-info');
  }
};

// Auto-run เมื่อสคริปต์โหลด
setTimeout(() => {
  if (document.getElementById('doctorTableBody')) {
    window.initDoctorPage();
  }
}, 100);
