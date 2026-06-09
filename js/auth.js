// ============================================================
// 檔案：js/auth.js
// 路徑：js/auth.js
// 功能：登入/登出/Session、忘記密碼三步驟、role 分流
// ⚠️ 更新：authState 加入 role / company_name，enterMainPage 依 role 分流
// ============================================================

var authState = {
  sessionToken: localStorage.getItem("sessionToken") || null,
  clientId:     localStorage.getItem("clientId")     || null,
  plan:         localStorage.getItem("plan")          || null,
  email:        localStorage.getItem("email")         || null,
  role:         localStorage.getItem("role")          || "client",         // ← 新增
  company_name: localStorage.getItem("company_name")  || "",               // ← 新增
  features:     JSON.parse(localStorage.getItem("features") || "{}")
};

// ────────────────────────────────────────────────────────────
// 頁面載入時自動驗證
// ────────────────────────────────────────────────────────────
window.onload = function () {
  if (authState.sessionToken) {
    verifyAndEnter();
  }
};

// ────────────────────────────────────────────────────────────
// 登入
// ────────────────────────────────────────────────────────────
async function login() {
  var email    = document.getElementById("inputEmail").value.trim();
  var password = document.getElementById("inputPassword").value;
  var btn      = document.getElementById("btnLogin");
  var errMsg   = document.getElementById("errorMsg");

  if (!email || !password) { showLoginError("請填入帳號和密碼"); return; }

  btn.disabled    = true;
  btn.textContent = "登入中...";
  errMsg.style.display = "none";

  try {
    var result = await apiCall({ action: "login", email: email, password: password });

    if (result.success) {
      // ── ⚠️ 你的 API 回傳在 result.data 裡 ──
      var d = result.data || result; // 相容舊版（直接在 result 上）和新版（在 result.data 上）

      localStorage.setItem("sessionToken", d.sessionToken  || "");
      localStorage.setItem("clientId",     d.clientId      || "");
      localStorage.setItem("plan",         d.plan          || "");
      localStorage.setItem("email",        email);
      localStorage.setItem("role",         d.role          || "client"); // ← 新增
      localStorage.setItem("company_name", d.company_name  || "");       // ← 新增
      localStorage.setItem("features",     JSON.stringify(d.features || {}));

      authState.sessionToken = d.sessionToken  || "";
      authState.clientId     = d.clientId      || "";
      authState.plan         = d.plan          || "";
      authState.email        = email;
      authState.role         = d.role          || "client"; // ← 新增
      authState.company_name = d.company_name  || "";       // ← 新增
      authState.features     = d.features      || {};

      enterMainPage();
    } else {
      showLoginError(result.message);
    }
  } catch (err) {
    showLoginError("連線失敗，請稍後再試");
  }

  btn.disabled    = false;
  btn.textContent = "登入";
}

// ────────────────────────────────────────────────────────────
// 驗證 Session 並進入主頁
// ────────────────────────────────────────────────────────────
async function verifyAndEnter() {
  try {
    var result = await apiCall({ action: "verify" });
    if (result.success) {
      enterMainPage();
    } else {
      clearSession();
    }
  } catch (err) {
    clearSession();
  }
}

// ────────────────────────────────────────────────────────────
// 登出
// ────────────────────────────────────────────────────────────
async function logout() {
  await apiCall({ action: "logout" });
  clearSession();
  showLoginPage();
}

// ────────────────────────────────────────────────────────────
// 清除 Session
// ────────────────────────────────────────────────────────────
function clearSession() {
  localStorage.clear();
  authState.sessionToken = null;
  authState.clientId     = null;
  authState.plan         = null;
  authState.email        = null;
  authState.role         = "client"; // ← 新增
  authState.company_name = "";       // ← 新增
  authState.features     = {};
}

// ────────────────────────────────────────────────────────────
// 顯示登入錯誤訊息
// ────────────────────────────────────────────────────────────
function showLoginError(msg) {
  var el = document.getElementById("errorMsg");
  el.textContent   = msg;
  el.style.display = "block";
}

// ────────────────────────────────────────────────────────────
// 切換到登入頁
// ────────────────────────────────────────────────────────────
function showLoginPage() {
  document.getElementById("loginPage").style.display          = "flex";
  document.getElementById("mainPage").style.display           = "none";
  document.getElementById("forgotPasswordPage").style.display = "none";
  _resetForgotFlow();
}

