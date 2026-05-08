# Operon Chrome Extension

Autopilot расширение для Operon — синхронизация Meta, TikTok и Shopify метрик прямо из браузера через extension key.

## Структура

```
chrome-extension/
├── manifest.json              MV3 манифест
├── popup.html                 UI попапа
├── src/
│   ├── popup/
│   │   ├── popup.js           Логика попапа (extension key, sync, autopilot)
│   │   └── popup.css          Стили
│   ├── background/
│   │   └── service-worker.js  Фоновый worker (alarms, notifications, sync)
│   └── content/
│       ├── meta.js            Scraper для Meta Ads Manager
│       ├── tiktok.js          Scraper для TikTok Ads Manager
│       └── shopify.js         Scraper для Shopify Admin
└── icons/                     16px, 48px, 128px иконки (добавить вручную)
```

## Установка (dev)

1. Открыть `chrome://extensions`
2. Включить "Режим разработчика"
3. "Загрузить распакованное расширение" → выбрать папку `chrome-extension/`

## Функции

- **Extension key** — вставить ключ из Operon → Settings → Integrations
- **Sync to Operon** — отправить видимые метрики текущей страницы в `/integrations/extension/sync`
- **Автозаполнение** — при открытии Meta / TikTok / Shopify метрики заполняются автоматически
- **Autopilot** — синхронизация открытых вкладок раз в 24ч
- **Sync now** — ручной запуск синхронизации

## Как подключить

1. В Operon открыть `Settings → Integrations`.
2. Нажать `Connect via extension` для Meta, TikTok или Shopify.
3. Скопировать extension key в попап расширения.
4. Открыть Ads Manager или Shopify Admin и нажать `Sync to Operon`.

## Иконки

Нужно добавить `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`.  
Можно сгенерировать из SVG-лого Operon.
