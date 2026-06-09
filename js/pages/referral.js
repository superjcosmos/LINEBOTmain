// === referral.js ===
// 路徑：js/pages/referral.js
// 功能：推薦碼管理頁
//   - 統計卡片（總推薦數、完成數、已發碼人數、累計點數）
//   - 推薦排行榜
//   - 用戶推薦碼查詢（含補發）
//   - 獎勵設定 Modal

var _referralAll      = [];
var _referralFiltered = [];
var _referralPage     = 1;
var _referralPageSize = 15;

// ────────────────────────────────────────────────────────────
// 主入口
// ────────────────────────────────────────────────────────────
async function loadReferral() {
  setContent('<div class="loading">載入推薦碼管理...</div>');
  var statsRes   = await apiCall({ action: 'getReferralStats' });
  var rankRes    = await apiCall({ action: 'getReferralRanking', top: 10 });
  var listRes    = await apiCall({ action: 'getReferralList', limit: 200 });
  var settingRes = await apiCall({ action: 'getReferralSettings' });

  if (!statsRes.success) { setContent('<div class="loading">載入失敗</div>'); return; }

  var stats    = statsRes.data  || {};
  var ranking  = rankRes.success  ? (rankRes.data  || []) : [];
  var listData = listRes.success  ? (listRes.data  || []) : [];
  var settings = settingRes.success ? (settingRes.data || {}) : {};

  _referralAll      = listData;
  _referralFiltered = listData.slice();
  _referralPage     = 1;

  setContent(_buildReferralPage(stats, ranking, settings));
  _renderReferralTable();
  _renderReferralPager();
}

// ────────────────────────────────────────────────────────────
// 頁面 HTML 骨架
// ────────────────────────────────────────────────────────────
function _buildReferralPage(stats, ranking, settings) {
  var topRows = ranking.slice(0, 10).map(function(r, idx) {
    var medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1) + '.';
    return '<tr>' +
      '<td style="text-align:center;font-size:18px">' + medal + '</td>' +
      '<td>' + _esc(r.display_name || r.uid) + '</td>' +
      '<td style="font-family:monospace">' + _esc(r.referral_code) + '</td>' +
      '<td style="text-align:center;font-weight:600;color:#06C755">' + r.referral_count + '</td>' +
      '<td style="text-align:center">' + r.total_points + '</td>' +
    '</tr>';
  }).join('');

  return '' +
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
    '<h2 class="page-title" style="margin-bottom:0">推薦碼管理</h2>' +
    '<button class="btn btn-primary" onclick="openReferralSettingsModal()">⚙ 獎勵設定</button>' +
  '</div>' +

  // ── KPI 卡片 ──
  '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">' +
    _refCard('總推薦事件', stats.total_events  || 0, '📨') +
    _refCard('成功完成',   stats.completed      || 0, '✅') +
    _refCard('已發碼人數', stats.users_with_code || 0, '🎫') +
    _refCard('累計點數',   stats.total_points   || 0, '⭐') +
  '</div>' +

  // ── 排行榜 + 用戶清單 並排 ──
  '<div style="display:grid;grid-template-columns:1fr 2fr;gap:16px;margin-bottom:24px">' +

    // 排行榜
    '<div class="card">' +
      '<div style="font-weight:600;font-size:15px;margin-bottom:12px">🏆 推薦排行榜 Top 10</div>' +
      (topRows
        ? '<table class="table"><thead><tr>' +
            '<th style="width:40px">名次</th><th>姓名</th><th>推薦碼</th>' +
            '<th style="text-align:center">次數</th><th style="text-align:center">點數</th>' +
          '</tr></thead><tbody>' + topRows + '</tbody></table>'
        : '<p class="empty">尚無推薦記錄</p>') +
    '</div>' +

    // 用戶推薦碼清單
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<div style="font-weight:600;font-size:15px">🎫 用戶推薦碼查詢</div>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="text" id="referralSearch" placeholder="搜尋姓名 / 推薦碼 / UID"' +
            ' oninput="filterReferral()"' +
            ' style="padding:7px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;outline:none;width:220px">' +
        '</div>' +
      '</div>' +
      '<span id="referralTotalHint" style="color:#888;font-size:12px;display:block;margin-bottom:8px"></span>' +
      '<div id="referralTableWrap"></div>' +
      '<div id="referralPager" style="display:flex;justify-content:center;gap:6px;margin-top:12px;flex-wrap:wrap"></div>' +
    '</div>' +
  '</div>' +

  // ── 獎勵設定 Modal ──
  '<div class="modal-overlay" id="referralSettingsModal">' +
    '<div class="modal" style="max-width:460px">' +
      '<h3>⚙ 推薦獎勵設定</h3>' +

      '<div class="form-group">' +
        '<label>推薦碼前綴（大寫英文，例如 REF、VIP、JOIN）</label>' +
        '<input type="text" id="refPrefix" placeholder="REF" maxlength="8"' +
          ' style="text-transform:uppercase"' +
          ' value="' + _esc(settings.prefix || 'REF') + '">' +
      '</div>' +

      '<div class="form-group">' +
        '<label>推薦人每次獲得點數</label>' +
        '<input type="number" id="refPoints" min="1" max="999"' +
          ' value="' + (settings.referrer_points || 1) + '">' +
      '</div>' +

      '<div class="form-group">' +
        '<label>被推薦人收到的 LINE 訊息（折扣碼請直接寫在訊息中）</label>' +
        '<textarea id="refDiscountMsg" rows="4" placeholder="恭喜！您已獲得 9 折優惠碼：DISCOUNT10，下次消費使用！">' +
          _esc(settings.referee_discount_msg || '') +
        '</textarea>' +
      '</div>' +

      '<div class="modal-footer">' +
        '<button class="btn-cancel" onclick="closeReferralSettingsModal()">取消</button>' +
        '<button class="btn btn-primary" onclick="saveReferralSettings()">儲存設定</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function _refCard(label, value, icon) {
  return '<div class="card" style="text-align:center;padding:16px 12px">' +
    '<div style="font-size:24px;margin-bottom:6px">' + icon + '</div>' +
    '<div style="font-size:24px;font-weight:700;color:#1a1a2e">' + value + '</div>' +
    '<div style="font-size:12px;color:#888;margin-top:4px">' + label + '</div>' +
  '</div>';
}

