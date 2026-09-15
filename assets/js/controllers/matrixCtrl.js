/* ==========================================================================
   CRM System - Manage Matrix Controller (matrixCtrl.js)
   Clean Implementation - Fixed Dropdown & Supabase Fetching
   ========================================================================== */

// 🌟 Global State
window.matrixState = {
  selectedProduct: '',
  targetFrequency: 'Per Cycle',
  matrixRules: [],
  targetCalls: {},
  categories: {
    adoption: [],
    potential: []
  }
};

// 🌟 Global View Handlers
window.openAddMatrixModal = function() {
  const selectedProd = window.matrixState ? window.matrixState.selectedProduct : '';
  
  if (!selectedProd) {
    if (window.showToast) window.showToast('Please select a product first', 'warning');
    else alert('Please select a product first / กรุณาเลือกสินค้าก่อน');
    return;
  }

  window.populateMatrixFormDropdowns();
  
  const pSel = document.getElementById('matrixProduct');
  if (pSel) pSel.value = selectedProd;

  window.switchMatrixView('matrixFormView');
};

window.switchMatrixView = function(viewName) {
  const listView = document.getElementById('matrixListView');
  const formView = document.getElementById('matrixFormView');

  if (viewName === 'matrixListView') {
    if (formView) formView.classList.add('d-none');
    if (listView) listView.classList.remove('d-none');
  } else if (viewName === 'matrixFormView') {
    if (listView) listView.classList.add('d-none');
    if (formView) formView.classList.remove('d-none');
  }
};

window.editMatrixCell = function(adoption, potential, currentClass) {
  window.openAddMatrixModal();
  
  setTimeout(() => {
    const adoptEl = document.getElementById('matrixAdopt');
    const potEl = document.getElementById('matrixPot');
    const classEl = document.getElementById('matrixClass');

    if (adoptEl) adoptEl.value = adoption;
    if (potEl) potEl.value = potential;
    if (classEl) classEl.value = currentClass !== '-' ? currentClass : 'A';
  }, 100);
};

