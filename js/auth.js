import { auth, isConfigured } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const $ = (s) => document.querySelector(s);
const loginForm = $("#loginForm");
const registerForm = $("#registerForm");
const message = $("#authMessage");

if (!isConfigured) $("#configWarning").hidden = false;

// If the user is already logged in, go straight to the dashboard
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "dashboard.html";
});

// ----- Tabs -----
function showTab(which) {
  const isLogin = which === "login";
  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  $("#tabLogin").classList.toggle("active", isLogin);
  $("#tabRegister").classList.toggle("active", !isLogin);
  $("#tabLogin").setAttribute("aria-selected", isLogin);
  $("#tabRegister").setAttribute("aria-selected", !isLogin);
  message.hidden = true;
}
$("#tabLogin").addEventListener("click", () => showTab("login"));
$("#tabRegister").addEventListener("click", () => showTab("register"));

// ----- Messages -----
function show(text, type = "error") {
  message.textContent = text;
  message.className = "alert alert-" + type;
  message.hidden = false;
}

function friendlyError(err) {
  const map = {
    "auth/invalid-email": "That email address is not valid.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/email-already-in-use": "An account with this email already exists. Try logging in.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network error. Check your internet connection."
  };
  return map[err.code] || "Something went wrong. Check js/firebase-config.js and try again.";
}

function setLoading(form, loading, label) {
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = loading;
  btn.textContent = loading ? "Please wait..." : label;
}

// ----- Log in -----
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#loginEmail").value.trim();
  const password = $("#loginPassword").value;
  if (!email || !password) return show("Enter your email and password.");
  setLoading(loginForm, true, "Log in");
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    show(friendlyError(err));
    setLoading(loginForm, false, "Log in");
  }
});

// ----- Register -----
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#regName").value.trim();
  const email = $("#regEmail").value.trim();
  const password = $("#regPassword").value;
  const confirm = $("#regConfirm").value;
  if (!name || !email || !password) return show("Fill in all the fields.");
  if (password.length < 6) return show("Password must be at least 6 characters.");
  if (password !== confirm) return show("Passwords do not match.");
  setLoading(registerForm, true, "Create account");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
  } catch (err) {
    show(friendlyError(err));
    setLoading(registerForm, false, "Create account");
  }
});

// ----- Forgot password -----
$("#forgotBtn").addEventListener("click", async () => {
  const email = $("#loginEmail").value.trim();
  if (!email) return show("Type your email above, then select Forgot password.");
  try {
    await sendPasswordResetEmail(auth, email);
    show("Password reset link sent. Check your inbox.", "success");
  } catch (err) {
    show(friendlyError(err));
  }
});
