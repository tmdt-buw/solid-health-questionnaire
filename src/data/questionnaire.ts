import type {
  AppLanguage,
  CategoryId,
  LocalizedText,
  Question,
  QuestionOption,
} from "../types";

export const QUESTIONNAIRE_VERSION = "2026-08-28";

export const CATEGORY_ORDER: readonly CategoryId[] = [
  "movement",
  "nutrition",
  "mental",
  "sleep",
  "social",
] as const;

export const CATEGORY_META: Record<
  CategoryId,
  {
    label: LocalizedText;
    shortLabel: LocalizedText;
    icon: "movement" | "nutrition" | "mental" | "sleep" | "social";
    accent: string;
  }
> = {
  movement: {
    label: { de: "Bewegung", en: "Movement" },
    shortLabel: { de: "Bewegung", en: "Movement" },
    icon: "movement",
    accent: "#f26e5f",
  },
  nutrition: {
    label: { de: "Ernährung", en: "Nutrition" },
    shortLabel: { de: "Ernährung", en: "Nutrition" },
    icon: "nutrition",
    accent: "#54b96d",
  },
  mental: {
    label: { de: "Mentale Gesundheit", en: "Mental health" },
    shortLabel: { de: "Wohlbefinden", en: "Wellbeing" },
    icon: "mental",
    accent: "#e9c928",
  },
  sleep: {
    label: { de: "Schlaf", en: "Sleep" },
    shortLabel: { de: "Schlaf", en: "Sleep" },
    icon: "sleep",
    accent: "#8fa4e8",
  },
  social: {
    label: { de: "Soziales Umfeld", en: "Social environment" },
    shortLabel: { de: "Soziales Umfeld", en: "Social circle" },
    icon: "social",
    accent: "#b868d3",
  },
};

const option = (
  id: string,
  de: string,
  en: string,
  score: number
): QuestionOption => ({ id, label: { de, en }, score });

const yesNo = [
  option("yes", "Ja", "Yes", 3),
  option("no", "Nein", "No", 0),
] as const;

const weeklyLowIsGood = [
  option("never", "Nie", "Never", 3),
  option("1-2-week", "1–2 mal pro Woche", "1–2 times per week", 2),
  option("3-4-week", "3–4 mal pro Woche", "3–4 times per week", 1),
  option("5-6-week", "5–6 mal pro Woche", "5–6 times per week", 1),
  option("daily", "Einmal täglich", "Once a day", 0),
  option("multiple-daily", "Mehrfach täglich", "Several times a day", 0),
] as const;

