// ==========================================
// 🚀 Index Controller (Master Data Management) - Clean Layout Engine
// ==========================================

window.globalIndexTypes = [];
window.globalIndexes = [];
window.globalFilteredIndexes = []; 

window.indexSortCol = 'value';
window.indexSortAsc = true; 

window.indexCurrentPage = 1;       
window.indexRowsPerPage = 10;      

window.indexTypeModalInstance = null;
window.indexModalInstance = null;
window.globalSystemSettings = [];

window.initIndexPage = function() {
    var typeModalEl = document.getElementById('indexTypeModal');
    var indexModalEl = document.getElementById('indexModal');
    if (typeModalEl && typeof bootstrap !== 'undefined') window.indexTypeModalInstance = new bootstrap.Modal(typeModalEl);
    if (indexModalEl && typeof bootstrap !== 'undefined') window.indexModalInstance = new bootstrap.Modal(indexModalEl);

    if (typeof window.loadSystemSettings === 'function') window.loadSystemSettings(); 
    if (typeof window.loadAllIndexData === 'function') window.loadAllIndexData();
};

if (!window._indexObserverAttached) {
    var indexObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        if (node.id === 'indexTypeTableBody' || (node.querySelector && node.querySelector('#indexTypeTableBody'))) {
                            window.initIndexPage();
                        }
                    }
                });
            }
        });
    });
    indexObserver.observe(document.body, { childList: true, subtree: true });
    window._indexObserverAttached = true;
}

setTimeout(function() {
    if (document.getElementById('indexTypeTableBody')) {
        window.initIndexPage();
    }
}, 100);

window.loadSystemSettings = async function() {
  try {
    const { data, error } = await supabaseClient.from('System_Settings').select('*');
    if (error) throw error;
    
    window.globalSystemSettings = data || [];
    const ratingConfig = window.globalSystemSettings.find(s => s.Type === 'Rating');
    
    const switchEl = document.getElementById('ratingToggleSwitch');
    const startEl = document.getElementById('ratingStartDate');
    const endEl = document.getElementById('ratingEndDate');
    
    if (ratingConfig) {
      if (startEl) startEl.value = ratingConfig.Start || '';
      if (endEl) endEl.value = ratingConfig.End || '';
      
      if (ratingConfig.Status === false) {
          if (switchEl) switchEl.checked = false;
          var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
          const lbl = document.getElementById('ratingStatusLabel');
          if (lbl) lbl.innerHTML = '<span class="text-danger fw-bold">' + (appLang === 'en' ? 'Disabled (Locked)' : 'ปิดใช้งาน (ล็อก)') + '</span>';
      } else {
          window.checkCurrentRatingStatus(ratingConfig.Start, ratingConfig.End);
      }
    } else {
      if (switchEl) switchEl.checked = false;
      var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
      const lbl = document.getElementById('ratingStatusLabel');
      if (lbl) lbl.innerHTML = '<span class="text-danger fw-bold">' + (appLang === 'en' ? 'Disabled (Locked)' : 'ปิดใช้งาน (ล็อก)') + '</span>';
    }

    const gpsConf = window.globalSystemSettings.find(s => s.Type === 'VisitConfig_GPS');
    const attConf = window.globalSystemSettings.find(s => s.Type === 'VisitConfig_Attachment');
    const sigConf = window.globalSystemSettings.find(s => s.Type === 'VisitConfig_Signature');
    const smpConf = window.globalSystemSettings.find(s => s.Type === 'VisitConfig_Samples');
    
    const tgGps = document.getElementById('toggleGps');
    const tgAtt = document.getElementById('toggleAttachment');
    const tgSig = document.getElementById('toggleSignature');
    const tgSmp = document.getElementById('toggleSamples');
    
    if(tgGps) tgGps.checked = gpsConf ? gpsConf.Status !== false : true; 
    if(tgAtt) tgAtt.checked = attConf ? attConf.Status !== false : true;
    if(tgSig) tgSig.checked = sigConf ? sigConf.Status !== false : true;
    if(tgSmp) tgSmp.checked = smpConf ? smpConf.Status !== false : true;
      
  } catch (err) { console.error("Load Settings Error:", err); }
};

window.checkCurrentRatingStatus = function(startStr, endStr) {
  const switchEl = document.getElementById('ratingToggleSwitch');
  const labelEl = document.getElementById('ratingStatusLabel');
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
  
  if (!startStr && !endStr) {
      if (switchEl) switchEl.checked = true; 
      if (labelEl) labelEl.innerHTML = '<span class="text-success fw-bold">' + (appLang === 'en' ? 'Enabled (Manual)' : 'เปิดใช้งาน (กำหนดเอง)') + '</span>';
      return;
  }

  const today = new Date(); today.setHours(0,0,0,0);
  let isWithinRange = true;
  
  if (startStr) { const sDate = new Date(startStr); sDate.setHours(0,0,0,0); if (today < sDate) isWithinRange = false; }
  if (endStr) { const eDate = new Date(endStr); eDate.setHours(23,59,59,999); if (today > eDate) isWithinRange = false; }

  if (isWithinRange) {
      if (switchEl) switchEl.checked = true;
      if (labelEl) labelEl.innerHTML = '<span class="text-success fw-bold">' + (appLang === 'en' ? 'Enabled (In Period)' : 'เปิดใช้งาน (ตามช่วงเวลา)') + '</span>';
  } else {
      if (switchEl) switchEl.checked = true; 
      if (labelEl) labelEl.innerHTML = '<span class="text-danger fw-bold">' + (appLang === 'en' ? 'Disabled (Out of Period)' : 'ปิดใช้งาน (นอกช่วงเวลา)') + '</span>';
  }
};

