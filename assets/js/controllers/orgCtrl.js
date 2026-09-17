/* =========================================================
   🏢 Organization Structure Controller (orgCtrl.js)
   ========================================================= */

(function () {
  // 🌟 Private State
  let globalBUs = [];
  let globalTeams = [];
  let globalTerritories = [];
  let globalProducts = [];
  let globalProductTeams = [];
  let currentHubTeamId = "";

  // 🚀 Initializer
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.forceReloadOrgData, 300);
  });

  // 🌟 Global Reload Data Pipeline
  window.forceReloadOrgData = async function () {
    try {
      const sb = window.supabaseClient || window.supabase;
      if (!sb) return;

      const [buRes, teamRes, terrRes, prodRes, ptRes] = await Promise.all([
        sb.from('BU').select('*').order('BU', { ascending: true }),
        sb.from('Team').select('*').order('Team', { ascending: true }),
        sb.from('Territory').select('*').order('Territory', { ascending: true }),
        sb.from('Products').select('*').order('Product', { ascending: true }),
        sb.from('Products_Team').select('*')
      ]);

      globalBUs = buRes.data || [];
      globalTeams = teamRes.data || [];
      globalTerritories = terrRes.data || [];
      globalProducts = prodRes.data || [];
      globalProductTeams = ptRes.data || [];

      renderTeamsHub();
      renderMasterTables();
      populateDropdowns();

    } catch (err) {
      console.error("❌ Error loading Org Data:", err.message);
      if (window.showToast) window.showToast("Failed to load organization data", "error");
    }
  };

  // 🌟 Tab Switching Handler
  window.switchOrgTab = function (targetTabId) {
    document.querySelectorAll('#orgTabs .nav-link').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.org-content .tab-pane').forEach(pane => {
      pane.classList.remove('show', 'active');
      pane.style.display = 'none';
    });

    const activeBtn = document.querySelector(`#orgTabs button[onclick*="${targetTabId}"]`);
    const activePane = document.getElementById(targetTabId);

    if (activeBtn) activeBtn.classList.add('active');
    if (activePane) {
      activePane.classList.add('show', 'active');
      activePane.style.display = 'flex';
    }
  };

  // 🌟 SubView View Switcher
  window.switchOrgSubView = function (targetViewId, module) {
    const views = {
      'team': ['teamListView', 'teamAddView', 'teamHubProfile'],
      'product': ['productListView', 'productAddView', 'productEditView'],
      'territory': ['territoryListView', 'territoryAddView', 'territoryEditView'],
      'bu': ['buListView', 'buAddView', 'buEditView']
    };

    if (views[module]) {
      views[module].forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('d-none');
      });
    }

    const targetEl = document.getElementById(targetViewId);
    if (targetEl) targetEl.classList.remove('d-none');

    if (targetViewId.includes('List')) {
      if (module === 'team') document.getElementById('addTeamName').value = '';
      if (module === 'product') document.getElementById('addProductName').value = '';
      if (module === 'territory') document.getElementById('addTerritoryName').value = '';
      if (module === 'bu') document.getElementById('addBuName').value = '';
    }
  };

  // 🛠️ Helper: User Email
  function getUserEmail() {
    try {
      const u = JSON.parse(sessionStorage.getItem('crmUser'));
      if (u && u.Email) return u.Email;
    } catch (e) {}
    return "User";
  }

  // 🌟 Dropdown Populator
  function populateDropdowns() {
    let buOptions = '<option value="">- Select BU -</option>';
    globalBUs.filter(b => b.Status === 'Active').forEach(b => {
      buOptions += `<option value="${b.BU_ID}">${b.BU}</option>`;
    });
    const addTeamBuEl = document.getElementById('addTeamBuId');
    if (addTeamBuEl) addTeamBuEl.innerHTML = buOptions;

    let teamOptions = '<option value="">- Unassigned / None -</option>';
    globalTeams.filter(t => t.Status === 'Active').forEach(t => {
      teamOptions += `<option value="${t.Team_ID}">${t.Team}</option>`;
    });

    const addTerrTeamEl = document.getElementById('addTerritoryTeamId');
    const editTerrTeamEl = document.getElementById('editTerritoryTeamId');
    if (addTerrTeamEl) addTerrTeamEl.innerHTML = teamOptions;
    if (editTerrTeamEl) editTerrTeamEl.innerHTML = teamOptions;
  }

  // ==================== 1. TEAMS HUB LOGIC ====================
  function renderTeamsHub() {
    const tbody = document.getElementById('hubTeamTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (globalTeams.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-muted">No teams available</td></tr>';
      return;
    }

    globalTeams.forEach(t => {
      const buObj = globalBUs.find(b => b.BU_ID === t.BU_ID);
      const buName = buObj ? buObj.BU : '-';
      const terrCount = globalTerritories.filter(tr => tr.Team_ID === t.Team_ID).length;
      const prodCount = globalProductTeams.filter(pt => pt.Team_ID === t.Team_ID).length;

      tbody.innerHTML += `
        <tr>
          <td class="text-start ps-3 fw-bold text-primary">${t.Team}</td>
          <td><span class="badge badge-soft-info">${buName}</span></td>
          <td class="text-secondary fw-medium">${terrCount} territories</td>
          <td class="text-secondary fw-medium">${prodCount} products</td>
          <td>
            <button class="btn btn-sm btn-outline-primary px-3 rounded-pill shadow-xs" onclick="window.openTeamHub('${t.Team_ID}')">
              Manage <i class="fa-solid fa-arrow-right ms-1"></i>
            </button>
          </td>
        </tr>`;
    });
  }

  window.handleAddTeam = async function (e) {
    e.preventDefault();
    const payload = {
      Team: document.getElementById('addTeamName').value.trim(),
      BU_ID: document.getElementById('addTeamBuId').value,
      Status: 'Active',
      Whoupdated: getUserEmail()
    };
    try {
      const sb = window.supabaseClient || window.supabase;
      const { error } = await sb.from('Team').insert([payload]);
      if (error) throw error;

      window.switchOrgSubView('teamListView', 'team');
      await window.forceReloadOrgData();
      if (window.showToast) window.showToast("✅ Team created successfully!", "success");
    } catch (err) {
      alert("❌ Failed to create team: " + err.message);
    }
  };

  window.openTeamHub = function (teamId) {
    currentHubTeamId = teamId;
    const t = globalTeams.find(x => x.Team_ID === teamId);
    if (!t) return;

    document.getElementById('hubTeamName').innerText = t.Team;

    // BU Select
    let buHtml = '<option value="">- Unassigned -</option>';
    globalBUs.filter(b => b.Status === 'Active').forEach(b => {
      buHtml += `<option value="${b.BU_ID}" ${b.BU_ID === t.BU_ID ? 'selected' : ''}>${b.BU}</option>`;
    });
    document.getElementById('hubBuSelect').innerHTML = buHtml;

    // Team Products
    const myProdTeams = globalProductTeams.filter(pt => pt.Team_ID === teamId);
    let prodHtml = '';
    myProdTeams.forEach(pt => {
      const pInfo = globalProducts.find(p => p.Product_ID === pt.Product_ID);
      if (pInfo) {
        prodHtml += `
          <li class="list-group-item px-0 d-flex justify-content-between align-items-center border-0 py-1">
            <span class="fw-medium text-dark tiny"><i class="fa-solid fa-circle-check text-success me-1.5"></i>${pInfo.Product}</span>
            <button class="btn btn-sm btn-outline-danger border-0 py-0 px-1" onclick="window.removeProductFromTeam('${pt.Product_ID}')"><i class="fa-solid fa-trash-can"></i></button>
          </li>`;
      }
    });
    document.getElementById('hubProductList').innerHTML = prodHtml || '<li class="list-group-item text-muted border-0 px-0 text-center tiny">No products assigned</li>';

    // Team Territories
    const myTerrs = globalTerritories.filter(tr => tr.Team_ID === teamId);
    let terrHtml = '';
    myTerrs.forEach(tr => {
      terrHtml += `
        <li class="list-group-item px-0 d-flex justify-content-between align-items-center border-0 py-1">
          <span class="fw-medium text-dark tiny"><i class="fa-solid fa-location-dot text-warning me-1.5"></i>${tr.Territory}</span>
          <button class="btn btn-sm btn-outline-danger border-0 py-0 px-1" onclick="window.removeTerritoryFromTeam('${tr.Territory_ID}')"><i class="fa-solid fa-trash-can"></i></button>
        </li>`;
    });
    document.getElementById('hubTerritoryList').innerHTML = terrHtml || '<li class="list-group-item text-muted border-0 px-0 text-center tiny">No territories assigned</li>';

    // Add Product Dropdown
    let addProdHtml = '<option value="">- Add Product -</option>';
    globalProducts.filter(p => p.Status === 'Active' && !myProdTeams.some(pt => pt.Product_ID === p.Product_ID)).forEach(p => {
      addProdHtml += `<option value="${p.Product_ID}">${p.Product}</option>`;
    });
    document.getElementById('hubAddProductSelect').innerHTML = addProdHtml;

    // Add Territory Dropdown
    let addTerrHtml = '<option value="">- Add Territory -</option>';
    globalTerritories.filter(tr => tr.Status === 'Active' && tr.Team_ID !== teamId).forEach(tr => {
      addTerrHtml += `<option value="${tr.Territory_ID}">${tr.Territory}</option>`;
    });
    document.getElementById('hubAddTerritorySelect').innerHTML = addTerrHtml;

    window.switchOrgSubView('teamHubProfile', 'team');
  };

  window.updateTeamBU = async function () {
    const newBuId = document.getElementById('hubBuSelect').value;
    try {
      const sb = window.supabaseClient || window.supabase;
      const { error } = await sb.from('Team').update({ BU_ID: newBuId, Whoupdated: getUserEmail() }).eq('Team_ID', currentHubTeamId);
      if (error) throw error;

      await window.forceReloadOrgData();
      if (window.showToast) window.showToast("✅ BU association updated!", "success");
    } catch (err) {
      alert("❌ Update failed: " + err.message);
    }
  };

  window.addProductToTeam = async function () {
    const pId = document.getElementById('hubAddProductSelect').value;
    if (!pId) return;
    try {
      const sb = window.supabaseClient || window.supabase;
      const { error } = await sb.from('Products_Team').insert([{ Product_ID: pId, Team_ID: currentHubTeamId, Status: 'Active', Whoupdated: getUserEmail() }]);
      if (error) throw error;

      await window.forceReloadOrgData();
      window.openTeamHub(currentHubTeamId);
    } catch (err) {
      alert("❌ Failed to add product: " + err.message);
    }
  };

  window.removeProductFromTeam = async function (productId) {
    if (!confirm("Remove this product from the team?")) return;
    try {
      const sb = window.supabaseClient || window.supabase;
      await sb.from('Products_Team').delete().eq('Product_ID', productId).eq('Team_ID', currentHubTeamId);
      await window.forceReloadOrgData();
      window.openTeamHub(currentHubTeamId);
    } catch (err) {
      alert("❌ Removal failed");
    }
  };

  window.addTerritoryToTeam = async function () {
    const tId = document.getElementById('hubAddTerritorySelect').value;
    if (!tId) return;
    try {
      const sb = window.supabaseClient || window.supabase;
      const { error } = await sb.from('Territory').update({ Team_ID: currentHubTeamId, Whoupdated: getUserEmail() }).eq('Territory_ID', tId);
      if (error) throw error;

      await window.forceReloadOrgData();
      window.openTeamHub(currentHubTeamId);
    } catch (err) {
      alert("❌ Failed to add territory: " + err.message);
    }
  };

  window.removeTerritoryFromTeam = async function (territoryId) {
    if (!confirm("Remove this territory from the team?")) return;
    try {
      const sb = window.supabaseClient || window.supabase;
      await sb.from('Territory').update({ Team_ID: null }).eq('Territory_ID', territoryId);
      await window.forceReloadOrgData();
      window.openTeamHub(currentHubTeamId);
    } catch (err) {
      alert("❌ Removal failed");
    }
  };

  // ==================== 2. MASTER TABLES ====================
  function renderMasterTables() {
    // 2.1 Products
    let pBody = '';
    globalProducts.forEach(p => {
      const badge = p.Status === 'Active' ? 'badge-soft-success' : 'badge-soft-secondary';
      pBody += `
        <tr>
          <td class="text-start ps-3 fw-bold text-dark">${p.Product}</td>
          <td><span class="badge ${badge}">${p.Status}</span></td>
          <td><button class="btn btn-sm btn-outline-success py-0 px-2" onclick="window.openEditProduct('${p.Product_ID}')"><i class="fa-solid fa-pen-to-square me-1"></i>Edit</button></td>
        </tr>`;
    });
    const prodBodyEl = document.getElementById('productTableBody');
    if (prodBodyEl) prodBodyEl.innerHTML = pBody || '<tr><td colspan="3" class="py-3 text-muted">No products available</td></tr>';

    // 2.2 Territory
    let tBody = '';
    globalTerritories.forEach(t => {
      const badge = t.Status === 'Active' ? 'badge-soft-success' : 'badge-soft-secondary';
      const teamObj = globalTeams.find(tm => tm.Team_ID === t.Team_ID);
      const teamStr = teamObj ? teamObj.Team : '<span class="text-danger tiny fw-semibold">Unassigned</span>';
      tBody += `
        <tr>
          <td class="text-start ps-3 fw-bold text-dark">${t.Territory}</td>
          <td>${teamStr}</td>
          <td><span class="badge ${badge}">${t.Status}</span></td>
          <td><button class="btn btn-sm btn-outline-warning text-dark py-0 px-2" onclick="window.openEditTerritory('${t.Territory_ID}')"><i class="fa-solid fa-pen-to-square me-1"></i>Edit</button></td>
        </tr>`;
    });
    const terrBodyEl = document.getElementById('territoryTableBody');
    if (terrBodyEl) terrBodyEl.innerHTML = tBody || '<tr><td colspan="4" class="py-3 text-muted">No territories available</td></tr>';

    // 2.3 BU
    let bBody = '';
    globalBUs.forEach(b => {
      const badge = b.Status === 'Active' ? 'badge-soft-success' : 'badge-soft-secondary';
      bBody += `
        <tr>
          <td class="text-start ps-3 fw-bold text-dark">${b.BU}</td>
          <td><span class="badge ${badge}">${b.Status}</span></td>
          <td><button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="window.openEditBU('${b.BU_ID}')"><i class="fa-solid fa-pen-to-square me-1"></i>Edit</button></td>
        </tr>`;
    });
    const buBodyEl = document.getElementById('buTableBody');
    if (buBodyEl) buBodyEl.innerHTML = bBody || '<tr><td colspan="3" class="py-3 text-muted">No BUs available</td></tr>';
  }

  // ==== Products CRUD ====
  window.handleAddProduct = async function (e) {
    e.preventDefault();
    try {
      const sb = window.supabaseClient || window.supabase;
      await sb.from('Products').insert([{ Product: document.getElementById('addProductName').value.trim(), Status: 'Active', Whoupdated: getUserEmail() }]);
      window.switchOrgSubView('productListView', 'product');
      await window.forceReloadOrgData();
    } catch (err) { alert("❌ Error: " + err.message); }
  };

  window.openEditProduct = function (id) {
    const p = globalProducts.find(x => x.Product_ID === id);
    if (p) {
      document.getElementById('editProductId').value = p.Product_ID;
      document.getElementById('editProductName').value = p.Product;
      document.getElementById('editProductStatus').value = p.Status;
      window.switchOrgSubView('productEditView', 'product');
    }
  };

  window.handleEditProduct = async function (e) {
    e.preventDefault();
    try {
      const sb = window.supabaseClient || window.supabase;
      await sb.from('Products').update({ Product: document.getElementById('editProductName').value.trim(), Status: document.getElementById('editProductStatus').value, Whoupdated: getUserEmail() }).eq('Product_ID', document.getElementById('editProductId').value);
      window.switchOrgSubView('productListView', 'product');
      await window.forceReloadOrgData();
    } catch (err) { alert("❌ Error: " + err.message); }
  };

  // ==== Territory CRUD ====
  window.handleAddTerritory = async function (e) {
    e.preventDefault();
    const tId = document.getElementById('addTerritoryTeamId').value;
    try {
      const sb = window.supabaseClient || window.supabase;
      await sb.from('Territory').insert([{ Territory: document.getElementById('addTerritoryName').value.trim(), Team_ID: tId || null, Status: 'Active', Whoupdated: getUserEmail() }]);
      window.switchOrgSubView('territoryListView', 'territory');
      await window.forceReloadOrgData();
    } catch (err) { alert("❌ Error: " + err.message); }
  };

  window.openEditTerritory = function (id) {
    const t = globalTerritories.find(x => x.Territory_ID === id);
    if (t) {
      document.getElementById('editTerritoryId').value = t.Territory_ID;
      document.getElementById('editTerritoryName').value = t.Territory;
      document.getElementById('editTerritoryTeamId').value = t.Team_ID || "";
      document.getElementById('editTerritoryStatus').value = t.Status;
      window.switchOrgSubView('territoryEditView', 'territory');
    }
  };

  window.handleEditTerritory = async function (e) {
    e.preventDefault();
    const tId = document.getElementById('editTerritoryTeamId').value;
    try {
      const sb = window.supabaseClient || window.supabase;
      await sb.from('Territory').update({ Territory: document.getElementById('editTerritoryName').value.trim(), Team_ID: tId || null, Status: document.getElementById('editTerritoryStatus').value, Whoupdated: getUserEmail() }).eq('Territory_ID', document.getElementById('editTerritoryId').value);
      window.switchOrgSubView('territoryListView', 'territory');
      await window.forceReloadOrgData();
    } catch (err) { alert("❌ Error: " + err.message); }
  };

  // ==== BU CRUD ====
  window.handleAddBU = async function (e) {
    e.preventDefault();
    try {
      const sb = window.supabaseClient || window.supabase;
      await sb.from('BU').insert([{ BU: document.getElementById('addBuName').value.trim(), Status: 'Active', Whoupdated: getUserEmail() }]);
      window.switchOrgSubView('buListView', 'bu');
      await window.forceReloadOrgData();
    } catch (err) { alert("❌ Error: " + err.message); }
  };

  window.openEditBU = function (id) {
    const b = globalBUs.find(x => x.BU_ID === id);
    if (b) {
      document.getElementById('editBuId').value = b.BU_ID;
      document.getElementById('editBuName').value = b.BU;
      document.getElementById('editBuStatus').value = b.Status;
      window.switchOrgSubView('buEditView', 'bu');
    }
  };

  window.handleEditBU = async function (e) {
    e.preventDefault();
    try {
      const sb = window.supabaseClient || window.supabase;
      await sb.from('BU').update({ BU: document.getElementById('editBuName').value.trim(), Status: document.getElementById('editBuStatus').value, Whoupdated: getUserEmail() }).eq('BU_ID', document.getElementById('editBuId').value);
      window.switchOrgSubView('buListView', 'bu');
      await window.forceReloadOrgData();
    } catch (err) { alert("❌ Error: " + err.message); }
  };

})();
