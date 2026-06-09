// === admin.js ===
// 路徑：js/pages/admin.js
// 功能：系統管理者後台
//   - 全系統統計 KPI
//   - 所有客戶清單（搜尋、狀態燈號、到期警示）
//   - 點擊客戶查看詳情 + 編輯 Modal
//   - 以客戶身份切換視角（impersonate）

var _adminClients   = [];
var _adminFiltered  = [];
var _adminPage      = 1;
var _adminPageSize  = 15;
var _editingClientId = null;

// ────────────────────────────────────────────────────────────
// 主入口
// ────────────────────────────────────────────────────────────
async function loadAdmin() {
  setContent('<div class="loading">載入管理後台...</div>');
  var statsRes  = await apiCall({ action: 'adminGetOverallStats' });
  var clientRes = await apiCall({ action: 'adminGetClientList'  });

  if (!clientRes.success) { setContent('<div class="loading">載入失敗：' + (clientRes.message || '') + '</div>'); return; }

  var stats   = statsRes.success  ? (statsRes.data  || {}) : {};
  _adminClients  = Array.isArray(clientRes.data) ? clientRes.data : [];
  _adminFiltered = _adminClients.slice();
  _adminPage     = 1;

  setContent(_buildAdminPage(stats));
  _renderAdminTable();
  _renderAdminPager();
}

// ────────────────────────────────────────────────────────────
// 頁面骨架
// ────────────────────────────────────────────────────────────
function _buildAdminPage(stats) {
  var planBreakdown = stats.plan_breakdown || {};
  var planText = Object.keys(planBreakdown).map(function(k) {
    return k + '：' + planBreakdown[k] + ' 位';
  }).join('　|　') || '-';

  return '' +
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
    '<h2 class="page-title" style="margin-bottom:0">🛡️ 系統管理後台</h2>' +
  '</div>' +

  // ── KPI 卡片 ──
  '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">' +
    _adminCard('總客戶數',    stats.total_clients  || 0, '🏢', '#1a1a2e') +
    _adminCard('使用中',      stats.active_clients || 0, '✅', '#06C755') +
    _adminCard('已到期',      stats.expired_count  || 0, '⏰', '#e74c3c') +
    _adminCard('合計 LINE 用戶', stats.total_users || 0, '👥', '#3498db') +
  '</div>' +

  // ── 方案分佈 ──
  '<div class="card" style="padding:12px 16px;margin-bottom:20px;font-size:13px;color:#555">' +
    '<strong>方案分佈：</strong>' + _esc(planText) +
  '</div>' +

  // ── 客戶清單 ──
  '<div class="card">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
      '<div style="font-weight:600;font-size:15px">📋 客戶清單</div>' +
      '<input type="text" id="adminSearch" placeholder="搜尋客戶ID / Email / 公司名稱"' +
        ' oninput="filterAdmin()"' +
        ' style="padding:7px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;outline:none;width:260px">' +
    '</div>' +
    '<span id="adminTotalHint" style="color:#888;font-size:12px;display:block;margin-bottom:8px"></span>' +
    '<div id="adminTableWrap"></div>' +
    '<div id="adminPager" style="display:flex;justify-content:center;gap:6px;margin-top:12px;flex-wrap:wrap"></div>' +
  '</div>' +

  // ── 詳情 / 編輯 Modal ──
  '<div class="modal-overlay" id="adminEditModal">' +
    '<div class="modal" style="max-width:500px">' +
      '<h3 id="adminModalTitle">客戶詳情</h3>' +

      '<div id="adminDetailStats" style="background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;color:#555;display:grid;grid-template-columns:1fr 1fr;gap:6px"></div>' +

      '<div class="form-group">' +
        '<label>公司名稱</label>' +
        '<input type="text" id="adminCompanyName" placeholder="例如：JCosmos 股份有限公司">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>方案</label>' +
        '<select id="adminPlan">' +
          '<option value="basic">basic</option>' +
          '<option value="pro">pro</option>' +
          '<option value="enterprise">enterprise</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>到期日</label>' +
        '<input type="date" id="adminExpireDate">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>狀態</label>' +
        '<select id="adminStatus">' +
          '<option value="active">active（正常）</option>' +
          '<option value="inactive">inactive（停用）</option>' +
        '</select>' +
      '</div>' +

      '<div class="modal-footer" style="justify-content:space-between">' +
        '<button class="btn" style="background:#3498db;color:#fff" onclick="impersonateClient()">👁 切換視角</button>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn-cancel" onclick="closeAdminModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="saveAdminClient()">儲存</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function _adminCard(label, value, icon, color) {
  return '<div class="card" style="text-align:center;padding:16px 12px">' +
    '<div style="font-size:24px;margin-bottom:6px">' + icon + '</div>' +
    '<div style="font-size:26px;font-weight:700;color:' + color + '">' + value + '</div>' +
    '<div style="font-size:12px;color:#888;margin-top:4px">' + label + '</div>' +
  '</div>';
}

