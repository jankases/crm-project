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
// 📥 4. MASTER DATA DROPDOWNS SETUP
// ==========================================
window.loadIndexDropdowns = async function(forceReload = false) {
  try {
    const sb = window.supabaseClient || window.supabase;
    if (!sb) return;

    if (forceReload || !window.DocManagerCache.indexLoaded) {
      const [typeRes, idxRes, hospRes] = await Promise.all([
        sb.from('IndexType').select('*'),
        sb.from('Index').select('*').order('Value', { ascending: true }),
        sb.from('Hospitals').select('Hospital_ID, Hospital, Known_As').eq('Status', 'Active').limit(300)
      ]);

      window.DocManagerCache.indexTypes = typeRes.data || [];
      window.DocManagerCache.indexes = idxRes.data || [];
      window.DocManagerCache.hospitals = hospRes.data || [];
      window.DocManagerCache.indexLoaded = true;

      const hospSelect = document.getElementById('filterDocWorkplace');
      if (hospRes.data && hospSelect) {
        hospSelect.innerHTML = hospRes.data.map(h => `<option value="${h.Hospital_ID}">${h.Known_As || h.Hospital}</option>`).join('');
        window.initMultiTomSelect('filterDocWorkplace', '- All Hospitals -');
      }

      const specType = (typeRes.data || []).find(t => t.Name && t.Name.toLowerCase() === 'specialty');
      const specSelect = document.getElementById('filterDocSpecialty');
      if (specType && specSelect) {
        const specItems = (idxRes.data || []).filter(i => i.IndexType_ID === specType.IndexType_ID);
        specSelect.innerHTML = specItems.map(i => `<option value="${i.Value}">${i.Value}</option>`).join('');
        window.initMultiTomSelect('filterDocSpecialty', '- All Specialties -');
      }

      const docTypeObj = (typeRes.data || []).find(t => t.Name && (t.Name.toLowerCase() === 'doctortype' || t.Name.toLowerCase() === 'type'));
      const typeSelect = document.getElementById('filterDocType');
      if (docTypeObj && typeSelect) {
        const typeItems = (idxRes.data || []).filter(i => i.IndexType_ID === docTypeObj.IndexType_ID);
        typeSelect.innerHTML = typeItems.map(i => `<option value="${i.Value}">${i.Value}</option>`).join('');
        window.initMultiTomSelect('filterDocType', '- All Types -');
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
// 📊 5. SERVER-SIDE PAGINATION (DOCTORS ENGINE)
// ==========================================
window.loadDoctors = async function(forceReload = false) {
  const tbody = document.getElementById('doctorTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5">
    <div class="spinner-border text-primary mb-2" role="status"></div>
    <div class="text-muted small">Loading Doctors...</div>
  </td></tr>`;

  try {
    const sb = window.supabaseClient || window.supabase;
    if (!sb) throw new Error("Supabase client is not defined");

    let query = sb.from('Doctors').select('*', { count: 'exact' });

    // กำหนดการเรียงลำดับ
    const sortCol = window.currentDocSortCol || 'Doc_Name';
    query = query.order(sortCol, { ascending: window.currentDocSortAsc });

    // คำนวณช่วง Pagination
    const page = window.currentPage || 1;
    const limit = parseInt(window.rowsPerPage) || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const res = await query;
    if (res.error) throw res.error;

    window.globalDoctors = res.data || [];
    window.totalDoctorsCount = res.count || 0;

    // สั่งเรนเดอร์ลงตาราง
    window.renderDoctorTableServerSide();

  } catch (err) {
    console.error("Load Doctors Error:", err);
    // แสดงข้อความ Error บนหน้าตารางแทนการปล่อยให้ค้าง
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">❌ ไม่สามารถดึงข้อมูลได้: ${err.message}</td></tr>`;
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
    const actionButton = `<button class="btn btn-sm btn-premium-secondary fw-bold" onclick="window.openEditDoctorView('${d.Doc_ID}')"><i class="fa-solid fa-pen"></i> Edit</button>`;
    
    const hospObj = (window.DocManagerCache.hospitals || []).find(h => h.Hospital_ID === d.Hospital_ID);
    const hospNameShow = hospObj ? (hospObj.Known_As || hospObj.Hospital) : '-';

    const nameCellLink = `<a href="#" class="table-visit-link" onclick="window.openViewDoctorProfile('${d.Doc_ID}'); return false;"><i class="fa-solid fa-user-doctor me-2 text-primary"></i>${nameEnShow}</a>`;

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
            <a class="page-link shadow-xs" href="#" onclick="window.goToDoctorPage(${window.currentPage - 1}); return false;">&laquo; Prev</a>
          </li>`;

  let startPage = Math.max(1, window.currentPage - 2);
  let endPage = Math.min(totalPages, window.currentPage + 2);

  for (let i = startPage; i <= endPage; i++) {
      html += `<li class="page-item ${window.currentPage === i ? 'active' : ''}">
                <a class="page-link shadow-xs" href="#" onclick="window.goToDoctorPage(${i}); return false;">${i}</a>
              </li>`;
  }

  html += `<li class="page-item ${window.currentPage >= totalPages ? 'disabled' : ''}">
            <a class="page-link shadow-xs" href="#" onclick="window.goToDoctorPage(${window.currentPage + 1}); return false;">Next &raquo;</a>
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
  if (window.isDocInitialLoading) return;
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

  document.getElementById('viewDocTitleName').innerText = `👨‍⚕️ ${d.Title || d.title || ''} ${d.Doc_Name || d.nameEn || ''} ${d.Doc_Name_TH ? `(${d.Doc_Name_TH})` : ''}`;
  document.getElementById('viewDocSpecialty').value = d.Specialty || d.specialty || '-';
  document.getElementById('viewDocType').value = d.Type || d.type || '-';
  document.getElementById('viewDocStatus').value = d.Status || d.status || 'Active';
  document.getElementById('viewDocEmail').value = d.Email || d.email || '-';
  document.getElementById('viewDocMobile').value = d.Mobile || d.mobile || '-';

  let wpHTML = '';
  let parsedWp = [];
  try { if (d.Workplaces_JSON || d.workplacesJson) parsedWp = JSON.parse(d.Workplaces_JSON || d.workplacesJson); } catch(e) {}
  
  if(parsedWp.length > 0) {
    parsedWp.forEach(wp => {
      const isPrimary = wp.isPrimary ? '<span class="badge badge-soft-info ms-2">Primary</span>' : '';
      const hospObj = (window.DocManagerCache.hospitals || []).find(h => h.Hospital_ID === wp.hospitalId);
      const hospName = hospObj ? (hospObj.Known_As || hospObj.Hospital) : "Hospital";
      wpHTML += `<div class="py-2 px-3 bg-white border rounded-3 mb-2">🏥 <span class="fw-bold text-dark">${hospName}</span> ${isPrimary}</div>`;
    });
  } else {
    const hospObj = (window.DocManagerCache.hospitals || []).find(h => h.Hospital_ID === (d.Hospital_ID || d.hospitalId));
    const hospName = hospObj ? (hospObj.Known_As || hospObj.Hospital) : "Primary Hospital";
    wpHTML = `<div class="py-2 px-3 bg-white border rounded-3 mb-2">🏥 <span class="fw-bold text-dark">${hospName}</span> <span class="badge badge-soft-info ms-2">Primary</span></div>`;
  }
  document.getElementById('viewWorkplaceContainer').innerHTML = wpHTML;

  window.switchDoctorView('doctorProfileView');
};

// ==========================================
// 🚀 8. SAFE INITIALIZATION ENGINE
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
