document.addEventListener('DOMContentLoaded', function () {
    var mobileMenuButton = document.querySelector('.mobile-menu-button');
    var mainNav = document.querySelector('.main-nav');
    function updateMenuState(isOpen) {
        if (!mobileMenuButton) return;
        mobileMenuButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        mobileMenuButton.setAttribute('aria-label', isOpen ? 'Menüyü Kapat' : 'Menüyü Aç');
    }

    if (mobileMenuButton && mainNav) {
        mobileMenuButton.addEventListener('click', function () {
            var willOpen = !mainNav.classList.contains('active');
            mainNav.classList.toggle('active');
            mobileMenuButton.classList.toggle('active');
            document.body.classList.toggle('no-scroll', willOpen);
            updateMenuState(willOpen);
        });

        mainNav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                mainNav.classList.remove('active');
                mobileMenuButton.classList.remove('active');
                document.body.classList.remove('no-scroll');
                updateMenuState(false);
            });
        });

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape' || !mainNav.classList.contains('active')) return;
            mainNav.classList.remove('active');
            mobileMenuButton.classList.remove('active');
            document.body.classList.remove('no-scroll');
            updateMenuState(false);
            mobileMenuButton.focus();
        });
    }

    var siteHeader = document.querySelector('header');
    if (siteHeader) {
        var updateHeaderState = function () {
            siteHeader.classList.toggle('scrolled', window.scrollY > 50);
        };
        window.addEventListener('scroll', updateHeaderState, { passive: true });
        updateHeaderState();
    }

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (event) {
            var targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') return;
            var target = document.querySelector(targetId);
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // Quote forms are handled by /assets/js/quote-form.js.

    var faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(function (item) {
        var question = item.querySelector('.faq-question');
        if (!question) return;
        if (!question.hasAttribute('role')) question.setAttribute('role', 'button');
        if (!question.hasAttribute('tabindex')) question.setAttribute('tabindex', '0');
        question.setAttribute('aria-expanded', item.classList.contains('active') ? 'true' : 'false');
        var toggleFaq = function () {
            var isActive = item.classList.contains('active');
            faqItems.forEach(function (otherItem) {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    var otherQ = otherItem.querySelector('.faq-question');
                    if (otherQ) otherQ.setAttribute('aria-expanded', 'false');
                }
            });
            item.classList.toggle('active', !isActive);
            question.setAttribute('aria-expanded', !isActive ? 'true' : 'false');
        };
        question.addEventListener('click', toggleFaq);
        question.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleFaq();
            }
        });
    });

    var searchInput = document.getElementById('faq-search');
    if (searchInput) {
        var emptyStateEl = document.getElementById('faq-empty-state');
        if (!emptyStateEl && faqItems.length && faqItems[0].parentNode) {
            emptyStateEl = document.createElement('p');
            emptyStateEl.id = 'faq-empty-state';
            emptyStateEl.setAttribute('role', 'status');
            emptyStateEl.setAttribute('aria-live', 'polite');
            emptyStateEl.style.display = 'none';
            emptyStateEl.style.textAlign = 'center';
            emptyStateEl.style.padding = '1rem';
            emptyStateEl.textContent = 'Aramanızla eşleşen soru bulunamadı.';
            var contactBanner = faqItems[0].parentNode.querySelector('.contact-banner');
            if (contactBanner) {
                faqItems[0].parentNode.insertBefore(emptyStateEl, contactBanner);
            } else {
                faqItems[0].parentNode.appendChild(emptyStateEl);
            }
        }
        searchInput.addEventListener('input', function () {
            var searchTerm = this.value.toLowerCase().trim();
            var matchCount = 0;
            faqItems.forEach(function (item) {
                var question = item.querySelector('.faq-question');
                var answer = item.querySelector('.faq-answer');
                var questionText = question ? question.textContent.toLowerCase() : '';
                var answerText = answer ? answer.textContent.toLowerCase() : '';
                var matches = !searchTerm || questionText.includes(searchTerm) || answerText.includes(searchTerm);
                item.style.display = matches ? 'block' : 'none';
                if (matches) {
                    matchCount += 1;
                    if (searchTerm && answerText.includes(searchTerm) && !item.classList.contains('active')) {
                        item.classList.add('active');
                        if (question) question.setAttribute('aria-expanded', 'true');
                    }
                }
                if (!searchTerm) {
                    item.classList.remove('active');
                    if (question) question.setAttribute('aria-expanded', 'false');
                }
            });
            if (emptyStateEl) {
                emptyStateEl.style.display = matchCount === 0 ? 'block' : 'none';
            }
        });
    }
});
