/* ==========================================================================
   CRM System - Manage Matrix Controller (matrixCtrl.js)
   Standard: Premium SaaS / Server-Side Ready / Bilingual i18n
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
    
    // ดึง Adoption, Potential, Classification จาก master tables
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

    // ถ้าไม่มีใน Global ให้ไปโหลดเฉพาะ ID และชื่อจาก Supabase
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
      // โหลดข้อมูล Matrix Rules & Target Calls เฉพาะสินค้าตัวนี้
      await window.loadMatrixRulesForProduct(productId);
      
      // วาด Visual 2D Grid
      window.render2DMatrixGrid();

      // วาดช่องกรอก Target Allocation
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

    // 8.1 ดึง Matrix Rules (Adoption + Potential -> Classification)
    const { data: rules } = await supabase
      .from('product_matrix')
      .select('*')
      .eq('Product_ID', productId);

    window.matrixState.matrixRules = rules || [];

    // 8.2 ดึง Target Calls สำหรับแต่ละ Classification
    const { data: targets } = await supabase
      .from('target_calls')
      .select('*')
      .eq('Product_ID', productId);

    const targetMap = {};
    if (targets) {
      targets.forEach(t => {
        targetMap[t.Classification] = t.Target_Call || 0;
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
    
    // Header Row (แกน X: Potential)
    html += `<thead class="table-light"><tr><th class="bg-light-subtle text-secondary" style="width: 150px;">Adoption \\ Potential</th>`;
    pots.forEach(p => {
      html += `<th class="fw-bold text-dark">${p.Value}</th>`;
    });
    html += `</tr></thead><tbody>`;

    // Body Rows (แกน Y: Adoption)
    adopts.forEach(a => {
      html += `<tr><td class="fw-bold bg-light-subtle text-secondary text-start ps-3">${a.Value}</td>`;
      pots.forEach(p => {
        // ค้นหารールที่ตรงกับ Adoption และ Potentialคู่นี้
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
              <button class="btn btn-link btn-sm p-0 text-muted tiny text-decoration-none" onclick="window.editMatrixCell('${a.Value}', '${p.Value}', '${classification}')">
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

    const classes = ['A', 'B', 'C', 'D'];
    const updates = [];

    classes.forEach(c => {
      const input = document.getElementById(`targetInput_${c}`);
      if (input) {
        updates.push({
          Product_ID: productId,
          Classification: c,
          Target_Call: parseInt(input.value, 10) || 0,
          Frequency: window.matrixState.targetFrequency
        });
      }
    });

    window.showMatrixLoading(true);

    try {
      if (typeof supabase !== 'undefined') {
        // Upsert ลงตาราง target_calls
        const { error } = await supabase
          .from('target_calls')
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

  // Helper Toast & Loading
  window.showMatrixLoading = function(show) {
    const mainWorkspace = document.getElementById('matrixMainWorkspace');
    if (mainWorkspace) {
      if (show) mainWorkspace.style.opacity = '0.5';
      else mainWorkspace.style.opacity = '1';
    }
  };

  window.showMatrixToast = function(msg, type = 'info') {
    if (window.showToast) {
      window.showToast(msg, type);
    } else {
      alert(msg);
    }
  };

  // Auto Init เมื่อโหลดสคริปต์เสร็จ
  document.addEventListener('DOMContentLoaded', function() {
    window.initManageMatrixPage();
  });

})();
