import { assistantAnswers } from '../i18n/translations.js';

/**
 * Controlled, rule-based farmer assistant — NOT an LLM.
 * Questions are normalized and matched against a fixed set of approved intents
 * (keyword patterns in English / Hinglish / Devanagari). Only approved FAQ
 * answers are returned; anything else falls back to a scope statement.
 */
const INTENTS = [
  // Order matters: status/queue lookups are checked before token creation so that
  // "procurement status kaise check karu" is not misread as "how to submit a request".
  {
    key: 'check_status',
    patterns: [
      /(status|स्थिति|स्टेटस|ସ୍ଥିତି).*(check|kya|kaise|क्या|कैसे|देख|पता|है|hai|ଦେଖ|କିପରି|କଣ)/i,
      /(procurement|khareed|kharid|खरीद).*(status|स्थिति|update|क्या है)/i,
    ],
  },
  {
    key: 'queue_position',
    patterns: [
      /(queue|katar|line|number|position|कतार|लाइन|नंबर|स्थान).*(kya|ka|mero|meri|mera|my|check|hai|क्या|मेरा|मेरी|बता|देख|है)/i,
      /(meri|mera|मेरा|मेरी|ମୋ|ମୋର).*(queue|position|number|नंबर|कतार|ଧାଡ଼ି|ସ୍ଥାନ)/i,
      /(ଧାଡ଼ି|ଲାଇନ).*(ସ୍ଥାନ|କଣ|କେତେ)/i,
      /kab.*(bari|turn|aayegi)/i,
      /बारी.*(kab|कब)/i,
    ],
  },
  {
    key: 'generate_token',
    patterns: [
      /token.*(generate|bana|ban|kaise|milega|create|banao|लेना|le)/i,
      /(token|टोकन).*(बन|कैसे|लेना|ले)/i,
      /(ଟୋକନ).*(କିପରି|ନେବି|ତିଆରି|ପାଇବି)/i,
      /(request|procurement).*(kaise|kare|karna|create|submit|bhej|कर|करना|भेज)/i,
      /(फसल|फसलें).*(बेच|bech)/i,
      /खरीद.*(request|अनुरोध).*(कैसे|कर)/i,
    ],
  },
  {
    key: 'where_token',
    patterns: [
      /(token|टोकन).*(kaha|kahan|where|dikhe|dekhe|find|कहां|कहाँ|देख|मिलेगा)/i,
      /(कहां|कहाँ|where).*(token|टोकन)/i,
      /(ଟୋକନ).*(କେଉଁଠି|କାହିଁ)/i,
    ],
  },
  {
    key: 'centre_choice',
    patterns: [
      /(centre|center|kendra|केन्द्र|केंद्र).*(kaunsa|kaunsa|which|choose|badal|badl|badlu|badlo|change|best|sahi|kaise|चुन|बदल|कौन)/i,
      /recommended.*centre/i,
      /(kaunsa|कौन.सा|which).*(centre|center|kendra|केंद्र)/i,
      /(କେନ୍ଦ୍ର).*(କେଉଁ|ବାଛ|ବଦଳ)/i,
    ],
  },
  {
    key: 'market_price',
    patterns: [
      /(mandi|market|मंडी|बाज़ार|बाजार).*(price|bhav|rate|भाव|दर|कीमत)/i,
      /(price|bhav|rate|भाव|दर|कीमत).*(history|trend|pichle|last year|इतिहास|पिछले|चाल)/i,
      /(kab|कब).*(bech|बेच)/i,
      /(best|sahi|सही|अच्छा).*(month|mahina|महीन).*(bech|बेच|sell)/i,
      /agmarknet/i,
      /(ମଣ୍ଡି|ବଜାର).*(ଦର|ଦାମ|ମୂଲ୍ୟ)/i,
    ],
  },
  {
    key: 'register',
    patterns: [
      /(register|registration|register).*(kaise|kare|karo|how)/i,
      /(account|खाता|पंजीकरण).*(kaise|बना|कैसे)/i,
      /पंजीकरण/,
      /ପଞ୍ଜୀକରଣ|ଖାତା.*(ଖୋଲ|କିପରି)/,
    ],
  },
  {
    key: 'change_language',
    patterns: [
      /(language|bhasha|भाषा).*(change|badal|switch|kaise|कैसे|कर|बदल)/i,
      /(change|switch|बदल).*(language|bhasha|भाषा|hindi|english|हिंदी|हिन्दी|odia|oriya|ଓଡ଼ିଆ)/i,
      /(ଭାଷା).*(ବଦଳ|କିପରି)/i,
    ],
  },
  {
    key: 'assisted',
    patterns: [
      /(smartphone|phone).*(nahi|without|not have|नहीं)/i,
      /(असिस्ट|assist|counter|counter par)/i,
      /(ସ୍ମାର୍ଟଫୋନ୍|ଫୋନ୍).*(ନାହିଁ)|କାଉଣ୍ଟର/i,
    ],
  },
  {
    key: 'what_is',
    patterns: [
      /(anna\s?data|annadata|अन्नदाता).*(kya|what|hai|क्या|है)/i,
      /(kisan\s?sathi|किसान\s?साथी).*(kya|what|hai|क्या|है)/i,
      /(ଅନ୍ନଦାତା).*(କଣ|କ'ଣ)/i,
      /^what is this (app|application|website)/i,
    ],
  },
  {
    key: 'thanks',
    patterns: [/^(thanks|thank you|dhanyavad|dhanyawad|shukriya|धन्यवाद|शुक्रिया|ଧନ୍ୟବାଦ)[.! ]*$/i],
  },
];

function normalize(text) {
  return String(text || '').toLowerCase().replace(/[？?]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function answer(question, lang) {
  const q = normalize(question);
  if (!q) return null;
  for (const intent of INTENTS) {
    if (intent.patterns.some((p) => p.test(q))) {
      return assistantAnswers[lang]?.[intent.key] || assistantAnswers.en[intent.key];
    }
  }
  return assistantAnswers[lang]?.fallback || null; // caller falls back to i18n fallback string
}
