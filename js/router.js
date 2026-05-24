var currentPage = null;

// router.js 的 PAGES 加入：

const PAGES = {
  dashboard:  { label: '儀表板',     feature: null,        load: loadDashboard },
  userlog:    { label: '用戶記錄',   feature: 'userlog',   load: loadUserLog },
  reply:      { label: '自動回覆',   feature: 'reply',     load: loadReply },
  audience:   { label: '受眾管理',   feature: 'audience',  load: loadAudience },
  richmenu:   { label: '圖文選單',   feature: 'richmenu',  load: loadRichMenu },
  lottery:    { label: '小遊戲',     feature: 'lottery',   load: loadLottery },
  broadcast:  { label: '推播管理',   feature: 'broadcast', load: loadBroadcast },
  dashboard_page: { label: '儀表板', feature: null,        load: loadDashboard },
};

function navigateTo(page) {
  // 檢查是否有權限
  if (!hasFeature(page)) {
    showToast("您的方案無此功能", "error");
    return;
  }

  currentPage = page;

  document.querySelectorAll(".menu-item").forEach(function(el) {
    el.classList.toggle("active", el.dataset.page === page);
  });

  if (PAGES[page]) {
    PAGES[page].load();
  }
}

function hasFeature(feature) {
  var features = authState.features || {};
  // 如果功能清單是空的，預設全部允許（向下兼容）
  if (Object.keys(features).length === 0) return true;
  return features[feature] === true;
}

function buildSidebarMenu() {
  var menuEl = document.querySelector(".sidebar-menu");
  if (!menuEl) return;

  var html = "";
  Object.keys(PAGES).forEach(function(key) {
    if (!hasFeature(key)) return; // 沒權限就不顯示
    var page = PAGES[key];
    html +=
      '<div class="menu-item" data-page="' + key + '" onclick="navigateTo(\'' + key + '\')">' +
        '<span class="menu-icon">' + page.icon + '</span> ' + page.label +
      '</div>';
  });

  menuEl.innerHTML = html;
}
