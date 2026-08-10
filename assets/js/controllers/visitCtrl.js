// ==========================================
// 1. GLOBAL STATE VARIABLES & CACHE
// ==========================================
window.globalVisits = []; 
window.totalVisitsCount = 0; 
window.globalFilteredVisits = [];
window.globalTotLogs = []; 
window.globalFilteredTotLogs = [];
window.globalVisitProducts = []; 
window.globalAllDoctors = []; 
window.globalAssignedDoctors = [];
window.globalAllHospitals = []; 
window.globalAssignedHospitals = [];
window.globalProductsList = [];
window.globalTerritoryList = []; 
window.globalUsersList = []; 
window.globalTeamList = [];
window.globalPendingUnlockVisits = []; 
window.globalCurrentUserRole = '';

window.myIsGlobalViewer = false; 
window.myIsBuHead = false; 
window.myIsManager = false; 
window.myIsSalesRole = true;
window.myAllowedTeamIds = [];
window.myAllowedTerIds = [];
window.myAllowedRepIds = [];
window.myAllowedEmails = [];

window.tomSelectDocInstance = null; 
window.tomSelectProdInstance = null; 
window.tomSelectPurposeInstance = null; 
window.tomSelectRepInstance = null; 
window.tomSelectTerInstance = null; 
window.tomSelectStatusInstance = null;
window.globalCalendarInstance = null; 
window.totModalInstance = null;

window.currentSortCol = 'date'; 
window.currentSortAsc = false; 
window.currentPage = 1; 
window.rowsPerPage = 20;

window.globalAllMediaList = []; 
window.currentActiveMedia = null; 
window.presentationStartTime = null;
window.presentationTimerInterval = null; 
window.pdfDocInstance = null; 
window.currentPdfPage = 1;
window.totalPdfPages = 1; 
window.currentPageStartTime = null; 
window.pageLogsBuffer = []; 
window.globalIsMediaPreviewMode = false;
window.pendingDetailingLogs = [];

window.filterDebounceTimer = null; 
window.docRecognition = null; 
window.textRecognition = null; 
window.searchRecognition = null;

// ==========================================
// 🚀 2. DICTIONARY INDEXING
// ==========================================
window._docIndex = {}; 
window._prodIndex = {}; 
window._visitProdIndex = {}; 
window._userIndex = {}; 
window._purposeIndex = {}; 

window.buildDataIndexes = function() {
  window._docIndex = {};
  (window.globalAllDoctors || []).forEach(function(d) {
    var id = String(d.Doc_ID || d.doc_id || d.id || '').trim().toLowerCase();
    if (id) window._docIndex[id] = d;
  });

  window._prodIndex = {};
  (window.globalProductsList || []).forEach(function(p) {
    var id = String(p.Product_ID || p.id || '').trim().toLowerCase();
    if (id) window._prodIndex[id] = p;
  });

  window._visitProdIndex = {};
  (window.globalVisitProducts || []).forEach(function(vp) {
    var vid = String(vp.Visit_ID || '').trim().toLowerCase();
    if (vid) {
      if (!window._visitProdIndex[vid]) window._visitProdIndex[vid] = [];
      window._visitProdIndex[vid].push(vp);
    }
  });

  window._userIndex = {};
  (window.globalUsersList || []).forEach(function(u) {
    var uid = String(u.Rep_ID || u.User_ID || u.id || '').trim().toLowerCase();
    if (uid) window._userIndex[uid] = u;
  });

  window._purposeIndex = {};
  if (window.VisitManagerCache && window.VisitManagerCache.indexes) {
    window.VisitManagerCache.indexes.forEach(function(i) {
      window._purposeIndex[String(i.Index_ID).toLowerCase()] = i;
    });
  }
};

// ==========================================
// 🛠️ 3. UTILITIES & FORMATTERS
// ==========================================
window.safeDestroyTs = function(instance) { 
  try { if (instance && typeof instance.destroy === 'function') instance.destroy(); } catch(e) {} 
};

window.getCurrentAppLang = function() {
  var btnEN = document.getElementById('btnLangEN');
  if (btnEN && btnEN.classList.contains('btn-primary')) return 'en';
  return 'th';
};

window.getPurposeText = function(purposeId, fallbackText) {
  if (!purposeId) return fallbackText || '-';
  var pObj = window._purposeIndex[String(purposeId).toLowerCase()];
  if (!pObj) return fallbackText || '-';
  var appLang = window.getCurrentAppLang();
  return (appLang === 'en') ? (pObj.Value1 || pObj.Value || '-') : (pObj.Value || pObj.Value1 || '-');
};

window.getDoctorNameByLang = function(docObj, defaultId) {
  if (!docObj) return defaultId || '-';
  var lang = window.getCurrentAppLang();
  if (lang === 'en') return docObj.Doc_Name || docObj.doc_name || defaultId || '-';
  var hasQuestionMarks = docObj.Doc_Name_TH && docObj.Doc_Name_TH.indexOf('???') !== -1;
  if (docObj.Doc_Name_TH && !hasQuestionMarks) return docObj.Doc_Name_TH;
  return docObj.Doc_Name || docObj.doc_name || defaultId || '-';
};

