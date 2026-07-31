// js/pages/lottery.js
// ⚠️ 已套用 CODE_STYLE.md 規範：escHtml / confirmAndRun
// ⚠️ 修正：原版樣板字串插值未轉義使用者輸入（活動名稱/姓名等），已全面補上 escHtml
// ⚠️ 2026-07-31 修正：三個前後端參數不對稱 bug
//   1. 刪除活動：改傳 row_index（API 端需要，activity_name 不足以精準定位列）
//   2. 開獎人數：draw_count → winner_count（對齊 API 端實際讀取的參數名）
//   3. B型機率抽獎 prize_pool：送出前先 JSON.stringify（API 端用字串接住再 JSON.parse）
// ⚠️ 2026-07-31 新增：編輯既有活動功能
//   - submitLottery 改成同時支援新增/編輯，差別只在有沒有帶 row_index
//   - 編輯模式下「類型」欄位鎖定不可改，避免已累積的 winner_count/報名記錄語意對不上
//   - B型編輯時，既有 prize_pool 會解析回表單列表預填，而非只顯示第一列空白

var lotteryList = [];
var lotteryLogData = [];

async function loadLottery() {
  var res = await apiCall({ action: 'getLotteryList' });
  lotteryList = (res.success && res.data && res.data.list) ? res.data.list : [];
  renderLotteryList();
}

