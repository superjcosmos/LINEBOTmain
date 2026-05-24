// pages/lottery.js

let lotteryList = [];
let lotteryLogData = [];

async function loadLottery() {
  const res = await apiCall({ action: 'getLotteryList' });
  lotteryList = res.data || [];
  renderLotteryList();
}

function renderLotteryList() {
  const typeLabel = { A: '搶紅包', B: '機率抽獎', C: '報名開獎' };
  const statusLabel = { active: '進行中', disabled: '停用' };

  const rows = lotteryList.map(a => `
    <tr>
      <td>${a.activity_name}</td>
      <td><span class="badge badge-${a.type.toLowerCase()}">${typeLabel[a.type]}</span></td>
      <td>${a.keyword}</td>
      <td>${a.start_time || '-'} ~ ${a.end_time || '-'}</td>
      <td>${a.limit || '無限'}</td>
      <td>${a.winner_count || 0}</td>
      <td>${statusLabel[a.status] || a.status}</td>
      <td>
        <button class="btn btn-edit" onclick="viewLotteryLog('${a.activity_name}')">記錄</button>
        ${a.type === 'C' ? `<button class="btn btn-primary" onclick="openDrawModal('${a.activity_name}')">開獎</button>` : ''}
        <button class="btn btn-danger" onclick="deleteLotteryActivity('${a.activity_name}')">刪除</button>
      </td>
    </tr>
  `).join('');

  setContent('mainContent', `
    <div class="page-title">小遊戲管理</div>
    <div class="card">
      <div class="toolbar">
        <button class="btn btn-primary" onclick="openLotteryCreateModal()">＋ 新增活動</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>活動名稱</th>
            <th>類型</th>
            <th>關鍵字</th>
            <th>時段</th>
            <th>名額</th>
            <th>得獎數</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="lottery-table-body">
          ${rows || '<tr><td colspan="8" class="empty">尚無活動</td></tr>'}
        </tbody>
      </table>
    </div>
    <div id="lottery-modal"></div>
  `);
}

function openLotteryCreateModal() {
  setContent('lottery-modal', `
    <div class="modal-overlay show">
      <div class="modal">
        <h3>新增抽獎活動</h3>
        <div class="form-group">
          <label>活動名稱</label>
          <input id="l-name" type="text" placeholder="例：五月限定抽獎">
        </div>
        <div class="form-group">
          <label>類型</label>
          <select id="l-type" onchange="renderLotteryTypeFields()">
            <option value="A">A 搶紅包（先到先得）</option>
            <option value="B">B 機率抽獎（即時結果）</option>
            <option value="C">C 報名開獎（手動抽出）</option>
          </select>
        </div>
        <div class="form-group">
          <label>觸發關鍵字</label>
          <input id="l-keyword" type="text" placeholder="例：抽獎">
        </div>
        <div class="form-row">
          <div class="form-group half">
            <label>開始時間</label>
            <input id="l-start" type="time">
          </div>
          <div class="form-group half">
            <label>結束時間</label>
            <input id="l-end" type="time">
          </div>
        </div>
        <div class="form-group">
          <label>名額上限（0 = 無限）</label>
          <input id="l-limit" type="number" value="0" min="0">
        </div>
        <div id="lottery-type-fields"></div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="closeLotteryModal()">取消</button>
          <button class="btn btn-primary" onclick="submitLottery()">建立活動</button>
        </div>
      </div>
    </div>
  `);
  renderLotteryTypeFields();
}

function renderLotteryTypeFields() {
  const type = document.getElementById('l-type').value;
  let html = '';

  if (type === 'A') {
    html = `
      <div class="form-group">
        <label>獎品名稱</label>
        <input id="l-prize-name" type="text" placeholder="例：星巴克飲料券">
      </div>
    `;
  } else if (type === 'B') {
    html = `
      <div class="form-group">
        <h4 style="margin-bottom:8px">獎品機率設定（總和需 ≤ 100%）</h4>
        <div id="prize-pool-rows">
          <div class="prize-row" style="display:flex;gap:8px;margin-bottom:8px">
            <input placeholder="獎品名稱" class="pp-name" style="flex:2;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px">
            <input placeholder="機率%" type="number" class="pp-prob" style="flex:1;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px">
            <input placeholder="中獎訊息" class="pp-msg" style="flex:2;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px">
          </div>
        </div>
        <button class="btn btn-edit" onclick="addPrizeRow()">＋ 新增獎品</button>
      </div>
    `;
  } else if (type === 'C') {
    html = `
      <div class="form-group">
        <label>獎品名稱</label>
        <input id="l-prize-name" type="text" placeholder="例：AirPods">
      </div>
    `;
  }

  setContent('lottery-type-fields', html);
}