// ────────────────────────────────────────────────────────────
// 進入主畫面（依 role 分流）
// ────────────────────────────────────────────────────────────
function enterMainPage() {
  document.getElementById("loginPage").style.display          = "none";
  document.getElementById("forgotPasswordPage").style.display = "none";
  document.getElementById("mainPage").style.display           = "block";  // 你原本是 "block"，保留

  // 側邊欄顯示名稱：admin 顯示公司名稱或 email，client 顯示 email
  var sidebarEmailEl = document.getElementById("sidebarEmail");
  if (sidebarEmailEl) {
    sidebarEmailEl.textContent = authState.company_name || authState.email || "";
  }

  // 方案標籤：admin 顯示特殊標記
  var planEl = document.getElementById("sidebarPlan");
  if (planEl) {
    if (authState.role === "admin") {
      planEl.textContent = "🛡 系統管理者";
      planEl.className   = "plan";
      planEl.style.color = "#ffffff";  // ← 加這行
    } else {
      planEl.textContent = authState.plan || "";
      planEl.className   = "plan plan-" + (authState.plan || "");
    }
  }

  buildSidebarMenu();

  // ── role 分流 ──
  if (authState.role === "admin") {
    navigateTo("admin");
  } else if (authState.role === "client_preview") {
    // 切換視角模式（admin 預覽某客戶）
    navigateTo("dashboard");
  } else {
    // 一般客戶：進第一個有權限的頁面（你原本邏輯）
    var firstPage = null;
    Object.keys(PAGES).forEach(function (key) {
      if (!firstPage && hasFeature(key)) firstPage = key;
    });
    if (firstPage) navigateTo(firstPage);
  }
}

// ============================================================
// 忘記密碼流程（完整保留原版）
// Step 1：輸入 Email → 寄 OTP
// Step 2：輸入 OTP 驗證碼
// Step 3：設定新密碼
// ============================================================

var _forgotState = {
  email:      "",
  resetToken: ""
};

function _resetForgotFlow() {
  _forgotState.email      = "";
  _forgotState.resetToken = "";
}

// ────────────────────────────────────────────────────────────
// 顯示忘記密碼頁（從登入頁進入）
// ────────────────────────────────────────────────────────────
function showForgotPassword() {
  document.getElementById("loginPage").style.display          = "none";
  document.getElementById("forgotPasswordPage").style.display = "flex";
  _resetForgotFlow();
  _showForgotStep(1);
}

// ────────────────────────────────────────────────────────────
// 切換步驟
// ────────────────────────────────────────────────────────────
function _showForgotStep(step) {
  [1, 2, 3].forEach(function (n) {
    var el = document.getElementById("forgotStep" + n);
    if (el) el.style.display = (n === step) ? "block" : "none";
  });
  var focusMap = { 1: "forgotEmail", 2: "otpInput", 3: "newPassword" };
  var focusEl  = document.getElementById(focusMap[step]);
  if (focusEl) setTimeout(function () { focusEl.focus(); }, 50);
}

