
// Mobile menu toggle
document.querySelector('.mobile-menu-button').addEventListener('click', function () {
    document.querySelector('.main-nav').classList.toggle('active');
    const isExpanded = this.getAttribute('aria-expanded') === 'true' || false;
    this.setAttribute('aria-expanded', !isExpanded);

    // Change icon
    if (this.getAttribute('aria-expanded') === 'true') {
        this.innerHTML = '<i class="fas fa-times"></i>';
    } else {
        this.innerHTML = '<i class="fas fa-bars"></i>';
    }
});

// Header scroll effect
window.addEventListener('scroll', function () {
    const header = document.getElementById('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Form submission
document.getElementById('quote-form').addEventListener('submit', function (e) {
    e.preventDefault();
    alert('Teklif isteğiniz alınmıştır. En kısa sürede sizinle iletişime geçeceğiz.');
    this.reset();
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 80,
                behavior: 'smooth'
            });

            // Close mobile menu if open
            document.querySelector('.main-nav').classList.remove('active');
            document.querySelector('.mobile-menu-button').setAttribute('aria-expanded', 'false');
            document.querySelector('.mobile-menu-button').innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
});

// Initialize header state
window.dispatchEvent(new Event('scroll'));
