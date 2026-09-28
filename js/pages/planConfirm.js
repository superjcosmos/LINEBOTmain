// ============================================================
// 檔案：js/pages/planConfirm.js
// 功能：客戶自助確認正式方案／繳費方式／續約偏好＋條款同意
// ⚠️ 條款版本號寫死在這裡，terms.html之後改版時，這裡也要手動同步更新版本號
// ⚠️ 下方 _pcFeatureTableHtml() 的方案功能對照表是「靜態寫死」的行銷展示內容，
//    不會自動反映 Master Sheet 的 Features 權限分層表，兩邊需要手動保持同步
// ============================================================

var PLAN_CONFIRM_TERMS_VERSION = 'v1';
var PLAN_CONFIRM_TERMS_URL     = 'https://superjcosmos.github.io/LINEBOTmain/terms.html';

var _pcCurrentInfo = null; // 暫存目前客戶資料，供「提前續約」區塊使用

async function loadPlanConfirm() {
  setContent('<div class="loading">載入中...</div>');
  var res = await apiCall({ action: 'getClientInfo' });
  if (!res.success) {
    setContent('<div class="empty">載入失敗：' + escHtml(res.message || '') + '</div>');
    return;
  }
  renderPlanConfirm(res.data);
}

function _pcFeatureTableHtml() {
  return `
    <div style="margin-top:16px;padding:12px;background:#faf9f6;border-radius:8px">
      <div style="font-weight:600;margin-bottom:8px;font-size:13px">方案功能比較</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr style="color:#888;text-align:center">
          <td style="text-align:left"></td><td>Basic</td><td>Advanced</td><td>Enterprise</td>
        </tr>
        <tr>
          <td>儀表板／用戶紀錄／自動回覆／標籤／受眾／推薦碼／客服／匯出／黑名單</td>
          <td style="text-align:center">✓</td><td style="text-align:center">✓</td><td style="text-align:center">✓</td>
        </tr>
        <tr><td>推播（依標籤/受眾精準推播）</td><td style="text-align:center">－</td><td style="text-align:center">✓</td><td style="text-align:center">✓</td></tr>
        <tr><td>圖文選單</td><td style="text-align:center">－</td><td style="text-align:center">✓</td><td style="text-align:center">✓</td></tr>
        <tr><td>集點</td><td style="text-align:center">－</td><td style="text-align:center">✓</td><td style="text-align:center">✓</td></tr>
        <tr><td>優惠券</td><td style="text-align:center">－</td><td style="text-align:center">－</td><td style="text-align:center">✓</td></tr>
        <tr><td>抽獎</td><td style="text-align:center">－</td><td style="text-align:center">－</td><td style="text-align:center">✓</td></tr>
      </table>
    </div>
  `;
}

