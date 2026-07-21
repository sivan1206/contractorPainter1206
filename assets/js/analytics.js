/*
 * Shared GA4 (gtag.js) implementation for istanbulboyacilik.com.
 *
 * Replaces the two divergent inline bootstraps that previously lived on the
 * homepage and the Kadıköy page. This is a Google tag, not Tag Manager.
 *
 * Tracks: phone_click, whatsapp_click, generate_lead.
 */
(function () {
    'use strict';

    var GA_MEASUREMENT_ID = 'G-E4JBWT478X';
    var googleTagStarted = false;

    window.dataLayer = window.dataLayer || [];

    window.gtag = window.gtag || function () {
        window.dataLayer.push(arguments);
    };

    function loadGoogleAnalytics() {
        if (googleTagStarted) {
            return;
        }

        googleTagStarted = true;

        /*
         * Queue configuration before inserting the remote script so that any
         * event fired during loading is processed after config, not before.
         */
        window.gtag('js', new Date());
        window.gtag('config', GA_MEASUREMENT_ID, {
            send_page_view: true
        });

        var script = document.createElement('script');
        script.async = true;
        script.src =
            'https://www.googletagmanager.com/gtag/js?id=' +
            encodeURIComponent(GA_MEASUREMENT_ID);

        script.onerror = function () {
            console.warn('Google Analytics failed to load.');
        };

        document.head.appendChild(script);
    }

    function normalizedText(element) {
        return (element.textContent || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 100);
    }

    function commonParameters(link, method) {
        return {
            contact_method: method,
            link_text: normalizedText(link),
            link_url: link.href || link.getAttribute('href') || '',
            page_path: window.location.pathname,
            page_title: document.title,
            transport_type: 'beacon'
        };
    }

    function sendAnalyticsEvent(eventName, parameters) {
        loadGoogleAnalytics();
        window.gtag('event', eventName, parameters);
    }

    /*
     * Preserve the delayed loading the inline implementations used, so the
     * measured PageSpeed profile does not change.
     */
    window.addEventListener(
        'load',
        function () {
            window.setTimeout(loadGoogleAnalytics, 2000);
        },
        { once: true }
    );

    /*
     * Start loading before a likely navigation or contact click, so the tag is
     * in flight by the time an event needs to be sent.
     */
    ['scroll', 'pointerdown', 'touchstart', 'keydown'].forEach(
        function (eventName) {
            window.addEventListener(eventName, loadGoogleAnalytics, {
                once: true,
                passive: true
            });
        }
    );

    /*
     * Delegated tracking, so CTAs rendered later are covered too.
     */
    document.addEventListener('click', function (event) {
        var target = event.target;

        if (!target || typeof target.closest !== 'function') {
            return;
        }

        var link = target.closest('a[href]');

        if (!link) {
            return;
        }

        var rawHref = link.getAttribute('href') || '';
        var normalizedHref = rawHref.toLowerCase();
        var absoluteHref = (link.href || rawHref).toLowerCase();

        if (normalizedHref.indexOf('tel:') === 0) {
            sendAnalyticsEvent('phone_click', commonParameters(link, 'phone'));
            return;
        }

        var isWhatsApp =
            normalizedHref.indexOf('whatsapp:') === 0 ||
            absoluteHref.indexOf('wa.me/') !== -1 ||
            absoluteHref.indexOf('api.whatsapp.com/') !== -1 ||
            absoluteHref.indexOf('web.whatsapp.com/') !== -1;

        if (isWhatsApp) {
            sendAnalyticsEvent(
                'whatsapp_click',
                commonParameters(link, 'whatsapp')
            );
        }
    });

    /*
     * Only the quote form is a lead. Selector audited against the repository:
     * every contact form on the site is form#quote-form (homepage + 48
     * district pages). form#price-calculator is deliberately NOT matched — it
     * is a price estimator, not a contact request.
     *
     * These forms carry required fields and no novalidate attribute, so the
     * browser fires 'submit' only after native validation passes. An invalid
     * form therefore cannot produce a lead event.
     *
     * The site's own handler calls preventDefault() and opens WhatsApp via
     * window.open(). That is not an anchor click, so it does not also trigger
     * whatsapp_click — one submission produces exactly one generate_lead.
     */
    document.addEventListener('submit', function (event) {
        var form = event.target;

        if (!(form instanceof HTMLFormElement)) {
            return;
        }

        var isContactForm = form.matches(
            'form[data-analytics-form="contact"], form#quote-form'
        );

        if (!isContactForm) {
            return;
        }

        sendAnalyticsEvent('generate_lead', {
            contact_method: 'form',
            form_id: form.id || 'quote_form',
            form_name:
                form.getAttribute('name') ||
                form.getAttribute('aria-label') ||
                form.id ||
                'quote_form',
            page_path: window.location.pathname,
            page_title: document.title,
            transport_type: 'beacon'
        });
    });
})();
