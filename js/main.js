document.addEventListener('DOMContentLoaded', () => {

    const select = (selector) => document.querySelector(selector);
    const selectAll = (selector) => document.querySelectorAll(selector);

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

        mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('active');
                mobileMenuButton.classList.remove('active');
                document.body.classList.remove('no-scroll');
                updateMenuState(false);
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
                mobileMenuButton.classList.remove('active');
                document.body.classList.remove('no-scroll');
                updateMenuState(false);
                mobileMenuButton.focus();
            }
        });
    }
    const slides = selectAll('.slide');
    if (slides.length > 0) {
        const sliderContainer = select('.slider-container');
        const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
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

        const pauseInteractions = ['mouseenter', 'focusin', 'touchstart'];
        const resumeInteractions = ['mouseleave', 'focusout', 'touchend'];
        pauseInteractions.forEach(evt => sliderContainer?.addEventListener(evt, stopSlider));
        resumeInteractions.forEach(evt => sliderContainer?.addEventListener(evt, () => {
            if (motionQuery?.matches) return;
            if (!sliderInitialized) {
                initHeroSlider();
                return;
            }
            startSlider();
        }));

        if ('IntersectionObserver' in window && sliderContainer) {
            const heroObserver = new IntersectionObserver((entries, observer) => {
                if (entries.some(entry => entry.isIntersecting)) {
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

            if (area > 0 && servicePrice > 0) {
                const cost = area * servicePrice;
                select('#estimated-cost').textContent = cost.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TL';
            } else {
                alert('Lütfen geçerli bir metrekare ve hizmet türü girin!');
            }
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

        // RECATCHA doğrulama (örnek, reCAPTCHA v2 ile)
        if (typeof grecaptcha !== "undefined") {
            let recaptchaResponse = grecaptcha.getResponse();
            if (!recaptchaResponse) {
                alert('Lütfen doğrulama testi (reCAPTCHA) çözün.');
                return;
            }
        }

        if (!name || !phone || !district || !service) {
            alert('Lütfen zorunlu alanları doldurun (Adınız Soyadınız, Telefon, İlçe/Semt ve Hizmet Türü)');
            return;
        }

        // WhatsApp mesajı oluştur
        let waMessage =
            `Yeni Teklif Talebi:%0A` +
            `Ad Soyad: ${name}%0A` +
            `Telefon: ${phone}%0A` +
            (email ? `E-posta: ${email}%0A` : "") +
            `İlçe/Semt: ${district}%0A` +
            `Hizmet Türü: ${service}%0A` +
            (message ? `Mesaj: ${message}%0A` : "");

        // WhatsApp numarası başında 90 olmadan girme!
        let whatsappNo = '905078322912';
        let waURL = `https://wa.me/${whatsappNo}?text=${waMessage}`;

        // WhatsApp’a yönlendir
        window.open(waURL, '_blank');

        // İsteğe bağlı: Formu resetle
        quoteForm.reset();
    });
}


    document.body.addEventListener('click', (e) => {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor || anchor.getAttribute('href') === '#') return;

        e.preventDefault();
        const targetElement = select(anchor.getAttribute('href'));
        if (targetElement) {
            const offsetTop = targetElement.offsetTop - 70;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
            if (mainNav && mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
                mobileMenuButton.classList.remove('active');
                document.body.classList.remove('no-scroll');
                updateMenuState(false);
            }
        }
    });
    const testimonialContainer = select('.testimonial-container');
    if (testimonialContainer) {
        const items = selectAll('.testimonial');
        const totalItems = items.length;
        if (totalItems === 0) return;

        const indicatorsContainer = select('#slider-indicators');
        const sliderWrapper = select('.testimonial-slider');
        const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
        let currentIndex = 0;
        let autoSlideInterval;
        let testimonialsInitialized = false;

        for (let i = 0; i < totalItems; i++) {
            const indicator = document.createElement('div');
            indicator.classList.add('indicator');
            indicator.dataset.index = i;
            indicatorsContainer.appendChild(indicator);
        }
        const indicators = selectAll('.indicator');

        const updateSlider = (index) => {
            testimonialContainer.style.transform = `translateX(-${index * 100}%)`;
            indicators.forEach((ind, i) => ind.classList.toggle('active', i === index));
            currentIndex = index;
        };

        const stopAutoSlide = () => {
            clearInterval(autoSlideInterval);
            autoSlideInterval = null;
        };

        const startAutoSlide = () => {
            if (motionQuery?.matches) {
                stopAutoSlide();
                return;
            }
            stopAutoSlide();
            autoSlideInterval = setInterval(() => updateSlider((currentIndex + 1) % totalItems), 5000);
        };

        const initTestimonialSlider = () => {
            if (testimonialsInitialized) return;
            updateSlider(0);
            if (!motionQuery?.matches) {
                startAutoSlide();
            }
            testimonialsInitialized = true;
        };

        const handleMotionChange = (event) => {
            if (!testimonialsInitialized) return;
            if (event.matches) {
                stopAutoSlide();
            } else {
                startAutoSlide();
            }
        };

        motionQuery?.addEventListener('change', handleMotionChange);

        select('#prev-testimonial')?.addEventListener('click', () => {
            if (!testimonialsInitialized) initTestimonialSlider();
            updateSlider((currentIndex - 1 + totalItems) % totalItems);
            startAutoSlide();
        });
        select('#next-testimonial')?.addEventListener('click', () => {
            if (!testimonialsInitialized) initTestimonialSlider();
            updateSlider((currentIndex + 1) % totalItems);
            startAutoSlide();
        });
        indicatorsContainer?.addEventListener('click', (e) => {
            if (e.target.matches('.indicator')) updateSlider(parseInt(e.target.dataset.index));
        });

        const pauseEvents = ['mouseenter', 'focusin', 'touchstart'];
        const resumeEvents = ['mouseleave', 'focusout', 'touchend'];
        pauseEvents.forEach(evt => sliderWrapper?.addEventListener(evt, stopAutoSlide));
        resumeEvents.forEach(evt => sliderWrapper?.addEventListener(evt, () => {
            if (motionQuery?.matches) return;
            if (!testimonialsInitialized) {
                initTestimonialSlider();
                return;
            }
            startAutoSlide();
        }));

        if ('IntersectionObserver' in window && sliderWrapper) {
            const testimonialObserver = new IntersectionObserver((entries, observer) => {
                if (entries.some(entry => entry.isIntersecting)) {
                    initTestimonialSlider();
                    observer.disconnect();
                }
            }, { threshold: 0.25 });
            testimonialObserver.observe(sliderWrapper);
        } else {
            initTestimonialSlider();
        }
    }

    const faqItems = document.querySelectorAll('.faq-item');
    const searchInput = document.getElementById('faq-search');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            faqItems.forEach(otherItem => {
                if (otherItem !== item) otherItem.classList.remove('active');
            });
            item.classList.toggle('active');
        });
    });
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase().trim();

            faqItems.forEach(item => {
                const questionText = item.querySelector('.faq-question').textContent.toLowerCase();
                const answerText = item.querySelector('.faq-answer').textContent.toLowerCase();

                const matches = questionText.includes(searchTerm) || answerText.includes(searchTerm);
                item.style.display = matches ? 'block' : 'none';

                if (matches && searchTerm && answerText.includes(searchTerm) && !item.classList.contains('active')) {
                    item.classList.add('active');
                }
            });
            if (!searchTerm) {
                faqItems.forEach(item => {
                    item.classList.remove('active');
                    item.style.display = 'block';
                });
            }
        });
    }
    const readMoreBtn = select('#read-more-btn');
    const moreContent = select('#more-content');
    if (readMoreBtn && moreContent) {
        readMoreBtn.addEventListener('click', function () {
            const isVisible = moreContent.style.display === 'block';
            moreContent.style.display = isVisible ? 'none' : 'block';
            this.innerHTML = isVisible
                ? 'Daha Fazla Bilgi <i class="fas fa-chevron-down"></i>'
                : 'Daha Az Göster <i class="fas fa-chevron-up"></i>';
        });
    }

});