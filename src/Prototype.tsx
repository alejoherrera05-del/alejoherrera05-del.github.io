import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, ReactNode } from "react";
import {
  ActivityLogIcon,
  BarChartIcon,
  CameraIcon,
  CheckCircledIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleIcon,
  Crosshair2Icon,
  FileTextIcon,
  HomeIcon,
  LightningBoltIcon,
  MagnifyingGlassIcon,
  PersonIcon,
  PlayIcon,
  PlusIcon,
  ReaderIcon,
  RocketIcon,
  StopwatchIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { BottomSheet, Carousel, KeyboardInput, MobileScroll, useKeyboard } from "./mobile";
import knowledgeBase from "../knowledge/fitness-knowledge.json";
import {
  createBackup,
  downloadJson,
  loadPhotoFiles,
  loadPhotoUploadPayload,
  readStoredState,
  restoreBackup,
  savePhotoFile,
  writeStoredState,
} from "./alejandroStore";

type Tab = "inicio" | "entreno" | "nutricion" | "progreso" | "perfil" | "analisis";
type NutritionMode = "suplementos" | "hidratacion";
type TrainingView = "rutina" | "biblioteca" | "registro" | "historial";
type ProgressSection = "medidas" | "fotos";
type MeasureView = "actual" | "historial" | "comparar";
type Muscle = "Pecho" | "Espalda" | "Hombros" | "Bíceps" | "Tríceps" | "Cuádriceps" | "Glúteos" | "Femorales" | "Aductores" | "Abdominales" | "Cardio";
type Equipment = "Barra" | "Mancuernas" | "Máquina" | "Polea" | "Peso corporal";
type WeekDay = "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes";
type WeeklyPlan = Record<WeekDay, string[]>;

type ExerciseDefinition = {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  image: string;
  prescription: string;
  cue: string;
  aliases: string[];
};

type WorkoutSet = {
  id: string;
  weight: string;
  reps: string;
  rpe: string;
  done: boolean;
};

type Measurement = {
  id: string;
  date: string;
  weight: number;
  bodyFat: number;
  neck: number;
  chest: number;
  waist: number;
  biceps: number;
  forearm: number;
  thigh: number;
  calf: number;
};

type ProgressPhoto = {
  id: string;
  date: string;
  view: "Frente" | "Espalda" | "Perfil izq." | "Perfil der.";
  url: string;
};

type SavedWorkout = {
  id: string;
  date: string;
  day: WeekDay;
  routine: string;
  setCount: number;
  rpe: number;
  durationMinutes: number;
  sets: SavedWorkoutSet[];
};

type SavedWorkoutSet = {
  exerciseId: string;
  exercise: string;
  muscle: Muscle;
  equipment: Equipment;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe: number;
  durationMinutes?: number;
  speedKph?: number;
};

type SessionDraft = {
  id: string;
  day: WeekDay;
  weekKey: string;
  startedAt: string;
  setsByExercise: Record<string, WorkoutSet[]>;
};

type SyncQueueItem = {
  id: string;
  action: "logWorkout" | "logMeasurement" | "saveProgressPhoto";
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  error?: string;
};

type AppStateV2 = {
  version: 2;
  weeklyPlan: WeeklyPlan;
  weeklyPlansByWeek: Record<string, WeeklyPlan>;
  workoutHistory: SavedWorkout[];
  sessionDrafts: Record<string, SessionDraft>;
  measurements: Measurement[];
  hydration: { date: string; goalLiters: number; marks: boolean[] };
  supplements: { date: string; marks: boolean[] };
  syncQueue: SyncQueueItem[];
  photoBackups: Record<string, { driveUrl: string; syncedAt: string }>;
  physicalAnalyses: PhysicalAnalysis[];
  userProfile: UserProfile;
  goalPlans: GoalPlan[];
  supersetPairs: Record<string, string>;
  lastSyncAt?: string;
  aiConsent: boolean;
};

type AIRecommendation = {
  title: string;
  action: string;
  reason: string;
  dataUsed: string;
  confidence: "baja" | "media" | "alta";
};

const SYNC_TOKEN_STORAGE_KEY = "alejandro:privateSyncToken";

type EvidenceItem = {
  title: string;
  domain: string;
  strength: "baja" | "moderada" | "alta";
  sourceUrl: string;
};

type AIAnalysis = {
  title: string;
  summary: string;
  confidence: "baja" | "media" | "alta";
  recommendations: AIRecommendation[];
  nextWeekFocus: string;
  evidence?: EvidenceItem[];
};

type PhysicalAnalysis = {
  id: string;
  createdAt: string;
  beforePhotoId: string;
  afterPhotoId: string;
  beforeDate: string;
  afterDate: string;
  view: ProgressPhoto["view"];
  title: string;
  summary: string;
  overallConfidence: "baja" | "media";
  comparability: {
    rating: "baja" | "media" | "alta";
    notes: string;
  };
  observations: Array<{
    area: string;
    change: string;
    basis: string;
    confidence: "baja" | "media";
  }>;
  limitations: string;
  reportNote: string;
};

type UserProfile = {
  name: string;
  heightCm: string;
  targetWeightKg: string;
  objective: string;
  experience: "Principiante" | "Intermedio" | "Avanzado" | "";
  trainingDays: number;
  priorityMuscles: Muscle[];
  defaultRestSeconds: number;
};

type GoalPlan = {
  id: string;
  createdAt: string;
  title: string;
  objectiveStatement: string;
  weeklyGoal: string;
  challenge: string;
  successMetric: string;
  whyItFits: string;
  reviewDate: string;
  confidence: "baja" | "media";
};

const defaultUserProfile: UserProfile = {
  name: "Alejandro",
  heightCm: "",
  targetWeightKg: "",
  objective: "Ganar masa muscular",
  experience: "",
  trainingDays: 5,
  priorityMuscles: ["Pecho", "Bíceps"],
  defaultRestSeconds: 60,
};

const bootQuotes = [
  { quote: "No pierdas más tiempo discutiendo cómo debe ser un buen hombre. Sé uno.", author: "Marco Aurelio" },
  { quote: "Primero dite a ti mismo qué quieres ser; luego haz lo que tengas que hacer.", author: "Epicteto" },
  { quote: "Ningún hombre es libre si no es dueño de sí mismo.", author: "Epicteto" },
  { quote: "Sufrimos más en la imaginación que en la realidad.", author: "Séneca" },
];

type CoachAnswer = {
  title: string;
  answer: string;
  safetyLevel: "informativo" | "precaución" | "derivación médica";
  nextStep: string;
  evidence: EvidenceItem[];
};

const exerciseNames: Record<Muscle, Array<[string, Equipment, string, string, string?]>> = {
  Pecho: [
    ["Press banca", "Barra", "4 × 6–8", "Escápulas estables; controla el descenso."],
    ["Press inclinado", "Mancuernas", "3 × 8–10", "Antebrazos verticales y recorrido cómodo."],
    ["Press de pecho", "Máquina", "3 × 10–12", "Ajusta el asiento para empujar a mitad del pecho."],
    ["Aperturas", "Polea", "3 × 12–15", "Abraza al frente sin perder tensión."],
    ["Fondos para pecho", "Peso corporal", "3 × 6–12", "Inclina ligeramente el torso y evita rebotes."],
    ["Flexiones", "Peso corporal", "3 × 10–20", "Cuerpo firme y pecho cerca del suelo."],
    ["Aperturas en máquina (pec deck)", "Máquina", "3 × 12–15", "Mantén el pecho alto, apoya la espalda y cierra los brazos sin golpear los topes."],
    ["Press inclinado Smith", "Máquina", "3 × 8–12", "Coloca el banco para una trayectoria natural."],
    ["Press inclinado plate-loaded", "Máquina", "3 × 8–12", "Ajusta el asiento y evita perder contacto con el respaldo."],
    ["Press declinado", "Barra", "3 × 6–10", "Mantén escápulas estables y usa un asistente."],
    ["Apertura con mancuernas", "Mancuernas", "3 × 10–15", "Codo suave y recorrido controlado."],
    ["Press plano Smith", "Máquina", "3 × 8–12", "Alinea la barra con el pecho medio."],
  ],
  Espalda: [
    ["Dominadas lastradas", "Peso corporal", "4 × 6–8", "Sube el pecho hacia la barra sin balanceo."],
    ["Jalón al pecho", "Polea", "4 × 8–12", "Lleva los codos hacia las costillas."],
    ["Remo con barra", "Barra", "4 × 6–10", "Bisagra estable; acerca la barra al torso."],
    ["Remo unilateral", "Mancuernas", "3 × 8–12", "Evita girar el tronco al tirar."],
    ["Remo sentado", "Polea", "3 × 10–12", "Pausa con escápulas juntas."],
    ["Remo pecho apoyado · agarre cerrado", "Máquina", "3 × 8–12", "Pecho pegado al soporte, agarre neutro y codos junto al torso."],
    ["Remo pecho apoyado · agarre abierto", "Máquina", "3 × 10–12", "Pecho pegado al soporte, agarre ancho y codos hacia afuera con control."],
    ["Pullover", "Polea", "3 × 12–15", "Brazos casi rectos y costillas controladas."],
    ["Dominadas supinas", "Peso corporal", "3 × 6–10", "Recorrido completo sin perder el control."],
    ["Remo en T", "Barra", "3 × 6–10", "Mantén la bisagra y tira hacia el abdomen."],
    ["Remo bajo", "Máquina", "3 × 8–12", "Pecho apoyado y pausa al final."],
    ["Jalón agarre neutro", "Polea", "3 × 8–12", "Tira los codos hacia abajo sin balancearte."],
    ["Remo landmine", "Barra", "3 × 8–12", "Controla el torso y acerca el agarre al esternón."],
  ],
  Hombros: [
    ["Press de hombro", "Mancuernas", "4 × 6–10", "Respaldo firme, muñecas neutras y costillas controladas."],
    ["Press militar", "Barra", "3 × 5–8", "Aprieta glúteos y mueve la barra cerca del rostro."],
    ["Press de hombro", "Máquina", "3 × 8–12", "Ajusta el asiento para iniciar a la altura del hombro."],
    ["Elevación lateral", "Mancuernas", "4 × 10–15", "Eleva con control hasta la altura del hombro."],
    ["Elevación lateral unilateral", "Polea", "3 × 12–15", "Mantén tensión continua y evita inclinarte."],
    ["Pájaros en banco inclinado", "Mancuernas", "3 × 12–15", "Abre los brazos sin encoger los hombros."],
    ["Reverse pec deck", "Máquina", "3 × 12–15", "Pecho apoyado y codos alineados con hombros."],
    ["Face pull", "Polea", "3 × 12–15", "Lleva la cuerda al rostro y separa las manos."],
    ["Press Arnold", "Mancuernas", "3 × 8–12", "Rota de forma cómoda sin forzar el hombro."],
    ["Remo vertical", "Polea", "3 × 10–12", "Usa un rango cómodo y controla los codos."],
    ["Elevación Y", "Polea", "3 × 12–15", "Carga ligera y escápulas controladas."],
    ["Elevación frontal", "Mancuernas", "3 × 10–15", "Evita arquear la espalda al elevar."],
  ],
  Bíceps: [
    ["Curl con barra", "Barra", "3 × 8–12", "Codos quietos y sin impulso lumbar."],
    ["Curl alterno", "Mancuernas", "3 × 8–12", "Supina la mano y controla la bajada."],
    ["Curl inclinado", "Mancuernas", "3 × 10–12", "Hombros atrás y brazo extendido abajo."],
    ["Curl martillo", "Mancuernas", "3 × 10–14", "Muñeca neutra durante todo el recorrido."],
    ["Curl predicador", "Máquina", "3 × 10–12", "No hiperextiendas el codo al bajar."],
    ["Curl en polea", "Polea", "3 × 12–15", "Mantén tensión continua."],
    ["Curl concentración", "Mancuernas", "3 × 10–12", "Mueve solo el antebrazo."],
    ["Dominada supina cerrada", "Peso corporal", "3 × 6–10", "Termina con el mentón sobre la barra."],
  ],
  Tríceps: [
    ["Extensión en polea", "Polea", "4 × 10–12", "Fija los codos junto al torso."],
    ["Extensión sobre cabeza", "Polea", "3 × 10–14", "Mantén brazos altos y costillas abajo."],
    ["Press francés", "Barra", "3 × 8–12", "Flexiona el codo sin abrirlo en exceso."],
    ["Press banca cerrado", "Barra", "3 × 6–10", "Agarre cómodo y codos cerca del torso."],
    ["Fondos", "Peso corporal", "3 × 6–12", "Torso más vertical para enfatizar tríceps."],
    ["Extensión unilateral", "Mancuernas", "3 × 10–12", "Controla el estiramiento sobre la cabeza."],
    ["Rompecráneos", "Barra", "3 × 8–12", "Lleva la barra detrás de la frente con control."],
    ["Extensión de tríceps", "Máquina", "3 × 10–15", "Alinea el eje de la máquina con el codo."],
    ["Extensión sobre cabeza · barra V", "Polea", "3 × 10–14", "De espaldas a la polea, lleva la barra V detrás de la cabeza y extiende sin abrir los codos."],
  ],
  Cuádriceps: [
    ["Sentadilla trasera", "Barra", "4 × 5–8", "Rodillas siguen la línea de los pies."],
    ["Sentadilla frontal", "Barra", "3 × 5–8", "Codos altos y torso firme."],
    ["Prensa de piernas", "Máquina", "4 × 8–12", "No despegues la pelvis al bajar."],
    ["Hack squat", "Máquina", "3 × 8–12", "Usa una profundidad estable y controlada."],
    ["Extensión de rodilla", "Máquina", "3 × 12–15", "Pausa arriba sin golpear el tope."],
    ["Sentadilla búlgara", "Mancuernas", "3 × 8–12", "Baja vertical y apoya todo el pie delantero."],
    ["Sentadilla goblet", "Mancuernas", "3 × 10–15", "Mantén la carga cerca del pecho."],
    ["Zancada caminando", "Mancuernas", "3 × 10–14", "Da pasos estables y controla la rodilla."],
    ["Sentadilla en máquina de palanca · mirando afuera", "Máquina", "4 × 8–12", "Mira hacia afuera, coloca ambos hombros bajo las almohadillas y baja con todo el pie apoyado. La orientación es la contraria al buenos días.", "sentadilla super squat|sentadilla v squat|sentadilla en la máquina de buenos días|sentadilla mirando hacia afuera"],
    ["Prensa vertical guiada", "Máquina", "4 × 8–12", "Apoya espalda y pelvis, coloca ambos pies de forma simétrica y empuja sin bloquear las rodillas. Usa los seguros de la guía.", "prensa vertical normal|pollo asado normal|prensa de cuádriceps"],
  ],
  Glúteos: [
    ["Hip thrust", "Barra", "4 × 8–12", "Termina con pelvis neutra, sin arquear la espalda."],
    ["Puente de glúteos", "Peso corporal", "3 × 12–20", "Pausa arriba apretando glúteos."],
    ["Patada de glúteo", "Polea", "3 × 12–15", "Mueve la cadera sin rotar el tronco."],
    ["Búlgara glúteo", "Mancuernas", "3 × 8–12", "Paso largo y torso ligeramente inclinado."],
    ["Peso muerto sumo", "Barra", "3 × 5–8", "Empuja el suelo con rodillas hacia afuera."],
    ["Abducción de cadera en máquina · piernas abren", "Máquina", "4 × 12–20", "Pon las almohadillas por fuera de las rodillas y abre las piernas con control. Aquí el objetivo principal es el glúteo medio.", "aperturas piernas afuera|máquina de abrir piernas|abductores"],
    ["Zancada inversa", "Mancuernas", "3 × 8–12", "Paso atrás largo y apoyo estable."],
    ["Step-up alto", "Mancuernas", "3 × 8–12", "Sube con la pierna de apoyo, sin saltar."],
    ["Prensa vertical inversa · “pollo asado”", "Máquina", "4 × 8–12", "Usa la orientación inversa de tu gimnasio y empuja con la pelvis estable. Regístrala como prensa compuesta con énfasis en glúteos: no como aislamiento de femorales.", "pollo asado|prensa invertida|prensa de femorales|prensa vertical pies altos"],
    ["Prensa rana tumbado · Butt Blaster", "Máquina", "4 × 10–15", "Túmbate boca abajo, abre rodillas en posición de rana y junta los pies sobre el apoyo. Recoge y extiende las piernas sin despegar la pelvis del banco.", "butt blaster|rana en máquina|máquina de glúteo acostado|frog press|prensa de glúteo tumbado"],
  ],
  Femorales: [
    ["Peso muerto rumano", "Barra", "4 × 6–10", "Lleva la cadera atrás con columna neutra."],
    ["Peso muerto convencional", "Barra", "3 × 4–6", "La barra viaja cerca del cuerpo."],
    ["Curl femoral sentado", "Máquina", "3 × 10–15", "Ajusta la almohadilla y completa el recorrido."],
    ["Curl femoral tumbado", "Máquina", "3 × 10–15", "Evita levantar la cadera del banco."],
    ["Curl nórdico", "Peso corporal", "3 × 4–8", "Desciende lentamente y usa asistencia si hace falta."],
    ["Buenos días", "Barra", "3 × 8–12", "Carga moderada y bisagra controlada."],
    ["Rumano unilateral", "Mancuernas", "3 × 8–12", "Cadera cuadrada y pie de apoyo firme."],
    ["Pull-through", "Polea", "3 × 12–15", "Extiende la cadera, no la espalda."],
    ["Buenos días en máquina de palanca · mirando adentro", "Máquina", "4 × 8–12", "Mira hacia la máquina, apoya los hombros y lleva la cadera atrás con rodillas suaves y columna neutra. El movimiento es una bisagra, no una sentadilla.", "buenos días máquina|good morning machine|buenos días super squat|buenos días mirando hacia adentro"],
  ],
  Aductores: [
    ["Aducción de cadera en máquina · piernas cierran", "Máquina", "4 × 12–20", "Pon las almohadillas por dentro de las rodillas y cierra las piernas con control. No rebotes al volver a abrir.", "aperturas piernas adentro|máquina de cerrar piernas|aductores en máquina"],
  ],
  Abdominales: [
    ["Crunch en polea", "Polea", "3 × 10–15", "Acerca costillas a pelvis sin tirar del cuello."],
    ["Elevación de piernas", "Peso corporal", "3 × 8–15", "Evita el balanceo y controla la pelvis."],
    ["Rueda abdominal", "Peso corporal", "3 × 6–12", "Mantén costillas abajo y glúteos activos."],
    ["Crunch inverso", "Peso corporal", "3 × 10–15", "Eleva la pelvis sin impulso."],
    ["Plancha", "Peso corporal", "3 × 30–60 s", "Forma una línea firme de cabeza a talones."],
    ["Pallof press", "Polea", "3 × 10–12", "Resiste la rotación y exhala al extender."],
    ["Dead bug", "Peso corporal", "3 × 8–12", "Mantén la zona lumbar estable."],
    ["Crunch abdominal", "Máquina", "3 × 10–15", "Ajusta la máquina y flexiona el tronco con control."],
  ],
  Cardio: [
    ["Caminadora", "Máquina", "4 × 5 min", "Camina a un ritmo que puedas sostener. Ajusta la velocidad sin agarrarte de las barras."],
  ],
};

const exerciseImageOverride: Record<string, string> = {
  "Press banca": "/assets/exercises/chest-bench-press.png",
  "Press inclinado": "/assets/exercises/chest-incline-dumbbell.png",
  "Press de pecho": "/assets/exercises/chest-machine-press.png",
  "Aperturas": "/assets/exercises/chest-cable-fly.png",
  "Fondos para pecho": "/assets/exercises/chest-dips.png",
  "Flexiones": "/assets/exercises/chest-pushup.png",
  "Aperturas en máquina (pec deck)": "/assets/exercises/chest-machine-fly-v2.png",
  "Press inclinado Smith": "/assets/exercises/chest-incline-smith.png",
  "Press inclinado plate-loaded": "/assets/exercises/chest-incline-plate-loaded.png",
  "Press declinado": "/assets/exercises/chest-decline-bench.png",
  "Apertura con mancuernas": "/assets/exercises/chest-dumbbell-fly.png",
  "Press plano Smith": "/assets/exercises/chest-flat-smith.png",
  "Dominadas lastradas": "/assets/exercises/back-pullup.png",
  "Jalón al pecho": "/assets/exercises/back-lat-pulldown.png",
  "Remo con barra": "/assets/exercises/back-barbell-row.png",
  "Remo unilateral": "/assets/exercises/back-one-arm-dumbbell-row.png",
  "Remo sentado": "/assets/exercises/back-seated-cable-row.png",
  "Remo pecho apoyado · agarre cerrado": "/assets/exercises/back-chest-supported-close.png",
  "Remo pecho apoyado · agarre abierto": "/assets/exercises/back-chest-supported-wide.png",
  "Pullover": "/assets/exercises/back-straight-arm-pullover.png",
  "Dominadas supinas": "/assets/exercises/back-chinup.png",
  "Remo en T": "/assets/exercises/back-tbar-row.png",
  "Remo bajo": "/assets/exercises/back-low-machine-row.png",
  "Jalón agarre neutro": "/assets/exercises/back-neutral-grip-pulldown.png",
  "Remo landmine": "/assets/exercises/back-landmine-row.png",
  "Press de hombro|Mancuernas": "/assets/exercises/shoulder-dumbbell-press.png",
  "Press militar": "/assets/exercises/shoulder-military-press.png",
  "Press de hombro": "/assets/exercises/shoulder-machine-press.png",
  "Elevación lateral": "/assets/exercises/shoulder-lateral-raise.png",
  "Elevación lateral unilateral": "/assets/exercises/shoulder-one-arm-cable-lateral.png",
  "Pájaros en banco inclinado": "/assets/exercises/shoulder-rear-delt-fly.png",
  "Reverse pec deck": "/assets/exercises/shoulder-reverse-pec-deck.png",
  "Face pull": "/assets/exercises/shoulder-face-pull.png",
  "Press Arnold": "/assets/exercises/shoulder-arnold-press.png",
  "Remo vertical": "/assets/exercises/shoulder-upright-row.png",
  "Elevación Y": "/assets/exercises/shoulder-cable-y-raise.png",
  "Elevación frontal": "/assets/exercises/shoulder-front-raise.png",
  "Curl con barra": "/assets/exercises/biceps-curl.png",
  "Curl alterno": "/assets/exercises/biceps-alternating-curl.png",
  "Curl inclinado": "/assets/exercises/biceps-incline-curl.png",
  "Curl martillo": "/assets/exercises/biceps-hammer-curl.png",
  "Curl predicador": "/assets/exercises/biceps-preacher-machine.png",
  "Curl en polea": "/assets/exercises/biceps-cable-curl.png",
  "Curl concentración": "/assets/exercises/biceps-concentration-curl.png",
  "Dominada supina cerrada": "/assets/exercises/biceps-close-grip-chinup.png",
  "Extensión en polea": "/assets/exercises/triceps-pushdown.png",
  "Extensión sobre cabeza": "/assets/exercises/triceps-overhead-cable.png",
  "Press francés": "/assets/exercises/triceps-french-press.png",
  "Extensión sobre cabeza · barra V": "/assets/exercises/triceps-overhead-vbar.png",
  "Press banca cerrado": "/assets/exercises/triceps-close-grip-bench.png",
  "Fondos": "/assets/exercises/triceps-dips.png",
  "Extensión unilateral": "/assets/exercises/triceps-one-arm-overhead-dumbbell.png",
  "Rompecráneos": "/assets/exercises/triceps-skullcrusher.png",
  "Extensión de tríceps": "/assets/exercises/triceps-machine-extension.png",
  "Sentadilla trasera": "/assets/exercises/quads-squat.png",
  "Sentadilla frontal": "/assets/exercises/quads-front-squat.png",
  "Prensa de piernas": "/assets/exercises/quads-leg-press.png",
  "Hack squat": "/assets/exercises/quads-hack-squat.png",
  "Extensión de rodilla": "/assets/exercises/quads-leg-extension.png",
  "Sentadilla búlgara": "/assets/exercises/quads-bulgarian-split.png",
  "Sentadilla goblet": "/assets/exercises/quads-goblet-squat.png",
  "Zancada caminando": "/assets/exercises/quads-walking-lunge.png",
  "Sentadilla en máquina de palanca · mirando afuera": "/assets/exercises/quads-leverage-squat-outward-v1.png",
  "Prensa vertical guiada": "/assets/exercises/quads-vertical-leg-press-v1.png",
  "Hip thrust": "/assets/exercises/glutes-hip-thrust.png",
  "Puente de glúteos": "/assets/exercises/glutes-bridge.png",
  "Patada de glúteo": "/assets/exercises/glutes-cable-kickback.png",
  "Búlgara glúteo": "/assets/exercises/glutes-bulgarian-split.png",
  "Peso muerto sumo": "/assets/exercises/glutes-sumo-deadlift.png",
  "Abducción de cadera en máquina · piernas abren": "/assets/exercises/glutes-abduction-machine-v2.png",
  "Zancada inversa": "/assets/exercises/glutes-reverse-lunge.png",
  "Step-up alto": "/assets/exercises/glutes-high-stepup.png",
  "Prensa vertical inversa · “pollo asado”": "/assets/exercises/glutes-vertical-leg-press-inverse-v1.png",
  "Prensa rana tumbado · Butt Blaster": "/assets/exercises/glutes-prone-frog-press-v2.png",
  "Peso muerto rumano": "/assets/exercises/hamstrings-rdl.png",
  "Peso muerto convencional": "/assets/exercises/hamstrings-conventional-deadlift.png",
  "Curl femoral sentado": "/assets/exercises/hamstrings-seated-curl.png",
  "Curl femoral tumbado": "/assets/exercises/hamstrings-lying-curl.png",
  "Curl nórdico": "/assets/exercises/hamstrings-nordic-curl.png",
  "Buenos días": "/assets/exercises/hamstrings-good-morning.png",
  "Rumano unilateral": "/assets/exercises/hamstrings-single-leg-rdl.png",
  "Pull-through": "/assets/exercises/hamstrings-cable-pull-through.png",
  "Buenos días en máquina de palanca · mirando adentro": "/assets/exercises/hamstrings-machine-good-morning-v1.png",
  "Aducción de cadera en máquina · piernas cierran": "/assets/exercises/adductors-machine-v1.png",
  "Crunch en polea": "/assets/exercises/abs-cable-crunch.png",
  "Elevación de piernas": "/assets/exercises/abs-hanging-leg-raise.png",
  "Rueda abdominal": "/assets/exercises/abs-wheel-rollout.png",
  "Crunch inverso": "/assets/exercises/abs-reverse-crunch.png",
  "Plancha": "/assets/exercises/abs-plank.png",
  "Pallof press": "/assets/exercises/abs-pallof-press.png",
  "Dead bug": "/assets/exercises/abs-dead-bug.png",
  "Crunch abdominal": "/assets/exercises/abs-machine-crunch.png",
  "Caminadora": "/assets/exercises/cardio-treadmill.png",
};

const imageForExercise = (name: string, equipment: Equipment) => {
  const image = exerciseImageOverride[`${name}|${equipment}`] || exerciseImageOverride[name];
  if (!image) {
    throw new Error(`Falta una imagen verificada para ${name} (${equipment})`);
  }
  return image;
};

const exerciseCatalog: ExerciseDefinition[] = Object.entries(exerciseNames).flatMap(([muscle, items]) =>
  items.map(([name, equipment, prescription, cue, aliases], index) => ({
    id: `${muscle.toLowerCase()}-${index}`,
    name,
    muscle: muscle as Muscle,
    equipment,
    image: imageForExercise(name, equipment),
    prescription: prescription.replace(/^\d+/, "4"),
    cue,
    aliases: aliases?.split("|") || [],
  })),
);

const weekDays: WeekDay[] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const legacyDemoWeeklyPlan: WeeklyPlan = {
  Lunes: ["pecho-0", "pecho-1", "pecho-6", "tríceps-0", "tríceps-8"],
  Martes: ["espalda-0", "espalda-1", "espalda-5", "bíceps-0", "bíceps-3"],
  Miércoles: ["cuádriceps-0", "cuádriceps-2", "cuádriceps-4", "glúteos-0", "glúteos-5"],
  Jueves: ["hombros-0", "hombros-3", "hombros-5", "tríceps-1", "tríceps-2"],
  Viernes: ["espalda-2", "espalda-4", "espalda-6", "femorales-0", "femorales-2"],
};

const createBlankSets = (count = 4): WorkoutSet[] =>
  Array.from({ length: count }, () => ({
    id: crypto.randomUUID(),
    weight: "",
    reps: "",
    rpe: "",
    done: false,
  }));

const ensureFourSets = (sets: WorkoutSet[] = []) =>
  sets.length >= 4 ? sets : [...sets, ...createBlankSets(4 - sets.length)];

const emptyWeeklyPlan = (): WeeklyPlan => ({
  Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [],
});

const defaultTrainingDay = (): WeekDay => {
  const day = new Intl.DateTimeFormat("es-CO", { weekday: "long" }).format(new Date());
  const normalized = `${day.charAt(0).toUpperCase()}${day.slice(1)}` as WeekDay;
  return weekDays.includes(normalized) ? normalized : "Lunes";
};

const routineName = (routine: ExerciseDefinition[]) => {
  const muscles = Array.from(new Set(routine.map((exercise) => exercise.muscle)));
  return muscles.length ? muscles.join(" + ") : "Plan por definir";
};

const initialMeasurements: Measurement[] = [];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localFileTimestamp(date = new Date()) {
  return `${localDateKey(date)}-${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}`;
}

function migrateWorkoutHistory(value: unknown): SavedWorkout[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Partial<SavedWorkout>;
    return {
      id: row.id || crypto.randomUUID(),
      date: row.date || new Date().toISOString(),
      day: row.day || "Lunes",
      routine: row.routine || "Entrenamiento",
      setCount: Number(row.setCount) || 0,
      rpe: Number(row.rpe) || 0,
      durationMinutes: Number(row.durationMinutes) || 0,
      sets: Array.isArray(row.sets) ? row.sets : [],
    };
  });
}

