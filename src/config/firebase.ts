import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const REQUIRED_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

function readEnv(name: (typeof REQUIRED_KEYS)[number]): string | undefined {
  const value = import.meta.env[name];
  if (!value || String(value).startsWith("your_")) return undefined;
  return value;
}

export function getMissingFirebaseEnv(): string[] {
  return REQUIRED_KEYS.filter((key) => !readEnv(key));
}

export const firebaseConfigError =
  getMissingFirebaseEnv().length > 0
    ? `Firebase 環境変数が未設定です: ${getMissingFirebaseEnv().join(", ")}`
    : null;

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (!firebaseConfigError) {
  const firebaseConfig = {
    apiKey: readEnv("VITE_FIREBASE_API_KEY")!,
    authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN")!,
    projectId: readEnv("VITE_FIREBASE_PROJECT_ID")!,
    storageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET")!,
    messagingSenderId: readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID")!,
    appId: readEnv("VITE_FIREBASE_APP_ID")!,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
}

export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;
export default app;