window.getHospitalNameFromDocOrVisit = function(docObj, visitObj) {
  var lang = window.getCurrentAppLang();
  var targetPrimaryHospId = null;
  if (docObj) {
    if (docObj.Workplaces_JSON || docObj.workplacesJson) {
      try {
        var workplaces = typeof docObj.Workplaces_JSON === 'string' ? JSON.parse(docObj.Workplaces_JSON) : (docObj.Workplaces_JSON || JSON.parse(docObj.workplacesJson || '[]'));
        if (Array.isArray(workplaces) && workplaces.length > 0) {
          var primaryItem = workplaces.find(function(w) { return w.isPrimary === true || w.isPrimary === 'true' || w.type === 'Primary' || w.Type === 'Primary'; });
          if (!primaryItem) primaryItem = workplaces[0];
          targetPrimaryHospId = primaryItem.hospitalId || primaryItem.Hospital_ID || primaryItem.hospital_id;
          if (lang === 'en') {
            var directEn = primaryItem.hospitalName || primaryItem.Hospital_Name || primaryItem.hospital;
            if (directEn && directEn !== '-') return directEn;
          } else {
            var directTh = primaryItem.hospitalKnownAs || primaryItem.hospitalNameTh || primaryItem.Known_As;
            if (directTh && directTh !== '-') return directTh;
          }
        }
      } catch (e) {}
    }
    if (!targetPrimaryHospId) targetPrimaryHospId = docObj.Hospital_ID || docObj.hospital_id || docObj.Hospital;
    if (targetPrimaryHospId) {
      var hospList = (window.globalAllHospitals && window.globalAllHospitals.length > 0) ? window.globalAllHospitals : (window.VisitManagerCache ? window.VisitManagerCache.allHospitals : []);
      var hospObj = hospList.find(function(h) { return String(h.Hospital_ID || h.id || h.Hospital).trim().toLowerCase() === String(targetPrimaryHospId).trim().toLowerCase(); });
      if (hospObj) {
        if (lang === 'en') return hospObj.Hospital || hospObj.Hospital_Name || hospObj.Known_As;
        else return hospObj.Known_As || hospObj.Hospital_TH || hospObj.Hospital;
      }
    }
  }
  if (visitObj) {
    var directHosp = visitObj.Hospital || visitObj.Hospital_Name || visitObj.hospital;
    if (directHosp && String(directHosp).trim() !== '' && directHosp !== '-') return directHosp;
  }
  return '-';
};

window.updateFormUserInfo = function(repObj, fallbackTerrId) {
  var appLang = window.getCurrentAppLang();
  var repNameShow = '-';
  var locNameShow = '-';
  var labelText = appLang === 'th' ? 'เขตพื้นที่' : 'Territory'; 

  if (repObj) {
      repNameShow = repObj.Rep_Name || repObj.Name || repObj.name || repObj.Email || '-';
      var role = String(repObj.Role || repObj.role || '').toLowerCase();
      var userTerr = String(repObj.Territory_ID || repObj.territory_id || repObj.Territory || '').trim();
      var userTeam = String(repObj.Team_ID || repObj.team_id || repObj.Team || '').trim();
      var userBU = String(repObj.BU_ID || repObj.bu_id || repObj.BU || '').trim();
      var genericScope = userBU || userTeam || userTerr;
      var scopeFromVisit = fallbackTerrId || genericScope;

      if (role.indexOf('manager') !== -1) {
          labelText = appLang === 'th' ? 'ทีมที่ดูแล (Team)' : 'Team';
          var targetTeam = userTeam || scopeFromVisit;
          var tObj = (window.globalTeamList || []).find(function(t) { return String(t.Team_ID) === targetTeam || String(t.Team) === targetTeam; });
          locNameShow = tObj ? (tObj.Team || tObj.Team_Name || targetTeam) : (targetTeam || '-');
      } else if (role.indexOf('bu') !== -1 || role.indexOf('head') !== -1 || role.indexOf('director') !== -1) {
          labelText = appLang === 'th' ? 'หน่วยธุรกิจ (BU)' : 'Business Unit';
          var bus = window.VisitManagerCache ? window.VisitManagerCache.bus : [];
          var targetBu = userBU || scopeFromVisit; 
          var bObj = (bus || []).find(function(b) { return String(b.BU_ID) === targetBu || String(b.BU) === targetBu || String(b.BU_Name) === targetBu; });
          locNameShow = bObj ? (bObj.BU || bObj.BU_Name || targetBu) : (targetBu || '-');
      } else {
          labelText = appLang === 'th' ? 'เขตพื้นที่' : 'Territory';
          var targetTer = userTerr || scopeFromVisit;
          var terObj = (window.globalTerritoryList || []).find(function(t) { return String(t.Territory_ID) === targetTer || String(t.Territory) === targetTer; });
          locNameShow = terObj ? (terObj.Territory || targetTer) : (targetTer || '-');
      }
  }

  var repNameEl = document.getElementById('dispSalesRepName');
  var terNameEl = document.getElementById('dispTerritoryName');
  var terLabelEl = document.getElementById('dynamicTerritoryLabel');

  if (repNameEl) repNameEl.innerText = repNameShow;
  if (terNameEl) terNameEl.innerText = locNameShow;
  if (terLabelEl) { terLabelEl.removeAttribute('data-i18n'); terLabelEl.innerText = labelText; }
};

window.initUserInfo = function() {
  try {
    var crmUser = JSON.parse(sessionStorage.getItem('crmUser'));
    if (typeof window.updateFormUserInfo === 'function') window.updateFormUserInfo(crmUser, null);
  } catch(e) {}
};

// ==========================================
// 📊 4. VIEW & UI SWITCHERS & STATS
// ==========================================
window.toggleMainView = function(viewName) {
  window.VisitManagerCache = window.VisitManagerCache || {};
  window.VisitManagerCache.currentMainView = viewName;
  var btnList = document.getElementById('btnToggleList');
  var btnCal = document.getElementById('btnToggleCal');
  var listZone = document.getElementById('visitListZone');
  var calZone = document.getElementById('visitCalendarZone');

  if (viewName === 'calendar') {
      if (btnList) btnList.className = 'btn btn-sm btn-light text-secondary premium-radius px-3 fw-bold border-0';
      if (btnCal) btnCal.className = 'btn btn-sm btn-premium-primary px-3 fw-bold';
      if (listZone) listZone.classList.add('d-none');
      if (calZone) calZone.classList.remove('d-none');
      if (typeof window.renderCalendarView === 'function') window.renderCalendarView();
  } else {
      if (btnList) btnList.className = 'btn btn-sm btn-premium-primary px-3 fw-bold';
      if (btnCal) btnCal.className = 'btn btn-sm btn-light text-secondary premium-radius px-3 fw-bold border-0';
      if (calZone) calZone.classList.add('d-none');
      if (listZone) listZone.classList.remove('d-none');
  }
};

window.switchVisitView = function(viewId) {
  var views = ['visitListView', 'visitFormView'];
  views.forEach(function(v) { var el = document.getElementById(v); if(el) el.classList.add('d-none'); });
  var target = document.getElementById(viewId); 
  if(target) target.classList.remove('d-none');
  window.scrollTo(0, 0);
};

