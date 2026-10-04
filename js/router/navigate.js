// ============================================================
// 檔案：js/router/navigate.js
// 路徑：js/router/navigate.js
// 功能：頁面切換、權限判斷
// ============================================================

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
      _showImpersonateBar(authState.company_name || authState.clientId);
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

function hasFeature(pageKey) {
  if (!PAGES[pageKey]) return false;
  var page = PAGES[pageKey];

  // adminOnly 頁面：只有 admin 可見
  if (page.adminOnly) return authState.role === 'admin';

  // admin 登入後不顯示一般客戶頁面（client_preview 可以看）
  if (authState.role === 'admin') return false;

  // 一般方案控管
  var feature = page.feature;
  if (!feature) return true;
  return authState.features[feature] === true;
}

// 依「功能key」判斷（不是頁面key），供頁面內的子功能區塊使用
// 例如 coupon.js 的序號池區塊（coupon_serial），它不是獨立頁面，不能用 hasFeature(pageKey)
// ⚠️ 2026-10-04 新增；目前方案限制皆只擋前端，後端 routeAction 未依方案檢查（已記錄技術債）
function hasFeatureKey(featureKey) {
  if (authState.role === 'admin') return false;
  return authState.features[featureKey] === true;
}

function getCurrentPage() {
  return _currentPage;
}
