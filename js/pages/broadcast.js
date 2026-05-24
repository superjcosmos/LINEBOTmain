// pages/broadcast.js

let audienceListForBroadcast = [];

async function loadBroadcast() {
  const aRes = await apiCall({ action: 'getAudienceList' });
  audienceListForBroadcast = aRes.data || [];

  const logRes = await apiCall({ action: 'getBroadcastLog' });
  renderBroadcastPage(logRes.data || []);
}

function renderBroadcastPage(logs) {
  const rows = logs.map(l => `
    <tr>
      <td>${formatDate(l.time)}</td>
      <td>${l.target}</td>
      <td>${l.message_type}</td>
      <td>${String(l.content_preview).slice(0, 30)}</td>
      <td>${l.total}</td>
      <td>${l.success}</td>
    </tr>
  `).join('');

  setContent('mainContent', `
    <div class="page-title">推播管理</div>
    <div class="card">
      <div class="toolbar">
        <button class="btn btn-primary" onclick="openBroadcastModal()">＋ 新增推播</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>時間</th>
            <th>目標</th>
            <th>類型</th>
            <th>內容預覽</th>
            <th>總數</th>
            <th>成功</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6" class="empty">尚無推播記錄</td></tr>'}
        </tbody>
      </table>
    </div>
    <div id="broadcast-modal"></div>
  `);
}

function openBroadcastModal() {
  const audienceOptions = audienceListForBroadcast
    .map(a => `<option value="${a.audience_id}">${a.audience_name}（${a.count || 0}人）</option>`)
    .join('');

  setContent('broadcast-modal', `
    <div class="modal-overlay show">
      <div class="modal">
        <h3>新增推播訊息</h3>
        <div class="form-group">
          <label>推播對象</label>
          <select id="bc-target" onchange="toggleAudienceSelect()">
            <option value="all">全部用戶</option>
            <option value="audience">指定受眾</option>
          </select>
        </div>
        <div id="bc-audience-select" style="display:none">
          <div class="form-group">
            <label>選擇受眾</label>
            <select id="bc-audience-id">${audienceOptions || '<option>尚無受眾</option>'}</select>
          </div>
        </div>
        <div class="form-group">
          <label>訊息類型</label>
          <select id="bc-type" onchange="toggleMessageFields()">
            <option value="text">純文字</option>
            <option value="image">圖片</option>
            <option value="flex">Flex Message</option>
          </select>
        </div>
        <div id="bc-text-fields">
          <div class="form-group">
            <label>訊息內容</label>
            <textarea id="bc-text" rows="4" placeholder="輸入推播文字..."></textarea>
          </div>
        </div>
        <div id="bc-image-fields" style="display:none">
          <div class="form-group">
            <label>圖片網址（需為公開 https）</label>
            <input id="bc-image-url" type="url" placeholder="https://...">
          </div>
        </div>
        <div id="bc-flex-fields" style="display:none">
          <div class="form-group">
            <label>Alt Text</label>
            <input id="bc-alt-text" type="text" placeholder="訊息摘要">
          </div>
          <div class="form-group">
            <label>Flex JSON</label>
            <textarea id="bc-flex-json" rows="6" placeholder='{"type":"bubble",...}'></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="closeBroadcastModal()">取消</button>
          <button class="btn btn-primary" onclick="submitBroadcast()">確認推播</button>
        </div>
      </div>
    </div>
  `);
}

function toggleAudienceSelect() {
  const target = document.getElementById('bc-target').value;
  document.getElementById('bc-audience-select').style.display = target === 'audience' ? '' : 'none';
}

function toggleMessageFields() {
  const type = document.getElementById('bc-type').value;
  document.getElementById('bc-text-fields').style.display  = type === 'text'  ? '' : 'none';
  document.getElementById('bc-image-fields').style.display = type === 'image' ? '' : 'none';
  document.getElementById('bc-flex-fields').style.display  = type === 'flex'  ? '' : 'none';
}

async function submitBroadcast() {
  const target = document.getElementById('bc-target').value;
  const type   = document.getElementById('bc-type').value;

  let content = {};
  if (type === 'text')  content.text      = document.getElementById('bc-text').value;
  if (type === 'image') content.image_url = document.getElementById('bc-image-url').value;
  if (type === 'flex') {
    content.alt_text  = document.getElementById('bc-alt-text').value;
    content.flex_json = document.getElementById('bc-flex-json').value;
  }

  if (!content.text && !content.image_url && !content.flex_json) {
    return showToast('請填寫訊息內容', 'error');
  }

  const confirmed = await confirmDialog(
    target === 'all'
      ? '確定要推播給所有用戶？此操作不可復原。'
      : '確定要推播給指定受眾？'
  );
  if (!confirmed) return;

  showToast('推播中，請稍候...');

  let res;
  if (target === 'all') {
    res = await apiCall({
      action:       'broadcastToAll',
      message_type: type,
      content:      content,
      target:       'all'
    });
  } else {
    const audienceId = document.getElementById('bc-audience-id').value;
    res = await apiCall({
      action:       'broadcastToAudience',
      audience_id:  audienceId,
      message_type: type,
      content:      content,
      target:       'audience'
    });
  }

  if (res.success) {
    showToast(`推播完成！成功 ${res.data.success} / 總計 ${res.data.total}`);
    closeBroadcastModal();
    loadBroadcast();
  } else {
    showToast(res.message || '推播失敗', 'error');
  }
}

function closeBroadcastModal() {
  setContent('broadcast-modal', '');
}
