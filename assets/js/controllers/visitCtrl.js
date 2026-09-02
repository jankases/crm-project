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
window.isVisitPageReady = false; 
window.docRecognition = null; 
window.textRecognition = null; 
window.searchRecognition = null;

window.globalVisitConfigs = { gps: true, att: true, sig: true, samples: true };

window.fetchVisitFeaturesConfig = async function() {
    try {
        const { data } = await window.supabaseClient.from('System_Settings').select('*').like('Type', 'VisitConfig_%');
        if (data) {
            const gpsConf = data.find(s => s.Type === 'VisitConfig_GPS');
            const attConf = data.find(s => s.Type === 'VisitConfig_Attachment');
            const sigConf = data.find(s => s.Type === 'VisitConfig_Signature');
            const smpConf = data.find(s => s.Type === 'VisitConfig_Samples');

            window.globalVisitConfigs.gps = gpsConf ? gpsConf.Status !== false : true;
            window.globalVisitConfigs.att = attConf ? attConf.Status !== false : true;
            window.globalVisitConfigs.sig = sigConf ? sigConf.Status !== false : true;
            window.globalVisitConfigs.samples = smpConf ? smpConf.Status !== false : true;
        }
    } catch(e) {}
};

window.applyVisitFeaturesUI = function() {
    const gpsSection = document.getElementById('sectionGpsCheckin');
    const attSection = document.getElementById('sectionAttachments');
    const sigSection = document.getElementById('sectionSignature');
    const smpSection = document.getElementById('sectionSamples');

    if (gpsSection) gpsSection.classList.toggle('d-none', !window.globalVisitConfigs.gps);
    if (attSection) attSection.classList.toggle('d-none', !window.globalVisitConfigs.att);
    if (sigSection) sigSection.classList.toggle('d-none', !window.globalVisitConfigs.sig);
    if (smpSection) smpSection.classList.toggle('d-none', !window.globalVisitConfigs.samples);
};

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
    if (id) {
      window._docIndex[id] = d;
      if (d.Doc_ID) window._docIndex[String(d.Doc_ID).trim()] = d;
    }
  });

  window._prodIndex = {};
  (window.globalProductsList || []).forEach(function(p) {
    var id = String(p.Product_ID || p.id || p.product_id || '').trim().toLowerCase();
    if (id) {
      window._prodIndex[id] = p;
      if (p.Product_ID) window._prodIndex[String(p.Product_ID).trim()] = p;
    }
  });

  window._visitProdIndex = {};
  (window.globalVisitProducts || []).forEach(function(vp) {
    var vid = String(vp.Visit_ID || vp.visit_id || '').trim().toLowerCase();
    if (vid) {
      if (!window._visitProdIndex[vid]) window._visitProdIndex[vid] = [];
      window._visitProdIndex[vid].push(vp);
    }
  });

  window._userIndex = {};
  (window.globalUsersList || []).forEach(function(u) {
    var uid = String(u.Rep_ID || u.User_ID || u.id || '').trim().toLowerCase();
    if (uid) {
      window._userIndex[uid] = u;
      if (u.Rep_ID) window._userIndex[String(u.Rep_ID).trim()] = u;
    }
  });

  window._purposeIndex = {};
  if (window.VisitManagerCache && window.VisitManagerCache.indexes) {
    window.VisitManagerCache.indexes.forEach(function(i) {
      var ixId = String(i.Index_ID || i.id || '').trim().toLowerCase();
      if (ixId) {
        window._purposeIndex[ixId] = i;
        if (i.Index_ID) window._purposeIndex[String(i.Index_ID).trim()] = i;
      }
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
  var ipadBtnEN = document.getElementById('ipadBtnLangEN');
  
  if (btnEN && btnEN.classList.contains('active')) return 'en';
  if (ipadBtnEN && ipadBtnEN.classList.contains('active')) return 'en';
  if (btnEN && btnEN.classList.contains('btn-primary')) return 'en'; // เผื่อกรณี Fallback
  return 'th';
};

// 🌟 ฟังก์ชันจัดการซิงค์สีปุ่ม (ทั้ง iPad และ Desktop จะเปลี่ยนสีพร้อมกัน)
window.switchAppLanguage = function(lang) {
  var isEN = (lang === 'en');
  
  var dEn = document.getElementById('btnLangEN');
  var dTh = document.getElementById('btnLangTH');
  if (dEn && dTh) {
      dEn.classList.toggle('active', isEN);
      dTh.classList.toggle('active', !isEN);
  }

  var iEn = document.getElementById('ipadBtnLangEN');
  var iTh = document.getElementById('ipadBtnLangTH');
  if (iEn && iTh) {
      iEn.classList.toggle('active', isEN);
      iTh.classList.toggle('active', !isEN);
  }

  // เรียกใช้ฟังก์ชันแปลภาษาเดิมที่มีอยู่แล้วในระบบ
  if (typeof setLanguage === 'function') {
      setLanguage(lang);
  }
};

window.getPurposeText = function(purposeId, fallbackText) {
  if (!purposeId) return fallbackText || '-';
  var pObj = window._purposeIndex[String(purposeId).toLowerCase()];
  if (!pObj) return fallbackText || '-';
  var appLang = window.getCurrentAppLang();
  return (appLang === 'en') ? (pObj.Value1 || pObj.Value || '-') : (pObj.Value || pObj.Value1 || '-');
};

/* 🌟 อัปเกรดฟังก์ชันเซ็ตค่า TomSelect ให้ฉลาดขึ้น รองรับ Data Permission (BU Head / Manager) */
window.setTomSelectValue = function(instance, value, fallbackText) {
    if (!instance) return;

    // 1. จำสถานะเดิมไว้ เผื่อฟอร์มโดนล็อก (Read-Only) อยู่
    var wasDisabled = instance.isDisabled;
    
    // ปลดล็อกชั่วคราวเพื่อให้ยัดค่าลงไปได้
    if (wasDisabled) instance.enable(); 

    if (value) {
        // รองรับทั้งกรณีค่าเดียว (หมอ) และค่าที่เป็น Array (สินค้า)
        var values = Array.isArray(value) ? value : [value];
        
        values.forEach(function(val) {
            var strVal = String(val).trim();
            var lowerVal = strVal.toLowerCase();
            var displayText = fallbackText;
            
            // 🌟 [BU Head Fix] ถ้าไม่ได้ส่งชื่อสำรองมา ให้ไปงัดเอาชื่อจาก Cache กลางของระบบ
            if (!displayText || displayText === val) {
                if (window._docIndex && (window._docIndex[lowerVal] || window._docIndex[strVal])) {
                    var docObj = window._docIndex[lowerVal] || window._docIndex[strVal];
                    displayText = (typeof window.getDoctorNameByLang === 'function') 
                                  ? window.getDoctorNameByLang(docObj, strVal) 
                                  : (docObj.Doctor_Name || docObj.Doc_Name_TH || docObj.Doc_Name_EN || strVal);
                } 
                else if (window._prodIndex && (window._prodIndex[lowerVal] || window._prodIndex[strVal])) {
                    var pObj = window._prodIndex[lowerVal] || window._prodIndex[strVal];
                    displayText = pObj.Product || pObj.Product_TH || strVal;
                }
            }

            // 🌟 หัวใจสำคัญ: ถ้าใน Dropdown ไม่มีรายการนี้ (หมอของลูกน้องข้ามเขต) ให้สร้างจำลองขึ้นมาโชว์!
            if (!instance.options[val]) {
                instance.addOption({ 
                    value: val, 
                    text: displayText || val 
                });
            }
        });

        // ยัดค่าลงไปใน Dropdown
        instance.setValue(value);
    } else {
        instance.clear();
    }

    // ล็อกกลับคืนเป็น Read-Only ให้ผู้บริหารเหมือนเดิม
    if (wasDisabled) instance.disable(); 
};

 // 🌟 ฟังก์ชันอัปเดตภาษาของ Purpose Realtime
window.updatePurposeDisplayLang = function() {
  if (!window.tomSelectPurposeInstance) return;
  var currentVal = window.tomSelectPurposeInstance.getValue(); 
  if (!currentVal) return;
  
  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  var pObj = window._purposeIndex ? window._purposeIndex[String(currentVal).toLowerCase()] : null;
  
  if (pObj) {
      var textTh = pObj.Value || '';
      var textEn = pObj.Value1 || textTh;
      var displayVal = (appLang === 'en') ? textEn : textTh;
      
      if (window.tomSelectPurposeInstance.options[currentVal]) {
          window.tomSelectPurposeInstance.options[currentVal].text = displayVal;
      }

      var item = window.tomSelectPurposeInstance.control.querySelector('.item[data-value="'+currentVal+'"]');
      if (item) {
          item.innerText = displayVal;
      } else {
          var singleItem = window.tomSelectPurposeInstance.control.querySelector('.item');
          if (singleItem) singleItem.innerText = displayVal;
      }
  }
};

// 🌟 [FIXED]: ผูก Event Listener สลับภาษา Realtime แบบการันตีไม่รันซ้ำ
if (!window._isAppLangListenerAttached) {
  window.addEventListener('appLanguageChanged', function() {
      if (typeof window.updateLangUI === 'function') window.updateLangUI();
      if (typeof window.updatePurposeDisplayLang === 'function') window.updatePurposeDisplayLang();
  });
  window._isAppLangListenerAttached = true;
}

window.getDoctorNameByLang = function(docObj, defaultId) {
  if (!docObj) return defaultId || '-';
  var lang = window.getCurrentAppLang();
  if (lang === 'en') return docObj.Doc_Name || docObj.doc_name || docObj.name || defaultId || '-';
  var hasQuestionMarks = docObj.Doc_Name_TH && docObj.Doc_Name_TH.indexOf('???') !== -1;
  if (docObj.Doc_Name_TH && !hasQuestionMarks) return docObj.Doc_Name_TH;
  return docObj.Doc_Name || docObj.doc_name || defaultId || '-';
};

 window.getHospitalNameFromDocOrVisit = function(docObj, visitObj) {
  var lang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';

  // 1. อ่านจาก Relations Join (Doctors -> Hospitals) ที่ Supabase ส่งมาให้โดยตรง
  if (docObj && docObj.Hospitals) {
    if (lang === 'en') {
      return docObj.Hospitals.Hospital || docObj.Hospitals.Known_As || '-';
    } else {
      return docObj.Hospitals.Known_As || docObj.Hospitals.Hospital || '-';
    }
  }

  // 2. Fallback อ่านจาก Visit_Logs (กรณีมีบันทึกชื่อไว้ตรงๆ)
  if (visitObj) {
    var directHosp = visitObj.Hospital || visitObj.Hospital_Name || visitObj.hospital;
    if (directHosp && String(directHosp).trim() !== '' && directHosp !== '-') return directHosp;
  }

  return '-';
};

window.updateFormUserInfo = function(repObj, fallbackTerrId, visitData) {
  var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'th';
  
  var repNameShow = '-';
  var locNameShow = '-';
  var labelText = appLang === 'th' ? 'เขตพื้นที่' : 'Territory';

  var targetUser = repObj;
  var userList = window.globalUsersList || (window.VisitManagerCache ? window.VisitManagerCache.users : []) || [];

  if (visitData) {
    var rawWho = String(visitData.Whoupdated || visitData.whoupdated || '').trim().toLowerCase();
    var rawRepId = String(visitData.Rep_ID || visitData.rep_id || '').trim().toLowerCase();

    targetUser = userList.find(function(u) {
      var uem = String(u.Email || u.email || '').trim().toLowerCase();
      var uid = String(u.Rep_ID || u.User_ID || u.id || '').trim().toLowerCase();
      return (rawWho && uem === rawWho) || (rawRepId && uid === rawRepId);
    });
  }

  if (targetUser) {
    repNameShow = targetUser.Rep_Name || targetUser.Name || targetUser.rep_name || '-';
  } else if (visitData) {
    repNameShow = visitData.Rep_Name || visitData.Sales_Rep_Name || '-';
  }

  var cache = window.VisitManagerCache || {};
  var userRole = targetUser ? String(targetUser.Role || targetUser.role || '').trim() : '';
  var userRoleLower = userRole.toLowerCase();
  var rawTerrId = targetUser ? String(targetUser.Territory_ID || targetUser.territory_id || '').trim() : (visitData ? String(visitData.Territory_ID || '').trim() : '');

  if (userRoleLower === 'sales' || userRoleLower === 'sales rep' || userRoleLower === 'rep') {
    labelText = appLang === 'th' ? 'เขตพื้นที่ (Territory)' : 'Territory';
    var terrs = cache.territories || window.globalTerritoryList || [];
    var terObj = terrs.find(function(t) { return String(t.Territory_ID || t.id || t.Territory) === rawTerrId; });
    locNameShow = terObj ? (terObj.Territory || terObj.Territory_Name) : '-';

  } else if (userRoleLower === 'manager' || userRoleLower === 'sales manager') {
    labelText = appLang === 'th' ? 'ทีมที่ดูแล (Team)' : 'Team';
    var teams = cache.teams || window.globalTeamList || [];
    var tObj = teams.find(function(tm) { return String(tm.Team_ID || tm.id || tm.Team) === rawTerrId; });
    locNameShow = tObj ? (tObj.Team || tObj.Team_Name) : '-';

  } else if (userRoleLower.indexOf('bu') !== -1 || userRoleLower.indexOf('head') !== -1) {
    labelText = appLang === 'th' ? 'หน่วยธุรกิจ (BU)' : 'Business Unit';
    var bus = cache.bus || window.globalBuList || [];
    var bObj = bus.find(function(b) { return String(b.BU_ID || b.id || b.BU) === rawTerrId; });
    locNameShow = bObj ? (bObj.BU || bObj.BU_Name) : '-';

  } else if (userRole !== '') {
    labelText = appLang === 'th' ? 'บทบาท (Role)' : 'Role';
    locNameShow = userRole;

  } else {
    labelText = appLang === 'th' ? 'เขตพื้นที่' : 'Territory';
    locNameShow = '-';
  }

  var repNameEl = document.getElementById('dispSalesRepName');
  var terNameEl = document.getElementById('dispTerritoryName');
  var terLabelEl = document.getElementById('dynamicTerritoryLabel');

  if (repNameEl) repNameEl.innerText = repNameShow || '-';
  if (terNameEl) terNameEl.innerText = locNameShow || '-';
  if (terLabelEl) {
    terLabelEl.removeAttribute('data-i18n');
    terLabelEl.innerText = labelText;
  }
};

window.initUserInfo = function() {
  try {
    var crmUser = JSON.parse(sessionStorage.getItem('crmUser'));
    if (typeof window.updateFormUserInfo === 'function') window.updateFormUserInfo(crmUser, null);
  } catch(e) {}
};

window.setQuickTime = function(type, addMinutes) {
  var now = new Date();
  if (type === 'start') {
    var hours = String(now.getHours()).padStart(2, '0');
    var minutes = String(now.getMinutes()).padStart(2, '0');
    var elStart = document.getElementById('visitStartTime');
    if (elStart) elStart.value = hours + ':' + minutes;
  } else if (type === 'end') {
    var elStartVal = document.getElementById('visitStartTime');
    var startVal = elStartVal ? elStartVal.value : '';
    var baseDate = new Date();
    if (startVal) {
      var parts = startVal.split(':');
      baseDate.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0);
    }
    baseDate.setMinutes(baseDate.getMinutes() + addMinutes);
    var endHours = String(baseDate.getHours()).padStart(2, '0');
    var endMinutes = String(baseDate.getMinutes()).padStart(2, '0');
    var elEnd = document.getElementById('visitEndTime');
    if (elEnd) elEnd.value = endHours + ':' + endMinutes;
  }
  if (typeof window.saveFormDraft === 'function') window.saveFormDraft();
};

// ==========================================
// 💾 4. DRAFT & NOTIFICATION FUNCTIONS
// ==========================================
window.saveFormDraft = function() {
    var visitId = document.getElementById('visitId').value || 'NEW';
    var draftData = {
        docId: window.tomSelectDocInstance ? window.tomSelectDocInstance.getValue() : '',
        productId: window.tomSelectProdInstance ? window.tomSelectProdInstance.getValue() : [],
        purpose: window.tomSelectPurposeInstance ? window.tomSelectPurposeInstance.getValue() : '',
        date: document.getElementById('visitDate').value,
        startTime: document.getElementById('visitStartTime').value,
        endTime: document.getElementById('visitEndTime').value,
        details: document.getElementById('visitDetails').value,
        insight: document.getElementById('visitInsight').value,
        nextAction: document.getElementById('visitNextAction').value,
        isCoaching: document.getElementById('visitIsCoaching').checked,
        status: document.getElementById('visitStatus').value,
        timestamp: Date.now()
    };
    localStorage.setItem('visitDraft_' + visitId, JSON.stringify(draftData));
};

window.restoreFormDraft = function(visitId) {
    var draftStr = localStorage.getItem('visitDraft_' + (visitId || 'NEW'));
    if (draftStr) {
        try {
            var draft = JSON.parse(draftStr);
            if (Date.now() - draft.timestamp > 12 * 60 * 60 * 1000) {
                window.clearFormDraft(visitId);
                return false;
            }
            setTimeout(function() {
                if (draft.docId && window.tomSelectDocInstance) window.tomSelectDocInstance.setValue(draft.docId, true);
                if (draft.productId && window.tomSelectProdInstance) window.tomSelectProdInstance.setValue(draft.productId, true);
                if (draft.purpose && window.tomSelectPurposeInstance) window.tomSelectPurposeInstance.setValue(draft.purpose, true);
            }, 200);

            if (draft.date) document.getElementById('visitDate').value = draft.date;
            if (draft.startTime) document.getElementById('visitStartTime').value = draft.startTime;
            if (draft.endTime) document.getElementById('visitEndTime').value = draft.endTime;
            if (draft.details) document.getElementById('visitDetails').value = draft.details;
            if (draft.insight) document.getElementById('visitInsight').value = draft.insight;
            if (draft.nextAction) document.getElementById('visitNextAction').value = draft.nextAction;
            if (draft.isCoaching !== undefined) document.getElementById('visitIsCoaching').checked = draft.isCoaching;
            if (draft.status) document.getElementById('visitStatus').value = draft.status;
            
          if (!document.getElementById('visitId').value && window.showToast) {
                var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
                var msgRestored = appLang === 'en' ? "Auto-saved draft restored successfully." : "กู้คืนข้อมูลร่างล่าสุด (Auto-Saved) เรียบร้อยแล้ว";
                window.showToast(msgRestored, "success");
            }
          
            return true;
        } catch(e) {}
    }
    return false;
};

window.clearFormDraft = function(visitId) { localStorage.removeItem('visitDraft_' + (visitId || 'NEW')); };

window.checkMyDraftsReminder = function(myDraftCount) {
  // 🚫 ปิดการทำงานแจ้งเตือน Toast รบกวนสายตา (User Request)
  return;
};

// ==========================================
// 🎬 5. MEDIA & PRESENTATION FUNCTIONS
// ==========================================
window.fetchDetailingMedia = async function() {
  try {
    var res = await window.supabaseClient.from('Detailing_Media').select('*').eq('Status', true);
    if (!res.error && res.data) { window.globalAllMediaList = res.data; }
  } catch(e) {}
};

window.loadProductMedia = async function() {
  var container = document.getElementById('mediaListContainer');
  var section = document.getElementById('detailingMediaSection');
  var headerEl = document.getElementById('detailingMediaHeader');
  if (!container || !section) return;

  var visitStatus = document.getElementById('visitStatus') ? document.getElementById('visitStatus').value : 'Pending';
  var isSubmitted = (visitStatus === 'Submitted');

  var crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}
  var myRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || crmUser.User_ID || '').trim() : '';
  var myEmail = crmUser ? String(crmUser.Email || crmUser.email || '').toLowerCase().trim() : '';

  var currentVisitId = document.getElementById('visitId') ? document.getElementById('visitId').value : '';
  var isOwner = true; 
  if (currentVisitId && window.globalVisits && window.globalVisits.length > 0) {
      var v = window.globalVisits.find(function(x) { return String(x.Visit_ID) === String(currentVisitId); });
      if (v) {
          var creatorRepId = String(v.Rep_ID || v.rep_id || '').trim();
          var creatorWho = String(v.Whoupdated || v.whoupdated || '').toLowerCase().trim();
          if (myRepId && creatorRepId) { isOwner = (myRepId === creatorRepId); } 
          else if (myEmail && creatorWho) { isOwner = (myEmail === creatorWho); } 
          else { isOwner = false; }
      }
  }

  var isPreviewMode = isSubmitted || !isOwner;
  var selectedProducts = [];
  if (window.tomSelectProdInstance) {
    var val = window.tomSelectProdInstance.getValue();
    selectedProducts = Array.isArray(val) ? val : (val ? [val] : []);
  } else {
    var pSelect = document.getElementById('visitProductId');
    if (pSelect) selectedProducts = Array.from(pSelect.selectedOptions).map(function(o) { return o.value; });
  }

  selectedProducts = selectedProducts.filter(function(p) { return p.trim() !== ""; });
  if (selectedProducts.length === 0) { section.classList.add('d-none'); container.innerHTML = ''; return; }

  if (window.globalAllMediaList.length === 0) {
      if (typeof window.fetchDetailingMedia === 'function') await window.fetchDetailingMedia();
  }

  var matchedMedia = window.globalAllMediaList.filter(function(m) {
    return selectedProducts.indexOf(String(m.Product_ID)) !== -1 || selectedProducts.indexOf(String(m.Product)) !== -1;
  });

  if (isSubmitted && currentVisitId && currentVisitId !== 'NEW') {
    try {
      var { data: logData, error } = await window.supabaseClient
        .from('Visit_Detailing_Logs')
        .select('Media_ID')
        .eq('Visit_ID', currentVisitId);
      
      if (!error && logData && logData.length > 0) {
        var presentedMediaIds = logData.map(function(log) { return String(log.Media_ID); });
        matchedMedia = matchedMedia.filter(function(m) {
          return presentedMediaIds.indexOf(String(m.Media_ID)) !== -1;
        });
      } else if (!error && (!logData || logData.length === 0)) {
        matchedMedia = [];
      }
    } catch (err) {
      console.error("Error checking detailing logs:", err);
    }
  }

  if (matchedMedia.length === 0) { section.classList.add('d-none'); container.innerHTML = ''; return; }

  section.classList.remove('d-none');
  
  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  var titleText = appLang === 'en' ? 'e-Detailing / Presentation' : 'สื่อการนำเสนอ (e-Detailing)';
  var unitText = appLang === 'en' ? 'items' : 'เล่ม';

  if (headerEl) {
    headerEl.innerHTML = 
      '<div class="d-flex align-items-center justify-content-between w-100 me-2">' +
        '<h6 class="modal-title fw-bold text-dark mb-0 fs-6">' +
          '<i class="fa-solid fa-file-powerpoint text-danger me-2 fs-5"></i>' +
          '<span>' + titleText + '</span>' +
        '</h6>' +
        '<span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill fw-bold px-3 py-1.5" style="font-size:0.82rem;">' + matchedMedia.length + ' ' + unitText + '</span>' +
      '</div>';
  }

  var html = '';
  var btnClass = isPreviewMode ? 'btn-outline-secondary' : 'btn-primary';
  var btnIcon = isPreviewMode ? 'fa-eye' : 'fa-display';
  var btnText = isPreviewMode ? (appLang === 'en' ? 'Preview' : 'เปิดดู') : (appLang === 'en' ? 'Present' : 'นำเสนอ');

  // 📱 การ์ดสไตล์ iPad Touch-Friendly
  matchedMedia.forEach(function(m) {
    var icon = m.Type === 'Video' ? 'fa-circle-play text-danger' : 'fa-file-pdf text-danger';
    var typeText = m.Type || 'PDF';
    
    html += 
      '<div class="p-3 bg-light border rounded-4 d-flex align-items-center justify-content-between gap-3 shadow-xs">' +
        '<div class="d-flex align-items-center gap-3 overflow-hidden flex-grow-1">' +
          '<div class="bg-white rounded-3 p-2.5 shadow-xs d-flex align-items-center justify-content-center" style="width: 48px; height: 48px; flex-shrink: 0;">' +
            '<i class="fa-solid ' + icon + ' fs-3"></i>' +
          '</div>' +
          '<div class="overflow-hidden">' +
            '<div class="fw-bold text-dark fs-6 text-truncate mb-0.5" title="' + m.Title + '">' + m.Title + '</div>' +
            '<span class="badge bg-secondary-subtle text-secondary border px-2 py-0.5" style="font-size: 0.72rem;">' + typeText + '</span>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="btn ' + btnClass + ' px-4 fw-bold shadow-xs d-flex align-items-center justify-content-center gap-2 flex-shrink-0" style="min-height: 46px; border-radius: 12px; font-size: 0.95rem;" onclick="window.openMediaPresentation(\'' + m.Media_ID + '\', ' + isPreviewMode + ')">' +
          '<i class="fa-solid ' + btnIcon + ' fs-6"></i> ' + btnText +
        '</button>' +
      '</div>';
  });
  
  container.innerHTML = html;
};
window.openMediaPresentation = async function(mediaId, isPreview) {
  window.globalIsMediaPreviewMode = isPreview || false;
  var media = window.globalAllMediaList.find(function(m) { return String(m.Media_ID) === String(mediaId); });
  
  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  
  if (!media) {
      var msgNotFound = appLang === 'en' ? "Media file not found." : "ไม่พบไฟล์สื่อการนำเสนอนี้";
      return window.showToast ? window.showToast(msgNotFound, "error") : alert(msgNotFound);
  }

  var visitIdInput = document.getElementById('visitId');
  if (visitIdInput && !visitIdInput.value && typeof window.generateUUID === 'function') visitIdInput.value = window.generateUUID();

  window.currentActiveMedia = media;
  window.presentationStartTime = new Date();
  window.pageLogsBuffer = [];
  window.currentPdfPage = 1;
  window.currentPageStartTime = new Date();

  var txtPreviewOnly = appLang === 'en' ? 'Preview Only' : 'ดูตัวอย่างเท่านั้น';
  var titleSuffix = window.globalIsMediaPreviewMode ? ' <span class="badge bg-secondary ms-2" style="font-size:0.7rem;">' + txtPreviewOnly + '</span>' : '';
  
  document.getElementById('mediaModalTitle').innerHTML = '<i class="fa-solid ' + (media.Type === 'Video' ? 'fa-circle-play text-danger' : 'fa-file-pdf text-danger') + ' me-2"></i>' + media.Title + titleSuffix;

  var modalBody = document.getElementById('mediaModalBody');
  var pdfControls = document.getElementById('pdfControls');

  if (media.Type === 'Video') {
    if (pdfControls) pdfControls.classList.add('d-none');
    modalBody.innerHTML = '<video src="' + media.File_URL + '" controls autoplay style="width:100%; max-height:100vh; object-fit:contain;"></video>';
  } else {
    if (pdfControls) pdfControls.classList.remove('d-none');
    modalBody.innerHTML = '<div id="pdfCanvasContainer"><canvas id="pdfRenderCanvas"></canvas></div>';
    try {
      var loadingTask = pdfjsLib.getDocument(media.File_URL);
      window.pdfDocInstance = await loadingTask.promise;
      window.totalPdfPages = window.pdfDocInstance.numPages;
      document.getElementById('pdfTotalPages').innerText = window.totalPdfPages;
      document.getElementById('pdfPageNum').value = 1;
      if (typeof window.renderPdfPage === 'function') window.renderPdfPage(1);
    } catch(e) {
      modalBody.innerHTML = '<iframe src="' + media.File_URL + '#toolbar=0" style="width:100%; height:100vh; border:none;"></iframe>';
    }
  }

  var secondsElapsed = 0;
  var timerBadge = document.getElementById('mediaTimerBadge');
  if (timerBadge) timerBadge.innerHTML = '<i class="fa-solid fa-stopwatch me-1"></i>00:00';
  if (window.presentationTimerInterval) clearInterval(window.presentationTimerInterval);
  window.presentationTimerInterval = setInterval(function() {
    secondsElapsed++;
    var m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    var s = String(secondsElapsed % 60).padStart(2, '0');
    if (timerBadge) timerBadge.innerHTML = '<i class="fa-solid fa-stopwatch me-1"></i>' + m + ':' + s;
  }, 1000);

  var modalEl = document.getElementById('mediaPresentationModal');
  if (modalEl && typeof bootstrap !== 'undefined') {
      var modal = new bootstrap.Modal(modalEl);
      modal.show();
  }
};

