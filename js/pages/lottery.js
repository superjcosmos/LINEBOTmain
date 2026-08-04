// js/pages/lottery.js
// ⚠️ 已套用 CODE_STYLE.md 規範：escHtml / confirmAndRun
// ⚠️ 2026-07-31 累計修正/新增：
//   1. 刪除活動改傳 row_index；開獎人數 draw_count → winner_count；
//      B型 prize_pool 送出前 JSON.stringify
//   2. 新增編輯活動功能
//   3. 新增報名中人數顯示
//   4. 新增 D 型（點數紅包）
//   5. 新增「每人可參加次數」設定欄位（O欄 max_per_user）
//   6. 新增啟用/停用活動功能

var lotteryList = [];
var lotteryLogData = [];

async function loadLottery() {
  var res = await apiCall({ action: 'getLotteryList' });
  lotteryList = (res.success && res.data && res.data.list) ? res.data.list : [];
  renderLotteryList();
}

function renderLotteryList() {
  var typeLabel = { A: '限量搶購', B: '機率抽獎', C: '報名開獎', D: '點數紅包' };
  var statusLabel = { active: '進行中', disabled: '停用' };

  var rows = lotteryList.map(function(a) {
    var pendingText = a.type === 'C' ? escHtml(a.pending_count || 0) : '-';
    var toggleLabel = a.status === 'active' ? '停用' : '啟用';
    var toggleClass = a.status === 'active' ? 'btn-danger' : 'btn-primary';

    // ⚠️ 新增：D型顯示「剩餘/總點數池」取代通用的「名額」欄位，
    // 因為D型沒有「limit」這個概念（沒有人數上限，只有點數池上限）
    var limitOrPointsText = a.type === 'D'
      ? escHtml(a.remain_points || 0) + ' / ' + escHtml(a.total_points || 0) + ' 點'
      : escHtml(a.limit || '無限');

    return '<tr>' +
      '<td>' + escHtml(a.activity_name) + '</td>' +
      '<td><span class="badge badge-' + escHtml(a.type.toLowerCase()) + '">' + escHtml(typeLabel[a.type]) + '</span></td>' +
      '<td>' + escHtml(a.keyword) + '</td>' +
      '<td>' + escHtml(a.start_time || '-') + ' ~ ' + escHtml(a.end_time || '-') + '</td>' +
      '<td>' + limitOrPointsText + '</td>' +
      '<td>' + pendingText + '</td>' +
      '<td>' + escHtml(a.winner_count || 0) + '</td>' +
      '<td>' + escHtml(statusLabel[a.status] || a.status) + '</td>' +
      '<td>' +
        '<button class="btn btn-edit" onclick="viewLotteryLog(\'' + escHtml(a.activity_name) + '\')">記錄</button>' +
        ' <button class="btn btn-edit" onclick="openLotteryEditModal(' + a.row_index + ')">編輯</button>' +
        ' <button class="' + toggleClass + '" onclick="toggleLotteryStatus(' + a.row_index + ')">' + toggleLabel + '</button>' +
        (a.linked_audience_id ? ' <button class="btn btn-secondary" onclick="goToBroadcastForActivity(\'' + escHtml(a.linked_audience_id) + '\')">📢 前往推播</button>' : '') +
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
            '<th>名額 / 點數池</th><th>報名中</th><th>得獎數</th><th>狀態</th><th>操作</th>' +
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
// ── 啟用/停用切換 ──
// ⚠️ 2026-07-31 修正：原版直接用瀏覽器裡 lotteryList 的舊資料回填其他欄位，
// 如果該活動在頁面載入之後有任何欄位持續變動（例如 D 型 remain_points
// 因為使用者持續搶紅包而不斷減少），舊資料會蓋掉這期間發生的所有變動。
// 改為切換前先重新呼叫 getLotteryList 取得當下最新資料，避免蓋掉即時進度。
async function toggleLotteryStatus(rowIndex) {
  // 先重新抓一次最新資料，不相信瀏覽器手上可能過時的 lotteryList
  var freshRes = await apiCall({ action: 'getLotteryList' });
  var freshList = (freshRes.success && freshRes.data && freshRes.data.list) ? freshRes.data.list : [];
  var matches = freshList.filter(function(a) { return a.row_index === rowIndex; });
  var activity = matches[0];
  if (!activity) {
    showToast('找不到此活動資料，請重新整理頁面再試一次', 'error');
    return;
  }

  var newStatus = activity.status === 'active' ? 'disabled' : 'active';
  var confirmMsg = newStatus === 'disabled'
    ? '確定要停用活動「' + activity.activity_name + '」？停用後使用者輸入關鍵字將不會有任何回應。'
    : '確定要重新啟用活動「' + activity.activity_name + '」？';

  await confirmAndRun(confirmMsg, async function() {
    var params = {
      action:        'saveLottery',
      row_index:     rowIndex,
      activity_name: activity.activity_name,
      type:          activity.type,
      keyword:       activity.keyword,
      start_time:    activity.start_time,
      end_time:      activity.end_time,
      limit:         activity.limit,
      status:        newStatus,
      prize_pool:    activity.prize_pool,
      prize_name:    activity.prize_name,
      total_points:  activity.total_points,
      min_points:    activity.min_points,
      max_points:    activity.max_points,
      remain_points: activity.remain_points,
      max_per_user:  activity.max_per_user,
      linked_audience_id: activity.linked_audience_id  // ⚠️ 新增，避免停用/啟用時被清空
    };

    var res = await apiCall(params);
    if (res.success) {
      showToast(newStatus === 'disabled' ? '已停用' : '已啟用');
      loadLottery();
    } else {
      showToast(res.message || '操作失敗', 'error');
    }
  });
}

function openLotteryCreateModal() {
  setContent('lottery-modal', '' +
    '<div class="modal-overlay show">' +
      '<div class="modal modal-scrollable">' +
        '<h3>新增抽獎活動</h3>' +
        '<div class="form-group">' +
          '<label>活動名稱</label>' +
          '<input id="l-name" type="text" placeholder="例：五月限定抽獎">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>類型</label>' +
          '<select id="l-type" onchange="renderLotteryTypeFields()">' +
            '<option value="A">A 限量搶購（先到先得）</option>' +
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
        '<div class="form-group">' +
          '<label>每人可參加次數（留空 = 限1次，0 = 不限）</label>' +
          '<input id="l-max-per-user" type="number" placeholder="留空 = 限1次" min="0">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>連結受眾ID（選填，供前往推播使用）</label>' +
          '<input id="l-linked-audience-id" type="text" placeholder="至「受眾管理」頁面查詢ID">' +
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

function openLotteryEditModal(rowIndex) {
  var matches = lotteryList.filter(function(a) { return a.row_index === rowIndex; });
  var activity = matches[0];
  if (!activity) {
    showToast('找不到此活動資料，請重新整理頁面再試一次', 'error');
    return;
  }

  setContent('lottery-modal', '' +
    '<div class="modal-overlay show">' +
      '<div class="modal modal-scrollable">' +
        '<h3>編輯抽獎活動</h3>' +
        '<div class="form-group">' +
          '<label>活動名稱</label>' +
          '<input id="l-name" type="text" value="' + escHtml(activity.activity_name) + '">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>類型（建立後不可變更）</label>' +
          '<select id="l-type" disabled>' +
            '<option value="A"' + (activity.type === 'A' ? ' selected' : '') + '>A 限量搶購（先到先得）</option>' +
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
        '<div class="form-group">' +
          '<label>每人可參加次數（留空 = 限1次，0 = 不限）</label>' +
          '<input id="l-max-per-user" type="number" value="' + escHtml(activity.max_per_user || '') + '" placeholder="留空 = 限1次" min="0">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>連結受眾ID（選填，供前往推播使用）</label>' +
          '<input id="l-linked-audience-id" type="text" value="' + escHtml(activity.linked_audience_id || '') + '" placeholder="至「受眾管理」頁面查詢ID">' +
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

// ⚠️ 2026-07-31 新增：小遊戲活動一鍵前往推播管理，並預選已連結的受眾
// 純粹是導航 + 預選提示，到推播頁面後仍可自由改選其他受眾，不鎖定
function goToBroadcastForActivity(audienceId) {
  window._pendingBroadcastAudienceId = audienceId;
  loadBroadcast();
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
    max_per_user:  document.getElementById('l-max-per-user').value,
    prize_pool:    JSON.stringify(prizePool),
    prize_name:    prizeNameEl ? prizeNameEl.value : ''
  };

  if (type === 'D') {
    var totalPoints = Number(document.getElementById('l-total-points').value) || 0;
    var minPoints   = Number(document.getElementById('l-min-points').value) || 1;
    var maxPoints   = Number(document.getElementById('l-max-points').value) || 10;

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

  var params = {
    action:        'saveLottery',
    activity_name: document.getElementById('l-name').value,
    type:          type,
    keyword:       document.getElementById('l-keyword').value,
    start_time:    document.getElementById('l-start').value,
    end_time:      document.getElementById('l-end').value,
    limit:         Number(document.getElementById('l-limit').value) || 0,
    max_per_user:  document.getElementById('l-max-per-user').value,
    linked_audience_id: document.getElementById('l-linked-audience-id').value,  // ⚠️ 新增
    prize_pool:    JSON.stringify(prizePool),
    prize_name:    prizeNameEl ? prizeNameEl.value : ''
  };
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
