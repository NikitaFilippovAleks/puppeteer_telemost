# Puppeteer Telemost Recorder

Простое API для записи аудио с Yandex Telemost с помощью Puppeteer.

## 🎯 Что это

Один эндпоинт для записи аудио с конференции Yandex Telemost по URL и получения готового файла.

## 🚀 Быстрый старт

### 1. Установка

```bash
npm install
```

### 2. Запуск

```bash
# Сборка и запуск
npm start

# Или в режиме разработки
npm run dev
```

### 3. Использование

```bash
# Записать аудио с конференции
curl -X POST http://localhost:3100/api/record \
  -H "Content-Type: application/json" \
  -d '{"meetingUrl":"https://telemost.yandex.ru/your-meeting-url","duration":300}' \
  --output recording.webm
```

## 📡 API

### POST /api/record

Записывает аудио с конференции и возвращает файл.

**Параметры:**

- `meetingUrl` (string, обязательный) - URL конференции в Yandex Telemost
- `duration` (number, опциональный) - Длительность записи в секундах (10-3600, по умолчанию: 300)
- `format` (string, опциональный) - Формат аудио (webm, mp3, wav, по умолчанию: webm)
- `recordUntilEnd` (boolean, опциональный) - Записывать до завершения встречи (по умолчанию: false)
- `maxDuration` (number, опциональный) - Максимальная продолжительность записи в секундах при recordUntilEnd=true (по умолчанию: 7200)

**Примеры запросов:**

**Запись на фиксированное время:**
```bash
curl -X POST http://localhost:3100/api/record \
  -H "Content-Type: application/json" \
  -d '{
    "meetingUrl": "https://telemost.yandex.ru/your-meeting-url",
    "duration": 300,
    "format": "webm"
  }' \
  --output recording.webm
```

**Запись до завершения встречи (максимум 2 часа):**
```bash
curl -X POST http://localhost:3100/api/record \
  -H "Content-Type: application/json" \
  -d '{
    "meetingUrl": "https://telemost.yandex.ru/your-meeting-url",
    "recordUntilEnd": true,
    "maxDuration": 7200,
    "format": "webm"
  }' \
  --output recording.webm
```

**Ответ:**

- Успех (200): Аудио файл в виде потока
- Ошибка (400): Неверные параметры
- Ошибка (500): Ошибка записи

## 🔧 Настройка

### Переменные окружения

```bash
# Порт сервера
PORT=3100

# Режим браузера
BROWSER_HEADLESS=false

# Длительность записи по умолчанию
RECORDING_DURATION=300

# Директория для записей
OUTPUT_DIR=./recordings
```

### Docker

```bash
# Сборка образа
docker build -t puppeteer-telemost .

# Запуск контейнера
docker run -p 3100:3100 puppeteer-telemost
```

## 📁 Структура проекта

```
src/
├── types/           # Типы TypeScript
├── config/          # Конфигурация
├── utils/           # Утилиты
├── api.ts           # Express API сервер
└── recorder.ts      # Класс для записи
```

## 🛠️ Разработка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Запуск с автоперезагрузкой
npm run dev:watch

# Сборка проекта
npm run build

# Очистка сборки
npm run clean
```

## 📋 Требования

- Node.js >= 18.0.0
- Google Chrome (для Puppeteer)
- Доступ к Yandex Telemost

## 🚨 Ограничения

- Максимальная длительность записи: 1 час (3600 секунд) для фиксированной записи
- Максимальная длительность записи до завершения встречи: 2 часа (7200 секунд)
- Минимальная длительность записи: 10 секунд
- Поддерживаемые форматы: webm, mp3, wav
- Файлы автоматически удаляются после отправки

## 📝 Примеры использования

### JavaScript/TypeScript

```javascript
const axios = require("axios");

// Запись на фиксированное время
async function recordMeetingFixed() {
  try {
    const response = await axios.post(
      "http://localhost:3100/api/record",
      {
        meetingUrl: "https://telemost.yandex.ru/your-meeting-url",
        duration: 300,
        format: "webm",
      },
      {
        responseType: "stream",
      }
    );

    const writer = fs.createWriteStream("meeting.webm");
    response.data.pipe(writer);

    console.log("Запись завершена");
  } catch (error) {
    console.error("Ошибка:", error.response?.data);
  }
}

// Запись до завершения встречи
async function recordMeetingUntilEnd() {
  try {
    const response = await axios.post(
      "http://localhost:3100/api/record",
      {
        meetingUrl: "https://telemost.yandex.ru/your-meeting-url",
        recordUntilEnd: true,
        maxDuration: 7200, // 2 часа
        format: "webm",
      },
      {
        responseType: "stream",
      }
    );

    const writer = fs.createWriteStream("meeting.webm");
    response.data.pipe(writer);

    console.log("Запись завершена");
  } catch (error) {
    console.error("Ошибка:", error.response?.data);
  }
}
```

### Python

```python
import requests

# Запись на фиксированное время
def record_meeting_fixed():
    url = "http://localhost:3100/api/record"
    data = {
        "meetingUrl": "https://telemost.yandex.ru/your-meeting-url",
        "duration": 300,
        "format": "webm"
    }

    response = requests.post(url, json=data, stream=True)

    if response.status_code == 200:
        with open('meeting.webm', 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print("Запись завершена")
    else:
        print(f"Ошибка: {response.json()}")

# Запись до завершения встречи
def record_meeting_until_end():
    url = "http://localhost:3100/api/record"
    data = {
        "meetingUrl": "https://telemost.yandex.ru/your-meeting-url",
        "recordUntilEnd": True,
        "maxDuration": 7200,  # 2 часа
        "format": "webm"
    }

    response = requests.post(url, json=data, stream=True)

    if response.status_code == 200:
        with open('meeting.webm', 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print("Запись завершена")
    else:
        print(f"Ошибка: {response.json()}")
```

## 🔍 Устранение неполадок

### Браузер не запускается

- Убедитесь, что установлен Google Chrome
- Проверьте права доступа к Chrome
- Попробуйте запустить с `BROWSER_HEADLESS=true`

### WebRTC соединение не устанавливается

- Убедитесь, что URL конференции корректный
- Проверьте, что конференция активна
- Убедитесь, что конференция не требует авторизации

### Ошибки записи

- Проверьте права на запись в директории `recordings/`
- Убедитесь, что достаточно места на диске
- Проверьте формат выходного файла
