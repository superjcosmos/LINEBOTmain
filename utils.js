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
