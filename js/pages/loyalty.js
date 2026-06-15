// ============================================================
// js/pages/loyalty.js
// 功能：點數卡管理頁（精靈式設定 + 會員點數查詢 + 記錄）
// ============================================================

var _loyaltySettings  = {};
var _loyaltyUserAll   = [];
var _loyaltyUserFilt  = [];
var _loyaltyUserPage  = 1;
var _loyaltyPageSize  = 15;
var _loyaltyLogAll    = [];

async function loadLoyalty() {
  setContent('<div class="loading">載入點數卡管理...</div>');
  var settingRes = await apiCall({ action: 'getLoyaltySettings' });
  if (!settingRes.success) { setContent('<div class="loading">載入失敗</div>'); return; }

  _loyaltySettings = settingRes.data || {};
  var configured   = settingRes.configured;

  if (!configured || !_loyaltySettings.mode) {
    // 尚未設定 → 顯示精靈
    _renderLoyaltyWizard(1);
  } else {
    // 已設定 → 顯示主頁
    _renderLoyaltyMain();
  }
}

// ══════════════════════════════════════════
// 精靈式設定（Step 1 / 2 / 3）
// ══════════════════════════════════════════
var _wizardData = {};

function _renderLoyaltyWizard(step) {
  var steps = [
    { label: '選擇模式' },
    { label: '填寫規則' },
    { label: '設定關鍵字' }
  ];
  var dots = steps.map(function(s, i) {
    var active = i + 1 === step
      ? 'background:#534AB7;color:#fff;'
      : i + 1 < step
        ? 'background:#1D9E75;color:#fff;'
        : 'background:#e0e0e0;color:#999;';
    return '<div style="' + active + 'width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600">' + (i + 1) + '</div>' +
      '<div style="font-size:11px;color:#888;margin-top:4px;text-align:center">' + s.label + '</div>';
  }).join('<div style="flex:1;height:2px;background:#e0e0e0;margin:14px 4px 0"></div>');

  var body = '';
  if (step === 1) body = _wizardStep1();
  if (step === 2) body = _wizardStep2();
  if (step === 3) body = _wizardStep3();

  setContent(
    '<div style="max-width:560px;margin:0 auto">' +
      '<h2 class="page-title">點數卡設定</h2>' +
      '<div style="display:flex;align-items:flex-start;gap:0;margin-bottom:28px">' + dots + '</div>' +
      '<div class="card" style="padding:24px">' + body + '</div>' +
    '</div>'
  );
}

function _wizardStep1() {
  var modes = [
    { value: 'stamp',  icon: '⭐', title: '消費集點',   desc: '消費累積點數，集滿換獎勵' },
    { value: 'deduct', icon: '💳', title: '會員儲值',   desc: '預購點數，消費時扣點' },
    { value: 'both',   icon: '✨', title: '雙模式',     desc: '集點 + 儲值同時並用' }
  ];
  var cards = modes.map(function(m) {
    return '<div onclick="selectLoyaltyMode(\'' + m.value + '\')" id="mode_' + m.value + '" ' +
      'style="border:2px solid #e0e0e0;border-radius:12px;padding:18px;cursor:pointer;transition:border-color .2s">' +
      '<div style="font-size:28px;margin-bottom:8px">' + m.icon + '</div>' +
      '<div style="font-weight:600;font-size:15px;margin-bottom:4px">' + m.title + '</div>' +
      '<div style="font-size:13px;color:#888">' + m.desc + '</div>' +
    '</div>';
  }).join('');
  return '<div style="margin-bottom:20px"><div style="font-weight:600;font-size:16px;margin-bottom:16px">選擇點數卡模式</div>' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">' + cards + '</div></div>' +
    '<div style="text-align:right"><button class="btn btn-primary" onclick="wizardNext(2)">下一步 →</button></div>';
}

function selectLoyaltyMode(mode) {
  _wizardData.mode = mode;
  ['stamp','deduct','both'].forEach(function(m) {
    var el = document.getElementById('mode_' + m);
    if (el) el.style.borderColor = m === mode ? '#534AB7' : '#e0e0e0';
  });
}

