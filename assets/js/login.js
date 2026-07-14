// assets/js/login.js
import { signInWithEmailAndPassword } 
    from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const auth = window._auth;

document.getElementById("login-btn").addEventListener("click", () => {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    signInWithEmailAndPassword(auth, email, pass)
        .then(() => {
            window.location.href = "index.html";
        })
        .catch(err => {
            alert("ログイン失敗: " + err.message);
        });
});
