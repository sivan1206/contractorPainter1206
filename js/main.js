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

    const slides = selectAll('.slide');
    if (slides.length > 0) {
        const sliderContainer = select('.slider-container');
        const motionQuery = window.matchMedia
            ? window.matchMedia('(prefers-reduced-motion: reduce)')
            : null;

        let currentSlide = 0;
        let slideInterval;
        let sliderInitialized = false;

        const showSlide = (n) => {
            slides.forEach((slide, index) => {
                slide.classList.toggle('active', index === n);
            });
        };

        const nextSlide = () => {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        };

        const stopSlider = () => {
            clearInterval(slideInterval);
            slideInterval = null;
        };

        const startSlider = () => {
            if (motionQuery?.matches) {
                stopSlider();
                return;
            }
            stopSlider();
            slideInterval = setInterval(nextSlide, 5000);
        };

        const initHeroSlider = () => {
            if (sliderInitialized) return;

            document.querySelectorAll('.slide img[data-src]').forEach((img) => {
                if (img.dataset.srcset) {
                    img.srcset = img.dataset.srcset;
                    img.removeAttribute('data-srcset');
                }
                if (img.dataset.sizes) {
                    img.sizes = img.dataset.sizes;
                    img.removeAttribute('data-sizes');
                }
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                img.loading = 'lazy';
            });

            showSlide(0);
            if (!motionQuery?.matches) {
                startSlider();
            }

            sliderInitialized = true;
        };

        motionQuery?.addEventListener('change', (event) => {
            if (!sliderInitialized) return;
            if (event.matches) {
                stopSlider();
            } else {
                startSlider();
            }
        });

        ['mouseenter', 'focusin', 'touchstart'].forEach((evt) => {
            sliderContainer?.addEventListener(evt, stopSlider);
        });

        ['mouseleave', 'focusout', 'touchend'].forEach((evt) => {
            sliderContainer?.addEventListener(evt, () => {
                if (motionQuery?.matches) return;
                if (!sliderInitialized) {
                    initHeroSlider();
                    return;
                }
                startSlider();
            });
        });

        if ('IntersectionObserver' in window && sliderContainer) {
            const heroObserver = new IntersectionObserver((entries, observer) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    initHeroSlider();
                    observer.disconnect();
                }
            }, { threshold: 0.25 });

            heroObserver.observe(sliderContainer);
        } else {
            initHeroSlider();
        }
    }

    const calculateBtn = select('#calculate-btn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', () => {
            const area = parseFloat(select('#area').value);
            const servicePrice = parseFloat(select('#service-type').value);

            if (!(area > 0 && servicePrice > 0)) {
                alert('Lütfen geçerli bir metrekare ve hizmet türü girin!');
                return;
            }

            const cost = area * servicePrice;
            select('#estimated-cost').textContent = `${cost.toLocaleString('tr-TR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            })} TL`;
        });
    }

    const quoteForm = select('#quote-form');
    if (quoteForm) {
        quoteForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = select('#name').value.trim();
            const phone = select('#phone').value.trim();
            const district = select('#district') ? select('#district').value.trim() : '';
            const service = select('#service') ? select('#service').value.trim() : '';
            const email = select('#email') ? select('#email').value.trim() : '';
            const message = select('#message') ? select('#message').value.trim() : '';

            if (typeof grecaptcha !== 'undefined') {
                const recaptchaResponse = grecaptcha.getResponse();
                if (!recaptchaResponse) {
                    alert('Lütfen doğrulama testi (reCAPTCHA) çözün.');
                    return;
                }
            }

            if (!name || !phone || !district || !service) {
                alert('Lütfen zorunlu alanları doldurun (Adınız Soyadınız, Telefon, İlçe/Semt ve Hizmet Türü)');
                return;
            }

            const waMessage =
                `Yeni Teklif Talebi:%0A` +
                `Ad Soyad: ${name}%0A` +
                `Telefon: ${phone}%0A` +
                (email ? `E-posta: ${email}%0A` : '') +
                `İlçe/Semt: ${district}%0A` +
                `Hizmet Türü: ${service}%0A` +
                (message ? `Mesaj: ${message}%0A` : '');

            const waURL = `https://wa.me/905078322912?text=${waMessage}`;
            window.open(waURL, '_blank');
            quoteForm.reset();
        });
    }

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
        const prevBtn = select('#prev-testimonial');
        const nextBtn = select('#next-testimonial');
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

        const prevTestimonial = () => {
            showTestimonial((currentTestimonial - 1 + testimonials.length) % testimonials.length);
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

        prevBtn?.addEventListener('click', () => {
            prevTestimonial();
            resetAutoSlide();
        });

        nextBtn?.addEventListener('click', () => {
            nextTestimonial();
            resetAutoSlide();
        });

        const testimonialContainer = select('.testimonial-container');
        if (testimonialContainer) {
            testimonialContainer.addEventListener('click', () => {
                nextTestimonial();
                resetAutoSlide();
            });
            testimonialContainer.style.cursor = 'pointer';
        }

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
            question?.addEventListener('click', () => {
                faqItems.forEach((other) => {
                    if (other !== item) other.classList.remove('active');
                });
                item.classList.toggle('active');
            });
        });

        if (!searchInput) return;

        let searchDebounce;
        searchInput.addEventListener('input', function onInput() {
            clearTimeout(searchDebounce);
            const term = this.value.toLowerCase().trim();

            searchDebounce = setTimeout(() => {
                faqIndex.forEach(({ item, questionText, answerText }) => {
                    const matches = !term || questionText.includes(term) || answerText.includes(term);
                    item.style.display = matches ? 'block' : 'none';

                    if (matches && term && answerText.includes(term) && !item.classList.contains('active')) {
                        item.classList.add('active');
                    }
                    if (!term) {
                        item.classList.remove('active');
                    }
                });
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
            this.innerHTML = isVisible
                ? 'Daha Fazla Bilgi <i class="fas fa-chevron-down"></i>'
                : 'Daha Az Göster <i class="fas fa-chevron-up"></i>';
        });
    };

    runWhenVisible('.testimonial-slider', initTestimonialSlider, '280px');
    runWhenVisible('#sss', initFaq, '280px');
    runWhenVisible('#read-more-btn', initReadMore, '280px');
});