// js/pages/blacklist.js
// ⚠️ 已套用 CODE_STYLE.md 規範：escHtml / confirmAndRun / openModal/closeModal
// ⚠️ 修正：原版 submitEditNote 重複定義兩次，已清除；Modal 改為骨架預建，不再動態插入DOM

var _blacklistData = [];

function loadBlacklist() {
  setContent('' +
    '<div class="page-header">' +
      '<h2>黑名單管理</h2>' +
      '<button class="btn btn-danger" onclick="openAddBlacklistModal()">+ 加入黑名單</button>' +
    '</div>' +
    '<div id="blacklist-content">載入中...</div>' +
    _buildBlacklistModals()
  );
  fetchBlacklist();
}

async function fetchBlacklist() {
  var res = await apiCall({ action: 'getBlacklist' });
  if (!res.success) { showToast(res.message || '載入失敗', 'error'); return; }
  _blacklistData = res.data.list || [];
  renderBlacklist();
}

function renderBlacklist() {
  if (_blacklistData.length === 0) {
    setContent('blacklist-content', '<p style="color:#999;padding:20px;">黑名單目前為空</p>');
    return;
  }

  var rows = _blacklistData.map(function(item) {
    return '<tr>' +
      '<td><code>' + escHtml(item.user_id) + '</code></td>' +
      '<td>' + escHtml(item.display_name || '—') + '</td>' +
      '<td>' + escHtml(item.note || '—') + '</td>' +
      '<td>' +
        '<button class="btn btn-sm btn-secondary" ' +
          'onclick="openEditNoteModal(' + item.row_index + ',\'' + encodeURIComponent(item.note || '') + '\')">' +
          '編輯備註' +
        '</button> ' +
        '<button class="btn btn-sm btn-danger" ' +
          'onclick="confirmDeleteBlacklist(' + item.row_index + ',\'' + encodeURIComponent(item.display_name || item.user_id) + '\')">' +
          '移除' +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  setContent('blacklist-content', '' +
    '<table class="table">' +
      '<thead>' +
        '<tr>' +
          '<th>User ID</th>' +
          '<th>顯示名稱</th>' +
          '<th>備註</th>' +
          '<th>操作</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>'
  );
}

// ── Modal 骨架（預先建立於頁面載入時，預設隱藏）──
function _buildBlacklistModals() {
  return '' +
    '<div class="modal-overlay" id="blacklistAddModal">' +
      '<div class="modal-box">' +
        '<h3>加入黑名單</h3>' +
        '<div class="form-group">' +
          '<label>User ID <span style="color:red">*</span></label>' +
          '<input type="text" id="bl-uid" class="form-control" placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>顯示名稱（選填）</label>' +
          '<input type="text" id="bl-name" class="form-control">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>備註（選填）</label>' +
          '<input type="text" id="bl-note" class="form-control" placeholder="例：騷擾用戶">' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-secondary" onclick="closeModal(\'blacklistAddModal\')">取消</button>' +
          '<button class="btn btn-danger" onclick="submitAddBlacklist()">確認加入</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="modal-overlay" id="blacklistEditModal">' +
      '<div class="modal-box">' +
        '<h3>編輯備註</h3>' +
        '<input type="hidden" id="bl-edit-row-index">' +
        '<div class="form-group">' +
          '<label>備註</label>' +
          '<input type="text" id="bl-edit-note" class="form-control">' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-secondary" onclick="closeModal(\'blacklistEditModal\')">取消</button>' +
          '<button class="btn btn-primary" onclick="submitEditNote()">儲存</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function openAddBlacklistModal() {
  document.getElementById('bl-uid').value  = '';
  document.getElementById('bl-name').value = '';
  document.getElementById('bl-note').value = '';
  openModal('blacklistAddModal');
}

function openEditNoteModal(rowIndex, encodedNote) {
  document.getElementById('bl-edit-row-index').value = rowIndex;
  document.getElementById('bl-edit-note').value = decodeURIComponent(encodedNote);
  openModal('blacklistEditModal');
}

async function submitAddBlacklist() {
  var userId = document.getElementById('bl-uid').value.trim();
  var name   = document.getElementById('bl-name').value.trim();
  var note   = document.getElementById('bl-note').value.trim();

  if (!userId) { showToast('請輸入 User ID', 'error'); return; }

  var res = await apiCall({ action: 'addBlacklist', user_id: userId, display_name: name, note: note });
  if (res.success) {
    showToast('已加入黑名單', 'success');
    closeModal('blacklistAddModal');
    fetchBlacklist();
  } else {
    showToast(res.message || '操作失敗', 'error');
  }
}

async function submitEditNote() {
  var rowIndex = document.getElementById('bl-edit-row-index').value;
  var note     = document.getElementById('bl-edit-note').value.trim();
  var res = await apiCall({ action: 'updateBlacklist', row_index: rowIndex, note: note });
  if (res.success) {
    showToast('備註已更新', 'success');
    closeModal('blacklistEditModal');
    fetchBlacklist();
  } else {
    showToast(res.message || '更新失敗', 'error');
  }
}

async function confirmDeleteBlacklist(rowIndex, encodedName) {
  var name = decodeURIComponent(encodedName);
  await confirmAndRun('確定要將「' + name + '」從黑名單移除？', async function() {
    var res = await apiCall({ action: 'deleteBlacklist', row_index: rowIndex });
    if (res.success) {
      showToast('已移除', 'success');
      fetchBlacklist();
    } else {
      showToast(res.message || '移除失敗', 'error');
    }
  });
}
