# ==============================================================================
# SecureLedger Enterprise Container
# Hardened, unprivileged, minimal Python 3.12 image
# ==============================================================================

FROM python:3.12-slim

# Create unprivileged application user
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser

WORKDIR /app

# Copy application assets
COPY --chown=appuser:appgroup . /app

# Ensure data directory for persistent SQLite storage
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data

USER appuser

ENV PORT=8080 \
    BIND=0.0.0.0 \
    DB_PATH=/app/data/secureledger.db \
    PYTHONUNBUFFERED=1

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request, os; urllib.request.urlopen('http://127.0.0.1:' + str(os.environ.get('PORT', 8080)) + '/').read()" || exit 1

VOLUME ["/app/data"]

CMD ["python", "server.py"]
