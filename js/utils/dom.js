// js/utils/dom.js
// DOM 操作相關共用工具
// ⚠️ 規範詳見專案知識 CODE_STYLE.md
// ⚠️ 2026-10-11 健檢：新增 escJsStr（onclick 內 JS 字串參數專用，見函式註解）
// ⚠️ 2026-11-14 第 4d 批：新增 passwordLengthError／updatePasswordLengthHint（新密碼長度共用）
// ⚠️ 2026-11-14 第 4e 批 F69：新增 buildTagSelectOptions（貼標下拉保留已停用的既有設定）

function setContent(idOrHtml, html) {
  // 支援雙參數 setContent('elementId', html)
  // 或單參數 setContent(html) → 寫入 mainContent
  if (html === undefined) {
    var el = document.getElementById('mainContent');
    if (el) el.innerHTML = idOrHtml;
  } else {
    var el = document.getElementById(idOrHtml);
    if (el) el.innerHTML = html;
  }
}

// ── HTML escape：全站唯一版本，取代所有頁面各自的 _esc/_escR/_lEsc 等 ──
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── onclick="fn('...')" 這類「HTML 屬性裡的 JS 字串」位置專用 ──
// escHtml 只擋 HTML 層：瀏覽器會先把 &#39; 還原成單引號才執行 JS，名稱仍可跳出字串
// 並執行腳本。這裡把所有非英數字元（含中文、引號、反斜線）轉成 \uXXXX，
// JS 執行時會還原成原字串，兩層解碼都不可能提早結束字串。
// 用法：onclick="fn(\'' + escJsStr(使用者資料) + '\')"
function escJsStr(str) {
  if (str === null || str === undefined) return '';
  var s = String(str).replace(/[^A-Za-z0-9 ]/g, function(c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
  return escHtml(s);
}

// ── 確認對話框（回傳 Promise<boolean>） ──
function confirmDialog(message) {
  return new Promise(function(resolve) {
    // 用原生 confirm，之後可替換成自訂 Modal（只需改這裡，全站自動套用）
    resolve(window.confirm(message));
  });
}

// ── 確認後執行：取代裸的 confirmDialog 呼叫，避免漏掉 await 的 bug ──
// 用法：await confirmAndRun('確定刪除？', async function() { ...刪除邏輯... });
async function confirmAndRun(message, actionFn) {
  var ok = await confirmDialog(message);
  if (!ok) return false;
  await actionFn();
  return true;
}

// ── Modal 開關：統一用 display 切換，所有 Modal 預先寫在頁面骨架 HTML 裡 ──
function openModal(modalId) {
  var m = document.getElementById(modalId);
  if (m) m.style.display = 'flex';
}

function closeModal(modalId) {
  var m = document.getElementById(modalId);
  if (m) m.style.display = 'none';
}

function initSheet() {
  confirmAndRun('確定要初始化工作表？此操作會建立缺少的工作表，不會覆蓋現有資料。', async function() {
    var res = await apiCall({ action: 'initClientSheet' });
    if (res.success) {
      showToast('工作表初始化完成', 'success');
    } else {
      showToast(res.message || '初始化失敗', 'error');
    }
  });
}


// ── 新密碼長度（2026-11-14 第 4d 批 F04）：全站共用，長度只看 CONFIG.MIN_PASSWORD_LEN ──
// 比對前先 trim，與後端 changePassword／resetPassword 的檢查方式一致

// 送出前檢查：不足時回傳錯誤訊息，通過回傳空字串
function passwordLengthError(pw) {
  var min = CONFIG.MIN_PASSWORD_LEN;
  return String(pw || '').trim().length < min ? '密碼至少需要 ' + min + ' 個字元' : '';
}

// 輸入時即時提示「還差 N 個字元」；欄位空白或已達長度時不顯示（由 oninput 呼叫）
function updatePasswordLengthHint(inputId, hintId) {
  var input = document.getElementById(inputId);
  var hint  = document.getElementById(hintId);
  if (!input || !hint) return;
  var len  = String(input.value || '').trim().length;
  var lack = CONFIG.MIN_PASSWORD_LEN - len;
  hint.textContent = (len > 0 && lack > 0) ? '還差 ' + lack + ' 個字元' : '';
}


// ── 標籤下拉選項（點數卡兌換貼標、優惠券核銷貼標共用，2026-11-14 第 4e 批 F69）──
// 只列啟用中的標籤；但目前已設定的標籤若已停用或已不存在，仍保留為選項並標示，
// 避免編輯時下拉對不到值、按儲存就把原設定靜靜清掉
// allTags：getTagList 回傳的完整清單（不要先過濾）；selectedId：目前設定的 tag_id
function buildTagSelectOptions(allTags, selectedId) {
  var sel   = String(selectedId || '');
  var found = false;
  var html  = '<option value="">不自動貼標籤</option>';
  (allTags || []).forEach(function(t) {
    var id       = String(t.tag_id);
    var isSel    = sel !== '' && id === sel;
    var isActive = t.status === 'active';
    if (!isActive && !isSel) return;
    if (isSel) found = true;
    html += '<option value="' + escHtml(id) + '"' + (isSel ? ' selected' : '') + '>' +
      escHtml(t.tag_name) + (isActive ? '' : '（已停用）') + '</option>';
  });
  if (sel && !found) {
    html += '<option value="' + escHtml(sel) + '" selected>（標籤已不存在：' + escHtml(sel) + '）</option>';
  }
  return html;
}



// ── 啟用／停用狀態徽章（2026-11-22 第 5g-2 批 F71：原本 lottery.js、coupon.js 各一份，搬到這裡共用）──
function _statusBadge(isActive) {
  return isActive
    ? '<span style="background:#e6f9f0;color:#1D9E75;border-radius:20px;padding:2px 10px;font-size:12px">啟用中</span>'
    : '<span style="background:#f5f5f5;color:#aaa;border-radius:20px;padding:2px 10px;font-size:12px">已停用</span>';
}
