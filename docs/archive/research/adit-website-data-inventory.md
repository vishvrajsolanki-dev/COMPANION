# ADIT Website Data Inventory

**Crawled:** 2026-08-08
**Source:** https://adit.ac.in
**Purpose:** Reference data for Student Academic OS — subject templates and faculty directory

---

## Site Structure

ADIT (A.D. Patel Institute of Technology) runs a PHP-based site at `adit.ac.in`. Academic data is organized by department under `departments/department.php?dept=<short>&program=<code>`.

### Data Access Pattern

- **Faculty:** `departments/department.php?dept=<short>&page=faculty` — HTML table, no pagination
- **Curriculum:** `departments/department.php?dept=<short>&page=curriculum&level=UG&program=<code>` — HTML tables by semester
- **Syllabus PDFs:** Linked from curriculum tables (relative paths under `assets/pdf/syllabus/`)

### Department Short Codes

| Department | dept param | program param | Programs |
|---|---|---|---|
| Computer Engineering | `cp` | `cp` | B.Tech. CE |
| Computer Science & Design | `cp` | `csd` | B.Tech. CSD |
| Information Technology | `it` | `it` | B.Tech. IT |
| AI & Data Science | `it` | `aids` | B.Tech. AIDS |
| Electronics & Communication | `ec` | `ec` | B.Tech. EC |
| Electrical Engineering | `ee` | `ee` | B.Tech. EE |
| Civil Engineering | `ce` | `civil` | B.Tech. Civil |
| Automobile Engineering | `auto` | `auto` | B.Tech. Auto |
| Mechanical Engineering | `me` | `me` | B.Tech. ME |
| Dairy Technology | `dairy` | `dairy` | B.Tech. Dairy |
| Food Processing Technology | `fpt` | `fpt` | B.Tech. FPT |

---

## Faculty Data (verified 2026-08-08)

### Computer Engineering (B.Tech. CE) — 19 visible, 3 hidden

| # | Name | Designation | Qualifications | Experience | Email |
|---|---|---|---|---|---|
| 1 | Dr. Bhagirath Prajapati | Associate Professor & Head | B.E., M.E., Ph.D. | 22.1 yr | head.cp@adit.ac.in |
| 2 | Dr. Dheeraj Kumar Singh | Associate Professor (CSD Coordinator) | Ph.D. CS/IT Engg. | 16.7 yr | coordinator.cs@adit.ac.in |
| 3 | Dr. Ishita Theba | Assistant Professor | B.E., M.E., Ph.D. | 18.3 yr | thebaishita@adit.ac.in |
| 4 | Kurtkoti Aniruddha | Assistant Professor | B.E., M.Tech. | 17.5 yr | na@adit.ac.in |
| 5 | Joshi Chinmay | Assistant Professor | B.E., M.E., Ph.D. Pursuing | 12.5 yr | ce.chinmay@adit.ac.in |
| 6 | Thakkar Prerak | Assistant Professor | B.E., M.Tech., Ph.D. Pursuing | 11.5 yr | cp.prerak@adit.ac.in |
| 7 | Axit Jaykumar Kachhia | Assistant Professor | ME (IT), Ph.D. Pursuing | 4.1 yr | cp.axitkachhia@adit.ac.in |
| 8 | Kinjal Parmar | Assistant Professor | B.E., M.Tech., Ph.D. Pursuing | 8.4 yr | cp.kinjalparmar@adit.ac.in |
| 9 | Jignasha Vishal Parmar | Assistant Professor | B.E., M.Tech., Ph.D. Pursuing | 15.1 yr | cp.jignashaparmar@adit.ac.in |
| 10 | Sheetal J. Macwan | Assistant Professor | B.Sc. CS, PGDCA, M.Sc. IT | 26.1 yr | cp.sheetalmacwan@adit.ac.in |
| 11 | Sarfaraz Jarda | Assistant Professor | B.Tech, M.Tech | 7.0 yr | cp.sarfaraz@adit.ac.in |
| 12 | Paresha S. Brahmbhatt | Assistant Professor | B.E., M.E. | 2.6 yr | cp.pareshabrahmbhatt@adit.ac.in |
| 13 | Vishwadip Nanavati | Assistant Professor | B.E., M.E. | 11.5 yr | na@adit.ac.in |
| 14 | Tejas Rajeshbhai Rana | Assistant Professor | B.E., M.E., Ph.D. Pursuing | 13.7 yr | cp.tejasrana@adit.ac.in |
| 15 | Barkha Mehta | Assistant Professor | B.E., M.E., Ph.D. Pursuing | 8.5 yr | cp.barkhamehta@adit.ac.in |
| 16 | Ajay Wadekar | Assistant Professor | M.Tech., Ph.D. Pursuing (NIT Bhopal) | 11.9 yr | cs.aw@adit.ac.in |
| 17 | Dhrupa Mistry | Assistant Professor | B.E., M.Tech. | 0.2 yr | cp.dhrupamistry@adit.ac.in |
| 18 | Paresh Chavda | Assistant Professor | M.E. CE | 4.1 yr | cp.pareshchavda@adit.ac.in |
| 19 | Trupesh Prajapati | Assistant Professor | B.E., M.Tech. DS&ML | 1.7 yr | cp.trupeshprajapati@adit.ac.in |

