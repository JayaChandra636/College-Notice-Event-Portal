// ---------- FIREBASE ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAfL_8NbxEEMQmJ9iH28gMjEBkAiHpngis",
  authDomain: "collage-notice.firebaseapp.com",
  projectId: "collage-notice",
  storageBucket: "collage-notice.firebasestorage.app",
  messagingSenderId: "379595938114",
  appId: "1:379595938114:web:c3dedb7e38c98dd678d0db"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ---------- GLOBAL DATA ----------
let notices = [];
let events = [];
let searchTerm = "";
let roleType = "student";


// ---------- SEARCH ----------
const searchInput = document.getElementById("searchInput");
const noticesEl = document.getElementById("notices");
const eventsEl = document.getElementById("events");

if (searchInput) {
  searchInput.addEventListener("input", e => {
    searchTerm = e.target.value.toLowerCase();
    render();
  });
}


// ---------- THEME ----------
const themeBtn = document.getElementById("themeBtn");

function updateThemeIcon() {
  themeBtn.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
}

window.toggleTheme = () => {
  document.body.classList.toggle("dark");
  updateThemeIcon();
};


// ---------- LOGIN ----------
window.login = async () => {

  if (!username.value || !password.value) {
    alert("Enter credentials");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      username.value,
      password.value
    );

    const user = userCredential.user;

    // read user profile
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      alert("User profile missing — please signup again.");
      return;
    }

    const userData = userSnap.data();
    roleType = userData.role || "student";

    // UI switching
    loginPage.classList.add("hidden");
    dashboard.classList.remove("hidden");
    topActions.classList.remove("hidden");

    profileName.textContent = user.email;
    avatar.textContent = user.email[0].toUpperCase();

    if (roleType === "admin") {
      adminControls.classList.remove("hidden");
    }

    listenToNotices();
    listenToEvents();
    updateThemeIcon();

  } catch (err) {
    alert("Login failed: " + err.message);
  }
};


// ---------- SIGNUP ----------
window.signup = async () => {

  if (!signupEmail.value || !signupPass.value || !signupName.value) {
    alert("Fill all fields");
    return;
  }

  try {
    // create auth user
    const result = await createUserWithEmailAndPassword(
      auth,
      signupEmail.value,
      signupPass.value
    );

    const user = result.user;

    // create Firestore profile USING UID
    await setDoc(doc(db, "users", user.uid), {
      name: signupName.value,
      email: signupEmail.value,
      role: "student"
    });

    alert("Account created successfully! Please login.");
    showLogin();

  } catch (err) {

    if (err.code === "auth/email-already-in-use") {
      alert("Email already registered. Please login instead.");
    } else if (err.code === "permission-denied") {
      alert("Firestore permission denied. Fix rules in console.");
    } else {
      alert("Signup failed: " + err.message);
    }
  }
};


// ---------- PAGE TOGGLES ----------
window.showSignup = () => {
  loginPage.classList.add("hidden");
  signupPage.classList.remove("hidden");
};

window.showLogin = () => {
  signupPage.classList.add("hidden");
  loginPage.classList.remove("hidden");
};


// ---------- PROFILE ----------
window.toggleProfile = () => {
  profilePanel.style.display =
    profilePanel.style.display === "block" ? "none" : "block";
};

window.logout = () => location.reload();


// ---------- CRUD ----------
window.addNotice = async () => {
  if (!noticeText.value) return;

  await addDoc(collection(db, "notices"), {
    text: noticeText.value,
    important: importantNotice.checked,
    time: new Date().toLocaleString()
  });

  noticeText.value = "";
  importantNotice.checked = false;
};

window.addEvent = async () => {
  if (!eventTitle.value) return;

  await addDoc(collection(db, "events"), {
    title: eventTitle.value,
    desc: eventDesc.value,
    date: eventDate.value
  });

  eventTitle.value = eventDesc.value = eventDate.value = "";
};

// ---------- DELETE ----------
window.deleteNotice = async (id) => {
  try {
    await deleteDoc(doc(db, "notices", id));
    alert("Notice deleted");
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
};

window.deleteEvent = async (id) => {
  try {
    await deleteDoc(doc(db, "events", id));
    alert("Event deleted");
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
};


// ---------- LISTEN REALTIME ----------
function listenToNotices() {
  onSnapshot(collection(db, "notices"), snapshot => {
    notices = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
}

function listenToEvents() {
  onSnapshot(collection(db, "events"), snapshot => {
    events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
}


// ---------- RENDER ----------
function render() {

  const filteredNotices = notices.filter(n =>
    n.text.toLowerCase().includes(searchTerm)
  );

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(searchTerm) ||
    e.desc.toLowerCase().includes(searchTerm)
  );

  noticesEl.innerHTML =
    filteredNotices.map(n => `
      <div class="notice glass ${n.important ? "important" : ""}">
        ${roleType === "admin" ?
          `<button class="delete-btn" onclick="deleteNotice('${n.id}')">Delete</button>` : ""}
        ${n.text}
        <div class="time">${n.time}</div>
      </div>
    `).join("");

  eventsEl.innerHTML =
    filteredEvents.map(e => `
      <div class="event glass">
        ${roleType === "admin" ?
          `<button class="delete-btn" onclick="deleteEvent('${e.id}')">Delete</button>` : ""}
        <strong>${e.title}</strong><br>
        ${e.desc}
        <div class="time">${e.date}</div>
      </div>
    `).join("");
}
