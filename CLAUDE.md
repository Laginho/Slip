# Diretrizes gerais do projeto

Antes de tocar no repo, leia `docs/agents/orchestration.md`: gates (testes, typecheck,
build), branches e as especificidades do código que nenhum teste adivinha.

Commits e PRs seguem Conventional Commits e referenciam o ID do ticket no assunto
(`feat(pill): ... (SLIP-31)`).

## Onde o trabalho é rastreado

Issues locais em `.scratch/<feature-slug>/` (convenção completa em `docs/agents/issue-tracker.md`):
`spec.md` (a spec da feature) e `issues/SLIP-<N>-slug.md` (um ticket por arquivo, com ID único no
repo inteiro; linhas `**Status:**` e `**Type:**` no topo, com os rótulos de
`docs/agents/triage-labels.md` mais `complete`). Trabalho aberto = tickets sem
`complete`/`wontfix`. Histórico de fechamento = `git log -- .scratch/`.
