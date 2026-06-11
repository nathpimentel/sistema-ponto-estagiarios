using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;
using System.Text;
using backend.Data;
using backend.Models;
using backend.Security;

namespace backend.Controllers;

[ApiController]
[Route("academicos")]
public class AcademicosController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IPasswordHasher<Academico> _passwordHasher;
    private readonly ILogger<AcademicosController> _logger;

    public AcademicosController(
        AppDbContext context,
        IConfiguration configuration,
        IPasswordHasher<Academico> passwordHasher,
        ILogger<AcademicosController> logger
    )
    {
        _context = context;
        _configuration = configuration;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var academicos = await _context.Academicos
            .Where(a => a.Ativo)
            .Select(a => new
            {
                a.Id,
                a.Matricula,
                a.Nome,
                a.Email,
                a.EhAdmin,
                a.HorarioEntrada,
                a.HorarioSaida,
                a.PrecisaDefinirSenha,
                a.Ativo
            })
            .ToListAsync();

        return Ok(academicos);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Post(CriarAcademicoRequest dadosCadastro)
    {
        if (string.IsNullOrWhiteSpace(dadosCadastro.Nome))
        {
            return BadRequest("O nome é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(dadosCadastro.Email))
        {
            return BadRequest("O email é obrigatório.");
        }

        if (!dadosCadastro.Email.EndsWith("@gmail.com"))
        {
            return BadRequest("O email deve ser um Gmail válido.");
        }

        var emailJaExiste = await _context.Academicos.AnyAsync(a =>
            a.Ativo &&
            a.Email == dadosCadastro.Email
        );

        if (emailJaExiste)
        {
            return BadRequest("Já existe um usuário cadastrado com este email.");
        }

        var matriculaJaExiste = await _context.Academicos.AnyAsync(a =>
            a.Ativo &&
            a.Matricula == dadosCadastro.Matricula
        );

        if (matriculaJaExiste)
        {
            return BadRequest("Já existe um usuário cadastrado com esta matrícula.");
        }

        var academico = new Academico
        {
            PrimeiroAcessoToken = Guid.NewGuid().ToString("N"),
            PrimeiroAcessoTokenExpiraEm = DateTime.UtcNow.AddHours(24),
            Matricula = dadosCadastro.Matricula,
            Nome = dadosCadastro.Nome,
            Email = dadosCadastro.Email,
            EhAdmin = dadosCadastro.EhAdmin,
            HorarioEntrada = dadosCadastro.HorarioEntrada,
            HorarioSaida = dadosCadastro.HorarioSaida,
            PrecisaDefinirSenha = true,
            Ativo = true
        };

        try
        {
            _context.Academicos.Add(academico);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return BadRequest("Já existe um usuário com este email ou matrícula.");
        }

        var conviteEnviado =
            await EnviarConvitePrimeiroAcessoAsync(academico);

        return Created("", new
        {
            academico.Id,
            academico.Matricula,
            academico.Nome,
            academico.Email,
            academico.EhAdmin,
            academico.HorarioEntrada,
            academico.HorarioSaida,
            academico.PrecisaDefinirSenha,
            academico.Ativo,
            ConvitePrimeiroAcessoEnviado = conviteEnviado
        });
    }

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest dadosLogin)
    {
        var academico = await _context.Academicos.FirstOrDefaultAsync(a =>
            a.Ativo &&
            a.Email == dadosLogin.Email
        );

        if (
            academico == null ||
            !academico.Ativo ||
            academico.PrecisaDefinirSenha
        )
        {
            return Unauthorized("Email ou senha inválidos.");
        }

        var resultadoSenha = VerificarSenha(academico, dadosLogin.Senha);

        if (resultadoSenha == PasswordVerificationResult.Failed)
        {
            return Unauthorized("Email ou senha inválidos.");
        }

        if (resultadoSenha == PasswordVerificationResult.SuccessRehashNeeded)
        {
            academico.Senha = _passwordHasher.HashPassword(
                academico,
                dadosLogin.Senha
            );

            await _context.SaveChangesAsync();
        }

        var tokenExpiraEm = DateTime.UtcNow.AddHours(2);
        var tokenString = GerarToken(academico, tokenExpiraEm);

        Response.Cookies.Append(
            AuthCookieNames.AccessToken,
            tokenString,
            CriarCookieAutenticacao(tokenExpiraEm)
        );

        return Ok(CriarUsuarioResponse(academico));
    }

    [Authorize]
[HttpGet("me")]
public IActionResult Me()
{
    var idClaim = User.FindFirst(
        ClaimTypes.NameIdentifier
    )?.Value;

    if (!int.TryParse(idClaim, out var id))
    {
        return Unauthorized();
    }

    var academico = _context.Academicos
    .Where(a => a.Id == id && a.Ativo)
    .Select(a => new
    {
        a.Id,
        a.Nome,
        a.Email,
        a.Matricula,
        a.HorarioEntrada,
        a.HorarioSaida,
        a.EhAdmin
    })
    .FirstOrDefault();

    if (academico == null)
    {
        return Unauthorized();
    }

    return Ok(academico);
}

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(
            AuthCookieNames.AccessToken,
            CriarCookieAutenticacao(DateTime.UtcNow.AddDays(-1))
        );

        return NoContent();
    }

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("primeiro-acesso")]
    public async Task<IActionResult> PrimeiroAcesso(
        PrimeiroAcessoRequest dadosPrimeiroAcesso
    )
    {
        if (string.IsNullOrWhiteSpace(dadosPrimeiroAcesso.Email))
        {
            return BadRequest("O email é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(dadosPrimeiroAcesso.Token))
        {
            return BadRequest("O token é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(dadosPrimeiroAcesso.NovaSenha))
        {
            return BadRequest("A nova senha é obrigatória.");
        }

        if (dadosPrimeiroAcesso.NovaSenha.Length < 6)
        {
            return BadRequest("A nova senha deve ter pelo menos 6 caracteres.");
        }

        var academico = await _context.Academicos.FirstOrDefaultAsync(a =>
            a.Ativo &&
            a.Email == dadosPrimeiroAcesso.Email &&
            a.PrimeiroAcessoToken == dadosPrimeiroAcesso.Token &&
            a.PrimeiroAcessoTokenExpiraEm > DateTime.UtcNow
        );

        if (academico == null || !academico.PrecisaDefinirSenha)
        {
            return BadRequest("Token inválido ou expirado.");
        }

        academico.Senha = _passwordHasher.HashPassword(
            academico,
            dadosPrimeiroAcesso.NovaSenha
        );
        academico.PrecisaDefinirSenha = false;
        academico.PrimeiroAcessoToken = null;
        academico.PrimeiroAcessoTokenExpiraEm = null;

        await _context.SaveChangesAsync();

        return Ok("Senha definida com sucesso. Faça login para continuar.");
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var academico = await _context.Academicos.FindAsync(id);

        if (academico == null || !academico.Ativo)
        {
            return NotFound("Acadêmico não encontrado.");
        }

        academico.Ativo = false;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private string GerarToken(Academico academico, DateTime expiraEm)
    {
        var role = academico.EhAdmin ? "Admin" : "Academico";

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, academico.Id.ToString()),
            new Claim(ClaimTypes.Name, academico.Nome),
            new Claim(ClaimTypes.Email, academico.Email),
            new Claim(ClaimTypes.Role, role)
        };

        var jwtKey = _configuration["Jwt:Key"];

        if (string.IsNullOrWhiteSpace(jwtKey))
        {
            throw new InvalidOperationException(
                "Configure Jwt:Key em User Secrets ou variável de ambiente."
            );
        }

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtKey)
        );

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: expiraEm,
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private CookieOptions CriarCookieAutenticacao(DateTime expiraEm)
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = expiraEm,
            Path = "/"
        };
    }

    private PasswordVerificationResult VerificarSenha(
        Academico academico,
        string senhaInformada
    )
    {
        try
        {
            return _passwordHasher.VerifyHashedPassword(
                academico,
                academico.Senha,
                senhaInformada
            );
        }
        catch
        {
            return PasswordVerificationResult.Failed;
        }
    }

    private static object CriarUsuarioResponse(Academico academico)
    {
        return new
        {
            academico.Id,
            academico.Matricula,
            academico.Nome,
            academico.Email,
            academico.EhAdmin,
            academico.HorarioEntrada,
            academico.HorarioSaida,
            academico.PrecisaDefinirSenha,
            academico.Ativo
        };
    }

    private async Task<bool> EnviarConvitePrimeiroAcessoAsync(
        Academico academico
    )
    {
        var smtpHost = _configuration["Smtp:Host"];
        var smtpFrom = _configuration["Smtp:From"];

        if (
            string.IsNullOrWhiteSpace(smtpHost) ||
            string.IsNullOrWhiteSpace(smtpFrom) ||
            string.IsNullOrWhiteSpace(academico.PrimeiroAcessoToken)
        )
        {
            _logger.LogWarning(
                "SMTP não configurado. Convite de primeiro acesso não enviado para {Email}.",
                academico.Email
            );

            return false;
        }

        var frontendBaseUrl =
            _configuration["Frontend:BaseUrl"] ?? "http://localhost:5173";

        var linkPrimeiroAcesso =
            $"{frontendBaseUrl}/?primeiroAcesso=1" +
            $"&email={Uri.EscapeDataString(academico.Email)}" +
            $"&token={Uri.EscapeDataString(academico.PrimeiroAcessoToken)}";

        using var mensagem = new MailMessage(
            smtpFrom,
            academico.Email
        )
        {
            Subject = "Primeiro acesso - Sistema de Ponto",
            Body =
                $"Olá, {academico.Nome}.\n\n" +
                "Use o link abaixo para definir sua senha. " +
                "Ele expira em 24 horas e só pode ser usado uma vez.\n\n" +
                $"{linkPrimeiroAcesso}\n\n" +
                "Se você não solicitou este acesso, ignore esta mensagem.",
            IsBodyHtml = false
        };

        var smtpPort = int.TryParse(
            _configuration["Smtp:Port"],
            out var port
        )
            ? port
            : 587;

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            EnableSsl = bool.TryParse(
                _configuration["Smtp:EnableSsl"],
                out var enableSsl
            ) && enableSsl
        };

        var smtpUser = _configuration["Smtp:User"];
        var smtpPassword = _configuration["Smtp:Password"];

        if (
            !string.IsNullOrWhiteSpace(smtpUser) &&
            !string.IsNullOrWhiteSpace(smtpPassword)
        )
        {
            client.Credentials = new NetworkCredential(
                smtpUser,
                smtpPassword
            );
        }

        try
        {
            await client.SendMailAsync(mensagem);
            return true;
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Falha ao enviar convite de primeiro acesso para {Email}.",
                academico.Email
            );

            return false;
        }
    }
}