window.renderPdfPage = async function(num) {
  if (!window.pdfDocInstance) return;
  try {
    var page = await window.pdfDocInstance.getPage(num);
    var canvas = document.getElementById('pdfRenderCanvas');
    if (!canvas) return;
    var context = canvas.getContext('2d');
    var viewport = page.getViewport({ scale: 1.5 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    var renderContext = { canvasContext: context, viewport: viewport };
    await page.render(renderContext).promise;
  } catch(e) {}
};

window.recordCurrentPageLog = function() {
  if (window.currentPageStartTime) {
    var now = new Date();
    var durationSec = Math.round((now - window.currentPageStartTime) / 1000);
    if (durationSec >= 5) {
        window.pageLogsBuffer.push({ Page_Number: window.currentPdfPage, Duration_Second: durationSec, Whenopend: window.currentPageStartTime.toISOString() });
    }
  }
};

window.prevPdfPage = function() {
  if (window.currentPdfPage <= 1) return;
  window.recordCurrentPageLog();
  window.currentPdfPage--;
  window.currentPageStartTime = new Date();
  var pNumEl = document.getElementById('pdfPageNum');
  if (pNumEl) pNumEl.value = window.currentPdfPage;
  window.renderPdfPage(window.currentPdfPage);
};

window.nextPdfPage = function() {
  if (window.currentPdfPage >= window.totalPdfPages) return;
  window.recordCurrentPageLog();
  window.currentPdfPage++;
  window.currentPageStartTime = new Date();
  var pNumEl = document.getElementById('pdfPageNum');
  if (pNumEl) pNumEl.value = window.currentPdfPage;
  window.renderPdfPage(window.currentPdfPage);
};

window.jumpPdfPage = function() {
  var pNumEl = document.getElementById('pdfPageNum');
  if (!pNumEl) return;
  var val = parseInt(pNumEl.value);
  if (isNaN(val) || val < 1 || val > window.totalPdfPages) return;
  window.recordCurrentPageLog();
  window.currentPdfPage = val;
  window.currentPageStartTime = new Date();
  window.renderPdfPage(window.currentPdfPage);
};

window.closeMediaPresentation = async function() {
  if (window.presentationTimerInterval) clearInterval(window.presentationTimerInterval);
  window.recordCurrentPageLog();
  var now = new Date();
  var totalDurationSec = window.presentationStartTime ? Math.round((now - window.presentationStartTime) / 1000) : 0;

  if (!window.globalIsMediaPreviewMode && totalDurationSec >= 5 && window.currentActiveMedia) {
    var crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}
    var whoUpdated = crmUser ? (crmUser.Email || crmUser.Rep_Name || "User") : "Unknown";
    var durationToSave = totalDurationSec > 0 ? totalDurationSec : 1;
    if (!window.pendingDetailingLogs) window.pendingDetailingLogs = [];
    window.pendingDetailingLogs.push({
      Media_ID: window.currentActiveMedia.Media_ID,
      Duration_Seconds: durationToSave,
      Whenopend: window.presentationStartTime ? window.presentationStartTime.toISOString() : new Date().toISOString(),
      Whoupdated: whoUpdated,
      Pages: window.pageLogsBuffer ? [...window.pageLogsBuffer] : []
    });
  }

  var modalEl = document.getElementById('mediaPresentationModal');
  if (modalEl && typeof bootstrap !== 'undefined') {
      var modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
  }
  var mBody = document.getElementById('mediaModalBody');
  if (mBody) mBody.innerHTML = '';
  window.currentActiveMedia = null; window.presentationStartTime = null; window.pdfDocInstance = null; window.pageLogsBuffer = [];
};

// ==========================================
// 📊 6. VIEW & UI SWITCHERS & STATS
// ==========================================
 window.toggleMainView = function(viewMode) {
  var listBtn = document.getElementById('btnToggleList');
  var calBtn = document.getElementById('btnToggleCal');
  var listZone = document.getElementById('visitMainContentContainer');
  var calZone = document.getElementById('visitCalendarZone');

  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  var isEN = (appLang === 'en');

  var listText = isEN ? 'List' : 'รายการ';
  var calText = isEN ? 'Calendar' : 'ปฏิทิน';

  if (viewMode === 'calendar') {
      if (listBtn) { 
          listBtn.className = 'btn btn-sm text-secondary bg-transparent px-3 py-1.5 fw-bold border-0 premium-radius'; 
          listBtn.innerHTML = '<i class="fa-solid fa-list me-2"></i><span data-i18n="btn_list">' + listText + '</span>';
      }
      if (calBtn) { 
          calBtn.className = 'btn btn-sm btn-premium-primary px-3 py-1.5 fw-bold premium-radius'; 
          calBtn.innerHTML = '<i class="fa-regular fa-calendar-days me-2"></i><span data-i18n="btn_calendar">' + calText + '</span>';
      }
      if (listZone) listZone.classList.add('d-none');
      if (calZone) calZone.classList.remove('d-none');
      
      window.VisitManagerCache = window.VisitManagerCache || {};
      window.VisitManagerCache.currentMainView = 'calendar';
      if (typeof window.renderCalendarView === 'function') window.renderCalendarView();
  } else {
      if (listBtn) { 
          listBtn.className = 'btn btn-sm btn-premium-primary px-3 py-1.5 fw-bold premium-radius'; 
          listBtn.innerHTML = '<i class="fa-solid fa-list me-2"></i><span data-i18n="btn_list">' + listText + '</span>';
      }
      if (calBtn) { 
          calBtn.className = 'btn btn-sm text-secondary bg-transparent px-3 py-1.5 fw-bold border-0 premium-radius'; 
          calBtn.innerHTML = '<i class="fa-regular fa-calendar-days me-2"></i><span data-i18n="btn_calendar">' + calText + '</span>';
      }
      if (calZone) calZone.classList.add('d-none');
      if (listZone) listZone.classList.remove('d-none');
      
      window.VisitManagerCache = window.VisitManagerCache || {};
      window.VisitManagerCache.currentMainView = 'list';
  }
};

window.switchVisitView = function(viewId) {
  var views = ['visitListView', 'visitFormView'];
  views.forEach(function(v) { var el = document.getElementById(v); if(el) el.classList.add('d-none'); });
  var target = document.getElementById(viewId); 
  if(target) target.classList.remove('d-none');
  window.scrollTo(0, 0);
};

window.updateStatCards = function(totalOrArray, pendingCount, submittedCount) {
    var total = 0, pending = 0, submitted = 0;
    
    // ตรวจสอบว่ารับค่ามาเป็น Array (แบบเก่า) หรือรับเป็นตัวเลขที่คำนวณมาแล้ว (แบบใหม่)
    if (Array.isArray(totalOrArray)) {
        total = window.totalVisitsCount || totalOrArray.length;
        pending = totalOrArray.filter(function(v) { return v.Status === 'Pending'; }).length;
        submitted = totalOrArray.filter(function(v) { return v.Status === 'Submitted'; }).length;
    } else {
        total = totalOrArray || 0;
        pending = pendingCount || 0;
        submitted = submittedCount || 0;
    }

    if (document.getElementById('statTotalVisits')) document.getElementById('statTotalVisits').innerText = total;
    if (document.getElementById('statPendingVisits')) document.getElementById('statPendingVisits').innerText = pending;
    if (document.getElementById('statSubmittedVisits')) document.getElementById('statSubmittedVisits').innerText = submitted;
};

// ==========================================
// ⛱️ 7. TOT MODAL (TIME OFF TERRITORY)
// ==========================================
window.initTotModal = function() {
  if (!window.totModalInstance) {
      var el = document.getElementById('totModal');
      if (el) window.totModalInstance = new bootstrap.Modal(el, { backdrop: 'static' });
  }
};

window.openAddTotModal = function() {
  var elId = document.getElementById('totId'); if(elId) elId.value = '';
  
  // 🌟 กำหนดวันที่ปัจจุบัน และสั่งตั้งค่าผ่าน Flatpickr เพื่อแสดงผลเป็น DD/MM/YYYY
  var todayStr = new Date().toISOString().split('T')[0];
  var elSd = document.getElementById('totStartDate'); if(elSd) elSd.value = todayStr;
  var elEd = document.getElementById('totEndDate'); if(elEd) elEd.value = todayStr;
  
  if (window.fpTotStartInstance) window.fpTotStartInstance.setDate(todayStr, false);
  if (window.fpTotEndInstance) window.fpTotEndInstance.setDate(todayStr, false);

  var elSt = document.getElementById('totStartTime'); if(elSt) elSt.value = '';
  var elEt = document.getElementById('totEndTime'); if(elEt) elEt.value = '';
  var elRm = document.getElementById('totRemark'); if(elRm) elRm.value = '';
  var elSts = document.getElementById('totStatus'); if(elSts) elSts.value = 'Approved'; 
  
  if (typeof window.populateTotTypes === 'function') window.populateTotTypes();

  var btnDelete = document.getElementById('btnDeleteTot');
  if(btnDelete) btnDelete.classList.add('d-none');

  var titleEl = document.getElementById('totModalTitle');
  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  if(titleEl) titleEl.innerHTML = '<span data-i18n="title_add_tot">' + (appLang === 'en' ? 'Add TOT' : 'บันทึกวันลา / TOT') + '</span>';

  window.initTotModal();
  if(window.totModalInstance) window.totModalInstance.show();
};

window.openEditTotModal = function(id) {
  var tot = (window.globalTotLogs || []).find(function(t) { return t.TOT_ID === id; });
  if(!tot) return;

  var elId = document.getElementById('totId'); if(elId) elId.value = tot.TOT_ID;
  
  // 🌟 ดึงค่า Start/End Date และสั่งตั้งค่าผ่าน Flatpickr เพื่อแสดงผลเป็น DD/MM/YYYY
  var startDateVal = tot.Start_Date || '';
  var endDateVal = tot.End_Date || '';
  
  var elSd = document.getElementById('totStartDate'); if(elSd) elSd.value = startDateVal;
  var elEd = document.getElementById('totEndDate'); if(elEd) elEd.value = endDateVal;

  if (window.fpTotStartInstance) {
      if (startDateVal) window.fpTotStartInstance.setDate(startDateVal, false);
      else window.fpTotStartInstance.clear();
  }
  if (window.fpTotEndInstance) {
      if (endDateVal) window.fpTotEndInstance.setDate(endDateVal, false);
      else window.fpTotEndInstance.clear();
  }

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
  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  if(titleEl) titleEl.innerHTML = '<span data-i18n="title_edit_tot">' + (appLang === 'en' ? 'Edit TOT' : 'แก้ไขบันทึก TOT') + '</span>';
  
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
          var textTh = i.Value || ''; var textEn = i.Value1 || i.Value || '';
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

  var idEl = document.getElementById('totId'); var id = idEl ? idEl.value : '';
  var crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err){}
  var repId = crmUser ? (crmUser.Rep_ID || crmUser.id || null) : null;
  var whoUpdated = crmUser ? (crmUser.Email || crmUser.Rep_Name || 'Unknown') : 'Unknown';
  
  var typeEl = document.getElementById('totType'); var sdEl = document.getElementById('totStartDate');
  var edEl = document.getElementById('totEndDate'); var stEl = document.getElementById('totStartTime');
  var etEl = document.getElementById('totEndTime'); var rmEl = document.getElementById('totRemark');
  var stsEl = document.getElementById('totStatus');

  var payload = {
      Rep_ID: repId, TOT_Type: typeEl ? typeEl.value : '', Start_Date: sdEl ? sdEl.value : '',
      End_Date: (edEl && edEl.value) ? edEl.value : (sdEl ? sdEl.value : ''),
      Start_Time: (stEl && stEl.value) ? stEl.value : null, End_Time: (etEl && etEl.value) ? etEl.value : null,
      Remark: rmEl ? rmEl.value : '', Status: stsEl ? stsEl.value : 'Approved',
      Whoupdated: whoUpdated, Whenupdated: new Date().toISOString()
  };

  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';

  try {
      if(id) { var {error} = await window.supabaseClient.from('TOT_Logs').update(payload).eq('TOT_ID', id); if(error) throw error; } 
      else {
          payload.TOT_ID = (typeof window.generateUUID === 'function') ? window.generateUUID() : Date.now().toString();
          var {error} = await window.supabaseClient.from('TOT_Logs').insert([payload]);
          if(error) throw error;
      }
      var msgSaved = appLang === 'en' ? "TOT record saved successfully." : "บันทึกข้อมูล TOT เรียบร้อยแล้ว";
      if (window.showToast) window.showToast(msgSaved, "success");
      
      if(window.totModalInstance) window.totModalInstance.hide();
      if (typeof window.loadVisits === 'function') await window.loadVisits(true);
  } catch(err) {
      var msgErr = appLang === 'en' ? "Error: " : "เกิดข้อผิดพลาด: ";
      if (window.showToast) window.showToast(msgErr + err.message, "error");
  } finally {
      if(btn) { btn.disabled = false; btn.innerHTML = '💾 Save'; }
  }
};

window.deleteTot = async function() {
  var idEl = document.getElementById('totId'); var id = idEl ? idEl.value : '';
  if(!id) return;
  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  var confirmMsg = appLang === 'en' ? "Are you sure you want to delete this record?" : "คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้?";
  if (!confirm(confirmMsg)) return;

  try {
      var {error} = await window.supabaseClient.from('TOT_Logs').delete().eq('TOT_ID', id);
      if (error) throw error;
      
      var msgDeleted = appLang === 'en' ? "Record deleted successfully." : "ลบข้อมูลเรียบร้อยแล้ว";
      if (window.showToast) window.showToast(msgDeleted, "success");
      
      if(window.totModalInstance) window.totModalInstance.hide();
      if (typeof window.loadVisits === 'function') await window.loadVisits(true);
  } catch(err) {
      var msgErr = appLang === 'en' ? "Error: " : "เกิดข้อผิดพลาด: ";
      if (window.showToast) window.showToast(msgErr + err.message, "error");
  }
};

// ==========================================
// 📥 8. DROPDOWNS & PERMISSIONS SETUP
// ==========================================
  // 🚀 loadDropdowns (Pure Server-Side - ดึงเฉพาะ Master Data และตัวเลือกตามสิทธิ์เท่านั้น)
window.loadDropdowns = async function(forceReload) {
  window.isPermissionCalculated = false;
  var oldDocVal = window.tomSelectDocInstance ? window.tomSelectDocInstance.getValue() : '';
  var oldPurpVal = window.tomSelectPurposeInstance ? window.tomSelectPurposeInstance.getValue() : ''; 
  var oldStatusVal = window.tomSelectStatusInstance ? window.tomSelectStatusInstance.getValue() : '';

  try {
    var crmUser = null; 
    try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
    var myRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || crmUser.User_ID || '').trim() : '';

    window.VisitManagerCache = window.VisitManagerCache || {};
    if (window.VisitManagerCache.dropdownOwnerId !== myRepId) {
        window.VisitManagerCache = {};
        window.VisitManagerCache.dropdownOwnerId = myRepId; 
        window.VisitManagerCache.dropdownsLoaded = false;
        forceReload = true; 
    }

    var appLang = window.getCurrentAppLang();
    var sb = window.supabaseClient || window.supabase;

    // 1. สร้าง Status Dropdown (Static)
    var statusSelect = document.getElementById('filterVisitStatus');
    if (statusSelect && (!window.tomSelectStatusInstance || forceReload)) {
        var optAllStatus = appLang === 'th' ? '- สถานะทั้งหมด -' : '- All Status -';
        if (typeof TomSelect !== 'undefined') {
            window.safeDestroyTs(window.tomSelectStatusInstance);
            statusSelect.innerHTML = '<option value=""></option>'; 
            
            window.tomSelectStatusInstance = new TomSelect('#filterVisitStatus', {
                valueField: 'value',
                searchField: ['text'],
                controlInput: null, 
                options: [
                    { value: '', text: optAllStatus, icon: '', badgeClass: '' },
                    { value: 'Pending', text: appLang === 'th' ? 'รอส่ง (Pending)' : 'Pending', icon: '⏳ ', badgeClass: 'badge badge-soft-pending' },
                    { value: 'Submitted', text: appLang === 'th' ? 'ส่งแล้ว (Submitted)' : 'Submitted', icon: '✅ ', badgeClass: 'badge badge-soft-success' }
                ],
                allowEmptyOption: true,
                create: false,
                placeholder: optAllStatus,
                dropdownParent: 'body',
                render: {
                    option: function(data, escape) {
                        if (!data.value) return '<div class="py-1 px-2 text-secondary" style="font-size: 0.85rem;">' + escape(data.text) + '</div>';
                        return '<div class="py-1 px-2"><span class="' + data.badgeClass + '" style="font-size: 0.85rem; padding: 0.4em 0.6em;">' + data.icon + escape(data.text) + '</span></div>';
                    },
                    item: function(data, escape) {
                        if (!data.value) return '<div class="item text-secondary" style="font-size: 0.85rem; line-height: 1.5;">' + escape(data.text) + '</div>';
                        return '<div class="item" style="line-height: 1.5;"><span class="' + data.badgeClass + '" style="font-size: 0.85rem; padding: 0.3em 0.6em;">' + data.icon + escape(data.text) + '</span></div>';
                    }
                },
                onChange: function() { 
                    if (typeof window.filterVisits === 'function') window.filterVisits(); 
                }
            });
            if (oldStatusVal) window.tomSelectStatusInstance.setValue(oldStatusVal, true);
        }
    }

    // 2. ดึง Master Data เบาๆ เฉพาะที่จำเป็นต้องใช้สร้าง Dropdown (Server-Side Filtered)
    if (forceReload || !window.VisitManagerCache.dropdownsLoaded) {
        var isGlobal = window.myIsGlobalViewer || false;
        var allowedReps = window.myAllowedRepIds || [myRepId];

        // ⚡ Query เฉพาะหมอและ Master Data ที่สอดคล้องกับสิทธิ์
        var docQuery = sb.from('Doctors').select('Doc_ID, Doc_Name, Doc_Name_TH, Hospital_ID, Status').eq('Status', 'Active');
        if (!isGlobal && allowedReps.length > 0) {
            var myAllowedDocIds = window.myAllowedDocIds || [];
            if (myAllowedDocIds.length > 0) docQuery = docQuery.in('Doc_ID', myAllowedDocIds);
        }

        var promises = [
            docQuery.order('Doc_Name', { ascending: true }),
            sb.from('Products').select('*'),
            sb.from('Territory').select('Territory_ID, Territory, Team_ID'),
            sb.from('IndexType').select('*'),
            sb.from('Index').select('*').order('Value', { ascending: true }),
            sb.from('Rep_Users').select('Rep_ID, Rep_Name, Email, Role, Team_ID, Territory_ID')
        ];

        var results = await Promise.all(promises);

        window.VisitManagerCache.assignedDoctors = (results[0] && results[0].data) ? results[0].data : [];
        window.VisitManagerCache.products = (results[1] && results[1].data) ? results[1].data : [];
        window.VisitManagerCache.territories = (results[2] && results[2].data) ? results[2].data : [];
        window.VisitManagerCache.indexTypes = (results[3] && results[3].data) ? results[3].data : [];
        window.VisitManagerCache.indexes = (results[4] && results[4].data) ? results[4].data : [];
        window.VisitManagerCache.users = (results[5] && results[5].data) ? results[5].data : [];
        window.VisitManagerCache.dropdownsLoaded = true;
    }

    window.globalAssignedDoctors = window.VisitManagerCache.assignedDoctors || [];
    window.globalProductsList = window.VisitManagerCache.products || [];
    window.globalTerritoryList = window.VisitManagerCache.territories || [];
    window.globalUsersList = window.VisitManagerCache.users || [];

    if (typeof window.buildDataIndexes === 'function') window.buildDataIndexes(); 

    // 3. ปั้น Doctor Dropdown ใน Visit Form
    var docSelect = document.getElementById('visitDocId');
    if (docSelect && (!window.tomSelectDocInstance || forceReload)) { 
      docSelect.innerHTML = '<option value=""></option>';
      window.globalAssignedDoctors.forEach(function(d) {
        var nameEN = d.Doc_Name || ''; 
        var nameTH = (d.Doc_Name_TH && d.Doc_Name_TH.indexOf('???') === -1) ? d.Doc_Name_TH : '';
        var opt = document.createElement('option'); 
        opt.value = d.Doc_ID || d.id; 
        opt.textContent = nameEN + (nameTH ? ' (' + nameTH + ')' : ''); 
        docSelect.appendChild(opt);
      });

      if (typeof TomSelect !== 'undefined') {
          window.safeDestroyTs(window.tomSelectDocInstance);
          window.tomSelectDocInstance = new TomSelect('#visitDocId', { 
              create: false, 
              searchField: ["text"], 
              sortField: { field: "text", direction: "asc" }, 
              placeholder: appLang === 'th' ? '-- ค้นหา/เลือกแพทย์ --' : '-- Search/Select Doctor --', 
              maxOptions: null, 
              dropdownParent: 'body'
          });
      }
    }

    // 4. ตั้งค่า Rep และ Territory Filter Dropdowns
    if (typeof window.setupFiltersDropdowns === 'function') {
        window.setupFiltersDropdowns(crmUser, []);
    }

    // 5. ปั้น Purpose Dropdown
    var purposeSelect = document.getElementById('visitPurpose');
    if (purposeSelect && (!window.tomSelectPurposeInstance || forceReload)) { 
      var types = window.VisitManagerCache.indexTypes || []; 
      var indexes = window.VisitManagerCache.indexes || [];
      
      var purposeTypes = types.filter(function(t) { 
        var name = (t.Name || '').trim().toLowerCase();
        return String(t.IndexType_ID) === '9e6feb89-83e2-4c83-a0e5-5fbd057afbf2' || name === 'purpose' || name === 'callpurpose' || name === 'call purpose';
      });

      var typeIds = purposeTypes.map(function(t) { return t.IndexType_ID; });
      var purposeItems = indexes.filter(function(i) { return typeIds.indexOf(i.IndexType_ID) !== -1; });

      var purposeData = [];
      purposeItems.forEach(function(i) {
          var valTH = i.Value || ''; var valEN = i.Value1 || valTH; 
          var dispText = (appLang === 'en') ? valEN : valTH;
          purposeData.push({ value: String(i.Index_ID), text: dispText });
      });

      if (typeof TomSelect !== 'undefined') {
          window.safeDestroyTs(window.tomSelectPurposeInstance);
          purposeSelect.innerHTML = '<option value=""></option>'; 
          window.tomSelectPurposeInstance = new TomSelect('#visitPurpose', { 
              options: purposeData, 
              valueField: 'value', 
              labelField: 'text', 
              searchField: ["text"], 
              placeholder: appLang === 'th' ? '-- เลือกวัตถุประสงค์ --' : '-- Select Purpose --', 
              create: false, 
              dropdownParent: 'body'
          });
      }
    }

    window.isPermissionCalculated = true;
  } catch (err) { 
    console.error("Error loading dropdowns:", err.message); 
  }
};

 window.setupFiltersDropdowns = function(crmUser, productsTeamList) {
    try {
        var repSelect = document.getElementById('filterVisitRep'); 
        var terSelect = document.getElementById('filterVisitTerritory');

        // 🌟 1. การันตีสั่งปลดซ่อน Container ของ Filter ใน HTML
        var filterZone = document.getElementById('visitFilterZoneGroup') || document.getElementById('visitFilterZone');
        if (filterZone) {
            filterZone.classList.remove('d-none', 'visit-filter-compact');
            filterZone.style.setProperty('display', 'block', 'important');
            filterZone.style.setProperty('visibility', 'visible', 'important');
            filterZone.style.setProperty('opacity', '1', 'important');
        }

        var mainContainer = document.getElementById('visitMainContentContainer');
        if (mainContainer) mainContainer.classList.remove('d-none');

        if (!repSelect && !terSelect) return;

        // จำค่าเดิมที่เคยเลือกไว้
        var oldRepVal = window.tomSelectRepInstance ? window.tomSelectRepInstance.getValue() : []; 
        if (!Array.isArray(oldRepVal)) oldRepVal = oldRepVal ? [oldRepVal] : [];
        var oldTerVal = window.tomSelectTerInstance ? window.tomSelectTerInstance.getValue() : []; 
        if (!Array.isArray(oldTerVal)) oldTerVal = oldTerVal ? [oldTerVal] : [];

        var uRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || crmUser.User_ID || '').trim() : '';
        var uEmail = crmUser ? String(crmUser.Email || crmUser.email || '').trim().toLowerCase() : '';
        var userRole = crmUser ? String(crmUser.Role || crmUser.role || '').toUpperCase().trim() : '';

        // เช็กสิทธิ์ User
        var adminRoles = ['ADMIN', 'STAFF', 'DIRECTOR', 'EXECUTIVE', 'SYSTEM ADMIN', 'PRODUCT MANAGER'];
        var isGlobalViewer = window.myIsGlobalViewer || adminRoles.indexOf(userRole) !== -1;
        var isProductManager = window.myIsProductManager || userRole.indexOf('PRODUCT MANAGER') !== -1 || userRole === 'PM';
        var isBuHead = window.myIsBuHead || (!isGlobalViewer && !isProductManager && (userRole.indexOf('BU') !== -1 || userRole.indexOf('HEAD') !== -1));
        var isManager = window.myIsManager || (!isGlobalViewer && !isProductManager && !isBuHead && (userRole.indexOf('MANAGER') !== -1 || userRole.indexOf('LEAD') !== -1));
        var isSales = !isGlobalViewer && !isProductManager && !isBuHead && !isManager;

        var userBuId = String(crmUser ? (crmUser.BU_ID || crmUser.BU || crmUser.bu_id || window.myUserBuId || '') : '').trim().toLowerCase();
        var userTeamId = String(crmUser ? (crmUser.Team_ID || crmUser.Team || crmUser.team_id || window.myUserTeamId || '') : '').trim().toLowerCase();
        var userTerrId = String(crmUser ? (crmUser.Territory_ID || crmUser.Territory || crmUser.territory_id || window.myUserTerritoryId || '') : '').trim().toLowerCase();

        var myAllowedTeamIds = []; 
        var myAllowedTerIds = []; 
        var myAllowedRepIds = [uRepId]; 
        var myAllowedEmails = [uEmail];

        if (!isGlobalViewer) {
            if (isProductManager) {
                (window.globalUsersList || []).forEach(function(u) {
                    var uid = String(u.Rep_ID || u.User_ID || u.id || '').trim();
                    var uem = String(u.Email || u.email || '').toLowerCase().trim();
                    if (uid && myAllowedRepIds.indexOf(uid) === -1) myAllowedRepIds.push(uid);
                    if (uem && myAllowedEmails.indexOf(uem) === -1) myAllowedEmails.push(uem);
                });
            } else if (isBuHead) {
                (window.globalTeamList || []).forEach(function(t) {
                    var tBuId = String(t.BU_ID || t.BU || t.bu_id || '').trim().toLowerCase();
                    var tid = String(t.Team_ID || t.id || t.Team || '').trim();
                    if (tBuId && userBuId && tBuId === userBuId) {
                        if (tid && myAllowedTeamIds.indexOf(tid) === -1) myAllowedTeamIds.push(tid);
                    }
                });

                (window.globalTerritoryList || []).forEach(function(ter) {
                    var trTeamId = String(ter.Team_ID || ter.Team || '').trim().toLowerCase();
                    var trId = String(ter.Territory_ID || ter.id || ter.Territory || '').trim();
                    if (myAllowedTeamIds.map(x => x.toLowerCase()).indexOf(trTeamId) !== -1) {
                        if (trId && myAllowedTerIds.indexOf(trId) === -1) myAllowedTerIds.push(trId);
                    }
                });
            } else if (isManager) {
                if (userTeamId) {
                    myAllowedTeamIds.push(userTeamId);
                    (window.globalTerritoryList || []).forEach(function(ter) {
                        var trTeamId = String(ter.Team_ID || ter.Team || '').trim().toLowerCase();
                        var trId = String(ter.Territory_ID || ter.id || ter.Territory || '').trim();
                        if (trTeamId === userTeamId) {
                            if (trId && myAllowedTerIds.indexOf(trId) === -1) myAllowedTerIds.push(trId);
                        }
                    });
                }
            } else if (isSales) {
                if (userTerrId) myAllowedTerIds.push(userTerrId);
            }

            // 🌟 2. คัดกรอง Rep ลูกน้อง (ตัด Admin / Staff / Executive ออก ไม่ให้หลุดเข้าลิสต์)
            (window.globalUsersList || []).forEach(function(u) {
                var uid = String(u.Rep_ID || u.User_ID || u.id || '').trim(); 
                var uteam = String(u.Team_ID || u.Team || '').trim().toLowerCase();
                var uter = String(u.Territory_ID || u.Territory || '').trim().toLowerCase(); 
                var ubu = String(u.BU_ID || u.BU || '').trim().toLowerCase();
                var uem = String(u.Email || u.email || '').toLowerCase().trim();
                var uRole = String(u.Role || u.role || '').toUpperCase().trim();

                // เช็ก Role ป้องกัน Admin ติดเข้ามา
                var isAdminRole = uRole.indexOf('ADMIN') !== -1 || uRole.indexOf('STAFF') !== -1 || uRole.indexOf('DIRECTOR') !== -1 || uRole.indexOf('EXECUTIVE') !== -1;

                if (!isSales && !isProductManager) {
                    var isMatchBU = isBuHead && userBuId && ubu === userBuId;
                    var isMatchTeam = myAllowedTeamIds.map(x => x.toLowerCase()).indexOf(uteam) !== -1;
                    var isMatchTer = myAllowedTerIds.map(x => x.toLowerCase()).indexOf(uter) !== -1;

                    if ((isMatchBU || isMatchTeam || isMatchTer || uid === uRepId) && !isAdminRole) {
                        if (uid && myAllowedRepIds.indexOf(uid) === -1) myAllowedRepIds.push(uid);
                        if (uem && myAllowedEmails.indexOf(uem) === -1) myAllowedEmails.push(uem);
                    }
                }
            });
        }

        window.myAllowedTeamIds = myAllowedTeamIds; 
        window.myAllowedTerIds = myAllowedTerIds;
        window.myAllowedRepIds = myAllowedRepIds; 
        window.myAllowedEmails = myAllowedEmails;

        // 🌟 3. ปั้นข้อมูลตัวเลือกพนักงาน (Safety Mapping)
        var repOptionsData = [];
        var uniqueUsersMap = new Map();
        var fullAllowedUsers = isGlobalViewer ? (window.globalUsersList || []) : (window.globalUsersList || []).filter(function(u) {
            var uid = String(u.Rep_ID || u.User_ID || u.id || '').trim(); 
            return isSales ? (uid === uRepId) : (myAllowedRepIds.indexOf(uid) !== -1);
        });
        
        fullAllowedUsers.forEach(function(u) {
            var id = String(u.Rep_ID || u.User_ID || u.id || '').trim(); 
            var name = u.Rep_Name || u.Name || u.rep_name || u.Email || id;
            if (id && id !== 'undefined' && id !== 'null' && !uniqueUsersMap.has(id)) {
                uniqueUsersMap.set(id, u);
                repOptionsData.push({ value: id, text: name });
            }
        });

        // 🌟 4. ปั้นข้อมูลตัวเลือกเขตพื้นที่ (Safety Mapping รองรับ BU / Team / Territory)
        var terOptionsData = [];
        var terMap = new Map();

        (window.globalTerritoryList || []).forEach(function(t) {
            var tid = String(t.Territory_ID || t.id || t.Territory || '').trim(); 
            var tnm = String(t.Territory || t.Territory_Name || t.Name || tid).trim();
            if (isGlobalViewer || myAllowedTerIds.map(x => x.toLowerCase()).indexOf(tid.toLowerCase()) !== -1) {
                if (tid && !terMap.has(tid)) {
                    terMap.set(tid, tnm);
                    terOptionsData.push({ value: tid, text: tnm });
                }
            }
        });

        var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';

        // 🌟 5. ผูกเข้ากับ TomSelect
        if (typeof TomSelect !== 'undefined') {
            if (repSelect) {
                if (!window.tomSelectRepInstance) {
                    window.tomSelectRepInstance = new TomSelect('#filterVisitRep', { 
                        maxItems: null, plugins: ['remove_button'], create: false, 
                        valueField: 'value', labelField: 'text', searchField: ['text'],
                        options: repOptionsData, hidePlaceholder: true,
                        placeholder: appLang === 'th' ? '- พนักงานทั้งหมด -' : '- All Users -', 
                        dropdownParent: null, 
                        onChange: function() { if (typeof window.handleFilterChange === 'function') window.handleFilterChange('rep'); } 
                    });
                } else {
                    window.tomSelectRepInstance.clearOptions();
                    window.tomSelectRepInstance.addOption(repOptionsData);
                    window.tomSelectRepInstance.refreshOptions(false);
                }
                if (oldRepVal.length > 0) window.tomSelectRepInstance.setValue(oldRepVal, true);
            }

            if (terSelect) {
                if (!window.tomSelectTerInstance) {
                    window.tomSelectTerInstance = new TomSelect('#filterVisitTerritory', { 
                        maxItems: null, plugins: ['remove_button'], create: false, 
                        valueField: 'value', labelField: 'text', searchField: ['text'],
                        options: terOptionsData, hidePlaceholder: true,
                        placeholder: appLang === 'th' ? '- พื้นที่ทั้งหมด -' : '- All Areas -', 
                        dropdownParent: null,
                        onChange: function() { if (typeof window.handleFilterChange === 'function') window.handleFilterChange('territory'); } 
                    });
                } else {
                    window.tomSelectTerInstance.clearOptions();
                    window.tomSelectTerInstance.addOption(terOptionsData);
                    window.tomSelectTerInstance.refreshOptions(false);
                }
                if (oldTerVal.length > 0) window.tomSelectTerInstance.setValue(oldTerVal, true);
            }
        }
    } catch (err) {
        console.error("Error in setupFiltersDropdowns:", err);
    } finally {
        // 🌟 6. การันตีว่าตัวแประบบถูกปล่อยล็อกเสมอ ป้องกันหน้าเว็บค้าง
        window.isPermissionCalculated = true; 
    }
};
  
