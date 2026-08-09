// === admin.js ===
// 路徑：js/pages/admin.js
// 功能：系統管理者後台
// ⚠️ 已套用 CODE_STYLE.md 規範：escHtml / openModal/closeModal / renderPager / modal-scrollable
// ⚠️ 2026-08-05 修正：推薦計畫新增紀錄 Modal 加入 feedback（客戶反饋折扣）選項，
//    歷史紀錄表 typeLabel 改為三選一判斷（referral/bug_report/feedback）
// ⚠️ 2026-08-09 新增：客戶詳情 Modal 新增「初始化 Sheet」「發送通知信」功能
//    （對應後端 adminInitClientSheet / adminSendClientEmail / adminGetClientEmailLog）
// ⚠️ 2026-08-09 新增：客戶詳情新增 Webhook 網址欄位（Master Sheet O欄 webhook_url），
//    發信範本可帶入此網址供客戶貼到 LINE Developers Console 的 Webhook 設定
// ⚠️ 2026-08-09 修正：adminEditModal、sendEmailModal 補上 .modal-scrollable class，
//    避免內容超出視窗高度時無法捲動（CODE_STYLE.md 共用 Modal 樣式規範）

var _adminClients    = [];
var _referralProgramClients = [];
var _referralProgramLogs    = [];
var _adminFiltered   = [];
var _adminPage       = 1;
var _adminPageSize   = 15;
var _editingClientId = null;
var _adminTab        = 'clients';

var _sendEmailDefaultTemplate =
  '您好，\n\n' +
  '您的 J Cosmos 系統帳號已完成開通，登入資訊如下：\n\n' +
  '登入網址：https://superjcosmos.github.io/LINEBOTmain/\n' +
  '登入 Email：{email}\n\n' +
  '首次登入請至登入頁點選「忘記密碼？」設定您的密碼。\n\n' +
  '請至 LINE Developers Console →「Messaging API」分頁 → Webhook settings，' +
  '將下方網址貼入 Webhook URL 欄位，並開啟「Use webhook」：\n\n' +
  '{webhook_url}\n\n' +
  '如有任何問題，歡迎透過 LINE 官方帳號與我們聯繫。\n\n' +
  'J Cosmos 客服團隊';

