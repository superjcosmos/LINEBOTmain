// js/pages/lottery.js
// ⚠️ 已套用 CODE_STYLE.md 規範：escHtml / confirmAndRun
// ⚠️ 修正：原版樣板字串插值未轉義使用者輸入（活動名稱/姓名等），已全面補上 escHtml

var lotteryList = [];
var lotteryLogData = [];

async function loadLottery() {
  var res = await apiCall({ action: 'getLotteryList' });
  lotteryList = res.data || [];
  renderLotteryList();
}

function renderLotteryList() {
  var typeLabel = { A: '搶紅包', B: '機率抽獎', C: '報名開獎' };
  var statusLabel = { active: '進行中', disabled: '停用' };

  var rows = lotteryList.map(function(a) {
    return '<tr>' +
      '<td>' + escHtml(a.activity_name) + '</td>' +
      '<td><span class="badge badge-' + escHtml(a.type.toLowerCase()) + '">' + escHtml(typeLabel[a.type]) + '</span></td>' +
      '<td>' + escHtml(a.keyword) + '</td>' +
      '<td>' + escHtml(a.start_time || '-') + ' ~ ' + escHtml(a.end_time || '-') + '</td>' +
      '<td>' + escHtml(a.limit || '無限') + '</td>' +
      '<td>' + escHtml(a.winner_count || 0) + '</td>' +
      '<td>' + escHtml(statusLabel[a.status] || a.status) + '</td>' +
      '<td>' +
        '<button class="btn btn-edit" onclick="viewLotteryLog(\'' + escHtml(a.activity_name) + '\')">記錄</button>' +
        (a.type === 'C' ? ' <button class="btn btn-primary" onclick="openDrawModal(\'' + escHtml(a.activity_name) + '\')">開獎</button>' : '') +
        ' <button class="btn btn-danger" onclick="deleteLotteryActivity(\'' + escHtml(a.activity_name) + '\')">刪除</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  setContent('mainContent', '' +
    '<div class="page-title">小遊戲管理</div>' +
    '<div class="card">' +
      '<div class="toolbar">' +
        '<button class="btn btn-primary" onclick="openLotteryCreateModal()">＋ 新增活動</button>' +
      '</div>' +
      '<table>' +
        '<thead>' +
          '<tr>' +
            '<th>活動名稱</th><th>類型</th><th>關鍵字</th><th>時段</th>' +
            '<th>名額</th><th>得獎數</th><th>狀態</th><th>操作</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody id="lottery-table-body">' +
          (rows || '<tr><td colspan="8" class="empty">尚無活動</td></tr>') +
        '</tbody>' +
      '</table>' +
    '</div>' +
    '<div id="lottery-modal"></div>'
  );
}

function openLotteryCreateModal() {
  setContent('lottery-modal', '' +
    '<div class="modal-overlay show">' +
      '<div class="modal">' +
        '<h3>新增抽獎活動</h3>' +
        '<div class="form-group">' +
          '<label>活動名稱</label>' +
          '<input id="l-name" type="text" placeholder="例：五月限定抽獎">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>類型</label>' +
          '<select id="l-type" onchange="renderLotteryTypeFields()">' +
            '<option value="A">A 搶紅包（先到先得）</option>' +
            '<option value="B">B 機率抽獎（即時結果）</option>' +
            '<option value="C">C 報名開獎（手動抽出）</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>觸發關鍵字</label>' +
          '<input id="l-keyword" type="text" placeholder="例：抽獎">' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group half">' +
            '<label>開始時間</label>' +
            '<input id="l-start" type="time">' +
          '</div>' +
          '<div class="form-group half">' +
            '<label>結束時間</label>' +
            '<input id="l-end" type="time">' +
          '</div>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>名額上限（0 = 無限）</label>' +
          '<input id="l-limit" type="number" value="0" min="0">' +
        '</div>' +
        '<div id="lottery-type-fields"></div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeLotteryModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="submitLottery()">建立活動</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
  renderLotteryTypeFields();
}

function renderLotteryTypeFields() {
  var type = document.getElementById('l-type').value;
  var html = '';

  if (type === 'A') {
    html =
      '<div class="form-group">' +
        '<label>獎品名稱</label>' +
        '<input id="l-prize-name" type="text" placeholder="例：星巴克飲料券">' +
      '</div>';
  } else if (type === 'B') {
    html =
      '<div class="form-group">' +
        '<h4 style="margin-bottom:8px">獎品機率設定（總和需 ≤ 100%）</h4>' +
        '<div id="prize-pool-rows">' +
          '<div class="prize-row" style="display:flex;gap:8px;margin-bottom:8px">' +
            '<input placeholder="獎品名稱" class="pp-name" style="flex:2;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px">' +
            '<input placeholder="機率%" type="number" class="pp-prob" style="flex:1;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px">' +
            '<input placeholder="中獎訊息" class="pp-msg" style="flex:2;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px">' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-edit" onclick="addPrizeRow()">＋ 新增獎品</button>' +
      '</div>';
  } else if (type === 'C') {
    html =
      '<div class="form-group">' +
        '<label>獎品名稱</label>' +
        '<input id="l-prize-name" type="text" placeholder="例：AirPods">' +
      '</div>';
  }

  setContent('lottery-type-fields', html);
}

function addPrizeRow() {
  var container = document.getElementById('prize-pool-rows');
  var div = document.createElement('div');
  div.className = 'prize-row';
  div.style.cssText = 'display:flex;gap:8px;margin-bottom:8px';
  div.innerHTML =
    '<input placeholder="獎品名稱" class="pp-name" style="flex:2;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px">' +
    '<input placeholder="機率%" type="number" class="pp-prob" style="flex:1;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px">' +
    '<input placeholder="中獎訊息" class="pp-msg" style="flex:2;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px">' +
    '<button onclick="this.parentElement.remove()" style="padding:8px;border:none;background:#fff0f0;color:#e53e3e;border-radius:6px;cursor:pointer">✕</button>';
  container.appendChild(div);
}

async function submitLottery() {
  var type = document.getElementById('l-type').value;
  var prizePool = [];

  if (type === 'B') {
    var rows = document.querySelectorAll('.prize-row');
    rows.forEach(function(row) {
      var name = row.querySelector('.pp-name').value;
      var prob = row.querySelector('.pp-prob').value;
      var msg  = row.querySelector('.pp-msg').value;
      if (name && prob) prizePool.push({ name: name, prob: Number(prob), msg: msg });
    });
    var totalProb = prizePool.reduce(function(s, p) { return s + p.prob; }, 0);
    if (totalProb > 100) { showToast('機率總和不能超過 100%', 'error'); return; }
  }

  var prizeNameEl = document.getElementById('l-prize-name');
  var params = {
    action:        'saveLottery',
    activity_name: document.getElementById('l-name').value,
    type:          type,
    keyword:       document.getElementById('l-keyword').value,
    start_time:    document.getElementById('l-start').value,
    end_time:      document.getElementById('l-end').value,
    limit:         Number(document.getElementById('l-limit').value) || 0,
    prize_pool:    prizePool,
    prize_name:    prizeNameEl ? prizeNameEl.value : ''
  };

  if (!params.activity_name || !params.keyword) { showToast('請填寫必要欄位', 'error'); return; }

  var res = await apiCall(params);
  if (res.success) {
    showToast('活動建立成功');
    closeLotteryModal();
    loadLottery();
  } else {
    showToast(res.message || '建立失敗', 'error');
  }
}

async function viewLotteryLog(activityName) {
  var res = await apiCall({ action: 'getLotteryLog', activity_name: activityName });
  var logs = res.data || [];

  var rows = logs.map(function(l) {
    var resultText = l.result === 'won' ? '🎉 中獎' : l.result === 'entered' ? '📝 報名' : '未中獎';
    return '<tr>' +
      '<td>' + escHtml(formatDate(l.time)) + '</td>' +
      '<td>' + escHtml(l.display_name) + '</td>' +
      '<td>' + escHtml(resultText) + '</td>' +
      '<td>' + escHtml(l.status) + '</td>' +
    '</tr>';
  }).join('');

  setContent('lottery-modal', '' +
    '<div class="modal-overlay show">' +
      '<div class="modal">' +
        '<h3>' + escHtml(activityName) + ' 參與記錄（' + logs.length + ' 人）</h3>' +
        '<table>' +
          '<thead><tr><th>時間</th><th>姓名</th><th>結果</th><th>狀態</th></tr></thead>' +
          '<tbody>' + (rows || '<tr><td colspan="4" class="empty">尚無記錄</td></tr>') + '</tbody>' +
        '</table>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeLotteryModal()">關閉</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function openDrawModal(activityName) {
  setContent('lottery-modal', '' +
    '<div class="modal-overlay show">' +
      '<div class="modal">' +
        '<h3>開獎：' + escHtml(activityName) + '</h3>' +
        '<div class="form-group">' +
          '<label>抽出人數</label>' +
          '<input id="draw-count" type="number" value="1" min="1">' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeLotteryModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="executeDraw(\'' + escHtml(activityName) + '\')">確認開獎</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

async function executeDraw(activityName) {
  var drawCount = Number(document.getElementById('draw-count').value) || 1;
  var res = await apiCall({
    action:        'drawLottery',
    activity_name: activityName,
    draw_count:    drawCount
  });

  if (res.success) {
    var winners = res.data.winners;
    var names = winners.map(function(w) { return w.display_name; }).join('、');
    showToast('開獎完成！得獎者：' + names);
    closeLotteryModal();
    loadLottery();
  } else {
    showToast(res.message || '開獎失敗', 'error');
  }
}

async function deleteLotteryActivity(activityName) {
  await confirmAndRun('確定刪除活動「' + activityName + '」？', async function() {
    var res = await apiCall({ action: 'deleteLottery', activity_name: activityName });
    if (res.success) {
      showToast('已刪除');
      loadLottery();
    } else {
      showToast(res.message || '刪除失敗', 'error');
    }
  });
}

function closeLotteryModal() {
  setContent('lottery-modal', '');
}