window.renderFormProductDropdown = async function() {
    var formProdSelect = document.getElementById('visitProductId');
    if (!formProdSelect) return;

    var oldProdVal = [];
    if (window.tomSelectProdInstance) {
        var pv = window.tomSelectProdInstance.getValue();
        oldProdVal = Array.isArray(pv) ? pv : (pv ? [pv] : []);
    }

    var allProds = (window.globalProductsList && window.globalProductsList.length > 0) ? window.globalProductsList : (window.VisitManagerCache ? window.VisitManagerCache.products : []);

    if (!allProds || allProds.length === 0) {
        try {
            var res = await window.supabaseClient.from('Products').select('*').order('Product', { ascending: true });
            if (res.data && res.data.length > 0) { allProds = res.data; window.globalProductsList = res.data; }
        } catch(e) {}
    }

    var filteredProds = [];
    var isGlobalAdmin = window.myIsGlobalViewer;

    if (isGlobalAdmin) {
        filteredProds = allProds;
    } else {
        var targetTeams = [];
        var visitIdEl = document.getElementById('visitId');
        var currentVisitId = visitIdEl ? visitIdEl.value : '';

        if (currentVisitId && currentVisitId !== 'NEW' && window.globalVisits) {
            var v = window.globalVisits.find(function(x) { return String(x.Visit_ID) === String(currentVisitId); });
            if (v && v.Rep_ID) {
                var targetUser = window.globalUsersList.find(function(u) { return String(u.Rep_ID || u.id) === String(v.Rep_ID); });
                if (targetUser) {
                    var uTeam = String(targetUser.Team_ID || targetUser.Team || '').trim();
                    if (!uTeam) {
                        var uTerr = String(targetUser.Territory_ID || targetUser.Territory || '').trim();
                        var matchedTer = (window.globalTerritoryList || []).find(function(t) { return String(t.Territory_ID) === uTerr || String(t.Territory) === uTerr; });
                        if (matchedTer) uTeam = String(matchedTer.Team_ID || matchedTer.Team || '').trim();
                    }
                    if (uTeam) targetTeams.push(uTeam);
                }
            }
        }

        if (targetTeams.length === 0) {
            var crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}
            if (crmUser) {
                var myTeam = String(crmUser.Team_ID || crmUser.team_id || crmUser.Team || '').trim();
                if (!myTeam) {
                    var myTerr = String(crmUser.Territory_ID || crmUser.territory_id || crmUser.Territory || '').trim();
                    var matchedMyTer = (window.globalTerritoryList || []).find(function(t) { return String(t.Territory_ID) === myTerr || String(t.Territory) === myTerr; });
                    if (matchedMyTer) myTeam = String(matchedMyTer.Team_ID || matchedMyTer.Team || '').trim();
                }
                if (myTeam) targetTeams.push(myTeam);
            }
            if (window.myAllowedTeamIds && window.myAllowedTeamIds.length > 0) {
                window.myAllowedTeamIds.forEach(function(t) {
                    if (targetTeams.indexOf(t) === -1) targetTeams.push(t);
                });
            }
        }

        var teamProdLinks = (window.VisitManagerCache && window.VisitManagerCache.teamProdLinks) ? window.VisitManagerCache.teamProdLinks : [];
        var allowedProdIds = [];

        teamProdLinks.forEach(function(link) {
            var tId = String(link.Team_ID || link.Team);
            if (targetTeams.indexOf(tId) !== -1 || targetTeams.indexOf(String(link.Team_Name)) !== -1) {
                var pId = String(link.Product_ID || link.Product);
                if (allowedProdIds.indexOf(pId) === -1) {
                    allowedProdIds.push(pId);
                }
            }
        });

        if (targetTeams.length > 0) {
            filteredProds = allProds.filter(function(p) {
                return allowedProdIds.indexOf(String(p.Product_ID || p.id)) !== -1 || allowedProdIds.indexOf(String(p.Product)) !== -1;
            });
        } else {
            filteredProds = allProds;
        }
    }

    var fHtml = '';
    (filteredProds).forEach(function(p) {
        fHtml += '<option value="' + p.Product_ID + '">' + p.Product + '</option>';
    });
    formProdSelect.innerHTML = fHtml;

    if (typeof TomSelect !== 'undefined') {
        window.safeDestroyTs(window.tomSelectProdInstance);
        var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
        var prodPlaceholder = appLang === 'th' ? '-- เลือกผลิตภัณฑ์ --' : '-- Select Products --';
        window.tomSelectProdInstance = new TomSelect('#visitProductId', {
            plugins: ['remove_button'], create: false, sortField: { field: "text", direction: "asc" }, placeholder: prodPlaceholder, dropdownParent: 'body',
            onChange: function() { if (typeof window.loadProductMedia === 'function') window.loadProductMedia(); }
        });
        if (oldProdVal.length > 0) setTimeout(() => window.tomSelectProdInstance.setValue(oldProdVal, true), 50);
    }
};
 
window.handleFilterChange = function(source) { 
    if (window.isInitialLoading) return; 
    window.currentPage = 1;
    if (typeof window.loadVisits === 'function') {
        window.loadVisits(true); 
    }
};

window.clearVisitFilters = function() {
    if (window.tomSelectRepInstance) window.tomSelectRepInstance.clear(true);
    if (window.tomSelectTerInstance) window.tomSelectTerInstance.clear(true);
    if (window.tomSelectStatusInstance) window.tomSelectStatusInstance.setValue('', true);
    
    if (window.fpStartInstance) window.fpStartInstance.clear();
    if (window.fpEndInstance) window.fpEndInstance.clear();

    var stDate = document.getElementById('filterStartDate');
    var endDate = document.getElementById('filterEndDate');
    if (stDate && !window.fpStartInstance) stDate.value = '';
    if (endDate && !window.fpEndInstance) endDate.value = '';

    var stEl = document.getElementById('filterVisitStatus');
    if (stEl && !window.tomSelectStatusInstance) { 
        stEl.value = ''; 
        stEl.classList.add('filter-placeholder-text'); 
    }
    
    var searchEl = document.getElementById('smartSearchInput');
    if (searchEl) searchEl.value = '';

    if (typeof window.filterVisits === 'function') window.filterVisits();
};

// ==========================================
// 📥 9. DATA LOADING & SERVER-SIDE PAGINATION
// ==========================================

// 🚀 loadVisits (Pure Server-Side Pagination - ดึงทีละ 20 รายการตรงจาก Supabase)
window.loadVisits = async function(forceReload, isBackground) {
    var crmUser = null;
    try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}
    var myRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || crmUser.User_ID || '').trim() : '';

    if (!window.VisitManagerCache) window.VisitManagerCache = {};
    if (window.VisitManagerCache.ownerId !== myRepId) {
        window.VisitManagerCache = {};
        window.VisitManagerCache.ownerId = myRepId; 
        window.VisitManagerCache.isLoaded = false;
        window.globalVisits = []; 
        window.globalTotLogs = [];
        window.isPermissionCalculated = false;
        forceReload = true; 
        
        if (typeof window.loadDropdowns === 'function') {
            await window.loadDropdowns(true);
        }
    }

    var waitLimit = 0;
    while (!window.isPermissionCalculated && waitLimit < 50) {
        await new Promise(r => setTimeout(r, 100));
        waitLimit++;
    }

    var visitViewEl = document.getElementById('visitListView');
    var loadingTitleEl = document.getElementById('loadingTitleText');
    var loadingDescEl = document.getElementById('loadingDescText');

    var hasData = (window.globalVisits && window.globalVisits.length > 0);

    if (!isBackground && (forceReload || !window.VisitManagerCache.isLoaded || !hasData)) {
        var currentLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th'; 
        if (loadingTitleEl) {
            loadingTitleEl.textContent = (typeof t === 'function') ? t('status_loading') : (currentLang === 'en' ? 'Loading Data...' : 'กำลังโหลดข้อมูล...');
        }
        if (loadingDescEl) {
            loadingDescEl.textContent = (typeof t === 'function') ? t('status_loading_desc') : (currentLang === 'en' ? 'Processing your access rights and retrieving records.' : 'กำลังตรวจสอบสิทธิ์การใช้งานและดึงข้อมูลระบบ');
        }

        if (visitViewEl) visitViewEl.classList.add('is-loading');
    }

    if (!forceReload && window.VisitManagerCache.isLoaded && hasData) {
        if (typeof window.restoreVisitFilterState === 'function') window.restoreVisitFilterState();
        if (visitViewEl) visitViewEl.classList.remove('is-loading');

        window.renderVisitTableServerSide();
        if (window.VisitManagerCache.currentMainView === 'calendar' && typeof window.renderCalendarView === 'function') {
            window.renderCalendarView();
        }
        return; 
    }

    try {
      var sb = window.supabaseClient || window.supabase;
      if (!sb) throw new Error("Supabase client not initialized");

      if (forceReload || !window.VisitManagerCache.isLoaded) {
          var promises = [
              sb.from('DCR').select('Ref_ID').eq('Action', 'Unlock Visit').eq('Status', 'Pending'),
              (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('TOT_Logs') : []),
              (typeof window.loadMasterDataForVisits === 'function' ? window.loadMasterDataForVisits() : Promise.resolve())
          ];
          var additionalRes = await Promise.all(promises);
          window.VisitManagerCache.pendingUnlocks = (additionalRes[0] && additionalRes[0].data) ? additionalRes[0].data.map(function(d) { return d.Ref_ID; }) : [];
          window.VisitManagerCache.totLogs = additionalRes[1] || [];
          window.VisitManagerCache.isLoaded = true;
      }
      window.globalPendingUnlockVisits = window.VisitManagerCache.pendingUnlocks || [];
      window.globalTotLogs = window.VisitManagerCache.totLogs || [];

      // ⚡ 1. Base Query Server-Side  
      var dataQuery = sb.from('Visit_Logs').select('*, Doctors(Doc_ID, Doc_Name, Doc_Name_TH, Hospital_ID, Hospitals(Hospital_ID, Hospital, Known_As))', { count: 'exact' });
      var countQuery = sb.from('Visit_Logs').select('Status');

      var sortColMap = { 'date': 'Visit_Date', 'status': 'Status', 'purpose': 'Purpose_ID' };
      var dbSortCol = sortColMap[window.currentSortCol] || 'Visit_Date';
      dataQuery = dataQuery.order(dbSortCol, { ascending: window.currentSortAsc });

      // 🔐 2. Apply Permission Filter at Server-Side (4-Level Architecture)
      var isGlobalAdmin = window.myIsGlobalViewer || false;
      var isProductManager = window.myIsProductManager || false;
      var isBuHead = window.myIsBuHead || false;

      if (!isGlobalAdmin) {
          if (isProductManager) {
              // ----------------------------------------------------
              // Level 4: Product Manager (อิงตาม Rep_Products / pmProducts)
              // ----------------------------------------------------
              var pmProdIdsRaw = sessionStorage.getItem('pmProducts');
              var pmProdIds = pmProdIdsRaw ? JSON.parse(pmProdIdsRaw) : [];

              if (pmProdIds.length > 0) {
                  var vpRes = await sb.from('Visit_Products').select('Visit_ID').in('Product_ID', pmProdIds);
                  var pmVisitIds = (vpRes.data || []).map(function(vp) { return vp.Visit_ID; });

                  if (pmVisitIds.length > 0) {
                      dataQuery = dataQuery.in('Visit_ID', pmVisitIds);
                      countQuery = countQuery.in('Visit_ID', pmVisitIds);
                  } else {
                      dataQuery = dataQuery.eq('Visit_ID', '00000000-0000-0000-0000-000000000000');
                      countQuery = countQuery.eq('Visit_ID', '00000000-0000-0000-0000-000000000000');
                  }
              } else {
                  dataQuery = dataQuery.eq('Visit_ID', '00000000-0000-0000-0000-000000000000');
                  countQuery = countQuery.eq('Visit_ID', '00000000-0000-0000-0000-000000000000');
              }
          } else if (isBuHead && window.myUserBuId) {
              // ----------------------------------------------------
              // Level 1: BU Head (เห็นเฉพาะ Visit ที่คีย์ "ยาของ BU ตัวเอง" ทั้งหมด รวมงานคีย์ของ PM และทุกคน)
              // ----------------------------------------------------
              var { data: buTeams } = await sb.from('Team').select('Team_ID').eq('BU_ID', window.myUserBuId);
              var buTeamIds = (buTeams || []).map(function(t) { return t.Team_ID; });

              var buVisitIds = [];
              if (buTeamIds.length > 0) {
                  var { data: buProds } = await sb.from('Products_Team').select('Product_ID').in('Team_ID', buTeamIds);
                  var buProdIds = (buProds || []).map(function(p) { return p.Product_ID; });

                  if (buProdIds.length > 0) {
                      var { data: vpBuRes } = await sb.from('Visit_Products').select('Visit_ID').in('Product_ID', buProdIds);
                      buVisitIds = (vpBuRes || []).map(function(vp) { return vp.Visit_ID; });
                  }
              }

              if (buVisitIds.length > 0) {
                  var safeBuVisitIds = buVisitIds.slice(0, 100);
                  dataQuery = dataQuery.in('Visit_ID', safeBuVisitIds);
                  countQuery = countQuery.in('Visit_ID', safeBuVisitIds);
              } else {
                  dataQuery = dataQuery.eq('Visit_ID', '00000000-0000-0000-0000-000000000000');
                  countQuery = countQuery.eq('Visit_ID', '00000000-0000-0000-0000-000000000000');
              }
          } else {
              // ----------------------------------------------------
              // Level 2-3: Manager / Sales Rep (กรองเฉพาะ Rep ในสายงานจริงเท่านั้น)
              // ----------------------------------------------------
              var allowedReps = window.myAllowedRepIds || [];
              if (myRepId && allowedReps.indexOf(myRepId) === -1) {
                  allowedReps.push(myRepId);
              }

              if (allowedReps.length > 0) {
                  dataQuery = dataQuery.in('Rep_ID', allowedReps);
                  countQuery = countQuery.in('Rep_ID', allowedReps);
              } else {
                  dataQuery = dataQuery.eq('Visit_ID', '00000000-0000-0000-0000-000000000000');
                  countQuery = countQuery.eq('Visit_ID', '00000000-0000-0000-0000-000000000000');
              }
          }
      }

      // 🎯 3. Filter Controls
      var statusEl = document.getElementById('filterVisitStatus');
      var statusTerm = window.tomSelectStatusInstance ? window.tomSelectStatusInstance.getValue() : (statusEl ? statusEl.value : '');
      if (typeof window.updateStatCardActiveUI === 'function') window.updateStatCardActiveUI(statusTerm);
      
      var startDateTerm = document.getElementById('filterStartDate') ? document.getElementById('filterStartDate').value : '';
      var endDateTerm = document.getElementById('filterEndDate') ? document.getElementById('filterEndDate').value : '';

      var repEl = document.getElementById('filterVisitRep');
      var selectedReps = window.tomSelectRepInstance ? window.tomSelectRepInstance.getValue() : (repEl ? Array.from(repEl.selectedOptions).map(function(o){ return o.value; }) : []);
      if (!Array.isArray(selectedReps)) selectedReps = selectedReps ? [selectedReps] : [];

      var terEl = document.getElementById('filterVisitTerritory');
      var selectedTers = window.tomSelectTerInstance ? window.tomSelectTerInstance.getValue() : (terEl ? Array.from(terEl.selectedOptions).map(function(o){ return o.value; }) : []);
      if (!Array.isArray(selectedTers)) selectedTers = selectedTers ? [selectedTers] : [];

      if (statusTerm) {
          dataQuery = dataQuery.eq('Status', statusTerm);
      }

      if (startDateTerm) {
          dataQuery = dataQuery.gte('Visit_Date', startDateTerm);
          countQuery = countQuery.gte('Visit_Date', startDateTerm);
      }
      if (endDateTerm) {
          dataQuery = dataQuery.lte('Visit_Date', endDateTerm);
          countQuery = countQuery.lte('Visit_Date', endDateTerm);
      }

      if (selectedReps.length > 0) {
          dataQuery = dataQuery.in('Rep_ID', selectedReps);
          countQuery = countQuery.in('Rep_ID', selectedReps);
      }

      if (selectedTers.length > 0) {
          dataQuery = dataQuery.in('Territory_ID', selectedTers);
          countQuery = countQuery.in('Territory_ID', selectedTers);
      }

      // 🔍 4. Smart Search Filter
      var rawSearchVal = document.getElementById('smartSearchInput') ? document.getElementById('smartSearchInput').value.trim().toLowerCase() : '';
      if (rawSearchVal) {
          var searchTerms = rawSearchVal.split(/\s+/);
          for (var i = 0; i < searchTerms.length; i++) {
              var term = searchTerms[i];
              dataQuery = dataQuery.or(`Details.ilike.%${term}%,Insight.ilike.%${term}%,Next_Action.ilike.%${term}%`);
          }
      }

      // 📊 5. KPI Count Query
      var countRes = await countQuery;
      var totalC = 0, pendingC = 0, submittedC = 0;
      if (!countRes.error && countRes.data) {
          totalC = countRes.data.length;
          pendingC = countRes.data.filter(function(d) { return d.Status === 'Pending'; }).length;
          submittedC = countRes.data.filter(function(d) { return d.Status === 'Submitted'; }).length;
      }
      if (typeof window.updateStatCards === 'function') {
          window.updateStatCards(totalC, pendingC, submittedC);
      }

      // 📊 6. Server-Side Range (ดึงแค่ 20 แถว)
      var page = window.currentPage || 1;
      var limit = parseInt(window.rowsPerPage) || 20;
      var from = (page - 1) * limit;
      var to = from + limit - 1;
      dataQuery = dataQuery.range(from, to);

      var res = await dataQuery;
      if (res.error) throw res.error;

      window.globalVisits = res.data || [];
      window.totalVisitsCount = res.count || 0;
      
      window._visitSampleIndex = {};

      if (window.globalVisits.length > 0) {
        var vIds = window.globalVisits.map(function(v) { return v.Visit_ID; });

        try {
          var subPromises = [
            sb.from('Visit_Products').select('*').in('Visit_ID', vIds),
            sb.from('Visit_Samples').select('Visit_ID, Sample_ID, Quantity').in('Visit_ID', vIds)
          ];

          var results = await Promise.all(subPromises);

          window.globalVisitProducts = (results[0] && results[0].data) ? results[0].data : [];

          if (results[1] && results[1].data) {
            results[1].data.forEach(function(s) {
              if (s.Visit_ID) {
                var vid = String(s.Visit_ID).trim().toLowerCase();
                if (!window._visitSampleIndex[vid]) window._visitSampleIndex[vid] = [];
                window._visitSampleIndex[vid].push(s);
              }
            });
          }
        } catch (subErr) {
          console.warn("Sub-tables fetch error:", subErr);
          window.globalVisitProducts = [];
        }
      } else {
        window.globalVisitProducts = [];
      }

      if (typeof window.buildDataIndexes === 'function') window.buildDataIndexes();

      window.renderVisitTableServerSide();
      
      if (window.VisitManagerCache && window.VisitManagerCache.currentMainView === 'calendar') {
          if (typeof window.renderCalendarView === 'function') window.renderCalendarView();
      }

      var myDraftsCount = (window.globalVisits || []).filter(function(v) { return v.Status === 'Pending' && String(v.Rep_ID) === myRepId; }).length;
      if (typeof window.checkMyDraftsReminder === 'function') window.checkMyDraftsReminder(myDraftsCount);

    } catch (err) {
      console.error("Load Visits Error:", err);
      var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
      var msgErr = appLang === 'en' ? '❌ Failed to load data: ' : '❌ ดึงข้อมูลไม่สำเร็จ: ';
      var tbody = document.getElementById('visitTableBody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">' + msgErr + err.message + '</td></tr>';
    } finally {
      if (visitViewEl) visitViewEl.classList.remove('is-loading');
    }
};

function matchedTerAndUnique(arr) {
    return arr.filter(function(item, pos) {
        return item && item !== 'null' && item !== 'undefined' && arr.indexOf(item) === pos;
    });
}

// ==========================================
// 💾 HELPER: SAVE & RESTORE FILTER STATE
// ==========================================
window.saveVisitFilterState = function() {
    window.VisitManagerCache = window.VisitManagerCache || {};
    window.VisitManagerCache.savedFilters = {
        search: document.getElementById('smartSearchInput') ? document.getElementById('smartSearchInput').value : '',
        status: window.tomSelectStatusInstance ? window.tomSelectStatusInstance.getValue() : '',
        startDate: document.getElementById('filterStartDate') ? document.getElementById('filterStartDate').value : '',
        endDate: document.getElementById('filterEndDate') ? document.getElementById('filterEndDate').value : '',
        page: window.currentPage || 1
    };
};

window.restoreVisitFilterState = function() {
    if (!window.VisitManagerCache || !window.VisitManagerCache.savedFilters) return;
    var sf = window.VisitManagerCache.savedFilters;

    if (sf.search && document.getElementById('smartSearchInput')) {
        document.getElementById('smartSearchInput').value = sf.search;
    }
    if (sf.startDate && document.getElementById('filterStartDate')) {
        document.getElementById('filterStartDate').value = sf.startDate;
    }
    if (sf.endDate && document.getElementById('filterEndDate')) {
        document.getElementById('filterEndDate').value = sf.endDate;
    }
    if (sf.status && window.tomSelectStatusInstance) {
        window.tomSelectStatusInstance.setValue(sf.status, true);
    }
    if (sf.rep && sf.rep.length > 0 && window.tomSelectRepInstance) {
        window.tomSelectRepInstance.setValue(sf.rep, true);
    }
    if (sf.ter && sf.ter.length > 0 && window.tomSelectTerInstance) {
        window.tomSelectTerInstance.setValue(sf.ter, true);
    }
    if (sf.page) window.currentPage = sf.page;
};

