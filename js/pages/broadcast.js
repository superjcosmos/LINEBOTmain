// js/pages/broadcast.js

let _broadcastAudienceData = [];
let _selectedAudience = null;
let _bcMessages = [];
const BC_MAX_MESSAGES = 5;

// Flex Message Simulator 連結
const FLEX_SIMULATOR_URL = 'https://developers.line.biz/flex-simulator/';

// ── 常用 Flex 範本 ──────────────────────────────────────
const FLEX_TEMPLATES = [
  {
    label: '🎉 促銷公告',
    json: JSON.stringify({
      type: 'bubble',
      hero: {
        type: 'image',
        url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png',
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '🎉 限時優惠', weight: 'bold', size: 'xl' },
          { type: 'text', text: '點擊下方按鈕查看詳情', size: 'sm', color: '#888888', margin: 'md' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'button', style: 'primary', action: { type: 'uri', label: '立即查看', uri: 'https://example.com' } }
        ]
      }
    }, null, 2)
  },
  {
    label: '📋 活動報名',
    json: JSON.stringify({
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '📋 活動報名', weight: 'bold', size: 'xl' },
          { type: 'text', text: '活動日期：2026/07/01', size: 'sm', color: '#888888', margin: 'md' },
          { type: 'text', text: '地點：台北市中正區', size: 'sm', color: '#888888' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'button', style: 'primary', color: '#00B900', action: { type: 'uri', label: '立即報名', uri: 'https://example.com' } }
        ]
      }
    }, null, 2)
  },
  {
    label: '📦 訂單通知',
    json: JSON.stringify({
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '📦 訂單狀態更新', weight: 'bold', size: 'lg' },
          {
            type: 'box', layout: 'vertical', margin: 'md', spacing: 'sm',
            contents: [
              { type: 'box', layout: 'baseline', contents: [
                { type: 'text', text: '訂單編號', color: '#aaaaaa', size: 'sm', flex: 1 },
                { type: 'text', text: '#123456', wrap: true, color: '#666666', size: 'sm', flex: 3 }
              ]},
              { type: 'box', layout: 'baseline', contents: [
                { type: 'text', text: '出貨狀態', color: '#aaaaaa', size: 'sm', flex: 1 },
                { type: 'text', text: '已出貨', wrap: true, color: '#00B900', size: 'sm', flex: 3 }
              ]}
            ]
          }
        ]
      }
    }, null, 2)
  }
];

// ── 主載入函式 ──────────────────────────────────────

