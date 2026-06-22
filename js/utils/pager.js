// js/utils/pager.js
// 通用分頁元件，取代各頁面各自手寫的 _renderXxxPager + gotoXxxPage
// ⚠️ 規範詳見專案知識 CODE_STYLE.md

// 渲染分頁按鈕列
// containerId：分頁按鈕要放入的容器 id
// total：篩選後的總筆數
// currentPage：目前頁碼
// pageSize：每頁筆數
// onPageChange：function(newPage) { ... }，按下頁碼後的回呼，由呼叫端更新狀態並重新渲染表格
function renderPager(containerId, total, currentPage, pageSize, onPageChange) {
  var pager = document.getElementById(containerId);
  if (!pager) return;

  var totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) { pager.innerHTML = ''; return; }

  var activeStyle   = 'background:#1a1a2e;color:#fff;border:none;';
  var inactiveStyle = 'background:#f0f0f0;color:#444;border:none;';
  var btnBase       = 'padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px;';

  // 註冊一個全域 callback 暫存，避免每個按鈕都要 inline 一份邏輯
  var callbackKey = '__pagerCb_' + containerId.replace(/[^a-zA-Z0-9]/g, '_');
  window[callbackKey] = onPageChange;

  var html = '';
  html += '<button ' + (currentPage === 1 ? 'disabled ' : '') +
    'style="' + btnBase + inactiveStyle + '" ' +
    'onclick="window[\'' + callbackKey + '\'](' + (currentPage - 1) + ')">上一頁</button>';

  for (var p = 1; p <= totalPages; p++) {
    var style = p === currentPage ? activeStyle : inactiveStyle;
    html += '<button style="' + btnBase + style + '" ' +
      'onclick="window[\'' + callbackKey + '\'](' + p + ')">' + p + '</button>';
  }

  html += '<button ' + (currentPage === totalPages ? 'disabled ' : '') +
    'style="' + btnBase + inactiveStyle + '" ' +
    'onclick="window[\'' + callbackKey + '\'](' + (currentPage + 1) + ')">下一頁</button>';

  pager.innerHTML = html;
}