window.renderVisitTableServerSide = function() {
  var tbody = document.getElementById('visitTableBody');
  if (!tbody) return;

  var data = window.globalVisits || [];
  var totalItems = window.totalVisitsCount || 0;
  var rows = parseInt(window.rowsPerPage) || 20;
  if (rows <= 0) rows = 20; 
  var totalPages = Math.ceil(totalItems / rows);
  
  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';

  if (data.length === 0) {
      if (document.getElementById('visitPaginationContainer')) document.getElementById('visitPaginationContainer').classList.add('d-none');
      var msgNoData = appLang === 'en' ? 'No visit records found.' : 'ไม่พบข้อมูลบันทึกเยี่ยม';
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5"><i class="fa-solid fa-folder-open fs-3 mb-2 d-block text-muted"></i>' + msgNoData + '</td></tr>';
      return;
  }

  if (document.getElementById('visitPaginationContainer')) document.getElementById('visitPaginationContainer').classList.remove('d-none');

  var startIndex = ((window.currentPage - 1) * rows) + 1;
  var endIndex = Math.min(startIndex + data.length - 1, totalItems);
  if (document.getElementById('visitPageInfo')) {
      document.getElementById('visitPageInfo').innerText = appLang === 'en' 
          ? 'Showing ' + startIndex + ' to ' + endIndex + ' of ' + totalItems + ' entries'
          : 'แสดง ' + startIndex + ' ถึง ' + endIndex + ' จาก ' + totalItems + ' รายการ';
  }

  var smartSearchVal = document.getElementById('smartSearchInput') ? document.getElementById('smartSearchInput').value : '';
  var htmlBuffer = '';

  data.forEach(function(v) {
    var isPendingUnlock = (window.globalPendingUnlockVisits || []).indexOf(v.Visit_ID) !== -1;
    var badgeClass = (v.Status === 'Submitted') ? 'badge-soft-success' : 'badge-soft-pending';
    
    var statusShow = (v.Status === 'Submitted') 
        ? (appLang === 'en' ? '✅ Submitted' : '✅ ส่งแล้ว') 
        : (appLang === 'en' ? '⏳ Pending' : '⏳ รอส่ง');
        
    if (isPendingUnlock) { 
        badgeClass = 'badge-soft-secondary'; 
        statusShow = appLang === 'en' ? '⏳ Pending Unlock' : '⏳ รอปลดล็อก'; 
    }

    var dateShow = (typeof formatToDDMMYYYY === 'function') ? formatToDDMMYYYY(v.Visit_Date) : v.Visit_Date;
    
    // 🌟 [FIX]: อ่านข้อมูลหมอจาก Relation Join v.Doctors ก่อน ถ้าไม่มีค่อย fallback ไปใช้ Index
    var rawDocId = String(v.Doc_ID || v.doc_id || v.Doctor_ID || v.id || '').trim();
    var docObj = v.Doctors || ((window._docIndex && rawDocId) ? (window._docIndex[rawDocId.toLowerCase()] || window._docIndex[rawDocId]) : null);
    var docNameShow = (typeof window.getDoctorNameByLang === 'function') ? window.getDoctorNameByLang(docObj, rawDocId) : rawDocId;
    
    var hospNameShow = (typeof window.getHospitalNameFromDocOrVisit === 'function') ? window.getHospitalNameFromDocOrVisit(docObj, v) : '-';
    var hospLat = docObj ? (docObj.Hospital_Lat || docObj.Lat || docObj.latitude) : null;
    var hospLng = docObj ? (docObj.Hospital_Long || docObj.Lng || docObj.longitude) : null;

    var distanceBadge = '';
    // 🌟 ดักจับ Config GPS: โชว์ไอคอนหมุดเมื่อฟีเจอร์เปิดอยู่เท่านั้น
    if (window.globalVisitConfigs && window.globalVisitConfigs.gps !== false && v.CheckIn_Lat && v.CheckIn_Long) {
      var googleMapUrl = 'https://www.google.com/maps?q=' + v.CheckIn_Lat + ',' + v.CheckIn_Long;
      if (hospLat && hospLng) {
        var distKm = window.calculateDistanceKm(parseFloat(hospLat), parseFloat(hospLng), parseFloat(v.CheckIn_Lat), parseFloat(v.CheckIn_Long));
        if (distKm !== null && distKm <= 0.5) {
          var ttCheckOk = appLang === 'en' ? 'Check-in verified (<500m)' : 'พิกัดถูกต้อง (<500ม.)';
          distanceBadge = ' <a href="' + googleMapUrl + '" target="_blank" class="text-success ms-1" title="' + ttCheckOk + '"><i class="fa-solid fa-circle-check"></i></a>';
        } else {
          var distShow = distKm < 1 ? Math.round(distKm * 1000) + 'm' : distKm.toFixed(1) + 'km';
          var ttCheckFar = appLang === 'en' ? 'Off-site: ' : 'ห่างจากจุดหมาย: ';
          distanceBadge = ' <a href="' + googleMapUrl + '" target="_blank" class="text-danger ms-1" title="' + ttCheckFar + distShow + '"><i class="fa-solid fa-location-dot"></i></a>';
        }
      } else {
        var ttMap = appLang === 'en' ? 'Open Google Maps' : 'เปิด Google Maps';
        distanceBadge = ' <a href="' + googleMapUrl + '" target="_blank" class="text-secondary opacity-75 ms-1" title="' + ttMap + '"><i class="fa-solid fa-location-dot"></i></a>';
      }
    }

    var purposeShow = (typeof window.getPurposeText === 'function') ? window.getPurposeText(v.Purpose_ID || v.Purpose, v.Purpose) : (v.Purpose || '-'); 
    var applyHighlight = (typeof window.applySearchHighlight === 'function') ? window.applySearchHighlight : function(t) { return t; };
    var highlightedDoc = applyHighlight(docNameShow, smartSearchVal); 
    var highlightedHosp = applyHighlight(hospNameShow, smartSearchVal);
    var highlightedPurpose = applyHighlight(purposeShow, smartSearchVal);

    var cleanVid = String(v.Visit_ID || v.visit_id || '').trim().toLowerCase();
    var visitProds = (window._visitProdIndex && cleanVid) ? (window._visitProdIndex[cleanVid] || window._visitProdIndex[v.Visit_ID] || []) : [];
    var prodBadges = '';
    if (visitProds.length > 0) {
      visitProds.forEach(function(vp) {
          var rawPId = String(vp.Product_ID || vp.product_id || '').trim();
          var pObj = (window._prodIndex && rawPId) ? (window._prodIndex[rawPId.toLowerCase()] || window._prodIndex[rawPId]) : null;
          var pName = pObj ? (pObj.Product || pObj.Product_TH) : rawPId;
          prodBadges += '<span class="badge badge-soft-product me-1 mb-1">' + applyHighlight(pName, smartSearchVal) + '</span>';
      });
    } else prodBadges = '<span class="text-muted small">-</span>';
 
    var evidenceBadges = '';
    
    if (v.Is_Coaching) {
      var coachingTooltip = appLang === 'en' ? 'Joint Visit / Coaching' : 'มีผู้จัดการออกเยี่ยมร่วม (Coaching)';
      evidenceBadges += ' <span class="badge badge-soft-info ms-1" title="' + coachingTooltip + '"><i class="fa-solid fa-clipboard-user text-info"></i></span>';
    }

    // 🌟 ดักจับ Config Attachments: โชว์เฉพาะเปิดฟีเจอร์
    if (window.globalVisitConfigs && window.globalVisitConfigs.att !== false && v.Attachments && v.Attachments !== '[]' && v.Attachments !== '') {
      var ttAttach = appLang === 'en' ? 'Has Attachments' : 'มีไฟล์แนบ';
      evidenceBadges += ' <span class="badge badge-soft-secondary ms-1" title="' + ttAttach + '"><i class="fa-solid fa-paperclip text-secondary"></i></span>';
    }

    // 🌟 ดักจับ Config Signature: โชว์เฉพาะเปิดฟีเจอร์
    if (window.globalVisitConfigs && window.globalVisitConfigs.sig !== false && v.Doctor_Signature) {
      var ttSig = appLang === 'en' ? 'Doctor Signed' : 'แพทย์เซ็นชื่อแล้ว';
      evidenceBadges += ' <span class="badge badge-soft-success ms-1" title="' + ttSig + '"><i class="fa-solid fa-signature text-success"></i></span>';
    }

    var vidClean = String(v.Visit_ID || '').trim().toLowerCase();
    var sampleItems = (window._visitSampleIndex && window._visitSampleIndex[vidClean]) 
                      ? window._visitSampleIndex[vidClean] 
                      : (v.Visit_Samples || []);
                      
    // 🌟 ดักจับ Config Samples: โชว์เฉพาะเปิดฟีเจอร์
    if (window.globalVisitConfigs && window.globalVisitConfigs.samples !== false && sampleItems && sampleItems.length > 0) {
      var ttSample = appLang === 'en' ? 'Has Samples / Promo Items' : 'มีการจ่ายสินค้าตัวอย่าง/ของแจก';
      evidenceBadges += ' <span class="badge badge-soft-warning ms-1" title="' + ttSample + '"><i class="fa-solid fa-gifts text-warning"></i></span>';
    }

    htmlBuffer += '<tr onclick="window.openEditVisitView(\'' + v.Visit_ID + '\')" style="cursor: pointer;">' +
      '<td class="text-center fw-bold"><a href="#" class="table-visit-link" onclick="event.stopPropagation(); window.openEditVisitView(\'' + v.Visit_ID + '\'); return false;">' + dateShow + '</a></td>' +
      '<td class="text-start ps-3"><span class="table-doc-name">' + highlightedDoc + '</span>' + evidenceBadges + '</td>' +
      '<td><span class="table-hosp-text"><i class="fa-solid fa-hospital me-1"></i>' + highlightedHosp + '</span>' + distanceBadge + '</td>' +
      '<td>' + prodBadges + '</td>' +
      '<td><small class="text-secondary">' + highlightedPurpose + '</small></td>' +
      '<td class="text-center"><span class="badge ' + badgeClass + '">' + statusShow + '</span></td>' +
      '<td class="text-center text-muted opacity-50 pe-3"><i class="fa-solid fa-chevron-right fs-6"></i></td>' +
    '</tr>';
  });

  tbody.innerHTML = htmlBuffer;
  if (typeof window.renderPaginationControls === 'function') {
    window.renderPaginationControls(totalPages);
  }

  var searchInput = document.getElementById('smartSearchInput');
  if (searchInput && document.activeElement !== searchInput) {
      var cursorDocPos = searchInput.value.length;
      if (searchInput.value.trim() !== '') {
          searchInput.focus();
          searchInput.setSelectionRange(cursorDocPos, cursorDocPos);
      }
  }
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
    if (window.isInitialLoading) return; 
    window.currentPage = 1;
    window.loadVisits(true); 
};

window.debouncedFilterVisits = function() {
    if (window.filterDebounceTimer) clearTimeout(window.filterDebounceTimer);
    window.filterDebounceTimer = setTimeout(function() {
        window.currentPage = 1;
        if (typeof window.loadVisits === 'function') window.loadVisits(true);
    }, 400);
};

window.sortVisits = function(col) {
  if (window.currentSortCol === col) window.currentSortAsc = !window.currentSortAsc; 
  else { window.currentSortCol = col; window.currentSortAsc = true; }
  window.loadVisits(true);
};

// ==========================================
// 📝 10. FORM ACTIONS
// ==========================================
window.toggleVisitFormEditable = function(isEditable) {
  var fields = ['visitDate', 'visitStartTime', 'visitEndTime', 'visitDetails', 'visitInsight', 'visitNextAction', 'visitStatus', 'visitIsCoaching'];
  var formView = document.getElementById('visitFormView');

  if (window.tomSelectDocInstance) { if (isEditable) window.tomSelectDocInstance.enable(); else window.tomSelectDocInstance.disable(); }
  if (window.tomSelectProdInstance) { if (isEditable) window.tomSelectProdInstance.enable(); else window.tomSelectProdInstance.disable(); }
  if (window.tomSelectPurposeInstance) { if (isEditable) window.tomSelectPurposeInstance.enable(); else window.tomSelectPurposeInstance.disable(); }

  // 🌟 [FIXED] สั่งควบคุมสถานะล็อก / ปลดล็อกของ Flatpickr สำหรับช่องวันที่ (#visitDate)
  if (window.fpFormDateInstance) {
      if (window.fpFormDateInstance._input) window.fpFormDateInstance._input.disabled = !isEditable;
      if (window.fpFormDateInstance.altInput) window.fpFormDateInstance.altInput.disabled = !isEditable;
  }

  if (formView) { if(isEditable) formView.classList.remove('disabled-ts'); else formView.classList.add('disabled-ts'); }
  fields.forEach(function(id) { var el = document.getElementById(id); if (el) el.disabled = !isEditable; });
  
  var btns = ['btnMicDoc', 'btnMicDetails', 'btnMicInsight', 'btnMicNextAction', 'btnQuickNow', 'btnQuick30', 'btnQuick60'];
  btns.forEach(function(id) { var btn = document.getElementById(id); if (btn) btn.disabled = !isEditable; });
};

 window.openEditVisitView = function(visitId, overrideDocId, overridePurposeId) {
  if (typeof window.switchVisitView === 'function') window.switchVisitView('visitFormView');
  window.applyVisitFeaturesUI();

  var fields = ['visitDocId', 'visitProductId', 'visitDate', 'visitPurpose'];
  fields.forEach(function(id) { var el = document.getElementById(id); if (el) el.classList.remove('is-invalid'); });

  var v = (window.globalVisits && window.globalVisits.length > 0) 
    ? window.globalVisits.find(function(x) { return String(x.Visit_ID) === String(visitId); }) 
    : null;

  var crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}
  var myRole = crmUser ? String(crmUser.Role || crmUser.role || '').toLowerCase().trim() : '';
  var myRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || crmUser.User_ID || '').trim() : '';
  var myEmail = crmUser ? String(crmUser.Email || crmUser.email || '').toLowerCase().trim() : '';

  var isAdmin = (myRole === 'admin' || myRole === 'system admin');
  var creatorRepId = v ? String(v.Rep_ID || v.rep_id || '').trim() : '';
  var creatorWho = v ? String(v.Whoupdated || v.whoupdated || '').toLowerCase().trim() : '';
  var isCreator = (myRepId && creatorRepId && myRepId === creatorRepId) || (myEmail && creatorWho && myEmail === creatorWho);
  var canEdit = (isAdmin || isCreator);

  document.getElementById('visitId').value = visitId; 

  // 🌟 [FIXED]: แปลภาษาหัวข้อ Edit Visit แบบ Dynamic
  var appLangTitle = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  var titleTextEdit = (typeof window.t === 'function') ? window.t('title_edit_visit') : (appLangTitle === 'th' ? 'แก้ไขข้อมูลการเยี่ยม' : 'Edit Visit');
  document.getElementById('formVisitTitle').innerHTML = '✏️ <span data-i18n="title_edit_visit">' + titleTextEdit + '</span>';

  if (v) {
      var userList = window.globalUsersList || (window.VisitManagerCache ? window.VisitManagerCache.users : []) || [];
      var targetRepObj = userList.find(function(u) {
          var uid = String(u.Rep_ID || u.User_ID || u.id || '').trim().toLowerCase();
          var uem = String(u.Email || u.email || '').trim().toLowerCase();
          return (v.Rep_ID && uid === String(v.Rep_ID).trim().toLowerCase()) || (v.Whoupdated && uem === String(v.Whoupdated).trim().toLowerCase());
      });

      if (typeof window.updateFormUserInfo === 'function') {
          window.updateFormUserInfo(targetRepObj, v.Territory_ID, v);
      }

      if (v && v.Visit_Date) {
          var rawDate = String(v.Visit_Date).split('T')[0];
          document.getElementById('visitDate').value = rawDate;
          
          if (window.fpFormDateInstance) {
              window.fpFormDateInstance.setDate(rawDate, false);
          }
      } else {
          document.getElementById('visitDate').value = '';
          if (window.fpFormDateInstance) {
              window.fpFormDateInstance.clear();
          }
      }

      if (typeof window.formatTimeString === 'function') {
          document.getElementById('visitStartTime').value = window.formatTimeString(v.Start_Time);
          document.getElementById('visitEndTime').value = window.formatTimeString(v.End_Time);
      }
      document.getElementById('visitDetails').value = v.Details || '';
      document.getElementById('visitInsight').value = v.Insight || ''; 
      document.getElementById('visitNextAction').value = v.Next_Action || '';
      document.getElementById('visitStatus').value = v.Status || 'Pending';
      
      var chkCoach = document.getElementById('visitIsCoaching');
      var coachWrapper = document.getElementById('visitCoachWrapper');
      var coachSelect = document.getElementById('visitCoachRepId');
      
      if (chkCoach) {
          chkCoach.checked = (v.Is_Coaching === true);
          if (coachWrapper) coachWrapper.classList.toggle('d-none', !v.Is_Coaching);
          if (coachSelect) coachSelect.value = v.Coach_Rep_ID || '';
      }
  }

  var targetDocId = overrideDocId || (v ? v.Doc_ID : null) || sessionStorage.getItem('returnToDocId');
  if (targetDocId && window.tomSelectDocInstance) {
      window.tomSelectDocInstance.setValue(targetDocId, true);
  }

  var rawPurpose = overridePurposeId || (v ? (v.Purpose_ID || v.Purpose || v.Objective) : '');
  var dbPurposeVal = String(rawPurpose || '').trim();
  if (dbPurposeVal && dbPurposeVal !== '-' && window.tomSelectPurposeInstance) {
      window.tomSelectPurposeInstance.setValue(dbPurposeVal, true);
  }

  requestAnimationFrame(function() {
      if (targetDocId && typeof window.fetchLastVisitHistory === 'function') {
          window.fetchLastVisitHistory(targetDocId);
      }

      if (typeof window.renderFormProductDropdown === 'function') {
          window.renderFormProductDropdown().then(function() {
              var visitProds = (window.globalVisitProducts && v) ? window.globalVisitProducts.filter(function(vp) { 
                  return String(vp.Visit_ID) === String(visitId); 
              }).map(function(vp) { return String(vp.Product_ID); }) : [];
              
              if (window.tomSelectProdInstance && visitProds.length > 0) {
                  window.tomSelectProdInstance.setValue(visitProds, true);
              }
              if (typeof window.loadProductMedia === 'function') window.loadProductMedia();
          });
      }

      if (typeof window.loadVisitSamplesForEdit === 'function') {
          window.loadVisitSamplesForEdit(visitId);
      }

      if (typeof window.updateFeatureButtonIndicators === 'function') {
          window.updateFeatureButtonIndicators(v);
      }
  });

  var latInput = document.getElementById('visitLat');
  var lngInput = document.getElementById('visitLng');
  var btnGps = document.getElementById('btnGpsCheckin');
  var timeWrapper = document.getElementById('locationTimeWrapper');
  var timeText = document.getElementById('visitCheckinTimeText');

  if (v && v.CheckIn_Lat && v.CheckIn_Long) {
    if (latInput) latInput.value = v.CheckIn_Lat;
    if (lngInput) lngInput.value = v.CheckIn_Long;
    if (timeWrapper) timeWrapper.classList.remove('d-none');
    if (timeText && v.CheckIn_Time) {
      var cTime = new Date(v.CheckIn_Time);
      timeText.innerText = cTime.getHours().toString().padStart(2, '0') + ':' + cTime.getMinutes().toString().padStart(2, '0');
    }
    if (btnGps) {
      btnGps.className = 'btn btn-success w-100 py-3 mb-4 fw-bold fs-6 shadow-sm d-flex align-items-center justify-content-center gap-2';
      btnGps.style.borderRadius = '16px';
      var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
      btnGps.innerHTML = '<i class="fa-solid fa-check fs-5"></i> <span>' + (appLang === 'en' ? 'Checked-in' : 'เช็คอินแล้ว') + '</span>';
    }
  } else {
    if (latInput) latInput.value = '';
    if (lngInput) lngInput.value = '';
    if (timeWrapper) timeWrapper.classList.add('d-none');
    if (btnGps) {
      btnGps.className = 'btn btn-premium-primary w-100 py-3 mb-4 fw-bold fs-6 shadow-sm d-flex align-items-center justify-content-center gap-2';
      btnGps.style.borderRadius = '16px';
      var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
      btnGps.innerHTML = '<i class="fa-solid fa-crosshairs fs-5"></i> <span>' + (appLang === 'en' ? 'Get Current Location' : 'ดึงพิกัดปัจจุบัน') + '</span>';
    }
  }

  window.currentAttachments = [];
  window.newlyUploadedFiles = [];
  window.pendingDeleteFiles = [];
  window.pendingDetailingLogs = []; 

  if (v && v.Attachments) {
    try {
      var rawArr = typeof v.Attachments === 'string' ? JSON.parse(v.Attachments) : v.Attachments;
      if (Array.isArray(rawArr)) {
        window.currentAttachments = rawArr.map(function(item) {
          var fileUrl = typeof item === 'string' ? item : (item.url || '');
          var cleanUrl = fileUrl.split('?')[0];
          var fName = (typeof item === 'object' && item.fileName) ? item.fileName : decodeURIComponent(cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1));
          return { name: (typeof item === 'object' && item.name) ? item.name : fName, url: fileUrl, fileName: fName };
        });
      }
    } catch (e) { window.currentAttachments = []; }
  }
  if (typeof window.renderAttachmentPreviews === 'function') window.renderAttachmentPreviews();

  if (v && v.Doctor_Signature) {
    window.savedSignatureData = v.Doctor_Signature;
  } else {
    window.savedSignatureData = null;
  }
  if (typeof window.updateSignaturePreviewUI === 'function') window.updateSignaturePreviewUI();

  var isPendingUnlock = window.globalPendingUnlockVisits ? window.globalPendingUnlockVisits.indexOf(visitId) !== -1 : false;
  var btn = document.getElementById('saveVisitBtn');
  var currentAppLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';

  if (isPendingUnlock) {
    if (typeof window.toggleVisitFormEditable === 'function') window.toggleVisitFormEditable(false);
    if (btn) {
      btn.disabled = true; 
      btn.className = 'btn btn-premium-locked px-5';
      btn.innerHTML = '<i class="fa-solid fa-clock me-2"></i>' + (currentAppLang === 'en' ? 'Waiting for Admin unlock' : 'รอแอดมินอนุมัติปลดล็อก'); 
      btn.dataset.mode = 'disabled';
    }
  } else if (v && v.Status === 'Submitted') {
    if (typeof window.toggleVisitFormEditable === 'function') window.toggleVisitFormEditable(false);
    if (btn) {
      if (canEdit) {
        btn.disabled = false; 
        btn.className = 'btn btn-premium-warning px-5';
        btn.innerHTML = '<i class="fa-solid fa-unlock-keyhole me-2"></i>' + (currentAppLang === 'en' ? 'Request Unlock' : 'ขอปลดล็อกแก้ไข'); 
        btn.dataset.mode = 'request_unlock';
      } else {
        btn.disabled = true; 
        btn.className = 'btn btn-premium-locked px-5';
        btn.innerHTML = '<i class="fa-solid fa-lock me-2"></i>' + (currentAppLang === 'en' ? 'Locked (Read-Only)' : 'ถูกล็อก (ดูได้อย่างเดียว)'); 
        btn.dataset.mode = 'disabled';
      }
    }
  } else {
    if (canEdit) {
      if (typeof window.toggleVisitFormEditable === 'function') window.toggleVisitFormEditable(true);
      if (btn) {
        btn.disabled = false; 
        btn.className = 'btn btn-premium-primary px-5';
        btn.innerHTML = '💾 <span data-i18n="btn_save">' + (currentAppLang === 'en' ? 'Save' : 'บันทึก') + '</span>'; 
        btn.dataset.mode = 'save';
      }
    } else {
      if (typeof window.toggleVisitFormEditable === 'function') window.toggleVisitFormEditable(false);
      if (btn) {
        btn.disabled = true; 
        btn.className = 'btn btn-premium-locked px-5';
        btn.innerHTML = '<i class="fa-solid fa-lock me-2"></i>' + (currentAppLang === 'en' ? 'Read-Only (Creator Only)' : 'ดูได้อย่างเดียว (เฉพาะผู้สร้าง)'); 
        btn.dataset.mode = 'disabled';
      }
    }
  }

  var isReadOnly = true;
  if (!isPendingUnlock && v && v.Status !== 'Submitted' && canEdit) {
    isReadOnly = false;
  }
  if (typeof window.setFormComponentsReadOnly === 'function') {
    window.setFormComponentsReadOnly(isReadOnly);
  }
};

 window.openAddVisitView = async function(presetDate) {
  window.applyVisitFeaturesUI();
  var fields = ['visitDocId', 'visitProductId', 'visitDate', 'visitPurpose'];
  fields.forEach(function(id) { var el = document.getElementById(id); if (el) el.classList.remove('is-invalid'); });

  document.getElementById('visitForm').reset();
  document.getElementById('visitId').value = ''; 

  // 🌟 [FIXED]: แปลภาษาหัวข้อ Add New Visit แบบ Dynamic
  var appLangTitle = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  var titleTextAdd = (typeof window.t === 'function') ? window.t('title_add_visit') : (appLangTitle === 'th' ? 'สร้างบันทึกเยี่ยมใหม่' : 'Add New Visit');
  document.getElementById('formVisitTitle').innerHTML = '📝 <span data-i18n="title_add_visit">' + titleTextAdd + '</span>';
  
  var initialDate = presetDate || new Date().toISOString().split('T')[0];
  document.getElementById('visitDate').value = initialDate;
  if (window.fpFormDateInstance) {
      window.fpFormDateInstance.setDate(initialDate, false);
  }

  document.getElementById('visitStatus').value = 'Pending';
  document.getElementById('visitInsight').value = ''; 
  
  document.getElementById('visitIsCoaching').checked = false; 
  var coachWrapper = document.getElementById('visitCoachWrapper');
  var coachSelect = document.getElementById('visitCoachRepId');
  if (coachWrapper) coachWrapper.classList.add('d-none');
  if (coachSelect) coachSelect.value = '';

  var sampleContainer = document.getElementById('sampleItemsContainer');
  if (sampleContainer) {
      var appLangSm = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
      sampleContainer.innerHTML = '<div class="text-muted small text-center italic" id="noSampleText">' + (appLangSm === 'en' ? 'No samples issued (Click "Add Item")' : 'ไม่มีการจ่ายสินค้าตัวอย่าง (กดปุ่ม "เพิ่มรายการ")') + '</div>';
  }

  if (typeof window.setFormComponentsReadOnly === 'function') window.setFormComponentsReadOnly(false);
  
  window.savedSignatureData = null;
  window.currentAttachments = [];
  window.newlyUploadedFiles = [];
  window.pendingDeleteFiles = [];
  window.pendingDetailingLogs = []; 
 
  if (typeof window.renderAttachmentPreviews === 'function') window.renderAttachmentPreviews();
  if (typeof window.updateSignaturePreviewUI === 'function') window.updateSignaturePreviewUI();

  if (document.getElementById('visitLat')) document.getElementById('visitLat').value = '';
  if (document.getElementById('visitLng')) document.getElementById('visitLng').value = '';
  if (document.getElementById('locationTimeWrapper')) document.getElementById('locationTimeWrapper').classList.add('d-none');
  
  var btnGps = document.getElementById('btnGpsCheckin');
  if (btnGps) {
    btnGps.disabled = false;
    btnGps.className = 'btn btn-premium-primary w-100 py-3 mb-4 fw-bold fs-6 shadow-sm d-flex align-items-center justify-content-center gap-2';
    btnGps.style.borderRadius = '16px';
    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    btnGps.innerHTML = '<i class="fa-solid fa-crosshairs fs-5"></i> <span>' + (appLang === 'en' ? 'Get Current Location' : 'ดึงพิกัดปัจจุบัน') + '</span>';
  }

  if (typeof window.initUserInfo === 'function') window.initUserInfo(); 

  if (window.tomSelectDocInstance) { window.tomSelectDocInstance.clear(); window.tomSelectDocInstance.enable(); }
  if (window.tomSelectPurposeInstance) { window.tomSelectPurposeInstance.clear(); window.tomSelectPurposeInstance.enable(); }
  if (window.tomSelectProdInstance) { window.tomSelectProdInstance.clear(); window.tomSelectProdInstance.enable(); }

  if (typeof window.renderFormProductDropdown === 'function') await window.renderFormProductDropdown();
  if (typeof window.toggleVisitFormEditable === 'function') window.toggleVisitFormEditable(true);

  if (typeof window.updateFeatureButtonIndicators === 'function') window.updateFeatureButtonIndicators(null);

  var returnToDocId = sessionStorage.getItem('returnToDocId');
  if (returnToDocId && window.tomSelectDocInstance) {
      if (typeof window.setTomSelectValue === 'function') window.setTomSelectValue(window.tomSelectDocInstance, returnToDocId);
      window.tomSelectDocInstance.disable(); 
  }

  if (typeof window.restoreFormDraft === 'function') window.restoreFormDraft('NEW');

  var btn = document.getElementById('saveVisitBtn');
  if (btn) {
      btn.dataset.mode = 'save'; btn.className = 'btn btn-premium-primary px-4 py-2 rounded-3 shadow-sm';
      btn.innerHTML = '💾 <span data-i18n="btn_save">Save</span>'; btn.disabled = false;
  }

  if (typeof window.switchVisitView === 'function') window.switchVisitView('visitFormView');
  window.attachAutosaveListeners();
  setTimeout(() => { window.checkAndRestoreAutosave(); }, 500);
};