window.updateStatCards = function(filteredVisits) {
  var total = window.totalVisitsCount || filteredVisits.length;
  var pending = filteredVisits.filter(function(v) { return v.Status === 'Pending'; }).length;
  var submitted = filteredVisits.filter(function(v) { return v.Status === 'Submitted'; }).length;

  if (document.getElementById('statTotalVisits')) document.getElementById('statTotalVisits').innerText = total;
  if (document.getElementById('statPendingVisits')) document.getElementById('statPendingVisits').innerText = pending;
  if (document.getElementById('statSubmittedVisits')) document.getElementById('statSubmittedVisits').innerText = submitted;
};

// ==========================================
// ⛱️ 5. TOT MODAL (TIME OFF TERRITORY)
// ==========================================
window.initTotModal = function() {
  if (!window.totModalInstance) {
      var el = document.getElementById('totModal');
      if (el) window.totModalInstance = new bootstrap.Modal(el, { backdrop: 'static' });
  }
};

window.openAddTotModal = function() {
  var elId = document.getElementById('totId'); if(elId) elId.value = '';
  var elSd = document.getElementById('totStartDate'); if(elSd) elSd.value = new Date().toISOString().split('T')[0];
  var elEd = document.getElementById('totEndDate'); if(elEd) elEd.value = new Date().toISOString().split('T')[0];
  var elSt = document.getElementById('totStartTime'); if(elSt) elSt.value = '';
  var elEt = document.getElementById('totEndTime'); if(elEt) elEt.value = '';
  var elRm = document.getElementById('totRemark'); if(elRm) elRm.value = '';
  var elSts = document.getElementById('totStatus'); if(elSts) elSts.value = 'Approved'; 
  
  if (typeof window.populateTotTypes === 'function') window.populateTotTypes();

  var btnDelete = document.getElementById('btnDeleteTot');
  if(btnDelete) btnDelete.classList.add('d-none');

  var titleEl = document.getElementById('totModalTitle');
  if(titleEl) titleEl.innerHTML = '<i class="fa-solid fa-umbrella-beach me-2"></i>Add TOT';
  
  window.initTotModal();
  if(window.totModalInstance) window.totModalInstance.show();
};

window.openEditTotModal = function(id) {
  var tot = (window.globalTotLogs || []).find(function(t) { return t.TOT_ID === id; });
  if(!tot) return;

  var elId = document.getElementById('totId'); if(elId) elId.value = tot.TOT_ID;
  var elSd = document.getElementById('totStartDate'); if(elSd) elSd.value = tot.Start_Date || '';
  var elEd = document.getElementById('totEndDate'); if(elEd) elEd.value = tot.End_Date || '';
  if (typeof window.formatTimeString === 'function') {
      var elSt = document.getElementById('totStartTime'); if(elSt) elSt.value = window.formatTimeString(tot.Start_Time);
      var elEt = document.getElementById('totEndTime'); if(elEt) elEt.value = window.formatTimeString(tot.End_Time);
  }
  var elRm = document.getElementById('totRemark'); if(elRm) elRm.value = tot.Remark || '';
  var elSts = document.getElementById('totStatus'); if(elSts) elSts.value = tot.Status || 'Approved';

  if (typeof window.populateTotTypes === 'function') window.populateTotTypes();
  setTimeout(function() { 
      var tType = document.getElementById('totType');
      if(tType) tType.value = tot.TOT_Type; 
  }, 50);

  var btnDelete = document.getElementById('btnDeleteTot');
  if(btnDelete) btnDelete.classList.remove('d-none');

  var titleEl = document.getElementById('totModalTitle');
  if(titleEl) titleEl.innerHTML = '<i class="fa-solid fa-pen me-2"></i>Edit TOT';
  
  window.initTotModal();
  if(window.totModalInstance) window.totModalInstance.show();
};

window.populateTotTypes = function() {
  var select = document.getElementById('totType');
  if(!select) return;

  var appLang = window.getCurrentAppLang();
  var types = (window.VisitManagerCache && window.VisitManagerCache.indexTypes) ? window.VisitManagerCache.indexTypes : [];
  var indexes = (window.VisitManagerCache && window.VisitManagerCache.indexes) ? window.VisitManagerCache.indexes : [];
  var tType = types.find(function(t) { return t.Name && (t.Name.trim().toLowerCase() === 'tot type' || t.Name.trim().toLowerCase() === 'tot'); });
  
  var html = '<option value="">-- ' + (appLang === 'en' ? 'Select Type' : 'เลือกประเภท') + ' --</option>';
  if (tType) {
      var items = indexes.filter(function(i) { return i.IndexType_ID === tType.IndexType_ID; });
      items.forEach(function(i) {
          var textTh = i.Value || '';
          var textEn = i.Value1 || i.Value || '';
          html += '<option value="'+textTh+'">'+ (appLang === 'en' ? textEn : textTh) +'</option>';
      });
  } else {
      html += '<option value="Annual Leave">Annual Leave (ลาพักร้อน)</option><option value="Sick Leave">Sick Leave (ลาป่วย)</option><option value="Internal Meeting">Internal Meeting (ประชุมภายใน)</option><option value="Training">Training (อบรม)</option>';
  }
  select.innerHTML = html;
};

