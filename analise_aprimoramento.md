> # Revisão Técnica do Sistema de Ponto — Avaliação Completa
> > **Projeto avaliado:** `sistema-ponto-estagiarios`
> > **Stack:** Backend .NET 9 + LocalDB · Frontend React 19 + Vite + Tailwind
> > **Data da revisão:** 18 de maio de 2026
> > **Revisor:** João Ramos (SUBG-Rio)
> 
> ## Sumário executivo
> Foi realizada uma varredura completa do código-fonte do projeto, abrangendo backend (`Controllers`, `Models`, `Data`, `Migrations`, `Program.cs`), frontend (`pages`, `App.tsx`, `vite.config.ts`, `package.json`) e configurações.
> 
> O projeto demonstra **boa intuição de UI/UX** (frontend bem cuidado, identidade visual coerente) e **noção básica de hash de senha** (uso correto do `PasswordHasher<T>` do ASP.NET Identity, com tratamento do caso `SuccessRehashNeeded`). Entretanto, apresenta **problemas graves de segurança, modelagem de dados, lógica de negócio e arquitetura** que precisam ser endereçados antes de qualquer uso em ambiente produtivo.
> 
> ### Distribuição por severidade
> Severidade	Quantidade	Significado
> **P0** (crítico)	10	Bloqueia qualquer deploy. Resolver antes de tudo.
> **P1** (alto)	18	Necessário para qualidade de produção.
> **P2** (melhoria)	22+	Polimento e otimização para iterações seguintes.
> **Pontos OK**	8	Práticas corretas que devem ser mantidas.
> ### Como ler este documento
> * Cada problema está identificado por código (ex.: `1.1`, `2.3`), severidade entre colchetes e arquivo/linha afetados.
> * Os capítulos estão em seções recolhíveis (`<details>`) para facilitar a navegação.
> * O plano de execução priorizado está ao final como **task list** (`- [ ]`), pronto para ser convertido em sub-issues.
> 
> ## 1. Problemas críticos de segurança
> > Esta seção concentra os problemas que devem ser corrigidos antes de qualquer deploy. Combinados, escancaram a API e permitem que qualquer usuário não-autenticado manipule cadastros e pontos de outros usuários.
> 
> Ver os 8 problemas de segurança
> ### `1.1` `[P0]` API sem autenticação nem autorização
> **Arquivos:** `backend/Controllers/AcademicosController.cs`, `backend/Controllers/RegistrosPontoController.cs`
> 
> Nenhum endpoint possui `[Authorize]`. Qualquer usuário sem login pode:
> 
> * `POST /academicos` — cadastrar admin (`ehAdmin: true`)
> * `DELETE /academicos/{id}` — excluir (soft-delete) qualquer usuário
> * `POST /registros-ponto/entrada/{academicoId}` — bater ponto para qualquer estagiário (basta saber o ID)
> * `GET /registros-ponto` — listar todos os pontos de todos, incluindo e-mails
> 
> Não existe JWT, cookie de sessão ou qualquer mecanismo. O login apenas devolve o objeto do usuário em JSON e o frontend confia em `localStorage.usuario.ehAdmin` — qualquer pessoa abre o DevTools e edita.
> 
> **Correção:** Emitir JWT no login. Decorar endpoints com `[Authorize]` e `[Authorize(Roles="Admin")]` conforme o caso. `RegistrosPonto` deve usar o `sub` do token e não receber `academicoId` na rota.
> 
> ### `1.2` `[P0]` CORS aberto para qualquer origem
> **Arquivo:** `backend/Program.cs:17`
> 
> policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
> A política aceita requisições de qualquer site. Combinado com `1.1`, qualquer página maliciosa pode invocar a API em nome do usuário.
> 
> **Correção:** Configurar lista explícita de origens permitidas (DEV e PROD) via `WithOrigins(...)`. Limitar métodos e headers ao necessário.
> 
> ### `1.3` `[P0]` Primeiro acesso redefine senha sem autenticação real
> **Arquivo:** `backend/Controllers/AcademicosController.cs:166-214`
> 
> Para definir a senha basta saber **email + matrícula**. Ambos são previsíveis em ambiente público. Não há token de convite, link de e-mail nem qualquer prova de posse. Um colega que saiba a matrícula de outro pode criar a senha no lugar dele e usar a conta.
> 
> **Correção:** Enviar token de primeiro acesso por e-mail institucional (ex.: link com GUID de uso único e expiração de 24h). Validar o token, não a tripla email+matrícula.
> 
> ### `1.4` `[P0]` Sem rate limiting / sem bloqueio de brute force
> **Arquivo:** `backend/Controllers/AcademicosController.cs` (endpoint de login)
> 
> O endpoint de login aceita tentativas infinitas, sem captcha nem lockout. Ataques de força bruta são triviais.
> 
> **Correção:** Configurar `AddRateLimiter` (built-in do .NET 9). Adicionar contagem de tentativas falhadas no banco e lockout temporário após N falhas.
> 
> ### `1.5` `[P1]` `PasswordHasher` instanciado manualmente, fora do DI
> **Arquivo:** `backend/Controllers/AcademicosController.cs:13`
> 
> private readonly PasswordHasher<Academico> _passwordHasher = new();
> Funciona, mas viola injeção de dependência e dificulta testes e troca de implementação.
> 
> **Correção:** Registrar no DI: `services.AddSingleton<IPasswordHasher<Academico>, PasswordHasher<Academico>>();` e injetar a interface no construtor.
> 
> ### `1.6` `[P0]` Comparação de senha em texto puro como fallback
> **Arquivo:** `backend/Controllers/AcademicosController.cs:216-238`
> 
> if (academico.Senha == senhaInformada)
>     return PasswordVerificationResult.SuccessRehashNeeded;
> Senhas em texto puro são aceitas se existirem no banco — um vetor perigoso de regressão. Pior: comparação `==` em string é vulnerável a timing attack.
> 
> **Correção:** Remover o fallback de texto puro. Toda senha existente deve estar hasheada (rodar uma migration que hasheia registros legados). Para comparação de hash a própria `VerifyHashedPassword` é segura.
> 
> ### `1.8` `[P1]` Mensagens de erro vazam existência de usuário
> **Arquivo:** `backend/Controllers/AcademicosController.cs:127,132`
> 
> O HTTP `403 "Primeiro acesso pendente"` confirma que o e-mail existe no sistema. Login deve sempre devolver mensagem genérica para não facilitar enumeração.
> 
> **Correção:** Unificar respostas de falha de login com mensagem única (`"Email ou senha inválidos"`). O fluxo de primeiro acesso pode ser disparado por outra via.
> 
> ### `1.9` `[P2]` Connection string em `appsettings.json` versionado
> **Arquivo:** `backend/appsettings.json`
> 
> Atualmente é LocalDB, sem credenciais reais. Em produção vira problema rapidamente.
> 
> **Correção:** Usar User Secrets em DEV e variáveis de ambiente em PROD (mesma estratégia do projeto principal).
> 
> ## 2. Bugs de lógica e regra de negócio
> > Problemas que aparecem em uso normal e impactam a integridade dos dados de ponto. Vários são silenciosos (não quebram a UI, mas calculam ou exibem informação errada).
> 
> Ver os 12 bugs de lógica
> ### `2.1` `[P1]` Limite "2 entradas e 2 saídas" inconsistente e dead code
> **Arquivo:** `backend/Controllers/RegistrosPontoController.cs:64-122`
> 
> `RegistrarEntrada` conta registros e bloqueia em 2, mas a mensagem fala em "2 entradas e 2 saídas" — o que confunde. Em `RegistrarSaida` o teste `saidasHoje >= 2` nunca dispara, pois a entrada já teria bloqueado antes.
> 
> **Correção:** Padronizar: máximo de 2 registros por dia (dois expedientes). Mensagem clara e remover validação morta de saídas.
> 
> ### `2.2` `[P1]` Comparação `r.Data == hoje` frágil
> **Arquivo:** `backend/Controllers/RegistrosPontoController.cs:65,75,113`
> 
> A coluna `Data` é `datetime2`. Se algum fluxo gravar `DateTime.Now` (sem `.Date`), a comparação `r.Data == hoje` falha silenciosamente.
> 
> **Correção:** Usar `r.Data.Date == hoje` ou intervalo `(r.Data >= hoje && r.Data < hoje.AddDays(1))`. Idealmente mudar o tipo da coluna para `DateOnly` e remover redundância com `HoraEntrada`.
> 
> ### `2.3` `[P2]` Validação "data inicial < data final" impede relatório de um dia
> **Arquivos:** `frontend/src/pages/AcademicoDashboard.tsx:245`, `AdminDashBoard.tsx:436`
> 
> `inicio` = `00:00:00` e `fim` = `23:59:59` do mesmo dia. Selecionar o mesmo dia inicial e final passa na validação, mas a mensagem fala "menor que" — lógica contraditória.
> 
> **Correção:** Trocar para `if (inicio > fim)`. Permitir relatório de um único dia.
> 
> ### `2.4` `[P1]` `obterStatusAtual` quebra com 2 expedientes
> **Arquivo:** `frontend/src/pages/AcademicoDashboard.tsx:371-389`
> 
> Considera "Expediente encerrado" qualquer registro fechado no dia. Estagiário com 2 expedientes diários (manhã+tarde) vê "encerrado" após a manhã, mesmo precisando bater ponto à tarde.
> 
> **Correção:** Comparar quantidade de registros fechados com o limite configurado, ou levar em conta as faixas horárias esperadas.
> 
> ### `2.5` `[P2]` Status "Atrasado" nunca aparece se já bateu ponto
> **Arquivo:** `frontend/src/pages/AcademicoDashboard.tsx:377-389`
> 
> A flag de "Atrasado" só é avaliada quando `registrosDoExpediente.length === 0`. Se o estagiário entrou atrasado e já bateu ponto, o status pula direto de "No expediente" para "Expediente encerrado", sem registrar visualmente o atraso.
> 
> **Correção:** Calcular status considerando atraso da entrada efetiva (comparar `horaEntrada` do primeiro registro com `horarioEntrada` + tolerância).
> 
> ### `2.6` `[P2]` Status para admin retorna "Expediente encerrado"
> **Arquivo:** `frontend/src/pages/AcademicoDashboard.tsx:354-356`
> 
> Para admin (sem `horarioEntrada`), retorna "Expediente encerrado". Admin não bate ponto, logo não deveria ter status nessa UI.
> 
> **Correção:** Ocultar a área de status quando o usuário for admin.
> 
> ### `2.7` `[P2]` `TotalTrabalhado` tipado como `TimeSpan`/`time` (limite 24h)
> **Arquivo:** `backend/Models/RegistroPonto.cs:17`
> 
> `TimeSpan` persistido em coluna `time` do SQL Server tem limite de 24h. Hoje não quebra (um dia tem 24h), mas é uma armadilha latente.
> 
> **Correção:** Persistir como `bigint` (segundos) ou calcular sob demanda (`[NotMapped]`).
> 
> ### `2.8` `[P1]` `formatarTotal` assume formato `'hh:mm:ss.fff'`
> **Arquivos:** `frontend/AcademicoDashboard.tsx:104`, `AdminDashBoard.tsx:156`
> 
> `total.split('.')[0]` funciona por acaso. Se `TimeSpan` passar de 24h, a serialização vira `'1.08:30:15'` e a função retorna apenas `'1'`, mostrando "1" como total trabalhado.
> 
> **Correção:** Parsear manualmente cada parte com `parseInt` ou serializar como segundos no backend.
> 
> ### `2.9` `[P2]` Filtragem de registros usa e-mail do acadêmico
> **Arquivo:** `frontend/AdminDashBoard.tsx:197,478`
> 
> `registro.academico?.email === academico.email` — frágil porque o e-mail pode mudar.
> 
> **Correção:** Expor `academico.Id` na projeção do backend (`RegistrosPontoController.cs:33-42`) e filtrar por id em vez de e-mail.
> 
> ### `2.10` `[P1]` Soft-delete não invalida sessão ativa
> **Arquivo:** `backend/Controllers/AcademicosController.cs:241-255`
> 
> Quando o admin exclui um acadêmico (`Ativo=false`), os pontos ficam preservados (correto), mas o `localStorage.usuario` do estagiário desligado continua funcionando até fechar o navegador. Sem JWT com expiração curta isso é difícil de mitigar.
> 
> **Correção:** Com JWT de curta expiração + refresh token revogável, basta invalidar o refresh ao desativar. Backend também deve checar `Ativo` em cada request autenticada.
> 
> ### `2.11` `[P2]` `criarDataComHorario` não trata expediente que vira a noite
> **Arquivo:** `frontend/AcademicoDashboard.tsx:338-345`
> 
> Funciona para expediente diurno. Se houver `horarioEntrada=22:00` e `horarioSaida=06:00`, `limiteFalta` vira antes de `limiteAtraso` e a lógica de status quebra.
> 
> **Correção:** Improvável para SUBG. Se virar requisito, tratar com flag "noturno" e somar 24h ao `horarioSaida`.
> 
> ### `2.12` `[P0]` Migrations executadas no boot do container
> **Arquivo:** `backend/Program.cs:31-35`
> 
> `dbContext.Database.Migrate()` roda no startup. Viola explicitamente a regra do projeto principal: _"Migrations EF Core devem ser aplicadas manualmente... não no boot do container"_. Em produção com 3 réplicas, todas tentam migrar em paralelo e dão conflito.
> 
> **Correção:** Remover `Migrate()` do `Program`. Documentar aplicação manual em janela de manutenção, como no projeto principal.
> 
> ## 3. Arquitetura e modelagem de dados
> > Decisões que afetam manutenibilidade, performance em escala e capacidade de teste. Algumas têm fix barato (índices), outras exigem refatoração mais ampla.
> 
> Ver os 9 itens de arquitetura
> ### `3.1` `[P1]` Controllers conversam direto com `DbContext`
> **Arquivos:** `backend/Controllers/*`
> 
> Não há camada de serviço, repositório nem DTOs de resposta. Toda regra (validação de senha, contagem de pontos, soft-delete) vive no controller. Dificulta testes unitários e reuso.
> 
> **Correção:** Espelhar a arquitetura Hexagonal do projeto principal: Domain → Application → Infrastructure → Api. Mover regras para use cases.
> 
> ### `3.2` `[P2]` DTOs misturados com entidades em `Models/`
> **Arquivos:** `backend/Models/CriarAcademicoRequest.cs` e similares
> 
> Requests e entidade `Academico` convivem na mesma pasta. Faltam Response DTOs — endpoints retornam objetos anônimos duplicados em vários métodos.
> 
> **Correção:** Separar em pastas `Dtos/Requests/` e `Dtos/Responses/`. Criar `AcademicoResponse` e usar em todos os endpoints.
> 
> ### `3.3` `[P1]` Horários persistidos como `string nvarchar(max)`
> **Arquivo:** `backend/Models/Academico.cs:20-22`
> 
> `HorarioEntrada` e `HorarioSaida` são strings. Perde validação no banco (aceita `"banana"`), perde ordenação e comparação tipada.
> 
> **Correção:** Trocar para `TimeOnly` (.NET 6+) → mapeia para `time` no SQL Server. Validação automática.
> 
> ### `3.4` `[P2]` Coluna `Data` redundante em `RegistroPonto`
> **Arquivo:** `backend/Models/RegistroPonto.cs:11`
> 
> `Data` e `HoraEntrada` coexistem; `HoraEntrada.Date == Data` sempre.
> 
> **Correção:** Manter só `HoraEntrada` (não-nulo) e derivar `Data` quando precisar. Reduz storage e remove fonte de divergência.
> 
> ### `3.5` `[P1]` `TotalTrabalhado` persistido (campo calculado)
> **Arquivo:** `backend/Models/RegistroPonto.cs:17`
> 
> `HoraSaida - HoraEntrada` é direto. Persistir exige consistência manual: se admin corrigir `HoraSaida`, esquecer de recalcular `TotalTrabalhado` gera divergência.
> 
> **Correção:** Marcar como `[NotMapped]` e calcular na projeção, ou usar computed column do SQL Server.
> 
> ### `3.6` `[P0]` Sem índices únicos em `Email`/`Matricula`
> **Arquivo:** `backend/Migrations/InitialCreate.cs`
> 
> A checagem `Any(a => a.Email == ...)` no controller não é atômica. Duas requisições concorrentes podem passar pela validação e criar duplicatas.
> 
> **Correção:** Adicionar no `OnModelCreating`: `HasIndex(a => a.Email).IsUnique()` e o mesmo para `Matricula`. Gerar migration. Capturar `DbUpdateException` no controller para retornar 400.
> 
> ### `3.7` `[P2]` `nvarchar(max)` em todos os campos string
> **Arquivo:** `backend/Models/Academico.cs`
> 
> Email, matrícula, nome, senha, horários — todos `nvarchar(max)`. Performance ruim em índices e desperdício de espaço.
> 
> **Correção:** Aplicar `[MaxLength]` nas entidades (Email=320, Matricula=20, Nome=120, Senha=200; horários → `TimeOnly` conforme `3.3`).
> 
> ### `3.8` `[P1]` Sem timestamps de auditoria
> **Arquivos:** `backend/Models/*`
> 
> Nenhuma tabela tem `CreatedAt`/`UpdatedAt`. Indispensável para rastrear "quem bateu ponto quando e quando o registro foi modificado".
> 
> **Correção:** Adicionar `CreatedAt`/`UpdatedAt` em todas as entidades. Implementar via interceptor do EF para preencher automaticamente.
> 
> ### `3.9` `[P2]` FK com `OnDelete.Cascade` em `RegistroPonto → Academico`
> **Arquivo:** `backend/Migrations/AdicionaTotalTrabalhado.cs:41`
> 
> `Cascade` significa que `DELETE` físico apaga os pontos junto. Como temos soft-delete via `Ativo`, na prática nunca acontece, mas é armadilha.
> 
> **Correção:** Trocar para `Restrict`/`NoAction`. Força o erro caso alguém tente `DELETE` físico por engano.
> 
> ## 4. Frontend — React/Vite
> > O frontend tem identidade visual coerente, mas concentra lógica em arquivos muito grandes e não protege rotas nem sessão.
> 
> Ver os 12 itens de frontend
> ### `4.1` `[P2]` URL da API hardcoded em 6 lugares
> **Arquivos:** `frontend/src/pages/*.tsx`
> 
> `http://localhost:5294/...` espalhado por `Login` e os dois dashboards.
> 
> **Correção:** Centralizar em `src/lib/api.ts` com base URL via `import.meta.env.VITE_API_URL` e funções tipadas por endpoint.
> 
> ### `4.2` `[P1]` `AdminDashboard.tsx` com 1100 linhas
> **Arquivo:** `frontend/src/pages/AdminDashBoard.tsx`
> 
> Cadastro + listagem + calendário + filtros + geração de PDF, tudo no mesmo arquivo. Dificulta manutenção e testes.
> 
> **Correção:** Quebrar em `FormularioCadastro`, `ListaAcademicos`, `CalendarioPontos`, `useRelatorioPdf`, etc.
> 
> ### `4.3` `[P0]` Sem proteção de rotas
> **Arquivo:** `frontend/src/App.tsx`
> 
> Qualquer um digita `/admin` na URL e cai no dashboard de admin. Só não carrega nada útil porque a API tampouco tem auth (`1.1`). Quando autenticação for adicionada, o frontend também precisa filtrar.
> 
> **Correção:** Wrapper `<RotaProtegida exigeAdmin={true}>` que verifica token + papel antes de renderizar. Redireciona para `/login` se não autenticado.
> 
> ### `4.4` `[P1]` Sessão apenas em `localStorage`
> **Arquivo:** `frontend/src/pages/Login.tsx:41`
> 
> `localStorage` é vulnerável a XSS — qualquer script injetado lê o objeto `usuario`.
> 
> **Correção:** Combinar com JWT em cookie httpOnly (mesma estratégia do projeto principal). `localStorage` só para dados não-sensíveis (nome do usuário, preferências de UI).
> 
> ### `4.5` `[P2]` Sem tratamento de erro de rede
> **Arquivo:** `frontend/src/pages/AcademicoDashboard.tsx:46-56`
> 
> `fetch().then(res => res.json())` sem `.catch`. Se a API cair, a UI fica em branco silenciosamente.
> 
> **Correção:** Envolver com `try/catch` + toast de erro. Ou padronizar com fetch wrapper que já trata.
> 
> ### `4.6` `[P2]` `useEffect` sem `AbortController`
> **Arquivo:** `frontend/src/pages/AcademicoDashboard.tsx:30-44`
> 
> Race condition: usuário entra, sai e entra de novo — o fetch antigo pode resolver depois e sobrescrever estado novo.
> 
> **Correção:** Usar `AbortController` + `abort()` no cleanup do effect.
> 
> ### `4.7` `[P2]` Re-render do dashboard inteiro a cada segundo
> **Arquivo:** `frontend/src/pages/AcademicoDashboard.tsx:25,39-43`
> 
> `setHoraAtual(new Date())` a cada 1000ms re-renderiza tudo (incluindo a lista de registros).
> 
> **Correção:** Isolar o relógio em um componente próprio. Só ele rerenderiza.
> 
> ### `4.8` `[P2]` `confirm()` e `alert()` em produção
> **Arquivos:** `frontend/src/pages/*` (vários)
> 
> Funcional para MVP, mas a UI tem aparência de produto. Bloqueia thread e não dá para estilizar.
> 
> **Correção:** Substituir por toasts/modais consistentes. O admin já tem toast parcialmente.
> 
> ### `4.9` `[P2]` Tipo `Academico` com campos sempre preenchidos
> **Arquivo:** `frontend/src/pages/AdminDashBoard.tsx:5-14`
> 
> `horarioEntrada: string` não-nulo, mas o backend pode mandar `""`. A lógica funciona por sorte com `!horarioEntrada`.
> 
> **Correção:** Modelar como `horarioEntrada?: string` e tratar explicitamente. Idealmente alinhar com o backend tipando `TimeOnly`.
> 
> ### `4.10` `[P0]` `GET /registros-ponto` retorna todos os registros
> **Arquivo:** `frontend/AcademicoDashboard.tsx:50-54`
> 
> O frontend baixa **todos** os pontos do banco e filtra em memória pelo `academicoId`. Além do problema óbvio de segurança (vaza dados de todos), mata performance.
> 
> **Correção:** Criar `GET /registros-ponto?academicoId={id}` (com autorização) ou `GET /me/registros-ponto` usando `sub` do JWT.
> 
> ### `4.11` `[P1]` Versões fantasma no `package.json`
> **Arquivo:** `frontend/package.json:31-33`
> 
> `typescript: ~6.0.2` e `vite: ^8.0.10` não existem oficialmente na data desta revisão. São versões inventadas/copiadas erradas. Possivelmente foi alguma IA que sugeriu sem verificar.
> 
> **Correção:** Voltar para versões existentes (ex.: `typescript ~5.6`, `vite ^6.0`). Rodar `npm outdated` para confirmar o que está sendo resolvido.
> 
> ### `4.12` `[P2]` `index.css` sem `@layer base` do Tailwind
> **Arquivo:** `frontend/src/index.css`
> 
> Apenas `@import 'tailwindcss';`. Falta layer base para resets/fontes consistentes em browsers diferentes.
> 
> **Correção:** Adicionar `@layer base` com reset básico de tipografia e cores corporativas.
> 
> ## 5. Código limpo e otimização
> > Melhorias de performance e qualidade que não bloqueiam deploy mas valem na próxima iteração.
> 
> Ver os 9 itens de otimização
> ### `5.1` `[P1]` Listagens sem paginação
> **Arquivos:** `backend/Controllers/*` (GETs)
> 
> `GET /academicos` e `GET /registros-ponto` trazem tudo. Com 200 estagiários e 1 ano de registros = ~100k linhas no JSON da listagem do admin.
> 
> **Correção:** Adicionar `Skip`/`Take` com parâmetros `pagina` e `tamanhoPagina` (como o projeto principal faz com `PaginaResultado<T>`).
> 
> ### `5.2` `[P2]` Falta índice em `RegistrosPonto(AcademicoId, HoraEntrada)`
> **Arquivos:** `backend/Migrations/*`
> 
> `OrderByDescending(r => r.HoraEntrada)` sem índice composto. Em volume baixo não aparece, em alto vira table scan.
> 
> **Correção:** Criar índice composto `(AcademicoId, HoraEntrada DESC)`.
> 
> ### `5.3` `[P1]` Métodos síncronos em I/O
> **Arquivos:** `backend/Controllers/*`
> 
> Todos os controllers usam `SaveChanges`/`FirstOrDefault` síncronos. Segura threads do pool sob carga.
> 
> **Correção:** Trocar tudo por `*Async` + `Task<IActionResult>`. Adicionar `CancellationToken` nas rotas.
> 
> ### `5.4` `[P2]` Sem DTO de resposta → código duplicado
> **Arquivo:** `backend/Controllers/AcademicosController.cs`
> 
> Objeto anônimo `{ Id, Matricula, Nome, Email, ... }` é construído em `Get`, `Post`, `Login` — três vezes. Risco de divergência.
> 
> **Correção:** Criar `AcademicoResponse` e método de extensão `Academico.ToResponse()`.
> 
> ### `5.5` `[P2]` Helpers do PDF recriados a cada chamada
> **Arquivo:** `frontend/AdminDashBoard.tsx:281-426`
> 
> `desenharCabecalho`, `desenharTitulo`, `formatarSegundos` são declarados dentro de `gerarPdfRelatorio`. Recompilados toda vez que o botão é clicado.
> 
> **Correção:** Mover para fora do componente ou para `src/lib/pdf/relatorios.ts`.
> 
> ### `5.6` `[P1]` Lógica de presença duplicada em 3 lugares
> **Arquivos:** `frontend/AcademicoDashboard.tsx`, `AdminDashBoard.tsx`
> 
> Regra de "atrasado / no expediente / ausente" implementada em `obterStatusAtual`, `pegarStatus` e `obterStatusPresenca`. Manutenção gera divergência.
> 
> **Correção:** Extrair para `src/lib/statusPonto.ts` compartilhado. Melhor ainda: calcular no backend e devolver pronto na API.
> 
> ### `5.7` `[P2]` Comentários "o quê" em vez de "por quê"
> **Arquivos:** `backend/Program.cs`, `AcademicosController.cs`
> 
> `//Permite usar os controllers da API`, `//Retorna todos os acadêmicos cadastrados`. O nome já diz. O `CLAUDE.md` do projeto principal pede o contrário.
> 
> **Correção:** Remover comentários óbvios. Manter só quando explicam motivação não-óbvia.
> 
> ### `5.8` `[P2]` Nomes inconsistentes para mesma operação
> **Arquivos:** `frontend/src/pages/*.tsx`
> 
> `pegarStatus`, `obterStatusAtual`, `obterStatusPresenca` — todos PT mas verbos diferentes.
> 
> **Correção:** Padronizar (`obter*`). Lembrando que ao consolidar a lógica (`5.6`) só vai sobrar um.
> 
> ### `5.9` `[P0]` Falta filtro por usuário no endpoint de registros
> **Arquivo:** `backend/Controllers/RegistrosPontoController.cs:19-47`
> 
> Combinado com `4.10` — além do problema de segurança, transferir dados sem filtro não escala.
> 
> **Correção:** `GET /registros-ponto?academicoId=&dataInicial=&dataFinal=` (com autorização). Backend também agrega o total para o relatório.
> 
> ## 6. Itens faltantes e pontos positivos
> O que falta (além dos itens já listados)
> * README do projeto com instruções de setup (string de conexão, migrations, `npm install`).
> * `.gitignore` específico (`bin/`, `obj/`, `node_modules/`, `*.user`, etc.) — verificar se não está versionando build artifacts.
> * Pipeline CI (GitHub Actions ou similar) que rode build + testes em cada push.
> * Logging estruturado (Serilog) com sinks para console e arquivo. Hoje só o default do ASP.NET.
> * Health check (endpoint `/health`) — útil para Portainer/Docker.
> * Documentação OpenAPI/Swagger anotada (tags, descrições, response types).
> * Variáveis de ambiente para configuração — hoje tudo no `appsettings`.
> 
> O que está bom (continuar fazendo)
> * UI bem cuidada com identidade visual coerente (cores, gradiente, hierarquia tipográfica).
> * Uso correto do `PasswordHasher<T>` com rehash em `SuccessRehashNeeded` — mostra que leu a documentação.
> * Migrations versionadas com nomes descritivos.
> * Soft-delete via `Ativo` em vez de remoção física.
> * Geração de PDF organizada em helpers (`desenharCabecalho`, `desenharTitulo`).
> * Validação de campos obrigatórios no `POST /academicos`.
> * Tipagem TypeScript razoável no frontend.
> * Tratamento do caso `SuccessRehashNeeded` — atualiza hash quando algoritmo evolui.
> 
> ## 7. Plano de execução priorizado
> > Os itens abaixo estão prontos para virar checklist do issue ou serem convertidos em sub-issues. Os códigos entre parênteses referem-se aos itens detalhados acima.
> 
> ### `[P0]` Antes de qualquer deploy
> * [ ]  Implementar JWT + `[Authorize]` em todos os endpoints (`1.1`, `1.3`, `4.3`, `4.10`)[ ]  Remover comparação plaintext de senha (`1.6`)[ ]  Mover `Migrate()` do boot para janela de manutenção (`2.12`)[ ]  Adicionar índice único em `Email` e `Matricula` (`3.6`)[ ]  Endpoint de registros filtrado por usuário com autorização (`5.9`)
> 
> ### `[P1]` Para código de produção
> * [ ]  Refatorar para camada de serviço + DTOs de resposta (`3.1`, `3.2`, `5.4`)[ ]  Centralizar URL da API + `AbortController` + rotas protegidas (`4.1`, `4.3`, `4.6`)[ ]  Mover lógica de status para o backend (`5.6`)[ ]  Tipar horários como `TimeOnly` (`3.3`)[ ]  Tornar métodos `async` (`5.3`) e paginar listagens (`5.1`)[ ]  Corrigir versões do `package.json` (`4.11`)[ ]  Quebrar `AdminDashboard` em componentes (`4.2`)[ ]  Timestamps de auditoria (`3.8`)[ ]  Sessão em cookie httpOnly (`4.4`)[ ]  Rate limiting no login (`1.4`)[ ]  CORS restrito (`1.2`)[ ]  Mensagens de erro genéricas no login (`1.8`)
> 
> ### `[P2]` Polimento e otimização
> * [ ]  Health check e logging estruturado (gerais)[ ]  Toasts/modais no lugar de `alert`/`confirm` (`4.8`)[ ]  Remover `Data` redundante (`3.4`) e `TotalTrabalhado` persistido (`3.5`)[ ]  Índices compostos (`5.2`)[ ]  Limpeza de comentários óbvios (`5.7`) e padronização de nomes (`5.8`)[ ]  Casos de borda do cálculo de status (`2.5`, `2.6`, `2.11`)[ ]  User Secrets / env vars em vez de `appsettings` (`1.9`)[ ]  `index.css` com `@layer base` do Tailwind (`4.12`)
> 
> ## Mensagem final
> O projeto cumpre o papel de prova de habilidade: mostra que a desenvolvedora consegue entregar um sistema funcional ponta-a-ponta, com UI agradável, backend conversando com banco e geração de relatório em PDF. Esse é o ponto positivo principal.
> 
> Os principais gaps são em duas dimensões:
> 
> 1. **Segurança** — falta a noção de que a API é uma fronteira de confiança e tudo que cruza precisa ser verificado.
> 2. **Separação de responsabilidades** — controllers carregam lógica que deveria estar em camadas dedicadas.
> 
> Esses são temas clássicos de senioridade, e o caminho mais eficaz para amadurecer é praticar refatorando este mesmo código, não começando do zero.
> 
> ### Sugestão de próximos passos
> * [ ]  Adicionar JWT seguindo um tutorial recente de ASP.NET Core 9[ ]  Mover toda a lógica do `RegistrosPontoController` para uma classe `RegistroPontoService`[ ]  Trocar `localStorage` por cookie httpOnly para o token
> 
> Documento gerado a partir da análise estática e leitura completa do repositório. Para detalhes adicionais, consulte o PDF de referência anexo à issue.

