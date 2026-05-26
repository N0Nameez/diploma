import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import {
  startGeneration,
  startAnimationGeneration,
  getGenerationStatus,
  fetchModel,
  fetchAnimation,
  getUserCredits,
  fetchUserGenerations,
  getGenerationLogs,
  type GenerationLog,
} from "../services/api";

export type GenerationMode = "model" | "animation";
export type GenerationStatus = "queued" | "processing" | "completed" | "failed";
export type QualityLevel = "draft" | "high" | "ultra";

export interface GenerationSettings {
  name: string;
  industry: string;
  description: string;
  stylePreset: string;
  qualityLevel: QualityLevel;
  polyCount: string;
  enablePbr: boolean;
  enableRig: boolean;
  autoPublish: boolean;
  aiModel: string;
}

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

const POLL_INTERVAL = 3000;

interface GenerationContextType {
  mode: GenerationMode;
  setMode: (mode: GenerationMode) => void;
  file: File | null;
  fileUrl: string | null;
  uploading: boolean;
  generating: boolean;
  progress: number;
  status: GenerationStatus | null;
  errorMessage: string | null;
  credits: number;
  creditsResetDate: string | null;
  creditsExpiringSoon: boolean;
  history: GenerationHistory[];
  resultModelId: string | null;
  modelFileUrl: string | null;
  resultAnimationId: string | null;
  animationFileUrl: string | null;
  queuePosition: number | null;
  queueLength: number;
  totalDurationMs: number | null;
  logs: GenerationLog[];
  fetchLogs: (genId: string) => Promise<void>;
  setOnComplete: (cb: ((modelId: string) => void) | null) => void;
  uploadFile: (uploadedFile: File) => Promise<{ requestId: string; url: string } | null>;
  startGeneration: (userId: string, settings: GenerationSettings) => Promise<string | null>;
  loadUserCredits: (userId: string) => Promise<void>;
  loadUserHistory: (userId: string) => Promise<void>;
  resumeGenerationById: (genId: string) => Promise<void>;
  removeFile: () => void;
  reset: () => void;
  settings: GenerationSettings;
  setSettings: React.Dispatch<React.SetStateAction<GenerationSettings>>;
}

