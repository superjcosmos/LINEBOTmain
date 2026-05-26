// js/router/navigate.js
// 頁面切換、權限判斷

var _currentPage = null;

function navigateTo(pageKey) {
  if (!PAGES[pageKey]) return;
  if (!hasFeature(pageKey)) {
    showToast('您的方案無此功能', 'error');
    return;
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
  var feature = PAGES[pageKey].feature;
  if (!feature) return true;
  return authState.features[feature] === true;
}

function getCurrentPage() {
  return _currentPage;
}
