const DEEPLINK_CONFIG = {
    // Universal Link редирект от AppsFlyer (OneLink) - обязательно HTTPS
    universalLink: 'https://example.onelink.me/XXXXX/', 
    campaignParams: { // Параметры для отслеживания
        pid: 'landing_exit_intent',      // Partner ID
        c: 'exit_redirect',              // Campaign
        af_sub1: 'ios_visibility_change' // Sub parameter
    },
    redirectDelay: 100, // Задержка по ТЗ для стабильной работы Safari (~100-200ms)
    debugMode: false, // Режим отладки
    minIOSVersion: 12, // Минимальная версия iOS для работы
    allowedBrowsers: ['Safari', 'Chrome', 'Firefox'] // Список разрешенных браузеров
};
function buildDeepLink() { // Функция для построения полной ссылки с параметрами
    let url = DEEPLINK_CONFIG.universalLink;
    const params = new URLSearchParams();
    Object.entries(DEEPLINK_CONFIG.campaignParams).forEach(([key, value]) => { // Добавляем параметры кампании
        params.append(key, value);
    });
    params.append('af_sub2', Date.now()); // Добавляем метку времени для уникальности
    const browserInfo = detectBrowser(); // Добавляем информацию о браузере
    if (browserInfo) {
        params.append('af_sub3', browserInfo);
    }
    const separator = url.includes('?') ? '&' : '?'; // Строим финальную ссылку
    return url + separator + params.toString();
}
function detectBrowser() { // Определение браузера
    const ua = navigator.userAgent;
    if (ua.includes('CriOS')) return 'Chrome';
    if (ua.includes('FxiOS')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    return 'Unknown';
} 