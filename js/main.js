document.addEventListener('DOMContentLoaded', () => {
    const select = (selector) => document.querySelector(selector);
    const selectAll = (selector) => document.querySelectorAll(selector);

    const runIdle = (callback, timeout = 1500) => {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(callback, { timeout });
            return;
        }
        window.setTimeout(callback, 0);
    };

    const runWhenVisible = (selector, callback, rootMargin = '220px') => {
        const target = select(selector);
        if (!target) return;

        let initialized = false;
        const init = () => {
            if (initialized) return;
            initialized = true;
            callback();
        };

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    init();
                    observer.disconnect();
                }
            }, { rootMargin });

            observer.observe(target);
            runIdle(init, 4000);
            return;
        }

        runIdle(init);
    };

    const mobileMenuButton = select('.mobile-menu-button');
    const mainNav = select('.main-nav');

    const updateMenuState = (isOpen) => {
        if (!mobileMenuButton) return;
        mobileMenuButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        mobileMenuButton.setAttribute('aria-label', isOpen ? 'Menüyü Kapat' : 'Menüyü Aç');
    };

    if (mobileMenuButton && mainNav) {
        mobileMenuButton.addEventListener('click', () => {
            const willOpen = !mainNav.classList.contains('active');
            mainNav.classList.toggle('active');
            mobileMenuButton.classList.toggle('active');
            document.body.classList.toggle('no-scroll', willOpen);
            updateMenuState(willOpen);
        });

        mainNav.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('active');
                mobileMenuButton.classList.remove('active');
                document.body.classList.remove('no-scroll');
                updateMenuState(false);
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || !mainNav.classList.contains('active')) return;
            mainNav.classList.remove('active');
            mobileMenuButton.classList.remove('active');
            document.body.classList.remove('no-scroll');
            updateMenuState(false);
            mobileMenuButton.focus();
        });
    }

    const calculateBtn = select('#calculate-btn');
    const calculatorForm = select('#price-calculator');
    if (calculateBtn) {
        const formatTL = (n) => n.toLocaleString('tr-TR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        const runCalculation = () => {
            const areaEl = select('#area');
            const serviceEl = select('#service-type');
            const outEl = select('#estimated-cost');
            if (!areaEl || !serviceEl || !outEl) return;

            const rawValue = areaEl.value.trim();
            const area = Number(rawValue);
            const minArea = Number(areaEl.min) || 10;
            const maxArea = Number(areaEl.max) || 1000;
            const opt = serviceEl.options[serviceEl.selectedIndex];
            const min = opt ? parseFloat(opt.getAttribute('data-min')) : NaN;
            const max = opt ? parseFloat(opt.getAttribute('data-max')) : NaN;
            const servicePrice = parseFloat(serviceEl.value);

            const isValidArea =
                rawValue !== '' &&
                Number.isFinite(area) &&
                Number.isInteger(area) &&
                area >= minArea &&
                area <= maxArea &&
                (typeof areaEl.checkValidity !== 'function' || areaEl.checkValidity());

            if (!isValidArea || !((min > 0 && max > 0) || servicePrice > 0)) {
                outEl.textContent = `Lütfen ${minArea} ile ${maxArea} m² arasında geçerli bir tam sayı girin.`;
                if (typeof areaEl.reportValidity === 'function') {
                    areaEl.reportValidity();
                }
                areaEl.focus();
                return;
            }

            if (min > 0 && max > 0) {
                outEl.textContent = `${formatTL(area * min)}–${formatTL(area * max)} TL`;
            } else {
                outEl.textContent = `${formatTL(area * servicePrice)} TL`;
            }
        };

        calculateBtn.addEventListener('click', runCalculation);
        if (calculatorForm) {
            calculatorForm.setAttribute('novalidate', 'novalidate');
            calculatorForm.addEventListener('submit', (event) => {
                event.preventDefault();
                runCalculation();
            });
        }
    }

    // Quote forms are handled by /assets/js/quote-form.js.

    document.body.addEventListener('click', (e) => {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor || anchor.getAttribute('href') === '#') return;

        e.preventDefault();
        const targetElement = select(anchor.getAttribute('href'));
        if (!targetElement) return;

        const headerOffset = 70;
        const targetTop = window.scrollY + targetElement.getBoundingClientRect().top - headerOffset;
        window.scrollTo({ top: targetTop, behavior: 'smooth' });

        if (mainNav && mainNav.classList.contains('active')) {
            mainNav.classList.remove('active');
            mobileMenuButton?.classList.remove('active');
            document.body.classList.remove('no-scroll');
            updateMenuState(false);
        }
    });

    const initTestimonialSlider = () => {
        const testimonialSlider = select('.testimonial-slider');
        if (!testimonialSlider || testimonialSlider.dataset.initialized === 'true') return;
        testimonialSlider.dataset.initialized = 'true';

        const testimonials = selectAll('.testimonial');
        const indicatorsContainer = select('#slider-indicators');

        let currentTestimonial = 0;
        let testimonialInterval;
        const shouldShowReadMore = new WeakMap();
        const READ_MORE_TEXT_THRESHOLD = 190;

        const buildReadMoreCache = () => {
            testimonials.forEach((testimonial) => {
                const paragraph = testimonial.querySelector('p');
                if (!paragraph) return;
                const textLength = (paragraph.textContent || '').trim().length;
                shouldShowReadMore.set(testimonial, textLength > READ_MORE_TEXT_THRESHOLD);
            });
        };

        if (indicatorsContainer && testimonials.length > 0) {
            indicatorsContainer.innerHTML = '';
            const fragment = document.createDocumentFragment();

            testimonials.forEach((testimonial, index) => {
                const dot = document.createElement('div');
                dot.classList.add('dot');
                dot.setAttribute('role', 'button');
                dot.setAttribute('aria-label', `${index + 1}. yoruma git`);
                dot.setAttribute('tabindex', '0');
                if (index === 0) dot.classList.add('active');

                const goToSlide = () => {
                    showTestimonial(index);
                    resetAutoSlide();
                };

                dot.addEventListener('click', (evt) => {
                    evt.stopPropagation();
                    goToSlide();
                });

                dot.addEventListener('keydown', (evt) => {
                    if (evt.key === 'Enter' || evt.key === ' ') {
                        evt.preventDefault();
                        goToSlide();
                    }
                });

                fragment.appendChild(dot);

                const p = testimonial.querySelector('p');
                if (p && !testimonial.querySelector('.read-more-btn')) {
                    const btn = document.createElement('button');
                    btn.className = 'read-more-btn';
                    btn.textContent = 'Daha Fazla Göster';
                    btn.setAttribute('aria-expanded', 'false');
                    btn.type = 'button';
                    btn.addEventListener('click', (evt) => {
                        evt.stopPropagation();
                        const isExpanded = testimonial.classList.toggle('expanded');
                        btn.textContent = isExpanded ? 'Daha Az Göster' : 'Daha Fazla Göster';
                        btn.setAttribute('aria-expanded', String(isExpanded));
                        if (isExpanded) {
                            stopAutoSlide();
                        } else {
                            startAutoSlide();
                        }
                    });
                    p.insertAdjacentElement('afterend', btn);
                }
            });

            indicatorsContainer.appendChild(fragment);
            buildReadMoreCache();
        }

        const dots = selectAll('.slider-indicators .dot');

        const showTestimonial = (n) => {
            testimonials.forEach((testimonial) => {
                testimonial.classList.remove('active', 'expanded');
                const btn = testimonial.querySelector('.read-more-btn');
                if (btn) {
                    btn.textContent = 'Daha Fazla Göster';
                    btn.style.display = 'none';
                }
            });

            dots.forEach((dot) => dot.classList.remove('active'));

            const current = testimonials[n];
            if (current) {
                current.classList.add('active');
                const btn = current.querySelector('.read-more-btn');
                if (btn) {
                    btn.style.display = shouldShowReadMore.get(current) ? 'block' : 'none';
                }
            }

            if (dots[n]) dots[n].classList.add('active');
            currentTestimonial = n;
        };

        const nextTestimonial = () => {
            showTestimonial((currentTestimonial + 1) % testimonials.length);
        };

        const startAutoSlide = () => {
            stopAutoSlide();
            testimonialInterval = setInterval(nextTestimonial, 7000);
        };

        const stopAutoSlide = () => {
            if (!testimonialInterval) return;
            clearInterval(testimonialInterval);
            testimonialInterval = null;
        };

        const resetAutoSlide = () => {
            stopAutoSlide();
            startAutoSlide();
        };

        testimonialSlider.addEventListener('mouseenter', stopAutoSlide);
        testimonialSlider.addEventListener('mouseleave', startAutoSlide);
        testimonialSlider.addEventListener('touchstart', stopAutoSlide, { passive: true });
        testimonialSlider.addEventListener('touchend', startAutoSlide, { passive: true });

        if (testimonials.length > 0) {
            showTestimonial(0);
            startAutoSlide();
        }
    };

    const initFaq = () => {
        const faqItems = document.querySelectorAll('.faq-item');
        if (!faqItems.length) return;

        const searchInput = document.getElementById('faq-search');
        const faqIndex = Array.from(faqItems).map((item) => {
            const questionEl = item.querySelector('.faq-question');
            const answerEl = item.querySelector('.faq-answer');
            return {
                item,
                questionText: questionEl?.textContent.toLowerCase() || '',
                answerText: answerEl?.textContent.toLowerCase() || ''
            };
        });

        faqItems.forEach((item) => {
            const question = item.querySelector('.faq-question');
            if (!question) return;
            if (!question.hasAttribute('role')) question.setAttribute('role', 'button');
            if (!question.hasAttribute('tabindex')) question.setAttribute('tabindex', '0');
            question.setAttribute('aria-expanded', item.classList.contains('active') ? 'true' : 'false');

            const toggleItem = () => {
                const isActive = item.classList.contains('active');
                faqItems.forEach((other) => {
                    if (other !== item) {
                        other.classList.remove('active');
                        other.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
                    }
                });
                item.classList.toggle('active', !isActive);
                question.setAttribute('aria-expanded', !isActive ? 'true' : 'false');
            };

            question.addEventListener('click', toggleItem);
            question.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleItem();
                }
            });
        });

        if (!searchInput) return;

        let emptyStateEl = document.getElementById('faq-empty-state');
        if (!emptyStateEl && faqItems[0]?.parentNode) {
            emptyStateEl = document.createElement('p');
            emptyStateEl.id = 'faq-empty-state';
            emptyStateEl.setAttribute('role', 'status');
            emptyStateEl.setAttribute('aria-live', 'polite');
            emptyStateEl.style.display = 'none';
            emptyStateEl.style.textAlign = 'center';
            emptyStateEl.style.padding = '1rem';
            emptyStateEl.textContent = 'Aramanızla eşleşen soru bulunamadı.';
            faqItems[0].parentNode.appendChild(emptyStateEl);
        }

        let searchDebounce;
        searchInput.addEventListener('input', function onInput() {
            clearTimeout(searchDebounce);
            const term = this.value.toLowerCase().trim();

            searchDebounce = setTimeout(() => {
                let matchCount = 0;
                faqIndex.forEach(({ item, questionText, answerText }) => {
                    const matches = !term || questionText.includes(term) || answerText.includes(term);
                    item.style.display = matches ? 'block' : 'none';
                    if (matches) matchCount += 1;

                    const qEl = item.querySelector('.faq-question');
                    if (matches && term && answerText.includes(term) && !item.classList.contains('active')) {
                        item.classList.add('active');
                        qEl?.setAttribute('aria-expanded', 'true');
                    }
                    if (!term) {
                        item.classList.remove('active');
                        qEl?.setAttribute('aria-expanded', 'false');
                    }
                });
                if (emptyStateEl) {
                    emptyStateEl.style.display = matchCount === 0 ? 'block' : 'none';
                }
            }, 120);
        });
    };

    const initReadMore = () => {
        const readMoreBtn = select('#read-more-btn');
        const moreContent = select('#more-content');
        if (!readMoreBtn || !moreContent || readMoreBtn.dataset.initialized === 'true') return;

        readMoreBtn.dataset.initialized = 'true';
        readMoreBtn.addEventListener('click', function onReadMoreClick() {
            const isVisible = moreContent.style.display === 'block';
            moreContent.style.display = isVisible ? 'none' : 'block';
            this.setAttribute('aria-expanded', isVisible ? 'false' : 'true');
            this.innerHTML = isVisible
                ? 'Daha Fazla Bilgi <i class="fas fa-chevron-down"></i>'
                : 'Daha Az Göster <i class="fas fa-chevron-up"></i>';
        });
    };

    runWhenVisible('.testimonial-slider', initTestimonialSlider, '280px');
    initFaq();
    initReadMore();
});