function _wizardStep2() {
  var m = _wizardData.mode || '';
  var showStamp  = m === 'stamp'  || m === 'both';
  var showDeduct = m === 'deduct' || m === 'both';

  return '<div style="font-weight:600;font-size:16px;margin-bottom:16px">填寫規則</div>' +
    (showStamp
      ? '<div class="form-group">' +
          '<label>集滿幾點可兌換獎勵</label>' +
          '<input type="number" id="wStampGoal" min="1" max="9999" value="' + (_wizardData.stamp_goal || 10) + '">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>兌換成功訊息（LINE Bot 回傳給用戶）</label>' +
          '<textarea id="wRewardMsg" rows="3" placeholder="恭喜集滿！請出示此訊息兌換免費飲品一杯">' + (_wizardData.reward_msg || '') + '</textarea>' +
        '</div>'
      : '') +
    (showDeduct
      ? '<div class="form-group">' +
          '<label>點數有效天數（0 = 不限期）</label>' +
          '<input type="number" id="wExpireDays" min="0" value="' + (_wizardData.expire_days || 0) + '">' +
        '</div>'
      : '') +
    '<div style="display:flex;justify-content:space-between;margin-top:8px">' +
      '<button class="btn-cancel" onclick="_renderLoyaltyWizard(1)">← 上一步</button>' +
      '<button class="btn btn-primary" onclick="wizardNext(3)">下一步 →</button>' +
    '</div>';
}

function _wizardStep3() {
  var m = _wizardData.mode || '';
  var showStamp  = m === 'stamp'  || m === 'both';
  var showDeduct = m === 'deduct' || m === 'both';

  return '<div style="font-weight:600;font-size:16px;margin-bottom:4px">設定 LINE Bot 關鍵字</div>' +
    '<div style="font-size:13px;color:#888;margin-bottom:16px">用戶在 LINE 輸入這些關鍵字時觸發對應功能</div>' +
    '<div class="form-group"><label>查詢點數 關鍵字</label><input type="text" id="wCheckKw" placeholder="查點數" value="' + (_wizardData.check_keyword || '') + '"></div>' +
    (showStamp
      ? '<div class="form-group"><label>集點 關鍵字</label><input type="text" id="wStampKw" placeholder="集點" value="' + (_wizardData.stamp_keyword || '') + '"></div>' +
        '<div class="form-group"><label>兌換 關鍵字</label><input type="text" id="wRedeemKw" placeholder="兌換" value="' + (_wizardData.redeem_keyword || '') + '"></div>'
      : '') +
    (showDeduct
      ? '<div class="form-group"><label>扣點 關鍵字</label><input type="text" id="wDeductKw" placeholder="使用點數" value="' + (_wizardData.deduct_keyword || '') + '"></div>'
      : '') +
    '<div style="background:#fff8e1;border-radius:8px;padding:12px;font-size:13px;color:#856404;margin-bottom:16px">' +
      '⚠️ 啟用後模式無法更改，關鍵字可日後修改' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between">' +
      '<button class="btn-cancel" onclick="_renderLoyaltyWizard(2)">← 上一步</button>' +
      '<button class="btn btn-primary" onclick="saveLoyaltyWizard()">✅ 啟用點數卡</button>' +
    '</div>';
}

function wizardNext(step) {
  if (step === 2) {
    if (!_wizardData.mode) { showToast('請選擇模式', 'error'); return; }
  }
  if (step === 3) {
    var m = _wizardData.mode || '';
    if (m === 'stamp' || m === 'both') {
      _wizardData.stamp_goal  = parseInt(document.getElementById('wStampGoal').value) || 10;
      _wizardData.reward_msg  = (document.getElementById('wRewardMsg').value || '').trim();
      if (!_wizardData.reward_msg) { showToast('請填寫兌換成功訊息', 'error'); return; }
    }
    if (m === 'deduct' || m === 'both') {
      _wizardData.expire_days = parseInt(document.getElementById('wExpireDays').value) || 0;
    }
  }
  _renderLoyaltyWizard(step);
}

async function saveLoyaltyWizard() {
  var m = _wizardData.mode || '';
  var checkKw  = (document.getElementById('wCheckKw')  ? document.getElementById('wCheckKw').value  : '').trim();
  var stampKw  = (document.getElementById('wStampKw')  ? document.getElementById('wStampKw').value  : '').trim();
  var redeemKw = (document.getElementById('wRedeemKw') ? document.getElementById('wRedeemKw').value : '').trim();
  var deductKw = (document.getElementById('wDeductKw') ? document.getElementById('wDeductKw').value : '').trim();

  if (!checkKw) { showToast('請填寫查詢點數關鍵字', 'error'); return; }

  var res = await apiCall({
    action:          'saveLoyaltySettings',
    mode:            m,
    stamp_keyword:   stampKw,
    check_keyword:   checkKw,
    redeem_keyword:  redeemKw,
    deduct_keyword:  deductKw,
    stamp_goal:      _wizardData.stamp_goal  || 10,
    reward_msg:      _wizardData.reward_msg  || '',
    unit_cost:       _wizardData.unit_cost   || 0,
    expire_days:     _wizardData.expire_days || 0
  });

  if (res.success) {
    showToast('點數卡已啟用！', 'success');
    loadLoyalty();
  } else {
    showToast(res.message || '儲存失敗', 'error');
  }
}