function renderPlanConfirm(d) {
  _pcCurrentInfo = d;
  var currentPlan = (d.plan || '').toString().trim().toLowerCase();
  var canSubmit   = (currentPlan === 'trial') || d.isExpired;

  if (!canSubmit) {
    var renewalLabel = (d.renewal_preference === 'auto_renew') ? '到期自動續約季繳'
                      : (d.renewal_preference === 'once' ? '僅本次季繳' : '-');
    setContent(`
      <div class="page-title">📋 訂閱方案</div>
      <div class="card" style="max-width:560px;padding:24px">
        <div style="font-size:15px;font-weight:600;margin-bottom:16px">目前方案設定</div>
        <div style="display:grid;grid-template-columns:120px 1fr;row-gap:12px;font-size:14px">
          <div style="color:#888">方案</div>
          <div>${escHtml(planLabel(d.plan))}</div>
          <div style="color:#888">繳費方式</div>
          <div>${escHtml(d.billing_cycle === 'quarterly' ? '季繳' : '月繳')}</div>
          <div style="color:#888">續約偏好</div>
          <div>${escHtml(renewalLabel)}</div>
          <div style="color:#888">到期日</div>
          <div>${escHtml(d.expireDate || '-')}</div>
        </div>

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee">
          <div style="font-weight:600;margin-bottom:10px;font-size:14px">提前續約</div>
          <div style="display:grid;row-gap:12px;font-size:14px">
            <div>
              <div style="color:#888;margin-bottom:6px">繳費方式</div>
              <select id="pcRenewCycle" class="form-input" onchange="_pcToggleRenewRenewalField()">
                <option value="monthly" ${d.billing_cycle !== 'quarterly' ? 'selected' : ''}>月繳</option>
                <option value="quarterly" ${d.billing_cycle === 'quarterly' ? 'selected' : ''}>季繳（多送15天使用期）</option>
              </select>
            </div>
            <div id="pcRenewRenewalWrap" style="display:${d.billing_cycle === 'quarterly' ? 'block' : 'none'}">
              <div style="color:#888;margin-bottom:6px">季繳到期後續約方式</div>
              <select id="pcRenewRenewal" class="form-input">
                <option value="once" ${d.renewal_preference !== 'auto_renew' ? 'selected' : ''}>僅本次季繳，到期轉回月繳</option>
                <option value="auto_renew" ${d.renewal_preference === 'auto_renew' ? 'selected' : ''}>到期自動續約季繳</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="_pcRenewNow()">確認提前續約</button>
          </div>
        </div>

        <p style="font-size:13px;color:#aaa;margin-top:16px">如需變更「方案」（例如Basic改Advanced），請直接與我們聯繫（superjcosmos@gmail.com），變更方案需要重新核算費用，無法自助處理。</p>
      </div>
      ${_pcFeatureTableHtml()}
    `);
    return;
  }

  setContent(`
    <div class="page-title">📋 確認訂閱方案</div>
    <div class="card" style="max-width:560px;padding:24px">
      <div style="display:grid;row-gap:16px;font-size:14px">
        <div>
          <div style="color:#888;margin-bottom:6px">選擇方案</div>
          <select id="pcPlan" class="form-input">
            <option value="basic">Basic（基礎方案）</option>
            <option value="advanced">Advanced（進階方案）</option>
            <option value="enterprise">Enterprise（企業方案）</option>
          </select>
        </div>
        <div>
          <div style="color:#888;margin-bottom:6px">繳費方式</div>
          <select id="pcBillingCycle" class="form-input" onchange="_pcToggleRenewalField()">
            <option value="monthly">月繳</option>
            <option value="quarterly">季繳（多送15天使用期）</option>
          </select>
        </div>
        <div id="pcRenewalWrap" style="display:none">
          <div style="color:#888;margin-bottom:6px">季繳到期後續約方式</div>
          <select id="pcRenewal" class="form-input">
            <option value="once">僅本次季繳，到期轉回月繳</option>
            <option value="auto_renew">到期自動續約季繳</option>
          </select>
        </div>
        <label style="font-size:13px">
          <input type="checkbox" id="pcTermsAgree">
          我已閱讀並同意
          <a href="${PLAN_CONFIRM_TERMS_URL}" target="_blank">《服務條款》${escHtml(PLAN_CONFIRM_TERMS_VERSION)}</a>
        </label>
        <button class="btn btn-primary" onclick="_pcSubmit()">確認送出</button>
      </div>
    </div>
    ${_pcFeatureTableHtml()}
  `);
}

function _pcToggleRenewalField() {
  var cycle = document.getElementById('pcBillingCycle').value;
  var wrap  = document.getElementById('pcRenewalWrap');
  if (wrap) wrap.style.display = (cycle === 'quarterly') ? 'block' : 'none';
}

function _pcToggleRenewRenewalField() {
  var cycle = document.getElementById('pcRenewCycle').value;
  var wrap  = document.getElementById('pcRenewRenewalWrap');
  if (wrap) wrap.style.display = (cycle === 'quarterly') ? 'block' : 'none';
}