// ────────────────────────────────────────────────────────────
// 表格渲染
// ────────────────────────────────────────────────────────────
function _renderReferralTable() {
  var wrap = document.getElementById('referralTableWrap');
  var hint = document.getElementById('referralTotalHint');
  if (!wrap) return;
  var total = _referralFiltered.length;
  if (hint) hint.textContent = '共 ' + total + ' 位用戶';
  if (total === 0) { wrap.innerHTML = '<p class="empty">尚無資料</p>'; return; }
  var start = (_referralPage - 1) * _referralPageSize;
  var page  = _referralFiltered.slice(start, Math.min(start + _referralPageSize, total));

  var rows = page.map(function(r, localIdx) {
    var absIdx = start + localIdx;
    return '<tr>' +
      '<td>' + _esc(r.display_name || '-') + '</td>' +
      '<td style="font-size:11px;color:#888;max-width:120px;overflow:hidden;text-overflow:ellipsis">' + _esc(r.uid) + '</td>' +
      '<td><span style="font-family:monospace;background:#f0f0f0;padding:2px 8px;border-radius:4px">' +
        _esc(r.referral_code) + '</span></td>' +
      '<td style="text-align:center;font-weight:600;color:#06C755">' + r.referral_count + '</td>' +
      '<td style="text-align:center">' + r.total_points + '</td>' +
    '</tr>';
  }).join('');

  wrap.innerHTML =
    '<table class="table"><thead><tr>' +
      '<th>姓名</th><th>UID</th><th>推薦碼</th>' +
      '<th style="text-align:center">推薦次數</th><th style="text-align:center">累積點數</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function _renderReferralPager() {
  var pager = document.getElementById('referralPager');
  if (!pager) return;
  var totalPages = Math.ceil(_referralFiltered.length / _referralPageSize);
  if (totalPages <= 1) { pager.innerHTML = ''; return; }
  var btns = '';
  for (var p = 1; p <= totalPages; p++) {
    var active = p === _referralPage
      ? 'background:#1a1a2e;color:#fff;'
      : 'background:#f0f0f0;color:#444;';
    btns += '<button onclick="goReferralPage(' + p + ')" ' +
      'style="' + active + 'border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px">' +
      p + '</button>';
  }
  pager.innerHTML = btns;
}

function goReferralPage(p) { _referralPage = p; _renderReferralTable(); _renderReferralPager(); }

function filterReferral() {
  var kw = (document.getElementById('referralSearch').value || '').trim().toLowerCase();
  _referralFiltered = kw
    ? _referralAll.filter(function(r) {
        return (r.display_name || '').toLowerCase().includes(kw) ||
               (r.referral_code || '').toLowerCase().includes(kw) ||
               (r.uid || '').toLowerCase().includes(kw);
      })
    : _referralAll.slice();
  _referralPage = 1;
  _renderReferralTable();
  _renderReferralPager();
}

// ────────────────────────────────────────────────────────────
// 獎勵設定 Modal
// ────────────────────────────────────────────────────────────
function openReferralSettingsModal() {
  var m = document.getElementById('referralSettingsModal');
  if (m) m.style.display = 'flex';
}
function closeReferralSettingsModal() {
  var m = document.getElementById('referralSettingsModal');
  if (m) m.style.display = 'none';
}

async function saveReferralSettings() {
  var prefix  = (document.getElementById('refPrefix').value || '').trim().toUpperCase();
  var points  = parseInt(document.getElementById('refPoints').value) || 1;
  var discMsg = (document.getElementById('refDiscountMsg').value || '').trim();
  if (!prefix) { showToast('請填入推薦碼前綴', 'error'); return; }
  if (!discMsg) { showToast('請填入被推薦人收到的訊息', 'error'); return; }
  var res = await apiCall({
    action: 'saveReferralSettings',
    prefix: prefix,
    referrer_points: points,
    referee_discount_msg: discMsg
  });
  if (res.success) {
    showToast('設定已儲存', 'success');
    closeReferralSettingsModal();
    loadReferral();
  } else {
    showToast(res.message || '儲存失敗', 'error');
  }
}

function _esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