export const QUESTIONS: readonly Question[] = [
  {
    id: "nutrition-fruit-vegetables",
    category: "nutrition",
    prompt: {
      de: "Hast du in der letzten Woche täglich mindestens 5 Portionen Obst und Gemüse (auch Fruchtsäfte) gegessen bzw. getrunken?",
      en: "During the last week, did you eat or drink at least five portions of fruit and vegetables each day (including fruit juice)?",
    },
    options: yesNo,
    maxScore: 3,
  },
  {
    id: "nutrition-water",
    category: "nutrition",
    prompt: {
      de: "Hast du in der letzten Woche täglich mindestens 1,5 Liter Wasser getrunken?",
      en: "During the last week, did you drink at least 1.5 litres of water each day?",
    },
    options: yesNo,
    maxScore: 3,
  },
  {
    id: "nutrition-soft-drink-frequency",
    category: "nutrition",
    prompt: {
      de: "Wie oft hast du in der letzten Woche Limonade, Eistee und andere Softdrinks getrunken? Lightgetränke zählen nicht dazu.",
      en: "How often did you drink lemonade, iced tea or other soft drinks during the last week? Diet drinks do not count.",
    },
    options: weeklyLowIsGood,
    maxScore: 3,
  },
  {
    id: "nutrition-soft-drink-amount",
    category: "nutrition",
    prompt: {
      de: "Wenn du Softdrinks trinkst, wie viel trinkst du dann meistens?",
      en: "When you drink soft drinks, how much do you usually have?",
    },
    options: [
      option("never", "Ich trinke nie Softdrinks", "I never drink soft drinks", 3),
      option("under-glass", "Weniger als 1 Glas", "Less than one glass", 3),
      option("one-glass", "1 Glas", "One glass", 2),
      option("two-glasses", "2 Gläser", "Two glasses", 1),
      option("over-two-glasses", "Mehr als 2 Gläser", "More than two glasses", 0),
    ],
    maxScore: 3,
  },
  {
    id: "nutrition-meat-frequency",
    category: "nutrition",
    prompt: {
      de: "Wie oft hast du in der letzten Woche Fleisch gegessen? Wurst und Geflügel zählen hier nicht dazu.",
      en: "How often did you eat meat during the last week? Exclude sausage and poultry.",
    },
    options: [
      option("never", "Nie", "Never", 3),
      option("1-2-week", "1–2 mal pro Woche", "1–2 times per week", 3),
      option("3-4-week", "3–4 mal pro Woche", "3–4 times per week", 2),
      option("5-6-week", "5–6 mal pro Woche", "5–6 times per week", 1),
      option("daily", "Einmal täglich", "Once a day", 0),
      option("multiple-daily", "Mehrfach täglich", "Several times a day", 0),
    ],
    maxScore: 3,
  },
  {
    id: "nutrition-poultry-frequency",
    category: "nutrition",
    prompt: {
      de: "Wie oft hast du in der letzten Woche Geflügel gegessen?",
      en: "How often did you eat poultry during the last week?",
    },
    options: weeklyLowIsGood,
    maxScore: 3,
  },
  {
    id: "nutrition-fast-food-frequency",
    category: "nutrition",
    prompt: {
      de: "Wie oft hast du in der letzten Woche Fast Food wie Burger, Pommes, Döner oder Pizza gegessen?",
      en: "How often did you eat fast food such as burgers, chips, kebab or pizza during the last week?",
    },
    options: weeklyLowIsGood,
    maxScore: 3,
  },
  {
    id: "nutrition-ultra-processed-frequency",
    category: "nutrition",
    prompt: {
      de: "Wie oft hast du in der letzten Woche hochverarbeitete Lebensmittel, zum Beispiel Kartoffelchips, gegessen?",
      en: "How often did you eat highly processed foods, such as potato crisps, during the last week?",
    },
    options: weeklyLowIsGood,
    maxScore: 3,
  },
  {
    id: "movement-active-days",
    category: "movement",
    prompt: {
      de: "An wie vielen Tagen in der Woche bist du durchschnittlich so körperlich aktiv, dass du ins Schwitzen gerätst?",
      en: "On how many days per week are you usually active enough to break a sweat?",
    },
    options: [
      option("0", "An keinem Tag", "No days", 0),
      option("1", "An einem Tag", "One day", 1),
      option("2", "An zwei Tagen", "Two days", 1),
      option("3", "An drei Tagen", "Three days", 2),
      option("4", "An vier Tagen", "Four days", 2),
      option("5", "An fünf Tagen", "Five days", 3),
      option("6", "An sechs Tagen", "Six days", 3),
      option("7", "An sieben Tagen", "Seven days", 3),
    ],
    maxScore: 3,
  },
  {
    id: "movement-active-duration",
    category: "movement",
    prompt: {
      de: "Wie lange bist du an diesen Tagen durchschnittlich körperlich aktiv?",
      en: "How long are you physically active on those days on average?",
    },
    options: [
      option("under-10", "Weniger als 10 Minuten", "Less than 10 minutes", 0),
      option("10-30", "10–30 Minuten", "10–30 minutes", 1),
      option("30-60", "30–60 Minuten", "30–60 minutes", 2),
      option("over-60", "Mehr als 60 Minuten", "More than 60 minutes", 3),
    ],
    maxScore: 3,
  },
  {
    id: "movement-sport-frequency",
    category: "movement",
    prompt: { de: "Wie oft treibst du Sport?", en: "How much sport do you do?" },
    options: [
      option("never", "Nie", "Never", 0),
      option("under-1h", "Weniger als 1 Stunde pro Woche", "Less than 1 hour per week", 1),
      option("1-2h", "1–2 Stunden pro Woche", "1–2 hours per week", 2),
      option("2-4h", "2–4 Stunden pro Woche", "2–4 hours per week", 3),
      option("over-4h", "Mehr als 4 Stunden pro Woche", "More than 4 hours per week", 3),
    ],
    maxScore: 3,
  },
  {
    id: "sleep-difficulties",
    category: "sleep",
    prompt: {
      de: "Hast du manchmal Schlafschwierigkeiten?",
      en: "Do you sometimes have trouble sleeping?",
    },
    options: [option("yes", "Ja", "Yes", 0), option("no", "Nein", "No", 3)],
    maxScore: 3,
  },
  {
    id: "sleep-duration",
    category: "sleep",
    prompt: {
      de: "Wie viele Stunden Schlaf bekommst du durchschnittlich pro Nacht?",
      en: "How many hours of sleep do you get on average each night?",
    },
    options: [
      option("under-7h", "Weniger als 7 Stunden", "Less than 7 hours", 1),
      option("7-8h", "7–8 Stunden", "7–8 hours", 3),
      option("over-8h", "Mehr als 8 Stunden", "More than 8 hours", 2),
    ],
    maxScore: 3,
  },
  {
    id: "mental-general",
    category: "mental",
    prompt: {
      de: "Wie würdest du deine mentale Gesundheit in den letzten Wochen ganz allgemein beurteilen?",
      en: "How would you rate your mental health overall during the last few weeks?",
    },
    options: [
      option("poor", "Schlecht", "Poor", 0),
      option("fair", "Mittelmäßig", "Fair", 1),
      option("good", "Gut", "Good", 2),
      option("very-good", "Sehr gut", "Very good", 3),
      option("excellent", "Hervorragend", "Excellent", 3),
    ],
    maxScore: 3,
  },
  {
    id: "mental-confidence",
    category: "mental",
    prompt: {
      de: "Wie oft hast du dich im letzten Monat zuversichtlich gefühlt, deine persönlichen Probleme bewältigen zu können?",
      en: "During the last month, how often did you feel confident that you could handle your personal problems?",
    },
    options: [
      option("never", "Niemals", "Never", 0),
      option("rarely", "Selten", "Rarely", 1),
      option("sometimes", "Manchmal", "Sometimes", 2),
      option("often", "Häufig", "Often", 3),
      option("always", "Immer", "Always", 3),
    ],
    maxScore: 3,
  },
  {
    id: "mental-things-going-well",
    category: "mental",
    prompt: {
      de: "Wie oft hattest du im letzten Monat das Gefühl, dass die Dinge nach deinen Vorstellungen laufen?",
      en: "During the last month, how often did you feel that things were going your way?",
    },
    options: [
      option("never", "Niemals", "Never", 0),
      option("rarely", "Selten", "Rarely", 1),
      option("sometimes", "Manchmal", "Sometimes", 2),
      option("often", "Häufig", "Often", 3),
      option("always", "Immer", "Always", 3),
    ],
    maxScore: 3,
  },
  {
    id: "social-close-people",
    category: "social",
    prompt: {
      de: "Wie viele Menschen stehen dir so nahe, dass du dich auf sie verlassen kannst, wenn du ernste persönliche Probleme hast?",
      en: "How many people are close enough that you can rely on them when you have serious personal problems?",
    },
    options: [
      option("none", "Keine", "None", 0),
      option("1-2", "1–2 Personen", "1–2 people", 1),
      option("3-5", "3–5 Personen", "3–5 people", 2),
      option("over-6", "Mehr als 6 Personen", "More than 6 people", 3),
    ],
    maxScore: 3,
  },
  {
    id: "social-neighbour-help",
    category: "social",
    prompt: {
      de: "Wie einfach ist es für dich, praktische Hilfe von Nachbarn zu erhalten, wenn du diese benötigst?",
      en: "How easy is it for you to get practical help from neighbours when you need it?",
    },
    options: [
      option("very-difficult", "Sehr schwierig", "Very difficult", 0),
      option("difficult", "Schwierig", "Difficult", 1),
      option("possible", "Möglich", "Possible", 2),
      option("easy", "Einfach", "Easy", 3),
      option("very-easy", "Sehr einfach", "Very easy", 3),
    ],
    maxScore: 3,
  },
] as const;

export const QUESTIONS_BY_CATEGORY = CATEGORY_ORDER.reduce(
  (result, category) => ({
    ...result,
    [category]: QUESTIONS.filter((question) => question.category === category),
  }),
  {} as Record<CategoryId, readonly Question[]>
);

export const categoryLabel = (category: CategoryId, language: AppLanguage) =>
  CATEGORY_META[category].label[language];

