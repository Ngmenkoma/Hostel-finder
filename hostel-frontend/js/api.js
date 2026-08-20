// Small wrapper around fetch that attaches the JWT token when present
// and throws a readable error when the API returns a non-2xx status.

function getToken() {
  return localStorage.getItem("hf_token");
}

function getUser() {
  const raw = localStorage.getItem("hf_user");
  return raw ? JSON.parse(raw) : null;
}

function setSession(token, user) {
  localStorage.setItem("hf_token", token);
  localStorage.setItem("hf_user", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem("hf_token");
  localStorage.removeItem("hf_user");
}

async function apiRequest(path, { method = "GET", body, isFormData = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isFormData && body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// Roughly converts km to a walking-minutes estimate (12 min/km, average pace)
function walkingMinutes(km) {
  if (km == null) return null;
  return Math.round(km * 12);
}

function formatCedis(amount) {
  return `GH₵ ${Number(amount).toLocaleString("en-GH", { minimumFractionDigits: 0 })}`;
}

function requireAuthOrRedirect() {
  if (!getToken()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}
