// === admin.js ===
// 路徑：js/pages/admin.js
// 功能：系統管理者後台
// ⚠️ 更新：新增系統設定 Tab（客服留言管理 + 聯絡資訊設定）

var _adminClients    = [];
var _adminFiltered   = [];
var _adminPage       = 1;
var _adminPageSize   = 15;
var _editingClientId = null;
var _adminTab        = 'clients';

async function loadAdmin() {
  setContent('<div class="loading">載入管理後台...</div>');
  var statsRes  = await apiCall({ action: 'adminGetOverallStats' });
  var clientRes = await apiCall({ action: 'adminGetClientList'  });

  if (!clientRes.success) {
    setContent('<div class="loading">載入失敗：' + (clientRes.message || '') + '</div>');
    return;
  }

  var stats = statsRes.success ? (statsRes.data || {}) : {};
  _adminClients  = Array.isArray(clientRes.data) ? clientRes.data : [];
  _adminFiltered = _adminClients.slice();
  _adminPage     = 1;
  _adminTab      = 'clients';

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
    return _capitalize(k) + '：' + planBreakdown[k] + ' 位';
  }).join('　|　') || '-';

  return '' +
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
    '<h2 class="page-title" style="margin-bottom:0">🛡️ 系統管理後台</h2>' +
    '<div style="display:flex;gap:8px">' +
      '<button id="tabClients"  onclick="switchAdminTab(\'clients\')"  ' +
        'style="padding:8px 18px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600;background:#1a1a2e;color:#fff">客戶管理</button>' +
      '<button id="tabReferral" onclick="switchAdminTab(\'referral\')" ' +
        'style="padding:8px 18px;border-radius:8px;border:1.5px solid #e0e0e0;cursor:pointer;font-size:13px;font-weight:600;background:#fff;color:#444">推薦計畫</button>' +
      '<button id="tabSettings" onclick="switchAdminTab(\'settings\')" ' +
        'style="padding:8px 18px;border-radius:8px;border:1.5px solid #e0e0e0;cursor:pointer;font-size:13px;font-weight:600;background:#fff;color:#444">系統設定</button>' +
    '</div>' +
  '</div>' +

  '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">' +
    _adminCard('總客戶數',       stats.total_clients  || 0, '🏢', '#1a1a2e') +
    _adminCard('使用中',         stats.active_clients || 0, '✅', '#06C755') +
    _adminCard('已到期',         stats.expired_count  || 0, '⏰', '#e74c3c') +
    _adminCard('合計 LINE 用戶', stats.total_users    || 0, '👥', '#3498db') +
  '</div>' +

  '<div class="card" style="padding:12px 16px;margin-bottom:20px;font-size:13px;color:#555">' +
    '<strong>方案分佈：</strong>' + _esc(planText) +
  '</div>' +

  '<div id="adminTabContent">' + _buildClientsTab() + '</div>' +
  _buildAdminModal();
}

// ────────────────────────────────────────────────────────────
// Tab 切換
// ────────────────────────────────────────────────────────────
function switchAdminTab(tab) {
  _adminTab = tab;
  var tabContent   = document.getElementById('adminTabContent');
  if (!tabContent) return;

  var btnClients  = document.getElementById('tabClients');
  var btnReferral = document.getElementById('tabReferral');
  var btnSettings = document.getElementById('tabSettings');

  var activeStyle   = 'padding:8px 18px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600;background:#1a1a2e;color:#fff';
  var inactiveStyle = 'padding:8px 18px;border-radius:8px;border:1.5px solid #e0e0e0;cursor:pointer;font-size:13px;font-weight:600;background:#fff;color:#444';

  if (btnClients)  btnClients.style.cssText  = tab === 'clients'  ? activeStyle : inactiveStyle;
  if (btnReferral) btnReferral.style.cssText = tab === 'referral' ? activeStyle : inactiveStyle;
  if (btnSettings) btnSettings.style.cssText = tab === 'settings' ? activeStyle : inactiveStyle;

  if (tab === 'clients') {
    tabContent.innerHTML = _buildClientsTab();
    _renderAdminTable();
    _renderAdminPager();
  } else if (tab === 'referral') {
    tabContent.innerHTML = '<div class="loading">載入推薦計畫...</div>';
    _loadAdminReferral();
  } else if (tab === 'settings') {
    tabContent.innerHTML = '<div class="loading">載入系統設定...</div>';
    _loadAdminSettings();
  }
}

