// ============================================================
// 檔案：js/pages/myaccount.js
// 路徑：js/pages/myaccount.js
// 功能：客戶查看自己的帳號資訊（公司名稱、方案、到期日、推薦計畫）
// ============================================================

async function loadMyAccount() {
  setContent('<div class="loading">載入帳號資訊...</div>');
  var res = await apiCall({ action: 'getClientInfo' });
  if (!res.success) {
    setContent('<div class="loading">載入失敗：' + escHtml(res.message || '') + '</div>');
    return;
  }
  renderMyAccount(res.data);
}

function renderMyAccount(d) {
  var expireStyle = '';
  var expireHint  = '';
  if (d.isExpired) {
    expireStyle = 'color:#e74c3c;font-weight:600';
  } else if (d.daysLeft !== null && d.daysLeft <= 14) {
    expireStyle = 'color:#e67e22;font-weight:600';
    expireHint  = '　<span style="font-size:12px">（剩 ' + d.daysLeft + ' 天）</span>';
  }

  setContent(`
    <div class="page-title">🪪 我的帳號</div>

    <div class="card" style="max-width:520px;padding:24px">
      <div style="font-size:15px;font-weight:600;margin-bottom:16px">基本資訊</div>
      <div style="display:grid;grid-template-columns:100px 1fr;row-gap:12px;font-size:14px">
        <div style="color:#888">公司名稱</div>
        <div>${escHtml(d.company_name || '-')}</div>
        <div style="color:#888">登入 Email</div>
        <div>${escHtml(d.email || '-')}</div>
        <div style="color:#888">目前方案</div>
        <div><span style="background:${_planColor(d.plan)};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">${escHtml(_capitalize(d.plan))}</span></div>
        <div style="color:#888">到期日</div>
        <div style="${expireStyle}">${escHtml(d.expireDate || '-')}${expireHint}</div>
      </div>
    </div>

    <div class="card" style="max-width:520px;padding:24px;margin-top:16px">
      <div style="font-size:15px;font-weight:600;margin-bottom:16px">🎯 推薦計畫</div>
      <div style="display:grid;grid-template-columns:100px 1fr;row-gap:12px;font-size:14px">
        <div style="color:#888">您的推薦碼</div>
        <div style="font-weight:600">${escHtml(d.clientId)}</div>
        <div style="color:#888">推薦成功次數</div>
        <div>${d.referral_count || 0} 次</div>
        <div style="color:#888">目前推薦點數</div>
        <div style="font-weight:600;color:#f39c12">${d.referral_credit || 0} 點</div>
      </div>
      <p style="font-size:12px;color:#aaa;margin-top:16px">將您的推薦碼提供給有興趣的店家，成功推薦介紹後可獲得點數獎勵，詳情請聯繫 J COSMOS。</p>
    </div>
  `);
}
