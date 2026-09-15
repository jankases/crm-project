/* ==========================================================================
   CRM System - Manage Matrix Controller (matrixCtrl.js)
   Full Version: Premium UI, Live Translation, Upsert DB Schema
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

// 🌟 1. เปิด Modal แจ้งเตือน + โหลดค่า
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
  
  document.getElementById('matrixProduct').value = selectedProd;
  if (adopt) document.getElementById('matrixAdopt').value = adopt;
  if (pot) document.getElementById('matrixPot').value = pot;
  
  const classDropdown = document.getElementById('matrixClass');
  if (cls === '-' || !cls) {
    classDropdown.value = "";
  } else {
    classDropdown.value = cls;
  }

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
    
    // 🌟 เรียกใช้การแปลภาษาตอนเริ่มต้น
    window.applyMatrixLocalTranslations();
    
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

// 📌 อัปเดต Badge ภาษาสำหรับ Frequency
window.updateMatrixFrequencyBadge = function() {
  const freqTextEl = document.getElementById('matrixTargetFreqText');
  const appLang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  
  const rawFreq = window.matrixState.targetFrequency || 'Per Cycle';
  const freqKey = String(rawFreq).toLowerCase().trim(); // ป้องกันบั๊กตัวพิมพ์เล็ก/ใหญ่
  
  const freqDict = {
    'per month': { en: 'Per Month', th: 'ต่อเดือน' },
    'per quarter': { en: 'Per Quarter', th: 'ต่อไตรมาส' },
    'per cycle': { en: 'Per Cycle', th: 'ต่อรอบการทำงาน' },
    'per year': { en: 'Per Year', th: 'ต่อปี' }
  };

  const translatedFreq = freqDict[freqKey] ? freqDict[freqKey][appLang] : rawFreq;

  if (freqTextEl) freqTextEl.textContent = translatedFreq;
  
  // อัปเดต Badge ฝั่งขวาทั้ง 4 กล่อง
  document.querySelectorAll('.target-freq-badge').forEach(badge => {
      badge.textContent = translatedFreq;
  });
};

// 📌 ดึงหมวดหมู่แกน X/Y
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

// 📌 ดึงรายชื่อสินค้า
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

// 📌 โหลดข้อมูล Rating_Matrix และ Target
window.loadMatrixRulesForProduct = async function(productId) {
  const sb = getMatrixSupabase();
  if (!sb) return;

  const { data: rules } = await sb.from('Rating_Matrix').select('*').eq('Product_ID', productId);
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

// 🌟 3. วาด Grid ซ้าย (ดีไซน์สากลพรีเมียม ไม่มี Scrollbar + Micro-interaction)
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
      .matrix-table { height: 100%; table-layout: fixed; width: 100%; margin: 0; border-collapse: collapse; }
      .matrix-cell-hover { 
        transition: all 0.2s ease; cursor: pointer; height: 100%; width: 100%;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        position: relative; overflow: hidden;
      }
      .matrix-cell-hover:hover { background-color: #f8fafc !important; box-shadow: inset 0 0 0 1px #cbd5e1; }
      .premium-box {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 65px; height: 40px; border-radius: 8px; transition: all 0.2s ease;
      }
      .matrix-cell-hover:hover .premium-box {
        background-color: #ffffff !important; box-shadow: 0 4px 10px rgba(0,0,0,0.08);
        transform: translateY(-4px); border: 1px solid #e2e8f0;
      }
      .edit-hint {
        font-size: 0.7rem; font-weight: 700; opacity: 0; color: #3b82f6;
        position: absolute; bottom: 4px; 
        transform: translateY(10px); transition: all 0.2s ease;
      }
      .matrix-cell-hover:hover .edit-hint {
        opacity: 1; transform: translateY(0); 
      }
    </style>
    
    <table class="table table-bordered text-center align-middle matrix-table bg-white">
      <thead class="table-light">
        <tr>
          <th class="bg-light-subtle text-secondary p-0" style="width: 18%; min-width: 100px; height: 45px;">
            <div class="d-flex flex-column justify-content-between h-100 p-2">
              <div class="text-end fw-bold" style="font-size: 0.75rem;">Potential <i class="fa-solid fa-arrow-right ms-1"></i></div>
              <div class="text-start fw-bold" style="font-size: 0.75rem;"><i class="fa-solid fa-arrow-down me-1"></i> Adoption</div>
            </div>
          </th>`;
  
  pots.forEach(p => html += `<th class="fw-bold text-dark fs-6" style="height: 45px;">${p.Value}</th>`);
  html += `</tr></thead><tbody>`;

  adopts.forEach(a => {
    html += `<tr><td class="fw-bold bg-light-subtle text-secondary text-start ps-3 fs-6">${a.Value}</td>`;
    pots.forEach(p => {
      const rule = window.matrixState.matrixRules.find(r => r.Adoption === a.Value && r.Potential === p.Value);
      const cls = rule ? rule.Classification : '-';
      
      let bClass = 'bg-secondary-subtle text-secondary';
      if (cls === 'A') bClass = 'bg-danger-subtle text-danger';
      else if (cls === 'B') bClass = 'bg-warning-subtle text-warning-emphasis';
      else if (cls === 'C') bClass = 'bg-primary-subtle text-primary';
      else if (cls === 'D') bClass = 'bg-success-subtle text-success';

      html += `
        <td class="p-0" onclick="window.editMatrixCell('${a.Value}', '${p.Value}', '${cls}')">
          <div class="matrix-cell-hover">
            <div class="premium-box ${bClass}">
              <span class="fw-bolder" style="font-size: 1.4rem; line-height: 1;">${cls}</span>
            </div>
            <span class="edit-hint"><i class="fa-solid fa-pen me-1"></i>${lang === 'en' ? 'Edit' : 'แก้ไข'}</span>
          </div>
        </td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  
  canvas.classList.remove('p-2', 'p-3'); 
  canvas.innerHTML = html;
};

// 🌟 4. วาดช่อง Target Call ฝั่งขวา (รองรับการแปลภาษาอัตโนมัติ)
window.renderTargetInputs = function() {
  const container = document.getElementById('matrixTargetInputsContainer');
  if (!container) return;
  const lang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  const classes = ['A', 'B', 'C', 'D'];
  
  const rawFreq = window.matrixState.targetFrequency || 'Per Cycle';
  const freqKey = String(rawFreq).toLowerCase().trim();
  const freqDict = { 'per month': {en:'Per Month', th:'ต่อเดือน'}, 'per quarter': {en:'Per Quarter', th:'ต่อไตรมาส'}, 'per cycle': {en:'Per Cycle', th:'ต่อรอบการทำงาน'}, 'per year': {en:'Per Year', th:'ต่อปี'} };
  const freqLabel = freqDict[freqKey] ? freqDict[freqKey][lang] : rawFreq;

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
            <span class="badge bg-white text-muted shadow-xs border target-freq-badge" style="font-size: 0.65rem;">${freqLabel}</span>
          </div>
          <div class="p-2">
            <div class="input-group">
              <input type="number" min="0" class="form-control text-center fw-bolder text-dark border-secondary-subtle target-input-field" 
                     id="targetInput_${c}" value="${val}" disabled style="font-size: 1.15rem; height: 40px;">
              <span class="input-group-text bg-light text-muted fw-bold" style="font-size: 0.85rem;">${lang === 'en' ? 'Calls' : 'ครั้ง'}</span>
            </div>
          </div>
        </div>
      </div>`;
  });
  container.innerHTML = html;
  
  window.toggleTargetEditMode(false);
};

// 🌟 5. ฟังก์ชันเปิด/ปิดโหมด Edit ฝั่งขวา
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

// 🌟 6. ยกเลิกการแก้ไข Target
window.cancelTargetEdit = function() {
  window.renderTargetInputs();
};

// 🌟 7. บันทึก Matrix Rule (ตาราง Rating_Matrix)
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
        .from('Rating_Matrix')
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

// 🌟 8. บันทึก Target Calls
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
    
    window.toggleTargetEditMode(false);

  } catch (err) {
    console.error("❌ Error saving target calls:", err);
    alert('Failed to save targets');
  } finally {
    window.showMatrixLoading(false);
  }
};

// 📌 9. ใส่ข้อมูลใน Form View (Modal Dropdowns)
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

// 📌 10. ระบบโหลดหน้าจอ
window.showMatrixLoading = function(show) {
  const mainWorkspace = document.getElementById('matrixMainWorkspace');
  if (mainWorkspace) {
    mainWorkspace.style.opacity = show ? '0.4' : '1';
  }
};

// =====================================================================
// 🌍 ระบบแปลภาษา 2 ภาษา (EN/TH) เฉพาะหน้า Matrix
// =====================================================================
window.applyMatrixLocalTranslations = function() {
  const lang = (typeof window.getCurrentAppLang === 'function') ? window.getCurrentAppLang() : 'en';
  
  const selectOpt = document.querySelector('#matrixProductSelect option[value=""]');
  if (selectOpt) {
    selectOpt.textContent = lang === 'en' ? '-- Select Product to View Matrix --' : '-- เลือกสินค้าเพื่อดู Matrix --';
  }

  const eDesc = document.getElementById('matrixEmptyDesc');
  if (eDesc) eDesc.textContent = lang === 'en' ? 'Configure customer classification grids and define call frequency targets based on product adoption and potential.' : 'ตั้งค่าเกณฑ์จัดกลุ่มลูกค้าและกำหนดเป้าหมายความถี่ในการเข้าพบ';

  const s1t = document.getElementById('step1Title');
  if (s1t) s1t.textContent = lang === 'en' ? 'Select Product' : 'เลือกสินค้า';
  const s1d = document.getElementById('step1Desc');
  if (s1d) s1d.textContent = lang === 'en' ? 'Choose a product from the top-left dropdown menu to begin.' : 'เลือกสินค้าจากเมนูด้านซ้ายบนเพื่อเริ่มต้น';

  const s2t = document.getElementById('step2Title');
  if (s2t) s2t.textContent = lang === 'en' ? 'Map Grid Class' : 'จัดกลุ่มเกรดลูกค้า';
  const s2d = document.getElementById('step2Desc');
  if (s2d) s2d.textContent = lang === 'en' ? 'Click on any matrix cell to assign class A, B, C, or D.' : 'คลิกที่ช่องตารางเพื่อกำหนดคลาส A, B, C หรือ D';

  const s3t = document.getElementById('step3Title');
  if (s3t) s3t.textContent = lang === 'en' ? 'Set Call Targets' : 'กำหนดเป้าหมาย';
  const s3d = document.getElementById('step3Desc');
  if (s3d) s3d.textContent = lang === 'en' ? 'Define the required number of calls per cycle for each class.' : 'กำหนดจำนวนครั้งที่ต้องเข้าพบต่อรอบของแต่ละคลาส';

  const arr = document.getElementById('arrowText');
  if (arr) arr.textContent = lang === 'en' ? 'Select a product above to start' : 'กรุณาเลือกสินค้าด้านบนเพื่อเริ่มต้นใช้งาน';

  window.updateMatrixFrequencyBadge();
};

// 🌟 ตัวดักจับเวลาผู้ใช้กดเปลี่ยนภาษาที่ปุ่ม (บน Navbar) ให้มันแปลหน้าจอนี้ทันที
document.addEventListener('click', function(e) {
  if (e.target.closest('button') || e.target.closest('a')) {
    setTimeout(() => {
      window.applyMatrixLocalTranslations();
      if (window.matrixState.selectedProduct) {
        window.render2DMatrixGrid();
        window.renderTargetInputs();
      }
    }, 200); 
  }
});

// Execution Trigger
setTimeout(window.initManageMatrixPage, 100);
