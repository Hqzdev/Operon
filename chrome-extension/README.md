# Operon Chrome Extension

Autopilot расширение для Operon — анализ рекламных кампаний прямо из браузера.

## Структура

```
chrome-extension/
├── manifest.json              MV3 манифест
├── popup.html                 UI попапа
├── src/
│   ├── popup/
│   │   ├── popup.js           Логика попапа (auth, анализ, autopilot)
│   │   └── popup.css          Стили
│   ├── background/
│   │   └── service-worker.js  Фоновый worker (alarms, notifications, sync)
│   └── content/
│       ├── meta.js            Scraper для Meta Ads Manager
│       └── tiktok.js          Scraper для TikTok Ads Manager
└── icons/                     16px, 48px, 128px иконки (добавить вручную)
```

## Установка (dev)

1. Открыть `chrome://extensions`
2. Включить "Режим разработчика"
3. "Загрузить распакованное расширение" → выбрать папку `chrome-extension/`

## Функции

- **Auth** — вставить API-токен из Operon Dashboard → Settings
- **Быстрый анализ** — ввести метрики → получить SCALE/KILL/WATCH без открытия сайта
- **Автозаполнение** — при открытии Meta / TikTok Ads Manager метрики заполняются автоматически
- **Autopilot** — синхронизация раз в 24ч, Chrome-уведомления при изменении решений или падении ROAS
- **Sync now** — ручной запуск синхронизации

## Иконки

Нужно добавить `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`.  
Можно сгенерировать из SVG-лого Operon.
