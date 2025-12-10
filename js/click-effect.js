document.addEventListener('click', function(e) {
    const circle = document.createElement('div');
    const size = 20; // Initial size
    
    // Get click coordinates
    const x = e.clientX;
    const y = e.clientY;
    
    // Set styles for the effect
    circle.style.position = 'fixed';
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
    circle.style.width = `${size}px`;
    circle.style.height = `${size}px`;
    circle.style.borderRadius = '50%';
    circle.style.pointerEvents = 'none'; // Don't block other interactions
    circle.style.transform = 'translate(-50%, -50%) scale(0)';
    circle.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
    circle.style.zIndex = '9999';
    
    // Determine color based on theme (optional, or just use a neutral/accent color)
    // Using a semi-transparent blue/purple for a "tech" feel
    circle.style.border = '2px solid rgba(59, 130, 246, 0.6)'; // Blue-500
    circle.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    circle.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.4)';

    document.body.appendChild(circle);

    // Trigger animation
    requestAnimationFrame(() => {
        circle.style.transform = 'translate(-50%, -50%) scale(2.5)';
        circle.style.opacity = '0';
    });

    // Cleanup
    setTimeout(() => {
        circle.remove();
    }, 500);
});
