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

// ── 時間顯示（2026-11-22 第 5g-2 批，健檢決定 35）──
// 「發生時間」類（建立時間、紀錄時間等）用 formatDateTimeText → yyyy/MM/dd HH:mm:ss
// 「以天計算」類（有效期間、服務至、到期日）用 formatDateText → yyyy/MM/dd
// 後端已以台北時區格式化成文字，這裡只做文字整理，不經過 new Date()
// （避免時區換算，以及舊版 Safari 無法解析「yyyy-MM-dd HH:mm:ss」）。空值顯示「-」。
function formatDateTimeText(value) {
  var s = _normalizeDateText(value);
  return s || '-';
}

function formatDateText(value) {
  var s = _normalizeDateText(value);
  if (!s) return '-';
  return /^\d{4}\/\d{2}\/\d{2}/.test(s) ? s.substring(0, 10) : s;
}

function _normalizeDateText(value) {
  if (value === null || value === undefined) return '';
  var s = String(value).trim();
  if (!s) return '';
  var p2 = function(n) { return ('0' + n).slice(-2); };
  // 帶時區的 ISO 字串（Date 物件未經後端格式化就被序列化）：才需要用 Date 換回當地時間
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
    var d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.getFullYear() + '/' + p2(d.getMonth() + 1) + '/' + p2(d.getDate()) + ' ' +
        p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
    }
  }
  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return s;  // 無法辨識的格式原樣顯示
  var out = m[1] + '/' + p2(m[2]) + '/' + p2(m[3]);
  if (m[4] !== undefined) out += ' ' + p2(m[4]) + ':' + m[5] + ':' + (m[6] || '00');
  return out;
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
