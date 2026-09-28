// js/utils/format.js
// 資料格式化相關

function formatDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  var y  = d.getFullYear();
  var mo = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  var h  = String(d.getHours()).padStart(2, '0');
  var mi = String(d.getMinutes()).padStart(2, '0');
  return y + '-' + mo + '-' + day + ' ' + h + ':' + mi;
}

function formatDateOnly(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  var y   = d.getFullYear();
  var mo  = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + mo + '-' + day;
}

function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString();
}

// 方案代碼 → 中英雙語顯示名稱，供各頁面共用（myaccount.js／planConfirm.js）
var PLAN_LABELS = {
  trial:      { en: 'Trial',      zh: '試用' },
  basic:      { en: 'Basic',      zh: '基礎方案' },
  advanced:   { en: 'Advanced',   zh: '進階方案' },
  enterprise: { en: 'Enterprise', zh: '企業方案' }
};

function planLabel(plan) {
  var key  = (plan || '').toString().trim().toLowerCase();
  var info = PLAN_LABELS[key];
  return info ? (info.en + '（' + info.zh + '）') : (plan || '-');
}