async function _pcSubmit() {
  var plan         = document.getElementById('pcPlan').value;
  var billingCycle = document.getElementById('pcBillingCycle').value;
  var renewal      = (billingCycle === 'quarterly') ? document.getElementById('pcRenewal').value : '';
  var agreed       = document.getElementById('pcTermsAgree').checked;

  if (!agreed) {
    showToast('請先勾選同意服務條款', 'error');
    return;
  }
  if (billingCycle === 'quarterly' && !renewal) {
    showToast('請選擇季繳到期後的續約方式', 'error');
    return;
  }

  var res = await apiCall({
    action: 'updateMyPlan',
    plan: plan,
    billing_cycle: billingCycle,
    renewal_preference: renewal,
    terms_agreed_version: PLAN_CONFIRM_TERMS_VERSION,
    terms_agreed: true
  });

  if (res.success) {
    updateAuthPlan(plan);
    showToast('方案已確認，到期日：' + res.data.expire_date, 'success');
    loadPlanConfirm();
  } else {
    showToast(res.message || '送出失敗', 'error');
  }
}

// 唯讀畫面「提前續約」：方案沿用目前方案（不可改），繳費方式／續約偏好可重新選擇
function _pcRenewNow() {
  if (!_pcCurrentInfo) return;
  var billingCycle = document.getElementById('pcRenewCycle').value;
  var renewal       = (billingCycle === 'quarterly') ? document.getElementById('pcRenewRenewal').value : '';

  if (billingCycle === 'quarterly' && !renewal) {
    showToast('請選擇季繳到期後的續約方式', 'error');
    return;
  }

  var cycleText = (billingCycle === 'quarterly') ? '3個半月（季繳，含贈送15天）' : '1個月';
  confirmAndRun('確定要提前續約嗎？到期日將從目前到期日（' + _pcCurrentInfo.expireDate + '）往後延長' + cycleText + '。', async function () {
    var res = await apiCall({
      action: 'updateMyPlan',
      plan: _pcCurrentInfo.plan,
      billing_cycle: billingCycle,
      renewal_preference: renewal,
      terms_agreed_version: PLAN_CONFIRM_TERMS_VERSION,
      terms_agreed: true
    });
    if (res.success) {
      showToast('已提前續約，新到期日：' + res.data.expire_date, 'success');
      loadPlanConfirm();
    } else {
      showToast(res.message || '續約失敗', 'error');
    }
  });
}

// ============================================================
// 到期提醒Modal：登入後（一般客戶）自動檢查是否快到期
// ⚠️ 沿用 account.js 既有的 globalModalRoot／closeGlobalModal 慣例，
//    不另外發明第二套Modal機制
// ============================================================

async function checkExpiryReminder() {
  var res = await apiCall({ action: 'getClientInfo' });
  if (!res.success) return;
  maybeShowExpiryReminder(res.data);
}

function maybeShowExpiryReminder(d) {
  if (!d || d.isExpired) return;
  if (d.daysLeft === null || d.daysLeft > 14) return;

  var todayStr   = new Date().toDateString();
  var dismissKey = 'expiryReminderDismissed_' + d.clientId;
  try {
    if (localStorage.getItem(dismissKey) === todayStr) return;
  } catch(e) {}

  _renderExpiryReminderModal(d);
}

function _renderExpiryReminderModal(d) {
  var root = document.getElementById('globalModalRoot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'globalModalRoot';
    document.body.appendChild(root);
  }

  root.innerHTML =
    '<div class="modal-overlay" id="expiryReminderModal" style="display:flex">' +
      '<div class="modal">' +
        '<h3>⏰ 服務即將到期提醒</h3>' +
        '<p style="font-size:14px;color:#555;margin:12px 0">' +
          '您的方案將於 <strong style="color:#e67e22">' + escHtml(d.daysLeft) + ' 天後</strong>' +
          '（' + escHtml(d.expireDate) + '）到期，為避免到期後服務被暫停，建議提前確認續約。' +
        '</p>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="_dismissExpiryReminder(\'' + escHtml(d.clientId) + '\')">稍後再說</button>' +
          '<button class="btn btn-primary" onclick="_goRenewFromReminder(\'' + escHtml(d.clientId) + '\')">立即確認續約</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function _dismissExpiryReminder(clientId) {
  try { localStorage.setItem('expiryReminderDismissed_' + clientId, new Date().toDateString()); } catch(e) {}
  closeGlobalModal();
}

function _goRenewFromReminder(clientId) {
  try { localStorage.setItem('expiryReminderDismissed_' + clientId, new Date().toDateString()); } catch(e) {}
  closeGlobalModal();
  navigateTo('planconfirm');
}
