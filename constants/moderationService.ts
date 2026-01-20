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
      "Je pense qu'on pourrait mieux communiquer ensemble. Qu'en penses-tu ?",
      "Prenons le temps de nous écouter mutuellement.",
      "Cette situation mérite qu'on en parle calmement, tu ne crois pas ?",
      "Je propose qu'on fasse une pause et qu'on reprenne cette discussion plus tard.",
      "Et si on essayait de trouver un compromis qui nous convienne à tous les deux ?",
    ];
    return reformulations[Math.floor(Math.random() * reformulations.length)];
  }

  // Ensuite insultes sévères (seuil très strict à 0.25)
  if (severeToxicity && severeToxicity > 0.25) {
    const reformulations = [
      "Je suis vraiment frustré(e) en ce moment. On peut en reparler quand je serai plus calme ?",
      "Cette situation me met mal à l'aise. Peux-tu m'expliquer ton point de vue calmement ?",
      "J'ai besoin d'un moment pour réfléchir. On reprend cette conversation plus tard ?",
      "Je sens que la tension monte. Faisons une pause, d'accord ?",
      "Je préférerais qu'on en discute à tête reposée. Ça te va si on en reparle demain ?",
    ];
    return reformulations[Math.floor(Math.random() * reformulations.length)];
  }

  // Insultes (seuil très strict à 0.3)
  if (insult && insult > 0.3) {
    const reformulations = [
      "Je ne partage pas ton avis sur ce point. On peut en discuter ?",
      "Je pense qu'il y a un malentendu entre nous. Explique-moi comment tu vois les choses.",
      "Nos points de vue sont différents, mais j'aimerais comprendre le tien.",
      "Je ressens les choses autrement. Qu'est-ce qui te fait penser ça ?",
      "On dirait qu'on ne parle pas de la même chose. Reprenons depuis le début ?",
      "J'ai l'impression qu'on ne se comprend pas bien. Peux-tu reformuler ?",
    ];
    return reformulations[Math.floor(Math.random() * reformulations.length)];
  }

  // Vulgarité/Profanité (seuil très strict à 0.3)
  if (profanity && profanity > 0.3) {
    const reformulations = [
      "Cette situation me contrarie vraiment.",
      "Je trouve ça vraiment difficile à accepter.",
      "Honnêtement, ça ne me convient pas du tout.",
      "Je suis déçu(e) par cette tournure des événements.",
      "Cette situation me pèse beaucoup en ce moment.",
      "C'est vraiment frustrant pour moi.",
    ];
    return reformulations[Math.floor(Math.random() * reformulations.length)];
  }

  // Toxicité générale
  const reformulations = [
    "Je pense qu'on pourrait exprimer ça de façon plus constructive.",
    "Reformulons ensemble pour mieux se comprendre.",
    "Et si on cherchait une meilleure façon d'en parler ?",
    "Je suis sûr(e) qu'on peut trouver les bons mots ensemble.",
    "Prenons le temps de bien choisir nos mots.",
    "Essayons d'être plus positifs dans notre échange.",
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
    const reformulations = [
      "Je pense qu'on devrait vraiment discuter de ça calmement. Tu es d'accord ?",
      "Prenons du recul ensemble. Cette situation mérite une vraie discussion.",
      "Je propose qu'on trouve une solution qui nous convienne à tous les deux.",
      "Et si on essayait de résoudre ça de manière plus constructive ?",
    ];
    return {
      allowed: false,
      suggestion: reformulations[Math.floor(Math.random() * reformulations.length)],
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