window.handleSaveTot = async function(e) {
  e.preventDefault();
  var btn = document.getElementById('saveTotBtn');
  if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; }

  var idEl = document.getElementById('totId');
  var id = idEl ? idEl.value : '';
  var crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err){}
  var repId = crmUser ? (crmUser.Rep_ID || crmUser.id || null) : null;
  var whoUpdated = crmUser ? (crmUser.Email || crmUser.Rep_Name || 'Unknown') : 'Unknown';
  
  var typeEl = document.getElementById('totType');
  var sdEl = document.getElementById('totStartDate');
  var edEl = document.getElementById('totEndDate');
  var stEl = document.getElementById('totStartTime');
  var etEl = document.getElementById('totEndTime');
  var rmEl = document.getElementById('totRemark');
  var stsEl = document.getElementById('totStatus');

  var payload = {
      Rep_ID: repId, 
      TOT_Type: typeEl ? typeEl.value : '', 
      Start_Date: sdEl ? sdEl.value : '',
      End_Date: (edEl && edEl.value) ? edEl.value : (sdEl ? sdEl.value : ''),
      Start_Time: (stEl && stEl.value) ? stEl.value : null, 
      End_Time: (etEl && etEl.value) ? etEl.value : null,
      Remark: rmEl ? rmEl.value : '', 
      Status: stsEl ? stsEl.value : 'Approved',
      Whoupdated: whoUpdated, 
      Whenupdated: new Date().toISOString()
  };

  try {
      if(id) {
          var {error} = await window.supabaseClient.from('TOT_Logs').update(payload).eq('TOT_ID', id);
          if(error) throw error;
      } else {
          payload.TOT_ID = (typeof window.generateUUID === 'function') ? window.generateUUID() : Date.now().toString();
          var {error} = await window.supabaseClient.from('TOT_Logs').insert([payload]);
          if(error) throw error;
      }
      if (window.showToast) window.showToast("บันทึกข้อมูล TOT เรียบร้อยแล้ว", "success");
      if(window.totModalInstance) window.totModalInstance.hide();
      if (typeof window.loadVisits === 'function') await window.loadVisits(true);
  } catch(err) {
      if (window.showToast) window.showToast("Error: " + err.message, "error");
  } finally {
      if(btn) { btn.disabled = false; btn.innerHTML = '💾 Save'; }
  }
};

window.deleteTot = async function() {
  var idEl = document.getElementById('totId');
  var id = idEl ? idEl.value : '';
  if(!id) return;
  var appLang = window.getCurrentAppLang();
  var confirmMsg = appLang === 'en' ? "Are you sure you want to delete this record?" : "คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้?";
  if (!confirm(confirmMsg)) return;

  try {
      var {error} = await window.supabaseClient.from('TOT_Logs').delete().eq('TOT_ID', id);
      if (error) throw error;
      if (window.showToast) window.showToast("ลบข้อมูลเรียบร้อยแล้ว", "success");
      if(window.totModalInstance) window.totModalInstance.hide();
      if (typeof window.loadVisits === 'function') await window.loadVisits(true);
  } catch(err) {
      if (window.showToast) window.showToast("Error: " + err.message, "error");
  }
};

