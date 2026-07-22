import {
    getFirestore,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const auth = window._auth;
const db = getFirestore();

let currentUid = null;

// ログイン状態を確認（新規登録直後でも uid が取れる）
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUid = user.uid;
    }
});

window.selectPlan = async function(plan) {
    if (!currentUid) {
        document.getElementById("error-msg").textContent = "ユーザー情報が取得できません。";
        return;
    }

    await updateDoc(doc(db, "users", currentUid), {
        plan: plan
    });

    // プラン選択後 → index.html へ
    window.location.href = "index.html";
};
