// matrixCtrl.js
var globalMatrixList = [];
var globalTargetList = []; 
var globalProductsForMatrix = [];
var isMatrixDataLoaded = false;
var isMatrixEditMode = false;

var dynamicAdoptionOpts = [];
var dynamicPotentialOpts = [];
var dynamicClassOpts = [];

var potentialSortOrder = ['No', 'Low', 'Medium', 'High'];
var adoptionSortOrder = ['High', 'Medium-High', 'Medium', 'Medium-Low', 'Low', 'Non User'];

function customSortOptions(optionsArray, templateArray) {
  const lowerTemplate = templateArray.map(v => v.toLowerCase());
  return optionsArray.sort((a, b) => {
    let indexA = lowerTemplate.indexOf(a.toLowerCase());
    let indexB = lowerTemplate.indexOf(b.toLowerCase());
    if(indexA === -1) indexA = 999;
    if(indexB === -1) indexB = 999;
    if(indexA !== indexB) return indexA - indexB;
    return a.localeCompare(b); 
  });
}

// โหลดข้อมูลครั้งแรกเมื่อรันสคริปต์นี้
setTimeout(async function() {
  await loadInitialDataForMatrix();
}, 300);

function switchMatrixView(viewId) {
  const views = ['matrixListView', 'matrixFormView'];
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.classList.add('d-none');
  });
  const target = document.getElementById(viewId);
  if(target) target.classList.remove('d-none');
}

async function loadInitialDataForMatrix() {
  try {
    const [prodRes, typeRes, idxRes] = await Promise.all([
      supabaseClient.from('Products').select('Product_ID, Product').eq('Status', 'Active'),
      supabaseClient.from('IndexType').select('*'),
      supabaseClient.from('Index').select('*').order('Value', { ascending: true })
    ]);

    if (prodRes.error) throw prodRes.error;
    if (typeRes.error) throw typeRes.error;
    if (idxRes.error) throw idxRes.error;

    globalProductsForMatrix = prodRes.data || [];
    let pOptions = '<option value="">- เลือกสินค้า -</option>';
    let pfOptions = '<option value="">- เลือกสินค้าเพื่อเริ่มตั้งค่า -</option>';
    globalProductsForMatrix.forEach(p => { 
      pOptions += `<option value="${p.Product_ID}">${p.Product}</option>`;
      pfOptions += `<option value="${p.Product_ID}">${p.Product}</option>`;
    });
    document.getElementById('matrixProduct').innerHTML = pOptions;
    document.getElementById('filterMatrixProduct').innerHTML = pfOptions;

    const types = typeRes.data || [];
    const indexes = idxRes.data || [];

    const adoptType = types.find(t => t.Name.toLowerCase() === 'adoption');
    const potType = types.find(t => t.Name.toLowerCase() === 'potential');
    const classType = types.find(t => t.Name.toLowerCase() === 'classification');

    let rawAdopt = adoptType ? indexes.filter(i => i.IndexType_ID === adoptType.IndexType_ID).map(i => i.Value) : [];
    let rawPot = potType ? indexes.filter(i => i.IndexType_ID === potType.IndexType_ID).map(i => i.Value) : [];
    
    dynamicAdoptionOpts = customSortOptions(rawAdopt, adoptionSortOrder);
    dynamicPotentialOpts = customSortOptions(rawPot, potentialSortOrder);
    dynamicClassOpts = classType ? indexes.filter(i => i.IndexType_ID === classType.IndexType_ID).map(i => i.Value) : [];

    let adoptHtml = '<option value="">- เลือก -</option>'; dynamicAdoptionOpts.forEach(v => adoptHtml += `<option value="${v}">${v}</option>`);
    let potHtml = '<option value="">- เลือก -</option>'; dynamicPotentialOpts.forEach(v => potHtml += `<option value="${v}">${v}</option>`);
    let classHtml = '<option value="">- เลือก -</option>'; dynamicClassOpts.forEach(v => classHtml += `<option value="${v}">${v}</option>`);
    
    document.getElementById('matrixAdopt').innerHTML = adoptHtml;
    document.getElementById('matrixPot').innerHTML = potHtml;
    document.getElementById('matrixClass').innerHTML = classHtml;

    loadData();
  } catch (err) {
    console.error("Error loading initial data:", err.message);
  }
}

