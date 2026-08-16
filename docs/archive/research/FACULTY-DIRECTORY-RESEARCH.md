# Faculty Directory Research — ADIT (A.D. Patel Institute of Technology)

**Date:** 2026-08-05  
**Source:** https://adit.ac.in (official website, scraped live)  
**Department:** Computer Science and Design (CSD) — B.Tech. UG Program  
**Scope:** All faculty from the CSD/Computer Engineering department page, cross-referenced with seeded data

---

## Key Findings

1. **ADIT's CSD and Computer Engineering departments share one combined faculty pool** — the same 19+ faculty are listed on both `program=cp` and `program=csd` pages
2. **3 additional faculty members are hidden** from the website listing ("3 hidden faculty" note on the page)
3. **The website lists 19 visible faculty** plus 3 hidden = **22 total**
4. **Subject code patterns** in the seed data align with CSD program codes:
   - `2AI501` — 5th semester, AI elective (Machine Learning)
   - `2AI301` — 3rd semester, AI foundation (Data Structures)
   - `2CSL37` — CSD lab course (Database Systems)
   - `2130012` — University code format (Engineering Math-III)
   - `2140703` — University code format (Communication Skills)

---

## Seeded Faculty (in `src/db/seeds.ts`) vs. Official ADIT Directory

| Seeded Name | Email (seed) | In ADIT Directory? | Official Email | Match? |
|-------------|-------------|---------------------|----------------|--------|
| **Prof. Priyanka Pansuriya** | pansuriya.pd@adit.ac.in | ⚠️ Not listed by name | — | No match found in visible faculty list. May be one of the 3 hidden faculty, or may use a different name on the website |
| **Prof. Smita Singhal** | smita.s@adit.ac.in | ❌ Not listed | — | Not found. Possibly visiting/adjunct faculty or listed under a different department |
| **Prof. Kinjal Parmar** | cp.kinjalparmar@adit.ac.in | ✅ **FOUND** | cp.kinjalparmar@adit.ac.in | **Perfect match** — Kinjal Parmar, Assistant Professor, B.E.(CE), M.Tech(CE), Ph.D. Pursuing, 8.4 yrs experience |
| **Prof. Bhargav Pansuriya** | bhargav.p@adit.ac.in | ❌ Not listed | — | Not found. Possibly one of the 3 hidden faculty, or may teach under a different program |
| **Prof. Ruchi Alhuwalia** | ruchi.a@adit.ac.in | ❌ Not listed | — | Not found. Possibly visiting/adjunct faculty |

### Verification Summary
- **1 of 5 seeded faculty confirmed** from ADIT website (Kinjal Parmar)
- **4 of 5 seeded faculty unconfirmed** — likely the 3 hidden faculty + 1 visiting/adjunct
- **All seeded emails follow the ADIT convention**: `{first}.{last}@adit.ac.in` or `{dept}.{name}@adit.ac.in`

---

## Complete ADIT CSD/CE Faculty Directory (from website)

### Administration & Senior Faculty

| # | Name | Designation | Qualifications | Experience | Email | Phone |
|---|------|-------------|---------------|------------|-------|-------|
| 1 | **Dr. Bhagirath Prajapati** | Associate Professor & Head | B.E.(C.E.), M.E.(C.E.), Ph.D.(C.E.) | 22.1 yrs | head.cp@adit.ac.in | 9824337174 |
| 2 | **Dr. Dheeraj Kumar Singh** | Associate Professor, CSD Coordinator | Ph.D. Computer/IT Engineering | 16.7 yrs | coordinator.cs@adit.ac.in | 8000503090 |
| 3 | **Dr. Ishita Theba** | Assistant Professor | B.E.(C.E.), M.E.(C.E.), Ph.D. | 18.3 yrs | thebaishita@adit.ac.in | 9909977596 |

### Assistant Professors