// ==========================================
// 📥 6. DROPDOWNS & PERMISSIONS SETUP
// ==========================================
window.loadDropdowns = async function(forceReload) {
  var oldDocVal = window.tomSelectDocInstance ? window.tomSelectDocInstance.getValue() : '';
  var oldPurpVal = window.tomSelectPurposeInstance ? window.tomSelectPurposeInstance.getValue() : ''; 
  var oldStatusVal = window.tomSelectStatusInstance ? window.tomSelectStatusInstance.getValue() : '';

  try {
    var appLang = window.getCurrentAppLang();
    var statusSelect = document.getElementById('filterVisitStatus');
    if (statusSelect) {
        var optAllStatus = appLang === 'th' ? '- สถานะทั้งหมด -' : '- All Status -';
        var optStatusPending = appLang === 'th' ? '⏳ รอส่ง (Pending)' : '⏳ Pending Drafts';
        var optStatusSubmitted = appLang === 'th' ? '✅ ส่งแล้ว (Submitted)' : '✅ Submitted Logs';
        statusSelect.innerHTML = '<option value="">' + optAllStatus + '</option><option value="Pending">' + optStatusPending + '</option><option value="Submitted">' + optStatusSubmitted + '</option>';
        if (typeof TomSelect !== 'undefined') {
            window.safeDestroyTs(window.tomSelectStatusInstance);
            window.tomSelectStatusInstance = new TomSelect('#filterVisitStatus', { allowEmptyOption: true, create: false, placeholder: optAllStatus, dropdownParent: 'body', onChange: function() { if (typeof window.filterVisits === 'function') window.filterVisits(); } });
            if (oldStatusVal) window.tomSelectStatusInstance.setValue(oldStatusVal, true);
        }
    }

    var crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
    window.globalCurrentUserRole = crmUser ? String(crmUser.Role || crmUser.role || '').trim() : '';
    var uRoleUpper = window.globalCurrentUserRole.toUpperCase();
    var rawScope = crmUser ? String(crmUser.BU_ID || crmUser.Team_ID || crmUser.team_id || crmUser.teamId || crmUser.Team || crmUser.Territory_ID || crmUser.territory_id || crmUser.territoryId || crmUser.Territory || '').trim() : '';

    window.myIsGlobalViewer = false; window.myIsBuHead = false; window.myIsManager = false; window.myIsSalesRole = true;

    if (!rawScope || rawScope.toUpperCase().indexOf('ALL') === 0 || ['ADMIN', 'STAFF', 'DIRECTOR', 'EXECUTIVE', 'PRODUCT MANAGER'].indexOf(uRoleUpper) !== -1) {
        window.myIsGlobalViewer = true; window.myIsSalesRole = false;
    } else if (uRoleUpper.indexOf('BU') !== -1 || uRoleUpper.indexOf('HEAD') !== -1) {
        window.myIsBuHead = true; window.myIsSalesRole = false;
    } else if (uRoleUpper.indexOf('MANAGER') !== -1) {
        window.myIsManager = true; window.myIsSalesRole = false;
    }
    
    window.VisitManagerCache = window.VisitManagerCache || {};

    if (forceReload || !window.VisitManagerCache.dropdownsLoaded) {
        var promises = [
          (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('Doctors') : []),
          (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('Products', function(q) { return q.order('Product', { ascending: true }); }) : []), 
          (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('Territory') : []),
          (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('Hospitals', function(q) { return q.order('Hospital', { ascending: true }); }) : []),
          (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('Team') : []),            
          (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('BU') : []),            
          (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('Products_Team') : []),   
          (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('IndexType') : []),
          (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('Index', function(q) { return q.order('Value', { ascending: true }); }) : []),
          (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('Rep_Users') : []),
          (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('Assignment') : [])
        ];
        var results = await Promise.all(promises);

        var allDoctors = results[0] || [];
        var allHospitals = results[3] || [];
        var allAssignments = results[10] || [];
        var globalTerritoryListLocal = Array.isArray(results[2]) ? results[2] : ((results[2] && results[2].data) ? results[2].data : []);
        var globalTeamListLocal = Array.isArray(results[4]) ? results[4] : ((results[4] && results[4].data) ? results[4].data : []);
        var globalBuListLocal = Array.isArray(results[5]) ? results[5] : ((results[5] && results[5].data) ? results[5].data : []);

        window.VisitManagerCache.assignments = allAssignments; window.VisitManagerCache.allHospitals = allHospitals; window.VisitManagerCache.bus = globalBuListLocal || [];

        var allowedTerIds = []; var allowedDocIds = []; var explicitHospIds = [];
        if (window.myIsGlobalViewer) {
            window.VisitManagerCache.assignedDoctors = allDoctors; window.VisitManagerCache.assignedHospitals = allHospitals;
        } else {
            if (window.myIsBuHead) {
                var matchedBu = globalBuListLocal.find(function(b) { return String(b.BU_ID) === rawScope || String(b.BU) === rawScope || String(b.BU_Name) === rawScope; });
                var targetBuId = matchedBu ? String(matchedBu.BU_ID) : rawScope;
                var matchedTeams = globalTeamListLocal.filter(function(t) { return String(t.BU_ID) === targetBuId || String(t.BU) === rawScope || String(t.BU_ID) === String(rawScope); });
                var matchedTeamIds = matchedTeams.map(function(t) { return String(t.Team_ID); });
                var terrs = globalTerritoryListLocal.filter(function(ter) { return matchedTeamIds.indexOf(String(ter.Team_ID)) !== -1 || String(ter.BU_ID) === targetBuId; });
                terrs.forEach(function(ter) { allowedTerIds.push(String(ter.Territory_ID)); });
            } else if (window.myIsManager) {
                var matchedTeam = globalTeamListLocal.find(function(t) { return String(t.Team_ID) === rawScope || String(t.Team) === rawScope; });
                if (matchedTeam) {
                    window.myAllowedTeamIds = window.myAllowedTeamIds || []; window.myAllowedTeamIds.push(String(matchedTeam.Team_ID));
                    var terrs2 = globalTerritoryListLocal.filter(function(t) { return String(t.Team_ID) === String(matchedTeam.Team_ID); });
                    terrs2.forEach(function(t) { allowedTerIds.push(String(t.Territory_ID)); });
                } else if (rawScope) {
                    window.myAllowedTeamIds = window.myAllowedTeamIds || []; window.myAllowedTeamIds.push(rawScope);
                }
            } else {
                var matchedTerr = globalTerritoryListLocal.find(function(t) { return String(t.Territory_ID) === rawScope || String(t.Territory) === rawScope; });
                if (matchedTerr) { allowedTerIds.push(String(matchedTerr.Territory_ID)); } else if (rawScope) { allowedTerIds.push(rawScope); }
            }

            var allowedTerIdsMap = {}; allowedTerIds.forEach(id => allowedTerIdsMap[id] = true);
            var myAssignments = allAssignments.filter(function(a) { return allowedTerIdsMap[String(a.Territory_ID || a.Territory)]; });
            myAssignments.forEach(function(a) { if (a.Type === 'Doctor') allowedDocIds.push(String(a.Account_ID)); else if (a.Type === 'Hospital') explicitHospIds.push(String(a.Account_ID)); });

            var allowedDocIdsMap = {}; allowedDocIds.forEach(id => allowedDocIdsMap[id] = true);

            if (window.myIsBuHead || window.myIsManager) {
                window.VisitManagerCache.assignedDoctors = allDoctors.filter(function(d) { return allowedDocIdsMap[String(d.Doc_ID || d.doc_id || d.id)] || allowedTerIdsMap[String(d.Territory_ID || d.territory_id)]; });
                if (window.VisitManagerCache.assignedDoctors.length === 0) window.VisitManagerCache.assignedDoctors = allDoctors;
            } else {
                window.VisitManagerCache.assignedDoctors = allDoctors.filter(function(d) { return allowedDocIdsMap[String(d.Doc_ID || d.doc_id || d.id)]; });
            }

            var implicitHospIdsMap = {};
            window.VisitManagerCache.assignedDoctors.forEach(function(d) { var hId = String(d.Hospital_ID || d.hospital_id); if (hId && hId !== 'undefined') implicitHospIdsMap[hId] = true; });
            var explicitHospIdsMap = {}; explicitHospIds.forEach(id => explicitHospIdsMap[id] = true);
            window.VisitManagerCache.assignedHospitals = allHospitals.filter(function(h) { var hId = String(h.Hospital_ID || h.id); return explicitHospIdsMap[hId] || implicitHospIdsMap[hId]; });
        }

        window.VisitManagerCache.allDoctors = allDoctors; window.VisitManagerCache.products = results[1] || []; window.VisitManagerCache.territories = globalTerritoryListLocal;
        window.VisitManagerCache.teams = globalTeamListLocal; window.VisitManagerCache.bus = globalBuListLocal || []; window.VisitManagerCache.teamProdLinks = results[6] || [];
        window.VisitManagerCache.indexTypes = Array.isArray(results[7]) ? results[7] : ((results[7] && results[7].data) ? results[7].data : []);
        window.VisitManagerCache.indexes = Array.isArray(results[8]) ? results[8] : ((results[8] && results[8].data) ? results[8].data : []);
        window.VisitManagerCache.users = results[9] || []; window.VisitManagerCache.dropdownsLoaded = true;
    }

    window.globalAllDoctors = window.VisitManagerCache.allDoctors || []; window.globalAssignedDoctors = window.VisitManagerCache.assignedDoctors || [];
    window.globalAllHospitals = window.VisitManagerCache.allHospitals || []; window.globalAssignedHospitals = window.VisitManagerCache.assignedHospitals || [];
    window.globalProductsList = window.VisitManagerCache.products || []; window.globalTerritoryList = window.VisitManagerCache.territories || [];
    window.globalUsersList = window.VisitManagerCache.users || []; window.globalTeamList = window.VisitManagerCache.teams || [];

    if (typeof window.buildDataIndexes === 'function') window.buildDataIndexes(); 

    if (typeof window.setupFiltersDropdowns === 'function') window.setupFiltersDropdowns(crmUser, window.VisitManagerCache.teamProdLinks);

  } catch (err) { console.error("Error loading dropdowns:", err.message); }
};