async function loadData() {
  isMatrixDataLoaded = false;
  try {
    const [matrixRes, targetRes] = await Promise.all([
      supabaseClient.from('Rating_Matrix').select('*'),
      supabaseClient.from('Target').select('*')
    ]);

    if (matrixRes.error) throw matrixRes.error;
    if (targetRes.error) throw targetRes.error;

    globalMatrixList = matrixRes.data.map(m => {
      const prodInfo = globalProductsForMatrix.find(p => p.Product_ID === m.Product_ID);
      return {
        compositeId: `${m.Product_ID}|${m.Adoption}|${m.Potential}`,
        productId: m.Product_ID,
        productName: prodInfo ? prodInfo.Product : m.Product_ID,
        adoption: m.Adoption,
        potential: m.Potential,
        classification: m.Classification
      };
    });

    globalTargetList = targetRes.data || [];

    isMatrixDataLoaded = true;
    filterMatrix();
  } catch (err) {
    console.error(err);
    document.getElementById('matrixTableBody').innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">❌ โหลดข้อมูลไม่สำเร็จ: ${err.message}</td></tr>`;
  }
}

function filterMatrix() {
  if (!isMatrixDataLoaded) return;
  const prodTerm = document.getElementById('filterMatrixProduct').value;
  const visualWrapper = document.getElementById('visualMatrixWrapper');
  const tableWrapper = document.getElementById('tableMatrixWrapper');
  const tbody = document.getElementById('matrixTableBody');

  if (prodTerm !== "") {
    visualWrapper.classList.remove('d-none');
    tableWrapper.classList.add('d-none');
    renderVisualMatrixGrid(prodTerm);
    renderTargetInputs(prodTerm); 
  } else {
    visualWrapper.classList.add('d-none');
    tableWrapper.classList.remove('d-none');
    tbody.innerHTML = '';
    
    if(!globalMatrixList.length) return tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">ยังไม่มีข้อมูลในระบบ</td></tr>';

    globalMatrixList.forEach(m => {
      const color = getClassificationColor(m.classification);
      const targetData = globalTargetList.find(t => t.Product_ID === m.productId && t.Classification === m.classification);
      const targetCall = targetData ? targetData.Target : '-';
      
      tbody.innerHTML += `
        <tr>
          <td class="text-start fw-medium">${m.productName}</td>
          <td>${m.adoption}</td>
          <td>${m.potential}</td>
          <td><span class="badge fs-6" style="background-color: ${color.bg}; color: ${color.text};">${m.classification}</span></td>
          <td class="fw-bold text-primary">${targetCall}</td>
          <td><button class="btn btn-sm btn-outline-primary" onclick="openEditMatrixView('${m.compositeId}')">แก้ไข</button></td>
        </tr>`;
    });
  }
}

