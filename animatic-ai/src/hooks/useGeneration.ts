/**
 * =============================================================================
 * useGeneration.ts — ГЛАВНЫЙ ХУК ДЛЯ ГЕНЕРАЦИИ 3D МОДЕЛЕЙ
 * =============================================================================
 * 
 * Этот хук управляет всем процессом генерации 3D-модели из фотографии.
 * 
 * ПОТОК РАБОТЫ:
 * 1. Пользователь загружает фото → uploadFile() создает blob URL
 * 2. Пользователь нажимает "Сгенерировать" → startGenerationProcess()
 *    - Отправляет фото на backend
 *    - Backend создает запись в БД и ставит задачу в очередь
 *    - Возвращает generation_id
 * 3. Начинается POLLING (setInterval каждые 3 сек):
 *    - Опрос GET /api/generate/{gen_id}
 *    - Проверяет status: "queued" → "processing" → "completed"
 *    - Обновляет progress (0-100)
 * 4. Когда status === "completed":
 *    - Загружает model file_url из БД
 *    - Передает его в Viewer3D для рендеринга
 * 
 * ВАЖНЫЕ ПЕРЕМЕННЫЕ СОСТОЯНИЯ:
 * - file: загруженный File (原始ное фото)
 * - fileUrl: blob URL для превью в браузере
 * - generating: true пока идет генерация
 * - progress: 0-100 процент выполнения
 * - status: "queued" | "processing" | "completed" | "failed"
 * - resultModelId: ID готовой модели в БД
 * - modelFileUrl: URL .glb файла для Viewer3D
 * - credits: количество кредитов пользователя
 * 
 * ПАРАМЕТРЫ КАЧЕСТВА (qualityLevel):
 * - draft: resolution=128, steps=20, guidance=4.0 (быстро, низкое качество)
 * - high: resolution=256, steps=30, guidance=5.5 (баланс)
 * - ultra: resolution=512, steps=50, guidance=7.0 (медленно,最高 качество)
 * 
 * ПОЛИГОНЫ (polyCount):
 * - 5K: 5000 полигонов (маленькие объекты)
 * - 25K: 25000
 * - 50K: 50000 (по умолчанию)
 * - 75K: 75000
 * - 100K+: 100000+ (детальные модели)
 * 
 * PBR (Physically Based Rendering):
 * - enablePbr=true: генерирует текстуры (albedo, normal, roughness, metallic)
 * - enablePbr=false: только геометрия без текстур
 * 
 * =============================================================================
 */

import { useState, useCallback, useRef } from "react";
import {
  startGeneration,      // API: POST /api/generate
  getGenerationStatus, // API: GET /api/generate/{id}
  fetchModel,          // API: GET /api/models/{id}
  getUserCredits,      // API: GET /api/users/{id}/credits
  fetchUserGenerations, // API: GET /api/users/{id}/generations
} from "../services/api";

/**
 * Режим генерации: модель или анимация
 * - "model": генерация 3D-модели из фото
 * - "animation": генерация анимации из видео (пока не реализовано)
 */
export type GenerationMode = "model" | "animation";

/**
 * Статус генерации в очереди:
 * - "queued": в очереди, ждет обработки
 * - "processing": GPU обрабатывает
 * - "completed": готово, можно скачивать
 * - "failed": ошибка при генерации
 */
export type GenerationStatus = "queued" | "processing" | "completed" | "failed";

/**
 * Уровень качества генерации:
 * - draft: быстро, 128³ вокселей, 20 шагов
 * - high: средне, 256³ вокселей, 30 шагов
 * - ultra: медленно, 512³ вокселей, 50 шагов
 */
export type QualityLevel = "draft" | "high" | "ultra";

/**
 * Настройки генерации, которые пользователь выбирает в UI
 */
export interface GenerationSettings {
  name: string;           // Название модели
  category: string;      // Категория
  description: string;  // Описание
  stylePreset: string;   // Стиль (realism, anime, etc)
  qualityLevel: QualityLevel; // Качество
  polyCount: string;     // Количество полигонов
  enablePbr: boolean;  // Включить PBR текстуры
  enableRig: boolean;  // Включить риг (скелет)
  autoPublish: boolean; // Автоопубликация в каталог
}

/**
 * Элемент истории генераций в боковой панели
 */
