# ADR 0002: Compute the resume score in code; use the AI only for written suggestions

## Status
Accepted

## Context
The first version of Resume Review asked the AI to "start from 100 and deduct points"
and return a score. Testing 8-10 real resumes showed the problem:

- Most resumes scored 55, one scored 70, with no clear reason.
- In one logged run the AI listed deductions totalling -50 but reported a score of 55.
  A language model predicts plausible text; it does not calculate reliably.
- Rules like "missing keywords (-15)" cannot be judged without a job description, so
  they applied to almost every resume, pulling all scores toward the same number.
- Users compare scores, so an unexplained, unstable score damages trust in the
  product's flagship feature.

## Decision
- The score and its deductions are computed by plain code in `utils/resumeScorer.js`
  (a pure function: same text in, same score out).
- The AI is used only for what it is good at: written improvement suggestions and
  rewriting the resume.
- Scoring rules (100 marks): contact details 10, core sections 40, measurable results
  20, length 10, action verbs 20.
- Every lost mark appears in `points` with its amount, and the amounts always add up
  to `100 - score` (covered by unit tests).

## Consequences
**Good**
- Same resume always gives the same score; every deduction is explainable.
- One fewer long AI request per review (suggestions are capped at 800 tokens).
- The scorer is unit-testable with no mocks (`node --test`).

**Known limits (version 1)**
- PDF text has lost its line breaks, so section detection looks for words such as
  "experience" or "education" anywhere in the text, not for real headings.
- "Measurable results" and "action verbs" are pattern and word-list checks and can
  miss unusual wording.
- It is a quality heuristic, not a real ATS simulation. Consider the product name
  "Resume Strength Score" rather than "ATS score" before launch.

## Future work
- Add job-description matching (keyword overlap against a pasted job description).
- Keep line breaks during PDF extraction so real headings can be detected.
- Revisit the weights using feedback from real users.