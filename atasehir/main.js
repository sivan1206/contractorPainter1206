document.addEventListener('DOMContentLoaded', function () {
    var mobileMenuButton = document.querySelector('.mobile-menu-button');
    var mainNav = document.querySelector('.main-nav');
    function updateMenuState(isOpen) {
        if (!mobileMenuButton) return;
        mobileMenuButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        mobileMenuButton.setAttribute('aria-label', isOpen ? 'Menüyü Kapat' : 'Menüyü Aç');
    }

    if (mobileMenuButton && mainNav) {
        mobileMenuButton.addEventListener('click', function () {
            var willOpen = !mainNav.classList.contains('active');
            mainNav.classList.toggle('active');
            mobileMenuButton.classList.toggle('active');
            document.body.classList.toggle('no-scroll', willOpen);
            updateMenuState(willOpen);
        });

        mainNav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                mainNav.classList.remove('active');
                mobileMenuButton.classList.remove('active');
                document.body.classList.remove('no-scroll');
                updateMenuState(false);
            });
        });

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape' || !mainNav.classList.contains('active')) return;
            mainNav.classList.remove('active');
            mobileMenuButton.classList.remove('active');
            document.body.classList.remove('no-scroll');
            updateMenuState(false);
            mobileMenuButton.focus();
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (event) {
            var targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') return;
            var target = document.querySelector(targetId);
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    var quoteForm = document.getElementById('quote-form');
    if (quoteForm) {
        quoteForm.addEventListener('submit', function (event) {
            event.preventDefault();
            alert('Formunuz başarıyla gönderildi. En kısa sürede sizinle iletişime geçeceğiz.');
            this.reset();
        });
    }

    var faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(function (item) {
        var question = item.querySelector('.faq-question');
        if (!question) return;
        question.addEventListener('click', function () {
            faqItems.forEach(function (otherItem) {
                if (otherItem !== item) otherItem.classList.remove('active');
            });
            item.classList.toggle('active');
        });
    });

    var searchInput = document.getElementById('faq-search');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            var searchTerm = this.value.toLowerCase().trim();
            faqItems.forEach(function (item) {
                var question = item.querySelector('.faq-question');
                var answer = item.querySelector('.faq-answer');
                var questionText = question ? question.textContent.toLowerCase() : '';
                var answerText = answer ? answer.textContent.toLowerCase() : '';
                if (!searchTerm || questionText.includes(searchTerm) || answerText.includes(searchTerm)) {
                    item.style.display = 'block';
                    return;
                }
                item.style.display = 'none';
            });
        });
    }
});
