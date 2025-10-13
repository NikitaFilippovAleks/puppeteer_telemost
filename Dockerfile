FROM node:22.20.0

# Установка системных зависимостей для Puppeteer и yarn
RUN apt-get update && apt-get install -y --no-install-recommends \
  wget \
  ca-certificates \
  chromium \
  && curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
  && echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
  yarn \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Создаем директорию для записей
RUN mkdir -p recordings

# Устанавливаем права на запись
RUN chmod 755 recordings

# Устанавливаем переменные окружения для Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
