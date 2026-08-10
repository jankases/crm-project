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
  return docObj.Doc_Name_TH || docObj.Doc_Name || defaultId || '-';
};

window.getHospitalNameFromDocOrVisit = function(docObj, visitObj) {
  if (docObj && docObj.Hospital_Name) return docObj.Hospital_Name;
  if (visitObj && visitObj.Hospital) return visitObj.Hospital;
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
// 📊 4. VIEW & UI SWITCHERS
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
// 📥 5. DATA LOADING & SERVER-SIDE PAGINATION
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
    var uRoleUpper = crmUser ? String(crmUser.Role || crmUser.role || '').toUpperCase().trim() : '';
    var rawScope = crmUser ? String(crmUser.BU_ID || crmUser.Team_ID || crmUser.team_id || crmUser.Team || crmUser.Territory_ID || crmUser.territory_id || crmUser.Territory || '').trim() : '';

    var isGlobal = (!rawScope || rawScope.indexOf('ALL') === 0 || ['ADMIN', 'STAFF', 'DIRECTOR', 'EXECUTIVE', 'PRODUCT MANAGER'].indexOf(uRoleUpper) !== -1);
    window.myIsGlobalViewer = isGlobal;

    var query = window.supabaseClient
      .from('Visit_Logs')
      .select('*', { count: 'exact' });

    var sortColMap = { 'date': 'Visit_Date', 'status': 'Status', 'purpose': 'Purpose_ID' };
    var dbSortCol = sortColMap[window.currentSortCol] || 'Visit_Date';
    query = query.order(dbSortCol, { ascending: window.currentSortAsc });

    // Security Filter Logic
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

    // UI Filters
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
// 📝 6. FORM & VISIT ACTIONS
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
// ⛱️ 7. TOT MODAL ACTIONS
// ==========================================
window.openAddTotModal = function() {
  var el = document.getElementById('totModal');
  if (el && typeof bootstrap !== 'undefined') {
    var modal = new bootstrap.Modal(el);
    modal.show();
  }
};

// ==========================================
// 📥 8. DROPDOWNS & INITIALIZATION
// ==========================================
window.loadDropdowns = async function(forceReload) {
  try {
    var crmUser = null; 
    try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
    
    var uRole = crmUser ? String(crmUser.Role || crmUser.role || '').toUpperCase().trim() : '';
    window.myIsGlobalViewer = ['ADMIN', 'STAFF', 'DIRECTOR', 'EXECUTIVE', 'PRODUCT MANAGER'].indexOf(uRole) !== -1;
    
    if (crmUser && crmUser.Rep_ID) {
      window.myAllowedRepIds = [String(crmUser.Rep_ID)];
    }

    var promises = [
      (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('Doctors') : []),
      (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('Products') : []),
      (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('Hospitals') : [])
    ];

    var results = await Promise.all(promises);
    window.globalAllDoctors = results[0] || [];
    window.globalProductsList = results[1] || [];
    window.globalAllHospitals = results[2] || [];

    if (typeof window.buildDataIndexes === 'function') window.buildDataIndexes();
  } catch (err) {
    console.error("Error loading dropdowns:", err.message);
  }
};

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