const GenerationContext = createContext<GenerationContextType | null>(null);

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<GenerationMode>("model");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<GenerationStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(15);
  const [creditsResetDate, setCreditsResetDate] = useState<string | null>(null);
  const [creditsExpiringSoon, setCreditsExpiringSoon] = useState<boolean>(false);
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [resultModelId, setResultModelId] = useState<string | null>(null);
  const [modelFileUrl, setModelFileUrl] = useState<string | null>(null);
  const [resultAnimationId, setResultAnimationId] = useState<string | null>(null);
  const [animationFileUrl, setAnimationFileUrl] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [queueLength, setQueueLength] = useState<number>(0);
  const [totalDurationMs, setTotalDurationMs] = useState<number | null>(null);
  const [logs, setLogs] = useState<GenerationLog[]>([]);

  const [settings, setSettings] = useState<GenerationSettings>({
    name: "",
    industry: "Кинопроизводство",
    description: "",
    stylePreset: "realism",
    qualityLevel: "high",
    polyCount: "50k",
    enablePbr: true,
    enableRig: true,
    autoPublish: false,
    aiModel: "Hunyuan3D-1",
  });

  const genIdRef = useRef<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const onCompleteRef = useRef<((modelId: string) => void) | null>(null);

  const fetchLogs = useCallback(async (genId: string) => {
    try {
      const data = await getGenerationLogs(genId);
      setLogs(data);
    } catch (err) {}
  }, []);

  const pollStatus = useCallback(async (genId: string) => {
    try {
      const res = await getGenerationStatus(genId);
      setStatus(res.status);
      setProgress(res.progress);
      setTotalDurationMs(res.total_duration_ms);

      if (res.queue_position != null) {
        setQueuePosition(res.queue_position);
        setQueueLength(res.queue_length ?? 0);
      } else {
        setQueuePosition(null);
      }

      if (res.status === "completed" || res.status === "failed") {
        setGenerating(false);
        if (pollRef.current) clearInterval(pollRef.current);
        
        if (res.status === "failed") {
          setErrorMessage(res.error_message || "Generation failed");
        }
        
        if (res.status === "completed") {
          if (res.result_model_id) {
            setResultModelId(res.result_model_id);
            try {
              const model = await fetchModel(res.result_model_id);
              setModelFileUrl(model.file_url);
            } catch (err) {}
            
            if (onCompleteRef.current) {
              onCompleteRef.current(res.result_model_id);
            }
          }
          if (res.result_animation_id) {
            setResultAnimationId(res.result_animation_id);
            try {
              const anim = await fetchAnimation(res.result_animation_id);
              setAnimationFileUrl(anim.file_url);
            } catch (err) {}
            
            if (onCompleteRef.current) {
              onCompleteRef.current(res.result_animation_id);
            }
          }
        }
        
        genIdRef.current = null;
        sessionStorage.removeItem("active_gen_id");
        fetchLogs(genId);
      }
    } catch (err: any) {
      if (pollRef.current) clearInterval(pollRef.current);
      setGenerating(false);
      setErrorMessage(err.message || "Connection error");
    }
  }, [fetchLogs]);

  useEffect(() => {
    const savedGenId = sessionStorage.getItem("active_gen_id");
    if (!savedGenId || generating) return;

    const resumePolling = async () => {
      try {
        const res = await getGenerationStatus(savedGenId);
        if (res.status === "queued" || res.status === "processing") {
          setGenerating(true);
          setStatus(res.status);
          setProgress(res.progress);
          if (res.source_image_url) setFileUrl(res.source_image_url);
          genIdRef.current = savedGenId;
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = window.setInterval(() => {
            pollStatus(savedGenId);
          }, POLL_INTERVAL);
        } else if (res.status === "completed") {
          setStatus("completed");
          setProgress(100);
          if (res.source_image_url) setFileUrl(res.source_image_url);
          if (res.result_model_id) {
            setResultModelId(res.result_model_id);
            fetchModel(res.result_model_id).then(m => setModelFileUrl(m.file_url)).catch(() => {});
          }
          if (res.result_animation_id) {
            setResultAnimationId(res.result_animation_id);
            fetchAnimation(res.result_animation_id).then(a => setAnimationFileUrl(a.file_url)).catch(() => {});
          }
          fetchLogs(savedGenId);
        }
      } catch (err) {}
    };
    resumePolling();
  }, [pollStatus, generating, fetchLogs]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const uploadFile = useCallback(async (uploadedFile: File) => {
    try {
      setUploading(true);
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

  const startGenerationProcess = useCallback(async (userId: string, currentSettings: GenerationSettings) => {
    if (!file) {
      setErrorMessage("Сначала загрузите файл");
      return null;
    }

    if (mode === "animation") {
      try {
        setGenerating(true);
        setStatus("queued");
        setProgress(0);
        setErrorMessage(null);
        setResultAnimationId(null);
        setAnimationFileUrl(null);
        setLogs([]);

        const result = await startAnimationGeneration(
          file,
          userId,
          resultModelId || undefined,
          {
            name: currentSettings.name,
            description: currentSettings.description,
          }
        );

        const genId = result.generation_id;
        genIdRef.current = genId;
        sessionStorage.setItem("active_gen_id", genId);

        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = window.setInterval(() => {
          pollStatus(genId);
        }, POLL_INTERVAL);

        return genId;
      } catch (err: any) {
        setGenerating(false);
        setStatus("failed");
        setErrorMessage(err.message || "Failed to start animation generation");
        return null;
      }
    }

    const qualityMap: Record<string, { resolution: number; steps: number; guidance: number }> = {
      draft: { resolution: 128, steps: 20, guidance: 4.0 },
      high: { resolution: 256, steps: 30, guidance: 5.5 },
      ultra: { resolution: 512, steps: 50, guidance: 7.0 },
    };
    const q = qualityMap[currentSettings.qualityLevel] ?? qualityMap.high;

    try {
      setGenerating(true);
      setStatus("queued");
      setProgress(0);
      setErrorMessage(null);
      setResultModelId(null);
      setModelFileUrl(null);
      setResultAnimationId(null);
      setAnimationFileUrl(null);
      setLogs([]);

      const result = await startGeneration(
        file,
        currentSettings.stylePreset || "realism",
        userId,
        {
          name: currentSettings.name,
          description: currentSettings.description,
          octree_resolution: q.resolution,
          num_steps: q.steps,
          guidance_scale: q.guidance,
          enable_pbr: currentSettings.enablePbr,
          enable_rig: currentSettings.enableRig,
          poly_count: currentSettings.polyCount,
          ai_model: currentSettings.aiModel,
          category: currentSettings.industry, // Temporary passing industry as category until API update
          industry: currentSettings.industry,
          quality_level: currentSettings.qualityLevel,
        }
      );

      const genId = result.generation_id;
      genIdRef.current = genId;
      sessionStorage.setItem("active_gen_id", genId);

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = window.setInterval(() => {
        pollStatus(genId);
      }, POLL_INTERVAL);

      return genId;
    } catch (err: any) {
      setGenerating(false);
      setStatus("failed");
      setErrorMessage(err.message || "Failed to start generation");
      return null;
    }
  }, [file, pollStatus]);

  const loadUserCredits = useCallback(async (userId: string) => {
    try {
      const data = await getUserCredits(userId);
      setCredits(data.credits);
      setCreditsResetDate(data.reset_date);
      setCreditsExpiringSoon(!!data.expiring_soon);
    } catch (err) {}
  }, []);

  const loadUserHistory = useCallback(async (userId: string) => {
    try {
      const data = await fetchUserGenerations(userId);
      const items = data.items.map((item: any) => {
        const isAnim = item.type === "animation" || item.type === "animation_video";
        const entry: GenerationHistory = {
          id: item.id,
          type: isAnim ? "animation_video" : "model_photo",
          status: item.status,
          name: "Без названия",
          createdAt: item.created_at,
          resultModelId: isAnim ? item.result_animation_id : item.result_model_id,
        };
        if (item.status === "completed") {
          if (isAnim && item.result_animation_id) {
            fetchAnimation(item.result_animation_id).then(a => {
              entry.name = a.name;
              entry.thumbnail = a.preview_url || undefined;
            }).catch(() => {});
          } else if (item.result_model_id) {
            fetchModel(item.result_model_id).then(m => {
              entry.name = m.name;
              entry.thumbnail = m.preview_url || undefined;
            }).catch(() => {});
          }
        }
        return entry;
      });
      setHistory(items);
    } catch (err) {}
  }, []);

  const resumeGenerationById = useCallback(async (genId: string) => {
    try {
      setGenerating(true);
      genIdRef.current = genId;
      sessionStorage.setItem("active_gen_id", genId);
      const res = await getGenerationStatus(genId);
      setStatus(res.status);
      setProgress(res.progress);
      if (res.source_image_url) setFileUrl(res.source_image_url);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = window.setInterval(() => {
        pollStatus(genId);
      }, POLL_INTERVAL);
    } catch (err) {
      setGenerating(false);
    }
  }, [pollStatus]);

  const removeFile = useCallback(() => {
    if (fileUrl && fileUrl.startsWith("blob:")) URL.revokeObjectURL(fileUrl);
    setFile(null);
    setFileUrl(null);
  }, [fileUrl]);

  const reset = useCallback(() => {
    removeFile();
    setGenerating(false);
    setProgress(0);
    setStatus(null);
    setErrorMessage(null);
    setResultModelId(null);
    setModelFileUrl(null);
    setResultAnimationId(null);
    setAnimationFileUrl(null);
    setQueuePosition(null);
    setQueueLength(0);
    setTotalDurationMs(null);
    setLogs([]);
    if (pollRef.current) clearInterval(pollRef.current);
    genIdRef.current = null;
    sessionStorage.removeItem("active_gen_id");
    onCompleteRef.current = null;
  }, [removeFile]);

  const setOnComplete = useCallback((cb: ((modelId: string) => void) | null) => {
    onCompleteRef.current = cb;
  }, []);

  const value = {
    mode, setMode, file, fileUrl, uploading, generating, progress, status,
    errorMessage, credits, creditsResetDate, creditsExpiringSoon, history,
    resultModelId, modelFileUrl, resultAnimationId, animationFileUrl, queuePosition,
    queueLength, totalDurationMs, logs, fetchLogs, setOnComplete, uploadFile,
    startGeneration: startGenerationProcess, loadUserCredits, loadUserHistory,
    resumeGenerationById, removeFile, reset, settings, setSettings
  };

  return <GenerationContext.Provider value={value}>{children}</GenerationContext.Provider>;
}

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error("useGeneration must be used within a GenerationProvider");
  }
  return context;
}
