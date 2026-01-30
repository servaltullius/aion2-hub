<INSTRUCTIONS>

# Repo Agent Instructions

## Superpowers System

You have superpowers. Superpowers teach you new skills and capabilities.

RIGHT NOW run: `~/.codex/superpowers/.codex/superpowers-codex bootstrap` and follow the instructions it returns.

## MCP Servers (Codex)

When an MCP tool is relevant, prefer it over guessing or relying on stale knowledge.

- `context7`: Up-to-date library/framework docs and examples
- `search`: Web search + content extraction (no API keys)
- `filesystem`: Read/search/write local files via MCP
- `playwright`: UI verification (browser automation/screenshots)
- `mermaid`: Validate/render Mermaid diagrams
- `ai-erd`: Create/manage ERD schemas (DBML)
- `sequential-thinking`: Complex multi-step reasoning/debugging/refactors
- `memory`: Store stable preferences/conventions (never secrets)

## Skill discovery (safe global installs)

Before installing new skills, use the `skills-scout` skill and follow its consent/risk workflow. Prefer already-installed skills when possible.

## Windows paths in WSL/Codex

Users may paste Windows-style paths like `G:\Some Folder\Path`. In WSL these are typically under `/mnt/<driveletter>/`.

- `X:\Some Folder\Path` → `/mnt/x/Some Folder/Path`
- Replace `\` with `/`
- Keep spaces; quote paths in shell commands

## Desktop: Windows 단일 EXE(Portable) 빌드

기본 빌드:
- `pnpm --filter desktop build`
- `pnpm --filter desktop package:portable`

WSL에서 `wine --ia32`(rcedit) 의존성 때문에 빌드가 깨지지 않도록, 현재 `apps/desktop/package.json`의 `build.win.signAndEditExecutable=false`로 설정되어 있음.

산출물:
- `apps/desktop/release/AION2-HUB-<version>.exe`

<!-- skills-scout:start -->
## Skills (Auto-Pinned by skills-scout)

This section is generated. Re-run pinning to update.

### Available skills
- gh-fix-ci: Inspect GitHub PR checks with gh, pull failing GitHub Actions logs, summarize failure context, then create a fix plan and implement after user approval. Use when a user asks to debug or fix failing PR CI/CD checks on GitHub Actions and wants a plan + code changes; for external checks (e.g., Buildkite), only report the details URL and mark them out of scope. (file: /home/kdw73/.codex/skills/gh-fix-ci/SKILL.md)
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: /home/kdw73/.codex/skills/.system/skill-creator/SKILL.md)
- gh-address-comments: Help address review/issue comments on the open GitHub PR for the current branch using gh CLI; verify gh auth first and prompt the user to authenticate if not logged in. (file: /home/kdw73/.codex/skills/gh-address-comments/SKILL.md)
- notion-knowledge-capture: Capture conversations and decisions into structured Notion pages; use when turning chats/notes into wiki entries, how-tos, decisions, or FAQs with proper linking. (file: /home/kdw73/.codex/skills/notion-knowledge-capture/SKILL.md)
- notion-research-documentation: Research across Notion and synthesize into structured documentation; use when gathering info from multiple Notion sources to produce briefs, comparisons, or reports with citations. (file: /home/kdw73/.codex/skills/notion-research-documentation/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: /home/kdw73/.codex/skills/.system/skill-installer/SKILL.md)
- skills-scout: Use when a user wants you to discover and optionally install new agent skills for a task, and you must get explicit consent before any global install into Codex. (file: /home/kdw73/.codex/skills/skills-scout/SKILL.md)
<!-- skills-scout:end -->

</INSTRUCTIONS>