async function loadBroadcast() {
  setContent('mainContent', `
    <div class="page-header">
      <h2>📢 推播管理</h2>
      <p class="page-desc">選擇受眾，編輯訊息，批次推播給所有用戶</p>
    </div>

    <div class="broadcast-layout">
      <!-- 左：受眾選擇 -->
      <div class="card" id="audience-select-card">
        <h3>① 選擇受眾</h3>
        <div class="search-bar">
          <input type="text" id="bc-search" placeholder="搜尋關鍵字或受眾ID…" oninput="filterBcAudience()">
        </div>
        <div id="bc-audience-list" class="bc-audience-list">
          <div class="loading-placeholder">載入中…</div>
        </div>
      </div>

      <!-- 右：訊息編輯 + 發送 -->
      <div class="card" id="message-compose-card">
        <h3>② 編輯訊息</h3>

        <div id="bc-messages-container"></div>

        <button class="btn btn-secondary btn-sm" onclick="addBcMessage()" id="add-msg-btn"
          style="margin-top:8px">
          ＋ 新增訊息（最多 ${BC_MAX_MESSAGES} 則）
        </button>

        <div class="bc-target-info" id="bc-target-info">
          請先從左側選擇受眾
        </div>

        <button class="btn btn-primary btn-block" onclick="submitBroadcast()" id="bc-send-btn" disabled>
          🚀 確認推播
        </button>
      </div>
    </div>

    <!-- 推播紀錄 -->
    <div class="card" style="margin-top:20px">
      <div class="card-header-row">
        <h3>📋 推播紀錄</h3>
        <button class="btn btn-secondary btn-sm" onclick="loadBroadcastLog()">重新整理</button>
      </div>
      <div id="bc-log-table">載入中…</div>
    </div>

    <!-- Flex 範本 Modal -->
    <div id="flex-template-modal" class="modal-overlay" style="display:none" onclick="closeFlexTemplateModal(event)">
      <div class="modal-box" style="max-width:560px">
        <div class="modal-header">
          <h3>Flex 範本</h3>
          <button class="modal-close" onclick="closeFlexTemplateModalDirect()">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:13px;color:#888;margin-bottom:12px">
            選擇範本後可在編輯區繼續修改，或前往
            <a href="${FLEX_SIMULATOR_URL}" target="_blank" style="color:#06c755">LINE Flex Simulator</a>
            設計完整版面。
          </p>
          <div id="flex-template-list">
            ${FLEX_TEMPLATES.map((t, i) => `
              <div class="flex-template-item" onclick="applyFlexTemplate(${i})">
                <span class="flex-template-label">${t.label}</span>
                <span class="flex-template-arrow">套用 →</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <style>
      /* ── 受眾列表 ── */
      .bc-audience-list {
        margin-top: 10px;
        max-height: 400px;
        overflow-y: auto;
      }
      .bc-audience-item {
        padding: 12px 14px;
        border-radius: 8px;
        cursor: pointer;
        transition: background .15s;
        margin-bottom: 4px;
        border: 1px solid transparent;
      }
      .bc-audience-item:hover { background: #f5f5f5; }
      .bc-audience-item.selected {
        background: #f0fff4;
        border-color: #06c755;
      }
      .bc-aud-name {
        font-size: 15px;
        font-weight: 600;
        color: #222;
        margin-bottom: 4px;
      }
      .bc-aud-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #888;
      }
      .bc-aud-count { color: #555; }

      /* ── 訊息區塊 ── */
      .bc-msg-block {
        border: 1px solid #e5e5e5;
        border-radius: 10px;
        margin-bottom: 12px;
        overflow: hidden;
      }
      .bc-msg-header {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        background: #fafafa;
        border-bottom: 1px solid #ebebeb;
        gap: 8px;
      }
      .bc-msg-index {
        font-size: 13px;
        font-weight: 600;
        color: #444;
        flex: 1;
      }
      /* 截圖風格：右側小 tab（圖片 | Flex | ✕） */
      .bc-msg-type-tabs {
        display: flex;
        gap: 4px;
      }
      .type-tab {
        font-size: 12px;
        padding: 3px 10px;
        border-radius: 20px;
        border: 1px solid #ddd;
        background: #fff;
        color: #666;
        cursor: pointer;
        transition: all .15s;
      }
      .type-tab:hover { background: #f0f0f0; }
      .type-tab.active {
        background: #06c755;
        color: #fff;
        border-color: #06c755;
      }
      .bc-msg-remove {
        background: none;
        border: none;
        color: #bbb;
        font-size: 16px;
        cursor: pointer;
        padding: 0 2px;
        line-height: 1;
        transition: color .15s;
      }
      .bc-msg-remove:hover { color: #e53e3e; }
      .bc-msg-body { padding: 12px; }
      .bc-textarea {
        width: 100%;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 10px;
        font-size: 14px;
        resize: vertical;
        box-sizing: border-box;
        font-family: inherit;
        transition: border-color .15s;
        line-height: 1.6;
      }
      .bc-textarea:focus { outline: none; border-color: #06c755; }
      .bc-textarea-mono { font-family: 'Courier New', monospace; font-size: 12px; }
      .bc-input-group { margin-bottom: 10px; }
      .bc-input-group label { font-size: 12px; color: #666; display: block; margin-bottom: 4px; }
      .bc-input {
        width: 100%;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 14px;
        box-sizing: border-box;
      }
      .bc-input:focus { outline: none; border-color: #06c755; }

      /* Flex 輔助工具列 */
      .flex-toolbar {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }
      .flex-toolbar a, .flex-toolbar button {
        font-size: 12px;
        padding: 4px 12px;
        border-radius: 20px;
        border: 1px solid #06c755;
        color: #06c755;
        background: #fff;
        cursor: pointer;
        text-decoration: none;
        transition: all .15s;
      }
      .flex-toolbar a:hover, .flex-toolbar button:hover {
        background: #06c755;
        color: #fff;
      }
      .flex-hint { font-size: 11px; color: #aaa; margin-top: 4px; }

      /* ── 目標資訊 ── */
      .bc-target-info {
        margin: 14px 0 10px;
        padding: 10px 14px;
        border-radius: 8px;
        background: #f5f5f5;
        font-size: 13px;
        color: #888;
      }
      .bc-target-info.selected {
        background: #f0fff4;
        color: #333;
        border: 1px solid #c3f0d0;
      }
      .target-label { color: #888; margin-right: 4px; }
      .target-count { margin-left: 6px; color: #555; }

      /* ── Flex 範本 Modal ── */
      .flex-template-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-radius: 8px;
        border: 1px solid #eee;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all .15s;
      }
      .flex-template-item:hover {
        border-color: #06c755;
        background: #f0fff4;
      }
      .flex-template-label { font-size: 14px; font-weight: 500; }
      .flex-template-arrow { font-size: 12px; color: #06c755; }

      /* ── 推播 layout ── */
      .broadcast-layout {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 16px;
        align-items: start;
      }
      @media (max-width: 768px) {
        .broadcast-layout { grid-template-columns: 1fr; }
      }
    </style>
  `);

  // 初始化狀態
  _selectedAudience = null;
  _bcMessages = [];
  addBcMessage();

  // 載入受眾列表
  const res = await apiCall({ action: 'getAudienceForBroadcast' });
  if (res.success) {
    _broadcastAudienceData = res.data.list;
    renderBcAudienceList(_broadcastAudienceData);
  } else {
    document.getElementById('bc-audience-list').innerHTML = '<p class="empty-tip">載入受眾失敗</p>';
  }

  loadBroadcastLog();
}

// ── 受眾選擇 ──────────────────────────────────────

function renderBcAudienceList(list) {
  const el = document.getElementById('bc-audience-list');
  if (!el) return;
  if (!list || !list.length) {
    el.innerHTML = '<p class="empty-tip">沒有受眾資料</p>';
    return;
  }
  el.innerHTML = list.map(a => `
    <div class="bc-audience-item${_selectedAudience && _selectedAudience.audience_id === a.audience_id ? ' selected' : ''}"
         id="bc-aud-${a.audience_id}"
         onclick="selectBcAudience('${a.audience_id}')">
      <div class="bc-aud-name">${a.keyword || '（無關鍵字）'}</div>
      <div class="bc-aud-meta">
        <span class="badge">${a.audience_id}</span>
        <span class="bc-aud-count">👥 ${a.count} 人</span>
      </div>
    </div>
  `).join('');
}

function filterBcAudience() {
  const q = (document.getElementById('bc-search').value || '').trim().toLowerCase();
  const filtered = _broadcastAudienceData.filter(a =>
    (a.keyword || '').toLowerCase().includes(q) ||
    (a.audience_id || '').includes(q)
  );
  renderBcAudienceList(filtered);
}

function selectBcAudience(audience_id) {
  _selectedAudience = _broadcastAudienceData.find(a => a.audience_id === audience_id);
  if (!_selectedAudience) return;

  // 高亮選中（重新 render 列表以更新 selected class）
  document.querySelectorAll('.bc-audience-item').forEach(el => el.classList.remove('selected'));
  const item = document.getElementById('bc-aud-' + audience_id);
  if (item) item.classList.add('selected');

  // 更新目標資訊
  const info = document.getElementById('bc-target-info');
  if (info) {
    info.innerHTML = `
      <span class="target-label">目標受眾：</span>
      <strong>${_selectedAudience.keyword || audience_id}</strong>
      <span class="target-count">（預計推播 <strong>${_selectedAudience.count}</strong> 人）</span>
    `;
    info.className = 'bc-target-info selected';
  }

  const sendBtn = document.getElementById('bc-send-btn');
  if (sendBtn) sendBtn.disabled = false;
}

// ── 訊息編輯 ──────────────────────────────────────

function addBcMessage() {
  if (_bcMessages.length >= BC_MAX_MESSAGES) {
    showToast('最多只能加 ' + BC_MAX_MESSAGES + ' 則訊息', 'warning');
    return;
  }
  const id = Date.now();
  _bcMessages.push({ id, type: 'text', text: '', originalContentUrl: '', previewImageUrl: '', flexJson: '' });
  renderBcMessages();
}

function removeBcMessage(id) {
  if (_bcMessages.length <= 1) {
    showToast('至少需要 1 則訊息', 'warning');
    return;
  }
  _bcMessages = _bcMessages.filter(m => m.id !== id);
  renderBcMessages();
}

function renderBcMessages() {
  const container = document.getElementById('bc-messages-container');
  if (!container) return;

  container.innerHTML = _bcMessages.map((m, idx) => `
    <div class="bc-msg-block" id="bc-msg-${m.id}">
      <div class="bc-msg-header">
        <span class="bc-msg-index">訊息 ${idx + 1}</span>
        <div class="bc-msg-type-tabs">
          <button class="type-tab${m.type === 'image' ? ' active' : ''}" onclick="setBcMsgType(${m.id},'image')">圖片</button>
          <button class="type-tab${m.type === 'flex'  ? ' active' : ''}" onclick="setBcMsgType(${m.id},'flex')">Flex</button>
        </div>
        <button class="bc-msg-remove" onclick="removeBcMessage(${m.id})" title="移除此訊息">✕</button>
      </div>
      <div class="bc-msg-body">
        ${renderMsgInput(m)}
      </div>
    </div>
  `).join('');

  const addBtn = document.getElementById('add-msg-btn');
  if (addBtn) addBtn.disabled = _bcMessages.length >= BC_MAX_MESSAGES;
}

function renderMsgInput(m) {
  // 文字（預設，tab 不顯示 active，點圖片/Flex才切換）
  if (m.type === 'text') {
    const escaped = (m.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<textarea class="bc-textarea" rows="4"
      placeholder="輸入文字訊息…"
      oninput="saveBcMsgValue(${m.id},'text',this.value)"
    >${escaped}</textarea>`;
  }

  if (m.type === 'image') {
    return `
      <div class="bc-input-group">
        <label>原始圖片 URL（需為公開 https）</label>
        <input type="text" class="bc-input"
          placeholder="https://…/image.jpg"
          value="${m.originalContentUrl || ''}"
          oninput="saveBcMsgValue(${m.id},'originalContentUrl',this.value)">
      </div>
      <div class="bc-input-group">
        <label>縮圖 URL（可與原始相同）</label>
        <input type="text" class="bc-input"
          placeholder="https://…/thumb.jpg"
          value="${m.previewImageUrl || ''}"
          oninput="saveBcMsgValue(${m.id},'previewImageUrl',this.value)">
      </div>`;
  }

  if (m.type === 'flex') {
    const escaped = (m.flexJson || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
      <div class="flex-toolbar">
        <a href="${FLEX_SIMULATOR_URL}" target="_blank">🔗 LINE Flex Simulator</a>
        <button onclick="openFlexTemplateModal(${m.id})">📋 套用範本</button>
      </div>
      <textarea class="bc-textarea bc-textarea-mono" rows="10"
        id="flex-textarea-${m.id}"
        placeholder='{"type":"bubble","body":{…}}'
        oninput="saveBcMsgValue(${m.id},'flexJson',this.value)"
      >${escaped}</textarea>
      <div class="flex-hint">貼上 Flex Message Simulator 產生的 JSON，或套用上方範本後修改</div>`;
  }
  return '';
}

function setBcMsgType(id, type) {
  const m = _bcMessages.find(m => m.id === id);
  if (!m) return;
  // 若點已 active 的 tab → 切回文字
  m.type = (m.type === type) ? 'text' : type;
  renderBcMessages();
}

function saveBcMsgValue(id, key, value) {
  const m = _bcMessages.find(m => m.id === id);
  if (m) m[key] = value;
}

// ── Flex 範本 Modal ──────────────────────────────────────

let _flexTemplateTargetId = null;

function openFlexTemplateModal(msgId) {
  _flexTemplateTargetId = msgId;
  const modal = document.getElementById('flex-template-modal');
  if (modal) modal.style.display = 'flex';
}

function closeFlexTemplateModalDirect() {
  const modal = document.getElementById('flex-template-modal');
  if (modal) modal.style.display = 'none';
  _flexTemplateTargetId = null;
}

function closeFlexTemplateModal(event) {
  // 點遮罩關閉
  if (event.target.id === 'flex-template-modal') closeFlexTemplateModalDirect();
}

function applyFlexTemplate(templateIdx) {
  const tpl = FLEX_TEMPLATES[templateIdx];
  if (!tpl || _flexTemplateTargetId === null) return;

  const m = _bcMessages.find(m => m.id === _flexTemplateTargetId);
  if (m) {
    m.flexJson = tpl.json;
    renderBcMessages(); // 重新渲染，textarea 會填入新值
  }
  closeFlexTemplateModalDirect();
  showToast('已套用範本「' + tpl.label + '」，可繼續修改', 'success');
}

// ── 發送推播 ──────────────────────────────────────

async function submitBroadcast() {
  if (!_selectedAudience) {
    showToast('請先選擇受眾', 'warning');
    return;
  }

  const messages = [];
  for (let i = 0; i < _bcMessages.length; i++) {
    const m = _bcMessages[i];
    if (m.type === 'text') {
      const text = (m.text || '').trim();
      if (!text) { showToast('第 ' + (i + 1) + ' 則文字訊息不能為空', 'warning'); return; }
      messages.push({ type: 'text', text });
    } else if (m.type === 'image') {
      const orig = (m.originalContentUrl || '').trim();
      const prev = (m.previewImageUrl || '').trim();
      if (!orig || !prev) { showToast('第 ' + (i + 1) + ' 則圖片 URL 不能為空', 'warning'); return; }
      messages.push({ type: 'image', originalContentUrl: orig, previewImageUrl: prev });
    } else if (m.type === 'flex') {
      let contents;
      try {
        contents = JSON.parse(m.flexJson || '');
      } catch (e) {
        showToast('第 ' + (i + 1) + ' 則 Flex JSON 格式錯誤', 'error');
        return;
      }
      messages.push({ type: 'flex', altText: '推播訊息', contents });
    }
  }

  if (!messages.length) {
    showToast('請至少編輯一則訊息', 'warning');
    return;
  }

  const confirmed = await confirmDialog(
    '確定要推播給「' + (_selectedAudience.keyword || _selectedAudience.audience_id) + '」受眾嗎？\n預計發送 ' + _selectedAudience.count + ' 人。'
  );
  if (!confirmed) return;

  const res = await apiCall({
    action: 'broadcastToAudience',
    audience_id: _selectedAudience.audience_id,
    messages
  });

  if (res.success) {
    const d = res.data;
    showToast('✅ 推播完成！成功 ' + d.success + ' 人，失敗 ' + d.fail + ' 人', 'success');
    loadBroadcastLog();
  }
}

// ── 推播紀錄 ──────────────────────────────────────

async function loadBroadcastLog() {
  const el = document.getElementById('bc-log-table');
  if (!el) return;

  el.innerHTML = '載入中…';

  const res = await apiCall({ action: 'getBroadcastLog' });
  if (!res.success || !res.data.list || !res.data.list.length) {
    el.innerHTML = '<p class="empty-tip">尚無推播紀錄</p>';
    return;
  }

  el.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>時間</th>
          <th>受眾ID</th>
          <th>訊息摘要</th>
          <th>總人數</th>
          <th>成功</th>
          <th>失敗</th>
        </tr>
      </thead>
      <tbody>
        ${res.data.list.map(r => `
          <tr>
            <td>${r.time}</td>
            <td><span class="badge">${r.audience_id}</span></td>
            <td>${r.msg_summary}</td>
            <td>${r.total}</td>
            <td class="text-success">${r.success}</td>
            <td class="${r.fail > 0 ? 'text-danger' : ''}">${r.fail}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
