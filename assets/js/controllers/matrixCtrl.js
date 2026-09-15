/* ==========================================================================
   CRM System - Manage Matrix Controller (matrixCtrl.js)
   Full Version: 2-Pane UI, Read-Only Targets, Exact DB Schema
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

// 🌟 Helper ดึง Supabase Client
function getMatrixSupabase() {
  return window.supabaseClient || window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
}

// 🌟 1. เปิด Modal แจ้งเตือน + โหลดค่า (ไม่บังคับ Class A)
window.openAddMatrixModal = function(adopt = '', pot = '', cls = '-') {
  const selectedProd = window.matrixState.selectedProduct;
  
  if (!selectedProd) {
    if (typeof window.showToast === 'function') {
      window.showToast(window.getCurrentAppLang() === 'en' ? 'Please select a product first' : 'กรุณาเลือกสินค้าก่อน', 'warning');
    } else {
      alert('Please select a product first');
    }
    return;
  }

  window.populateMatrixFormDropdowns();
  
  // Set ค่าในฟอร์ม Modal
  document.getElementById('matrixProduct').value = selectedProd;
  if (adopt) document.getElementById('matrixAdopt').value = adopt;
  if (pot) document.getElementById('matrixPot').value = pot;
  
  // ถ้าเป็นค่าว่าง (-) ให้เลือกช่อง default (value="")
  const classDropdown = document.getElementById('matrixClass');
  if (cls === '-' || !cls) {
    classDropdown.value = "";
  } else {
    classDropdown.value = cls;
  }

  // เรียกเปิด Bootstrap Modal
  const modalEl = document.getElementById('matrixRuleModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
};

// 🌟 2. กดที่ตารางแล้วเด้ง Modal
window.editMatrixCell = function(adoption, potential, currentClass) {
  window.openAddMatrixModal(adoption, potential, currentClass);
};

// 🚀 Main Lifecycle Page Init
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

// 📌 ดึงความถี่จาก System_Settings
window.fetchMatrixTargetFrequency = async function() {
  const sb = getMatrixSupabase();
  if (!sb) return;

  try {
    const { data } = await sb.from('System_Settings').select('*');
    if (data) {
      const freqRow = data.find(r => (r.key || r.Key || '').toLowerCase() === 'rating_frequency');
      if (freqRow) {
        window.matrixState.targetFrequency = freqRow.value || freqRow.Value || 'Per Cycle';
      }
    }
  } catch (e) {
    console.warn("⚠️ Frequency fetch warning:", e);
  } finally {
    window.updateMatrixFrequencyBadge();
  }
};

// 📌 อัปเดต Badge ภาษา
window.updateMatrixFrequencyBadge = function() {
  const freqTextEl = document.getElementById('matrixTargetFreqText');
  if (!freqTextEl) return;

  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  const freq = window.matrixState.targetFrequency || 'Per Cycle';
  
  const freqDict = {
    'Per Month': { en: 'Per Month', th: 'ต่อเดือน' },
    'Per Quarter': { en: 'Per Quarter', th: 'ต่อไตรมาส' },
    'Per Cycle': { en: 'Per Cycle', th: 'ต่อรอบการทำงาน' },
    'Per Year': { en: 'Per Year', th: 'ต่อปี' }
  };

  freqTextEl.textContent = freqDict[freq] ? freqDict[freq][appLang] : freq;
};

// 📌 ดึงหมวดหมู่แกน X/Y จาก IndexType และ Index
window.fetchMatrixCategories = async function() {
  const sb = getMatrixSupabase();
  if (!sb) return;
  
  try {
    const { data: indexTypes } = await sb.from('IndexType').select('*');
    const { data: indexValues } = await sb.from('Index').select('*');

    if (indexTypes && indexValues) {
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

// 📌 ดึงรายชื่อสินค้าจาก Products
window.fetchMatrixProductList = async function() {
  const selectEl = document.getElementById('matrixProductSelect');
  if (!selectEl) return;

  let products = [];
  const sb = getMatrixSupabase();
  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  
  if (sb) {
    try {
      const { data, error } = await sb.from('Products').select('Product_ID, Product, Status').order('Product', { ascending: true });
      if (!error && data) {
        products = data.filter(p => !p.Status || String(p.Status).toLowerCase() === 'active');
      }
    } catch (err) {
      console.error("❌ Error fetching products:", err);
      selectEl.innerHTML = `<option value="">⚠️ Failed to load products</option>`;
      return;
    }
  }

  let html = `<option value="">${appLang === 'en' ? '-- Select Product to View Matrix --' : '-- เลือกสินค้าเพื่อดู Matrix --'}</option>`;
  products.forEach(p => {
    const pName = p.Product || p.Product_ID;
    html += `<option value="${p.Product_ID}">${pName}</option>`;
  });

  selectEl.innerHTML = html;
};

// 📌 เมื่อเปลี่ยนสินค้า
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

// 📌 โหลดข้อมูล Rating และ Target
window.loadMatrixRulesForProduct = async function(productId) {
  const sb = getMatrixSupabase();
  if (!sb) return;

  const { data: rules } = await sb.from('Rating').select('*').eq('Product_ID', productId);
  window.matrixState.matrixRules = rules || [];

  const { data: targets } = await sb.from('Target').select('*').eq('Product_ID', productId);
  const targetMap = {};
  if (targets) {
    targets.forEach(t => {
      targetMap[t.Classification] = t.Target !== null ? t.Target : 0;
    });
  }
  window.matrixState.targetCalls = targetMap;
};

// 🌟 3. วาด Grid คุม Theme + ตัวอักษรใหญ่ขึ้น + สีตาม Priority
window.render2DMatrixGrid = function() {
  const canvas = document.getElementById('matrixGridCanvas');
  if (!canvas) return;
  const lang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  
  let adopts = [...window.matrixState.categories.adoption];
  let pots = [...window.matrixState.categories.potential];
  if (adopts.length === 0) adopts = [{ Value: 'High' }, { Value: 'Medium' }, { Value: 'Low' }];
  if (pots.length === 0) pots = [{ Value: 'High' }, { Value: 'Medium' }, { Value: 'Low' }];

  const yOrder = { 'high': 1, 'medium-high': 2, 'medium': 3, 'medium-low': 4, 'low': 5, 'no': 6 };
  const xOrder = { 'no': 1, 'low': 2, 'medium-low': 3, 'medium': 4, 'medium-high': 5, 'high': 6 };
  adopts.sort((a, b) => (yOrder[(a.Value || '').toLowerCase()] || 99) - (yOrder[(b.Value || '').toLowerCase()] || 99));
  pots.sort((a, b) => (xOrder[(a.Value || '').toLowerCase()] || 99) - (xOrder[(b.Value || '').toLowerCase()] || 99));

  let html = `
    <style>
      .matrix-cell-hover { transition: all 0.2s ease; cursor: pointer; position: relative; }
      .matrix-cell-hover:hover { background-color: #f8fafc !important; box-shadow: inset 0 0 0 2px #cbd5e1; }
      .edit-hint { opacity: 0; transform: translateY(4px); transition: all 0.2s ease; font-size: 0.75rem; }
      .matrix-cell-hover:hover .edit-hint { opacity: 1; transform: translateY(0); color: #0d6efd !important; }
    </style>
    <table class="table table-bordered text-center align-middle mb-0 bg-white h-100" style="table-layout: fixed; width: 100%;">
      <thead class="table-light">
        <tr>
          <th class="bg-light-subtle text-secondary p-0" style="width: 18%; min-width: 100px;">
            <div class="d-flex flex-column justify-content-between h-100 p-2">
              <div class="text-end fw-bold" style="font-size: 0.8rem;">Potential <i class="fa-solid fa-arrow-right ms-1"></i></div>
              <div class="text-start fw-bold" style="font-size: 0.8rem;"><i class="fa-solid fa-arrow-down me-1"></i> Adoption</div>
            </div>
          </th>`;
  
  pots.forEach(p => html += `<th class="fw-bold text-dark py-2 fs-6">${p.Value}</th>`);
  html += `</tr></thead><tbody>`;

  adopts.forEach(a => {
    html += `<tr><td class="fw-bold bg-light-subtle text-secondary text-start ps-3 py-2 fs-6">${a.Value}</td>`;
    pots.forEach(p => {
      const rule = window.matrixState.matrixRules.find(r => r.Adoption === a.Value && r.Potential === p.Value);
      const cls = rule ? rule.Classification : '-';
      
      let bClass = 'bg-secondary-subtle text-secondary border-secondary-subtle';
      if (cls === 'A') bClass = 'bg-danger-subtle text-danger border-danger-subtle';
      else if (cls === 'B') bClass = 'bg-warning-subtle text-warning-emphasis border-warning-subtle';
      else if (cls === 'C') bClass = 'bg-primary-subtle text-primary border-primary-subtle';
      else if (cls === 'D') bClass = 'bg-success-subtle text-success border-success-subtle';

      html += `
        <td class="p-1 matrix-cell-hover" onclick="window.editMatrixCell('${a.Value}', '${p.Value}', '${cls}')">
          <div class="d-flex flex-column align-items-center justify-content-center py-2 h-100">
            <span class="badge ${bClass} fw-bolder rounded-2 mb-1 border shadow-xs" style="font-size: 1rem; min-width: 55px; padding: 0.4rem 0.6rem;">${cls}</span>
            <span class="edit-hint text-muted fw-bold"><i class="fa-solid fa-pen"></i> ${lang === 'en' ? 'Edit' : 'แก้ไข'}</span>
          </div>
        </td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  canvas.innerHTML = html;
};

// 🌟 4. วาดช่อง Target Call (ล็อกค่า Default + ดึงสีตาม Priority ให้ตรงกับตารางซ้าย)
window.renderTargetInputs = function() {
  const container = document.getElementById('matrixTargetInputsContainer');
  if (!container) return;
  const lang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  const classes = ['A', 'B', 'C', 'D'];
  const freqLabel = window.matrixState.targetFrequency || 'Per Cycle';

  let html = '';
  classes.forEach(c => {
    const val = window.matrixState.targetCalls[c] !== undefined ? window.matrixState.targetCalls[c] : 0;
    
    let bStyle = 'border-secondary-subtle';
    let tColor = 'text-secondary';
    let headerBg = 'bg-light';
    
    if (c === 'A') { bStyle = 'border-danger-subtle'; tColor = 'text-danger'; headerBg = 'bg-danger-subtle'; }
    if (c === 'B') { bStyle = 'border-warning-subtle'; tColor = 'text-warning-emphasis'; headerBg = 'bg-warning-subtle'; }
    if (c === 'C') { bStyle = 'border-primary-subtle'; tColor = 'text-primary'; headerBg = 'bg-primary-subtle'; }
    if (c === 'D') { bStyle = 'border-success-subtle'; tColor = 'text-success'; headerBg = 'bg-success-subtle'; }

    html += `
      <div class="col-12">
        <div class="card bg-white border ${bStyle} shadow-sm rounded-3 overflow-hidden">
          <div class="d-flex justify-content-between align-items-center px-3 py-2 ${headerBg} border-bottom ${bStyle}">
            <span class="fw-bolder fs-6 ${tColor}">Class ${c}</span>
            <span class="badge bg-white text-muted shadow-xs border" style="font-size: 0.65rem;">${freqLabel}</span>
          </div>
          <div class="p-2">
            <div class="input-group">
              <input type="number" min="0" class="form-control text-center fw-bolder text-dark border-secondary-subtle target-input-field" 
                     id="targetInput_${c}" value="${val}" disabled style="font-size: 1.15rem; height: 42px;">
              <span class="input-group-text bg-light text-muted fw-bold" style="font-size: 0.85rem;">${lang === 'en' ? 'Calls' : 'ครั้ง'}</span>
            </div>
          </div>
        </div>
      </div>`;
  });
  container.innerHTML = html;
  
  // ตรวจสอบว่าหลังจาก Render ให้ปุ่มกลับเป็นโหมด Default เสมอ
  window.toggleTargetEditMode(false);
};

// 🌟 5. ฟังก์ชันเปิด/ปิดโหมด Edit ฝั่งขวา (ล็อก/ปลดล็อก)
window.toggleTargetEditMode = function(isEditing) {
  const btnEdit = document.getElementById('btnEditTargets');
  const controls = document.getElementById('targetEditControls');
  const inputs = document.querySelectorAll('.target-input-field');

  if (isEditing) {
    if (btnEdit) btnEdit.classList.add('d-none');
    if (controls) { controls.classList.remove('d-none'); controls.classList.add('d-flex'); }
    inputs.forEach(input => {
      input.removeAttribute('disabled');
      input.classList.remove('bg-light');
      input.classList.add('bg-white');
    });
    const firstInput = document.getElementById('targetInput_A');
    if (firstInput) firstInput.focus();
  } else {
    if (btnEdit) btnEdit.classList.remove('d-none');
    if (controls) { controls.classList.add('d-none'); controls.classList.remove('d-flex'); }
    inputs.forEach(input => {
      input.setAttribute('disabled', 'true');
      input.classList.add('bg-light');
    });
  }
};

// 🌟 6. ยกเลิกการแก้ไข Target (ดึงข้อมูลเดิมกลับมา)
window.cancelTargetEdit = function() {
  window.renderTargetInputs();
};

// 🌟 7. บันทึก Matrix Rule (ฟอร์ม Modal)
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
    const sb = getMatrixSupabase();
    if (sb) {
      const { error } = await sb
        .from('Rating')
        .upsert([{
          Product_ID: productId,
          Adoption: adoption,
          Potential: potential,
          Classification: classification,
          Whoupdated: window.currentUser?.email || window.currentUser?.Email || 'system',
          Whenupdated: new Date().toISOString()
        }], { onConflict: 'Product_ID, Adoption, Potential' });

      if (error) throw error;
    }

    if (typeof window.showToast === 'function') {
      window.showToast('Matrix rule saved!', 'success');
    } else {
      alert('Matrix rule saved successfully!');
    }
    
    // ปิด Modal ทันทีที่เซฟสำเร็จ
    const modalEl = document.getElementById('matrixRuleModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    await window.onMatrixProductChange(productId);

  } catch (err) {
    console.error("❌ Error saving matrix rule:", err);
    alert('Failed to save rule');
  } finally {
    window.showMatrixLoading(false);
  }
};

// 🌟 8. บันทึก Target Calls แล้วล็อกหน้าจอ
window.saveMatrixTargetCalls = async function() {
  const productId = window.matrixState.selectedProduct;
  if (!productId) return;

  const currentUserEmail = window.currentUser?.email || window.currentUser?.Email || 'system';
  const updates = [];

  ['A', 'B', 'C', 'D'].forEach(c => {
    const input = document.getElementById(`targetInput_${c}`);
    if (input) {
      const val = parseInt(input.value, 10) || 0;
      updates.push({
        Product_ID: productId,
        Classification: c,
        Target: val,
        Whoupdated: currentUserEmail,
        Whenupdated: new Date().toISOString()
      });
      window.matrixState.targetCalls[c] = val; // อัปเดต State หลัก
    }
  });

  window.showMatrixLoading(true);

  try {
    const sb = getMatrixSupabase();
    if (sb) {
      const { error } = await sb
        .from('Target')
        .upsert(updates, { onConflict: 'Product_ID, Classification' });

      if (error) throw error;
    }

    if (typeof window.showToast === 'function') {
      window.showToast((typeof window.getCurrentAppLang === 'function' && window.getCurrentAppLang() === 'en') ? 'Target calls updated!' : 'บันทึกเป้าหมายสำเร็จ!', 'success');
    } else {
      alert('Saved Target Calls successfully!');
    }
    
    // 🔒 เซฟเสร็จ ล็อกหน้าจอทันที!
    window.toggleTargetEditMode(false);

  } catch (err) {
    console.error("❌ Error saving target calls:", err);
    alert('Failed to save targets');
  } finally {
    window.showMatrixLoading(false);
  }
};

// 📌 ใส่ข้อมูลใน Form View (Modal Dropdowns)
window.populateMatrixFormDropdowns = function() {
  const pSel = document.getElementById('matrixProduct');
  const aSel = document.getElementById('matrixAdopt');
  const potSel = document.getElementById('matrixPot');

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
};

window.showMatrixLoading = function(show) {
  const mainWorkspace = document.getElementById('matrixMainWorkspace');
  if (mainWorkspace) {
    mainWorkspace.style.opacity = show ? '0.4' : '1';
  }
};

// Execution Trigger
setTimeout(window.initManageMatrixPage, 100);
