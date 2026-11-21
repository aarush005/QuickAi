// A "pure function" file: text in, score out. No AI, no database, no files.
// Same resume text in = SAME score out, every single time.

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PHONE = /(?:\+\d{1,3}[\s-]?)?\d{5}[\s-]?\d{5}|\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;

// [label, points available, words that prove the section exists]
const SECTIONS = [
  ["Work Experience", 12, /\b(experience|employment|work history)\b/i],
  ["Education", 10, /\b(education|academic|qualification)s?\b/i],
  ["Skills", 10, /\b(skills|competencies)\b/i],
  ["Summary / Objective", 8, /\b(summary|objective|profile|about me)\b/i],
];

// A "measurable result" looks like: 40%, 10+, 2x, 5k, $500, ₹2 lakh, 60 tickets...
const METRIC =
  /\d+(?:\.\d+)?\s?(?:%|\+|x\b|k\b|m\b)|[$₹€£]\s?\d|\b\d{2,}\s+(?:users|clients|customers|projects|tickets|calls|leads|people|members|applications|orders|sales)\b/gi;

const ACTION_VERBS = [
  "built", "developed", "designed", "implemented", "led", "managed", "created",
  "improved", "increased", "reduced", "launched", "delivered", "optimized",
  "resolved", "achieved", "automated", "streamlined", "collaborated",
  "coordinated", "analyzed", "deployed", "maintained", "trained", "mentored",
  "integrated", "migrated", "established", "generated", "handled", "engineered",
  "shipped", "tested", "documented", "negotiated", "supported", "organized",
  "conducted", "completed", "reviewed", "debugged", "verified", "validated",
  "monitored", "prepared", "executed", "planned", "researched", "presented",
  "edited", "assisted", "updated", "processed",
];

export const scoreResume = (text) => {
  const lost = []; // [pointsLost, message]
  let score = 0;

  const check = (max, earned, message) => {
    score += earned;
    if (earned < max) lost.push([max - earned, `${message} (-${max - earned})`]);
  };

  // 1) Contact details (10)
  check(5, EMAIL.test(text) ? 5 : 0, "Missing an email address");
  check(5, PHONE.test(text) ? 5 : 0, "Missing a phone number");

  // 2) Core sections (40)
  for (const [label, max, pattern] of SECTIONS) {
    check(max, pattern.test(text) ? max : 0, `Missing a "${label}" section`);
  }

  // 3) Measurable results (20): 5 or more = full marks
  const metrics = (text.match(METRIC) || []).length;
  check(
    20,
    Math.min(20, metrics * 4),
    `Only ${metrics} measurable result(s) found (numbers, percentages, amounts). Aim for 5 or more`
  );

  // 4) Length (10)
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words >= 250 && words <= 900) check(10, 10, "");
  else if ((words >= 150 && words < 250) || (words > 900 && words <= 1200))
    check(10, 5, `Resume length is ${words} words. Aim for 250 to 900`);
  else check(10, 0, `Resume length is ${words} words. Aim for 250 to 900`);

  // 5) Strong action verbs (20): 7 different verbs = full marks
  const lower = text.toLowerCase();
  const verbsFound = ACTION_VERBS.filter((v) => new RegExp(`\\b${v}\\b`).test(lower)).length;
  check(
    20,
    Math.min(20, verbsFound * 3),
    `Only ${verbsFound} strong action verb(s) found (like built, led, improved). Aim for 7 or more`
  );

  const points = lost.sort((a, b) => b[0] - a[0]).map(([, message]) => message);
  if (points.length === 0) {
    points.push("Strong structure: all core checks passed. Focus on tailoring it to each job.");
  }

  return { score, points };
};  