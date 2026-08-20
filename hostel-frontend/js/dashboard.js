const user = getUser();
let myHostels = [];

async function initDashboard() {
  const content = document.getElementById("dashboardContent");

  if (!user || (user.role !== "landlord" && user.role !== "admin")) {
    content.innerHTML = `
      <div class="empty-state">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19 12c0-3.9-3.1-7-7-7s-7 3.1-7 7 3.1 7 7 7 7-3.1 7-7Z"/></svg>
        <p>This dashboard is for landlords managing hostel listings.<br/>Your account is registered as a student.</p>
        <a href="index.html" class="btn btn-ghost" style="margin-top:16px;">Back to browsing</a>
      </div>
    `;
    return;
  }

  try {
    const [allHostels, bookings] = await Promise.all([
      apiRequest("/hostels"),
      apiRequest("/bookings/landlord"),
    ]);

    myHostels = user.role === "admin" ? allHostels : allHostels.filter((h) => h.landlord_id === user.id);

    renderDashboard(myHostels, bookings);
  } catch (err) {
    content.innerHTML = emptyState("Couldn't load dashboard data.", '<circle cx="12" cy="12" r="9"/><path d="M12 9v4M12 17h.01"/>');
    console.error(err);
  }
}

function renderDashboard(hostels, bookings) {
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  document.getElementById("dashboardContent").innerHTML = `
    <div class="stat-row">
      <div class="stat-card">
        <div class="value">${hostels.length}</div>
        <div class="label">Listings</div>
      </div>
      <div class="stat-card">
        <div class="value">${bookings.length}</div>
        <div class="label">Total Bookings</div>
      </div>
      <div class="stat-card">
        <div class="value">${pendingCount}</div>
        <div class="label">Pending</div>
      </div>
    </div>

    <div class="section-title">
      <span>Your Listings</span>
    </div>
    <div style="display:flex; gap:8px; margin-bottom:16px;">
      <button class="btn btn-primary btn-sm" id="openAddHostel">+ Add Hostel</button>
      <button class="btn btn-outline btn-sm" id="openAddRoom">+ Add Room</button>
    </div>
    <div id="hostelsList">
      ${hostels.length ? hostels.map(landlordHostelRow).join("") : `<p style="font-size:13px;color:var(--slate);">No listings yet — add your first hostel above.</p>`}
    </div>

    <div class="section-title" style="margin-top:24px;">
      <span>Recent Bookings</span>
    </div>
    <div id="bookingsList">
      ${bookings.length ? bookings.slice(0, 15).map(landlordBookingRow).join("") : `<p style="font-size:13px;color:var(--slate);">No bookings yet.</p>`}
    </div>
  `;

  document.getElementById("openAddHostel").addEventListener("click", () => {
    document.getElementById("addHostelModal").classList.add("show");
  });
  document.getElementById("openAddRoom").addEventListener("click", () => {
    if (hostels.length === 0) {
      showToast("Add a hostel first before adding rooms", "error");
      return;
    }
    populateHostelSelect(hostels);
    document.getElementById("addRoomModal").classList.add("show");
  });

  document.querySelectorAll(".booking-status-btn").forEach((btn) => {
    btn.addEventListener("click", () => updateBookingStatus(btn.dataset.id, btn.dataset.status));
  });
}

function landlordHostelRow(h) {
  return `
    <div class="list-item">
      <div class="row-top">
        <strong style="font-size:14.5px;">${h.name}</strong>
      </div>
      <div style="font-size:12.5px; color:var(--slate);">${h.location}</div>
    </div>
  `;
}

function landlordBookingRow(b) {
  return `
    <div class="list-item">
      <div class="row-top">
        <strong style="font-size:14px;">${b.student_name}</strong>
        <span class="status-badge ${b.status}">${b.status.replace("_", " ")}</span>
      </div>
      <div style="font-size:12px; color:var(--slate); margin-bottom:10px;">
        ${b.hostel_name} · ${b.room_type.replace("_", " ")} · ${formatCedis(b.amount_due)}
      </div>
      ${b.status === "pending" ? `
        <div style="display:flex; gap:8px;">
          <button class="btn btn-sm btn-primary booking-status-btn" data-id="${b.id}" data-status="confirmed">Confirm</button>
          <button class="btn btn-sm btn-danger booking-status-btn" data-id="${b.id}" data-status="cancelled">Decline</button>
        </div>
      ` : ""}
    </div>
  `;
}

async function updateBookingStatus(id, status) {
  try {
    await apiRequest(`/bookings/${id}/status`, { method: "PUT", body: { status } });
    showToast(`Booking ${status}`, "success");
    initDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function populateHostelSelect(hostels) {
  const select = document.getElementById("roomHostelId");
  select.innerHTML = hostels.map((h) => `<option value="${h.id}">${h.name}</option>`).join("");
}

// ---- Add Hostel modal ----
document.getElementById("closeHostelModal").addEventListener("click", () => {
  document.getElementById("addHostelModal").classList.remove("show");
});

document.getElementById("addHostelForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("saveHostelBtn");
  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    await apiRequest("/hostels", {
      method: "POST",
      body: {
        name: document.getElementById("hostelName").value.trim(),
        location: document.getElementById("hostelLocation").value.trim(),
        distanceFromCampusKm: document.getElementById("hostelDistance").value || null,
        amenities: document.getElementById("hostelAmenities").value.trim(),
        description: document.getElementById("hostelDescription").value.trim(),
      },
    });
    document.getElementById("addHostelModal").classList.remove("show");
    document.getElementById("addHostelForm").reset();
    showToast("Hostel added", "success");
    initDashboard();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Hostel";
  }
});

// ---- Add Room modal ----
document.getElementById("closeRoomModal").addEventListener("click", () => {
  document.getElementById("addRoomModal").classList.remove("show");
});

document.getElementById("addRoomForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("saveRoomBtn");
  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    await apiRequest("/rooms", {
      method: "POST",
      body: {
        hostelId: Number(document.getElementById("roomHostelId").value),
        roomType: document.getElementById("roomType").value,
        pricePerSemester: document.getElementById("roomPrice").value,
        totalSlots: document.getElementById("roomSlots").value,
      },
    });
    document.getElementById("addRoomModal").classList.remove("show");
    document.getElementById("addRoomForm").reset();
    showToast("Room added", "success");
    initDashboard();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Room";
  }
});

if (requireAuthOrRedirect()) {
  initDashboard();
}
