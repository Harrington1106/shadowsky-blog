// contact.js - 联系页面专属交互逻辑

document.addEventListener('DOMContentLoaded', function() {
    
    // ----------------------------------------
    // 1. 联系表单处理
    // ----------------------------------------
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault(); 

            // 获取表单数据
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;

            // 在实际应用中，这里应该使用 fetch/XMLHttpRequest 将数据发送到服务器
            // 
            // 示例：
            // fetch('/api/contact', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ name, email, subject, message })
            // })
            // .then(response => response.json())
            // .then(data => {
            //     // 处理服务器响应
            // });

            // 客户端模拟处理和反馈
            console.log('表单提交:', { name, email, subject, message });

            // 显示成功消息
            alert('消息已发送！感谢您的联系，我会尽快回复。');

            // 重置表单
            this.reset();
        });
    }

    // ----------------------------------------
    // 2. 汉堡菜单功能 (通用导航)
    // ----------------------------------------
    const navToggle = document.getElementById("navToggle");
    const navMenu = document.querySelector(".navbar-menu");
    
    if (navToggle && navMenu) {
        navToggle.addEventListener("click", () => {
            navMenu.classList.toggle("active");
        });
        
        // 确保点击菜单项后也能关闭 (通常用于移动端)
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    navMenu.classList.remove('active');
                }
            });
        });
    }
});