window.toggleRatingSystem = function() {
  const switchEl = document.getElementById('ratingToggleSwitch');
  const labelEl = document.getElementById('ratingStatusLabel');
  const startEl = document.getElementById('ratingStartDate');
  const endEl = document.getElementById('ratingEndDate');
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
  
  if (switchEl && switchEl.checked) {
      if (labelEl) labelEl.innerHTML = '<span class="text-success fw-bold">' + (appLang === 'en' ? 'Enabled (Manual)' : 'เปิดใช้งาน (กำหนดเอง)') + '</span>';
      window.checkCurrentRatingStatus(startEl ? startEl.value : '', endEl ? endEl.value : ''); 
  } else {
      if (labelEl) labelEl.innerHTML = '<span class="text-danger fw-bold">' + (appLang === 'en' ? 'Disabled (Locked)' : 'ปิดใช้งาน (ล็อก)') + '</span>';
  }
};

window.saveSystemSettings = async function() {
  const btn = document.getElementById('btnSaveSysSettings');
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }

  const startVal = document.getElementById('ratingStartDate') ? document.getElementById('ratingStartDate').value : '';
  const endVal = document.getElementById('ratingEndDate') ? document.getElementById('ratingEndDate').value : '';
  const isStatusActive = document.getElementById('ratingToggleSwitch') ? document.getElementById('ratingToggleSwitch').checked : false; 
  
  let crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}

  const payload = {
      Type: 'Rating', Start: startVal || null, End: endVal || null, Status: isStatusActive,
      Whoupdated: crmUser ? crmUser.Email : "Unknown", Whenupdated: new Date().toISOString()
  };

  try {
      if (!navigator.onLine) throw new Error("OFFLINE_MODE");

      const ratingConfig = window.globalSystemSettings.find(s => s.Type === 'Rating');
      if (ratingConfig) {
          const { error } = await supabaseClient.from('System_Settings').update(payload).eq('Type', 'Rating');
          if (error) throw error;
      } else {
          const { error } = await supabaseClient.from('System_Settings').insert([payload]);
          if (error) throw error;
      }

      if (btn) {
        btn.classList.replace('btn-premium-primary', 'btn-success');
        btn.innerHTML = '<i class="fa-solid fa-check"></i> ' + (appLang === 'en' ? 'Saved' : 'บันทึกแล้ว');
      }
      
      const lbl = document.getElementById('ratingStatusLabel');
      if (!isStatusActive) {
          if (lbl) lbl.innerHTML = '<span class="text-danger fw-bold">' + (appLang === 'en' ? 'Disabled (Locked)' : 'ปิดใช้งาน (ล็อก)') + '</span>';
      } else {
          window.checkCurrentRatingStatus(startVal, endVal);
      }

      var saveText = appLang === 'en' ? 'Save' : 'บันทึก';
      setTimeout(() => { 
        if (btn) {
          btn.classList.replace('btn-success', 'btn-premium-primary'); 
          btn.innerHTML = '<i class="fa-solid fa-save me-1"></i> ' + saveText; 
          btn.disabled = false; 
        }
      }, 2000);
      
      if (window.showToast) window.showToast(appLang === 'en' ? "Settings saved successfully." : "บันทึกการตั้งค่าระบบเรียบร้อย", "success");
      
  } catch (err) {
      var isNetworkError = err.message === "OFFLINE_MODE" || err.message.indexOf('Failed to fetch') !== -1 || err.message.indexOf('NetworkError') !== -1;
      if (isNetworkError) {
          var queue = JSON.parse(localStorage.getItem('crmOfflineIndexQueue') || '[]');
          queue.push({ table: 'System_Settings', type: 'Rating', payload: payload, timestamp: Date.now() });
          localStorage.setItem('crmOfflineIndexQueue', JSON.stringify(queue));
          
          var msgOfflineSave = appLang === 'en' 
              ? "📶 Offline Mode: Settings saved locally and will auto-sync when online."
              : "📶 โหมดออฟไลน์: บันทึกการตั้งค่าลงเครื่องแล้ว และจะอัปเดตอัตโนมัติเมื่อออนไลน์";
          if (window.showToast) window.showToast(msgOfflineSave, "warning");
      } else {
          if (window.showToast) window.showToast((appLang === 'en' ? "Settings save failed: " : "เกิดข้อผิดพลาด: ") + err.message, "error");
      }
      var saveText = appLang === 'en' ? 'Save' : 'บันทึก';
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-save me-1"></i> ' + saveText; }
  }
};

window.loadAllIndexData = async function() {
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
  try {
    const [typeRes, idxRes] = await Promise.all([
      supabaseClient.from('IndexType').select('*').order('Name', { ascending: true }),
      supabaseClient.from('Index').select('*').order('Value', { ascending: true })
    ]);

    if (typeRes.error) throw typeRes.error;
    if (idxRes.error) throw idxRes.error;

    window.globalIndexTypes = typeRes.data || [];
    window.globalIndexes = idxRes.data || [];

    window.renderIndexTypeTable();
    window.populateIndexTypeDropdowns();
    window.filterIndexValues();
  } catch (err) {
    if (window.showToast) window.showToast((appLang === 'en' ? "Load failed: " : "โหลดข้อมูลไม่สำเร็จ: ") + err.message, "error");
  }
};

 window.renderIndexTypeTable = function() {
  const tbody = document.getElementById('indexTypeTableBody');
  if (!tbody) return;
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
  tbody.innerHTML = '';
  
  if(!window.globalIndexTypes.length) {
    tbody.innerHTML = '<tr><td class="text-muted py-4 text-center">' + (appLang === 'en' ? 'No categories found.' : 'ไม่พบข้อมูลหมวดหมู่') + '</td></tr>';
    return;
  }

  const currentFilterVal = document.getElementById('filterIndexType') ? document.getElementById('filterIndexType').value : '';

  window.globalIndexTypes.forEach(t => {
    const isActive = (t.IndexType_ID === currentFilterVal) ? 'active' : '';
    tbody.innerHTML += `
      <tr class="category-item-row ${isActive}" onclick="window.selectCategoryFromLeft('${t.IndexType_ID}')">
        <td class="text-dark fw-bold text-start ps-3 py-2.5">
           <i class="fa-solid fa-folder-open text-primary opacity-50 me-2"></i>${t.Name}
        </td>
        <td class="text-end pe-2">
          <button class="btn btn-sm btn-light border fw-bold rounded-pill px-2.5 shadow-xs text-primary" onclick="event.stopPropagation(); window.openEditIndexTypeModal('${t.IndexType_ID}', '${t.Name}')"><i class="fa-solid fa-pen"></i></button>
        </td>
      </tr>`;
  });
};

