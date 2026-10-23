import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, onSnapshot, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (s) => document.querySelector(s);

// ----- App state -----
let currentUser = null;
let reminders = [];
let currentTab = "upcoming";
let editingId = null;
const alerts = [];            // notifications shown in the bell panel
let unread = 0;
const alreadyNotified = new Set();

// ----- Helpers -----
const dueDate = (r) => r.dueAt.toDate();

function escapeHtml(text = "") {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(d) {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) +
    ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function relative(d) {
  const diff = d.getTime() - Date.now();
  const mins = Math.round(Math.abs(diff) / 60000);
  if (mins < 1) return "due now";
  let text;
  if (mins < 60) text = mins + " min";
  else if (mins < 1440) text = Math.round(mins / 60) + " hr";
  else { const days = Math.round(mins / 1440); text = days + (days === 1 ? " day" : " days"); }
  return diff >= 0 ? "in " + text : text + " ago";
}

function pad(n) { return String(n).padStart(2, "0"); }
const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

// ----- Auth -----
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "index.html"; return; }
  currentUser = user;
  const name = user.displayName || user.email;
  $("#userName").textContent = name;
  $("#greeting").textContent = "Hello, " + (user.displayName ? user.displayName.split(" ")[0] : "there");
  $("#todayText").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  subscribeToReminders();
});

$("#logoutBtn").addEventListener("click", () => signOut(auth));

// ----- Firestore: live updates -----
function subscribeToReminders() {
  const q = query(collection(db, "reminders"), where("uid", "==", currentUser.uid));
  onSnapshot(q, (snap) => {
    reminders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
    checkDue();
  }, () => toast("Could not load reminders. Check your Firestore rules and setup."));
}

// ----- Render -----
function render() {
  const now = Date.now();
  const pending = reminders.filter((r) => !r.completed);
  const done = reminders.filter((r) => r.completed);
  const overdue = pending.filter((r) => dueDate(r).getTime() <= now);

  $("#statUpcoming").textContent = pending.length - overdue.length;
  $("#statOverdue").textContent = overdue.length;
  $("#statDone").textContent = done.length;
  $("#countUpcoming").textContent = pending.length;
  $("#countCompleted").textContent = done.length;

  const term = $("#search").value.trim().toLowerCase();
  const cat = $("#filterCategory").value;
  const pri = $("#filterPriority").value;

  const list = reminders
    .filter((r) => (currentTab === "completed" ? r.completed : !r.completed))
    .filter((r) => !cat || r.category === cat)
    .filter((r) => !pri || r.priority === pri)
    .filter((r) => !term || (r.title + " " + (r.description || "")).toLowerCase().includes(term))
    .sort((a, b) => currentTab === "completed" ? dueDate(b) - dueDate(a) : dueDate(a) - dueDate(b));

  $("#list").innerHTML = list.map((r) => {
    const d = dueDate(r);
    const isOverdue = !r.completed && d.getTime() <= now;
    return `
      <li class="item p-${r.priority} ${r.completed ? "done" : ""} ${isOverdue ? "overdue" : ""}">
        <button class="check" data-action="toggle" data-id="${r.id}"
          aria-label="${r.completed ? "Mark as not completed" : "Mark as completed"}">&#10003;</button>
        <div class="item-main">
          <h3>${escapeHtml(r.title)}</h3>
          ${r.description ? `<p>${escapeHtml(r.description)}</p>` : ""}
          <div class="meta">
            <span class="when">${formatDate(d)}</span>
            ${r.completed ? "" : `<span class="chip ${isOverdue ? "chip-danger" : ""}">${isOverdue ? "Overdue " : ""}${relative(d)}</span>`}
            <span class="chip">${escapeHtml(r.category || "Other")}</span>
            <span class="chip chip-${r.priority}">${r.priority} priority</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost btn-small" data-action="edit" data-id="${r.id}">Edit</button>
          <button class="btn btn-ghost btn-small btn-danger" data-action="delete" data-id="${r.id}">Delete</button>
        </div>
      </li>`;
  }).join("");

  const empty = $("#empty");
  empty.hidden = list.length > 0;
  if (!list.length) {
    const filtering = term || cat || pri;
    if (filtering) empty.innerHTML = "<strong>No matches</strong><p>Try a different search or clear the filters.</p>";
    else if (currentTab === "completed") empty.innerHTML = "<strong>Nothing completed yet</strong><p>Reminders you finish will appear here.</p>";
    else empty.innerHTML = "<strong>No upcoming reminders</strong><p>Select Add reminder to create your first one.</p>";
  }
}

// ----- Tabs and filters -----
document.querySelectorAll(".list-tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentTab = btn.dataset.tab;
    document.querySelectorAll(".list-tabs button").forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
});
["#search", "#filterCategory", "#filterPriority"].forEach((id) => {
  $(id).addEventListener("input", render);
});

