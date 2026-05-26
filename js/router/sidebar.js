// js/router/sidebar.js
// 側邊欄選單建立

function buildSidebarMenu() {
  var menu = document.getElementById('sidebarMenu');
  if (!menu) return;

  menu.innerHTML = '';

  Object.keys(PAGES).forEach(function(key) {
    if (!hasFeature(key)) return;

    var page = PAGES[key];
    var item = document.createElement('div');
    item.className       = 'menu-item';
    item.dataset.page    = key;
    item.innerHTML       = '<span class="menu-icon">' + page.icon + '</span>' + page.label;
    item.onclick         = function() { navigateTo(key); };
    menu.appendChild(item);
  });
}
