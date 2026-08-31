// ============================================================
// js/pages/coupon.js
// ⚠️ 已套用 CODE_STYLE.md 規範：escHtml / confirmAndRun / openModal / closeModal / renderPager
// ⚠️ redemption_mode 這次固定送 'self_liff'（關鍵字核銷），表單不開放選擇，
//    因為 'code_verify'（序號核銷）尚未實作對應核銷邏輯，避免客戶建立出
//    看似可用、實際上不會被核銷的優惠券。待 Phase 3 實作後再開放此欄位。
// ⚠️ 已發放過的券（issued_count>0）隱藏刪除按鈕，比照 tag.js 的
//    使用人數>0隱藏刪除按鈕邏輯，後端仍保留同樣檢查作為最終防線
// ⚠️ 2026-08-27 修正（自動貼標問題排查清單第5項）：loadCoupon() 原本每次被
//   任何操作（啟用/停用/刪除/儲存）呼叫後都會無條件重置頁碼跟清空搜尋框，
//   跟useroverview.js修過的同一根因。改為 loadCoupon(preserveView) 只有
//   真正切換到本頁（非preserveView）才重置，操作後的刷新一律保留目前頁碼與搜尋字。
// ============================================================
var _couponAll           = [];
var _couponFiltered      = [];
var _couponPage          = 1;
var _couponPageSize      = 20;
var _couponSearchKeyword = '';
var couponEditId         = null;
var _couponTagList = []; // 新增：核銷自動貼標籤下拉選單資料
var _couponPoolAll            = [];
var _couponPoolFiltered       = [];
var _couponPoolPage           = 1;
var _couponPoolPageSize       = 20;
var _couponPoolSearch         = '';
var _audienceListForPool      = []; // 推播Modal的受眾下拉選單資料
var couponPoolEditId          = null;
var _couponPoolUploadTargetId = null;
var _couponPoolPushTargetId   = null;
var _couponInfoTipTimer       = null;

