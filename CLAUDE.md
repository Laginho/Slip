# Diretrizes gerais do projeto

Para um ticket de implementação, leia `docs/agents/orchestration.md` para escolher o
fluxo aplicável e executar os gates do repositório. Solo TDD com revisão entre modelos é o
fluxo padrão; use PTMR apenas quando o usuário pedir um ciclo orquestrado. Ao usar PTMR,
leia também `.agents/skills/ptmr/SKILL.md` para o loop e os contratos de papel.

## Onde o trabalho é rastreado

Issues locais em `.scratch/<feature-slug>/` (convenção completa em `docs/agents/issue-tracker.md`): `spec.md` (a spec da feature), `issues/NN-slug.md`
(um ticket por arquivo, linha `**Status:**` no topo com os rótulos de
`docs/agents/triage-labels.md` mais `complete`) e, nas features
tocadas pelo PTMR, `ledger.md` (um registro por ciclo, escrito só pelo master — ver
`docs/agents/orchestration.md`). Trabalho aberto = tickets sem `complete`/`wontfix`. Histórico
de fechamento = `git log -- .scratch/`.
