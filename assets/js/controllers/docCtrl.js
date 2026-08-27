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
  myAllowedTerIds: [],
  pendingDcrMap: {}
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
};

window.goBackFromDoctorProfile = function() {
  window.currentTargetDocId = ""; 
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
  if(el.tomselect) {
    el.tomselect.settings.placeholder = placeholder;
    el.tomselect.inputState();
    return;
  }
  
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

// ⚡ REUSE TOMSELECT INSTANCES
window.updateTomSelect = function(id, html, placeholder) {
  const el = document.getElementById(id);
  if(!el) return;
  
  if (el.tomselect) {
    el.tomselect.clearOptions();
    el.innerHTML = html;
    el.tomselect.sync();
  } else if (typeof TomSelect !== 'undefined') {
    el.innerHTML = html;
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
// 🎯 HELPER RENDER FILTER DROPDOWNS
// ==========================================
window.renderFilterDropdowns = function(validDocsData) {
  if (!validDocsData || !Array.isArray(validDocsData)) return;

  window.DocManagerCache.validDocsData = validDocsData;

  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  const phSpec = (appLang === 'en') ? '- All Specialties -' : '- ความเชี่ยวชาญทั้งหมด -';
  const phType = (appLang === 'en') ? '- All Types -' : '- ประเภททั้งหมด -';

  const specSelect = document.getElementById('filterDocSpecialty');
  if (specSelect) {
    const selectedVals = specSelect.tomselect ? specSelect.tomselect.getValue() : [];
    const uniqueSpecs = [...new Set(validDocsData.map(d => d.Specialty).filter(v => v && String(v).trim() !== '' && v !== '-'))].sort();
    
    specSelect.innerHTML = uniqueSpecs.map(s => `<option value="${s}">${s}</option>`).join('');
    window.initMultiTomSelect('filterDocSpecialty', phSpec);
    
    if (selectedVals.length > 0 && specSelect.tomselect) {
      specSelect.tomselect.setValue(selectedVals, true);
    }
  }

  const typeSelect = document.getElementById('filterDocType');
  if (typeSelect) {
    const selectedVals = typeSelect.tomselect ? typeSelect.tomselect.getValue() : [];
    const uniqueTypes = [...new Set(validDocsData.map(d => d.Type).filter(v => v && String(v).trim() !== '' && v !== '-'))].sort();
    
    typeSelect.innerHTML = uniqueTypes.map(t => `<option value="${t}">${t}</option>`).join('');
    window.initMultiTomSelect('filterDocType', phType);

    if (selectedVals.length > 0 && typeSelect.tomselect) {
      typeSelect.tomselect.setValue(selectedVals, true);
    }
  }
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

      const [typeRes, idxRes, hospRes, assignRes, terrRes, teamRes, buRes, prodRes, userRes, matrixRes, targetRes, teamProdRes, sysSetRes, dcrRes] = await Promise.all([
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
        sb.from('System_Settings').select('*'),
        sb.from('DCR').select('Ref_ID, Action, Whenupdated, Whoupdated').eq('Status', 'Pending')
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

      window.DocManagerCache.pendingDcrMap = {};
      (dcrRes.data || []).forEach(item => {
        if (item.Ref_ID) {
          window.DocManagerCache.pendingDcrMap[String(item.Ref_ID).trim()] = item;
        }
      });

      window.globalIndexTypes = window.DocManagerCache.indexTypes;
      window.globalIndexes = window.DocManagerCache.indexes;
      window.globalHospitals = window.DocManagerCache.hospitals;
      window.globalProducts = window.DocManagerCache.products;
      window.globalUsers = window.DocManagerCache.users;
      window.globalTerritories = window.DocManagerCache.territories;
      window.globalMatrixData = window.DocManagerCache.matrixData;
      window.globalTargetData = window.DocManagerCache.targetData;

      const ratingSetting = (sysSetRes.data || []).find(s => s.Type === 'Rating' || s.Type === 'TargetCall' || s.Type === 'Target Call');
      if (ratingSetting) {
        if (ratingSetting.Status === false || ratingSetting.status === false) {
          window.globalRatingIsLocked = true;
        } else {
          let startStr = ratingSetting.Start || ratingSetting.start;
          let endStr = ratingSetting.End || ratingSetting.end;
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
        window.globalRatingIsLocked = false;
      }

      var uRoleUpper = crmUser ? String(crmUser.Role || crmUser.role || '').trim().toUpperCase() : '';
      var rawScope = crmUser ? String(crmUser.Team_ID || crmUser.team_id || crmUser.Team || crmUser.Territory_ID || crmUser.territory_id || crmUser.Territory || crmUser.BU_ID || '').trim() : '';

      window.globalCurrentUserRole = uRoleUpper;

      var isGlobalViewer = false;
      var adminRoles = ['ADMIN', 'EXECUTIVE', 'SYSTEM ADMIN', 'STAFF', 'DIRECTOR', 'PRODUCT MANAGER'];
      if (adminRoles.indexOf(uRoleUpper) !== -1 || rawScope.toUpperCase() === 'ALL') {
        isGlobalViewer = true;
      }

      var allowedTerIds = [];
      var allowedDocIds = [];

      var allTerritories = terrRes.data || terrRes || [];
      var allTeams = teamRes.data || teamRes || [];
      var allBus = buRes.data || buRes || [];

      if (!isGlobalViewer) {
        var isBuHead = uRoleUpper.indexOf('BU') !== -1 || uRoleUpper.indexOf('HEAD') !== -1;
        var isManager = uRoleUpper.indexOf('MANAGER') !== -1;

        if (isBuHead) {
          var matchedBu = allBus.find(b => String(b.BU_ID) === rawScope || String(b.BU) === rawScope);
          var targetBuId = matchedBu ? String(matchedBu.BU_ID) : rawScope;
          var buTeams = allTeams.filter(t => String(t.BU_ID) === targetBuId || String(t.BU) === rawScope);
          var buTeamIds = buTeams.map(t => String(t.Team_ID));
          var terrs = allTerritories.filter(ter => buTeamIds.indexOf(String(ter.Team_ID)) !== -1 || String(ter.BU_ID) === targetBuId);
          terrs.forEach(ter => allowedTerIds.push(String(ter.Territory_ID)));
        } else if (isManager) {
          var matchedTeams = allTeams.filter(t => String(t.Team_ID) === rawScope || String(t.Team) === rawScope || String(t.Team_Name) === rawScope);
          var targetTeamIds = matchedTeams.map(t => String(t.Team_ID));
          if (targetTeamIds.length === 0 && rawScope) targetTeamIds.push(rawScope);

          var terrs = allTerritories.filter(t => targetTeamIds.indexOf(String(t.Team_ID)) !== -1 || targetTeamIds.indexOf(String(t.Team)) !== -1 || String(t.Territory_ID) === rawScope);
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

      const allProductsList = prodRes || [];
      const teamProdLinksList = teamProdRes || [];
      let filteredProds = [];

      if (isGlobalViewer) {
        filteredProds = allProductsList;
      } else {
        let targetTeams = [];
        if (crmUser) {
          var isBuHead = uRoleUpper.indexOf('BU') !== -1 || uRoleUpper.indexOf('HEAD') !== -1;
          var isManager = uRoleUpper.indexOf('MANAGER') !== -1;

          if (isBuHead) {
            var matchedBu = allBus.find(b => String(b.BU_ID) === rawScope || String(b.BU) === rawScope);
            var targetBuId = matchedBu ? String(matchedBu.BU_ID) : rawScope;
            var buTeams = allTeams.filter(t => String(t.BU_ID) === targetBuId || String(t.BU) === rawScope);
            buTeams.forEach(bt => {
              if (targetTeams.indexOf(String(bt.Team_ID)) === -1) targetTeams.push(String(bt.Team_ID));
            });
          } else if (isManager) {
            var mTeams = allTeams.filter(t => String(t.Team_ID) === rawScope || String(t.Team) === rawScope || String(t.Team_Name) === rawScope);
            mTeams.forEach(mt => {
              if (targetTeams.indexOf(String(mt.Team_ID)) === -1) targetTeams.push(String(mt.Team_ID));
            });
            if (targetTeams.length === 0 && rawScope) targetTeams.push(rawScope);
          } else {
            let myTeam = String(crmUser.Team_ID || crmUser.team_id || crmUser.Team || '').trim();
            if (!myTeam) {
              let myTerr = String(crmUser.Territory_ID || crmUser.territory_id || crmUser.Territory || '').trim();
              let matchedMyTer = allTerritories.find(t => String(t.Territory_ID) === myTerr || String(t.Territory) === myTerr);
              if (matchedMyTer) myTeam = String(matchedMyTer.Team_ID || matchedMyTer.Team || '').trim();
            }
            if (myTeam) targetTeams.push(myTeam);
          }
        }

        let allowedProdIds = [];
        teamProdLinksList.forEach(link => {
          let tId = String(link.Team_ID || link.Team);
          if (targetTeams.indexOf(tId) !== -1 || targetTeams.indexOf(String(link.Team_Name)) !== -1) {
            let pId = String(link.Product_ID || link.Product);
            if (allowedProdIds.indexOf(pId) === -1) {
              allowedProdIds.push(pId);
            }
          }
        });

        if (targetTeams.length > 0 && allowedProdIds.length > 0) {
          filteredProds = allProductsList.filter(p => allowedProdIds.indexOf(String(p.Product_ID || p.id)) !== -1 || allowedProdIds.indexOf(String(p.Product)) !== -1);
        } else {
          filteredProds = allProductsList;
        }
      }
      window.globalTeamProducts = filteredProds;

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

      const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
      const selectTitleText = (appLang === 'en') ? '- Select Title -' : '- เลือกคำนำหน้า -';
      const phSpec = (appLang === 'en') ? '- All Specialties -' : '- ความเชี่ยวชาญทั้งหมด -';
      const phType = (appLang === 'en') ? '- All Types -' : '- ประเภททั้งหมด -';

      const getOptionsHtml = (typeName, defaultText) => {
        const typeObj = (window.DocManagerCache.indexTypes || []).find(t => {
          const name = (t.Name || '').toLowerCase().trim();
          const target = typeName.toLowerCase().trim();
          if (target === 'type' || target === 'doctortype') {
            return name === 'type' || name === 'doctortype' || name === 'doctor type' || name === 'doctor_type';
          }
          return name === target;
        });

        let html = defaultText ? `<option value="">${defaultText}</option>` : ''; 
        if (typeObj) {
          const items = (window.DocManagerCache.indexes || []).filter(i => String(i.IndexType_ID) === String(typeObj.IndexType_ID));
          items.forEach(i => {
            const valStr = i.Value || i.value || '';
            if (valStr) html += `<option value="${valStr}">${valStr}</option>`;
          });
        }
        return html;
      };

      window.updateTomSelect('docTitle', getOptionsHtml('Title', selectTitleText), selectTitleText);
      window.updateTomSelect('editDocTitle', getOptionsHtml('Title', selectTitleText), selectTitleText);

      window.updateTomSelect('docSpecialty', getOptionsHtml('Specialty', phSpec), phSpec);
      window.updateTomSelect('editDocSpecialty', getOptionsHtml('Specialty', phSpec), phSpec);

      window.updateTomSelect('docType', getOptionsHtml('DoctorType', phType), phType);
      window.updateTomSelect('editDocType', getOptionsHtml('DoctorType', phType), phType);

      window.renderFilterDropdowns(validDocsData);
    }
  } catch (err) {
    console.warn("Dropdown load warning:", err.message);
  }
};

window.getIndexValues = function(typeName) {
  const typeObj = (window.DocManagerCache.indexTypes || []).find(t => {
    const name = (t.Name || '').toLowerCase().trim();
    const target = typeName.toLowerCase().trim();
    if (target === 'type' || target === 'doctortype') {
      return name === 'type' || name === 'doctortype' || name === 'doctor type' || name === 'doctor_type';
    }
    return name === target;
  });

  if (!typeObj) return [];
  
  let items = (window.DocManagerCache.indexes || []).filter(i => String(i.IndexType_ID) === String(typeObj.IndexType_ID));

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
// 💾 HELPER: SAVE & RESTORE FILTER STATE
// ==========================================
window.saveDocFilterState = function() {
  window.DocManagerCache = window.DocManagerCache || {};
  const specEl = document.getElementById('filterDocSpecialty');
  const typeEl = document.getElementById('filterDocType');
  
  window.DocManagerCache.savedFilters = {
    search: document.getElementById('smartDocSearchInput') ? document.getElementById('smartDocSearchInput').value : '',
    specialties: specEl && specEl.tomselect ? specEl.tomselect.getValue() : [],
    types: typeEl && typeEl.tomselect ? typeEl.tomselect.getValue() : [],
    page: window.currentPage || 1
  };
};

window.restoreDocFilterState = function() {
  if (!window.DocManagerCache || !window.DocManagerCache.savedFilters) return;
  const sf = window.DocManagerCache.savedFilters;

  if (sf.search && document.getElementById('smartDocSearchInput')) {
    document.getElementById('smartDocSearchInput').value = sf.search;
  }
  
  const specEl = document.getElementById('filterDocSpecialty');
  if (sf.specialties && sf.specialties.length > 0 && specEl && specEl.tomselect) {
    specEl.tomselect.setValue(sf.specialties, true);
  }

  const typeEl = document.getElementById('filterDocType');
  if (sf.types && sf.types.length > 0 && typeEl && typeEl.tomselect) {
    typeEl.tomselect.setValue(sf.types, true);
  }

  if (sf.page) window.currentPage = sf.page;
};

// ==========================================
// 📊 5. SERVER-SIDE PAGINATION (WITH BACKGROUND FETCH OPTION)
// ==========================================

window.loadDoctors = async function(forceReload = false, isBackground = false) {
  const docViewEl = document.getElementById('doctorListView');
  const hasData = (window.globalDoctors && window.globalDoctors.length > 0);

  // 🌟 [FIX]: สั่งเปิด Single-State Overlay Loading เฉพาะตอน !isBackground เท่านั้น (เหมือนหน้า Visit)
  if (!isBackground && (forceReload || !window.DocManagerCache.isLoaded || !hasData)) {
    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    const lTitle = document.getElementById('docLoadingTitleText');
    const lDesc = document.getElementById('docLoadingDescText');
    
    if (lTitle) lTitle.textContent = appLang === 'en' ? 'Loading Doctors...' : 'กำลังเตรียมข้อมูล...';
    if (lDesc) lDesc.textContent = appLang === 'en' ? 'Retrieving doctors database and workplaces.' : 'ระบบกำลังประมวลผลข้อมูลตามสิทธิ์การเข้าถึงของคุณ';
    
    if (docViewEl) docViewEl.classList.add('is-loading');
  }

  if (!forceReload && window.DocManagerCache.isLoaded && hasData) {
    window.restoreDocFilterState();
    window.renderDoctorTableServerSide();
    if (docViewEl) docViewEl.classList.remove('is-loading');
    return;
  }

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

    window.saveDocFilterState();

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
    window.DocManagerCache.isLoaded = true;

    window.renderDoctorTableServerSide();

  } catch (err) {
    console.error("Load Doctors Error:", err);
    const tbody = document.getElementById('doctorTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">❌ Load Failed: ${err.message}</td></tr>`;
  } finally {
    if (docViewEl) docViewEl.classList.remove('is-loading');
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

    const docIdKey = String(d.Doc_ID || d.id || '').trim();
    const pendingDcr = window.DocManagerCache.pendingDcrMap ? window.DocManagerCache.pendingDcrMap[docIdKey] : null;

    let pendingBadgeHtml = '';
    if (pendingDcr) {
      const actName = pendingDcr.Action || 'Edit Doctor';
      const whenStr = pendingDcr.Whenupdated ? new Date(pendingDcr.Whenupdated).toLocaleDateString(appLang === 'en' ? 'en-US' : 'th-TH') : '';
      const whoStr = pendingDcr.Whoupdated || '';
      
      const tooltipText = appLang === 'en'
        ? `Pending Approval: ${actName}${whoStr ? ` by ${whoStr}` : ''}${whenStr ? ` (${whenStr})` : ''}`
        : `รออนุมัติ DCR: ${actName}${whoStr ? ` โดย ${whoStr}` : ''}${whenStr ? ` (${whenStr})` : ''}`;

      const badgeText = appLang === 'en' ? '⏳ DCR Pending' : '⏳ รออนุมัติ DCR';

      pendingBadgeHtml = `<span class="badge badge-soft-warning ms-1" title="${tooltipText}" style="cursor: help;">${badgeText}</span>`;
    }
    
    const docNameEnShow = d.Doc_Name || d.doc_name || '-';
    const docNameThShow = (d.Doc_Name_TH && d.Doc_Name_TH.indexOf('???') === -1) ? d.Doc_Name_TH : '-';
    
    const actionButton = `<button class="btn btn-sm btn-premium-secondary fw-bold" onclick="window.openEditDoctorView('${d.Doc_ID}')"><i class="fa-solid fa-pen me-1"></i> ${editBtnText}</button>`;
    
    const hospObj = (window.DocManagerCache.hospitals || []).find(h => String(h.Hospital_ID).toLowerCase() === String(d.Hospital_ID).toLowerCase());
    const hospNameShow = window.getHospitalNameByLang(hospObj);

    const nameCellLink = `<a href="#" class="table-visit-link" onclick="window.openViewDoctorProfile('${d.Doc_ID}'); return false;"><i class="fa-solid fa-user-doctor me-2 text-primary"></i>${docNameEnShow}</a>`;

    htmlBuffer += `
      <tr>
        <td class="text-start ps-3">${nameCellLink}</td>
        <td class="fw-medium text-secondary">${docNameThShow}</td>
        <td><span class="badge badge-soft-product">${d.Specialty || '-'}</span></td>
        <td class="text-secondary"><small><i class="fa-regular fa-hospital me-1 text-primary"></i>${hospNameShow}</small></td>
        <td class="text-center">
          <span class="badge ${badge}">${statusTextShow}</span>
          ${pendingBadgeHtml}
        </td>
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

// 🌟 [FIX]: ฟังก์ชันกรองข้อมูล เรียก loadDoctors แบบ Background เพื่อไม่ให้กระตุกวูบวาบ
window.filterDoctors = function() {
  if (window.isDocInitialLoading) return;
  window.currentPage = 1;
  window.loadDoctors(true, true); 
};

window.debouncedFilterDoctors = function() {
  if (window.isDocInitialLoading) return;
  if (window.docFilterDebounceTimer) clearTimeout(window.docFilterDebounceTimer);
  window.docFilterDebounceTimer = setTimeout(function() { 
    window.filterDoctors(); 
  }, 400); // หน่วงเวลา 400ms กำลังสมูทพอดีแบบเดียวกับหน้า Visit
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
  await window.loadDoctors(true, false);
};

window.switchDoctorProfileTab = function(btnOrTarget, targetPaneId) {
  let cleanPaneId = 'tab-doc-info';
  let targetBtn = null;

  if (btnOrTarget && btnOrTarget.nodeType) {
    targetBtn = btnOrTarget;
    if (targetPaneId) cleanPaneId = String(targetPaneId).replace('#', '');
  } else if (typeof btnOrTarget === 'string' && btnOrTarget.trim() !== '') {
    cleanPaneId = btnOrTarget.replace('#', '');
  }

  document.querySelectorAll('#docProfileTabs .nav-link').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#doctorProfileView .tab-pane').forEach(p => {
    p.classList.remove('active', 'show');
  });

  if (!targetBtn) {
    targetBtn = document.querySelector(`#docProfileTabs .nav-link[onclick*="${cleanPaneId}"]`) ||
                document.querySelector(`#docProfileTabs .nav-link[data-bs-target="#${cleanPaneId}"]`);
  }
  if (targetBtn) targetBtn.classList.add('active');

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
  
  const setTsVal = (elId, val) => { 
    const el = document.getElementById(elId); 
    if (el && el.tomselect) {
      if (val && !el.tomselect.options[val]) {
        el.tomselect.addOption({ value: val, text: val });
      }
      el.tomselect.setValue(val, true);
    } else if (el) {
      el.value = val || ''; 
    }
  };

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

window.openViewDoctorProfile = async function(id, targetTab = 'tab-doc-info') {
  window.currentTargetDocId = id; 
  const d = (window.globalDoctors || []).find(x => x.Doc_ID === id || x.id === id); 
  if(!d) return;

  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  const primaryBadgeText = appLang === 'en' ? 'Primary' : 'หลัก';
  const allProdsText = (typeof t === 'function') ? t('opt_all_products') : (appLang === 'en' ? '- All Products -' : '- ผลิตภัณฑ์ทั้งหมด -');

  const titleEl = document.getElementById('viewDocTitleName');
  if (titleEl) {
    titleEl.innerText = `👨‍⚕️ ${d.Title || d.title || ''} ${d.Doc_Name || d.nameEn || ''} ${d.Doc_Name_TH ? `(${d.Doc_Name_TH})` : ''}`;
  }

  if (document.getElementById('viewDocSpecialty')) document.getElementById('viewDocSpecialty').value = d.Specialty || d.specialty || '-';
  if (document.getElementById('viewDocType')) document.getElementById('viewDocType').value = d.Type || d.type || '-';
  if (document.getElementById('viewDocStatus')) document.getElementById('viewDocStatus').value = d.Status || d.status || 'Active';
  if (document.getElementById('viewDocEmail')) document.getElementById('viewDocEmail').value = d.Email || d.email || '-';
  if (document.getElementById('viewDocMobile')) document.getElementById('viewDocMobile').value = d.Mobile || d.mobile || '-';

  let wpHTML = '';
  let parsedWp = [];
  try { if (d.Workplaces_JSON || d.workplacesJson) parsedWp = JSON.parse(d.Workplaces_JSON || d.workplacesJson); } catch(e) {}
  
  if(parsedWp.length > 0) {
    parsedWp.forEach(wp => {
      const isPrimary = wp.isPrimary ? `<span class="badge bg-success-subtle text-success fw-bold ms-2 px-2.5 py-1" style="border: 1px solid #a3cfbb;">${primaryBadgeText}</span>` : '';
      const hospObj = (window.DocManagerCache.hospitals || []).find(h => String(h.Hospital_ID).toLowerCase() === String(wp.hospitalId).toLowerCase());
      const hospName = window.getHospitalNameByLang(hospObj);
      wpHTML += `<div class="py-2 px-3 bg-white border rounded-3 mb-2 d-flex align-items-center">🏥 <span class="fw-bold text-dark ms-1">${hospName}</span> ${isPrimary}</div>`;
    });
  } else {
    const hospObj = (window.DocManagerCache.hospitals || []).find(h => String(h.Hospital_ID).toLowerCase() === String(d.Hospital_ID || d.hospitalId).toLowerCase());
    const hospName = window.getHospitalNameByLang(hospObj);
    wpHTML = `<div class="py-2 px-3 bg-white border rounded-3 mb-2 d-flex align-items-center">🏥 <span class="fw-bold text-dark ms-1">${hospName}</span> <span class="badge bg-success-subtle text-success fw-bold ms-2 px-2.5 py-1" style="border: 1px solid #a3cfbb;">${primaryBadgeText}</span></div>`;
  }

  if (document.getElementById('viewWorkplaceContainer')) {
    document.getElementById('viewWorkplaceContainer').innerHTML = wpHTML;
  }

  let phtml = `<option value="">${allProdsText}</option>`;
  const availableProducts = (window.globalTeamProducts && window.globalTeamProducts.length > 0) ? window.globalTeamProducts : (window.globalProducts || []);
  availableProducts.forEach(p => phtml += `<option value="${p.Product_ID}">${p.Product}</option>`);

  if (document.getElementById('filterProfileVisitProduct')) {
    document.getElementById('filterProfileVisitProduct').innerHTML = phtml;
  }

  const addProdBtn = document.getElementById('btnAddRatingProduct');
  const lockBanner = document.getElementById('ratingLockBanner');
  
  var uRole = (window.globalCurrentUserRole || '').toUpperCase();
  var isPowerUser = ['ADMIN', 'EXECUTIVE', 'SYSTEM ADMIN'].indexOf(uRole) !== -1;

  if (window.globalRatingIsLocked && !isPowerUser) {
    if (addProdBtn) addProdBtn.style.display = 'none';
    if (lockBanner) lockBanner.style.display = 'block';
  } else {
    if (addProdBtn) addProdBtn.style.display = 'inline-block';
    if (lockBanner) lockBanner.style.display = 'none';
  }

  window.loadDoctorVisitHistory(id);
  window.loadDoctorRatings(id);

  window.switchDoctorView('doctorProfileView');
  
  if (typeof window.switchDoctorProfileTab === 'function') {
    window.switchDoctorProfileTab(targetTab);
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

  let crmUser = null;
  try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}
  
  const myRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || crmUser.User_ID || '').trim() : '';
  const myRole = crmUser ? String(crmUser.Role || crmUser.role || '').toUpperCase().trim() : '';
  const rawScope = crmUser ? String(crmUser.BU_ID || crmUser.Business_Unit_ID || crmUser.Team_ID || crmUser.team_id || crmUser.Team || crmUser.Territory_ID || crmUser.territory_id || crmUser.Territory || '').toUpperCase().trim() : '';

  const adminRoles = ['ADMIN', 'EXECUTIVE', 'SYSTEM ADMIN', 'STAFF', 'DIRECTOR', 'PRODUCT MANAGER'];
  const isGlobalAdmin = window.myIsGlobalViewer === true || adminRoles.includes(myRole) || rawScope === 'ALL';
  const isSales = myRole === 'SALES' || myRole === 'REP' || myRole === 'SALES REP';
  const allowedReps = window.myAllowedRepIds || [];

  let filtered = (window.globalCurrentDoctorVisits || []).filter(v => {
    const vRepId = String(v.Rep_ID || v.rep_id || '').trim();
    let hasAccess = false;

    if (isGlobalAdmin) {
      hasAccess = true;
    } else if (isSales) {
      hasAccess = (vRepId === myRepId);
    } else {
      hasAccess = allowedReps.includes(vRepId) || (vRepId === myRepId);
    }

    if (!hasAccess) return false;

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
      valB = (a.Whoupdated || '').toLowerCase();
    } else if (sortCol === 'territory') {
      valA = (a.Territory_ID || '').toLowerCase();
      valB = (a.Territory_ID || '').toLowerCase();
    } else if (sortCol === 'status') {
      valA = (a.Status || '').toLowerCase();
      valB = (a.Status || '').toLowerCase();
    } else {
      valA = (a.Purpose_ID || a.Purpose || a.Objective || '').toLowerCase();
      valB = (b.Purpose_ID || b.Purpose || b.Objective || '').toLowerCase();
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

  const usersList = window.globalUsersList || window.globalUsers || (window.VisitManagerCache && window.VisitManagerCache.users) || (window.DocManagerCache && window.DocManagerCache.users) || [];
  const terList = window.globalTerritoryList || window.globalTerritories || (window.VisitManagerCache && window.VisitManagerCache.territories) || (window.DocManagerCache && window.DocManagerCache.territories) || [];
  const teamList = window.globalTeamList || window.globalTeams || (window.VisitManagerCache && window.VisitManagerCache.teams) || (window.DocManagerCache && window.DocManagerCache.teams) || [];
  const buList = (window.VisitManagerCache && window.VisitManagerCache.bus) || window.globalBUs || (window.DocManagerCache && window.DocManagerCache.bus) || [];
  
  let htmlBuffer = '';
  pageData.forEach(v => {
    const dateStr = v.Visit_Date ? new Date(v.Visit_Date).toLocaleDateString(appLang === 'en' ? 'en-US' : 'th-TH') : '-';

    const rawWho = v.Rep_ID || v.Whoupdated || v.whoupdated || '';
    let repNameShow = rawWho || '-';
    if (rawWho) {
      const uSearch = String(rawWho).toLowerCase().trim();
      const userObj = usersList.find(u => {
        const uRepId = String(u.Rep_ID || u.User_ID || u.id || '').toLowerCase().trim();
        const uEmail = String(u.Email || u.email || '').toLowerCase().trim();
        return uRepId === uSearch || uEmail === uSearch;
      });
      if (userObj) {
        repNameShow = userObj.Rep_Name || userObj.Name || userObj.name || userObj.Email || rawWho;
      }
    }

    const rawTerrId = v.Territory_ID || v.territory_id || v.Territory || '';
    let terrNameShow = '-';

    if (rawTerrId) {
      const targetId = String(rawTerrId).trim();
      const terObj = terList.find(t => String(t.Territory_ID || t.id) === targetId || String(t.Territory) === targetId);
      
      if (terObj) {
        terrNameShow = terObj.Territory || terObj.Territory_Name || targetId;
      } else {
        const tmObj = teamList.find(t => String(t.Team_ID || t.id) === targetId || String(t.Team) === targetId);
        if (tmObj) {
          terrNameShow = tmObj.Team || tmObj.Team_Name || targetId;
        } else {
          const buObj = buList.find(b => String(b.BU_ID || b.bu_id || b.id) === targetId || String(b.BU) === targetId);
          if (buObj) {
            terrNameShow = buObj.BU || buObj.BU_Name || buObj.Name_EN || targetId;
          } else if (!targetId.includes('-')) {
            terrNameShow = targetId;
          }
        }
      }
    }

    const terrBadgeHtml = (terrNameShow !== '-') 
      ? `<span class="badge bg-primary-subtle text-primary fw-bold" style="border: 1px solid #b6d4fe;">${terrNameShow}</span>` 
      : '-';

    let purposeShow = '-';
    if (typeof window.getPurposeText === 'function') {
      purposeShow = window.getPurposeText(v.Purpose_ID, v.Purpose || v.Objective);
    } else {
      purposeShow = v.Purpose || v.Objective || v.Purpose_ID || '-';
    }

    const rawStatus = String(v.Status || 'Pending').trim();
    let statusBadgeClass = 'badge-soft-pending';
    let statusShow = appLang === 'en' ? '⏳ Pending' : '⏳ รอส่ง';

    if (rawStatus === 'Submitted') {
      statusBadgeClass = 'badge-soft-success';
      statusShow = appLang === 'en' ? '✅ Submitted' : '✅ ส่งแล้ว';
    } else if (rawStatus === 'Draft') {
      statusBadgeClass = 'badge-soft-secondary';
      statusShow = appLang === 'en' ? '📝 Draft' : '📝 ฉบับร่าง';
    }

    const matchedVps = (window.globalCurrentDoctorVisitProducts || []).filter(vp => String(vp.Visit_ID) === String(v.Visit_ID));
    let prodBadges = '-';
    if (matchedVps.length > 0) {
      prodBadges = matchedVps.map(vp => {
        const pObj = (window.globalTeamProducts || window.globalProducts || window.globalProductsList || []).find(p => String(p.Product_ID) === String(vp.Product_ID));
        const pName = pObj ? pObj.Product : vp.Product_ID;
        return `<span class="badge badge-soft-product me-1 mb-1">${pName}</span>`;
      }).join('');
    }

    const currentDocId = window.currentTargetDocId || v.Doc_ID || '';
    const rawPurposeId = v.Purpose_ID || v.Purpose || v.Objective || '';

    htmlBuffer += `
      <tr class="align-middle">
        <td class="text-center fw-bold">
          <a href="#" class="text-primary text-decoration-underline" onclick="window.openEditVisitFromDoctorProfile('${v.Visit_ID}', '${currentDocId}', '${rawPurposeId}'); return false;">
            ${dateStr}
          </a>
        </td>
        <td class="fw-bold text-dark">${repNameShow}</td>
        <td class="text-center">${terrBadgeHtml}</td>
        <td>${prodBadges}</td>
        <td><small class="text-secondary fw-medium">${purposeShow}</small></td>
        <td class="text-center"><span class="badge ${statusBadgeClass}">${statusShow}</span></td>
      </tr>`;
  });

  tbody.innerHTML = htmlBuffer;

  if (typeof window.renderDoctorPaginationControls === 'function') {
    window.renderDoctorPaginationControls(totalPages);
  }
};

window.openEditVisitFromDoctorProfile = function(visitId, overrideDocId, overridePurposeId) {
  const docId = overrideDocId || window.currentTargetDocId;
  if (!docId || !visitId) return;

  sessionStorage.setItem('returnToDocId', docId);
  sessionStorage.setItem('pendingEditVisitId', visitId);
  if (overridePurposeId) sessionStorage.setItem('pendingEditPurposeId', overridePurposeId);

  if (typeof window.loadComponent === 'function') {
    window.loadComponent('visit');
  }

  var runOpen = function() {
    if (typeof window.openEditVisitView === 'function') {
      window.openEditVisitView(visitId, docId, overridePurposeId);
    } else {
      setTimeout(runOpen, 30);
    }
  };
  runOpen();
};

window.clearRatingTable = function() {
  const tbody = document.getElementById('ratingTableBody');
  if (!tbody) return;
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

window.getSelectedRatingProductIds = function(excludeSelectId = null) {
  const tbody = document.getElementById('ratingTableBody');
  if (!tbody) return [];
  
  const productSelects = tbody.querySelectorAll('.rating-product');
  const selectedIds = [];
  
  productSelects.forEach(select => {
    if (excludeSelectId && select.id === excludeSelectId) return;
    const val = select.value;
    if (val && val.trim() !== '') {
      selectedIds.push(val.trim());
    }
  });
  
  return selectedIds;
};

// 🌟 AUTO CALCULATION LOGIC FOR RATING & TARGETING
window.triggerCalcTarget = function(element) {
  const tr = element.closest('tr');
  if (!tr) return;

  const prodSelect = tr.querySelector('.rating-product');
  const adoptSelect = tr.querySelector('.rating-adopt');
  const potSelect = tr.querySelector('.rating-pot');

  const prodId = prodSelect ? prodSelect.value : '';
  const adopt = adoptSelect ? adoptSelect.value : '';
  const pot = potSelect ? potSelect.value : '';
  
  const classInput = tr.querySelector('.rating-class');
  const targetInput = tr.querySelector('.rating-target');
  
  let calcClass = "";

  if (adopt && pot) {
      const matrixData = window.globalMatrixData || (window.DocManagerCache ? window.DocManagerCache.matrixData : []) || [];
      const matrixRow = matrixData.find(m => String(m.Adoption || m.adoption).trim().toLowerCase() === String(adopt).trim().toLowerCase() && 
                                              String(m.Potential || m.potential).trim().toLowerCase() === String(pot).trim().toLowerCase());
      if (matrixRow) {
          calcClass = matrixRow.Classification || matrixRow.classification || "";
      }
  }
  if (classInput) classInput.value = calcClass;

  if (prodId && calcClass) {
      const targetData = window.globalTargetData || (window.DocManagerCache ? window.DocManagerCache.targetData : []) || [];
      const targetRow = targetData.find(t => 
          String(t.Product_ID || t.product_id).trim() === String(prodId).trim() && 
          String(t.Classification || t.classification).trim().toLowerCase() === String(calcClass).trim().toLowerCase()
      );
      if (targetInput) targetInput.value = targetRow ? (targetRow.Target !== undefined ? targetRow.Target : (targetRow.target !== undefined ? targetRow.target : "")) : "";
  } else {
      if (targetInput) targetInput.value = "";
  }
};

window.addNewRatingRow = function() {
  const tbody = document.getElementById('ratingTableBody');
  if (!tbody) return;
  
  const availableProducts = (window.globalTeamProducts && window.globalTeamProducts.length > 0) ? window.globalTeamProducts : (window.globalProducts || []);
  const usedIds = window.getSelectedRatingProductIds();
  const remainingProducts = availableProducts.filter(p => !usedIds.includes(String(p.Product_ID)));

  if (availableProducts.length > 0 && remainingProducts.length === 0) {
    const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    const msgAllSelected = appLang === 'en' 
      ? 'All available products have already been added to Target Call.' 
      : 'เลือกผลิตภัณฑ์ที่มีสิทธิ์ทั้งหมดครบเรียบร้อยแล้ว';
    if (window.showToast) window.showToast(msgAllSelected, "warning");
    else alert(msgAllSelected);
    return;
  }

  const noData = tbody.querySelector('.no-data');
  if(noData) {
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

  var uRole = (window.globalCurrentUserRole || '').toUpperCase();
  var isPowerUser = ['ADMIN', 'EXECUTIVE', 'SYSTEM ADMIN'].indexOf(uRole) !== -1;
  const canEdit = isPowerUser || !window.globalRatingIsLocked;
  const disabledAttr = canEdit ? '' : 'disabled';

  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';

  const availableProducts = (window.globalTeamProducts && window.globalTeamProducts.length > 0) ? window.globalTeamProducts : (window.globalProducts || []);
  const usedProductIds = window.getSelectedRatingProductIds(selectId);
  
  const selectProdText = appLang === 'en' ? '- Select Product -' : '- เลือกผลิตภัณฑ์ -';
  const selectOptText = appLang === 'en' ? '- Select -' : '- เลือก -';

  let prodOpts = `<option value="">${selectProdText}</option>`;
  availableProducts.forEach(p => {
      const isCurrentSelected = String(p.Product_ID) === String(prodId);
      const isAlreadyUsed = usedProductIds.includes(String(p.Product_ID));
      
      if (isCurrentSelected || !isAlreadyUsed) {
        const sel = isCurrentSelected ? 'selected' : '';
        prodOpts += `<option value="${p.Product_ID}" ${sel}>${p.Product}</option>`; 
      }
  });

  let adoptOpts = `<option value="">${selectOptText}</option>`;
  window.getIndexValues('Adoption').forEach(a => {
      const sel = a === adopt ? 'selected' : '';
      adoptOpts += `<option value="${a}" ${sel}>${a}</option>`;
  });

  let potOpts = `<option value="">${selectOptText}</option>`;
  window.getIndexValues('Potential').forEach(p => {
      const sel = p === pot ? 'selected' : '';
      potOpts += `<option value="${p}" ${sel}>${p}</option>`;
  });

  const saveBtnText = appLang === 'en' ? 'Save' : 'บันทึก';
  const lockedText = appLang === 'en' ? 'Locked' : 'ถูกล็อก';

  let actionHtml = '';
  if (canEdit) {
      actionHtml = `<button class="btn btn-sm btn-premium-primary fw-bold px-3" onclick="window.saveTargetCallRow(this)"><i class="fa-solid fa-floppy-disk me-1"></i> ${saveBtnText}</button>`;
  } else {
      actionHtml = `<span class="badge badge-soft-secondary"><i class="fa-solid fa-lock me-1"></i> ${lockedText}</span>`;
  }

  tr.innerHTML = `
      <td>
          <select class="form-select form-select-sm rating-product border-primary shadow-none" id="${selectId}" ${disabledAttr} style="min-height: 38px; border-radius: 8px;">
              ${prodOpts}
          </select>
      </td>
      <td>
          <select class="form-select form-select-sm rating-adopt border-secondary shadow-none" id="${adoptId}" ${disabledAttr} onchange="window.triggerCalcTarget(this)" style="min-height: 38px; border-radius: 8px;">
              ${adoptOpts}
          </select>
      </td>
      <td>
          <select class="form-select form-select-sm rating-pot border-secondary shadow-none" id="${potId}" ${disabledAttr} onchange="window.triggerCalcTarget(this)" style="min-height: 38px; border-radius: 8px;">
              ${potOpts}
          </select>
      </td>
      <td>
          <input type="text" class="form-control form-control-sm text-center rating-class fw-bold text-primary shadow-none" value="${cls}" readonly style="background-color:#e9ecef; min-height: 38px; border-radius: 8px;">
      </td>
      <td>
          <input type="number" class="form-control form-control-sm text-center rating-target fw-bold text-success shadow-none" value="${tgt}" readonly style="background-color:#e9ecef; min-height: 38px; border-radius: 8px;">
      </td>
      <td class="text-center">
          ${actionHtml}
      </td>
  `;
  tbody.appendChild(tr);

  if (!disabledAttr && typeof TomSelect !== 'undefined') {
      const tsProd = new TomSelect(`#${selectId}`, { 
        create: false, 
        placeholder: selectProdText, 
        allowEmptyOption: true, 
        dropdownParent: 'body' 
      });

      tsProd.on('change', function() { 
        window.triggerCalcTarget(document.getElementById(selectId)); 
      });
  }
};

window.saveTargetCallRow = async function(btn) {
  const tr = btn.closest('tr');
  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  
  const selectEl = tr.querySelector('.rating-product');
  const selectedProductId = selectEl ? selectEl.value : '';
  const adoptVal = tr.querySelector('.rating-adopt').value;
  const potVal = tr.querySelector('.rating-pot').value;
  const classificationValue = tr.querySelector('.rating-class').value;
  const targetValue = tr.querySelector('.rating-target').value;

  if(!selectedProductId || !adoptVal || !potVal) {
      const errMsg = appLang === 'en' ? "❌ Missing fields: Product, Adoption or Potential." : "❌ กรุณากรอกข้อมูลให้ครบถ้วน: ผลิตภัณฑ์, Adoption หรือ Potential";
      alert(errMsg);
      return;
  }

  const usedProductIds = window.getSelectedRatingProductIds(selectEl ? selectEl.id : null);
  if (usedProductIds.includes(String(selectedProductId))) {
      const pObj = (window.globalTeamProducts || window.globalProducts || []).find(p => String(p.Product_ID) === String(selectedProductId));
      const productName = pObj ? pObj.Product : selectedProductId;
      
      const duplicateMsg = appLang === 'en'
        ? `❌ Duplicate Product! "${productName}" is already added in another row.`
        : `❌ ผลิตภัณฑ์ซ้ำ! "${productName}" มีการประเมินอยู่แล้วในแถวอื่น กรุณาเลือกผลิตภัณฑ์ใหม่`;
      
      if (window.showToast) window.showToast(duplicateMsg, "error");
      else alert(duplicateMsg);
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

// ==========================================
// 🚀 QUICK ADD CALL FROM DOCTOR PROFILE
// ==========================================
window.goToQuickAddCall = function() {
  const docId = window.currentTargetDocId;
  if (!docId) return;

  sessionStorage.setItem('returnToDocId', docId);

  if (typeof window.loadComponent === 'function') {
    window.loadComponent('visit');
  }

  let attempts = 0;
  const checkReady = setInterval(function() {
    attempts++;
    if (typeof window.openAddVisitView === 'function') {
      clearInterval(checkReady);
      window.openAddVisitView();
    } else if (attempts > 50) {
      clearInterval(checkReady);
    }
  }, 100);
};

// ==========================================
// 🚀 INITIALIZATION ENGINE & LISTENERS
// ==========================================
window.initDoctorPage = async function(forceReload = false) {
  if (window._isDocInitRunning) return;

  const docViewEl = document.getElementById('doctorListView');
  const hasCache = (window.DocManagerCache && window.DocManagerCache.isLoaded && window.globalDoctors && window.globalDoctors.length > 0);
  const shouldFetchDB = forceReload === true ? true : !hasCache;

  window._isDocInitRunning = true;
  window.isDocInitialLoading = true;

  if (shouldFetchDB && docViewEl) {
      var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
      const lTitle = document.getElementById('docLoadingTitleText');
      const lDesc = document.getElementById('docLoadingDescText');
      
      if (lTitle) lTitle.textContent = appLang === 'en' ? 'Loading Doctors...' : 'กำลังเตรียมข้อมูล...';
      if (lDesc) lDesc.textContent = appLang === 'en' ? 'Retrieving doctors database and workplaces.' : 'ระบบกำลังประมวลผลข้อมูลตามสิทธิ์การเข้าถึงของคุณ';
      
      docViewEl.classList.add('is-loading');
  }

  try {
    await window.loadIndexDropdowns(shouldFetchDB); 
    await window.loadDoctors(shouldFetchDB, false); // 🌟 โหลดรอบแรก สั่งเปิดหน้าหมุน
  } catch (err) {
    console.error("Init Doctors Failed:", err);
  } finally {
    window.isDocInitialLoading = false;
    window._isDocInitRunning = false;
    if (docViewEl) docViewEl.classList.remove('is-loading');
  }
};

// ⚡ Listener สลับภาษา EN / TH
if (!window._isDocLangListenerAttached) {
  window.addEventListener('appLanguageChanged', function() {
    if (window.DocManagerCache && window.DocManagerCache.validDocsData) {
      window.renderFilterDropdowns(window.DocManagerCache.validDocsData);
    }

    if (typeof window.renderDoctorTableServerSide === 'function' && window.globalDoctors.length > 0) {
      window.renderDoctorTableServerSide();
    }
    
    const profileView = document.getElementById('doctorProfileView');
    if (profileView && !profileView.classList.contains('d-none') && window.currentTargetDocId) {
      window.openViewDoctorProfile(window.currentTargetDocId);
    }
  });
  window._isDocLangListenerAttached = true;
}

// ==========================================
// 🧹 UI HELPER: SMART SEARCH CLEAR BUTTON
// ==========================================
window.handleDocSearchInput = function(inputEl) {
    var clearBtn = document.getElementById('btnClearDocSearch');
    if (clearBtn) {
        if (inputEl.value.length > 0) {
            clearBtn.classList.remove('d-none');
        } else {
            clearBtn.classList.add('d-none');
        }
    }
    if (typeof window.debouncedFilterDoctors === 'function') {
        window.debouncedFilterDoctors();
    }
};

window.clearDocSearchInput = function() {
    var inputEl = document.getElementById('smartDocSearchInput');
    var clearBtn = document.getElementById('btnClearDocSearch');
    if (inputEl) {
        inputEl.value = '';
        if (clearBtn) clearBtn.classList.add('d-none');
        
        if (typeof window.filterDoctors === 'function') {
            window.filterDoctors();
        }
        inputEl.focus();
    }
};