**Note:** 3 additional faculty are hidden from the public page. Page states: "Showing faculty members for Under Graduate programs only."

---

## Curriculum Data (verified 2026-08-08)

Curriculum year tabs reference 2022–2023 and 2020–2021 but 2025–2026 is the current effective year.
"Effective From Academic Year: 2025-2026. Applicable for Admission Years: 2025–26 onwards."

### B.Tech. Computer Engineering (CP) — Semesters 1–4

**Semester 1** — 22 hrs, 18 credits

| Code | Title | L-T-P | Credits |
|---|---|---|---|
| 102000211 | Calculus | 3-1-0 | 4 |
| 102001217 | Computer Programming with C | 3-0-2 | 4 |
| 102001223 | Basics of Electrical, Electronics and AI | 2-0-4 | 4 |
| 202001207 | Energy and Environment Science | 3-0-0 | 3 |
| 202001215 | Professional Communication | 2-0-2 | 3 |

**Semester 2** — 30 hrs, 24 credits

| Code | Title | L-T-P | Credits |
|---|---|---|---|
| 102000216 | Linear Algebra, Vector Calculus and ODE | 3-1-0 | 4 |
| 102001216 | Quantum Mechanics and Semiconductor | 3-0-2 | 4 |
| 102001219 | Engineering Visualization | 2-0-4 | 4 |
| 102001222 | Engineering Workshop Practices | 3-0-2 | 4 |
| 102040201 | Object Oriented Programming with C++ | 3-0-2 | 4 |
| 102040201* | Basic Web Designing | 3-0-2 | 4 |

*\* Note: "Basic Web Designing" shares course code 102040201 with OOP C++ on the source page — likely a website data-entry error.*

**Semester 3** — 30 hrs, 24 credits

| Code | Title | L-T-P | Credits |
|---|---|---|---|
| 102003406 | Probability, Statistics and Numerical Methods | 3-2-0 | 4 |
| 102003407 | Entrepreneurship Skills | 2-0-0 | 0 |
| 102003408 | Product Ideation | 3-0-0 | 3 |
| 102003411 | Universal Human Values | 3-0-0 | 3 |
| 102040304 | Data Structures | 4-0-2 | 5 |
| 102040305 | Database Management Systems | 4-0-2 | 5 |
| 102043401 | Digital Fundamentals | 3-0-2 | 4 |

**Semester 4** — 26 hrs, 22 credits

| Code | Title | L-T-P | Credits |
|---|---|---|---|
| 102003409 | Economics and Management | 3-0-0 | 3 |
| 102003410 | Introduction to Indian Knowledge System | 3-0-0 | 3 |
| 102040408 | Discrete Mathematics | 3-2-0 | 4 |
| 102040409 | Programming with Java | 3-0-2 | 4 |
| 102040410 | Operating Systems | 3-0-2 | 4 |
| 102040411 | Computer Architecture and Design | 3-0-2 | 4 |

### B.Tech. Information Technology (IT) — Semesters 1, 3 (partial)

**Semester 1** — 16 hrs, 13 credits

| Code | Title | L-T-P | Credits |
|---|---|---|---|
| 102000111 | Calculus | 3-1-0 | 4 |
| 102001217 | Computer Programming with C | 3-0-2 | 4 |
| 102001219 | Engineering Visualization | 2-0-4 | 4 |
| 102001220 | Indian Constitution | 1-0-0 | 1 |

