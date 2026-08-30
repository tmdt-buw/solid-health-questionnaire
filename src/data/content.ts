import type { AppLanguage, CategoryId, LocalizedText } from "../types";

export type ResourceLink = {
  title: LocalizedText;
  description: LocalizedText;
  href: string;
};

export type LocalOffer = {
  provider: LocalizedText;
  title: LocalizedText;
  label: LocalizedText;
  href: string;
};

export type CategoryContent = {
  summary: LocalizedText;
  lowScoreLead: LocalizedText;
  quickWins: LocalizedText[];
  resources: ResourceLink[];
  offers: LocalOffer[];
};

const offer = (
  providerDe: string,
  providerEn: string,
  titleDe: string,
  titleEn: string,
  labelDe: string,
  labelEn: string,
  href: string
): LocalOffer => ({
  provider: { de: providerDe, en: providerEn },
  title: { de: titleDe, en: titleEn },
  label: { de: labelDe, en: labelEn },
  href,
});

export const CATEGORY_CONTENT: Record<CategoryId, CategoryContent> = {
  nutrition: {
    summary: {
      de: "Eine ausgewogene Ernährung und ausreichend Flüssigkeit unterstützen Energie, Regeneration und langfristiges Wohlbefinden.",
      en: "A balanced diet and enough fluids support energy, recovery and long-term wellbeing.",
    },
    lowScoreLead: {
      de: "Kleine Änderungen bei Getränken und Mahlzeiten können hier schnell Wirkung zeigen.",
      en: "Small changes to drinks and meals can make a noticeable difference here.",
    },
    quickWins: [
      { de: "Eine zusätzliche Portion Obst oder Gemüse einplanen", en: "Plan one extra portion of fruit or vegetables" },
      { de: "Eine gefüllte Wasserflasche sichtbar bereitstellen", en: "Keep a filled water bottle in sight" },
      { de: "Eine stark verarbeitete Mahlzeit pro Woche ersetzen", en: "Replace one highly processed meal each week" },
      { de: "Vollkorn häufiger als Weißmehl wählen", en: "Choose whole grains more often than white flour" },
    ],
    resources: [
      {
        title: { de: "DGE: Gut essen und trinken", en: "DGE: Eating and drinking well" },
        description: { de: "Praxisnahe Empfehlungen der Deutschen Gesellschaft für Ernährung", en: "Practical guidance from the German Nutrition Society" },
        href: "https://www.dge.de/gesunde-ernaehrung/gut-essen-und-trinken/",
      },
      {
        title: { de: "gesund.bund.de: Gesunde Ernährung", en: "gesund.bund.de: Healthy nutrition" },
        description: { de: "Unabhängige Gesundheitsinformationen des Bundes", en: "Independent health information from the German federal portal" },
        href: "https://gesund.bund.de/gesunde-ernaehrung",
      },
    ],
    offers: [
      offer("Stadt Wuppertal", "City of Wuppertal", "Gesundheit vor Ort", "Local health services", "#Ernährung", "#Nutrition", "https://www.wuppertal.de/rathaus-buergerservice/gesundheit/index.php"),
      offer("DGE", "German Nutrition Society", "Ernährungsfachkräfte finden", "Find qualified nutrition professionals", "#Beratung", "#Advice", "https://www.dge.de/ernaehrungsberatung/"),
    ],
  },
  movement: {
    summary: {
      de: "Regelmäßige Bewegung stärkt Herz, Kreislauf und Muskulatur und kann Stimmung sowie Schlaf verbessern.",
      en: "Regular movement supports your heart, circulation and muscles and can improve mood and sleep.",
    },
    lowScoreLead: {
      de: "Kurze, häufige Bewegungseinheiten sind ein guter Einstieg – Intensität kann später wachsen.",
      en: "Short, frequent activity is a good start; intensity can grow later.",
    },
    quickWins: [
      { de: "Heute einen 10-Minuten-Spaziergang machen", en: "Take a ten-minute walk today" },
      { de: "Eine kurze Strecke bewusst zu Fuß zurücklegen", en: "Walk one short everyday journey" },
      { de: "Nach langem Sitzen zwei Minuten bewegen", en: "Move for two minutes after sitting for a long time" },
      { de: "Einen festen Bewegungstermin im Kalender setzen", en: "Schedule one fixed activity appointment" },
    ],
    resources: [
      {
        title: { de: "gesund.bund.de: Bewegung", en: "gesund.bund.de: Physical activity" },
        description: { de: "Warum Bewegung gesund ist und wie der Einstieg gelingt", en: "Why activity matters and how to get started" },
        href: "https://gesund.bund.de/gesund-durch-bewegung",
      },
      {
        title: { de: "BIÖG: Bewegungsempfehlungen", en: "BIÖG: Activity recommendations" },
        description: { de: "Alltagstaugliche Orientierung für verschiedene Lebensphasen", en: "Everyday guidance for different stages of life" },
        href: "https://shop.bioeg.de/sonderheft-03-nationale-empfehlungen-fuer-bewegung-und-bewegungsfoerd-60640103/",
      },
    ],
    offers: [
      offer("Stadt Wuppertal", "City of Wuppertal", "Sport und Bewegung", "Sport and activity", "#Bewegung", "#Movement", "https://www.wuppertal.de/tourismus-freizeit/sport/Startseite_Sport.php"),
      offer("Stadtsportbund Wuppertal", "Wuppertal Sports Association", "Sportangebote finden", "Find sports activities", "#Verein", "#Clubs", "https://www.stadtsportbund-wuppertal.de/index.html"),
    ],
  },
  sleep: {
    summary: {
      de: "Erholsamer Schlaf unterstützt Konzentration, Immunsystem und Regeneration. Dauer und Regelmäßigkeit zählen gemeinsam.",
      en: "Restful sleep supports concentration, immunity and recovery. Duration and regularity both matter.",
    },
    lowScoreLead: {
      de: "Deine Regeneration wirkt zuletzt etwas niedrig. Kleine Änderungen an der Abendroutine können helfen.",
      en: "Your recent recovery appears a little low. Small changes to your evening routine may help.",
    },
    quickWins: [
      { de: "Möglichst zur gleichen Zeit ins Bett gehen", en: "Go to bed at roughly the same time" },
      { de: "Die letzte halbe Stunde bildschirmfrei halten", en: "Keep the last half hour screen-free" },
      { de: "Koffein am späten Nachmittag vermeiden", en: "Avoid caffeine late in the day" },
      { de: "Schlafzimmer kühl, ruhig und dunkel halten", en: "Keep the bedroom cool, quiet and dark" },
    ],
    resources: [
      {
        title: { de: "gesund.bund.de: Schlafstörungen", en: "gesund.bund.de: Sleep problems" },
        description: { de: "Ursachen, Selbsthilfe und ärztliche Unterstützung", en: "Causes, self-care and medical support" },
        href: "https://gesund.bund.de/schlafstoerungen",
      },
      {
        title: { de: "Stiftung Gesundheitswissen: Gesunder Schlaf", en: "Health Knowledge Foundation: Healthy sleep" },
        description: { de: "Grundlagen und praktische Schlafhygiene", en: "Background and practical sleep hygiene" },
        href: "https://www.stiftung-gesundheitswissen.de/gesunder-schlaf/besser-schlafen",
      },
    ],
    offers: [
      offer("116117", "116117", "Ärztliche Hilfe finden", "Find medical support", "#Schlaf", "#Sleep", "https://arztsuche.116117.de/"),
      offer("Stadt Wuppertal", "City of Wuppertal", "Gesundheitsberatung", "Health advice", "#VorOrt", "#Local", "https://www.wuppertal.de/rathaus-buergerservice/gesundheit/index.php"),
    ],
  },
  mental: {
    summary: {
      de: "Mentales Wohlbefinden verändert sich. Zuversicht, Erholung und passende Unterstützung sind wichtige Schutzfaktoren.",
      en: "Mental wellbeing changes over time. Confidence, recovery and suitable support are important protective factors.",
    },
    lowScoreLead: {
      de: "Du musst Belastungen nicht allein tragen. Ein vertrauliches Gespräch kann ein erster Schritt sein.",
      en: "You do not have to carry stress alone. A confidential conversation can be a first step.",
    },
    quickWins: [
      { de: "Eine kleine Aufgabe für heute priorisieren", en: "Choose one small priority for today" },
      { de: "Einer vertrauten Person kurz schreiben", en: "Send a short message to someone you trust" },
      { de: "Fünf Minuten bewusst ohne Ablenkung atmen", en: "Breathe without distractions for five minutes" },
      { de: "Bei anhaltender Belastung professionelle Hilfe ansprechen", en: "Seek professional support if distress persists" },
    ],
    resources: [
      {
        title: { de: "gesund.bund.de: Psychische Gesundheit", en: "gesund.bund.de: Mental health" },
        description: { de: "Verlässliche Informationen und Wege zu Hilfe", en: "Reliable information and routes to support" },
        href: "https://gesund.bund.de/themen/psyche-und-wohlbefinden",
      },
      {
        title: { de: "TelefonSeelsorge", en: "Telephone counselling" },
        description: { de: "Kostenlos, anonym und rund um die Uhr erreichbar", en: "Free, anonymous and available around the clock" },
        href: "https://www.telefonseelsorge.de/",
      },
    ],
    offers: [
      offer("Stadt Wuppertal", "City of Wuppertal", "Sozialpsychiatrischer Dienst", "Community mental health service", "#Beratung", "#Advice", "https://www.wuppertal.de/vv/oe/305.4.php"),
      offer("116117", "116117", "Psychotherapie-Suche", "Find psychotherapy", "#Termin", "#Appointment", "https://www.116117.de/de/psychotherapie.php"),
    ],
  },
  social: {
    summary: {
      de: "Verlässliche Kontakte und gegenseitige Hilfe können im Alltag entlasten und die Gesundheit langfristig stärken.",
      en: "Reliable relationships and mutual support can ease daily life and strengthen health over time.",
    },
    lowScoreLead: {
      de: "Verbindung entsteht oft durch kleine, wiederholte Kontakte – nicht durch einen großen Schritt.",
      en: "Connection often grows through small, repeated contact rather than one big step.",
    },
    quickWins: [
      { de: "Einer vertrauten Person ein Lebenszeichen senden", en: "Check in with someone you trust" },
      { de: "Ein regelmäßiges Treffen oder Telefonat vereinbaren", en: "Arrange a regular meeting or phone call" },
      { de: "Ein Angebot im eigenen Quartier ausprobieren", en: "Try one activity in your neighbourhood" },
      { de: "Bei praktischer Hilfe eine konkrete Bitte formulieren", en: "Make one specific request when you need practical help" },
    ],
    resources: [
      {
        title: { de: "Kompetenznetz Einsamkeit", en: "Loneliness competence network" },
        description: { de: "Informationen und Wege aus sozialer Isolation", en: "Information and routes out of social isolation" },
        href: "https://kompetenznetz-einsamkeit.de/angebotslandkarte",
      },
      {
        title: { de: "Nebenan.de Stiftung", en: "Nebenan.de Foundation" },
        description: { de: "Ideen für lebendige Nachbarschaften", en: "Ideas for connected neighbourhoods" },
        href: "https://www.nebenan-stiftung.de/",
      },
    ],
    offers: [
      offer("Stadt Wuppertal", "City of Wuppertal", "Begegnung und Beratung", "Meeting places and advice", "#Gemeinschaft", "#Community", "https://www.wuppertal.de/microsite/sozial_in_wuppertal/index.php"),
      offer("Stadt Wuppertal", "City of Wuppertal", "Selbsthilfe-Kontaktstelle", "Self-help contact point", "#Selbsthilfe", "#SelfHelp", "https://www.wuppertal.de/selbsthilfegruppen"),
    ],
  },
};

export const localize = (text: LocalizedText, language: AppLanguage) => text[language];
