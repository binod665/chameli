// ============================================================
// chameli.com.np — मेरा नोटहरू
// Supabase auth + notes CRUD
// ============================================================

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GUEST_KEY = "chameli_guest_notes_v1";
let isGuest = false;
let currentUser = null;
let notes = [];
let activeNoteId = null;
let saveTimer = null;

// ---------- DOM references ----------
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const loginMsg = document.getElementById("login-msg");
const signupMsg = document.getElementById("signup-msg");
const guestBtn = document.getElementById("guest-btn");
const logoutBtn = document.getElementById("logout-btn");
const userEmailEl = document.getElementById("user-email");
const notesGrid = document.getElementById("notes-grid");
const emptyState = document.getElementById("empty-state");
const searchBox = document.getElementById("search-box");
const fabAdd = document.getElementById("fab-add");

const editorOverlay = document.getElementById("editor-overlay");
const noteTitleInput = document.getElementById("note-title");
const noteContentInput = document.getElementById("note-content");
const colorPicker = document.getElementById("color-picker");
const saveStatus = document.getElementById("save-status");
const deleteNoteBtn = document.getElementById("delete-note-btn");
const closeEditorBtn = document.getElementById("close-editor-btn");
const toast = document.getElementById("toast");

const cardColorMap = {
  yellow: "#F4CE6B", rose: "#F0A3A3", mint: "#9FD8C4",
  sky: "#9BC4E8", paper: "#EDE6D6"
};

// ---------- Toast helper ----------
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 2200);
}

// ---------- Auth tab switching ----------
document.querySelectorAll(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    loginForm.classList.toggle("hidden", target !== "login");
    signupForm.classList.toggle("hidden", target !== "signup");
  });
});

// ---------- Signup ----------
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  signupMsg.textContent = "";
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { signupMsg.textContent = error.message; return; }
  if (data.session) {
    enterApp(data.session.user);
  } else {
    signupMsg.style.color = "#3d7a5c";
    signupMsg.textContent = "खाता बन्यो! कृपया आफ्नो इमेल जाँच गरी पुष्टि गर्नुहोस्, त्यसपछि लगइन गर्नुहोस्।";
  }
});

// ---------- Login ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMsg.textContent = "";
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { loginMsg.textContent = error.message; return; }
  enterApp(data.user);
});

// ---------- Guest mode (यो यन्त्रमा मात्र, localStorage) ----------
guestBtn.addEventListener("click", () => {
  isGuest = true;
  currentUser = { email: "गेस्ट (यो यन्त्रमा मात्र)" };
  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
  userEmailEl.textContent = currentUser.email;
  loadGuestNotes();
  renderNotes();
});

// ---------- Logout ----------
logoutBtn.addEventListener("click", async () => {
  if (!isGuest) await supabase.auth.signOut();
  isGuest = false;
  currentUser = null;
  notes = [];
  appScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
});

// ---------- Enter app after successful auth ----------
async function enterApp(user) {
  currentUser = user;
  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
  userEmailEl.textContent = user.email;
  await loadNotesFromSupabase();
  renderNotes();
}

// ---------- Check existing session on page load ----------
(async function checkSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await enterApp(data.session.user);
  }
})();

// ---------- Load notes: Supabase ----------
async function loadNotesFromSupabase() {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) { showToast("नोट ल्याउँदा त्रुटि: " + error.message); return; }
  notes = data || [];
}

// ---------- Load notes: guest (localStorage) ----------
function loadGuestNotes() {
  try {
    notes = JSON.parse(localStorage.getItem(GUEST_KEY)) || [];
  } catch { notes = []; }
}
function saveGuestNotes() {
  localStorage.setItem(GUEST_KEY, JSON.stringify(notes));
}