// ----- List actions (complete, edit, delete) -----
$("#list").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const r = reminders.find((x) => x.id === btn.dataset.id);
  if (!r) return;

  try {
    if (btn.dataset.action === "toggle") {
      await updateDoc(doc(db, "reminders", r.id), { completed: !r.completed });
      toast(r.completed ? "Moved back to upcoming" : "Marked as completed");
    } else if (btn.dataset.action === "edit") {
      openModal(r);
    } else if (btn.dataset.action === "delete") {
      if (confirm(`Delete "${r.title}"? This cannot be undone.`)) {
        await deleteDoc(doc(db, "reminders", r.id));
        toast("Reminder deleted");
      }
    }
  } catch {
    toast("Something went wrong. Please try again.");
  }
});

// ----- Add / edit modal -----
const modal = $("#modal");

function openModal(reminder = null) {
  editingId = reminder ? reminder.id : null;
  $("#modalTitle").textContent = reminder ? "Edit reminder" : "Add reminder";
  $("#formError").hidden = true;
  if (reminder) {
    const d = dueDate(reminder);
    $("#fTitle").value = reminder.title;
    $("#fDesc").value = reminder.description || "";
    $("#fDate").value = toDateInput(d);
    $("#fTime").value = toTimeInput(d);
    $("#fCategory").value = reminder.category || "Other";
    $("#fPriority").value = reminder.priority || "medium";
  } else {
    const soon = new Date(Date.now() + 60 * 60 * 1000);
    soon.setMinutes(0, 0, 0);
    $("#reminderForm").reset();
    $("#fDate").value = toDateInput(soon);
    $("#fTime").value = toTimeInput(soon);
  }
  modal.showModal();
  $("#fTitle").focus();
}

$("#addBtn").addEventListener("click", () => openModal());
$("#closeModal").addEventListener("click", () => modal.close());
$("#cancelBtn").addEventListener("click", () => modal.close());

$("#reminderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("#fTitle").value.trim();
  const date = $("#fDate").value;
  const time = $("#fTime").value;
  const error = $("#formError");

  if (!title) { error.textContent = "Enter a title for the reminder."; error.hidden = false; return; }
  if (!date || !time) { error.textContent = "Choose a date and a time."; error.hidden = false; return; }

  const data = {
    title,
    description: $("#fDesc").value.trim(),
    category: $("#fCategory").value,
    priority: $("#fPriority").value,
    dueAt: Timestamp.fromDate(new Date(`${date}T${time}`)),
    notified: false                      // alert again if the time was changed
  };

  $("#saveBtn").disabled = true;
  try {
    if (editingId) {
      await updateDoc(doc(db, "reminders", editingId), data);
      alreadyNotified.delete(editingId);
      toast("Reminder updated");
    } else {
      await addDoc(collection(db, "reminders"), {
        ...data, uid: currentUser.uid, completed: false, createdAt: serverTimestamp()
      });
      toast("Reminder added");
    }
    modal.close();
  } catch {
    error.textContent = "Could not save. Check your connection and Firestore rules.";
    error.hidden = false;
  } finally {
    $("#saveBtn").disabled = false;
  }
});

// ----- Notifications -----
function checkDue() {
  const now = Date.now();
  reminders.forEach((r) => {
    if (r.completed || r.notified || alreadyNotified.has(r.id)) return;
    if (dueDate(r).getTime() <= now) {
      alreadyNotified.add(r.id);
      fireAlert(r);
      updateDoc(doc(db, "reminders", r.id), { notified: true }).catch(() => {});
    }
  });
}

function fireAlert(r) {
  alerts.unshift({ title: r.title, time: new Date() });
  unread++;
  updateBell();
  toast("Reminder due: " + r.title);
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Reminder due", { body: r.title });
  }
}

function updateBell() {
  const badge = $("#bellBadge");
  badge.textContent = unread;
  badge.hidden = unread === 0;
  $("#notifList").innerHTML = alerts.length
    ? alerts.map((a) => `<li><strong>${escapeHtml(a.title)}</strong>
        <small>Due ${a.time.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</small></li>`).join("")
    : '<li class="notif-empty">No notifications yet.</li>';
}

$("#bellBtn").addEventListener("click", () => {
  const panel = $("#notifPanel");
  panel.hidden = !panel.hidden;
  $("#bellBtn").setAttribute("aria-expanded", String(!panel.hidden));
  if (!panel.hidden) {
    unread = 0;
    updateBell();
    $("#permRow").hidden = !("Notification" in window) || Notification.permission !== "default";
  }
});

$("#clearAlerts").addEventListener("click", () => { alerts.length = 0; unread = 0; updateBell(); });

$("#enablePerm").addEventListener("click", async () => {
  const result = await Notification.requestPermission();
  $("#permRow").hidden = true;
  toast(result === "granted" ? "Browser alerts turned on" : "Browser alerts are blocked");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".notif-wrap")) $("#notifPanel").hidden = true;
});

// Re-check every 15 seconds so due reminders fire while the page is open
setInterval(() => { checkDue(); render(); }, 15000);
updateBell();
