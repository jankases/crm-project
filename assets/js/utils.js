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
// 6. ฟังก์ชันดูดข้อมูลจาก Supabase แบบทะลุ Limit 1000 แถว
// =========================================
window.fetchAllRecords = async function(tableName, queryModifier) {
    var allData = [];
    var start = 0;
    var step = 1000;
    while (true) {
        // ใช้ window.supabaseClient ที่ถูกประกาศไว้ใน config.js
        var query = window.supabaseClient.from(tableName).select('*').range(start, start + step - 1);
        if (queryModifier) query = queryModifier(query);
        
        var res = await query;
        if (res.error) throw res.error;
        
        allData = allData.concat(res.data || []);
        if (!res.data || res.data.length < step) break;
        start += step;
    }
    return allData;
};
