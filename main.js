// 打字机效果
const mottoText = "/*江南无所有，聊赠一枝春*/"; const mottoEl = document.querySelector(".motto"); const descEl = document.querySelector(".description"); let index = 0; function typeWriter() {
	if (index < mottoText.length) { mottoEl.textContent += mottoText.charAt(index); index++; setTimeout(typeWriter, 100); } else {
		// 打字机完成后淡入描述文字（需要添加对应的 CSS）
		descEl.style.opacity = 1; descEl.style.transition = "opacity 1s ease-in";
	}
}
// 页面加载后执行打字机效果 
window.addEventListener("load", () => {
	if (mottoEl) {
		mottoEl.textContent = "";
		// 清空初始内容 
		typeWriter();
	}
});
// 汉堡菜单功能 
const navToggle = document.getElementById("navToggle"); const navMenu = document.querySelector(".navbar-menu"); if (navToggle && navMenu) { navToggle.addEventListener("click", () => { navMenu.classList.toggle("active"); }); }