window.setupFiltersDropdowns = function(crmUser, productsTeamList) {
  var repSelect = document.getElementById('filterVisitRep'); var terSelect = document.getElementById('filterVisitTerritory');
  if (!repSelect || !terSelect) return;

  var uRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || crmUser.User_ID || '').trim() : '';
  var uEmail = crmUser ? String(crmUser.Email || crmUser.email || '').trim().toLowerCase() : '';
  var rawScope = crmUser ? String(crmUser.BU_ID || crmUser.Team_ID || crmUser.team_id || crmUser.teamId || crmUser.Team || crmUser.Territory_ID || crmUser.territory_id || crmUser.territoryId || crmUser.Territory || '').trim() : '';

  var isGlobalViewer = window.myIsGlobalViewer;
  var isBuHead = window.myIsBuHead;
  var isManager = window.myIsManager;
  var isSales = window.myIsSalesRole;

  var myAllowedTeamIds = []; var myAllowedTerIds = []; var myAllowedRepIds = []; var myAllowedEmails = [];

  if (!isGlobalViewer) {
      if (uRepId) myAllowedRepIds.push(uRepId); if (uEmail) myAllowedEmails.push(uEmail);

      if (isBuHead) {
          var busList = window.VisitManagerCache.bus || [];
          var matchedBu = busList.find(function(b) { return String(b.BU_ID) === rawScope || String(b.BU) === rawScope; });
          var targetBuId = matchedBu ? String(matchedBu.BU_ID) : rawScope;
          var buTeams = window.globalTeamList.filter(function(t) { return String(t.BU_ID) === targetBuId || String(t.BU) === rawScope; });
          buTeams.forEach(function(t) {
              myAllowedTeamIds.push(String(t.Team_ID));
              var terrs = window.globalTerritoryList.filter(function(ter) { return String(ter.Team_ID) === String(t.Team_ID); });
              terrs.forEach(function(ter) { myAllowedTerIds.push(String(ter.Territory_ID)); });
          });
      } else if (isManager) {
          var matchedTeam = window.globalTeamList.find(function(t) { return String(t.Team_ID) === rawScope || String(t.Team) === rawScope; });
          if (matchedTeam) {
              myAllowedTeamIds.push(String(matchedTeam.Team_ID));
              var terrs = window.globalTerritoryList.filter(function(t) { return String(t.Team_ID) === String(matchedTeam.Team_ID); });
              terrs.forEach(function(t) { myAllowedTerIds.push(String(t.Territory_ID)); });
          } else if (rawScope) myAllowedTeamIds.push(rawScope); 
      } else if (isSales) {
          var userTerrId = crmUser ? String(crmUser.Territory_ID || crmUser.Territory || '').trim() : rawScope;
          if (userTerrId) myAllowedTerIds.push(userTerrId);
      }

      window.globalUsersList.forEach(function(u) {
          var uid = String(u.Rep_ID || u.User_ID || u.id).trim(); var uteam = String(u.Team_ID || u.Team || '').trim();
          var uter = String(u.Territory_ID || u.Territory || '').trim(); var uem = String(u.Email || u.email || '').toLowerCase().trim();
          if (!isSales) {
              if (myAllowedTeamIds.indexOf(uteam) !== -1 || myAllowedTerIds.indexOf(uter) !== -1 || myAllowedTeamIds.indexOf(uter) !== -1) {
                  var targetRole = String(u.Role || u.role || '').toUpperCase();
                  var targetIsAdmin = ['ADMIN', 'STAFF', 'DIRECTOR', 'EXECUTIVE', 'PRODUCT MANAGER'].indexOf(targetRole) !== -1;
                  if (!targetIsAdmin) {
                      if (uid && myAllowedRepIds.indexOf(uid) === -1) myAllowedRepIds.push(uid);
                      if (uem && myAllowedEmails.indexOf(uem) === -1) myAllowedEmails.push(uem);
                  }
              }
          }
      });
  }

  window.myAllowedTeamIds = myAllowedTeamIds; 
  window.myAllowedTerIds = myAllowedTerIds;
  window.myAllowedRepIds = myAllowedRepIds; 
  window.myAllowedEmails = myAllowedEmails;

  var uniqueUsersMap = new Map();
  var fullAllowedUsers = isGlobalViewer ? window.globalUsersList : window.globalUsersList.filter(function(u) {
      var uid = String(u.Rep_ID || u.User_ID || u.id); return isSales ? (uid === uRepId) : (myAllowedRepIds.indexOf(uid) !== -1);
  });
  
  fullAllowedUsers.forEach(function(u) {
      var id = String(u.Rep_ID || u.User_ID || u.id); if(id && id !== 'undefined' && id !== 'null') uniqueUsersMap.set(id, u);
  });

  var repHtml = ''; uniqueUsersMap.forEach(function(u, id) { repHtml += '<option value="' + id + '">' + (u.Rep_Name || u.Name || u.Email) + '</option>'; });
  repSelect.innerHTML = repHtml;

  var appLang = window.getCurrentAppLang();
  if (typeof TomSelect !== 'undefined') {
    window.safeDestroyTs(window.tomSelectRepInstance);
    window.tomSelectRepInstance = new TomSelect('#filterVisitRep', { maxItems: null, plugins: ['remove_button'], create: false, placeholder: appLang === 'th' ? '- พนักงานทั้งหมด -' : '- All Users -', dropdownParent: 'body', onChange: function() { if (typeof window.filterVisits === 'function') window.filterVisits(); } });

    window.safeDestroyTs(window.tomSelectTerInstance);
    window.tomSelectTerInstance = new TomSelect('#filterVisitTerritory', { maxItems: null, plugins: ['remove_button'], create: false, placeholder: appLang === 'th' ? '- พื้นที่ทั้งหมด -' : '- All Areas -', dropdownParent: 'body', onChange: function() { if (typeof window.filterVisits === 'function') window.filterVisits(); } });
  }
};

