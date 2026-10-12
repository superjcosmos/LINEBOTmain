// js/utils/dom.js
// DOM 操作相關共用工具
// ⚠️ 規範詳見專案知識 CODE_STYLE.md
// ⚠️ 2026-10-11 健檢：新增 escJsStr（onclick 內 JS 字串參數專用，見函式註解）

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
