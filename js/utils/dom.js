// js/utils/dom.js
// DOM 操作相關共用工具
// ⚠️ 規範詳見專案知識 CODE_STYLE.md

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
  if (!confirm('確定要初始化工作表？此操作會建立缺少的工作表，不會覆蓋現有資料。')) return;
  apiCall({ action: 'initClientSheet' }).then(function(res) {
    if (res.success) {
      showToast('工作表初始化完成', 'success');
    } else {
      showToast(res.message || '初始化失敗', 'error');
    }
  });
}
