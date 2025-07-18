
document.addEventListener('DOMContentLoaded', function () {
     window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        header.classList.toggle('scrolled', window.scrollY > 100);
    });
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mainNav = document.querySelector('.main-nav');

    if (mobileMenuButton && mainNav) {
        mobileMenuButton.addEventListener('click', () => {
            mainNav.classList.toggle('active');
        });
    }   
    const navLinks = document.querySelectorAll('.main-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function () {
            if (mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
            }
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
  
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
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

                if (matches && answerText.includes(searchTerm) && !item.classList.contains('active')) {
                    item.classList.add('active');
                }
            });
        });
    }    
    const readMoreBtn = document.getElementById('read-more-btn');
    const moreContent = document.getElementById('more-content');

    if (readMoreBtn && moreContent) {
        readMoreBtn.addEventListener('click', function () {
            const isVisible = moreContent.style.display === 'block';
            moreContent.style.display = isVisible ? 'none' : 'block';
            this.innerHTML = isVisible
                ? 'Devamını Oku <i class="fas fa-chevron-down"></i>'
                : 'Daha Az Göster <i class="fas fa-chevron-up"></i>';
        });
    }

});

