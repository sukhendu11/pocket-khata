
# CHANGELOG

All notable changes to Pocket Khata are documented here.

This file is structured for:
- searchability
- categorization
- agent-readable consistency

---

# 🧠 CHANGELOG STRUCTURE RULE

All entries MUST follow:

[TYPE] [CATEGORY] — Title

DETAILS:
- Change:
- Reason:
- Files:
- Result:

TAGS:
#tag1 #tag2 #tag3

---

# 🏷️ TYPES

- FIX      → bug fixes
- FEATURE  → new functionality
- UI       → UI/UX changes
- REFACTOR → internal improvements (no behavior change)
- PERF     → performance improvements
- TEST     → test changes
- BUILD    → build / APK / tooling changes

---

# 📂 CATEGORIES

- NOTIFICATION
- ANALYTICS
- SETTINGS
- DATA
- CORE
- BUILD
- UI
- TRANSACTION
- ACCOUNT

---

# 🚀 CHANGELOG ENTRIES

---

## [BUILD] [CORE] — Production Hardening + System Upgrade

DETAILS:
- Change: Removed auto-seeding, added backups, export/import, PDF reporting
- Reason: Improve production stability and data safety
- Files: db.js, backup system, export modules
- Result: App now fully production-safe with migration system

TAGS:
#core #build #data-safety #production

---

## [FEATURE] [ANALYTICS] — Advanced Financial Analytics Dashboard

DETAILS:
- Change: Added analytics charts (income/expense breakdown, categories)
- Reason: Improve financial visibility for users
- Files: AnalyticsView.jsx, chart components
- Result: Users can visualize spending patterns

TAGS:
#analytics #charts #finance

---

## [FEATURE] [ACCOUNT] — Multi-Account System

DETAILS:
- Change: Added Bank, Cash, bKash, Nagad account support
- Reason: Support real-world financial tracking
- Files: AccountManager.jsx, db.js
- Result: Multi-wallet tracking enabled

TAGS:
#accounts #wallets #finance

---

## [FEATURE] [SETTINGS] — Settings System + i18n Support

DETAILS:
- Change: Added settings page with theme + language toggle
- Reason: Improve user personalization
- Files: Settings.jsx, i18n.js
- Result: English + Bangla support added

TAGS:
#settings #i18n #ui

---

## [FIX] [SETTINGS] — Settings Page Scroll Clipping Issue

DETAILS:
- Change: Fixed overflow and layout issue causing hidden sections
- Reason: Data Portability section not visible on small screens
- Files: Settings.jsx, layout styles
- Result: Full scroll restored

TAGS:
#ui #scroll #settings #bugfix

---

## [FIX] [ANALYTICS] — Pie Chart Label Overlap + Animation Bug

DETAILS:
- Change: Fixed overlapping slices and broken percentage rendering
- Reason: UI readability issues in charts
- Files: PieChart components
- Result: Smooth animations + correct label positioning

TAGS:
#charts #analytics #ui #bugfix

---

## [FEATURE] [NOTIFICATION] — Notification System Integration

DETAILS:
- Change: Added notification toggle + native Android integration
- Reason: Enable reminders and alerts
- Files: notifications.js, Settings.jsx
- Result: Notification system enabled

TAGS:
#notifications #android #reminders

---

# 🔚 END OF CHANGELOG