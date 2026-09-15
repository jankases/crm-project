/* ==========================================================================
   CRM System - Manage Matrix Controller (matrixCtrl.js)
   Standard: Premium SaaS / Server-Side Ready / Bilingual i18n (FULL VERSION)
   ========================================================================== */

(function() {
  'use strict';

  // Global States ของหน้านี้
  window.matrixState = {
    selectedProduct: '',
    targetFrequency: 'Per Cycle',
    matrixRules: [],
    targetCalls: {},
    categories: {
      adoption: [],
      potential: [],
      classification: []
    }
  };

  // 🚀 1. Initialize Page Function
  window.initManageMatrixPage = async function() {
    console.log("🚀 Initializing Manage Matrix Module...");
    window.showMatrixLoading(true);

    try {
      // 1.1 ดึงความถี่ Target Call จาก System Settings ก่อน
      await window.fetchMatrixTargetFrequency();

      // 1.2 ดึงหมวดหมู่สำหรับแกน X / Y (Adoption, Potential, Classification)
      await window.fetchMatrixCategories();

      // 1.3 โหลดเฉพาะรายชื่อสินค้า (Server-side List)
      await window.fetchMatrixProductList();

      // 1.4 ปลูกเสก TomSelect สำหรับเลือกสินค้า
      window.initMatrixProductSelect();

      // 1.5 เตรียม Dropdowns ใน Form View
      window.populateMatrixFormDropdowns();

    } catch (err) {
      console.error("❌ Error initializing Manage Matrix:", err);
      window.showMatrixToast(
        window.getCurrentAppLang() === 'en' ? 'Failed to load Matrix data' : 'เกิดข้อผิดพลาดในการโหลดข้อมูล Matrix',
        'danger'
      );
    } finally {
      window.showMatrixLoading(false);
    }
  };

  // 📌 2. ดึงค่า Target Call Frequency จาก Supabase Settings
  window.fetchMatrixTargetFrequency = async function() {
    try {
      if (typeof supabase === 'undefined') return;
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'rating_frequency')
        .single();

      if (data && data.value) {
        window.matrixState.targetFrequency = data.value;
      }
    } catch (e) {
      console.warn("⚠️ Using default target frequency:", window.matrixState.targetFrequency);
    } finally {
      window.updateMatrixFrequencyBadge();
    }
  };

  // 📌 3. อัปเดต Badge แสดงความถี่เป้าหมาย (TH/EN)
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

    const label = freqDict[freq] ? freqDict[freq][appLang] : freq;
    freqTextEl.textContent = label;
  };

  // 📌 4. ดึงหมวดหมู่แกน X/Y
  window.fetchMatrixCategories = async function() {
    if (typeof supabase === 'undefined') return;
    
    const { data: indexTypes } = await supabase.from('index_types').select('*');
    if (indexTypes) {
      const adoptType = indexTypes.find(t => t.Name.toLowerCase() === 'adoption');
      const potType = indexTypes.find(t => t.Name.toLowerCase() === 'potential');
      const classType = indexTypes.find(t => t.Name.toLowerCase() === 'classification');

      const { data: indexValues } = await supabase.from('index_values').select('*');
      if (indexValues) {
        if (adoptType) window.matrixState.categories.adoption = indexValues.filter(v => v.IndexType_ID === adoptType.IndexType_ID);
        if (potType) window.matrixState.categories.potential = indexValues.filter(v => v.IndexType_ID === potType.IndexType_ID);
        if (classType) window.matrixState.categories.classification = indexValues.filter(v => v.IndexType_ID === classType.IndexType_ID);
      }
    }
  };

  // 📌 5. ดึงรายชื่อสินค้าเฉพาะของ Sales/Admin (Lazy List)
  window.fetchMatrixProductList = async function() {
    const selectEl = document.getElementById('matrixProductSelect');
    if (!selectEl) return;

    let products = window.globalProductsList || [];

    if (products.length === 0 && typeof supabase !== 'undefined') {
      const { data } = await supabase
        .from('products')
        .select('Product_ID, Product, Product_TH')
        .eq('Status', 'Active')
        .order('Product', { ascending: true });
      products = data || [];
    }

    const appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
    let html = `<option value="">${appLang === 'en' ? '- Select Product to View Matrix -' : '- เลือกสินค้าเพื่อดู Matrix -'}</option>`;

    products.forEach(p => {
      const pName = (appLang === 'th' && p.Product_TH) ? p.Product_TH : p.Product;
      html += `<option value="${p.Product_ID}">${pName}</option>`;
    });

    selectEl.innerHTML = html;
  };

  // 📌 6. ปลูกเสก TomSelect ให้สินค้า
  window.initMatrixProductSelect = function() {
    const el = document.getElementById('matrixProductSelect');
    if (!el || typeof TomSelect === 'undefined') return;

    if (window.matrixTomSelect) window.matrixTomSelect.destroy();

    window.matrixTomSelect = new TomSelect('#matrixProductSelect', {
      create: false,
      sortField: { field: "text", direction: "asc" },
      onChange: function(val) {
        window.onMatrixProductChange(val);
      }
    });
  };

  // 📌 7. Event เมื่อเปลี่ยนสินค้าที่เลือก (Server-Side Lazy Loading)
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

  // 📌 8. โหลดข้อมูล Matrix เฉพาะสินค้าตัวที่เลือกจาก Supabase 
  window.loadMatrixRulesForProduct = async function(productId) {
    if (typeof supabase === 'undefined') return;

    // 🌟 1. ดึงข้อมูล Matrix จากตาราง `Rating` (แทน product_matrix)
    const { data: rules, error: ruleErr } = await supabase
      .from('Rating')
      .select('*')
      .eq('Product_ID', productId);

    if (ruleErr) console.error("❌ Error fetching Rating:", ruleErr);
    window.matrixState.matrixRules = rules || [];

    // 🌟 2. ดึงข้อมูล Target จากตาราง `Target` (แทน target_calls)
    const { data: targets, error: targetErr } = await supabase
      .from('Target')
      .select('*')
      .eq('Product_ID', productId);

    if (targetErr) console.error("❌ Error fetching Target:", targetErr);

    const targetMap = {};
    if (targets) {
      targets.forEach(t => {
        // 🌟 อ่านค่าจากคอลัมน์ `Target` (ไม่ใช่ Target_Call)
        targetMap[t.Classification] = t.Target !== null ? t.Target : 0;
      });
    }
    window.matrixState.targetCalls = targetMap;
  };

  // 📌 9. วาด 2D Rating Matrix Canvas (Grid View)
  window.render2DMatrixGrid = function() {
    const canvas = document.getElementById('matrixGridCanvas');
    if (!canvas) return;

    const appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
    const adopts = window.matrixState.categories.adoption;
    const pots = window.matrixState.categories.potential;

    if (adopts.length === 0 || pots.length === 0) {
      canvas.innerHTML = `<div class="text-center py-4 text-muted">${appLang === 'en' ? 'No Adoption / Potential Master Data setup yet.' : 'ยังไม่มีข้อมูล Master ของ Adoption / Potential'}</div>`;
      return;
    }

    let html = `<table class="table table-bordered text-center align-middle mb-0 bg-white shadow-xs rounded-3 overflow-hidden">`;
    
    html += `<thead class="table-light"><tr><th class="bg-light-subtle text-secondary" style="width: 150px;">Adoption \\ Potential</th>`;
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

  // 📌 10. วาดช่องกรอก Target Allocation (A, B, C, D)
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
 
  // 📌 11. บันทึก Target Calls ลง Supabase
  window.saveMatrixTargetCalls = async function() {
    const productId = window.matrixState.selectedProduct;
    if (!productId) return;

    // ดึงอีเมลผู้ใช้งานปัจจุบันสำหรับใส่ Whoupdated
    const currentUserEmail = window.currentUser?.email || 'system';
    const classes = ['A', 'B', 'C', 'D'];
    const updates = [];

    classes.forEach(c => {
      const input = document.getElementById(`targetInput_${c}`);
      if (input) {
        updates.push({
          Product_ID: productId,
          Classification: c,
          Target: parseInt(input.value, 10) || 0, // 🌟 ใช้ชื่อคอลัมน์ `Target`
          Whoupdated: currentUserEmail,            // 🌟 ใส่ Whoupdated
          Whenupdated: new Date().toISOString()   // 🌟 ใส่ Whenupdated
        });
      }
    });

    window.showMatrixLoading(true);

    try {
      if (typeof supabase !== 'undefined') {
        // 🌟 บันทึกลงตาราง `Target`
        const { error } = await supabase
          .from('Target')
          .upsert(updates, { onConflict: 'Product_ID, Classification' });

        if (error) throw error;
      }

      window.showMatrixToast(
        window.getCurrentAppLang() === 'en' ? 'Target calls updated successfully!' : 'บันทึกเป้าหมายการเข้าพบเรียบร้อยแล้ว!',
        'success'
      );
    } catch (err) {
      console.error("❌ Error saving target calls:", err);
      window.showMatrixToast(
        window.getCurrentAppLang() === 'en' ? 'Failed to save targets' : 'บันทึกข้อมูลไม่สำเร็จ',
        'danger'
      );
    } finally {
      window.showMatrixLoading(false);
    }
  };

  // 📌 12. ใส่ตัวเลือกใน Form View Dropdowns
  window.populateMatrixFormDropdowns = function() {
    const pSel = document.getElementById('matrixProduct');
    const aSel = document.getElementById('matrixAdopt');
    const potSel = document.getElementById('matrixPot');
    const cSel = document.getElementById('matrixClass');

    const appLang = window.getCurrentAppLang ? window.getCurrentAppLang() : 'en';
    const products = window.globalProductsList || [];

    if (pSel) {
      let html = `<option value="">- ${appLang === 'en' ? 'Select Product' : 'เลือกสินค้า'} -</option>`;
      products.forEach(p => {
        const pName = (appLang === 'th' && p.Product_TH) ? p.Product_TH : p.Product;
        html += `<option value="${p.Product_ID}">${pName}</option>`;
      });
      pSel.innerHTML = html;
    }

    if (aSel) {
      let html = '';
      window.matrixState.categories.adoption.forEach(v => {
        html += `<option value="${v.Value}">${v.Value}</option>`;
      });
      aSel.innerHTML = html;
    }

    if (potSel) {
      let html = '';
      window.matrixState.categories.potential.forEach(v => {
        html += `<option value="${v.Value}">${v.Value}</option>`;
      });
      potSel.innerHTML = html;
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

  // 📌 13. เปิด Form View เพิ่ม Matrix Rule
  window.openAddMatrixModal = function() {
    window.populateMatrixFormDropdowns();

    const selectedProd = window.matrixState.selectedProduct;
    const pSel = document.getElementById('matrixProduct');
    if (pSel && selectedProd) pSel.value = selectedProd;

    window.switchMatrixView('matrixFormView');
  };

  // 📌 14. สลับ View ระหว่าง List และ Form
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

  // 📌 15. แก้ไข Cell บน Grid 2 มิติ
  window.editMatrixCell = function(adoption, potential, currentClass) {
    window.openAddMatrixModal();
    
    setTimeout(() => {
      const adoptEl = document.getElementById('matrixAdopt');
      const potEl = document.getElementById('matrixPot');
      const classEl = document.getElementById('matrixClass');

      if (adoptEl) adoptEl.value = adoption;
      if (potEl) potEl.value = potential;
      if (classEl) classEl.value = currentClass !== '-' ? currentClass : 'A';
    }, 50);
  };

  // 📌 16. บันทึก Matrix Rule (Form Submit)
  window.handleSaveMatrix = async function(event) {
    if (event) event.preventDefault();
    
    const productId = document.getElementById('matrixProduct')?.value || window.matrixState.selectedProduct;
    const adoption = document.getElementById('matrixAdopt')?.value;
    const potential = document.getElementById('matrixPot')?.value;
    const classification = document.getElementById('matrixClass')?.value;

    if (!productId || !adoption || !potential || !classification) {
      window.showMatrixToast(
        window.getCurrentAppLang() === 'en' ? 'Please fill all required fields' : 'กรุณากรอกข้อมูลให้ครบถ้วน',
        'warning'
      );
      return;
    }

    window.showMatrixLoading(true);

    try {
      if (typeof supabase !== 'undefined') {
        // 🌟 บันทึกลงตาราง `Rating`
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

      window.showMatrixToast(
        window.getCurrentAppLang() === 'en' ? 'Matrix rule saved successfully!' : 'บันทึกเงื่อนไข Matrix เรียบร้อยแล้ว!',
        'success'
      );

      window.switchMatrixView('matrixListView');
      
      if (productId === window.matrixState.selectedProduct) {
        await window.onMatrixProductChange(productId);
      }

    } catch (err) {
      console.error("❌ Error saving matrix rule:", err);
      window.showMatrixToast(
        window.getCurrentAppLang() === 'en' ? 'Failed to save rule' : 'บันทึกข้อมูลไม่สำเร็จ',
        'danger'
      );
    } finally {
      window.showMatrixLoading(false);
    }
  };

  // Helper Functions
  window.showMatrixLoading = function(show) {
    const mainWorkspace = document.getElementById('matrixMainWorkspace');
    if (mainWorkspace) {
      mainWorkspace.style.opacity = show ? '0.5' : '1';
    }
  };

  window.showMatrixToast = function(msg, type = 'info') {
    if (window.showToast) {
      window.showToast(msg, type);
    } else {
      alert(msg);
    }
  };

  // Auto Init
  document.addEventListener('DOMContentLoaded', function() {
    window.initManageMatrixPage();
  });

})();
