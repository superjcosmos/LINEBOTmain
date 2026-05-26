// js/utils/dom.js
// DOM 操作相關

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

function confirmDialog(message) {
  return new Promise(function(resolve) {
    // 用原生 confirm，之後可替換成自訂 Modal
    resolve(window.confirm(message));
  });
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
