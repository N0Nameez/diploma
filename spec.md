# Техническая спецификация проекта AnimaticAI

В данном документе приведено детальное техническое описание архитектуры, используемого стека технологий, структуры данных и функциональных модулей веб-платформы **AnimaticAI**.

---

## 1. ОБЩЕЕ ОПИСАНИЕ СИСТЕМЫ

**AnimaticAI** — это высокотехнологичная веб-платформа для генерации 3D-моделей из изображений и автоматизированного риггинга. Система объединяет современные диффузионные модели машинного обучения с развитой социальной инфраструктурой и системой монетизации.

**Архитектурный паттерн:** Микросервисно-ориентированная архитектура (Service-Oriented Architecture) с четким разделением на:
*   **Client Side:** SPA на React.
*   **API Layer:** Асинхронный бэкенд на FastAPI.
*   **Task Layer:** Распределенная очередь задач на базе ARQ и Redis для GPU-интенсивных вычислений.
*   **Data Layer:** PostgreSQL (Supabase) и S3-совместимое объектное хранилище.

---

## 2. ТЕХНОЛОГИЧЕСКИЙ СТЕК

### Фронтенд (Frontend)
*   **Ядро:** React 19, TypeScript (Strict Mode).
*   **Роутинг:** React Router DOM v7.
*   **Стилизация:** Tailwind CSS v3 (v4 Ready), CSS Modules, Framer Motion (анимации).
*   **3D-графика:** Three.js, React Three Fiber (R3F), @react-three/drei.
*   **Состояние:** Zustand (Auth, User), React Context (Generation).
*   **Формы и Валидация:** React Hook Form, Zod.
*   **Компоненты:** Radix UI (Primitives), Lucide React (Icons), Recharts (Analytics).
*   **Утилиты:** `react-easy-crop`, `react-hot-toast`.

### Бэкенд (Backend)
*   **Ядро:** Python 3.10+, FastAPI (Uvicorn).
*   **Очередь задач:** ARQ (Async Redis Queue), Redis.
*   **Безопасность:** Supabase Auth (JWT), Slowapi (Rate Limiting), CORS.
*   **База данных:** PostgreSQL (через `psycopg2-binary` для транзакций и `supabase-py` для SDK-задач).
*   **Интеграции:** ЮKassa SDK (платежи), Yandex SMTP (Email).

### Машинное обучение (ML Pipeline)
*   **Модели генерации:** 
    *   Hunyuan3D-1 (CLI Integration).
    *   Hunyuan3D-2 (Direct PyTorch Pipeline: ShapeGen, TexGen).
    *   TRELLIS2 (Subprocess Integration).
*   **Препроцессинг:** `rembg` (BirefNet/u2net), OpenCV, Pillow.
*   **Валидация:** MediaPipe (Pose Landmarking).
*   **Постобработка:** Trimesh, PyMeshLab, xatlas, CLIP (Classification).
*   **Модерация:** NSFW Image Classifier, Toxicity Text Classifier.

### Инфраструктура
*   **Контейнеризация:** Docker, Docker Compose.
*   **Прокси/Туннели:** Cloudflare Tunnel (cloudflared).
*   **Хранилище:** Supabase Storage (Buckets: `models`, `previews`, `avatars`, `animations`, `generation-inputs`).

---

## 3. АРХИТЕКТУРА И МОДУЛИ

### Структура каталогов
*   `/animatic-ai/src`: Клиентская часть (components, hooks, pages, services).
*   `/animatic-ai/backend`: FastAPI сервер и логика воркера.
*   `/animatic-ai/backend/generation`: Скрипты ML пайплайна и интеграция моделей.
*   `/animatic-ai/supabase/migrations`: Схемы базы данных и RLS политики.
*   `/Machine_learning`: Изолированные окружения для инференса тяжелых моделей.

### Взаимодействие компонентов
1.  **Frontend** отправляет изображение и параметры в **API**.
2.  **API** валидирует данные, резервирует токены (credits) и ставит задачу в **Redis**.
3.  **ARQ Worker** (на GPU ноде) выполняет препроцессинг, генерацию 3D-меша, текстурирование и рендеринг превью.
4.  **Worker** сохраняет артефакты в **Supabase Storage** и обновляет записи в **PostgreSQL**.
5.  **API** уведомляет пользователя через WebSocket/Polling или **Notification System**.

---

## 4. СПЕЦИФИКАЦИЯ API И ДАННЫХ

### Ключевые эндпоинты
*   `POST /api/generate`: Запуск процесса генерации (Multipart Form Data).
*   `GET /api/generate/{gen_id}`: Проверка статуса и прогресса задачи.
*   `GET /api/models`: Поиск и фильтрация моделей в каталоге.
*   `POST /api/payments/create`: Создание платежной сессии ЮKassa.
*   `POST /api/admin/reports/{id}/resolve`: Обработка жалоб модератором.
*   `GET /api/users/{id}/activity`: Данные для Heatmap активности пользователя.

### Основные модели данных
*   **user_profiles:** Профили, баланс кредитов, роль, статистика.
*   **models:** Метаданные 3D-объектов (URL, полигоны, категория, статус).
*   **animations:** Параметры скелетной анимации, привязка к модели.
*   **generation_requests:** Очередь задач с логами стадий выполнения.
*   **interactions:** Лайки, избранное, скачивания, отчеты (reports).
*   **notifications:** Системные и социальные уведомления.

---

## 5. ФОНОВЫЕ ЗАДАЧИ И АСИНХРОННЫЕ ПРОЦЕССЫ

### Типы воркеров
1.  **GPU Generation Worker:** Выполняет тяжелые нейросетевые вычисления.
2.  **Billing Worker (Cron):** 
    *   Проверка истечения подписок (ежечасно).
    *   Автопродление через ЮKassa (рекуррентные платежи).
    *   Сброс лимитов кредитов (ежемесячно).

### Триггеры базы данных (PostgreSQL)
*   Автоматическое обновление счетчиков (лайки, фолловеры).
*   Система автоматического бана: 3 активных предупреждения (`user_warnings`) -> статус `blocked`.
*   Генерация уведомлений при новых комментариях или подписках.

---

## 6. UX/UI И ЛОГИКА ИНТЕРФЕЙСА

### Основные экраны
*   **HomePage:** Hero-секция с демонстрацией возможностей, статистика платформы.
*   **CatalogPage:** Бесконечная лента с фильтрами по категориям, форматам и тегам.
*   **ModelPage:** 3D-вьювер (R3F), детализация (полигоны, лицензия), система комментариев.
*   **GenerationPage:** Пошаговый мастер (Step Wizard) — загрузка фото -> выбор модели -> настройки -> ожидание.
*   **ProfilePage:** Сетка работ автора, Heatmap активности, управление подписками.
*   **AdminDashboard:** Графики (Recharts), модерация контента, управление пользователями.

### Требования к UI
*   **Адаптивность:** Полная поддержка Mobile/Tablet/Desktop (Tailwind breakpoints).
*   **Темизация:** Поддержка Dark/Light режимов (через CSS Variables и data-theme).
*   **UX-паттерны:** Glassmorphism, Skeleton Loading, Оптимистичные обновления (Zustand/Context).

---
*Документ актуализирован на основе состояния кодовой базы от 26.05.2026.*
