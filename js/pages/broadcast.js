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
            <label>快速範本</label>
            <div style="display:flex;gap:8px;margin-bottom:12px">
              <button class="btn btn-edit" onclick="fillFlexTemplate('announce')">📢 公告</button>
              <button class="btn btn-edit" onclick="fillFlexTemplate('coupon')">🎫 優惠券</button>
              <button class="btn btn-edit" onclick="fillFlexTemplate('event')">🎉 活動</button>
            </div>
          </div>
          <div class="form-group">
            <label>Alt Text（通知列顯示文字）</label>
            <input id="bc-alt-text" type="text" placeholder="例：最新公告">
          </div>
          <div class="form-group">
            <label>
              Flex JSON
              <a href="https://developers.line.biz/flex-simulator/" target="_blank"
                 style="font-size:12px;color:#06C755;margin-left:8px">
                ✏️ 開啟 LINE Flex 編輯器
              </a>
            </label>
            <textarea id="bc-flex-json" rows="8" placeholder="貼上 Flex JSON..."></textarea>
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

function fillFlexTemplate(type) {
  const templates = {
    announce: {
      altText: '最新公告',
      json: JSON.stringify({
        type: 'bubble',
        header: {
          type: 'box', layout: 'vertical',
          backgroundColor: '#1a1a2e',
          contents: [{ type: 'text', text: '📢 最新公告', color: '#ffffff', size: 'lg', weight: 'bold' }]
        },
        body: {
          type: 'box', layout: 'vertical', spacing: 'md',
          contents: [
            { type: 'text', text: '公告標題', size: 'lg', weight: 'bold', wrap: true },
            { type: 'text', text: '請在此填入公告內容，可以換行顯示。', size: 'sm', color: '#666666', wrap: true }
          ]
        },
        footer: {
          type: 'box', layout: 'vertical',
          contents: [{
            type: 'button', style: 'primary', color: '#06C755',
            action: { type: 'uri', label: '了解更多', uri: 'https://line.me' }
          }]
        }
      }, null, 2)
    },
    coupon: {
      altText: '專屬優惠券',
      json: JSON.stringify({
        type: 'bubble',
        body: {
          type: 'box', layout: 'vertical', spacing: 'md',
          contents: [
            { type: 'text', text: '🎫 專屬優惠', weight: 'bold', size: 'xl', color: '#06C755' },
            { type: 'separator' },
            { type: 'text', text: '優惠內容說明', size: 'md', wrap: true },
            { type: 'text', text: '折扣碼：SAVE2026', size: 'lg', weight: 'bold', color: '#e53e3e' },
            { type: 'separator' },
            { type: 'text', text: '有效期限：2026/12/31', size: 'xs', color: '#999999' }
          ]
        },
        footer: {
          type: 'box', layout: 'vertical',
          contents: [{
            type: 'button', style: 'primary', color: '#06C755',
            action: { type: 'message', label: '立即使用', text: '使用優惠券' }
          }]
        }
      }, null, 2)
    },
    event: {
      altText: '活動通知',
      json: JSON.stringify({
        type: 'bubble',
        header: {
          type: 'box', layout: 'vertical',
          backgroundColor: '#06C755',
          contents: [{ type: 'text', text: '🎉 活動通知', color: '#ffffff', weight: 'bold', size: 'lg' }]
        },
        body: {
          type: 'box', layout: 'vertical', spacing: 'md',
          contents: [
            { type: 'text', text: '活動名稱', weight: 'bold', size: 'xl', wrap: true },
            { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
              { type: 'box', layout: 'baseline', contents: [
                { type: 'text', text: '時間', size: 'sm', color: '#999999', flex: 2 },
                { type: 'text', text: '2026/06/01 14:00', size: 'sm', flex: 5, wrap: true }
              ]},
              { type: 'box', layout: 'baseline', contents: [
                { type: 'text', text: '地點', size: 'sm', color: '#999999', flex: 2 },
                { type: 'text', text: '台北市信義區', size: 'sm', flex: 5, wrap: true }
              ]}
            ]}
          ]
        },
        footer: {
          type: 'box', layout: 'vertical',
          contents: [{
            type: 'button', style: 'primary', color: '#06C755',
            action: { type: 'message', label: '我要報名', text: '報名活動' }
          }]
        }
      }, null, 2)
    }
  };

  const t = templates[type];
  if (!t) return;
  document.getElementById('bc-alt-text').value  = t.altText;
  document.getElementById('bc-flex-json').value = t.json;
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
