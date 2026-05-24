// pages/lottery.js

let lotteryList = [];
let lotteryLogData = [];

async function loadLottery() {
  const res = await apiCall('getLotteryList');
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
        <button onclick="viewLotteryLog('${a.activity_name}')">記錄</button>
        ${a.type === 'C' ? `<button onclick="openDrawModal('${a.activity_name}')">開獎</button>` : ''}
        <button onclick="deleteLotteryActivity('${a.activity_name}')">刪除</button>
      </td>
    </tr>
  `).join('');

  setContent('lottery-table-body', rows || '<tr><td colspan="8">尚無活動</td></tr>');
}

function openLotteryCreateModal() {
  // 根據選擇的 type 動態顯示不同欄位
  setContent('lottery-modal', `
    <div class="modal-overlay" id="lottery-create-modal">
      <div class="modal">
        <h3>新增抽獎活動</h3>
        <label>活動名稱<input id="l-name" type="text"></label>
        <label>類型
          <select id="l-type" onchange="renderLotteryTypeFields()">
            <option value="A">A 搶紅包</option>
            <option value="B">B 機率抽獎</option>
            <option value="C">C 報名開獎</option>
          </select>
        </label>
        <label>關鍵字<input id="l-keyword" type="text"></label>
        <label>開始時間<input id="l-start" type="time"></label>
        <label>結束時間<input id="l-end" type="time"></label>
        <label>名額上限（0=無限）<input id="l-limit" type="number" value="0"></label>
        <div id="lottery-type-fields"></div>
        <button onclick="submitLottery()">建立</button>
        <button onclick="closeLotteryModal()">取消</button>
      </div>
    </div>
  `);
  renderLotteryTypeFields();
}

function renderLotteryTypeFields() {
  const type = document.getElementById('l-type').value;
  let html = '';
  
  if (type === 'A') {
    html = `<label>獎品名稱<input id="l-prize-name" type="text"></label>`;
  } else if (type === 'B') {
    html = `
      <div id="prize-pool-container">
        <h4>獎品機率設定（總和需 ≤ 100%）</h4>
        <div id="prize-pool-rows">
          <div class="prize-row">
            <input placeholder="獎品名稱" class="pp-name">
            <input placeholder="機率%" type="number" class="pp-prob">
            <input placeholder="中獎訊息" class="pp-msg">
          </div>
        </div>
        <button onclick="addPrizeRow()">+ 新增獎品</button>
      </div>
    `;
  } else if (type === 'C') {
    html = `<label>獎品名稱<input id="l-prize-name" type="text"></label>`;
  }
  
  setContent('lottery-type-fields', html);
}

function addPrizeRow() {
  const container = document.getElementById('prize-pool-rows');
  const div = document.createElement('div');
  div.className = 'prize-row';
  div.innerHTML = `
    <input placeholder="獎品名稱" class="pp-name">
    <input placeholder="機率%" type="number" class="pp-prob">
    <input placeholder="中獎訊息" class="pp-msg">
    <button onclick="this.parentElement.remove()">✕</button>
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
      const msg = row.querySelector('.pp-msg').value;
      if (name && prob) prizePool.push({ name, prob: Number(prob), msg });
    });
    const totalProb = prizePool.reduce((s, p) => s + p.prob, 0);
    if (totalProb > 100) return showToast('機率總和不能超過 100%', 'error');
  }
  
  const params = {
    activity_name: document.getElementById('l-name').value,
    type,
    keyword: document.getElementById('l-keyword').value,
    start_time: document.getElementById('l-start').value,
    end_time: document.getElementById('l-end').value,
    limit: Number(document.getElementById('l-limit').value) || 0,
    prize_pool: prizePool,
    prize_name: document.getElementById('l-prize-name')?.value || ''
  };
  
  if (!params.activity_name || !params.keyword) return showToast('請填寫必要欄位', 'error');
  
  await apiCall('saveLottery', params);
  showToast('活動建立成功');
  closeLotteryModal();
  loadLottery();
}

async function viewLotteryLog(activityName) {
  const res = await apiCall('getLotteryLog', { activity_name: activityName });
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
    <div class="modal-overlay">
      <div class="modal modal-wide">
        <h3>${activityName} 參與記錄（${logs.length} 人）</h3>
        <table><thead><tr><th>時間</th><th>姓名</th><th>結果</th><th>狀態</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">尚無記錄</td></tr>'}</tbody></table>
        <button onclick="closeLotteryModal()">關閉</button>
      </div>
    </div>
  `);
}

async function openDrawModal(activityName) {
  setContent('lottery-modal', `
    <div class="modal-overlay">
      <div class="modal">
        <h3>開獎：${activityName}</h3>
        <label>抽出人數<input id="draw-count" type="number" value="1" min="1"></label>
        <button onclick="executeDraw('${activityName}')">確認開獎</button>
        <button onclick="closeLotteryModal()">取消</button>
      </div>
    </div>
  `);
}

async function executeDraw(activityName) {
  const drawCount = Number(document.getElementById('draw-count').value) || 1;
  const res = await apiCall('drawLottery', { activity_name: activityName, draw_count: drawCount });
  
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
  await apiCall('deleteLottery', { activity_name: activityName });
  showToast('已刪除');
  loadLottery();
}

function closeLotteryModal() {
  setContent('lottery-modal', '');
}
