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
    var visitId = document.getElementById('visitId') ? document.getElementById('visitId').value : 'NEW';
    var draftData = {
        docId: window.tomSelectDocInstance ? window.tomSelectDocInstance.getValue() : '',
        productId: window.tomSelectProdInstance ? window.tomSelectProdInstance.getValue() : [],
        purpose: window.tomSelectPurposeInstance ? window.tomSelectPurposeInstance.getValue() : '',
        date: document.getElementById('visitDate') ? document.getElementById('visitDate').value : '',
        startTime: document.getElementById('visitStartTime') ? document.getElementById('visitStartTime').value : '',
        endTime: document.getElementById('visitEndTime') ? document.getElementById('visitEndTime').value : '',
        details: document.getElementById('visitDetails') ? document.getElementById('visitDetails').value : '',
        insight: document.getElementById('visitInsight') ? document.getElementById('visitInsight').value : '',
        nextAction: document.getElementById('visitNextAction') ? document.getElementById('visitNextAction').value : '',
        isCoaching: document.getElementById('visitIsCoaching') ? document.getElementById('visitIsCoaching').checked : false,
        status: document.getElementById('visitStatus') ? document.getElementById('visitStatus').value : 'Pending',
        timestamp: Date.now()
    };
    localStorage.setItem('visitDraft_' + (visitId || 'NEW'), JSON.stringify(draftData));
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
// 📊 5. VIEW TOGGLE & NAVIGATION FUNCTIONS
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

window.updateStatCards = function(filteredVisits) {
  var total = window.totalVisitsCount || filteredVisits.length;
  var pending = filteredVisits.filter(function(v) { return v.Status === 'Pending'; }).length;
  var submitted = filteredVisits.filter(function(v) { return v.Status === 'Submitted'; }).length;

  if (document.getElementById('statTotalVisits')) document.getElementById('statTotalVisits').innerText = total;
  if (document.getElementById('statPendingVisits')) document.getElementById('statPendingVisits').innerText = pending;
  if (document.getElementById('statSubmittedVisits')) document.getElementById('statSubmittedVisits').innerText = submitted;
};

// ==========================================
// 🎬 6. MEDIA & PRESENTATION FUNCTIONS
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
      '<span><i class="fa-solid fa-file-powerpoint me-1"></i> <span>' + titleText + '</span></span>' +
      '<span class="badge bg-primary rounded-pill fw-bold" style="font-size:0.75rem;">' + matchedMedia.length + ' ' + unitText + '</span>';
  }

  var html = '';
  var btnClass = isPreviewMode ? 'btn-premium-secondary' : 'btn-premium-primary';
  var btnIcon = isPreviewMode ? 'fa-eye' : 'fa-display';
  
  var btnText = isPreviewMode ? (appLang === 'en' ? 'Preview' : 'เปิดดู') : (appLang === 'en' ? 'Present' : 'นำเสนอ');

  matchedMedia.forEach(function(m) {
    var icon = m.Type === 'Video' ? 'fa-circle-play text-danger' : 'fa-file-pdf text-danger';
    var typeText = m.Type || 'PDF';
    html += 
      '<div class="media-card d-flex justify-content-between align-items-center shadow-xs mt-2">' +
        '<div class="d-flex align-items-center me-2 overflow-hidden">' +
          '<i class="fa-solid ' + icon + ' fs-5 me-2.5"></i>' +
          '<div class="text-truncate">' +
            '<div class="fw-bold text-dark small text-truncate" style="max-width: 175px;" title="' + m.Title + '">' + m.Title + '</div>' +
            '<span class="badge bg-secondary-subtle text-secondary" style="font-size:0.62rem; padding: 2px 6px;">' + typeText + '</span>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="btn ' + btnClass + ' btn-sm" onclick="window.openMediaPresentation(\'' + m.Media_ID + '\', ' + isPreviewMode + ')">' +
          '<i class="fa-solid ' + btnIcon + ' me-1"></i> ' + btnText +
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
// 📥 7. DATA LOADING & PAGINATION
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
  if (typeof window.attachAutosaveListeners === 'function') window.attachAutosaveListeners();
  setTimeout(() => { if (typeof window.checkAndRestoreAutosave === 'function') window.checkAndRestoreAutosave(); }, 500);
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

window.handleSaveVisit = async function(e) {
  e.preventDefault();
  var btn = document.getElementById('saveVisitBtn');
  var mode = btn ? btn.dataset.mode : 'save';

  if (mode === 'disabled') return;
  if (mode === 'request_unlock') { if (typeof window.requestUnlockVisit === 'function') window.requestUnlockVisit(document.getElementById('visitId').value); return; }

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

  if (missingFields.length > 0) {
    var warnMsg = appLang === 'en' 
        ? "⚠️ Cannot save! Please fill in the following required fields:<br>" 
        : "⚠️ ไม่สามารถบันทึกได้! กรุณากรอกข้อมูลที่จำเป็นต่อไปนี้:<br>";
        
    if (window.showToast) window.showToast(warnMsg + missingFields.join("<br>"), "warning");
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Saving...'; }

  var crmUser = null; try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}
  var whoUpdated = crmUser ? (crmUser.Email || crmUser.Rep_Name || "User") : "Unknown";
  var repId = crmUser ? (crmUser.Rep_ID || crmUser.id || null) : null;
  var territoryId = crmUser ? (crmUser.Territory_ID || crmUser.territoryId || null) : null;

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
    Visit_ID: targetVisitId, Rep_ID: repId, Territory_ID: territoryId, Doc_ID: docVal,
    Visit_Date: dateInput.value, Start_Time: document.getElementById('visitStartTime').value || null, End_Time: document.getElementById('visitEndTime').value || null,
    Purpose_ID: purposeVal, Details: document.getElementById('visitDetails').value.trim(), Insight: document.getElementById('visitInsight').value.trim(), 
    Next_Action: document.getElementById('visitNextAction').value.trim(), Is_Coaching: document.getElementById('visitIsCoaching').checked, 
    Status: document.getElementById('visitStatus').value, Whoupdated: whoUpdated, Whenupdated: new Date().toISOString(),
    CheckIn_Lat: latVal ? parseFloat(latVal) : null, CheckIn_Long: lngVal ? parseFloat(lngVal) : null,
    CheckIn_Time: latVal ? new Date().toISOString() : null, Attachments: attachmentsData, Doctor_Signature: sigData
  };

  var samplePayloads = [];
  if (window.globalVisitConfigs && window.globalVisitConfigs.samples && typeof window.collectVisitSamplesPayload === 'function') {
      samplePayloads = window.collectVisitSamplesPayload(targetVisitId, whoUpdated);
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

    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';
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
    var appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'th';

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
    var saveText = (typeof window.getCurrentAppLang === 'function' && window.getCurrentAppLang() === 'th') ? 'บันทึก' : 'Save';
    if (btn) { btn.disabled = false; btn.innerHTML = "💾 " + saveText; }
  }
};

window.requestUnlockVisit = async function(visitId) {
  var btn = document.getElementById('saveVisitBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Submitting request...'; }

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
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-unlock-keyhole me-2"></i>Request Unlock'; }
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
