// ============================================================
// 檔案：js/router/navigate.js
// 路徑：js/router/navigate.js
// 功能：頁面切換、權限判斷
// ⚠️ 2026-11-22 第 5g-1 批 FE-B：每次切換頁面後在背景重新取得方案權限（getClientFeatures，
//    不顯示遮罩、不擋頁面載入）。方案或功能有變 → 更新 authState／localStorage、
//    重畫側邊欄與方案標籤；目前頁已不在方案內 → 提示並帶回「我的帳號」。
//    後端已即時擋下無權限的動作（Main.gs FEATURE_ACTIONS），這裡只處理畫面不一致。
//    權限有變時不重新載入目前頁（避免中斷客戶正在填的表單，健檢決定 41）。
// ============================================================

var _currentPage = null;
var _featureRefreshSeq = 0;  // 背景權限更新的序號：連續切頁時只採用最後一次的結果

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
      mainContent.innerHTML = '<div class="empty">頁面載入失敗：' + escHtml(e.message) + '</div>';
    }
  }

  // FE-B：背景更新方案權限（不等結果）
  _refreshFeaturesInBackground();
}

// FE-B：背景重新取得方案權限，有變動才更新畫面
async function _refreshFeaturesInBackground() {
  if (authState.role === 'admin') return;   // admin 不受方案限制
  if (_authTabChanged) return;              // 其他分頁已換帳號，等待重新整理（auth.js）
  var seq = ++_featureRefreshSeq;
  var res = await apiCall({ action: 'getClientFeatures' }, { silent: true });
  if (seq !== _featureRefreshSeq) return;   // 等待期間又切了頁，以較新的那次為準
  if (authState.role === 'admin') return;   // 等待期間已返回管理後台
  if (!res.success || !res.data || !res.data.features) return;  // 取得失敗：維持現狀

  var newFeatures = res.data.features;
  var newPlan     = res.data.plan || '';
  var planChanged = newPlan.toLowerCase() !== (authState.plan || '').toLowerCase();
  if (!planChanged && _sameFeatures(newFeatures, authState.features || {})) return;

  authState.features = newFeatures;
  authState.plan     = newPlan;
  localStorage.setItem('features', JSON.stringify(newFeatures));
  localStorage.setItem('plan', newPlan);
  _renderSidebarPlan();
  buildSidebarMenu();

  var current = getCurrentPage();
  document.querySelectorAll('.menu-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.page === current);
  });

  if (current && !hasFeature(current)) {
    showToast('您的方案已變更，此功能已不在目前方案內', 'error');
    navigateTo('myaccount');
  }
}

// 比較兩份 features 是否相同（只看值為 true 的功能，順序不影響）
function _sameFeatures(a, b) {
  var key;
  for (key in a) { if ((a[key] === true) !== (b[key] === true)) return false; }
  for (key in b) { if ((a[key] === true) !== (b[key] === true)) return false; }
  return true;
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
// ⚠️ 2026-10-04 新增；2026-11-15 起後端也依方案檢查（Main.gs FEATURE_ACTIONS），前端判斷只負責顯示
function hasFeatureKey(featureKey) {
  if (authState.role === 'admin') return false;
  return authState.features[featureKey] === true;
}

function getCurrentPage() {
  return _currentPage;
}
