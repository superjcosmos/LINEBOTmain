// ============================================================
// js/pages/audience.js
// ⚠️ 已套用 CODE_STYLE.md 規範：escHtml / confirmAndRun / renderPager
// ============================================================

var _audienceAll      = [];
var _audienceFiltered = [];
var _audiencePage     = 1;
var _audiencePageSize = 20;
var _audienceRmOptions = '';
var audienceEditIndex  = null;
var currentAudienceId  = null;

async function loadAudience() {
  setContent('<div class="loading">載入中...</div>');

  var audienceResult = await apiCall({ action: 'getAudienceList' });
  var richMenuResult = await apiCall({ action: 'getRichMenuList' });

  if (!audienceResult.success) {
    setContent('<div class="empty">載入失敗：' + escHtml(audienceResult.message) + '</div>');
    return;
  }

  if (audienceResult.data.length > 0) {
    await Promise.all(audienceResult.data.map(function(row) {
      return apiCall({ action: 'syncAudienceCount', audience_id: row.audience_id });
    }));
    audienceResult = await apiCall({ action: 'getAudienceList' });
  }

  _audienceRmOptions = '<option value="">不切換圖文選單</option>';
  if (richMenuResult.success) {
    richMenuResult.data.forEach(function(rm) {
      _audienceRmOptions += '<option value="' + escHtml(rm.rich_menu_id) + '">' + escHtml(rm.name) + '</option>';
    });
  }

  _audienceAll      = audienceResult.data || [];
  _audienceFiltered = _audienceAll.slice();
  _audiencePage     = 1;

  setContent(_buildAudienceShell());

  _renderAudienceTable();
  _renderAudiencePager();
}

function _buildAudienceShell() {
  return '' +
    '<h2 class="page-title">受眾管理</h2>' +
    '<div class="card">' +
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

      '<div id="audienceTableWrap"></div>' +

      '<div id="audiencePager" style="display:flex;justify-content:center;' +
           'gap:6px;margin-top:16px;flex-wrap:wrap;"></div>' +

    '</div>' +

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

function toggleAudReplyField() {
  var checked = document.getElementById('audAutoReply').checked;
  document.getElementById('audReplyField').style.display = checked ? 'block' : 'none';
}

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
      '<td>' + escHtml(row.name) + '</td>' +
      '<td>' + (row.keyword ? escHtml(row.keyword) : '-') + '</td>' +
      '<td>' + (row.count || 0) + ' 人</td>' +
      '<td>' + escHtml(rmName) + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn btn-edit" ' +
          'onclick="editAudience(' + row.index + ',\'' + rowJson + '\')">編輯</button> ' +
        '<button class="btn btn-sync" ' +
          'onclick="syncCount(\'' + escHtml(row.audience_id) + '\',' + row.index + ')">同步人數</button> ' +
        '<button class="btn btn-primary" ' +
          'onclick="openImportModal(\'' + escHtml(row.audience_id) + '\',\'' + escHtml(row.name) + '\')">匯入UID</button> ' +
        '<button class="btn btn-danger" ' +
          'onclick="doDeleteAudience(\'' + escHtml(row.audience_id) + '\',' + row.index + ')">刪除</button>' +
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

function _renderAudiencePager() {
  renderPager('audiencePager', _audienceFiltered.length, _audiencePage, _audiencePageSize, gotoAudiencePage);
}

function gotoAudiencePage(page) {
  var totalPages = Math.ceil(_audienceFiltered.length / _audiencePageSize);
  if (page < 1 || page > totalPages) return;
  _audiencePage = page;
  _renderAudienceTable();
  _renderAudiencePager();
}

function openCreateModal() {
  audienceEditIndex = null;
  document.getElementById('audienceModalTitle').textContent = '建立受眾';
  document.getElementById('audienceSaveBtn').textContent    = '建立';
  document.getElementById('audienceName').value     = '';
  document.getElementById('audienceKeyword').value  = '';
  document.getElementById('audienceRichMenu').value = '';
  document.getElementById('audAutoReply').checked       = false;
  document.getElementById('audReplyContent').value      = '';
  document.getElementById('audReplyField').style.display = 'none';
  document.getElementById('autoReplySection').style.display = 'block';
  openModal('createModal');
}

function closeCreateModal() {
  closeModal('createModal');
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
  document.getElementById('autoReplySection').style.display = 'none';
  openModal('createModal');
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
    result = await apiCall({
      action:       'updateAudience',
      index:        audienceEditIndex,
      name:         name,
      keyword:      keyword,
      rich_menu_id: richMenuId
    });
  } else {
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

function openImportModal(audienceId, name) {
  currentAudienceId = audienceId;
  document.getElementById('importModalTitle').textContent = '受眾：' + name;
  document.getElementById('importUids').value = '';
  openModal('importModal');
}

function closeImportModal() {
  closeModal('importModal');
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

async function doDeleteAudience(audienceId, index) {
  await confirmAndRun('確定要刪除這個受眾嗎？此操作無法復原。', async function() {
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
  });
}