function createInitialAppState(): AppStateV2 {
  let legacyPlan = emptyWeeklyPlan();
  let legacyHistory: SavedWorkout[] = [];
  let legacyMeasurements: Measurement[] = [];
  try {
    const plan = localStorage.getItem("alejandro:weeklyPlan");
    if (plan) {
      const parsed = JSON.parse(plan) as WeeklyPlan;
      legacyPlan = JSON.stringify(parsed) === JSON.stringify(legacyDemoWeeklyPlan) ? emptyWeeklyPlan() : parsed;
    }
    legacyHistory = migrateWorkoutHistory(JSON.parse(localStorage.getItem("alejandro:workoutHistory") || "[]"));
    const lastMeasurement = JSON.parse(localStorage.getItem("alejandro:lastMeasurement") || "null") as Measurement | null;
    if (lastMeasurement?.id) legacyMeasurements = [lastMeasurement];
  } catch {
    // A damaged legacy value should never block the app.
  }
  const today = localDateKey();
  return {
    version: 2,
    weeklyPlan: legacyPlan,
    weeklyPlansByWeek: {},
    workoutHistory: legacyHistory,
    sessionDrafts: {},
    measurements: legacyMeasurements,
    hydration: { date: today, goalLiters: 4, marks: [false, false, false, false] },
    supplements: { date: today, marks: [false, false, false, false] },
    syncQueue: [],
    photoBackups: {},
    physicalAnalyses: [],
    userProfile: defaultUserProfile,
    goalPlans: [],
    supersetPairs: {},
    aiConsent: true,
  };
}

async function warmAppCache(onProgress: (value: number) => void) {
  onProgress(12);
  try {
    await fetch("/assets/alejandro/splash-v6-mobile.jpg", { cache: "force-cache" });
  } catch {
    // The image element still reports its own loading error if the cover is unavailable.
  }
  onProgress(100);
}

async function warmExerciseCache() {
  const assets = Array.from(new Set([
    "/assets/alejandro/app-icon.png",
    "/assets/alejandro/bottle-flat.png",
    "/assets/alejandro/measurement-guide.png",
    ...exerciseCatalog.map((exercise) => exercise.image),
  ]));
  let cursor = 0;
  const worker = async () => {
    while (cursor < assets.length) {
      const asset = assets[cursor];
      cursor += 1;
      try {
        await fetch(asset, { cache: "force-cache" });
      } catch {
        // The library remains usable even if an optional image is unavailable.
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(2, assets.length) }, worker));
}

const tabs: Array<{ id: Tab; label: string; icon: typeof HomeIcon }> = [
  { id: "inicio", label: "Inicio", icon: HomeIcon },
  { id: "entreno", label: "Entreno", icon: ActivityLogIcon },
  { id: "nutricion", label: "Nutrición", icon: RocketIcon },
  { id: "progreso", label: "Progreso", icon: BarChartIcon },
  { id: "perfil", label: "Perfil", icon: PersonIcon },
];

