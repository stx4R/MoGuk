# Handoff: MoGuk × Spotify (Toss Font) Redesign

## Overview
A full visual + interaction redesign of the **제3회 오량모의국회 전자투표 플랫폼** (MoGuk) web app, restyled in a **Spotify-inspired dark theme** using the **Spoqa Han Sans Neo** (Toss) typeface. Covers 5 surfaces: Main (landing + about), Login, Vote, Admin Dashboard, and a Fallback (404) page that replaces the retired About/Chat/Help routes.

The target codebase is the existing **MoGuk Next.js 15 (App Router) + React + Supabase + Tailwind v4** project.

## About the Design Files
The files in this bundle are **design references created in plain HTML/CSS/JS** — prototypes showing the intended look, motion, and behavior. They are **not** production code to copy verbatim.

Your task in Claude Code is to **recreate these designs inside the existing MoGuk Next.js app**, using its established patterns: App Router pages under `app/`, client components (`'use client'`), Tailwind v4 utility classes / the `@theme` tokens in `app/globals.css`, `framer-motion` (already a dependency, used heavily on the current About page), `lucide-react` for icons, `next/image`, and Supabase for real data. Port the *design*, wire it to the *real* logic that already exists in the repo.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, shadows, and interactions are all specified. Recreate the UI pixel-accurately, but swap the prototype's vanilla JS/`lucide@latest` CDN for the repo's React + `lucide-react` + Supabase equivalents.

---

## Design Tokens

Port these into `app/globals.css` `@theme` (Tailwind v4). The full source is in `styles.css` + `tokens/` in this bundle.

### Color
| Token | Value | Role |
|---|---|---|
| `--green` | `#1ed760` | Primary CTA, active state, **찬성** |
| `--green-border` | `#1db954` | Green hover/border |
| `--bg-base` | `#121212` | Page background (Level 0) |
| `--surface` | `#181818` | Cards, panels (Level 1) |
| `--surface-2` | `#1f1f1f` | Inputs, buttons, interactive surfaces |
| `--surface-card` | `#252525` | Elevated card / hover |
| `--surface-hover` | `#2a2a2a` | Row/card hover |
| `--text-base` | `#ffffff` | Primary text |
| `--text-near-white` | `#cbcbcb` | Brighter secondary |
| `--text-secondary` | `#b3b3b3` | Muted labels, inactive nav |
| `--no` / negative | `#f3727f` | **반대 / 보수**, errors |
| `--jinbo` / announcement | `#539df5` | **진보**, info |
| `--abstain` / `--jungdo` | `#8a8a8a` / `#b3b3b3` | **기권 / 중도** |
| `--warning` | `#ffa42b` | Mod/warning, admin calls |
| `--hairline` | `rgba(255,255,255,0.07)` | Default border |
| `--hairline-strong` | `rgba(255,255,255,0.12)` | Stronger border |

**Vote/party semantics on the dark base:** 찬성=green, 반대=red, 기권=gray; 진보=blue, 보수=red, 중도=gray. Green is otherwise functional-only (never decorative).

### Typography — Spoqa Han Sans Neo
Family stack: `"Spoqa Han Sans Neo", "Helvetica Neue", helvetica, arial, sans-serif`. Weights shipped: 100/300/400/500/700. Hierarchy is **weight-driven** (700 vs 400; 600 sparingly), compact 10–24px scale.
- Section title: 24–38px / 700–800, `letter-spacing: -0.02em`
- Feature heading: 18px / 600
- Body: 16px / 400 · Caption & nav: 14px · Small: 12px · Micro: 10px
- Button labels: 14px / 700, `letter-spacing: 0.14px`; uppercase variant adds `1.4px` tracking
- Font files: `assets/fonts/SpoqaHanSansNeo-*.ttf` (declare via `@font-face` — see `tokens/fonts.css`)

### Radius
`4px` (sm/inputs) · `6px` (album/card art) · `8px–16px` (cards, panels) · `500px`/`9999px` (pills — all buttons) · `50%` (circular: play, avatars, dots). **Never square buttons.**