// ────────────────────────────────────────────────────────────
// Step 1：寄送 OTP
// ────────────────────────────────────────────────────────────
async function submitForgotPassword() {
  var emailEl = document.getElementById("forgotEmail");
  var email   = emailEl ? emailEl.value.trim() : "";
  var errEl   = document.getElementById("forgotStep1Error");
  if (errEl) errEl.style.display = "none";

  if (!email) { _showForgotError(1, "請輸入 Email"); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { _showForgotError(1, "Email 格式不正確"); return; }

  var btn = document.getElementById("btnSendOtp");
  if (btn) { btn.disabled = true; btn.textContent = "寄送中..."; }

  try {
    var res = await apiCall({ action: "forgotPassword", email: email });
    if (res.success) {
      _forgotState.email = email;
      var emailHintEl = document.getElementById("otpEmailHint");
      if (emailHintEl) emailHintEl.textContent = email;
      showToast(res.data ? res.data.message : "驗證碼已寄出，請查收 Email", "success");
      _showForgotStep(2);
    } else {
      _showForgotError(1, res.message || "發生錯誤，請稍後再試");
    }
  } catch (err) {
    _showForgotError(1, "連線失敗，請稍後再試");
  }

  if (btn) { btn.disabled = false; btn.textContent = "寄送驗證碼"; }
}

// ────────────────────────────────────────────────────────────
// Step 2：重新寄送 OTP
// ────────────────────────────────────────────────────────────
async function resendOtp() {
  if (!_forgotState.email) { _showForgotError(2, "找不到 Email，請重新操作"); return; }

  var btn = document.getElementById("btnResendOtp");
  if (btn) { btn.disabled = true; btn.textContent = "寄送中..."; }

  try {
    var res = await apiCall({ action: "forgotPassword", email: _forgotState.email });
    if (res.success) {
      showToast("驗證碼已重新寄出", "success");
      var otpEl = document.getElementById("otpInput");
      if (otpEl) { otpEl.value = ""; otpEl.focus(); }
    } else {
      _showForgotError(2, res.message || "發送失敗，請稍後再試");
    }
  } catch (err) {
    _showForgotError(2, "連線失敗，請稍後再試");
  }

  if (btn) { btn.disabled = false; btn.textContent = "重新寄送"; }
}

// ────────────────────────────────────────────────────────────
// Step 2：驗證 OTP
// ────────────────────────────────────────────────────────────
async function submitVerifyOtp() {
  var otpEl = document.getElementById("otpInput");
  var otp   = otpEl ? otpEl.value.trim() : "";

  if (!otp)           { _showForgotError(2, "請輸入驗證碼");       return; }
  if (otp.length < 6) { _showForgotError(2, "驗證碼為 6 位數字"); return; }

  var btn = document.getElementById("btnVerifyOtp");
  if (btn) { btn.disabled = true; btn.textContent = "驗證中..."; }

  try {
    var res = await apiCall({ action: "verifyOtp", email: _forgotState.email, otp: otp });
    if (res.success) {
      _forgotState.resetToken = res.data.reset_token;
      showToast("驗證成功！請設定新密碼", "success");
      _showForgotStep(3);
    } else {
      _showForgotError(2, res.message || "驗證碼錯誤，請重新輸入");
      if (otpEl) { otpEl.value = ""; otpEl.focus(); }
    }
  } catch (err) {
    _showForgotError(2, "連線失敗，請稍後再試");
  }

  if (btn) { btn.disabled = false; btn.textContent = "驗證"; }
}

// ────────────────────────────────────────────────────────────
// Step 3：重設密碼
// ────────────────────────────────────────────────────────────
async function submitResetPassword() {
  var newPassEl     = document.getElementById("newPassword");
  var confirmPassEl = document.getElementById("confirmPassword");
  var newPass       = newPassEl     ? newPassEl.value     : "";
  var confirmPass   = confirmPassEl ? confirmPassEl.value : "";

  if (!newPass)                { _showForgotError(3, "請輸入新密碼");       return; }
  if (newPass.length < 6)      { _showForgotError(3, "密碼至少需要 6 個字元"); return; }
  if (newPass !== confirmPass) {
    _showForgotError(3, "兩次密碼輸入不一致");
    if (confirmPassEl) { confirmPassEl.value = ""; confirmPassEl.focus(); }
    return;
  }

  var btn = document.getElementById("btnResetPassword");
  if (btn) { btn.disabled = true; btn.textContent = "重設中..."; }

  try {
    var res = await apiCall({
      action:       "resetPassword",
      email:        _forgotState.email,
      reset_token:  _forgotState.resetToken,
      new_password: newPass
    });
    if (res.success) {
      showToast((res.data && res.data.message) ? res.data.message : "密碼已重設成功，請重新登入", "success");
      _resetForgotFlow();
      setTimeout(function () { showLoginPage(); }, 1500);
    } else {
      _showForgotError(3, res.message || "重設失敗，請重新申請");
    }
  } catch (err) {
    _showForgotError(3, "連線失敗，請稍後再試");
  }

  if (btn) { btn.disabled = false; btn.textContent = "確認重設密碼"; }
}

// ────────────────────────────────────────────────────────────
// 密碼強度即時提示
// ────────────────────────────────────────────────────────────
function updatePasswordStrength() {
  var password = document.getElementById("newPassword").value;
  var el       = document.getElementById("passwordStrength");
  if (!el) return;
  if (!password) { el.textContent = ""; return; }

  var score = 0;
  if (password.length >= 6)           score++;
  if (password.length >= 10)          score++;
  if (/[A-Z]/.test(password))         score++;
  if (/[0-9]/.test(password))         score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  var levels = [
    { text: "太短",   color: "#e74c3c" },
    { text: "弱",     color: "#e74c3c" },
    { text: "普通",   color: "#f39c12" },
    { text: "還不錯", color: "#2ecc71" },
    { text: "強",     color: "#27ae60" },
    { text: "非常強", color: "#1abc9c" }
  ];
  var level = levels[Math.min(score, levels.length - 1)];
  el.textContent = "密碼強度：" + level.text;
  el.style.color = level.color;
}

// ────────────────────────────────────────────────────────────
// 內部：顯示各步驟錯誤訊息
// ────────────────────────────────────────────────────────────
function _showForgotError(step, msg) {
  var el = document.getElementById("forgotStep" + step + "Error");
  if (!el) return;
  el.textContent   = msg;
  el.style.display = "block";
}
