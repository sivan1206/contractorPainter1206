document.addEventListener('DOMContentLoaded', () => {
 
    

   
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        window.scrollY > 50 ? header.classList.add('scrolled') : header.classList.remove('scrolled');
    });


    const createMobileMenu = () => {
        const nav = document.querySelector('nav ul');
        const navContainer = document.querySelector('nav');
        
        // Eğer buton zaten varsa tekrar eklemeyi önle
        let menuButton = document.querySelector('.mobile-menu-button');
        if (!menuButton) {
            menuButton = document.createElement('button');
            menuButton.className = 'mobile-menu-button';
            menuButton.innerHTML = '<i class="fas fa-bars"></i>';
            navContainer.prepend(menuButton);
        }
    
        // Menü açma-kapama işlevi
        const toggleMenu = () => {
            nav.classList.toggle('active');
            menuButton.classList.toggle('active');
            document.body.classList.toggle('no-scroll');
        };
    
        menuButton.addEventListener('click', toggleMenu);
    
        // Dışarı tıklanınca kapatma
        document.addEventListener('click', (e) => {
            if (!navContainer.contains(e.target) && !menuButton.contains(e.target)) {
                nav.classList.remove('active');
                menuButton.classList.remove('active');
                document.body.classList.remove('no-scroll');
            }
        });
    
        // Menü içindeki linklere tıklanınca menüyü kapat
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', toggleMenu);
        });
    
        // Ekran boyutu değişince menüyü kapat ve butonu yönet
        const handleResize = () => {
            if (window.innerWidth > 768) {
                nav.classList.remove('active');
                menuButton.classList.remove('active');
                document.body.classList.remove('no-scroll');
            }
        };
    
        window.addEventListener('resize', handleResize);
    };
    
    document.addEventListener('DOMContentLoaded', createMobileMenu);
    

createMobileMenu();


   
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
        
        // New code to handle video playback and transition
        const handleVideoPlayback = () => {
            const currentVideo = slides[currentSlide].querySelector('video');
            if (currentVideo) {
                currentVideo.play();
                currentVideo.addEventListener('ended', showNextSlide); // Transition to next slide when video ends
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
});

document.addEventListener("DOMContentLoaded", function () {
    const galleryScroll = document.querySelector(".gallery-scroll");


    let isDown = false;
    let startX;
    let scrollLeft;
    let isScrolling = true; 

    galleryScroll.addEventListener("mousedown", (e) => {
        isDown = true;
        startX = e.pageX - galleryScroll.offsetLeft;
        scrollLeft = galleryScroll.scrollLeft;
        galleryScroll.style.animationPlayState = "paused"; 
    });

    galleryScroll.addEventListener("mouseleave", () => {
        isDown = false;
        galleryScroll.style.animationPlayState = isScrolling ? "running" : "paused"; 
    });

    galleryScroll.addEventListener("mouseup", () => {
        isDown = false;
        galleryScroll.style.animationPlayState = isScrolling ? "running" : "paused"; 
    });

    galleryScroll.addEventListener("mousemove", (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - galleryScroll.offsetLeft;
        const walk = (x - startX) * 0.; 
        galleryScroll.scrollLeft = scrollLeft - walk;
    });


    galleryScroll.addEventListener("touchstart", (e) => {
        isDown = true;
        startX = e.touches[0].pageX - galleryScroll.offsetLeft;
        scrollLeft = galleryScroll.scrollLeft;
        galleryScroll.style.animationPlayState = "paused"; 
    });

    galleryScroll.addEventListener("touchend", () => {
        isDown = false;
        galleryScroll.style.animationPlayState = isScrolling ? "running" : "paused"; 
    });

    galleryScroll.addEventListener("touchmove", (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.touches[0].pageX - galleryScroll.offsetLeft;
        const walk = (x - startX) * 0.5; 
        galleryScroll.scrollLeft = scrollLeft - walk;
    });

    
    galleryScroll.innerHTML += galleryScroll.innerHTML;


    galleryScroll.addEventListener("mouseenter", () => {
        isScrolling = true;
        galleryScroll.style.animationPlayState = "running";
    });

    galleryScroll.addEventListener("mouseleave", () => {
        isScrolling = false;
    });
});

// Reveal animations on scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
            entry.target.style.opacity = '1';
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.animate-on-scroll').forEach(element => {
    element.style.animationPlayState = 'paused';
    element.style.opacity = '0';
    observer.observe(element);
});


  