// ══════════════════════════════════════════
// 主頁（已設定後）
// ══════════════════════════════════════════
async function _renderLoyaltyMain() {
  var userRes = await apiCall({ action: 'getLoyaltyUserList' });
  _loyaltyUserAll  = userRes.success ? (userRes.data || []) : [];
  _loyaltyUserFilt = _loyaltyUserAll.slice();
  _loyaltyUserPage = 1;

  var s     = _loyaltySettings;
  var modeLabel = s.mode === 'stamp' ? '消費集點' : s.mode === 'deduct' ? '會員儲值' : '雙模式';
  var modeColor = s.mode === 'stamp' ? '#D85A30' : s.mode === 'deduct' ? '#1D9E75' : '#534AB7';

  setContent(
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
      '<h2 class="page-title" style="margin:0">點數卡管理</h2>' +
    '</div>' +

    // 設定摘要
    '<div class="card" style="padding:16px 20px;margin-bottom:20px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<div style="font-weight:600">⚙ 目前設定</div>' +
        '<button class="btn btn-primary" onclick="openLoyaltySettingsModal()" style="font-size:12px;padding:5px 12px">編輯設定</button>' +
      '</div>' +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px">' +
        '<div style="background:#f5f5f5;border-radius:8px;padding:10px 14px">' +
          '<div style="color:#888;font-size:11px;margin-bottom:2px">模式</div>' +
          '<div style="font-weight:600;color:' + modeColor + '">' + modeLabel + '</div>' +
        '</div>' +
        '<div style="background:#f5f5f5;border-radius:8px;padding:10px 14px">' +
          '<div style="color:#888;font-size:11px;margin-bottom:2px">查點數關鍵字</div>' +
          '<div style="font-weight:600">' + _lEsc(s.check_keyword) + '</div>' +
        '</div>' +
        (s.stamp_keyword
          ? '<div style="background:#f5f5f5;border-radius:8px;padding:10px 14px">' +
              '<div style="color:#888;font-size:11px;margin-bottom:2px">集點關鍵字</div>' +
              '<div style="font-weight:600">' + _lEsc(s.stamp_keyword) + '</div>' +
            '</div>' : '') +
        (s.deduct_keyword
          ? '<div style="background:#f5f5f5;border-radius:8px;padding:10px 14px">' +
              '<div style="color:#888;font-size:11px;margin-bottom:2px">扣點關鍵字</div>' +
              '<div style="font-weight:600">' + _lEsc(s.deduct_keyword) + '</div>' +
            '</div>' : '') +
        (s.stamp_goal
          ? '<div style="background:#f5f5f5;border-radius:8px;padding:10px 14px">' +
              '<div style="color:#888;font-size:11px;margin-bottom:2px">集點目標</div>' +
              '<div style="font-weight:600">' + s.stamp_goal + ' 點</div>' +
            '</div>' : '') +
      '</div>' +
    '</div>' +

    // 會員點數列表
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<div style="font-weight:600;font-size:15px">👥 會員點數查詢</div>' +
        '<input type="text" id="loyaltySearch" placeholder="搜尋姓名 / UID"' +
          ' oninput="filterLoyaltyUsers()"' +
          ' style="padding:7px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;outline:none;width:200px">' +
      '</div>' +
      '<span id="loyaltyUserHint" style="color:#888;font-size:12px;display:block;margin-bottom:8px"></span>' +
      '<div id="loyaltyUserTable"></div>' +
      '<div id="loyaltyUserPager" style="display:flex;justify-content:center;gap:6px;margin-top:12px;flex-wrap:wrap"></div>' +
    '</div>' +

    // 調整點數 Modal
    '<div class="modal-overlay" id="adjustPointsModal">' +
      '<div class="modal" style="max-width:400px">' +
        '<h3 id="adjustModalTitle">調整點數</h3>' +
        '<input type="hidden" id="adjustUserId">' +
        '<div class="form-group">' +
          '<label>操作</label>' +
          '<select id="adjustAction">' +
            '<option value="add">加點</option>' +
            '<option value="deduct">扣點</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group"><label>點數</label><input type="number" id="adjustPoints" min="1" value="1"></div>' +
        '<div class="form-group"><label>備註</label><input type="text" id="adjustNote" placeholder="後台手動調整"></div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeAdjustModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="submitAdjustPoints()">確認調整</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // 編輯設定 Modal
    '<div class="modal-overlay" id="loyaltySettingsModal">' +
      '<div class="modal" style="max-width:480px">' +
        '<h3>⚙ 編輯點數卡設定</h3>' +
        '<div style="background:#fff3cd;border-radius:8px;padding:10px 14px;font-size:13px;color:#856404;margin-bottom:16px">' +
          '⚠️ 模式已鎖定（' + modeLabel + '），以下僅可修改規則與關鍵字' +
        '</div>' +
        '<div id="loyaltySettingsForm"></div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeLoyaltySettingsModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="submitLoyaltySettings()">儲存</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );

  _renderLoyaltyUserTable();
  _renderLoyaltyUserPager();
}

// ── 表格 ──
function _renderLoyaltyUserTable() {
  var wrap = document.getElementById('loyaltyUserTable');
  var hint = document.getElementById('loyaltyUserHint');
  if (!wrap) return;
  var total = _loyaltyUserFilt.length;
  if (hint) hint.textContent = '共 ' + total + ' 位會員';
  if (total === 0) { wrap.innerHTML = '<p class="empty">尚無點數記錄</p>'; return; }
  var start = (_loyaltyUserPage - 1) * _loyaltyPageSize;
  var page  = _loyaltyUserFilt.slice(start, start + _loyaltyPageSize);
  var rows  = page.map(function(u, idx) {
    var realIdx = start + idx;
    return '<tr>' +
      '<td>' + _lEsc(u.display_name || '-') + '</td>' +
      '<td style="font-size:11px;color:#888">' + _lEsc(u.user_id) + '</td>' +
      '<td style="text-align:center;font-weight:600;color:#534AB7;font-size:16px">' + u.balance + '</td>' +
      '<td style="font-size:12px;color:#aaa">' + _lEsc(u.last_time) + '</td>' +
      '<td style="text-align:center">' +
        '<button onclick="openAdjustModal(' + realIdx + ')" style="font-size:12px;padding:4px 10px;border:1px solid #534AB7;color:#534AB7;background:#fff;border-radius:6px;cursor:pointer">調整點數</button>' +
      '</td>' +
    '</tr>';
  }).join('');
  wrap.innerHTML =
    '<table class="table"><thead><tr>' +
      '<th>姓名</th><th>UID</th><th style="text-align:center">點數</th><th>最後記錄</th><th style="text-align:center">操作</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function _renderLoyaltyUserPager() {
  var pager = document.getElementById('loyaltyUserPager');
  if (!pager) return;
  var totalPages = Math.ceil(_loyaltyUserFilt.length / _loyaltyPageSize);
  if (totalPages <= 1) { pager.innerHTML = ''; return; }
  var btns = '';
  for (var p = 1; p <= totalPages; p++) {
    var active = p === _loyaltyUserPage
      ? 'background:#534AB7;color:#fff;'
      : 'background:#f0f0f0;color:#444;';
    btns += '<button onclick="goLoyaltyPage(' + p + ')" style="' + active + 'border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px">' + p + '</button>';
  }
  pager.innerHTML = btns;
}

function goLoyaltyPage(p) { _loyaltyUserPage = p; _renderLoyaltyUserTable(); _renderLoyaltyUserPager(); }

function filterLoyaltyUsers() {
  var kw = (document.getElementById('loyaltySearch').value || '').trim().toLowerCase();
  _loyaltyUserFilt = kw
    ? _loyaltyUserAll.filter(function(u) {
        return (u.display_name || '').toLowerCase().includes(kw) ||
               (u.user_id || '').toLowerCase().includes(kw);
      })
    : _loyaltyUserAll.slice();
  _loyaltyUserPage = 1;
  _renderLoyaltyUserTable();
  _renderLoyaltyUserPager();
}

// ── 調整點數 Modal ──
function openAdjustModal(idx) {
  var u = _loyaltyUserFilt[idx];
  if (!u) return;
  document.getElementById('adjustUserId').value   = u.user_id;
  document.getElementById('adjustModalTitle').textContent = '調整點數 — ' + (u.display_name || u.user_id);
  document.getElementById('adjustPoints').value   = 1;
  document.getElementById('adjustNote').value     = '';
  document.getElementById('adjustPointsModal').style.display = 'flex';
}

function closeAdjustModal() {
  document.getElementById('adjustPointsModal').style.display = 'none';
}

async function submitAdjustPoints() {
  var userId = document.getElementById('adjustUserId').value;
  var action = document.getElementById('adjustAction').value;
  var points = parseInt(document.getElementById('adjustPoints').value) || 0;
  var note   = document.getElementById('adjustNote').value.trim() || '後台手動調整';
  var user   = _loyaltyUserAll.find(function(u) { return u.user_id === userId; });

  if (points <= 0) { showToast('請輸入有效點數', 'error'); return; }

  var res = await apiCall({
    action:       'adjustLoyaltyPoints',
    user_id:      userId,
    display_name: user ? user.display_name : '',
    action:       action,
    points:       points,
    note:         note
  });

  if (res.success) {
    showToast('點數已調整，新餘額：' + res.data.balance, 'success');
    closeAdjustModal();
    _renderLoyaltyMain();
  } else {
    showToast(res.message || '調整失敗', 'error');
  }
}

// ── 編輯設定 Modal ──
function openLoyaltySettingsModal() {
  var s = _loyaltySettings;
  var m = s.mode || '';
  var showStamp  = m === 'stamp'  || m === 'both';
  var showDeduct = m === 'deduct' || m === 'both';

  var form =
    '<div class="form-group"><label>查詢點數關鍵字</label><input type="text" id="esCheckKw" value="' + _lEsc(s.check_keyword || '') + '"></div>' +
    (showStamp
      ? '<div class="form-group"><label>集點關鍵字</label><input type="text" id="esStampKw" value="' + _lEsc(s.stamp_keyword || '') + '"></div>' +
        '<div class="form-group"><label>兌換關鍵字</label><input type="text" id="esRedeemKw" value="' + _lEsc(s.redeem_keyword || '') + '"></div>' +
        '<div class="form-group"><label>集點目標（幾點兌換）</label><input type="number" id="esStampGoal" min="1" value="' + (s.stamp_goal || 10) + '"></div>' +
        '<div class="form-group"><label>兌換成功訊息</label><textarea id="esRewardMsg" rows="3">' + _lEsc(s.reward_msg || '') + '</textarea></div>'
      : '') +
    (showDeduct
      ? '<div class="form-group"><label>扣點關鍵字</label><input type="text" id="esDeductKw" value="' + _lEsc(s.deduct_keyword || '') + '"></div>' +
        '<div class="form-group"><label>點數有效天數（0=不限）</label><input type="number" id="esExpireDays" min="0" value="' + (s.expire_days || 0) + '"></div>'
      : '');

  document.getElementById('loyaltySettingsForm').innerHTML = form;
  document.getElementById('loyaltySettingsModal').style.display = 'flex';
}

function closeLoyaltySettingsModal() {
  document.getElementById('loyaltySettingsModal').style.display = 'none';
}

async function submitLoyaltySettings() {
  var s = _loyaltySettings;
  var m = s.mode || '';
  var checkKw   = (document.getElementById('esCheckKw')    ? document.getElementById('esCheckKw').value    : '').trim();
  var stampKw   = (document.getElementById('esStampKw')    ? document.getElementById('esStampKw').value    : '').trim();
  var redeemKw  = (document.getElementById('esRedeemKw')   ? document.getElementById('esRedeemKw').value   : '').trim();
  var stampGoal = document.getElementById('esStampGoal')   ? parseInt(document.getElementById('esStampGoal').value) || 10 : s.stamp_goal;
  var rewardMsg = (document.getElementById('esRewardMsg')  ? document.getElementById('esRewardMsg').value   : '').trim();
  var deductKw  = (document.getElementById('esDeductKw')   ? document.getElementById('esDeductKw').value   : '').trim();
  var expireDays= document.getElementById('esExpireDays')  ? parseInt(document.getElementById('esExpireDays').value) || 0 : s.expire_days;

  if (!checkKw) { showToast('請填寫查詢點數關鍵字', 'error'); return; }

  var res = await apiCall({
    action:          'saveLoyaltySettings',
    mode:            m,
    stamp_keyword:   stampKw,
    check_keyword:   checkKw,
    redeem_keyword:  redeemKw,
    deduct_keyword:  deductKw,
    stamp_goal:      stampGoal,
    reward_msg:      rewardMsg,
    unit_cost:       s.unit_cost   || 0,
    expire_days:     expireDays
  });

  if (res.success) {
    showToast('設定已儲存', 'success');
    closeLoyaltySettingsModal();
    loadLoyalty();
  } else {
    showToast(res.message || '儲存失敗', 'error');
  }
}

function _lEsc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
