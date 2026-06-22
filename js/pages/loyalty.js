// ============================================================
// js/pages/loyalty.js
// 多張點數卡管理頁
// ============================================================

var _loyaltyCards     = [];
var _loyaltyUserAll   = [];
var _loyaltyUserFilt  = [];
var _loyaltyUserPage  = 1;
var _loyaltyPageSize  = 15;
var _loyaltyActiveCard = null; // 目前查看的卡

async function loadLoyalty() {
  setContent('<div class="loading">載入點數卡管理...</div>');
  var res = await apiCall({ action: 'getLoyaltyCardList' });
  if (!res.success) { setContent('<div class="loading">載入失敗</div>'); return; }
  _loyaltyCards = res.data || [];
  _renderLoyaltyMain();
}

// ══════════════════════════════════════════
// 主頁：點數卡清單
// ══════════════════════════════════════════
function _renderLoyaltyMain() {
  var cardRows = _loyaltyCards.map(function(c, idx) {
    var modeLbl = c.mode === 'stamp' ? '集點' : c.mode === 'deduct' ? '儲值扣點' : '雙模式';
    var modeColor = c.mode === 'stamp' ? '#D85A30' : c.mode === 'deduct' ? '#1D9E75' : '#534AB7';
    var statusBadge = c.status === 'active'
      ? '<span style="background:#e6f9f0;color:#1D9E75;border-radius:20px;padding:2px 10px;font-size:12px">啟用中</span>'
      : '<span style="background:#f5f5f5;color:#aaa;border-radius:20px;padding:2px 10px;font-size:12px">已停用</span>';
    var antiTags = [];
    if (c.daily_limit      > 0) antiTags.push('每日 ' + c.daily_limit + ' 點上限');
    if (c.cooldown_minutes > 0) antiTags.push('冷卻 ' + c.cooldown_minutes + ' 分');
    if (c.manual_only)          antiTags.push('手動模式');
    var antiHtml = antiTags.length ? antiTags.map(function(t) {
      return '<span style="background:#f0eeff;color:#534AB7;border-radius:10px;padding:1px 8px;font-size:11px">' + t + '</span>';
    }).join(' ') : '-';

    return '<tr>' +
      '<td><strong>' + escHtml(c.card_name) + '</strong><br><span style="font-size:11px;color:#aaa">' + escHtml(c.card_id) + '</span></td>' +
      '<td><span style="color:' + modeColor + ';font-weight:600">' + modeLbl + '</span></td>' +
      '<td style="font-size:12px">' +
        (c.stamp_keyword  ? '集點：' + escHtml(c.stamp_keyword)  + '<br>' : '') +
        (c.check_keyword  ? '查詢：' + escHtml(c.check_keyword)  + '<br>' : '') +
        (c.redeem_keyword ? '兌換：' + escHtml(c.redeem_keyword) + '<br>' : '') +
        (c.deduct_keyword ? '扣點：' + escHtml(c.deduct_keyword) : '') +
      '</td>' +
      '<td>' + antiHtml + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td style="text-align:center">' +
        '<button onclick="viewLoyaltyCard(' + idx + ')" style="font-size:12px;padding:4px 8px;border:1px solid #534AB7;color:#534AB7;background:#fff;border-radius:6px;cursor:pointer;margin-right:4px">會員點數</button>' +
        '<button onclick="editLoyaltyCard(' + idx + ')" style="font-size:12px;padding:4px 8px;border:1px solid #888;color:#555;background:#fff;border-radius:6px;cursor:pointer;margin-right:4px">編輯</button>' +
        '<button onclick="toggleCard(' + idx + ')" style="font-size:12px;padding:4px 8px;border:1px solid #ccc;color:#888;background:#fff;border-radius:6px;cursor:pointer;margin-right:4px">' +
          (c.status === 'active' ? '停用' : '啟用') + '</button>' +
        '<button onclick="deleteCard(' + idx + ')" style="font-size:12px;padding:4px 8px;border:1px solid #e74c3c;color:#e74c3c;background:#fff;border-radius:6px;cursor:pointer">刪除</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  setContent(
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
      '<h2 class="page-title" style="margin:0">點數卡管理</h2>' +
      '<button class="btn btn-primary" onclick="openCardModal()">＋ 新增點數卡</button>' +
    '</div>' +

    '<div class="card">' +
      (_loyaltyCards.length === 0
        ? '<p class="empty">尚未建立任何點數卡，點右上角新增</p>'
        : '<table class="table"><thead><tr>' +
            '<th>卡片名稱</th><th>模式</th><th>關鍵字</th><th>防刷設定</th><th>狀態</th><th style="text-align:center">操作</th>' +
          '</tr></thead><tbody>' + cardRows + '</tbody></table>') +
    '</div>' +

    // 新增/編輯 Modal
    '<div class="modal-overlay" id="cardModal">' +
      '<div class="modal" style="max-width:540px;max-height:90vh;overflow-y:auto">' +
        '<h3 id="cardModalTitle">新增點數卡</h3>' +
        '<div id="cardModalForm"></div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeCardModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="submitCardModal()">儲存</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // 會員點數查詢 Modal
    '<div class="modal-overlay" id="userPointsModal">' +
      '<div class="modal" style="max-width:640px;max-height:90vh;overflow-y:auto">' +
        '<h3 id="userPointsTitle">會員點數</h3>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
          '<input type="text" id="loyaltySearch" placeholder="搜尋姓名 / UID" oninput="filterLoyaltyUsers()"' +
            ' style="padding:7px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;outline:none;width:200px">' +
          '<button class="btn btn-primary" onclick="openAdjustModalNew()" style="font-size:12px;padding:5px 12px">手動加/扣點</button>' +
        '</div>' +
        '<span id="loyaltyUserHint" style="color:#888;font-size:12px;display:block;margin-bottom:8px"></span>' +
        '<div id="loyaltyUserTable"></div>' +
        '<div id="loyaltyUserPager" style="display:flex;justify-content:center;gap:6px;margin-top:12px;flex-wrap:wrap"></div>' +
        '<div class="modal-footer"><button class="btn-cancel" onclick="closeUserPointsModal()">關閉</button></div>' +
      '</div>' +
    '</div>' +

    // 調整點數 Modal
    '<div class="modal-overlay" id="adjustPointsModal">' +
      '<div class="modal" style="max-width:420px">' +
        '<h3 id="adjustModalTitle">手動加/扣點</h3>' +
        '<input type="hidden" id="adjustCardId">' +
        '<input type="hidden" id="adjustUserId">' +
        '<input type="hidden" id="adjustDisplayName">' +
        '<div class="form-group">' +
          '<label>選擇用戶</label>' +
          '<input type="text" id="adjustUserSearch" placeholder="輸入姓名或 UID 搜尋" oninput="searchUserLogForAdjust()" autocomplete="off">' +
          '<div id="adjustUserDropdown" style="position:relative;max-height:180px;overflow-y:auto;border:1px solid #e0e0e0;border-radius:8px;margin-top:4px;display:none;background:#fff"></div>' +
        '</div>' +
        '<div class="form-group"><label>操作</label>' +
          '<select id="adjustAction"><option value="add">加點（儲值）</option><option value="deduct">扣點</option></select></div>' +
        '<div class="form-group"><label>點數</label><input type="number" id="adjustPoints" min="1" value="1"></div>' +
        '<div class="form-group"><label>備註</label><input type="text" id="adjustNote" placeholder="後台手動調整"></div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeAdjustModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="submitAdjustPoints()">確認</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

var _userLogCache = null;

async function _ensureUserLogCache() {
  if (_userLogCache) return _userLogCache;
  var res = await apiCall({ action: 'getUserLogListForLoyalty' });
  _userLogCache = res.success ? (res.data || []) : [];
  return _userLogCache;
}

async function searchUserLogForAdjust() {
  var kw = (document.getElementById('adjustUserSearch').value || '').trim().toLowerCase();
  var dropdown = document.getElementById('adjustUserDropdown');
  if (!kw) { dropdown.style.display = 'none'; dropdown.innerHTML = ''; return; }

  var list = await _ensureUserLogCache();
  var matched = list.filter(function(u) {
    return (u.display_name || '').toLowerCase().includes(kw) || (u.user_id || '').toLowerCase().includes(kw);
  }).slice(0, 20);

  if (matched.length === 0) {
    dropdown.innerHTML = '<div style="padding:10px;font-size:12px;color:#aaa">找不到符合的用戶</div>';
    dropdown.style.display = 'block';
    return;
  }

  dropdown.innerHTML = matched.map(function(u) {
    return '<div onclick="selectAdjustUser(\'' + u.user_id.replace(/'/g, "\\'") + '\',\'' + (u.display_name || '').replace(/'/g, "\\'") + '\')" ' +
      'style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #f0f0f0;font-size:13px" ' +
      'onmouseover="this.style.background=\'#f5f5f5\'" onmouseout="this.style.background=\'#fff\'">' +
      '<strong>' + escHtml(u.display_name || '(無名稱)') + '</strong> ' +
      '<span style="color:#aaa;font-size:11px">' + escHtml(u.user_id) + '</span>' +
    '</div>';
  }).join('');
  dropdown.style.display = 'block';
}

function selectAdjustUser(userId, displayName) {
  document.getElementById('adjustUserId').value      = userId;
  document.getElementById('adjustDisplayName').value = displayName;
  document.getElementById('adjustUserSearch').value  = displayName ? (displayName + '（' + userId + '）') : userId;
  document.getElementById('adjustUserDropdown').style.display = 'none';
}

// ══════════════════════════════════════════
// 新增 / 編輯 Modal
// ══════════════════════════════════════════
var _editingCard = null;

function openCardModal(card) {
  _editingCard = card || null;
  var c = card || {};
  var m = c.mode || 'stamp';
  document.getElementById('cardModalTitle').textContent = card ? '編輯點數卡' : '新增點數卡';
  document.getElementById('cardModalForm').innerHTML = _buildCardForm(c, m);
  openModal('cardModal');
}

function editLoyaltyCard(idx) { openCardModal(_loyaltyCards[idx]); }
function closeCardModal()     { closeModal('cardModal'); }

function _buildCardForm(c, m) {
  var showStamp  = m === 'stamp'  || m === 'both';
  var showDeduct = m === 'deduct' || m === 'both';
  return '<div class="form-group"><label>點數卡名稱</label><input type="text" id="cfCardName" placeholder="咖啡集點卡" value="' + escHtml(c.card_name || '') + '"></div>' +
    '<div class="form-group"><label>模式</label>' +
      '<select id="cfMode" onchange="refreshCardForm()">' +
        '<option value="stamp"  ' + (m==='stamp'  ?'selected':'') + '>消費集點</option>' +
        '<option value="deduct" ' + (m==='deduct' ?'selected':'') + '>儲值扣點</option>' +
        '<option value="both"   ' + (m==='both'   ?'selected':'') + '>雙模式</option>' +
      '</select>' +
    '</div>' +
    '<div id="cfModeFields">' + _buildModeFields(c, m) + '</div>' +
    '<div class="form-group"><label>查詢點數關鍵字</label><input type="text" id="cfCheckKw" placeholder="查點數" value="' + escHtml(c.check_keyword || '') + '"></div>' +
    '<div style="border-top:1px solid #eee;margin:16px 0;padding-top:16px">' +
      '<div style="font-weight:600;font-size:14px;margin-bottom:12px">🛡️ 防刷設定</div>' +
      '<div class="form-group"><label>每日集點上限（0 = 不限）</label><input type="number" id="cfDailyLimit" min="0" value="' + (c.daily_limit || 0) + '"></div>' +
      '<div class="form-group"><label>冷卻時間（分鐘，0 = 不限）</label><input type="number" id="cfCooldown" min="0" value="' + (c.cooldown_minutes || 0) + '"></div>' +
      '<div class="form-group" style="display:flex;align-items:center;gap:10px">' +
        '<input type="checkbox" id="cfManualOnly" ' + (c.manual_only ? 'checked' : '') + ' style="width:16px;height:16px">' +
        '<label for="cfManualOnly" style="margin:0;cursor:pointer">純後台手動模式（關閉關鍵字集點）</label>' +
      '</div>' +
    '</div>';
}

function _buildModeFields(c, m) {
  var showStamp  = m === 'stamp'  || m === 'both';
  var showDeduct = m === 'deduct' || m === 'both';
  return (showStamp
    ? '<div class="form-group"><label>集點關鍵字</label><input type="text" id="cfStampKw" placeholder="集點" value="' + escHtml(c.stamp_keyword || '') + '"></div>' +
      '<div class="form-group"><label>兌換關鍵字</label><input type="text" id="cfRedeemKw" placeholder="兌換" value="' + escHtml(c.redeem_keyword || '') + '"></div>' +
      '<div class="form-group"><label>集滿幾點兌換</label><input type="number" id="cfStampGoal" min="1" value="' + (c.stamp_goal || 10) + '"></div>' +
      '<div class="form-group"><label>兌換成功訊息</label><textarea id="cfRewardMsg" rows="2" placeholder="恭喜集滿！請出示此訊息兌換獎勵">' + escHtml(c.reward_msg || '') + '</textarea></div>'
    : '') +
  (showDeduct
    ? '<div class="form-group"><label>扣點關鍵字</label><input type="text" id="cfDeductKw" placeholder="使用點數" value="' + escHtml(c.deduct_keyword || '') + '"></div>'
    : '') +
  '<div class="form-group"><label>點數有效天數（0 = 不限）</label><input type="number" id="cfExpireDays" min="0" value="' + (c.expire_days || 0) + '"></div>';
}

function refreshCardForm() {
  var m = document.getElementById('cfMode').value;
  var c = _editingCard || {};
  document.getElementById('cfModeFields').innerHTML = _buildModeFields(c, m);
}

function _getVal(id, def) { var el = document.getElementById(id); return el ? el.value : (def || ''); }

async function submitCardModal() {
  var m         = _getVal('cfMode', 'stamp');
  var cardName  = _getVal('cfCardName').trim();
  var checkKw   = _getVal('cfCheckKw').trim();
  var stampKw   = _getVal('cfStampKw').trim();
  var redeemKw  = _getVal('cfRedeemKw').trim();
  var deductKw  = _getVal('cfDeductKw').trim();
  var stampGoal = parseInt(_getVal('cfStampGoal')) || 10;
  var rewardMsg = _getVal('cfRewardMsg').trim();
  var expireDays= parseInt(_getVal('cfExpireDays')) || 0;
  var dailyLim  = parseInt(_getVal('cfDailyLimit')) || 0;
  var cooldown  = parseInt(_getVal('cfCooldown'))   || 0;
  var manualOnly= document.getElementById('cfManualOnly') ? document.getElementById('cfManualOnly').checked : false;

  if (!cardName) { showToast('請填寫點數卡名稱', 'error'); return; }
  if (!checkKw)  { showToast('請填寫查詢點數關鍵字', 'error'); return; }

  var res = await apiCall({
    action:           'saveLoyaltyCard',
    card_id:          _editingCard ? _editingCard.card_id : '',
    card_name:        cardName,
    mode:             m,
    stamp_keyword:    stampKw,
    check_keyword:    checkKw,
    redeem_keyword:   redeemKw,
    deduct_keyword:   deductKw,
    stamp_goal:       stampGoal,
    reward_msg:       rewardMsg,
    unit_cost:        0,
    expire_days:      expireDays,
    daily_limit:      dailyLim,
    cooldown_minutes: cooldown,
    manual_only:      manualOnly
  });

  if (res.success) {
    showToast(_editingCard ? '已更新' : '新增成功', 'success');
    closeCardModal();
    loadLoyalty();
  } else {
    showToast(res.message || '儲存失敗', 'error');
  }
}

// ── 停用/啟用 ──
async function toggleCard(idx) {
  var c   = _loyaltyCards[idx];
  var act = c.status === 'active' ? '停用' : '啟用';
  await confirmAndRun(act + '「' + c.card_name + '」？', async function() {
    var res = await apiCall({ action: 'toggleLoyaltyCard', card_id: c.card_id });
    if (res.success) { showToast(act + '成功', 'success'); loadLoyalty(); }
    else showToast(res.message || '操作失敗', 'error');
  });
}

// ── 刪除 ──
async function deleteCard(idx) {
  var c = _loyaltyCards[idx];
  await confirmAndRun('確定刪除「' + c.card_name + '」？\n歷史記錄將一併移除，此動作無法復原。', async function() {
    var res = await apiCall({ action: 'deleteLoyaltyCard', card_id: c.card_id });
    if (res.success) { showToast('已刪除', 'success'); loadLoyalty(); }
    else showToast(res.message || '刪除失敗', 'error');
  });
}

// ══════════════════════════════════════════
// 會員點數查詢 Modal
// ══════════════════════════════════════════
async function viewLoyaltyCard(idx) {
  var c = _loyaltyCards[idx];
  _loyaltyActiveCard = c;
  document.getElementById('userPointsTitle').textContent = '【' + c.card_name + '】會員點數';
  openModal('userPointsModal');
  document.getElementById('loyaltyUserTable').innerHTML = '<p style="color:#888;font-size:13px">載入中...</p>';

  var res = await apiCall({ action: 'getLoyaltyUserList', card_id: c.card_id });
  _loyaltyUserAll  = res.success ? (res.data || []) : [];
  _loyaltyUserFilt = _loyaltyUserAll.slice();
  _loyaltyUserPage = 1;
  _renderLoyaltyUserTable();
  _renderLoyaltyUserPager();
}

function closeUserPointsModal() {
  closeModal('userPointsModal');
  _loyaltyActiveCard = null;
}

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
    return '<tr>' +
      '<td>' + escHtml(u.display_name || '-') + '</td>' +
      '<td style="font-size:11px;color:#888">' + escHtml(u.user_id) + '</td>' +
      '<td style="text-align:center;font-weight:600;color:#534AB7;font-size:16px">' + u.balance + '</td>' +
      '<td style="font-size:12px;color:#aaa">' + escHtml(u.last_time) + '</td>' +
      '<td style="text-align:center">' +
        '<button onclick="openAdjustModalForUser(' + (start + idx) + ')" ' +
          'style="font-size:12px;padding:4px 10px;border:1px solid #534AB7;color:#534AB7;background:#fff;border-radius:6px;cursor:pointer">調整點數</button>' +
      '</td>' +
    '</tr>';
  }).join('');
  wrap.innerHTML = '<table class="table"><thead><tr><th>姓名</th><th>UID</th><th style="text-align:center">點數</th><th>最後記錄</th><th style="text-align:center">操作</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function _renderLoyaltyUserPager() {
  renderPager('loyaltyUserPager', _loyaltyUserFilt.length, _loyaltyUserPage, _loyaltyPageSize, goLoyaltyPage);
}

function goLoyaltyPage(p) { _loyaltyUserPage = p; _renderLoyaltyUserTable(); _renderLoyaltyUserPager(); }

function filterLoyaltyUsers() {
  var kw = (document.getElementById('loyaltySearch').value || '').trim().toLowerCase();
  _loyaltyUserFilt = kw
    ? _loyaltyUserAll.filter(function(u) {
        return (u.display_name || '').toLowerCase().includes(kw) || (u.user_id || '').toLowerCase().includes(kw);
      })
    : _loyaltyUserAll.slice();
  _loyaltyUserPage = 1;
  _renderLoyaltyUserTable();
  _renderLoyaltyUserPager();
}

// ══════════════════════════════════════════
// 調整點數 Modal
// ══════════════════════════════════════════
function openAdjustModalForUser(idx) {
  var u = _loyaltyUserFilt[idx];
  if (!u || !_loyaltyActiveCard) return;
  document.getElementById('adjustCardId').value      = _loyaltyActiveCard.card_id;
  document.getElementById('adjustUserId').value      = u.user_id;
  document.getElementById('adjustDisplayName').value = u.display_name || '';
  document.getElementById('adjustUserSearch').value  = (u.display_name || u.user_id);
  document.getElementById('adjustModalTitle').textContent = '調整點數 — ' + (u.display_name || u.user_id);
  document.getElementById('adjustPoints').value = 1;
  document.getElementById('adjustNote').value   = '';
  openModal('adjustPointsModal');
}

function openAdjustModalNew() {
  if (!_loyaltyActiveCard) return;
  document.getElementById('adjustCardId').value      = _loyaltyActiveCard.card_id;
  document.getElementById('adjustUserId').value      = '';
  document.getElementById('adjustDisplayName').value = '';
  document.getElementById('adjustUserSearch').value  = '';
  document.getElementById('adjustModalTitle').textContent = '手動加/扣點';
  document.getElementById('adjustPoints').value = 1;
  document.getElementById('adjustNote').value   = '';
  openModal('adjustPointsModal');
}

function closeAdjustModal() { closeModal('adjustPointsModal'); }

async function submitAdjustPoints() {
  var cardId      = document.getElementById('adjustCardId').value;
  var userId      = document.getElementById('adjustUserId').value.trim();
  var displayName = document.getElementById('adjustDisplayName').value;
  var action      = document.getElementById('adjustAction').value;
  var points      = parseInt(document.getElementById('adjustPoints').value) || 0;
  var note        = document.getElementById('adjustNote').value.trim() || '後台手動調整';

  if (!userId) { showToast('請輸入 user_id', 'error'); return; }
  if (points <= 0) { showToast('請輸入有效點數', 'error'); return; }

  var res = await apiCall({ action: 'adjustLoyaltyPoints', card_id: cardId, user_id: userId, display_name: displayName, point_action: action, points: points, note: note });
  if (res.success) {
    showToast('點數已調整，新餘額：' + res.data.balance, 'success');
    closeAdjustModal();
    if (_loyaltyActiveCard) viewLoyaltyCard(_loyaltyCards.findIndex(function(c) { return c.card_id === _loyaltyActiveCard.card_id; }));
  } else {
    showToast(res.message || '調整失敗', 'error');
  }
}

// escHtml() 已移至 js/utils/dom.js 全域共用，此處不再重複定義
