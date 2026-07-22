import { 
    createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const auth = window._auth;
const db = getFirestore();

document.getElementById("register-btn").addEventListener("click", () => {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    const errorMsg = document.getElementById("error-msg");

    errorMsg.textContent = "";

    if (!email || !pass) {
        errorMsg.textContent = "メールアドレスとパスワードを入力してください。";
        return;
    }

    createUserWithEmailAndPassword(auth, email, pass)
        .then(async (userCredential) => {
            const uid = userCredential.user.uid;

            // Firestore にユーザー情報を保存
            await setDoc(doc(db, "users", uid), {
                email: email,
                role: "user",
                status: "active",
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });

            // 登録後ログイン画面へ
            window.location.href = "plan.html";
        })
        .catch(err => {
            errorMsg.textContent = "登録失敗：" + err.message;
        });
});
