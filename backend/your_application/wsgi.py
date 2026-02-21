"""WSGI entrypoint for hosts that default to `gunicorn your_application.wsgi`."""

from app import app as application