**Semester 3** — 24 hrs, 21 credits

| Code | Title | L-T-P | Credits |
|---|---|---|---|
| 102003406 | Probability - Statistics and Numerical Methods | 3-1-0 | 4 |
| 102003409 | Economics and Management | 3-0-0 | 3 |
| 102003410 | Introduction to Indian Knowledge Systems | 2-0-0 | 2 |
| 102040304 | Data Structures | 3-0-2 | 4 |
| 102040305 | Database Management System | 3-0-2 | 4 |
| 102043401 | Digital Fundamentals | 3-0-2 | 4 |

### B.Tech. Mechanical Engineering (ME) — Semesters 1–2

**Semester 1** — 26 hrs, 17 credits

| Code | Title | L-T-P | Credits |
|---|---|---|---|
| 102000111 | Calculus | 3-1-0 | 4 |
| 102001216 | Quantum Mechanics and Semiconductors | 3-0-2 | 4 |
| 102001218 | Engineering Visualization | 0-0-4 | 2 |
| 102001220 | Indian Constitution | 1-0-0 | 1 |
| 102001221 | Introduction to Physical Education | 0-0-2 | 0 |
| 102001222 | Engineering Workshop Practices | 0-0-4 | 2 |
| 102001223 | Basics of Electrical, Electronics and AI | 2-0-4 | 4 |

**Semester 2** — 27 hrs, 21 credits

| Code | Title | L-T-P | Credits |
|---|---|---|---|
| 102000216 | Linear Algebra, Vector Calculus and ODE | 3-1-0 | 4 |
| 102001217 | Computer Programming with C | 2-0-4 | 4 |
| 102001219 | Environment and Sustainability | 3-0-0 | 3 |
| 102001224 | Professional Communication | 1-0-2 | 2 |
| 102001225 | Basics of Mechanical and Civil Engineering | 2-0-4 | 4 |
| 102091201 | Mechanics of Solid | 3-0-2 | 4 |

---

## Syllabus PDFs

9 PDFs available for CP Semesters 1–2 (2025–2026 curriculum). 6 PDFs for ME Semesters 1–2. IT has full PDF coverage for Semesters 1 and 3. PDFs are linked from curriculum tables as relative paths prefixed with `https://adit.ac.in/`.

**Note:** Semesters 5+ curriculum is not published on the website for any department. This limits template data to Semesters 1–4.

---

## Known Data Quality Issues

1. **Duplicate course code:** "Basic Web Designing" and "Object Oriented Programming with C++" both use code `102040201` on the CP curriculum page — likely a website data-entry error.
2. **Typos:** "Qunatum Mechanics" (missing 't') in ME Semester 1 — source page spelling.
3. **Hidden faculty:** CP department lists 3 hidden faculty. Not accessible via normal scraping.
4. **Partial data:** IT and ME only have Semesters 1–3 and 1–2 respectively (Semesters 2, 4+ not shown on the website for these departments).
5. **No Semester 5+ data:** No department publishes upper-semester curriculum on the public site.

---

## Implications for Scraper Design

- The scraper should handle **incomplete department coverage** gracefully — missing semesters are not an error.
- Course code deduplication must handle the known duplicate (102040201) in CP.
- Faculty pages use a consistent HTML structure per department.
- Syllabus PDFs are only available for lower semesters — not required for the reference_subjects table.
- The scraper is best-effort: it captures what the website publishes, and the Admin can manually supplement.

---

## Circulars & Academic Calendar

The Academic Calendar 2026-27 is already embedded in the app (`src/data/aditCalendarDefaults.ts`) from a user-confirmed PDF — not from the website. The website circulars page lists 5 circulars including "Academic Calendar 2026-27" (2026-06-30) and "List of Holidays - 2026" (2026-02-02).

## Contact

- Phone: +91-2692-233680
- WhatsApp: +919173642243
- Email: info@adit.ac.in, principal@adit.ac.in, academic@adit.ac.in
- Address: A.D. Patel Institute of Technology, New Vallabh Vidyanagar, Anand, Gujarat, India
- College hours: Mon–Sat 9:00 AM – 5:00 PM (2nd & 4th Saturday holiday)
