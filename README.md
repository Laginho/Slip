# Slip

Sua lista pessoal de tarefas, sem cadastro. Escreva, envie e volte ao que estava fazendo.

**[Abrir o Slip](https://laginho.github.io/Slip/)** · **[Configurar sincronização entre dispositivos](docs/setup.md)**

## Começar a usar

1. Abra o Slip no navegador.
2. Escreva uma tarefa na barra de entrada e envie.
3. Marque a tarefa como concluída quando terminar. Ela continua disponível em **ver concluídas**.

Você pode definir um prazo e escolher entre trabalho, faculdade e afazeres. As cores indicam a urgência automaticamente. A interface está em português brasileiro.

O Slip guarda as tarefas no navegador e funciona offline após o carregamento inicial. **Não é necessário configurar Supabase para começar.** Sem sincronização, a lista fica nesse navegador: limpar os dados do site pode apagar sua única cópia.

## Instalar como aplicativo

O Slip pode ser instalado como PWA: um app aberto a partir de um ícone, sem precisar manter uma aba visível. No navegador, procure a opção de instalar o site ou adicionar à tela inicial. O nome e a disponibilidade dessa opção dependem do navegador e do dispositivo. Usar pelo navegador também funciona.

## Usar a mesma lista no celular e no computador

A sincronização é opcional. Você cria um projeto pessoal no Supabase e informa a URL e a chave publishable (ou anon) no Slip de cada dispositivo.

**[Siga o tutorial de configuração passo a passo](docs/setup.md)** — inclui preparação do banco, localização da chave, teste entre aparelhos e solução de problemas. Não exige terminal, programação nem uma cópia deste repositório.

O Slip não oferece contas nem um banco compartilhado administrado pelo autor. Cada pessoa usa seu próprio projeto. **Quem tiver a URL e a chave desse projeto poderá ler e alterar suas tarefas**; não publique esses valores. Nunca informe chaves administrativas `service_role` ou `sb_secret_` no app.

## Desenvolvimento local

Os passos abaixo são para quem deseja modificar o código ou hospedar uma versão própria.

Requisito: Node.js 22, também usado no CI.

```sh
git clone https://github.com/Laginho/Slip.git
cd Slip
npm ci
npm run dev
```

Abra o endereço exibido pelo Vite. O projeto usa React, TypeScript e Vite.

Para sincronizar no desenvolvimento, siga a preparação do banco no [tutorial](docs/setup.md). Configure a URL e a chave pela interface, ou copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Apesar do nome da variável, a chave publishable também é aceita. Não versione `.env.local`.

A configuração salva no navegador tem precedência sobre as variáveis do build. Sem uma configuração completa, o app funciona localmente.

## Validar e gerar o build

```sh
npm test
npm run lint
npx tsc -b
npm run build
```

O build fica em `dist/`. Para conferi-lo localmente:

```sh
npm run preview
```

## Hospedar uma versão própria

O GitHub Actions publica no GitHub Pages após um push em `main` ou uma execução manual do workflow. Antes de publicar, executa auditoria de dependências, testes, lint, verificação de tipos e build.

1. Faça um fork deste repositório.
2. Configure GitHub Pages para publicar usando GitHub Actions.
3. Execute o workflow de publicação e consulte o endereço informado pelo GitHub.

O caminho base e o escopo da PWA estão definidos como `/Slip/` em `vite.config.ts`. Se o nome do repositório ou o caminho de hospedagem mudar, ajuste essas configurações.

Por padrão, o build é publicado **sem credenciais**: cada pessoa configura o próprio projeto pela interface. Opcionalmente, um fork pode definir os secrets de Actions `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Esses valores serão incluídos no JavaScript público, e quem abrir essa versão poderá acessar a lista configurada. Use essa opção somente compreendendo esse modelo de acesso.

Para uma configuração guiada de desenvolvimento e publicação, execute em um terminal com Bash:

```sh
bash scripts/setup-publish.sh
```

O assistente orienta a preparação do banco e dos secrets; a habilitação do Pages é manual. Para o uso comum, prefira o [tutorial sem terminal](docs/setup.md).

## Banco e backup

[`supabase/schema.sql`](supabase/schema.sql) cria a tabela e as permissões da sincronização. O script é idempotente: pode ser executado novamente sem apagar as tarefas. Ao atualizar uma instalação existente, execute o arquivo completo para incluir também o trigger `tasks_reject_stale`, que impede gravações antigas de substituírem versões mais recentes.

Sincronização não é backup. Para forks com backup configurado, [o workflow de dump](.github/workflows/dump.yml) pode exportar a tabela `tasks` diariamente. Ele depende do secret `SUPABASE_DB_URL`; sem esse valor, não realiza o backup. Confira o histórico do workflow e os arquivos gerados para verificar se está funcionando.

Restauração com `psql`, para quem administra o banco:

```sh
psql "$SUPABASE_DB_URL" < tasks-2026-01-01.sql
```

Confira o banco de destino e o conteúdo do dump antes de restaurá-lo. A URL de conexão do banco é uma credencial administrativa e não deve ser colocada no app.

## Contribuir e entender o projeto

Leia [AGENTS.md](AGENTS.md) para o fluxo de contribuição. Tickets e especificações ficam em `.scratch/`, decisões de arquitetura em [`docs/adr/`](docs/adr/) e o vocabulário do projeto em [CONTEXT.md](CONTEXT.md).

## Licença

[MIT](LICENSE).
