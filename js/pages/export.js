// pages/export.js

function loadExport() {
  const html = `
    <div class="page-header">
      <h2>匯出資料</h2>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-header"><h3>用戶記錄匯出</h3></div>
      <div class="card-body">
        <div class="row">
          <div class="col">
            <label>開始日期</label>
            <input type="date" id="export-start" class="form-control">
          </div>
          <div class="col">
            <label>結束日期</label>
            <input type="date" id="export-end" class="form-control">
          </div>
        </div>
        <button class="btn btn-primary" style="margin-top:12px;"
                onclick="doExportUserLog()">
          下載 UserLog CSV
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>受眾 UID 名單匯出</h3></div>
      <div class="card-body">
        <div class="form-group">
          <label>選擇受眾（留空 = 匯出全部）</label>
          <select id="export-audience-id" class="form-control">
            <option value="">全部受眾</option>
          </select>
        </div>
        <button class="btn btn-primary" style="margin-top:12px;"
                onclick="doExportAudienceUID()">
          下載 UID 名單 CSV
        </button>
      </div>
    </div>`;

  setContent(html);
  _loadAudienceOptions();
}

async function _loadAudienceOptions() {
  const res = await apiCall({ action: 'getAudienceList' });
  if (!res.success) return;
  const select = document.getElementById('export-audience-id');
  if (!select) return;
  (res.data.list || []).forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.audience_id;
    opt.textContent = `${a.audience_name}（${a.count} 人）`;
    select.appendChild(opt);
  });
}

async function doExportUserLog() {
  const startDate = document.getElementById('export-start').value;
  const endDate   = document.getElementById('export-end').value;

  const res = await apiCall({
    action: 'exportUserLog',
    start_date: startDate,
    end_date:   endDate
  });

  if (!res.success) { showToast(res.message || '匯出失敗', 'error'); return; }
  if (res.data.total === 0) { showToast('沒有符合條件的資料', 'warning'); return; }

  _downloadCsv(res.data.csv, `userlog_${_today()}.csv`);
  showToast(`已匯出 ${res.data.total} 筆記錄`, 'success');
}

async function doExportAudienceUID() {
  const audienceId = document.getElementById('export-audience-id').value;

  const res = await apiCall({
    action: 'exportAudienceUID',
    audience_id: audienceId
  });

  if (!res.success) { showToast(res.message || '匯出失敗', 'error'); return; }
  if (res.data.total === 0) { showToast('此受眾尚無成員', 'warning'); return; }

  const filename = audienceId
    ? `audience_${audienceId}_${_today()}.csv`
    : `audience_all_${_today()}.csv`;

  _downloadCsv(res.data.csv, filename);
  showToast(`已匯出 ${res.data.total} 筆 UID`, 'success');
}

// ─── 下載 helper ───
function _downloadCsv(csvContent, filename) {
  // 加 BOM 讓 Excel 正確顯示中文
  const bom  = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
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
