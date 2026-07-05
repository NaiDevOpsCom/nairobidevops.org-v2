# API Reference

## Overview

Single-entry PHP API at `backend/index.php`. All endpoints return JSON. Dispatched by `?action=` query parameter.

**Base URL (production):** `https://nairobidevops.org/jobs-api`

**Base URL (local dev):** `http://localhost:8000` (Vite proxies `/endpoints` → localhost:8000)

**CORS:** Allowlisted origins — `https://nairobidevops.org`, `https://staging.nairobidevops.org`, `http://localhost:5173`, `http://localhost:4000`

---

## `GET ?action=jobs` — List job listings

Paginated, filtered job listings. Featured jobs float to the top.

### Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | — | Full-text search across title, company, description |
| `role_type` | string | — | Comma-separated role types (e.g. `DevOps Engineer,SRE`) |
| `location_type` | string | — | Comma-separated: `africa_remote`, `africa_onsite`, `international_remote` |
| `africa_friendly` | int | — | `1` = Africa-friendly only |
| `source` | string | — | Comma-separated sources: `remotive`, `weworkremotely` |
| `sort` | string | `newest` | `newest` \| `closing_soon` \| `salary_desc` |
| `page` | int | `1` | Page number (1-indexed) |
| `per_page` | int | `20` | Results per page (max 100) |

### Response

```json
{
  "total": 150,
  "page": 1,
  "per_page": 20,
  "total_pages": 8,
  "last_updated": "2026-07-04 10:00:00",
  "jobs": [
    {
      "id": 1,
      "title": "Senior DevOps Engineer",
      "company": "Acme Corp",
      "company_logo_url": "https://...",
      "role_type": "DevOps Engineer",
      "location_type": "africa_remote",
      "location_detail": "Nairobi, Kenya",
      "africa_friendly": true,
      "salary_min": 5000,
      "salary_max": 8000,
      "salary_currency": "USD",
      "salary_period": "monthly",
      "experience_level": "senior",
      "tags": ["kubernetes", "terraform", "aws"],
      "apply_url": "https://...",
      "affiliate_apply_url": "https://...?via=affiliate",
      "source": "remotive",
      "posted_at": "2026-07-01 12:00:00",
      "closes_at": "2026-08-01 12:00:00",
      "days_remaining": 28,
      "is_featured": false,
      "description": "..."
    }
  ]
}
```

### Sort Behavior

| Sort | Order |
|---|---|
| `newest` (default) | `is_featured DESC, posted_at DESC` |
| `closing_soon` | `is_featured DESC, closes_at ASC` (NULLs sorted last via generated column) |
| `salary_desc` | `is_featured DESC, salary_max DESC, salary_min DESC, posted_at DESC` |

### Role Types

Values classified by `mapRoleType()`: `SRE`, `Cloud Architect`, `Security`, `Platform Engineering`, `DevOps Engineer`, `Backend Engineer`, `Frontend Engineer`, `Sysadmin`, `Uncategorised`

---

## `POST ?action=submit` — Submit a job (employer)

Creates a new job listing. Jobs from this endpoint start as `is_active=0, is_approved=0` (pending moderation).

### Request

```json
{
  "title": "DevOps Engineer",
  "company": "Acme Corp",
  "description": "We are looking for...",
  "apply_url": "https://example.com/apply",
  "source_id": "uuid-or-reference"
}
```

### Validation

| Field | Rule |
|---|---|
| `title` | Required, strip_tags + htmlspecialchars |
| `company` | Required, strip_tags + htmlspecialchars |
| `apply_url` | Required, must have http/https scheme, valid URL |
| `description` | Optional, strip_tags + htmlspecialchars |
| `source_id` | Required (for deduplication) |

### Response

```json
{
  "success": true,
  "id": 42
}
```

Status: `201 Created` on success, `400 Bad Request` on validation failure.

---

## `POST ?action=track` — Track job click

Records a click for affiliate revenue reporting.

### Request

```json
{
  "job_id": 1
}
```

### Validation

| Field | Rule |
|---|---|
| `job_id` | Required, must be positive int, must reference active job |

### Response

```json
{
  "success": true
}
```

Status: `200 OK`, `400` if missing/invalid, `404` if job not found or inactive.

---

## Error Responses

All errors return:

```json
{
  "error": "Human-readable error message"
}
```

| Status | Meaning |
|---|---|
| `400` | Validation failure |
| `404` | Unknown action or resource not found |
| `405` | Wrong HTTP method |
| `500` | Database or server error |

---

## Frontend Client Routes

| Path | Page | Component |
|---|---|---|
| `/` | Home | `Home` |
| `/about` | About Us | `AboutUs` |
| `/events` | Events | `Eventspage` |
| `/faqpage` | FAQ | `FAQPage` |
| `/community` | Community | `CommunityPage` |
| `/partners` | Partners | `PartnershipPage` |
| `/blogs` | Blog List | `BlogPage` |
| `/blogs/:slug` | Blog Detail | `BlogDetail` |
| `/donate` | Donate | `DonationPage` |
| `/jobs` | Jobs Board | `Jobs` |
| `/code-of-conduct` | Code of Conduct | `CodeOfConduct` |
| `/terms` | Terms | `TermsAndConditions` |
| `/privacy` | Privacy | `PrivacyPolicy` |
| `*` | 404 | `NotFound` |

## Vite Dev Proxy

| Prefix | Target | Purpose |
|---|---|---|
| `/endpoints` | `http://localhost:8000` | PHP API during dev |
| `/api/luma` | `https://api.luma.com` | Luma events API proxy |
| `/api` | `https://nairobidevops.org` | Production API proxy |