function renderVisualMatrixGrid(productId) {
  const prodInfo = globalProductsForMatrix.find(p => p.Product_ID === productId);
  document.getElementById('visualMatrixTitle').innerHTML = `<i class="fa-solid fa-border-all me-2"></i>1. โครงสร้างเงื่อนไขลูกค้า: <span class="text-dark">${prodInfo ? prodInfo.Product : 'Unknown'}</span>`;
  
  let html = '<table class="table table-borderless text-center align-middle mb-0" style="min-width: 700px;">';
  const numPotCols = dynamicPotentialOpts.length;
  const numAdoptRows = dynamicAdoptionOpts.length;
  
  html += '<tr><td colspan="2"></td>';
  html += `<td colspan="${numPotCols}" class="fw-bold fs-5 text-dark pb-2" style="letter-spacing: 1px;">Potential</td></tr>`;

  html += '<tr><td colspan="2" style="width: 20%; padding: 10px;"></td>'; 
  const colWidth = 80 / (numPotCols || 1);
  dynamicPotentialOpts.forEach(pot => {
    html += `<td style="width: ${colWidth}%; padding: 10px;"><div class="matrix-axis-label">${pot}</div></td>`;
  });
  html += '</tr>';

  dynamicAdoptionOpts.forEach((adopt, index) => {
    html += '<tr>';
    if (index === 0) {
      html += `<td rowspan="${numAdoptRows}" class="fw-bold fs-5 text-dark px-0" style="writing-mode: vertical-rl; transform: rotate(180deg); text-align: center; width: 5%; letter-spacing: 1px;">Adoption</td>`;
    }
    html += `<td style="width: 15%; padding: 10px;"><div class="matrix-axis-label">${adopt}</div></td>`;
    
    dynamicPotentialOpts.forEach(pot => {
      const record = globalMatrixList.find(m => m.productId === productId && m.adoption === adopt && m.potential === pot);
      if (record) {
        const color = getClassificationColor(record.classification);
        
        // 🌟 ดึงข้อมูล Target มาโชว์มุมขวาบน
        const targetObj = globalTargetList.find(t => t.Product_ID === productId && t.Classification === record.classification);
        const targetNum = (targetObj && targetObj.Target !== null && targetObj.Target !== undefined) ? targetObj.Target : '-';
        const targetBadge = `<span class="position-absolute top-0 end-0 m-1 badge bg-light text-dark shadow-sm border border-secondary" style="font-size: 0.7rem; z-index: 5;" title="Target Call">🎯 ${targetNum}</span>`;

        html += `
        <td style="padding: 10px;">
          <div class="matrix-box" onclick="openEditMatrixView('${record.compositeId}')">
            <div class="matrix-top position-relative" style="background-color: ${color.bg}; color: ${color.text};">
              ${targetBadge}
              <h5 class="fw-bold mb-0">${record.classification}</h5>
            </div>
            <div class="matrix-bottom" title="${adopt} / ${pot}"><i class="fa-solid fa-pen fa-xs me-1"></i> ${adopt} + ${pot}</div>
          </div>
        </td>`;
      } else {
        html += `
        <td style="padding: 10px;">
          <div class="matrix-empty-box" onclick="openAddMatrixViewPreFilled('${productId}', '${adopt}', '${pot}')">
            <span><i class="fa-solid fa-plus d-block mb-1 fs-5"></i> เพิ่ม</span>
          </div>
        </td>`;
      }
    });
    html += '</tr>';
  });
  html += '</table>';
  document.getElementById('visualMatrixContainer').innerHTML = html;
}

