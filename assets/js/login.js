// assets/js/login.js

import { 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

// login.html で初期化した auth を使う
const auth = window._auth;

// ログインボタン押下
document.getElementById("login-btn").addEventListener("click", () => {

    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    // 空欄チェック（最低限）
    if (!email || !pass) {
        alert("メールアドレスとパスワードを入力してください");
        return;
    }

    // Firebase メールログイン
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => {
            // ログイン成功 → Halo のメイン画面へ
            window.location.href = "index.html";
        })
        .catch(err => {
            alert("ログイン失敗: " + err.message);
        });
});
