// Service de modération utilisant Perspective API de Google
// API gratuite jusqu'à 1M requêtes/jour
// Documentation: https://perspectiveapi.com/

const PERSPECTIVE_API_KEY = 'YOUR_API_KEY_HERE'; // À remplacer par votre clé API
const PERSPECTIVE_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

interface PerspectiveResponse {
  attributeScores: {
    TOXICITY: {
      summaryScore: {
        value: number;
      };
    };
    SEVERE_TOXICITY?: {
      summaryScore: {
        value: number;
      };
    };
    INSULT?: {
      summaryScore: {
        value: number;
      };
    };
    PROFANITY?: {
      summaryScore: {
        value: number;
      };
    };
    THREAT?: {
      summaryScore: {
        value: number;
      };
    };
  };
}

// Détection locale de menaces explicites (sans API)
const THREAT_PATTERNS: RegExp[] = [
  /\bje\s+(?:vais|veux|va)\s+te\s+(?:tuer|buter|fracasser|détruire|casser)\b/i,
  /\bje\s+(?:vais|veux)\s+(?:te\s+)?(?:frapper|cogner|tabasser|massacrer|égorger|pendre|brûler)\b/i,
  /\bje\s+vais\s+te\s+faire\s+du\s+mal\b/i,
  /\bje\s+vais\s+te\s+retrouver\s+et\s+(?:te\s+faire\s+mal|te\s+tuer)\b/i,
  /\bje\s+tuerai\s+(?:ta\s+famille|ta\s+mere|ta\s+mère|ton\s+père|ta\s+soeur|ta\s+soeur|ton\s+frere|ton\s+frère)\b/i,
  /\bje\s+vais\s+vous\s+tuer\b/i,
  /\bje\s+vais\s+te\s+(?:kill|stab|shoot)\b/i,
  /\b(?:kill|i\s*will\s*kill\s*you|going\s*to\s*kill\s*you|kill\s*him|kill\s*her)\b/i,
  /\b(?:stab|shoot|gun|stab you|shoot you)\b/i,
  /\b(?:assassiner|meurtre|buter|égorger|pendre|décapiter)\b/i,
  /\b(?:menace|threat)\b/i,
  /\b(?:faire du mal|te faire mal|te faire du mal|hurt you|harm you)\b/i,
  /\b(?:bombe?|bomb)\b/i,
];

const normalizeForThreats = (text: string): string => {
  const leetMap: Record<string, string> = {
    '0': 'o',
    '1': 'i',
    '!': 'i',
    'l': 'l',
    '3': 'e',
    '4': 'a',
    '@': 'a',
    '5': 's',
    '$': 's',
    '7': 't',
    '8': 'b',
    '9': 'g',
  };

  const withoutDiacritics = text
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '');

  const leetNormalized = withoutDiacritics
    .split('')
    .map((ch) => leetMap[ch.toLowerCase()] ?? ch)
    .join('');

  // Supprimer la ponctuation intrusive mais conserver les espaces
  const stripped = leetNormalized.replace(/[^a-zA-Z0-9\s]/g, ' ');

  // Réduire les répétitions de caractères (ex: tuuuuer -> tuer)
  const deduped = stripped.replace(/(.)\1{2,}/g, '$1$1');

  return deduped.toLowerCase();
};

const hasThreatKeywords = (text: string): boolean => {
  const normalized = normalizeForThreats(text);
  return THREAT_PATTERNS.some((pattern) => pattern.test(normalized));
};

export interface ModerationResult {
  allowed: boolean;
  suggestion: string;
  scores?: {
    toxicity: number;
    severeToxicity?: number;
    insult?: number;
    profanity?: number;
    threat?: number;
  };
  detectedCategory?: string;
}

