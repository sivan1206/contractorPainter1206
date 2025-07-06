document.addEventListener('DOMContentLoaded', () => {

    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mainNav = document.querySelector('.main-nav');
    if (mobileMenuButton && mainNav) {
        mobileMenuButton.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            mobileMenuButton.classList.toggle('active');
            document.body.classList.toggle('no-scroll');
        });
    }
    const slides = document.querySelectorAll('.slide');
    if (slides.length > 0) {
        let currentSlide = 0;
        let slideInterval;

        function showSlide(n) {
            slides.forEach(slide => slide.classList.remove('active'));
            slides[n].classList.add('active');
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        }

        function startSlider() {
            stopSlider();
            slideInterval = setInterval(nextSlide, 5000);
        }

        function stopSlider() {
            clearInterval(slideInterval);
        }

        const sliderContainer = document.querySelector('.hero-slider');
        sliderContainer.addEventListener('mouseenter', stopSlider);
        sliderContainer.addEventListener('mouseleave', startSlider);

        startSlider();
    }


    const calculateBtn = document.getElementById('calculate-btn');
    if (calculateBtn) {
        const areaInput = document.getElementById('area');
        const serviceTypeSelect = document.getElementById('service-type');
        const estimatedCost = document.getElementById('estimated-cost');

        calculateBtn.addEventListener('click', () => {
            const area = parseFloat(areaInput.value);
            const servicePrice = parseFloat(serviceTypeSelect.value);

            if (!isNaN(area) && area > 0) {
                const cost = area * servicePrice;
                estimatedCost.textContent = cost.toLocaleString('tr-TR', { minimumFractionDigits: 0 }) + ' TL';
            } else {
                alert('Lütfen geçerli bir metrekare değeri girin!');
            }
        });
    }


    const emailLink = document.querySelector('.email-icons .fa-paper-plane');
    if (emailLink) {
        emailLink.addEventListener('click', () => {
            const email = document.getElementById('email-text').textContent;
            window.location.href = 'mailto:' + email;
        });
    }


    const quoteForm = document.getElementById('quote-form');
    if (quoteForm) {
        quoteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;

            if (!name || !phone) {
                alert('Lütfen zorunlu alanları doldurun (Adınız Soyadınız ve Telefon)');
                return;
            }
            alert('Teklif talebiniz alınmıştır! En kısa sürede sizinle iletişime geçeceğiz.');
            quoteForm.reset();
        });
    }


    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.getAttribute('href') === '#') return;

            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });

                if (mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                    mobileMenuButton.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                }
            }
        });
    });


    const container = document.querySelector('.testimonial-container');
    const testimonialsSliderItems = document.querySelectorAll('.testimonial');
    const prevButton = document.getElementById('prev-testimonial');
    const nextButton = document.getElementById('next-testimonial');
    const indicatorsContainer = document.getElementById('slider-indicators');

    if (container && testimonialsSliderItems.length > 0 && prevButton && nextButton && indicatorsContainer) {
        let currentIndex = 0;
        const totalTestimonials = testimonialsSliderItems.length;
        let autoSlideInterval;


        for (let i = 0; i < totalTestimonials; i++) {
            const indicator = document.createElement('div');
            indicator.classList.add('indicator');
            if (i === 0) indicator.classList.add('active');
            indicator.dataset.index = i;
            indicatorsContainer.appendChild(indicator);
        }

        const indicators = indicatorsContainer.querySelectorAll('.indicator');

        function updateSlider() {

            container.style.transform = `translateX(-${currentIndex * 100}%)`;

            indicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === currentIndex);
            });
        }

        function slideTo(index) {
            currentIndex = index;
            updateSlider();
            resetAutoSlide();
        }

        prevButton.addEventListener('click', () => slideTo((currentIndex - 1 + totalTestimonials) % totalTestimonials));
        nextButton.addEventListener('click', () => slideTo((currentIndex + 1) % totalTestimonials));

        indicators.forEach(indicator => {
            indicator.addEventListener('click', () => slideTo(parseInt(indicator.dataset.index)));
        });

        function startAutoSlide() {
            stopAutoSlide();
            autoSlideInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % totalTestimonials;
                updateSlider();
            }, 5000);
        }

        function stopAutoSlide() {
            clearInterval(autoSlideInterval);
        }

        function resetAutoSlide() {
            stopAutoSlide();
            startAutoSlide();
        }

        const sliderElement = document.querySelector('.testimonial-slider');
        sliderElement.addEventListener('mouseenter', stopAutoSlide);
        sliderElement.addEventListener('mouseleave', startAutoSlide);


        window.addEventListener('resize', updateSlider);

        startAutoSlide();
        updateSlider();
    }

    const faqItems = document.querySelectorAll('.faq-item');
    const searchInput = document.getElementById('faq-search');

    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            question.addEventListener('click', () => {

                faqItems.forEach(otherItem => {
                    if (otherItem !== item) otherItem.classList.remove('active');
                });

                item.classList.toggle('active');
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase().trim();
            faqItems.forEach(item => {
                const questionText = item.querySelector('.faq-question').textContent.toLowerCase();
                const answerText = item.querySelector('.faq-answer').textContent.toLowerCase();

                const matches = questionText.includes(searchTerm) || answerText.includes(searchTerm);
                item.style.display = matches ? 'block' : 'none';
            });
        });
    }


    const readMoreBtn = document.getElementById('read-more-btn');
    const moreContent = document.getElementById('more-content');

    if (readMoreBtn && moreContent) {
        readMoreBtn.addEventListener('click', function () {
            moreContent.classList.toggle('active');
            const isVisible = moreContent.classList.contains('active');
            this.innerHTML = isVisible
                ? 'Daha Az Göster <i class="fas fa-chevron-up"></i>'
                : 'Devamını Oku <i class="fas fa-chevron-down"></i>';


            moreContent.style.display = isVisible ? 'block' : 'none';
        });
    }

});