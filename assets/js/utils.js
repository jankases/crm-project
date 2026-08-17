// =========================================
// CRM System - Utility Functions (ฟังก์ชันอเนกประสงค์)
// =========================================

// 1. ฟังก์ชันโชว์แจ้งเตือนป๊อปอัป (Toast)
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

// 2. ฟังก์ชันสุ่มรหัส ID (UUID Generator)
window.generateUUID = function() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
};

// 3. ฟังก์ชันแปลงวันที่ให้สวยงาม (Date Formatter)
window.formatDateToLocal = function(dateStr) {
  if (!dateStr) return '-';
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(); 
};

// 4. ฟังก์ชันแปลงเวลา (Time Formatter)
window.formatTimeString = function(timeStr) {
  if (!timeStr) return '';
  var str = String(timeStr).trim();
  if (str.indexOf(':') !== -1) {
    var parts = str.split(':');
    return parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0');
  }
  return str;
};

// 5. ฟังก์ชันไฮไลท์คำค้นหา (Search Highlighter)
window.applySearchHighlight = function(text, searchKeyword) {
  if (!text) return '-';
  if (!searchKeyword || searchKeyword.trim() === '') return text;
  
  var div = document.createElement('div');
  div.innerText = text;
  var safeText = div.innerHTML;

  var keywords = searchKeyword.trim().toLowerCase().split(' ').filter(function(k) { return k !== ''; });

  keywords.forEach(function(kw) {
    if (!kw) return;
    var regex = new RegExp('(' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![^<]*>)', 'gi');
    safeText = safeText.replace(regex, '<mark class="highlight-text">$1</mark>');
  });

  return safeText;
};

// =========================================
// 6. ฟังก์ชันดูดข้อมูลจาก Supabase แบบทะลุ Limit 1000 แถว (เวอร์ชัน Fast-Cache & Safe Query)
// =========================================
window.fetchAllRecords = async function(tableName, queryModifier) {
    // ⚡ เช็กก่อนว่ามีข้อมูลแคชเดิมอยู่ใน RAM หรือยัง
    if (window.VisitManagerCache && window.VisitManagerCache[tableName] && !queryModifier) {
        return window.VisitManagerCache[tableName];
    }

    var allData = [];
    var start = 0;
    var step = 1000;
    while (true) {
        // 🚀 [FIXED]: แยกฐาน Query ออกมา เพื่อให้ queryModifier ประมวลผลก่อน .range()
        var baseQuery = window.supabaseClient.from(tableName);
        
        if (typeof queryModifier === 'function') {
            baseQuery = queryModifier(baseQuery);
        } else {
            baseQuery = baseQuery.select('*');
        }

        var res = await baseQuery.range(start, start + step - 1);
        if (res.error) throw res.error;
        
        allData = allData.concat(res.data || []);
        if (!res.data || res.data.length < step) break;
        start += step;
    }

    // เก็บเข้า Memory Cache ไว้ใช้ซ้ำ
    if (window.VisitManagerCache && !queryModifier) {
        window.VisitManagerCache[tableName] = allData;
    }

    return allData;
};

// =========================================
// 7. HELPER กลางสำหรับ Pagination (ใช้ร่วมกันทุกหน้า)
// =========================================
window.renderGlobalPagination = function(ulId, currentPage, totalPages, pageChangeFnName) {
  var ul = document.getElementById(ulId);
  if (!ul) return;
  if (totalPages === Infinity || isNaN(totalPages) || totalPages < 0) return;

  // ดึงภาษาปัจจุบันของระบบ
  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  var prevText = appLang === 'en' ? '&laquo; Prev' : '&laquo; ก่อนหน้า';
  var nextText = appLang === 'en' ? 'Next &raquo;' : 'ถัดไป &raquo;';

  var html = '';

  // ปุ่ม Prev
  html += '<li class="page-item ' + (currentPage === 1 ? 'disabled' : '') + '">' +
            '<a class="page-link shadow-xs" href="#" onclick="window.' + pageChangeFnName + '(' + (currentPage - 1) + '); return false;">' + prevText + '</a>' +
          '</li>';

  var startPage = Math.max(1, currentPage - 2);
  var endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    html += '<li class="page-item"><a class="page-link shadow-xs" href="#" onclick="window.' + pageChangeFnName + '(1); return false;">1</a></li>';
    if (startPage > 2) html += '<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>';
  }

  // ตัวเลขหน้า 1, 2, 3...
  for (var i = startPage; i <= endPage; i++) {
    html += '<li class="page-item ' + (currentPage === i ? 'active' : '') + '">' +
              '<a class="page-link shadow-xs" href="#" onclick="window.' + pageChangeFnName + '(' + i + '); return false;">' + i + '</a>' +
            '</li>';
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>';
    html += '<li class="page-item"><a class="page-link shadow-xs" href="#" onclick="window.' + pageChangeFnName + '(' + totalPages + '); return false;">' + totalPages + '</a></li>';
  }

  // ปุ่ม Next
  html += '<li class="page-item ' + (currentPage >= totalPages || totalPages === 0 ? 'disabled' : '') + '">' +
            '<a class="page-link shadow-xs" href="#" onclick="window.' + pageChangeFnName + '(' + (currentPage + 1) + '); return false;">' + nextText + '</a>' +
          '</li>';

  ul.innerHTML = html;
};
