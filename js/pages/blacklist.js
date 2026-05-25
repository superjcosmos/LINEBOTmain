// pages/blacklist.js

let _blacklistData = [];

function loadBlacklist() {
  setContent(`
    <div class="page-header">
      <h2>黑名單管理</h2>
      <button class="btn btn-danger" onclick="openAddBlacklistModal()">+ 加入黑名單</button>
    </div>
    <div id="blacklist-content">載入中...</div>
  `);
  fetchBlacklist();
}

async function fetchBlacklist() {
  const res = await apiCall({ action: 'getBlacklist' });
  if (!res.success) { showToast(res.message || '載入失敗', 'error'); return; }
  _blacklistData = res.data.list || [];
  renderBlacklist();
}

function renderBlacklist() {
  if (_blacklistData.length === 0) {
    setContent('blacklist-content', '<p style="color:#999;padding:20px;">黑名單目前為空</p>');
    return;
  }

  const rows = _blacklistData.map(item => `
    <tr>
      <td><code>${item.user_id}</code></td>
      <td>${item.display_name || '—'}</td>
      <td>${item.note || '—'}</td>
      <td>
        <button class="btn btn-sm btn-secondary"
                onclick="openEditNoteModal(${item.row_index}, '${escapeHtml(item.note)}')">
          編輯備註
        </button>
        <button class="btn btn-sm btn-danger"
                onclick="confirmDeleteBlacklist(${item.row_index}, '${escapeHtml(item.display_name || item.user_id)}')">
          移除
        </button>
      </td>
    </tr>`).join('');

  setContent('blacklist-content', `
    <table class="table">
      <thead>
        <tr>
          <th>User ID</th>
          <th>顯示名稱</th>
          <th>備註</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`);
}

function openAddBlacklistModal() {
  const html = `
    <div class="modal-overlay" id="blacklist-modal">
      <div class="modal-box">
        <h3>加入黑名單</h3>
        <div class="form-group">
          <label>User ID <span style="color:red">*</span></label>
          <input type="text" id="bl-uid" class="form-control" placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
        </div>
        <div class="form-group">
          <label>顯示名稱（選填）</label>
          <input type="text" id="bl-name" class="form-control">
        </div>
        <div class="form-group">
          <label>備註（選填）</label>
          <input type="text" id="bl-note" class="form-control" placeholder="例：騷擾用戶">
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeBlacklistModal()">取消</button>
          <button class="btn btn-danger" onclick="submitAddBlacklist()">確認加入</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function openEditNoteModal(rowIndex, currentNote) {
  const html = `
    <div class="modal-overlay" id="blacklist-modal">
      <div class="modal-box">
        <h3>編輯備註</h3>
        <div class="form-group">
          <label>備註</label>
          <input type="text" id="bl-edit-note" class="form-control" value="${escapeHtml(currentNote)}">
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeBlacklistModal()">取消</button>
          <button class="btn btn-primary" onclick="submitEditNote(${rowIndex})">儲存</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function closeBlacklistModal() {
  const modal = document.getElementById('blacklist-modal');
  if (modal) modal.remove();
}

async function submitAddBlacklist() {
  const userId = document.getElementById('bl-uid').value.trim();
  const name   = document.getElementById('bl-name').value.trim();
  const note   = document.getElementById('bl-note').value.trim();

  if (!userId) { showToast('請輸入 User ID', 'error'); return; }

  const res = await apiCall({ action: 'addBlacklist', user_id: userId, display_name: name, note });
  if (res.success) {
    showToast('已加入黑名單', 'success');
    closeBlacklistModal();
    fetchBlacklist();
  } else {
    showToast(res.message || '操作失敗', 'error');
  }
}

async function submitEditNote(rowIndex) {
  const note = document.getElementById('bl-edit-note').value.trim();
  const res  = await apiCall({ action: 'updateBlacklist', row_index: rowIndex, note });
  if (res.success) {
    showToast('備註已更新', 'success');
    closeBlacklistModal();
    fetchBlacklist();
  } else {
    showToast(res.message || '更新失敗', 'error');
  }
}

async function confirmDeleteBlacklist(rowIndex, name) {
  const ok = await confirmDialog(`確定要將「${name}」從黑名單移除？`);
  if (!ok) return;
  const res = await apiCall({ action: 'deleteBlacklist', row_index: rowIndex });
  if (res.success) {
    showToast('已移除', 'success');
    fetchBlacklist();
  } else {
    showToast(res.message || '移除失敗', 'error');
  }
}

async function submitEditNote(rowIndex) {
  const note = document.getElementById('bl-edit-note').value.trim();
  const res  = await apiCall({ action: 'updateBlacklist', row_index: rowIndex, note });
  if (res.success) {
    showToast('備註已更新', 'success');
    closeBlacklistModal();
    fetchBlacklist();
  } else {
    showToast(res.message || '更新失敗', 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
            .replace(/'/g,'&#39;');
}
