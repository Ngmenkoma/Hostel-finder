let allHostels = [];

async function loadHostels() {
  const container = document.getElementById("listContainer");
  try {
    const hostels = await apiRequest("/hostels");

    // Fetch rooms for each hostel in parallel so cards can show price + availability
    const withRooms = await Promise.all(
      hostels.map(async (h) => {
        try {
          const rooms = await apiRequest(`/rooms/hostel/${h.id}`);
          return { ...h, rooms };
        } catch {
          return { ...h, rooms: [] };
        }
      })
    );

    allHostels = withRooms;
    renderList(allHostels);
  } catch (err) {
    container.innerHTML = emptyState(
      "Couldn't load hostels. Check that the backend server is running.",
      '<path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/>'
    );
    console.error(err);
  }
}

function renderList(hostels) {
  const container = document.getElementById("listContainer");
  const countEl = document.getElementById("resultCount");
  countEl.textContent = `${hostels.length} found`;

  if (hostels.length === 0) {
    container.innerHTML = emptyState(
      "No hostels match your search yet.",
      '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'
    );
    return;
  }

  container.innerHTML = hostels.map(renderHostelCard).join("");
}

document.getElementById("searchInput").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  const filtered = allHostels.filter(
    (h) => h.name.toLowerCase().includes(q) || h.location.toLowerCase().includes(q)
  );
  renderList(filtered);
});

document.getElementById("profileBtn").addEventListener("click", () => {
  window.location.href = getUser() ? "account.html" : "login.html";
});

loadHostels();
