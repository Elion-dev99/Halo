// assets/js/authCheck.js

import { onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

// login.html で初期化した auth を使う
const auth = window._auth;

// ログイン状態を監視
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ログイン済み
        console.log("ログイン中:", user.email);
    } else {
        // 未ログイン → login.html に強制移動
        window.location.href = "login.html";
    }
});
