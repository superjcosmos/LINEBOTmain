// ============================================================
// js/pages/tag.js
// ⚠️ 已套用 CODE_STYLE.md 規範：escHtml / confirmAndRun / renderPager
// ============================================================

var _tagAll      = [];
var _tagFiltered  = [];
var _tagPage      = 1;
var _tagPageSize  = 20;
var tagEditId     = null;

async function loadTag() {
  setContent('<div class="loading">載入中...</div>');

  var result = await apiCall({ action: 'getTagList' });

  if (!result.success) {
    setContent('<div class="empty">載入失敗：' + escHtml(result.message) + '</div>');
    return;
  }

  _tagAll      = result.data || [];
  _tagFiltered = _tagAll.slice();
  _tagPage     = 1;

  setContent(_buildTagShell());

  _renderTagTable();
  _renderTagPager();
}

function _buildTagShell() {
  return '' +
    '<h2 class="page-title">標籤管理</h2>' +
    '<div class="card">' +
      '<div class="toolbar" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">' +
        '<button class="btn btn-primary" onclick="openCreateTagModal()">＋ 建立標籤</button>' +
        '<input type="text" id="tagSearch"' +
          ' placeholder="搜尋標籤名稱或關鍵字..."' +
          ' oninput="filterTag()"' +
          ' style="flex:1;min-width:180px;max-width:320px;' +
                  'padding:8px 12px;border:1.5px solid #e0e0e0;' +
                  'border-radius:8px;font-size:14px;outline:none;">' +
        '<span id="tagTotalHint" style="color:#888;font-size:13px;white-space:nowrap;"></span>' +
      '</div>' +

      '<div id="tagTableWrap"></div>' +

      '<div id="tagPager" style="display:flex;justify-content:center;' +
           'gap:6px;margin-top:16px;flex-wrap:wrap;"></div>' +

    '</div>' +

    '<div class="modal-overlay" id="tagModal">' +
      '<div class="modal">' +
        '<h3 id="tagModalTitle">建立標籤</h3>' +

        '<div class="form-group">' +
          '<label>標籤名稱</label>' +
          '<input type="text" id="tagName" placeholder="例如：VIP客戶">' +
        '</div>' +

        '<div class="form-group">' +
          '<label>分類（選填）</label>' +
          '<input type="text" id="tagCategory" placeholder="例如：會員等級">' +
        '</div>' +

        '<div class="form-group">' +
          '<label>觸發關鍵字（選填）</label>' +
          '<input type="text" id="tagKeyword" placeholder="用戶輸入此關鍵字自動貼標">' +
        '</div>' +

        '<div class="form-group">' +
          '<label>狀態</label>' +
          '<select id="tagStatus">' +
            '<option value="active">啟用</option>' +
            '<option value="inactive">停用</option>' +
          '</select>' +
        '</div>' +

        '<div class="form-group">' +
          '<label>備註（選填）</label>' +
          '<textarea id="tagNote" rows="2" placeholder="內部備註"></textarea>' +
        '</div>' +

        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeCreateTagModal()">取消</button>' +
          '<button class="btn btn-primary" id="tagSaveBtn" onclick="saveTagItem()">建立</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function filterTag() {
  var keyword = (document.getElementById('tagSearch').value || '').trim().toLowerCase();

  if (!keyword) {
    _tagFiltered = _tagAll.slice();
  } else {
    _tagFiltered = _tagAll.filter(function(row) {
      return (row.tag_name || '').toLowerCase().includes(keyword) ||
             (row.keyword  || '').toLowerCase().includes(keyword);
    });
  }

  _tagPage = 1;
  _renderTagTable();
  _renderTagPager();
}

