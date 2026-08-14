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
    container.insertAdjacentHTML('beforeend', rowHTML);
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
// 📥 8. DROPDOWNS & PERMISSIONS SETUP
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

// ==========================================
// 📝 10. FORM ACTIONS & EDIT VISIT VIEW
// ==========================================
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

  // 🌟 5. [เพิ่มฟังก์ชันดึงประวัติการเยี่ยมย้อนหลังของหมอขึ้นแสดงผล]
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
// 🔍 11. LAST VISIT HISTORY ENGINE (ส่วนที่คุณแนบรูปมา)
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
