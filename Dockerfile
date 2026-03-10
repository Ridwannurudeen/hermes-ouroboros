# Stage 1: Build React frontend
FROM node:20-slim AS frontend
WORKDIR /build
COPY ui/package.json ui/package-lock.json ./
RUN npm ci
COPY ui/ .
RUN npm run build

# Stage 2: Python backend
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
COPY --from=frontend /build/dist/ /app/web/dist/

EXPOSE 8000

CMD ["python", "-X", "utf8", "main.py", "--api", "--host", "0.0.0.0", "--port", "8000"]
