(function() {
    'use strict';
    const state = { // Состояние
        hasRedirected: false,
        isIOS: false,
        iosVersion: null,
        browser: null,
        sessionStart: Date.now()
    };
    function log(message, data = null) { // Логирование
        if (DEEPLINK_CONFIG.debugMode) {
            console.log(`[DeepLink Redirect] ${message}`, data || '');
        }
    }
    function updateDebugUI(key, value) { // Обновляем UI
        const element = document.getElementById(key);
        if (element) {
            element.textContent = value;
        }
    }
    function detectIOS() { // Определяем iOS
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        let isIOSModern = false;
        if (navigator.userAgentData && navigator.userAgentData.platform) {
            isIOSModern = /iPhone|iPad|iPod/.test(navigator.userAgentData.platform);
        }
        state.isIOS = isIOS || isIOSModern;
        if (state.isIOS) {
            const match = ua.match(/OS (\d+)_(\d+)_?(\d+)?/);
            if (match) {
                state.iosVersion = parseInt(match[1], 10);
            }
        }
        log('iOS Detection:', {
            isIOS: state.isIOS,
            version: state.iosVersion,
            userAgent: ua
        });
        return state.isIOS;
    }
    function checkBrowser() { // Проверяем браузер
        state.browser = detectBrowser();
        const isAllowed = DEEPLINK_CONFIG.allowedBrowsers.includes(state.browser);
        log('Browser Detection:', {
            browser: state.browser,
            isAllowed: isAllowed
        });
        return isAllowed;
    }
    function checkIOSVersion() { // Проверяем версию iOS
        if (!state.iosVersion) return true;
        const isSupported = state.iosVersion >= DEEPLINK_CONFIG.minIOSVersion;
        log('iOS Version Check:', {
            version: state.iosVersion,
            minRequired: DEEPLINK_CONFIG.minIOSVersion,
            isSupported: isSupported
        });
        return isSupported;
    }
    function performRedirect() { // Основная функция редиректа
        if (state.hasRedirected) { // Проверка флага "один раз за сессию" (по ТЗ)
            log('Redirect already performed in this session');
            return;
        }
        if (!state.isIOS) {
            log('Not an iOS device, skipping redirect');
            return;
        }
        if (!checkBrowser()) {
            log('Browser not in allowed list, skipping redirect');
            return;
        }
        if (!checkIOSVersion()) {
            log('iOS version too old, skipping redirect');
            return;
        }
        state.hasRedirected = true; // Устанавливаем флаг сразу (по ТЗ)
        updateDebugUI('redirectStatus', 'редирект запущен...');
        try { // Сохраняем в sessionStorage для сессии
            sessionStorage.setItem('deeplink_redirected', 'true');
            sessionStorage.setItem('deeplink_timestamp', Date.now().toString());
        } catch (e) {
            log('SessionStorage error:', e);
        }
        const deepLink = buildDeepLink(); // Получаем и валидируем ссылку
        try { // Валидация HTTPS
            const url = new URL(deepLink);
            if (!url.hostname || url.hostname === '') {
                throw new Error('Invalid URL: missing hostname');
            }
            if (url.protocol !== 'https:') {
                throw new Error('URL must be HTTPS (required by iOS)');
            }
        } catch (e) {
            log('Invalid deeplink URL:', { url: deepLink, error: e.message });
            updateDebugUI('redirectStatus', 'ошибка: неверный URL');
            return;
        }
        log('Performing redirect to:', deepLink);
        setTimeout(() => { // Задержка по ТЗ (~100ms) для стабильной работы Safari
            try {
                window.location.href = deepLink;
                updateDebugUI('redirectStatus', 'выполнен успешно');
                if (window.gtag) { // Аналитика
                    window.gtag('event', 'deeplink_redirect', {
                        event_category: 'engagement',
                        event_label: 'exit_intent',
                        value: 1
                    });
                }
            } catch (error) {
                log('Redirect error:', error);
                updateDebugUI('redirectStatus', 'ошибка редиректа');
            }
        }, DEEPLINK_CONFIG.redirectDelay); // Используем задержку из конфига (100ms)
    }
    function handleVisibilityChange() {
        log('Visibility changed:', {
            hidden: document.hidden,
            visibilityState: document.visibilityState
        });
        if (document.hidden || document.visibilityState === 'hidden') { // Срабатываем только когда страница становится скрытой
            performRedirect();
        }
    }
    function init() {
        log('Initializing DeepLink Redirect');
        try { // Проверяем, был ли уже редирект в этой сессии
            const wasRedirected = sessionStorage.getItem('deeplink_redirected');
            if (wasRedirected === 'true') {
                state.hasRedirected = true;
                updateDebugUI('redirectStatus', 'уже выполнен в сессии');
                log('Redirect already performed in this session');
            }
        } catch (e) {
            log('SessionStorage read error:', e);
        }
        detectIOS(); // Определяем iOS
        updateDebugUI('deviceType', navigator.userAgent.substring(0, 50) + '...'); // Обновляем UI
        updateDebugUI('isIOS', state.isIOS ? 'Да' : 'Нет');
        if (state.isIOS) {
            updateDebugUI('isIOS', `Да (iOS ${state.iosVersion || 'unknown'})`);
            document.addEventListener('visibilitychange', handleVisibilityChange); // Добавляем обработчик события
            window.addEventListener('pagehide', function() { // Альтернативные события для старых версий
                log('Page hide event triggered');
                performRedirect();
            });
            window.addEventListener('blur', function() { // Для Safari иногда нужен blur
                log('Window blur event triggered');
                setTimeout(() => { // Добавляем небольшую задержку чтобы отличить от обычного клика
                    if (document.hidden) {
                        performRedirect();
                    }
                }, 100);
            });
            log('Event listeners attached');
        } else {
            log('Not iOS device, redirect functionality disabled');
        }
    }
    if (document.readyState === 'loading') { // Запуск при загрузке DOM
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    window.DeepLinkRedirect = { // Экспорт для тестирования
        state: state,
        performRedirect: performRedirect,
        detectIOS: detectIOS
    };
})(); 