// assets/js/utils.js

// ⚡ 1. Notification Toast Engine
window.showToast = function(message, type = 'success') {
  var container = document.getElementById('toastContainer');
  if (!container) return;
  var icon = type === 'success' ? 'fa-check-circle text-success' : (type === 'error' ? 'fa-circle-xmark text-danger' : 'fa-circle-exclamation text-warning');
  var toastId = 'toast_' + Date.now();
  var toastHtml = 
    '<div id="' + toastId + '" class="toast align-items-center bg-white border-0 shadow-sm mb-2" role="alert" aria-live="assertive" aria-atomic="true">' +
      '<div class="d-flex p-2">' +
        '<div class="toast-body d-flex align-items-center fw-bold text-dark">' +
          '<i class="fa-solid ' + icon + ' fs-4 me-3"></i> ' +
          '<span style="white-space: pre-line;">' + message + '</span>' +
        '</div>' +
        '<button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>' +
      '</div>' +
    '</div>';
  container.insertAdjacentHTML('beforeend', toastHtml);
  var toastEl = document.getElementById(toastId);
  var toast = new bootstrap.Toast(toastEl, { delay: type === 'error' ? 5000 : 3000 });
  toast.show();
  toastEl.addEventListener('hidden.bs.toast', function () { toastEl.remove(); });
};

// ⚡ 2. UUID Generator
window.generateUUID = function() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
};

// ⚡ 3. Date & Time Formatters
window.formatDateToLocal = function(dateStr) {
  if (!dateStr) return '-';
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(); 
};

window.formatTimeString = function(timeStr) {
  if (!timeStr) return '';
  var str = String(timeStr).trim();
  if (str.indexOf(':') !== -1) {
    var parts = str.split(':');
    return parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0');
  }
  return str;
};

// ⚡ 4. Search Highlight Engine
window.applySearchHighlight = function(text, searchKeyword) {
  if (!text || text === '-') return '-';
  if (!searchKeyword || searchKeyword.trim() === '') return text;

  var div = document.createElement('div');
  div.innerText = text;
  var safeText = div.innerHTML;

  var keywords = searchKeyword.trim().split(/\s+/).filter(function(k) { return k !== ''; });

  keywords.forEach(function(kw) {
    if (!kw) return;
    var regex = new RegExp('(' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    safeText = safeText.replace(regex, '<mark class="highlight-search">$1</mark>');
  });

  return safeText;
};

// ⚡ 5. Global Current User Email Helper (ใช้สำหรับคอลัมน์ Whoupdated)
window.getUserEmail = function() {
  try {
    var u = JSON.parse(sessionStorage.getItem('crmUser'));
    if (u && u.Email) return u.Email;
  } catch (e) {}
  return "User";
};

// ⚡ 6. Optimized Fast-Fetch All Records with Memory Cache
window.globalDataCache = window.globalDataCache || {};

window.clearDataCache = function(tableName) {
  if (tableName) {
    delete window.globalDataCache[tableName];
  } else {
    window.globalDataCache = {};
  }
};

window.fetchAllRecords = async function(tableName, queryModifier) {
    // ใช้ Cache ในหน่วยความจำหากไม่มีการใช้ Query Modifier พิเศษ
    if (window.globalDataCache[tableName] && !queryModifier) {
        return window.globalDataCache[tableName];
    }

    var allData = [];
    var start = 0;
    var step = 1000;
    var sb = window.supabaseClient || window.supabase;

    if (!sb) {
      console.error("Supabase client not initialized.");
      return [];
    }
    
    while (true) {
        var baseQuery = sb.from(tableName).select('*');
        
        if (typeof queryModifier === 'function') {
            var modified = queryModifier(baseQuery);
            if (modified) baseQuery = modified;
        }

        var res = await baseQuery.range(start, start + step - 1);
        if (res.error) throw res.error;
        
        allData = allData.concat(res.data || []);
        if (!res.data || res.data.length < step) break;
        start += step;
    }

    if (!queryModifier) {
        window.globalDataCache[tableName] = allData;
    }

    return allData;
};

// ⚡ 7. Pagination Render Engine
window.renderGlobalPagination = function(ulId, currentPage, totalPages, pageChangeFnName) {
  var ul = document.getElementById(ulId);
  if (!ul) return;
  if (totalPages === Infinity || isNaN(totalPages) || totalPages < 0) return;

  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  var prevText = appLang === 'en' ? '&laquo; Prev' : '&laquo; ก่อนหน้า';
  var nextText = appLang === 'en' ? 'Next &raquo;' : 'ถัดไป &raquo;';

  var html = '';

  html += '<li class="page-item ' + (currentPage === 1 ? 'disabled' : '') + '">' +
            '<a class="page-link shadow-xs" href="javascript:void(0);" onclick="window.' + pageChangeFnName + '(' + (currentPage - 1) + ', event);">' + prevText + '</a>' +
          '</li>';

  var startPage = Math.max(1, currentPage - 2);
  var endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    html += '<li class="page-item"><a class="page-link shadow-xs" href="javascript:void(0);" onclick="window.' + pageChangeFnName + '(1, event);">1</a></li>';
    if (startPage > 2) html += '<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>';
  }

  for (var i = startPage; i <= endPage; i++) {
    html += '<li class="page-item ' + (currentPage === i ? 'active' : '') + '">' +
              '<a class="page-link shadow-xs" href="javascript:void(0);" onclick="window.' + pageChangeFnName + '(' + i + ', event);">' + i + '</a>' +
            '</li>';
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>';
    html += '<li class="page-item"><a class="page-link shadow-xs" href="javascript:void(0);" onclick="window.' + pageChangeFnName + '(' + totalPages + ', event);">' + totalPages + '</a></li>';
  }

  html += '<li class="page-item ' + (currentPage >= totalPages || totalPages === 0 ? 'disabled' : '') + '">' +
            '<a class="page-link shadow-xs" href="javascript:void(0);" onclick="window.' + pageChangeFnName + '(' + (currentPage + 1) + ', event);">' + nextText + '</a>' +
          '</li>';

  ul.innerHTML = html;
};

