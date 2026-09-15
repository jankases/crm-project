/* ==========================================================================
   CRM System - Manage Matrix Controller (matrixCtrl.js)
   Modal-based Edit & 2-Pane UI (Consistent Theme)
   ========================================================================== */

window.matrixState = {
  selectedProduct: '', targetFrequency: 'Per Cycle', matrixRules: [], targetCalls: {}, categories: { adoption: [], potential: [] }
};

function getMatrixSupabase() { return window.supabaseClient || window.supabase || null; }

// 🌟 1. เปิด Modal แจ้งเตือน + โหลดค่า
window.openAddMatrixModal = function(adopt = '', pot = '', cls = 'A') {
  const selectedProd = window.matrixState.selectedProduct;
  if (!selectedProd) {
    if (typeof window.showToast === 'function') window.showToast(window.getCurrentAppLang() === 'en' ? 'Please select a product first' : 'กรุณาเลือกสินค้าก่อน', 'warning');
    else alert('Please select a product first');
    return;
  }

  window.populateMatrixFormDropdowns();
  
  // Set ค่าในฟอร์ม Modal
  document.getElementById('matrixProduct').value = selectedProd;
  if (adopt) document.getElementById('matrixAdopt').value = adopt;
  if (pot) document.getElementById('matrixPot').value = pot;
  document.getElementById('matrixClass').value = cls !== '-' ? cls : 'A';

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

window.initManageMatrixPage = async function() {
  window.showMatrixLoading(true);
  try {
    await window.fetchMatrixTargetFrequency();
    await window.fetchMatrixCategories();
    await window.fetchMatrixProductList();
  } catch (err) { console.error(err); } finally { window.showMatrixLoading(false); }
};

window.fetchMatrixTargetFrequency = async function() {
  const sb = getMatrixSupabase();
  if (!sb) return;
  try {
    const { data } = await sb.from('System_Settings').select('*');
    if (data) {
      const freqRow = data.find(r => (r.key || r.Key || '').toLowerCase() === 'rating_frequency');
      if (freqRow) window.matrixState.targetFrequency = freqRow.value || freqRow.Value || 'Per Cycle';
    }
  } catch (e) {} finally { window.updateMatrixFrequencyBadge(); }
};

window.updateMatrixFrequencyBadge = function() {
  const el = document.getElementById('matrixTargetFreqText');
  if (!el) return;
  const lang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  const freq = window.matrixState.targetFrequency || 'Per Cycle';
  const dict = { 'Per Month': {en:'Per Month', th:'ต่อเดือน'}, 'Per Quarter': {en:'Per Quarter', th:'ต่อไตรมาส'}, 'Per Cycle': {en:'Per Cycle', th:'ต่อรอบการทำงาน'}, 'Per Year': {en:'Per Year', th:'ต่อปี'} };
  el.textContent = dict[freq] ? dict[freq][lang] : freq;
};

window.fetchMatrixCategories = async function() {
  const sb = getMatrixSupabase();
  if (!sb) return;
  try {
    const { data: iTypes } = await sb.from('IndexType').select('*');
    const { data: iVals } = await sb.from('Index').select('*');
    if (iTypes && iVals) {
      const aType = iTypes.find(t => (t.Name || t.IndexType || '').toLowerCase().includes('adopt'));
      const pType = iTypes.find(t => (t.Name || t.IndexType || '').toLowerCase().includes('poten'));
      if (aType) window.matrixState.categories.adoption = iVals.filter(v => v.IndexType_ID === aType.IndexType_ID || v.IndexType_ID === aType.id);
      if (pType) window.matrixState.categories.potential = iVals.filter(v => v.IndexType_ID === pType.IndexType_ID || v.IndexType_ID === pType.id);
    }
  } catch (e) {}
};

window.fetchMatrixProductList = async function() {
  const el = document.getElementById('matrixProductSelect');
  if (!el) return;
  const sb = getMatrixSupabase();
  let products = [];
  if (sb) {
    try {
      const { data, error } = await sb.from('Products').select('Product_ID, Product, Status').order('Product', { ascending: true });
      if (!error && data) products = data.filter(p => !p.Status || String(p.Status).toLowerCase() === 'active');
    } catch (err) {}
  }
  const lang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  let html = `<option value="">${lang === 'en' ? '-- Select Product to View Matrix --' : '-- เลือกสินค้าเพื่อดู Matrix --'}</option>`;
  products.forEach(p => html += `<option value="${p.Product_ID}">${p.Product || p.Product_ID}</option>`);
  el.innerHTML = html;
};

window.onMatrixProductChange = async function(productId) {
  window.matrixState.selectedProduct = productId;
  const emptyEl = document.getElementById('matrixEmptyState');
  const activeEl = document.getElementById('matrixActiveContent');
  if (!productId) {
    emptyEl.classList.remove('d-none'); activeEl.classList.add('d-none');
    return;
  }
  emptyEl.classList.add('d-none'); activeEl.classList.remove('d-none');
  window.showMatrixLoading(true);
  try {
    await window.loadMatrixRulesForProduct(productId);
    window.render2DMatrixGrid();
    window.renderTargetInputs();
  } catch (e) {} finally { window.showMatrixLoading(false); }
};

window.loadMatrixRulesForProduct = async function(productId) {
  const sb = getMatrixSupabase();
  if (!sb) return;
  const { data: rules } = await sb.from('Rating').select('*').eq('Product_ID', productId);
  window.matrixState.matrixRules = rules || [];
  const { data: targets } = await sb.from('Target').select('*').eq('Product_ID', productId);
  const tMap = {};
  if (targets) targets.forEach(t => tMap[t.Classification] = t.Target !== null ? t.Target : 0);
  window.matrixState.targetCalls = tMap;
};

// 🌟 3. วาด Grid คุม Theme มาตรฐานของระบบ (table-bordered) + เรียงลำดับถูกต้อง
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
      .matrix-cell-hover { transition: all 0.15s ease; cursor: pointer; }
      .matrix-cell-hover:hover { background-color: #f8fafc !important; box-shadow: inset 0 0 0 1.5px #cbd5e1; }
      .matrix-cell-hover:hover .edit-hint { color: #0d6efd !important; opacity: 1 !important; }
    </style>
    <table class="table table-bordered text-center align-middle mb-0 bg-white h-100" style="table-layout: fixed; width: 100%;">
      <thead class="table-light">
        <tr>
          <th class="bg-light-subtle text-secondary p-0" style="width: 18%; min-width: 100px;">
            <div class="d-flex flex-column justify-content-between h-100 p-2">
              <div class="text-end fw-bold" style="font-size: 0.75rem;">Potential <i class="fa-solid fa-arrow-right ms-1"></i></div>
              <div class="text-start fw-bold" style="font-size: 0.75rem;"><i class="fa-solid fa-arrow-down me-1"></i> Adoption</div>
            </div>
          </th>`;
  
  pots.forEach(p => html += `<th class="fw-bold text-dark py-2" style="font-size: 0.85rem;">${p.Value}</th>`);
  html += `</tr></thead><tbody>`;

  adopts.forEach(a => {
    html += `<tr><td class="fw-bold bg-light-subtle text-secondary text-start ps-3 py-2" style="font-size: 0.85rem;">${a.Value}</td>`;
    pots.forEach(p => {
      const rule = window.matrixState.matrixRules.find(r => r.Adoption === a.Value && r.Potential === p.Value);
      const cls = rule ? rule.Classification : '-';
      
      let bClass = 'bg-secondary-subtle text-secondary';
      if (cls === 'A') bClass = 'bg-danger-subtle text-danger border border-danger-subtle';
      else if (cls === 'B') bClass = 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
      else if (cls === 'C') bClass = 'bg-primary-subtle text-primary border border-primary-subtle';
      else if (cls === 'D') bClass = 'bg-success-subtle text-success border border-success-subtle';

      html += `
        <td class="p-1 matrix-cell-hover" onclick="window.editMatrixCell('${a.Value}', '${p.Value}', '${cls}')">
          <div class="d-flex flex-column align-items-center justify-content-center py-2 h-100">
            <span class="badge ${bClass} fw-bold rounded-2 mb-1 shadow-none" style="font-size: 0.9rem; min-width: 45px;">${cls}</span>
            <span class="edit-hint text-muted small opacity-50" style="font-size: 0.7rem;"><i class="fa-solid fa-pen"></i> ${lang === 'en' ? 'Edit' : 'แก้ไข'}</span>
          </div>
        </td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  canvas.innerHTML = html;
};

// 🌟 4. วาดช่อง Target Call (จัด Layout เป็นแนวตั้งสำหรับ Sidebar ฝั่งขวา)
window.renderTargetInputs = function() {
  const container = document.getElementById('matrixTargetInputsContainer');
  if (!container) return;
  const lang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  const classes = ['A', 'B', 'C', 'D'];
  const freqLabel = window.matrixState.targetFrequency || 'Per Cycle';

  let html = '';
  classes.forEach(c => {
    const val = window.matrixState.targetCalls[c] !== undefined ? window.matrixState.targetCalls[c] : 0;
    let bStyle = 'border-primary-subtle';
    let tColor = 'text-primary';
    if (c === 'A') { bStyle = 'border-danger-subtle'; tColor = 'text-danger'; }
    if (c === 'B') { bStyle = 'border-warning-subtle'; tColor = 'text-warning-emphasis'; }
    if (c === 'C') { bStyle = 'border-primary-subtle'; tColor = 'text-primary'; }
    if (c === 'D') { bStyle = 'border-success-subtle'; tColor = 'text-success'; }

    html += `
      <div class="col-12">
        <div class="card p-2 bg-white border ${bStyle} shadow-sm rounded-3">
          <div class="d-flex justify-content-between align-items-center mb-2 px-1">
            <span class="fw-bold fs-6 ${tColor}">Class ${c}</span>
            <span class="badge bg-light text-muted" style="font-size: 0.65rem;">${freqLabel}</span>
          </div>
          <div class="input-group input-group-sm">
            <input type="number" min="0" class="form-control text-center fw-bold text-dark border-secondary-subtle" id="targetInput_${c}" value="${val}">
            <span class="input-group-text bg-light text-muted fw-bold" style="font-size: 0.75rem;">${lang === 'en' ? 'Calls' : 'ครั้ง'}</span>
          </div>
        </div>
      </div>`;
  });
  container.innerHTML = html;
};

// 🌟 5. บันทึก Modal (เสร็จแล้วปิด Modal ทันที)
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
      const { error } = await sb.from('Rating').upsert([{
        Product_ID: productId, Adoption: adoption, Potential: potential, Classification: classification,
        Whoupdated: window.currentUser?.email || window.currentUser?.Email || 'system',
        Whenupdated: new Date().toISOString()
      }], { onConflict: 'Product_ID, Adoption, Potential' });
      if (error) throw error;
    }

    if (typeof window.showToast === 'function') window.showToast('Matrix rule saved!', 'success');
    
    // 🌟 ปิด Modal ด้วย Bootstrap Instance
    const modalEl = document.getElementById('matrixRuleModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
    
    // โหลดตารางใหม่
    await window.onMatrixProductChange(productId);

  } catch (err) {
    console.error("❌ Error saving rule:", err);
    alert('Failed to save rule');
  } finally {
    window.showMatrixLoading(false);
  }
};

