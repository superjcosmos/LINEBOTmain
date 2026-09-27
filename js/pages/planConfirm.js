// ============================================================
// 檔案：js/pages/planConfirm.js
// 功能：客戶自助確認正式方案／繳費方式／續約偏好＋條款同意
// ⚠️ 條款版本號寫死在這裡，terms.html之後改版時，這裡也要手動同步更新版本號
// ============================================================

var PLAN_CONFIRM_TERMS_VERSION = 'v1';
var PLAN_CONFIRM_TERMS_URL     = 'https://superjcosmos.github.io/LINEBOTmain/terms.html';

async function loadPlanConfirm() {
  setContent('<div class="loading">載入中...</div>');
  var res = await apiCall({ action: 'getClientInfo' });
  if (!res.success) {
    setContent('<div class="empty">載入失敗：' + escHtml(res.message || '') + '</div>');
    return;
  }
  renderPlanConfirm(res.data);
}

function renderPlanConfirm(d) {
  var currentPlan = (d.plan || '').toString().trim().toLowerCase();
  var canSubmit   = (currentPlan === 'trial') || d.isExpired;

  if (!canSubmit) {
    setContent(`
      <div class="page-title">📋 確認方案</div>
      <div class="card" style="max-width:520px;padding:24px">
        <div style="font-size:15px;font-weight:600;margin-bottom:16px">目前方案設定</div>
        <div style="display:grid;grid-template-columns:120px 1fr;row-gap:12px;font-size:14px">
          <div style="color:#888">方案</div>
          <div>${escHtml(_capitalize(d.plan))}</div>
          <div style="color:#888">繳費方式</div>
          <div>${escHtml(d.billing_cycle === 'quarterly' ? '季繳' : '月繳')}</div>
          <div style="color:#888">續約偏好</div>
          <div>${escHtml(d.renewal_preference === 'auto_renew' ? '到期自動續約季繳' : (d.renewal_preference === 'once' ? '僅本次季繳' : '-'))}</div>
          <div style="color:#888">到期日</div>
          <div>${escHtml(d.expireDate || '-')}</div>
        </div>
        <p style="font-size:13px;color:#aaa;margin-top:16px">您目前的方案尚未到期，如需調整方案、繳費方式或續約偏好，請直接與我們聯繫（superjcosmos@gmail.com），避免自助變更影響您原有的服務期間計算。</p>
      </div>
    `);
    return;
  }

  setContent(`
    <div class="page-title">📋 確認正式方案</div>
    <div class="card" style="max-width:520px;padding:24px">
      <div style="display:grid;row-gap:16px;font-size:14px">
        <div>
          <div style="color:#888;margin-bottom:6px">選擇方案</div>
          <select id="pcPlan" class="form-input">
            <option value="basic">Basic</option>
            <option value="advanced">Advanced</option>
            <option value="enterprise">Enterprise</option>
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
  `);
}

function _pcToggleRenewalField() {
  var cycle = document.getElementById('pcBillingCycle').value;
  var wrap  = document.getElementById('pcRenewalWrap');
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
    showToast('方案已確認，到期日：' + res.data.expire_date, 'success');
    loadPlanConfirm();
  } else {
    showToast(res.message || '送出失敗', 'error');
  }
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
    if (localStorage.getItem(dismissKey) === todayStr) return; // 今天已經看過，不重複跳出
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