function addPrizeRow() {
  const container = document.getElementById('prize-pool-rows');
  const div = document.createElement('div');
  div.className = 'prize-row';
  div.style = 'display:flex;gap:8px;margin-bottom:8px';
  div.innerHTML = `
    <input placeholder="獎品名稱" class="pp-name" style="flex:2;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px">
    <input placeholder="機率%" type="number" class="pp-prob" style="flex:1;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px">
    <input placeholder="中獎訊息" class="pp-msg" style="flex:2;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px">
    <button onclick="this.parentElement.remove()" style="padding:8px;border:none;background:#fff0f0;color:#e53e3e;border-radius:6px;cursor:pointer">✕</button>
  `;
  container.appendChild(div);
}

async function submitLottery() {
  const type = document.getElementById('l-type').value;
  let prizePool = [];

  if (type === 'B') {
    const rows = document.querySelectorAll('.prize-row');
    rows.forEach(row => {
      const name = row.querySelector('.pp-name').value;
      const prob = row.querySelector('.pp-prob').value;
      const msg  = row.querySelector('.pp-msg').value;
      if (name && prob) prizePool.push({ name, prob: Number(prob), msg });
    });
    const totalProb = prizePool.reduce((s, p) => s + p.prob, 0);
    if (totalProb > 100) return showToast('機率總和不能超過 100%', 'error');
  }

  const params = {
    action:        'saveLottery',
    activity_name: document.getElementById('l-name').value,
    type,
    keyword:       document.getElementById('l-keyword').value,
    start_time:    document.getElementById('l-start').value,
    end_time:      document.getElementById('l-end').value,
    limit:         Number(document.getElementById('l-limit').value) || 0,
    prize_pool:    prizePool,
    prize_name:    document.getElementById('l-prize-name')?.value || ''
  };

  if (!params.activity_name || !params.keyword) return showToast('請填寫必要欄位', 'error');

  const res = await apiCall(params);
  if (res.success) {
    showToast('活動建立成功');
    closeLotteryModal();
    loadLottery();
  } else {
    showToast(res.message || '建立失敗', 'error');
  }
}

async function viewLotteryLog(activityName) {
  const res = await apiCall({ action: 'getLotteryLog', activity_name: activityName });
  const logs = res.data || [];

  const rows = logs.map(l => `
    <tr>
      <td>${formatDate(l.time)}</td>
      <td>${l.display_name}</td>
      <td>${l.result === 'won' ? '🎉 中獎' : l.result === 'entered' ? '📝 報名' : '未中獎'}</td>
      <td>${l.status}</td>
    </tr>
  `).join('');

  setContent('lottery-modal', `
    <div class="modal-overlay show">
      <div class="modal">
        <h3>${activityName} 參與記錄（${logs.length} 人）</h3>
        <table>
          <thead><tr><th>時間</th><th>姓名</th><th>結果</th><th>狀態</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" class="empty">尚無記錄</td></tr>'}</tbody>
        </table>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="closeLotteryModal()">關閉</button>
        </div>
      </div>
    </div>
  `);
}

async function openDrawModal(activityName) {
  setContent('lottery-modal', `
    <div class="modal-overlay show">
      <div class="modal">
        <h3>開獎：${activityName}</h3>
        <div class="form-group">
          <label>抽出人數</label>
          <input id="draw-count" type="number" value="1" min="1">
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="closeLotteryModal()">取消</button>
          <button class="btn btn-primary" onclick="executeDraw('${activityName}')">確認開獎</button>
        </div>
      </div>
    </div>
  `);
}

async function executeDraw(activityName) {
  const drawCount = Number(document.getElementById('draw-count').value) || 1;
  const res = await apiCall({
    action:        'drawLottery',
    activity_name: activityName,
    draw_count:    drawCount
  });

  if (res.success) {
    const winners = res.data.winners;
    const names = winners.map(w => w.display_name).join('、');
    showToast(`開獎完成！得獎者：${names}`);
    closeLotteryModal();
    loadLottery();
  } else {
    showToast(res.message || '開獎失敗', 'error');
  }
}

async function deleteLotteryActivity(activityName) {
  if (!await confirmDialog(`確定刪除活動「${activityName}」？`)) return;
  const res = await apiCall({ action: 'deleteLottery', activity_name: activityName });
  if (res.success) {
    showToast('已刪除');
    loadLottery();
  } else {
    showToast(res.message || '刪除失敗', 'error');
  }
}

function closeLotteryModal() {
  setContent('lottery-modal', '');
}
