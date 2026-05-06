# Make CITOSIS PRO Accessible Online

## Option 1: Same Wi-Fi / LAN testing

Use this only for testing on devices connected to the same network.

1. In `.env`, include your computer LAN IP in `ALLOWED_HOSTS`.

   Example:

   ```env
   ALLOWED_HOSTS=127.0.0.1,localhost,192.168.1.20
   APP_URL=http://192.168.1.20:8000
   ```

2. Run:

   ```bat
   start_citosis_lan.bat
   ```

3. Open the printed `Network:` URL on another device.

Windows Firewall may ask for permission. Allow Python on private networks.

## Option 2: Real online deployment

For a public website, deploy to a hosting provider or VPS. Do not expose the Django development server directly to the internet for production.

Set these values on the server:

```env
DEBUG=False
SECRET_KEY=replace-with-a-long-random-secret
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
APP_URL=https://your-domain.com
CSRF_TRUSTED_ORIGINS=https://your-domain.com,https://www.your-domain.com
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

Email links use `APP_URL`, so it must match the public URL users open in the browser.

## Notes

- SQLite is okay for testing, but MySQL/PostgreSQL is better for real multi-user online use.
- Uploaded files in `media/` must be backed up.
- Run migrations on the server before starting the app:

  ```bat
  venv\Scripts\python.exe manage.py migrate --noinput
  ```