// ==========================================
// 📥 7. DATA LOADING & SERVER-SIDE PAGINATION
// ==========================================
window.loadVisits = async function(forceReload) {
  var tbody = document.getElementById('visitTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5">Loading data... <i class="fa-solid fa-spinner fa-spin text-primary"></i></td></tr>';

  var page = window.currentPage || 1;
  var limit = parseInt(window.rowsPerPage) || 20;
  var from = (page - 1) * limit;
  var to = from + limit - 1;

  try {
    var crmUser = null;
    try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}
    var myRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || crmUser.User_ID || '').trim() : '';

    var query = window.supabaseClient
      .from('Visit_Logs')
      .select('*', { count: 'exact' });

    var sortColMap = { 'date': 'Visit_Date', 'status': 'Status', 'purpose': 'Purpose_ID' };
    var dbSortCol = sortColMap[window.currentSortCol] || 'Visit_Date';
    query = query.order(dbSortCol, { ascending: window.currentSortAsc });

    // 🔒 Security Access Check (สิทธิ์ดูข้อมูลลูกน้องในทีม)
    if (!window.myIsGlobalViewer) {
      var allowedIds = [];
      if (window.myAllowedRepIds && window.myAllowedRepIds.length > 0) {
        allowedIds = [...window.myAllowedRepIds];
      }
      if (myRepId && allowedIds.indexOf(myRepId) === -1) {
        allowedIds.push(myRepId);
      }
      if (allowedIds.length > 0) {
        query = query.in('Rep_ID', allowedIds);
      }
    }

    // Filters
    var statusTerm = window.tomSelectStatusInstance ? window.tomSelectStatusInstance.getValue() : '';
    var startDateTerm = document.getElementById('filterStartDate') ? document.getElementById('filterStartDate').value : '';
    var endDateTerm = document.getElementById('filterEndDate') ? document.getElementById('filterEndDate').value : '';
    var selectedReps = window.tomSelectRepInstance ? window.tomSelectRepInstance.getValue() : [];
    if (!Array.isArray(selectedReps)) selectedReps = selectedReps ? [selectedReps] : [];

    if (statusTerm) query = query.eq('Status', statusTerm);
    if (startDateTerm) query = query.gte('Visit_Date', startDateTerm);
    if (endDateTerm) query = query.lte('Visit_Date', endDateTerm);
    if (selectedReps.length > 0) query = query.in('Rep_ID', selectedReps);

    query = query.range(from, to);

    var res = await query;
    if (res.error) throw res.error;

    window.globalVisits = res.data || [];
    window.totalVisitsCount = res.count || 0;

    if (window.globalVisits.length > 0) {
      var vIds = window.globalVisits.map(function(v) { return v.Visit_ID; });
      var vpRes = await window.supabaseClient.from('Visit_Products').select('*').in('Visit_ID', vIds);
      window.globalVisitProducts = vpRes.data || [];
    } else {
      window.globalVisitProducts = [];
    }

    if (typeof window.buildDataIndexes === 'function') window.buildDataIndexes();

    window.renderVisitTableServerSide();
    if (typeof window.updateStatCards === 'function') window.updateStatCards(window.globalVisits);

  } catch (err) {
    console.error("Load Visits Error:", err);
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">❌ Failed to load data: ' + err.message + '</td></tr>';
  }
};

window.renderVisitTableServerSide = function() {
  var tbody = document.getElementById('visitTableBody');
  if (!tbody) return;

  var data = window.globalVisits || [];
  var totalItems = window.totalVisitsCount || 0;
  var rows = parseInt(window.rowsPerPage) || 20;
  var totalPages = Math.ceil(totalItems / rows);

  if (data.length === 0) {
    if (document.getElementById('visitPaginationContainer')) document.getElementById('visitPaginationContainer').classList.add('d-none');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5"><i class="fa-solid fa-folder-open fs-3 mb-2 d-block text-muted"></i>No visit records found.</td></tr>';
    return;
  }

  if (document.getElementById('visitPaginationContainer')) document.getElementById('visitPaginationContainer').classList.remove('d-none');

  var startIndex = ((window.currentPage - 1) * rows) + 1;
  var endIndex = Math.min(startIndex + data.length - 1, totalItems);
  
  if (document.getElementById('visitPageInfo')) {
    document.getElementById('visitPageInfo').innerText = 'Showing ' + startIndex + ' to ' + endIndex + ' of ' + totalItems + ' entries';
  }

  var htmlBuffer = '';
  data.forEach(function(v) {
    var isPendingUnlock = (window.globalPendingUnlockVisits || []).indexOf(v.Visit_ID) !== -1;
    var badgeClass = (v.Status === 'Submitted') ? 'badge-soft-success' : 'badge-soft-pending';
    var statusShow = (v.Status === 'Submitted') ? '✅ Submitted' : '⏳ Pending';
    if (isPendingUnlock) { badgeClass = 'badge-soft-secondary'; statusShow = '⏳ Pending Unlock'; }

    var dateShow = v.Visit_Date || '-';
    var docObj = window._docIndex[String(v.Doc_ID || '').trim().toLowerCase()];
    var docNameShow = window.getDoctorNameByLang(docObj, v.Doc_ID);
    var hospNameShow = window.getHospitalNameFromDocOrVisit(docObj, v);
    var purposeShow = window.getPurposeText(v.Purpose_ID, v.Purpose);

    var visitProds = window._visitProdIndex[String(v.Visit_ID).trim().toLowerCase()] || [];
    var prodBadges = '';
    if (visitProds.length > 0) {
      visitProds.forEach(function(vp) {
        var pObj = window._prodIndex[String(vp.Product_ID || '').trim().toLowerCase()];
        var pName = pObj ? pObj.Product : vp.Product_ID;
        prodBadges += '<span class="badge badge-soft-product me-1 mb-1">' + pName + '</span>';
      });
    } else prodBadges = '<span class="text-muted small">-</span>';

    htmlBuffer += '<tr>' +
      '<td class="text-center fw-bold"><a href="#" class="table-visit-link" onclick="window.openEditVisitView(\'' + v.Visit_ID + '\'); return false;">' + dateShow + '</a></td>' +
      '<td class="fw-bold text-dark text-start ps-3">' + docNameShow + '</td>' +
      '<td class="text-secondary"><small><i class="fa-regular fa-hospital me-1 text-primary"></i>' + hospNameShow + '</small></td>' +
      '<td>' + prodBadges + '</td>' +
      '<td><small class="text-secondary">' + purposeShow + '</small></td>' +
      '<td class="text-center"><span class="badge ' + badgeClass + '">' + statusShow + '</span></td>' +
    '</tr>';
  });

  tbody.innerHTML = htmlBuffer;
  window.renderPaginationControls(totalPages);
};

