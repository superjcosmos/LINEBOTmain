// ============================================================
// js/pages/audience.js
// ============================================================

// ── 狀態變數 ──
var _audienceAll      = [];  // 完整資料
var _audienceFiltered = [];  // 搜尋後資料
var _audiencePage     = 1;
var _audiencePageSize = 20;
var _audienceRmOptions = '';
var audienceEditIndex  = null;
var currentAudienceId  = null;

// ────────────────────────────────────────────────────────────
// 載入受眾頁面
// ────────────────────────────────────────────────────────────
async function loadAudience() {
  setContent('<div class="loading">載入中...</div>');

  var audienceResult = await apiCall({ action: 'getAudienceList' });
  var richMenuResult = await apiCall({ action: 'getRichMenuList' });

  if (!audienceResult.success) {
    setContent('<div class="empty">載入失敗：' + audienceResult.message + '</div>');
    return;
  }

  // 自動同步所有受眾人數
  if (audienceResult.data.length > 0) {
    await Promise.all(audienceResult.data.map(function(row) {
      return apiCall({ action: 'syncAudienceCount', audience_id: row.audience_id });
    }));
    audienceResult = await apiCall({ action: 'getAudienceList' });
  }

  // 建立圖文選單下拉選項（供 Modal 用）
  _audienceRmOptions = '<option value="">不切換圖文選單</option>';
  if (richMenuResult.success) {
    richMenuResult.data.forEach(function(rm) {
      _audienceRmOptions += '<option value="' + rm.rich_menu_id + '">' + rm.name + '</option>';
    });
  }

  // 存到全域，供搜尋和分頁用
  _audienceAll      = audienceResult.data || [];
  _audienceFiltered = _audienceAll.slice();
  _audiencePage     = 1;

  // 建立頁面骨架（搜尋列、表格容器、分頁容器、Modal）
  setContent(_buildAudienceShell());

  // 渲染表格和分頁
  _renderAudienceTable();
  _renderAudiencePager();
}

