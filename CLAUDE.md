# Diretrizes gerais do projeto

Antes de tocar no repo, leia `docs/agents/orchestration.md`: gates (testes, typecheck,
build), branches e as especificidades do código que nenhum teste adivinha.

O fluxo de trabalho — um ticket por vez, três etapas disparadas à mão — está na
tabela em `AGENTS.md`; o detalhe de cada etapa neste repo está em `orchestration.md`.

Commits e PRs seguem Conventional Commits e referenciam o ID do ticket no assunto
(`feat(pill): ... (SLIP-31)`).

## Onde o trabalho é rastreado

Issues locais em `.scratch/<feature-slug>/` (convenção completa em `docs/agents/issue-tracker.md`):
`spec.md` (a spec da feature) e `issues/SLIP-<N>-slug.md` (um ticket por arquivo, com ID único no
repo inteiro; linhas `**Status:**` e `**Type:**` no topo, com os rótulos de
`docs/agents/triage-labels.md` mais `complete`). Trabalho aberto = tickets sem
`complete`/`wontfix`. Histórico de fechamento = `git log -- .scratch/`.