function renderLotteryList() {
  var typeLabel = { A: '搶紅包', B: '機率抽獎', C: '報名開獎', D: '點數紅包' };
  var statusLabel = { active: '進行中', disabled: '停用' };

  var rows = lotteryList.map(function(a) {
    var pendingText = a.type === 'C' ? escHtml(a.pending_count || 0) : '-';
    return '<tr>' +
      '<td>' + escHtml(a.activity_name) + '</td>' +
      '<td><span class="badge badge-' + escHtml(a.type.toLowerCase()) + '">' + escHtml(typeLabel[a.type]) + '</span></td>' +
      '<td>' + escHtml(a.keyword) + '</td>' +
      '<td>' + escHtml(a.start_time || '-') + ' ~ ' + escHtml(a.end_time || '-') + '</td>' +
      '<td>' + escHtml(a.limit || '無限') + '</td>' +
      '<td>' + pendingText + '</td>' +
      '<td>' + escHtml(a.winner_count || 0) + '</td>' +
      '<td>' + escHtml(statusLabel[a.status] || a.status) + '</td>' +
      '<td>' +
        '<button class="btn btn-edit" onclick="viewLotteryLog(\'' + escHtml(a.activity_name) + '\')">記錄</button>' +
        ' <button class="btn btn-edit" onclick="openLotteryEditModal(' + a.row_index + ')">編輯</button>' +
        (a.type === 'C' ? ' <button class="btn btn-primary" onclick="openDrawModal(\'' + escHtml(a.activity_name) + '\')">開獎</button>' : '') +
        ' <button class="btn btn-danger" onclick="deleteLotteryActivity(' + a.row_index + ', \'' + escHtml(a.activity_name) + '\')">刪除</button>' +
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
            '<th>名額</th><th>報名中</th><th>得獎數</th><th>狀態</th><th>操作</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody id="lottery-table-body">' +
          (rows || '<tr><td colspan="9" class="empty">尚無活動</td></tr>') +
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
            '<option value="D">D 點數紅包（搶點數池）</option>' +
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

// ── 新增：編輯既有活動 ──
// rowIndex 對應 lotteryList 裡的 a.row_index（getLotteryList 回傳的 Sheet 實際列號）
function openLotteryEditModal(rowIndex) {
  var matches = lotteryList.filter(function(a) { return a.row_index === rowIndex; });
  var activity = matches[0];
  if (!activity) {
    showToast('找不到此活動資料，請重新整理頁面再試一次', 'error');
    return;
  }

  setContent('lottery-modal', '' +
    '<div class="modal-overlay show">' +
      '<div class="modal">' +
        '<h3>編輯抽獎活動</h3>' +
        '<div class="form-group">' +
          '<label>活動名稱</label>' +
          '<input id="l-name" type="text" value="' + escHtml(activity.activity_name) + '">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>類型（建立後不可變更）</label>' +
          '<select id="l-type" disabled>' +
            '<option value="A"' + (activity.type === 'A' ? ' selected' : '') + '>A 搶紅包（先到先得）</option>' +
            '<option value="B"' + (activity.type === 'B' ? ' selected' : '') + '>B 機率抽獎（即時結果）</option>' +
            '<option value="C"' + (activity.type === 'C' ? ' selected' : '') + '>C 報名開獎（手動抽出）</option>' +
            '<option value="D"' + (activity.type === 'D' ? ' selected' : '') + '>D 點數紅包（搶點數池）</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>觸發關鍵字</label>' +
          '<input id="l-keyword" type="text" value="' + escHtml(activity.keyword) + '">' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group half">' +
            '<label>開始時間</label>' +
            '<input id="l-start" type="time" value="' + escHtml(activity.start_time || '') + '">' +
          '</div>' +
          '<div class="form-group half">' +
            '<label>結束時間</label>' +
            '<input id="l-end" type="time" value="' + escHtml(activity.end_time || '') + '">' +
          '</div>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>名額上限（0 = 無限）</label>' +
          '<input id="l-limit" type="number" value="' + escHtml(activity.limit || 0) + '" min="0">' +
        '</div>' +
        '<div id="lottery-type-fields"></div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeLotteryModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="submitLottery(' + rowIndex + ')">儲存變更</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );

  renderLotteryTypeFields();
  _prefillLotteryTypeFields(activity);
}

// ── 新增：編輯模式下，把既有的類型專屬欄位值（獎品名稱 / B型獎品清單）填回表單 ──
function _prefillLotteryTypeFields(activity) {
  if (activity.type === 'A' || activity.type === 'C') {
    var prizeNameEl = document.getElementById('l-prize-name');
    if (prizeNameEl) prizeNameEl.value = activity.prize_name || '';
    return;
  }

  if (activity.type === 'B') {
    var pool = [];
    try { pool = JSON.parse(activity.prize_pool || '[]'); } catch (e) { pool = []; }

    var container = document.getElementById('prize-pool-rows');
    if (!container || pool.length === 0) return;

    container.innerHTML = '';
    pool.forEach(function(p) {
      var div = document.createElement('div');
      div.className = 'prize-row';
      div.style.cssText = 'display:flex;gap:8px;margin-bottom:8px';
      div.innerHTML =
        '<input placeholder="獎品名稱" class="pp-name" style="flex:2;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px" value="' + escHtml(p.name || '') + '">' +
        '<input placeholder="機率%" type="number" class="pp-prob" style="flex:1;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px" value="' + escHtml(p.prob || 0) + '">' +
        '<input placeholder="中獎訊息" class="pp-msg" style="flex:2;padding:8px;border:1.5px solid #e0e0e0;border-radius:6px" value="' + escHtml(p.msg || '') + '">' +
        '<button onclick="this.parentElement.remove()" style="padding:8px;border:none;background:#fff0f0;color:#e53e3e;border-radius:6px;cursor:pointer">✕</button>';
      container.appendChild(div);
    });
    return;
  }

  if (activity.type === 'D') {
    var totalEl = document.getElementById('l-total-points');
    var minEl   = document.getElementById('l-min-points');
    var maxEl   = document.getElementById('l-max-points');
    if (totalEl) totalEl.value = activity.total_points || 0;
    if (minEl)   minEl.value   = activity.min_points   || 1;
    if (maxEl)   maxEl.value   = activity.max_points   || 10;

    // ⚠️ 隱藏欄位保存目前實際剩餘點數，submitLottery 存檔時會原封不動送回去，
    // 不受這次編輯改動 total_points 影響，避免點數池被意外重置
    var fieldsContainer = document.getElementById('lottery-type-fields');
    if (fieldsContainer) {
      var hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.id = 'l-remain-points';
      hidden.value = activity.remain_points || 0;
      fieldsContainer.appendChild(hidden);
    }
  }
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
 } else if (type === 'D') {
    html =
      '<div class="form-group">' +
        '<label>總點數池</label>' +
        '<input id="l-total-points" type="number" placeholder="例：1000" min="0">' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group half">' +
          '<label>每次最小點數</label>' +
          '<input id="l-min-points" type="number" placeholder="例：1" min="0">' +
        '</div>' +
        '<div class="form-group half">' +
          '<label>每次最大點數</label>' +
          '<input id="l-max-points" type="number" placeholder="例：10" min="0">' +
        '</div>' +
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

// ── submitLottery：rowIndex 有值＝編輯（saveLottery 會覆蓋該列）；無值＝新增 ──
async function submitLottery(rowIndex) {
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
    prize_pool:    JSON.stringify(prizePool),
    prize_name:    prizeNameEl ? prizeNameEl.value : ''
  };

  if (type === 'D') {
    var totalPoints = Number(document.getElementById('l-total-points').value) || 0;
    var minPoints   = Number(document.getElementById('l-min-points').value) || 1;
    var maxPoints   = Number(document.getElementById('l-max-points').value) || 10;

    // ⚠️ 關鍵：remain_points（剩餘點數池）只有「新增活動」時才等於 total_points，
    // 「編輯既有活動」時絕對不能直接用 total_points 覆蓋，否則會把使用者已經
    // 搶掉的點數憑空補回去，等於偷偷重置了點數池。編輯模式下，remain_points
    // 要沿用 openLotteryEditModal 預填時記下的既有值（隱藏欄位 l-remain-points）。
    var remainEl = document.getElementById('l-remain-points');
    params.total_points  = totalPoints;
    params.min_points    = minPoints;
    params.max_points    = maxPoints;
    params.remain_points = remainEl ? Number(remainEl.value) : totalPoints;
  }

  if (rowIndex) params.row_index = rowIndex;

  if (!params.activity_name || !params.keyword) { showToast('請填寫必要欄位', 'error'); return; }

  var res = await apiCall(params);
  if (res.success) {
    showToast(rowIndex ? '活動已更新' : '活動建立成功');
    closeLotteryModal();
    loadLottery();
  } else {
    showToast(res.message || (rowIndex ? '更新失敗' : '建立失敗'), 'error');
  }
}

async function viewLotteryLog(activityName) {
  var res = await apiCall({ action: 'getLotteryLog', activity_name: activityName });
  var logs = (res.success && res.data && res.data.list) ? res.data.list : [];

  var rows = logs.map(function(l) {
    var resultText;
    if (l.result === 'entered') {
      resultText = '📝 報名';
    } else if (l.result.indexOf('won:') === 0) {
      resultText = '🧧 搶到 ' + l.result.split(':')[1] + ' 點';
    } else if (l.result === 'won') {
      resultText = '🎉 中獎';
    } else {
      resultText = '未中獎';
    }
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
    winner_count:  drawCount
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

async function deleteLotteryActivity(rowIndex, activityName) {
  await confirmAndRun('確定刪除活動「' + activityName + '」？', async function() {
    var res = await apiCall({ action: 'deleteLottery', row_index: rowIndex });
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