async function loadAdmin() {
  setContent('<div class="loading">載入管理後台...</div>');
  var statsRes  = await apiCall({ action: 'adminGetOverallStats' });
  var clientRes = await apiCall({ action: 'adminGetClientList'  });

  if (!clientRes.success) {
    setContent('<div class="loading">載入失敗：' + escHtml(clientRes.message || '') + '</div>');
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
    '<strong>方案分佈：</strong>' + escHtml(planText) +
  '</div>' +

  '<div id="adminTabContent">' + _buildClientsTab() + '</div>' +
  _buildAdminModal() +
  _buildSendEmailModal();
}

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

async function _loadAdminReferral() {
  var tabContent = document.getElementById('adminTabContent');
  if (!tabContent) return;

  tabContent.innerHTML = '<div class="loading">載入推薦計畫...</div>';
  var res = await apiCall({ action: 'adminGetReferralProgramData' });
  if (!res.success) {
    tabContent.innerHTML = '<div class="loading">載入失敗：' + escHtml(res.message || '') + '</div>';
    return;
  }

  _referralProgramClients = res.data.clients || [];
  _referralProgramLogs    = res.data.logs    || [];

  var totalClients   = _referralProgramClients.length;
  var totalReferrals = _referralProgramLogs.filter(function(l) { return l.type === 'referral'; }).length;

  var clientRows = _referralProgramClients.map(function(c) {
    return '<tr>' +
      '<td>' + escHtml(c.client_id) + '</td>' +
      '<td>' + escHtml(c.company_name || '-') + '</td>' +
      '<td><span style="background:' + _planColor(c.plan) + ';color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">' + escHtml(_capitalize(c.plan)) + '</span></td>' +
      '<td style="text-align:center;font-weight:600;color:#06C755">' + c.referral_count + '</td>' +
      '<td style="text-align:center;font-weight:600;color:#f39c12">' + c.referral_credit + '</td>' +
    '</tr>';
  }).join('');

  var logRows = _referralProgramLogs.map(function(l) {
    var typeLabel = l.type === 'referral' ? '推薦成功'
      : l.type === 'feedback' ? '客戶反饋'
      : 'Bug 回報';
    return '<tr>' +
      '<td style="font-size:12px;color:#888">' + escHtml(l.time) + '</td>' +
      '<td>' + escHtml(typeLabel) + '</td>' +
      '<td>' + escHtml(l.referrer_client_id) + '</td>' +
      '<td>' + escHtml(l.related_client_id || '-') + '</td>' +
      '<td style="text-align:center">' + l.points + '</td>' +
      '<td style="text-align:center">' + l.balance_after + '</td>' +
      '<td style="font-size:12px;color:#888">' + escHtml(l.note || '-') + '</td>' +
    '</tr>';
  }).join('');

  tabContent.innerHTML =
    '<div class="card" style="margin-bottom:20px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
        '<div style="font-weight:600;font-size:15px">🎯 我的 SaaS 推薦計畫</div>' +
        '<button class="btn btn-primary" onclick="openReferralRecordModal()">+ 新增紀錄</button>' +
      '</div>' +
      '<div style="background:#f0f9f4;border-radius:8px;padding:14px;margin-bottom:20px;font-size:13px;color:#2d6a4f;border-left:4px solid #06C755">' +
        '<strong>運作方式：</strong>請被推薦客戶於 onboarding 表單填上推薦人客戶ID。實際是否算推薦成功、是否給予獎勵，由您人工確認後於此新增紀錄。' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:24px">' +
        _adminCard('目前客戶數', totalClients,   '🏢', '#1a1a2e') +
        _adminCard('推薦成功數', totalReferrals, '🎉', '#06C755') +
      '</div>' +
      '<div style="font-weight:600;font-size:14px;margin-bottom:12px">📋 客戶推薦點數</div>' +
      '<table class="table"><thead><tr>' +
        '<th>客戶ID</th><th>公司名稱</th><th>方案</th>' +
        '<th style="text-align:center">推薦成功次數</th><th style="text-align:center">目前推薦點數</th>' +
      '</tr></thead><tbody>' + (clientRows || '<tr><td colspan="5" class="empty">尚無客戶資料</td></tr>') + '</tbody></table>' +
    '</div>' +
    '<div class="card">' +
      '<div style="font-weight:600;font-size:14px;margin-bottom:12px">📜 推薦計畫歷史紀錄</div>' +
      '<table class="table"><thead><tr>' +
        '<th>時間</th><th>類型</th><th>推薦人</th><th>被推薦人</th>' +
        '<th style="text-align:center">點數</th><th style="text-align:center">餘額</th><th>備註</th>' +
      '</tr></thead><tbody>' + (logRows || '<tr><td colspan="7" class="empty">尚無紀錄</td></tr>') + '</tbody></table>' +
    '</div>' +
    _buildReferralRecordModal();
}

function _buildReferralRecordModal() {
  var options = _referralProgramClients.map(function(c) {
    return '<option value="' + escHtml(c.client_id) + '">' + escHtml(c.client_id + '　' + (c.company_name || '')) + '</option>';
  }).join('');

  return '<div class="modal-overlay" id="referralRecordModal">' +
    '<div class="modal" style="max-width:480px">' +
      '<h3>+ 新增推薦計畫紀錄</h3>' +
      '<div class="form-group"><label>類型</label>' +
        '<select id="refRecType">' +
          '<option value="referral">推薦成功（客戶A推薦客戶B）</option>' +
          '<option value="bug_report">Bug 回報獎勵</option>' +
          '<option value="feedback">客戶反饋折扣（早期試用一次性）</option>' +
        '</select></div>' +
      '<div class="form-group"><label>推薦人（獲得點數的客戶）</label>' +
        '<select id="refRecClientSelect" onchange="_populateRelatedOptions()">' + options + '</select></div>' +
      '<div class="form-group"><label>被推薦客戶ID（僅「推薦成功」需填寫）</label>' +
        '<select id="refRecRelated" onchange="_toggleRelatedManual()"></select>' +
        '<input type="text" id="refRecRelatedManual" placeholder="手動輸入客戶ID" style="display:none;margin-top:8px"></div>' +
      '<div class="form-group"><label>點數</label>' +
        '<input type="number" id="refRecPoints" placeholder="例如：1"></div>' +
      '<div class="form-group"><label>備註</label>' +
        '<textarea id="refRecNote" rows="2" placeholder="選填，例如：介紹餐飲業客戶成功簽約"></textarea></div>' +
      '<div class="modal-footer">' +
        '<button class="btn-cancel" onclick="closeModal(\'referralRecordModal\')">取消</button>' +
        '<button class="btn btn-primary" onclick="submitReferralRecord()">送出</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function _populateRelatedOptions() {
  var referrer = document.getElementById('refRecClientSelect').value;
  var matched  = _referralProgramClients.filter(function(c) {
    return c.referred_by === referrer;
  });

  var options = matched.map(function(c) {
    return '<option value="' + escHtml(c.client_id) + '">' + escHtml(c.client_id + '　' + (c.company_name || '')) + '</option>';
  }).join('');

  options += '<option value="__manual__">找不到／其他（手動輸入）</option>';

  var sel = document.getElementById('refRecRelated');
  sel.innerHTML = (matched.length ? options : '<option value="">此客戶目前無已知被推薦人</option>' + options);
  _toggleRelatedManual();
}

function _toggleRelatedManual() {
  var sel    = document.getElementById('refRecRelated');
  var manual = document.getElementById('refRecRelatedManual');
  manual.style.display = sel.value === '__manual__' ? 'block' : 'none';
}

function openReferralRecordModal() {
  document.getElementById('refRecType').value    = 'referral';
  document.getElementById('refRecPoints').value  = '';
  document.getElementById('refRecNote').value    = '';
  document.getElementById('refRecRelatedManual').value = '';
  _populateRelatedOptions();
  openModal('referralRecordModal');
}

function submitReferralRecord() {
  var type     = document.getElementById('refRecType').value;
  var referrer = document.getElementById('refRecClientSelect').value;
  var relatedSelect = document.getElementById('refRecRelated').value;
  var related  = relatedSelect === '__manual__'
    ? (document.getElementById('refRecRelatedManual').value || '').trim()
    : relatedSelect;
  var points   = parseInt(document.getElementById('refRecPoints').value, 10);
  var note     = (document.getElementById('refRecNote').value || '').trim();

  if (!referrer) { showToast('請選擇推薦人客戶', 'error'); return; }
  if (type === 'referral' && !related) { showToast('推薦成功需填寫被推薦客戶ID', 'error'); return; }
  if (!points) { showToast('請填寫點數', 'error'); return; }

  confirmAndRun('確定要新增這筆紀錄，並將 ' + points + ' 點寫入 ' + referrer + ' 的推薦點數餘額嗎？', async function() {
    var res = await apiCall({
      action:             'adminAddReferralRecord',
      type:               type,
      referrer_client_id: referrer,
      related_client_id:  related,
      points:             points,
      note:               note
    });
    if (res.success) {
      showToast('紀錄已新增，' + referrer + ' 新餘額：' + res.data.balance_after, 'success');
      closeModal('referralRecordModal');
      _loadAdminReferral();
    } else {
      showToast(res.message || '新增失敗', 'error');
    }
  });
}

async function _loadAdminSettings() {
  var tabContent = document.getElementById('adminTabContent');
  if (!tabContent) return;

  var contactRes = await apiCall({ action: 'getContactInfo' });
  var d          = contactRes.success ? (contactRes.data || {}) : {};

  tabContent.innerHTML =
    '<div class="card">' +
      '<div style="font-weight:600;font-size:15px;margin-bottom:8px">📬 登入頁聯絡資訊</div>' +
      '<p style="font-size:13px;color:#888;margin-bottom:16px">此資訊顯示在登入頁「聯絡我們」彈窗中。</p>' +
      '<div class="form-group"><label>Email</label>' +
        '<input type="email" id="settingEmail" value="' + escHtml(d.contact_email || '') + '" placeholder="your@email.com"></div>' +
      '<div class="form-group"><label>LINE（ID 或連結）</label>' +
        '<input type="text" id="settingLine" value="' + escHtml(d.contact_line || '') + '" placeholder="@jcosmos"></div>' +
      '<div class="form-group"><label>電話</label>' +
        '<input type="text" id="settingPhone" value="' + escHtml(d.contact_phone || '') + '" placeholder="0912-345-678"></div>' +
      '<div class="form-group"><label>備註（服務時間等）</label>' +
        '<textarea id="settingNote" rows="3" placeholder="例如：服務時間 週一至週五 09:00-18:00">' + escHtml(d.contact_note || '') + '</textarea></div>' +
      (d.updated_at ? '<p style="font-size:12px;color:#aaa;margin-bottom:12px">最後更新：' + escHtml(d.updated_at) + '</p>' : '') +
      '<button class="btn btn-primary" onclick="saveContactInfo()">儲存聯絡資訊</button>' +
    '</div>';
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
      '<td>' + statusDot + escHtml(c.client_id) + '</td>' +
      '<td>' + escHtml(c.company_name || '-') + '</td>' +
      '<td style="font-size:12px;color:#888">' + escHtml(c.email) + '</td>' +
      '<td><span style="background:' + _planColor(c.plan) + ';color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">' + escHtml(_capitalize(c.plan)) + '</span></td>' +
      '<td style="' + expireStyle + '">' + escHtml(c.expire_date || '-') + '</td>' +
      '<td style="text-align:center;font-weight:600;color:#06C755">' + (c.user_count || 0) + '</td>' +
      '<td style="font-size:11px;color:#aaa">' + escHtml(c.last_activity || '-') + '</td>' +
    '</tr>';
  }).join('');
  wrap.innerHTML =
    '<table class="table"><thead><tr>' +
      '<th>客戶ID</th><th>公司名稱</th><th>Email</th><th>方案</th>' +
      '<th>到期日</th><th style="text-align:center">LINE用戶數</th><th>最後互動</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function _renderAdminPager() {
  renderPager('adminPager', _adminFiltered.length, _adminPage, _adminPageSize, goAdminPage);
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

