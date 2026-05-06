# CITOSIS  - Django Backend

CITOSIS is a tourism management system scaffold built with Django, Django REST Framework, and a MySQL-ready configuration.

## Stack alignment

Your original request mixed Django with Laravel-specific technologies such as Blade, Sanctum, and Laravel Filesystem.
This implementation uses Django equivalents instead:

- Backend framework: Django
- API: Django REST Framework
- API auth: DRF token authentication (Sanctum-style API token workflow)
- Views: Django templates split into reusable partials
- File storage: Django media storage (local/public in development, configurable later)
- Database: MySQL 8 ready via environment variables

## Features

- Custom user model with role, office, status, soft delete support, and token login
- Tourism records with image uploads
- Visitor tracking with checked in/checked out status
- Activity logs for important system actions
- Recycle bin for soft-deleted users, records, and visitors
- JSON backup/export and import endpoints
- Frontend split into readable template partials and external CSS/JS assets

## Project structure

```
citosis_pro/
  accounts/
  tourism/
  audit/
  templates/citosis/
  static/css/
  static/js/
```

## Quick start

1. Create and activate a virtual environment.
2. Install dependencies.
3. Copy `.env.example` to `.env` and update your MySQL credentials.
4. Run migrations.
5. Seed the demo admin account.
6. Start the server.

```bash
pip install -r requirements.txt
cp .env.example .env
python manage.py makemigrations
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

## Demo login

After running `python manage.py seed_demo`:

- Username: `admin`
- Email: `admin@example.com`
- Password: `admin`

## Important environment note

By default the settings use SQLite (`USE_SQLITE=True`).
For MySQL, set `USE_SQLITE=False` and configure the `DB_*` values in `.env`.

## Main API endpoints

- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`
- `GET /api/dashboard/overview/`
- `GET/POST /api/records/`
- `GET/POST /api/visitors/`
- `GET/POST /api/users/`
- `GET /api/recycle-bin/`
- `POST /api/recycle-bin/<id>/restore/`
- `DELETE /api/recycle-bin/<id>/purge/`
- `GET /api/activity-logs/`
- `DELETE /api/activity-logs/clear/`
- `GET /api/activity-logs/export/`
- `GET /api/system/backup/`
- `POST /api/system/import/`