// ────────────────────────────────────────────────────────────
// 表格渲染
// ────────────────────────────────────────────────────────────
function _renderAdminTable() {
  var wrap = document.getElementById('adminTableWrap');
  var hint = document.getElementById('adminTotalHint');
  if (!wrap) return;

  var total = _adminFiltered.length;
  if (hint) hint.textContent = '共 ' + total + ' 位客戶';
  if (total === 0) { wrap.innerHTML = '<p class="empty">尚無客戶資料</p>'; return; }

  var start = (_adminPage - 1) * _adminPageSize;
  var page  = _adminFiltered.slice(start, Math.min(start + _adminPageSize, total));

  var rows = page.map(function(c, li) {
    var absIdx = start + li;

    // 狀態燈號
    var statusDot = c.status === 'active'
      ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#06C755;margin-right:5px"></span>'
      : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#e74c3c;margin-right:5px"></span>';

    // 到期警示
    var expireText = c.expire_date || '-';
    var expireStyle = c.is_expired ? 'color:#e74c3c;font-weight:600' : '';

    // 方案標籤色
    var planColors = { basic: '#95a5a6', pro: '#3498db', enterprise: '#9b59b6' };
    var planColor  = planColors[c.plan] || '#95a5a6';

    return '<tr onclick="openAdminDetail(' + absIdx + ')" style="cursor:pointer">' +
      '<td>' + statusDot + _esc(c.client_id) + '</td>' +
      '<td>' + _esc(c.company_name || '-') + '</td>' +
      '<td style="font-size:12px;color:#888">' + _esc(c.email) + '</td>' +
      '<td><span style="background:' + planColor + ';color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">' +
        _esc(c.plan) + '</span></td>' +
      '<td style="' + expireStyle + '">' + expireText + '</td>' +
      '<td style="text-align:center;font-weight:600;color:#06C755">' + (c.user_count || 0) + '</td>' +
      '<td style="font-size:11px;color:#aaa">' + (c.last_activity || '-') + '</td>' +
    '</tr>';
  }).join('');

  wrap.innerHTML =
    '<table class="table"><thead><tr>' +
      '<th>客戶ID</th><th>公司名稱</th><th>Email</th><th>方案</th>' +
      '<th>到期日</th><th style="text-align:center">LINE用戶數</th><th>最後互動</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function _renderAdminPager() {
  var pager = document.getElementById('adminPager');
  if (!pager) return;
  var totalPages = Math.ceil(_adminFiltered.length / _adminPageSize);
  if (totalPages <= 1) { pager.innerHTML = ''; return; }
  var btns = '';
  for (var p = 1; p <= totalPages; p++) {
    var active = p === _adminPage
      ? 'background:#1a1a2e;color:#fff;'
      : 'background:#f0f0f0;color:#444;';
    btns += '<button onclick="goAdminPage(' + p + ')" ' +
      'style="' + active + 'border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px">' +
      p + '</button>';
  }
  pager.innerHTML = btns;
}

function goAdminPage(p) { _adminPage = p; _renderAdminTable(); _renderAdminPager(); }

function filterAdmin() {
  var kw = (document.getElementById('adminSearch').value || '').trim().toLowerCase();
  _adminFiltered = kw
    ? _adminClients.filter(function(c) {
        return (c.client_id    || '').toLowerCase().includes(kw) ||
               (c.email        || '').toLowerCase().includes(kw) ||
               (c.company_name || '').toLowerCase().includes(kw);
      })
    : _adminClients.slice();
  _adminPage = 1;
  _renderAdminTable();
  _renderAdminPager();
}

