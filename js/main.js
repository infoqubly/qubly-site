document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const menuToggle = document.querySelector('.menu-toggle');
    const fullscreenMenu = document.querySelector('.fullscreen-menu');
    const scrollArrow = document.querySelector('.scroll-arrow');
    const menuItems = document.querySelectorAll('.menu-item');

    // Contact Popup Elements
    const contactTriggers = document.querySelectorAll('.contact-trigger-link'); // Class for email link & generic triggers
    const contactPopup = document.getElementById('contact-popup');
    const closePopupBtn = document.querySelector('.close-popup');
    const contactForm = contactPopup ? contactPopup.querySelector('form') : null;

    // --- MENU INTERACTION ---
    function toggleMenu() {
        document.body.classList.toggle('menu-open-body');
        menuToggle.classList.toggle('menu-open');
        fullscreenMenu.classList.toggle('active');

        if (fullscreenMenu.classList.contains('active')) {
            document.addEventListener('keydown', handleEscKey);
        } else {
            if (!contactPopup || !contactPopup.classList.contains('open')) {
                document.removeEventListener('keydown', handleEscKey);
            }
        }
    }

    function closeMenu() {
        document.body.classList.remove('menu-open-body');
        menuToggle.classList.remove('menu-open');
        fullscreenMenu.classList.remove('active');
    }

    function handleEscKey(e) {
        if (e.key === 'Escape') {
            if (contactPopup && contactPopup.classList.contains('open')) {
                closePopup();
            } else {
                closeMenu();
            }
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

    // --- CONTACT POPUP LOGIC ---
    function openPopup(e) {
        e.preventDefault(); // CRITICAL: Stop mailto or anchor jump if it's a trigger
        if (contactPopup) {
            contactPopup.classList.add('open');
            document.addEventListener('keydown', handleEscKey); // Ensure ESC works for popup
        }
    }

    function closePopup() {
        if (contactPopup) {
            contactPopup.classList.remove('open');
            // Remove ESC listener only if menu is also closed
            if (!fullscreenMenu.classList.contains('active')) {
                document.removeEventListener('keydown', handleEscKey);
            }
            // Reset form if desired?
            if (contactForm) contactForm.reset();
            const msg = contactPopup.querySelector('.success-message');
            if (msg) msg.remove();
            if (contactForm) contactForm.style.display = 'block';
        }
    }

    // Attach listeners to ALL triggers (email link, menu contact, etc.)
    contactTriggers.forEach(trigger => {
        trigger.addEventListener('click', openPopup);
    });

    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', closePopup);
    }

    if (contactPopup) {
        contactPopup.addEventListener('click', (e) => {
            if (e.target === contactPopup) {
                closePopup();
            }
        });
    }

    // --- FORM SUBMISSION (Simulated) ---
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault(); // STOP actual form submission

            // Collect data (for potential backend)
            const formData = new FormData(contactForm);
            // console.log("Form submitted locally:", Object.fromEntries(formData));

            // UI Feedback
            contactForm.style.display = 'none';

            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.innerHTML = `
                <h3 style="color: var(--QUBLY-WHITE); margin-bottom: 1rem;">Message Sent</h3>
                <p style="color: var(--QUBLY-GRAY);">Thank you for contacting us. We will reply shortly.</p>
                <button class="close-msg-btn" style="margin-top: 1.5rem; padding: 10px 20px; background: transparent; border: 1px solid var(--QUBLY-WHITE); color: var(--QUBLY-WHITE); cursor: pointer; text-transform: uppercase;">Close</button>
            `;

            contactPopup.querySelector('.contact-popup-content').appendChild(successMsg);

            successMsg.querySelector('.close-msg-btn').addEventListener('click', closePopup);
        });
    }


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