window.handleSaveVisit = async function(e) {
  e.preventDefault();
  var btn = document.getElementById('saveVisitBtn');
  var mode = btn ? btn.dataset.mode : '';

  if (mode === 'disabled') return;
  if (mode === 'request_unlock') { 
    if (typeof window.requestUnlockVisit === 'function') {
      window.requestUnlockVisit(document.getElementById('visitId').value); 
    }
    return; 
  }

  var docVal = window.tomSelectDocInstance ? window.tomSelectDocInstance.getValue() : '';
  var dateInput = document.getElementById('visitDate');
  var purposeVal = window.tomSelectPurposeInstance ? window.tomSelectPurposeInstance.getValue() : '';

  var selectedProducts = [];
  if (window.tomSelectProdInstance) {
      var val = window.tomSelectProdInstance.getValue();
      selectedProducts = Array.isArray(val) ? val : (val ? [val] : []);
  }
  selectedProducts = selectedProducts.filter(function(p) { return p.trim() !== ""; });

  var validateFields = ['visitDocId', 'visitProductId', 'visitDate', 'visitPurpose'];
  validateFields.forEach(function(id) { var el = document.getElementById(id); if (el) el.classList.remove('is-invalid'); });

  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  var missingFields = [];
  
  if (!docVal) missingFields.push(appLang === 'en' ? "• Doctor" : "• ชื่อแพทย์");
  if (selectedProducts.length === 0) missingFields.push(appLang === 'en' ? "• Products" : "• ผลิตภัณฑ์");
  if (!dateInput || !dateInput.value) missingFields.push(appLang === 'en' ? "• Date" : "• วันที่");
  if (!purposeVal) missingFields.push(appLang === 'en' ? "• Purpose" : "• วัตถุประสงค์");

  // 🌟 [เพิ่มใหม่] ตรวจสอบ Validation กรณีเปิดสวิตช์ Coaching
  var isCoaching = document.getElementById('visitIsCoaching') ? document.getElementById('visitIsCoaching').checked : false;
  var coachRepId = document.getElementById('visitCoachRepId') ? document.getElementById('visitCoachRepId').value : null;
  
  if (isCoaching && !coachRepId) {
      missingFields.push(appLang === 'en' ? "• Coach / Joint With" : "• ระบุชื่อผู้ร่วมเยี่ยม (Coach)");
  }

  if (missingFields.length > 0) {
    var warnMsg = appLang === 'en' 
        ? "⚠️ Cannot save! Please fill in the following required fields:<br>" 
        : "⚠️ ไม่สามารถบันทึกได้! กรุณากรอกข้อมูลที่จำเป็นต่อไปนี้:<br>";
        
    if (window.showToast) window.showToast(warnMsg + missingFields.join("<br>"), "warning");
    return;
  }

  if (btn) {
    btn.disabled = true; 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Saving...';
  }

  var crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
  var whoUpdated = crmUser ? (crmUser.Email || crmUser.email || crmUser.Rep_Name || crmUser.rep_name || "User") : "Unknown";
  var repId = crmUser ? (crmUser.Rep_ID || crmUser.rep_id || crmUser.User_ID || crmUser.id || null) : null;
  var territoryId = crmUser ? (crmUser.Territory_ID || crmUser.territory_id || crmUser.territoryId || null) : null;

  var existingVisitId = document.getElementById('visitId').value;
  var targetVisitId = existingVisitId || (typeof window.generateUUID === 'function' ? window.generateUUID() : Date.now().toString());
    
  var latVal = document.getElementById('visitLat') ? document.getElementById('visitLat').value : null;
  var lngVal = document.getElementById('visitLng') ? document.getElementById('visitLng').value : null;
  var sigData = (typeof window.getSignatureDataUrl === 'function') ? window.getSignatureDataUrl() : null;

  var attachmentsData = null;
  if (window.currentAttachments && window.currentAttachments.length > 0) {
    attachmentsData = JSON.stringify(window.currentAttachments);
  }

  var payload = {
    Visit_ID: targetVisitId, 
    Rep_ID: repId, 
    Territory_ID: territoryId, 
    Doc_ID: docVal,
    Visit_Date: dateInput.value, 
    Start_Time: document.getElementById('visitStartTime').value || null, 
    End_Time: document.getElementById('visitEndTime').value || null,
    Purpose_ID: purposeVal, 
    Details: document.getElementById('visitDetails').value.trim(), 
    Insight: document.getElementById('visitInsight').value.trim(), 
    Next_Action: document.getElementById('visitNextAction').value.trim(), 
    Is_Coaching: isCoaching, // 🌟 [อัปเดต] ใช้ตัวแปรแทน
    Coach_Rep_ID: isCoaching ? coachRepId : null, // 🌟 [เพิ่มใหม่] ส่งค่า Coach เข้า Database
    Status: document.getElementById('visitStatus').value, 
    Whoupdated: whoUpdated, 
    Whenupdated: new Date().toISOString(),
    CheckIn_Lat: latVal ? parseFloat(latVal) : null, 
    CheckIn_Long: lngVal ? parseFloat(lngVal) : null,
    CheckIn_Time: latVal ? new Date().toISOString() : null, 
    Attachments: attachmentsData, 
    Doctor_Signature: sigData
  };

  // 🌟 ดึงข้อมูล Samples ล่าสุดเฉพาะแถวที่มีการเลือกสินค้าจริง
  var samplePayloads = [];
  if (window.globalVisitConfigs && window.globalVisitConfigs.samples && typeof window.getSamplesData === 'function') {
      var validSamples = window.getSamplesData();
      samplePayloads = validSamples.map(function(item) {
          return {
              Visit_ID: targetVisitId,
              Sample_ID: item.sample_id,
              Quantity: item.quantity,
              Whoupdated: whoUpdated,
              Whenupdated: new Date().toISOString()
          };
      });
  }

  var isOfflineMode = !navigator.onLine;

  try {
    if (isOfflineMode) throw new Error("OFFLINE_MODE");

    if (existingVisitId) {
      var updRes = await window.supabaseClient.from('Visit_Logs').update(payload).eq('Visit_ID', existingVisitId);
      if (updRes.error) throw new Error("Update Visit_Logs error: " + updRes.error.message);
      var delRes = await window.supabaseClient.from('Visit_Products').delete().eq('Visit_ID', existingVisitId);
      if (delRes.error) throw new Error("Delete old Visit_Products error: " + delRes.error.message);
    } else {
      var insRes = await window.supabaseClient.from('Visit_Logs').insert([payload]);
      if (insRes.error) throw new Error("Insert Visit_Logs error: " + insRes.error.message);
    }

    if (selectedProducts.length > 0) {
        var vpPayload = selectedProducts.map(function(p) { return { Visit_ID: targetVisitId, Product_ID: p, Whoupdated: whoUpdated }; });
        var vpRes = await window.supabaseClient.from('Visit_Products').insert(vpPayload);
        if (vpRes.error) throw new Error("Insert Visit_Products error: " + vpRes.error.message);
    }

    if (window.globalVisitConfigs && window.globalVisitConfigs.samples) {
        if (existingVisitId) {
            await window.supabaseClient.from('Visit_Samples').delete().eq('Visit_ID', existingVisitId);
        }

        if (samplePayloads.length > 0) {
            var insSmpRes = await window.supabaseClient.from('Visit_Samples').insert(samplePayloads);
            if (insSmpRes.error) throw new Error("Insert Visit_Samples error: " + insSmpRes.error.message);
        }

        var vidClean = String(targetVisitId).trim().toLowerCase();
        window._visitSampleIndex = window._visitSampleIndex || {};
        window._visitSampleIndex[vidClean] = samplePayloads;
    }

    if (window.pendingDetailingLogs && window.pendingDetailingLogs.length > 0) {
      for (var dIdx = 0; dIdx < window.pendingDetailingLogs.length; dIdx++) {
        var itemLog = window.pendingDetailingLogs[dIdx];
        var logPayload = { Visit_ID: targetVisitId, Media_ID: itemLog.Media_ID, Duration_Seconds: itemLog.Duration_Seconds, Whenopend: itemLog.Whenopend, Whoupdated: itemLog.Whoupdated };
        try {
          var logRes = await window.supabaseClient.from('Visit_Detailing_Logs').insert([logPayload]).select('Log_ID');
          if (!logRes.error && logRes.data && logRes.data.length > 0) {
            var createdLogId = logRes.data[0].Log_ID;
            if (itemLog.Pages && itemLog.Pages.length > 0) {
              var pagePayloads = itemLog.Pages.map(function(pLog) { return { Log_ID: createdLogId, Page_Number: pLog.Page_Number, Duration_Seconds: pLog.Duration_Second, Whenopend: pLog.Whenopend, Whoupdated: itemLog.Whoupdated }; });
              await window.supabaseClient.from('Visit_Detailing_Pages').insert(pagePayloads);
            }
          }
        } catch (detErr) { console.error("Error saving detailing log:", detErr); }
      }
    }
    window.pendingDetailingLogs = [];

    if (window.pendingDeleteFiles && window.pendingDeleteFiles.length > 0) {
      var sbClient = null;
      if (typeof supabase !== 'undefined' && supabase && supabase.storage) sbClient = supabase;
      else if (window.supabase && window.supabase.storage) sbClient = window.supabase;
      else if (window.supabaseClient && window.supabaseClient.storage) sbClient = window.supabaseClient;

      if (sbClient && sbClient.storage) {
        try { await sbClient.storage.from('visit-attachments').remove(window.pendingDeleteFiles); } catch (err) {}
      }
    }
    window.newlyUploadedFiles = []; window.pendingDeleteFiles = [];

    window.globalVisits = window.globalVisits || [];
    var existingIndex = window.globalVisits.findIndex(function(x) { return String(x.Visit_ID) === String(targetVisitId); });
    if (existingIndex !== -1) {
      window.globalVisits[existingIndex] = payload;
    } else {
      window.globalVisits.unshift(payload);
    }

    var msgSuccess = appLang === 'en' ? "Data saved successfully." : "บันทึกข้อมูลเรียบร้อยแล้ว";
    if (window.showToast) window.showToast(msgSuccess, "success");

    localStorage.removeItem('crm_visit_autosave');

    if (typeof window.clearFormDraft === 'function') window.clearFormDraft(existingVisitId || 'NEW');

    var returnDocId = sessionStorage.getItem('returnToDocId');
    if (returnDocId) {
      sessionStorage.removeItem('returnToDocId');
      if (typeof window.returnToDoctorProfile === 'function') window.returnToDoctorProfile(returnDocId); 
    } else {
      if (typeof window.switchVisitView === 'function') window.switchVisitView('visitListView');
      if (typeof window.loadVisits === 'function') await window.loadVisits(true); 
    }

  } catch(err) {
    var isNetworkError = err.message === "OFFLINE_MODE" || err.message.indexOf('Failed to fetch') !== -1 || err.message.indexOf('NetworkError') !== -1;

    if (isNetworkError) {
        var offlineData = {
            existingVisitId: existingVisitId, 
            targetVisitId: targetVisitId, 
            payload: payload,
            selectedProducts: selectedProducts, 
            samplePayloads: samplePayloads,
            pendingDetailingLogs: window.pendingDetailingLogs || [],
            timestamp: Date.now()
        };

        var queue = JSON.parse(localStorage.getItem('crmOfflineQueue') || '[]');
        queue.push(offlineData);
        localStorage.setItem('crmOfflineQueue', JSON.stringify(queue));

        window.pendingDetailingLogs = []; window.newlyUploadedFiles = []; window.pendingDeleteFiles = [];
        
        if (typeof window.clearFormDraft === 'function') window.clearFormDraft(existingVisitId || 'NEW');

        var msgOfflineSave = appLang === 'en' 
            ? "📶 No Internet Connection: Data saved locally and will auto-sync when online."
            : "📶 ไม่มีสัญญาณอินเทอร์เน็ต: ข้อมูลถูกบันทึกไว้ในเครื่องแล้ว และจะอัปเดตอัตโนมัติเมื่อออนไลน์";
        if (window.showToast) window.showToast(msgOfflineSave, "warning");

        localStorage.removeItem('crm_visit_autosave');
        
        if (typeof window.switchVisitView === 'function') window.switchVisitView('visitListView');
    } else {
        var msgError = appLang === 'en' ? "Failed to save data. Reason: " : "บันทึกข้อมูลไม่สำเร็จ: ";
        if (window.showToast) window.showToast(msgError + err.message, "error");
    }
  } finally {
    if (btn) {
      var saveText = (typeof window.getCurrentAppLang === 'function' && window.getCurrentAppLang() === 'th') ? 'บันทึก' : 'Save';
      btn.disabled = false; 
      btn.innerHTML = "💾 " + saveText;
    }
  }
};

window.requestUnlockVisit = async function(visitId) {
  var btn = document.getElementById('saveVisitBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Submitting request...';

  var crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
  var whoUpdated = crmUser ? (crmUser.Email || crmUser.Rep_Name || "User") : "Unknown";

  var payload = { Action: 'Unlock Visit', Ref_ID: visitId, Requested_Data: JSON.stringify({ Status: 'Pending' }), Status: 'Pending', Whoupdated: whoUpdated };
  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';

  try {
    var res = await window.supabaseClient.from('DCR').insert([payload]);
    if (res.error) throw res.error;
    
    var msgReqSuccess = appLang === 'en' 
        ? "✅ Unlock request submitted successfully. Waiting for Admin approval." 
        : "✅ ส่งคำขอปลดล็อกเรียบร้อยแล้ว รอผู้ดูแลระบบอนุมัติ";
    if (window.showToast) window.showToast(msgReqSuccess, "success");
    
    var returnDocId = sessionStorage.getItem('returnToDocId');
    if (returnDocId) {
      sessionStorage.removeItem('returnToDocId');
      if (typeof window.returnToDoctorProfile === 'function') window.returnToDoctorProfile(returnDocId); 
    } else {
      if (typeof window.switchVisitView === 'function') window.switchVisitView('visitListView');
      if (typeof window.loadVisits === 'function') await window.loadVisits(true); 
    }
  } catch(err) {
    var msgErr = appLang === 'en' ? "❌ Error: " : "❌ เกิดข้อผิดพลาด: ";
    if (window.showToast) window.showToast(msgErr + err.message, "error");
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-unlock-keyhole me-2"></i>Request Unlock';
  }
};

window.cancelVisitForm = async function() {
  localStorage.removeItem('crm_visit_autosave');
  if (typeof window.clearFormDraft === 'function') {
    var vInput = document.getElementById('visitId');
    var draftKey = (vInput && vInput.value) ? vInput.value : 'NEW';
    window.clearFormDraft(draftKey);
  }

  if (window.newlyUploadedFiles && window.newlyUploadedFiles.length > 0) {
    var sbClient = null;
    if (typeof supabase !== 'undefined' && supabase && supabase.storage) sbClient = supabase;
    else if (window.supabase && window.supabase.storage) sbClient = window.supabase;
    else if (window.supabaseClient && window.supabaseClient.storage) sbClient = window.supabaseClient;

    if (sbClient && sbClient.storage) {
      try {
        await sbClient.storage.from('visit-attachments').remove(window.newlyUploadedFiles);
      } catch(err) {}
    }
  }

  window.currentAttachments = []; window.newlyUploadedFiles = []; window.pendingDeleteFiles = []; window.pendingDetailingLogs = [];

  var returnDocId = sessionStorage.getItem('returnToDocId');
  if (returnDocId) {
    sessionStorage.removeItem('returnToDocId');
    if (typeof window.returnToDoctorProfile === 'function') window.returnToDoctorProfile(returnDocId); 
  } else {
    if (typeof window.switchVisitView === 'function') window.switchVisitView('visitListView');
  }
};

window.returnToDoctorProfile = function(docId) {
  if (typeof window.loadComponent === 'function') window.loadComponent('doctor');
  var attempts = 0;
  var checkReady = setInterval(function() {
    attempts++;
    if (typeof window.openViewDoctorProfile === 'function' && window.globalDoctors && window.globalDoctors.length > 0) {
      clearInterval(checkReady); 
      window.openViewDoctorProfile(docId, '#tab-doc-history'); 
    } else if (attempts > 50) { clearInterval(checkReady); }
  }, 100);
};

// ==========================================
// 🎤 11. VOICE DICTATION & SEARCH
// ==========================================
window.toggleDocDictation = function() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) { 
    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    var msgNoMic = appLang === 'en' ? "Sorry, your browser does not support voice dictation." : "ขออภัยครับ เบราว์เซอร์ของคุณไม่รองรับระบบสั่งงานด้วยเสียง";
    if (window.showToast) return window.showToast(msgNoMic, "error");
    return;
  }
  var btn = document.getElementById('btnMicDoc'); var icon = document.getElementById('micDocIcon');
  if (window.docRecognition) { window.docRecognition.stop(); window.docRecognition = null; if (btn && icon) { btn.classList.remove('mic-active'); icon.classList.remove('fa-fade'); } return; }

  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  window.docRecognition = new SpeechRecognition(); window.docRecognition.lang = 'th-TH'; window.docRecognition.continuous = false;
  if (btn && icon) { btn.classList.add('mic-active'); icon.classList.add('fa-fade'); }

  window.docRecognition.onresult = function(event) {
    var spokenText = event.results[0][0].transcript.trim().toLowerCase();
    if (window.tomSelectDocInstance) {
      window.tomSelectDocInstance.focus(); window.tomSelectDocInstance.setTextboxValue(spokenText);
      var options = window.tomSelectDocInstance.options; var matchedId = null;
      for (var id in options) { var text = (options[id].text || '').toLowerCase(); if (text.indexOf(spokenText) !== -1) { matchedId = id; break; } }
      if (matchedId) { window.tomSelectDocInstance.setValue(matchedId); window.tomSelectDocInstance.setTextboxValue(''); window.tomSelectDocInstance.blur(); }
    }
    if (typeof window.stopDocDictation === 'function') window.stopDocDictation();
  };
  window.docRecognition.onerror = window.stopDocDictation; window.docRecognition.onend = window.stopDocDictation; window.docRecognition.start();
};

window.stopDocDictation = function() {
  if (window.docRecognition) { window.docRecognition.stop(); window.docRecognition = null; }
  var btn = document.getElementById('btnMicDoc'); var icon = document.getElementById('micDocIcon');
  if (btn && icon) { btn.classList.remove('mic-active'); icon.classList.remove('fa-fade'); }
};

window.toggleTextDictation = function(targetInputId, btnId) {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    var msgNoMic = appLang === 'en' ? "Sorry, your browser does not support voice dictation." : "ขออภัยครับ เบราว์เซอร์ของคุณไม่รองรับระบบสั่งงานด้วยเสียง";
    if (window.showToast) return window.showToast(msgNoMic, "error");
    return;
  }
  var btn = document.getElementById(btnId);

  if (window.textRecognition && window.currentDictTargetId === targetInputId) { if (typeof window.stopTextDictation === 'function') window.stopTextDictation(); return; }
  if (window.textRecognition && typeof window.stopTextDictation === 'function') window.stopTextDictation();

  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  window.textRecognition = new SpeechRecognition(); window.textRecognition.lang = 'th-TH'; window.textRecognition.continuous = true; window.textRecognition.interimResults = false;
  window.currentDictTargetId = targetInputId; window.currentDictBtnId = btnId;
  if (btn) btn.classList.add('mic-active');

  window.textRecognition.onresult = function(event) {
    var spokenText = event.results[event.results.length - 1][0].transcript.trim();
    var inputEl = document.getElementById(targetInputId);
    if (inputEl && spokenText) {
      var currentVal = inputEl.value; inputEl.value = currentVal ? (currentVal + ' ' + spokenText) : spokenText;
      if (typeof window.saveFormDraft === 'function') window.saveFormDraft(); 
    }
  };
  window.textRecognition.onerror = window.stopTextDictation; window.textRecognition.onend = window.stopTextDictation; window.textRecognition.start();
};

window.stopTextDictation = function() {
  if (window.textRecognition) { window.textRecognition.stop(); window.textRecognition = null; }
  if (window.currentDictBtnId) { var btn = document.getElementById(window.currentDictBtnId); if (btn) btn.classList.remove('mic-active'); }
  window.currentDictTargetId = null; window.currentDictBtnId = null;
};

window.toggleSpeechSearch = function(inputId, btnId, iconId) {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) { 
    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    var msgNoMic = appLang === 'en' ? "Sorry, your browser does not support voice dictation." : "ขออภัยครับ เบราว์เซอร์ของคุณไม่รองรับระบบสั่งงานด้วยเสียง";
    if (window.showToast) return window.showToast(msgNoMic, "error");
    return;
  }
  if (window.searchRecognition && window.currentSearchInputId === inputId) { if (typeof window.stopSearchDictation === 'function') window.stopSearchDictation(); return; }
  if (window.searchRecognition && typeof window.stopSearchDictation === 'function') window.stopSearchDictation();

  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  window.searchRecognition = new SpeechRecognition(); window.searchRecognition.lang = 'th-TH'; window.searchRecognition.continuous = false; window.searchRecognition.interimResults = false;
  window.currentSearchInputId = inputId; window.currentSearchBtnId = btnId; window.currentSearchIconId = iconId;

  var btn = document.getElementById(btnId); var icon = document.getElementById(iconId);
  if (btn && icon) { btn.classList.add('mic-active'); icon.classList.add('fa-fade'); }

  window.searchRecognition.onresult = function(event) {
    var spokenText = event.results[0][0].transcript.trim();
    var inputEl = document.getElementById(inputId);
    if (inputEl && spokenText) { inputEl.value = spokenText; if (typeof window.debouncedFilterVisits === 'function') window.debouncedFilterVisits(); }
    if (typeof window.stopSearchDictation === 'function') window.stopSearchDictation();
  };
  window.searchRecognition.onerror = window.stopSearchDictation; window.searchRecognition.onend = window.stopSearchDictation; window.searchRecognition.start();
};

window.stopSearchDictation = function() {
  if (window.searchRecognition) { window.searchRecognition.stop(); window.searchRecognition = null; }
  if (window.currentSearchBtnId && window.currentSearchIconId) {
    var btn = document.getElementById(window.currentSearchBtnId); var icon = document.getElementById(window.currentSearchIconId);
    if (btn && icon) { btn.classList.remove('mic-active'); icon.classList.remove('fa-fade'); }
  }
  window.currentSearchInputId = null; window.currentSearchBtnId = null; window.currentSearchIconId = null;
};