export default function Prototype() {
  const keyboard = useKeyboard();
  const storedInitial = useMemo(() => {
    const stored = readStoredState(createInitialAppState());
    const weeklyPlansByWeek = stored.weeklyPlansByWeek || {};
    const savedCurrentWeek = weeklyPlansByWeek[getWeekKey()];
    const legacyIsDemo = JSON.stringify(stored.weeklyPlan) === JSON.stringify(legacyDemoWeeklyPlan);
    return {
      ...stored,
      weeklyPlansByWeek,
      weeklyPlan: savedCurrentWeek || (legacyIsDemo ? emptyWeeklyPlan() : stored.weeklyPlan),
      sessionDrafts: legacyIsDemo ? {} : stored.sessionDrafts,
    };
  }, []);
  const todayKey = localDateKey();
  const initialHydration = storedInitial.hydration.date === todayKey
    ? storedInitial.hydration
    : { date: todayKey, goalLiters: storedInitial.hydration.goalLiters || 4, marks: Array.from({ length: storedInitial.hydration.goalLiters || 4 }, () => false) };
  const initialSupplements = storedInitial.supplements.date === todayKey
    ? storedInitial.supplements
    : { date: todayKey, marks: [false, false, false, false] };
  const [bootProgress, setBootProgress] = useState(0);
  const [bootReady, setBootReady] = useState(false);
  const [bootQuoteIndex, setBootQuoteIndex] = useState(0);
  const [entered, setEntered] = useState(false);
  const [tab, setTab] = useState<Tab>("inicio");
  const [trainingView, setTrainingView] = useState<TrainingView>("rutina");
  const [selectedDay, setSelectedDay] = useState<WeekDay>(defaultTrainingDay);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(storedInitial.weeklyPlan);
  const [weeklyPlansByWeek, setWeeklyPlansByWeek] = useState<Record<string, WeeklyPlan>>(storedInitial.weeklyPlansByWeek);
  const [showReusePrompt, setShowReusePrompt] = useState(() =>
    localStorage.getItem("alejandro:weekChoice") !== getWeekKey()
    && hasPlannedExercises(storedInitial.weeklyPlansByWeek[previousWeekKey()]),
  );
  const [workoutHistory, setWorkoutHistory] = useState<SavedWorkout[]>(storedInitial.workoutHistory);
  const [sessionDrafts, setSessionDrafts] = useState<Record<string, SessionDraft>>(storedInitial.sessionDrafts);
  const [selectedExerciseId, setSelectedExerciseId] = useState(() => storedInitial.weeklyPlan[defaultTrainingDay()]?.[0] || exerciseCatalog[0].id);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryMuscle, setLibraryMuscle] = useState<Muscle | "Todos">("Todos");
  const [libraryEquipment, setLibraryEquipment] = useState<Equipment | "Todo">("Todo");
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("alejandro:exerciseFavorites") || "[]"); } catch { return []; }
  });
  const [nutritionMode, setNutritionMode] = useState<NutritionMode>("hidratacion");
  const [hydrationDate, setHydrationDate] = useState(initialHydration.date);
  const [waterGoal, setWaterGoal] = useState(initialHydration.goalLiters);
  const [hydrationMarks, setHydrationMarks] = useState(initialHydration.marks);
  const [supplementDate, setSupplementDate] = useState(initialSupplements.date);
  const [supplementMarks, setSupplementMarks] = useState(initialSupplements.marks);
  const [progressSection, setProgressSection] = useState<ProgressSection>("medidas");
  const [measureView, setMeasureView] = useState<MeasureView>("actual");
  const [measurements, setMeasurements] = useState<Measurement[]>(storedInitial.measurements || initialMeasurements);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [photoView, setPhotoView] = useState<ProgressPhoto["view"]>("Frente");
  const [sheet, setSheet] = useState<"quick" | "measure" | null>(null);
  const [profileSheet, setProfileSheet] = useState<"backup" | "privacy" | "edit" | "goals" | null>(null);
  const latestStoredMeasurement = storedInitial.measurements.at(-1);
  const [weight, setWeight] = useState(latestStoredMeasurement ? String(latestStoredMeasurement.weight) : "");
  const [measureDraft, setMeasureDraft] = useState({
    weight: latestStoredMeasurement ? String(latestStoredMeasurement.weight) : "",
    bodyFat: latestStoredMeasurement ? String(latestStoredMeasurement.bodyFat) : "",
    neck: latestStoredMeasurement ? String(latestStoredMeasurement.neck) : "",
    chest: latestStoredMeasurement ? String(latestStoredMeasurement.chest) : "",
    waist: latestStoredMeasurement ? String(latestStoredMeasurement.waist) : "",
    biceps: latestStoredMeasurement ? String(latestStoredMeasurement.biceps) : "",
    forearm: latestStoredMeasurement ? String(latestStoredMeasurement.forearm) : "",
    thigh: latestStoredMeasurement ? String(latestStoredMeasurement.thigh) : "",
    calf: latestStoredMeasurement ? String(latestStoredMeasurement.calf) : "",
  });
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(storedInitial.syncQueue || []);
  const [photoBackups, setPhotoBackups] = useState<Record<string, { driveUrl: string; syncedAt: string }>>(storedInitial.photoBackups || {});
  const [physicalAnalyses, setPhysicalAnalyses] = useState<PhysicalAnalysis[]>(storedInitial.physicalAnalyses || []);
  const [userProfile, setUserProfile] = useState<UserProfile>(storedInitial.userProfile || defaultUserProfile);
  const [profileDraft, setProfileDraft] = useState<UserProfile>(storedInitial.userProfile || defaultUserProfile);
  const [goalPlans, setGoalPlans] = useState<GoalPlan[]>(storedInitial.goalPlans || []);
  const [goalStatus, setGoalStatus] = useState<"idle" | "loading" | "error">("idle");
  const [supersetPairs, setSupersetPairs] = useState<Record<string, string>>(storedInitial.supersetPairs || {});
  const [lastSyncAt, setLastSyncAt] = useState(storedInitial.lastSyncAt);
  const [syncing, setSyncing] = useState(false);
  const [syncToken, setSyncToken] = useState(() => localStorage.getItem(SYNC_TOKEN_STORAGE_KEY) || "");
  const [syncTokenDraft, setSyncTokenDraft] = useState(() => localStorage.getItem(SYNC_TOKEN_STORAGE_KEY) || "");
  const [syncConnectionStatus, setSyncConnectionStatus] = useState<"idle" | "checking" | "ready" | "error">(
    () => localStorage.getItem(SYNC_TOKEN_STORAGE_KEY) ? "idle" : "error",
  );
  const [aiConsent, setAiConsent] = useState(storedInitial.aiConsent);
  const [saveMessage, setSaveMessage] = useState("");
  const backupInputRef = useRef<HTMLInputElement>(null);

  const bottleCount = Math.max(1, Math.round(waterGoal));
  const water = hydrationMarks.slice(0, bottleCount).filter(Boolean).length;
  const sessionKey = `${getWeekKey()}:${selectedDay}`;
  const activeDraft = sessionDrafts[sessionKey];
  const setsByExercise = activeDraft?.setsByExercise || {};
  const routineIds = weeklyPlan[selectedDay];
  const routine = routineIds.map((id) => exerciseCatalog.find((exercise) => exercise.id === id)!).filter(Boolean);
  const activeRoutineName = routineName(routine);
  const completedExercises = routine.filter((exercise) =>
    (setsByExercise[exercise.id] || []).some((set) => set.done),
  ).length;
  const completion = routine.length ? Math.round((completedExercises / routine.length) * 100) : 0;

  const flushSyncQueue = async (items = syncQueue, tokenOverride = syncToken) => {
    const apiUrl = import.meta.env.VITE_APP_API_URL;
    if (!apiUrl || !tokenOverride || syncing || !items.length) return;
    setSyncing(true);
    const attemptedIds = new Set(items.map((item) => item.id));
    const failed = new Map<string, SyncQueueItem>();
    let successCount = 0;
    for (const item of items) {
      try {
        const payload = item.action === "saveProgressPhoto"
          ? await loadPhotoUploadPayload(String(item.payload.photoId || ""))
          : item.payload;
        const result = await postToApi(apiUrl, item.action, payload, tokenOverride) as { id?: string; driveUrl?: string };
        if (item.action === "saveProgressPhoto" && result.driveUrl) {
          const photoId = String(item.payload.photoId || result.id || "");
          setPhotoBackups((current) => ({
            ...current,
            [photoId]: { driveUrl: result.driveUrl!, syncedAt: new Date().toISOString() },
          }));
        }
        successCount += 1;
      } catch (error) {
        failed.set(item.id, {
          ...item,
          attempts: item.attempts + 1,
          error: error instanceof Error ? error.message : "sync_error",
        });
      }
    }
    setSyncQueue((current) => current
      .filter((item) => !attemptedIds.has(item.id) || failed.has(item.id))
      .map((item) => failed.get(item.id) || item));
    if (successCount) setLastSyncAt(new Date().toISOString());
    setSyncing(false);
  };

  const enqueueSync = (action: SyncQueueItem["action"], payload: Record<string, unknown>) => {
    const item: SyncQueueItem = {
      id: crypto.randomUUID(),
      action,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    setSyncQueue((current) => [...current, item]);
    void flushSyncQueue([item]);
  };

  const saveSyncToken = async () => {
    const token = syncTokenDraft.trim();
    if (token.length < 32) {
      showToast("El código privado no es válido");
      return;
    }
    const apiUrl = import.meta.env.VITE_APP_API_URL;
    localStorage.setItem(SYNC_TOKEN_STORAGE_KEY, token);
    setSyncToken(token);
    if (!apiUrl) {
      setSyncConnectionStatus("error");
      showToast("Código guardado · falta desplegar el servicio");
      return;
    }
    setSyncConnectionStatus("checking");
    try {
      await postToApi(apiUrl, "verifyConnection", {}, token);
      setSyncConnectionStatus("ready");
      showToast("Google Drive y Sheets conectados");
      if (syncQueue.length) window.setTimeout(() => void flushSyncQueue(syncQueue, token), 0);
    } catch {
      setSyncConnectionStatus("error");
      showToast("No pude validar el código privado");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const warmStart = localStorage.getItem("alejandro:cache-version") === "v7";
    const minimumDisplay = new Promise((resolve) => window.setTimeout(resolve, warmStart ? 180 : 550));
    void Promise.all([
      warmAppCache((progress) => {
        if (!cancelled) setBootProgress((current) => Math.max(current, progress));
      }),
      minimumDisplay,
    ]).then(() => {
      if (cancelled) return;
      setBootProgress(100);
      setBootReady(true);
      localStorage.setItem("alejandro:cache-version", "v7");
      void navigator.storage?.persist?.().catch(() => false);
      window.setTimeout(() => void warmExerciseCache(), 0);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (entered) return;
    const timer = window.setInterval(() => setBootQuoteIndex((current) => (current + 1) % bootQuotes.length), 6200);
    return () => window.clearInterval(timer);
  }, [entered]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(".device-screen")?.scrollTo({ top: 0 });
      document.querySelector<HTMLElement>(".mobile-scroll")?.scrollTo({ top: 0 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [entered, tab, trainingView, nutritionMode, progressSection, measureView]);

  useEffect(() => {
    writeStoredState<AppStateV2>({
      version: 2,
      weeklyPlan,
      weeklyPlansByWeek,
      workoutHistory,
      sessionDrafts,
      measurements,
      hydration: { date: hydrationDate, goalLiters: waterGoal, marks: hydrationMarks },
      supplements: { date: supplementDate, marks: supplementMarks },
      syncQueue,
      photoBackups,
      physicalAnalyses,
      userProfile,
      goalPlans,
      supersetPairs,
      lastSyncAt,
      aiConsent,
    });
  }, [
    aiConsent, goalPlans, hydrationDate, hydrationMarks, lastSyncAt, measurements, photoBackups, physicalAnalyses, sessionDrafts,
    supplementDate, supplementMarks, supersetPairs, syncQueue, userProfile, waterGoal, weeklyPlan, weeklyPlansByWeek, workoutHistory,
  ]);

  useEffect(() => {
    setWeeklyPlansByWeek((current) => {
      const currentWeek = current[getWeekKey()];
      if (currentWeek && JSON.stringify(currentWeek) === JSON.stringify(weeklyPlan)) return current;
      return { ...current, [getWeekKey()]: weeklyPlan };
    });
  }, [weeklyPlan]);

  useEffect(() => {
    localStorage.setItem("alejandro:exerciseFavorites", JSON.stringify(favoriteExerciseIds));
  }, [favoriteExerciseIds]);

  useEffect(() => {
    let loadedUrls: string[] = [];
    void loadPhotoFiles().then((items) => {
      loadedUrls = items.map((item) => item.url);
      setPhotos(items.map((item) => ({ ...item, view: item.view as ProgressPhoto["view"] })));
    }).catch(() => showToast("No pude recuperar las fotos locales"));
    return () => loadedUrls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    const checkDate = () => {
      const nextDate = localDateKey();
      if (hydrationDate !== nextDate) {
        setHydrationDate(nextDate);
        setHydrationMarks(Array.from({ length: waterGoal }, () => false));
      }
      if (supplementDate !== nextDate) {
        setSupplementDate(nextDate);
        setSupplementMarks([false, false, false, false]);
      }
    };
    checkDate();
    const timer = window.setInterval(checkDate, 60_000);
    return () => window.clearInterval(timer);
  }, [hydrationDate, supplementDate, waterGoal]);

  useEffect(() => {
    const unsent = syncQueue.filter((item) => item.attempts === 0);
    const onOnline = () => void flushSyncQueue(syncQueue);
    window.addEventListener("online", onOnline);
    if (navigator.onLine && unsent.length) void flushSyncQueue(unsent);
    return () => window.removeEventListener("online", onOnline);
  }, [syncQueue.length]);

  const dismissKeyboard = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    keyboard.hide();
  };

  const navigate = (nextTab: Tab) => {
    dismissKeyboard();
    setTrainingView("rutina");
    setTab(nextTab);
  };

  const showToast = (message: string) => {
    setSaveMessage(message);
    window.setTimeout(() => setSaveMessage(""), 2600);
  };

  const openProfileEdit = () => {
    setProfileDraft({ ...userProfile, priorityMuscles: [...userProfile.priorityMuscles] });
    setProfileSheet("edit");
  };

  const saveProfile = () => {
    const height = Number(profileDraft.heightCm.replace(",", "."));
    const targetWeight = Number(profileDraft.targetWeightKg.replace(",", "."));
    if (!profileDraft.name.trim()) {
      showToast("Escribe el nombre que quieres usar");
      return;
    }
    if (profileDraft.heightCm && (!Number.isFinite(height) || height < 120 || height > 230)) {
      showToast("Ingresa una altura entre 120 y 230 cm");
      return;
    }
    if (profileDraft.targetWeightKg && (!Number.isFinite(targetWeight) || targetWeight < 35 || targetWeight > 250)) {
      showToast("Ingresa un peso objetivo válido");
      return;
    }
    setUserProfile({
      ...profileDraft,
      name: profileDraft.name.trim().slice(0, 40),
      heightCm: profileDraft.heightCm ? String(height) : "",
      targetWeightKg: profileDraft.targetWeightKg ? String(targetWeight) : "",
    });
    setProfileSheet(null);
    showToast("Perfil actualizado");
  };

  const togglePriorityMuscle = (muscle: Muscle) => {
    setProfileDraft((current) => {
      const selected = current.priorityMuscles.includes(muscle);
      if (!selected && current.priorityMuscles.length >= 3) {
        showToast("Elige hasta 3 grupos prioritarios");
        return current;
      }
      return {
        ...current,
        priorityMuscles: selected
          ? current.priorityMuscles.filter((item) => item !== muscle)
          : [...current.priorityMuscles, muscle],
      };
    });
  };

  const generateGoalPlan = async () => {
    if (!aiConsent) {
      showToast("Activa primero el permiso de análisis con IA");
      setProfileSheet("privacy");
      return;
    }
    const apiUrl = import.meta.env.VITE_APP_API_URL || import.meta.env.VITE_AI_API_URL;
    if (!apiUrl) {
      setGoalStatus("error");
      showToast("La IA todavía no está conectada");
      return;
    }
    setGoalStatus("loading");
    try {
      const response = await postToApi(apiUrl, "buildPersonalGoal", {
        profile: profileDraft,
        latestMeasurement: measurements.at(-1) || null,
        recentMeasurements: measurements.slice(-4),
        recentWorkouts: workoutHistory.slice(0, 10).map((workout) => ({
          date: workout.date,
          routine: workout.routine,
          sets: workout.setCount,
          rpe: workout.rpe,
          durationMinutes: workout.durationMinutes,
        })),
        trainingPreferences: {
          defaultRestSeconds: profileDraft.defaultRestSeconds,
          usesSupersets: Object.keys(supersetPairs).length > 0,
        },
      }) as Omit<GoalPlan, "id" | "createdAt">;
      const plan: GoalPlan = { ...response, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      setUserProfile(profileDraft);
      setGoalPlans((current) => [...current, plan].slice(-24));
      setGoalStatus("idle");
      showToast("Nuevo objetivo semanal creado");
    } catch {
      setGoalStatus("error");
      showToast("No pude crear el objetivo ahora");
    }
  };

  const setSupersetPartner = (exerciseId: string, partnerId: string) => {
    setSupersetPairs((current) => {
      const next = { ...current };
      const currentPartner = next[`${sessionKey}:${exerciseId}`];
      if (currentPartner) delete next[`${sessionKey}:${currentPartner}`];
      delete next[`${sessionKey}:${exerciseId}`];
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${sessionKey}:`) && next[key] === exerciseId) delete next[key];
      });
      if (partnerId) {
        const partnerPartner = next[`${sessionKey}:${partnerId}`];
        if (partnerPartner) delete next[`${sessionKey}:${partnerPartner}`];
        next[`${sessionKey}:${exerciseId}`] = partnerId;
        next[`${sessionKey}:${partnerId}`] = exerciseId;
      }
      return next;
    });
  };

  const toggleBottle = (index: number) => {
    setHydrationMarks((current) =>
      Array.from({ length: bottleCount }, (_, itemIndex) =>
        itemIndex === index ? !(current[itemIndex] ?? false) : (current[itemIndex] ?? false),
      ),
    );
  };

  const changeWaterGoal = (amount: number) => {
    setWaterGoal((current) => {
      const next = Math.min(6, Math.max(1, current + amount));
      setHydrationMarks((marks) => Array.from({ length: next }, (_, index) => marks[index] ?? false));
      return next;
    });
  };

  const addWater = () => {
    setHydrationMarks((current) => {
      const next = Array.from({ length: bottleCount }, (_, index) => current[index] ?? false);
      const empty = next.findIndex((checked) => !checked);
      if (empty >= 0) next[empty] = true;
      return next;
    });
  };

  const openExercise = (id: string) => {
    dismissKeyboard();
    setSelectedExerciseId(id);
    setSessionDrafts((current) => {
      const existing = current[sessionKey] || {
        id: crypto.randomUUID(),
        day: selectedDay,
        weekKey: getWeekKey(),
        startedAt: new Date().toISOString(),
        setsByExercise: {},
      };
      if (existing.setsByExercise[id]) return current;
      const selectedExercise = exerciseCatalog.find((exercise) => exercise.id === id);
      const isCardio = selectedExercise?.muscle === "Cardio";
      const previousWorkout = workoutHistory.find((workout) => workout.sets.some((set) => set.exerciseId === id));
      const previousSets = previousWorkout?.sets
        .filter((set) => set.exerciseId === id)
        .map((set) => ({
          id: crypto.randomUUID(),
          weight: String(isCardio ? set.durationMinutes || "" : set.weightKg || ""),
          reps: String(isCardio ? set.speedKph || "" : set.reps || ""),
          rpe: String(set.rpe || ""),
          done: false,
        }));
      return {
        ...current,
        [sessionKey]: {
          ...existing,
          setsByExercise: {
            ...existing.setsByExercise,
            [id]: ensureFourSets(previousSets),
          },
        },
      };
    });
    setTrainingView("registro");
  };

  const addExercise = (id: string) => {
    setWeeklyPlan((current) => ({
      ...current,
      [selectedDay]: current[selectedDay].includes(id) ? current[selectedDay] : [...current[selectedDay], id],
    }));
    openExercise(id);
  };

  const deleteExercise = (id: string) => {
    const exerciseName = exerciseCatalog.find((exercise) => exercise.id === id)?.name || "Ejercicio";
    const fallbackId = routineIds.find((exerciseId) => exerciseId !== id) || exerciseCatalog[0].id;
    setWeeklyPlan((current) => ({
      ...current,
      [selectedDay]: current[selectedDay].filter((exerciseId) => exerciseId !== id),
    }));
    setSessionDrafts((current) => {
      const draft = current[sessionKey];
      if (!draft?.setsByExercise[id]) return current;
      const nextSets = { ...draft.setsByExercise };
      delete nextSets[id];
      return { ...current, [sessionKey]: { ...draft, setsByExercise: nextSets } };
    });
    setSupersetPairs((current) => Object.fromEntries(
      Object.entries(current).filter(([key, partnerId]) =>
        !(key.startsWith(`${sessionKey}:`) && (key === `${sessionKey}:${id}` || partnerId === id)),
      ),
    ));
    if (selectedExerciseId === id) setSelectedExerciseId(fallbackId);
    showToast(`${exerciseName} eliminado del ${selectedDay.toLowerCase()}`);
  };

  const chooseWeekPlan = (reuse: boolean) => {
    const previousPlan = weeklyPlansByWeek[previousWeekKey()];
    setWeeklyPlan(reuse && previousPlan ? previousPlan : emptyWeeklyPlan());
    localStorage.setItem("alejandro:weekChoice", getWeekKey());
    setShowReusePrompt(false);
    showToast(reuse ? "Rutina de la semana pasada cargada" : "Semana nueva lista para configurar");
  };

  const updateSet = (exerciseId: string, setId: string, field: keyof WorkoutSet, value: string | boolean) => {
    setSessionDrafts((current) => {
      const draft = current[sessionKey];
      if (!draft) return current;
      const target = draft.setsByExercise[exerciseId]?.find((set) => set.id === setId);
      if (!target) return current;
      const isCardio = exerciseCatalog.find((exercise) => exercise.id === exerciseId)?.muscle === "Cardio";
      if (field === "done" && value === true) {
        const reps = Number(target.reps);
        const rpe = Number(target.rpe);
        const weightValue = Number(target.weight);
        if (!Number.isFinite(weightValue) || weightValue < 0 || !Number.isFinite(reps) || reps < 1 || !Number.isFinite(rpe) || rpe < 1 || rpe > 10) {
          showToast(isCardio
            ? "Completa minutos, velocidad y esfuerzo del 1 al 10."
            : "Completa peso y repeticiones. En esfuerzo, escribe un número del 1 al 10.");
          return current;
        }
      }
      let nextValue = value;
      if (typeof value === "string") {
        const cleaned = value.replace(",", ".").replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
        if (field === "reps") nextValue = cleaned.replace(/\./g, "").slice(0, 3);
        else if (field === "rpe") nextValue = Number(cleaned) > 10 ? "10" : cleaned.slice(0, 4);
        else if (field === "weight") nextValue = Number(cleaned) > 1000 ? "1000" : cleaned.slice(0, 7);
      }
      return {
        ...current,
        [sessionKey]: {
          ...draft,
          setsByExercise: {
            ...draft.setsByExercise,
            [exerciseId]: (draft.setsByExercise[exerciseId] || []).map((set) =>
              set.id === setId ? { ...set, [field]: nextValue } : set,
            ),
          },
        },
      };
    });
  };

  const addSet = (exerciseId: string) => {
    if ((setsByExercise[exerciseId]?.length || 0) >= 10) {
      showToast("Máximo 10 series por ejercicio");
      return;
    }
    setSessionDrafts((current) => {
      const draft = current[sessionKey];
      if (!draft) return current;
      return {
        ...current,
        [sessionKey]: {
          ...draft,
          setsByExercise: {
            ...draft.setsByExercise,
            [exerciseId]: [
              ...(draft.setsByExercise[exerciseId] || []),
              { id: crypto.randomUUID(), weight: "", reps: "", rpe: "", done: false },
            ],
          },
        },
      };
    });
  };

  const saveWorkout = async () => {
    dismissKeyboard();
    const completedSets = routine.flatMap((exercise) =>
      (setsByExercise[exercise.id] || []).flatMap((set, index) => set.done ? [{
        exerciseId: exercise.id,
        exercise: exercise.name,
        muscle: exercise.muscle,
        equipment: exercise.equipment,
        setNumber: index + 1,
        weightKg: exercise.muscle === "Cardio" ? 0 : Number(set.weight) || 0,
        reps: exercise.muscle === "Cardio" ? 0 : Number(set.reps) || 0,
        rpe: Number(set.rpe) || 0,
        ...(exercise.muscle === "Cardio" ? {
          durationMinutes: Number(set.weight) || 0,
          speedKph: Number(set.reps) || 0,
        } : {}),
      }] : []),
    );
    if (!completedSets.length) {
      showToast("Registra al menos una serie antes de finalizar");
      return;
    }
    const now = new Date();
    const durationMinutes = activeDraft
      ? Math.max(1, Math.round((now.getTime() - new Date(activeDraft.startedAt).getTime()) / 60_000))
      : 1;
    const savedWorkout: SavedWorkout = {
      id: activeDraft?.id || crypto.randomUUID(),
      date: now.toISOString(),
      day: selectedDay,
      routine: activeRoutineName,
      setCount: completedSets.length,
      rpe: average(completedSets.map((set) => set.rpe)),
      durationMinutes,
      sets: completedSets,
    };
    setWorkoutHistory((current) =>
      [savedWorkout, ...current.filter((item) => item.id !== savedWorkout.id)]
        .sort((a, b) => b.date.localeCompare(a.date)),
    );
    setSessionDrafts((current) => {
      const next = { ...current };
      delete next[sessionKey];
      return next;
    });
    enqueueSync("logWorkout", {
      id: savedWorkout.id,
      date: savedWorkout.date,
      day: selectedDay,
      routine: activeRoutineName,
      durationMinutes,
      rpe: savedWorkout.rpe,
      sets: completedSets,
    });
    setTrainingView("rutina");
    showToast(import.meta.env.VITE_APP_API_URL
      ? "Entrenamiento guardado · sincronizando"
      : "Entrenamiento guardado · sincronización pendiente");
  };

  const saveMeasurement = async () => {
    const values = Object.values(measureDraft).map(Number);
    if (values.some((value) => !Number.isFinite(value) || value <= 0) || Number(measureDraft.bodyFat) > 60) {
      showToast("Revisa todos los valores antes de guardar");
      return;
    }
    const record: Measurement = {
      id: crypto.randomUUID(),
      date: localDateKey(),
      weight: Number(measureDraft.weight),
      bodyFat: Number(measureDraft.bodyFat),
      neck: Number(measureDraft.neck),
      chest: Number(measureDraft.chest),
      waist: Number(measureDraft.waist),
      biceps: Number(measureDraft.biceps),
      forearm: Number(measureDraft.forearm),
      thigh: Number(measureDraft.thigh),
      calf: Number(measureDraft.calf),
    };
    setMeasurements((current) =>
      [...current.filter((item) => item.date !== record.date), record]
        .sort((a, b) => a.date.localeCompare(b.date)),
    );
    setWeight(String(record.weight));
    enqueueSync("logMeasurement", {
      id: record.id,
      date: record.date,
      weightKg: record.weight,
      bodyFatPct: record.bodyFat,
      neckCm: record.neck,
      chestCm: record.chest,
      waistCm: record.waist,
      bicepsCm: record.biceps,
      forearmCm: record.forearm,
      thighCm: record.thigh,
      calfCm: record.calf,
    });
    showToast(import.meta.env.VITE_APP_API_URL
      ? "Medidas guardadas · sincronizando"
      : "Medidas guardadas · sincronización pendiente");
    setSheet(null);
  };

  const addPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const sourceFile = event.target.files?.[0];
    if (!sourceFile) return;
    if (!sourceFile.type.startsWith("image/")) {
      showToast("Selecciona una imagen válida");
      event.target.value = "";
      return;
    }
    if (sourceFile.size > 30 * 1024 * 1024) {
      showToast("La foto original supera el límite de 30 MB");
      event.target.value = "";
      return;
    }
    let file: File;
    try {
      file = await optimizeProgressPhoto(sourceFile);
    } catch {
      showToast("No pude comprimir esta foto");
      event.target.value = "";
      return;
    }
    const id = crypto.randomUUID();
    const date = localDateKey();
    try {
      await savePhotoFile({ id, date, view: photoView, file });
    } catch {
      showToast("No pude guardar la foto en este iPhone");
      event.target.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setPhotos((current) => [...current, {
      id,
      date,
      view: photoView,
      url,
    }]);
    enqueueSync("saveProgressPhoto", { photoId: id });
    showToast(import.meta.env.VITE_APP_API_URL
      ? `Foto ${photoView.toLowerCase()} guardada · respaldando en Drive`
      : `Foto ${photoView.toLowerCase()} guardada · respaldo en Drive pendiente`);
    event.target.value = "";
  };

  const analyzePhysicalPhotos = async (before: ProgressPhoto, after: ProgressPhoto) => {
    if (before.view !== after.view) throw new Error("Las fotografías deben usar la misma vista.");
    const apiUrl = import.meta.env.VITE_APP_API_URL || import.meta.env.VITE_AI_API_URL;
    if (!apiUrl) throw new Error("El análisis visual todavía no está conectado.");
    const [beforePayload, afterPayload] = await Promise.all([
      loadPhotoUploadPayload(before.id),
      loadPhotoUploadPayload(after.id),
    ]);
    const response = await postToApi(apiUrl, "analyzePhysiquePhotos", {
      before: beforePayload,
      after: afterPayload,
      context: {
        objective: "hipertrofia",
        sameView: before.view,
        measurements: measurements.slice(-4),
        recentTraining: workoutHistory.slice(0, 8).map((workout) => ({
          date: workout.date,
          routine: workout.routine,
          sets: workout.setCount,
          rpe: workout.rpe,
        })),
      },
    }) as Omit<PhysicalAnalysis, "id" | "createdAt" | "beforePhotoId" | "afterPhotoId" | "beforeDate" | "afterDate" | "view">;
    const analysis: PhysicalAnalysis = {
      ...response,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      beforePhotoId: before.id,
      afterPhotoId: after.id,
      beforeDate: before.date,
      afterDate: after.date,
      view: before.view,
    };
    setPhysicalAnalyses((current) => [...current, analysis].slice(-24));
    showToast("Análisis físico añadido al reporte");
    return analysis;
  };

  const saveQuickRecord = () => {
    const nextWeight = Number(weight.replace(",", "."));
    if (!Number.isFinite(nextWeight) || nextWeight <= 0 || nextWeight > 400) {
      showToast("Ingresa un peso válido");
      return;
    }
    const latest = measurements.at(-1);
    if (!latest) {
      setMeasureDraft((current) => ({ ...current, weight: String(nextWeight) }));
      setSheet("measure");
      showToast("Completa tu primera medición");
      return;
    }
    const record: Measurement = {
      ...latest,
      id: crypto.randomUUID(),
      date: localDateKey(),
      weight: nextWeight,
    };
    setMeasurements((current) =>
      [...current.filter((item) => item.date !== record.date), record]
        .sort((a, b) => a.date.localeCompare(b.date)),
    );
    enqueueSync("logMeasurement", {
      id: record.id,
      date: record.date,
      weightKg: record.weight,
      bodyFatPct: record.bodyFat,
      neckCm: record.neck,
      chestCm: record.chest,
      waistCm: record.waist,
      bicepsCm: record.biceps,
      forearmCm: record.forearm,
      thighCm: record.thigh,
      calfCm: record.calf,
    });
    setSheet(null);
    showToast("Peso guardado para hoy");
  };

  const exportBackup = async () => {
    const backup = await createBackup<AppStateV2>({
      version: 2,
      weeklyPlan,
      weeklyPlansByWeek,
      workoutHistory,
      sessionDrafts,
      measurements,
      hydration: { date: hydrationDate, goalLiters: waterGoal, marks: hydrationMarks },
      supplements: { date: supplementDate, marks: supplementMarks },
      syncQueue,
      photoBackups,
      physicalAnalyses,
      userProfile,
      goalPlans,
      supersetPairs,
      lastSyncAt,
      aiConsent,
    });
    downloadJson(`Sistema-Alejandro-respaldo-${localDateKey()}.json`, backup);
    const apiUrl = import.meta.env.VITE_APP_API_URL;
    if (!apiUrl) {
      showToast("Respaldo descargado · copia en Drive pendiente");
      return;
    }
    try {
      const cloudBackup = {
        ...backup,
        photos: backup.photos.map((photo) => ({
          id: photo.id,
          date: photo.date,
          view: photo.view,
          name: photo.name,
          type: photo.type,
        })),
      };
      const dataUrl = await blobToDataUrlForUpload(new Blob([JSON.stringify(cloudBackup, null, 2)], { type: "application/json" }));
      await postToApi(apiUrl, "saveAppBackup", {
        date: localDateKey(),
        name: `respaldo-${localFileTimestamp()}`,
        dataUrl,
      });
      setLastSyncAt(new Date().toISOString());
      showToast("Respaldo descargado y copiado en Drive");
    } catch {
      showToast("Respaldo descargado · no pude copiarlo en Drive");
    }
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await restoreBackup<AppStateV2>(file);
      showToast("Respaldo restaurado");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No pude restaurar el respaldo");
    }
    event.target.value = "";
  };

  const hideNav = tab === "entreno" && trainingView !== "rutina";

  if (!entered) {
    return (
      <section className="splash-screen" aria-label="Bienvenida a Sistema Alejandro">
        <img src="/assets/alejandro/splash-v6-mobile.jpg" alt="Alejandro preparado para entrenar al amanecer" className="splash-image" draggable={false} fetchPriority="high" decoding="async" />
        <div className="splash-shade" />
        <div className="splash-brand">
          <img className="brand-logo" src="/assets/alejandro/app-icon.png" alt="Símbolo de Sistema Alejandro" />
          <p>SISTEMA PERSONAL</p>
        </div>
        <div className="splash-title">
          <h1>ALEJANDRO.</h1>
          <p>CONSTRUYE AL HOMBRE QUE DECIDISTE SER.</p>
        </div>
        <div className="splash-copy">
          <blockquote key={bootQuoteIndex}>“{bootQuotes[bootQuoteIndex].quote}”</blockquote>
          <cite>{bootQuotes[bootQuoteIndex].author}</cite>
          <div className="boot-status" aria-live="polite">
            <div><span>{bootReady ? "Todo listo" : "Cargando portada"}</span><strong>{bootProgress}%</strong></div>
            <div className="boot-progress"><i style={{ width: `${bootProgress}%` }} /></div>
            <small>{bootReady ? "Las ilustraciones continúan preparándose en segundo plano." : "La portada tiene prioridad para abrir la app cuanto antes."}</small>
          </div>
          <div className="enter-slot">
            {bootReady && (
              <button className="enter-button" onClick={() => { dismissKeyboard(); setEntered(true); }}>
                Entrar <ChevronRightIcon />
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="app-shell">
      <MobileScroll className="app-screen">
        <main className={hideNav ? "app-content app-content-deep" : "app-content"} aria-label={`Pantalla ${tab}`}>
          {tab === "inicio" && (
            <HomeScreen
              profile={userProfile}
              goalPlan={goalPlans.at(-1)}
              water={water}
              waterGoal={waterGoal}
              completion={completion}
              selectedDay={selectedDay}
              routineName={activeRoutineName}
              plannedSets={routine.length * 4}
              onWater={addWater}
              onOpenWater={() => { setNutritionMode("hidratacion"); setTab("nutricion"); }}
              onStart={() => setTab("entreno")}
              onQuickAdd={() => setSheet("quick")}
              onAnalysis={() => setTab("analisis")}
              onProfile={() => setTab("perfil")}
              measurements={measurements}
              history={workoutHistory}
            />
          )}
          {tab === "entreno" && trainingView === "rutina" && (
            <RoutineScreen
              routine={routine}
              setsByExercise={setsByExercise}
              partnerByExercise={Object.fromEntries(routine.map((exercise) => [
                exercise.id,
                supersetPairs[`${sessionKey}:${exercise.id}`] || "",
              ]))}
              completion={completion}
              selectedDay={selectedDay}
              onSelectedDay={setSelectedDay}
              routineName={activeRoutineName}
              showReusePrompt={showReusePrompt}
              onChooseWeekPlan={chooseWeekPlan}
              onOpen={openExercise}
              onDelete={deleteExercise}
              onLibrary={() => { dismissKeyboard(); setTrainingView("biblioteca"); }}
              onHistory={() => { dismissKeyboard(); setTrainingView("historial"); }}
              onSave={saveWorkout}
              activeStartedAt={routine.length ? activeDraft?.startedAt : undefined}
            />
          )}
          {tab === "entreno" && trainingView === "biblioteca" && (
            <ExerciseLibrary
              search={librarySearch}
              onSearch={setLibrarySearch}
              muscle={libraryMuscle}
              onMuscle={setLibraryMuscle}
              equipment={libraryEquipment}
              onEquipment={setLibraryEquipment}
              routineIds={routineIds}
              onAdd={addExercise}
              favoriteIds={favoriteExerciseIds}
              onToggleFavorite={(id) => setFavoriteExerciseIds((current) =>
                current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
              )}
              onBack={() => { dismissKeyboard(); setTrainingView("rutina"); }}
            />
          )}
          {tab === "entreno" && trainingView === "registro" && (
            <ExerciseLogger
              exercise={exerciseCatalog.find((item) => item.id === selectedExerciseId)!}
              routine={routine}
              sets={setsByExercise[selectedExerciseId] || []}
              partnerId={supersetPairs[`${sessionKey}:${selectedExerciseId}`] || ""}
              defaultRestSeconds={userProfile.defaultRestSeconds}
              onUpdate={(setId, field, value) => updateSet(selectedExerciseId, setId, field, value)}
              onAdd={() => addSet(selectedExerciseId)}
              onPair={(partnerId) => setSupersetPartner(selectedExerciseId, partnerId)}
              onSwitchPartner={() => {
                const partnerId = supersetPairs[`${sessionKey}:${selectedExerciseId}`];
                if (partnerId) openExercise(partnerId);
              }}
              onBack={() => { dismissKeyboard(); setTrainingView("rutina"); }}
              onSave={() => {
                dismissKeyboard();
                const partnerId = supersetPairs[`${sessionKey}:${selectedExerciseId}`];
                if (partnerId) {
                  openExercise(partnerId);
                  showToast("Guardado · siguiente ejercicio de la biserie");
                } else {
                  setTrainingView("rutina");
                  showToast("Ejercicio guardado en la sesión");
                }
              }}
            />
          )}
          {tab === "entreno" && trainingView === "historial" && (
            <WorkoutHistory history={workoutHistory} onBack={() => setTrainingView("rutina")} />
          )}
          {tab === "nutricion" && (
            <NutritionScreen
              mode={nutritionMode}
              onMode={setNutritionMode}
              water={water}
              waterGoal={waterGoal}
              marks={hydrationMarks}
              onToggleBottle={toggleBottle}
              onAddWater={addWater}
              onChangeGoal={changeWaterGoal}
              onClear={() => setHydrationMarks(Array.from({ length: bottleCount }, () => false))}
              onComplete={() => setHydrationMarks(Array.from({ length: bottleCount }, () => true))}
              supplements={supplementMarks}
              onToggleSupplement={(index) => setSupplementMarks((current) =>
                current.map((item, itemIndex) => itemIndex === index ? !item : item),
              )}
            />
          )}
          {tab === "progreso" && (
            <ProgressScreen
              section={progressSection}
              onSection={setProgressSection}
              measureView={measureView}
              onMeasureView={setMeasureView}
              measurements={measurements}
              onAddMeasure={() => setSheet("measure")}
              photos={photos}
              photoView={photoView}
              onPhotoView={setPhotoView}
              onAddPhoto={addPhoto}
              history={workoutHistory}
              photoBackups={photoBackups}
              pendingPhotoIds={syncQueue.filter((item) => item.action === "saveProgressPhoto").map((item) => String(item.payload.photoId))}
              physicalAnalyses={physicalAnalyses}
              onAnalyzePhotos={analyzePhysicalPhotos}
            />
          )}
          {tab === "analisis" && (
            <AnalysisScreen
              weeklyPlan={weeklyPlan}
              measurements={measurements}
              history={workoutHistory}
              profile={userProfile}
              goalPlan={goalPlans.at(-1)}
              supersetPairs={supersetPairs}
              physicalAnalysis={physicalAnalyses.at(-1)}
              aiConsent={aiConsent}
              onPrivacy={() => setProfileSheet("privacy")}
            />
          )}
          {tab === "perfil" && (
            <ProfileScreen
              profile={userProfile}
              latestGoal={goalPlans.at(-1)}
              onEdit={openProfileEdit}
              onGoals={() => {
                setProfileDraft({ ...userProfile, priorityMuscles: [...userProfile.priorityMuscles] });
                setProfileSheet("goals");
              }}
              onOpenAnalysis={() => setTab("analisis")}
              onBackup={() => setProfileSheet("backup")}
              onPrivacy={() => setProfileSheet("privacy")}
              latestMeasurement={measurements.at(-1)}
              pendingSync={syncQueue.length}
            />
          )}
        </main>
      </MobileScroll>

      {!hideNav && (
        <nav className="bottom-nav" aria-label="Navegación principal">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={tab === item.id ? "nav-item active" : "nav-item"} onClick={() => navigate(item.id)}>
                <Icon /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <BottomSheet open={sheet !== null} onOpenChange={(open) => !open && setSheet(null)} title={sheet === "measure" ? "Nueva medición" : "Registro rápido"} description={sheet === "measure" ? "Mide siempre en condiciones similares." : "Actualiza peso e hidratación."}>
        {sheet === "quick" && (
          <div className="sheet-form">
            <Field label="Peso de hoy" value={weight} onChange={setWeight} suffix="kg" />
            <button className="sheet-choice" onClick={addWater}>+ Marcar una botella de 1 L</button>
            <button className="primary-button" onClick={saveQuickRecord}>
              <CheckCircledIcon /> Guardar registro
            </button>
          </div>
        )}
        {sheet === "measure" && (
          <div className="sheet-form measure-form">
            <div className="form-grid">
              {([
                ["weight", "Peso", "kg"], ["bodyFat", "Grasa", "%"], ["neck", "Cuello", "cm"],
                ["chest", "Pecho", "cm"], ["waist", "Cintura", "cm"], ["biceps", "Bíceps", "cm"],
                ["forearm", "Antebrazo", "cm"], ["thigh", "Muslo", "cm"], ["calf", "Pantorrilla", "cm"],
              ] as const).map(([key, label, suffix]) => (
                <Field key={key} label={label} value={measureDraft[key]} onChange={(value) => setMeasureDraft((current) => ({ ...current, [key]: value }))} suffix={suffix} />
              ))}
            </div>
            <button className="primary-button" onClick={saveMeasurement}><CheckCircledIcon /> Guardar medición</button>
          </div>
        )}
      </BottomSheet>
      <BottomSheet
        open={profileSheet === "edit"}
        onOpenChange={(open) => !open && setProfileSheet(null)}
        title="Editar perfil"
        description="Estos datos personalizan objetivos, análisis y recomendaciones."
      >
        <div className="sheet-form profile-edit-sheet">
          <label className="text-field">
            <span>Nombre</span>
            <KeyboardInput value={profileDraft.name} onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Tu nombre" />
          </label>
          <div className="form-grid two">
            <Field label="Altura" value={profileDraft.heightCm} onChange={(value) => setProfileDraft((current) => ({ ...current, heightCm: value }))} suffix="cm" />
            <Field label="Peso objetivo" value={profileDraft.targetWeightKg} onChange={(value) => setProfileDraft((current) => ({ ...current, targetWeightKg: value }))} suffix="kg" />
          </div>
          <div className="sheet-section-label"><span>Objetivo principal</span><small>Puede cambiar cuando cambie tu etapa.</small></div>
          <div className="choice-grid">
            {["Ganar masa muscular", "Recomposición corporal", "Mejorar fuerza", "Mantener y rendir"].map((objective) => (
              <button key={objective} className={profileDraft.objective === objective ? "active" : ""} onClick={() => setProfileDraft((current) => ({ ...current, objective }))}>{objective}</button>
            ))}
          </div>
          <div className="sheet-section-label"><span>Descanso predeterminado</span><small>Se inicia al completar una serie.</small></div>
          <div className="quick-options">
            {[30, 45, 60, 75, 90, 120].map((seconds) => <button key={seconds} className={profileDraft.defaultRestSeconds === seconds ? "active" : ""} onClick={() => setProfileDraft((current) => ({ ...current, defaultRestSeconds: seconds }))}>{seconds} s</button>)}
          </div>
          <button className="primary-button" onClick={saveProfile}><CheckCircledIcon /> Guardar perfil</button>
        </div>
      </BottomSheet>
      <BottomSheet
        open={profileSheet === "goals"}
        onOpenChange={(open) => !open && setProfileSheet(null)}
        title="Objetivos y retos"
        description="Responde lo esencial; la IA propondrá un paso pequeño, medible y revisable."
      >
        <div className="sheet-form goals-sheet">
          <div className="sheet-section-label"><span>Experiencia</span><small>Ayuda a calibrar expectativas.</small></div>
          <div className="choice-grid three">
            {(["Principiante", "Intermedio", "Avanzado"] as const).map((experience) => <button key={experience} className={profileDraft.experience === experience ? "active" : ""} onClick={() => setProfileDraft((current) => ({ ...current, experience }))}>{experience}</button>)}
          </div>
          <div className="sheet-section-label"><span>Días de entrenamiento</span><small>Semana habitual.</small></div>
          <div className="quick-options">
            {[3, 4, 5, 6].map((trainingDays) => <button key={trainingDays} className={profileDraft.trainingDays === trainingDays ? "active" : ""} onClick={() => setProfileDraft((current) => ({ ...current, trainingDays }))}>{trainingDays} días</button>)}
          </div>
          <div className="sheet-section-label"><span>Prioridades</span><small>Elige hasta 3 grupos.</small></div>
          <div className="goal-muscle-grid">
            {(Object.keys(exerciseNames) as Muscle[]).map((muscle) => <button key={muscle} className={profileDraft.priorityMuscles.includes(muscle) ? "active" : ""} onClick={() => togglePriorityMuscle(muscle)}>{muscle}</button>)}
          </div>
          <button className="primary-button" disabled={!profileDraft.experience || !profileDraft.priorityMuscles.length || goalStatus === "loading"} onClick={() => void generateGoalPlan()}>
            <LightningBoltIcon /> {goalStatus === "loading" ? "Diseñando tu semana…" : goalPlans.length ? "Actualizar objetivo con IA" : "Crear objetivo con IA"}
          </button>
          {goalStatus === "error" && <p className="analysis-error">No fue posible generar el objetivo. Tus respuestas siguen guardadas.</p>}
          {goalPlans.at(-1) && <GoalPlanCard plan={goalPlans.at(-1)!} />}
        </div>
      </BottomSheet>
      <BottomSheet
        open={profileSheet === "backup"}
        onOpenChange={(open) => !open && setProfileSheet(null)}
        title="Respaldo y sincronización"
        description="Tus datos se guardan primero en este dispositivo."
      >
        <div className="sheet-form backup-sheet">
          <section className="private-sync-card">
            <div>
              <strong>Conexión privada con Google</strong>
              <small>
                {syncConnectionStatus === "ready"
                  ? "Drive y Sheets verificados en este dispositivo."
                  : syncConnectionStatus === "checking"
                    ? "Comprobando acceso…"
                    : syncToken
                      ? "Código guardado. Pulsa verificar para comprobarlo."
                      : "Introduce una vez el código privado de tu app."}
              </small>
            </div>
            <KeyboardInput
              aria-label="Código privado de sincronización"
              type="password"
              autoComplete="off"
              value={syncTokenDraft}
              onChange={(event) => setSyncTokenDraft(event.target.value)}
              placeholder="Código privado"
            />
            <button className="sheet-choice" disabled={syncConnectionStatus === "checking"} onClick={() => void saveSyncToken()}>
              {syncToken ? "Verificar conexión" : "Guardar y conectar"}
            </button>
          </section>
          <section className="sync-status">
            <span className={syncQueue.length || !syncToken ? "pending" : "ready"} />
            <div>
              <strong>{syncing ? "Sincronizando…" : !syncToken ? "Conexión privada pendiente" : syncQueue.length ? `${syncQueue.length} registro${syncQueue.length === 1 ? "" : "s"} pendiente${syncQueue.length === 1 ? "" : "s"}` : "Todo guardado y listo para respaldar"}</strong>
              <small>{lastSyncAt ? `Última sincronización: ${formatDateTime(lastSyncAt)}` : "Aún no hay una sincronización confirmada con Google Sheets."}</small>
            </div>
          </section>
          <button className="primary-button" disabled={syncing || !syncToken || !syncQueue.length} onClick={() => void flushSyncQueue(syncQueue)}>
            <RocketIcon /> {syncing ? "Sincronizando…" : "Reintentar sincronización"}
          </button>
          <button className="sheet-choice" onClick={() => void exportBackup()}><FileTextIcon /> Crear respaldo local + Drive</button>
          <button className="sheet-choice" onClick={() => backupInputRef.current?.click()}><ReaderIcon /> Restaurar respaldo</button>
          <input ref={backupInputRef} className="file-input" type="file" accept="application/json,.json" onChange={importBackup} />
        </div>
      </BottomSheet>
      <BottomSheet
        open={profileSheet === "privacy"}
        onOpenChange={(open) => !open && setProfileSheet(null)}
        title="Privacidad y permisos"
        description="Tú decides qué datos pueden salir del iPhone."
      >
        <div className="sheet-form privacy-sheet">
          <section><strong>Copia inmediata en el iPhone</strong><p>Rutinas, medidas, hidratación, suplementos y fotos quedan disponibles sin conexión mientras se completa su respaldo. No dependes de una subida para seguir entrenando.</p></section>
          <section><strong>Google Drive y Sheets</strong><p>Con el código privado se sincronizan los registros y una copia comprimida de cada foto. El código vive solo en este dispositivo y no forma parte de GitHub ni de los respaldos.</p></section>
          <section><strong>Análisis con IA</strong><p>Las métricas se envían al generar el análisis. Las fotos solo se envían en pares seleccionados cuando autorizas expresamente esa comparación; el permiso no queda activo para la siguiente.</p></section>
          <button className={aiConsent ? "consent-toggle active" : "consent-toggle"} onClick={() => setAiConsent((current) => !current)}>
            <span><strong>Permitir análisis con IA</strong><small>{aiConsent ? "Activo" : "Desactivado"}</small></span>
            <i />
          </button>
        </div>
      </BottomSheet>
      {saveMessage && <div className="save-toast" role="status">{saveMessage}</div>}
    </div>
  );
}

function ScreenHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <header className="screen-header"><div><p>{eyebrow}</p><h1>{title}</h1></div>{action}</header>;
}

function BackHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: ReactNode }) {
  return <header className="back-header"><button onClick={onBack} aria-label="Volver"><ChevronLeftIcon /></button><strong>{title}</strong><span>{action}</span></header>;
}

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div><KeyboardInput value={value} onChange={(event) => onChange(event.target.value)} inputMode="decimal" /><em>{suffix}</em></div>
    </label>
  );
}

function HomeScreen({ profile, goalPlan, water, waterGoal, completion, selectedDay, routineName: todayRoutine, plannedSets, onWater, onOpenWater, onStart, onQuickAdd, onAnalysis, onProfile, measurements, history }: {
  profile: UserProfile; goalPlan?: GoalPlan;
  water: number; waterGoal: number; completion: number; selectedDay: WeekDay; routineName: string; plannedSets: number;
  onWater: () => void; onOpenWater: () => void;
  onStart: () => void; onQuickAdd: () => void; onAnalysis: () => void; onProfile: () => void;
  measurements: Measurement[]; history: SavedWorkout[];
}) {
  const latest = measurements.at(-1);
  const previous = measurements.at(-2);
  const first = measurements[0];
  const targetWeight = Number(profile.targetWeightKg);
  const hasTarget = Number.isFinite(targetWeight) && targetWeight > 0;
  const weightProgress = latest && first && hasTarget && targetWeight !== first.weight
    ? Math.max(0, Math.min(100, Math.round(((latest.weight - first.weight) / (targetWeight - first.weight)) * 100)))
    : 0;
  const lastSession = history[0];
  return (
    <>
      <ScreenHeader eyebrow={formatToday()} title={`Buenos días, ${profile.name}.`} action={<button className="avatar-button" aria-label="Abrir perfil" onClick={onProfile}><img src="/assets/alejandro/app-icon.png" alt="" /></button>} />
      <button className="home-ai-shortcut" onClick={onAnalysis} aria-label="Abrir Alejandro IA">
        <span className="home-ai-visual"><img src="/assets/alejandro/ai-neural-core.png" alt="" /></span>
        <span className="home-ai-copy"><small>ALEJANDRO IA</small><strong>Tu progreso, analizado con contexto</strong><em>Entrenos, medidas y evolución en un solo lugar</em></span>
        <ChevronRightIcon />
      </button>
      <section className="mission-card">
        <div><small>{goalPlan ? "Objetivo de esta semana" : "Misión actual"}</small><h2>{goalPlan ? goalPlan.weeklyGoal : latest && hasTarget ? `Avanzar de ${first?.weight ?? latest.weight} kg a ${targetWeight} kg` : "Construir tu línea base con datos reales"}</h2><p>{goalPlan ? `Revisión: ${formatDate(goalPlan.reviewDate)}` : profile.objective}</p></div>
        <div className="progress-ring" style={{ "--progress": `${weightProgress}%` } as CSSProperties}><strong>{weightProgress}%</strong><span>rumbo</span></div>
      </section>
      {goalPlan && <button className="weekly-challenge-card" onClick={onProfile}><span><small>Reto pequeño · gran cambio</small><strong>{goalPlan.challenge}</strong><em>{goalPlan.successMetric}</em></span><ChevronRightIcon /></button>}
      {latest ? (
        <section className="metric-grid">
          <Metric label="Peso" value={`${latest.weight} kg`} trend={previous ? `${signed(latest.weight - previous.weight)} kg` : "línea base"} />
          <Metric label="Grasa" value={`${latest.bodyFat}%`} trend={previous ? `${signed(latest.bodyFat - previous.bodyFat)}%` : "línea base"} />
          <Metric label="Bíceps" value={`${latest.biceps} cm`} trend={previous ? `${signed(latest.biceps - previous.biceps)} cm` : "línea base"} />
        </section>
      ) : (
        <button className="data-empty-card" onClick={onQuickAdd}>
          <PlusIcon /><span><strong>Crea tu primera línea base</strong><small>Registra peso y medidas; hasta entonces no mostraremos cifras de ejemplo.</small></span><ChevronRightIcon />
        </button>
      )}
      <div className="section-title"><h2>Hoy</h2><button onClick={onQuickAdd}>Registro rápido</button></div>
      <section className="workout-card">
        <div className="card-top"><div><small>Entrenamiento · {selectedDay}</small><h2>{todayRoutine}</h2></div><span>{completion ? "En curso" : "Plan de hoy"}</span></div>
        <div className="workout-stats"><span><StopwatchIcon />{lastSession ? `${lastSession.durationMinutes} min últ.` : "Sin duración"}</span><span><ActivityLogIcon />{plannedSets} series</span><span><Crosshair2Icon />{lastSession ? `RPE ${lastSession.rpe.toFixed(1)}` : "Sin RPE"}</span></div>
        <div className="completion-row"><span>Preparación</span><strong>{completion}%</strong></div>
        <div className="bar"><i style={{ width: `${completion}%` }} /></div>
        <button className="primary-button" onClick={onStart}>{plannedSets ? <PlayIcon /> : <PlusIcon />} {plannedSets ? "Iniciar entrenamiento" : "Configurar entrenamiento"}</button>
      </section>
      <Carousel ariaLabel="Seguimiento de hoy" className="habit-carousel" contentClassName="habit-track">
        <button className="habit-card" onClick={onOpenWater}><img src="/assets/alejandro/bottle-flat.png" alt="" /><small>Agua</small><strong>{water} / {waterGoal} L</strong><em>Cada botella = 1 L</em></button>
        <article className="habit-card"><span className="habit-glyph"><RocketIcon /></span><small>Suplementos</small><strong>Registro diario</strong><em>Ve a Nutrición</em></article>
        <button className="habit-card" onClick={onAnalysis}><span className="habit-glyph"><LightningBoltIcon /></span><small>Análisis</small><strong>Domingo</strong><em>Con evidencia</em></button>
      </Carousel>
      <button className="water-quick-action" onClick={onWater}><img src="/assets/alejandro/bottle-flat.png" alt="" /><span><small>Registro rápido</small><strong>Marcar botella de 1 L</strong></span><PlusIcon /></button>
    </>
  );
}

function Metric({ label, value, trend }: { label: string; value: string; trend: string }) {
  return <article className="metric-card"><small>{label}</small><strong>{value}</strong><em>{trend}</em></article>;
}

function SwipeExerciseRow({ exercise, index, sets, partner, open, onReveal, onOpen, onDelete }: {
  exercise: ExerciseDefinition;
  index: number;
  sets: WorkoutSet[];
  partner?: ExerciseDefinition;
  open: boolean;
  onReveal: (id: string | null) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const actionWidth = 96;
  const [offset, setOffsetState] = useState(open ? -actionWidth : 0);
  const offsetRef = useRef(offset);
  const draggingRef = useRef(false);
  const gestureAxisRef = useRef<"x" | "y" | null>(null);
  const startRef = useRef({ x: 0, y: 0, offset: 0 });
  const suppressClickUntilRef = useRef(0);
  const suppressDeleteClickUntilRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const done = sets.some((set) => set.done);

  const setOffset = (value: number) => {
    offsetRef.current = value;
    setOffsetState(value);
  };

  useEffect(() => {
    if (!draggingRef.current) setOffset(open ? -actionWidth : 0);
  }, [open]);

  return (
    <article className="swipe-exercise-row">
      <button
        className="swipe-delete-action"
        aria-label={`Eliminar ${exercise.name}`}
        aria-hidden={!open && offset > -4}
        tabIndex={open ? 0 : -1}
        disabled={!open}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => {
          event.stopPropagation();
          if (event.pointerType === "mouse") return;
          event.preventDefault();
          suppressDeleteClickUntilRef.current = Date.now() + 500;
          onDelete(exercise.id);
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (Date.now() < suppressDeleteClickUntilRef.current) return;
          onDelete(exercise.id);
        }}
      >
        <TrashIcon />
        <span>Eliminar</span>
      </button>
      <button
        className={dragging ? "exercise-row swiping" : "exercise-row"}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          event.stopPropagation();
          draggingRef.current = true;
          gestureAxisRef.current = null;
          setDragging(true);
          startRef.current = { x: event.clientX, y: event.clientY, offset: open ? -actionWidth : 0 };
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          const deltaX = event.clientX - startRef.current.x;
          const deltaY = event.clientY - startRef.current.y;
          if (!gestureAxisRef.current) {
            if (Math.hypot(deltaX, deltaY) < 10) return;
            gestureAxisRef.current = Math.abs(deltaX) > Math.abs(deltaY) * 1.2 ? "x" : "y";
          }
          if (gestureAxisRef.current === "y") return;
          event.stopPropagation();
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          suppressClickUntilRef.current = Date.now() + 300;
          setOffset(Math.max(-actionWidth, Math.min(0, startRef.current.offset + deltaX)));
        }}
        onPointerUp={(event) => {
          if (!draggingRef.current) return;
          event.stopPropagation();
          draggingRef.current = false;
          setDragging(false);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          if (gestureAxisRef.current !== "x") {
            gestureAxisRef.current = null;
            setOffset(open ? -actionWidth : 0);
            return;
          }
          const shouldReveal = offsetRef.current <= -(actionWidth * .45);
          setOffset(shouldReveal ? -actionWidth : 0);
          onReveal(shouldReveal ? exercise.id : null);
          gestureAxisRef.current = null;
        }}
        onPointerCancel={(event) => {
          event.stopPropagation();
          draggingRef.current = false;
          gestureAxisRef.current = null;
          setDragging(false);
          setOffset(open ? -actionWidth : 0);
        }}
        onClick={() => {
          if (Date.now() < suppressClickUntilRef.current) return;
          if (open) {
            onReveal(null);
            return;
          }
          onOpen(exercise.id);
        }}
      >
        <span className="exercise-number">{index + 1}</span>
        <span><strong>{exercise.name}</strong><small>{exercise.prescription} · {sets.filter((set) => set.done).length} registradas</small>{partner && <em>Biserie con {partner.name}</em>}</span>
        {done ? <CheckCircledIcon className="done" /> : <CircleIcon />}
      </button>
    </article>
  );
}

function RoutineScreen({ routine, setsByExercise, partnerByExercise, completion, selectedDay, onSelectedDay, routineName: activeName, showReusePrompt, onChooseWeekPlan, onOpen, onDelete, onLibrary, onHistory, onSave, activeStartedAt }: {
  routine: ExerciseDefinition[]; setsByExercise: Record<string, WorkoutSet[]>; completion: number;
  partnerByExercise: Record<string, string>;
  selectedDay: WeekDay; onSelectedDay: (day: WeekDay) => void; routineName: string;
  showReusePrompt: boolean; onChooseWeekPlan: (reuse: boolean) => void;
  onOpen: (id: string) => void; onDelete: (id: string) => void; onLibrary: () => void; onHistory: () => void; onSave: () => void;
  activeStartedAt?: string;
}) {
  const [revealedExerciseId, setRevealedExerciseId] = useState<string | null>(null);
  const completedSets = routine.flatMap((exercise) => setsByExercise[exercise.id] || []).filter((set) => set.done);
  const plannedSets = routine.length * 4;
  return (
    <>
      <ScreenHeader eyebrow="Entrenamiento del día" title={activeName} action={<span className="live-pill">{completion}%</span>} />
      <Carousel ariaLabel="Días de entrenamiento" className="day-carousel" contentClassName="day-track">
        {weekDays.map((day) => <button key={day} className={selectedDay === day ? "active" : ""} onClick={() => onSelectedDay(day)}><small>{day.slice(0, 3)}</small><strong>{day}</strong></button>)}
      </Carousel>
      {showReusePrompt && (
        <section className="reuse-week-card">
          <div><small>Tu rutina ya tiene memoria</small><strong>¿Usamos el mismo plan de la semana pasada?</strong><p>Puedes conservarlo y ajustar ejercicios o empezar una semana vacía.</p></div>
          <div><button onClick={() => onChooseWeekPlan(false)}>Empezar nueva</button><button className="active" onClick={() => onChooseWeekPlan(true)}>Usar semana pasada</button></div>
        </section>
      )}
      <section className="session-summary">
        <div><small>Estado</small><strong>{activeStartedAt ? "En curso" : "Sin iniciar"}</strong></div>
        <div><small>Series</small><strong>{completedSets.length}/{plannedSets}</strong></div>
        <div><small>RPE medio</small><strong>{average(completedSets.map((set) => Number(set.rpe))).toFixed(1)}</strong></div>
      </section>
      <div className="section-title"><h2>Ejercicios</h2><span>Toca para registrar · desliza para borrar</span></div>
      <section className="exercise-list">
        {routine.map((exercise, index) => {
          const sets = setsByExercise[exercise.id] || [];
          const partner = routine.find((item) => item.id === partnerByExercise[exercise.id]);
          return (
            <SwipeExerciseRow
              key={exercise.id}
              exercise={exercise}
              index={index}
              sets={sets}
              partner={partner}
              open={revealedExerciseId === exercise.id}
              onReveal={setRevealedExerciseId}
              onOpen={onOpen}
              onDelete={(id) => {
                setRevealedExerciseId(null);
                onDelete(id);
              }}
            />
          );
        })}
      </section>
      {!routine.length && <section className="empty-routine"><ActivityLogIcon /><strong>{selectedDay} aún no tiene rutina</strong><p>Agrega ejercicios desde la biblioteca. Cada uno comenzará con 4 series.</p></section>}
      <button className="secondary-button" onClick={onLibrary}><PlusIcon /> Agregar ejercicio de la biblioteca</button>
      <button className="history-card" onClick={onHistory}><ReaderIcon /><span><small>Historial de rutinas</small><strong>Tus sesiones finalizadas</strong></span><ChevronRightIcon /></button>
      <button className="primary-button finish-workout" onClick={onSave} disabled={!completedSets.length}><CheckCircledIcon /> Finalizar entrenamiento</button>
    </>
  );
}

function ExerciseLibrary({ search, onSearch, muscle, onMuscle, equipment, onEquipment, routineIds, onAdd, favoriteIds, onToggleFavorite, onBack }: {
  search: string; onSearch: (value: string) => void; muscle: Muscle | "Todos"; onMuscle: (value: Muscle | "Todos") => void;
  equipment: Equipment | "Todo"; onEquipment: (value: Equipment | "Todo") => void; routineIds: string[];
  onAdd: (id: string) => void; favoriteIds: string[]; onToggleFavorite: (id: string) => void; onBack: () => void;
}) {
  const [visibleCount, setVisibleCount] = useState(10);
  const hasSearch = Boolean(search.trim());
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = exerciseCatalog.filter((exercise) =>
    (hasSearch || muscle === "Todos" || exercise.muscle === muscle) &&
    (hasSearch || equipment === "Todo" || exercise.equipment === equipment) &&
    [exercise.name, exercise.muscle, exercise.equipment, ...exercise.aliases]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch),
  ).sort((a, b) => Number(favoriteIds.includes(b.id)) - Number(favoriteIds.includes(a.id)));
  const visibleExercises = filtered.slice(0, visibleCount);
  useEffect(() => setVisibleCount(10), [search, muscle, equipment]);
  return (
    <>
      <BackHeader title="Biblioteca de ejercicios" onBack={onBack} action={<span className="library-count">{exerciseCatalog.length}</span>} />
      <label className="search-field"><MagnifyingGlassIcon /><KeyboardInput value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar ejercicio" /></label>
      <div className="filter-label"><span>Grupo muscular</span><small>{filtered.length} resultados</small></div>
      <div className="chip-scroll">
        {(["Todos", ...Object.keys(exerciseNames)] as Array<Muscle | "Todos">).map((item) => <button key={item} className={muscle === item ? "active" : ""} onClick={() => onMuscle(item)}>{item}</button>)}
      </div>
      <div className="chip-scroll equipment-chips">
        {(["Todo", "Barra", "Mancuernas", "Máquina", "Polea", "Peso corporal"] as Array<Equipment | "Todo">).map((item) => <button key={item} className={equipment === item ? "active" : ""} onClick={() => onEquipment(item)}>{item}</button>)}
      </div>
      <section className="library-list">
        {visibleExercises.map((exercise) => (
          <article className="library-row" key={exercise.id}>
            <img src={exercise.image} alt={`Ilustración de ${exercise.name}`} loading="lazy" />
            <div>
              <span>{exercise.muscle} · {exercise.equipment}</span>
              <strong>{exercise.name}</strong>
              <small>{exercise.prescription}</small>
              {!!exercise.aliases.length && <em className="exercise-alias">También: {exercise.aliases[0]}</em>}
            </div>
            <div className="library-actions">
              <button className={favoriteIds.includes(exercise.id) ? "favorite active" : "favorite"} onClick={() => onToggleFavorite(exercise.id)} aria-label={`${favoriteIds.includes(exercise.id) ? "Quitar" : "Agregar"} ${exercise.name} ${favoriteIds.includes(exercise.id) ? "de" : "a"} favoritos`}>★</button>
              <button onClick={() => onAdd(exercise.id)} aria-label={`Agregar ${exercise.name}`}>{routineIds.includes(exercise.id) ? <ChevronRightIcon /> : <PlusIcon />}</button>
            </div>
          </article>
        ))}
      </section>
      {!filtered.length && (
        <section className="library-empty">
          <MagnifyingGlassIcon />
          <strong>No encontramos ese ejercicio</strong>
          <p>Prueba otro nombre o cambia los filtros.</p>
        </section>
      )}
      {!!filtered.length && (
        <div className="library-pagination">
          <span>Mostrando {visibleExercises.length} de {filtered.length}</span>
          {visibleExercises.length < filtered.length && (
            <button className="secondary-button library-more" onClick={() => setVisibleCount((current) => current + 10)}>
              Mostrar 10 más
            </button>
          )}
        </div>
      )}
    </>
  );
}

function ExerciseLogger({ exercise, routine, sets, partnerId, defaultRestSeconds, onUpdate, onAdd, onPair, onSwitchPartner, onBack, onSave }: {
  exercise: ExerciseDefinition; routine: ExerciseDefinition[]; sets: WorkoutSet[]; partnerId: string; defaultRestSeconds: number;
  onUpdate: (setId: string, field: keyof WorkoutSet, value: string | boolean) => void;
  onAdd: () => void; onPair: (partnerId: string) => void; onSwitchPartner: () => void; onBack: () => void; onSave: () => void;
}) {
  const [restSeconds, setRestSeconds] = useState(0);
  const [restPreset, setRestPreset] = useState(defaultRestSeconds);
  useEffect(() => setRestPreset(defaultRestSeconds), [defaultRestSeconds]);
  useEffect(() => {
    if (!restSeconds) return;
    const timer = window.setInterval(() => setRestSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [restSeconds > 0]);
  const isCardio = exercise.muscle === "Cardio";
  const completed = sets.filter((set) => set.done);
  const best = completed.reduce((current, set) => {
    if (isCardio) return current;
    const estimate = estimatedOneRepMax(Number(set.weight), Number(set.reps));
    return Math.max(current, estimate);
  }, 0);
  const volume = isCardio
    ? completed.reduce((sum, set) => sum + Number(set.weight || 0), 0)
    : completed.reduce((sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0), 0);
  const peakSpeed = isCardio ? Math.max(0, ...completed.map((set) => Number(set.reps || 0))) : 0;
  const averageRpe = average(completed.map((set) => Number(set.rpe)));
  const partner = routine.find((item) => item.id === partnerId);
  const overloadAdvice = completed.length < 4
    ? "Completa las 4 series antes de cambiar la carga."
    : averageRpe >= 9
      ? "Repite la carga y consolida técnica o repeticiones; no fuerces un aumento todavía."
      : "Si alcanzas el máximo del rango con técnica estable, prueba +2,5 kg la próxima sesión.";
  return (
    <>
      <BackHeader title="Registro" onBack={onBack} action={<span className="logger-muscle">{exercise.muscle}</span>} />
      <section className="exercise-hero">
        <div><span>{exercise.muscle} · {exercise.equipment}</span><h1>{exercise.name}</h1><p>{exercise.cue}</p></div>
        <img src={exercise.image} alt={`Ejecución de ${exercise.name}`} />
      </section>
      <section className="set-card">
        <div className="set-head"><span>{isCardio ? "Bloque" : "Serie"}</span><span>{isCardio ? "Min" : "Peso kg"}</span><span>{isCardio ? "km/h" : "Reps"}</span><span className="effort-heading">Esfuerzo<small>1 a 10</small></span><span /></div>
        {sets.map((set, index) => (
          <div className={set.done ? "set-row complete" : "set-row"} key={set.id}>
            <strong>{index + 1}</strong>
            <KeyboardInput aria-label={isCardio ? `Minutos bloque ${index + 1}` : `Peso serie ${index + 1}`} value={set.weight} onChange={(event) => onUpdate(set.id, "weight", event.target.value)} inputMode="decimal" enterKeyHint="next" />
            <KeyboardInput aria-label={isCardio ? `Velocidad bloque ${index + 1}` : `Repeticiones serie ${index + 1}`} value={set.reps} onChange={(event) => onUpdate(set.id, "reps", event.target.value)} inputMode={isCardio ? "decimal" : "numeric"} enterKeyHint="next" />
            <KeyboardInput aria-label={`Esfuerzo RPE de la serie ${index + 1}`} value={set.rpe} onChange={(event) => onUpdate(set.id, "rpe", event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} inputMode="decimal" enterKeyHint="done" placeholder="8" />
            <button onClick={() => {
              (document.activeElement as HTMLElement | null)?.blur();
              const willComplete = !set.done;
              onUpdate(set.id, "done", willComplete);
              if (willComplete && set.weight && set.reps && set.rpe) setRestSeconds(restPreset);
            }} aria-label={`Completar serie ${index + 1}`}>{set.done ? <CheckCircledIcon /> : <CircleIcon />}</button>
          </div>
        ))}
        <button className="add-set" onClick={onAdd}><PlusIcon /> Agregar serie</button>
        <div className="rpe-guide">
          <div className="rpe-guide-title">
            <ReaderIcon />
            <span><strong>¿Qué número pongo en esfuerzo?</strong><small>Al terminar la serie, piensa: “¿Cuántas repeticiones más podía hacer bien?”</small></span>
          </div>
          <div className="rpe-scale" aria-label="Guía sencilla de esfuerzo RPE">
            <span><b>10</b><em>Ninguna más</em></span>
            <span><b>9</b><em>Una más</em></span>
            <span className="recommended"><b>8</b><em>Dos más</em></span>
            <span><b>7</b><em>Tres más</em></span>
          </div>
          <p><strong>Para ganar músculo:</strong> normalmente registra <b>8 o 9</b>. Usa 10 solo algunas veces y únicamente si mantuviste una buena técnica.</p>
        </div>
      </section>
      <section className={restSeconds ? "rest-timer active" : "rest-timer"}>
        <StopwatchIcon />
        <div><small>Descanso · predeterminado {restPreset} s</small><strong>{restSeconds ? `${Math.floor(restSeconds / 60)}:${String(restSeconds % 60).padStart(2, "0")}` : "Listo para iniciar"}</strong></div>
        <div className="rest-actions"><button onClick={() => setRestSeconds((current) => Math.max(0, current - 15))}>−15</button><button onClick={() => setRestSeconds(restSeconds ? 0 : restPreset)}>{restSeconds ? "Omitir" : `${restPreset} s`}</button><button onClick={() => setRestSeconds((current) => current + 15)}>+15</button></div>
      </section>
      {routine.length > 1 && (
        <section className="superset-card">
          <div className="superset-heading"><LightningBoltIcon /><span><small>Cambio rápido</small><strong>Biserie / superserie</strong></span>{partner && <em>Activa</em>}</div>
          <p>Empareja dos ejercicios para alternarlos sin volver a la lista. El descanso sigue siendo editable.</p>
          <div className="superset-options">
            <button className={!partnerId ? "active" : ""} onClick={() => onPair("")}>Sin biserie</button>
            {routine.filter((item) => item.id !== exercise.id).map((item) => <button key={item.id} className={partnerId === item.id ? "active" : ""} onClick={() => onPair(item.id)}>{item.name}</button>)}
          </div>
          {partner && <button className="switch-exercise-button" onClick={onSwitchPartner}>Cambiar ahora a {partner.name} <ChevronRightIcon /></button>}
        </section>
      )}
      <section className="performance-card">
        {isCardio ? (
          <>
            <div><small>Tiempo completado</small><strong>{volume.toLocaleString("es-CO")} min</strong></div>
            <div><small>Velocidad más alta</small><strong>{peakSpeed ? `${peakSpeed.toFixed(1)} km/h` : "—"}</strong></div>
            <p><strong>Tiempo completado:</strong> suma los minutos de los bloques marcados. <strong>Velocidad más alta:</strong> el ritmo más rápido que registraste hoy.</p>
          </>
        ) : (
          <>
            <div><small>Trabajo total de hoy</small><strong>{volume.toLocaleString("es-CO")} kg</strong><em>Peso × repeticiones de todas las series terminadas.</em></div>
            <div><small>Máximo estimado (e1RM)</small><strong>{best ? `${best.toFixed(1)} kg` : "—"}</strong><em>Tu fuerza aproximada para una sola repetición.</em></div>
            <p><strong>No necesitas probar ese máximo.</strong> El e1RM sirve para comparar si tu fuerza sube con el tiempo; es una referencia calculada con las series que registras.</p>
          </>
        )}
      </section>
      <section className="overload-card">
        <div><LightningBoltIcon /><span><small>Sobrecarga progresiva</small><strong>Próximo paso</strong></span></div>
        <p>{overloadAdvice}</p>
        <small>Regla usada: 4 series, rango objetivo y RPE medio {averageRpe ? averageRpe.toFixed(1) : "sin datos"}.</small>
      </section>
      <button className="primary-button" onClick={onSave}><CheckCircledIcon /> {partner ? `Guardar y pasar a ${partner.name}` : "Guardar ejercicio"}</button>
    </>
  );
}

function WorkoutHistory({ history, onBack }: { history: SavedWorkout[]; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recent = history.filter((item) => new Date(item.date) >= cutoff);
  const adherence = Math.min(100, Math.round((recent.length / 20) * 100));
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = normalizedSearch
    ? history.filter((item) => [item.day, item.routine, ...item.sets.map((set) => set.exercise)].join(" ").toLowerCase().includes(normalizedSearch))
    : history;
  const visible = filtered.slice(0, visibleCount);
  return (
    <>
      <BackHeader title="Historial de rutinas" onBack={onBack} />
      <section className="history-summary"><span><small>Últimos 30 días</small><strong>{recent.length} sesiones</strong></span><span><small>Adherencia estimada</small><strong>{adherence}%</strong></span></section>
      <label className="search-field history-search"><MagnifyingGlassIcon /><KeyboardInput value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(12); }} placeholder="Buscar día, rutina o ejercicio" /></label>
      {history.length ? (
        <section className="timeline-list">
          {visible.map((item) => (
            <details className="history-detail" key={item.id}>
              <summary><span>{formatShortDate(item.date)}</span><div><strong>{item.day} · {item.routine}</strong><small>{item.setCount} series · {item.durationMinutes} min · RPE {item.rpe.toFixed(1)}</small></div><ChevronRightIcon /></summary>
              <div className="history-set-list">
                {item.sets.map((set) => (
                  <article key={`${set.exerciseId}-${set.setNumber}`}>
                    <span><strong>{set.exercise}</strong><small>Serie {set.setNumber} · {set.muscle}</small></span>
                    <em>{set.muscle === "Cardio"
                      ? `${set.durationMinutes || 0} min · ${set.speedKph || 0} km/h`
                      : `${set.weightKg} kg × ${set.reps}`}</em>
                    <b>RPE {set.rpe}</b>
                  </article>
                ))}
              </div>
            </details>
          ))}
          {visible.length < filtered.length && <button className="secondary-button history-more" onClick={() => setVisibleCount((current) => current + 12)}>Mostrar 12 más</button>}
          {!filtered.length && <section className="empty-routine"><MagnifyingGlassIcon /><strong>Sin coincidencias</strong><p>Prueba con un día, grupo o nombre de ejercicio.</p></section>}
        </section>
      ) : (
        <section className="empty-routine"><ReaderIcon /><strong>Aún no hay entrenamientos finalizados</strong><p>Completa al menos una serie y finaliza la sesión para crear tu historial real.</p></section>
      )}
    </>
  );
}

function NutritionScreen({ mode, onMode, water, waterGoal, marks, onToggleBottle, onAddWater, onChangeGoal, onClear, onComplete, supplements, onToggleSupplement }: {
  mode: NutritionMode; onMode: (mode: NutritionMode) => void; water: number; waterGoal: number; marks: boolean[];
  onToggleBottle: (index: number) => void; onAddWater: () => void; onChangeGoal: (amount: number) => void;
  onClear: () => void; onComplete: () => void; supplements: boolean[]; onToggleSupplement: (index: number) => void;
}) {
  const progress = Math.round((water / waterGoal) * 100);
  const supplementItems = [["Creatina", "5 g"], ["Proteína whey", "25 g"], ["Omega 3", "1 cápsula"], ["Vitamina D", "1 cápsula"]];
  return (
    <>
      <ScreenHeader eyebrow="Nutrición y hábitos" title={mode === "hidratacion" ? "Hidratación" : "Suplementos"} action={<span className="live-pill">{mode === "hidratacion" ? `${progress}%` : "Hoy"}</span>} />
      <div className="segmented"><button className={mode === "suplementos" ? "active" : ""} onClick={() => onMode("suplementos")}>Suplementos</button><button className={mode === "hidratacion" ? "active" : ""} onClick={() => onMode("hidratacion")}>Hidratación</button></div>
      {mode === "suplementos" ? (
        <section className="supplement-list">
          <div className="list-heading"><span>Hoy</span><small>{supplements.filter(Boolean).length}/{supplements.length}</small></div>
          {supplementItems.map(([name, dose], index) => (
            <button key={name} className={supplements[index] ? "supplement-row checked" : "supplement-row"} onClick={() => onToggleSupplement(index)}>
              <RocketIcon /><span><strong>{name}</strong><small>{dose}</small></span>{supplements[index] ? <CheckCircledIcon /> : <CircleIcon />}
            </button>
          ))}
        </section>
      ) : (
        <>
          <section className="hydration-hero"><div><small>Agua consumida</small><strong>{water} <span>/ {waterGoal} L</span></strong><p>{progress >= 100 ? "Objetivo completado." : `Faltan ${waterGoal - water} L para tu meta.`}</p></div><div className="progress-ring" style={{ "--progress": `${progress}%` } as CSSProperties}><strong>{progress}%</strong><span>hoy</span></div></section>
          <section className="water-goal-card"><div><small>Objetivo diario</small><strong>{waterGoal} litros</strong></div><div className="goal-stepper"><button onClick={() => onChangeGoal(-1)}>−</button><span>{waterGoal} L</span><button onClick={() => onChangeGoal(1)}>+</button></div></section>
          <section className="bottle-section">
            <div className="list-heading"><span>Botellas de hoy</span><small>Cada una equivale a 1 L</small></div>
            <div className="bottle-grid">{Array.from({ length: waterGoal }, (_, index) => <button key={index} className={marks[index] ? "bottle checked" : "bottle"} onClick={() => onToggleBottle(index)}><img src="/assets/alejandro/bottle-flat.png" alt="" /><strong>{index + 1} L</strong>{marks[index] ? <CheckCircledIcon /> : <CircleIcon />}</button>)}</div>
            <div className="water-actions"><button onClick={onClear}>Vaciar</button><button onClick={onAddWater}>+ 1 botella</button><button onClick={onComplete}>Completar</button></div>
          </section>
        </>
      )}
    </>
  );
}

function ProgressScreen({ section, onSection, measureView, onMeasureView, measurements, onAddMeasure, photos, photoView, onPhotoView, onAddPhoto, history, photoBackups, pendingPhotoIds, physicalAnalyses, onAnalyzePhotos }: {
  section: ProgressSection; onSection: (section: ProgressSection) => void; measureView: MeasureView; onMeasureView: (view: MeasureView) => void;
  measurements: Measurement[]; onAddMeasure: () => void; photos: ProgressPhoto[]; photoView: ProgressPhoto["view"];
  onPhotoView: (view: ProgressPhoto["view"]) => void; onAddPhoto: (event: ChangeEvent<HTMLInputElement>) => void; history: SavedWorkout[];
  photoBackups: Record<string, { driveUrl: string; syncedAt: string }>; pendingPhotoIds: string[];
  physicalAnalyses: PhysicalAnalysis[];
  onAnalyzePhotos: (before: ProgressPhoto, after: ProgressPhoto) => Promise<PhysicalAnalysis>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compareFromIndex, setCompareFromIndex] = useState(0);
  const [compareToIndex, setCompareToIndex] = useState(Math.max(0, measurements.length - 1));
  const [photoAnalysisConsent, setPhotoAnalysisConsent] = useState(false);
  const [photoAnalysisStatus, setPhotoAnalysisStatus] = useState<"idle" | "loading" | "error">("idle");
  const [photoFromIndex, setPhotoFromIndex] = useState(0);
  const [photoToIndex, setPhotoToIndex] = useState(1);
  const photosForCurrentView = photos.filter((photo) => photo.view === photoView);
  useEffect(() => {
    setCompareToIndex(Math.max(0, measurements.length - 1));
  }, [measurements.length]);
  useEffect(() => {
    setPhotoFromIndex(Math.max(0, photosForCurrentView.length - 2));
    setPhotoToIndex(Math.max(0, photosForCurrentView.length - 1));
    setPhotoAnalysisConsent(false);
    setPhotoAnalysisStatus("idle");
  }, [photoView, photosForCurrentView.length]);
  const photoViews: ProgressPhoto["view"][] = ["Frente", "Espalda", "Perfil izq.", "Perfil der."];
  if (section === "medidas" && !measurements.length) {
    return (
      <>
        <ScreenHeader eyebrow="Seguimiento físico" title="Progreso" action={<span className="live-pill">0 registros</span>} />
        <div className="segmented"><button className="active" onClick={() => onSection("medidas")}>Medidas</button><button onClick={() => onSection("fotos")}>Fotos</button></div>
        <section className="progress-empty-state">
          <Crosshair2Icon />
          <strong>Empieza con una línea base</strong>
          <p>Registra tus medidas en condiciones similares. La app solo calculará cambios cuando existan datos reales comparables.</p>
          <button className="primary-button" onClick={onAddMeasure}><PlusIcon /> Crear primera medición</button>
        </section>
        <section className="measurement-guide">
          <div className="measurement-guide-copy"><small>Guía visual</small><strong>Cómo tomar cada medida</strong><p>Cinta horizontal, sin comprimir la piel. Repite horario, postura y punto anatómico.</p></div>
          <img src="/assets/alejandro/measurement-guide.png" alt="Guía frontal y lateral para medir cuello, pecho, cintura, brazo, muslo y pantorrilla" />
          <div className="measurement-points"><span>Cuello</span><span>Pecho</span><span>Cintura</span><span>Brazo</span><span>Muslo</span><span>Pantorrilla</span></div>
        </section>
      </>
    );
  }
  const latest = measurements.at(-1)!;
  const previous = measurements.at(-2) || latest;
  const compareFrom = measurements[compareFromIndex] || measurements[0];
  const compareTo = measurements[compareToIndex] || latest;
  const selectedPhotos = photosForCurrentView;
  const comparisonBefore = selectedPhotos[photoFromIndex];
  const comparisonAfter = selectedPhotos[photoToIndex];
  const latestPhotoAnalysis = comparisonBefore && comparisonAfter
    ? [...physicalAnalyses].reverse().find((analysis) =>
      analysis.beforePhotoId === comparisonBefore.id && analysis.afterPhotoId === comparisonAfter.id)
    : undefined;
  const requestPhysicalAnalysis = async () => {
    if (!comparisonBefore || !comparisonAfter || !photoAnalysisConsent) return;
    setPhotoAnalysisStatus("loading");
    try {
      await onAnalyzePhotos(comparisonBefore, comparisonAfter);
      setPhotoAnalysisConsent(false);
      setPhotoAnalysisStatus("idle");
    } catch {
      setPhotoAnalysisStatus("error");
    }
  };
  return (
    <>
      <ScreenHeader eyebrow="Seguimiento físico" title="Progreso" action={<span className="live-pill">{measurements.length} registros</span>} />
      <div className="segmented"><button className={section === "medidas" ? "active" : ""} onClick={() => onSection("medidas")}>Medidas</button><button className={section === "fotos" ? "active" : ""} onClick={() => onSection("fotos")}>Fotos</button></div>
      {section === "medidas" ? (
        <>
          <div className="subtabs"><button className={measureView === "actual" ? "active" : ""} onClick={() => onMeasureView("actual")}>Actual</button><button className={measureView === "historial" ? "active" : ""} onClick={() => onMeasureView("historial")}>Historial</button><button className={measureView === "comparar" ? "active" : ""} onClick={() => onMeasureView("comparar")}>Comparar</button></div>
          {measureView === "actual" ? (
            <>
              <div className="measure-date">{formatDate(latest.date)}</div>
              <section className="measure-hero"><Metric label="Peso" value={`${latest.weight} kg`} trend={`${signed(latest.weight - previous.weight)} kg`} /><Metric label="Grasa corporal" value={`${latest.bodyFat}%`} trend={`${signed(latest.bodyFat - previous.bodyFat)}%`} /></section>
              <section className="measure-list">
                {([
                  ["Cuello", "neck"], ["Pecho", "chest"], ["Cintura", "waist"], ["Bíceps", "biceps"],
                  ["Antebrazo", "forearm"], ["Muslo", "thigh"], ["Pantorrilla", "calf"],
                ] as Array<[string, keyof Measurement]>).map(([label, key]) => (
                  <article key={label}><span>{label}</span><strong>{latest[key]} cm</strong><em>{signed(Number(latest[key]) - Number(previous[key]))}</em></article>
                ))}
              </section>
              <button className="secondary-button" onClick={onAddMeasure}><PlusIcon /> Agregar medida</button>
              <section className="measurement-guide">
                <div className="measurement-guide-copy"><small>Guía visual</small><strong>Cómo tomar cada medida</strong><p>Cinta horizontal, sin comprimir la piel. Repite horario, postura y punto anatómico.</p></div>
                <img src="/assets/alejandro/measurement-guide.png" alt="Guía frontal y lateral para medir cuello, pecho, cintura, brazo, muslo y pantorrilla" />
                <div className="measurement-points"><span>Cuello</span><span>Pecho</span><span>Cintura</span><span>Brazo</span><span>Muslo</span><span>Pantorrilla</span></div>
              </section>
            </>
          ) : measureView === "historial" ? (
            <>
              <section className="trend-card">
                <div className="card-top"><div><small>Período registrado</small><h2>Tendencias</h2></div><span>{measurements.length} registros</span></div>
                <TrendRows measurements={measurements} />
              </section>
              <section className="period-summary">
                <h2>Resumen del período</h2>
                <ChangeRow label="Peso" value={`${signed(latest.weight - measurements[0].weight)} kg`} positive={latest.weight > measurements[0].weight} />
                <ChangeRow label="Grasa corporal" value={`${signed(latest.bodyFat - measurements[0].bodyFat)}%`} positive={latest.bodyFat < measurements[0].bodyFat} />
                <ChangeRow label="Cintura" value={`${signed(latest.waist - measurements[0].waist)} cm`} positive={latest.waist < measurements[0].waist} />
                <ChangeRow label="Bíceps" value={`${signed(latest.biceps - measurements[0].biceps)} cm`} positive={latest.biceps > measurements[0].biceps} />
              </section>
            </>
          ) : (
            <>
              <section className="comparison-picker">
                <div><small>Desde</small><strong>{formatDate(compareFrom.date)}</strong></div>
                <div><small>Hasta</small><strong>{formatDate(compareTo.date)}</strong></div>
              </section>
              <div className="comparison-date-rails">
                <div>
                  {measurements.map((measurement, index) => <button key={`from-${measurement.id}`} className={compareFromIndex === index ? "active" : ""} onClick={() => setCompareFromIndex(index)}>{formatShortDate(measurement.date)}</button>)}
                </div>
                <div>
                  {measurements.map((measurement, index) => <button key={`to-${measurement.id}`} className={compareToIndex === index ? "active" : ""} onClick={() => setCompareToIndex(index)}>{formatShortDate(measurement.date)}</button>)}
                </div>
              </div>
              <ComparisonMatrix from={compareFrom} to={compareTo} />
              <section className="comparison-reading">
                <LightningBoltIcon />
                <div><small>Lectura responsable</small><strong>Observa el conjunto, no una sola cifra</strong><p>Peso, cintura, perímetros, fuerza y fotos comparables deben interpretarse juntos. La app muestra cambios; no diagnostica su causa.</p></div>
              </section>
              <button className="primary-button export-pdf-button" onClick={() => exportProgressPdf(compareFrom, compareTo, measurements, history, null, physicalAnalyses.at(-1))}><FileTextIcon /> Exportar comparativa PDF</button>
            </>
          )}
        </>
      ) : (
        <>
          <div className="photo-tabs">{photoViews.map((view) => <button key={view} className={photoView === view ? "active" : ""} onClick={() => onPhotoView(view)}>{view}</button>)}</div>
          <section className="photo-stage">
            {selectedPhotos.at(-1) ? <img src={selectedPhotos.at(-1)!.url} alt={`Foto de progreso: ${photoView}`} /> : <div className="photo-empty"><CameraIcon /><strong>Aún no hay foto de {photoView.toLowerCase()}</strong><p>Usa luz uniforme, fondo neutro, misma distancia y postura relajada.</p></div>}
            {selectedPhotos.at(-1) && (
              <span className={photoBackups[selectedPhotos.at(-1)!.id] ? "photo-backup-status backed" : "photo-backup-status pending"}>
                {photoBackups[selectedPhotos.at(-1)!.id] ? "Copia en Drive" : pendingPhotoIds.includes(selectedPhotos.at(-1)!.id) ? "Drive pendiente" : "Solo en este iPhone"}
              </span>
            )}
          </section>
          <input ref={inputRef} className="file-input" type="file" accept="image/*" capture="environment" onChange={onAddPhoto} />
          <button className="primary-button" onClick={() => inputRef.current?.click()}><CameraIcon /> Agregar foto</button>
          <section className="photo-protocol"><strong>Dos copias, un solo registro</strong><p>La app guarda una copia inmediata en este iPhone y otra en Drive. Solo se envían dos copias comprimidas a la IA cuando autorizas una comparación concreta.</p></section>
          {selectedPhotos.length >= 2 && (
            <>
              <section className="photo-date-picker">
                <div><small>Foto inicial</small><div>{selectedPhotos.map((photo, index) => <button key={`photo-from-${photo.id}`} className={photoFromIndex === index ? "active" : ""} disabled={index >= photoToIndex} onClick={() => { setPhotoFromIndex(index); setPhotoAnalysisConsent(false); }}>{formatShortDate(photo.date)}</button>)}</div></div>
                <div><small>Foto actual</small><div>{selectedPhotos.map((photo, index) => <button key={`photo-to-${photo.id}`} className={photoToIndex === index ? "active" : ""} disabled={index <= photoFromIndex} onClick={() => { setPhotoToIndex(index); setPhotoAnalysisConsent(false); }}>{formatShortDate(photo.date)}</button>)}</div></div>
              </section>
              <section className="photo-comparison">
                <div><img src={comparisonBefore!.url} alt={`${photoView} anterior`} /><span>{formatShortDate(comparisonBefore!.date)}</span></div>
                <div><img src={comparisonAfter!.url} alt={`${photoView} actual`} /><span>{formatShortDate(comparisonAfter!.date)}</span></div>
              </section>
            </>
          )}
          {comparisonBefore && comparisonAfter && (
            <section className="physique-analysis-card">
              <div className="physique-analysis-heading">
                <LightningBoltIcon />
                <div><small>Comparación visual asistida</small><strong>Análisis físico con IA</strong></div>
              </div>
              <p>Compara la misma vista entre {formatShortDate(comparisonBefore.date)} y {formatShortDate(comparisonAfter.date)}. Describe cambios visibles y calidad de la comparación; no diagnostica ni calcula grasa corporal.</p>
              {!latestPhotoAnalysis && (
                <>
                  <button className={photoAnalysisConsent ? "photo-consent active" : "photo-consent"} onClick={() => setPhotoAnalysisConsent((current) => !current)}>
                    <span><strong>Autorizar estas dos fotos</strong><small>Permiso válido solo para esta comparación</small></span><i />
                  </button>
                  <button className="primary-button" disabled={!photoAnalysisConsent || photoAnalysisStatus === "loading"} onClick={() => void requestPhysicalAnalysis()}>
                    <LightningBoltIcon /> {photoAnalysisStatus === "loading" ? "Analizando fotografías…" : "Analizar cambios visibles"}
                  </button>
                  {photoAnalysisStatus === "error" && <span className="analysis-error">No pude completar el análisis. Verifica la conexión privada e inténtalo de nuevo.</span>}
                </>
              )}
              {latestPhotoAnalysis && (
                <div className="physique-analysis-result">
                  <div className="physique-result-meta"><span>Confianza {latestPhotoAnalysis.overallConfidence}</span><span>Comparabilidad {latestPhotoAnalysis.comparability.rating}</span></div>
                  <h3>{latestPhotoAnalysis.title}</h3>
                  <p>{latestPhotoAnalysis.summary}</p>
                  <div className="physique-observations">
                    {latestPhotoAnalysis.observations.map((observation) => (
                      <article key={`${observation.area}-${observation.change}`}>
                        <span>{observation.area}</span><strong>{observation.change}</strong><small>{observation.basis} · confianza {observation.confidence}</small>
                      </article>
                    ))}
                  </div>
                  <aside><strong>Límites</strong><p>{latestPhotoAnalysis.limitations}</p></aside>
                  <button className="secondary-button export-pdf-button" onClick={() => void exportPhysicalAnalysisPdf(latestPhotoAnalysis, comparisonBefore, comparisonAfter)}>
                    <FileTextIcon /> Exportar informe físico PDF
                  </button>
                </div>
              )}
            </section>
          )}
          {photos.length >= 2 && <section className="photo-timeline"><h2>Línea de tiempo</h2>{photos.slice(-4).map((photo) => <img key={photo.id} src={photo.url} alt={photo.view} />)}</section>}
        </>
      )}
    </>
  );
}

function TrendRows({ measurements }: { measurements: Measurement[] }) {
  const series = [
    { label: "Peso", key: "weight" as const, color: "violet" },
    { label: "Cintura", key: "waist" as const, color: "gold" },
    { label: "Bíceps", key: "biceps" as const, color: "green" },
  ];
  return <div className="trend-rows">{series.map((item) => {
    const values = measurements.map((measurement) => Number(measurement[item.key]));
    const min = Math.min(...values); const max = Math.max(...values);
    return <div className={`trend-line ${item.color}`} key={item.label}><span>{item.label}</span><div>{values.map((value, index) => <i key={index} style={{ height: `${24 + ((value - min) / Math.max(0.01, max - min)) * 42}px` }} />)}</div><strong>{values.at(-1)}</strong></div>;
  })}</div>;
}

function ChangeRow({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return <article className="change-row"><span>{label}</span><strong className={positive ? "positive" : "negative"}>{value}</strong><ChevronRightIcon /></article>;
}

function ComparisonMatrix({ from, to }: { from: Measurement; to: Measurement }) {
  const rows: Array<[string, keyof Measurement, string]> = [
    ["Peso", "weight", "kg"], ["Grasa", "bodyFat", "%"], ["Pecho", "chest", "cm"],
    ["Cintura", "waist", "cm"], ["Bíceps", "biceps", "cm"], ["Muslo", "thigh", "cm"],
  ];
  return (
    <section className="comparison-matrix">
      <div className="comparison-matrix-head"><span>Indicador</span><span>Inicio</span><span>Actual</span><span>Cambio</span></div>
      {rows.map(([label, key, unit]) => {
        const delta = Number(to[key]) - Number(from[key]);
        return <article key={key}><strong>{label}</strong><span>{from[key]} {unit}</span><span>{to[key]} {unit}</span><em className={Math.abs(delta) < 0.01 ? "neutral" : delta > 0 ? "up" : "down"}>{signed(delta)} {unit}</em></article>;
      })}
    </section>
  );
}

function EvidenceMatrix({ evidence, compact = false }: { evidence?: EvidenceItem[]; compact?: boolean }) {
  const fallbackIds = ["training-acsm-2026", "nutrition-protein", "supplements-creatine", "pharma-aas-risks", "pharma-peptides"];
  const fallback = knowledgeBase.entries
    .filter((entry) => fallbackIds.includes(entry.id))
    .map((entry) => ({
      title: entry.title,
      domain: entry.domain,
      strength: entry.strength as EvidenceItem["strength"],
      sourceUrl: entry.source.url,
    }));
  const rows = (evidence?.length ? evidence : fallback).slice(0, compact ? 3 : 5);
  return (
    <section className={compact ? "evidence-matrix compact" : "evidence-matrix"}>
      <div className="evidence-title"><FileTextIcon /><div><small>Base de conocimiento</small><strong>Matriz de evidencia</strong></div></div>
      {rows.map((item, index) => (
        <a key={`${item.sourceUrl}-${index}`} href={item.sourceUrl} target="_blank" rel="noreferrer">
          <span>{item.domain}</span><strong>{item.title}</strong><em className={`strength-${item.strength}`}>{item.strength}</em><ChevronRightIcon />
        </a>
      ))}
    </section>
  );
}

function AnalysisScreen({ weeklyPlan, measurements, history, profile, goalPlan, supersetPairs, physicalAnalysis, aiConsent, onPrivacy }: {
  weeklyPlan: WeeklyPlan; measurements: Measurement[]; history: SavedWorkout[];
  profile: UserProfile; goalPlan?: GoalPlan; supersetPairs: Record<string, string>;
  physicalAnalysis?: PhysicalAnalysis;
  aiConsent: boolean; onPrivacy: () => void;
}) {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("alejandro:lastAIAnalysis:v2") || "null");
    } catch {
      return null;
    }
  });
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "loading" | "error">("idle");
  const [analysisTab, setAnalysisTab] = useState<"resumen" | "tendencias" | "recomendaciones">("resumen");
  const [coachQuestion, setCoachQuestion] = useState("");
  const [coachAnswer, setCoachAnswer] = useState<CoachAnswer | null>(null);
  const [coachStatus, setCoachStatus] = useState<"idle" | "loading" | "error">("idle");
  const currentWeekHistory = history.filter((item) => item.date.slice(0, 10) >= getWeekKey());
  const completedSets = currentWeekHistory.flatMap((workout) => workout.sets);
  const avgRpe = average(completedSets.map((set) => Number(set.rpe)));
  const hardSets = completedSets.filter((set) => Number(set.rpe) >= 7).length;
  const highRpe = completedSets.filter((set) => Number(set.rpe) >= 9).length;
  const latest = measurements.at(-1); const first = measurements[0];
  const confidence = completedSets.length >= 8 && measurements.length >= 2 ? "Media" : "Baja";
  const adherence = Math.min(100, Math.round((currentWeekHistory.length / weekDays.length) * 100));

  const generateAnalysis = async () => {
    if (!aiConsent) {
      onPrivacy();
      return;
    }
    setAnalysisStatus("loading");
    const aiUrl = import.meta.env.VITE_AI_API_URL || (import.meta.env.DEV ? "http://127.0.0.1:4174" : import.meta.env.VITE_APP_API_URL);
    if (!aiUrl) {
      setAnalysisStatus("error");
      return;
    }
    try {
      const data = await postToApi(aiUrl, "generateWeeklyAnalysis", {
        focus: "hipertrofia",
        weekKey: getWeekKey(),
        weeklyPlan: Object.fromEntries(weekDays.map((day) => [
          day,
          weeklyPlan[day].map((id) => exerciseCatalog.find((exercise) => exercise.id === id)?.name).filter(Boolean),
        ])),
        completedSets: completedSets.map((set) => ({
          muscle: set.muscle,
          exercise: set.exercise,
          weightKg: set.weightKg,
          reps: set.reps,
          rpe: set.rpe,
          durationMinutes: set.durationMinutes,
          speedKph: set.speedKph,
        })),
        exerciseContext: Array.from(new Set(completedSets.map((set) => set.exercise))).map((exerciseName) => {
          const definition = exerciseCatalog.find((exercise) => exercise.name === exerciseName);
          return {
            exercise: exerciseName,
            primaryMuscle: definition?.muscle || "Sin clasificar",
            equipment: definition?.equipment || "Sin clasificar",
            coachingCue: definition?.cue || "",
          };
        }),
        measurements,
        workoutHistory: history,
        profile,
        activeGoal: goalPlan || null,
        trainingPreferences: {
          defaultRestSeconds: profile.defaultRestSeconds,
          usesSupersets: Object.keys(supersetPairs).length > 0,
          supersetPairCount: Math.floor(Object.keys(supersetPairs).length / 2),
        },
        physicalAnalysis: physicalAnalysis ? {
          period: `${physicalAnalysis.beforeDate} a ${physicalAnalysis.afterDate}`,
          view: physicalAnalysis.view,
          summary: physicalAnalysis.summary,
          comparability: physicalAnalysis.comparability,
          observations: physicalAnalysis.observations,
          limitations: physicalAnalysis.limitations,
        } : null,
      }) as AIAnalysis;
      setAiAnalysis(data);
      localStorage.setItem("alejandro:lastAIAnalysis:v2", JSON.stringify(data));
      setAnalysisStatus("idle");
    } catch {
      setAnalysisStatus("error");
    }
  };

  const askCoach = async () => {
    if (!coachQuestion.trim()) return;
    if (!aiConsent) {
      onPrivacy();
      return;
    }
    setCoachStatus("loading");
    const aiUrl = import.meta.env.VITE_AI_API_URL || (import.meta.env.DEV ? "http://127.0.0.1:4174" : import.meta.env.VITE_APP_API_URL);
    if (!aiUrl) {
      setCoachStatus("error");
      return;
    }
    try {
      const data = await postToApi(aiUrl, "askCoach", {
        question: coachQuestion,
        personalContext: {
          objective: profile.objective,
          experience: profile.experience,
          priorityMuscles: profile.priorityMuscles,
          defaultRestSeconds: profile.defaultRestSeconds,
          usesSupersets: Object.keys(supersetPairs).length > 0,
          latestMeasurement: measurements.at(-1),
          completedSets: completedSets.length,
          averageRpe: avgRpe,
          workoutHistory: history.slice(0, 8),
        },
      }) as CoachAnswer;
      setCoachAnswer(data);
      setCoachStatus("idle");
    } catch {
      setCoachStatus("error");
    }
  };
  const hasData = completedSets.length > 0 || measurements.length > 0;

  return (
    <>
      <ScreenHeader eyebrow="Inteligencia de entrenamiento" title="Alejandro IA" action={<span className={hasData ? "evidence-pill ready" : "evidence-pill"}>{hasData ? "Datos listos" : "En espera"}</span>} />
      <section className="ai-neural-hero">
        <div className="ai-neural-visual"><img src="/assets/alejandro/ai-neural-core.png" alt="Cerebro digital de Alejandro IA" /></div>
        <div className="ai-neural-copy">
          <small>LECTURA SEMANAL · HIPERTROFIA</small>
          <h2>{aiAnalysis?.title || (hasData ? "Listo para encontrar patrones" : "Primero conoce tus datos")}</h2>
          <p>{hasData ? "Cruza rendimiento, esfuerzo, medidas y constancia para explicarte qué está cambiando." : "Registra tu primer entrenamiento o una medición. Hasta entonces no inventará conclusiones."}</p>
          <div className="ai-signal-row"><span>{completedSets.length} series</span><span>{measurements.length} mediciones</span><span>{currentWeekHistory.length} sesiones</span></div>
        </div>
      </section>
      <section className="analysis-summary">
        <div className="analysis-summary-heading"><span>Lectura actual</span><strong>Confianza {aiAnalysis?.confidence || confidence}</strong></div>
        <p>{aiAnalysis?.summary || (hasData
          ? <>Esta semana hay <strong>{completedSets.length} series terminadas</strong>{completedSets.length ? <> con esfuerzo medio <strong>{avgRpe.toFixed(1)} de 10</strong></> : ""}. {latest && first ? <>El peso cambió <strong>{signed(latest.weight - first.weight)} kg</strong> y la cintura <strong>{signed(latest.waist - first.waist)} cm</strong> en el período guardado.</> : "Añade medidas para cruzar rendimiento y cambios físicos."}</>
          : "Aún no existe una base suficiente. Cuando registres datos reales, aquí aparecerá una lectura explicada y verificable.")}</p>
      </section>
      {!aiConsent && <button className="privacy-notice" onClick={onPrivacy}><PersonIcon /><span><strong>Análisis IA desactivado</strong><small>Revisa qué datos se comparten y activa tu permiso.</small></span><ChevronRightIcon /></button>}
      <button className="primary-button analysis-button" onClick={generateAnalysis} disabled={analysisStatus === "loading" || (!completedSets.length && !measurements.length)}>
        <LightningBoltIcon /> {analysisStatus === "loading" ? "Leyendo tus métricas…" : !hasData ? "Registra datos para comenzar" : aiAnalysis ? "Actualizar lectura semanal" : "Analizar mi semana"}
      </button>
      {!hasData && <p className="analysis-error neutral">La IA necesita al menos un entrenamiento finalizado o una medición. No mostrará recomendaciones ficticias.</p>}
      {first && latest && <button className="secondary-button export-pdf-button" onClick={() => exportProgressPdf(first, latest, measurements, history, aiAnalysis, physicalAnalysis)}><FileTextIcon /> Exportar análisis PDF</button>}
      {analysisStatus === "error" && <p className="analysis-error">No pude conectar con el analizador. Tus datos siguen guardados y puedes intentarlo de nuevo.</p>}
      <div className="analysis-tabs" role="tablist" aria-label="Secciones del análisis">
        <button role="tab" aria-selected={analysisTab === "resumen"} className={analysisTab === "resumen" ? "active" : ""} onClick={() => setAnalysisTab("resumen")}>Resumen</button>
        <button role="tab" aria-selected={analysisTab === "tendencias"} className={analysisTab === "tendencias" ? "active" : ""} onClick={() => setAnalysisTab("tendencias")}>Tendencias</button>
        <button role="tab" aria-selected={analysisTab === "recomendaciones"} className={analysisTab === "recomendaciones" ? "active" : ""} onClick={() => setAnalysisTab("recomendaciones")}>Acciones</button>
      </div>
      {analysisTab === "resumen" && <section className="kpi-grid">
        <KpiCard label="Series exigentes" value={String(hardSets)} note="Esfuerzo 7 a 10" />
        <KpiCard label="Cerca del límite" value={`${highRpe}/${completedSets.length}`} note="Esfuerzo 9 o 10" />
        <KpiCard label="Sesiones hechas" value={`${currentWeekHistory.length}/${weekDays.length}`} note={`${adherence}% de la semana`} />
        <KpiCard label="Mediciones guardadas" value={String(measurements.length)} note="Para ver cambios físicos" />
      </section>}
      {analysisTab === "resumen" && physicalAnalysis && (
        <section className="analysis-visual-summary">
          <div><CameraIcon /><span><small>Lectura visual más reciente</small><strong>{physicalAnalysis.title}</strong></span></div>
          <p>{physicalAnalysis.reportNote}</p>
          <span>Vista {physicalAnalysis.view} · comparabilidad {physicalAnalysis.comparability.rating} · confianza {physicalAnalysis.overallConfidence}</span>
        </section>
      )}
      {analysisTab === "tendencias" && <section className="analysis-detail-panel">
        <small>QUÉ ESTÁ CAMBIANDO</small>
        <h2>{hasData ? "Patrones de esta semana" : "Sin tendencia todavía"}</h2>
        <p>{hasData
          ? `Hay ${completedSets.length} series, ${currentWeekHistory.length} sesiones y ${measurements.length} mediciones disponibles. La lectura mejora cuando repites el registro varias semanas bajo condiciones parecidas.`
          : "Una tendencia no se obtiene de un solo dato. Registra entrenamientos y medidas de forma constante para comparar semanas, no momentos aislados."}</p>
        <div><span>Esfuerzo medio</span><strong>{completedSets.length ? `${avgRpe.toFixed(1)} de 10` : "Sin datos"}</strong></div>
        <div><span>Constancia semanal</span><strong>{currentWeekHistory.length ? `${adherence}%` : "Sin datos"}</strong></div>
      </section>}
      {analysisTab === "recomendaciones" && hasData && <section className="recommendation-list">
        <h2>Acciones explicadas</h2>
        {(aiAnalysis?.recommendations || [
          { title: "Completa primero el volumen planeado", action: `Tienes ${hardSets} series exigentes registradas. Mantén la técnica y agrega carga solo al completar el rango sin superar RPE 9.`, reason: "La progresión necesita una base repetible antes de subir la carga.", dataUsed: "series, repeticiones y RPE", confidence: confidence.toLowerCase() as "baja" | "media" },
          { title: "Evalúa tendencias, no un solo pesaje", action: "Compara el promedio semanal del peso con cintura, fuerza y fotos bajo el mismo protocolo.", reason: "Una sola medición puede variar por hidratación y condiciones de toma.", dataUsed: `${measurements.length} mediciones`, confidence: "media" as const },
          { title: "Distribuye el estímulo semanal", action: "Revisa que los grupos prioritarios tengan volumen suficiente entre lunes y viernes.", reason: "La frecuencia facilita repartir series de calidad sin concentrar toda la fatiga.", dataUsed: "plan semanal y adherencia", confidence: "media" as const },
        ]).map((item, index) => (
          <article key={`${item.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.title}</strong><p>{item.action}</p><small>{item.reason} · Datos usados: {item.dataUsed} · Confianza {item.confidence}</small></div></article>
        ))}
      </section>}
      {analysisTab === "recomendaciones" && !hasData && <section className="analysis-detail-panel empty"><small>PRÓXIMOS PASOS</small><h2>Primero crea tu línea base</h2><p>Finaliza un entrenamiento o registra peso y medidas. Con eso la IA podrá proponerte una acción concreta sin adivinar.</p></section>}
      {analysisTab === "recomendaciones" && aiAnalysis && <section className="next-week-focus"><small>Foco de la próxima semana</small><strong>{aiAnalysis.nextWeekFocus}</strong></section>}
      {analysisTab === "recomendaciones" && <EvidenceMatrix evidence={aiAnalysis?.evidence} />}
      <section className="coach-card">
        <div className="coach-card-heading"><img src="/assets/alejandro/ai-neural-core.png" alt="" /><div><small>CONSULTA DIRECTA</small><strong>Pregunta sobre entrenamiento, comida, suplementos o farmacología</strong></div></div>
        <label className="coach-input"><KeyboardInput value={coachQuestion} onChange={(event) => setCoachQuestion(event.target.value)} placeholder="Ej.: ¿qué evidencia tiene este suplemento?" /></label>
        <div className="coach-quick-questions">
          {["Cómo progresar cargas", "Creatina y evidencia", "Riesgos de péptidos"].map((question) => <button key={question} onClick={() => setCoachQuestion(question)}>{question}</button>)}
        </div>
        <button className="primary-button" disabled={!coachQuestion.trim() || coachStatus === "loading"} onClick={askCoach}>{coachStatus === "loading" ? "Consultando fuentes…" : "Preguntar al coach"}</button>
        {coachStatus === "error" && <p className="analysis-error">No pude consultar la base ahora. Inténtalo nuevamente.</p>}
      </section>
      {coachAnswer && (
        <section className={`coach-answer ${coachAnswer.safetyLevel === "derivación médica" ? "medical" : ""}`}>
          <div><span>{coachAnswer.safetyLevel}</span><strong>{coachAnswer.title}</strong></div>
          <p>{coachAnswer.answer}</p>
          <aside><small>Siguiente paso seguro</small><strong>{coachAnswer.nextStep}</strong></aside>
          <EvidenceMatrix evidence={coachAnswer.evidence} compact />
        </section>
      )}
      <section className="sources-card"><FileTextIcon /><div><strong>Límite de seguridad</strong><p>La IA explica evidencia y riesgos. No diseña ciclos, dosis, PCT, stacks ni instrucciones de inyección; el contenido farmacológico no sustituye atención médica.</p></div></section>
    </>
  );
}

function KpiCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <article><small>{label}</small><strong>{value}</strong><span>{note}</span></article>;
}

function ProfileScreen({ profile, latestGoal, onEdit, onGoals, onOpenAnalysis, onBackup, onPrivacy, latestMeasurement, pendingSync }: {
  profile: UserProfile; latestGoal?: GoalPlan; onEdit: () => void; onGoals: () => void;
  onOpenAnalysis: () => void; onBackup: () => void; onPrivacy: () => void;
  latestMeasurement?: Measurement; pendingSync: number;
}) {
  return (
    <>
      <ScreenHeader eyebrow="Tu sistema personal" title="Perfil" action={<button className="profile-edit-button" onClick={onEdit}>Editar</button>} />
      <section className="profile-hero"><img src="/assets/alejandro/app-icon.png" alt="Icono de Sistema Alejandro" /><div><h2>{profile.name}</h2><span>{profile.experience || "Atleta"} · Disciplina · Constancia</span></div></section>
      <section className="profile-stats"><Metric label="Peso" value={latestMeasurement ? `${latestMeasurement.weight} kg` : "—"} trend={latestMeasurement ? "medición real" : "sin medición"} /><Metric label="Altura" value={profile.heightCm ? `${(Number(profile.heightCm) / 100).toFixed(2)} m` : "—"} trend={profile.heightCm ? "perfil" : "por completar"} /><Metric label="Objetivo" value={profile.targetWeightKg ? `${profile.targetWeightKg} kg` : "—"} trend={profile.objective} /></section>
      <button className="profile-goal-entry" onClick={onGoals}>
        <LightningBoltIcon />
        <span><small>{latestGoal ? "Reto de esta semana" : "Objetivos adaptativos"}</small><strong>{latestGoal?.challenge || "Define tu siguiente pequeño cambio"}</strong><em>{latestGoal?.successMetric || "La IA lo ajustará con tus datos reales"}</em></span>
        <ChevronRightIcon />
      </button>
      <section className="system-list">
        <button onClick={onGoals}><Crosshair2Icon /><span>Objetivos, prioridades y retos</span><ChevronRightIcon /></button>
        <button onClick={onOpenAnalysis}><LightningBoltIcon /><span>Análisis semanal y fuentes</span><ChevronRightIcon /></button>
        <button onClick={onBackup}><ReaderIcon /><span>Respaldo y sincronización{pendingSync ? ` · ${pendingSync} pendiente${pendingSync === 1 ? "" : "s"}` : ""}</span><ChevronRightIcon /></button>
        <button onClick={onPrivacy}><PersonIcon /><span>Privacidad y permisos</span><ChevronRightIcon /></button>
      </section>
      <section className="stoic-footer"><blockquote>“La dificultad muestra lo que son los hombres.”</blockquote><span>Epicteto</span></section>
    </>
  );
}

function GoalPlanCard({ plan }: { plan: GoalPlan }) {
  return (
    <section className="goal-plan-card">
      <div><span>Plan activo</span><em>Confianza {plan.confidence}</em></div>
      <h3>{plan.title}</h3>
      <p>{plan.objectiveStatement}</p>
      <article><small>Meta semanal</small><strong>{plan.weeklyGoal}</strong></article>
      <article><small>Reto</small><strong>{plan.challenge}</strong></article>
      <article><small>Cómo sabremos que avanzaste</small><strong>{plan.successMetric}</strong></article>
      <footer><small>Por qué encaja</small><p>{plan.whyItFits}</p><span>Revisión: {formatDate(plan.reviewDate)}</span></footer>
    </section>
  );
}

async function postToApi(apiUrl: string, action: string, payload: Record<string, unknown>, tokenOverride?: string) {
  const token = tokenOverride || localStorage.getItem(SYNC_TOKEN_STORAGE_KEY) || "";
  if (!token) throw new Error("missing_sync_token");
  const response = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, payload, token }) });
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || "api_error");
  return result.data;
}

