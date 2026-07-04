# Prompts

Reusable prompt templates for consistent AI-assisted development on the NDC project.

## Categories

| Template | Use Case |
|---|---|
| `code-review` | Review a PR or changeset against project standards |
| `feature-planning` | Plan a new feature end-to-end (spec → implementation → test) |
| `bug-analysis` | Diagnose and fix a reported bug |
| `deployment-check` | Verify readiness before staging/production deploy |
| `security-review` | Audit a changeset for security issues |

## Usage

Copy the raw markdown of the relevant template into your AI tool prompt. Fill in the `{{placeholders}}` with project-specific details.

All prompts reference `.ai/standards/`, `.ai/coding-rules/`, and `.ai/knowledge/` files — ensure those are included in context or attached to the conversation.