// ────────────────────────────────────────────────────────────
// 頁面骨架 HTML（Modal 也放在這裡，只建立一次）
// ────────────────────────────────────────────────────────────
function _buildAudienceShell() {
  return '' +
    '<h2 class="page-title">受眾管理</h2>' +
    '<div class="card">' +

      // ── 工具列 ──
      '<div class="toolbar" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">' +
        '<button class="btn btn-primary" onclick="openCreateModal()">＋ 建立受眾</button>' +
        '<input type="text" id="audienceSearch"' +
          ' placeholder="搜尋關鍵字或名稱..."' +
          ' oninput="filterAudience()"' +
          ' style="flex:1;min-width:180px;max-width:320px;' +
                  'padding:8px 12px;border:1.5px solid #e0e0e0;' +
                  'border-radius:8px;font-size:14px;outline:none;">' +
        '<span id="audienceTotalHint" style="color:#888;font-size:13px;white-space:nowrap;"></span>' +
      '</div>' +

      // ── 表格 ──
      '<div id="audienceTableWrap"></div>' +

      // ── 分頁 ──
      '<div id="audiencePager" style="display:flex;justify-content:center;' +
           'gap:6px;margin-top:16px;flex-wrap:wrap;"></div>' +

    '</div>' +

    // ── 建立 / 編輯受眾 Modal ──
    '<div class="modal-overlay" id="createModal">' +
      '<div class="modal">' +
        '<h3 id="audienceModalTitle">建立受眾</h3>' +

        '<div class="form-group">' +
          '<label>受眾名稱</label>' +
          '<input type="text" id="audienceName" placeholder="例如：VIP客戶">' +
        '</div>' +

        '<div class="form-group">' +
          '<label>觸發關鍵字（選填）</label>' +
          '<input type="text" id="audienceKeyword" placeholder="用戶輸入此關鍵字自動加入">' +
        '</div>' +

        '<div class="form-group">' +
          '<label>觸發後切換圖文選單（選填）</label>' +
          '<select id="audienceRichMenu">' + _audienceRmOptions + '</select>' +
        '</div>' +

        // ── 同步建立自動回覆（僅建立時顯示）──
        '<div id="autoReplySection" style="margin-top:4px;">' +
          '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;' +
                         'font-size:14px;color:#444;user-select:none;">' +
            '<input type="checkbox" id="audAutoReply" onchange="toggleAudReplyField()" ' +
                   'style="width:16px;height:16px;cursor:pointer;">' +
            '同時新增自動回覆關鍵字' +
          '</label>' +
          '<div id="audReplyField" style="display:none;margin-top:10px;">' +
            '<label style="font-size:13px;color:#666;display:block;margin-bottom:4px;">' +
              '回覆內容（用戶加入後自動回覆）' +
            '</label>' +
            '<textarea id="audReplyContent" rows="3" ' +
              'placeholder="例如：歡迎加入VIP，專屬優惠即將送上！"' +
              ' style="width:100%;padding:8px 10px;border:1.5px solid #e0e0e0;' +
                      'border-radius:8px;font-size:14px;resize:vertical;' +
                      'box-sizing:border-box;outline:none;"></textarea>' +
          '</div>' +
        '</div>' +

        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeCreateModal()">取消</button>' +
          '<button class="btn btn-primary" id="audienceSaveBtn" onclick="saveAudience()">建立</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // ── 匯入 UID Modal ──
    '<div class="modal-overlay" id="importModal">' +
      '<div class="modal">' +
        '<h3>匯入 UID</h3>' +
        '<p id="importModalTitle" style="color:#888;font-size:13px;margin-bottom:12px;"></p>' +
        '<div class="form-group">' +
          '<label>UID 清單（每行一個）</label>' +
          '<textarea id="importUids"' +
            ' placeholder="Uxxxxxxxxxx&#10;Uxxxxxxxxxx"' +
            ' style="height:160px;"></textarea>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeImportModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="doImportAudience()">匯入</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

// ────────────────────────────────────────────────────────────
// 同步建立自動回覆：切換顯示
// ────────────────────────────────────────────────────────────
function toggleAudReplyField() {
  var checked = document.getElementById('audAutoReply').checked;
  document.getElementById('audReplyField').style.display = checked ? 'block' : 'none';
}

// ────────────────────────────────────────────────────────────
// 搜尋過濾
// ────────────────────────────────────────────────────────────
function filterAudience() {
  var keyword = (document.getElementById('audienceSearch').value || '').trim().toLowerCase();

  if (!keyword) {
    _audienceFiltered = _audienceAll.slice();
  } else {
    _audienceFiltered = _audienceAll.filter(function(row) {
      return (row.name    || '').toLowerCase().includes(keyword) ||
             (row.keyword || '').toLowerCase().includes(keyword);
    });
  }

  _audiencePage = 1;
  _renderAudienceTable();
  _renderAudiencePager();
}

// ────────────────────────────────────────────────────────────
// 渲染表格（依目前頁碼切片）
// ────────────────────────────────────────────────────────────
function _renderAudienceTable() {
  var wrap = document.getElementById('audienceTableWrap');
  var hint = document.getElementById('audienceTotalHint');
  if (!wrap) return;

  var total = _audienceFiltered.length;
  if (hint) hint.textContent = '共 ' + total + ' 筆';

  if (total === 0) {
    wrap.innerHTML = '<p class="empty">沒有符合的受眾</p>';
    return;
  }

  var start = (_audiencePage - 1) * _audiencePageSize;
  var end   = Math.min(start + _audiencePageSize, total);
  var page  = _audienceFiltered.slice(start, end);

  var rows = page.map(function(row) {
    var rmName = '-';
    if (row.rich_menu_id) {
      var sel = document.getElementById('audienceRichMenu');
      if (sel) {
        var opt = sel.querySelector('option[value="' + row.rich_menu_id + '"]');
        if (opt) rmName = opt.textContent;
      }
      if (rmName === '-') rmName = row.rich_menu_id.substring(0, 12) + '...';
    }

    var rowJson = encodeURIComponent(JSON.stringify(row));
    return '<tr>' +
      '<td>' + _esc(row.name) + '</td>' +
      '<td>' + (row.keyword ? _esc(row.keyword) : '-') + '</td>' +
      '<td>' + (row.count || 0) + ' 人</td>' +
      '<td>' + rmName + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn btn-edit" ' +
          'onclick="editAudience(' + row.index + ',\'' + rowJson + '\')">編輯</button> ' +
        '<button class="btn btn-sync" ' +
          'onclick="syncCount(\'' + _esc(row.audience_id) + '\',' + row.index + ')">同步人數</button> ' +
        '<button class="btn btn-primary" ' +
          'onclick="openImportModal(\'' + _esc(row.audience_id) + '\',\'' + _esc(row.name) + '\')">匯入UID</button> ' +
        '<button class="btn btn-danger" ' +
          'onclick="doDeleteAudience(\'' + _esc(row.audience_id) + '\',' + row.index + ')">刪除</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  wrap.innerHTML =
    '<table>' +
      '<thead><tr>' +
        '<th>受眾名稱</th>' +
        '<th>觸發關鍵字</th>' +
        '<th>人數</th>' +
        '<th>對應圖文選單</th>' +
        '<th>操作</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';
}

// ────────────────────────────────────────────────────────────
// 渲染分頁列
// ────────────────────────────────────────────────────────────
function _renderAudiencePager() {
  var pager = document.getElementById('audiencePager');
  if (!pager) return;

  var total      = _audienceFiltered.length;
  var totalPages = Math.ceil(total / _audiencePageSize);

  if (totalPages <= 1) { pager.innerHTML = ''; return; }

  var btnStyle = 'style="padding:6px 12px;border-radius:6px;border:1.5px solid #e0e0e0;' +
                 'background:white;cursor:pointer;font-size:13px;"';
  var activeBtnStyle = 'style="padding:6px 12px;border-radius:6px;border:none;' +
                       'background:#06C755;color:white;cursor:pointer;font-size:13px;font-weight:600;"';

  var html = '';

  html += '<button ' + (_audiencePage === 1 ? 'disabled ' : '') + btnStyle +
          ' onclick="gotoAudiencePage(' + (_audiencePage - 1) + ')">上一頁</button>';

  var pages = _buildPageNumbers(totalPages, _audiencePage);
  pages.forEach(function(p) {
    if (p === '...') {
      html += '<span style="padding:6px 4px;color:#aaa;">...</span>';
    } else {
      html += '<button ' + (p === _audiencePage ? activeBtnStyle : btnStyle) +
              ' onclick="gotoAudiencePage(' + p + ')">' + p + '</button>';
    }
  });

  html += '<button ' + (_audiencePage === totalPages ? 'disabled ' : '') + btnStyle +
          ' onclick="gotoAudiencePage(' + (_audiencePage + 1) + ')">下一頁</button>';

  pager.innerHTML = html;
}

function _buildPageNumbers(total, current) {
  if (total <= 7) {
    var arr = [];
    for (var i = 1; i <= total; i++) arr.push(i);
    return arr;
  }
  var pages = [1];
  if (current > 3)       pages.push('...');
  for (var i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

function gotoAudiencePage(page) {
  var totalPages = Math.ceil(_audienceFiltered.length / _audiencePageSize);
  if (page < 1 || page > totalPages) return;
  _audiencePage = page;
  _renderAudienceTable();
  _renderAudiencePager();
}

// ────────────────────────────────────────────────────────────
// 建立 / 編輯受眾 Modal
// ────────────────────────────────────────────────────────────
function openCreateModal() {
  audienceEditIndex = null;
  document.getElementById('audienceModalTitle').textContent = '建立受眾';
  document.getElementById('audienceSaveBtn').textContent    = '建立';
  document.getElementById('audienceName').value     = '';
  document.getElementById('audienceKeyword').value  = '';
  document.getElementById('audienceRichMenu').value = '';
  // 重置同步回覆欄位
  document.getElementById('audAutoReply').checked       = false;
  document.getElementById('audReplyContent').value      = '';
  document.getElementById('audReplyField').style.display = 'none';
  // 建立時才顯示同步回覆區塊
  document.getElementById('autoReplySection').style.display = 'block';
  document.getElementById('createModal').classList.add('show');
}

function closeCreateModal() {
  document.getElementById('createModal').classList.remove('show');
  audienceEditIndex = null;
}

function editAudience(index, rowJson) {
  var row = JSON.parse(decodeURIComponent(rowJson));
  audienceEditIndex = index;
  document.getElementById('audienceModalTitle').textContent = '編輯受眾';
  document.getElementById('audienceSaveBtn').textContent    = '儲存';
  document.getElementById('audienceName').value     = row.name         || '';
  document.getElementById('audienceKeyword').value  = row.keyword      || '';
  document.getElementById('audienceRichMenu').value = row.rich_menu_id || '';
  // 編輯時隱藏同步回覆區塊（已存在的受眾不重複建立）
  document.getElementById('autoReplySection').style.display = 'none';
  document.getElementById('createModal').classList.add('show');
}

async function saveAudience() {
  var name         = document.getElementById('audienceName').value.trim();
  var keyword      = document.getElementById('audienceKeyword').value.trim();
  var richMenuId   = document.getElementById('audienceRichMenu').value;
  var autoReply    = document.getElementById('audAutoReply')
                       ? document.getElementById('audAutoReply').checked
                       : false;
  var replyContent = document.getElementById('audReplyContent')
                       ? document.getElementById('audReplyContent').value.trim()
                       : '';

  if (!name) { showToast('請填入受眾名稱', 'error'); return; }
  if (autoReply && !keyword)      { showToast('要同步建立回覆，請先填入觸發關鍵字', 'error'); return; }
  if (autoReply && !replyContent) { showToast('請填入回覆內容', 'error'); return; }

  var result;
  if (audienceEditIndex !== null) {
    // 編輯：不帶 auto_reply 參數
    result = await apiCall({
      action:       'updateAudience',
      index:        audienceEditIndex,
      name:         name,
      keyword:      keyword,
      rich_menu_id: richMenuId
    });
  } else {
    // 建立：帶入同步回覆參數
    result = await apiCall({
      action:        'createAudience',
      name:          name,
      keyword:       keyword,
      rich_menu_id:  richMenuId,
      auto_reply:    autoReply,
      reply_content: replyContent
    });
  }

  if (result.success) {
    closeCreateModal();
    showToast(
      audienceEditIndex !== null
        ? '更新成功'
        : (result.data && result.data.message ? result.data.message : '受眾建立成功'),
      'success'
    );
    loadAudience();
  } else {
    showToast(result.message, 'error');
  }
}

// ────────────────────────────────────────────────────────────
// 匯入 UID Modal
// ────────────────────────────────────────────────────────────
function openImportModal(audienceId, name) {
  currentAudienceId = audienceId;
  document.getElementById('importModalTitle').textContent = '受眾：' + name;
  document.getElementById('importUids').value = '';
  document.getElementById('importModal').classList.add('show');
}

function closeImportModal() {
  document.getElementById('importModal').classList.remove('show');
  document.getElementById('importUids').value = '';
  currentAudienceId = null;
}

async function doImportAudience() {
  var raw  = document.getElementById('importUids').value.trim();
  var uids = raw.split('\n').map(function(u) { return u.trim(); }).filter(Boolean);

  if (uids.length === 0) { showToast('請填入至少一筆 UID', 'error'); return; }

  var result = await apiCall({
    action:      'importAudience',
    audience_id: currentAudienceId,
    uids:        uids
  });

  if (result.success) {
    closeImportModal();
    showToast(result.message, 'success');
    loadAudience();
  } else {
    showToast(result.message, 'error');
  }
}

// ────────────────────────────────────────────────────────────
// 同步人數
// ────────────────────────────────────────────────────────────
async function syncCount(audienceId, index) {
  showToast('同步中...');
  var result = await apiCall({ action: 'syncAudienceCount', audience_id: audienceId });
  if (result.success) {
    showToast('人數已更新：' + result.data.count + ' 人', 'success');
    loadAudience();
  } else {
    showToast(result.message, 'error');
  }
}

// ────────────────────────────────────────────────────────────
// 刪除受眾
// ────────────────────────────────────────────────────────────
async function doDeleteAudience(audienceId, index) {
  var ok = await confirmDialog('確定要刪除這個受眾嗎？此操作無法復原。');
  if (!ok) return;

  var result = await apiCall({
    action:      'deleteAudience',
    audience_id: audienceId,
    index:       index
  });

  if (result.success) {
    showToast('受眾已刪除', 'success');
    loadAudience();
  } else {
    showToast(result.message, 'error');
  }
}

// ────────────────────────────────────────────────────────────
// 工具函式
// ────────────────────────────────────────────────────────────
function _esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
