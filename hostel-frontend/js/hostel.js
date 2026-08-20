const params = new URLSearchParams(window.location.search);
const hostelId = params.get("id");

let selectedRoom = null;

const ROOM_LABELS = {
  single: "Single Room",
  shared_2: "Shared Room (2 in a room)",
  shared_4: "Shared Room (4 in a room)",
  shared_6: "Shared Room (6 in a room)",
};

async function loadHostel() {
  if (!hostelId) {
    window.location.href = "index.html";
    return;
  }

  try {
    const hostel = await apiRequest(`/hostels/${hostelId}`);
    renderHostel(hostel);
  } catch (err) {
    document.getElementById("detailBody").innerHTML = `
      <div class="empty-state">
        <p>Couldn't load this hostel. It may have been removed.</p>
        <a href="index.html" class="btn btn-ghost" style="margin-top:14px;">Back to listings</a>
      </div>`;
    console.error(err);
  }
}

function renderHostel(hostel) {
  const hero = document.getElementById("detailHero");
  if (hostel.cover_image_url) {
    hero.innerHTML += `<img src="${hostel.cover_image_url}" alt="${hostel.name}" />`;
  }

  const mins = walkingMinutes(hostel.distance_from_campus_km);
  const amenities = (hostel.amenities || "").split(",").map((a) => a.trim()).filter(Boolean);
  const rooms = hostel.rooms || [];

  document.getElementById("detailBody").innerHTML = `
    <h2>${hostel.name}</h2>
    <div class="detail-meta">
      <span class="meta-item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        ${hostel.location}
      </span>
      ${mins != null ? `<span class="meta-item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        ${mins} min walk
      </span>` : ""}
    </div>

    ${hostel.description ? `
    <div class="detail-section">
      <h3>About this hostel</h3>
      <p>${hostel.description}</p>
    </div>` : ""}

    ${amenities.length ? `
    <div class="detail-section">
      <h3>Amenities</h3>
      <div class="amenities">${amenities.map((a) => `<span class="amenity-tag">${a}</span>`).join("")}</div>
    </div>` : ""}

    <div class="detail-section">
      <h3>Available Rooms</h3>
      <div id="roomsList">
        ${rooms.length ? rooms.map(roomRow).join("") : `<p style="font-size:13px;color:var(--slate);">No room types listed yet.</p>`}
      </div>
    </div>
  `;

  document.querySelectorAll(".book-room-btn").forEach((btn) => {
    btn.addEventListener("click", () => openBookingModal(btn.dataset));
  });
}

function roomRow(room) {
  const label = ROOM_LABELS[room.room_type] || room.room_type;
  const full = room.available_slots <= 0;
  return `
    <div class="room-row">
      <div>
        <div class="room-type">${label}</div>
        <div class="room-slots">${full ? "No slots available" : `${room.available_slots} of ${room.total_slots} slots open`}</div>
      </div>
      <div style="text-align:right;">
        <div class="room-price">${formatCedis(room.price_per_semester)}</div>
        <button class="btn btn-primary btn-sm book-room-btn" style="margin-top:8px;" ${full ? "disabled" : ""}
          data-room-id="${room.id}" data-room-label="${label}">
          ${full ? "Full" : "Book"}
        </button>
      </div>
    </div>
  `;
}

function openBookingModal(data) {
  if (!requireAuthOrRedirect()) return;
  selectedRoom = data;
  document.getElementById("modalRoomType").value = data.roomLabel;
  document.getElementById("bookingModal").classList.add("show");
}

document.getElementById("cancelBookingBtn").addEventListener("click", () => {
  document.getElementById("bookingModal").classList.remove("show");
});

document.getElementById("confirmBookingBtn").addEventListener("click", async () => {
  if (!selectedRoom) return;
  const btn = document.getElementById("confirmBookingBtn");
  btn.disabled = true;
  btn.textContent = "Booking…";

  try {
    const result = await apiRequest("/bookings", {
      method: "POST",
      body: {
        roomId: Number(selectedRoom.roomId),
        academicYear: document.getElementById("academicYear").value,
        semester: document.getElementById("semester").value,
      },
    });
    document.getElementById("bookingModal").classList.remove("show");
    showToast(`Booking request submitted — ${formatCedis(result.amountDue)} due`, "success");
    setTimeout(() => (window.location.href = "bookings.html"), 1200);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Confirm Booking";
  }
});

loadHostel();
