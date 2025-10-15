FROM node:22.20.0

# Установка системных зависимостей для Puppeteer и yarn
RUN apt-get update && apt-get install -y --no-install-recommends \
  xvfb gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 \
  libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
  libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation \
  libappindicator1 libnss3 lsb-release xdg-utils x11vnc x11-xkb-utils xfonts-100dpi xfonts-75dpi xfonts-scalable \
  x11-apps gnupg procps libpcre3 libpcre3-dev zlib1g-dev \
  fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf fonts-noto-color-emoji \
  libgbm1 libu2f-udev libvulkan1 libxss1 --no-install-recommends \
  wget \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update && apt-get install -y google-chrome-stable \
  && curl -fsSL https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor -o /usr/share/keyrings/yarn-archive-keyring.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/yarn-archive-keyring.gpg] https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
  && apt-get update \
  && apt-get install -y yarn \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Создаем директорию для записей
RUN mkdir -p recordings

# Устанавливаем права на запись
RUN chmod 755 recordings

# Устанавливаем переменные окружения для Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# # FROM node:22.20.0
# FROM ghcr.io/puppeteer/puppeteer:24.24.1

# # Установка системных зависимостей для Puppeteer и yarn
# # RUN apt-get update \
# #   && apt-get install -y wget gnupg \
# #   && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
# #   && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
# #   && curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
# #   && echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
# #   && apt-get update \
# #   && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 yarn \
# #   --no-install-recommends \
# #   && rm -rf /var/lib/apt/lists/*

# WORKDIR /app

# # Создаем директорию для записей
# RUN mkdir -p recordings

# # Устанавливаем права на запись
# RUN chmod 755 recordings

# # Устанавливаем переменные окружения для Puppeteer
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