### Shadow / Elevation
- Card: `rgba(0,0,0,0.3) 0 8px 8px`
- Dialog/menu: `rgba(0,0,0,0.5) 0 8px 24px`
- Input inset border: `rgb(18,18,18) 0 1px 0, rgb(124,124,124) 0 0 0 1px inset` → on focus, `#fff 0 0 0 1px inset`

### Spacing
8px base; granular scale 1/2/4/6/8/10/12/14/16/20/24/32/40/48px. Dense layouts (Spotify packs content tightly).

### Motion
`cubic-bezier(0.3,0,0,1)` standard, `cubic-bezier(0.16,1,0.3,1)` ease-out. Durations 100/200/300ms. Hover: surfaces lighten, silver text → white, pills scale ~1.03; press: circular controls scale ~0.94. No bounces on content, no infinite decorative loops.

---

## Screens / Views

### 1. Main (`app/page.tsx`) — file: `main.html`
**Purpose:** Landing page with the About content folded in (scroll down).
**Layout:** Sticky translucent header (blur) → full-viewport hero → stat band → club marquee → About sections (overview, timeline, committees, parties, process, contact) → footer.
- **Header** (64px): brand (green disc + white logo + "오량모의국회"), right nav (홈/소개/투표/대시보드 + green 로그인 pill). ≤560px: collapses to a hamburger that opens a stacked menu.
- **Hero:** centered; eyebrow badge, `clamp(44px,9vw,104px)` title "제 3회 오량 **모의국회**" (모의국회 in green), subtitle "보이지 않는 곳에서 / 보이는 것을 위하여", two CTAs (green "안건 투표하기", outlined "프로그램 안내"), bobbing scroll cue. Blurred green/blue radial glows behind.
- **Stat band:** 4 count-up stats (총 참가자 100명 · 부처 9개 · 운영진 36명 · 활동 기간 58일). Animate on scroll into view (cubic ease-out, ~1.4s). 2-col on phone.
- **Club marquee:** infinite horizontal scroll of 12 club logos (`assets/clubs/*.png`), grayscale+inverted at 0.55 opacity → full opacity on hover, edge fade masks. Duplicate the list for a seamless 38s loop.
- **Timeline:** center-spine alternating cards (5 events). Phone: spine shifts left, all cards single-column.
- **Committees:** 9 cards (상임위원장 + 평가위원 per dept), hover raises + green border. 3-col → 1-col.
- **Parties:** 3 cards (진보 40 / 보수 40 / 중도 50), colored top-border + dot per party.
- **Process:** 4 numbered steps (green circles). Phone: horizontal num+text rows.
- **Contact:** giant "stx**4**R" wordmark (links to https://stx4r.me), email/phone links, Instagram/Discord/Telegram social buttons.
- **Reveal:** sections fade+rise 24px on scroll (IntersectionObserver, threshold 0.12).

### 2. Login (`app/login/page.tsx`) — file: `login.html`
**Purpose:** Member auth with playful feedback. **50:50 split** (left mascot stage / right form); phone stacks (stage on top, ~300px).
- **Mascot stage:** concentric faint rings + radial green/blue glows; 4 floating "blob" characters (green, tall dark, pink, gray-bird) with eyes/pupils/mouth. Below: green logo disc + "오량모의국회".
- **Mascot reactions (key interaction):**
  - Email focus/typing → pupils look right (toward form): `.look-form`
  - Password focus → eyes squint shut + blush: `.hide`; show-password toggle → eyes reopen: `.peek`
  - **Error** → container shake (0.45s) + frown + pupils down: `.sad`
  - **Success** → blobs jump, eyes become happy arcs: `.happy`
- **Form:** back-to-home link, "다시 오신 걸 환영해요", pill inputs with inset shadow (focus → white inset border), show/hide password eye toggle, remember + forgot row, green submit, "또는" divider, Google outlined button, signup link.
- **Error state:** red error banner ("이메일 또는 비밀번호가 올바르지 않습니다."), inputs get red inset border, form shakes.
- **Success state:** full-screen blurred overlay with a popping green circle + drawn checkmark (stroke-dashoffset animation) + "환영합니다, 의원님!" then redirect.
- *(The prototype has demo "오류 보기 / 성공 보기" buttons — remove these; wire real states to Supabase auth success/failure.)*

### 3. Vote (`app/vote/page.tsx`) — file: `vote.html`
**Purpose:** Cast 찬성/반대/기권 on agendas; mobile-first.
**Layout:** 2-col — sticky agenda list (300px) + detail. Phone: horizontal agenda **chip scroller** + stacked detail.
- **Agenda list item:** title + status sub ("투표 진행 중" / "대기 중" / "투표 완료") + status dot (green pulsing if open). Selected = green tint + green title.
- **Detail:** status pill (pulsing dot if live), title, green accent bar, description (left green border, pre-line), then the vote area.
- **Vote choices:** 3 cards (찬성 green / 반대 red / 기권 gray) with icon; hover raises + colors border/text to the choice's hue. Phone: single column rows.
- **After voting:** replace choices with a confirmed state (green check disc + "투표가 완료되었습니다" + the chosen label in its color). "제출 후 변경할 수 없습니다."
- **Not-open agenda:** clock icon + "투표가 아직 시작되지 않았습니다."

### 4. Admin Dashboard (`app/admin-dashboard/page.tsx`) — file: `dashboard.html`
**Purpose:** Operators manage votes, watch results, see who's online, run staff chat. **Admin = full; Mod = limited** (preserve the existing role logic).
**Layout (desktop):** 3-column on black with 8px gutters — nav rail (230px) / main / right panel (340px). Phone: single column + bottom tab bar (투표 관리 / 접속자·채팅), with hamburger-style view switching.
- **Nav rail:** brand, items (투표 관리 active, 스태프 채팅, 접속자, 버그 제보 ·red count badge·, 공지, 로그아웃), and a "me" footer (avatar + name + red "Admin" role).
- **Main — 투표 관리:** header + green "새 투표" button → **create modal** (title + details, required). 3 KPI tiles (진행 중 안건 / 총 투표 수 / 평균 참여율). Agenda cards each show: title, state pill (진행 중 green / 대기 / 완료 blue), action icon-buttons (open-close toggle, results, complete), and three live result bars (찬성/반대/기권 with count + %), plus "참여 N명 / 100명 · %". Toggle/complete actions raise a **confirm modal** (warning icon, irreversible note). Results action → **results modal** with overall turnout + per-choice bars.
- **Right panel — tabs:** 접속자 / 스태프 채팅.
  - *접속자:* an admin-call card (warning-tinted: "김도엽 호출" + 참가 button), then users grouped Admin(red)/Mod(orange)/User(green), each row = colored dot + name + party tag (진보/보수/중도/무소속).
  - *스태프 채팅:* "관리자 전용 채널", message list (name colored by role, time, CMD tag for commands, command messages styled monospace/orange), input with **`/` command autocomplete popover** (`/kick`,`/ban`,`/timeout`,`/announcement`,`/voteresult` with arg hints) + green circular send.
- This is a *fresh* Spotify-style layout but must keep **all original dashboard techniques**: create/open/close/complete votes, live result bars + turnout, role-gated views, online users by role+party, staff chat with slash-commands, admin calls, bug-report count.

### 5. Fallback / 404 (`app/about`, `app/chat`, `app/help` → all render this) — file: `fallback.html`
**Purpose:** Replace the retired About/Chat/Help routes. Centered.
- "Stopped record" motif (spinning disc paused, needle lifted, red label) + "재생 중지됨" badge. **Replaceable with a GIF/MOV** (see Assets).
- Big "4**0**4" (middle 0 in red), "not Found", then exact copy: **"해당 페이지는 제 3회 오량모의국회 웹 운영진들의 회의 결과에 따라 서비스가 종료되었음을 알려드립니다."**
- Two buttons: green **"이전 페이지로"** (`history.back()`) + outlined "홈으로".
- In Next.js: either make `app/about|chat|help/page.tsx` render this component, or use route-level `not-found.tsx`. **Do not add nav links to these routes** (the design intentionally omits them).

### Footer (global component) — in `main.html`
4 columns: brand + lead ("본 웹앱은 제 3회 오량모의국회 전자투표 플랫폼입니다.") · **서비스** (주요 기능 / 시작하기 / 둘러보기) · **지원** (문의 이메일 / 자주 묻는 질문 / 오류 제보) · **정책** (이용약관 / 개인정보 처리방침 / 운영정책). Bottom row: "© 2026 김윤철 팬클럽 및 제 3회 오량모의국회 전자투표 플랫폼" + "대표 **stx4R** · 크루 kmc11004, heejae0105". The **stx4R** name links to `https://github.com/stx4R`. All topic/subtopic links are currently `#` stubs — wire real destinations later.

---

## Interactions & Behavior (summary)
- **Responsive:** every page adapts at ~560px (phone) vs wider (iPad-landscape / desktop). Header → hamburger; multi-column → single; dashboard → bottom tab bar; vote sidebar → chip scroller.
- **Animations:** scroll reveal (fade+rise), stat count-up, marquee loop, login mascot states + success checkmark draw, hover lighten/scale, press scale-down. Respect `prefers-reduced-motion` when porting.
- **State (wire to Supabase / existing logic):** auth (login error/success), agenda list + per-user vote (one-time, immutable), admin vote CRUD + open/close/complete, online presence by role+party, staff chat messages + slash-commands, admin calls, bug reports.

## Assets (included in `assets/`)
- `assets/fonts/SpoqaHanSansNeo-{Thin,Light,Regular,Medium,Bold}.ttf` — the typeface (already in the repo's `public/`; reuse those).
- `assets/clubs/*.png` — 12 club logos (from repo `public/clubs/`).
- `assets/moguk_logo.svg` — emblem (monochrome; render white via `filter: brightness(0) invert(1)` on dark, or black-on-green for the brand disc). From repo `public/moguk_logo.svg`.
- **Icons:** prototype uses `lucide@latest` via CDN → use **`lucide-react`** in the app (already a dependency). Icon names referenced: scale, gavel, scroll-text, chevron-down, menu, mail, phone, instagram, message-circle, send, arrow-left, alert-circle, eye/eye-off, log-in, clock, check-circle-2, x-circle, minus-circle, bar-chart-2, message-square, users, bug, megaphone, log-out, plus, vote, x, alert-triangle, eye, pause, play, shield, bell, circle-slash, home, smartphone, tablet.
- **To-create (optional, replacing CSS placeholders):**
  - *Fallback art:* GIF/MOV ~400×400, transparent or #121212 bg — a record that spins then halts with the needle lifting, muted-red (#f3727f) label, ~4s loop, calm.
  - *Login mascots:* transparent GIF/MOV ~520×260 on dark bg — 3–4 cute characters with idle / eyes-covered / celebrate states. (CSS version works fine without this.)

## Files in this bundle
- `main.html`, `login.html`, `vote.html`, `dashboard.html`, `fallback.html` — the 5 design references.
- `index.html` — device gallery (iPhone-portrait + iPad-landscape frames). View through a server/preview; it loads the others via iframe.
- `moguk.css` — shared app styling (header, footer, buttons, chips, badges, cards, responsive rules) built on the tokens.
- `styles.css` + `tokens/*.css` — the design-system token + `@font-face` source. Port into `app/globals.css`.
- `assets/` — fonts, club logos, logo SVG.

## How to use in Claude Code
1. Unzip this folder into your MoGuk repo (e.g. `design_handoff_moguk_redesign/` at the repo root).
2. In Claude Code: *"Read `design_handoff_moguk_redesign/README.md` and the HTML files, then reimplement these designs in our Next.js app — port tokens into `app/globals.css`, rebuild each `app/**/page.tsx` to match, keep all existing Supabase logic and the Admin/Mod role rules, and use `lucide-react` + `framer-motion`."*
3. Have it start with the tokens + shared layout (header/footer), then one page at a time. Open each HTML file in a browser alongside to compare.
