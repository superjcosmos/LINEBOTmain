async function loadUserLog() {
  setContent('<div class="loading">載入中...</div>');

  var result = await apiCall({ action: "getUserLog", limit: 100 });

  if (!result.success) {
    setContent('<div class="loading">載入失敗：' + result.message + '</div>');
    return;
  }

  var rows = result.data.map(function(row) {
    return '<tr>' +
      '<td>' + formatDate(row.time)   + '</td>' +
      '<td>' + (row.name    || "-")   + '</td>' +
      '<td class="uid-cell">' + (row.userId  || "-") + '</td>' +
      '<td>' + (row.keyword || "-")   + '</td>' +
      '<td>' + (row.status  || "-")   + '</td>' +
    '</tr>';
  }).join("");

  setContent(
    '<h2 class="page-title">UserLog</h2>' +
    '<div class="card">' +
      '<table>' +
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
      '</table>' +
    '</div>'
  );
}
