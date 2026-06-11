// ============================================================
// 檔案：js/router/sidebar.js
// 路徑：js/router/sidebar.js
// 功能：側邊欄選單建立、客服留言未讀徽章、輪詢
// ============================================================

function buildSidebarMenu() {
  var menu = document.getElementById('sidebarMenu');
  if (!menu) return;
  menu.innerHTML = '';

  Object.keys(PAGES).forEach(function(key) {
    if (!hasFeature(key)) return;
    var page = PAGES[key];
    var item = document.createElement('div');
    item.className    = 'menu-item';
    item.dataset.page = key;

    // 客服留言：加入未讀徽章
    var badgeHtml = '';
    if (key === 'admin_support') {
      badgeHtml =
        '<span id="supportNavBadge" ' +
        'style="display:none;background:#e74c3c;color:#fff;border-radius:10px;' +
        'font-size:11px;padding:1px 7px;margin-left:6px;font-weight:600;' +
        'vertical-align:middle"></span>';
    }

    item.innerHTML = '<span class="menu-icon">' + page.icon + '</span>' + page.label + badgeHtml;
    item.onclick   = function() { navigateTo(key); };
    menu.appendChild(item);
  });

  // admin 登入後啟動輪詢
  if (authState.role === 'admin' || authState.role === 'client_preview') {
    _startSupportPolling();
  }
}

// ────────────────────────────────────────────────────────────
// 未讀徽章更新
// ────────────────────────────────────────────────────────────
function _updateSupportBadge(count) {
  var badge = document.getElementById('supportNavBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent   = count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// ────────────────────────────────────────────────────────────
// 輪詢：每 60 秒更新一次未讀數
// ────────────────────────────────────────────────────────────
var _supportPollTimer = null;

function _startSupportPolling() {
  if (_supportPollTimer) clearInterval(_supportPollTimer);
  _fetchSupportBadge(); // 立即執行一次
  _supportPollTimer = setInterval(_fetchSupportBadge, 60000);
}

async function _fetchSupportBadge() {
  try {
    if (authState.role !== 'admin') return; // 只有 admin 才呼叫
    var res = await apiCall({ action: 'getSupportUnreadCount' });
    if (res.success) {
      _updateSupportBadge(res.data.count || 0);
    }
  } catch(e) {}
}
