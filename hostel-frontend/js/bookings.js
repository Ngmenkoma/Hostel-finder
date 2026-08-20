const SEMESTER_LABELS = {
  first: "First Semester",
  second: "Second Semester",
  full_year: "Full Academic Year",
};

async function loadBookings() {
  const container = document.getElementById("bookingsList");
  try {
    const bookings = await apiRequest("/bookings/mine");

    if (bookings.length === 0) {
      container.innerHTML = emptyState(
        "You haven't booked a hostel yet.",
        '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'
      );
      return;
    }

    container.innerHTML = bookings.map((b) => `
      <div class="list-item">
        <div class="row-top">
          <strong style="font-size:14.5px;">${b.hostel_name}</strong>
          <span class="status-badge ${b.status}">${b.status.replace("_", " ")}</span>
        </div>
        <div style="font-size:12.5px; color:var(--slate); margin-bottom:8px;">
          ${b.room_type.replace("_", " ")} · ${b.location}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12px; color:var(--slate);">${SEMESTER_LABELS[b.semester] || b.semester} · ${b.academic_year}</span>
          <span style="font-family:var(--font-mono); font-weight:700;">${formatCedis(b.amount_due)}</span>
        </div>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = emptyState("Couldn't load your bookings.", '<circle cx="12" cy="12" r="9"/><path d="M12 9v4M12 17h.01"/>');
    console.error(err);
  }
}

if (requireAuthOrRedirect()) {
  loadBookings();
}
