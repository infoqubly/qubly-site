/**
 * Spotlight Cursor Effect
 * Ported from React to Vanilla JS
 */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('spotlight-canvas');
    if (!canvas) return; // safety check

    // Set z-index to 2 (Above background texture (1), below content (10))
    canvas.style.zIndex = '2';

    const ctx = canvas.getContext('2d');

    const config = {
        baseRadius: 250, // Larger radius per request
        smoothing: 0.1
    };

    let width = window.innerWidth;
    let height = window.innerHeight;

    // Mouse state
    const mouse = { x: width / 2, y: height / 2 };
    const currentMouse = { x: width / 2, y: height / 2 };

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }

    window.addEventListener('resize', resize);
    resize();

    const cursorDot = document.getElementById('cursor-dot');

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;

        // Instant cursor movement
        if (cursorDot) {
            cursorDot.style.left = `${mouse.x}px`;
            cursorDot.style.top = `${mouse.y}px`;
        }
    });

    // Add hover effect for interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .scroll-trigger-zone, input, label, select, textarea, .case-card, .close-popup, .menu-toggle, .menu-item, .contact-trigger');

    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursorDot.classList.add('active'));
        el.addEventListener('mouseleave', () => cursorDot.classList.remove('active'));
    });

    function lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    function render() {
        // Smooth movement
        currentMouse.x = lerp(currentMouse.x, mouse.x, config.smoothing);
        currentMouse.y = lerp(currentMouse.y, mouse.y, config.smoothing);

        // Pulse Effect (Breathing light)
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 2) * 10; // Speed 2, Amplitude 10px
        const currentRadius = config.baseRadius + pulse;

        ctx.clearRect(0, 0, width, height);

        // 1. Fill the screen with Darkness
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.90)'; // Check 0.90 as requested
        ctx.fillRect(0, 0, width, height);

        // 2. Erase the "Light" (Cut a hole)
        ctx.globalCompositeOperation = 'destination-out';

        const gradient = ctx.createRadialGradient(
            currentMouse.x,
            currentMouse.y,
            0,
            currentMouse.x,
            currentMouse.y,
            currentRadius
        );

        // Opaque center = Remove darkness completely
        // Transparent edge = Keep darkness
        // Opaque center to transparent edge
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');

        // This intermediate stop helps visualize the "breathing" slightly better than a linear 0-1
        // by keeping the center clearer for longer
        gradient.addColorStop(0.3, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(currentMouse.x, currentMouse.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        // Reset for next frame
        ctx.globalCompositeOperation = 'source-over';

        requestAnimationFrame(render);
    }

    render();
});