// 🚀 Core Engine
(function() {
  'use strict';

  // 1. Initialize Page
  window.initManageMatrixPage = async function() {
    console.log("🚀 Initializing Manage Matrix Module...");
    window.showMatrixLoading(true);

    try {
      await window.fetchMatrixTargetFrequency();
      await window.fetchMatrixCategories();
      await window.fetchMatrixProductList();
    } catch (err) {
      console.error("❌ Error initializing Manage Matrix:", err);
    } finally {
      window.showMatrixLoading(false);
    }
  };

  // 2. Fetch Target Frequency from system_settings
  window.fetchMatrixTargetFrequency = async function() {
    try {
      if (typeof supabase === 'undefined') return;
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'rating_frequency')
        .maybeSingle();

      if (data && data.value) {
        window.matrixState.targetFrequency = data.value;
      }
    } catch (e) {
      console.warn("⚠️ Target frequency fetch error:", e);
    } finally {
      window.updateMatrixFrequencyBadge();
    }
  };

  // 3. Update Frequency Badge Text
  window.updateMatrixFrequencyBadge = function() {
    const freqTextEl = document.getElementById('matrixTargetFreqText');
    if (!freqTextEl) return;

    const appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
    const freq = window.matrixState.targetFrequency || 'Per Cycle';
    
    const freqDict = {
      'Per Month': { en: 'Per Month', th: 'ต่อเดือน' },
      'Per Quarter': { en: 'Per Quarter', th: 'ต่อไตรมาส' },
      'Per Cycle': { en: 'Per Cycle', th: 'ต่อรอบการทำงาน' },
      'Per Year': { en: 'Per Year', th: 'ต่อปี' }
    };

    freqTextEl.textContent = freqDict[freq] ? freqDict[freq][appLang] : freq;
  };

  // 4. Fetch Adoption & Potential Master Values
  window.fetchMatrixCategories = async function() {
    if (typeof supabase === 'undefined') return;
    
    try {
      // ดึงประเภทดัชนีทั้งหมด
      const { data: indexTypes } = await supabase.from('index_types').select('*');
      const { data: indexValues } = await supabase.from('index_values').select('*');

      if (indexTypes && indexValues) {
        // หา ID ของ Adoption และ Potential (ไม่เคสเซนซิทีฟ)
        const adoptType = indexTypes.find(t => (t.Name || t.IndexType || '').toLowerCase().includes('adopt'));
        const potType = indexTypes.find(t => (t.Name || t.IndexType || '').toLowerCase().includes('poten'));

        if (adoptType) {
          window.matrixState.categories.adoption = indexValues.filter(v => v.IndexType_ID === adoptType.IndexType_ID || v.IndexType_ID === adoptType.id);
        }
        if (potType) {
          window.matrixState.categories.potential = indexValues.filter(v => v.IndexType_ID === potType.IndexType_ID || v.IndexType_ID === potType.id);
        }
      }
    } catch (err) {
      console.error("❌ Error fetching categories:", err);
    }
  };

  // 5. Fetch Product List Direct from Supabase Table
  window.fetchMatrixProductList = async function() {
    const selectEl = document.getElementById('matrixProductSelect');
    if (!selectEl) return;

    let products = [];
    if (typeof supabase !== 'undefined') {
      const { data, error } = await supabase
        .from('products')
        .select('Product_ID, Product, Product_TH')
        .order('Product', { ascending: true });
        
      if (!error && data) products = data;
    }

    const appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
    let html = `<option value="">${appLang === 'en' ? '-- Select Product to View Matrix --' : '-- เลือกสินค้าเพื่อดู Matrix --'}</option>`;

    products.forEach(p => {
      const pName = (appLang === 'th' && p.Product_TH) ? p.Product_TH : (p.Product || p.Product_ID);
      html += `<option value="${p.Product_ID}">${pName}</option>`;
    });

    selectEl.innerHTML = html;
  };

  // 6. Handle Product Selector Change
  window.onMatrixProductChange = async function(productId) {
    window.matrixState.selectedProduct = productId;
    
    const emptyStateEl = document.getElementById('matrixEmptyState');
    const activeContentEl = document.getElementById('matrixActiveContent');

    if (!productId) {
      if (emptyStateEl) emptyStateEl.classList.remove('d-none');
      if (activeContentEl) activeContentEl.classList.add('d-none');
      return;
    }

    if (emptyStateEl) emptyStateEl.classList.add('d-none');
    if (activeContentEl) activeContentEl.classList.remove('d-none');

    window.showMatrixLoading(true);

    try {
      await window.loadMatrixRulesForProduct(productId);
      window.render2DMatrixGrid();
      window.renderTargetInputs();
    } catch (err) {
      console.error("❌ Error loading product matrix rules:", err);
    } finally {
      window.showMatrixLoading(false);
    }
  };

  // 7. Load Matrix & Target Data from Supabase
  window.loadMatrixRulesForProduct = async function(productId) {
    if (typeof supabase === 'undefined') return;

    // โหลดตาราง Rating
    const { data: rules } = await supabase
      .from('Rating')
      .select('*')
      .eq('Product_ID', productId);

    window.matrixState.matrixRules = rules || [];

    // โหลดตาราง Target
    const { data: targets } = await supabase
      .from('Target')
      .select('*')
      .eq('Product_ID', productId);

    const targetMap = {};
    if (targets) {
      targets.forEach(t => {
        targetMap[t.Classification] = t.Target !== null ? t.Target : 0;
      });
    }
    window.matrixState.targetCalls = targetMap;
  };

  // 8. Render 2D Visual Grid
  window.render2DMatrixGrid = function() {
    const canvas = document.getElementById('matrixGridCanvas');
    if (!canvas) return;

    const appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
    let adopts = window.matrixState.categories.adoption;
    let pots = window.matrixState.categories.potential;

    // Fallback กรณีไม่มีข้อมูลใน Master Table ให้ใช้ค่ามาตรฐาน (High, Medium, Low)
    if (adopts.length === 0) adopts = [{ Value: 'High' }, { Value: 'Medium' }, { Value: 'Low' }];
    if (pots.length === 0) pots = [{ Value: 'High' }, { Value: 'Medium' }, { Value: 'Low' }];

    let html = `<table class="table table-bordered text-center align-middle mb-0 bg-white shadow-xs rounded-3 overflow-hidden">`;
    html += `<thead class="table-light"><tr><th class="bg-light-subtle text-secondary" style="width: 160px;">Adoption \\ Potential</th>`;
    
    pots.forEach(p => {
      html += `<th class="fw-bold text-dark">${p.Value}</th>`;
    });
    html += `</tr></thead><tbody>`;

    adopts.forEach(a => {
      html += `<tr><td class="fw-bold bg-light-subtle text-secondary text-start ps-3">${a.Value}</td>`;
      pots.forEach(p => {
        const rule = window.matrixState.matrixRules.find(r => r.Adoption === a.Value && r.Potential === p.Value);
        const classification = rule ? rule.Classification : '-';
        
        let badgeClass = 'bg-secondary-subtle text-secondary';
        if (classification === 'A') badgeClass = 'bg-danger-subtle text-danger border border-danger-subtle';
        else if (classification === 'B') badgeClass = 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
        else if (classification === 'C') badgeClass = 'bg-primary-subtle text-primary border border-primary-subtle';
        else if (classification === 'D') badgeClass = 'bg-success-subtle text-success border border-success-subtle';

        html += `
          <td class="p-3">
            <div class="d-flex flex-column align-items-center gap-1">
              <span class="badge ${badgeClass} fs-6 fw-bold px-3 py-1.5 rounded-3 shadow-xs" style="min-width: 45px;">
                ${classification}
              </span>
              <button type="button" class="btn btn-link btn-sm p-0 text-muted tiny text-decoration-none" onclick="window.editMatrixCell('${a.Value}', '${p.Value}', '${classification}')">
                <i class="fa-solid fa-pen-to-square me-1"></i>${appLang === 'en' ? 'Edit' : 'แก้ไข'}
              </button>
            </div>
          </td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    canvas.innerHTML = html;
  };

  // 9. Render Target Call Inputs
  window.renderTargetInputs = function() {
    const container = document.getElementById('matrixTargetInputsContainer');
    if (!container) return;

    const appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
    const classes = ['A', 'B', 'C', 'D'];
    const freqLabel = window.matrixState.targetFrequency || 'Per Cycle';

    let html = '';
    classes.forEach(c => {
      const targetVal = window.matrixState.targetCalls[c] !== undefined ? window.matrixState.targetCalls[c] : 0;
      
      let borderStyle = 'border-primary-subtle';
      if (c === 'A') borderStyle = 'border-danger-subtle';
      if (c === 'B') borderStyle = 'border-warning-subtle';
      if (c === 'C') borderStyle = 'border-info-subtle';
      if (c === 'D') borderStyle = 'border-success-subtle';

      html += `
        <div class="col-6 col-md-3">
          <div class="card p-3 bg-white border ${borderStyle} shadow-xs rounded-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="fw-bold fs-5 text-dark">Class ${c}</span>
              <span class="badge bg-light text-muted small fw-normal">${freqLabel}</span>
            </div>
            <div class="input-group input-group-sm">
              <input type="number" min="0" class="form-control text-center fw-bold fs-6 text-primary border-primary" id="targetInput_${c}" value="${targetVal}">
              <span class="input-group-text bg-light text-muted fw-bold">${appLang === 'en' ? 'Calls' : 'ครั้ง'}</span>
            </div>
          </div>
        </div>`;
    });

    container.innerHTML = html;
  };

  // 10. Save Target Calls to Supabase (Target Table)
  window.saveMatrixTargetCalls = async function() {
    const productId = window.matrixState.selectedProduct;
    if (!productId) return;

    const currentUserEmail = window.currentUser?.email || 'system';
    const classes = ['A', 'B', 'C', 'D'];
    const updates = [];

    classes.forEach(c => {
      const input = document.getElementById(`targetInput_${c}`);
      if (input) {
        updates.push({
          Product_ID: productId,
          Classification: c,
          Target: parseInt(input.value, 10) || 0,
          Whoupdated: currentUserEmail,
          Whenupdated: new Date().toISOString()
        });
      }
    });

    window.showMatrixLoading(true);

    try {
      if (typeof supabase !== 'undefined') {
        const { error } = await supabase
          .from('Target')
          .upsert(updates, { onConflict: 'Product_ID, Classification' });

        if (error) throw error;
      }

      if (window.showToast) {
        window.showToast(window.getCurrentAppLang() === 'en' ? 'Target calls updated!' : 'บันทึกเป้าหมายสำเร็จ!', 'success');
      } else {
        alert('Saved Target Calls successfully!');
      }
    } catch (err) {
      console.error("❌ Error saving target calls:", err);
      alert('Failed to save targets');
    } finally {
      window.showMatrixLoading(false);
    }
  };

  // 11. Populate Form View Dropdowns
  window.populateMatrixFormDropdowns = function() {
    const pSel = document.getElementById('matrixProduct');
    const aSel = document.getElementById('matrixAdopt');
    const potSel = document.getElementById('matrixPot');
    const cSel = document.getElementById('matrixClass');

    const appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';

    if (pSel) {
      const masterSel = document.getElementById('matrixProductSelect');
      pSel.innerHTML = masterSel ? masterSel.innerHTML : '';
    }

    if (aSel) {
      let adopts = window.matrixState.categories.adoption;
      if (adopts.length === 0) adopts = [{ Value: 'High' }, { Value: 'Medium' }, { Value: 'Low' }];
      aSel.innerHTML = adopts.map(v => `<option value="${v.Value}">${v.Value}</option>`).join('');
    }

    if (potSel) {
      let pots = window.matrixState.categories.potential;
      if (pots.length === 0) pots = [{ Value: 'High' }, { Value: 'Medium' }, { Value: 'Low' }];
      potSel.innerHTML = pots.map(v => `<option value="${v.Value}">${v.Value}</option>`).join('');
    }

    if (cSel) {
      cSel.innerHTML = `
        <option value="A">Class A</option>
        <option value="B">Class B</option>
        <option value="C">Class C</option>
        <option value="D">Class D</option>
      `;
    }
  };

  // 12. Save Matrix Rule Form Submit (Rating Table)
  window.handleSaveMatrix = async function(event) {
    if (event) event.preventDefault();
    
    const productId = document.getElementById('matrixProduct')?.value || window.matrixState.selectedProduct;
    const adoption = document.getElementById('matrixAdopt')?.value;
    const potential = document.getElementById('matrixPot')?.value;
    const classification = document.getElementById('matrixClass')?.value;

    if (!productId || !adoption || !potential || !classification) {
      alert('Please fill all fields');
      return;
    }

    window.showMatrixLoading(true);

    try {
      if (typeof supabase !== 'undefined') {
        const { error } = await supabase
          .from('Rating')
          .upsert([{
            Product_ID: productId,
            Adoption: adoption,
            Potential: potential,
            Classification: classification,
            Whoupdated: window.currentUser?.email || 'system',
            Whenupdated: new Date().toISOString()
          }], { onConflict: 'Product_ID, Adoption, Potential' });

        if (error) throw error;
      }

      if (window.showToast) {
        window.showToast('Matrix rule saved!', 'success');
      } else {
        alert('Matrix rule saved successfully!');
      }

      window.switchMatrixView('matrixListView');
      await window.onMatrixProductChange(productId);

    } catch (err) {
      console.error("❌ Error saving matrix rule:", err);
      alert('Failed to save rule');
    } finally {
      window.showMatrixLoading(false);
    }
  };

  window.showMatrixLoading = function(show) {
    const mainWorkspace = document.getElementById('matrixMainWorkspace');
    if (mainWorkspace) {
      mainWorkspace.style.opacity = show ? '0.4' : '1';
    }
  };

  // Execution Trigger
  setTimeout(window.initManageMatrixPage, 100);

})();
