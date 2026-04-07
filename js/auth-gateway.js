import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  setDoc,
  serverTimestamp,
  doc,
  limit
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = window.EXPLYRA_CONFIG?.firebase || {
  apiKey: "AIzaSyDadazHFf525KrsOoQWUP5yJ7q7uxyf3lw",
  authDomain: "explyras.firebaseapp.com",
  projectId: "explyras",
  storageBucket: "explyras.firebasestorage.app",
  messagingSenderId: "411853553644",
  appId: "1:411853553644:web:eca79eab846b6a5149cac9"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

const MANAGEMENT_ROLES = new Set([
  "ADMIN",
  "MANAGER",
  "SENIOR_MANAGER",
  "TREASURY",
  "AUDIT",
  "HR",
  "FINANCE_MANAGER",
  "ACCOUNTS"
]);

function normalizeIdentifier(identifier) {
  return String(identifier || "").trim().toLowerCase();
}

function isDevEmail(email) {
  const value = normalizeIdentifier(email);
  return value === "explyras@gmail.com" || value === "explyra@gmail.com" || value.endsWith("@explyra.com");
}

function toPhoneFormats(identifier) {
  const digits = String(identifier || "").replace(/\D/g, "");
  if (!digits) return [];

  if (digits.length === 10) {
    return [digits, `91${digits}`, `+91${digits}`];
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return [digits, `+${digits}`, digits.slice(2)];
  }
  if (digits.length >= 10 && digits.length <= 13) {
    return [digits, `+${digits}`];
  }
  return [];
}

async function getUserByEmail(email) {
  const normalized = normalizeIdentifier(email);
  if (!normalized) return null;
  const snap = await getDocs(query(collection(db, "users"), where("email", "==", normalized), limit(1)));
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function resolveUserIdentity(identifier) {
  const input = normalizeIdentifier(identifier);
  if (!input) return null;

  if (isDevEmail(input)) {
    return {
      id: "dev",
      email: input,
      role: "ADMIN",
      status: "ACTIVE",
      companyId: "EXPLYRA",
      name: "Explyra Developer"
    };
  }

  const emailMatch = await getUserByEmail(input);
  if (emailMatch) return emailMatch;

  const phoneFormats = [...new Set(toPhoneFormats(input))];
  for (const value of phoneFormats) {
    const byPhone = await getDocs(query(collection(db, "users"), where("phone", "==", value), limit(1)));
    if (!byPhone.empty) return { id: byPhone.docs[0].id, ...byPhone.docs[0].data() };

    const byAltPhone = await getDocs(query(collection(db, "users"), where("altPhone", "==", value), limit(1)));
    if (!byAltPhone.empty) return { id: byAltPhone.docs[0].id, ...byAltPhone.docs[0].data() };
  }

  const altEmail = await getDocs(query(collection(db, "users"), where("altEmail", "==", input), limit(1)));
  if (!altEmail.empty) return { id: altEmail.docs[0].id, ...altEmail.docs[0].data() };

  return null;
}

async function resolveEmailToPrimary(identifier) {
  const user = await resolveUserIdentity(identifier);
  return user?.email || normalizeIdentifier(identifier);
}

function isActiveUser(userData) {
  if (!userData) return false;
  return userData.status === "ACTIVE" || !!userData.uid;
}

function buildTargetPath(userData, fallbackNext) {
  const forced = String(fallbackNext || "").trim();
  if (forced === "admin.html" || forced === "emp.html" || forced === "company.html") {
    return forced;
  }

  const role = String(userData?.role || "EMPLOYEE").toUpperCase();
  return MANAGEMENT_ROLES.has(role) ? "admin.html" : "emp.html";
}

function tenantAwarePath(path, companyId) {
  if (window.ExplyraTenant?.toTenantAwareHref) {
    return window.ExplyraTenant.toTenantAwareHref(path, { companyId, forcePrefix: true }) || path;
  }
  return path;
}

async function redirectForUser(userData, fallbackNext) {
  const destination = buildTargetPath(userData, fallbackNext);
  const href = tenantAwarePath(destination, userData?.companyId || null);
  window.location.replace(href);
}

async function signInWithIdentifier(identifier, password) {
  const resolvedEmail = await resolveEmailToPrimary(identifier);
  await signInWithEmailAndPassword(auth, resolvedEmail, password);
  const userData = await getUserByEmail(resolvedEmail);
  return { resolvedEmail, userData };
}

async function activateExistingAccount(email, password) {
  const normalizedEmail = normalizeIdentifier(email);
  const userData = await getUserByEmail(normalizedEmail);
  if (!userData) {
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    const createdUser = {
      uid: credential.user.uid,
      email: normalizedEmail,
      name: credential.user.displayName || normalizedEmail.split('@')[0],
      role: "ADMIN",
      status: "ACTIVE",
      companyId: null,
      authProvider: "password",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, "users", credential.user.uid), createdUser);
    return { userData: { id: credential.user.uid, ...createdUser } };
  }

  if (isActiveUser(userData)) throw new Error("Account already active. Please sign in.");

  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  if (userData.id && userData.id !== "dev") {
    await updateDoc(doc(db, "users", userData.id), {
      uid: credential.user.uid,
      status: "ACTIVE",
      updatedAt: serverTimestamp()
    });
  }

  return { userData: { ...userData, uid: credential.user.uid, status: "ACTIVE" } };
}

async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");

  const result = await signInWithPopup(auth, provider);
  const email = normalizeIdentifier(result.user?.email || "");
  const userData = await getUserByEmail(email);
  if (!userData && !isDevEmail(email)) {
    await signOut(auth);
    throw new Error(`Access denied for ${email || "this account"}.`);
  }

  if (userData?.id && userData.id !== "dev") {
    await updateDoc(doc(db, "users", userData.id), {
      uid: result.user.uid,
      authProvider: "google",
      status: "ACTIVE",
      updatedAt: serverTimestamp()
    });
  }

  return { userData };
}

async function sendReset(identifierOrEmail) {
  const resolved = await resolveEmailToPrimary(identifierOrEmail);
  await sendPasswordResetEmail(auth, resolved);
  return resolved;
}

function observeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

window.ExplyraAuthGateway = {
  auth,
  db,
  MANAGEMENT_ROLES,
  resolveUserIdentity,
  resolveEmailToPrimary,
  getUserByEmail,
  signInWithIdentifier,
  activateExistingAccount,
  signInWithGoogle,
  sendReset,
  observeAuthState,
  isActiveUser,
  redirectForUser
};
