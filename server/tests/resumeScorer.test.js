import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreResume } from "../utils/resumeScorer.js";

const weak = "John Smith I am a hard working person looking for a job. I worked at a shop. I know computers.";

const average =
  "Priya Sharma priya@mail.com +91 98765 43210 EXPERIENCE Customer Support Executive at ABC BPO 2022-2025 " +
  "Handled customer calls and resolved complaints. Supported the team with daily reports. " +
  "EDUCATION B.Com Delhi University 2021 SKILLS Communication Excel Typing " +
  "Handled many tickets every day and helped new joiners. ".repeat(12);

const strong =
  "Aarush Asthana work.aarush@gmail.com +91 9571441969 PROFESSIONAL SUMMARY Full stack developer with 4+ years of experience. " +
  "EXPERIENCE Freelance Web Developer 2021-2025 Built and deployed 15+ websites for international clients. " +
  "Improved page speed by 40% and increased conversions by 25%. Led a team of 3 and delivered 12 projects on time. " +
  "Reduced support tickets by 30% after redesigning the checkout. Automated reports, saving 10 hours per week. " +
  "Developed REST APIs and integrated payment gateways. Managed 20 clients and resolved 60 tickets monthly. " +
  "EDUCATION BCA SRMIST 2027 SKILLS React Node.js Express PostgreSQL JavaScript Tailwind Git " +
  "PROJECTS Oryin AI SaaS: designed, implemented and shipped resume review, optimized API latency by 35%. ".repeat(3);

test("same resume always gives the same score", () => {
  const first = scoreResume(average);
  for (let i = 0; i < 20; i++) assert.deepEqual(scoreResume(average), first);
});

test("weak < average < strong, with clearly different scores", () => {
  const a = scoreResume(weak).score, b = scoreResume(average).score, c = scoreResume(strong).score;
  console.log(`weak=${a} average=${b} strong=${c}`);
  assert.ok(a < b && b < c);
  assert.ok(c - a >= 40, "big gap between weak and strong");
});

test("scores stay between 0 and 100", () => {
  for (const t of [weak, average, strong, "", "x"]) {
    const { score } = scoreResume(t);
    assert.ok(score >= 0 && score <= 100);
  }
});

test("the points explain every lost mark: 100 - deductions = score", () => {
  for (const t of [weak, average, strong]) {
    const { score, points } = scoreResume(t);
    const deducted = points.reduce((sum, p) => sum + Number((p.match(/\(-(\d+)\)$/) || [0, 0])[1]), 0);
    assert.equal(100 - deducted, score);
  }
});

test("a missing email and phone are reported", () => {
  const { points } = scoreResume(weak);
  assert.ok(points.some((p) => p.includes("email")));
  assert.ok(points.some((p) => p.includes("phone")));
});

test("always returns at least one point", () => {
  assert.ok(scoreResume(strong).points.length >= 1);
});