// ==========================================
// 📍 12. GPS LOCATION FUNCTIONS
// ==========================================
window.getLocationCheckin = function() {
  var btn = document.getElementById('btnGpsCheckin');
  var latInput = document.getElementById('visitLat');
  var lngInput = document.getElementById('visitLng');
  var timeWrapper = document.getElementById('locationTimeWrapper');
  var timeText = document.getElementById('visitCheckinTimeText');
  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';

  if (!navigator.geolocation) {
    var msgNoGPS = appLang === 'en' ? "Your browser does not support GPS." : "เบราว์เซอร์ของคุณไม่รองรับ GPS";
    if(window.showToast) window.showToast(msgNoGPS, "error");
    return;
  }

  // 🌟 ปรับ UI ตอนกำลังโหลดพิกัด
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin fs-5"></i> <span>' + (appLang === 'en' ? 'Locating...' : 'กำลังดึงพิกัด...') + '</span>';

  navigator.geolocation.getCurrentPosition(
    function(position) {
      var lat = position.coords.latitude.toFixed(6);
      var lng = position.coords.longitude.toFixed(6);
      var now = new Date();
      var timeString = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

      if(latInput) latInput.value = lat;
      if(lngInput) lngInput.value = lng;
      if(timeWrapper) timeWrapper.classList.remove('d-none');
      if(timeText) timeText.innerText = timeString;

      // 🌟 อัปเกรดคลาส CSS เป็นปุ่มสีเขียวขนาดใหญ่ (Hero Button) เมื่อสำเร็จ
      btn.className = 'btn btn-success w-100 py-3 mb-4 fw-bold fs-6 shadow-sm d-flex align-items-center justify-content-center gap-2';
      btn.style.borderRadius = '16px';
      var currentLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
      btn.innerHTML = '<i class="fa-solid fa-check fs-5"></i> <span>' + (currentLang === 'en' ? 'Checked-in' : 'เช็คอินแล้ว') + '</span>';

      if (typeof window.saveFormDraft === 'function') window.saveFormDraft();
      
      if (typeof window.updateFeatureButtonIndicators === 'function') {
          window.updateFeatureButtonIndicators({ lat: lat, lng: lng, checkinTime: timeString });
      }

      var msgSuccess = appLang === 'en' ? "Location retrieved successfully!" : "ดึงพิกัดตำแหน่งสำเร็จ!";
      if(window.showToast) window.showToast(msgSuccess, "success");
    },
    function(error) {
      btn.disabled = false;
      // 🌟 คืนค่าปุ่มกลับเป็นหน้าตาพรีเมียมสีน้ำเงินเหมือนเดิม กรณีเกิด Error (ผู้ใช้ไม่อนุญาต/ไม่มีสัญญาณ)
      btn.className = 'btn btn-premium-primary w-100 py-3 mb-4 fw-bold fs-6 shadow-sm d-flex align-items-center justify-content-center gap-2';
      btn.style.borderRadius = '16px';
      btn.innerHTML = '<i class="fa-solid fa-crosshairs fs-5"></i> <span>' + (appLang === 'en' ? 'Get Current Location' : 'ดึงพิกัดปัจจุบัน') + '</span>';
      
      var errorMsg = appLang === 'en' ? "Cannot retrieve location." : "ไม่สามารถดึงพิกัดได้";
      if (error.code === 1) {
          errorMsg = appLang === 'en' ? "Please allow the browser to access your location." : "กรุณากดอนุญาต (Allow) ให้เบราว์เซอร์เข้าถึงตำแหน่ง (Location) ของคุณ";
      }
      if(window.showToast) window.showToast("⚠️ " + errorMsg, "warning");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
};

window.calculateDistanceKm = function(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ==========================================
// 📸 13. PHOTO ATTACHMENT HANDLING
// ==========================================
window.handleFileUpload = async function(event) {
  var files = event.target.files;
  if (!files || files.length === 0) return;

  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  
  var sbClient = null;
  if (typeof supabase !== 'undefined' && supabase && supabase.storage) sbClient = supabase;
  else if (window.supabase && window.supabase.storage) sbClient = window.supabase;
  else if (window.supabaseClient && window.supabaseClient.storage) sbClient = window.supabaseClient;

  if (!sbClient) { 
      var msgNoDB = appLang === 'en' ? "Supabase Storage connection not found." : "ไม่พบการเชื่อมต่อ Supabase Storage";
      if (window.showToast) window.showToast(msgNoDB, "error"); 
      return; 
  }

  if (!navigator.onLine) {
      var msgOfflineFile = appLang === 'en' 
          ? "📶 Offline Mode: Cannot upload images/PDFs right now (but you can still sign and save other data)."
          : "📶 โหมดออฟไลน์: ไม่สามารถแนบไฟล์รูป/PDF ได้ในขณะนี้ (แต่ยังเซ็นชื่อและบันทึกข้อมูลอื่นได้ปกติ)";
      if (window.showToast) window.showToast(msgOfflineFile, "warning");
      return;
  }

  var noText = document.getElementById('noAttachmentText');
  if (noText) noText.classList.add('d-none');

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var fileExt = file.name.split('.').pop();
    var fileName = 'visit_' + Date.now() + '_' + Math.random().toString(36).substring(7) + '.' + fileExt;

    try {
      var { data, error } = await sbClient.storage.from('visit-attachments').upload(fileName, file);
      if (error) throw error;

      var { data: publicUrlData } = sbClient.storage.from('visit-attachments').getPublicUrl(fileName);
      var fileUrl = publicUrlData.publicUrl;

      var fileObj = { name: file.name, url: fileUrl, fileName: fileName };
      if (!window.currentAttachments) window.currentAttachments = [];
      if (!window.newlyUploadedFiles) window.newlyUploadedFiles = [];

      window.currentAttachments.push(fileObj);
      window.newlyUploadedFiles.push(fileName);

      if (typeof window.renderAttachmentPreviews === 'function') window.renderAttachmentPreviews();
      
      if (typeof window.updateFeatureButtonIndicators === 'function') {
          window.updateFeatureButtonIndicators(null);
      }

      var msgSuccess = appLang === 'en' ? "File uploaded successfully." : "อัปโหลดไฟล์สำเร็จ";
      if (window.showToast) window.showToast(msgSuccess, "success");
    } catch (err) {
      console.error("Upload error:", err);
      var msgErr = appLang === 'en' ? "File upload failed: " : "อัปโหลดไฟล์ไม่สำเร็จ: ";
      if (window.showToast) window.showToast(msgErr + err.message, "error");
    }
  }
};

 window.renderAttachmentPreviews = function() {
  var container = document.getElementById('attachmentPreviewContainer');
  if (!container) return;   
  
  if (!window.currentAttachments || window.currentAttachments.length === 0) {
    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    var noText = appLang === 'en' ? 'No attachments uploaded yet' : 'ยังไม่มีไฟล์แนบ';
    container.innerHTML = 
      '<div class="col-12 text-center py-4" id="noAttachmentText">' +
        '<i class="fa-regular fa-images fs-1 text-muted opacity-50 mb-2 d-block"></i>' +
        '<span class="text-muted small">' + noText + '</span>' +
      '</div>';
    return;
  } 

  var html = '';
  window.currentAttachments.forEach(function(item, idx) {
    var isImg = item.url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    var fileName = item.name || 'Attachment_' + (idx + 1);

    // 📱 ปรับการ์ดสไตล์ Grid Col (Col-4 บน iPad) การ์ดใหญ่ กดง่าย พร้อมปุ่มลบตรงมุม
    html += 
      '<div class="col-6 col-md-4">' +
        '<div class="position-relative bg-light border rounded-4 p-2 shadow-xs d-flex flex-column align-items-center h-100">' +
          '<div class="w-100 bg-white rounded-3 overflow-hidden d-flex align-items-center justify-content-center cursor-pointer mb-2" style="height: 110px;" onclick="window.open(\'' + item.url + '\', \'_blank\')">';
          
    if (isImg) {
      html += '<img src="' + item.url + '" class="w-100 h-100 object-fit-cover">';
    } else {
      html += 
        '<div class="text-center p-2">' +
          '<i class="fa-solid fa-file-pdf fs-1 text-danger mb-1"></i>' +
          '<span class="d-block fw-bold text-dark text-truncate" style="font-size: 0.75rem; max-width: 120px;">' + fileName + '</span>' +
        '</div>';
    }
    
    html += 
          '</div>' +
          '<div class="w-100 text-truncate px-1 text-center" style="font-size: 0.8rem; font-weight: 600; color: #334155;" title="' + fileName + '">' + 
            fileName + 
          '</div>' +
          
          // ปุ่มกากบาทสีแดงกลม วางซ้อนมุมขวาบนพอดี
          '<button type="button" class="btn btn-danger position-absolute p-0 rounded-circle shadow-sm d-flex align-items-center justify-content-center" style="top: -6px; right: -6px; width: 28px; height: 28px; border: 2px solid #ffffff; font-size: 0.9rem; z-index: 10;" onclick="window.removeAttachment(' + idx + ')">&times;</button>' +
        '</div>' +
      '</div>';
  });
  
  container.innerHTML = html;
};

window.removeAttachment = function(index) {
  var targetItem = window.currentAttachments[index];
  if (!targetItem) return;

  var fileUrl = targetItem.url || '';
  var cleanUrl = fileUrl.split('?')[0];
  var fileName = targetItem.fileName || decodeURIComponent(cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1));

  if (!window.newlyUploadedFiles) window.newlyUploadedFiles = [];
  if (!window.pendingDeleteFiles) window.pendingDeleteFiles = [];

  var newIdx = window.newlyUploadedFiles.indexOf(fileName);
  if (newIdx !== -1) {
    window.newlyUploadedFiles.splice(newIdx, 1);
    var sbClient = typeof supabase !== 'undefined' ? supabase : (window.supabase || window.supabaseClient);
    if (sbClient && sbClient.storage) sbClient.storage.from('visit-attachments').remove([fileName]);
  } else {
    if (fileName && window.pendingDeleteFiles.indexOf(fileName) === -1) {
      window.pendingDeleteFiles.push(fileName);
    }
  }

  window.currentAttachments.splice(index, 1);
  if (typeof window.renderAttachmentPreviews === 'function') window.renderAttachmentPreviews();

  if (typeof window.updateFeatureButtonIndicators === 'function') {
      window.updateFeatureButtonIndicators(null);
  }
};

// ==========================================
// ✍️ 14. E-SIGNATURE HANDLING
// ==========================================
var mCanvas, mCtx, isDrawingSig = false;
window.savedSignatureData = null;

window.openSignatureModal = function() {
  var btnSig = document.getElementById('btnClearSig');
  if (btnSig && btnSig.style.display === 'none') return;

  var modalEl = document.getElementById('signatureModal');
  if(typeof bootstrap !== 'undefined') {
    var myModal = new bootstrap.Modal(modalEl);
    myModal.show();
  }

  modalEl.addEventListener('shown.bs.modal', function () {
    mCanvas = document.getElementById('modalSignatureCanvas');
    if (!mCanvas) return;
    
    mCanvas.width = mCanvas.offsetWidth;
    mCanvas.height = mCanvas.offsetHeight;
    mCtx = mCanvas.getContext('2d');
    mCtx.lineWidth = 3;
    mCtx.lineCap = 'round';
    mCtx.lineJoin = 'round';
    mCtx.strokeStyle = '#0f172a';

    if (window.savedSignatureData) {
      var img = new Image();
      img.onload = function() { mCtx.drawImage(img, 0, 0); };
      img.src = window.savedSignatureData;
    } else {
      mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
    }

    mCanvas.onmousedown = startDrawingSig;
    mCanvas.onmousemove = drawSig;
    mCanvas.onmouseup = stopDrawingSig;

    mCanvas.ontouchstart = function(e) {
      e.preventDefault();
      var touch = e.touches[0];
      var rect = mCanvas.getBoundingClientRect();
      isDrawingSig = true;
      mCtx.beginPath();
      mCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    };

    mCanvas.ontouchmove = function(e) {
      e.preventDefault();
      if (!isDrawingSig) return;
      var touch = e.touches[0];
      var rect = mCanvas.getBoundingClientRect();
      mCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      mCtx.stroke();
    };

    mCanvas.ontouchend = function(e) { e.preventDefault(); isDrawingSig = false; };
  }, { once: true });
};

function startDrawingSig(e) {
  isDrawingSig = true;
  var rect = mCanvas.getBoundingClientRect();
  mCtx.beginPath();
  mCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function drawSig(e) {
  if (!isDrawingSig) return;
  var rect = mCanvas.getBoundingClientRect();
  mCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  mCtx.stroke();
}

function stopDrawingSig() { isDrawingSig = false; }

window.clearModalCanvas = function() {
  if (mCtx && mCanvas) mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
};

window.saveSignatureFromModal = function() {
  if (!mCanvas) return;
  var blank = document.createElement('canvas');
  blank.width = mCanvas.width;
  blank.height = mCanvas.height;
  if (mCanvas.toDataURL() === blank.toDataURL()) { window.savedSignatureData = null; } 
  else { window.savedSignatureData = mCanvas.toDataURL('image/png'); }

  if(typeof window.updateSignaturePreviewUI === 'function') window.updateSignaturePreviewUI();
  
  if (typeof window.updateFeatureButtonIndicators === 'function') {
      window.updateFeatureButtonIndicators(null);
  }

  var modalEl = document.getElementById('signatureModal');
  if(typeof bootstrap !== 'undefined') {
      var modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();
  }
};

window.updateSignaturePreviewUI = function() {
  var img = document.getElementById('sigPreviewImg');
  var placeholder = document.getElementById('sigPlaceholder');

  if (window.savedSignatureData) {
    if (img) { img.src = window.savedSignatureData; img.classList.remove('d-none'); }
    if (placeholder) placeholder.classList.add('d-none');
  } else {
    if (img) { img.src = ''; img.classList.add('d-none'); }
    if (placeholder) placeholder.remove('d-none');
  }
};

window.clearSignature = function() {
  window.savedSignatureData = null;
  if(typeof window.updateSignaturePreviewUI === 'function') window.updateSignaturePreviewUI();
  
  if (typeof window.updateFeatureButtonIndicators === 'function') {
      window.updateFeatureButtonIndicators(null);
  }
};

window.getSignatureDataUrl = function() {
  return window.savedSignatureData || null;
};

 window.setFormComponentsReadOnly = function(isReadOnly) {
  // 1. ล็อกปุ่ม GPS
  var btnGps = document.getElementById('btnGpsCheckin');
  if (btnGps) btnGps.disabled = isReadOnly;

  // 2. ล็อกปุ่มแนบไฟล์
  var fileInput = document.getElementById('visitFileInput');
  var fileBtnLabel = fileInput ? fileInput.closest('label') : null;
  if (fileInput) fileInput.disabled = isReadOnly;
  if (fileBtnLabel) {
    if (isReadOnly) { fileBtnLabel.classList.add('disabled', 'pe-none', 'opacity-50'); } 
    else { fileBtnLabel.classList.remove('disabled', 'pe-none', 'opacity-50'); }
  }

  // ซ่อนปุ่มลบรูปภาพ
  var removeBtns = document.querySelectorAll('#attachmentPreviewContainer button');
  removeBtns.forEach(function(btn) { 
      btn.classList.toggle('d-none', isReadOnly); 
  });

  // 🌟 3. ล็อกหน้าต่างลายเซ็น (แก้ให้ใช้ d-none ชนกับ d-flex)
  var clearSigBtn = document.querySelector('button[onclick*="clearModalCanvas"]');
  var saveSigBtn = document.querySelector('button[onclick*="saveSignatureFromModal"]');
  var canvas = document.getElementById('modalSignatureCanvas'); 

  if (clearSigBtn) clearSigBtn.classList.toggle('d-none', isReadOnly);
  if (saveSigBtn) saveSigBtn.classList.toggle('d-none', isReadOnly);
  
  if (canvas) {
    canvas.style.pointerEvents = isReadOnly ? 'none' : 'auto'; // ปิดไม่ให้ใช้นิ้ววาดได้
    // เปลี่ยนสีพื้นหลังกรอบ Canvas ให้เป็นเทาอ่อนเมื่อถูกล็อก
    if (canvas.parentElement) {
        canvas.parentElement.style.backgroundColor = isReadOnly ? '#f1f5f9' : '#ffffff';
    }
  }

  // 🌟 4. ล็อกหน้าต่าง Samples (ซ่อนปุ่ม Add Item และปุ่มถังขยะ)
  var addSampleBtn = document.querySelector('button[onclick*="addSampleRow"]');
  if (addSampleBtn) addSampleBtn.classList.toggle('d-none', isReadOnly);

  var delSampleBtns = document.querySelectorAll('.btn-delete-sample');
  delSampleBtns.forEach(function(btn) { 
      btn.classList.toggle('d-none', isReadOnly); 
  });

  // ล็อกช่องเลือกสินค้าและจำนวน
  var sampleInputs = document.querySelectorAll('.sample-id-select, .sample-qty');
  sampleInputs.forEach(function(input) { input.disabled = isReadOnly; });
};

// ==========================================
// 📅 15. FULL CALENDAR (UPDATED FULL-HEIGHT + HEADER LEGEND)
// ==========================================  
 // 🌟 ตัวแปร Global จำค่าที่ถูกเลือก
 window.currentCalendarRepFilter = window.currentCalendarRepFilter || '';

window.renderCalendarView = function() {
  var calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  var calRepFilter = document.getElementById('calRepFilterSelect');
  if (calRepFilter) {
      window.currentCalendarRepFilter = calRepFilter.value;
  }
  var selectedRepId = window.currentCalendarRepFilter || '';
  
  var appLang = window.getCurrentAppLang();
  var isEN = (appLang === 'en');
  var crmUser = null; 
  try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}
  var isManagerOrAdmin = window.myIsGlobalViewer || window.myIsBuHead || window.myIsManager;

  // ==========================================
  // 1. Visit Logs
  // ==========================================
  var visitsSource = window.globalVisits || [];
  if (selectedRepId) {
      visitsSource = visitsSource.filter(function(v) {
          return String(v.Rep_ID) === String(selectedRepId) || String(v.whoupdated).toLowerCase() === String(selectedRepId).toLowerCase();
      });
  }

  var visitEvents = visitsSource.map(function(v) {
      var docObj = window._docIndex ? window._docIndex[String(v.Doc_ID || v.doc_id || v.id || '').trim().toLowerCase()] : null;
      var docName = (typeof window.getDoctorNameByLang === 'function') ? window.getDoctorNameByLang(docObj, v.Doc_ID) : '-';
      var hospName = (docObj && typeof window.getHospitalNameFromDocOrVisit === 'function') ? window.getHospitalNameFromDocOrVisit(docObj, v) : '-';
      var purposeShow = (typeof window.getPurposeText === 'function') ? window.getPurposeText(v.Purpose_ID, v.Purpose) : '-';

      var repObj = (window._userIndex && v.Rep_ID) ? window._userIndex[String(v.Rep_ID).trim().toLowerCase()] : null;
      var repNamePrefix = (isManagerOrAdmin && !selectedRepId && repObj) ? '[' + (repObj.Rep_Name || repObj.Name || 'Rep') + '] ' : '';

      var dateOnly = v.Visit_Date ? v.Visit_Date.split('T')[0] : '';
      if (dateOnly.indexOf('/') !== -1) {
           var vParts = dateOnly.split('/');
           if(vParts.length === 3) dateOnly = vParts[2] + '-' + vParts[1] + '-' + vParts[0];
      }

      var timePrefix = v.Start_Time ? v.Start_Time.substring(0, 5) + ' ' : '';
      var coachingIcon = v.Is_Coaching ? '🧑‍🏫 ' : '';
      var baseTitle = repNamePrefix + timePrefix + coachingIcon + docName + (hospName && hospName !== '-' ? ' (' + hospName + ')' : '');
      var fullTooltipText = baseTitle + '\n' + (appLang === 'en' ? 'Purpose: ' : 'วัตถุประสงค์: ') + purposeShow;
      if(v.Is_Coaching) fullTooltipText += (appLang === 'en' ? '\n(Joint Visit / Coaching)' : '\n(ออกเยี่ยมร่วม / โค้ชชิ่ง)');

      var isPending = (v.Status === 'Pending');
      var isPendingUnlock = (window.globalPendingUnlockVisits || []).indexOf(v.Visit_ID) !== -1;
      var bgColor = isPendingUnlock ? '#64748b' : (isPending ? '#f59e0b' : '#10b981');
      
      return {
          id: v.Visit_ID, title: baseTitle, start: dateOnly, allDay: true, backgroundColor: bgColor, borderColor: bgColor, textColor: '#ffffff', display: 'block',     
          extendedProps: { status: v.Status, isHoliday: false, fullTooltip: fullTooltipText }
      };
  });

  // ==========================================
  // 🌟 2. Public Holidays & Company Events
  // ==========================================
  var holidayEvents = []; var companyEvents = []; 
  
  if (window.VisitManagerCache && window.VisitManagerCache.indexTypes && window.VisitManagerCache.indexes) {
      var holidayType = window.VisitManagerCache.indexTypes.find(function(t) { 
          var n = (t.Name || '').trim().toLowerCase();
          return n.indexOf('holiday') !== -1 && n.indexOf('company') === -1 && n.indexOf('corporate') === -1; 
      });
      
      if (holidayType) {
          var holidayData = window.VisitManagerCache.indexes.filter(function(i) { return i.IndexType_ID === holidayType.IndexType_ID; });
          holidayEvents = holidayData.map(function(h) {
              var hDate = h.Value ? h.Value.split('T')[0] : '';
              if (hDate.indexOf('/') !== -1) { var dParts = hDate.split('/'); if(dParts.length === 3) hDate = dParts[2] + '-' + dParts[1] + '-' + dParts[0]; }
              var hTitle = appLang === 'en' ? (h.Value2 || h.Value1 || 'Holiday') : (h.Value1 || h.Value2 || 'วันหยุด');

              return {
                  id: 'hol_' + h.Index_ID, 
                  title: '🌴 ' + hTitle, 
                  start: hDate, 
                  allDay: true, 
                  backgroundColor: '#fef2f2', 
                  borderColor: '#fca5a5',     
                  textColor: '#dc2626',       
                  display: 'block',
                  extendedProps: { status: 'Holiday', isHoliday: true, fullTooltip: '🌴 ' + hTitle }
              };
          });
      }

      var companyEventType = window.VisitManagerCache.indexTypes.find(function(t) { 
          var n = (t.Name || '').trim().toLowerCase();
          return n.indexOf('company event') !== -1 || n.indexOf('corporate') !== -1; 
      });

      if (companyEventType) {
          var companyData = window.VisitManagerCache.indexes.filter(function(i) { return i.IndexType_ID === companyEventType.IndexType_ID; });
          companyEvents = companyData.map(function(c) {
              var cDate = c.Value ? c.Value.split('T')[0] : '';
              if (cDate.indexOf('/') !== -1) { var dParts2 = cDate.split('/'); if(dParts2.length === 3) cDate = dParts2[2] + '-' + dParts2[1] + '-' + dParts2[0]; }
              var cTitle = appLang === 'en' ? (c.Value2 || c.Value1 || 'Company Event') : (c.Value1 || c.Value2 || 'กิจกรรมบริษัท');

              return {
                  id: 'ce_' + c.Index_ID, 
                  title: '🏢 ' + cTitle, 
                  start: cDate, 
                  allDay: true, 
                  backgroundColor: '#8b5cf6', 
                  borderColor: '#8b5cf6', 
                  textColor: '#ffffff', 
                  display: 'block',
                  extendedProps: { status: 'Company Event', isHoliday: true, fullTooltip: '🏢 ' + cTitle }
              };
          });
      }
  }

  // ==========================================
  // 3. TOT Logs
  // ==========================================
  var totSource = window.globalFilteredTotLogs || [];
  if (selectedRepId) {
      totSource = totSource.filter(function(tot) {
          return String(tot.Rep_ID) === String(selectedRepId) || String(tot.Whoupdated).toLowerCase() === String(selectedRepId).toLowerCase();
      });
  }

  var totEvents = totSource.map(function(t) {
      var repObj = (window._userIndex && t.Rep_ID) ? window._userIndex[String(t.Rep_ID).trim().toLowerCase()] : null;
      var repNamePrefix = (isManagerOrAdmin && !selectedRepId && repObj) ? '[' + (repObj.Rep_Name || repObj.Name || 'Rep') + '] ' : '';
      
      var timePrefix = t.Start_Time ? t.Start_Time.substring(0, 5) + ' ' : '';
      var displayType = t.TOT_Type || 'Time Off';
      if (appLang === 'en' && window.VisitManagerCache.indexes) {
          var tIdx = window.VisitManagerCache.indexes.find(function(idx) { return idx.Value === t.TOT_Type; });
          if (tIdx && tIdx.Value1) displayType = tIdx.Value1;
      }
      var baseTitle = repNamePrefix + timePrefix + '⛱️ ' + displayType;
      var fullTooltipText = baseTitle + (t.Remark ? '\n' + (appLang === 'en' ? 'Remark: ' : 'หมายเหตุ: ') + t.Remark : '');
      var bgColor = t.Status === 'Approved' ? '#0ea5e9' : '#94a3b8'; 

      var startDate = '';
      if (t.Start_Date) {
          startDate = t.Start_Date.split('T')[0];
          if (startDate.indexOf('/') !== -1) { var p1 = startDate.split('/'); if (p1.length===3) startDate = p1[2]+'-'+p1[1]+'-'+p1[0]; }
      }
      var endDateStr = '';
      if (t.End_Date && t.End_Date !== t.Start_Date) {
          endDateStr = t.End_Date.split('T')[0];
          if (endDateStr.indexOf('/') !== -1) { var p2 = endDateStr.split('/'); if (p2.length===3) endDateStr = p2[2]+'-'+p2[1]+'-'+p2[0]; }
          var eDate = new Date(endDateStr); eDate.setDate(eDate.getDate() + 1); endDateStr = eDate.toISOString().split('T')[0];
      }

      var ev = {
          id: 'tot_' + t.TOT_ID, title: baseTitle, start: startDate, allDay: true, backgroundColor: bgColor, borderColor: bgColor, textColor: '#ffffff', display: 'block',
          extendedProps: { isTot: true, totId: t.TOT_ID, fullTooltip: fullTooltipText }
      };
      if (endDateStr) ev.end = endDateStr;
      return ev;
  });

  var allEvents = visitEvents.concat(holidayEvents).concat(totEvents).concat(companyEvents);
  
  var fcButtonText = isEN ? {
      today: 'Today', month: 'Month', week: 'Week', day: 'Day'
  } : {
      today: 'วันนี้', month: 'เดือน', week: 'สัปดาห์', day: 'วัน'
  };

  // 🌟 [ป้องกันปฏิทินแว๊บ/กระพริบ]: ถ้ามี Instance ปฏิทินอยู่แล้ว สั่งอัปเดตภาษา + เคลียร์และใส่อีเวนต์ใหม่
  if (window.globalCalendarInstance) {
      window.globalCalendarInstance.setOption('locale', isEN ? 'en' : 'th');
      window.globalCalendarInstance.setOption('buttonText', fcButtonText);
      window.globalCalendarInstance.removeAllEvents();
      window.globalCalendarInstance.addEventSource(allEvents);
      return;
  }

  // 🌟 ถ้ายังไม่มี Instance ค่อยวาด FullCalendar ใหม่
  if (typeof FullCalendar !== 'undefined') {
    window.globalCalendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth', 
        headerToolbar: { 
          left: 'prev,next today', 
          center: 'title', 
          right: 'dayGridMonth,timeGridWeek,timeGridDay' 
        },
        buttonText: fcButtonText, 
        locale: isEN ? 'en' : 'th', 
        height: '100%', 
        expandRows: true, 
        dayMaxEvents: 2, 
        moreLinkClick: 'popover', 
        events: allEvents,
        eventDidMount: function(info) { info.el.setAttribute('title', info.event.extendedProps.fullTooltip || info.event.title); },
        eventClick: function(info) {
            if (info.event.extendedProps.isHoliday) return; 
            if (info.event.extendedProps.isTot) {
                if (typeof window.openEditTotModal === 'function') window.openEditTotModal(info.event.extendedProps.totId);
                return;
            }
            if (typeof window.openEditVisitView === 'function') window.openEditVisitView(info.event.id);
        },
        dateClick: function(info) { 
            var isEN = window.getCurrentAppLang() === 'en';
            var existingPopover = document.getElementById('calQuickAddPopover');
            if (existingPopover) existingPopover.remove();

            var popoverHtml = `
              <div id="calQuickAddPopover" class="card shadow-lg border-0 p-2 position-absolute rounded-3" style="z-index: 1060; min-width: 170px;">
                <div class="fw-bold text-secondary tiny mb-1 text-center border-bottom pb-1">📅 ${info.dateStr}</div>
                <button class="btn btn-sm btn-light text-primary text-start fw-bold mb-1 rounded-2" onclick="document.getElementById('calQuickAddPopover').remove(); if(typeof window.openAddVisitView==='function') window.openAddVisitView('${info.dateStr}');">
                  <i class="fa-solid fa-plus me-1.5"></i>${isEN ? 'Add Visit' : 'บันทึกเยี่ยม'}
                </button>
                <button class="btn btn-sm btn-light text-info text-start fw-bold rounded-2" onclick="document.getElementById('calQuickAddPopover').remove(); if(typeof window.openAddTotModal==='function') { window.openAddTotModal(); document.getElementById('totStartDate').value='${info.dateStr}'; }">
                  <i class="fa-solid fa-umbrella-beach me-1.5"></i>${isEN ? 'Add TOT' : 'แจ้ง TOT / วันลา'}
                </button>
              </div>
            `;

            document.body.insertAdjacentHTML('beforeend', popoverHtml);
            var popoverEl = document.getElementById('calQuickAddPopover');
            popoverEl.style.top = (info.jsEvent.pageY - 20) + 'px';
            popoverEl.style.left = (info.jsEvent.pageX - 80) + 'px';

            var closeHandler = function(e) {
                if (!popoverEl.contains(e.target)) {
                    popoverEl.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(function() { document.addEventListener('click', closeHandler); }, 100);
        },
        displayEventTime: false 
    });
    
    window.globalCalendarInstance.render();

    setTimeout(function() {
      var headerRight = document.querySelector('#calendar .fc-toolbar-chunk:last-child');
      if (!headerRight) return;

      var isEN = appLang === 'en';

      if (!document.getElementById('calHeaderLegendDropdown')) {
        var legendDropdownHtml = `
          <div class="dropdown d-inline-block me-2" id="calHeaderLegendDropdown">
            <button class="btn btn-sm btn-light border shadow-sm text-secondary fw-bold dropdown-toggle d-flex align-items-center gap-1.5 px-2.5" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="height: 34px; font-size: 0.85rem;">
              <i class="fa-solid fa-palette text-info"></i>
              <span id="txtLegendBtn">${isEN ? 'Legend' : 'สัญลักษณ์สี'}</span>
            </button>
            <div class="dropdown-menu dropdown-menu-end p-3 shadow-lg border-0 rounded-3 mt-1" style="width: 220px; font-size: 0.8rem; z-index: 1055;">
              <div class="fw-bold text-dark border-bottom pb-1.5 mb-2" id="txtLegendHeader">${isEN ? 'Color Key' : 'คำอธิบายสัญลักษณ์สี'}</div>
              <div class="d-flex align-items-center mb-2"><span class="d-inline-block rounded-circle me-2" style="width:10px; height:10px; background-color:#10b981; flex-shrink:0;"></span><span id="legTxtSubmitted">${isEN ? 'Submitted Visit' : 'บันทึกเยี่ยมแล้ว'}</span></div>
              <div class="d-flex align-items-center mb-2"><span class="d-inline-block rounded-circle me-2" style="width:10px; height:10px; background-color:#f59e0b; flex-shrink:0;"></span><span id="legTxtPending">${isEN ? 'Pending Draft' : 'ฉบับร่างรอส่ง'}</span></div>
              <div class="d-flex align-items-center mb-2"><span class="d-inline-block rounded-circle me-2" style="width:10px; height:10px; background-color:#64748b; flex-shrink:0;"></span><span id="legTxtUnlock">${isEN ? 'Pending Unlock' : 'รออนุมัติปลดล็อก'}</span></div>
              <div class="d-flex align-items-center mb-2"><span class="d-inline-block rounded-circle me-2" style="width:10px; height:10px; background-color:#ef4444; flex-shrink:0;"></span><span id="legTxtHoliday">${isEN ? 'Public Holiday' : 'วันหยุดนักขัตฤกษ์'}</span></div>
              <div class="d-flex align-items-center mb-2"><span class="d-inline-block rounded-circle me-2" style="width:10px; height:10px; background-color:#8b5cf6; flex-shrink:0;"></span><span id="legTxtCompany">${isEN ? 'Company Event' : 'กิจกรรมบริษัท'}</span></div>
              <div class="d-flex align-items-center mb-1.5"><span class="d-inline-block rounded-circle me-2" style="width:10px; height:10px; background-color:#0ea5e9; flex-shrink:0;"></span><span id="legTxtTotAppr">${isEN ? 'TOT (Approved)' : 'TOT (อนุมัติแล้ว)'}</span></div>
              <div class="d-flex align-items-center"><span class="d-inline-block rounded-circle me-2" style="width:10px; height:10px; background-color:#94a3b8; flex-shrink:0;"></span><span id="legTxtTotPend">${isEN ? 'TOT (Pending)' : 'TOT (รออนุมัติ)'}</span></div>
            </div>
          </div>
        `;
        headerRight.insertAdjacentHTML('afterbegin', legendDropdownHtml);
      }

      if (!document.getElementById('calRepFilterContainer')) {
        var userList = window.globalUsersList || [];
        if (isManagerOrAdmin && userList.length > 0) {
          var allowedReps = window.myAllowedRepIds || [];
          var uniqueReps = new Map();
          
          var repOptionsHtml = '<option value="">' + (isEN ? '👥 All Team Members' : '👥 พนักงานทุกคนในทีม') + '</option>';
          userList.forEach(function(u) {
            var uId = String(u.Rep_ID || u.User_ID || u.id || '').trim();
            if (uId && allowedReps.indexOf(uId) !== -1 && !uniqueReps.has(uId)) {
                uniqueReps.set(uId, true);
                var uName = u.Rep_Name || u.Name || u.Email || uId;
                var isSel = (uId === selectedRepId) ? 'selected' : '';
                repOptionsHtml += '<option value="' + uId + '" ' + isSel + '>👤 ' + uName + '</option>';
            }
          });

          var filterDropdownHtml = `
            <div class="d-inline-block me-2" id="calRepFilterContainer">
              <select class="form-select form-select-sm border-primary fw-bold bg-white shadow-xs premium-radius text-primary cursor-pointer" id="calRepFilterSelect" style="font-size: 0.85rem; height: 34px; min-width: 180px;" onchange="window.currentCalendarRepFilter = this.value; window.renderCalendarView();">
                ${repOptionsHtml}
              </select>
            </div>
          `;
          headerRight.insertAdjacentHTML('afterbegin', filterDropdownHtml);
        }
      }

    }, 50);
  }
};

window.updateCalendarLegendLang = function() {
  var isEN = window.getCurrentAppLang() === 'en';
  
  var elBtn = document.getElementById('txtLegendBtn');
  var elHeader = document.getElementById('txtLegendHeader');
  var elSub = document.getElementById('legTxtSubmitted');
  var elPen = document.getElementById('legTxtPending');
  var elUnl = document.getElementById('legTxtUnlock');
  var elHol = document.getElementById('legTxtHoliday');
  var elCom = document.getElementById('legTxtCompany');
  var elTotApp = document.getElementById('legTxtTotAppr');
  var elTotPen = document.getElementById('legTxtTotPend');

  if (elBtn) elBtn.innerText = isEN ? 'Legend' : 'สัญลักษณ์สี';
  if (elHeader) elHeader.innerText = isEN ? 'Color Key' : 'คำอธิบายสัญลักษณ์สี';
  if (elSub) elSub.innerText = isEN ? 'Submitted Visit' : 'บันทึกเยี่ยมแล้ว';
  if (elPen) elPen.innerText = isEN ? 'Pending Draft' : 'ฉบับร่างรอส่ง';
  if (elUnl) elUnl.innerText = isEN ? 'Pending Unlock' : 'รออนุมัติปลดล็อก';
  if (elHol) elHol.innerText = isEN ? 'Public Holiday' : 'วันหยุดนักขัตฤกษ์';
  if (elCom) elCom.innerText = isEN ? 'Company Event' : 'กิจกรรมบริษัท';
  if (elTotApp) elTotApp.innerText = isEN ? 'TOT (Approved)' : 'TOT (อนุมัติแล้ว)';
  if (elTotPen) elTotPen.innerText = isEN ? 'TOT (Pending)' : 'TOT (รออนุมัติ)';
};

// ==========================================
// 🌟 16. DYNAMIC FEATURE BUTTON INDICATORS
// ==========================================
window.updateFeatureButtonIndicators = function(v) {
  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  var isEN = appLang === 'en';

  // 1. GPS Check-in (🌟 เวอร์ชันแก้บั๊ก Real-time)
  var gpsBtn = document.getElementById('sectionGpsCheckin');
  var gpsText = document.getElementById('btnGpsText');
  var latInput = document.getElementById('visitLat');
  var hasGps = (latInput && latInput.value) || (v && v.CheckIn_Lat); // เช็กจากหน้าจอก่อน ค่อยเช็กจาก DB
  
  if (gpsBtn && gpsText) {
    if (hasGps) {
      gpsBtn.classList.add('has-data-gps');
      var cTimeStr = '';
      var timeTextEl = document.getElementById('visitCheckinTimeText');
      if (timeTextEl && timeTextEl.innerText) {
          cTimeStr = timeTextEl.innerText; // ดึงเวลาจากหน้าจอถ้าเพิ่งกด
      } else if (v && v.CheckIn_Time) {
          var cTime = new Date(v.CheckIn_Time);
          cTimeStr = cTime.getHours().toString().padStart(2, '0') + ':' + cTime.getMinutes().toString().padStart(2, '0');
      }
      gpsText.innerHTML = (isEN ? 'Checked-in' : 'เช็คอินแล้ว') + (cTimeStr ? ' (' + cTimeStr + ')' : '') + ' ✓';
    } else {
      gpsBtn.classList.remove('has-data-gps');
      gpsText.innerText = isEN ? 'GPS Check-in' : 'GPS เช็คอิน';
    }
  }

  // 2. Doctor Signature
  var sigBtn = document.getElementById('sectionSignature');
  var sigText = document.getElementById('btnSignatureText');
  var hasSig = window.savedSignatureData || (v && (v.Doctor_Signature || v.signatureImg));
  if (sigBtn && sigText) {
    if (hasSig) {
      sigBtn.classList.add('has-data-sig');
      sigText.innerHTML = (isEN ? 'Signed' : 'เซ็นแล้ว') + ' ✓';
    } else {
      sigBtn.classList.remove('has-data-sig');
      sigText.innerText = isEN ? 'Signature' : 'ลายเซ็นแพทย์';
    }
  }

  // 3. Samples & Promo Items (🌟 FIXED BUGS: เช็กทั้ง DOM และ Cache)
  var samplesBtn = document.getElementById('sectionSamples');
  var samplesText = document.getElementById('btnSamplesText');
  if (samplesBtn && samplesText) {
    var activeSamplesCount = 0;
    
    // ก. เช็กจาก DOM ก่อน (กรณีที่มีการกดเพิ่มลดในหน้าจอ)
    var domSamples = typeof window.getSamplesData === 'function' ? window.getSamplesData() : [];
    activeSamplesCount = domSamples.length;

    // ข. ถ้า DOM ยังโหลดไม่เสร็จ (นับได้ 0) แต่ข้อมูลจากฐานข้อมูลมี (v.Visit_ID) ให้เช็กจาก Cache
    if (activeSamplesCount === 0 && v && v.Visit_ID) {
        var vidClean = String(v.Visit_ID).trim().toLowerCase();
        var cachedSamples = (window._visitSampleIndex && window._visitSampleIndex[vidClean]) 
                              ? window._visitSampleIndex[vidClean] 
                              : (v.Visit_Samples || []);
        activeSamplesCount = cachedSamples.length;
    }
    
    if (activeSamplesCount > 0) {
      samplesBtn.classList.add('has-data-samples');
      samplesText.innerHTML = (isEN ? 'Samples' : 'สินค้าตัวอย่าง') + ' (' + activeSamplesCount + ') ✓';
    } else {
      samplesBtn.classList.remove('has-data-samples');
      samplesText.innerText = isEN ? 'Samples' : 'สินค้าตัวอย่าง';
    }
  }

  // 4. Attachments
  var attachBtn = document.getElementById('sectionAttachments');
  var attachText = document.getElementById('btnAttachmentsText');
  if (attachBtn && attachText) {
    var attachCount = window.currentAttachments ? window.currentAttachments.length : 0;
    if (attachCount > 0) {
      attachBtn.classList.add('has-data-attach');
      attachText.innerHTML = (isEN ? 'Attachments' : 'ไฟล์แนบ') + ' (' + attachCount + ') ✓';
    } else {
      attachBtn.classList.remove('has-data-attach');
      attachText.innerText = isEN ? 'Attachments' : 'ไฟล์แนบ/รูปถ่าย';
    }
  }
};

window.quickFilterKpi = function(targetStatus) {
    var statusEl = document.getElementById('filterVisitStatus');
    var currentVal = window.tomSelectStatusInstance ? window.tomSelectStatusInstance.getValue() : (statusEl ? statusEl.value : '');

    var finalStatus = (currentVal === targetStatus && targetStatus !== '') ? '' : targetStatus;

    if (window.tomSelectStatusInstance) {
        window.tomSelectStatusInstance.setValue(finalStatus, false);
    } else if (statusEl) {
        statusEl.value = finalStatus;
    }

    var cardAll = document.getElementById('kpiCardAll');
    var cardPending = document.getElementById('kpiCardPending');
    var cardSubmitted = document.getElementById('kpiCardSubmitted');

    if (cardAll) cardAll.classList.toggle('active-kpi', finalStatus === '');
    if (cardPending) cardPending.classList.toggle('active-kpi', finalStatus === 'Pending');
    if (cardSubmitted) cardSubmitted.classList.toggle('active-kpi', finalStatus === 'Submitted');

    // 🌟 สั่ง Filter ตารางเฉพาะฝั่ง Client ห้ามสั่ง loadVisits(true) เด็ดขาด
    window.currentPage = 1;
    if (typeof window.filterVisits === 'function') {
        window.filterVisits();
    }
};

// ==========================================
// 🌐 CENTRALIZED LANGUAGE UI UPDATE
// ==========================================
window.updateLangUI = function() {
    if (window.isInitialLoading) return;

    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
    var isEN = (appLang === 'en');

    // 1. อัปเดต Placeholder ของ Smart Search
    var searchInput = document.getElementById('smartSearchInput');
    if (searchInput) {
        if (window.i18nData && window.i18nData[appLang] && window.i18nData[appLang].opt_smart_search_ph) {
            searchInput.placeholder = window.i18nData[appLang].opt_smart_search_ph;
        } else if (typeof window.getTranslation === 'function') {
            searchInput.placeholder = window.getTranslation('opt_smart_search_ph');
        } else {
            searchInput.placeholder = isEN 
                ? 'Search Doctor, Hospital or Products...' 
                : 'ค้นหาชื่อแพทย์, โรงพยาบาล หรือผลิตภัณฑ์...';
        }
    }

    // 2. อัปเดต Placeholder ของช่องข้อความฝั่งขวา
    var detailsEl = document.getElementById('visitDetails');
    var insightEl = document.getElementById('visitInsight');
    var nextActionEl = document.getElementById('visitNextAction');

    if (detailsEl) {
        detailsEl.placeholder = isEN 
            ? 'Enter call discussion details...' 
            : 'ระบุรายละเอียดการพูดคุยหรือการเยี่ยม...';
    }
    if (insightEl) {
        insightEl.placeholder = isEN 
            ? 'Key feedback or doctor insights...' 
            : 'ระบุข้อคิดเห็นเพิ่มเติมหรือข้อมูลเชิงลึกจากแพทย์...';
    }
    if (nextActionEl) {
        nextActionEl.placeholder = isEN 
            ? 'Next follow-up plan or action items...' 
            : 'ระบุแผนการติดตามผลหรือการดำเนินการถัดไป...';
    }

    // 3. อัปเดต Date Pickers และ Calendar Legend
    if (typeof window.initVisitDatePickers === 'function') {
        window.initVisitDatePickers();
    }

    if (typeof window.updateCalendarLegendLang === 'function') {
        window.updateCalendarLegendLang();
    }

    // 🌟 4. อัปเดตข้อความปุ่มสลับมุมมอง (List / Calendar) ให้เปลี่ยนภาษา Realtime
    var listBtn = document.getElementById('btnToggleList');
    var calBtn = document.getElementById('btnToggleCal');
    if (listBtn) {
        var listSpan = listBtn.querySelector('span');
        if (listSpan) listSpan.textContent = isEN ? 'List' : 'รายการ';
    }
    if (calBtn) {
        var calSpan = calBtn.querySelector('span');
        if (calSpan) calSpan.textContent = isEN ? 'Calendar' : 'ปฏิทิน';
    }

    // 🌟 5. อัปเดตหัวข้อฟอร์ม (Form Title) ในกรณีที่เปิดหน้าฟอร์มค้างไว้
    var formView = document.getElementById('visitFormView');
    if (formView && !formView.classList.contains('d-none')) {
        var visitIdEl = document.getElementById('visitId');
        var currentVisitId = visitIdEl ? visitIdEl.value : '';
        var titleEl = document.getElementById('formVisitTitle');

        if (titleEl) {
            if (currentVisitId && currentVisitId !== 'NEW') {
                var titleTextEdit = (typeof window.t === 'function') ? window.t('title_edit_visit') : (isEN ? 'Edit Visit' : 'แก้ไขข้อมูลการเยี่ยม');
                titleEl.innerHTML = '✏️ <span data-i18n="title_edit_visit">' + titleTextEdit + '</span>';
            } else {
                var titleTextAdd = (typeof window.t === 'function') ? window.t('title_add_visit') : (isEN ? 'Add New Visit' : 'สร้างบันทึกเยี่ยมใหม่');
                titleEl.innerHTML = '📝 <span data-i18n="title_add_visit">' + titleTextAdd + '</span>';
                if (typeof window.saveFormDraft === 'function') window.saveFormDraft();
            }
        }
    }

    // 6. โหลด Dropdowns และคืนค่า Draft/Purpose
    if (typeof window.loadDropdowns === 'function') {
        window.loadDropdowns(false).then(function() {
            if (formView && !formView.classList.contains('d-none')) {
                var vId = document.getElementById('visitId') ? document.getElementById('visitId').value : '';
                if (vId && vId !== 'NEW') {
                    if (typeof window.openEditVisitView === 'function') window.openEditVisitView(vId); 
                } else {
                    if (typeof window.restoreFormDraft === 'function') window.restoreFormDraft('NEW');
                    if (typeof window.updatePurposeDisplayLang === 'function') window.updatePurposeDisplayLang();
                }
            }
        });
    } 

    // 7. อัปเดตตาราง และ ปฏิทิน
    if (typeof window.renderVisitTableServerSide === 'function') {
        window.renderVisitTableServerSide();
    } else if (typeof window.renderVisitTable === 'function') {
        window.renderVisitTable();
    }

    if (window.VisitManagerCache && window.VisitManagerCache.currentMainView === 'calendar') {
        if (typeof window.renderCalendarView === 'function') window.renderCalendarView(); 
    }   

    // 8. อัปเดต Sample Dropdown
    if (typeof window.refreshSampleDropdownLang === 'function') {
        window.refreshSampleDropdownLang();
    }
};

if (!window._isAppLangListenerAttached) {
    window.addEventListener('appLanguageChanged', function() {
        if (typeof window.updateLangUI === 'function') window.updateLangUI();
        if (typeof window.updatePurposeDisplayLang === 'function') window.updatePurposeDisplayLang(); // 🌟 แทรกบรรทัดนี้เพิ่มเข้าไป
    });
    window._isAppLangListenerAttached = true;
}

var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
var btnGps = document.getElementById('btnGpsCheckin');
if (btnGps) {
    if (btnGps.classList.contains('btn-success')) {
        btnGps.innerHTML = '<i class="fa-solid fa-check fs-5"></i> <span>' + (appLang === 'en' ? 'Checked-in' : 'เช็คอินแล้ว') + '</span>';
    } else {
        btnGps.innerHTML = '<i class="fa-solid fa-crosshairs fs-5"></i> <span>' + (appLang === 'en' ? 'Get Current Location' : 'ดึงพิกัดปัจจุบัน') + '</span>';
    }
}
var noAttachmentText = document.getElementById('noAttachmentText');
if (noAttachmentText) {
    noAttachmentText.innerText = appLang === 'en' ? 'No attachments yet' : 'ยังไม่มีไฟล์แนบ';
}

// ==========================================
// 🎯 RENDER VISIT FILTERS ENGINE
// ==========================================
 window.renderVisitFilters = function() {
    // 🌟 สั่งปลดล็อกคลาส d-none ที่กล่อง id="visitFilterZoneGroup" ใน HTML ของคุณ
    var filterZone = document.getElementById('visitFilterZoneGroup') || document.getElementById('visitFilterZone');
    if (filterZone) {
        filterZone.classList.remove('d-none');
        filterZone.style.setProperty('display', 'block', 'important');
    }

    var crmUser = null;
    try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}

    if (typeof window.setupFiltersDropdowns === 'function') {
        window.setupFiltersDropdowns(crmUser, []);
    }
};

 window.initVisitPage = async function(forceReload) {
    if (window._isInitRunning) return;

    var formView = document.getElementById('visitFormView');
    if (formView && !formView.classList.contains('d-none')) return;

    window._isInitRunning = true; 
    window.isInitialLoading = true; 

    var domWaitCount = 0;
    while (!document.getElementById('filterVisitStatus') && domWaitCount < 20) {
        await new Promise(r => setTimeout(r, 20));
        domWaitCount++;
    }

    var hasCache = (window.VisitManagerCache && window.VisitManagerCache.isLoaded && window.globalVisits && window.globalVisits.length > 0);
    var shouldFetchDB = forceReload === true ? true : !hasCache;

    var visitViewEl = document.getElementById('visitListView');
    var loadingTitleEl = document.getElementById('loadingTitleText');
    var loadingDescEl = document.getElementById('loadingDescText');

    if (shouldFetchDB && visitViewEl) {
        var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
        
        if (loadingTitleEl) {
            loadingTitleEl.textContent = (typeof t === 'function') ? t('status_loading') : (appLang === 'en' ? 'Loading Data...' : 'กำลังโหลดข้อมูล...');
        }
        if (loadingDescEl) {
            loadingDescEl.textContent = (typeof t === 'function') ? t('status_loading_desc') : (appLang === 'en' ? 'Processing your access rights and retrieving records.' : 'กำลังตรวจสอบสิทธิ์การใช้งานและดึงข้อมูลระบบ');
        }

        visitViewEl.classList.add('is-loading');
    }

    try {
        if (typeof window.initUserInfo === 'function') window.initUserInfo(); 

        if (typeof window.loadDropdowns === 'function') {
            await window.loadDropdowns(shouldFetchDB); 
        }

        var subTasks = [];
        if (typeof window.loadVisits === 'function') subTasks.push(window.loadVisits(shouldFetchDB));
        if (typeof window.loadMasterSamplesList === 'function') subTasks.push(window.loadMasterSamplesList());
        if (typeof window.fetchVisitFeaturesConfig === 'function') subTasks.push(window.fetchVisitFeaturesConfig());
        if (typeof window.fetchDetailingMedia === 'function') subTasks.push(window.fetchDetailingMedia());

        await Promise.all(subTasks);

        // 🌟 [จุดที่หลุดหายไป]: เรียกปั้น Filter UI และแสดง Container ออกบนหน้าจอ
        if (typeof window.renderVisitFilters === 'function') {
            window.renderVisitFilters();
        } else if (typeof window.setupFiltersDropdowns === 'function') {
            var crmUser = null; 
            try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}
            window.setupFiltersDropdowns(crmUser, []);
        }

        if (typeof window.bindDoctorChangeForHistory === 'function') window.bindDoctorChangeForHistory();

        if (typeof setLanguage === 'function' && typeof currentLang !== 'undefined') {
            setLanguage(currentLang);
        }

    } catch(err) {
        console.error("Init Visits Failed:", err);
        var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
        var msgErr = appLang === 'en' ? '❌ Failed to load data' : '❌ ดึงข้อมูลไม่สำเร็จ';
        var tbody = document.getElementById('visitTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">' + msgErr + err.message + '</td></tr>';
    } finally {
        window.isInitialLoading = false; 
        window._isInitRunning = false;  

        if (visitViewEl) visitViewEl.classList.remove('is-loading');
    }
};