// Reformulations contextuelles basées sur le type de toxicité détectée
const getReformulationByScore = (scores: any): string => {
  const { toxicity, severeToxicity, insult, profanity, threat } = scores;

  // Priorité aux menaces (seuil très strict à 0.25)
  if (threat && threat > 0.25) {
    const reformulations = [
      "J'aimerais qu'on trouve un terrain d'entente.",
      "Essayons de résoudre ce conflit de manière constructive.",
      "Je préfère qu'on trouve une solution pacifique.",
    ];
    return reformulations[Math.floor(Math.random() * reformulations.length)];
  }

  // Ensuite insultes sévères (seuil très strict à 0.25)
  if (severeToxicity && severeToxicity > 0.25) {
    const reformulations = [
      "Je suis très en colère en ce moment. Peux-tu m'expliquer ton point de vue ?",
      "Cette situation me met hors de moi. On peut prendre du recul et en reparler ?",
      "J'ai besoin d'espace pour réfléchir. On peut en reparler plus tard ?",
    ];
    return reformulations[Math.floor(Math.random() * reformulations.length)];
  }

  // Insultes (seuil très strict à 0.3)
  if (insult && insult > 0.3) {
    const reformulations = [
      "Je ne suis pas d'accord avec toi sur ce point.",
      "Je pense qu'on ne se comprend pas bien. Peux-tu m'expliquer ?",
      "Nos points de vue semblent diverger. Pouvons-nous clarifier ?",
      "Je trouve qu'il y a un malentendu. On peut en discuter ?",
    ];
    return reformulations[Math.floor(Math.random() * reformulations.length)];
  }

  // Vulgarité/Profanité (seuil très strict à 0.3)
  if (profanity && profanity > 0.3) {
    const reformulations = [
      "Je suis vraiment contrarié(e) par cette situation.",
      "Ça ne me convient pas du tout.",
      "Cette situation me dérange beaucoup.",
      "Je trouve ça vraiment frustrant.",
    ];
    return reformulations[Math.floor(Math.random() * reformulations.length)];
  }

  // Toxicité générale
  const reformulations = [
    "Je préfère en parler calmement. Peux-tu m'expliquer ce qui ne va pas ?",
    "On pourrait discuter de ça de façon plus constructive.",
    "J'aimerais qu'on trouve une meilleure façon de communiquer.",
    "Je pense qu'on peut exprimer ça autrement.",
  ];
  return reformulations[Math.floor(Math.random() * reformulations.length)];
};

/**
 * Analyse le texte avec Perspective API pour détecter la toxicité
 * Seuils: toxicity > 0.7 = bloqué
 */
export const moderateTextWithAPI = async (text: string): Promise<ModerationResult> => {
  // Blocage immédiat sur détection locale de menace explicite
  if (hasThreatKeywords(text)) {
    return {
      allowed: false,
      suggestion: "Message bloqué : propos menaçants détectés.",
      detectedCategory: 'local_threat',
    };
  }

  // Vérification locale de la clé API
  if (!PERSPECTIVE_API_KEY || PERSPECTIVE_API_KEY === 'YOUR_API_KEY_HERE') {
    throw new Error('API_KEY_NOT_CONFIGURED');
  }

  try {
    const response = await fetch(`${PERSPECTIVE_API_URL}?key=${PERSPECTIVE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: { text },
        languages: ['fr', 'en'],
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          INSULT: {},
          PROFANITY: {},
          THREAT: {},
        },
        doNotStore: true, // Ne pas stocker les commentaires pour la confidentialité
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data: PerspectiveResponse = await response.json();
    
    const scores = {
      toxicity: data.attributeScores.TOXICITY.summaryScore.value,
      severeToxicity: data.attributeScores.SEVERE_TOXICITY?.summaryScore.value,
      insult: data.attributeScores.INSULT?.summaryScore.value,
      profanity: data.attributeScores.PROFANITY?.summaryScore.value,
      threat: data.attributeScores.THREAT?.summaryScore.value,
    };

    // Seuils TRÈS STRICTS pour une modération maximale
    // toxicité: 0.35 (très strict)
    // severeToxicity: 0.25 (extrêmement strict)
    // threat: 0.25 (extrêmement strict)
    // insult: 0.3 (très strict)
    // profanity: 0.3 (très strict)
    const isToxic = scores.toxicity > 0.35 || 
                    (scores.severeToxicity && scores.severeToxicity > 0.25) ||
                    (scores.threat && scores.threat > 0.25) ||
                    (scores.insult && scores.insult > 0.3) ||
                    (scores.profanity && scores.profanity > 0.3);

    if (isToxic) {
      return {
        allowed: false,
        suggestion: getReformulationByScore(scores),
        scores,
        detectedCategory: 'api_detected',
      };
    }

    return {
      allowed: true,
      suggestion: text,
      scores,
    };
  } catch (error) {
    console.error('[ModerationService] API Error:', error);
    throw error;
  }
};

/**
 * Configuration de la clé API
 * À appeler au démarrage de l'app avec la clé stockée en variable d'environnement
 */
export const configureModerationAPI = (apiKey: string) => {
  // Cette fonction sera utilisée pour configurer la clé depuis .env
  // Pour l'instant, modifiez directement PERSPECTIVE_API_KEY en haut du fichier
};
