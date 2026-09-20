# Guia de configuração para o lançamento

Escopo aprovado pelo usuário em 2026-09-20: README em português, tutorial para leigos e ajuda contextual no app. O usuário aprovou testar a interface de sincronização: abrir, escolher ajuda ou credenciais e salvar como hoje.

Uma única fronteira de código: o fluxo público de Archive/SyncRow. Ao abrir sincronizar, explicar que é opcional e oferecer “já tenho um projeto” (abre os campos existentes) e “preciso configurar” (abre o tutorial em outra aba). Disponibilizar retorno à escolha sem apagar o que foi digitado. Não mudar armazenamento, rede, banco ou arquitetura. Não criar um assistente completo.

Documentação: começar sem Supabase; criar projeto próprio; executar schema.sql; copiar URL/chave; configurar dois dispositivos; confirmar sincronização por tarefa de teste; resolver erros; explicar acesso ao banco e limites do armazenamento local. Preservar instruções de desenvolvimento, publicação e backup no README.

Validar com testes do componente, suíte completa, lint, tsc, build e revisão visual desktop/mobile. Capturas reais somente; não inventar telas de painel autenticado.