// 🌟 ฟังก์ชันคลิกเลือกหมวดหมู่ฝั่งซ้ายแล้วฟิลเตอร์ฝั่งขวา
window.selectCategoryFromLeft = function(typeId) {
  const filterEl = document.getElementById('filterIndexType');
  if (filterEl) {
    filterEl.value = typeId;
    window.filterIndexValues();
    window.renderIndexTypeTable(); // ไฮไลต์แถวที่เลือก
  }
};

window.openAddIndexTypeModal = function() {
  const idEl = document.getElementById('modalIndexTypeId');
  const nameEl = document.getElementById('modalIndexTypeName');
  if (idEl) idEl.value = "";
  if (nameEl) nameEl.value = "";
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
  const titleEl = document.getElementById('indexTypeModalTitle');
  if (titleEl) titleEl.innerText = appLang === 'en' ? "Add Category" : "เพิ่มหมวดหมู่";
  if (window.indexTypeModalInstance) window.indexTypeModalInstance.show();
};

window.openEditIndexTypeModal = function(id, name) {
  const idEl = document.getElementById('modalIndexTypeId');
  const nameEl = document.getElementById('modalIndexTypeName');
  if (idEl) idEl.value = id;
  if (nameEl) nameEl.value = name;
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
  const titleEl = document.getElementById('indexTypeModalTitle');
  if (titleEl) titleEl.innerText = appLang === 'en' ? "Edit Category" : "แก้ไขหมวดหมู่";
  if (window.indexTypeModalInstance) window.indexTypeModalInstance.show();
};

window.handleSaveIndexType = async function(e) {
  e.preventDefault();
  const id = document.getElementById('modalIndexTypeId') ? document.getElementById('modalIndexTypeId').value : '';
  const name = document.getElementById('modalIndexTypeName') ? document.getElementById('modalIndexTypeName').value.trim() : '';
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';

  const isDuplicate = window.globalIndexTypes.some(t => t.Name.toLowerCase() === name.toLowerCase() && t.IndexType_ID !== id);
  if (isDuplicate) {
      var msgDup = appLang === 'en' ? `Cannot save! The category "${name}" already exists.` : `ชื่อหมวดหมู่ "${name}" มีอยู่ในระบบแล้ว`;
      if (window.showToast) return window.showToast(msgDup, "warning");
      else return alert(msgDup);
  }

  const btn = document.getElementById('btnSaveIndexType');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }

  let crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
  const payload = { Name: name, Whoupdated: crmUser ? crmUser.Email : "Unknown" };

  try {
    if (!navigator.onLine) throw new Error("OFFLINE_MODE");

    if (id) {
      const { error } = await supabaseClient.from('IndexType').update(payload).eq('IndexType_ID', id);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from('IndexType').insert([payload]);
      if (error) throw error;
    }
    
    if (window.showToast) window.showToast(appLang === 'en' ? "Category saved successfully." : "บันทึกหมวดหมู่เรียบร้อย", "success");
    if (window.indexTypeModalInstance) window.indexTypeModalInstance.hide();
    window.loadAllIndexData();
  } catch (err) { 
      var isNetworkError = err.message === "OFFLINE_MODE" || err.message.indexOf('Failed to fetch') !== -1 || err.message.indexOf('NetworkError') !== -1;
      if (isNetworkError) {
          var queue = JSON.parse(localStorage.getItem('crmOfflineIndexQueue') || '[]');
          queue.push({ table: 'IndexType', id: id || null, payload: payload, timestamp: Date.now() });
          localStorage.setItem('crmOfflineIndexQueue', JSON.stringify(queue));
          
          var msgOfflineSave = appLang === 'en' 
              ? "📶 Offline Mode: Category saved locally and will auto-sync when online."
              : "📶 โหมดออฟไลน์: บันทึกหมวดหมู่ลงเครื่องแล้ว และจะอัปเดตอัตโนมัติเมื่อออนไลน์";
          if (window.showToast) window.showToast(msgOfflineSave, "warning");
          
          if (window.indexTypeModalInstance) window.indexTypeModalInstance.hide();
      } else {
          if (window.showToast) window.showToast((appLang === 'en' ? "Save failed: " : "เกิดข้อผิดพลาด: ") + err.message, "error");
      }
  } 
  finally { 
      if (btn) { btn.disabled = false; btn.innerHTML = appLang === 'en' ? "Save" : "บันทึก"; }
  }
};

window.populateIndexTypeDropdowns = function() {
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
  let opts = '<option value="">- ' + (appLang === 'en' ? 'Select Category' : 'เลือกหมวดหมู่') + ' -</option>';
  let filterOpts = '<option value="">- ' + (appLang === 'en' ? 'All Categories' : 'ทุกหมวดหมู่') + ' -</option>';
  
  window.globalIndexTypes.forEach(t => {
    opts += `<option value="${t.IndexType_ID}">${t.Name}</option>`;
    filterOpts += `<option value="${t.IndexType_ID}">${t.Name}</option>`;
  });

  const modalSelect = document.getElementById('modalIndexSelectType');
  const filterEl = document.getElementById('filterIndexType');
  
  if (modalSelect) modalSelect.innerHTML = opts;
  if (filterEl) {
      const currentFilter = filterEl.value;
      filterEl.innerHTML = filterOpts;
      filterEl.value = currentFilter;
  }
};

