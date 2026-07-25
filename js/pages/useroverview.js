// ============================================================
// js/pages/useroverview.js
// ⚠️ 已套用 CODE_STYLE.md 規範：escHtml / confirmAndRun / renderPager
// ============================================================

var _uoAll      = [];
var _uoFiltered = [];
var _uoPage     = 1;
var _uoPageSize = 20;
var _uoTagList  = [];
var _uoCurrentUserId = null;
var _uoCurrentUserName = null;

async function loadUserOverview() {
  setContent('<div class="loading">載入中...</div>');

  var userResult = await apiCall({ action: 'getUserOverview' });
  var tagResult  = await apiCall({ action: 'getTagList' });

  if (!userResult.success) {
    setContent('<div class="empty">載入失敗：' + escHtml(userResult.message) + '</div>');
    return;
  }

  _uoTagList = (tagResult.success ? tagResult.data : []).filter(function(t) {
    return t.status === 'active';
  });

  _uoAll      = userResult.data || [];
  _uoFiltered = _uoAll.slice();
  _uoPage     = 1;

  setContent(_buildUoShell());

  _renderUoTable();
  _renderUoPager();
}

function _buildUoShell() {
  return '' +
    '<h2 class="page-title">用戶總覽</h2>' +
    '<div class="card">' +
      '<div class="toolbar" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">' +
        '<input type="text" id="uoSearch"' +
          ' placeholder="搜尋顯示名稱或標籤..."' +
          ' oninput="filterUo()"' +
          ' style="flex:1;min-width:180px;max-width:320px;' +
                  'padding:8px 12px;border:1.5px solid #e0e0e0;' +
                  'border-radius:8px;font-size:14px;outline:none;">' +
        '<span id="uoTotalHint" style="color:#888;font-size:13px;white-space:nowrap;"></span>' +
      '</div>' +

      '<div id="uoTableWrap"></div>' +

      '<div id="uoPager" style="display:flex;justify-content:center;' +
           'gap:6px;margin-top:16px;flex-wrap:wrap;"></div>' +

    '</div>' +

    '<div class="modal-overlay" id="uoAddTagModal">' +
      '<div class="modal">' +
        '<h3>新增標籤</h3>' +
        '<p id="uoAddTagUserHint" style="color:#888;font-size:13px;margin-bottom:12px;"></p>' +
        '<div class="form-group">' +
          '<label>選擇標籤</label>' +
          '<select id="uoTagSelect"></select>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeUoAddTagModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="doAddUserTag()">新增</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function filterUo() {
  var keyword = (document.getElementById('uoSearch').value || '').trim().toLowerCase();

  if (!keyword) {
    _uoFiltered = _uoAll.slice();
  } else {
    _uoFiltered = _uoAll.filter(function(row) {
      var nameMatch = (row.display_name || '').toLowerCase().includes(keyword);
      var tagMatch  = (row.tags || []).some(function(t) {
        return t.toLowerCase().includes(keyword);
      });
      return nameMatch || tagMatch;
    });
  }

  _uoPage = 1;
  _renderUoTable();
  _renderUoPager();
}

function _renderUoTable() {
  var wrap = document.getElementById('uoTableWrap');
  var hint = document.getElementById('uoTotalHint');
  if (!wrap) return;

  var total = _uoFiltered.length;
  if (hint) hint.textContent = '共 ' + total + ' 位用戶';

  if (total === 0) {
    wrap.innerHTML = '<p class="empty">沒有符合的用戶</p>';
    return;
  }

  var start = (_uoPage - 1) * _uoPageSize;
  var end   = Math.min(start + _uoPageSize, total);
  var page  = _uoFiltered.slice(start, end);

  var rows = page.map(function(row) {
    var tagChips = (row.tags || []).filter(Boolean).map(function(t) {
      return '<span class="tag-chip" style="display:inline-block;background:#eef7f0;' +
        'color:#06C755;border-radius:12px;padding:2px 10px;margin:2px 4px 2px 0;font-size:12px;">' +
        escHtml(t) +
        ' <a href="javascript:void(0)" onclick="doRemoveUserTag(\'' + escHtml(row.user_id) + '\',\'' + escHtml(t) + '\')" ' +
          'style="color:#e74c3c;text-decoration:none;margin-left:4px;">×</a>' +
        '</span>';
    }).join('');

    return '<tr>' +
      '<td>' + escHtml(row.display_name || row.user_id) + '</td>' +
      '<td>' + (row.last_seen ? escHtml(String(row.last_seen)) : '-') + '</td>' +
      '<td>' + (tagChips || '<span style="color:#bbb;">無標籤</span>') + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn btn-primary" ' +
          'onclick="openUoAddTagModal(\'' + escHtml(row.user_id) + '\',\'' + escHtml(row.display_name || row.user_id) + '\')">＋ 貼標籤</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  wrap.innerHTML =
    '<table>' +
      '<thead><tr>' +
        '<th>顯示名稱</th>' +
        '<th>最後互動</th>' +
        '<th>標籤</th>' +
        '<th>操作</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';
}

function _renderUoPager() {
  renderPager('uoPager', _uoFiltered.length, _uoPage, _uoPageSize, gotoUoPage);
}

function gotoUoPage(page) {
  var totalPages = Math.ceil(_uoFiltered.length / _uoPageSize);
  if (page < 1 || page > totalPages) return;
  _uoPage = page;
  _renderUoTable();
  _renderUoPager();
}

function openUoAddTagModal(userId, displayName) {
  _uoCurrentUserId   = userId;
  _uoCurrentUserName = displayName;

  document.getElementById('uoAddTagUserHint').textContent = '用戶：' + displayName;

  var options = _uoTagList.map(function(t) {
    return '<option value="' + escHtml(t.tag_id) + '">' + escHtml(t.tag_name) + '</option>';
  }).join('');
  document.getElementById('uoTagSelect').innerHTML = options || '<option value="">目前沒有可用標籤</option>';

  openModal('uoAddTagModal');
}

function closeUoAddTagModal() {
  closeModal('uoAddTagModal');
  _uoCurrentUserId   = null;
  _uoCurrentUserName = null;
}

async function doAddUserTag() {
  var tagId = document.getElementById('uoTagSelect').value;
  if (!tagId) { showToast('請選擇標籤', 'error'); return; }

  var result = await apiCall({
    action:       'addUserTag',
    user_id:      _uoCurrentUserId,
    display_name: _uoCurrentUserName,
    tag_id:       tagId
  });

  if (result.success) {
    closeUoAddTagModal();
    showToast('貼標籤成功', 'success');
    loadUserOverview();
  } else {
    showToast(result.message, 'error');
  }
}

function doRemoveUserTag(userId, tagName) {
  // ⚠️ 移除用的是 tag_id，但畫面上顯示/可點擊的是 tag_name（後端 removeUserTag 只接受 tag_id），
  //    這裡先用名稱反查對應的 tag_id 再送出
  var tag = _uoTagList.find(function(t) { return t.tag_name === tagName; });
  var tagId = tag ? tag.tag_id : '';
  if (!tagId) { showToast('找不到對應的標籤ID，請重新整理頁面', 'error'); return; }

  confirmAndRun('確定要移除「' + tagName + '」這個標籤嗎？', async function() {
    var result = await apiCall({ action: 'removeUserTag', user_id: userId, tag_id: tagId });
    if (result.success) {
      showToast('已移除標籤', 'success');
      loadUserOverview();
    } else {
      showToast(result.message, 'error');
    }
  });
}
