import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { auth, db } from "../config/firebase.js";
import { doc, setDoc, getDoc } from "firebase/firestore";

/**
 * ユーザー登録
 * @param {string} email - メールアドレス
 * @param {string} password - パスワード
 * @param {Object} userData - ユーザー情報 (name, company, etc.)
 */
export const registerUser = async (email, password, userData = {}) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // プロフィール更新
    await updateProfile(user, {
      displayName: userData.name || email.split("@")[0]
    });

    // Firestoreにユーザー情報を保存
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      name: userData.name || email.split("@")[0],
      company: userData.company || "",
      role: userData.role || "user",
      department: userData.department || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    });

    return user;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};

/**
 * ユーザーログイン
 * @param {string} email - メールアドレス
 * @param {string} password - パスワード
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

/**
 * ユーザーログアウト
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

/**
 * ユーザー情報を取得
 * @param {string} uid - ユーザーID
 */
export const getUserData = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
};

/**
 * 認証状態の変更を監視
 * @param {Function} callback - コールバック関数
 */
export const watchAuthState = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userData = await getUserData(user.uid);
      callback({ ...user, ...userData });
    } else {
      callback(null);
    }
  });
};