async function loadCoupon(preserveView) {
  if (!preserveView) setContent('<div class="loading">載入中...</div>');
  var result = await apiCall({ action: 'getCouponList' });
  if (!result.success) {
    setContent('<div class="empty">載入失敗：' + escHtml(result.message) + '</div>');
    return;
  }
  _couponAll = result.data || [];

  var poolResult = await apiCall({ action: 'getCouponPoolList' });
  _couponPoolAll = poolResult.success ? (poolResult.data || []) : [];

  if (!preserveView) {
    _couponSearchKeyword = '';
    _couponPage = 1;
    _couponPoolSearch = '';
    _couponPoolPage = 1;
    var tagRes = await apiCall({ action: 'getTagList' });
    _couponTagList = tagRes.success ? (tagRes.data || []).filter(function(t) { return t.status === 'active'; }) : [];
    var audRes = await apiCall({ action: 'getAudienceList' });
    var audRaw = audRes.success ? (Array.isArray(audRes.data) ? audRes.data : (audRes.data.list || [])) : [];
    _audienceListForPool = audRaw.filter(function(a) { return a.status !== 'disabled'; });
  }
  _applyCouponFilter();
  _applyCouponPoolFilter();
  setContent(_buildCouponShell());
  document.getElementById('couponSearch').value = _couponSearchKeyword;
  document.getElementById('couponPoolSearch').value = _couponPoolSearch;
  _clampCouponPage();
  _clampCouponPoolPage();
  _renderCouponTable();
  _renderCouponPager();
  _renderCouponPoolTable();
  _renderCouponPoolPager();
}
function _applyCouponFilter() {
  var keyword = _couponSearchKeyword.trim().toLowerCase();
  _couponFiltered = !keyword ? _couponAll.slice() : _couponAll.filter(function(row) {
    return (row.name || '').toLowerCase().includes(keyword);
  });
}
function _clampCouponPage() {
  var totalPages = Math.max(1, Math.ceil(_couponFiltered.length / _couponPageSize));
  if (_couponPage > totalPages) _couponPage = totalPages;
  if (_couponPage < 1) _couponPage = 1;
}
function _buildCouponShell() {
  var tagOptions = '<option value="">不自動貼標籤</option>' + _couponTagList.map(function(t) {
    return '<option value="' + escHtml(t.tag_id) + '">' + escHtml(t.tag_name) + '</option>';
  }).join('');
  var audienceOptions = '<option value="">請選擇受眾</option>' + _audienceListForPool.map(function(a) {
    return '<option value="' + escHtml(a.audience_id) + '">' + escHtml(a.name || a.keyword || a.audience_id) + '（' + (a.count || 0) + '人）</option>';
  }).join('');
  return '' +
    '<div style="display:flex;align-items:center;gap:8px;position:relative;">' +
      '<h2 class="page-title" style="margin:0;">優惠券管理</h2>' +
      '<button type="button" onclick="toggleCouponInfoTip(event)" title="功能說明" ' +
        'style="border:none;background:none;color:#06c755;font-size:16px;font-weight:bold;cursor:pointer;line-height:1;padding:0;">ⓘ</button>' + ⓘ</button>' +
      '<div id="couponInfoTip" style="display:none;position:absolute;top:32px;left:0;z-index:50;' +
        'background:#fff;border:1px solid #ddd;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.12);' +
        'padding:14px 16px;max-width:320px;font-size:13px;line-height:1.6;color:#444;">' +
        '一般折扣券適合單純的折扣活動；序號池適合客戶方已經有自己的序號/兌換碼（例如實體贈品兌換碼），' +
        '透過關鍵字或主動推播依序發放給用戶，不需要另外核銷。' +
      '</div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="toolbar" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">' +
        '<button class="btn btn-primary" onclick="openCreateCouponModal()">＋ 建立優惠券</button>' +
        '<input type="text" id="couponSearch"' +
          ' placeholder="搜尋優惠券名稱..."' +
          ' oninput="filterCoupon()"' +
          ' style="flex:1;min-width:180px;max-width:320px;' +
                  'padding:8px 12px;border:1.5px solid #e0e0e0;' +
                  'border-radius:8px;font-size:14px;outline:none;">' +
        '<span id="couponTotalHint" style="color:#888;font-size:13px;white-space:nowrap;"></span>' +
      '</div>' +
      '<div id="couponTableWrap"></div>' +
      '<div id="couponPager" style="display:flex;justify-content:center;' +
           'gap:6px;margin-top:16px;flex-wrap:wrap;"></div>' +
    '</div>' +
    '<div class="card" style="margin-top:20px;">' +
      '<div class="toolbar" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">' +
        '<h3 style="margin:0;">序號池活動</h3>' +
        '<input type="text" id="couponPoolSearch"' +
          ' placeholder="搜尋活動名稱..."' +
          ' oninput="filterCouponPool()"' +
          ' style="flex:1;min-width:180px;max-width:320px;' +
                  'padding:8px 12px;border:1.5px solid #e0e0e0;' +
                  'border-radius:8px;font-size:14px;outline:none;">' +
      '</div>' +
      '<div id="couponPoolTableWrap"></div>' +
      '<div id="couponPoolPager" style="display:flex;justify-content:center;' +
           'gap:6px;margin-top:16px;flex-wrap:wrap;"></div>' +
    '</div>' +

    '<div class="modal-overlay" id="couponModal">' +
      '<div class="modal" style="max-height:85vh;overflow-y:auto;">' +
        '<h3 id="couponModalTitle">建立優惠券</h3>' +
        '<div class="form-group">' +
          '<label>類別</label>' +
          '<select id="couponType" onchange="_toggleCouponTypeFields()">' +
            '<option value="discount">一般折扣券</option>' +
            '<option value="pool">序號池</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label id="couponNameLabel">優惠券名稱</label>' +
          '<input type="text" id="couponName" placeholder="例如：中秋限定9折券">' +
        '</div>' +

        '<div id="couponDiscountFields">' +
          '<div class="form-group">' +
            '<label>使用說明（選填）</label>' +
            '<textarea id="couponDescription" rows="2" placeholder="使用條件、備註等"></textarea>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>折扣類型</label>' +
            '<select id="couponDiscountType" onchange="_updateDiscountValueLabel()">' +
              '<option value="fixed_amount">固定金額折抵</option>' +
              '<option value="percentage">百分比折扣</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label id="couponDiscountValueLabel">折抵金額</label>' +
            '<input type="number" id="couponDiscountValue" min="1" placeholder="例如：100">' +
          '</div>' +
          '<div class="form-group" style="display:flex;gap:12px;">' +
            '<div style="flex:1;">' +
              '<label>生效日（選填）</label>' +
              '<input type="date" id="couponValidFrom" style="width:100%;box-sizing:border-box;">' +
            '</div>' +
            '<div style="flex:1;">' +
              '<label>結束日（選填）</label>' +
              '<input type="date" id="couponValidUntil" style="width:100%;box-sizing:border-box;">' +
            '</div>' +
          '</div>' +
          '<div class="form-group" style="display:flex;gap:12px;">' +
            '<div style="flex:1;">' +
              '<label>總發放上限（留空＝不限）</label>' +
              '<input type="number" id="couponTotalQuota" min="1" style="width:100%;box-sizing:border-box;">' +
            '</div>' +
            '<div style="flex:1;">' +
              '<label>每人可領張數</label>' +
              '<input type="number" id="couponPerUserLimit" min="1" value="1" style="width:100%;box-sizing:border-box;">' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>核銷成功自動貼標籤（選填）</label>' +
            '<select id="couponRedeemTag">' + tagOptions + '</select>' +
          '</div>' +
        '</div>' +

        '<div id="couponPoolFields" style="display:none;">' +
          '<div class="form-group">' +
            '<label>觸發關鍵字</label>' +
            '<input type="text" id="couponPoolKeyword" placeholder="例如：兌換好禮">' +
          '</div>' +
          '<div class="form-group" style="display:flex;gap:12px;">' +
            '<div style="flex:1;">' +
              '<label>活動生效日（選填）</label>' +
              '<input type="date" id="couponPoolValidFrom" style="width:100%;box-sizing:border-box;">' +
            '</div>' +
            '<div style="flex:1;">' +
              '<label>活動結束日（選填）</label>' +
              '<input type="date" id="couponPoolValidUntil" style="width:100%;box-sizing:border-box;">' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>發放上限（選填，留空＝依上傳的序號組數，不另設上限）</label>' +
            '<input type="number" id="couponPoolIssueLimit" min="1" placeholder="例如：50（可以比實際上傳序號組數少）">' +
          '</div>' +
          '<div class="form-group" id="couponPoolCodesGroup">' +
            '<label>序號清單（每行一組）</label>' +
            '<input type="file" id="couponPoolFileInput" accept=".csv,.txt" onchange="_handleCouponPoolFileUpload(event)" style="margin-bottom:8px;display:block;">' +
            '<textarea id="couponPoolCodes" rows="6" placeholder="一行一組序號，或上方選擇檔案自動帶入"></textarea>' +
            '<p style="font-size:12px;color:#888;margin:4px 0 0;">支援 .csv／.txt 檔案上傳，上傳後會自動帶入下方文字框，送出前可再自行編輯確認。若只有Excel檔，請先另存成CSV再上傳。</p>' +
          '</div>' +
        '</div>' +

        '<div class="form-group">' +
          '<label>狀態</label>' +
          '<select id="couponStatus">' +
            '<option value="active">啟用</option>' +
            '<option value="inactive">停用</option>' +
          '</select>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeCreateCouponModal()">取消</button>' +
          '<button class="btn btn-primary" id="couponSaveBtn" onclick="saveCouponItem()">建立</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="modal-overlay" id="couponPoolUploadModal">' +
      '<div class="modal">' +
        '<h3>上傳序號</h3>' +
        '<div class="form-group">' +
          '<label>序號清單（每行一組）</label>' +
          '<input type="file" id="couponPoolUploadFileInput" accept=".csv,.txt" onchange="_handleCouponPoolUploadFileChange(event)" style="margin-bottom:8px;display:block;">' +
          '<textarea id="couponPoolUploadCodes" rows="8" placeholder="一行一組序號，或上方選擇檔案自動帶入"></textarea>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeModal(\'couponPoolUploadModal\')">取消</button>' +
          '<button class="btn btn-primary" onclick="submitCouponPoolUpload()">上傳</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="modal-overlay" id="couponPoolPushModal">' +
      '<div class="modal">' +
        '<h3>推播發券</h3>' +
        '<div class="form-group">' +
          '<label>收件對象</label>' +
          '<select id="couponPoolPushMode" onchange="_toggleCouponPoolPushMode()">' +
            '<option value="audience">選擇受眾</option>' +
            '<option value="manual">手動貼上 UserID 清單</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group" id="couponPoolPushAudienceGroup">' +
          '<label>受眾</label>' +
          '<select id="couponPoolPushAudience">' + audienceOptions + '</select>' +
        '</div>' +
        '<div class="form-group" id="couponPoolPushManualGroup" style="display:none;">' +
          '<label>UserID 清單（每行一組）</label>' +
          '<textarea id="couponPoolPushManualUids" rows="6" placeholder="一行一組 UserID"></textarea>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>推播訊息範本</label>' +
          '<textarea id="couponPoolPushTemplate" rows="4" placeholder="例如：親愛的顧客您好，您的專屬序號是 {{序號}}，請至門市出示兌換。"></textarea>' +
          '<p style="font-size:12px;color:#888;margin:4px 0 0;">訊息裡必須包含 <code>{{序號}}</code>，系統會自動替換成每個人各自的序號</p>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeModal(\'couponPoolPushModal\')">取消</button>' +
          '<button class="btn btn-primary" onclick="submitCouponPoolPush()">確認推播</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}
function _updateDiscountValueLabel() {
  var type = document.getElementById('couponDiscountType').value;
  document.getElementById('couponDiscountValueLabel').textContent =
    type === 'percentage' ? '折扣百分比（例如：90 代表打9折的折抵10%）' : '折抵金額';
}
function filterCoupon() {
  _couponSearchKeyword = document.getElementById('couponSearch').value || '';
  _applyCouponFilter();
  _couponPage = 1;
  _renderCouponTable();
  _renderCouponPager();
}
function _renderCouponTable() {
  var wrap = document.getElementById('couponTableWrap');
  var hint = document.getElementById('couponTotalHint');
  if (!wrap) return;
  var total = _couponFiltered.length;
  if (hint) hint.textContent = '共 ' + total + ' 筆';
  if (total === 0) {
    wrap.innerHTML = '<p class="empty">沒有符合的優惠券</p>';
    return;
  }
  var start = (_couponPage - 1) * _couponPageSize;
  var end   = Math.min(start + _couponPageSize, total);
  var page  = _couponFiltered.slice(start, end);
  var rows = page.map(function(row) {
    var rowJson = encodeURIComponent(JSON.stringify(row));
    var issuedCount = row.issued_count || 0;
    var usedCount   = row.used_count   || 0;
    var isActive    = row.status === 'active';
    var discountText = row.discount_type === 'percentage'
      ? (row.discount_value + '%')
      : ('$' + row.discount_value);
    var periodText = (row.valid_from || row.valid_until)
      ? (escHtml(row.valid_from || '不限') + ' ~ ' + escHtml(row.valid_until || '不限'))
      : '不限期間';
    // ⚠️ 已發放過的券不可刪除，隱藏按鈕，比照 tag.js 使用人數>0隱藏刪除按鈕的做法
    var deleteBtn = issuedCount === 0
      ? '<button class="btn btn-danger" onclick="doDeleteCoupon(\'' + escHtml(row.coupon_id) + '\')">刪除</button>'
      : '<button class="btn btn-danger" disabled title="此優惠券已發放 ' + issuedCount + ' 張，無法刪除">刪除</button>';
    var toggleBtn = isActive
      ? '<button class="btn btn-disable" onclick="doToggleCouponStatus(\'' + escHtml(row.coupon_id) + '\')">停用</button>'
      : '<button class="btn btn-enable" onclick="doToggleCouponStatus(\'' + escHtml(row.coupon_id) + '\')">啟用</button>';
    var editBtn = '<button class="btn btn-edit" ' +
      'onclick="editCoupon(\'' + escHtml(row.coupon_id) + '\',\'' + rowJson + '\')">編輯</button>';
    return '<tr>' +
      '<td>' + escHtml(row.name) + '</td>' +
      '<td>' + discountText + '</td>' +
      '<td>' + periodText + '</td>' +
      '<td>' + (isActive ? '啟用' : '停用') + '</td>' +
      '<td>' + issuedCount + ' 發放 / ' + usedCount + ' 已用</td>' +
      '<td style="white-space:nowrap;">' +
        '<span style="display:inline-flex;gap:8px;align-items:center;">' +
          editBtn + toggleBtn + deleteBtn +
        '</span>' +
      '</td>' +
    '</tr>';
  }).join('');
  wrap.innerHTML =
    '<table>' +
      '<thead><tr>' +
        '<th>優惠券名稱</th>' +
        '<th>折扣</th>' +
        '<th>有效期間</th>' +
        '<th>狀態</th>' +
        '<th>發放／核銷</th>' +
        '<th>操作</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';
}
async function doToggleCouponStatus(couponId) {
  var result = await apiCall({ action: 'toggleCouponStatus', coupon_id: couponId });
  if (result.success) {
    showToast(result.data.message, 'success');
    loadCoupon(true);
  } else {
    showToast(result.message, 'error');
  }
}
function _renderCouponPager() {
  renderPager('couponPager', _couponFiltered.length, _couponPage, _couponPageSize, gotoCouponPage);
}
function gotoCouponPage(page) {
  var totalPages = Math.ceil(_couponFiltered.length / _couponPageSize);
  if (page < 1 || page > totalPages) return;
  _couponPage = page;
  _renderCouponTable();
  _renderCouponPager();
}
function openCreateCouponModal() {
  couponEditId = null;
  couponPoolEditId = null;
  document.getElementById('couponModalTitle').textContent = '建立優惠券';
  document.getElementById('couponSaveBtn').textContent     = '建立';
  document.getElementById('couponType').value              = 'discount';
  document.getElementById('couponType').disabled            = false;
  document.getElementById('couponName').value            = '';
  document.getElementById('couponDescription').value     = '';
  document.getElementById('couponDiscountType').value    = 'fixed_amount';
  document.getElementById('couponDiscountValue').value   = '';
  document.getElementById('couponValidFrom').value       = '';
  document.getElementById('couponValidUntil').value      = '';
  document.getElementById('couponTotalQuota').value      = '';
  document.getElementById('couponPerUserLimit').value    = '1';
  document.getElementById('couponRedeemTag').value       = '';
  document.getElementById('couponPoolKeyword').value     = '';
  document.getElementById('couponPoolValidFrom').value   = '';
  document.getElementById('couponPoolValidUntil').value  = '';
  document.getElementById('couponPoolIssueLimit').value  = '';
  document.getElementById('couponPoolCodes').value       = '';
  document.getElementById('couponPoolCodesGroup').style.display = '';
  document.getElementById('couponStatus').value           = 'active';
  _updateDiscountValueLabel();
  _toggleCouponTypeFields();
  openModal('couponModal');
}
function closeCreateCouponModal() {
  closeModal('couponModal');
  couponEditId = null;
  couponPoolEditId = null;
  document.getElementById('couponType').disabled = false;
  document.getElementById('couponPoolCodesGroup').style.display = '';
}
function editCoupon(couponId, rowJson) {
  var row = JSON.parse(decodeURIComponent(rowJson));
  couponEditId = couponId;
  couponPoolEditId = null;
  document.getElementById('couponModalTitle').textContent = '編輯優惠券';
  document.getElementById('couponSaveBtn').textContent     = '儲存';
  document.getElementById('couponType').value              = 'discount';
  document.getElementById('couponType').disabled            = true;
  document.getElementById('couponName').value            = row.name            || '';
  document.getElementById('couponDescription').value     = row.description     || '';
  document.getElementById('couponDiscountType').value    = row.discount_type   || 'fixed_amount';
  document.getElementById('couponDiscountValue').value   = row.discount_value  || '';
  document.getElementById('couponValidFrom').value       = row.valid_from      || '';
  document.getElementById('couponValidUntil').value      = row.valid_until     || '';
  document.getElementById('couponTotalQuota').value      = row.total_quota == null ? '' : row.total_quota;
  document.getElementById('couponPerUserLimit').value    = row.per_user_limit  || 1;
  document.getElementById('couponRedeemTag').value       = row.redeem_tag_id   || '';
  document.getElementById('couponStatus').value           = row.status         || 'active';
  _updateDiscountValueLabel();
  _toggleCouponTypeFields();
  openModal('couponModal');
}
async function saveCouponItem() {
  var type = document.getElementById('couponType').value;
  if (type === 'pool') {
    await _saveCouponPoolItem();
  } else {
    await _saveDiscountCouponItem();
  }
}

async function _saveDiscountCouponItem() {
  var name           = document.getElementById('couponName').value.trim();
  var description    = document.getElementById('couponDescription').value.trim();
  var discountType   = document.getElementById('couponDiscountType').value;
  var discountValue  = document.getElementById('couponDiscountValue').value;
  var validFrom      = document.getElementById('couponValidFrom').value;
  var validUntil     = document.getElementById('couponValidUntil').value;
  var totalQuota     = document.getElementById('couponTotalQuota').value;
  var perUserLimit   = document.getElementById('couponPerUserLimit').value;
  var redeemTagId    = document.getElementById('couponRedeemTag').value;
  var status         = document.getElementById('couponStatus').value;
  if (!name)           { showToast('請填入優惠券名稱', 'error'); return; }
  if (!discountValue || Number(discountValue) <= 0) { showToast('請填入正確的折抵數值', 'error'); return; }
  var result = await apiCall({
    action:          'saveCoupon',
    coupon_id:       couponEditId || '',
    name:            name,
    description:     description,
    discount_type:   discountType,
    discount_value:  discountValue,
    valid_from:      validFrom,
    valid_until:     validUntil,
    total_quota:     totalQuota,
    per_user_limit:  perUserLimit,
    redemption_mode: 'self_liff',
    redeem_tag_id:   redeemTagId,
    status:          status
  });
  if (result.success) {
    closeCreateCouponModal();
    showToast((result.data && result.data.message) || '儲存成功', 'success');
    loadCoupon(true);
  } else {
    showToast(result.message, 'error');
  }
}

async function _saveCouponPoolItem() {
  var name       = document.getElementById('couponName').value.trim();
  var keyword    = document.getElementById('couponPoolKeyword').value.trim();
  var validFrom  = document.getElementById('couponPoolValidFrom').value;
  var validUntil = document.getElementById('couponPoolValidUntil').value;
  var issueLimit = document.getElementById('couponPoolIssueLimit').value;
  var codes      = document.getElementById('couponPoolCodes').value;
  var status     = document.getElementById('couponStatus').value;
  if (!name)    { showToast('請填入活動名稱', 'error'); return; }
  if (!keyword) { showToast('請填入觸發關鍵字', 'error'); return; }
  var result = await apiCall({
    action:           'saveCouponPoolActivity',
    pool_id:          couponPoolEditId || '',
    name:             name,
    trigger_keyword:  keyword,
    valid_from:       validFrom,
    valid_until:      validUntil,
    issue_limit:      issueLimit,
    codes:            codes,
    status:           status
  });
  if (result.success) {
    closeCreateCouponModal();
    showToast((result.data && result.data.message) || '儲存成功', 'success');
    loadCoupon(true);
  } else {
    showToast(result.message, 'error');
  }
}
async function doDeleteCoupon(couponId) {
  await confirmAndRun('確定要刪除這張優惠券嗎？此操作無法復原。', async function() {
    var result = await apiCall({ action: 'deleteCoupon', coupon_id: couponId });
    if (result.success) {
      showToast('優惠券已刪除', 'success');
      loadCoupon(true);
    } else {
      showToast(result.message, 'error');
    }
  });
}
function _toggleCouponTypeFields() {
  var type = document.getElementById('couponType').value;
  var isPool = type === 'pool';
  document.getElementById('couponDiscountFields').style.display = isPool ? 'none' : 'block';
  document.getElementById('couponPoolFields').style.display     = isPool ? 'block' : 'none';
  document.getElementById('couponNameLabel').textContent = isPool ? '序號池活動名稱' : '優惠券名稱';
}

function toggleCouponInfoTip(evt) {
  if (evt) evt.stopPropagation();
  var tip = document.getElementById('couponInfoTip');
  if (!tip) return;
  var isShown = tip.style.display === 'block';
  if (isShown) {
    tip.style.display = 'none';
    if (_couponInfoTipTimer) { clearTimeout(_couponInfoTipTimer); _couponInfoTipTimer = null; }
    return;
  }
  tip.style.display = 'block';
  document.addEventListener('click', _closeCouponInfoTipOnOutsideClick);
  if (_couponInfoTipTimer) clearTimeout(_couponInfoTipTimer);
  _couponInfoTipTimer = setTimeout(function() {
    tip.style.display = 'none';
    document.removeEventListener('click', _closeCouponInfoTipOnOutsideClick);
  }, 10000);
}
function _closeCouponInfoTipOnOutsideClick() {
  var tip = document.getElementById('couponInfoTip');
  if (tip) tip.style.display = 'none';
  document.removeEventListener('click', _closeCouponInfoTipOnOutsideClick);
}

function _applyCouponPoolFilter() {
  var keyword = _couponPoolSearch.trim().toLowerCase();
  _couponPoolFiltered = !keyword ? _couponPoolAll.slice() : _couponPoolAll.filter(function(row) {
    return (row.name || '').toLowerCase().includes(keyword);
  });
}
function _clampCouponPoolPage() {
  var totalPages = Math.max(1, Math.ceil(_couponPoolFiltered.length / _couponPoolPageSize));
  if (_couponPoolPage > totalPages) _couponPoolPage = totalPages;
  if (_couponPoolPage < 1) _couponPoolPage = 1;
}
function filterCouponPool() {
  _couponPoolSearch = document.getElementById('couponPoolSearch').value || '';
  _applyCouponPoolFilter();
  _couponPoolPage = 1;
  _renderCouponPoolTable();
  _renderCouponPoolPager();
}

function _renderCouponPoolTable() {
  var wrap = document.getElementById('couponPoolTableWrap');
  if (!wrap) return;
  var total = _couponPoolFiltered.length;
  if (total === 0) {
    wrap.innerHTML = '<p class="empty">沒有序號池活動</p>';
    return;
  }
  var start = (_couponPoolPage - 1) * _couponPoolPageSize;
  var end   = Math.min(start + _couponPoolPageSize, total);
  var page  = _couponPoolFiltered.slice(start, end);
  var rows = page.map(function(row) {
    var rowJson = encodeURIComponent(JSON.stringify(row));
    var isActive = row.status === 'active';
    var periodText = (row.valid_from || row.valid_until)
      ? (escHtml(row.valid_from || '不限') + ' ~ ' + escHtml(row.valid_until || '不限'))
      : '不限期間';
    var limitText = row.issue_limit == null ? '不限' : row.issue_limit;
    var deleteBtn = row.issued_count === 0
      ? '<button class="btn btn-danger" onclick="doDeleteCouponPool(\'' + escHtml(row.pool_id) + '\')">刪除</button>'
      : '<button class="btn btn-danger" disabled title="此活動已發放 ' + row.issued_count + ' 組序號，無法刪除">刪除</button>';
    var toggleBtn = isActive
      ? '<button class="btn btn-disable" onclick="doToggleCouponPoolStatus(\'' + escHtml(row.pool_id) + '\')">停用</button>'
      : '<button class="btn btn-enable" onclick="doToggleCouponPoolStatus(\'' + escHtml(row.pool_id) + '\')">啟用</button>';
    var editBtn = '<button class="btn btn-edit" ' +
      'onclick="editCouponPoolActivity(\'' + escHtml(row.pool_id) + '\',\'' + rowJson + '\')">編輯</button>';
    var uploadBtn = '<button class="btn btn-sync" onclick="openCouponPoolUploadModal(\'' + escHtml(row.pool_id) + '\')">上傳序號</button>';
    var pushBtn = '<button class="btn btn-sync" onclick="openCouponPoolPushModal(\'' + escHtml(row.pool_id) + '\')">推播發券</button>';
    return '<tr>' +
      '<td>' + escHtml(row.name) + '</td>' +
      '<td>' + escHtml(row.trigger_keyword) + '</td>' +
      '<td>' + periodText + '</td>' +
      '<td>' + limitText + '</td>' +
      '<td>' + (isActive ? '啟用' : '停用') + '</td>' +
      '<td>' + row.total_count + ' 組 / 已發 ' + row.issued_count + ' / 剩 ' + row.remaining_count + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<span style="display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
          editBtn + uploadBtn + pushBtn + toggleBtn + deleteBtn +
        '</span>' +
      '</td>' +
    '</tr>';
  }).join('');
  wrap.innerHTML =
    '<table>' +
      '<thead><tr>' +
        '<th>活動名稱</th><th>觸發關鍵字</th><th>有效期間</th><th>發放上限</th>' +
        '<th>狀態</th><th>序號數量</th><th>操作</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';
}
function _renderCouponPoolPager() {
  renderPager('couponPoolPager', _couponPoolFiltered.length, _couponPoolPage, _couponPoolPageSize, gotoCouponPoolPage);
}
function gotoCouponPoolPage(page) {
  var totalPages = Math.ceil(_couponPoolFiltered.length / _couponPoolPageSize);
  if (page < 1 || page > totalPages) return;
  _couponPoolPage = page;
  _renderCouponPoolTable();
  _renderCouponPoolPager();
}
async function doToggleCouponPoolStatus(poolId) {
  var result = await apiCall({ action: 'toggleCouponPoolStatus', pool_id: poolId });
  if (result.success) {
    showToast(result.data.message, 'success');
    loadCoupon(true);
  } else {
    showToast(result.message, 'error');
  }
}
async function doDeleteCouponPool(poolId) {
  await confirmAndRun('確定要刪除這個序號池活動嗎？此操作無法復原。', async function() {
    var result = await apiCall({ action: 'deleteCouponPoolActivity', pool_id: poolId });
    if (result.success) {
      showToast('序號池活動已刪除', 'success');
      loadCoupon(true);
    } else {
      showToast(result.message, 'error');
    }
  });
}

function editCouponPoolActivity(poolId, rowJson) {
  var row = JSON.parse(decodeURIComponent(rowJson));
  couponEditId = null;
  couponPoolEditId = poolId;
  document.getElementById('couponModalTitle').textContent = '編輯序號池活動';
  document.getElementById('couponSaveBtn').textContent     = '儲存';
  document.getElementById('couponType').value              = 'pool';
  document.getElementById('couponType').disabled            = true;
  document.getElementById('couponName').value             = row.name             || '';
  document.getElementById('couponPoolKeyword').value      = row.trigger_keyword  || '';
  document.getElementById('couponPoolValidFrom').value    = row.valid_from       || '';
  document.getElementById('couponPoolValidUntil').value   = row.valid_until      || '';
  document.getElementById('couponPoolIssueLimit').value   = row.issue_limit == null ? '' : row.issue_limit;
  document.getElementById('couponPoolCodes').value        = ''; // 編輯不重貼序號，序號另外走「上傳序號」
  document.getElementById('couponStatus').value            = row.status          || 'active';
  document.getElementById('couponPoolCodesGroup').style.display = 'none'; // 編輯時不重複顯示上傳欄位
  _toggleCouponTypeFields();
  openModal('couponModal');
}

// ── 檔案上傳（純前端解析：每行視為一組序號，若有逗號取第一欄） ──
function _parseCouponPoolFile(text) {
  var lines = text.split(/\r\n|\n|\r/);
  var codes = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var firstField = line.split(',')[0].trim().replace(/^"|"$/g, '');
    if (firstField) codes.push(firstField);
  }
  return codes;
}
function _handleCouponPoolFileUpload(evt) {
  var file = evt.target.files && evt.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var codes = _parseCouponPoolFile(e.target.result || '');
    var textarea = document.getElementById('couponPoolCodes');
    var existing = textarea.value.trim();
    textarea.value = existing ? (existing + '\n' + codes.join('\n')) : codes.join('\n');
    showToast('已從檔案帶入 ' + codes.length + ' 組序號，請確認內容後再送出', 'success');
  };
  reader.readAsText(file);
}
function _handleCouponPoolUploadFileChange(evt) {
  var file = evt.target.files && evt.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var codes = _parseCouponPoolFile(e.target.result || '');
    var textarea = document.getElementById('couponPoolUploadCodes');
    var existing = textarea.value.trim();
    textarea.value = existing ? (existing + '\n' + codes.join('\n')) : codes.join('\n');
    showToast('已從檔案帶入 ' + codes.length + ' 組序號，請確認內容後再送出', 'success');
  };
  reader.readAsText(file);
}

