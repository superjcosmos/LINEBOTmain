async function loadUserLog() {
  setContent('<div class="loading">載入中...</div>');

  // 同時取得日期列表和最新20筆
  var datesResult = await apiCall({ action: "getUserLogDates" });
  var logResult   = await apiCall({ action: "getUserLog", limit: 20 });

  if (!logResult.success) {
    setContent('<div class="loading">載入失敗：' + logResult.message + '</div>');
    return;
  }

  // 建立日期下拉選單
  var dateOptions = '<option value="">最新 20 筆</option>';
  if (datesResult.success) {
    datesResult.data.forEach(function(date) {
      dateOptions += '<option value="' + date + '">' + date + '</option>';
    });
  }

  var tableHtml = _buildUserLogTable(logResult.data);

  setContent(
    '<div class="toolbar" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">' +
      '<h2 class="page-title" style="margin-bottom:0">UserLog</h2>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<select id="dateFilter" onchange="filterByDate()" ' +
          'style="padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;outline:none">' +
          dateOptions +
        '</select>' +
        '<button class="btn" style="background:#f0f0f0;color:#666;font-size:12px" ' +
          'onclick="initSheet()">⚙ 初始化工作表</button>' +
      '</div>' +
    '</div>' +
    '<div class="card" id="userLogCard">' +
      tableHtml +
    '</div>'
  );
}

async function filterByDate() {
  var date      = document.getElementById("dateFilter").value;
  var card      = document.getElementById("userLogCard");
  card.innerHTML = '<div class="loading">載入中...</div>';

  var params = { action: "getUserLog" };
  if (date) {
    params.date = date;
  } else {
    params.limit = 20;
  }

  var result = await apiCall(params);

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