// ────────────────────────────────────────────────────────────
// Tab 1：客戶清單
// ────────────────────────────────────────────────────────────
function _buildClientsTab() {
  return '<div class="card">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
      '<div style="font-weight:600;font-size:15px">📋 客戶清單</div>' +
      '<input type="text" id="adminSearch" placeholder="搜尋客戶ID / Email / 公司名稱"' +
        ' oninput="filterAdmin()"' +
        ' style="padding:7px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;outline:none;width:260px">' +
    '</div>' +
    '<span id="adminTotalHint" style="color:#888;font-size:12px;display:block;margin-bottom:8px"></span>' +
    '<div id="adminTableWrap"></div>' +
    '<div id="adminPager" style="display:flex;justify-content:center;gap:6px;margin-top:12px;flex-wrap:wrap"></div>' +
  '</div>';
}

// ────────────────────────────────────────────────────────────
// Tab 2：推薦計畫
// ────────────────────────────────────────────────────────────
async function _loadAdminReferral() {
  var tabContent   = document.getElementById('adminTabContent');
  if (!tabContent) return;
  var totalClients = _adminClients.filter(function(c) { return c.role !== 'admin'; }).length;

  tabContent.innerHTML =
    '<div class="card" style="margin-bottom:20px">' +
      '<div style="font-weight:600;font-size:15px;margin-bottom:16px">🎯 我的 SaaS 推薦計畫</div>' +
      '<div style="background:#f0f9f4;border-radius:8px;padding:14px;margin-bottom:20px;font-size:13px;color:#2d6a4f;border-left:4px solid #06C755">' +
        '<strong>運作方式：</strong>為每位客戶產生一組推薦連結，當他們推薦新客戶成功開通，雙方皆可獲得你設定的獎勵。' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px">' +
        _adminCard('目前客戶數', totalClients, '🏢', '#1a1a2e') +
        _adminCard('推薦成功數', 0,            '🎉', '#06C755') +
        _adminCard('待開通',     0,            '⏳', '#f39c12') +
      '</div>' +
      '<div style="font-weight:600;font-size:14px;margin-bottom:12px">📋 客戶推薦連結管理</div>' +
      '<table class="table"><thead><tr>' +
        '<th>客戶ID</th><th>公司名稱</th><th>方案</th><th style="text-align:center">推薦連結</th><th style="text-align:center">操作</th>' +
      '</tr></thead><tbody>' +
      _adminClients.filter(function(c) { return c.role !== 'admin'; }).map(function(c) {
        var refUrl = 'https://superjcosmos.github.io/LINEBOTmain/?ref=' + encodeURIComponent(c.client_id);
        return '<tr>' +
          '<td>' + _esc(c.client_id) + '</td>' +
          '<td>' + _esc(c.company_name || '-') + '</td>' +
          '<td><span style="background:' + _planColor(c.plan) + ';color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">' + _capitalize(c.plan) + '</span></td>' +
          '<td style="text-align:center"><span style="font-size:11px;color:#888;font-family:monospace">?ref=' + _esc(c.client_id) + '</span></td>' +
          '<td style="text-align:center"><button onclick="copyRefLink(\'' + _esc(refUrl) + '\')" style="background:#06C755;color:#fff;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px">複製連結</button></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>' +
      '<div style="margin-top:20px;padding:14px;background:#f8f9fa;border-radius:8px;font-size:12px;color:#888">' +
        '💡 <strong>未來可擴充：</strong>自動偵測 ?ref= 參數 → 記錄推薦來源 → 開通後自動給予推薦獎勵' +
      '</div>' +
    '</div>';
}

function copyRefLink(url) {
  navigator.clipboard.writeText(url).then(function() {
    showToast('推薦連結已複製！', 'success');
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast('推薦連結已複製！', 'success');
  });
}

// ────────────────────────────────────────────────────────────
// Tab 3：系統設定（客服留言 + 聯絡資訊）
// ────────────────────────────────────────────────────────────
async function _loadAdminSettings() {
  var tabContent = document.getElementById('adminTabContent');
  if (!tabContent) return;

  var contactRes = await apiCall({ action: 'getContactInfo' });
  var supportRes = await apiCall({ action: 'getSupportLog', status: 'all' });
  var d          = contactRes.success ? (contactRes.data || {}) : {};
  var tickets    = supportRes.success && Array.isArray(supportRes.data) ? supportRes.data : [];
  var pending    = tickets.filter(function(t) { return t.status === 'pending'; }).length;

  window._allTickets = tickets;

  tabContent.innerHTML =

    // ── 聯絡資訊設定 ──
    '<div class="card">' +
      '<div style="font-weight:600;font-size:15px;margin-bottom:8px">📬 登入頁聯絡資訊</div>' +
      '<p style="font-size:13px;color:#888;margin-bottom:16px">此資訊顯示在登入頁「聯絡我們」彈窗中。</p>' +
      '<div class="form-group"><label>Email</label>' +
        '<input type="email" id="settingEmail" value="' + _esc(d.contact_email || '') + '" placeholder="your@email.com"></div>' +
      '<div class="form-group"><label>LINE（ID 或連結）</label>' +
        '<input type="text" id="settingLine" value="' + _esc(d.contact_line || '') + '" placeholder="@jcosmos"></div>' +
      '<div class="form-group"><label>電話</label>' +
        '<input type="text" id="settingPhone" value="' + _esc(d.contact_phone || '') + '" placeholder="0912-345-678"></div>' +
      '<div class="form-group"><label>備註（服務時間等）</label>' +
        '<textarea id="settingNote" rows="3" placeholder="例如：服務時間 週一至週五 09:00-18:00">' + _esc(d.contact_note || '') + '</textarea></div>' +
      (d.updated_at ? '<p style="font-size:12px;color:#aaa;margin-bottom:12px">最後更新：' + _esc(d.updated_at) + '</p>' : '') +
      '<button class="btn btn-primary" onclick="saveContactInfo()">儲存聯絡資訊</button>' +
    '</div>';
}

function _renderTickets(tickets) {
  if (!tickets || tickets.length === 0) return '<p class="empty">尚無留言</p>';
  return tickets.map(function(t) {
    var statusBadge = t.status === 'replied'
      ? '<span style="background:#06C755;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">已回覆</span>'
      : '<span style="background:#e74c3c;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">待回覆</span>';
    return '<div style="border:1.5px solid #e8e8e8;border-radius:10px;padding:14px;margin-bottom:10px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
        '<div style="font-weight:600;font-size:13px">' + _esc(t.subject) + '</div>' +
        statusBadge +
      '</div>' +
      '<div style="font-size:12px;color:#888;margin-bottom:8px">' +
        _esc(t.company || t.client_id) + '　|　' + _esc(t.email) + '　|　' + _esc(t.time) +
      '</div>' +
      '<div style="font-size:13px;color:#555;line-height:1.6;background:#f8f9fa;padding:10px;border-radius:6px;margin-bottom:10px">' +
        _esc(t.message) +
      '</div>' +
      (t.reply
        ? '<div style="background:#f0f9f4;padding:10px;border-radius:6px;border-left:3px solid #06C755;font-size:13px;margin-bottom:8px">' +
            '<div style="color:#06C755;font-size:11px;font-weight:600;margin-bottom:4px">✅ 已回覆（' + _esc(t.reply_at) + '）</div>' +
            _esc(t.reply) +
          '</div>'
        : '') +
      (t.status !== 'replied'
        ? '<div style="display:flex;gap:8px;align-items:center">' +
            '<input type="text" id="replyInput_' + _esc(t.id) + '" placeholder="輸入回覆內容..."' +
              ' style="flex:1;padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:6px;font-size:13px;outline:none">' +
            '<button onclick="sendReply(\'' + _esc(t.id) + '\')"' +
              ' style="background:#06C755;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;white-space:nowrap">' +
              '送出回覆' +
            '</button>' +
          '</div>'
        : '') +
    '</div>';
  }).join('');
}

function _filterSupport(status) {
  var all      = window._allTickets || [];
  var filtered = status === 'all' ? all : all.filter(function(t) { return t.status === status; });
  var list     = document.getElementById('supportTicketList');
  if (list) list.innerHTML = _renderTickets(filtered);
  ['All','Pending','Replied'].forEach(function(s) {
    var btn = document.getElementById('sf' + s);
    if (!btn) return;
    var isActive = s.toLowerCase() === status;
    btn.style.background = isActive ? '#1a1a2e' : '#fff';
    btn.style.color      = isActive ? '#fff'    : '#444';
  });
}

async function sendReply(ticketId) {
  var input = document.getElementById('replyInput_' + ticketId);
  var reply = input ? input.value.trim() : '';
  if (!reply) { showToast('請填寫回覆內容', 'error'); return; }
  var res = await apiCall({ action: 'replySupport', id: ticketId, reply: reply });
  if (res.success) {
    showToast(res.data.message || '回覆已送出', 'success');
    _loadAdminSettings();
  } else {
    showToast(res.message || '回覆失敗', 'error');
  }
}

async function saveContactInfo() {
  var res = await apiCall({
    action:        'saveContactInfo',
    contact_email: (document.getElementById('settingEmail').value  || '').trim(),
    contact_line:  (document.getElementById('settingLine').value   || '').trim(),
    contact_phone: (document.getElementById('settingPhone').value  || '').trim(),
    contact_note:  (document.getElementById('settingNote').value   || '').trim()
  });
  if (res.success) {
    showToast('聯絡資訊已儲存', 'success');
    _loadAdminSettings();
  } else {
    showToast(res.message || '儲存失敗', 'error');
  }
}

// ────────────────────────────────────────────────────────────
// 客戶清單表格渲染
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
  var rows  = page.map(function(c, li) {
    var absIdx    = start + li;
    var statusDot = c.status === 'active'
      ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#06C755;margin-right:5px"></span>'
      : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#e74c3c;margin-right:5px"></span>';
    var expireStyle = c.is_expired ? 'color:#e74c3c;font-weight:600' : '';
    return '<tr onclick="openAdminDetail(' + absIdx + ')" style="cursor:pointer">' +
      '<td>' + statusDot + _esc(c.client_id) + '</td>' +
      '<td>' + _esc(c.company_name || '-') + '</td>' +
      '<td style="font-size:12px;color:#888">' + _esc(c.email) + '</td>' +
      '<td><span style="background:' + _planColor(c.plan) + ';color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">' + _capitalize(c.plan) + '</span></td>' +
      '<td style="' + expireStyle + '">' + (c.expire_date || '-') + '</td>' +
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
    var active = p === _adminPage ? 'background:#1a1a2e;color:#fff;' : 'background:#f0f0f0;color:#444;';
    btns += '<button onclick="goAdminPage(' + p + ')" style="' + active + 'border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px">' + p + '</button>';
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
function _buildAdminModal() {
  return '<div class="modal-overlay" id="adminEditModal">' +
    '<div class="modal" style="max-width:500px">' +
      '<h3 id="adminModalTitle">客戶詳情</h3>' +
      '<div id="adminDetailStats" style="background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;color:#555;display:grid;grid-template-columns:1fr 1fr;gap:6px"></div>' +
      '<div class="form-group"><label>公司名稱</label><input type="text" id="adminCompanyName"></div>' +
      '<div class="form-group"><label>方案</label>' +
        '<select id="adminPlan">' +
          '<option value="basic">Basic</option>' +
          '<option value="pro">Pro</option>' +
          '<option value="enterprise">Enterprise</option>' +
          '<option value="trial">Trial</option>' +
        '</select></div>' +
      '<div class="form-group"><label>到期日</label><input type="date" id="adminExpireDate"></div>' +
      '<div class="form-group"><label>狀態</label>' +
        '<select id="adminStatus">' +
          '<option value="active">Active（正常）</option>' +
          '<option value="inactive">Inactive（停用）</option>' +
        '</select></div>' +
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

async function openAdminDetail(idx) {
  var c = _adminFiltered[idx];
  if (!c) return;
  _editingClientId = c.client_id;
  document.getElementById('adminModalTitle').textContent = '客戶：' + (c.company_name || c.client_id);
  document.getElementById('adminCompanyName').value = c.company_name || '';
  document.getElementById('adminPlan').value        = c.plan         || 'basic';
  document.getElementById('adminExpireDate').value  = (c.expire_date || '').replace(/\//g, '-');
  document.getElementById('adminStatus').value      = c.status       || 'active';
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

async function saveAdminClient() {
  if (!_editingClientId) return;
  var res = await apiCall({
    action:           'adminUpdateClient',
    target_client_id: _editingClientId,
    company_name:     document.getElementById('adminCompanyName').value.trim(),
    plan:             document.getElementById('adminPlan').value,
    expire_date:      document.getElementById('adminExpireDate').value,
    status:           document.getElementById('adminStatus').value
  });
  if (res.success) {
    showToast('客戶資料已更新', 'success');
    closeAdminModal();
    loadAdmin();
  } else {
    showToast(res.message || '更新失敗', 'error');
  }
}

// ────────────────────────────────────────────────────────────
// 切換視角
// ────────────────────────────────────────────────────────────
function impersonateClient() {
  if (!_editingClientId) return;
  var c = _adminClients.find(function(x) { return x.client_id === _editingClientId; });
  if (!c) return;
  localStorage.setItem('adminBackup_token',    authState.sessionToken);
  localStorage.setItem('adminBackup_clientId', authState.clientId);
  localStorage.setItem('adminBackup_email',    authState.email);
  localStorage.setItem('adminBackup_role',     authState.role);
  authState.clientId     = c.client_id;
  authState.email        = c.email;
  authState.plan         = c.plan;
  authState.role         = 'client_preview';
  authState.company_name = c.company_name || c.client_id;
  localStorage.setItem('clientId',     c.client_id);
  localStorage.setItem('email',        c.email);
  localStorage.setItem('plan',         c.plan);
  localStorage.setItem('role',         'client_preview');
  localStorage.setItem('company_name', c.company_name || c.client_id);
  closeAdminModal();
  _showImpersonateBar(c.company_name || c.client_id);
  buildSidebarMenu();
  // impersonateClient() 裡，buildSidebarMenu() 之後加入
  var supportBtn = document.getElementById('sidebarSupportBtn');
  if (supportBtn) supportBtn.style.display = 'block';
  navigateTo('dashboard');
}

function _showImpersonateBar(name) {
  var existing = document.getElementById('impersonateBar');
  if (existing) existing.remove();
  var bar = document.createElement('div');
  bar.id  = 'impersonateBar';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#e67e22;color:#fff;' +
    'text-align:center;padding:8px 16px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:16px;';
  bar.innerHTML =
    '<span>👁 目前以「' + _esc(name) + '」的視角瀏覽中</span>' +
    '<button onclick="exitImpersonate()" style="background:#fff;color:#e67e22;border:none;padding:4px 14px;border-radius:6px;cursor:pointer;font-weight:600">返回管理後台</button>';
  document.body.prepend(bar);
}

function exitImpersonate() {
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
  // exitImpersonate() 裡，buildSidebarMenu() 之後加入
  var supportBtn = document.getElementById('sidebarSupportBtn');
  if (supportBtn) supportBtn.style.display = 'none';
  navigateTo('admin');
}

// ────────────────────────────────────────────────────────────
// 工具函式
// ────────────────────────────────────────────────────────────
function _capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function _planColor(plan) {
  var colors = { basic: '#95a5a6', pro: '#3498db', enterprise: '#9b59b6', trial: '#e67e22' };
  return colors[(plan || '').toLowerCase()] || '#95a5a6';
}

function _adminCard(label, value, icon, color) {
  return '<div class="card" style="text-align:center;padding:16px 12px">' +
    '<div style="font-size:24px;margin-bottom:6px">' + icon + '</div>' +
    '<div style="font-size:26px;font-weight:700;color:' + color + '">' + value + '</div>' +
    '<div style="font-size:12px;color:#888;margin-top:4px">' + label + '</div>' +
  '</div>';
}

function _esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
