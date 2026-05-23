var currentPage = null;

var PAGES = {
  userlog:  { label: "UserLog",  icon: "📊", load: function() { loadUserLog();  } },
  reply:    { label: "自動回覆", icon: "💬", load: function() { loadReply();    } },
  audience: { label: "受眾管理", icon: "👥", load: function() { loadAudience(); } },
  richmenu: { label: "圖文選單", icon: "🖼️", load: function() { loadRichMenu(); } },
  lottery:  { label: "小遊戲",  icon: "🎰", load: function() { loadLottery();  } }
};

function navigateTo(page) {
  currentPage = page;

  document.querySelectorAll(".menu-item").forEach(function(el) {
    el.classList.toggle("active", el.dataset.page === page);
  });

  if (PAGES[page]) {
    PAGES[page].load();
  }
}
