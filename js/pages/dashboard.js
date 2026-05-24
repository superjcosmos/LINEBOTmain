// pages/dashboard.js

async function loadDashboard() {
  setContent('dashboard-content', '<div class="loading">載入中...</div>');
  const res = await apiCall('getDashboardStats');
  if (!res.success) return setContent('dashboard-content', '載入失敗');
  
  const stats = res.data;
  renderDashboard(stats);
}

function renderDashboard(stats) {
  const html = `
    <div class="dashboard-grid">
      
      <!-- KPI 卡片 -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">總用戶數</div>
          <div class="kpi-value">${stats.total_users.toLocaleString()}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">今日訊息</div>
          <div class="kpi-value">${stats.today_messages.toLocaleString()}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">受眾群組</div>
          <div class="kpi-value">${stats.total_audiences}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">抽獎參與 / 中獎</div>
          <div class="kpi-value">${stats.lottery_total} / ${stats.lottery_won}</div>
        </div>
      </div>
      
      <!-- 7天活躍用戶折線圖 -->
      <div class="chart-card">
        <h4>近7天活躍用戶</h4>
        <canvas id="chart-dau" width="600" height="200"></canvas>
      </div>
      
      <!-- 7天新用戶折線圖 -->
      <div class="chart-card">
        <h4>近7天新增用戶</h4>
        <canvas id="chart-new" width="600" height="200"></canvas>
      </div>
      
      <!-- 受眾分布橫條圖 -->
      <div class="chart-card">
        <h4>受眾人數排行（Top 10）</h4>
        <canvas id="chart-audience" width="600" height="250"></canvas>
      </div>
      
      <!-- 關鍵字 Top 10 -->
      <div class="chart-card">
        <h4>熱門關鍵字 Top 10</h4>
        <canvas id="chart-keywords" width="600" height="250"></canvas>
      </div>
      
    </div>
  `;
  
  setContent('dashboard-content', html);
  
  // 圖表需等 DOM 渲染完
  setTimeout(() => {
    drawLineChart('chart-dau', stats.daily_active_users, '#4f88ff');
    drawLineChart('chart-new', stats.daily_new_users, '#34c97a');
    drawBarChart('chart-audience', stats.audience_breakdown, 'name', 'count', '#f59e0b');
    drawBarChart('chart-keywords', stats.top_keywords, 'keyword', 'count', '#8b5cf6');
  }, 50);
}

// 通用折線圖
function drawLineChart(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !data.length) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  
  ctx.clearRect(0, 0, W, H);
  
  // 格線
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
    ctx.fillStyle = '#9ca3af'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal * (1 - i/4)), PAD.left - 5, y + 4);
  }
  
  // 折線
  ctx.strokeStyle = color; ctx.lineWidth = 2.5;
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = PAD.left + (chartW / (data.length - 1)) * i;
    const y = PAD.top + chartH * (1 - d.count / maxVal);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  
  // 點
  ctx.fillStyle = color;
  data.forEach((d, i) => {
    const x = PAD.left + (chartW / (data.length - 1)) * i;
    const y = PAD.top + chartH * (1 - d.count / maxVal);
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    
    // X 標籤（日期最後4碼）
    ctx.fillStyle = '#6b7280'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(d.date.slice(-5), x, H - PAD.bottom + 15);
    ctx.fillStyle = color;
  });
}

// 通用橫條圖
function drawBarChart(canvasId, data, labelKey, valueKey, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !data.length) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const PAD = { top: 10, right: 60, bottom: 10, left: 120 };
  
  const maxVal = Math.max(...data.map(d => d[valueKey]), 1);
  const barH = (H - PAD.top - PAD.bottom) / data.length - 4;
  const chartW = W - PAD.left - PAD.right;
  
  ctx.clearRect(0, 0, W, H);
  
  data.forEach((d, i) => {
    const y = PAD.top + i * (barH + 4);
    const barW = (d[valueKey] / maxVal) * chartW;
    
    // 標籤
    ctx.fillStyle = '#374151'; ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
    const label = String(d[labelKey]).slice(0, 10);
    ctx.fillText(label, PAD.left - 5, y + barH / 2 + 4);
    
    // 條
    ctx.fillStyle = color + '99';
    ctx.fillRect(PAD.left, y, barW, barH);
    
    // 數值
    ctx.fillStyle = '#374151'; ctx.textAlign = 'left';
    ctx.fillText(d[valueKey], PAD.left + barW + 4, y + barH / 2 + 4);
  });
}
