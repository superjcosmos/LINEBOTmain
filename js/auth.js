var authState = {
  sessionToken: localStorage.getItem("sessionToken") || null,
  clientId:     localStorage.getItem("clientId")     || null,
  plan:         localStorage.getItem("plan")          || null,
  email:        localStorage.getItem("email")         || null
};

// 頁面載入時自動驗證
window.onload = function() {
  if (authState.sessionToken) {
    verifyAndEnter();
  }
};

async function login() {
  var email    = document.getElementById("inputEmail").value.trim();
  var password = document.getElementById("inputPassword").value;
  var btn      = document.getElementById("btnLogin");
  var errMsg   = document.getElementById("errorMsg");

  if (!email || !password) {
    showLoginError("請填入帳號和密碼");
    return;
  }

  btn.disabled    = true;
  btn.textContent = "登入中...";
  errMsg.style.display = "none";

  try {
    var result = await apiCall({
      action:   "login",
      email:    email,
      password: password
    });

    if (result.success) {
      localStorage.setItem("sessionToken", result.sessionToken);
      localStorage.setItem("clientId",     result.clientId);
      localStorage.setItem("plan",         result.plan);
      localStorage.setItem("email",        email);

      authState.sessionToken = result.sessionToken;
      authState.clientId     = result.clientId;
      authState.plan         = result.plan;
      authState.email        = email;

      enterMainPage();
    } else {
      showLoginError(result.message);
    }
  } catch(err) {
    showLoginError("連線失敗，請稍後再試");
  }

  btn.disabled    = false;
  btn.textContent = "登入";
}

async function verifyAndEnter() {
  try {
    var result = await apiCall({ action: "verify" });
    if (result.success) {
      enterMainPage();
    } else {
      clearSession();
    }
  } catch(err) {
    clearSession();
  }
}

async function logout() {
  await apiCall({ action: "logout" });
  clearSession();
  showLoginPage();
}

function clearSession() {
  localStorage.clear();
  authState.sessionToken = null;
  authState.clientId     = null;
  authState.plan         = null;
  authState.email        = null;
}

function showLoginError(msg) {
  var el = document.getElementById("errorMsg");
  el.textContent    = msg;
  el.style.display  = "block";
}

function showLoginPage() {
  document.getElementById("loginPage").style.display  = "flex";
  document.getElementById("mainPage").style.display   = "none";
}

function enterMainPage() {
  document.getElementById("loginPage").style.display        = "none";
  document.getElementById("mainPage").style.display         = "block";
  document.getElementById("sidebarEmail").textContent       = authState.email;
  document.getElementById("sidebarPlan").textContent        = authState.plan;
  navigateTo("userlog");
}