var btnRef = document.getElementById('btnRefreshVisits');
if (btnRef) {
    btnRef.onclick = function() { window.initVisitPage(true); };
}

window.loadMasterDataForVisits = async function() {
    if (!window.globalTerritories || window.globalTerritories.length === 0) {
        try {
            var terrRes = await window.supabaseClient.from('Territory').select('*').eq('Status', 'Active');
            if (!terrRes.error && terrRes.data) {
                window.globalTerritories = terrRes.data;
            }
        } catch(e) { console.error("Error loading Territories:", e); }
    }

    if (!window.globalTeams || window.globalTeams.length === 0) {
        try {
            var teamRes = await window.supabaseClient.from('Team').select('*').eq('Status', 'Active');
            if (!teamRes.error && teamRes.data) {
                window.globalTeams = teamRes.data;
            }
        } catch(e) { console.error("Error loading Teams:", e); }
    }
};

window.syncOfflineVisits = async function() {
    if (!navigator.onLine) return;
    var queue = JSON.parse(localStorage.getItem('crmOfflineQueue') || '[]');
    if (queue.length === 0) return;

    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    var msgSyncing = appLang === 'en' 
        ? "🔄 Back Online: Syncing offline data to server..." 
        : "🔄 กลับมาออนไลน์: กำลังซิงค์ข้อมูลออฟไลน์ไปยังเซิร์ฟเวอร์...";

    if (window.showToast) window.showToast(msgSyncing, "info");
    
    var remainingQueue = [];
    var successCount = 0;

    for (var i = 0; i < queue.length; i++) {
        var item = queue[i];
        try {
            if (item.existingVisitId) {
                await window.supabaseClient.from('Visit_Logs').update(item.payload).eq('Visit_ID', item.existingVisitId);
                await window.supabaseClient.from('Visit_Products').delete().eq('Visit_ID', item.existingVisitId);
                await window.supabaseClient.from('Visit_Samples').delete().eq('Visit_ID', item.existingVisitId);
            } else {
                await window.supabaseClient.from('Visit_Logs').insert([item.payload]);
            }

            if (item.selectedProducts && item.selectedProducts.length > 0) {
                var vpPayload = item.selectedProducts.map(function(p) { return { Visit_ID: item.targetVisitId, Product_ID: p, Whoupdated: item.payload.Whoupdated }; });
                await window.supabaseClient.from('Visit_Products').insert(vpPayload);
            }

            if (item.samplePayloads && item.samplePayloads.length > 0) {
                await window.supabaseClient.from('Visit_Samples').insert(item.samplePayloads);
            }

            successCount++;
        } catch (err) {
            console.error("Offline sync failed for item:", item, err);
            remainingQueue.push(item);
        }
    }

    localStorage.setItem('crmOfflineQueue', JSON.stringify(remainingQueue));
    if (successCount > 0) {
        var msgSuccess = appLang === 'en' 
            ? "✅ Successfully synced " + successCount + " offline records." 
            : "✅ ซิงค์ข้อมูลออฟไลน์สำเร็จ " + successCount + " รายการ";
            
        if (window.showToast) window.showToast(msgSuccess, "success");
        if (typeof window.loadVisits === 'function') window.loadVisits(true);
    }
};

window.addEventListener('online', window.syncOfflineVisits);
setTimeout(function() { window.syncOfflineVisits(); }, 2000);

