# GEMINI.md
## Referral API – AI Development Context

This document provides **project context for AI coding assistants (Google Gemini, Claude, Copilot, ChatGPT)** to correctly understand the architecture, coding standards, and development workflow of the **Referral API**.

AI tools must follow the rules in this document when generating code for this project.

---

# 1. Project Overview

The **Referral API** is a backend system used to manage **veterinary referral cases** between private clinics and **Chiang Mai University Veterinary Hospital (CMU Vet Hospital)**.

The system handles:

- Referral case management
- Veterinary appointment scheduling
- Medical record tracking
- File uploads (XRAY, LAB, PHOTO, etc.)
- Administrative case management
- Notification services
- Secure API authentication

The system is designed for **performance, security, and reliability**.

---

# 2. Technology Stack

| Layer | Technology |
|------|------------|
Runtime | Bun
Framework | ElysiaJS
Language | TypeScript
ORM | Prisma
Database | PostgreSQL
Authentication | JWT (`@elysiajs/jwt`)
API Documentation | Swagger (`@elysiajs/swagger`)
Messaging | Telegram Bot (`grammy`)
Email | Nodemailer
File Storage | Local Storage

---

# 3. Runtime Environment

This project runs on **Bun runtime**.

Important:

AI must generate code compatible with **Bun**, not Node-specific APIs.

Example command:

```bash
bun run dev