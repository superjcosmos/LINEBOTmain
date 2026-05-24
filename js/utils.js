function formatDate(dateStr) {
  if (!dateStr) return "-";
  var d = new Date(dateStr);
  return d.getFullYear() + "/" +
    String(d.getMonth()+1).padStart(2,"0") + "/" +
    String(d.getDate()).padStart(2,"0") + " " +
    String(d.getHours()).padStart(2,"0") + ":" +
    String(d.getMinutes()).padStart(2,"0");
}

function showToast(message, type) {
  type = type || "success";
  var toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast toast-" + type + " show";
  setTimeout(function() {
    toast.className = "toast";
  }, 3000);
}

function setContent(html) {
  document.getElementById("mainContent").innerHTML = html;
}

function confirmDialog(message) {
  return confirm(message);
}

async function initSheet() {
  if (!confirmDialog("確定要初始化工作表嗎？\n已存在的工作表不會被覆蓋。")) return;

  showToast("初始化中...");

  var result = await apiCall({ action: "initClientSheet" });

  if (result.success) {
    showToast(result.message);
  } else {
    showToast(result.message, "error");
  }
}
