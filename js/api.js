async function apiCall(params) {
  var token = localStorage.getItem("sessionToken");
  if (token && params.action !== "login") {
    params.sessionToken = token;
  }

  var response = await fetch(CONFIG.API_URL, {
    method: "POST",
    body: JSON.stringify(params)
  });

  var result = await response.json();

  // token 失效就踢回登入頁
  if (!result.success && result.message === "請重新登入") {
    clearSession();
    showLoginPage();
  }

  return result;
}
