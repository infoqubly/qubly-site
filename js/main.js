document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const menuToggle = document.querySelector('.menu-toggle');
    const fullscreenMenu = document.querySelector('.fullscreen-menu');
    const scrollArrow = document.querySelector('.scroll-arrow');
    const menuItems = document.querySelectorAll('.menu-item');

    // Contact Elements
    const contactTriggers = document.querySelectorAll('.contact-trigger-link');

    // --- MENU INTERACTION ---
    function toggleMenu() {
        document.body.classList.toggle('menu-open-body');
        menuToggle.classList.toggle('menu-open');
        fullscreenMenu.classList.toggle('active');

        if (fullscreenMenu.classList.contains('active')) {
            document.addEventListener('keydown', handleEscKey);
        } else {
            document.removeEventListener('keydown', handleEscKey);
        }
    }

    function closeMenu() {
        document.body.classList.remove('menu-open-body');
        menuToggle.classList.remove('menu-open');
        fullscreenMenu.classList.remove('active');
        document.removeEventListener('keydown', handleEscKey);
    }

    function handleEscKey(e) {
        if (e.key === 'Escape') {
            closeMenu();
        }
    }

    menuToggle.addEventListener('click', toggleMenu);

    // Close menu when clicking ANY link in the menu
    menuItems.forEach(item => {
        const link = item.querySelector('a');
        if (link) {
            link.addEventListener('click', () => {
                closeMenu();
                // If the link is a contact trigger, the contact trigger listener (below) will handle the popup
            });
        }
    });

    // --- COPY EMAIL LOGIC ---
    contactTriggers.forEach(trigger => {
        trigger.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = "info.qubly@gmail.com";
            try {
                await navigator.clipboard.writeText(email);
                const originalText = trigger.innerText;
                trigger.innerText = "Email copied!";
                setTimeout(() => {
                    trigger.innerText = originalText;
                }, 2000);
            } catch (err) {
                console.error("Failed to copy email: ", err);
            }
        });
    });


    // --- SMOOTH SCROLL ---
    // --- SMOOTH SCROLL ---
    const scrollTrigger = document.querySelector('.scroll-trigger-zone');
    if (scrollTrigger) {
        scrollTrigger.addEventListener('click', () => {
            const nextSection = document.querySelector('.section-wrapper');
            if (nextSection) {
                nextSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }

    // --- VIDEO FALLBACK ---
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        video.play().catch(e => {
            video.muted = true;
            video.play();
        });
    });

    // --- SCROLL REVEAL ANIMATION ---
    const revealItems = document.querySelectorAll('.reveal');

    if (revealItems.length > 0) {
        if ('IntersectionObserver' in window) {
            const revealObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const el = entry.target;
                        const delay = parseInt(el.getAttribute('data-delay') || '0', 10);

                        // Add delay
                        setTimeout(() => {
                            el.classList.add('is-visible');
                        }, delay);

                        // Unobserve after revealing to animate only once
                        observer.unobserve(el);
                    }
                });
            }, {
                root: null,
                threshold: 0.15, // Trigger when 15% visible
                rootMargin: '0px 0px -10% 0px'
            });

            revealItems.forEach(el => revealObserver.observe(el));
        } else {
            // Fallback for older browsers
            revealItems.forEach(el => el.classList.add('is-visible'));
        }
    }
});