export interface GenerationHistory {
  id: string;
  type: "model_photo" | "animation_video";
  status: GenerationStatus;
  name: string;
  createdAt: string;
  thumbnail?: string;
  queuePosition?: number | null;
  queueLength?: number | null;
  resultModelId?: string | null;
}

/**
 * Интервал опроса статуса в миллисекундах
 * 3000ms = 3 секунды — разумный баланс между нагрузкой и отзывчивостью
 */
const POLL_INTERVAL = 3000;

/**
 * =============================================================================
 * useGeneration() — главный хук
 * =============================================================================
 * Возвращает объект с состоянием и функциями для управления генерацией
 * 
 * Пример использования:
 * ```ts
 * const { file, fileUrl, generating, progress, status, modelFileUrl, 
 *         uploadFile, startGeneration, loadUserCredits, reset } = useGeneration();
 * 
 * // Загрузить фото
 * await uploadFile(fileInput.files[0]);
 * 
 * // Начать генерацию
 * await startGeneration(user.id, settings);
 * ```
 * =============================================================================
 */
export function useGeneration() {
  // =========================================================================
  // СОСТОЯНИЕ (STATE)
  // =========================================================================
  
  /** Режим: модель или анимация */
  const [mode, setMode] = useState<GenerationMode>("model");
  
  /** Загруженный файл (原始ное фото пользователя) */
  const [file, setFile] = useState<File | null>(null);
  
  /** Blob URL для превью — работает локально без сервера! 
   * Создается через URL.createObjectURL(file) 
   * Это временный URL вида "blob:http://localhost:3000/xxx" */
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  
  /** Идет ли загрузка файла */
  const [uploading, setUploading] = useState(false);
  
  /** Идет ли генерация (показываем прогресс) */
  const [generating, setGenerating] = useState(false);
  
  /** Прогресс 0-100 — обновляется при polling */
  const [progress, setProgress] = useState(0);
  
  /** Текущий статус генерации */
  const [status, setStatus] = useState<GenerationStatus | null>(null);
  
  /** Сообщение об ошибке */
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  /** Кредиты пользователя (15 бесплатно каждые 30 дней) */
  const [credits, setCredits] = useState<number>(15);
  
  /** Дата следующего сброса кредитов */
  const [creditsResetDate, setCreditsResetDate] = useState<string | null>(null);
  
  /** Флаг скорого истечения подписки */
  const [creditsExpiringSoon, setCreditsExpiringSoon] = useState<boolean>(false);
  
  /** История генераций пользователя */
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  
  /** ID готовой модели в БД — используется для перехода на страницу редактирования */
  const [resultModelId, setResultModelId] = useState<string | null>(null);
  
  /** URL .glb файла для Viewer3D — загружается после завершения */
  const [modelFileUrl, setModelFileUrl] = useState<string | null>(null);

  // =========================================================================
  // REFS (изменяемые значения без ререндера)
  // =========================================================================
  
  /** ID текущей генерации — сохраняем в ref, потому что нужно сохранить между рендерами */
  const genIdRef = useRef<string | null>(null);
  
  /** ID интервала polling — нужно хранить для очистки */
  const pollRef = useRef<number | null>(null);
  
  /** Коллбэк при завершении — устанавливается из GenerationPage */
  const onCompleteRef = useRef<((modelId: string) => void) | null>(null);

  // =========================================================================
  // ФУНКЦИИ
  // =========================================================================

  /**
   * =============================================================================
   * pollStatus() — ОПРОС СТАТУСА ГЕНЕРАЦИИ
   * =============================================================================
   * Вызывается каждые 3 секунды через setInterval
   * 
   * Что делает:
   * 1. Делает GET запрос к /api/generate/{gen_id}
   * 2. Обновляет progress и status
   * 3. Если completed — загружает model file_url
   * 4. Если failed — показывает ошибку
   * 5. Останавливает polling при завершении
   * =============================================================================
   */
  const pollStatus = useCallback(async (genId: string) => {
    try {
      // Запрос к API
      const res = await getGenerationStatus(genId);
      
      // Обновляем состояние
      setProgress(res.progress);
      setStatus(res.status);

      // Проверяем завершение
      if (res.status === "completed" || res.status === "failed") {
        // Останавливаем polling
        setGenerating(false);
        if (pollRef.current) clearInterval(pollRef.current);
        
        // Обрабатываем ошибку
        if (res.status === "failed") {
          setErrorMessage(res.error_message || "Generation failed");
        }
        
        // Обрабатываем успех
        if (res.status === "completed" && res.result_model_id) {

          setResultModelId(res.result_model_id);
          
          // Загружаем URL файла модели
          try {
            const model = await fetchModel(res.result_model_id);

            setModelFileUrl(model.file_url);
          } catch (err) {
            // ...
          }
          
          // Вызываем коллбэк (показывает модалку лицензии)
          if (onCompleteRef.current) {
            onCompleteRef.current(res.result_model_id);
          }
        }
        
        // Очищаем ref
        genIdRef.current = null;
      }
    } catch (err: any) {
      // ...
    }
  }, []);

  /**
   * =============================================================================
   * uploadFileToStorage() — ЗАГРУЗКА ФАЙЛА
   * =============================================================================
   * Создает blob URL для мгновенного превью без отправки на сервер!
   * 
   * blob URL работает так:
   * 1. Браузер создает временный URL из File объекта
   * 2. URL вида "blob:http://localhost:3000/abc123"
   * 3. Этот URL можно использовать в <img src="...">
   * 4. При перезагрузке страницы URL становится недействительным
   * 
   * Настоящая загрузка происходит только при startGeneration!
   * =============================================================================
   */
  const uploadFileToStorage = useCallback(async (uploadedFile: File) => {
    try {
      setUploading(true);
      
      // Создаем blob URL — НЕ нужен сервер!
      const localUrl = URL.createObjectURL(uploadedFile);
      setFile(uploadedFile);
      setFileUrl(localUrl);
      
      return { requestId: crypto.randomUUID(), url: localUrl };
    } catch (error: any) {
      setErrorMessage(error.message);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  /**
   * =============================================================================
   * startGenerationProcess() — ЗАПУСК ГЕНЕРАЦИИ
   * =============================================================================
   * Основная функция — отправляет фото на backend и начинает polling
   * 
   * Что делает:
   * 1. Проверяет что файл загружен
   * 2.Maps quality level → ML параметры
   * 3. Делает POST /api/generate с фото
   * 4. Получает generation_id
   * 5. НАЧИНАЕТ POLLING (сам вызывает pollStatus каждые 3 сек)
   * =============================================================================
   */
  const startGenerationProcess = useCallback(
    async (userId: string, settings: GenerationSettings) => {
      if (!file) {
        setErrorMessage("Сначала загрузите файл");
        return null;
      }

      /**
       * Маппинг качества в параметры ML модели
       * 
       * octree_resolution: разрешение воксельной сетки
       *   - 128: быстро, но мало деталей
       *   - 256: баланс (рекомендуется)
       *   - 512: медленно, но очень детально
       * 
       * num_inference_steps: количество шагов диффузии
       *   - 20: быстро, но может быть шумно
       *   - 30: баланс
       *   - 50: качественно, но медленно
       * 
       * guidance_scale: сила classifier-free guidance
       *   - 4.0: свободнее, разнообразнее
       *   - 5.5: баланс (рекомендуется)
       *   - 7.0: точнее follow prompt, но может переобучиться
       */
      const qualityMap: Record<
        string,
        { resolution: number; steps: number; guidance: number }
      > = {
        draft:   { resolution: 128, steps: 20, guidance: 4.0 },
        high:   { resolution: 256, steps: 30, guidance: 5.5 },
        ultra:  { resolution: 512, steps: 50, guidance: 7.0 },
      };
      const q = qualityMap[settings.qualityLevel] ?? qualityMap.high;

      try {
        // Сбрасываем состояние перед новой генерацией
        setGenerating(true);
        setStatus("queued");
        setProgress(0);
        setErrorMessage(null);
        setResultModelId(null);
        setModelFileUrl(null);

        // ОТПРАВЛЯЕМ ФОТО НА BACKEND
        // Формат: multipart/form-data (потому что передаем файл)
        const result = await startGeneration(
          file,                           // Файл изображения
          settings.stylePreset || "realism", // Стиль
          userId,                       // ID пользователя
          {
            name: settings.name,
            octree_resolution: q.resolution,
            num_steps: q.steps,
            guidance_scale: q.guidance,
            enable_pbr: settings.enablePbr,
            poly_count: settings.polyCount,
          },
        );

        
        // Сохраняем ID для polling
        genIdRef.current = result.generation_id;

        // НАЧИНАЕМ POLLING — это ключевое!
        // Не используем useEffect — сразу запускаем после отправки
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = window.setInterval(() => {
          if (genIdRef.current) {
            pollStatus(genIdRef.current);
          }
        }, POLL_INTERVAL);


        return result;
      } catch (error: any) {
        setGenerating(false);
        setStatus("failed");
        setErrorMessage(error.message);
        return null;
      }
    },
    [file],  // file — зависимость, при изменении функция пересоздается
  );

  /**
   * =============================================================================
   * loadUserHistory() — ЗАГРУЗИТЬ ИСТОРИЮ ГЕНЕРАЦИЙ
   * =============================================================================
   * Получает историю генераций пользователя из API
   * Показывает в боковой панели (HistoryPanel)
   * =============================================================================
   */
  const loadUserHistory = useCallback(async (userId: string) => {
    try {
      const data = await fetchUserGenerations(userId, 10);
      const items = data.items.map((item: any) => {
        const entry: GenerationHistory = {
          id: item.id,
          type: item.type as "model_photo" | "animation_video",
          status: item.status as GenerationStatus,
          name: `Генерация ${item.id.slice(0, 8)}`,
          createdAt: item.created_at,
          queuePosition: item.queue_position,
          queueLength: item.queue_length,
          resultModelId: item.result_model_id || null,
        };
        
        // Для завершенных — получаем превью модели
        if (item.status === "completed" && item.result_model_id) {
          fetchModel(item.result_model_id)
            .then((model) => {
              entry.name = model.name;
              entry.thumbnail = model.preview_url || undefined;
            })
            .catch(() => {});
        }
        
        // Для.failed — убираем превью
        if (item.status === "failed") {
          entry.thumbnail = undefined;
        }
        
        return entry;
      });
      setHistory(items);
    } catch (err) {
    }
  }, []);

  /**
   * =============================================================================
   * loadUserCredits() — ЗАГРУЗИТЬ КРЕДИТЫ
   * =============================================================================
   * Кредиты: 15 бесплатно, сбрасываются каждые 30 дней
   * Используются для генерации: 3 кредита за генерацию
   * =============================================================================
   */
  const loadUserCredits = useCallback(async (userId: string) => {
    try {
      const data = await getUserCredits(userId);
      setCredits(data.credits);
      setCreditsResetDate(data.reset_date);
      setCreditsExpiringSoon(!!data.expiring_soon);
    } catch (err) {
    }
  }, []);

  /**
   * =============================================================================
   * removeFile() — УДАЛИТЬ ФАЙЛ
   * =============================================================================
   * Освобождает blob URL памяти браузера
   * =============================================================================
   */
  const removeFile = useCallback(() => {
    if (fileUrl && fileUrl.startsWith("blob:")) URL.revokeObjectURL(fileUrl);
    setFile(null);
    setFileUrl(null);
  }, [fileUrl]);

  /**
   * =============================================================================
   * reset() — СБРОС СОСТОЯНИЯ
   * =============================================================================
   * Очищает все состояние — используется при "Начать заново"
   * =============================================================================
   */
  const reset = useCallback(() => {
    removeFile();
    setGenerating(false);
    setProgress(0);
    setStatus(null);
    setErrorMessage(null);
    setResultModelId(null);
    setModelFileUrl(null);
    if (pollRef.current) clearInterval(pollRef.current);
    genIdRef.current = null;
    onCompleteRef.current = null;
  }, [removeFile]);

  /**
   * =============================================================================
   * setOnComplete() — УСТАНОВИТЬ КОЛЛБЭК
   * =============================================================================
   * Устанавливается из GenerationPage при первом рендере
   * Вызывается после successful генерации
   * =============================================================================
   */
  const setOnComplete = useCallback(
    (cb: ((modelId: string) => void) | null) => {
      onCompleteRef.current = cb;
    },
    [],
  );

  // =========================================================================
  // RETURN
  // =========================================================================
  
  return {
    mode,
    setMode,
    file,
    fileUrl,
    uploading,
    generating,
    progress,
    status,
    errorMessage,
    credits,
    creditsResetDate,
    creditsExpiringSoon,
    history,
    resultModelId,
    modelFileUrl,
    setOnComplete,
    uploadFile: uploadFileToStorage,
    startGeneration: startGenerationProcess,
    loadUserCredits,
    loadUserHistory,
    removeFile,
    reset,
  };
}