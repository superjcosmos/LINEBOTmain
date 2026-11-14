// js/config.js

var CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzMfbfL8b3iabnywmXoncowavW3uK-wLZE53cZTB3C5yKuq4_4xC3VplOgaqSLOEIij9w/exec",
  VERSION: 'v0.9.0',
  // 新密碼最短長度（2026-11-14 第 4d 批 F04）。
  // ⚠️ 與後端 API Auth.gs 的 AUTH_MIN_PASSWORD_LEN 成對，改長度時兩處一起改
  MIN_PASSWORD_LEN: 8,
  // 系統固定關鍵字（只用於畫面顯示，2026-11-14 第 4e 批）。
  // ⚠️ 與以下成對，改保留字時一起改：Library CouponHandler.gs（COUPON_QUERY_KEYWORD／COUPON_USE_PREFIX）、
  //    ReferralHandler.gs（requestKeywords）；API CouponService.gs（COUPON_RESERVED_*）、KeywordService.gs（KW_REFERRAL_REQUEST_WORDS）
  SYSTEM_KEYWORDS: {
    couponQuery:     '我的優惠券',
    couponUsePrefix: '使用優惠券',
    referral:        ['推薦碼', '我的推薦碼', '取得推薦碼', '推薦連結', 'referral']
  }
};
