/* Avoid repeating fixed mobile contact controls over the hero's own actions. */
(() => {
    const hero = document.querySelector('.location-page .hero');
    if (!hero || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(([entry]) => {
        // A hero below the viewport (back navigation/hash links) has not passed.
        document.body.classList.toggle(
            'ib-hero-passed', !entry.isIntersecting && entry.boundingClientRect.bottom <= 0
        );
    });
    observer.observe(hero);
})();