window.renderPaginationControls = function(totalPages) {
  var ul = document.getElementById('visitPagination');
  if (!ul) return;
  var html = '';

  html += '<li class="page-item ' + (window.currentPage === 1 ? 'disabled' : '') + '"><a class="page-link shadow-sm" href="#" onclick="window.goToPage(' + (window.currentPage - 1) + '); return false;">&laquo; Prev</a></li>';
  var startPage = Math.max(1, window.currentPage - 2);
  var endPage = Math.min(totalPages, window.currentPage + 2);

  for (var i = startPage; i <= endPage; i++) {
    html += '<li class="page-item ' + (window.currentPage === i ? 'active' : '') + '"><a class="page-link shadow-sm" href="#" onclick="window.goToPage(' + i + '); return false;">' + i + '</a></li>';
  }

  html += '<li class="page-item ' + (window.currentPage >= totalPages ? 'disabled' : '') + '"><a class="page-link shadow-sm" href="#" onclick="window.goToPage(' + (window.currentPage + 1) + '); return false;">Next &raquo;</a></li>';
  ul.innerHTML = html;
};

window.goToPage = function(page) {
  var rows = parseInt(window.rowsPerPage) || 20;
  var totalPages = Math.ceil((window.totalVisitsCount || 0) / rows);
  if (page < 1 || (totalPages > 0 && page > totalPages)) return;
  window.currentPage = page;
  window.loadVisits(true);
};

window.changeRowsPerPage = function() {
  var selectEl = document.getElementById('visitRowsPerPage');
  window.rowsPerPage = parseInt(selectEl.value) || 20;
  window.currentPage = 1;
  window.loadVisits(true);
};

window.filterVisits = function() {
  window.currentPage = 1;
  window.loadVisits(true);
};

window.debouncedFilterVisits = function() {
  if (window.filterDebounceTimer) clearTimeout(window.filterDebounceTimer);
  window.filterDebounceTimer = setTimeout(function() { window.filterVisits(); }, 300);
};

window.sortVisits = function(col) {
  if (window.currentSortCol === col) window.currentSortAsc = !window.currentSortAsc; 
  else { window.currentSortCol = col; window.currentSortAsc = true; }
  window.loadVisits(true);
};

// ==========================================
// 📝 8. FORM ACTIONS
// ==========================================
window.openAddVisitView = function(presetDate) {
  document.getElementById('visitForm').reset();
  document.getElementById('visitId').value = '';
  document.getElementById('formVisitTitle').innerText = '📝 Add New Visit';
  document.getElementById('visitDate').value = presetDate || new Date().toISOString().split('T')[0];
  document.getElementById('visitStatus').value = 'Pending';

  if (typeof window.initUserInfo === 'function') window.initUserInfo();
  if (typeof window.switchVisitView === 'function') window.switchVisitView('visitFormView');
};

window.openEditVisitView = function(visitId) {
  var v = (window.globalVisits || []).find(function(x) { return String(x.Visit_ID) === String(visitId); });
  if (!v) return;

  document.getElementById('visitId').value = v.Visit_ID;
  document.getElementById('formVisitTitle').innerText = '✏️ Edit Visit';
  document.getElementById('visitDate').value = v.Visit_Date || '';
  document.getElementById('visitDetails').value = v.Details || '';
  document.getElementById('visitInsight').value = v.Insight || '';
  document.getElementById('visitNextAction').value = v.Next_Action || '';
  document.getElementById('visitStatus').value = v.Status || 'Pending';

  if (typeof window.switchVisitView === 'function') window.switchVisitView('visitFormView');
};

window.handleSaveVisit = async function(e) {
  e.preventDefault();
  var btn = document.getElementById('saveVisitBtn');
  var visitId = document.getElementById('visitId').value;
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Saving...';

  var crmUser = null; 
  try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
  var whoUpdated = crmUser ? (crmUser.Email || crmUser.Rep_Name || "User") : "Unknown";

  var payload = {
    Visit_ID: visitId || (typeof window.generateUUID === 'function' ? window.generateUUID() : Date.now().toString()),
    Visit_Date: document.getElementById('visitDate').value,
    Details: document.getElementById('visitDetails').value.trim(),
    Insight: document.getElementById('visitInsight').value.trim(),
    Next_Action: document.getElementById('visitNextAction').value.trim(),
    Status: document.getElementById('visitStatus').value,
    Whoupdated: whoUpdated,
    Whenupdated: new Date().toISOString()
  };

  try {
    var res = await window.supabaseClient.from('Visit_Logs').upsert([payload]);
    if (res.error) throw res.error;
    if (window.showToast) window.showToast("บันทึกข้อมูลเรียบร้อยแล้ว", "success");
    window.switchVisitView('visitListView');
    await window.loadVisits(true);
  } catch(err) {
    if (window.showToast) window.showToast("Failed: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Save';
  }
};

window.cancelVisitForm = function() {
  window.switchVisitView('visitListView');
};

// ==========================================
// 🔗 INITIALIZATION
// ==========================================
window.initVisitPage = async function() {
  try {
    await window.loadDropdowns(true);
    await window.loadVisits(true);
  } catch (err) {
    console.error("Init Visits Failed:", err);
  }
};

setTimeout(function() {
  window.initVisitPage();
}, 50);
