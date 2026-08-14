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
  teamList: []
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

window.currentDocSortCol = 'Doc_Name';
window.currentDocSortAsc = true; 

window.currentPage = 1;
window.rowsPerPage = 20;

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
    }
  } else {
    window.switchDoctorView('doctorListView');
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
// ==========================================
// 📥 3. MASTER DATA DROPDOWNS SETUP (SAFE VERSION)
// ==========================================
window.loadIndexDropdowns = async function(forceReload = false) {
  try {
    if (forceReload || !window.DocManagerCache.indexLoaded) {
      // ดึงเฉพาะตาราง Master Data ที่จำเป็น
      const [typeRes, idxRes, hospRes] = await Promise.all([
        window.supabaseClient.from('IndexType').select('*'),
        window.supabaseClient.from('Index').select('*').order('Value', { ascending: true }),
        window.supabaseClient.from('Hospitals').select('Hospital_ID, Hospital, Known_As').eq('Status', 'Active').limit(300)
      ]);

      window.DocManagerCache.indexTypes = typeRes.data || [];
      window.DocManagerCache.indexes = idxRes.data || [];
      window.DocManagerCache.hospitals = hospRes.data || [];
      window.DocManagerCache.indexLoaded = true;

      // เติม Dropdown โรงพยาบาล
      const hospSelect = document.getElementById('filterDocWorkplace');
      if (hospRes.data && hospSelect) {
        let hospHtml = '';
        hospRes.data.forEach(h => {
          hospHtml += `<option value="${h.Hospital_ID}">${h.Known_As || h.Hospital}</option>`;
        });
        hospSelect.innerHTML = hospHtml;
        window.initMultiTomSelect('filterDocWorkplace', '- All Hospitals -');
      }

      // เติม Dropdown Specialty จาก Index
      const specType = (typeRes.data || []).find(t => t.Name && t.Name.toLowerCase() === 'specialty');
      const specSelect = document.getElementById('filterDocSpecialty');
      if (specType && specSelect) {
        const specItems = (idxRes.data || []).filter(i => i.IndexType_ID === specType.IndexType_ID);
        let specHtml = '';
        specItems.forEach(i => { specHtml += `<option value="${i.Value}">${i.Value}</option>`; });
        specSelect.innerHTML = specHtml;
        window.initMultiTomSelect('filterDocSpecialty', '- All Specialties -');
      }

      // เติม Dropdown Doctor Type จาก Index
      const docTypeObj = (typeRes.data || []).find(t => t.Name && (t.Name.toLowerCase() === 'doctortype' || t.Name.toLowerCase() === 'type'));
      const typeSelect = document.getElementById('filterDocType');
      if (docTypeObj && typeSelect) {
        const typeItems = (idxRes.data || []).filter(i => i.IndexType_ID === docTypeObj.IndexType_ID);
        let typeHtml = '';
        typeItems.forEach(i => { typeHtml += `<option value="${i.Value}">${i.Value}</option>`; });
        typeSelect.innerHTML = typeHtml;
        window.initMultiTomSelect('filterDocType', '- All Types -');
      }
    }
  } catch (err) {
    console.warn("Dropdown load warning (non-blocking):", err.message);
  }
};

// ==========================================
// 📊 4. SERVER-SIDE PAGINATION (SAFE LOAD DOCTORS)
// ==========================================
window.loadDoctors = async function(forceReload = false) {
  const tbody = document.getElementById('doctorTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary mb-2"></div><div class="text-muted small">Loading Doctors...</div></td></tr>`;

  try {
    let query = window.supabaseClient.from('Doctors').select('*', { count: 'exact' });

    // 🌟 Sorting
    const sortCol = window.currentDocSortCol || 'Doc_Name';
    query = query.order(sortCol, { ascending: window.currentDocSortAsc });

    // 🌟 Filters
    const specEl = document.getElementById('filterDocSpecialty');
    const typeEl = document.getElementById('filterDocType');
    const hospEl = document.getElementById('filterDocWorkplace');

    const selectedSpecs = specEl && specEl.tomselect ? specEl.tomselect.getValue() : [];
    const selectedTypes = typeEl && typeEl.tomselect ? typeEl.tomselect.getValue() : [];
    const selectedHosps = hospEl && hospEl.tomselect ? hospEl.tomselect.getValue() : [];

    if (Array.isArray(selectedSpecs) && selectedSpecs.length > 0) query = query.in('Specialty', selectedSpecs);
    if (Array.isArray(selectedTypes) && selectedTypes.length > 0) query = query.in('Type', selectedTypes);
    if (Array.isArray(selectedHosps) && selectedHosps.length > 0) query = query.in('Hospital_ID', selectedHosps);

    // 🌟 Server-Side Pagination Range
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

  if (data.length === 0) {
    if (document.getElementById('doctorPaginationContainer')) document.getElementById('doctorPaginationContainer').classList.add('d-none');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5"><i class="fa-solid fa-folder-open fs-3 mb-2 d-block text-muted"></i>No doctors found.</td></tr>';
    return;
  }

  if (document.getElementById('doctorPaginationContainer')) document.getElementById('doctorPaginationContainer').classList.remove('d-none');

  const startIndex = ((window.currentPage - 1) * rows) + 1;
  const endIndex = Math.min(startIndex + data.length - 1, totalItems);
  if (document.getElementById('doctorPageInfo')) {
    document.getElementById('doctorPageInfo').innerText = `Showing ${startIndex} to ${endIndex} of ${totalItems} entries`;
  }

  let htmlBuffer = '';
  data.forEach(d => {
    const badge = (d.Status === 'Active') ? 'badge-soft-success' : 'badge-soft-danger';
    const nameEnShow = d.Doc_Name || '-';
    const nameThShow = d.Doc_Name_TH || '-';
    const actionButton = `<button class="btn btn-sm btn-premium-secondary fw-bold" onclick="openEditDoctorView('${d.Doc_ID}')"><i class="fa-solid fa-pen"></i> Edit</button>`;
    
    const hospObj = (window.DocManagerCache.hospitals || []).find(h => h.Hospital_ID === d.Hospital_ID);
    const hospNameShow = hospObj ? (hospObj.Known_As || hospObj.Hospital) : '-';

    const nameCellLink = `<a href="#" class="table-visit-link" onclick="openViewDoctorProfile('${d.Doc_ID}'); return false;"><i class="fa-solid fa-user-doctor me-2 text-primary"></i>${nameEnShow}</a>`;

    htmlBuffer += `
      <tr>
        <td class="text-start ps-3">${nameCellLink}</td>
        <td class="fw-medium text-secondary">${nameThShow}</td>
        <td><span class="badge badge-soft-product">${d.Specialty || '-'}</span></td>
        <td class="text-secondary"><small><i class="fa-regular fa-hospital me-1 text-primary"></i>${hospNameShow}</small></td>
        <td class="text-center"><span class="badge ${badge}">${d.Status || 'Active'}</span></td>
        <td class="text-center">${actionButton}</td>
      </tr>`;
  });

  tbody.innerHTML = htmlBuffer;
  window.renderDoctorPaginationControls(totalPages);
};

window.renderDoctorPaginationControls = function(totalPages) {
  const ul = document.getElementById('doctorPagination');
  if (!ul) return;
  let html = '';

  html += `<li class="page-item ${window.currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link shadow-xs" href="#" onclick="goToDoctorPage(${window.currentPage - 1}); return false;">&laquo; Prev</a>
          </li>`;

  let startPage = Math.max(1, window.currentPage - 2);
  let endPage = Math.min(totalPages, window.currentPage + 2);

  for (let i = startPage; i <= endPage; i++) {
      html += `<li class="page-item ${window.currentPage === i ? 'active' : ''}">
                <a class="page-link shadow-xs" href="#" onclick="goToDoctorPage(${i}); return false;">${i}</a>
              </li>`;
  }

  html += `<li class="page-item ${window.currentPage >= totalPages ? 'disabled' : ''}">
            <a class="page-link shadow-xs" href="#" onclick="goToDoctorPage(${window.currentPage + 1}); return false;">Next &raquo;</a>
          </li>`;

  ul.innerHTML = html;
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
  window.currentPage = 1;
  window.loadDoctors(true);
};

window.clearDoctorFilters = function() {
  const clearTs = (id) => {
    const el = document.getElementById(id);
    if (el && el.tomselect) el.tomselect.clear();
  };
  clearTs('filterDocName');
  clearTs('filterDocWorkplace');
  clearTs('filterDocSpecialty');
  clearTs('filterDocType');
  window.filterDoctors();
};

window.sortDoctors = function(col) {
  const dbColMap = { 'nameEn': 'Doc_Name', 'nameTh': 'Doc_Name_TH', 'specialty': 'Specialty', 'status': 'Status' };
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
// 🚀 5. INITIALIZATION ENGINE
// ==========================================
window.initDoctorPage = async function() {
  await window.loadIndexDropdowns(); 
  await window.loadDoctors(true);
};

// Auto Start เมื่อสลับมาหน้า Doctor
if (!window._docObserverAttached) {
  const docObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && (node.id === 'doctorTableBody' || (node.querySelector && node.querySelector('#doctorTableBody')))) {
            window.initDoctorPage();
          }
        });
      }
    });
  });
  docObserver.observe(document.body, { childList: true, subtree: true });
  window._docObserverAttached = true;
}

// Fallback Run
setTimeout(() => {
  if (document.getElementById('doctorTableBody')) {
    window.initDoctorPage();
  }
}, 200);