// ────────────────────────────────────────────────────────────
// 詳情 Modal
// ────────────────────────────────────────────────────────────
async function openAdminDetail(idx) {
  var c = _adminFiltered[idx];
  if (!c) return;
  _editingClientId = c.client_id;

  // 填入基本欄位
  document.getElementById('adminModalTitle').textContent = '客戶：' + (c.company_name || c.client_id);
  document.getElementById('adminCompanyName').value = c.company_name || '';
  document.getElementById('adminPlan').value        = c.plan         || 'basic';
  document.getElementById('adminExpireDate').value  = (c.expire_date || '').replace(/\//g, '-');
  document.getElementById('adminStatus').value      = c.status       || 'active';

  // 載入詳細統計
  var detailBox = document.getElementById('adminDetailStats');
  detailBox.innerHTML = '<div style="color:#aaa">載入中...</div>';
  document.getElementById('adminEditModal').style.display = 'flex';

  var res = await apiCall({ action: 'adminGetClientDetail', target_client_id: c.client_id });
  if (res.success) {
    var s = res.data.stats || {};
    detailBox.innerHTML =
      '<div>👥 LINE 用戶：<strong>' + (s.user_count      || 0) + '</strong></div>' +
      '<div>💬 自動回覆：<strong>' + (s.reply_count     || 0) + '</strong></div>' +
      '<div>🎯 受眾群組：<strong>' + (s.audience_count  || 0) + '</strong></div>' +
      '<div>📢 推播次數：<strong>' + (s.broadcast_count || 0) + '</strong></div>' +
      '<div>🎫 推薦成功：<strong>' + (s.referral_count  || 0) + '</strong></div>';
  } else {
    detailBox.innerHTML = '<div style="color:#e74c3c">統計載入失敗</div>';
  }
}

function closeAdminModal() {
  document.getElementById('adminEditModal').style.display = 'none';
  _editingClientId = null;
}

// ────────────────────────────────────────────────────────────
// 儲存客戶修改
// ────────────────────────────────────────────────────────────
async function saveAdminClient() {
  if (!_editingClientId) return;
  var res = await apiCall({
    action:            'adminUpdateClient',
    target_client_id:  _editingClientId,
    company_name:      document.getElementById('adminCompanyName').value.trim(),
    plan:              document.getElementById('adminPlan').value,
    expire_date:       document.getElementById('adminExpireDate').value,
    status:            document.getElementById('adminStatus').value
  });
  if (res.success) {
    showToast('客戶資料已更新', 'success');
    closeAdminModal();
    loadAdmin(); // 重新整理清單
  } else {
    showToast(res.message || '更新失敗', 'error');
  }
}

// ────────────────────────────────────────────────────────────
// 切換視角：以該客戶身份進入後台瀏覽
// ────────────────────────────────────────────────────────────
function impersonateClient() {
  if (!_editingClientId) return;
  var c = _adminClients.find(function(x) { return x.client_id === _editingClientId; });
  if (!c) return;

  // 暫存原 admin 資訊，以便還原
  localStorage.setItem('adminBackup_token',   authState.sessionToken);
  localStorage.setItem('adminBackup_clientId', authState.clientId);
  localStorage.setItem('adminBackup_email',    authState.email);
  localStorage.setItem('adminBackup_role',     authState.role);

  // 切換為目標客戶身份（前端視角）
  authState.clientId     = c.client_id;
  authState.email        = c.email;
  authState.plan         = c.plan;
  authState.role         = 'client_preview'; // 特殊 role，表示預覽模式
  authState.company_name = c.company_name || c.client_id;
  localStorage.setItem('clientId',     c.client_id);
  localStorage.setItem('email',        c.email);
  localStorage.setItem('plan',         c.plan);
  localStorage.setItem('role',         'client_preview');
  localStorage.setItem('company_name', c.company_name || c.client_id);

  closeAdminModal();

  // 顯示「返回管理後台」按鈕
  _showImpersonateBar(c.company_name || c.client_id);

  // 重建側邊欄（顯示客戶頁面），進入儀表板
  buildSidebarMenu();
  navigateTo('dashboard');
}

// ── 預覽模式頂部提示條 ──
function _showImpersonateBar(name) {
  var existing = document.getElementById('impersonateBar');
  if (existing) existing.remove();

  var bar = document.createElement('div');
  bar.id  = 'impersonateBar';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;' +
    'background:#e67e22;color:#fff;text-align:center;padding:8px 16px;font-size:13px;font-weight:600;' +
    'display:flex;align-items:center;justify-content:center;gap:16px;';
  bar.innerHTML =
    '<span>👁 目前以「' + _esc(name) + '」的視角瀏覽中</span>' +
    '<button onclick="exitImpersonate()" ' +
      'style="background:#fff;color:#e67e22;border:none;padding:4px 14px;border-radius:6px;cursor:pointer;font-weight:600">' +
      '返回管理後台' +
    '</button>';
  document.body.prepend(bar);
}

function exitImpersonate() {
  // 還原 admin 身份
  authState.sessionToken = localStorage.getItem('adminBackup_token')    || authState.sessionToken;
  authState.clientId     = localStorage.getItem('adminBackup_clientId') || authState.clientId;
  authState.email        = localStorage.getItem('adminBackup_email')    || authState.email;
  authState.role         = localStorage.getItem('adminBackup_role')     || 'admin';
  authState.company_name = '';
  localStorage.setItem('sessionToken', authState.sessionToken);
  localStorage.setItem('clientId',     authState.clientId);
  localStorage.setItem('email',        authState.email);
  localStorage.setItem('role',         authState.role);
  localStorage.removeItem('adminBackup_token');
  localStorage.removeItem('adminBackup_clientId');
  localStorage.removeItem('adminBackup_email');
  localStorage.removeItem('adminBackup_role');

  var bar = document.getElementById('impersonateBar');
  if (bar) bar.remove();

  buildSidebarMenu();
  navigateTo('admin');
}

function _esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
