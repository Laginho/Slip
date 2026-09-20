# SLIP-46: Documentação de uso e entrada de ajuda na sincronização

**Status:** claimed
**Type:** feat

## Contrato

Implementar o escopo de ../spec.md, aprovado nesta conversa. Uma fronteira: interação pública com Archive/SyncRow.

## Aceitação

- README em português com uso imediato e link para tutorial.
- Tutorial para leigos cobrindo configuração, segundo dispositivo, verificação e problemas comuns.
- Sincronizar apresenta explicação e escolhas; campos aparecem em “já tenho um projeto”.
- “preciso configurar” leva ao tutorial em nova aba, sem perder a lista.
- Retorno às escolhas preserva os campos; validação e salvamento existentes continuam funcionando.
- Sem alterações na rede, no banco ou no modelo de acesso.

## Validação

Teste vermelho do novo fluxo visível; regressões de salvamento adaptadas antes do commit de testes. Depois, implementação sem editar testes. Gates: npm test, npm run lint, npx tsc -b, npm run build. Revisão visual em 1280px e 390px.

## Comments

- 2026-09-20: usuário autorizou o pacote de documentação e ajuda no app e confirmou o escopo dos testes. Implementação em claude/setup-guide.
