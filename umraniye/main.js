    
        document.querySelector('.mobile-menu-button').addEventListener('click', function() {
            document.querySelector('.main-nav').classList.toggle('active');
            this.querySelector('i').classList.toggle('fa-bars');
            this.querySelector('i').classList.toggle('fa-times');
        });
        
    
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - 70,
                        behavior: 'smooth'
                    });
                    
           
                    if (document.querySelector('.main-nav').classList.contains('active')) {
                        document.querySelector('.main-nav').classList.remove('active');
                        document.querySelector('.mobile-menu-button i').classList.remove('fa-times');
                        document.querySelector('.mobile-menu-button i').classList.add('fa-bars');
                    }
                }
            });
        });
        
    
        document.getElementById('quote-form').addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Formunuz başarıyla gönderildi! En kısa sürede sizinle iletişime geçeceğiz.');
            this.reset();
        });
        
       
        window.addEventListener('scroll', function() {
            const sections = document.querySelectorAll('section');
            const navLinks = document.querySelectorAll('.main-nav a');
            
            let current = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
                    current = section.getAttribute('id');
                }
            });
            
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href').substring(1) === current) {
                    link.classList.add('active');
                }
            });
        });
    