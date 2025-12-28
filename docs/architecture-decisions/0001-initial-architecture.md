# ADR-0001: Initial Architecture Documentation

## Status
Accepted

## Context
The project lacked comprehensive architectural documentation, leading to potential tribal knowledge silos and onboarding difficulties. The system uses a hybrid architecture (Static Frontend + PHP/Node Backend) which needs clear definition.

## Decision
Create a centralized `docs/DEVELOPMENT_MANUAL.md` covering:
1. System Architecture & Tech Stack
2. Core Modules
3. Database Schema
4. API Specifications
5. Deployment & Operations

## Consequences
- **Positive**: clear source of truth for all developers; easier onboarding; defined interface contracts.
- **Negative**: documentation requires maintenance to stay in sync with code.

## Compliance
All future changes must update `docs/DEVELOPMENT_MANUAL.md` and `project-state.yml`.
