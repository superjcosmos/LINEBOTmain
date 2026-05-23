var currentPage = null;

var PAGES = {
  userlog:  { label: "UserLog",  icon: "📊", load: loadUserLog  },
  reply:    { label: "自動回覆", icon: "💬", load: loadReply    },
  audience: { label: "受眾管理", icon: "👥", load: loadAudience },
  richmenu: { label: "圖文選單", icon: "🖼️", load: loadRichMenu },
  lottery:  { label: "小遊戲",  icon: "🎰", load: loadLottery  }
};

function navigateTo(page) {
  currentPage = page;

  // 更新選單 active 狀態
  document.querySelectorAll(".menu-item").forEach(function(el) {
    el.classList.toggle("active", el.dataset.page === page);
  });

  // 載入對應頁面
  if (PAGES[page]) {
    PAGES[page].load();
  }
}