async function exportProgressPdf(from: Measurement, to: Measurement, measurements: Measurement[], history: SavedWorkout[], analysis?: AIAnalysis | null, physicalAnalysis?: PhysicalAnalysis) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const ensureSpace = (height: number) => {
    if (y + height <= 280) return;
    doc.addPage();
    y = 18;
  };
  const writeWrapped = (text: string, size = 9, color: [number, number, number] = [62, 64, 74], maxWidth = contentWidth) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, margin, y);
    y += lines.length * (size * 0.42) + 2;
  };
  const sectionTitle = (eyebrow: string, title: string) => {
    ensureSpace(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(111, 92, 220);
    doc.text(eyebrow.toUpperCase(), margin, y);
    y += 5;
    doc.setFontSize(16);
    doc.setTextColor(18, 19, 24);
    doc.text(title, margin, y);
    y += 9;
  };

  doc.setFillColor(12, 13, 17);
  doc.rect(0, 0, pageWidth, 54, "F");
  doc.setDrawColor(141, 124, 255);
  doc.setLineWidth(1.1);
  doc.line(margin, 45, pageWidth - margin, 45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("SISTEMA ALEJANDRO", margin, 22);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(191, 187, 214);
  doc.text("Informe de evolucion - hipertrofia y progreso medible", margin, 31);
  doc.text(`${formatDate(from.date)} a ${formatDate(to.date)}`, margin, 38);
  y = 67;

  sectionTitle("Resumen", "Comparativa corporal");
  const metricRows: Array<[string, keyof Measurement, string]> = [
    ["Peso", "weight", "kg"], ["Grasa corporal", "bodyFat", "%"], ["Cuello", "neck", "cm"],
    ["Pecho", "chest", "cm"], ["Cintura", "waist", "cm"], ["Biceps", "biceps", "cm"],
    ["Antebrazo", "forearm", "cm"], ["Muslo", "thigh", "cm"], ["Pantorrilla", "calf", "cm"],
  ];
  const columnX = [margin, 72, 111, 151];
  doc.setFillColor(240, 239, 248);
  doc.roundedRect(margin, y - 5, contentWidth, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(68, 68, 80);
  ["Indicador", "Inicio", "Actual", "Cambio"].forEach((label, index) => doc.text(label, columnX[index], y + 1));
  y += 9;
  metricRows.forEach(([label, key, unit], index) => {
    ensureSpace(8);
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, y - 4.5, contentWidth, 7.5, "F");
    }
    const delta = Number(to[key]) - Number(from[key]);
    doc.setFont("helvetica", index === 0 ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(40, 41, 48);
    doc.text(label, columnX[0], y);
    doc.text(`${from[key]} ${unit}`, columnX[1], y);
    doc.text(`${to[key]} ${unit}`, columnX[2], y);
    doc.setTextColor(delta > 0 ? 31 : delta < 0 ? 138 : 92, delta > 0 ? 139 : delta < 0 ? 78 : 92, delta > 0 ? 84 : delta < 0 ? 162 : 92);
    doc.text(`${signed(delta)} ${unit}`, columnX[3], y);
    y += 7.5;
  });

  y += 7;
  sectionTitle("Interpretacion", "Lectura conjunta");
  writeWrapped("Las variaciones deben interpretarse junto con fuerza, volumen, adherencia y fotos tomadas bajo el mismo protocolo. Una sola medida no explica por si misma la causa de un cambio.");
  writeWrapped(`Registros disponibles: ${measurements.length} mediciones y ${history.length} sesiones guardadas.`, 9, [92, 79, 170]);

  if (history.length) {
    sectionTitle("Entrenamiento", "Sesiones recientes");
    history.slice(0, 8).forEach((item) => {
      ensureSpace(9);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(28, 29, 35);
      doc.text(`${formatShortDate(item.date)} - ${item.routine}`, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(92, 93, 105);
      doc.text(`${item.setCount} series | RPE ${item.rpe.toFixed(1)}`, 135, y);
      y += 7;
    });
  }

  if (analysis) {
    sectionTitle("Analisis IA", analysis.title);
    writeWrapped(analysis.summary);
    analysis.recommendations.forEach((item, index) => {
      ensureSpace(24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(32, 33, 39);
      doc.text(`${index + 1}. ${item.title}`, margin, y);
      y += 5;
      writeWrapped(item.action, 8.5);
      writeWrapped(`Datos: ${item.dataUsed} | Confianza: ${item.confidence}`, 7.5, [103, 88, 181]);
    });
    ensureSpace(18);
    doc.setFillColor(240, 237, 255);
    doc.roundedRect(margin, y - 3, contentWidth, 15, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(91, 74, 181);
    doc.text("FOCO SIGUIENTE", margin + 4, y + 2);
    const focusLines = doc.splitTextToSize(analysis.nextWeekFocus, contentWidth - 48);
    doc.setTextColor(44, 43, 52);
    doc.text(focusLines.slice(0, 2), margin + 42, y + 2);
    y += 20;
  }

  if (physicalAnalysis) {
    sectionTitle("Análisis físico", physicalAnalysis.title);
    writeWrapped(physicalAnalysis.summary);
    physicalAnalysis.observations.forEach((observation) => {
      ensureSpace(18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(34, 35, 42);
      doc.text(observation.area, margin, y);
      y += 5;
      writeWrapped(observation.change, 8.5);
      writeWrapped(`Base visual: ${observation.basis} | Confianza: ${observation.confidence}`, 7.5, [103, 88, 181]);
    });
    ensureSpace(22);
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(margin, y - 3, contentWidth, 18, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(91, 74, 181);
    doc.text(`COMPARABILIDAD ${physicalAnalysis.comparability.rating.toUpperCase()}`, margin + 4, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 56, 65);
    doc.text(doc.splitTextToSize(physicalAnalysis.comparability.notes, contentWidth - 8).slice(0, 2), margin + 4, y + 7);
    y += 23;
    writeWrapped(`Límites: ${physicalAnalysis.limitations}`, 8, [112, 72, 48]);
  }

  sectionTitle("Evidencia", "Matriz de conocimiento utilizada");
  const pdfKnowledgeIds = ["training-acsm-2026", "training-failure", "nutrition-protein", "supplements-creatine", "pharma-aas-risks", "pharma-peptides"];
  knowledgeBase.entries.filter((entry) => pdfKnowledgeIds.includes(entry.id)).forEach((entry) => {
    ensureSpace(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(38, 39, 46);
    doc.text(entry.title, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 91, 191);
    doc.text(`${entry.domain} | evidencia ${entry.strength}`, margin, y + 4.5);
    const sourceLines = doc.splitTextToSize(`${entry.source.organization}, ${entry.source.year}: ${entry.source.url}`, contentWidth);
    doc.setTextColor(82, 83, 94);
    doc.text(sourceLines, margin, y + 9);
    y += 13 + sourceLines.length * 3;
  });

  ensureSpace(25);
  doc.setFillColor(255, 246, 238);
  doc.roundedRect(margin, y - 3, contentWidth, 20, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(132, 73, 34);
  doc.text("Limite de seguridad", margin + 4, y + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(doc.splitTextToSize("Este informe es educativo y no diagnostica. No incluye ciclos, dosis, PCT, stacks ni instrucciones de inyeccion. La farmacologia requiere evaluacion medica.", contentWidth - 8), margin + 4, y + 7);

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(130, 131, 140);
    doc.text(`Sistema Alejandro | ${new Date().toLocaleDateString("es-CO")} | Pagina ${page} de ${totalPages}`, margin, 291);
  }
  const pdfName = `Sistema-Alejandro-${from.date}-a-${to.date}`;
  doc.save(`${pdfName}.pdf`);
  const apiUrl = import.meta.env.VITE_APP_API_URL;
  if (apiUrl) {
    try {
      const pdfBlob = doc.output("blob");
      await postToApi(apiUrl, "savePdfReport", {
        date: localDateKey(),
        name: pdfName,
        dataUrl: await blobToDataUrlForUpload(pdfBlob),
      });
    } catch {
      // The local PDF remains available even when the Drive copy is temporarily unavailable.
    }
  }
}

async function exportPhysicalAnalysisPdf(analysis: PhysicalAnalysis, before: ProgressPhoto, after: ProgressPhoto) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  const [beforeData, afterData] = await Promise.all([urlToDataUrl(before.url), urlToDataUrl(after.url)]);

  doc.setFillColor(12, 13, 17);
  doc.rect(0, 0, pageWidth, 48, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("ANALISIS FISICO", margin, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(191, 187, 214);
  doc.text(`Sistema Alejandro | ${analysis.view} | ${formatDate(before.date)} a ${formatDate(after.date)}`, margin, 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(65, 57, 120);
  doc.text("ANTES", margin, 58);
  doc.text("DESPUES", 111, 58);
  doc.addImage(beforeData, "JPEG", margin, 63, 82, 108, undefined, "FAST");
  doc.addImage(afterData, "JPEG", 111, 63, 82, 108, undefined, "FAST");

  let y = 182;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(26, 27, 33);
  doc.text(analysis.title, margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(67, 68, 78);
  const summaryLines = doc.splitTextToSize(analysis.summary, contentWidth);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 4.2 + 6;

  doc.setFillColor(242, 240, 255);
  doc.roundedRect(margin, y - 3, contentWidth, 15, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(91, 74, 181);
  doc.text(`CONFIANZA ${analysis.overallConfidence.toUpperCase()}  |  COMPARABILIDAD ${analysis.comparability.rating.toUpperCase()}`, margin + 4, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(63, 63, 72);
  doc.text(doc.splitTextToSize(analysis.comparability.notes, contentWidth - 8).slice(0, 2), margin + 4, y + 8);

  doc.addPage();
  y = 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(26, 27, 33);
  doc.text("Matriz de observaciones visuales", margin, y);
  y += 10;
  analysis.observations.forEach((observation, index) => {
    const boxHeight = 29;
    if (y + boxHeight > 274) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(index % 2 ? 249 : 245, index % 2 ? 249 : 243, 252);
    doc.roundedRect(margin, y - 4, contentWidth, boxHeight, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(37, 38, 45);
    doc.text(observation.area, margin + 4, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(66, 67, 76);
    doc.text(doc.splitTextToSize(observation.change, contentWidth - 8).slice(0, 2), margin + 4, y + 8);
    doc.setTextColor(101, 85, 182);
    doc.text(doc.splitTextToSize(`${observation.basis} | confianza ${observation.confidence}`, contentWidth - 8).slice(0, 2), margin + 4, y + 18);
    y += boxHeight + 4;
  });
  y += 3;
  doc.setFillColor(255, 246, 238);
  doc.roundedRect(margin, y - 3, contentWidth, 28, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(132, 73, 34);
  doc.text("Limites de la lectura visual", margin + 4, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(doc.splitTextToSize(analysis.limitations, contentWidth - 8).slice(0, 4), margin + 4, y + 9);

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(130, 131, 140);
    doc.text(`Sistema Alejandro | Informe visual educativo | Pagina ${page} de ${totalPages}`, margin, 291);
  }
  const pdfName = `Sistema-Alejandro-fisico-${before.date}-a-${after.date}`;
  doc.save(`${pdfName}.pdf`);
  const apiUrl = import.meta.env.VITE_APP_API_URL;
  if (apiUrl) {
    try {
      await postToApi(apiUrl, "savePdfReport", {
        date: localDateKey(),
        name: pdfName,
        dataUrl: await blobToDataUrlForUpload(doc.output("blob")),
      });
    } catch {
      // The local PDF remains available if the Drive copy fails.
    }
  }
}

async function urlToDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("photo_read_failed");
  return blobToDataUrlForUpload(await response.blob());
}

function blobToDataUrlForUpload(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function optimizeProgressPhoto(source: File) {
  const bitmap = await createImageBitmap(source);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    bitmap.close();
    throw new Error("canvas_unavailable");
  }
  context.fillStyle = "#0b0c0f";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("photo_encode_failed")), "image/jpeg", 0.82);
  });
  const baseName = source.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "progreso";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

function estimatedOneRepMax(weight: number, reps: number) {
  if (!weight || !reps || reps > 12) return 0;
  return weight * (1 + reps / 30);
}

function average(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
}

function signed(value: number) {
  if (Math.abs(value) < 0.01) return "0";
  return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}`;
}

function getWeekKey() {
  const now = new Date();
  const start = new Date(now);
  const day = now.getDay() || 7;
  start.setDate(now.getDate() - day + 1);
  return localDateKey(start);
}

function previousWeekKey() {
  const previous = new Date(`${getWeekKey()}T12:00:00`);
  previous.setDate(previous.getDate() - 7);
  return localDateKey(previous);
}

function hasPlannedExercises(plan?: WeeklyPlan) {
  return Boolean(plan && weekDays.some((day) => plan[day]?.length));
}

function formatToday() {
  const value = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function formatShortDate(value: string) {
  const dateValue = value.includes("T") ? new Date(value) : new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(dateValue);
}

function formatDate(value: string) {
  const dateValue = value.includes("T") ? new Date(value) : new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(dateValue);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
