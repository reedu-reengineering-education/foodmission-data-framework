# FoodMission — White-Hat Security Engagement Scope

**Status:** Draft v1 · **Date:** 2026-11-06 · **Owner:** Maria Zadnepryanets (m.zadnepryanets@reedu.de)

This document defines the scope, rules of engagement, and boundaries for an authorized
security assessment of the FoodMission system. Nothing in the live-testing phase is
executed without explicit per-step authorization from the engagement owner.

---

## 1. Objective

Assess, from the position of an attacker holding **only publicly available information**,
whether the FoodMission system exposes:

- Hardcoded or leaked secrets in public source code.
- A **user-existence (enumeration) oracle** that would let an attacker with a public
  participant list determine which participants hold accounts (de-anonymization risk).

The goal is to **prove or disprove the capability**, not to execute the underlying harm
on real people.

## 2. Attacker Model

- **Capabilities:** public web access only — the project website, the public GitHub
  repositories, and open-source intelligence findable online.
- **Explicitly NOT assumed:** insider access, stolen credentials, infra access beyond
  what public info yields.

## 3. In-Scope Assets

**Public information sources:**
- https://www.foodmission.eu/

**Repositories (public):**
- `foodmission-data-framework`
- `foodmission-infra`
- `foodmission-data-ui`
- `spherical-pixel/foodmission-app`

**Live target (for enumeration test only):**
- Staging environment (URL to be provided).
- Staging Keycloak, if directly reachable.

## 4. Activities

### 4.1 Secret scan — ✅ authorized, no live-system interaction
- Scan the four repositories above, **full git history** (not just HEAD).
- Tools: `gitleaks` / `trufflehog` + targeted greps.
- Findings documented **redacted** — no live secret values pasted into reports.
- Remediation: **document only** (owner handles rotation). Live secrets flagged as
  high-priority but not rotated by the tester.

### 4.2 Enumeration-oracle test — ⚠️ authorized with constraints
Prove whether login / password-reset / registration flows (NestJS API and/or Keycloak)
respond differently for an **existing** vs. **non-existing** account.

- Tested with: (a) a **known test account** we control, and (b) a **synthetic address**
  known not to exist.
- A response difference → enumeration vulnerability confirmed → "public participant list
  is exploitable for de-anonymization" is a valid, provable finding.
- **The real participant roster is NOT run through the system.** We demonstrate the oracle,
  not perform the de-anonymization.

## 5. Rules of Engagement / Boundaries (off-limits)

- ❌ No attempts against **real participant accounts** (no logins, no password attempts).
- ❌ No **real-roster lookups** / cross-referencing real people against the user base.
- ❌ No **destructive actions** (no deletion, modification of data, config changes).
- ❌ No **DoS / load / stress testing** against any live system.
- ❌ No **production** testing (staging only for live probes).
- ❌ No live secrets reproduced in reports or commits.
- ✅ Nothing in the live phase runs **without explicit per-step authorization** from the owner.
- Additional constraints (rate limits, time windows) decided as we go.

## 6. Authorization

- Engagement authorized by the project owner (to be confirmed/recorded by name).
- Tester: this session, acting under Maria's direction.

## 7. Open Items — resolve before the live phase

1. **Staging URL** + whether Keycloak is directly reachable there.
2. **Staging data nature:** synthetic/seeded vs. copy of production with real participant
   data. If real data → only known test accounts are touched; existing accounts are not
   logged into.
3. **Test accounts:** use existing known-test accounts, or create fresh ones.
4. **Owner sign-off** recorded (name + date).

## 8. Reporting Format

Each finding documented as: **finding → exploitability → impact → fix.**

---

*Scratch deliverable — not intended for commit. Move or delete as needed.*
