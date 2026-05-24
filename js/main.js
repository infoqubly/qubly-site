document.addEventListener("DOMContentLoaded", () => {
    const docEl = document.documentElement;
    const body = document.body;
    const menuToggle = document.querySelector(".menu-toggle");
    const fullscreenMenu = document.querySelector(".fullscreen-menu");
    const menuLinks = Array.from(document.querySelectorAll(".menu-item a"));
    const scrollTrigger = document.querySelector(".scroll-trigger-zone");
    const logo = document.querySelector(".logo");
    const contactTriggers = document.querySelectorAll(".contact-trigger-link");
    const revealItems = Array.from(document.querySelectorAll(".reveal"));
    const visualFlow = document.getElementById("visual-flow");
    const firstCaseGroup = document.querySelector("#case-studies .case-group");
    const scrollShowcaseCards = Array.from(document.querySelectorAll(".scroll-showcase-card"));
    const isHomePage = body.classList.contains("home-page");
    const isSnapPage = isHomePage || body.classList.contains("about-page-body");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const revealTimers = new WeakMap();

    function updateScrollbarWidth() {
        const scrollbarWidth = Math.max(0, window.innerWidth - docEl.clientWidth);
        docEl.style.setProperty("--scrollbar-width", `${scrollbarWidth}px`);
    }

    updateScrollbarWidth();
    window.addEventListener("resize", updateScrollbarWidth);

    function isDesktopSnapEnabled() {
        return isSnapPage
            && !prefersReducedMotion.matches
            && window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
    }

    function closeMenu() {
        if (!menuToggle || !fullscreenMenu) {
            return;
        }

        body.classList.remove("menu-open-body");
        menuToggle.classList.remove("menu-open");
        fullscreenMenu.classList.remove("active");
        document.removeEventListener("keydown", handleEscKey);
    }

    function toggleMenu() {
        if (!menuToggle || !fullscreenMenu) {
            return;
        }

        body.classList.toggle("menu-open-body");
        menuToggle.classList.toggle("menu-open");
        fullscreenMenu.classList.toggle("active");

        if (fullscreenMenu.classList.contains("active")) {
            document.addEventListener("keydown", handleEscKey);
        } else {
            document.removeEventListener("keydown", handleEscKey);
        }
    }

    function handleEscKey(event) {
        if (event.key === "Escape") {
            closeMenu();
        }
    }

    function clearRevealTimer(element) {
        const timerId = revealTimers.get(element);
        if (timerId) {
            window.clearTimeout(timerId);
            revealTimers.delete(element);
        }
    }

    function showRevealImmediately(element) {
        clearRevealTimer(element);
        element.classList.add("is-visible");
    }

    function hideReveal(element) {
        clearRevealTimer(element);
        element.classList.remove("is-visible");
    }

    function flushDelayedReveals(scope) {
        if (!scope) {
            return false;
        }

        const delayedReveals = Array.from(scope.querySelectorAll(".reveal"))
            .filter((element) => Number.parseInt(element.getAttribute("data-delay") || "0", 10) > 0)
            .filter((element) => !element.classList.contains("is-visible"));

        delayedReveals.forEach((element) => showRevealImmediately(element));
        return delayedReveals.length > 0;
    }

    if (menuToggle) {
        menuToggle.addEventListener("click", toggleMenu);
    }

    document.querySelectorAll(".case-snapshots .case-card[href='#']").forEach((card) => {
        card.addEventListener("click", (event) => {
            event.preventDefault();
        });
    });

    if (logo) {
        logo.addEventListener("click", (event) => {
            const isHomeLocation = window.location.pathname.endsWith("index.html")
                || window.location.pathname.endsWith("/");

            if (!isHomeLocation) {
                return;
            }

            event.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
            closeMenu();
        });
    }

    function getScrollDestination(target) {
        if (!target) {
            return 0;
        }

        const offsetRatio = Number.parseFloat(target.dataset.snapOffset || "0");
        const targetTop = target.getBoundingClientRect().top + window.scrollY;
        return Math.max(0, Math.round(targetTop - (window.innerHeight * offsetRatio)));
    }

    function scrollToTarget(target) {
        if (!target) {
            return;
        }

        window.scrollTo({
            top: getScrollDestination(target),
            behavior: "smooth"
        });
    }

    function resolveViewportOffsetFromCssVar(element, cssVarName) {
        if (!element) {
            return 0;
        }

        const rawValue = window.getComputedStyle(element).getPropertyValue(cssVarName).trim();
        if (!rawValue) {
            return 0;
        }

        if (rawValue.endsWith("vh")) {
            return (window.innerHeight * Number.parseFloat(rawValue || "0")) / 100;
        }

        return Number.parseFloat(rawValue || "0") || 0;
    }

    function getVisualFlowScrollMetrics() {
        if (!visualFlow) {
            return null;
        }

        const showcaseStack = visualFlow.querySelector(".scroll-showcase-stack");
        const showcaseStage = visualFlow.querySelector(".scroll-showcase-stage");
        if (!showcaseStack || !showcaseStage) {
            return null;
        }

        const stackTop = showcaseStack.getBoundingClientRect().top + window.scrollY;
        const stageHeight = showcaseStage.offsetHeight;
        const stageTopPx = resolveViewportOffsetFromCssVar(visualFlow, "--showcase-stage-top");
        const availableScroll = Math.max(1, showcaseStack.offsetHeight - stageHeight);
        const pinStart = stackTop - stageTopPx;
        const pinEnd = pinStart + availableScroll;

        return {
            availableScroll,
            pinEnd,
            pinStart,
            stackTop,
            stageHeight,
            stageTopPx
        };
    }

    function getVisualFlowSnapMetrics() {
        if (!visualFlow) {
            return null;
        }

        const flowMetrics = getVisualFlowScrollMetrics();
        const header = visualFlow.querySelector(".scroll-showcase-header");
        const defaultEntryTop = getScrollDestination(visualFlow);
        const headerTop = header
            ? header.getBoundingClientRect().top + window.scrollY
            : visualFlow.getBoundingClientRect().top + window.scrollY;
        const entryTop = Math.round(headerTop - (window.innerHeight * 0.18));
        const exitTop = flowMetrics
            ? Math.max(defaultEntryTop + 1, Math.round(flowMetrics.stackTop + flowMetrics.availableScroll))
            : defaultEntryTop;

        return {
            entryTop: Math.min(defaultEntryTop, Math.max(0, entryTop)),
            exitTop,
            flowMetrics
        };
    }

    function isInsideVisualFlowZone(scrollTop = window.scrollY) {
        if (!visualFlow) {
            return false;
        }

        const snapMetrics = getVisualFlowSnapMetrics();
        if (!snapMetrics) {
            return false;
        }

        const zoneStart = Math.max(0, snapMetrics.entryTop - Math.round(window.innerHeight * 0.08));
        const zoneEnd = snapMetrics.exitTop + Math.round(window.innerHeight * 0.08);
        return scrollTop >= zoneStart && scrollTop <= zoneEnd;
    }

    function initScrollShowcase() {
        if (scrollShowcaseCards.length === 0 || !visualFlow) {
            return;
        }

        const desktopMotionQuery = window.matchMedia("(min-width: 768px)");
        const mobileQuery = window.matchMedia("(max-width: 767px)");
        const showcaseStack = visualFlow.querySelector(".scroll-showcase-stack");
        const showcaseStage = visualFlow.querySelector(".scroll-showcase-stage");
        let showcaseTicking = false;

        if (!showcaseStack || !showcaseStage) {
            return;
        }

        visualFlow.classList.add("is-enhanced");

        scrollShowcaseCards.forEach((card, index) => {
            card.style.zIndex = `${index + 1}`;
        });

        function resetShowcaseStyles() {
            showcaseStage.style.position = "";
            showcaseStage.style.top = "";
            showcaseStage.style.left = "";
            showcaseStage.style.right = "";
            showcaseStage.style.width = "";

            scrollShowcaseCards.forEach((card, index) => {
                card.style.transform = "";
                card.style.opacity = "1";
                card.classList.toggle("is-active", index === 0);

                const image = card.querySelector("img");
                if (image) {
                    image.style.transform = "";
                }
            });
        }

        function clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        }

        function updateShowcase() {
            showcaseTicking = false;

            if (mobileQuery.matches) {
                resetShowcaseStyles();
                return;
            }

            const stageHeight = showcaseStage.offsetHeight;
            const stackRect = showcaseStack.getBoundingClientRect();
            const stackTop = stackRect.top + window.scrollY;
            const availableScroll = Math.max(1, showcaseStack.offsetHeight - stageHeight);
            const stageTopPx = resolveViewportOffsetFromCssVar(visualFlow, "--showcase-stage-top");
            const pinStart = stackTop - stageTopPx;
            const pinEnd = pinStart + availableScroll;
            const currentScroll = clamp(window.scrollY - stackTop, 0, availableScroll);
            const segment = availableScroll / Math.max(1, scrollShowcaseCards.length - 1);
            const progress = segment > 0 ? currentScroll / segment : 0;
            const activeIndex = clamp(Math.floor(progress + 0.55), 0, scrollShowcaseCards.length - 1);
            const reduceMotion = prefersReducedMotion.matches;

            if (window.scrollY <= pinStart) {
                showcaseStage.style.position = "absolute";
                showcaseStage.style.top = "0px";
                showcaseStage.style.left = "0";
                showcaseStage.style.right = "0";
                showcaseStage.style.width = "";
            } else if (window.scrollY >= pinEnd) {
                showcaseStage.style.position = "absolute";
                showcaseStage.style.top = `${availableScroll}px`;
                showcaseStage.style.left = "0";
                showcaseStage.style.right = "0";
                showcaseStage.style.width = "";
            } else {
                showcaseStage.style.position = "fixed";
                showcaseStage.style.top = `${stageTopPx}px`;
                showcaseStage.style.left = `${stackRect.left}px`;
                showcaseStage.style.right = "";
                showcaseStage.style.width = `${stackRect.width}px`;
            }

            scrollShowcaseCards.forEach((card, index) => {
                const image = card.querySelector("img");
                const startOffset = index === 0 ? 0 : Math.min(116, 104 + ((index - 1) * 2));
                const localProgress = index === 0 ? 1 : clamp(progress - (index - 1), 0, 1);
                const easedProgress = reduceMotion
                    ? localProgress
                    : 1 - Math.pow(1 - localProgress, 3);
                const translatePercent = index === 0 ? 0 : startOffset * (1 - easedProgress);
                const speed = Number.parseFloat(image?.dataset.speed || "0.92");
                const imageShift = reduceMotion
                    ? 0
                    : (index === 0
                        ? -currentScroll * 0.012
                        : -((translatePercent / 100) * stageHeight) * (1 - speed + 0.14));

                card.classList.toggle("is-active", index === activeIndex);
                card.style.transform = `translate3d(0, ${translatePercent.toFixed(3)}%, 0)`;
                card.style.opacity = index === 0 || localProgress > 0 ? "1" : "0";

                if (image) {
                    image.style.transform = `translate3d(0, ${imageShift.toFixed(2)}px, 0) scale(1.035)`;
                }
            });
        }

        function scheduleShowcaseUpdate() {
            if (showcaseTicking) {
                return;
            }

            showcaseTicking = true;
            window.requestAnimationFrame(updateShowcase);
        }

        window.addEventListener("scroll", scheduleShowcaseUpdate, { passive: true });
        window.addEventListener("resize", scheduleShowcaseUpdate, { passive: true });
        window.addEventListener("load", scheduleShowcaseUpdate);
        prefersReducedMotion.addEventListener?.("change", scheduleShowcaseUpdate);
        desktopMotionQuery.addEventListener?.("change", scheduleShowcaseUpdate);
        scheduleShowcaseUpdate();
    }

    menuLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            closeMenu();

            const href = link.getAttribute("href") || "";
            if (!isHomePage || !href.startsWith("#")) {
                return;
            }

            const target = document.querySelector(href);
            if (!target) {
                return;
            }

            event.preventDefault();
            scrollToTarget(target);
        });
    });

    contactTriggers.forEach((trigger) => {
        trigger.addEventListener("click", async (event) => {
            if (trigger.getAttribute("href") && trigger.getAttribute("href") !== "#") {
                return;
            }

            event.preventDefault();
            const email = "info.qubly@gmail.com";

            try {
                await navigator.clipboard.writeText(email);
                const originalText = trigger.innerText;
                trigger.innerText = "Email copied!";
                window.setTimeout(() => {
                    trigger.innerText = originalText;
                }, 2000);
            } catch (error) {
                console.error("Failed to copy email:", error);
            }
        });
    });

    if (scrollTrigger) {
        scrollTrigger.addEventListener("click", () => {
            scrollToTarget(document.getElementById("intro"));
        });
    }

    document.querySelectorAll(".faq-item").forEach((item) => {
        const summary = item.querySelector("summary");
        const panel = item.querySelector(".faq-panel");

        if (!summary || !panel) {
            return;
        }

        item.dataset.faqEnhanced = "true";
        panel.style.height = item.open ? `${panel.scrollHeight}px` : "0px";

        item.addEventListener("click", (event) => {
            if (!event.target.closest("summary")) {
                return;
            }

            event.preventDefault();

            const isOpen = item.open;
            panel.style.overflow = "hidden";

            if (isOpen) {
                panel.style.height = `${panel.scrollHeight}px`;
                panel.offsetHeight;
                panel.style.height = "0px";
                window.setTimeout(() => {
                    item.open = false;
                }, 280);
                return;
            }

            item.open = true;
            panel.style.height = "0px";
            panel.offsetHeight;
            panel.style.height = `${panel.scrollHeight}px`;
        }, true);

        item.addEventListener("toggle", () => {
            if (!item.open || panel.style.height !== "0px") {
                return;
            }

            window.requestAnimationFrame(() => {
                panel.style.height = `${panel.scrollHeight}px`;
            });
        });

        panel.addEventListener("transitionend", (event) => {
            if (event.propertyName !== "height" || !item.open) {
                return;
            }

            panel.style.height = "auto";
            panel.style.overflow = "";
        });
    });

    if (isSnapPage) {
        const introSection = document.getElementById("intro");
        const snapTargets = Array.from(document.querySelectorAll("[data-snap-anchor]"));
        let requestedSnapIndex = null;
        let lastSnapInputAt = 0;
        let snapLockUntil = 0;
        let scrollSettleTimer = 0;

        function getNearestSnapIndex(points, scrollTop = window.scrollY) {
            let nearestIndex = 0;
            let nearestDistance = Number.POSITIVE_INFINITY;

            points.forEach((point, index) => {
                const distance = Math.abs(point.top - scrollTop);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = index;
                }
            });

            return nearestIndex;
        }

        function getSnapPoints() {
            const targets = snapTargets
                .flatMap((element) => {
                    if (element === visualFlow) {
                        const snapMetrics = getVisualFlowSnapMetrics();
                        if (!snapMetrics) {
                            return [];
                        }

                        return [
                            {
                                element,
                                kind: "visual-flow-entry",
                                top: snapMetrics.entryTop
                            },
                            {
                                element,
                                kind: "visual-flow-exit",
                                top: snapMetrics.exitTop
                            }
                        ];
                    }

                    return [{
                        element,
                        kind: "default",
                        top: getScrollDestination(element)
                    }];
                })
                .sort((left, right) => left.top - right.top);

            return [{ element: null, kind: "top", top: 0 }, ...targets]
                .filter((point, index, points) => index === 0 || Math.abs(point.top - points[index - 1].top) > 6);
        }

        function syncRequestedSnapIndex() {
            window.clearTimeout(scrollSettleTimer);
            scrollSettleTimer = window.setTimeout(() => {
                requestedSnapIndex = getNearestSnapIndex(getSnapPoints());
            }, 120);
        }

        function moveToSnapIndex(nextIndex, points) {
            requestedSnapIndex = nextIndex;
            lastSnapInputAt = performance.now();
            snapLockUntil = lastSnapInputAt + 520;
            window.scrollTo({
                top: points[nextIndex].top,
                behavior: "smooth"
            });
            syncRequestedSnapIndex();
        }

        requestedSnapIndex = getNearestSnapIndex(getSnapPoints());
        window.addEventListener("scroll", syncRequestedSnapIndex, { passive: true });

        window.addEventListener("wheel", (event) => {
            if (!isDesktopSnapEnabled() || body.classList.contains("menu-open-body")) {
                return;
            }

            if (Math.abs(event.deltaY) < 10) {
                return;
            }

            const now = performance.now();
            const direction = event.deltaY > 0 ? 1 : -1;
            const snapPoints = getSnapPoints();

            if (isInsideVisualFlowZone()) {
                const snapMetrics = getVisualFlowSnapMetrics();
                const edgeTolerance = Math.round(window.innerHeight * 0.14);

                if (snapMetrics && direction > 0 && firstCaseGroup && window.scrollY >= (snapMetrics.exitTop - edgeTolerance)) {
                    event.preventDefault();
                    snapLockUntil = now + 520;
                    window.scrollTo({
                        top: getScrollDestination(firstCaseGroup),
                        behavior: "smooth"
                    });
                    requestedSnapIndex = getNearestSnapIndex(snapPoints, getScrollDestination(firstCaseGroup));
                    syncRequestedSnapIndex();
                    return;
                }

                if (snapMetrics && direction < 0 && introSection && window.scrollY <= (snapMetrics.entryTop + edgeTolerance)) {
                    event.preventDefault();
                    snapLockUntil = now + 520;
                    window.scrollTo({
                        top: getScrollDestination(introSection),
                        behavior: "smooth"
                    });
                    requestedSnapIndex = getNearestSnapIndex(snapPoints, getScrollDestination(introSection));
                    syncRequestedSnapIndex();
                }

                return;
            }

            if (now < snapLockUntil || (now - lastSnapInputAt) < 90) {
                event.preventDefault();
                return;
            }

            const currentIndex = requestedSnapIndex ?? getNearestSnapIndex(snapPoints);
            const currentTarget = snapPoints[currentIndex]?.element || null;

            if (direction > 0 && flushDelayedReveals(currentTarget)) {
                lastSnapInputAt = now;
                event.preventDefault();
                syncRequestedSnapIndex();
                return;
            }

            const nextIndex = Math.max(0, Math.min(snapPoints.length - 1, currentIndex + direction));
            if (nextIndex === currentIndex) {
                return;
            }

            moveToSnapIndex(nextIndex, snapPoints);
            event.preventDefault();
        }, { passive: false });
    }

    initScrollShowcase();

    const videos = document.querySelectorAll("video");
    videos.forEach((video) => {
        video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {
                // Ignore final autoplay failure.
            });
        });
    });

    if (revealItems.length > 0) {
        if ("IntersectionObserver" in window && !prefersReducedMotion.matches) {
            const revealObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    const element = entry.target;
                    const delay = Number.parseInt(element.getAttribute("data-delay") || "0", 10);

                    clearRevealTimer(element);

                    if (entry.isIntersecting) {
                        const timerId = window.setTimeout(() => {
                            element.classList.add("is-visible");
                            revealTimers.delete(element);
                        }, delay);

                        revealTimers.set(element, timerId);
                    } else {
                        hideReveal(element);
                    }
                });
            }, {
                root: null,
                threshold: 0.2,
                rootMargin: "0px 0px -8% 0px"
            });

            revealItems.forEach((element) => revealObserver.observe(element));
        } else {
            revealItems.forEach((element) => element.classList.add("is-visible"));
        }
    }

    function applyTranslations() {
        if (typeof translations === "undefined") {
            return;
        }

        const userLang = navigator.language.slice(0, 2).toLowerCase();
        const lang = translations[userLang] ? userLang : "en";
        const dict = translations[lang];

        document.querySelectorAll("meta[data-i18n]").forEach((meta) => {
            const key = meta.getAttribute("data-i18n");
            if (key && dict[key]) {
                meta.setAttribute("content", dict[key]);
            }
        });

        document.querySelectorAll("[data-i18n]:not(meta)").forEach((element) => {
            const key = element.getAttribute("data-i18n");
            if (key && dict[key]) {
                element.innerHTML = dict[key];
            }
        });
    }

    applyTranslations();
});
