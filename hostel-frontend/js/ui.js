// Shared UI helpers used across pages

function showToast(message, type = "") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

// Renders a single hostel card. `hostel` fields come straight from the API.
function renderHostelCard(hostel) {
  const mins = walkingMinutes(hostel.distance_from_campus_km);
  const distanceLabel = mins != null ? `${mins} min walk` : "Distance N/A";

  const rooms = hostel.rooms || [];
  const cheapestPrice = rooms.length
    ? Math.min(...rooms.map((r) => Number(r.price_per_semester)))
    : null;
  const totalAvailable = rooms.length
    ? rooms.reduce((sum, r) => sum + Number(r.available_slots), 0)
    : hostel._availableHint ?? 1; // fallback for list view without room data

  const isOpen = totalAvailable > 0;

  const amenities = (hostel.amenities || "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 3);

  const imgHtml = hostel.cover_image_url
    ? `<img src="${hostel.cover_image_url}" alt="${hostel.name}" />`
    : `<svg class="placeholder-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`;

  return `
    <a class="hostel-card" href="hostel.html?id=${hostel.id}">
      <div class="media">
        ${imgHtml}
        <span class="distance-pill">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="4" r="2"/><path d="M10 8h4l2 5-3 2 1 7h-2l-1-6-2 2v4H7v-6l2-4-2-3 2-2Z"/></svg>
          ${distanceLabel}
        </span>
        <span class="availability-pill ${isOpen ? "open" : "full"}">${isOpen ? "Slots open" : "Full"}</span>
      </div>
      <div class="body">
        <div class="name">${hostel.name}</div>
        <div class="location">${hostel.location}</div>
        ${amenities.length ? `<div class="amenities">${amenities.map((a) => `<span class="amenity-tag">${a}</span>`).join("")}</div>` : ""}
        <div class="footer-row">
          <div>
            <div class="price-from">From</div>
            <div class="price-amount">${cheapestPrice != null ? formatCedis(cheapestPrice) : "—"} <span class="unit">/ semester</span></div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--slate-light)"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>
    </a>
  `;
}

function emptyState(message, iconPath) {
  return `
    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${iconPath}</svg>
      <p>${message}</p>
    </div>
  `;
}

// Reflect logged-in state in the bottom nav "Profile" tab
document.addEventListener("DOMContentLoaded", () => {
  const navProfile = document.getElementById("navProfile");
  const user = typeof getUser === "function" ? getUser() : null;
  if (navProfile && user) {
    navProfile.href = "account.html";
  }
});
