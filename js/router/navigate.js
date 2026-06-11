// js/router/navigate.js
// 頁面切換、權限判斷

var _currentPage = null;

function navigateTo(pageKey) {
  if (!PAGES[pageKey]) return;
  if (!hasFeature(pageKey)) {
    showToast('您的方案無此功能', 'error');
    return;
  }

  // ── 切換視角時，確保提示條還在 ──
  if (authState.role === 'client_preview') {
    var bar = document.getElementById('impersonateBar');
    if (!bar) {
      // bar 不見了，重新補回
      _showImpersonateBar(authState.company_name || authState.clientId);
    }
  }

  _currentPage = pageKey;
  document.querySelectorAll('.menu-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.page === pageKey);
  });
  var mainContent = document.getElementById('mainContent');
  if (mainContent) mainContent.innerHTML = '<div class="loading">載入中...</div>';
  try {
    PAGES[pageKey].load();
  } catch(e) {
    if (mainContent) {
      mainContent.innerHTML = '<div class="empty">頁面載入失敗：' + e.message + '</div>';
    }
  }
}

  _currentPage = pageKey;

  // 更新側邊欄 active 狀態
  document.querySelectorAll('.menu-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.page === pageKey);
  });

  // 清空主內容區
  var mainContent = document.getElementById('mainContent');
  if (mainContent) mainContent.innerHTML = '<div class="loading">載入中...</div>';

  // 執行該頁面的 load 函式
  try {
    PAGES[pageKey].load();
  } catch(e) {
    if (mainContent) {
      mainContent.innerHTML = '<div class="empty">頁面載入失敗：' + e.message + '</div>';
    }
  }
}

// js/router/navigate.js 的 hasFeature 函式更新：
function hasFeature(pageKey) {
  if (!PAGES[pageKey]) return false;
  var page = PAGES[pageKey];

  // adminOnly 頁面：只有 admin 可見
  if (page.adminOnly) return authState.role === 'admin';

  // admin 登入後不顯示一般客戶頁面
  if (authState.role === 'admin') return false;

  // 一般方案控管
  var feature = page.feature;
  if (!feature) return true;
  return authState.features[feature] === true;
}

function getCurrentPage() {
  return _currentPage;
}
