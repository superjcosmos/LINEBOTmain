async function loadUserLog() {
  setContent('<div class="loading">載入中...</div>');

  var logResult = await apiCall({ action: "getUserLog", limit: 20 });

  if (!logResult.success) {
    setContent('<div class="loading">載入失敗：' + logResult.message + '</div>');
    return;
  }

  var today     = new Date();
  var todayStr  = _formatDateStr(today);
  var yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = _formatDateStr(yesterday);

  setContent(
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">' +
      '<h2 class="page-title" style="margin-bottom:0">使用者記錄</h2>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<input type="date" id="dateFrom" value="' + yesterdayStr + '" ' +
          'style="padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;outline:none">' +
        '<span style="color:#888">～</span>' +
        '<input type="date" id="dateTo" value="' + todayStr + '" ' +
          'style="padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;outline:none">' +
        '<button class="btn btn-primary" onclick="filterByDate()">查詢</button>' +
        '<button class="btn" style="background:#f0f0f0;color:#666" onclick="resetLog()">最新20筆</button>' +
      '</div>' +
    '</div>' +
    '<div class="card" id="userLogCard">' +
      _buildUserLogTable(logResult.data) +
    '</div>' +
    '<div style="text-align:right;margin-top:8px">' +
      '<button class="btn" style="background:#f0f0f0;color:#666;font-size:12px" ' +
        'onclick="initSheet()">⚙ 初始化工作表</button>' +
    '</div>'
  );
}

async function filterByDate() {
  var from = document.getElementById("dateFrom").value;
  var to   = document.getElementById("dateTo").value;

  if (!from || !to) {
    showToast("請選擇日期區間", "error");
    return;
  }

  if (from > to) {
    showToast("開始日期不能大於結束日期", "error");
    return;
  }

  var card      = document.getElementById("userLogCard");
  card.innerHTML = '<div class="loading">載入中...</div>';

  var result = await apiCall({
    action:    "getUserLog",
    date_from: from,
    date_to:   to
  });

  if (result.success) {
    card.innerHTML = _buildUserLogTable(result.data);
  } else {
    card.innerHTML = '<div class="loading">載入失敗：' + result.message + '</div>';
  }
}

async function resetLog() {
  var card      = document.getElementById("userLogCard");
  card.innerHTML = '<div class="loading">載入中...</div>';

  var result = await apiCall({ action: "getUserLog", limit: 20 });

  if (result.success) {
    card.innerHTML = _buildUserLogTable(result.data);
  } else {
    card.innerHTML = '<div class="loading">載入失敗：' + result.message + '</div>';
  }
}

function _buildUserLogTable(data) {
  var rows = data.map(function(row) {
    return '<tr>' +
      '<td>' + formatDate(row.time)    + '</td>' +
      '<td>' + (row.name    || "-")    + '</td>' +
      '<td class="uid-cell">' + (row.userId  || "-") + '</td>' +
      '<td>' + (row.keyword || "-")    + '</td>' +
      '<td>' + (row.status  || "-")    + '</td>' +
    '</tr>';
  }).join("");

  return '<table>' +
    '<thead><tr>' +
      '<th>時間</th>' +
      '<th>名稱</th>' +
      '<th>UserID</th>' +
      '<th>關鍵字</th>' +
      '<th>狀態</th>' +
    '</tr></thead>' +
    '<tbody>' +
      (rows || '<tr><td colspan="5" class="empty">尚無資料</td></tr>') +
    '</tbody>' +
  '</table>';
}

function _formatDateStr(date) {
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0");
}