window.exportVisitsToCSV = function() {
    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    var sourceData = window.filteredVisits || window.globalVisits || [];
    
    if (sourceData.length === 0) {
        var msgNoData = appLang === 'en' ? "No data to export." : "ไม่มีข้อมูลสำหรับ Export";
        if (window.showToast) window.showToast(msgNoData, "warning");
        return;
    }

    if (window.showToast) {
        window.showToast(appLang === 'en' ? "Preparing export file..." : "กำลังเตรียมไฟล์ Export...", "info");
    }

    var isSamplesEnabled = window.globalVisitConfigs && window.globalVisitConfigs.samples !== false;

    var csvContent = "\uFEFF"; 
    var headers = ["Visit Date", "Start Time", "End Time", "Rep Name", "Area / Team", "Doctor Name", "Hospital", "Products", "Purpose", "Coaching", "Status", "Details", "Insight", "Next Action"];
    
    if (isSamplesEnabled) {
        headers.splice(10, 0, "Samples / Promo Items");
    }

    csvContent += headers.join(",") + "\n";

    var escapeCsv = function(str) {
        if (str === null || str === undefined) return '""';
        var safeStr = String(str).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
        return '"' + safeStr + '"';
    };

    sourceData.forEach(function(v) {
        var date = v.Visit_Date || "-";
        if (date.indexOf('T') !== -1) date = date.split('T')[0];

        var sTime = v.Start_Time || "-";
        var eTime = v.End_Time || "-";
        
        var repName = v.Rep_ID || "-";
        if (window._userIndex) {
            var userObj = window._userIndex[String(v.Rep_ID).trim().toLowerCase()];
            if (userObj) repName = userObj.Rep_Name || userObj.Name || userObj.Email || v.Rep_ID;
        }

        var areaName = v.Territory_ID || "-";
        if (window.globalTerritoryList) {
            var terObj = window.globalTerritoryList.find(function(t) { return String(t.Territory_ID) === String(v.Territory_ID); });
            if (terObj) areaName = terObj.Territory || terObj.Territory_Name || v.Territory_ID;
        }
        if (areaName === v.Territory_ID && window.globalTeamList) {
            var tmObj = window.globalTeamList.find(function(t) { return String(t.Team_ID) === String(v.Territory_ID); });
            if (tmObj) areaName = tmObj.Team || tmObj.Team_Name || v.Territory_ID;
        }
        if (areaName === v.Territory_ID && window.VisitManagerCache && window.VisitManagerCache.bus) {
            var buObj = window.VisitManagerCache.bus.find(function(b) { return String(b.BU_ID || b.id) === String(v.Territory_ID); });
            if (buObj) areaName = buObj.BU_Name || buObj.BU || buObj.Name_EN || v.Territory_ID;
        }

        var docIdClean = String(v.Doc_ID || v.doc_id || v.id || '').trim().toLowerCase();
        var docObj = window._docIndex ? window._docIndex[docIdClean] : null;
        
        var docName = (typeof window.getDoctorNameByLang === 'function') ? window.getDoctorNameByLang(docObj, v.Doc_ID) : (v.Doc_ID || "-");
        var hospName = (typeof window.getHospitalNameFromDocOrVisit === 'function') ? window.getHospitalNameFromDocOrVisit(docObj, v) : "-";

        var prods = "-";
        if (v.Products_List) {
            prods = v.Products_List; 
        } else if (window._visitProdIndex) {
            var visitProds = window._visitProdIndex[String(v.Visit_ID).trim().toLowerCase()] || [];
            if (visitProds.length > 0) {
                var pNames = [];
                visitProds.forEach(function(vp) {
                    var pObj = window._prodIndex ? window._prodIndex[String(vp.Product_ID).trim().toLowerCase()] : null;
                    pNames.push(pObj ? pObj.Product : vp.Product_ID);
                });
                prods = pNames.join(", ");
            }
        }

        var purpose = (typeof window.getPurposeText === 'function') ? window.getPurposeText(v.Purpose_ID, v.Purpose) : (v.Purpose_ID || "-");

        var coachingText = v.Is_Coaching ? (appLang === 'en' ? "Yes" : "ใช่") : (appLang === 'en' ? "No" : "ไม่ใช่");

        var status = v.Status || "-";
        var details = v.Details || "-";
        var insight = v.Insight || "-";
        var nextAction = v.Next_Action || "-";

        var samplesText = "-";
        if (isSamplesEnabled) {
            var vidClean = String(v.Visit_ID || '').trim().toLowerCase();
            var sampleItems = (window._visitSampleIndex && window._visitSampleIndex[vidClean]) 
                              ? window._visitSampleIndex[vidClean] 
                              : (v.Visit_Samples || []);

            if (sampleItems && sampleItems.length > 0) {
                var smpDetails = [];
                sampleItems.forEach(function(s) {
                    var sampleName = s.Sample_ID;
                    if (window.globalMasterSamples && window.globalMasterSamples.length > 0) {
                        var masterObj = window.globalMasterSamples.find(function(m) { return String(m.Index_ID) === String(s.Sample_ID); });
                        if (masterObj) {
                            sampleName = (appLang === 'en' && masterObj.Value1) ? masterObj.Value1 : masterObj.Value;
                        }
                    }
                    smpDetails.push(sampleName + " (" + (s.Quantity || 1) + ")");
                });
                samplesText = smpDetails.join(", ");
            }
        }

        var rowData = [
            escapeCsv(date),
            escapeCsv(sTime),
            escapeCsv(eTime),
            escapeCsv(repName),
            escapeCsv(areaName),
            escapeCsv(docName),
            escapeCsv(hospName),
            escapeCsv(prods),
            escapeCsv(purpose),
            escapeCsv(coachingText)
        ];

        if (isSamplesEnabled) {
            rowData.push(escapeCsv(samplesText));
        }

        rowData.push(escapeCsv(status));
        rowData.push(escapeCsv(details));
        rowData.push(escapeCsv(insight));
        rowData.push(escapeCsv(nextAction));

        csvContent += rowData.join(",") + "\n";
    });

    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement("a");
    var url = URL.createObjectURL(blob);
    var exportDate = new Date().toISOString().split('T')[0];
    
    link.setAttribute("href", url);
    link.setAttribute("download", "Visit_Logs_Export_" + exportDate + ".csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ==========================================
// 🛡️ AUTO-SAVE DRAFT ENGINE
// ==========================================
window.visitAutosaveTimer = null;

window.collectVisitFormData = function() {
    return {
        docId: document.getElementById('visitDocId') ? document.getElementById('visitDocId').value : '',
        purpose: document.getElementById('visitPurpose') ? document.getElementById('visitPurpose').value : '',
        date: document.getElementById('visitDate') ? document.getElementById('visitDate').value : '',
        startTime: document.getElementById('visitStartTime') ? document.getElementById('visitStartTime').value : '',
        endTime: document.getElementById('visitEndTime') ? document.getElementById('visitEndTime').value : '',
        details: document.getElementById('visitDetails') ? document.getElementById('visitDetails').value : '',
        insight: document.getElementById('visitInsight') ? document.getElementById('visitInsight').value : '',
        nextAction: document.getElementById('visitNextAction') ? document.getElementById('visitNextAction').value : '',
        isCoaching: document.getElementById('visitIsCoaching') ? document.getElementById('visitIsCoaching').checked : false
    };
};

window.triggerVisitAutosave = function() {
    clearTimeout(window.visitAutosaveTimer);
    
    window.visitAutosaveTimer = setTimeout(function() {
        const isFormVisible = document.getElementById('visitFormView') && !document.getElementById('visitFormView').classList.contains('d-none');
        const isEditMode = document.getElementById('visitId') && document.getElementById('visitId').value !== "";
        
        if (isFormVisible && !isEditMode) {
            const formData = window.collectVisitFormData();
            if (!formData.docId && !formData.details && !formData.insight && !formData.nextAction) return;

            localStorage.setItem('crm_visit_autosave', JSON.stringify(formData));
            
            const btnSave = document.getElementById('saveVisitBtn');
            if (btnSave && !btnSave.innerHTML.includes('Auto-saved')) {
                const originalHTML = btnSave.innerHTML;
                btnSave.innerHTML = '<i class="fa-solid fa-cloud-arrow-up text-info"></i> Auto-saved';
                setTimeout(() => { btnSave.innerHTML = originalHTML; }, 2000);
            }
        }
    }, 1500); 
};

window.attachAutosaveListeners = function() {
    const form = document.getElementById('visitForm');
    if (form && !form.hasAttribute('data-autosave-attached')) {
        form.addEventListener('input', window.triggerVisitAutosave);
        form.addEventListener('change', window.triggerVisitAutosave);
        form.setAttribute('data-autosave-attached', 'true');
    }
};

window.checkAndRestoreAutosave = function() {
    const savedDataStr = localStorage.getItem('crm_visit_autosave');
    if (savedDataStr) {
        try {
            const savedData = JSON.parse(savedDataStr);
            if (!savedData.docId && !savedData.details && !savedData.insight && !savedData.nextAction) return;

            var appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
            var msg = appLang === 'en' ? "You have an unsaved draft. Do you want to restore it?" : "พบข้อมูลฟอร์มที่พิมพ์ค้างไว้รอบที่แล้ว ต้องการกู้คืนหรือไม่?";
            
            if (confirm(msg)) {
                if (savedData.docId) {
                     const docSelect = document.getElementById('visitDocId');
                     if(docSelect && docSelect.tomselect) docSelect.tomselect.setValue(savedData.docId);
                     else if(docSelect) docSelect.value = savedData.docId;
                }
                if (savedData.purpose) document.getElementById('visitPurpose').value = savedData.purpose;
                if (savedData.date) document.getElementById('visitDate').value = savedData.date;
                if (savedData.startTime) document.getElementById('visitStartTime').value = savedData.startTime;
                if (savedData.endTime) document.getElementById('visitEndTime').value = savedData.endTime;
                if (savedData.details) document.getElementById('visitDetails').value = savedData.details;
                if (savedData.insight) document.getElementById('visitInsight').value = savedData.insight;
                if (savedData.nextAction) document.getElementById('visitNextAction').value = savedData.nextAction;
                if (savedData.isCoaching !== undefined) document.getElementById('visitIsCoaching').checked = savedData.isCoaching;
                
                if (window.showToast) window.showToast(appLang === 'en' ? "Draft restored successfully." : "กู้คืนข้อมูลสำเร็จ", "success");
            } else {
                localStorage.removeItem('crm_visit_autosave');
            }
        } catch(e) {}
    }
};

// ==========================================
// 🔍 LAST VISIT HISTORY ENGINE
// ==========================================
window.fetchLastVisitHistory = async function(docId) {
    const historyBox = document.getElementById('lastVisitHistoryBox');
    
    if (!docId || !historyBox) {
        if (historyBox) historyBox.classList.add('d-none');
        return;
    }

    const currentStatusEl = document.getElementById('visitStatus');
    const currentStatus = currentStatusEl ? currentStatusEl.value : '';
    
    if (currentStatus === 'Submitted') {
        historyBox.classList.add('d-none');
        return;
    }

    try {
        const currentVisitId = document.getElementById('visitId') ? document.getElementById('visitId').value : '';
        
        let query = window.supabaseClient
            .from('Visit_Logs')
            .select('Visit_Date, Details, Insight, Next_Action, Status')
            .eq('Doc_ID', docId)
            .eq('Status', 'Submitted')
            .order('Visit_Date', { ascending: false });

        if (currentVisitId && currentVisitId !== 'NEW') {
            query = query.neq('Visit_ID', currentVisitId);
        }

        const { data, error } = await query.limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            const lastVisit = data[0];
            const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
            
            let formattedDate = '-';
            let relativeTimeStr = '';
            
            if (lastVisit.Visit_Date) {
                const lastDateObj = new Date(lastVisit.Visit_Date);
                const localeStr = (appLang === 'en') ? 'en-US' : 'th-TH';
                
                formattedDate = lastDateObj.toLocaleDateString(localeStr, { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                });

                const today = new Date();
                const diffDays = Math.round((today - lastDateObj) / (1000 * 60 * 60 * 24));
                
                if (diffDays >= 0) {
                    if (diffDays === 0) relativeTimeStr = appLang === 'en' ? 'Today' : 'วันนี้';
                    else if (diffDays === 1) relativeTimeStr = appLang === 'en' ? 'Yesterday' : 'เมื่อวาน';
                    else if (diffDays < 7) relativeTimeStr = appLang === 'en' ? `${diffDays} days ago` : `${diffDays} วันที่แล้ว`;
                    else if (diffDays < 30) relativeTimeStr = appLang === 'en' ? `${Math.floor(diffDays / 7)} weeks ago` : `${Math.floor(diffDays / 7)} สัปดาห์ที่แล้ว`;
                    else relativeTimeStr = appLang === 'en' ? `${Math.floor(diffDays / 30)} months ago` : `${Math.floor(diffDays / 30)} เดือนที่แล้ว`;
                }
            }
            
            const dateBadge = document.getElementById('lastVisitDateBadge');
            const visitDateInput = document.getElementById('visitDate');
            const currentSelectedDate = visitDateInput ? new Date(visitDateInput.value) : new Date();
            const lastVisitDateObj = new Date(lastVisit.Visit_Date);

            if (dateBadge) {
                const displayText = relativeTimeStr ? `${formattedDate} (${relativeTimeStr})` : formattedDate;
                
                if (lastVisitDateObj > currentSelectedDate) {
                    dateBadge.className = 'badge bg-warning text-dark border border-warning-subtle shadow-xs';
                    var warnText = appLang === 'en' ? 'Backdated' : 'บันทึกย้อนหลัง';
                    dateBadge.innerHTML = `<i class="fa-solid fa-clock-rotate-left me-1"></i> ${displayText} [${warnText}]`;
                } else {
                    dateBadge.className = 'badge bg-primary shadow-xs';
                    dateBadge.innerText = displayText;
                }
            }
            
            let detailsText = lastVisit.Details || '-';
            if (lastVisit.Insight) detailsText += ` (Insight: ${lastVisit.Insight})`;
            
            document.getElementById('lastVisitDetails').innerText = detailsText;
            document.getElementById('lastVisitNextAction').innerText = lastVisit.Next_Action || '-';
            
            historyBox.classList.remove('d-none');
        } else {
            historyBox.classList.add('d-none');
        }
    } catch (err) {
        console.error("Error fetching last visit:", err);
        if (historyBox) historyBox.classList.add('d-none');
    }
};

window.bindDoctorChangeForHistory = function() {
    const docSelect = document.getElementById('visitDocId');
    if (docSelect && !docSelect.hasAttribute('data-history-attached')) {
        docSelect.addEventListener('change', function(e) {
            window.fetchLastVisitHistory(e.target.value);
        });
        docSelect.setAttribute('data-history-attached', 'true');
    }
};

window.triggerSmartSearch = function() {
    window.currentPage = 1;
    if (typeof window.loadVisits === 'function') {
        window.loadVisits(true);
    }
};

window.fpStartInstance = null;
window.fpEndInstance = null;

 window.initVisitDatePickers = function() {
  var appLang = window.getCurrentAppLang();
  var isEN = appLang === 'en';
  var localeConfig = isEN ? 'default' : flatpickr.l10ns.th;
  var placeholderText = isEN ? 'dd/mm/yyyy' : 'วว/ดด/ปปปป';

  var startEl = document.getElementById('filterStartDate');
  var endEl = document.getElementById('filterEndDate');
  var formDateEl = document.getElementById('visitDate');

  // 🌟 เพิ่มตัวแปรอ้างอิง Element วันที่ของ TOT Modal
  var totStartEl = document.getElementById('totStartDate');
  var totEndEl = document.getElementById('totEndDate');

  if (window.fpStartInstance) window.fpStartInstance.destroy();
  if (window.fpEndInstance) window.fpEndInstance.destroy();

  var commonConfig = {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y", // 👈 บังคับโชว์หน้าจอเป็น DD/MM/YYYY
    locale: localeConfig,
    allowInput: false,
    onChange: function() {
      if (typeof window.filterVisits === 'function') window.filterVisits();
    }
  };

  if (startEl && endEl) {
    startEl.placeholder = placeholderText;
    endEl.placeholder = placeholderText;
    window.fpStartInstance = flatpickr(startEl, commonConfig);
    window.fpEndInstance = flatpickr(endEl, commonConfig);
  }

  // 🌟 เพิ่มการผูก Flatpickr ให้ช่องวันที่ในหน้าฟอร์ม (#visitDate)
  if (formDateEl) {
    if (window.fpFormDateInstance) window.fpFormDateInstance.destroy();
    window.fpFormDateInstance = flatpickr(formDateEl, {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d/m/Y",
      locale: localeConfig,
      allowInput: false,
      onChange: function() {
        if (typeof window.saveFormDraft === 'function') window.saveFormDraft();
      }
    });
  }

  // 🌟 [อัปเดตใหม่]: ผูก Flatpickr ให้กับช่องวันที่ Start Date & End Date ของ TOT Modal (#totStartDate, #totEndDate)
  var totConfig = {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y", // 👈 บังคับโชว์หน้าจอเป็น DD/MM/YYYY ให้ตรงกับ Visit Form
    locale: localeConfig,
    allowInput: false
  };

  if (totStartEl) {
    if (window.fpTotStartInstance) window.fpTotStartInstance.destroy();
    totStartEl.placeholder = placeholderText;
    window.fpTotStartInstance = flatpickr(totStartEl, totConfig);
  }

  if (totEndEl) {
    if (window.fpTotEndInstance) window.fpTotEndInstance.destroy();
    totEndEl.placeholder = placeholderText;
    window.fpTotEndInstance = flatpickr(totEndEl, totConfig);
  }
};


// 🌟 ฟังก์ชันแปลงวันที่ให้เป็น DD/MM/YYYY (วัน/เดือน/ปี)
function formatToDDMMYYYY(dateString) {
    if (!dateString) return "-";
    var d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString; // ถ้าไม่ใช่วันที่ให้คืนค่าเดิมกลับไป
    
    var day = ("0" + d.getDate()).slice(-2);
    var month = ("0" + (d.getMonth() + 1)).slice(-2);
    var year = d.getFullYear();
    
    return day + "/" + month + "/" + year; 
}
// ==========================================
// 🎁 SAMPLES & PROMO ITEMS ENGINE (NO DUPLICATE & NO EMPTY ROWS)
// ==========================================

window.globalMasterSamples = [];

window.loadMasterSamplesList = async function() {
    try {
        const { data: typeData, error: typeErr } = await window.supabaseClient
            .from('IndexType')
            .select('IndexType_ID, Name');

        if (typeErr) throw typeErr;

        const sampleType = (typeData || []).find(t => {
            const name = (t.Name || '').toLowerCase().trim();
            return name === 'samples' || name === 'sample' || name === 'promo item' || name === 'samples & promo items';
        });

        if (sampleType) {
            const { data: indexData, error: idxErr } = await window.supabaseClient
                .from('Index')
                .select('Index_ID, Value, Value1')
                .eq('IndexType_ID', sampleType.IndexType_ID)
                .order('Value', { ascending: true });

            if (!idxErr && indexData) {
                window.globalMasterSamples = indexData;
            }
        }
    } catch (e) {
        console.error("Error loading samples from Index table:", e);
    }
};

window.getSamplesData = function() {
    const container = document.getElementById('sampleItemsContainer');
    if (!container) return [];

    const rows = container.querySelectorAll('.sample-item-row');
    const samples = [];

    rows.forEach(row => {
        const selectEl = row.querySelector('.sample-id-select');
        const qtyEl = row.querySelector('.sample-qty');

        if (selectEl && selectEl.value) {
            samples.push({
                sample_id: selectEl.value,
                quantity: qtyEl ? parseInt(qtyEl.value, 10) || 1 : 1
            });
        }
    });

    return samples;
};

window.renderAllSampleDropdowns = function() {
    const allSelects = document.querySelectorAll('#sampleItemsContainer .sample-id-select');
    
    const selectedIds = Array.from(allSelects)
        .map(select => select.value)
        .filter(val => val !== '');

    var btnEN = document.getElementById('btnLangEN');
    var isEN = btnEN && btnEN.classList.contains('btn-primary');
    var placeholderText = isEN ? '-- Select Sample / Promo Item --' : '-- เลือกสินค้าตัวอย่าง / Promo --';

    allSelects.forEach(currentSelect => {
        const currentValue = currentSelect.value;
        let optionsHTML = `<option value="">${placeholderText}</option>`;

        if (window.globalMasterSamples && window.globalMasterSamples.length > 0) {
            window.globalMasterSamples.forEach(item => {
                const itemIdStr = String(item.Index_ID);
                const displayName = (isEN && item.Value1) ? item.Value1 : item.Value;
                const isCurrentSelected = itemIdStr === String(currentValue);

                if (isCurrentSelected || !selectedIds.includes(itemIdStr)) {
                    const selectedAttr = isCurrentSelected ? 'selected' : '';
                    optionsHTML += `<option value="${itemIdStr}" ${selectedAttr}>${displayName}</option>`;
                }
            });
        }

        currentSelect.innerHTML = optionsHTML;
    });
};

 window.addSampleRow = function(sampleId = '', qty = 1) {
    const container = document.getElementById('sampleItemsContainer');
    const noText = document.getElementById('noSampleText');
    if (noText) noText.style.display = 'none';

    // 🌟 ใส่เลขสุ่มเพิ่ม ป้องกัน ID แถวซ้ำกัน
    const rowId = 'sampleRow_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    var btnEN = document.getElementById('btnLangEN');
    var isEN = btnEN && btnEN.classList.contains('btn-primary');

    // 🌟 เติมคลาส btn-delete-sample กลับเข้าไปที่ปุ่มถังขยะ เพื่อให้ฟังก์ชันล็อกสิทธิ์สั่งซ่อนได้
    const rowHTML = `
        <div class="d-flex align-items-center gap-2 sample-item-row p-2 mb-2 bg-light border rounded-4" id="${rowId}">
            <div class="flex-grow-1">
                <select class="form-select border-0 shadow-sm sample-id-select fw-semibold text-secondary" style="min-height: 46px; border-radius: 12px;" onchange="window.handleSampleSelectChange(this)" required>
                </select>
            </div>
            <div style="width: 85px;">
                <input type="number" class="form-control border-0 shadow-sm text-center sample-qty fw-bold text-primary" style="min-height: 46px; border-radius: 12px;" placeholder="${isEN ? 'Qty' : 'จำนวน'}" min="1" value="${qty}">
            </div>
            <div>
                <button type="button" class="btn btn-white text-danger border-0 shadow-sm d-flex align-items-center justify-content-center btn-delete-sample" style="width: 46px; height: 46px; border-radius: 12px; background-color: #ffffff;" onclick="document.getElementById('${rowId}').remove(); window.handleSampleRowRemoved();">
                    <i class="fa-solid fa-trash-can fs-5"></i>
                </button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', rowHTML);

    // 🌟 1. FIX: ต้องสั่งสร้าง <option> ของ Dropdown ก่อน!
    window.renderAllSampleDropdowns();

    // 🌟 2. FIX: พอมันมี <option> แล้ว ค่อยจับยัดค่าลงไป
    if (sampleId) {
        const newSelect = container.querySelector(`#${rowId} .sample-id-select`);
        if (newSelect) {
            newSelect.value = sampleId;
            window.renderAllSampleDropdowns(); // อัปเดตเพื่อซ่อนตัวเลือกนี้ออกจากแถวอื่น
        }
    }
};

window.handleSampleSelectChange = function(selectEl) {
    window.renderAllSampleDropdowns();
    if (typeof window.updateFeatureButtonIndicators === 'function') {
        window.updateFeatureButtonIndicators(null);
    }
};

window.handleSampleRowRemoved = function() {
    window.checkEmptySamples();
    window.renderAllSampleDropdowns();
    if (typeof window.updateFeatureButtonIndicators === 'function') {
        window.updateFeatureButtonIndicators(null);
    }
};

window.refreshSampleDropdownLang = function() {
    window.renderAllSampleDropdowns();
};

window.checkEmptySamples = function() {
    const container = document.getElementById('sampleItemsContainer');
    const noText = document.getElementById('noSampleText');
    const rows = container ? container.querySelectorAll('.sample-item-row') : [];
    if (rows.length === 0 && noText) noText.style.display = 'block';
};

window.cleanEmptySampleRows = function() {
    const container = document.getElementById('sampleItemsContainer');
    if (!container) return;

    const rows = container.querySelectorAll('.sample-item-row');
    rows.forEach(row => {
        const selectEl = row.querySelector('.sample-id-select');
        if (selectEl && !selectEl.value) {
            row.remove();
        }
    });

    window.checkEmptySamples();
    window.renderAllSampleDropdowns();
    if (typeof window.updateFeatureButtonIndicators === 'function') {
        window.updateFeatureButtonIndicators(null);
    }
};

window.collectVisitSamplesPayload = function(visitId, whoUpdated) {
    const validSamples = window.getSamplesData();
    return validSamples.map(item => ({
        Visit_ID: visitId,
        Sample_ID: item.sample_id,
        Quantity: item.quantity,
        Whoupdated: whoUpdated,
        Whenupdated: new Date().toISOString()
    }));
};

window._activeSampleFetch = null;
window.loadVisitSamplesForEdit = async function(visitId) {
    if (window._activeSampleFetch === visitId) return; // 🌟 ป้องกันการดึงข้อมูลซ้ำซ้อน
    window._activeSampleFetch = visitId;

    const container = document.getElementById('sampleItemsContainer');
    if (!container) { window._activeSampleFetch = null; return; }
    
    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    container.innerHTML = '<div class="text-muted small text-center italic" id="noSampleText">' + (appLang === 'en' ? 'No samples issued (Click "Add Item")' : 'ไม่มีการจ่ายสินค้าตัวอย่าง (กดปุ่ม "เพิ่มรายการ")') + '</div>';

    try {
        const { data, error } = await window.supabaseClient
            .from('Visit_Samples')
            .select('Sample_ID, Quantity')
            .eq('Visit_ID', visitId);

        if (!error && data && data.length > 0) {
            data.forEach(item => {
                window.addSampleRow(item.Sample_ID, item.Quantity);
            });
            // ไม่ต้อง renderAllSampleDropdowns ซ้ำ เพราะ addSampleRow จัดการให้แล้ว
            
            // 🌟 สั่งอัปเดตปุ่มให้เป็นสีเขียว หลังจากที่โหลดข้อมูลเสร็จ
            if (typeof window.updateFeatureButtonIndicators === 'function') {
                window.updateFeatureButtonIndicators(null);
            }
        }

        // 🌟 [FIX] ดักจับสิทธิ์ Read-Only หลังจากโหลด Data เสร็จ
        var btnSave = document.getElementById('saveVisitBtn');
        if (btnSave && btnSave.dataset.mode === 'disabled' && typeof window.setFormComponentsReadOnly === 'function') {
            window.setFormComponentsReadOnly(true);
        }

    } catch (e) {
        console.error("Error loading Visit_Samples:", e);
    } finally {
        window._activeSampleFetch = null; // ปลดล็อก
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const samplesModalEl = document.getElementById('samplesDrawerModal');
    if (samplesModalEl) {
        samplesModalEl.addEventListener('hidden.bs.modal', function () {
            window.cleanEmptySampleRows();
        });
    }
});

// 🌟 1. ฟังก์ชันเวลากดคลิกที่กล่อง KPI  
window.clickStatCard = function(status) {
    if (window.tomSelectStatusInstance) {
        window.tomSelectStatusInstance.setValue(status, true); 
    } else {
        var statusEl = document.getElementById('filterVisitStatus');
        if (statusEl) statusEl.value = status;
    }

    if (typeof window.updateStatCardActiveUI === 'function') {
        window.updateStatCardActiveUI(status);
    }

    var currentMainView = (window.VisitManagerCache && window.VisitManagerCache.currentMainView) 
        ? window.VisitManagerCache.currentMainView 
        : 'list';

    window.currentPage = 1;
    if (typeof window.loadVisits === 'function') {
        // ส่ง flag isBackground = true ไปถ้าอยู่หน้า calendar เพื่อไม่ให้ขึ้นหน้าจอ Loading
        var isBg = (currentMainView === 'calendar');
        window.loadVisits(true, isBg);
    }
};

// 🌟 2. ฟังก์ชันสลับสี Active ของกล่อง KPI
window.updateStatCardActiveUI = function(status) {
    // หากล่องผ่าน ID ของตัวเลขที่อยู่ด้านใน
    var elTotal = document.getElementById('statTotalVisits') ? document.getElementById('statTotalVisits').closest('.kpi-card-elevated') : null;
    var elPending = document.getElementById('statPendingVisits') ? document.getElementById('statPendingVisits').closest('.kpi-card-elevated') : null;
    var elSubmitted = document.getElementById('statSubmittedVisits') ? document.getElementById('statSubmittedVisits').closest('.kpi-card-elevated') : null;

    // เคลียร์คลาส active เก่าออกให้หมด
    if (elTotal) elTotal.classList.remove('active-total');
    if (elPending) elPending.classList.remove('active-pending');
    if (elSubmitted) elSubmitted.classList.remove('active-submitted');

    // เติมคลาส active ให้กล่องที่ตรงกับสถานะปัจจุบัน
    if (!status || status === '') {
        if (elTotal) elTotal.classList.add('active-total');
    } else if (status === 'Pending') {
        if (elPending) elPending.classList.add('active-pending');
    } else if (status === 'Submitted') {
        if (elSubmitted) elSubmitted.classList.add('active-submitted');
    }
};

// 🌟 1. ตัวแปรและฟังก์ชันสำหรับรับค่าจาก Dropdown ปฏิทิน
window.currentCalendarRepFilter = '';

window.changeCalendarRepFilter = function(repId) {
    window.currentCalendarRepFilter = repId;
    if (typeof window.renderCalendarView === 'function') {
        window.renderCalendarView(); // สั่งวาดปฏิทินใหม่เมื่อเลือกชื่อ
    }
};

 
// ==========================================
// 🔍 SMART AUTO-SEARCH & CLEAR ENGINE FOR IPAD (FIXED LOST FOCUS)
// ==========================================
window.searchDebounceTimer = null;

window.handleSearchInput = function(inputEl) {
    var clearBtn = document.getElementById('btnClearSmartSearch');
    var val = inputEl ? inputEl.value : '';

    // แสดง/ซ่อน ปุ่ม (x) ล้างข้อความ
    if (clearBtn) {
        if (val.trim().length > 0) {
            clearBtn.classList.remove('d-none');
        } else {
            clearBtn.classList.add('d-none');
        }
    }

    // หน่วงเวลา 500ms ป้องกันการค้นหารัวขณะกำลังพิมพ์
    clearTimeout(window.searchDebounceTimer);
    window.searchDebounceTimer = setTimeout(function() {
        window.currentPage = 1;
        if (typeof window.loadVisits === 'function') {
            // 🌟 ส่ง flag isBackground = true เพื่อไม่ให้หน้าจอเปิดตัว Loading มาบังจน Lost Focus
            window.loadVisits(true, true);
        }
    }, 500);
};

// ฟังก์ชันแตะปุ่ม (x) ล้างข้อความค้นหา
window.clearSmartSearchInput = function() {
    var searchInput = document.getElementById('smartSearchInput');
    var clearBtn = document.getElementById('btnClearSmartSearch');
    
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    if (clearBtn) {
        clearBtn.classList.add('d-none');
    }

    window.currentPage = 1;
    if (typeof window.loadVisits === 'function') {
        window.loadVisits(true);
    }
};
// ==========================================
// 📄 PAGINATION CONTROLS ENGINE
// ==========================================
window.renderPaginationControls = function(totalPages) {
  if (typeof window.renderGlobalPagination === 'function') {
    window.renderGlobalPagination('visitPagination', window.currentPage, totalPages, 'goToPage');
  }
};

// ==========================================
// 🧑‍🏫 COACHING DROPDOWN RENDER
// ==========================================
window.renderCoachDropdown = function() {
    var coachSelect = document.getElementById('visitCoachRepId');
    if (!coachSelect) return;

    var crmUser = null; 
    try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}
    var myRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || '').trim() : '';

    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
    var placeholder = appLang === 'en' ? '- Select Coach -' : '- เลือกผู้ร่วมเยี่ยม -';
    
    var html = '<option value="">' + placeholder + '</option>';
    
    if (window.globalUsersList && window.globalUsersList.length > 0) {
        window.globalUsersList.forEach(function(u) {
            var uId = String(u.Rep_ID || u.User_ID || u.id || '').trim();
            // 🌟 ซ่อนชื่อตัวเองออกจาก Dropdown คนร่วมเยี่ยม
            if (uId && uId !== myRepId) {
                var uName = u.Rep_Name || u.Name || u.Email || uId;
                html += '<option value="' + uId + '">👤 ' + uName + '</option>';
            }
        });
    }
    coachSelect.innerHTML = html;
};

 
