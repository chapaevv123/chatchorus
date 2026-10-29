# ChatChorus: проверка Twitch LIVE и звука OBS

Статус на 2026-10-29: локальный DEMO и сервер проверены; реальный Twitch и звук OBS ещё не проверены. Не отправляйте Client Secret, токены, OAuth URL или содержимое `.env` в чат.

## 1. Создать Twitch Developer Application

1. Войдите в [Twitch Developer Console](https://dev.twitch.tv/console) под аккаунтом своего канала. Twitch требует подтверждённый email и 2FA для регистрации приложения.
2. Откройте **Applications → Register Your Application**. Укажите уникальное имя, например `ChatChorus Local`. Если консоль спрашивает тип клиента, выберите **Confidential** (серверное приложение). Выберите подходящую категорию для чат-приложения.
3. В **OAuth Redirect URLs** добавьте **ровно** `http://127.0.0.1:8787/oauth/callback` и нажмите **Add**, затем создайте приложение.
4. В **Manage** скопируйте Client ID и создайте **New Secret**. Храните Secret только локально; создание нового Secret инвалидирует предыдущий.

## 2. Запустить локально

В PowerShell:

```powershell
cd C:\Users\Win10_Game_OS\Pulse\projects\chatchorus
Copy-Item .env.example .env
notepad .env
```

В `.env` заполните `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_CHANNEL_LOGIN` (login канала без `@` и `#`), оставьте `PORT=8787`. Сохраните файл. `.env` исключён из Git.

```powershell
npm run build
npm run start:live
```

Держите окно сервера открытым. Точные адреса:

- **Панель:** `http://127.0.0.1:8787/`
- **OBS overlay:** `http://127.0.0.1:8787/overlay`
- **Безопасный статус без секретов:** `http://127.0.0.1:8787/api/status`

## 3. Подтвердить LIVE Twitch

1. В панели нажмите **Connect Twitch** и разрешите `user:read:chat` в браузере под аккаунтом настроенного канала. После возврата в панель ожидайте `LIVE_CONNECTED`.
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
