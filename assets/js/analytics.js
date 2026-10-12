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
 * Tracks: phone_click, whatsapp_click, quote_request_started.
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

        if (!link || link.hasAttribute('data-quote-fallback')) {
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

    // Emitted only by the validated form launch; no personal fields enter GA4.
    document.addEventListener('ib:quote-started', function (event) {
        var form = event.target;
        var detail = event.detail;
        if (!(form instanceof HTMLFormElement) || form.id !== 'quote-form' ||
            !detail || detail.form_id !== 'quote-form' || detail.contact_method !== 'whatsapp' ||
            (detail.launch_method !== 'popup' && detail.launch_method !== 'fallback')) return;
        sendAnalyticsEvent('quote_request_started', {
            contact_method: 'whatsapp', form_id: 'quote-form',
            launch_method: detail.launch_method,
            page_path: window.location.pathname, transport_type: 'beacon'
        });
    });

    /* ------------------------------------------------------------- banner */

    var STYLE = [
        '.ib-consent{position:fixed;left:0;right:0;bottom:0;z-index:3000;',
        'background:#fff;color:#1f2933;box-shadow:0 -2px 16px rgb(0 0 0/.18);',
        'padding:.75rem clamp(.75rem,4vw,2rem);font-size:.9rem;line-height:1.4;',
        'padding-bottom:calc(.75rem + env(safe-area-inset-bottom,0px));',
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
        '.ib-consent-dialog{border:0;border-radius:12px;box-shadow:0 8px 40px #0005;',
        'padding:1rem;max-width:560px;width:calc(100% - 2rem);max-height:80dvh;',
        'overflow:auto;box-sizing:border-box;color:#1f2933;background:#fff}',
        '.ib-consent-dialog::backdrop{background:#0007}',
        '.ib-consent-dialog .ib-consent-details{margin:0;border:0;padding:0}',
        '.ib-consent-dialog button{font:inherit;min-height:44px;padding:.6rem;border-radius:8px;',
        'border:2px solid #4361ee;background:white;color:#243fba;cursor:pointer}',
        '.ib-consent-dialog .ib-accept{background:#4361ee;color:white}',
        '.ib-consent-dialog .ib-consent-actions{margin-top:1rem}',
        '.ib-consent button:focus-visible,.ib-consent-dialog button:focus-visible{outline:3px solid #152c8c;outline-offset:3px}',
        '@media(max-width:520px){.ib-consent-actions{display:grid;grid-template-columns:1fr 1fr}',
        '.ib-consent button{width:100%;padding:.45rem .3rem;font-size:.85rem}',
        '.ib-consent .ib-prefs{grid-column:1/-1;border:0;padding:.2rem;min-height:44px}}',
        // Only fixed outer contact containers participate. Nested phone
        // links and ordinary hero/contact links retain their normal layout.
        'html.ib-consent-open .ib-consent-floating{margin-bottom:var(--ib-consent-lift,0px)}',
        '@media(max-width:768px){html.ib-consent-open .ib-consent-floating{display:none!important}}'
    ].join('');

    var BANNER =
        '<div class="ib-consent-inner">' +
        '<p><strong>İsteğe bağlı analitik.</strong> Kullanımı Google Analytics ile ölçmemize izin verir misiniz? ' +
        '<a href="' + POLICY_URL + '">Çerez politikası</a></p>' +
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
    var CTA_GAP_PX = 12;

    /*
     * Keep the floating CTAs clear of the banner. The height is measured from
     * the live element rather than assumed, because the banner wraps to a
     * different height per viewport and grows again when the preferences panel
     * is expanded.
     */
    function syncCtaOffset() {
        var root = document.documentElement;

        if (!banner || banner.hidden) {
            root.classList.remove('ib-consent-open');
            root.style.removeProperty('--ib-consent-lift');
            return;
        }

        document.querySelectorAll('.call-us-button,.call-button,.call-fixed,.whatsapp-button').forEach(function (element) {
            element.classList.toggle('ib-consent-floating', window.getComputedStyle(element).position === 'fixed');
        });

        var height = Math.ceil(banner.getBoundingClientRect().height);

        root.style.setProperty('--ib-consent-lift', (height + CTA_GAP_PX) + 'px');
        root.classList.add('ib-consent-open');
    }

    function buildBanner() {
        if (banner) {
            return banner;
        }

        var style = document.createElement('style');
        style.textContent = STYLE;
        document.head.appendChild(style);

        banner = document.createElement('aside');
        banner.className = 'ib-consent';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Çerez tercihi');
        banner.innerHTML = BANNER;
        document.body.appendChild(banner);

        var details = banner.querySelector('.ib-consent-details');
        var prefs = banner.querySelector('.ib-prefs');
        var dialog = document.createElement('dialog');
        dialog.className = 'ib-consent-dialog';
        dialog.id = 'ib-consent-preferences';
        prefs.setAttribute('aria-controls', dialog.id);
        dialog.setAttribute('aria-label', 'Çerez tercihleri ayrıntıları');
        details.hidden = false;
        dialog.appendChild(details);
        var dialogActions = banner.querySelector('.ib-consent-actions').cloneNode(true);
        dialogActions.querySelector('.ib-prefs').remove();
        dialogActions.querySelector('.ib-accept').addEventListener('click', function () {
            dialog.close(); banner.querySelector('.ib-accept').click();
        });
        dialogActions.querySelector('.ib-reject').addEventListener('click', function () {
            dialog.close(); banner.querySelector('.ib-reject').click();
        });
        var close = document.createElement('button');
        close.type = 'button'; close.textContent = 'Tercihlere dön';
        close.addEventListener('click', function () { dialog.close(); });
        dialogActions.appendChild(close);
        dialog.appendChild(dialogActions);
        document.body.appendChild(dialog);
        dialog.addEventListener('close', function () {
            prefs.setAttribute('aria-expanded', 'false');
            var focusTarget = banner.hidden ? document.querySelector('.ib-consent-link') : prefs;
            if (focusTarget) focusTarget.focus({ preventScroll: true });
        });

        banner.querySelector('.ib-accept').addEventListener('click', function () {
            consent = 'granted';
            writeConsent('granted');
            banner.hidden = true;
            syncCtaOffset();
            // The tag stays loaded after revocation; restore its consent state
            // explicitly when the visitor grants again on this page.
            if (googleTagStarted) {
                window.gtag('consent', 'update', {
                    analytics_storage: 'granted'
                });
            }
            loadGoogleAnalytics();
        });

        banner.querySelector('.ib-reject').addEventListener('click', function () {
            consent = 'denied';
            writeConsent('denied');
            revokeGoogleAnalytics();
            banner.hidden = true;
            syncCtaOffset();
        });

        prefs.addEventListener('click', function () {
            prefs.setAttribute('aria-expanded', 'true');
            dialog.showModal();
        });

        if (typeof window.ResizeObserver === 'function') {
            new window.ResizeObserver(syncCtaOffset).observe(banner);
        }

        window.addEventListener('resize', syncCtaOffset, { passive: true });
        window.addEventListener('orientationchange', syncCtaOffset, { passive: true });

        return banner;
    }

    function showBanner() {
        buildBanner().hidden = false;
        syncCtaOffset();
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