// ---------- Render note grid ----------
function renderNotes() {
  const query = searchBox.value.trim().toLowerCase();
  const filtered = notes.filter(n =>
    (n.title || "").toLowerCase().includes(query) ||
    (n.content || "").toLowerCase().includes(query)
  );

  notesGrid.innerHTML = "";
  emptyState.classList.toggle("hidden", notes.length > 0);

  filtered.forEach(note => {
    const card = document.createElement("div");
    card.className = "note-card";
    card.style.background = cardColorMap[note.color] || cardColorMap.paper;
    card.innerHTML = `
      <h3 class="note-title">${escapeHtml(note.title || "शीर्षकविहीन")}</h3>
      <p class="note-body">${escapeHtml(truncate(note.content || "", 260))}</p>
      <span class="note-meta">${formatDate(note.updated_at)}</span>
    `;
    card.addEventListener("click", () => openEditor(note.id));
    notesGrid.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + "…" : str;
}
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("ne-NP", { year: "numeric", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("ne-NP", { hour: "2-digit", minute: "2-digit" });
}

// ---------- Search ----------
searchBox.addEventListener("input", renderNotes);

// ---------- Open editor (new or existing) ----------
function openEditor(noteId) {
  activeNoteId = noteId || null;
  const note = notes.find(n => n.id === noteId) || { title: "", content: "", color: "yellow" };
  noteTitleInput.value = note.title || "";
  noteContentInput.value = note.content || "";
  setSelectedColor(note.color || "yellow");
  deleteNoteBtn.classList.toggle("hidden", !noteId);
  saveStatus.textContent = "";
  editorOverlay.classList.remove("hidden");
  noteTitleInput.focus();
}

function setSelectedColor(color) {
  colorPicker.querySelectorAll(".color-dot").forEach(dot => {
    dot.classList.toggle("selected", dot.dataset.color === color);
  });
}

colorPicker.addEventListener("click", (e) => {
  const dot = e.target.closest(".color-dot");
  if (!dot) return;
  setSelectedColor(dot.dataset.color);
  scheduleAutosave();
});

fabAdd.addEventListener("click", () => openEditor(null));

// ---------- Autosave (debounced) ----------
[noteTitleInput, noteContentInput].forEach(el => {
  el.addEventListener("input", scheduleAutosave);
});

function scheduleAutosave() {
  saveStatus.textContent = "लेख्दै...";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveActiveNote, 700);
}

function getSelectedColor() {
  const el = colorPicker.querySelector(".color-dot.selected");
  return el ? el.dataset.color : "yellow";
}

async function saveActiveNote() {
  const title = noteTitleInput.value.trim();
  const content = noteContentInput.value;
  const color = getSelectedColor();
  if (!title && !content) { saveStatus.textContent = ""; return; }

  if (isGuest) {
    if (activeNoteId) {
      const n = notes.find(n => n.id === activeNoteId);
      Object.assign(n, { title, content, color, updated_at: new Date().toISOString() });
    } else {
      activeNoteId = "g_" + Date.now();
      notes.unshift({ id: activeNoteId, title, content, color, updated_at: new Date().toISOString() });
      deleteNoteBtn.classList.remove("hidden");
    }
    saveGuestNotes();
    saveStatus.textContent = "सुरक्षित भयो ✓";
    renderNotes();
    return;
  }

  if (activeNoteId) {
    const { error } = await supabase
      .from("notes")
      .update({ title, content, color, updated_at: new Date().toISOString() })
      .eq("id", activeNoteId);
    if (error) { saveStatus.textContent = "त्रुटि: " + error.message; return; }
    const n = notes.find(n => n.id === activeNoteId);
    if (n) Object.assign(n, { title, content, color });
  } else {
    const { data, error } = await supabase
      .from("notes")
      .insert({ title, content, color, user_id: currentUser.id })
      .select()
      .single();
    if (error) { saveStatus.textContent = "त्रुटि: " + error.message; return; }
    activeNoteId = data.id;
    notes.unshift(data);
    deleteNoteBtn.classList.remove("hidden");
  }
  saveStatus.textContent = "सुरक्षित भयो ✓";
  renderNotes();
}

// ---------- Delete ----------
deleteNoteBtn.addEventListener("click", async () => {
  if (!activeNoteId) return;
  if (isGuest) {
    notes = notes.filter(n => n.id !== activeNoteId);
    saveGuestNotes();
  } else {
    const { error } = await supabase.from("notes").delete().eq("id", activeNoteId);
    if (error) { showToast("मेटाउँदा त्रुटि: " + error.message); return; }
    notes = notes.filter(n => n.id !== activeNoteId);
  }
  closeEditor();
  renderNotes();
  showToast("नोट मेटाइयो");
});

// ---------- Close editor ----------
closeEditorBtn.addEventListener("click", () => {
  clearTimeout(saveTimer);
  saveActiveNote().then(closeEditor);
});
function closeEditor() {
  editorOverlay.classList.add("hidden");
  activeNoteId = null;
}
editorOverlay.addEventListener("click", (e) => {
  if (e.target === editorOverlay) closeEditorBtn.click();
});
