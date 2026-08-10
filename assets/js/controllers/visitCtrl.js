// ==========================================
// 1. GLOBAL STATE VARIABLES & CACHE
// ==========================================
window.globalVisits = []; 
window.totalVisitsCount = 0; 
window.globalTotLogs = []; 
window.globalVisitProducts = []; 
window.globalAllDoctors = []; 
window.globalAssignedDoctors = [];
window.globalAllHospitals = []; 
window.globalProductsList = [];
window.globalTerritoryList = []; 
window.globalUsersList = []; 
window.globalTeamList = [];
window.globalPendingUnlockVisits = []; 

window.myIsGlobalViewer = false; 
window.myIsBuHead = false; 
window.myIsManager = false; 
window.myIsSalesRole = true;
window.myAllowedRepIds = [];

window.tomSelectDocInstance = null; 
window.tomSelectProdInstance = null; 
window.tomSelectPurposeInstance = null; 
window.tomSelectRepInstance = null; 
window.tomSelectTerInstance = null; 
window.tomSelectStatusInstance = null;

window.currentSortCol = 'date'; 
window.currentSortAsc = false; 
window.currentPage = 1; 
window.rowsPerPage = 20;

window.filterDebounceTimer = null; 

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
// 🛠️ 3. UTILITIES
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

// ==========================================
// 📥 4. DATA LOADING & SERVER-SIDE PAGINATION
// ==========================================

// ฟังก์ชันหลักในการยิงขอข้อมูลแบบ Server-side Range
window.loadVisits = async function(forceReload) {
  var tbody = document.getElementById('visitTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5">Loading data... <i class="fa-solid fa-spinner fa-spin text-primary"></i></td></tr>';

  var page = window.currentPage || 1;
  var limit = parseInt(window.rowsPerPage) || 20;
  var from = (page - 1) * limit;
  var to = from + limit - 1;

  try {
    // 1. อ่านข้อมูล User และ Role จาก Session สดใหม่เสมอ
    var crmUser = null;
    try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}
    
    var myRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || crmUser.User_ID || '').trim() : '';
    var uRoleUpper = crmUser ? String(crmUser.Role || crmUser.role || '').toUpperCase().trim() : '';
    var rawScope = crmUser ? String(crmUser.BU_ID || crmUser.Team_ID || crmUser.team_id || crmUser.Team || crmUser.Territory_ID || crmUser.territory_id || crmUser.Territory || '').trim() : '';

    // 2. กำหนด Flag สิทธิ์
    var isGlobal = (!rawScope || rawScope.indexOf('ALL') === 0 || ['ADMIN', 'STAFF', 'DIRECTOR', 'EXECUTIVE', 'PRODUCT MANAGER'].indexOf(uRoleUpper) !== -1);
    window.myIsGlobalViewer = isGlobal;

    // 3. เริ่มสร้าง Query
    var query = window.supabaseClient
      .from('Visit_Logs')
      .select('*', { count: 'exact' });

    // Ordering
    var sortColMap = { 'date': 'Visit_Date', 'status': 'Status', 'purpose': 'Purpose_ID' };
    var dbSortCol = sortColMap[window.currentSortCol] || 'Visit_Date';
    query = query.order(dbSortCol, { ascending: window.currentSortAsc });

    // 4. กรองสิทธิ์ความปลอดภัย (Security Check)
    if (!window.myIsGlobalViewer) {
      var allowedIds = [];
      
      // ดึงสิทธิ์ลูกน้องที่คำนวณไว้ใน setupFiltersDropdowns
      if (window.myAllowedRepIds && window.myAllowedRepIds.length > 0) {
        allowedIds = [...window.myAllowedRepIds];
      }
      
      // ใส่ Rep_ID ตัวเองเข้าไปด้วยเสมอ
      if (myRepId && allowedIds.indexOf(myRepId) === -1) {
        allowedIds.push(myRepId);
      }

      if (allowedIds.length > 0) {
        query = query.in('Rep_ID', allowedIds);
      }
    }

    // 5. กรองตาม UI Filters
    var statusTerm = window.tomSelectStatusInstance ? window.tomSelectStatusInstance.getValue() : '';
    var startDateTerm = document.getElementById('filterStartDate') ? document.getElementById('filterStartDate').value : '';
    var endDateTerm = document.getElementById('filterEndDate') ? document.getElementById('filterEndDate').value : '';
    var selectedReps = window.tomSelectRepInstance ? window.tomSelectRepInstance.getValue() : [];
    if (!Array.isArray(selectedReps)) selectedReps = selectedReps ? [selectedReps] : [];

    if (statusTerm) query = query.eq('Status', statusTerm);
    if (startDateTerm) query = query.gte('Visit_Date', startDateTerm);
    if (endDateTerm) query = query.lte('Visit_Date', endDateTerm);
    if (selectedReps.length > 0) query = query.in('Rep_ID', selectedReps);

    // 6. ตัดแบ่งหน้า (Server-side Range)
    query = query.range(from, to);

    var res = await query;
    if (res.error) throw res.error;

    window.globalVisits = res.data || [];
    window.totalVisitsCount = res.count || 0;

    // 7. ดึงข้อมูล Visit_Products ของแถวที่ได้มา
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

// วาดตารางเรกคอร์ดที่ได้จาก Server
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

    var visitProds = v.Visit_Products || [];
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

// วาดปุ่มเปลี่ยนหน้า
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

// ปุ่มกดเปลี่ยนหน้า
window.goToPage = function(page) {
  var rows = parseInt(window.rowsPerPage) || 20;
  var totalPages = Math.ceil((window.totalVisitsCount || 0) / rows);
  
  if (page < 1 || (totalPages > 0 && page > totalPages)) return;

  window.currentPage = page;
  window.loadVisits(true);
};

// เปลี่ยนจำนวนแถว
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

// โหลด Dropdowns และสิทธิ์ของระบบ
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
