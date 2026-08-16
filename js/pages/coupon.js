// ============================================================
// js/pages/coupon.js
// ⚠️ 已套用 CODE_STYLE.md 規範：escHtml / confirmAndRun / openModal / closeModal / renderPager
// ⚠️ redemption_mode 這次固定送 'self_liff'（關鍵字核銷），表單不開放選擇，
//    因為 'code_verify'（序號核銷）尚未實作對應核銷邏輯，避免客戶建立出
//    看似可用、實際上不會被核銷的優惠券。待 Phase 3 實作後再開放此欄位。
// ⚠️ 已發放過的券（issued_count>0）隱藏刪除按鈕，比照 tag.js 的
//    使用人數>0隱藏刪除按鈕邏輯，後端仍保留同樣檢查作為最終防線
// ============================================================

var _couponAll      = [];
var _couponFiltered = [];
var _couponPage     = 1;
var _couponPageSize = 20;
var couponEditId    = null;

async function loadCoupon() {
  setContent('<div class="loading">載入中...</div>');

  var result = await apiCall({ action: 'getCouponList' });

  if (!result.success) {
    setContent('<div class="empty">載入失敗：' + escHtml(result.message) + '</div>');
    return;
  }

  _couponAll      = result.data || [];
  _couponFiltered = _couponAll.slice();
  _couponPage     = 1;

  setContent(_buildCouponShell());

  _renderCouponTable();
  _renderCouponPager();
}

function _buildCouponShell() {
  return '' +
    '<h2 class="page-title">優惠券管理</h2>' +
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

    '<div class="modal-overlay" id="couponModal">' +
      '<div class="modal" style="max-height:85vh;overflow-y:auto;">' +
        '<h3 id="couponModalTitle">建立優惠券</h3>' +

        '<div class="form-group">' +
          '<label>優惠券名稱</label>' +
          '<input type="text" id="couponName" placeholder="例如：中秋限定9折券">' +
        '</div>' +

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
    '</div>';
}

function _updateDiscountValueLabel() {
  var type = document.getElementById('couponDiscountType').value;
  document.getElementById('couponDiscountValueLabel').textContent =
    type === 'percentage' ? '折扣百分比（例如：90 代表打9折的折抵10%）' : '折抵金額';
}

function filterCoupon() {
  var keyword = (document.getElementById('couponSearch').value || '').trim().toLowerCase();

  if (!keyword) {
    _couponFiltered = _couponAll.slice();
  } else {
    _couponFiltered = _couponAll.filter(function(row) {
      return (row.name || '').toLowerCase().includes(keyword);
    });
  }

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
    loadCoupon();
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
  document.getElementById('couponModalTitle').textContent = '建立優惠券';
  document.getElementById('couponSaveBtn').textContent     = '建立';
  document.getElementById('couponName').value            = '';
  document.getElementById('couponDescription').value     = '';
  document.getElementById('couponDiscountType').value    = 'fixed_amount';
  document.getElementById('couponDiscountValue').value   = '';
  document.getElementById('couponValidFrom').value       = '';
  document.getElementById('couponValidUntil').value      = '';
  document.getElementById('couponTotalQuota').value      = '';
  document.getElementById('couponPerUserLimit').value    = '1';
  document.getElementById('couponStatus').value           = 'active';
  _updateDiscountValueLabel();

  openModal('couponModal');
}

function closeCreateCouponModal() {
  closeModal('couponModal');
  couponEditId = null;
}

function editCoupon(couponId, rowJson) {
  var row = JSON.parse(decodeURIComponent(rowJson));
  couponEditId = couponId;
  document.getElementById('couponModalTitle').textContent = '編輯優惠券';
  document.getElementById('couponSaveBtn').textContent     = '儲存';
  document.getElementById('couponName').value            = row.name            || '';
  document.getElementById('couponDescription').value     = row.description     || '';
  document.getElementById('couponDiscountType').value    = row.discount_type   || 'fixed_amount';
  document.getElementById('couponDiscountValue').value   = row.discount_value  || '';
  document.getElementById('couponValidFrom').value       = row.valid_from      || '';
  document.getElementById('couponValidUntil').value      = row.valid_until     || '';
  document.getElementById('couponTotalQuota').value      = row.total_quota == null ? '' : row.total_quota;
  document.getElementById('couponPerUserLimit').value    = row.per_user_limit  || 1;
  document.getElementById('couponStatus').value           = row.status         || 'active';
  _updateDiscountValueLabel();

  openModal('couponModal');
}

async function saveCouponItem() {
  var name           = document.getElementById('couponName').value.trim();
  var description    = document.getElementById('couponDescription').value.trim();
  var discountType   = document.getElementById('couponDiscountType').value;
  var discountValue  = document.getElementById('couponDiscountValue').value;
  var validFrom      = document.getElementById('couponValidFrom').value;
  var validUntil     = document.getElementById('couponValidUntil').value;
  var totalQuota     = document.getElementById('couponTotalQuota').value;
  var perUserLimit   = document.getElementById('couponPerUserLimit').value;
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
    redemption_mode: 'self_liff', // ⚠️ 固定值，見檔案開頭說明
    status:          status
  });

  if (result.success) {
    closeCreateCouponModal();
    showToast((result.data && result.data.message) || '儲存成功', 'success');
    loadCoupon();
  } else {
    showToast(result.message, 'error');
  }
}

async function doDeleteCoupon(couponId) {
  await confirmAndRun('確定要刪除這張優惠券嗎？此操作無法復原。', async function() {
    var result = await apiCall({ action: 'deleteCoupon', coupon_id: couponId });

    if (result.success) {
      showToast('優惠券已刪除', 'success');
      loadCoupon();
    } else {
      showToast(result.message, 'error');
    }
  });
}