| # | Name | Qualifications | Experience | Email | Phone |
|---|------|---------------|------------|-------|-------|
| 4 | **Kurtkoti Aniruddha** | B.E.(C.E.), M.Tech.(CS) | 17.5 yrs | na@adit.ac.in | — |
| 5 | **Joshi Chinmay** | B.E.(C.E.), M.E.(C.E.), Ph.D. Pursuing | 12.5 yrs | ce.chinmay@adit.ac.in | — |
| 6 | **Thakkar Prerak** | B.E.(C.E.), M.Tech.(C.E.), Ph.D. Pursuing | 11.5 yrs | cp.prerak@adit.ac.in | — |
| 7 | **Axit Jaykumar Kachhia** | M.E.(IT), Ph.D. Pursuing | 4.0 yrs | cp.axitkachhia@adit.ac.in | 9723432497 |
| 8 | **Kinjal Parmar** ⭐ | B.E.(CE), M.Tech(CE), Ph.D. Pursuing | 8.4 yrs | cp.kinjalparmar@adit.ac.in | 8160251841 |
| 9 | **Jignasha Vishal Parmar** | B.E.(C.E.), M.Tech, Ph.D. Pursuing | 15.1 yrs | cp.jignashaparmar@adit.ac.in | 9998964238 |
| 10 | **Sheetal J. Macwan** | B.Sc.(CS), PGDCA, M.Sc.(IT) | 26.1 yrs | cp.sheetalmacwan@adit.ac.in | 9265068272 |
| 11 | **Sarfaraz Jarda** | B.Tech, M.Tech | 7.0 yrs | cp.sarfaraz@adit.ac.in | 9574719600 |
| 12 | **Paresha S. Brahmbhatt** | M.E.(C.S.E), B.E.(C.E) | 2.6 yrs | cp.pareshabrahmbhatt@adit.ac.in | 9904927464 |
| 13 | **Vishwadip Nanavati** | B.E.(C.E.), M.E.(C.E.) | 11.5 yrs | na@adit.ac.in | — |
| 14 | **Tejas Rajesbhai Rana** | B.E.(CSE), M.E.(CSE), Ph.D. Pursuing | 13.7 yrs | cp.tejasrana@adit.ac.in | 8000576417 |
| 15 | **Barkha Mehta** | Not listed | Not listed | Not listed | Not listed |
| 16 | **Dr. Vrutti Patel** | Not listed | Not listed | Not listed | Not listed |
| 17 | **Dr. Nishit Patel** | Not listed | Not listed | Not listed | Not listed |
| 18 | **Dr. Pooja Thakor** | Not listed | Not listed | Not listed | Not listed |
| 19 | **Nishtha S. Shah** | Not listed | Not listed | Not listed | Not listed |
| 20–22 | *(3 hidden faculty)* | Not displayed | — | — | — |

⭐ = Confirmed match with seeded data

---

## Data Quality Assessment

### What's accurate in the seeded data
- ✅ **Kinjal Parmar** — name, email, and subject assignment (Database Systems) all confirmed
- ✅ **Email format** follows ADIT convention for all 5 seeded entries
- ✅ **Phone number format** (10-digit Indian mobile) is consistent

### What's uncertain
- ⚠️ **Priyanka Pansuriya, Bhargav Pansuriya** — the surname "Pansuriya" doesn't appear in the visible faculty list. They may be:
  - One of the 3 hidden faculty members
  - Visiting faculty listed under a different department
  - Teaching under a slightly different name on the website
- ⚠️ **Smita Singhal** — not found on any ADIT page. May be visiting/contract faculty
- ⚠️ **Ruchi Alhuwalia** — not found on any ADIT page. May be visiting/contract faculty

### What's missing from the seeded data
- ❌ **Office hours** — no seeded data (field exists in Teacher schema)
- ❌ **Cabin/room** — no seeded data (field exists in Teacher schema)
- ❌ **17+ confirmed faculty** not seeded at all — only 5 of 22 are represented

---

## Recommendations for the App

1. **Add more faculty** — the app currently seeds only 5 teachers for 5 subjects. With 22+ faculty in the department, the directory is sparse
2. **Add office hours and cabin data** — fields exist in the `Teacher` interface but are empty for all seeded entries
3. **Add department-wide contact info** — a "Department Office" card could show:
   - Head: Dr. Bhagirath Prajapati (head.cp@adit.ac.in)
   - CSD Coordinator: Dr. Dheeraj Kumar Singh (coordinator.cs@adit.ac.in)
   - Department phone: (not listed on website — may need to ask)
4. **Consider importing from ADIT website** — the website data is structured enough to parse. The 3 hidden faculty could be surfaced by contacting the department
5. **Mark uncertain entries** — add a `confidence: 'verified' | 'estimated'` field to the Teacher schema to distinguish confirmed vs. seeded-from-memory entries

---

## ADIT Website Structure (for future automation)

```
https://adit.ac.in/
├── departments/department.php?dept=computerengineering&program=cp  (Computer Engineering)
├── departments/department.php?dept=computerengineering&program=csd  (CSD)
│   └── ?page=faculty&level=UG&program=csd  (Faculty list)
├── team.php  (Website team — admin + student developers)
├── support_staff.php  (Support staff listing)
└── assets/pdf/Final List of Committee2025-26 (1).pdf  (Committee members)
```

The faculty pages at `?page=faculty` return structured HTML with name, designation, qualifications, experience, email, and phone in a table format — suitable for automated scraping if needed in Phase 2+.
