var currentPage = null;

var PAGES = {
  userlog:  { label: "使用者記錄", icon: "📊", load: function() { loadUserLog();  } },
  reply:    { label: "自動回覆",   icon: "💬", load: function() { loadReply();    } },
  audience: { label: "受眾管理",   icon: "👥", load: function() { loadAudience(); } },
  richmenu: { label: "圖文選單",   icon: "🖼️", load: function() { loadRichMenu(); } },
  lottery:  { label: "小遊戲",    icon: "🎰", load: function() { loadLottery();  } }
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
