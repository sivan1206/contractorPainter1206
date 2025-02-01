document.addEventListener('DOMContentLoaded', () => {
    // Header scroll event
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        window.scrollY > 50 ? header.classList.add('scrolled') : header.classList.remove('scrolled');
    });

    // Mobile Menu functionality
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mainNav = document.querySelector('.main-nav');
    
    mobileMenuButton.addEventListener('click', () => {
        mainNav.classList.toggle('active'); 
    });

    const createMobileMenu = () => {
        const nav = document.querySelector('nav ul');
        const navContainer = document.querySelector('nav');
        
        let menuButton = document.querySelector('.mobile-menu-button');
        if (!menuButton) {
            menuButton = document.createElement('button');
            menuButton.className = 'mobile-menu-button';
            menuButton.innerHTML = '<i class="fas fa-bars"></i>';
            navContainer.prepend(menuButton);
        }
    
        const toggleMenu = () => {
            nav.classList.toggle('active');
            menuButton.classList.toggle('active');
            document.body.classList.toggle('no-scroll');
        };
    
        menuButton.addEventListener('click', toggleMenu);
    
        document.addEventListener('click', (e) => {
            if (!navContainer.contains(e.target) && !menuButton.contains(e.target)) {
                nav.classList.remove('active');
                menuButton.classList.remove('active');
                document.body.classList.remove('no-scroll');
            }
        });
    
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', toggleMenu);
        });
    
        const handleResize = () => {
            if (window.innerWidth > 768) {
                nav.classList.remove('active');
                menuButton.classList.remove('active');
                document.body.classList.remove('no-scroll');
            }
        };
    
        window.addEventListener('resize', handleResize);
    };
    
    createMobileMenu();
    
    // WhatsApp Button animation
    const animateWhatsAppButton = () => {
        const whatsappButton = document.querySelector(".whatsapp-button");
        if (!whatsappButton) return;

        const startAnimation = () => {
            whatsappButton.classList.add("shake");
            setTimeout(() => whatsappButton.classList.remove("shake"), 1000);
        };

        startAnimation();
        setInterval(startAnimation, 3000);
    };

    // Hero Slider functionality
    function initHeroSlider() {
        const slides = document.querySelectorAll('.slide');
        const heroContent = document.querySelector('.hero-content');
        let currentSlide = 0;
        let isTransitioning = false;
    
        const updateHeroContent = (title, description) => {
            if (!heroContent) return;
            
            heroContent.querySelector('h1').textContent = title;
            heroContent.querySelector('p').textContent = description;
            
            heroContent.style.opacity = '0';
            setTimeout(() => {
                heroContent.style.opacity = '1';
            }, 500);
        };
    
        const showNextSlide = () => {
            if (isTransitioning) return;
            isTransitioning = true;
    
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
    
            const newTitle = slides[currentSlide].dataset.title;
            const newDesc = slides[currentSlide].dataset.description;
            
            setTimeout(() => {
                updateHeroContent(newTitle, newDesc);
                isTransitioning = false;
            }, 3000); 
        };
    
        slides[currentSlide].classList.add('active');
        updateHeroContent(
            slides[currentSlide].dataset.title,
            slides[currentSlide].dataset.description
        );
    
        let slideInterval = setInterval(showNextSlide, 8000); 
        const handleInteraction = () => {
            clearInterval(slideInterval);
            showNextSlide();
            slideInterval = setInterval(showNextSlide, 8000);
        };
    
        document.querySelector('.hero').addEventListener('click', handleInteraction);
        document.querySelector('.hero').addEventListener('touchstart', handleInteraction);
        
        const handleVideoPlayback = () => {
            const currentVideo = slides[currentSlide].querySelector('video');
            if (currentVideo) {
                currentVideo.play();
                currentVideo.addEventListener('ended', showNextSlide); 
            }
            const previousVideo = slides[(currentSlide - 1 + slides.length) % slides.length].querySelector('video');
            if (previousVideo) {
                previousVideo.pause();
            }
        };
    
        slides.forEach(slide => {
            slide.addEventListener('transitionend', handleVideoPlayback);
        });
    };

    createMobileMenu();
    animateWhatsAppButton();
        initHeroSlider();


// Ensure functions are attached to the window object
window.copyEmail = function () {
    const emailElement = document.getElementById("email-text");
    if (!emailElement) {
        console.error("E-posta elementi bulunamadı.");
        return;
    }

    const email = emailElement.innerText.trim();

    // Use Clipboard API for modern browsers
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email)
            .then(() => alert("📋 E-posta adresi kopyalandı!"))
            .catch(err => {
                console.error("Clipboard API hatası:", err);
                fallbackCopy(email);
            });
    } else {
        fallbackCopy(email);
    }
};

// Fallback method for older browsers
window.fallbackCopy = function (text) {
    const tempInput = document.createElement("input");
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();

    try {
        document.execCommand("copy");
        alert("📋 E-posta adresi kopyalandı!");
    } catch (err) {
        console.error("Fallback kopyalama hatası:", err);
        alert("Kopyalama işlemi başarısız oldu!");
    }

    document.body.removeChild(tempInput);
};

// Email sending function
window.sendEmail = function () {
    const emailElement = document.getElementById("email-text");
    if (!emailElement) {
        console.error("E-posta elementi bulunamadı.");
        return;
    }

    const email = emailElement.innerText.trim();
    
    if (email) {
        window.location.href = `mailto:${email}`;
    } else {
        alert("📧 Geçerli bir e-posta adresi bulunamadı!");
    }
};












document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.horizontal-scroll-wrapper.squares');
    if (!gallery) return;

    let isDragging = false;
    let startX;
    let scrollStart;
    let velocity = 0;
    let requestId;

    // Improved pointer detection
    const isTouchDevice = 'ontouchstart' in window;
    const isDesktop = window.innerWidth > 1024; // Check if it's a desktop
    const multiplier = isTouchDevice ? 1.5 : 1.2;

    // Common start handler
    const handleStart = (clientX) => {
        isDragging = true;
        startX = clientX;
        scrollStart = gallery.scrollLeft;
        gallery.style.scrollSnapType = 'none'; // Disable scroll snap while dragging
        cancelAnimationFrame(requestId);
    };

    // Common move handler
    const handleMove = (clientX) => {
        if (!isDragging) return;
        const delta = clientX - startX;
        gallery.scrollLeft = scrollStart - delta * multiplier;
    };

    // Common end handler
    const handleEnd = () => {
        isDragging = false;
        gallery.style.scrollSnapType = 'x mandatory'; // Re-enable scroll snap after dragging
        
        // Add momentum
        velocity *= 0.95;
        if (Math.abs(velocity) > 0.5) {
            gallery.scrollLeft += velocity;
            requestId = requestAnimationFrame(() => handleEnd());
        }
    };

    

    // Touch events (for mobile/tablet)
    gallery.addEventListener('touchstart', (e) => {
        handleStart(e.touches[0].clientX);
    }, { passive: true });

    gallery.addEventListener('touchmove', (e) => {
        handleMove(e.touches[0].clientX);
        velocity = e.touches[0].clientX - startX;
    }, { passive: true });

    gallery.addEventListener('touchend', handleEnd);
});

        
        









    });

    