window.saveMatrixTargetCalls = async function() {
  const productId = window.matrixState.selectedProduct;
  if (!productId) return;
  const currentUserEmail = window.currentUser?.email || window.currentUser?.Email || 'system';
  const updates = [];
  ['A', 'B', 'C', 'D'].forEach(c => {
    const input = document.getElementById(`targetInput_${c}`);
    if (input) updates.push({ Product_ID: productId, Classification: c, Target: parseInt(input.value, 10) || 0, Whoupdated: currentUserEmail, Whenupdated: new Date().toISOString() });
  });

  window.showMatrixLoading(true);
  try {
    const sb = getMatrixSupabase();
    if (sb) {
      const { error } = await sb.from('Target').upsert(updates, { onConflict: 'Product_ID, Classification' });
      if (error) throw error;
    }
    if (typeof window.showToast === 'function') window.showToast('Target calls updated!', 'success');
  } catch (err) {} finally { window.showMatrixLoading(false); }
};

window.populateMatrixFormDropdowns = function() {
  const pSel = document.getElementById('matrixProduct');
  const aSel = document.getElementById('matrixAdopt');
  const potSel = document.getElementById('matrixPot');
  const cSel = document.getElementById('matrixClass');
  if (pSel) { const m = document.getElementById('matrixProductSelect'); pSel.innerHTML = m ? m.innerHTML : ''; }
  if (aSel) { let a = window.matrixState.categories.adoption; if(!a.length) a = [{Value:'High'},{Value:'Medium'},{Value:'Low'}]; aSel.innerHTML = a.map(v => `<option value="${v.Value}">${v.Value}</option>`).join(''); }
  if (potSel) { let p = window.matrixState.categories.potential; if(!p.length) p = [{Value:'High'},{Value:'Medium'},{Value:'Low'}]; potSel.innerHTML = p.map(v => `<option value="${v.Value}">${v.Value}</option>`).join(''); }
  if (cSel) cSel.innerHTML = `<option value="A">Class A</option><option value="B">Class B</option><option value="C">Class C</option><option value="D">Class D</option>`;
};

window.showMatrixLoading = function(show) {
  const ws = document.getElementById('matrixMainWorkspace');
  if (ws) ws.style.opacity = show ? '0.4' : '1';
};
