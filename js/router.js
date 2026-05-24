var currentPage = null;

const PAGES = {
  dashboard: { label: '儀表板',   icon: '📊', feature: null,        load: loadDashboard },
  userlog:   { label: '用戶記錄', icon: '📋', feature: 'userlog',   load: loadUserLog },
  reply:     { label: '自動回覆', icon: '💬', feature: 'reply',     load: loadReply },
  audience:  { label: '受眾管理', icon: '👥', feature: 'audience',  load: loadAudience },
  richmenu:  { label: '圖文選單', icon: '🖼️', feature: 'richmenu',  load: loadRichMenu },
  lottery:   { label: '小遊戲',   icon: '🎰', feature: 'lottery',   load: loadLottery },
  broadcast: { label: '推播管理', icon: '📢', feature: 'broadcast', load: loadBroadcast },
};

function navigateTo(page) {
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

function hasFeature(page) {
  var features = authState.features || {};
  // features 是空的，全部允許
  if (Object.keys(features).length === 0) return true;
  var feature = PAGES[page] ? PAGES[page].feature : page;
  // feature 是 null 代表不需要權限（例如儀表板）
  if (feature === null || feature === undefined) return true;
  return features[feature] === true;
}

function buildSidebarMenu() {
  var menuEl = document.querySelector(".sidebar-menu");
  if (!menuEl) return;
  var html = "";
  Object.keys(PAGES).forEach(function(key) {
    if (!hasFeature(key)) return;
    var page = PAGES[key];
    html +=
      '<div class="menu-item" data-page="' + key + '" onclick="navigateTo(\'' + key + '\')">' +
        '<span class="menu-icon">' + (page.icon || '') + '</span> ' + page.label +
      '</div>';
  });
  menuEl.innerHTML = html;
}
