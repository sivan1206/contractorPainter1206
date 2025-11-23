
document.addEventListener('DOMContentLoaded', function () {
     window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        header.classList.toggle('scrolled', window.scrollY > 100);
    });
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mainNav = document.querySelector('.main-nav');

    const updateMenuToggleState = (isExpanded) => {
        if (!mobileMenuButton) {
            return;
        }
        mobileMenuButton.setAttribute('aria-expanded', isExpanded);
        mobileMenuButton.setAttribute('aria-label', isExpanded ? 'Menüyü Kapat' : 'Menüyü Aç');
    };

    if (mobileMenuButton && mainNav) {
        mobileMenuButton.addEventListener('click', () => {
            const newState = !mainNav.classList.contains('active');
            mainNav.classList.toggle('active');
            updateMenuToggleState(newState);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
                updateMenuToggleState(false);
                mobileMenuButton.focus();
            }
        });
    }   
    const navLinks = document.querySelectorAll('.main-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function () {
            if (mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
                updateMenuToggleState(false);
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

    const quoteForm = document.getElementById('quote-form');
    if (quoteForm) {
        quoteForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const nameInput = document.getElementById('quote-name');
            const districtInput = document.getElementById('quote-district');
            const serviceSelect = document.getElementById('quote-service');
            const timingSelect = document.getElementById('quote-timing');
            const messageInput = document.getElementById('quote-message');

            const name = nameInput ? nameInput.value.trim() : '';
            const district = districtInput ? districtInput.value.trim() : '';
            const service = serviceSelect ? serviceSelect.value : '';
            const timing = timingSelect ? timingSelect.value : '';
            const customMessage = messageInput ? messageInput.value.trim() : '';

            if (!name || !district) {
                alert('Lütfen adınızı ve Kadıköy\'deki bölgenizi belirtin.');
                return;
            }

            const serviceLabels = {
                'ic-cephe': 'İç cephe boyama',
                'dis-cephe': 'Dış cephe boyama',
                'dekoratif': 'Dekoratif uygulama',
                'isyeri': 'Ofis / iş yeri boyama',
                'tamirat': 'Tamirat ve alçı işlemleri'
            };

            const timingLabels = {
                'hemen': 'en kısa sürede',
                'hafta-sonu': 'hafta sonu',
                'bu-hafta': 'bu hafta içinde',
                'bu-ay': 'bu ay içinde'
            };

            const messageParts = [
                `Merhaba, ben ${name}.`,
                `Kadıköy ${district}'te boya badana hizmeti için bilgi almak istiyorum.`
            ];

            if (service && serviceLabels[service]) {
                messageParts.push(`Hizmet türü: ${serviceLabels[service]}.`);
            }

            if (timing && timingLabels[timing]) {
                messageParts.push(`Planlanan zaman: ${timingLabels[timing]}.`);
            }

            if (customMessage) {
                messageParts.push(`Not: ${customMessage}`);
            }

            const whatsappUrl = `https://wa.me/905078322912?text=${encodeURIComponent(messageParts.join('\n'))}`;
            window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        });
    }

});