window.sortIndexes = function(col) {
  if (window.indexSortCol === col) {
    window.indexSortAsc = !window.indexSortAsc;
  } else {
    window.indexSortCol = col;
    window.indexSortAsc = true;
  }

  const cols = ['category', 'value', 'value1', 'value2'];
  cols.forEach(c => {
    const icon = document.getElementById('icon-sort-' + c);
    if (icon) {
      if (c === window.indexSortCol) {
        icon.className = window.indexSortAsc ? 'fa-solid fa-sort-up text-primary ms-1' : 'fa-solid fa-sort-down text-primary ms-1';
      } else {
        icon.className = 'fa-solid fa-sort text-muted ms-1';
      }
    }
  });

  window.indexCurrentPage = 1; 
  window.renderIndexTable();
};

window.filterIndexValues = function() {
  const filterEl = document.getElementById('filterIndexType');
  const typeTerm = filterEl ? filterEl.value : '';
  
  window.globalFilteredIndexes = window.globalIndexes.filter(i => {
    return (typeTerm === "") || (i.IndexType_ID === typeTerm);
  });

  window.indexCurrentPage = 1; 
  window.renderIndexTable();
};

window.renderIndexTable = function() {
  const filterEl = document.getElementById('filterIndexType');
  const typeTerm = filterEl ? filterEl.value : '';
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
  
  let selectedTypeName = "";
  if (typeTerm) {
     const tObj = window.globalIndexTypes.find(t => t.IndexType_ID === typeTerm);
     if (tObj) selectedTypeName = tObj.Name.toLowerCase();
  }

  const thValue1 = document.getElementById('thValue1');
  const thValue2 = document.getElementById('thValue2');
  
  const lblThValue = document.getElementById('lblThValue');
  const lblThValue1 = document.getElementById('lblThValue1');
  const lblThValue2 = document.getElementById('lblThValue2');

  if (lblThValue && lblThValue1 && lblThValue2 && thValue1 && thValue2) {
    if (selectedTypeName === 'province') {
        lblThValue.innerText = appLang === 'en' ? "Province" : "จังหวัด";
        lblThValue1.innerText = appLang === 'en' ? "Zone" : "โซน/ภาค";
        thValue1.classList.remove('d-none');
        thValue2.classList.add('d-none');
    } else if (selectedTypeName === 'public holiday' || selectedTypeName === 'holiday' || selectedTypeName === 'company event' || selectedTypeName === 'corporate holiday') {
        lblThValue.innerText = appLang === 'en' ? "Date" : "วันที่";        
        lblThValue1.innerText = "Description (TH)"; 
        lblThValue2.innerText = "Description (EN)"; 
        thValue1.classList.remove('d-none');
        thValue2.classList.remove('d-none');        
    } else if (
        selectedTypeName === 'purpose' || 
        selectedTypeName === 'title' || 
        selectedTypeName === 'tot type' || 
        selectedTypeName === 'tottype' ||
        selectedTypeName === 'specialty' || 
        selectedTypeName === 'doctor type' || 
        selectedTypeName === 'doctortype'
    ) { 
        lblThValue.innerText = "Value (TH)";    
        lblThValue1.innerText = "Value (EN)";   
        thValue1.classList.remove('d-none'); 
        thValue2.classList.add('d-none');   
    } else if (selectedTypeName === 'samples' || selectedTypeName === 'sample' || selectedTypeName === 'promo item' || selectedTypeName === 'samples & promo items') {
        lblThValue.innerText = appLang === 'en' ? "Sample Name (TH)" : "ชื่อสินค้าตัวอย่าง (TH)";    
        lblThValue1.innerText = appLang === 'en' ? "Sample Name (EN)" : "ชื่อสินค้าตัวอย่าง (EN)";   
        thValue1.classList.remove('d-none'); 
        thValue2.classList.add('d-none');   
    } else {
        lblThValue.innerText = appLang === 'en' ? "Value" : "ข้อมูล";
        thValue1.classList.add('d-none');
        thValue2.classList.add('d-none');
    }
  }

  const tbody = document.getElementById('indexTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const paginationContainer = document.getElementById('indexPaginationContainer');
  
  if(!window.globalFilteredIndexes || window.globalFilteredIndexes.length === 0) {
    var msgEmpty = appLang === 'en' ? 'No values found. Please add a new value.' : 'ไม่พบข้อมูล กรุณาเพิ่มข้อมูลใหม่';
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted py-5"><i class="fa-solid fa-folder-open fs-3 mb-2 d-block opacity-50"></i>${msgEmpty}</td></tr>`;
    
    // 🌟 ถอดการสั่งซ่อนออก เพื่อคงขนาดพื้นที่ให้เท่ากันเสมอกับการ์ดฝั่งซ้าย
    if(paginationContainer) paginationContainer.classList.remove('d-none');
    return;
  }

  if(paginationContainer) paginationContainer.classList.remove('d-none');

  window.globalFilteredIndexes.sort((a, b) => {
      let valA = '', valB = '';
      
      if (window.indexSortCol === 'category') {
          const tA = window.globalIndexTypes.find(t => t.IndexType_ID === a.IndexType_ID);
          const tB = window.globalIndexTypes.find(t => t.IndexType_ID === b.IndexType_ID);
          valA = (tA ? tA.Name : '').toLowerCase();
          valB = (tB ? tB.Name : '').toLowerCase();
      } else if (window.indexSortCol === 'value') {
          valA = (a.Value || '').toLowerCase();
          valB = (b.Value || '').toLowerCase();
      } else if (window.indexSortCol === 'value1') {
          valA = (a.Value1 || '').toLowerCase();
          valB = (b.Value1 || '').toLowerCase();
      } else if (window.indexSortCol === 'value2') {
          valA = (a.Value2 || '').toLowerCase();
          valB = (b.Value2 || '').toLowerCase();
      }

      if (valA < valB) return window.indexSortAsc ? -1 : 1;
      if (valA > valB) return window.indexSortAsc ? 1 : -1;
      return 0;
  });

  const totalItems = window.globalFilteredIndexes.length;
  const totalPages = Math.ceil(totalItems / window.indexRowsPerPage) || 1;
  if (window.indexCurrentPage > totalPages) window.indexCurrentPage = totalPages;
  if (window.indexCurrentPage < 1) window.indexCurrentPage = 1;

  const startIndex = (window.indexCurrentPage - 1) * window.indexRowsPerPage;
  const endIndex = Math.min(startIndex + window.indexRowsPerPage, totalItems);
  
  var textShowing = appLang === 'en' ? `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} entries` : `แสดง ${startIndex + 1} ถึง ${endIndex} จาก ${totalItems} รายการ`;
  const infoEl = document.getElementById('indexPageInfo');
  if (infoEl) infoEl.innerText = textShowing;

  const paginatedData = window.globalFilteredIndexes.slice(startIndex, endIndex);

  paginatedData.forEach(i => {
    const typeObj = window.globalIndexTypes.find(t => t.IndexType_ID === i.IndexType_ID);
    const typeName = typeObj ? typeObj.Name : i.IndexType_ID;

    let rowHtml = `<tr><td class="text-start ps-4 text-secondary"><span class="badge badge-soft-secondary">${typeName}</span></td>`;
    rowHtml += `<td class="fw-bold text-dark">${i.Value || '-'}</td>`;

    if (thValue1 && !thValue1.classList.contains('d-none')) {
        if (selectedTypeName === 'province') {
            rowHtml += `<td><span class="badge badge-soft-primary">${i.Value1 || '-'}</span></td>`;
        } else {
            rowHtml += `<td><div class="text-muted small desc-wrap">${i.Value1 || '-'}</div></td>`;
        }
    }
    
    if (thValue2 && !thValue2.classList.contains('d-none')) {
       rowHtml += `<td><div class="text-muted small desc-wrap">${i.Value2 || '-'}</div></td>`;
    }

    const safeVal = (i.Value || '').replace(/'/g, "\\'");
    const safeVal1 = (i.Value1 || '').replace(/'/g, "\\'");
    const safeVal2 = (i.Value2 || '').replace(/'/g, "\\'");

    rowHtml += `
        <td>
          <button class="btn btn-sm btn-light border fw-bold rounded-pill px-3 shadow-xs text-primary" onclick="window.openEditIndexModal('${i.Index_ID}', '${i.IndexType_ID}', '${safeVal}', '${safeVal1}', '${safeVal2}')"><i class="fa-solid fa-pen"></i></button>
        </td>
      </tr>`;
    
    tbody.innerHTML += rowHtml;
  });

  window.renderIndexPaginationControls(totalPages);
};

window.changeIndexRowsPerPage = function() {
  const selectEl = document.getElementById('indexRowsPerPage');
  if (selectEl) {
    window.indexRowsPerPage = parseInt(selectEl.value) || 10;
    window.indexCurrentPage = 1;
    window.renderIndexTable();
  }
};

window.goToIndexPage = function(page) {
  const totalPages = Math.ceil(window.globalFilteredIndexes.length / window.indexRowsPerPage) || 1;
  if (page < 1 || page > totalPages) return;
  window.indexCurrentPage = page;
  window.renderIndexTable();
};

window.renderIndexPaginationControls = function(totalPages) {
  const ul = document.getElementById('indexPagination');
  if (!ul) return;
  let html = '';

  html += '<li class="page-item ' + (window.indexCurrentPage === 1 ? 'disabled' : '') + '">' +
            '<a class="page-link shadow-sm" href="#" onclick="window.goToIndexPage(' + (window.indexCurrentPage - 1) + '); return false;">&laquo;</a>' +
          '</li>';

  let startPage = Math.max(1, window.indexCurrentPage - 2);
  let endPage = Math.min(totalPages, window.indexCurrentPage + 2);

  if (startPage > 1) {
      html += '<li class="page-item"><a class="page-link shadow-sm" href="#" onclick="window.goToIndexPage(1); return false;">1</a></li>';
      if (startPage > 2) html += '<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>';
  }

  for (let i = startPage; i <= endPage; i++) {
      html += '<li class="page-item ' + (window.indexCurrentPage === i ? 'active' : '') + '">' +
                '<a class="page-link shadow-sm" href="#" onclick="window.goToIndexPage(' + i + '); return false;">' + i + '</a>' +
              '</li>';
  }

  if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>';
      html += '<li class="page-item"><a class="page-link shadow-sm" href="#" onclick="window.goToIndexPage(' + totalPages + '); return false;">' + totalPages + '</a></li>';
  }

  html += '<li class="page-item ' + (window.indexCurrentPage === totalPages ? 'disabled' : '') + '">' +
            '<a class="page-link shadow-sm" href="#" onclick="window.goToIndexPage(' + (window.indexCurrentPage + 1) + '); return false;">&raquo;</a>' +
          '</li>';

  ul.innerHTML = html;
};

window.setupDynamicModalForm = function(typeId, prefillVal1, prefillVal2) {
    var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
    const tObj = window.globalIndexTypes.find(t => t.IndexType_ID === typeId);
    const typeName = tObj ? tObj.Name.toLowerCase() : "";

    const inputValMain = document.getElementById('modalIndexValue');
    const lblVal = document.getElementById('lblValue');
    
    const grpVal1 = document.getElementById('groupValue1');
    const lblVal1 = document.getElementById('lblValue1');
    const inputVal1 = document.getElementById('modalIndexValue1_input');
    const selectVal1 = document.getElementById('modalIndexValue1_select');
    
    const grpVal2 = document.getElementById('groupValue2');
    const lblVal2 = document.getElementById('lblValue2');
    const inputVal2 = document.getElementById('modalIndexValue2');

    if (inputValMain) inputValMain.type = 'text'; 
    if (inputVal1) { inputVal1.type = 'text'; inputVal1.value = prefillVal1 || ''; }
    if (inputVal2) inputVal2.value = prefillVal2 || '';
    if (selectVal1) { selectVal1.innerHTML = ''; selectVal1.value = ''; }

    if (typeName === 'province') {
        if (lblVal) lblVal.innerHTML = (appLang === 'en' ? 'Province ' : 'จังหวัด ') + '<span class="text-danger">*</span>';
        if (lblVal1) lblVal1.innerHTML = appLang === 'en' ? 'Zone' : 'โซน/ภาค';
        
        if (inputVal1) inputVal1.classList.add('d-none');
        if (selectVal1) selectVal1.classList.remove('d-none');
        if (grpVal1) grpVal1.classList.remove('d-none');
        if (grpVal2) grpVal2.classList.add('d-none');

        const zoneType = window.globalIndexTypes.find(t => t.Name.toLowerCase() === 'zone');
        if (zoneType) {
            const zones = window.globalIndexes.filter(i => i.IndexType_ID === zoneType.IndexType_ID);
            let opts = '<option value="">- ' + (appLang === 'en' ? 'Select Zone' : 'เลือกโซน') + ' -</option>';
            zones.forEach(z => { opts += `<option value="${z.Value}">${z.Value}</option>`; });
            if (selectVal1) {
              selectVal1.innerHTML = opts;
              if (prefillVal1) selectVal1.value = prefillVal1;
            }
        }
    } 
    else if (typeName === 'public holiday' || typeName === 'holiday' || typeName === 'company event' || typeName === 'corporate holiday') {
        if (lblVal) lblVal.innerHTML = (appLang === 'en' ? 'Date ' : 'วันที่ ') + '<span class="text-danger">*</span>'; 
        if (inputValMain) inputValMain.type = 'date'; 
        
        if (lblVal1) lblVal1.innerHTML = 'Description (TH)'; 
        if (inputVal1) { inputVal1.type = 'text'; inputVal1.classList.remove('d-none'); }
        if (selectVal1) selectVal1.classList.add('d-none');
        
        if (lblVal2) lblVal2.innerHTML = 'Description (EN)'; 
        if (inputVal2) inputVal2.type = 'text';
        
        if (grpVal1) grpVal1.classList.remove('d-none');
        if (grpVal2) grpVal2.classList.remove('d-none');     
    } 
    else if (
        typeName === 'purpose' || 
        typeName === 'title' || 
        typeName === 'tot type' || 
        typeName === 'tottype' || 
        typeName === 'specialty' || 
        typeName === 'doctor type' || 
        typeName === 'doctortype'
    ) { 
        if (lblVal) lblVal.innerHTML = 'Value (TH) <span class="text-danger">*</span>'; 
        
        if (lblVal1) lblVal1.innerHTML = 'Value (EN)'; 
        if (inputVal1) { inputVal1.type = 'text'; inputVal1.classList.remove('d-none'); }
        if (selectVal1) selectVal1.classList.add('d-none');
        
        if (grpVal1) grpVal1.classList.remove('d-none');
        if (grpVal2) grpVal2.classList.add('d-none'); 
    }
    else if (typeName === 'samples' || typeName === 'sample' || typeName === 'promo item' || typeName === 'samples & promo items') {
        if (lblVal) lblVal.innerHTML = 'Sample Name (TH) <span class="text-danger">*</span>'; 
        
        if (lblVal1) lblVal1.innerHTML = 'Sample Name (EN)'; 
        if (inputVal1) { inputVal1.type = 'text'; inputVal1.classList.remove('d-none'); }
        if (selectVal1) selectVal1.classList.add('d-none');
        
        if (grpVal1) grpVal1.classList.remove('d-none');
        if (grpVal2) grpVal2.classList.add('d-none'); 
    }
    else {
        if (lblVal) lblVal.innerHTML = (appLang === 'en' ? 'Value ' : 'ข้อมูล ') + '<span class="text-danger">*</span>';
        if (grpVal1) grpVal1.classList.add('d-none');
        if (grpVal2) grpVal2.classList.add('d-none');
    }
};

window.openAddIndexModal = function() {
  const filterEl = document.getElementById('filterIndexType');
  const currentFilterType = filterEl ? filterEl.value : '';
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
  
  if(!currentFilterType) {
      var msgErr = appLang === 'en' ? "Please select a Specific Category from the dropdown first." : "กรุณาเลือกหมวดหมู่ที่ต้องการจากช่องตัวกรองด้านซ้ายก่อน";
      if (window.showToast) window.showToast(msgErr, "warning");
      else alert("❌ " + msgErr);
      return;
  }
  
  const idEl = document.getElementById('modalIndexId');
  const selEl = document.getElementById('modalIndexSelectType');
  const valEl = document.getElementById('modalIndexValue');
  const titleEl = document.getElementById('indexModalTitle');

  if (idEl) idEl.value = "";
  if (selEl) selEl.value = currentFilterType; 
  if (valEl) valEl.value = "";
  if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-plus me-2"></i>' + (appLang === 'en' ? 'Add Value' : 'เพิ่มข้อมูล');
  
  window.setupDynamicModalForm(currentFilterType, '', '');
  if (window.indexModalInstance) window.indexModalInstance.show();
};

window.openEditIndexModal = function(id, typeId, val, val1, val2) {
  const idEl = document.getElementById('modalIndexId');
  const selEl = document.getElementById('modalIndexSelectType');
  const valEl = document.getElementById('modalIndexValue');
  const titleEl = document.getElementById('indexModalTitle');

  if (idEl) idEl.value = id;
  if (selEl) selEl.value = typeId;
  if (valEl) valEl.value = val;
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
  if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-pen me-2"></i>' + (appLang === 'en' ? 'Edit Value' : 'แก้ไขข้อมูล');
  
  window.setupDynamicModalForm(typeId, val1, val2);
  if (window.indexModalInstance) window.indexModalInstance.show();
};

window.handleSaveIndex = async function(e) {
  e.preventDefault();
  const id = document.getElementById('modalIndexId') ? document.getElementById('modalIndexId').value : '';
  const typeId = document.getElementById('modalIndexSelectType') ? document.getElementById('modalIndexSelectType').value : '';
  const val = document.getElementById('modalIndexValue') ? document.getElementById('modalIndexValue').value.trim() : '';
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';

  let val1 = null;
  let val2 = null;

  const tObj = window.globalIndexTypes.find(t => t.IndexType_ID === typeId);
  const typeName = tObj ? tObj.Name.toLowerCase() : "";

  const input1 = document.getElementById('modalIndexValue1_input');
  const select1 = document.getElementById('modalIndexValue1_select');
  const input2 = document.getElementById('modalIndexValue2');

  if (typeName === 'province') {
      val1 = select1 ? select1.value : null;
  } else if (typeName === 'public holiday' || typeName === 'holiday' || typeName === 'company event' || typeName === 'corporate holiday') {
      val1 = input1 ? input1.value.trim() : null;
      val2 = input2 ? input2.value.trim() : null; 
  } else if (
      typeName === 'purpose' || 
      typeName === 'title' || 
      typeName === 'tot type' || 
      typeName === 'tottype' || 
      typeName === 'specialty' || 
      typeName === 'doctor type' || 
      typeName === 'doctortype' || 
      typeName === 'samples' || 
      typeName === 'sample' || 
      typeName === 'promo item' || 
      typeName === 'samples & promo items'
  ) {
      val1 = input1 ? input1.value.trim() : null;
      val2 = null;
  } else {
      const grp1 = document.getElementById('groupValue1');
      const grp2 = document.getElementById('groupValue2');
      if (grp1 && !grp1.classList.contains('d-none')) {
          val1 = input1 ? input1.value.trim() : null;
      }
      if (grp2 && !grp2.classList.contains('d-none')) {
          val2 = input2 ? input2.value.trim() : null;
      }
  }

  const isDuplicate = window.globalIndexes.some(i => i.IndexType_ID === typeId && i.Value.toLowerCase() === val.toLowerCase() && i.Index_ID !== id);
  if (isDuplicate) {
      var msgDup = "";
      if (typeName === 'public holiday' || typeName === 'holiday' || typeName === 'company event' || typeName === 'corporate holiday') {
          msgDup = appLang === 'en' ? `Cannot save! An event on the date "${val}" already exists.` : `วันหยุด/กิจกรรมในวันที่ "${val}" มีอยู่ในระบบแล้ว`;
      } else {
          msgDup = appLang === 'en' ? `Cannot save! The value "${val}" already exists.` : `ข้อมูล "${val}" มีอยู่ในระบบแล้ว`;
      }
      if (window.showToast) return window.showToast(msgDup, "warning");
      else return alert("❌ " + msgDup);
  }

  const btn = document.getElementById('btnSaveIndex');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }

  let crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
  const payload = {
    IndexType_ID: typeId,
    Value: val,
    Value1: val1,
    Value2: val2,
    Whoupdated: crmUser ? crmUser.Email : "Unknown",
    Whenupdated: new Date().toISOString()
  };

  try {
    if (!navigator.onLine) throw new Error("OFFLINE_MODE");

    if (id) {
      const { error } = await supabaseClient.from('Index').update(payload).eq('Index_ID', id);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from('Index').insert([payload]);
      if (error) throw error;
    }
    
    if (window.showToast) window.showToast(appLang === 'en' ? "Value saved successfully." : "บันทึกข้อมูลเรียบร้อย", "success");
    if (window.indexModalInstance) window.indexModalInstance.hide();
    window.loadAllIndexData();
  } catch (err) { 
      var isNetworkError = err.message === "OFFLINE_MODE" || err.message.indexOf('Failed to fetch') !== -1 || err.message.indexOf('NetworkError') !== -1;
      if (isNetworkError) {
          var queue = JSON.parse(localStorage.getItem('crmOfflineIndexQueue') || '[]');
          queue.push({ table: 'Index', id: id || null, payload: payload, timestamp: Date.now() });
          localStorage.setItem('crmOfflineIndexQueue', JSON.stringify(queue));
          
          var msgOfflineSave = appLang === 'en' 
              ? "📶 Offline Mode: Value saved locally and will auto-sync when online."
              : "📶 โหมดออฟไลน์: บันทึกข้อมูลลงเครื่องแล้ว และจะอัปเดตอัตโนมัติเมื่อออนไลน์";
          if (window.showToast) window.showToast(msgOfflineSave, "warning");
          
          if (window.indexModalInstance) window.indexModalInstance.hide();
      } else {
          if (window.showToast) window.showToast((appLang === 'en' ? "Save failed: " : "เกิดข้อผิดพลาด: ") + err.message, "error");
      }
  } 
  finally { 
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-save me-1"></i> ' + (appLang === 'en' ? "Save" : "บันทึก"); }
  }
};

window.saveVisitFeatures = async function() {
  const btn = document.getElementById('btnSaveVisitFeatures');
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }

  const isGps = document.getElementById('toggleGps') ? document.getElementById('toggleGps').checked : true;
  const isAtt = document.getElementById('toggleAttachment') ? document.getElementById('toggleAttachment').checked : true;
  const isSig = document.getElementById('toggleSignature') ? document.getElementById('toggleSignature').checked : true;
  const tgSmp = document.getElementById('toggleSamples');

  let crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
  const who = crmUser ? (crmUser.Email || crmUser.Rep_Name || "User") : "Unknown";
  const now = new Date().toISOString();

  const payloads = [
      { Type: 'VisitConfig_GPS', Status: isGps, Whoupdated: who, Whenupdated: now },
      { Type: 'VisitConfig_Attachment', Status: isAtt, Whoupdated: who, Whenupdated: now },
      { Type: 'VisitConfig_Signature', Status: isSig, Whoupdated: who, Whenupdated: now },
      { Type: 'VisitConfig_Samples', Status: tgSmp ? tgSmp.checked : true, Whoupdated: who, Whenupdated: now }
  ];

  try {
      if (!navigator.onLine) throw new Error("OFFLINE_MODE");
      
      for (let i = 0; i < payloads.length; i++) {
          const p = payloads[i];
          const conf = window.globalSystemSettings ? window.globalSystemSettings.find(s => s.Type === p.Type) : null;
          if (conf) {
              await window.supabaseClient.from('System_Settings').update({ Status: p.Status, Whoupdated: p.Whoupdated, Whenupdated: p.Whenupdated }).eq('Type', p.Type);
          } else {
              await window.supabaseClient.from('System_Settings').insert([p]);
          }
      }

      const { data } = await window.supabaseClient.from('System_Settings').select('*');
      if (data) window.globalSystemSettings = data;

      if (btn) {
        btn.classList.replace('btn-premium-primary', 'btn-success');
        btn.innerHTML = '<i class="fa-solid fa-check"></i> ' + (appLang === 'en' ? 'Saved' : 'บันทึกแล้ว');
      }
      
      var saveText = appLang === 'en' ? 'Save' : 'บันทึก';
      setTimeout(() => { 
        if (btn) {
          btn.classList.replace('btn-success', 'btn-premium-primary'); 
          btn.innerHTML = '<i class="fa-solid fa-save me-1"></i> ' + saveText; 
          btn.disabled = false; 
        }
      }, 2000);
      
      if (window.showToast) window.showToast(appLang === 'en' ? "Visit features saved successfully." : "บันทึกการตั้งค่าฟีเจอร์เรียบร้อย", "success");
  } catch (err) {
      var isNetworkError = err.message === "OFFLINE_MODE" || err.message.indexOf('Failed to fetch') !== -1 || err.message.indexOf('NetworkError') !== -1;
      if (isNetworkError) {
          var queue = JSON.parse(localStorage.getItem('crmOfflineIndexQueue') || '[]');
          payloads.forEach(p => queue.push({ table: 'System_Settings', type: p.Type, payload: p, timestamp: Date.now() }));
          localStorage.setItem('crmOfflineIndexQueue', JSON.stringify(queue));
          
          if (window.showToast) window.showToast(appLang === 'en' ? "📶 Offline Mode: Saved locally and will auto-sync." : "📶 โหมดออฟไลน์: บันทึกการตั้งค่าลงเครื่องแล้ว", "warning");
      } else {
          if (window.showToast) window.showToast((appLang === 'en' ? "Failed to save: " : "เกิดข้อผิดพลาด: ") + err.message, "error");
      }
      var saveText = appLang === 'en' ? 'Save' : 'บันทึก';
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-save me-1"></i> ' + saveText; }
  }
};

window.syncOfflineIndexes = async function() {
  if (!navigator.onLine) return;
  var queue = JSON.parse(localStorage.getItem('crmOfflineIndexQueue') || '[]');
  if (queue.length === 0) return;

  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  var msgSyncing = appLang === 'en' 
      ? "🔄 Back Online: Syncing offline settings to server..." 
      : "🔄 กลับมาออนไลน์: กำลังซิงค์การตั้งค่าออฟไลน์ไปยังเซิร์ฟเวอร์...";

  if (window.showToast) window.showToast(msgSyncing, "info");
  
  var remainingQueue = [];
  var successCount = 0;

  for (var i = 0; i < queue.length; i++) {
      var item = queue[i];
      try {
          if (item.table === 'System_Settings') {
              const { data } = await window.supabaseClient.from('System_Settings').select('Type').eq('Type', item.type);
              if (data && data.length > 0) {
                  await window.supabaseClient.from('System_Settings').update(item.payload).eq('Type', item.type);
              } else {
                  await window.supabaseClient.from('System_Settings').insert([item.payload]);
              }
          } else if (item.table === 'IndexType') {
              if (item.id) {
                  await window.supabaseClient.from('IndexType').update(item.payload).eq('IndexType_ID', item.id);
              } else {
                  await window.supabaseClient.from('IndexType').insert([item.payload]);
              }
          } else if (item.table === 'Index') {
              if (item.id) {
                  await window.supabaseClient.from('Index').update(item.payload).eq('Index_ID', item.id);
              } else {
                  await window.supabaseClient.from('Index').insert([item.payload]);
              }
          }
          successCount++;
      } catch (err) {
          console.error("Offline sync failed for item:", item, err);
          remainingQueue.push(item);
      }
  }

  localStorage.setItem('crmOfflineIndexQueue', JSON.stringify(remainingQueue));
  if (successCount > 0) {
      var msgSuccess = appLang === 'en' 
          ? "✅ Successfully synced " + successCount + " offline settings." 
          : "✅ ซิงค์การตั้งค่าออฟไลน์สำเร็จ " + successCount + " รายการ";
          
      if (window.showToast) window.showToast(msgSuccess, "success");
      if (typeof window.loadAllIndexData === 'function') window.loadAllIndexData();
  }
};

window.addEventListener('online', window.syncOfflineIndexes);
setTimeout(function() { window.syncOfflineIndexes(); }, 2000);
