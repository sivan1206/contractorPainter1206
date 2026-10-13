/* A WhatsApp launch starts a request; it does not confirm delivery. */
(function () {
    'use strict';
    function init() {
        document.querySelectorAll('form#quote-form').forEach(function (form) {
            if (form.dataset.quoteBound === 'true') return;
            form.dataset.quoteBound = 'true';
            var status = document.createElement('p');
            status.dataset.quoteStatus = '';
            status.setAttribute('role', 'status');
            status.setAttribute('aria-live', 'polite');
            status.hidden = true;
            var fallback = document.createElement('a');
            fallback.dataset.quoteFallback = '';
            fallback.textContent = 'WhatsApp’ı aç ve mesajı gönder';
            fallback.target = '_blank';
            fallback.rel = 'noopener noreferrer';
            fallback.href = 'https://wa.me/905078322912';
            fallback.hidden = true;
            form.append(status, fallback);
            var attempt = null;
            function fieldFor(id) {
                return form.elements.namedItem(id) || form.querySelector('#' + id) || form.querySelector('#quote-' + id);
            }
            function value(id) {
                var field = fieldFor(id);
                return field ? field.value.trim() : '';
            }
            function label(id) {
                var field = fieldFor(id);
                return field && field.selectedOptions ? field.selectedOptions[0].textContent.trim() : value(id);
            }
            function inform(text) { status.hidden = false; status.textContent = text; }
            function valid() {
                if (!form.reportValidity()) return false;
                var blankRequired = Array.from(form.querySelectorAll('input[required],textarea[required],select[required]')).some(function (field) {
                    return typeof field.value === 'string' && !field.value.trim();
                });
                if (blankRequired) {
                    inform('Lütfen zorunlu alanları doldurun.');
                    return false;
                }
                if (form.querySelector('.g-recaptcha[data-sitekey]')) {
                    try {
                        if (!window.grecaptcha || typeof window.grecaptcha.getResponse !== 'function' || !window.grecaptcha.getResponse()) {
                            inform('Doğrulama testi yüklenmeli ve tamamlanmalı. Lütfen tekrar deneyin.');
                            return false;
                        }
                    } catch (e) {
                        inform('Doğrulama testi hazır değil. Lütfen tekrar deneyin.');
                        return false;
                    }
                }
                return true;
            }
            function url() {
                var heading = document.querySelector('h1');
                var district = label('district') || (heading ? heading.textContent.trim() : document.title);
                var lines = ['Yeni Teklif Talebi:', 'Sayfa: ' + (heading ? heading.textContent.trim() : document.title), 'Ad Soyad: ' + value('name')];
                if (value('phone')) lines.push('Telefon: ' + value('phone'));
                if (value('email')) lines.push('E-posta: ' + value('email'));
                lines.push('İlçe/Semt: ' + district);
                if (value('service')) lines.push('Hizmet Türü: ' + label('service'));
                if (value('timing')) lines.push('Başlama Zamanı: ' + label('timing'));
                if (value('area')) lines.push('Alan (m²): ' + value('area'));
                if (value('message')) lines.push('Mesaj: ' + value('message'));
                return 'https://wa.me/905078322912?text=' + encodeURIComponent(lines.join('\n'));
            }
            function started(method) {
                if (!attempt || attempt.started) return;
                attempt.started = true;
                form.dispatchEvent(new CustomEvent('ib:quote-started', { bubbles: true, detail: {
                    contact_method: 'whatsapp', form_id: 'quote-form', launch_method: method
                }}));
            }
            form.addEventListener('submit', function (event) {
                event.preventDefault();
                fallback.hidden = true;
                attempt = null;
                if (!valid()) return;
                attempt = { started: false };
                var href = url();
                fallback.href = href;
                var popup;
                try {
                    // The about:blank context is isolated before navigating, so a
                    // non-null handle remains useful for detecting popup blocking.
                    popup = window.open('about:blank', '_blank');
                    if (popup) { popup.opener = null; popup.location = href; }
                } catch (e) { popup = null; }
                if (popup) {
                    started('popup');
                    inform('WhatsApp açıldı. Talebinizi iletmek için mesajı WhatsApp’ta gönderin.');
                } else {
                    fallback.hidden = false;
                    inform('WhatsApp penceresi açılamadı. Aşağıdaki bağlantıyla açıp mesajı gönderin. Bilgileriniz korundu.');
                }
            });
            fallback.addEventListener('click', function (event) {
                if (!attempt || !valid()) { event.preventDefault(); return; }
                fallback.href = url();
                started('fallback');
                inform('WhatsApp bağlantısı seçildi. Talebinizi iletmek için mesajı WhatsApp’ta gönderin.');
            });
            form.addEventListener('input', function () {
                fallback.hidden = true;
                attempt = null;
                status.hidden = true;
                fallback.href = 'https://wa.me/905078322912';
            });
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
