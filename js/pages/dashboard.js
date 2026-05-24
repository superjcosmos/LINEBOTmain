// pages/dashboard.js

async function loadDashboard() {
  setContent('mainContent', '<div class="loading">載入儀表板...</div>');
  const res = await apiCall({ action: 'getDashboardStats' });
  if (!res.success) {
    setContent('mainContent', '<div class="loading">載入失敗</div>');
    return;
  }
  renderDashboard(res.data);
}

function renderDashboard(stats) {
  setContent('mainContent', `
    <div class="page-title">儀表板</div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px">
      <div class="card" style="text-align:center;padding:20px">
        <div style="font-size:13px;color:#888;margin-bottom:8px">總用戶數</div>
        <div style="font-size:32px;font-weight:700;color:#1a1a2e">${stats.total_users.toLocaleString()}</div>
      </div>
      <div class="card" style="text-align:center;padding:20px">
        <div style="font-size:13px;color:#888;margin-bottom:8px">今日訊息</div>
        <div style="font-size:32px;font-weight:700;color:#06C755">${stats.today_messages.toLocaleString()}</div>
      </div>
      <div class="card" style="text-align:center;padding:20px">
        <div style="font-size:13px;color:#888;margin-bottom:8px">受眾群組</div>
        <div style="font-size:32px;font-weight:700;color:#3b82f6">${stats.total_audiences}</div>
      </div>
      <div class="card" style="text-align:center;padding:20px">
        <div style="font-size:13px;color:#888;margin-bottom:8px">抽獎參與 / 中獎</div>
        <div style="font-size:32px;font-weight:700;color:#f59e0b">${stats.lottery_total} / ${stats.lottery_won}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
      <div class="card">
        <div style="font-weight:600;margin-bottom:16px">近7天活躍用戶</div>
        <canvas id="chart-dau" width="500" height="200"></canvas>
      </div>
      <div class="card">
        <div style="font-weight:600;margin-bottom:16px">近7天新增用戶</div>
        <canvas id="chart-new" width="500" height="200"></canvas>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div style="font-weight:600;margin-bottom:16px">受眾人數排行 Top 10</div>
        <canvas id="chart-audience" width="500" height="260"></canvas>
      </div>
      <div class="card">
        <div style="font-weight:600;margin-bottom:16px">熱門關鍵字 Top 10</div>
        <canvas id="chart-keywords" width="500" height="260"></canvas>
      </div>
    </div>
  `);

  setTimeout(function() {
    drawLineChart('chart-dau',      stats.daily_active_users, '#06C755');
    drawLineChart('chart-new',      stats.daily_new_users,    '#3b82f6');
    drawBarChart('chart-audience',  stats.audience_breakdown, 'name',    'count', '#f59e0b');
    drawBarChart('chart-keywords',  stats.top_keywords,       'keyword', 'count', '#8b5cf6');
  }, 50);
}

function drawLineChart(canvasId, data, color) {
  var canvas = document.getElementById(canvasId);
  if (!canvas || !data || !data.length) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.offsetWidth || 500;
  canvas.width = W;
  var H   = canvas.height;
  var PAD = { top: 20, right: 20, bottom: 36, left: 44 };

  var maxVal  = Math.max.apply(null, data.map(function(d) { return d.count; }));
  maxVal      = maxVal || 1;
  var chartW  = W - PAD.left - PAD.right;
  var chartH  = H - PAD.top  - PAD.bottom;

  ctx.clearRect(0, 0, W, H);

  // 格線
  for (var g = 0; g <= 4; g++) {
    var gy = PAD.top + (chartH / 4) * g;
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(PAD.left, gy); ctx.lineTo(W - PAD.right, gy); ctx.stroke();
    ctx.fillStyle   = '#aaa';
    ctx.font        = '11px sans-serif';
    ctx.textAlign   = 'right';
    ctx.fillText(Math.round(maxVal * (1 - g / 4)), PAD.left - 6, gy + 4);
  }

  if (data.length < 2) return;

  // 漸層填色
  var grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
  grad.addColorStop(0,   color + '33');
  grad.addColorStop(1,   color + '00');

  ctx.beginPath();
  data.forEach(function(d, i) {
    var x = PAD.left + (chartW / (data.length - 1)) * i;
    var y = PAD.top  + chartH * (1 - d.count / maxVal);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  var lastX = PAD.left + chartW;
  var lastY = PAD.top  + chartH * (1 - data[data.length-1].count / maxVal);
  ctx.lineTo(lastX, PAD.top + chartH);
  ctx.lineTo(PAD.left, PAD.top + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // 折線
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;
  ctx.beginPath();
  data.forEach(function(d, i) {
    var x = PAD.left + (chartW / (data.length - 1)) * i;
    var y = PAD.top  + chartH * (1 - d.count / maxVal);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // 點 + 標籤
  data.forEach(function(d, i) {
    var x = PAD.left + (chartW / (data.length - 1)) * i;
    var y = PAD.top  + chartH * (1 - d.count / maxVal);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle  = '#fff';
    ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle  = '#888';
    ctx.font       = '10px sans-serif';
    ctx.textAlign  = 'center';
    ctx.fillText(d.date.slice(-5), x, H - PAD.bottom + 14);
  });
}

function drawBarChart(canvasId, data, labelKey, valueKey, color) {
  var canvas = document.getElementById(canvasId);
  if (!canvas || !data || !data.length) return;
  var ctx = canvas.getContext('2d');
  var W   = canvas.offsetWidth || 500;
  canvas.width = W;
  var H   = canvas.height;
  var PAD = { top: 10, right: 50, bottom: 10, left: 110 };

  var maxVal = Math.max.apply(null, data.map(function(d) { return d[valueKey]; }));
  maxVal     = maxVal || 1;
  var barH   = Math.floor((H - PAD.top - PAD.bottom) / data.length) - 4;
  var chartW = W - PAD.left - PAD.right;

  ctx.clearRect(0, 0, W, H);

  data.forEach(function(d, i) {
    var y    = PAD.top + i * (barH + 4);
    var barW = (d[valueKey] / maxVal) * chartW;

    // 背景條
    ctx.fillStyle = '#f7f8fa';
    ctx.fillRect(PAD.left, y, chartW, barH);

    // 資料條
    ctx.fillStyle = color + 'cc';
    ctx.fillRect(PAD.left, y, barW, barH);

    // 標籤
    ctx.fillStyle  = '#444';
    ctx.font       = '12px sans-serif';
    ctx.textAlign  = 'right';
    var label = String(d[labelKey]);
    if (label.length > 8) label = label.slice(0, 8) + '…';
    ctx.fillText(label, PAD.left - 6, y + barH / 2 + 4);

    // 數值
    ctx.fillStyle = '#444';
    ctx.textAlign = 'left';
    ctx.fillText(d[valueKey], PAD.left + barW + 6, y + barH / 2 + 4);
  });
}