// ── 上傳序號 Modal ──
function openCouponPoolUploadModal(poolId) {
  _couponPoolUploadTargetId = poolId;
  document.getElementById('couponPoolUploadCodes').value = '';
  document.getElementById('couponPoolUploadFileInput').value = '';
  openModal('couponPoolUploadModal');
}
async function submitCouponPoolUpload() {
  var codes = document.getElementById('couponPoolUploadCodes').value;
  if (!codes.trim()) { showToast('請貼上或上傳序號清單', 'error'); return; }
  var result = await apiCall({
    action:  'uploadCouponPoolCodes',
    pool_id: _couponPoolUploadTargetId,
    codes:   codes
  });
  if (result.success) {
    closeModal('couponPoolUploadModal');
    showToast((result.data && result.data.message) || '上傳成功', 'success');
    loadCoupon(true);
  } else {
    showToast(result.message, 'error');
  }
}

// ── 推播發券 Modal ──
function openCouponPoolPushModal(poolId) {
  _couponPoolPushTargetId = poolId;
  document.getElementById('couponPoolPushMode').value = 'audience';
  document.getElementById('couponPoolPushAudience').value = '';
  document.getElementById('couponPoolPushManualUids').value = '';
  document.getElementById('couponPoolPushTemplate').value = '';
  _toggleCouponPoolPushMode();
  openModal('couponPoolPushModal');
}
function _toggleCouponPoolPushMode() {
  var mode = document.getElementById('couponPoolPushMode').value;
  var isManual = mode === 'manual';
  document.getElementById('couponPoolPushAudienceGroup').style.display = isManual ? 'none' : 'block';
  document.getElementById('couponPoolPushManualGroup').style.display   = isManual ? 'block' : 'none';
}
async function submitCouponPoolPush() {
  var mode     = document.getElementById('couponPoolPushMode').value;
  var template = document.getElementById('couponPoolPushTemplate').value.trim();
  if (!template) { showToast('請填入推播訊息範本', 'error'); return; }
  if (template.indexOf('{{序號}}') === -1) { showToast('訊息範本必須包含 {{序號}}', 'error'); return; }

  var params = {
    action:           'pushCouponPoolCodes',
    pool_id:          _couponPoolPushTargetId,
    message_template: template
  };
  if (mode === 'manual') {
    var manualUids = document.getElementById('couponPoolPushManualUids').value.trim();
    if (!manualUids) { showToast('請貼上 UserID 清單', 'error'); return; }
    params.manual_uids = manualUids;
  } else {
    var audienceId = document.getElementById('couponPoolPushAudience').value;
    if (!audienceId) { showToast('請選擇受眾', 'error'); return; }
    params.audience_id = audienceId;
  }

  await confirmAndRun('確定要發送這批推播嗎？已經領過序號的人不會重複發送。', async function() {
    var result = await apiCall(params);
    if (result.success) {
      closeModal('couponPoolPushModal');
      showToast((result.data && result.data.message) || '推播完成', 'success');
      loadCoupon(true);
    } else {
      showToast(result.message, 'error');
    }
  });
}
