/**
 * HappyCadogt Cat Cursor - DOM跟随方案
 * 浏览器限制 CSS cursor 最大 128px，改用 DOM 元素跟随鼠标实现任意大小
 */
(function() {
    'use strict';
    
    const SIZE = 80; // cursor size in px
    
    // Create cursor elements
    const defaultCursor = document.createElement('img');
    defaultCursor.src = 'public/cat-cursor-default.png';
    defaultCursor.style.cssText = `position:fixed;width:${SIZE}px;height:${SIZE}px;pointer-events:none;z-index:999999;transition:transform 0.05s ease-out;display:none;`;
    defaultCursor.id = 'cat-cursor-default';
    
    const pointerCursor = document.createElement('img');
    pointerCursor.src = 'public/cat-cursor-pointer.png';
    pointerCursor.style.cssText = `position:fixed;width:${SIZE}px;height:${SIZE}px;pointer-events:none;z-index:999999;transition:transform 0.05s ease-out;display:none;`;
    pointerCursor.id = 'cat-cursor-pointer';
    
    document.body.appendChild(defaultCursor);
    document.body.appendChild(pointerCursor);
    
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let isPointer = false;
    let isVisible = false;
    
    // Track mouse
    document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!isVisible) {
            isVisible = true;
            defaultCursor.style.display = 'block';
            pointerCursor.style.display = 'block';
            document.body.style.cursor = 'none';
        }
    });
    
    // Detect clickable elements
    document.addEventListener('mouseover', function(e) {
        const el = e.target.closest('a, button, [role="button"], input[type="submit"], select, [onclick], label[for]');
        isPointer = !!el;
    });
    
    // Restore default cursor when leaving page
    document.addEventListener('mouseleave', function() {
        isVisible = false;
        defaultCursor.style.display = 'none';
        pointerCursor.style.display = 'none';
        document.body.style.cursor = '';
    });
    
    document.addEventListener('mouseenter', function() {
        isVisible = true;
        defaultCursor.style.display = 'block';
        pointerCursor.style.display = 'block';
        document.body.style.cursor = 'none';
    });
    
    // Hide cursor when selecting text or using inputs
    document.addEventListener('mousedown', function(e) {
        const el = e.target.closest('input[type="text"], textarea, [contenteditable]');
        if (el) {
            defaultCursor.style.display = 'none';
            pointerCursor.style.display = 'none';
            document.body.style.cursor = '';
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (!document.querySelector('input:focus, textarea:focus, [contenteditable]:focus')) {
            defaultCursor.style.display = isVisible ? 'block' : 'none';
            pointerCursor.style.display = isVisible ? 'block' : 'none';
            document.body.style.cursor = 'none';
        }
    });
    
    // Animation loop
    function animate() {
        const dx = mouseX - cursorX;
        const dy = mouseY - cursorY;
        const speed = 0.3;
        cursorX += dx * speed;
        cursorY += dy * speed;
        
        if (isPointer) {
            defaultCursor.style.display = 'none';
            pointerCursor.style.display = 'block';
            pointerCursor.style.left = (cursorX - SIZE/2) + 'px';
            pointerCursor.style.top = (cursorY - SIZE/2) + 'px';
            pointerCursor.style.transform = 'scale(1.2)';
        } else {
            defaultCursor.style.display = 'block';
            pointerCursor.style.display = 'none';
            defaultCursor.style.left = (cursorX - SIZE/2) + 'px';
            defaultCursor.style.top = (cursorY - SIZE/2) + 'px';
            defaultCursor.style.transform = 'scale(1)';
        }
        
        requestAnimationFrame(animate);
    }
    animate();
})();