function _renderTagTable() {
  var wrap = document.getElementById('tagTableWrap');
  var hint = document.getElementById('tagTotalHint');
  if (!wrap) return;

  var total = _tagFiltered.length;
  if (hint) hint.textContent = '共 ' + total + ' 筆';

  if (total === 0) {
    wrap.innerHTML = '<p class="empty">沒有符合的標籤</p>';
    return;
  }

  var start = (_tagPage - 1) * _tagPageSize;
  var end   = Math.min(start + _tagPageSize, total);
  var page  = _tagFiltered.slice(start, end);

  var rows = page.map(function(row) {
    var rowJson = encodeURIComponent(JSON.stringify(row));
    return '<tr>' +
      '<td>' + escHtml(row.tag_name) + '</td>' +
      '<td>' + (row.category ? escHtml(row.category) : '-') + '</td>' +
      '<td>' + (row.keyword  ? escHtml(row.keyword)  : '-') + '</td>' +
      '<td>' + (row.status === 'active' ? '啟用' : '停用') + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn btn-edit" ' +
          'onclick="editTag(\'' + escHtml(row.tag_id) + '\',\'' + rowJson + '\')">編輯</button> ' +
        '<button class="btn btn-danger" ' +
          'onclick="doDeleteTag(\'' + escHtml(row.tag_id) + '\')">刪除</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  wrap.innerHTML =
    '<table>' +
      '<thead><tr>' +
        '<th>標籤名稱</th>' +
        '<th>分類</th>' +
        '<th>觸發關鍵字</th>' +
        '<th>狀態</th>' +
        '<th>操作</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';
}

function _renderTagPager() {
  renderPager('tagPager', _tagFiltered.length, _tagPage, _tagPageSize, gotoTagPage);
}

function gotoTagPage(page) {
  var totalPages = Math.ceil(_tagFiltered.length / _tagPageSize);
  if (page < 1 || page > totalPages) return;
  _tagPage = page;
  _renderTagTable();
  _renderTagPager();
}

function openCreateTagModal() {
  tagEditId = null;
  document.getElementById('tagModalTitle').textContent = '建立標籤';
  document.getElementById('tagSaveBtn').textContent     = '建立';
  document.getElementById('tagName').value     = '';
  document.getElementById('tagCategory').value = '';
  document.getElementById('tagKeyword').value  = '';
  document.getElementById('tagStatus').value   = 'active';
  document.getElementById('tagNote').value     = '';
  openModal('tagModal');
}

function closeCreateTagModal() {
  closeModal('tagModal');
  tagEditId = null;
}

function editTag(tagId, rowJson) {
  var row = JSON.parse(decodeURIComponent(rowJson));
  tagEditId = tagId;
  document.getElementById('tagModalTitle').textContent = '編輯標籤';
  document.getElementById('tagSaveBtn').textContent     = '儲存';
  document.getElementById('tagName').value     = row.tag_name || '';
  document.getElementById('tagCategory').value = row.category || '';
  document.getElementById('tagKeyword').value  = row.keyword  || '';
  document.getElementById('tagStatus').value   = row.status   || 'active';
  document.getElementById('tagNote').value     = row.note     || '';
  openModal('tagModal');
}

async function saveTagItem() {
  var tagName  = document.getElementById('tagName').value.trim();
  var category = document.getElementById('tagCategory').value.trim();
  var keyword  = document.getElementById('tagKeyword').value.trim();
  var status   = document.getElementById('tagStatus').value;
  var note     = document.getElementById('tagNote').value.trim();

  if (!tagName) { showToast('請填入標籤名稱', 'error'); return; }

  var result = await apiCall({
    action:   'saveTag',
    tag_id:   tagEditId || '',
    tag_name: tagName,
    category: category,
    keyword:  keyword,
    status:   status,
    note:     note
  });

  if (result.success) {
    closeCreateTagModal();
    showToast(result.data && result.data.message ? result.data.message : '儲存成功', 'success');
    loadTag();
  } else {
    showToast(result.message, 'error');
  }
}

async function doDeleteTag(tagId) {
  await confirmAndRun('確定要刪除這個標籤嗎？此操作無法復原。', async function() {
    var result = await apiCall({ action: 'deleteTag', tag_id: tagId });

    if (result.success) {
      showToast('標籤已刪除', 'success');
      loadTag();
    } else {
      showToast(result.message, 'error');
    }
  });
}
