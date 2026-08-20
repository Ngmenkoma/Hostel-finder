// ---- Login ----
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("loginBtn");
    btn.disabled = true;
    btn.textContent = "Logging in…";

    try {
      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: {
          email: document.getElementById("email").value.trim(),
          password: document.getElementById("password").value,
        },
      });
      setSession(result.token, result.user);
      showToast("Welcome back!", "success");
      setTimeout(() => (window.location.href = "index.html"), 700);
    } catch (err) {
      showToast(err.message, "error");
      btn.disabled = false;
      btn.textContent = "Log In";
    }
  });
}

// ---- Register ----
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  let selectedRole = "student";

  document.querySelectorAll("#roleToggle button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#roleToggle button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedRole = btn.dataset.role;
    });
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("registerBtn");
    btn.disabled = true;
    btn.textContent = "Creating account…";

    try {
      const result = await apiRequest("/auth/register", {
        method: "POST",
        body: {
          fullName: document.getElementById("fullName").value.trim(),
          email: document.getElementById("email").value.trim(),
          phone: document.getElementById("phone").value.trim(),
          password: document.getElementById("password").value,
          role: selectedRole,
        },
      });
      setSession(result.token, result.user);
      showToast("Account created!", "success");
      setTimeout(() => {
        window.location.href = selectedRole === "landlord" ? "dashboard.html" : "index.html";
      }, 700);
    } catch (err) {
      showToast(err.message, "error");
      btn.disabled = false;
      btn.textContent = "Create Account";
    }
  });
}
