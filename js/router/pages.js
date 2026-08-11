// js/router/pages.js
// PAGES 物件：所有頁面定義集中在這裡
var PAGES = {
  // ── 管理者專屬 ──
  admin:         { label: '系統管理',     icon: '<i class="ti ti-shield"></i>',           load: function() { loadAdmin();        }, feature: null,          adminOnly: true },
  admin_support: { label: '客服留言管理', icon: '<i class="ti ti-message-dots"></i>',     load: function() { loadAdminSupport(); }, feature: null,          adminOnly: true },
  // ── 一般客戶 ──
  myaccount:    { label: '我的帳號', icon: '<i class="ti ti-id-badge"></i>',        load: function() { loadMyAccount();    }, feature: null          },
  dashboard:    { label: '儀表板',   icon: '<i class="ti ti-layout-dashboard"></i>', load: function() { loadDashboard();    }, feature: 'dashboard'   },
  userlog:      { label: '用戶記錄', icon: '<i class="ti ti-clipboard-list"></i>',  load: function() { loadUserLog();      }, feature: 'userlog'     },
  useroverview: { label: '用戶總覽', icon: '<i class="ti ti-users"></i>',           load: function() { loadUserOverview(); }, feature: 'useroverview'},
  reply:        { label: '自動回覆', icon: '<i class="ti ti-message-reply"></i>',   load: function() { loadReply();        }, feature: 'reply'       },
  tag:          { label: '標籤管理', icon: '<i class="ti ti-tag"></i>',             load: function() { loadTag();          }, feature: 'tag'         },
  audience:     { label: '受眾管理', icon: '<i class="ti ti-users-group"></i>',      load: function() { loadAudience();     }, feature: 'audience'    },
  broadcast:    { label: '推播管理', icon: '<i class="ti ti-speakerphone"></i>',    load: function() { loadBroadcast();    }, feature: 'broadcast'   },
  richmenu:     { label: '圖文選單', icon: '<i class="ti ti-layout-board"></i>',    load: function() { loadRichMenu();     }, feature: 'richmenu'    },
  lottery:      { label: '小遊戲',   icon: '<i class="ti ti-gift"></i>',            load: function() { loadLottery();      }, feature: 'lottery'     },
  referral:     { label: '推薦碼',   icon: '<i class="ti ti-ticket"></i>',          load: function() { loadReferral();     }, feature: 'referral'    },
  loyalty:      { label: '點數卡',   icon: '<i class="ti ti-star"></i>',            load: function() { loadLoyalty();      }, feature: 'loyalty'     },
  export:       { label: '資料匯出', icon: '<i class="ti ti-download"></i>',        load: function() { loadExport();       }, feature: 'export'      },
  blacklist:    { label: '黑名單',   icon: '<i class="ti ti-ban"></i>',             load: function() { loadBlacklist();    }, feature: 'blacklist'   },
  support:      { label: '聯絡我們', icon: '<i class="ti ti-mail"></i>',            load: function() { loadSupport();      }, feature: 'support', hideFromSidebar: true }
};