function _buildAdminModal() {
  return '<div class="modal-overlay" id="adminEditModal">' +
    '<div class="modal modal-scrollable" style="max-width:500px">' +
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
      '<div class="form-group"><label>Webhook 網址</label>' +
        '<input type="text" id="adminWebhookUrl" placeholder="該客戶專屬 GAS 專案的 Web App 部署網址"></div>' +
      '<div class="form-group"><label>推薦人客戶ID</label>' +
        '<input type="text" id="adminReferredBy" placeholder="例如：C002（來自開通表單，選填）"></div>' +
      '<div class="form-group"><label>狀態</label>' +
        '<select id="adminStatus">' +
          '<option value="active">Active（正常）</option>' +
          '<option value="inactive">Inactive（停用）</option>' +
        '</select></div>' +
      '<div class="modal-footer" style="justify-content:space-between;flex-wrap:wrap;gap:8px">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn" style="background:#3498db;color:#fff" onclick="impersonateClient()">👁 切換視角</button>' +
          '<button class="btn" style="background:#8e44ad;color:#fff" onclick="initClientSheetForCustomer()">🔧 初始化 Sheet</button>' +
          '<button class="btn" style="background:#2980b9;color:#fff" onclick="openSendEmailModal()">✉️ 發送通知信</button>' +
        '</div>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn btn-primary" onclick="saveAdminClient()">儲存</button>' +
          '<button class="btn-cancel" onclick="closeModal(\'adminEditModal\')">取消</button>' +
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
  document.getElementById('adminWebhookUrl').value  = c.webhook_url  || '';
  document.getElementById('adminReferredBy').value  = c.referred_by  || '';
  document.getElementById('adminStatus').value      = c.status       || 'active';
  var detailBox = document.getElementById('adminDetailStats');
  detailBox.innerHTML = '<div style="color:#aaa">載入中...</div>';
  openModal('adminEditModal');
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

async function saveAdminClient() {
  if (!_editingClientId) return;
  var res = await apiCall({
    action:           'adminUpdateClient',
    target_client_id: _editingClientId,
    company_name:     document.getElementById('adminCompanyName').value.trim(),
    plan:             document.getElementById('adminPlan').value,
    expire_date:      document.getElementById('adminExpireDate').value,
    webhook_url:      document.getElementById('adminWebhookUrl').value.trim(),
    referred_by:      document.getElementById('adminReferredBy').value.trim(),
    status:           document.getElementById('adminStatus').value
  });
  if (res.success) {
    showToast('客戶資料已更新', 'success');
    closeModal('adminEditModal');
    loadAdmin();
  } else {
    showToast(res.message || '更新失敗', 'error');
  }
}

// ────────────────────────────────────────────────────────────
// 初始化客戶 Sheet
// ────────────────────────────────────────────────────────────

function initClientSheetForCustomer() {
  if (!_editingClientId) return;
  confirmAndRun(
    '確定要為 ' + _editingClientId + ' 初始化 Sheet 嗎？\n此動作會在客戶的試算表中建立所需的工作表（已存在的分頁不會被覆蓋或清空）。',
    async function() {
      var res = await apiCall({ action: 'adminInitClientSheet', target_client_id: _editingClientId });
      if (res.success) {
        showToast(res.message || '初始化完成', 'success');
      } else {
        showToast(res.message || '初始化失敗', 'error');
      }
    }
  );
}

// ────────────────────────────────────────────────────────────
// 發送通知信給客戶
// ────────────────────────────────────────────────────────────

function _buildSendEmailModal() {
  return '<div class="modal-overlay" id="sendEmailModal">' +
    '<div class="modal modal-scrollable" style="max-width:520px">' +
      '<h3 id="sendEmailModalTitle">✉️ 發送通知信</h3>' +
      '<div class="form-group"><label>主旨</label>' +
        '<input type="text" id="emailSubject"></div>' +
      '<div class="form-group"><label>內容</label>' +
        '<textarea id="emailMessage" rows="8"></textarea></div>' +
      '<div id="emailLogList" style="margin-top:16px;max-height:180px;overflow-y:auto;font-size:12px;color:#888"></div>' +
      '<div class="modal-footer">' +
        '<button class="btn-cancel" onclick="closeModal(\'sendEmailModal\')">取消</button>' +
        '<button class="btn btn-primary" onclick="submitSendClientEmail()">送出</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

async function openSendEmailModal() {
  if (!_editingClientId) return;
  var c = _adminClients.find(function(x) { return x.client_id === _editingClientId; });
  document.getElementById('sendEmailModalTitle').textContent = '✉️ 發送通知信給 ' + (c ? (c.company_name || c.client_id) : _editingClientId);
  document.getElementById('emailSubject').value = 'J Cosmos 系統開通通知';
  var webhookText = (c && c.webhook_url) ? c.webhook_url : '⚠️ 尚未設定，請先至客戶詳情填入 Webhook 網址';
  document.getElementById('emailMessage').value = _sendEmailDefaultTemplate
    .replace('{email}', c ? c.email : '')
    .replace('{webhook_url}', webhookText);
  document.getElementById('emailLogList').innerHTML = '<div style="color:#aaa">載入寄送紀錄...</div>';
  openModal('sendEmailModal');

  var res = await apiCall({ action: 'adminGetClientEmailLog', target_client_id: _editingClientId });
  if (res.success && res.data.length) {
    document.getElementById('emailLogList').innerHTML =
      '<div style="font-weight:600;margin-bottom:6px">📜 過去寄送紀錄</div>' +
      res.data.map(function(l) {
        return '<div style="border-top:1px solid #eee;padding:6px 0">' +
          '<span style="color:#aaa">' + escHtml(l.time) + '</span>　' +
          escHtml(l.subject) +
        '</div>';
      }).join('');
  } else {
    document.getElementById('emailLogList').innerHTML = '<div style="color:#aaa">尚無寄送紀錄</div>';
  }
}

function submitSendClientEmail() {
  var subject = (document.getElementById('emailSubject').value || '').trim();
  var message = (document.getElementById('emailMessage').value || '').trim();
  if (!subject) { showToast('請填寫主旨', 'error'); return; }
  if (!message) { showToast('請填寫內容', 'error'); return; }

  confirmAndRun('確定要寄送這封通知信給 ' + _editingClientId + ' 嗎？', async function() {
    var res = await apiCall({
      action:            'adminSendClientEmail',
      target_client_id:  _editingClientId,
      subject:           subject,
      message:           message
    });
    if (res.success) {
      showToast(res.message || '已寄出', 'success');
      closeModal('sendEmailModal');
    } else {
      showToast(res.message || '寄送失敗', 'error');
    }
  });
}

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
  closeModal('adminEditModal');
  _showImpersonateBar(c.company_name || c.client_id);
  buildSidebarMenu();
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
    '<span>👁 目前以「' + escHtml(name) + '」的視角瀏覽中</span>' +
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
  var supportBtn = document.getElementById('sidebarSupportBtn');
  if (supportBtn) supportBtn.style.display = 'none';
  navigateTo('admin');
}

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
