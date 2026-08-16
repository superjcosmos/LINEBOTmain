// js/pages/export.js
// ⚠️ 已套用 CODE_STYLE.md 規範：var 宣告風格、字串用 + 串接、統一 .card/.form-group 樣式
async function loadExport() {
  setContent(
    '<div class="page-header"><h2>匯出資料</h2></div>' +
    '<div class="card" style="margin-bottom:20px;">' +
      '<div style="font-weight:600;font-size:15px;margin-bottom:12px">用戶記錄匯出</div>' +
      '<div class="form-group" style="display:flex;gap:12px;">' +
        '<div style="flex:1;">' +
          '<label>開始日期</label>' +
          '<input type="date" id="export-start" style="width:100%;box-sizing:border-box;">' +
        '</div>' +
        '<div style="flex:1;">' +
          '<label>結束日期</label>' +
          '<input type="date" id="export-end" style="width:100%;box-sizing:border-box;">' +
        '</div>' +
      '</div>' +
      '<button class="btn btn-primary" style="margin-top:12px;" onclick="doExportUserLog()">下載 UserLog CSV</button>' +
    '</div>' +
    '<div class="card">' +
      '<div style="font-weight:600;font-size:15px;margin-bottom:12px">受眾 UID 名單匯出</div>' +
      '<div class="form-group">' +
        '<label>選擇受眾（留空 = 匯出全部）</label>' +
        '<select id="export-audience-id"><option value="">全部受眾</option></select>' +
      '</div>' +
      '<button class="btn btn-primary" style="margin-top:12px;" onclick="doExportAudienceUID()">下載 UID 名單 CSV</button>' +
    '</div>'
  );
  await _loadAudienceOptions();
}
async function _loadAudienceOptions() {
  var select = document.getElementById('export-audience-id');
  if (!select) return;
  try {
    var res = await apiCall({ action: 'getAudienceList' });
    if (!res.success) return;
    // res.data 是陣列，欄位是 name（不是 audience_name）
    var list = Array.isArray(res.data) ? res.data : [];
    list.forEach(function(a) {
      var opt = document.createElement('option');
      opt.value       = a.audience_id;
      opt.textContent = a.name + '（' + (a.count || 0) + ' 人）';
      select.appendChild(opt);
    });
  } catch (e) {
    showToast('受眾清單載入失敗', 'error');
  }
}
async function doExportUserLog() {
  var startDate = document.getElementById('export-start').value;
  var endDate   = document.getElementById('export-end').value;
  var res = await apiCall({
    action:     'exportUserLog',
    start_date: startDate,
    end_date:   endDate
  });
  if (!res.success) { showToast(res.message || '匯出失敗', 'error'); return; }
  if (res.data.total === 0) { showToast('沒有符合條件的資料', 'warning'); return; }
  _downloadCsv(res.data.csv, 'userlog_' + _today() + '.csv');
  showToast('已匯出 ' + res.data.total + ' 筆記錄', 'success');
}
async function doExportAudienceUID() {
  var audienceId = document.getElementById('export-audience-id').value;
  var res = await apiCall({
    action:      'exportAudienceUID',
    audience_id: audienceId
  });
  if (!res.success) { showToast(res.message || '匯出失敗', 'error'); return; }
  if (res.data.total === 0) { showToast('此受眾尚無成員', 'warning'); return; }
  var filename = audienceId
    ? 'audience_' + audienceId + '_' + _today() + '.csv'
    : 'audience_all_' + _today() + '.csv';
  _downloadCsv(res.data.csv, filename);
  showToast('已匯出 ' + res.data.total + ' 筆 UID', 'success');
}
function _downloadCsv(csvContent, filename) {
  var bom  = '\uFEFF';
  var blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function _today() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}
