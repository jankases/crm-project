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
// 🎁 SAMPLES & PROMO ITEMS ENGINE
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

window.addSampleRow = function(sampleId = '', qty = 1) {
    const container = document.getElementById('sampleItemsContainer');
    const noText = document.getElementById('noSampleText');
    if (noText) noText.style.display = 'none';

    const rowId = 'sampleRow_' + Date.now();
    var btnEN = document.getElementById('btnLangEN');
    var isEN = btnEN && btnEN.classList.contains('btn-primary');
    var placeholderText = isEN ? '-- Select Sample / Promo Item --' : '-- เลือกสินค้าตัวอย่าง / Promo --';

    let optionsHTML = `<option value="">${placeholderText}</option>`;
    if (window.globalMasterSamples && window.globalMasterSamples.length > 0) {
        window.globalMasterSamples.forEach(item => {
            const displayName = (isEN && item.Value1) ? item.Value1 : item.Value;
            const isSelected = String(item.Index_ID) === String(sampleId) ? 'selected' : '';
            optionsHTML += `<option value="${item.Index_ID}" ${isSelected}>${displayName}</option>`;
        });
    }

    const rowHTML = `
        <div class="row g-2 align-items-center sample-item-row" id="${rowId}">
            <div class="col-7">
                <select class="form-select form-select-sm bg-white shadow-sm sample-id-select" required>
                    ${optionsHTML}
                </select>
            </div>
            <div class="col-3">
                <input type="number" class="form-control form-control-sm bg-white shadow-sm text-center sample-qty" placeholder="${isEN ? 'Qty' : 'จำนวน'}" min="1" value="${qty}">
            </div>
            <div class="col-2 text-end">
                <button type="button" class="btn btn-sm btn-outline-danger border-0" onclick="document.getElementById('${rowId}').remove(); window.checkEmptySamples();">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    if (container) container.insertAdjacentHTML('beforeend', rowHTML);
};

window.refreshSampleDropdownLang = function() {
    const rows = document.querySelectorAll('#sampleItemsContainer .sample-item-row');
    if (!rows || rows.length === 0) return;

    var btnEN = document.getElementById('btnLangEN');
    var isEN = btnEN && btnEN.classList.contains('btn-primary');
    var placeholderText = isEN ? '-- Select Sample / Promo Item --' : '-- เลือกสินค้าตัวอย่าง / Promo --';

    rows.forEach(row => {
        const select = row.querySelector('.sample-id-select');
        if (select) {
            const currentVal = select.value;
            let optionsHTML = `<option value="">${placeholderText}</option>`;
            
            if (window.globalMasterSamples && window.globalMasterSamples.length > 0) {
                window.globalMasterSamples.forEach(item => {
                    const displayName = (isEN && item.Value1) ? item.Value1 : item.Value;
                    const isSelected = String(item.Index_ID) === String(currentVal) ? 'selected' : '';
                    optionsHTML += `<option value="${item.Index_ID}" ${isSelected}>${displayName}</option>`;
                });
            }
            select.innerHTML = optionsHTML;
        }
    });
};

window.checkEmptySamples = function() {
    const container = document.getElementById('sampleItemsContainer');
    const noText = document.getElementById('noSampleText');
    const rows = container ? container.querySelectorAll('.sample-item-row') : [];
    if (rows.length === 0 && noText) noText.style.display = 'block';
};

window.collectVisitSamplesPayload = function(visitId, whoUpdated) {
    const rows = document.querySelectorAll('#sampleItemsContainer .sample-item-row');
    const samplePayloads = [];

    rows.forEach(row => {
        const sampleSelect = row.querySelector('.sample-id-select');
        const qtyInput = row.querySelector('.sample-qty');
        
        const sampleId = sampleSelect ? sampleSelect.value : '';
        const qty = qtyInput ? (parseInt(qtyInput.value) || 0) : 0;

        if (sampleId && qty > 0) {
            samplePayloads.push({
                Visit_ID: visitId,
                Sample_ID: sampleId,
                Quantity: qty,
                Whoupdated: whoUpdated,
                Whenupdated: new Date().toISOString()
            });
        }
    });

    return samplePayloads;
};

window.loadVisitSamplesForEdit = async function(visitId) {
    const container = document.getElementById('sampleItemsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="text-muted small text-center italic" id="noSampleText">ไม่มีการจ่ายสินค้าตัวอย่าง (กดปุ่ม "เพิ่มรายการ")</div>';

    try {
        const { data, error } = await window.supabaseClient
            .from('Visit_Samples')
            .select('Sample_ID, Quantity')
            .eq('Visit_ID', visitId);

        if (!error && data && data.length > 0) {
            data.forEach(item => {
                window.addSampleRow(item.Sample_ID, item.Quantity);
            });
        }
    } catch (e) {
        console.error("Error loading Visit_Samples:", e);
    }
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
      if (i.Value) window._purposeIndex[String(i.Value).toLowerCase()] = i;
      if (i.Value1) window._purposeIndex[String(i.Value1).toLowerCase()] = i;
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
  if (!purposeId && !fallbackText) return '-';
  var key = String(purposeId || fallbackText).toLowerCase();
  var pObj = window._purposeIndex[key];
  if (!pObj) return fallbackText || purposeId || '-';
  var appLang = window.getCurrentAppLang();
  return (appLang === 'en') ? (pObj.Value1 || pObj.Value || '-') : (pObj.Value || pObj.Value1 || '-');
};

window.setTomSelectValue = function(instance, value, forceText) {
  if (!instance) return;
  var wasDisabled = instance.isDisabled;
  if (wasDisabled) instance.enable(); 
  if (Array.isArray(value)) {
      value.forEach(function(v) {
          if (v && !instance.options[v]) {
              var pName = v;
              if (window.globalProductsList) {
                  var pObj = window.globalProductsList.find(function(px) { return String(px.Product_ID) === String(v); });
                  if (pObj) pName = pObj.Product;
              }
              instance.addOption({value: v, text: pName});
          }
      });
  } else if (value && !instance.options[value]) {
      instance.addOption({value: value, text: forceText || value});
  }
  instance.setValue(value, true); 
  instance.refreshItems(); 
  if (forceText && !Array.isArray(value)) {
      var item = instance.control.querySelector('.item');
      if (item) item.innerText = forceText;
  }
  if (wasDisabled) instance.disable(); 
};

window.updatePurposeDisplayLang = function() {
  if (!window.tomSelectPurposeInstance) return;
  var currentVal = window.tomSelectPurposeInstance.getValue(); 
  if (!currentVal) return;
  var appLang = window.getCurrentAppLang();
  var pObj = window._purposeIndex[String(currentVal).toLowerCase()];
  if (pObj) {
      var textTh = pObj.Value || '';
      var textEn = pObj.Value1 || textTh;
      var displayVal = (appLang === 'en') ? textEn : textTh;
      var item = window.tomSelectPurposeInstance.control.querySelector('.item[data-value="'+currentVal+'"]');
      if (item) item.innerText = displayVal;
  }
};

window.getDoctorNameByLang = function(docObj, defaultId) {
  if (!docObj) return defaultId || '-';
  var lang = window.getCurrentAppLang();
  if (lang === 'en') return docObj.Doc_Name || docObj.doc_name || docObj.name || defaultId || '-';
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
// 💾 4. DRAFT & AUTO-SAVE ENGINE
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

window.checkMyDraftsReminder = function(myDraftCount) {
  var toastContainer = document.getElementById('draftToastContainer');
  if (!toastContainer) return;
  if (sessionStorage.getItem('hasShownDraftReminder') === 'true') { toastContainer.innerHTML = ''; return; }

  if (myDraftCount > 0) {
    sessionStorage.setItem('hasShownDraftReminder', 'true');

    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    var titleText = appLang === 'en' ? 'Pending Drafts Reminder' : 'มีฉบับร่างค้างยืนยัน';
    var descText = appLang === 'en' 
        ? 'You have <b class="text-primary">' + myDraftCount + '</b> unsubmitted visit logs.' 
        : 'คุณมี <b class="text-primary">' + myDraftCount + '</b> บันทึกเยี่ยมที่ยังไม่ได้ส่ง';

    toastContainer.innerHTML = 
      '<div class="draft-toast" id="myDraftToast">' +
        '<div class="text-warning fs-4"><i class="fa-solid fa-circle-exclamation"></i></div>' +
        '<div>' +
          '<div class="fw-bold text-dark small">' + titleText + '</div>' +
          '<div class="text-secondary" style="font-size: 0.82rem;">' + descText + '</div>' +
        '</div>' +
        '<button type="button" class="btn-close ms-2" onclick="document.getElementById(\'myDraftToast\').remove()"></button>' +
      '</div>';
    setTimeout(function() { var t = document.getElementById('myDraftToast'); if (t) t.remove(); }, 7000);
  } else { toastContainer.innerHTML = ''; }
};

// ==========================================
// 📊 5. VIEW TOGGLE FUNCTIONS
// ==========================================
window.toggleMainView = function(viewName) {
  window.VisitManagerCache = window.VisitManagerCache || {};
  window.VisitManagerCache.currentMainView = viewName;
  var btnList = document.getElementById('btnToggleList');
  var btnCal = document.getElementById('btnToggleCal');
  var listZone = document.getElementById('visitListZone');
  var calZone = document.getElementById('visitCalendarZone');

  if (viewName === 'calendar') {
      if (btnList) btnList.className = 'btn btn-sm btn-light text-secondary rounded-pill px-3 fw-bold border-0';
      if (btnCal) btnCal.className = 'btn btn-sm btn-primary rounded-pill px-3 fw-bold text-white';
      if (listZone) listZone.classList.add('d-none');
      if (calZone) calZone.classList.remove('d-none');
      if (typeof window.renderCalendarView === 'function') window.renderCalendarView();
  } else {
      if (btnList) btnList.className = 'btn btn-sm btn-primary rounded-pill px-3 fw-bold text-white';
      if (btnCal) btnCal.className = 'btn btn-sm btn-light text-secondary rounded-pill px-3 fw-bold border-0';
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
// 📥 6. DROPDOWNS & PERMISSIONS SETUP
// ==========================================
window.loadDropdowns = async function(forceReload) {
  window.isPermissionCalculated = false;
  var oldDocVal = window.tomSelectDocInstance ? window.tomSelectDocInstance.getValue() : '';
  var oldPurpVal = window.tomSelectPurposeInstance ? window.tomSelectPurposeInstance.getValue() : ''; 
  var oldStatusVal = window.tomSelectStatusInstance ? window.tomSelectStatusInstance.getValue() : '';

  try {
    var appLang = window.getCurrentAppLang();
    var statusSelect = document.getElementById('filterVisitStatus');
    if (statusSelect) {
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
                        if (!data.value) {
                            return '<div class="py-1 px-2 text-secondary" style="font-size: 0.85rem;">' + escape(data.text) + '</div>';
                        }
                        return '<div class="py-1 px-2"><span class="' + data.badgeClass + '" style="font-size: 0.85rem; padding: 0.4em 0.6em;">' + data.icon + escape(data.text) + '</span></div>';
                    },
                    item: function(data, escape) {
                        if (!data.value) {
                            return '<div class="item text-secondary" style="font-size: 0.85rem; line-height: 1.5;">' + escape(data.text) + '</div>';
                        }
                        return '<div class="item" style="line-height: 1.5;"><span class="' + data.badgeClass + '" style="font-size: 0.85rem; padding: 0.3em 0.6em;">' + data.icon + escape(data.text) + '</span></div>';
                    }
                },
                onChange: function() { 
                    if (typeof window.filterVisits === 'function') window.filterVisits(); 
                }
            });
            
            if (oldStatusVal) window.tomSelectStatusInstance.setValue(oldStatusVal, true);
            else window.tomSelectStatusInstance.setValue('', true);
        }
    }
 
    var crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
    
    var myRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || crmUser.User_ID || '').trim() : '';
    window.globalCurrentUserRole = crmUser ? String(crmUser.Role || crmUser.role || '').trim() : '';
    var uRoleUpper = window.globalCurrentUserRole.toUpperCase();
    var rawScope = crmUser ? String(crmUser.BU_ID || crmUser.Business_Unit_ID || crmUser.Team_ID || crmUser.team_id || crmUser.Team || crmUser.Territory_ID || crmUser.territory_id || crmUser.Territory || '').trim() : '';

    window.myIsGlobalViewer = false; window.myIsBuHead = false; window.myIsManager = false; window.myIsSalesRole = true;

    var adminRoles = ['ADMIN', 'STAFF', 'DIRECTOR', 'EXECUTIVE', 'PRODUCT MANAGER'];
    if (adminRoles.indexOf(uRoleUpper) !== -1 || rawScope.toUpperCase() === 'ALL') {
        window.myIsGlobalViewer = true; window.myIsSalesRole = false;
    } else if (uRoleUpper.indexOf('BU') !== -1 || uRoleUpper.indexOf('HEAD') !== -1) {
        window.myIsBuHead = true; window.myIsSalesRole = false;
    } else if (uRoleUpper.indexOf('MANAGER') !== -1) {
        window.myIsManager = true; window.myIsSalesRole = false;
    }
    
    window.VisitManagerCache = window.VisitManagerCache || {};

    if (window.VisitManagerCache.dropdownOwnerId !== myRepId) {
        window.VisitManagerCache.dropdownsLoaded = false; 
        window.VisitManagerCache.dropdownOwnerId = myRepId; 
        forceReload = true; 
    } 

    if (forceReload || !window.VisitManagerCache.dropdownsLoaded) {
        var fetchFn = typeof window.fetchAllRecords === 'function' 
            ? window.fetchAllRecords 
            : async function(tbl, modifier) { 
                var q = window.supabaseClient.from(tbl).select('*'); 
                if (modifier) q = modifier(q);
                var r = await q; 
                return r.data || []; 
            };

        var promises = [
          fetchFn('Doctors'),
          fetchFn('Products', function(q) { return q.order('Product', { ascending: true }); }), 
          fetchFn('Territory'),
          fetchFn('Hospitals', function(q) { return q.order('Hospital', { ascending: true }); }),
          fetchFn('Team'),            
          fetchFn('BU'),            
          fetchFn('Products_Team'),   
          fetchFn('IndexType'),
          fetchFn('Index', function(q) { return q.order('Value', { ascending: true }); }),
          fetchFn('Rep_Users'),
          fetchFn('Assignment')
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

            window.VisitManagerCache.assignedDoctors = allDoctors.filter(function(d) { 
                return allowedDocIdsMap[String(d.Doc_ID || d.doc_id || d.id)] || allowedTerIdsMap[String(d.Territory_ID || d.territory_id)]; 
            });

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

    var docSelect = document.getElementById('visitDocId');
    if (docSelect) { 
      docSelect.innerHTML = '<option value=""></option>';
      var activeAssignedDocs = window.globalAssignedDoctors.filter(function(d) { return String(d.Status || 'Active').toLowerCase() === 'active'; });
      activeAssignedDocs.forEach(function(d) {
        var nameEN = d.Doc_Name || d.doc_name || ''; var nameTH = (d.Doc_Name_TH && d.Doc_Name_TH.indexOf('???') === -1) ? d.Doc_Name_TH : '';
        var opt = document.createElement('option'); opt.value = d.Doc_ID || d.doc_id || d.id; 
        opt.textContent = nameEN + (nameTH ? ' (' + nameTH + ')' : ''); 
        opt.setAttribute('data-name-en', nameEN); opt.setAttribute('data-name-th', nameTH); docSelect.appendChild(opt);
      });

      if (typeof TomSelect !== 'undefined') {
          window.safeDestroyTs(window.tomSelectDocInstance);
          window.tomSelectDocInstance = new TomSelect('#visitDocId', { 
              create: false, searchField: ["text", "name_en", "name_th"], sortField: { field: "text", direction: "asc" }, 
              placeholder: appLang === 'th' ? '-- ค้นหา/เลือกแพทย์ --' : '-- Search/Select Doctor --', maxOptions: null, dropdownParent: 'body', dataAttr: 'data'
          });
          if (oldDocVal) setTimeout(() => window.tomSelectDocInstance.setValue(oldDocVal, true), 50);
      }
    }

    if (typeof window.setupFiltersDropdowns === 'function') window.setupFiltersDropdowns(crmUser, window.VisitManagerCache.teamProdLinks);

    var purposeSelect = document.getElementById('visitPurpose');
    if (purposeSelect) { 
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
          
          purposeData.push({ value: i.Index_ID, text: dispText, searchEn: valEN, searchTh: valTH });
          if (valTH && valTH !== i.Index_ID) purposeData.push({ value: valTH, text: dispText, searchEn: valEN, searchTh: valTH });
          if (valEN && valEN !== i.Index_ID && valEN !== valTH) purposeData.push({ value: valEN, text: dispText, searchEn: valEN, searchTh: valTH });
      });

      if (typeof TomSelect !== 'undefined') {
          window.safeDestroyTs(window.tomSelectPurposeInstance);
          purposeSelect.innerHTML = '<option value=""></option>'; 
          window.tomSelectPurposeInstance = new TomSelect('#visitPurpose', { 
              options: purposeData, valueField: 'value', labelField: 'text', searchField: ["searchTh", "searchEn", "text"], sortField: { field: "searchTh", direction: "asc" }, 
              placeholder: appLang === 'th' ? '-- เลือกวัตถุประสงค์ --' : '-- Select Purpose --', create: false, dropdownParent: 'body'
          });
          if (oldPurpVal) setTimeout(() => window.tomSelectPurposeInstance.setValue(oldPurpVal, true), 50);
      }
    }

    var returnToDocId = sessionStorage.getItem('returnToDocId');
    if (returnToDocId && window.tomSelectDocInstance) {
        window.tomSelectDocInstance.setValue(returnToDocId, true);
    }

    var formView = document.getElementById('visitFormView');
    if (formView && !formView.classList.contains('d-none')) {
        var visitId = document.getElementById('visitId').value;
        if (visitId) {
            var v = window.globalVisits.find(function(x) { return String(x.Visit_ID) === String(visitId); });
            if (v) {
                var targetRepObj = window.globalUsersList.find(function(u) { return String(u.Rep_ID || u.User_ID || u.id) === String(v.Rep_ID); });
                if (typeof window.updateFormUserInfo === 'function') window.updateFormUserInfo(targetRepObj, v.Territory_ID);
            }
        } else {
            if (typeof window.initUserInfo === 'function') window.initUserInfo();
        }
    }

    var filterGroup = document.getElementById('visitFilterZoneGroup');
    if (filterGroup) filterGroup.classList.add('ready');

  } catch (err) { console.error("Error loading dropdowns:", err.message); }
};

window.setupFiltersDropdowns = function(crmUser, productsTeamList) {
    var repSelect = document.getElementById('filterVisitRep'); 
    var terSelect = document.getElementById('filterVisitTerritory');

    var oldRepVal = window.tomSelectRepInstance ? window.tomSelectRepInstance.getValue() : []; if (!Array.isArray(oldRepVal)) oldRepVal = oldRepVal ? [oldRepVal] : [];
    var oldTerVal = window.tomSelectTerInstance ? window.tomSelectTerInstance.getValue() : []; if (!Array.isArray(oldTerVal)) oldTerVal = oldTerVal ? [oldTerVal] : [];

    var uRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || crmUser.User_ID || '').trim() : '';
    var uEmail = crmUser ? String(crmUser.Email || crmUser.email || '').trim().toLowerCase() : '';
    var rawScope = crmUser ? String(crmUser.BU_ID || crmUser.Team_ID || crmUser.team_id || crmUser.teamId || crmUser.Team || crmUser.Territory_ID || crmUser.territory_id || crmUser.Territory || '').trim() : '';

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
            } else if (rawScope) {
                myAllowedTeamIds.push(rawScope);
            }
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

    window.myAllowedTeamIds = myAllowedTeamIds; window.myAllowedTerIds = myAllowedTerIds;
    window.myAllowedRepIds = myAllowedRepIds; window.myAllowedEmails = myAllowedEmails;

    var uniqueUsersMap = new Map();
    var fullAllowedUsers = isGlobalViewer ? window.globalUsersList : window.globalUsersList.filter(function(u) {
        var uid = String(u.Rep_ID || u.User_ID || u.id); return isSales ? (uid === uRepId) : (myAllowedRepIds.indexOf(uid) !== -1);
    });
    
    if (isSales && fullAllowedUsers.length === 0 && uRepId) {
        var me = window.globalUsersList.find(function(u) { return String(u.Rep_ID || u.User_ID || u.id) === uRepId; });
        if (me) fullAllowedUsers = [me];
    }
    
    fullAllowedUsers.forEach(function(u) {
        var id = String(u.Rep_ID || u.User_ID || u.id); if(id && id !== 'undefined' && id !== 'null') uniqueUsersMap.set(id, u);
    });

    if (repSelect) {
        var repHtml = ''; uniqueUsersMap.forEach(function(u, id) { repHtml += '<option value="' + id + '">' + (u.Rep_Name || u.Name || u.Email) + '</option>'; });
        repSelect.innerHTML = repHtml;
    }

    var terMap = new Map();
    if (isGlobalViewer || isBuHead || isManager) {
        window.globalTeamList.forEach(function(t) {
            var tid = String(t.Team_ID); var tnm = String(t.Team || t.Team_Name || tid);
            if (isGlobalViewer || myAllowedTeamIds.indexOf(tid) !== -1 || myAllowedTeamIds.indexOf(tnm) !== -1) {
                if (tid && !terMap.has(tid)) terMap.set(tid, tnm + ' (Team)');
            }
        });
    }
    window.globalTerritoryList.forEach(function(t) {
        var tid = String(t.Territory_ID); var tnm = String(t.Territory);
        if (isGlobalViewer || myAllowedTerIds.indexOf(tid) !== -1 || myAllowedTerIds.indexOf(tnm) !== -1) {
            if (tid && !terMap.has(tid)) terMap.set(tid, tnm);
        }
    });

    if (isSales && terMap.size === 0 && crmUser && (crmUser.Territory_ID || crmUser.Territory)) {
        terMap.set(String(crmUser.Territory_ID || crmUser.Territory), String(crmUser.Territory || crmUser.Territory_ID));
    }

    if (terSelect) {
        var tHtml = ''; terMap.forEach(function(text, id) { tHtml += '<option value="' + id + '">' + text + '</option>'; }); 
        terSelect.innerHTML = tHtml;
    }

    var appLang = window.getCurrentAppLang();
    if (typeof TomSelect !== 'undefined') {
        if (repSelect) {
            window.safeDestroyTs(window.tomSelectRepInstance);
            window.tomSelectRepInstance = new TomSelect('#filterVisitRep', { maxItems: null, plugins: ['remove_button'], create: false, placeholder: appLang === 'th' ? '- พนักงานทั้งหมด -' : '- All Users -', dropdownParent: 'body', onChange: function() { if (typeof window.handleFilterChange === 'function') window.handleFilterChange('rep'); } });
            if (oldRepVal.length > 0) setTimeout(() => window.tomSelectRepInstance.setValue(oldRepVal, true), 50);
        }

        if (terSelect) {
            window.safeDestroyTs(window.tomSelectTerInstance);
            window.tomSelectTerInstance = new TomSelect('#filterVisitTerritory', { maxItems: null, plugins: ['remove_button'], create: false, placeholder: appLang === 'th' ? '- พื้นที่ทั้งหมด -' : '- All Areas -', dropdownParent: 'body', onChange: function() { if (typeof window.handleFilterChange === 'function') window.handleFilterChange('territory'); } });
            if (oldTerVal.length > 0) setTimeout(() => window.tomSelectTerInstance.setValue(oldTerVal, true), 50);
        }
    }
  window.isPermissionCalculated = true; 
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

window.handleFilterChange = function(source) { if (typeof window.filterVisits === 'function') window.filterVisits(); };

window.clearVisitFilters = function() {
    if (window.tomSelectRepInstance) window.tomSelectRepInstance.clear(true);
    if (window.tomSelectTerInstance) window.tomSelectTerInstance.clear(true);
    if (window.tomSelectStatusInstance) window.tomSelectStatusInstance.setValue('', true);
    
    var clearTs = function(id) { 
        var el = document.getElementById(id); 
        if (el && el.tomselect) el.tomselect.clear(); 
        else if (el) el.value = ''; 
    };
    
    clearTs('filterStartDate'); 
    clearTs('filterEndDate'); 

    var stEl = document.getElementById('filterVisitStatus');
    if (stEl && !window.tomSelectStatusInstance) { 
        stEl.value = ''; 
        stEl.classList.add('filter-placeholder-text'); 
    }
    
    if (document.getElementById('smartSearchInput')) document.getElementById('smartSearchInput').value = '';
    if (typeof window.filterVisits === 'function') window.filterVisits();
};

// ==========================================
// 📥 7. DATA LOADING & SERVER-SIDE PAGINATION
// ==========================================
window.loadVisits = async function(forceReload) {
    var waitLimit = 0;
    while (!window.isPermissionCalculated && waitLimit < 50) {
        await new Promise(r => setTimeout(r, 100));
        waitLimit++;
    }
  
    if (typeof window.loadMasterDataForVisits === 'function') {
        await window.loadMasterDataForVisits();
    }
    var tbody = document.getElementById('visitTableBody');

    var crmUser = null;
    try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}
    var myRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || crmUser.User_ID || '').trim() : '';

    if (!window.VisitManagerCache) window.VisitManagerCache = {};
    if (window.VisitManagerCache.ownerId !== myRepId) {
        window.VisitManagerCache.isLoaded = false; 
        window.VisitManagerCache.ownerId = myRepId; 
        window.globalVisits = []; 
        window.globalTotLogs = [];
        forceReload = true; 
    }

    var hasData = (window.globalVisits && window.globalVisits.length > 0);

    if ((forceReload || !hasData) && tbody) {
        var currentLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th'; 
        var loadingTitle = currentLang === 'en' ? 'Loading Data...' : 'กำลังเตรียมข้อมูล...';
        var loadingDesc = currentLang === 'en' ? 'Processing your access rights and retrieving records.' : 'ระบบกำลังประมวลผลข้อมูลตามสิทธิ์การเข้าถึงของคุณ';

        tbody.innerHTML = 
        '<tr>' +
          '<td colspan="6" class="text-center py-5">' +
            '<div class="d-flex flex-column align-items-center justify-content-center my-4">' +
              '<div class="spinner-border text-primary mb-3" style="width: 2.5rem; height: 2.5rem; border-width: 0.25rem;" role="status"></div>' +
              '<h5 class="text-dark fw-bold mb-1">' + loadingTitle + '</h5>' +
              '<span class="text-muted small">' + loadingDesc + '</span>' +
            '</div>' +
          '</td>' +
        '</tr>';
    }

    try {
      if (!forceReload && window.VisitManagerCache && window.VisitManagerCache.isLoaded && hasData) {
          window.renderVisitTableServerSide();
          if (typeof window.updateStatCards === 'function') window.updateStatCards(window.globalVisits);
          if (window.VisitManagerCache && window.VisitManagerCache.currentMainView === 'calendar') {
              if (typeof window.renderCalendarView === 'function') window.renderCalendarView();
          }
          return; 
      }

      if (forceReload || !window.VisitManagerCache.isLoaded) {
          var promises = [
              window.supabaseClient.from('DCR').select('Ref_ID').eq('Action', 'Unlock Visit').eq('Status', 'Pending'),
              (typeof window.fetchAllRecords === 'function' ? window.fetchAllRecords('TOT_Logs') : []) 
          ];
          var additionalRes = await Promise.all(promises);
          window.VisitManagerCache.pendingUnlocks = (additionalRes[0] && additionalRes[0].data) ? additionalRes[0].data.map(function(d) { return d.Ref_ID; }) : [];
          window.VisitManagerCache.totLogs = additionalRes[1] || [];
          window.VisitManagerCache.isLoaded = true;
      }
      window.globalPendingUnlockVisits = window.VisitManagerCache.pendingUnlocks || [];
      window.globalTotLogs = window.VisitManagerCache.totLogs || [];

      var myRole = crmUser ? String(crmUser.Role || crmUser.role || '').trim().toLowerCase() : '';
      var isGlobalAdmin = window.myIsGlobalViewer; 

      var query = window.supabaseClient.from('Visit_Logs').select('*', { count: 'exact' });
      var sortColMap = { 'date': 'Visit_Date', 'status': 'Status', 'purpose': 'Purpose_ID' };
      var dbSortCol = sortColMap[window.currentSortCol] || 'Visit_Date';
      query = query.order(dbSortCol, { ascending: window.currentSortAsc });
   
      if (!isGlobalAdmin) {
          if (myRole === 'sales' || myRole === 'rep' || myRole === 'sales rep') {
              query = query.eq('Rep_ID', myRepId || '00000000-0000-0000-0000-000000000000');
          } else {
              var allowedIds = [];
              if (window.myAllowedRepIds && window.myAllowedRepIds.length > 0) {
                  allowedIds = [...window.myAllowedRepIds];
              }
              
              if (myRole !== 'admin' && myRole !== 'system admin') {
                  if (window.globalUsersList) {
                      var safeIds = [];
                      for (var i = 0; i < allowedIds.length; i++) {
                          var targetUser = window.globalUsersList.find(u => String(u.Rep_ID || u.id) === String(allowedIds[i]));
                          var targetRole = targetUser ? String(targetUser.Role || '').trim().toLowerCase() : '';
                          if (targetRole !== 'admin' && targetRole !== 'system admin') {
                              safeIds.push(allowedIds[i]);
                          }
                      }
                      allowedIds = safeIds; 
                  }
              }

              if (myRepId && allowedIds.indexOf(myRepId) === -1) allowedIds.push(myRepId);
              
              if (allowedIds.length > 0) {
                  query = query.in('Rep_ID', allowedIds);
              } else {
                  query = query.eq('Rep_ID', myRepId || '00000000-0000-0000-0000-000000000000');
              }
          }
      }

      var statusEl = document.getElementById('filterVisitStatus');
      var statusTerm = window.tomSelectStatusInstance ? window.tomSelectStatusInstance.getValue() : (statusEl ? statusEl.value : '');
      
      var startDateTerm = document.getElementById('filterStartDate') ? document.getElementById('filterStartDate').value : '';
      var endDateTerm = document.getElementById('filterEndDate') ? document.getElementById('filterEndDate').value : '';
      
      var repEl = document.getElementById('filterVisitRep');
      var selectedReps = window.tomSelectRepInstance ? window.tomSelectRepInstance.getValue() : (repEl ? Array.from(repEl.selectedOptions).map(function(o){ return o.value; }) : []);
      if (!Array.isArray(selectedReps)) selectedReps = selectedReps ? [selectedReps] : [];

      var terEl = document.getElementById('filterVisitTerritory');
      var selectedTers = window.tomSelectTerInstance ? window.tomSelectTerInstance.getValue() : (terEl ? Array.from(terEl.selectedOptions).map(function(o){ return o.value; }) : []);
      if (!Array.isArray(selectedTers)) selectedTers = selectedTers ? [selectedTers] : [];

      if (statusTerm) query = query.eq('Status', statusTerm);
      if (startDateTerm) query = query.gte('Visit_Date', startDateTerm);
      if (endDateTerm) query = query.lte('Visit_Date', endDateTerm);
      if (selectedReps.length > 0) query = query.in('Rep_ID', selectedReps);
      if (selectedTers.length > 0) query = query.in('Territory_ID', selectedTers);

      var rawSearchVal = document.getElementById('smartSearchInput') ? document.getElementById('smartSearchInput').value.trim().toLowerCase() : '';
      
      if (rawSearchVal) {
          var searchTerms = rawSearchVal.split(/\s+/); 
          var hasNoMatchOnSomeTerm = false;

          for (var i = 0; i < searchTerms.length; i++) {
              var term = searchTerms[i];
              var matchedDocIds = [];
              var matchedVisitIds = [];

              var matchedHospIds = [];
              (window.globalAllHospitals || []).forEach(function(h) {
                  var hEn = String(h.Hospital || h.Hospital_Name || h.Known_As || '').toLowerCase();
                  var hTh = String(h.Hospital_TH || h.Known_As || '').toLowerCase();
                  if (hEn.indexOf(term) !== -1 || hTh.indexOf(term) !== -1) {
                      matchedHospIds.push(String(h.Hospital_ID || h.id).toLowerCase());
                  }
              });

              for (var key in window._docIndex) {
                  var doc = window._docIndex[key];
                  var isMatch = false;

                  var dNameEn = String(doc.Doc_Name || doc.doc_name || doc.name || '').toLowerCase();
                  var dNameTh = String(doc.Doc_Name_TH || '').toLowerCase();
                  
                  if (dNameEn.indexOf(term) !== -1 || dNameTh.indexOf(term) !== -1) {
                      isMatch = true;
                  }

                  if (!isMatch && matchedHospIds.length > 0) {
                      var docHospId = String(doc.Hospital_ID || doc.hospital_id || '').toLowerCase();
                      if (matchedHospIds.indexOf(docHospId) !== -1) {
                          isMatch = true;
                      } else if (doc.Workplaces_JSON) {
                          try {
                              var wps = typeof doc.Workplaces_JSON === 'string' ? JSON.parse(doc.Workplaces_JSON) : doc.Workplaces_JSON;
                              if (Array.isArray(wps)) {
                                  for(var w=0; w<wps.length; w++) {
                                      var wHid = String(wps[w].hospitalId || wps[w].Hospital_ID).toLowerCase();
                                      if (matchedHospIds.indexOf(wHid) !== -1) { isMatch = true; break; }
                                  }
                              }
                          } catch(e){}
                      }
                  }

                  if (isMatch) matchedDocIds.push(doc.Doc_ID || doc.doc_id || doc.id);
              }

              var matchedProductIds = [];
              var allProds = window.globalProductsList || (window.VisitManagerCache ? window.VisitManagerCache.products : []) || [];
              allProds.forEach(function(p) {
                  var pEn = String(p.Product || '').toLowerCase();
                  var pTh = String(p.Product_TH || p.product_th || '').toLowerCase();
                  if (pEn.indexOf(term) !== -1 || pTh.indexOf(term) !== -1) {
                      matchedProductIds.push(p.Product_ID || p.id);
                  }
              });

              if (matchedProductIds.length > 0) {
                  try {
                      var vpRes = await window.supabaseClient.from('Visit_Products').select('Visit_ID').in('Product_ID', matchedProductIds);
                      if (!vpRes.error && vpRes.data) {
                          matchedVisitIds = vpRes.data.map(function(vp) { return vp.Visit_ID; });
                      }
                  } catch (e) { console.error("Search Product Error:", e); }
              }

              if (matchedDocIds.length > 0 || matchedVisitIds.length > 0) {
                  var safeDocIds = matchedDocIds.slice(0, 60); 
                  var safeVisitIds = matchedVisitIds.slice(0, 60);
                  
                  if (safeDocIds.length > 0 && safeVisitIds.length === 0) {
                      query = query.in('Doc_ID', safeDocIds);
                  } else if (safeDocIds.length === 0 && safeVisitIds.length > 0) {
                      query = query.in('Visit_ID', safeVisitIds);
                  } else {
                      var orCondition = 'Doc_ID.in.(' + safeDocIds.join(',') + '),Visit_ID.in.(' + safeVisitIds.join(',') + ')';
                      query = query.or(orCondition);
                  }
              } else {
                  hasNoMatchOnSomeTerm = true;
                  break; 
              }
          }

          if (hasNoMatchOnSomeTerm) {
              query = query.eq('Doc_ID', '00000000-0000-0000-0000-000000000000');
          }
      }

      var page = window.currentPage || 1;
      var limit = parseInt(window.rowsPerPage) || 20;
      var from = (page - 1) * limit;
      var to = from + limit - 1;
      query = query.range(from, to);

      var res = await query;
      if (res.error) throw res.error;

      window.globalVisits = res.data || [];
      window.totalVisitsCount = res.count || 0;

      window._visitSampleIndex = {};

      if (window.globalVisits.length > 0) {
        var vIds = window.globalVisits.map(function(v) { return v.Visit_ID; });

        try {
          var vpRes = await window.supabaseClient.from('Visit_Products').select('*').in('Visit_ID', vIds);
          window.globalVisitProducts = vpRes.data || [];
        } catch (vpErr) {
          console.warn("Visit_Products fetch error:", vpErr);
          window.globalVisitProducts = [];
        }

        try {
          var vsRes = await window.supabaseClient.from('Visit_Samples').select('Visit_ID, Sample_ID, Quantity').in('Visit_ID', vIds);
          if (vsRes && vsRes.data) {
            vsRes.data.forEach(function(s) {
              if (s.Visit_ID) {
                var vid = String(s.Visit_ID).trim().toLowerCase();
                if (!window._visitSampleIndex[vid]) window._visitSampleIndex[vid] = [];
                window._visitSampleIndex[vid].push(s);
              }
            });
          }
        } catch (vsErr) {
          console.warn("Visit_Samples fetch error:", vsErr);
        }
      } else {
        window.globalVisitProducts = [];
      }

      if (typeof window.buildDataIndexes === 'function') window.buildDataIndexes();

      window.globalFilteredTotLogs = window.globalTotLogs.filter(function(tot) {
          var hasAccess = false;
          if (isGlobalAdmin) hasAccess = true;
          else {
               var rawRepId = String(tot.Rep_ID || '').trim(); 
               var rawWho = String(tot.Whoupdated || '').toLowerCase().trim();
               if (window.myAllowedRepIds.indexOf(rawRepId) !== -1 || (rawWho !== '' && window.myAllowedEmails.indexOf(rawWho) !== -1)) hasAccess = true;
          }
          if(!hasAccess) return false;

          var matchDate = true;
          if (startDateTerm || endDateTerm) {
              var vDate = new Date(tot.Start_Date); vDate.setHours(0, 0, 0, 0); 
              if (startDateTerm) { var sDate = new Date(startDateTerm); sDate.setHours(0, 0, 0, 0); if (vDate < sDate) matchDate = false; }
              if (endDateTerm) { var eDate = new Date(endDateTerm); eDate.setHours(23, 59, 59, 999); if (vDate > eDate) matchDate = false; }
          }
          var matchRep = (selectedReps.length === 0);
          if (selectedReps.length > 0) { var rawRepIdFilt = String(tot.Rep_ID || '').trim(); matchRep = selectedReps.indexOf(rawRepIdFilt) !== -1; }
          return matchDate && matchRep;
      });
        
      window.renderVisitTableServerSide();
      if (typeof window.updateStatCards === 'function') window.updateStatCards(window.globalVisits);
      if (window.VisitManagerCache && window.VisitManagerCache.currentMainView === 'calendar') {
          if (typeof window.renderCalendarView === 'function') window.renderCalendarView();
      }

      var myDraftsCount = (window.globalVisits || []).filter(function(v) { return v.Status === 'Pending' && String(v.Rep_ID) === myRepId; }).length;
      if (typeof window.checkMyDraftsReminder === 'function') window.checkMyDraftsReminder(myDraftsCount);

    } catch (err) {
      console.error("Load Visits Error:", err);
      var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
      var msgErr = appLang === 'en' ? '❌ Failed to load data: ' : '❌ ดึงข้อมูลไม่สำเร็จ: ';
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">' + msgErr + err.message + '</td></tr>';
    }
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

    var dateShow = (typeof window.formatDateToLocal === 'function') ? window.formatDateToLocal(v.Visit_Date) : v.Visit_Date;
    var docObj = window._docIndex[String(v.Doc_ID || v.doc_id || v.id || '').trim().toLowerCase()];
    var docNameShow = window.getDoctorNameByLang(docObj, v.Doc_ID);
    
    var hospNameShow = window.getHospitalNameFromDocOrVisit(docObj, v);
    var hospLat = docObj ? (docObj.Hospital_Lat || docObj.Lat || docObj.latitude) : null;
    var hospLng = docObj ? (docObj.Hospital_Long || docObj.Lng || docObj.longitude) : null;

    var distanceBadge = '';
    if (v.CheckIn_Lat && v.CheckIn_Long) {
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

    var purposeShow = window.getPurposeText(v.Purpose_ID, v.Purpose); 
    var applyHighlight = (typeof window.applySearchHighlight === 'function') ? window.applySearchHighlight : function(t) { return t; };
    var highlightedDoc = applyHighlight(docNameShow, smartSearchVal); 
    var highlightedHosp = applyHighlight(hospNameShow, smartSearchVal);
    var highlightedPurpose = applyHighlight(purposeShow, smartSearchVal);

    var visitProds = window._visitProdIndex[String(v.Visit_ID).trim().toLowerCase()] || [];
    var prodBadges = '';
    if (visitProds.length > 0) {
      visitProds.forEach(function(vp) {
          var pObj = window._prodIndex[String(vp.Product_ID).trim().toLowerCase()];
          var pName = pObj ? pObj.Product : vp.Product_ID;
          prodBadges += '<span class="badge badge-soft-product me-1 mb-1">' + applyHighlight(pName, smartSearchVal) + '</span>';
      });
    } else prodBadges = '<span class="text-muted small">-</span>';
 
    var evidenceBadges = '';
    
    if (v.Is_Coaching) {
      var coachingTooltip = appLang === 'en' ? 'Joint Visit / Coaching' : 'มีผู้จัดการออกเยี่ยมร่วม (Coaching)';
      evidenceBadges += ' <span class="badge badge-soft-info ms-1" title="' + coachingTooltip + '"><i class="fa-solid fa-clipboard-user text-info"></i></span>';
    }

    if (v.Attachments && v.Attachments !== '[]' && v.Attachments !== '') {
      var ttAttach = appLang === 'en' ? 'Has Attachments' : 'มีไฟล์แนบ';
      evidenceBadges += ' <span class="badge badge-soft-secondary ms-1" title="' + ttAttach + '"><i class="fa-solid fa-paperclip text-secondary"></i></span>';
    }

    if (v.Doctor_Signature) {
      var ttSig = appLang === 'en' ? 'Doctor Signed' : 'แพทย์เซ็นชื่อแล้ว';
      evidenceBadges += ' <span class="badge badge-soft-success ms-1" title="' + ttSig + '"><i class="fa-solid fa-signature text-success"></i></span>';
    }

    var vidClean = String(v.Visit_ID || '').trim().toLowerCase();
    var sampleItems = (window._visitSampleIndex && window._visitSampleIndex[vidClean]) 
                      ? window._visitSampleIndex[vidClean] 
                      : (v.Visit_Samples || []);
                      
    if (sampleItems && sampleItems.length > 0) {
      var ttSample = appLang === 'en' ? 'Has Samples / Promo Items' : 'มีการจ่ายสินค้าตัวอย่าง/ของแจก';
      evidenceBadges += ' <span class="badge badge-soft-warning ms-1" title="' + ttSample + '"><i class="fa-solid fa-box-archive text-warning"></i></span>';
    }
        
    htmlBuffer += '<tr>' +
      '<td class="text-center fw-bold"><a href="#" class="table-visit-link" onclick="window.openEditVisitView(\'' + v.Visit_ID + '\'); return false;">' + dateShow + '</a></td>' +
      '<td class="fw-bold text-dark text-start ps-3">' + highlightedDoc + evidenceBadges + '</td>' +
      '<td class="text-secondary"><small><i class="fa-regular fa-hospital me-1 text-primary"></i>' + highlightedHosp + distanceBadge + '</small></td>' +
      '<td>' + prodBadges + '</td>' +
      '<td><small class="text-secondary">' + highlightedPurpose + '</small></td>' +
      '<td class="text-center"><span class="badge ' + badgeClass + '">' + statusShow + '</span></td>' +
    '</tr>';
  });

  tbody.innerHTML = htmlBuffer;
  window.renderPaginationControls(totalPages);
};

window.renderGlobalPagination = function(containerId, currentPage, totalPages, callbackFnName) {
    var ul = document.getElementById(containerId);
    if (!ul) return;
    if (totalPages <= 1) { ul.innerHTML = ''; return; }

    var html = '';
    html += '<li class="page-item ' + (currentPage === 1 ? 'disabled' : '') + '">' +
              '<a class="page-link shadow-sm" href="#" onclick="window.' + callbackFnName + '(' + (currentPage - 1) + '); return false;">&laquo; Prev</a>' +
            '</li>';

    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        html += '<li class="page-item"><a class="page-link shadow-sm" href="#" onclick="window.' + callbackFnName + '(1); return false;">1</a></li>';
        if (startPage > 2) html += '<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>';
    }

    for (var i = startPage; i <= endPage; i++) {
        html += '<li class="page-item ' + (currentPage === i ? 'active' : '') + '">' +
                  '<a class="page-link shadow-sm" href="#" onclick="window.' + callbackFnName + '(' + i + '); return false;">' + i + '</a>' +
                '</li>';
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>';
        html += '<li class="page-item"><a class="page-link shadow-sm" href="#" onclick="window.' + callbackFnName + '(' + totalPages + '); return false;">' + totalPages + '</a></li>';
    }

    html += '<li class="page-item ' + (currentPage === totalPages ? 'disabled' : '') + '">' +
              '<a class="page-link shadow-sm" href="#" onclick="window.' + callbackFnName + '(' + (currentPage + 1) + '); return false;">Next &raquo;</a>' +
            '</li>';

    ul.innerHTML = html;
};

window.renderPaginationControls = function(totalPages) {
  window.renderGlobalPagination('visitPagination', window.currentPage, totalPages, 'goToPage');
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
    if (window.isInitialLoading) return; 
    if (window.filterDebounceTimer) clearTimeout(window.filterDebounceTimer);
    window.filterDebounceTimer = setTimeout(function() { window.filterVisits(); }, 300);
};

window.sortVisits = function(col) {
  if (window.currentSortCol === col) window.currentSortAsc = !window.currentSortAsc; 
  else { window.currentSortCol = col; window.currentSortAsc = true; }
  window.loadVisits(true);
};

// ==========================================
// 📝 8. FORM ACTIONS & EDIT VISIT VIEW
// ==========================================
window.openAddVisitView = async function(presetDate) {
  window.applyVisitFeaturesUI();
  var fields = ['visitDocId', 'visitProductId', 'visitDate', 'visitPurpose'];
  fields.forEach(function(id) { var el = document.getElementById(id); if (el) el.classList.remove('is-invalid'); });

  var formEl = document.getElementById('visitForm');
  if (formEl) formEl.reset();
  
  document.getElementById('visitId').value = '';
  document.getElementById('formVisitTitle').innerHTML = '📝 <span data-i18n="title_add_visit">Add New Visit</span>';
  document.getElementById('visitDate').value = presetDate || new Date().toISOString().split('T')[0];
  document.getElementById('visitStatus').value = 'Pending';
  document.getElementById('visitInsight').value = ''; 
  
  var chkCoach = document.getElementById('visitIsCoaching');
  if (chkCoach) chkCoach.checked = false; 

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
    btnGps.className = 'btn btn-sm btn-premium-secondary px-3';
    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
    btnGps.innerHTML = '<i class="fa-solid fa-map-pin me-1"></i> ' + (appLang === 'en' ? 'Get Location' : 'ดึงพิกัด');
  }

  if (typeof window.initUserInfo === 'function') window.initUserInfo(); 

  if (window.tomSelectDocInstance) { window.tomSelectDocInstance.clear(); window.tomSelectDocInstance.enable(); }
  if (window.tomSelectPurposeInstance) { window.tomSelectPurposeInstance.clear(); window.tomSelectPurposeInstance.enable(); }
  if (window.tomSelectProdInstance) { window.tomSelectProdInstance.clear(); window.tomSelectProdInstance.enable(); }

  if (typeof window.renderFormProductDropdown === 'function') await window.renderFormProductDropdown();
  if (typeof window.toggleVisitFormEditable === 'function') window.toggleVisitFormEditable(true);

  var returnToDocId = sessionStorage.getItem('returnToDocId');
  if (returnToDocId) {
    if (window.tomSelectDocInstance) {
      if (typeof window.setTomSelectValue === 'function') window.setTomSelectValue(window.tomSelectDocInstance, returnToDocId);
      window.tomSelectDocInstance.disable(); 
    }
  }

  if (typeof window.restoreFormDraft === 'function') window.restoreFormDraft('NEW');

  var btn = document.getElementById('saveVisitBtn');
  if (btn) {
      btn.dataset.mode = 'save'; btn.className = 'btn btn-premium-primary';
      btn.innerHTML = '💾 <span data-i18n="btn_save">Save</span>'; btn.disabled = false;
  }

  if (typeof window.switchVisitView === 'function') window.switchVisitView('visitFormView');
};

window.openEditVisitView = function(visitId) {
  window.applyVisitFeaturesUI();
  var fields = ['visitDocId', 'visitProductId', 'visitDate', 'visitPurpose'];
  fields.forEach(function(id) { var el = document.getElementById(id); if (el) el.classList.remove('is-invalid'); });

  var v = window.globalVisits.find(function(x) { return String(x.Visit_ID) === String(visitId); });
  if (!v) return;

  // 🚀 1. สลับหน้ามาเปิดฟอร์มทันที 0 วินาที (Non-blocking UI)
  if (typeof window.switchVisitView === 'function') window.switchVisitView('visitFormView');

  var crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(e){}
  var myRole = crmUser ? String(crmUser.Role || crmUser.role || '').toLowerCase().trim() : '';
  var myRepId = crmUser ? String(crmUser.Rep_ID || crmUser.id || crmUser.User_ID || '').trim() : '';
  var myEmail = crmUser ? String(crmUser.Email || crmUser.email || '').toLowerCase().trim() : '';

  var isAdmin = (myRole === 'admin');
  var creatorRepId = String(v.Rep_ID || v.rep_id || '').trim();
  var creatorWho = String(v.Whoupdated || v.whoupdated || '').toLowerCase().trim();
  var isCreator = (myRepId && creatorRepId && myRepId === creatorRepId) || (myEmail && creatorWho && myEmail === creatorWho);
  var canEdit = (isAdmin || isCreator);

  document.getElementById('visitId').value = v.Visit_ID;
  document.getElementById('formVisitTitle').innerHTML = '✏️ <span data-i18n="title_edit_visit">Edit Visit</span>';
  
  var targetRepObj = window.globalUsersList.find(function(u) { return String(u.Rep_ID || u.User_ID || u.id) === String(v.Rep_ID); });
  if (typeof window.updateFormUserInfo === 'function') {
      window.updateFormUserInfo(targetRepObj, v.Territory_ID);
  }

  // ⚡ 2. ตั้งค่า Doctor Name ทันที
  if (v.Doc_ID && window.tomSelectDocInstance) {
      window.tomSelectDocInstance.setValue(v.Doc_ID, true);
  }

  // ⚡ 3. ตั้งค่า วันที่ / เวลา / รายละเอียดกิจกรรม
  document.getElementById('visitDate').value = v.Visit_Date || '';
  if (typeof window.formatTimeString === 'function') {
      document.getElementById('visitStartTime').value = window.formatTimeString(v.Start_Time);
      document.getElementById('visitEndTime').value = window.formatTimeString(v.End_Time);
  }

  document.getElementById('visitDetails').value = v.Details || '';
  document.getElementById('visitInsight').value = v.Insight || ''; 
  document.getElementById('visitNextAction').value = v.Next_Action || '';
  document.getElementById('visitStatus').value = v.Status || 'Pending';
  document.getElementById('visitIsCoaching').checked = (v.Is_Coaching === true);

  // 🎯 4. สแกนแมป PURPOSE รองรับทั้ง Index_ID (UUID) และ Text ตรงๆ
  var dbPurposeVal = String(v.Purpose_ID || v.Purpose || v.Objective || '').trim();
  if (window.tomSelectPurposeInstance) {
      var tsPurp = window.tomSelectPurposeInstance;
      tsPurp.clear(true);

      if (dbPurposeVal && dbPurposeVal !== '-') {
          var targetIndexId = null;

          if (window.VisitManagerCache && window.VisitManagerCache.indexes) {
              var foundIndex = window.VisitManagerCache.indexes.find(function(i) {
                  return String(i.Index_ID).toLowerCase() === dbPurposeVal.toLowerCase() ||
                         String(i.Value || '').toLowerCase() === dbPurposeVal.toLowerCase() ||
                         String(i.Value1 || '').toLowerCase() === dbPurposeVal.toLowerCase();
              });
              if (foundIndex) {
                  targetIndexId = foundIndex.Index_ID;
              }
          }

          if (!targetIndexId) targetIndexId = dbPurposeVal;

          tsPurp.setValue(targetIndexId, true);

          if (!tsPurp.getValue()) {
              tsPurp.addOption({ value: dbPurposeVal, text: dbPurposeVal, searchTh: dbPurposeVal, searchEn: dbPurposeVal });
              tsPurp.setValue(dbPurposeVal, true);
          }

          if (typeof window.updatePurposeDisplayLang === 'function') {
              window.updatePurposeDisplayLang();
          }
      }
  }

  // 🌟 5. ดึงประวัติการเยี่ยมย้อนหลังของหมอขึ้นแสดงผล
  if (v.Doc_ID && typeof window.fetchLastVisitHistory === 'function') {
      window.fetchLastVisitHistory(v.Doc_ID);
  }

  // -------------------------------------------------------------
  // 🚀 6. โหลดข้อมูลหนักเบื้องหลังแบบ Async Non-Blocking (ไม่ใช้ await)
  // -------------------------------------------------------------
  if (typeof window.renderFormProductDropdown === 'function') {
      window.renderFormProductDropdown().then(function() {
          var visitProds = window.globalVisitProducts.filter(function(vp) { 
              return String(vp.Visit_ID) === String(visitId); 
          }).map(function(vp) { return String(vp.Product_ID); });
          
          if (window.tomSelectProdInstance && visitProds.length > 0) {
              window.tomSelectProdInstance.setValue(visitProds, true);
          }
          if (typeof window.loadProductMedia === 'function') window.loadProductMedia();
      });
  }

  if (typeof window.loadVisitSamplesForEdit === 'function') {
      window.loadVisitSamplesForEdit(v.Visit_ID);
  }

  // GPS Location
  var latInput = document.getElementById('visitLat');
  var lngInput = document.getElementById('visitLng');
  var btnGps = document.getElementById('btnGpsCheckin');
  var timeWrapper = document.getElementById('locationTimeWrapper');
  var timeText = document.getElementById('visitCheckinTimeText');

  if (v.CheckIn_Lat && v.CheckIn_Long) {
    if (latInput) latInput.value = v.CheckIn_Lat;
    if (lngInput) lngInput.value = v.CheckIn_Long;
    if (timeWrapper) timeWrapper.classList.remove('d-none');
    if (timeText && v.CheckIn_Time) {
      var cTime = new Date(v.CheckIn_Time);
      timeText.innerText = cTime.getHours().toString().padStart(2, '0') + ':' + cTime.getMinutes().toString().padStart(2, '0');
    }
    if (btnGps) {
      btnGps.className = 'btn btn-sm btn-success px-3 premium-radius text-white fw-bold';
      var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
      btnGps.innerHTML = '<i class="fa-solid fa-check me-1"></i> ' + (appLang === 'en' ? 'Checked-in' : 'เช็คอินแล้ว');
    }
  } else {
    if (latInput) latInput.value = '';
    if (lngInput) lngInput.value = '';
    if (timeWrapper) timeWrapper.classList.add('d-none');
    if (btnGps) {
      btnGps.className = 'btn btn-sm btn-premium-secondary px-3';
      var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
      btnGps.innerHTML = '<i class="fa-solid fa-map-pin me-1"></i> ' + (appLang === 'en' ? 'Get Location' : 'ดึงพิกัด');
    }
  }

  // Attachments & Signatures
  window.currentAttachments = [];
  window.newlyUploadedFiles = [];
  window.pendingDeleteFiles = [];
  window.pendingDetailingLogs = []; 

  if (v.Attachments) {
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

  if (v.Doctor_Signature) {
    window.savedSignatureData = v.Doctor_Signature;
  } else {
    window.savedSignatureData = null;
  }
  if (typeof window.updateSignaturePreviewUI === 'function') window.updateSignaturePreviewUI();

  // สถานะปุ่ม Save / Lock
  var isPendingUnlock = window.globalPendingUnlockVisits.indexOf(v.Visit_ID) !== -1;
  var btn = document.getElementById('saveVisitBtn');
  var currentAppLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';

  if (isPendingUnlock) {
    if (typeof window.toggleVisitFormEditable === 'function') window.toggleVisitFormEditable(false);
    btn.disabled = true; 
    btn.className = 'btn btn-premium-locked px-5';
    btn.innerHTML = '<i class="fa-solid fa-clock me-2"></i>' + (currentAppLang === 'en' ? 'Waiting for Admin unlock' : 'รอแอดมินอนุมัติปลดล็อก'); 
    btn.dataset.mode = 'disabled';
  } else if (v.Status === 'Submitted') {
    if (typeof window.toggleVisitFormEditable === 'function') window.toggleVisitFormEditable(false);
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
  } else {
    if (canEdit) {
      if (typeof window.toggleVisitFormEditable === 'function') window.toggleVisitFormEditable(true);
      btn.disabled = false; 
      btn.className = 'btn btn-premium-primary px-5';
      btn.innerHTML = '💾 <span data-i18n="btn_save">' + (currentAppLang === 'en' ? 'Save' : 'บันทึก') + '</span>'; 
      btn.dataset.mode = 'save';
    } else {
      if (typeof window.toggleVisitFormEditable === 'function') window.toggleVisitFormEditable(false);
      btn.disabled = true; 
      btn.className = 'btn btn-premium-locked px-5';
      btn.innerHTML = '<i class="fa-solid fa-lock me-2"></i>' + (currentAppLang === 'en' ? 'Read-Only (Creator Only)' : 'ดูได้อย่างเดียว (เฉพาะผู้สร้าง)'); 
      btn.dataset.mode = 'disabled';
    }
  }

  var isReadOnly = true;
  if (!isPendingUnlock && v.Status !== 'Submitted' && canEdit) {
    isReadOnly = false;
  }
  if (typeof window.setFormComponentsReadOnly === 'function') {
    window.setFormComponentsReadOnly(isReadOnly);
  }
};

// ==========================================
// ⛱️ 9. TOT MODAL (TIME OFF TERRITORY)
// ==========================================
window.initTotModal = function() {
  if (!window.totModalInstance) {
      var el = document.getElementById('totModal');
      if (el && typeof bootstrap !== 'undefined') window.totModalInstance = new bootstrap.Modal(el, { backdrop: 'static' });
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
  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  if(titleEl) titleEl.innerHTML = '<i class="fa-solid fa-umbrella-beach me-2"></i>' + (appLang === 'en' ? 'Add TOT' : 'เพิ่ม TOT');

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
  var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
  if(titleEl) titleEl.innerHTML = '<i class="fa-solid fa-pen me-2"></i>' + (appLang === 'en' ? 'Edit TOT' : 'แก้ไข TOT');
  
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

// ==========================================
// 🔍 10. LAST VISIT HISTORY ENGINE
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

// ==========================================
// 🔗 11. INITIALIZE & EVENT LISTENERS
// ==========================================
window.isInitialLoading = true;
window._isInitRunning = false; 

window.updateLangUI = function() {
    if (window.isInitialLoading) return; 

    var formView = document.getElementById('visitFormView');
    if (formView && !formView.classList.contains('d-none')) {
        var visitIdEl = document.getElementById('visitId');
        var currentVisitId = visitIdEl ? visitIdEl.value : '';
        if (!currentVisitId || currentVisitId === 'NEW') {
            if (typeof window.saveFormDraft === 'function') window.saveFormDraft();
        }
    }
    if (typeof window.loadDropdowns === 'function') {
        window.loadDropdowns(false).then(() => {
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
    
    if (typeof window.renderVisitTableServerSide === 'function') {
        window.renderVisitTableServerSide();
    } else if (typeof window.renderVisitTable === 'function') {
        window.renderVisitTable();
    }
    
    if (window.VisitManagerCache && window.VisitManagerCache.currentMainView === 'calendar') {
        if (typeof window.renderCalendarView === 'function') window.renderCalendarView(); 
    }   
    if (typeof window.refreshSampleDropdownLang === 'function') {
        window.refreshSampleDropdownLang();
    }
};

if (!window._isAppLangListenerAttached) {
    window.addEventListener('appLanguageChanged', function() {
        if (typeof window.updateLangUI === 'function') window.updateLangUI();
    });
    window._isAppLangListenerAttached = true;
}

window.initVisitPage = async function(forceReload) {
    if (window._isInitRunning) return;

    window._isInitRunning = true; 
    window.isInitialLoading = true; 

    var domWaitCount = 0;
    while (!document.getElementById('filterVisitStatus') && domWaitCount < 40) {
        await new Promise(r => setTimeout(r, 50));
        domWaitCount++;
    }

    var hasCache = (window.VisitManagerCache && window.VisitManagerCache.isLoaded);
    var shouldFetchDB = (forceReload === true || !hasCache);

    var tbody = document.getElementById('visitTableBody');

    if (shouldFetchDB && tbody) {
        var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
        var loadingTitle = appLang === 'en' ? 'Loading Data...' : 'กำลังเตรียมข้อมูล...';
        var loadingDesc = appLang === 'en' ? 'Processing your access rights and retrieving records.' : 'ระบบกำลังประมวลผลข้อมูลตามสิทธิ์การเข้าถึงของคุณ';
        
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5"><div class="d-flex flex-column align-items-center justify-content-center my-4"><div class="spinner-border text-primary mb-3" style="width: 2.5rem; height: 2.5rem; border-width: 0.25rem;" role="status"></div><h5 class="text-dark fw-bold mb-1">' + loadingTitle + '</h5><span class="text-muted small">' + loadingDesc + '</span></div></td></tr>';
    }

    try {
        if (typeof window.initUserInfo === 'function') window.initUserInfo(); 
        if (typeof window.loadDropdowns === 'function') await window.loadDropdowns(shouldFetchDB); 
        if (typeof window.loadVisits === 'function') await window.loadVisits(shouldFetchDB); 
        if (typeof window.loadMasterSamplesList === 'function') await window.loadMasterSamplesList();
        
        if (typeof window.fetchVisitFeaturesConfig === 'function') await window.fetchVisitFeaturesConfig();
        
        if (typeof window.fetchDetailingMedia === 'function') await window.fetchDetailingMedia();

        if (typeof window.bindDoctorChangeForHistory === 'function') window.bindDoctorChangeForHistory();

        if (typeof setLanguage === 'function' && typeof currentLang !== 'undefined') {
            setLanguage(currentLang);
        }

    } catch(err) {
        console.error("Init Visits Failed:", err);
        var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
        var msgErr = appLang === 'en' ? '❌ Failed to load data' : '❌ ดึงข้อมูลไม่สำเร็จ';
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">' + msgErr + '</td></tr>';
    } finally {
        window.isInitialLoading = false; 
        window._isInitRunning = false;  
    }
}; 

if (!window._visitObserverAttached) {
    var visitObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        if (node.id === 'visitTableBody' || (node.querySelector && node.querySelector('#visitTableBody'))) {
                            if (typeof window.initVisitPage === 'function') window.initVisitPage(false);
                        }
                    }
                });
            }
        });
    });
    visitObserver.observe(document.body, { childList: true, subtree: true });
    window._visitObserverAttached = true;
}

setTimeout(function() {
    var crmUser = sessionStorage.getItem('crmUser');
    if (crmUser) {
        window.initVisitPage(true); 
    }
}, 50);

var btnRef = document.getElementById('btnRefreshVisits');
if (btnRef) {
    btnRef.onclick = function() { window.initVisitPage(true); };
}
