# Sistema de Ponto para Estagiarios

Aplicacao fullstack para controle de entrada, saida, presenca, ausencia e relatorios de ponto de academicos bolsistas/estagiarios.

## Funcionalidades

- Login de usuarios
- Cadastro de academicos e administradores
- Registro de entrada e saida
- Controle de status: aguardando entrada, atrasado, no expediente, ausente e expediente encerrado
- Painel administrativo
- Painel do academico
- Relatorio administrativo em PDF com status de presenca
- Relatorio individual em PDF
- API documentada com Swagger

## Tecnologias

- C#
- ASP.NET Core
- Entity Framework Core
- PostgreSQL
- React
- TypeScript
- Vite
- Tailwind CSS
- jsPDF
- Swagger

## Como executar

### Backend

```bash
cd backend
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=sistema_ponto_estagiarios;Username=postgres;Password=SUA_SENHA"
dotnet user-secrets set "Jwt:Key" "SUA_CHAVE_FORTE_COM_PELO_MENOS_32_CARACTERES"
dotnet run
```

Swagger:
http://localhost:4000/swagger/index.html

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:
http://localhost:5174

## Banco de dados

O projeto usa PostgreSQL. A estrutura do banco e criada a partir das migrations do Entity Framework Core.

## Configuracao sensivel

Nao versionar connection string, senha de banco, chave JWT ou credenciais SMTP. Em desenvolvimento, use User Secrets:

```bash
dotnet user-secrets set "Smtp:Host" "smtp.exemplo.com"
dotnet user-secrets set "Smtp:Port" "587"
dotnet user-secrets set "Smtp:EnableSsl" "true"
dotnet user-secrets set "Smtp:From" "no-reply@exemplo.com"
dotnet user-secrets set "Smtp:User" "usuario-smtp"
dotnet user-secrets set "Smtp:Password" "senha-smtp"
```
