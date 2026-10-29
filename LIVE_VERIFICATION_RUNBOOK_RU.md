# ChatChorus: проверка Twitch LIVE и звука OBS

Обновление на 2026-10-29: владелец сообщил об успешной авторизации канала `gg_punch`, получении настоящих сообщений, слышимой музыкальной реакции и записи OBS со звуком. Исходный MP4 проверен на наличие видео- и аудиодорожек; подробности в `FINAL_DELIVERY_REPORT.md`. Ниже сохранены шаги для повторной локальной проверки. Не отправляйте Client Secret, токены, OAuth URL или содержимое `.env` в чат.

## 1. Проверить уже созданное Twitch Developer Application

1. Приложение ChatChorus уже зарегистрировано владельцем. При необходимости проверьте его в [Twitch Developer Console](https://dev.twitch.tv/console) под своим аккаунтом.
2. Убедитесь, что тип приложения — **Confidential**, поскольку локальный контроллер использует Client Secret на сервере.
3. Зарегистрированный для ChatChorus OAuth Redirect URL — **ровно** `http://localhost:8787/oauth/callback`. Он должен совпадать с адресом в запросе авторизации и обмене кода. Локальный сервер при этом остаётся привязан к `127.0.0.1:8787`.
4. Используйте уже полученные Client ID и Client Secret. Храните Secret только локально; не создавайте новый Secret без необходимости, поскольку это может инвалидировать прежний.

## 2. Запустить локально

В PowerShell:

```powershell
cd C:\Users\Win10_Game_OS\Pulse\projects\chatchorus
notepad .env
```

Локальный `.env` уже подготовлен по `.env.example`. В Блокноте впишите Client ID **после** `TWITCH_CLIENT_ID=`, Client Secret **после** `TWITCH_CLIENT_SECRET=`, а логин своего Twitch-канала без `@` и `#` — после `TWITCH_CHANNEL_LOGIN=`. Оставьте `PORT=8787`. В каждой строке должно быть одно значение, без кавычек и пробелов вокруг `=`. Сохраните файл через **Файл → Сохранить** и закройте Блокнот. `.env` исключён из Git; не отправляйте его содержимое в чат.

Текущий демонстрационный процесс, запущенный до заполнения `.env`, не перечитает файл автоматически. После сохранения `.env` остановите прежний контроллер и в новом PowerShell запустите:

```powershell
npm.cmd run build
npm.cmd run start:live
```

Держите окно сервера открытым. Точные адреса:

- **Панель:** `http://127.0.0.1:8787/`
- **OBS overlay:** `http://127.0.0.1:8787/overlay`
- **Безопасный статус без секретов:** `http://127.0.0.1:8787/api/status`

## 3. Подтвердить LIVE Twitch

1. После сохранения `.env` запустите `npm.cmd run start:live`, откройте панель и нажмите **Connect Twitch**. В открывшейся странице Twitch войдите под аккаунтом, который читает настроенный канал, и нажмите **Authorize / Разрешить** для `user:read:chat`. Браузер вернётся на `http://localhost:8787/oauth/callback`, затем в панель; ожидайте `LIVE_CONNECTED`. Не копируйте callback-адрес из адресной строки: в нём одноразовый OAuth code и state.
2. Откройте чат своего Twitch-канала и отправьте настоящее сообщение. Проверьте, что в панели появилась строка с меткой **LIVE**, а в статусе `liveSeen: true`. До этого момента соединение с Twitch не доказывает доставку чата.
3. Отправьте ещё одно сообщение с другого аккаунта, если он доступен. Проверьте, что оба сообщения видны как LIVE. При выборе любого demo-сценария режим переключается на DEMO и Twitch-токены удаляются из памяти процесса.

Если подключение не проходит, скопируйте **только** поля `mode`, `connection`, `liveSeen`, `error` из `/api/status` и числовой HTTP-статус ошибки. Не присылайте адрес OAuth с `code` или `state`, `.env`, Client Secret или токены.

## 4. Подтвердить звук в OBS

1. Откройте OBS и добавьте **Browser Source**: URL `http://127.0.0.1:8787/overlay`, размер **1920 × 1080**. Включите **Control audio via OBS**, если этот параметр доступен, чтобы видеть источник в микшере.
2. Выберите этот Browser Source → **Interact** → внутри overlay нажмите **Enable audio**. Убедитесь, что overlay показывает `Audio running in this browser`. Разблокировка аудио в обычной панели не разблокирует отдельный браузер OBS.
3. Пока идут реальные сообщения, проверьте движение индикатора звука OBS. Сделайте короткую локальную запись и прослушайте её. Проверьте отсутствие дублирования звука от обычной панели и OBS Browser Source.
4. Нажмите **Emergency stop** в панели. Проверьте, что звук overlay остановился. После обновления Browser Source повторите **Interact → Enable audio**.

Сообщите результат в форме: `LIVE: LIVE_CONNECTED / liveSeen true или ошибка ...; OBS: индикатор двигался да/нет, запись содержит звук да/нет, emergency stop сработал да/нет`. Скриншот без секретов можно приложить. Эти действия не публикуют проект и не отправляют Devpost.

## Источники

- [Twitch: Registering Your App](https://dev.twitch.tv/docs/authentication/register-app/)
- [Twitch: Authorization Code Grant](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/)
- [Twitch: Token Validation](https://dev.twitch.tv/docs/authentication/validate-tokens/)
- [Twitch: EventSub WebSockets](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/)
- [OBS: Browser Source](https://obsproject.com/kb/browser-source)
