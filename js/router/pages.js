// js/router/pages.js
// PAGES 物件：所有頁面定義集中在這裡
// 新增頁面只需在這裡加一筆，其他不用動

var PAGES = {
  dashboard: {
    label:   '儀表板',
    icon:    '📊',
    load:    function() { loadDashboard(); },
    feature: 'dashboard'
  },
  userlog: {
    label:   '用戶記錄',
    icon:    '📋',
    load:    function() { loadUserLog(); },
    feature: 'userlog'
  },
  reply: {
    label:   '自動回覆',
    icon:    '💬',
    load:    function() { loadReply(); },
    feature: 'reply'
  },
  audience: {
    label:   '受眾管理',
    icon:    '👥',
    load:    function() { loadAudience(); },
    feature: 'audience'
  },
  richmenu: {
    label:   '圖文選單',
    icon:    '🖼️',
    load:    function() { loadRichMenu(); },
    feature: 'richmenu'
  },
  lottery: {
    label:   '小遊戲',
    icon:    '🎮',
    load:    function() { loadLottery(); },
    feature: 'lottery'
  },
  broadcast: {
    label:   '推播管理',
    icon:    '📢',
    load:    function() { loadBroadcast(); },
    feature: 'broadcast'
  },

  referral:  { 
    label: '推薦碼',   
    icon: '🎫', 
    load: function() { loadReferral();  }, 
    feature: 'referral'
  },

  
  export: {
    label:   '資料匯出',
    icon:    '📥',
    load:    function() { loadExport(); },
    feature: 'export'
  },
  blacklist: {
    label:   '黑名單',
    icon:    '🚫',
    load:    function() { loadBlacklist(); },
    feature: 'blacklist'
  }
};
