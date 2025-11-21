// main.js - 打字机 + 汉堡菜单功能

// ================= 打字机效果 =================
const mottoText = "/*江南无所有，聊赠一枝春*/";
// [改动] 使用新的 BEM 类名
const mottoEl = document.querySelector(".hero__motto"); 
const descEl = document.querySelector(".hero__description");
let index = 0;

function typeWriter() {
    if (index < mottoText.length) {
        mottoEl.textContent += mottoText.charAt(index);
        index++;
        setTimeout(typeWriter, 100);
    } else {
        // 打字机完成后淡入描述文字
        if (descEl) {
            descEl.style.opacity = 1;
            descEl.style.transition = "opacity 1s ease-in";
        }
    }
}

// 页面加载后执行打字机效果
window.addEventListener("load", () => {
    if (mottoEl) {
        mottoEl.textContent = ""; // 清空初始内容
        typeWriter();
    }
});

// ================= 汉堡菜单功能 =================
// [改动] 统一使用 querySelector 和新类名
const navToggle = document.querySelector(".navbar__toggle"); 
// [改动] 使用新的 BEM 类名
const navMenu = document.querySelector(".navbar__menu"); 

if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
        navMenu.classList.toggle("active");
        navToggle.classList.toggle("active"); // 可配合CSS动画
    });

    // 点击菜单项后自动关闭菜单（移动端友好）
    // [改动] 更精确地选中 .navbar__link，而不是所有 'a' 标签
    const navLinks = navMenu.querySelectorAll(".navbar__link"); 
    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            if (navMenu.classList.contains("active")) {
                navMenu.classList.remove("active");
                navToggle.classList.remove("active");
            }
        });
    });
}