function renderTargetInputs(productId) {
  const container = document.getElementById('targetInputContainer');
  let html = '';

  dynamicClassOpts.forEach(cls => {
    const targetData = globalTargetList.find(t => t.Product_ID === productId && t.Classification === cls);
    const val = (targetData && targetData.Target !== null) ? targetData.Target : '';
    const color = getClassificationColor(cls);

    html += `
      <div class="d-flex align-items-center bg-white p-3 border shadow-sm" style="border-radius: 12px; min-width: 200px; flex: 1;">
        <span class="badge fs-4 me-3" style="background-color: ${color.bg}; color: ${color.text}; width: 50px;">${cls}</span>
        <div class="flex-grow-1">
          <label class="text-muted small fw-bold mb-1">Target Call</label>
          <input type="number" class="form-control target-input" data-class="${cls}" value="${val}" min="0" placeholder="0">
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

async function saveTargetCalls() {
  const prodId = document.getElementById('filterMatrixProduct').value;
  if(!prodId) return alert("กรุณาเลือกสินค้าก่อนครับ");

  const btn = document.getElementById('btnSaveTarget');
  btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>บันทึก...`;

  let crmUser = null;
  try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}

  const inputs = document.querySelectorAll('.target-input');
  const payload = [];

  inputs.forEach(inp => {
    const val = inp.value.trim();
    if(val !== "") {
      payload.push({
        Product_ID: prodId,
        Classification: inp.getAttribute('data-class'),
        Target: parseInt(val, 10),
        Whoupdated: crmUser ? crmUser.Email : "Unknown"
      });
    }
  });

  try {
    await supabaseClient.from('Target').delete().eq('Product_ID', prodId);
    if(payload.length > 0) {
      const { error } = await supabaseClient.from('Target').insert(payload);
      if (error) throw error;
    }
    alert("✅ บันทึกเป้าหมายการเข้าพบ (Target Call) สำเร็จ");
    await loadData(); 
  } catch(err) {
    alert("❌ บันทึก Target ไม่สำเร็จ: " + err.message);
  } finally {
    btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-save me-2"></i>บันทึก Target`;
  }
}

function getClassificationColor(cls) {
  const val = String(cls).trim().toUpperCase();
  if (val === 'A' || val.includes('P1') || val === '1') return { bg: '#c0392b', text: '#ffffff' }; 
  if (val === 'B' || val.includes('P2') || val === '2') return { bg: '#e67e22', text: '#ffffff' }; 
  if (val === 'C' || val.includes('P3') || val === '3') return { bg: '#f39c12', text: '#ffffff' }; 
  if (val === 'D' || val.includes('P4') || val === '4') return { bg: '#fadbd8', text: '#555555' }; 
  return { bg: '#34495e', text: '#ffffff' }; 
}

function openAddMatrixViewPreFilled(prodId, adopt, pot) {
  openAddMatrixView();
  setTimeout(() => {
    document.getElementById('matrixProduct').value = prodId;
    document.getElementById('matrixAdopt').value = adopt;
    document.getElementById('matrixPot').value = pot;
  }, 50);
}

function openAddMatrixView() {
  isMatrixEditMode = false;
  document.getElementById('matrixFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle me-2"></i>เพิ่มเงื่อนไข Matrix ใหม่';
  document.getElementById('matrixForm').reset();
  const currentFilter = document.getElementById('filterMatrixProduct').value;
  if (currentFilter) document.getElementById('matrixProduct').value = currentFilter;
  switchMatrixView('matrixFormView');
}

function openEditMatrixView(compositeId) {
  const m = globalMatrixList.find(x => x.compositeId === compositeId);
  if (!m) return;
  isMatrixEditMode = true;
  document.getElementById('matrixFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square me-2"></i>แก้ไขเงื่อนไข Matrix';
  
  document.getElementById('editMatrixOldProduct').value = m.productId;
  document.getElementById('editMatrixOldAdopt').value = m.adoption;
  document.getElementById('editMatrixOldPot').value = m.potential;
  
  document.getElementById('matrixProduct').value = m.productId;
  document.getElementById('matrixAdopt').value = m.adoption;
  document.getElementById('matrixPot').value = m.potential;
  document.getElementById('matrixClass').value = m.classification;
  switchMatrixView('matrixFormView');
}

async function handleSaveMatrix(e) {
  e.preventDefault();
  const btn = document.getElementById('submitMatrixBtn');
  btn.disabled = true; btn.innerHTML = "กำลังบันทึก...";

  let crmUser = null;
  try { crmUser = JSON.parse(sessionStorage.getItem('crmUser')); } catch(err) {}

  const newProductId = document.getElementById('matrixProduct').value;
  const newAdopt = document.getElementById('matrixAdopt').value;
  const newPot = document.getElementById('matrixPot').value;
  const newClass = document.getElementById('matrixClass').value;

  const payload = {
    Product_ID: newProductId,
    Adoption: newAdopt,
    Potential: newPot,
    Classification: newClass,
    Whoupdated: crmUser ? crmUser.Email : "Unknown"
  };

  try {
    if (isMatrixEditMode) {
      const oldProductId = document.getElementById('editMatrixOldProduct').value;
      const oldAdopt = document.getElementById('editMatrixOldAdopt').value;
      const oldPot = document.getElementById('editMatrixOldPot').value;

      if (oldProductId !== newProductId || oldAdopt !== newAdopt || oldPot !== newPot) {
        await supabaseClient.from('Rating_Matrix').delete().eq('Product_ID', oldProductId).eq('Adoption', oldAdopt).eq('Potential', oldPot);
        const { error } = await supabaseClient.from('Rating_Matrix').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabaseClient.from('Rating_Matrix').update({ Classification: newClass, Whoupdated: payload.Whoupdated }).eq('Product_ID', oldProductId).eq('Adoption', oldAdopt).eq('Potential', oldPot);
        if (error) throw error;
      }
    } else {
      const { error } = await supabaseClient.from('Rating_Matrix').insert([payload]);
      if (error) {
        if (error.code === '23505') throw new Error("มีการกำหนดเงื่อนไขสินค้านี้ซ้ำ (Adoption และ Potential คู่เดิม)");
        throw error;
      }
    }

    document.getElementById('filterMatrixProduct').value = newProductId;
    switchMatrixView('matrixListView');
    loadData(); 
  } catch (err) {
    alert("❌ บันทึกไม่สำเร็จ: " + err.message);
  } finally {
    btn.disabled = false; btn.innerHTML = "บันทึกเงื่อนไข";
  }
}