// =========================================================
// 🌟 Premium Custom Popup Engine (แทนที่ alert / confirm เดิม)
// =========================================================

// 1. ฟังก์ชันแทนที่ confirm() เดิม
window.customConfirm = function(message, onConfirm, title = null, okText = null, cancelText = null) {
  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  const isEN = appLang === 'en';
  
  const defaultTitle = title || (isEN ? 'Confirm Action' : 'ยืนยันการดำเนินการ');
  const defaultOk = okText || (isEN ? 'OK' : 'ตกลง');
  const defaultCancel = cancelText || (isEN ? 'Cancel' : 'ยกเลิก');

  // ตรวจสอบว่ามี Modal อยู่แล้วหรือไม่ ถ้าไม่มีให้สร้างใหม่
  let modalEl = document.getElementById('premiumConfirmModal');
  if (!modalEl) {
    const modalHtml = `
      <div class="modal fade" id="premiumConfirmModal" tabindex="-1" aria-hidden="true" style="z-index: 10500;">
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content border-0 shadow-lg" style="border-radius: 16px;">
            <div class="modal-body p-4 text-center">
              <div class="mb-3">
                <div class="d-inline-flex align-items-center justify-content-center bg-warning-subtle text-warning-emphasis rounded-circle" style="width: 60px; height: 60px;">
                  <i class="fa-solid fa-triangle-exclamation fs-2"></i>
                </div>
              </div>
              <h5 class="fw-bold mb-2 text-dark" id="premiumConfirmTitle"></h5>
              <p class="text-secondary mb-4" id="premiumConfirmMessage" style="font-size: 0.95rem;"></p>
              <div class="d-flex justify-content-center gap-3">
                <button type="button" class="btn btn-light border px-4 rounded-pill fw-bold text-secondary shadow-sm hover-bg-light transition-all" data-bs-dismiss="modal" id="premiumConfirmCancelBtn"></button>
                <button type="button" class="btn btn-primary px-4 rounded-pill fw-bold shadow-sm transition-all" id="premiumConfirmOkBtn"></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modalEl = document.getElementById('premiumConfirmModal');
  }

  // เซ็ตข้อความต่างๆ
  document.getElementById('premiumConfirmTitle').innerText = defaultTitle;
  document.getElementById('premiumConfirmMessage').innerText = message;
  document.getElementById('premiumConfirmCancelBtn').innerText = defaultCancel;
  document.getElementById('premiumConfirmOkBtn').innerText = defaultOk;

  // เคลียร์ Event กดยืนยันตัวเก่าออก (ป้องกันการทำงานซ้ำซ้อน)
  const okBtn = document.getElementById('premiumConfirmOkBtn');
  const newOkBtn = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);

  // สั่งโชว์ Modal
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();

  // ผูก Event ให้รันฟังก์ชันต่อไปเมื่อกดยืนยัน
  newOkBtn.addEventListener('click', function() {
    bsModal.hide();
    if (typeof onConfirm === 'function') {
      setTimeout(onConfirm, 250); // หน่วงเวลานิดนึงให้ Modal ปิดสนิท
    }
  });
};

// 2. ฟังก์ชันแทนที่ alert() เดิม
window.customAlert = function(message, type = "warning", title = null) {
  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  const isEN = appLang === 'en';
  
  const defaultTitle = title || (isEN ? 'Notification' : 'แจ้งเตือน');
  const okText = isEN ? 'OK' : 'ตกลง';

  // กำหนดสีและไอคอนตามประเภท Alert
  let iconClass = 'fa-circle-info text-info-emphasis';
  let bgClass = 'bg-info-subtle';
  let btnClass = 'btn-info text-white';
  
  if (type === 'error') {
      iconClass = 'fa-circle-xmark text-danger-emphasis';
      bgClass = 'bg-danger-subtle';
      btnClass = 'btn-danger';
  } else if (type === 'success') {
      iconClass = 'fa-circle-check text-success-emphasis';
      bgClass = 'bg-success-subtle';
      btnClass = 'btn-success';
  } else if (type === 'warning') {
      iconClass = 'fa-triangle-exclamation text-warning-emphasis';
      bgClass = 'bg-warning-subtle';
      btnClass = 'btn-warning text-dark';
  }

  let modalEl = document.getElementById('premiumAlertModal');
  if (!modalEl) {
    const modalHtml = `
      <div class="modal fade" id="premiumAlertModal" tabindex="-1" aria-hidden="true" style="z-index: 10500;">
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content border-0 shadow-lg" style="border-radius: 16px;">
            <div class="modal-body p-4 text-center">
              <div class="mb-3">
                <div id="premiumAlertIconBg" class="d-inline-flex align-items-center justify-content-center rounded-circle" style="width: 60px; height: 60px;">
                  <i id="premiumAlertIcon" class="fa-solid fs-2"></i>
                </div>
              </div>
              <h5 class="fw-bold mb-2 text-dark" id="premiumAlertTitle"></h5>
              <p class="text-secondary mb-4" id="premiumAlertMessage" style="font-size: 0.95rem;"></p>
              <button type="button" class="btn px-5 rounded-pill fw-bold shadow-sm transition-all" data-bs-dismiss="modal" id="premiumAlertOkBtn"></button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modalEl = document.getElementById('premiumAlertModal');
  }

  document.getElementById('premiumAlertTitle').innerText = defaultTitle;
  document.getElementById('premiumAlertMessage').innerText = message;
  document.getElementById('premiumAlertOkBtn').innerText = okText;
  
  document.getElementById('premiumAlertIconBg').className = `d-inline-flex align-items-center justify-content-center rounded-circle ${bgClass}`;
  document.getElementById('premiumAlertIcon').className = `fa-solid fs-2 ${iconClass}`;
  document.getElementById('premiumAlertOkBtn').className = `btn px-5 rounded-pill fw-bold shadow-sm transition-all ${btnClass}`;

  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
};
