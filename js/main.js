document.addEventListener('DOMContentLoaded', () => {

    const select = (selector) => document.querySelector(selector);
    const selectAll = (selector) => document.querySelectorAll(selector);

    const mobileMenuButton = select('.mobile-menu-button');
    const mainNav = select('.main-nav');
    if (mobileMenuButton && mainNav) {
        mobileMenuButton.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            mobileMenuButton.classList.toggle('active');
            document.body.classList.toggle('no-scroll');
        });
    }
    const slides = selectAll('.slide');
    if (slides.length > 0) {
        let currentSlide = 0;
        let slideInterval;
        const showSlide = (n) => {
            slides.forEach((slide, index) => {
                slide.classList.toggle('active', index === n);
            });
        };
        const nextSlide = () => {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        };
        const startSlider = () => {
            clearInterval(slideInterval);
            slideInterval = setInterval(nextSlide, 5000);
        };
        showSlide(0);
        startSlider();
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

            if (!name || !phone) {
                alert('Lütfen zorunlu alanları doldurun (Adınız Soyadınız ve Telefon)');
                return;
            }

            alert('Teklif talebiniz alınmıştır! En kısa sürede sizinle iletişime geçeceğiz.');
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
            }
        }
    });
    const testimonialContainer = select('.testimonial-container');
    if (testimonialContainer) {
        const items = selectAll('.testimonial');
        const totalItems = items.length;
        if (totalItems === 0) return;

        const indicatorsContainer = select('#slider-indicators');
        let currentIndex = 0;
        let autoSlideInterval;

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

        const resetAutoSlide = () => {
            clearInterval(autoSlideInterval);
            autoSlideInterval = setInterval(() => updateSlider((currentIndex + 1) % totalItems), 5000);
        };

        select('#prev-testimonial')?.addEventListener('click', () => updateSlider((currentIndex - 1 + totalItems) % totalItems));
        select('#next-testimonial')?.addEventListener('click', () => updateSlider((currentIndex + 1) % totalItems));
        indicatorsContainer?.addEventListener('click', (e) => {
            if (e.target.matches('.indicator')) updateSlider(parseInt(e.target.dataset.index));
        });

        const sliderElement = select('.testimonial-slider');
        sliderElement?.addEventListener('mouseenter', () => clearInterval(autoSlideInterval));
        sliderElement?.addEventListener('mouseleave', resetAutoSlide);

        updateSlider(0);
        resetAutoSlide();
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