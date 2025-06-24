document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mainNav = document.querySelector('.main-nav');
    
    mobileMenuButton.addEventListener('click', () => {
        mainNav.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    });
    
    // Hero Slider Functionality
    const slides = document.querySelectorAll('.slide');
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
        slideInterval = setInterval(nextSlide, 5000);
    }
    
    function stopSlider() {
        clearInterval(slideInterval);
    }
    
    // Auto slide every 5 seconds
    startSlider();
    
    // Pause slider when mouse is over
    const sliderContainer = document.querySelector('.slider-container');
    sliderContainer.addEventListener('mouseenter', stopSlider);
    sliderContainer.addEventListener('mouseleave', startSlider);
    
    // Price Calculator
    const calculateBtn = document.getElementById('calculate-btn');
    const areaInput = document.getElementById('area');
    const serviceTypeSelect = document.getElementById('service-type');
    const estimatedCost = document.getElementById('estimated-cost');
    
    calculateBtn.addEventListener('click', () => {
        const area = parseFloat(areaInput.value);
        const serviceType = parseFloat(serviceTypeSelect.value);
        
        if (!isNaN(area) && area > 0) {
            const cost = area * serviceType;
            estimatedCost.textContent = cost.toLocaleString('tr-TR') + ' TL';
        } else {
            alert('Lütfen geçerli bir metrekare değeri girin!');
        }
    });
    
    // Email Copy Function
    window.copyEmail = function () {
        const email = document.getElementById('email-text').textContent;
        navigator.clipboard.writeText(email)
            .then(() => {
                alert('E-posta adresi kopyalandı: ' + email);
            })
            .catch(err => {
                console.error('Kopyalama işlemi başarısız oldu:', err);
                alert('Kopyalama işlemi başarısız oldu!');
            });
    };
    
    // Email Send Function
    window.sendEmail = function () {
        const email = 'boyaustamistanbul@gmail.com';
        window.location.href = 'mailto:' + email;
    };
    
    // Form Submission
    const quoteForm = document.getElementById('quote-form');
    quoteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Basit form doğrulama
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        
        if (!name || !phone) {
            alert('Lütfen zorunlu alanları doldurun (Adınız Soyadınız ve Telefon)');
            return;
        }
        
        alert('Formunuz başarıyla gönderildi! En kısa sürede sizinle iletişime geçeceğiz.');
        quoteForm.reset();
    });
    
    // Smooth Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.getAttribute('href') === '#') return;
            
            e.preventDefault();
            
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 70,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                if (mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                }
            }
        });
    });
    
    // Testimonial Slider
    const testimonials = document.querySelectorAll('.testimonial');
    let currentTestimonial = 0;
    
    function showTestimonial(index) {
        testimonials.forEach(testimonial => testimonial.classList.remove('active'));
        testimonials[index].classList.add('active');
    }
    
    window.nextSlide = function() {
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        showTestimonial(currentTestimonial);
    };
    
    window.prevSlide = function() {
        currentTestimonial = (currentTestimonial - 1 + testimonials.length) % testimonials.length;
        showTestimonial(currentTestimonial);
    };
    
    // Initialize first testimonial
    showTestimonial(currentTestimonial);
    
    // Auto rotate testimonials
    setInterval(nextSlide, 8000);
    
    // Gallery Horizontal Scroll
    const gallery = document.querySelector('.horizontal-scroll-wrapper');
    if (gallery) {
        let isDown = false;
        let startX;
        let scrollLeft;
        
        gallery.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - gallery.offsetLeft;
            scrollLeft = gallery.scrollLeft;
        });
        
        gallery.addEventListener('mouseleave', () => {
            isDown = false;
        });
        
        gallery.addEventListener('mouseup', () => {
            isDown = false;
        });
        
        gallery.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - gallery.offsetLeft;
            const walk = (x - startX) * 2; // scroll hızı
            gallery.scrollLeft = scrollLeft - walk;
        });
        
        // Touch events for mobile
        gallery.addEventListener('touchstart', (e) => {
            isDown = true;
            startX = e.touches[0].pageX - gallery.offsetLeft;
            scrollLeft = gallery.scrollLeft;
        });
        
        gallery.addEventListener('touchend', () => {
            isDown = false;
        });
        
        gallery.addEventListener('touchmove', (e) => {
            if (!isDown) return;
            const x = e.touches[0].pageX - gallery.offsetLeft;
            const walk = (x - startX) * 2;
            gallery.scrollLeft = scrollLeft - walk;
        });
    }


// Slider elementlerini seç
const container = document.querySelector('.testimonial-container');
const testimonialsSlider = document.querySelectorAll('.testimonial');
const prevButton = document.getElementById('prev-testimonial');
const nextButton = document.getElementById('next-testimonial');
const indicatorsContainer = document.getElementById('slider-indicators');

if (container && testimonialsSlider.length > 0 && prevButton && nextButton && indicatorsContainer) {
    let currentIndex = 0;
    let testimonialWidth = testimonialsSlider[0].offsetWidth;
    const totalTestimonials = testimonialsSlider.length;
    let autoSlideInterval;

    // İndikatörleri oluştur
    for (let i = 0; i < totalTestimonials; i++) {
        const indicator = document.createElement('div');
        indicator.classList.add('indicator');
        if (i === 0) indicator.classList.add('active');
        indicator.dataset.index = i;
        indicatorsContainer.appendChild(indicator);
    }

    const indicators = indicatorsContainer.querySelectorAll('.indicator');

    // Slider'ı güncelleme fonksiyonu
    function updateSlider() {
        testimonialWidth = testimonialsSlider[0].offsetWidth;
        container.style.transform = `translateX(-${currentIndex * testimonialWidth}px)`;

        // Aktif indikatörü güncelle
        indicators.forEach((indicator, index) => {
            if (index === currentIndex) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
    }

    // Önceki testimonial
    function prevTestimonial() {
        currentIndex = (currentIndex - 1 + totalTestimonials) % totalTestimonials;
        updateSlider();
        resetAutoSlide();
    }

    // Sonraki testimonial
    function nextTestimonial() {
        currentIndex = (currentIndex + 1) % totalTestimonials;
        updateSlider();
        resetAutoSlide();
    }

    // Belirli bir testimonial'a git
    function goToTestimonial(index) {
        currentIndex = index;
        updateSlider();
        resetAutoSlide();
    }

    // Navigasyon butonlarına event listener ekle
    prevButton.addEventListener('click', prevTestimonial);
    nextButton.addEventListener('click', nextTestimonial);

    // İndikatörlere tıklama olayı
    indicators.forEach(indicator => {
        indicator.addEventListener('click', () => {
            const index = parseInt(indicator.dataset.index);
            goToTestimonial(index);
        });
    });

    // Otomatik geçiş
    function startAutoSlide() {
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

    // Slider üzerine gelince otomatik kaydırmayı durdur
    container.addEventListener('mouseenter', stopAutoSlide);
    container.addEventListener('mouseleave', startAutoSlide);

    // Pencere boyutu değiştiğinde slider'ı güncelle
    window.addEventListener('resize', () => {
        container.style.transition = 'none';
        updateSlider();
        setTimeout(() => {
            container.style.transition = 'transform 0.5s ease';
        }, 100);
    });

    // Başlangıçta slider'ı güncelle ve otomatik kaydırmayı başlat
    updateSlider();
    startAutoSlide();
}
    
});