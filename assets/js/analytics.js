/*
 * Shared GA4 (gtag.js) implementation for istanbulboyacilik.com.
 *
 * This is a Google tag, not Tag Manager.
 *
 * Consent: Basic consent mode. Google is not loaded at all until the visitor
 * accepts analytics, so before acceptance there are no gtag.js requests, no
 * collect requests, no Analytics cookies and no events. Events raised before
 * consent are dropped, never queued for later transmission.
 *
 * Everything lives in this one file because it is already included on all 116
 * canonical pages; gating did not require touching the HTML again.
 *
 * Tracks: phone_click, whatsapp_click, generate_lead.
 */
(function () {
    'use strict';

    var GA_MEASUREMENT_ID = 'G-E4JBWT478X';
    var CONSENT_KEY = 'ib-analytics-consent';
    var CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;   // six months
    var POLICY_URL = '/gizlilik-politikasi.html';

    var googleTagStarted = false;

    window.dataLayer = window.dataLayer || [];

    window.gtag = window.gtag || function () {
        window.dataLayer.push(arguments);
    };

    /* ------------------------------------------------------------ consent */

    function clearConsent() {
        try {
            window.localStorage.removeItem(CONSENT_KEY);
        } catch (e) {
            /* nothing to clear */
        }
    }

    /*
     * A stored choice is valid for six months. Anything unreadable, unknown,
     * undated or out of date is discarded and the visitor is asked again.
     * There is no path here that defaults to accepted.
     */
    function readConsent() {
        var raw;

        try {
            raw = window.localStorage.getItem(CONSENT_KEY);
        } catch (e) {
            return null;               // private mode / storage disabled
        }

        if (!raw) {
            return null;
        }

        var saved;

        try {
            saved = JSON.parse(raw);   // pre-expiry versions stored a bare string
        } catch (e) {
            clearConsent();
            return null;
        }

        if (!saved || typeof saved !== 'object' ||
            (saved.choice !== 'granted' && saved.choice !== 'denied') ||
            typeof saved.ts !== 'number' || !isFinite(saved.ts) || saved.ts <= 0) {
            clearConsent();
            return null;
        }

        var age = Date.now() - saved.ts;

        if (age < 0 || age > CONSENT_MAX_AGE_MS) {
            clearConsent();            // expired, or a timestamp in the future
            return null;
        }

        return saved.choice;
    }

    function writeConsent(value) {
        try {
            window.localStorage.setItem(CONSENT_KEY, JSON.stringify({
                choice: value,
                ts: Date.now()
            }));
        } catch (e) {
            /* choice cannot be persisted; it still applies to this page view */
        }
    }

    /*
     * Best effort only: this clears the first-party Analytics cookies the page
     * can reach. Data already delivered to Google cannot be deleted from the
     * browser and needs a request to us or to Google.
     */
    function removeAnalyticsCookies() {
        var names = ['_ga', '_ga_' + GA_MEASUREMENT_ID.replace(/^G-/, ''), '_gid', '_gat'];
        var host = window.location.hostname;
        var parts = host.split('.');
        var domains = ['', host];
        var i;

        for (i = 0; i < parts.length - 1; i++) {
            domains.push('.' + parts.slice(i).join('.'));
        }

        names.forEach(function (name) {
            domains.forEach(function (domain) {
                document.cookie = name + '=; Max-Age=0; path=/' +
                    (domain ? '; domain=' + domain : '');
            });
        });
    }

    var consent = readConsent();

    function analyticsAllowed() {
        return consent === 'granted';
    }

    /* ---------------------------------------------------------- analytics */

    function loadGoogleAnalytics() {
        if (googleTagStarted || !analyticsAllowed()) {
            return;
        }

        googleTagStarted = true;

        /*
         * Default consent state must be set before any command that sends
         * configuration or events. Advertising storage is denied and stays
         * denied — this site runs no advertising or remarketing.
         */
        window.gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied'
        });
        window.gtag('consent', 'update', {
            analytics_storage: 'granted'
        });

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

    function revokeGoogleAnalytics() {
        if (googleTagStarted) {
            window.gtag('consent', 'update', {
                analytics_storage: 'denied'
            });
        }
        removeAnalyticsCookies();
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
        if (!analyticsAllowed()) {
            return;                    // dropped, not queued
        }
        loadGoogleAnalytics();
        window.gtag('event', eventName, parameters);
    }

    /*
     * Delayed loading, so accepting analytics does not change the measured
     * PageSpeed profile. Each of these is a no-op until consent is granted.
     */
    window.addEventListener(
        'load',
        function () {
            window.setTimeout(loadGoogleAnalytics, 2000);
        },
        { once: true }
    );

    ['scroll', 'pointerdown', 'touchstart', 'keydown'].forEach(
        function (eventName) {
            window.addEventListener(eventName, loadGoogleAnalytics, {
                once: true,
                passive: true
            });
        }
    );

    /* -------------------------------------------------------- CTA tracking */

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

    /* ------------------------------------------------------------- banner */

    var STYLE = [
        '.ib-consent{position:fixed;left:0;right:0;bottom:0;z-index:3000;',
        'background:#fff;color:#1f2933;box-shadow:0 -2px 16px rgb(0 0 0/.18);',
        'padding:1rem clamp(.75rem,4vw,2rem);font-size:.95rem;line-height:1.5;',
        'max-width:100%;box-sizing:border-box;overflow-wrap:anywhere}',
        '.ib-consent[hidden]{display:none}',
        '.ib-consent-inner{max-width:1200px;margin:0 auto}',
        '.ib-consent p{margin:0 0 .75rem}',
        '.ib-consent a{color:#4361ee;font-weight:600}',
        '.ib-consent-actions{display:flex;flex-wrap:wrap;gap:.6rem}',
        '.ib-consent button{font:inherit;font-weight:600;cursor:pointer;',
        'border-radius:8px;padding:.7rem 1.15rem;min-height:44px;',
        'border:2px solid #4361ee;flex:1 1 auto;min-width:0}',
        '.ib-consent .ib-accept{background:#4361ee;color:#fff}',
        '.ib-consent .ib-reject{background:#fff;color:#4361ee}',
        '.ib-consent .ib-prefs{background:#fff;color:#1f2933;border-color:#9aa5b1}',
        '.ib-consent-details{margin:.85rem 0 0;border-top:1px solid #e4e7eb;padding-top:.85rem}',
        '.ib-consent-details[hidden]{display:none}',
        '.ib-consent-details ul{margin:0;padding-left:1.2rem}',
        '.ib-consent-details li{margin:.35rem 0}',
        '.ib-consent-note{font-size:.85rem;color:#52606d;margin-top:.6rem}',
        '.ib-consent-link{display:inline-block;margin:.5rem 0;font-size:.9rem}',
        '@media(max-width:520px){.ib-consent-actions{flex-direction:column}',
        '.ib-consent button{width:100%}}'
    ].join('');

    var BANNER =
        '<div class="ib-consent-inner">' +
        '<p><strong>Çerez tercihi.</strong> Siteyi nasıl kullandığınızı anlamak ' +
        'için Google Analytics kullanmak istiyoruz. Bu tamamen isteğe bağlıdır; ' +
        'reddederseniz site aynı şekilde çalışmaya devam eder. ' +
        '<a href="' + POLICY_URL + '">Gizlilik ve çerez politikası</a></p>' +
        '<div class="ib-consent-actions">' +
        '<button type="button" class="ib-accept">Analitiği Kabul Et</button>' +
        '<button type="button" class="ib-reject">Analitiği Reddet</button>' +
        '<button type="button" class="ib-prefs" aria-expanded="false">Tercihleri Gör</button>' +
        '</div>' +
        '<div class="ib-consent-details" hidden>' +
        '<ul>' +
        '<li><strong>Zorunlu çerezler:</strong> her zaman etkin. Sitenin ' +
        'çalışması ve tercihinizin hatırlanması için gereklidir.</li>' +
        '<li><strong>Analitik çerezler:</strong> isteğe bağlı. Google Analytics ' +
        '(' + GA_MEASUREMENT_ID + ') ile ziyaret ve iletişim etkileşimlerini ölçer.</li>' +
        '<li><strong>Reklam çerezleri:</strong> her zaman reddedilir. Bu sitede ' +
        'reklam veya yeniden pazarlama kullanılmaz.</li>' +
        '</ul>' +
        '<p class="ib-consent-note">Tercihiniz altı ay boyunca saklanır; bu ' +
        'sürenin sonunda size yeniden sorulur. Tercihinizi istediğiniz zaman ' +
        'sayfa altındaki “Çerez Tercihleri” bağlantısından değiştirebilirsiniz. ' +
        'Onayı geri çekmek sonraki ölçümleri durdurur ve erişilebilen analitik ' +
        'çerezleri siler; daha önce Google’a gönderilmiş veriler tarayıcı ' +
        'üzerinden geri alınamaz, silinmesi için bizimle iletişime geçmeniz ' +
        'gerekir.</p>' +
        '</div>' +
        '</div>';

    var banner = null;

    function buildBanner() {
        if (banner) {
            return banner;
        }

        var style = document.createElement('style');
        style.textContent = STYLE;
        document.head.appendChild(style);

        banner = document.createElement('aside');
        banner.className = 'ib-consent';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Çerez tercihi');
        banner.innerHTML = BANNER;
        document.body.appendChild(banner);

        var details = banner.querySelector('.ib-consent-details');
        var prefs = banner.querySelector('.ib-prefs');

        banner.querySelector('.ib-accept').addEventListener('click', function () {
            consent = 'granted';
            writeConsent('granted');
            banner.hidden = true;
            loadGoogleAnalytics();
        });

        banner.querySelector('.ib-reject').addEventListener('click', function () {
            consent = 'denied';
            writeConsent('denied');
            revokeGoogleAnalytics();
            banner.hidden = true;
        });

        prefs.addEventListener('click', function () {
            var open = details.hidden;
            details.hidden = !open;
            prefs.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        return banner;
    }

    function showBanner() {
        buildBanner().hidden = false;
    }

    /*
     * Reopening the panel lives in the footer rather than in a fixed corner,
     * so it cannot collide with the fixed phone and WhatsApp CTAs.
     */
    function addPreferencesLink() {
        var host = document.querySelector('footer') || document.body;
        var link = document.createElement('a');

        link.href = '#';
        link.className = 'ib-consent-link';
        link.textContent = 'Çerez Tercihleri';
        link.addEventListener('click', function (event) {
            event.preventDefault();
            showBanner();
        });

        host.appendChild(link);
    }

    function initConsentUi() {
        addPreferencesLink();

        if (consent === null) {
            showBanner();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initConsentUi);
    } else {
        initConsentUi();
    }

    /*
     * A previously granted choice needs no further interaction: the load timer
     * and interaction listeners above pick it up, keeping the same lazy timing
     * a returning visitor had before consent gating existed.
     */
})();
