using backend.Services.Interfaces;
using backend.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Data;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("academicos")]
public class AcademicosController : ControllerBase
{
    private readonly AppDbContext _context;

    private readonly IConfiguration _configuration;

    private readonly PasswordHasher<Academico> _passwordHasher = new();

    public AcademicosController(
    AppDbContext context,

    IConfiguration configuration,

    IAcademicoService academicoService
)
    {
        _context = context;
        _configuration = configuration;
        _academicoService = academicoService;
    }

    // Retorna a lista de acadêmicos cadastrados
    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> Get(
        int page = 1,
        int pageSize = 10
    )
    {
        var resultado =
            await _academicoService
                .ObterPaginadoAsync(
                    page,
                    pageSize
                );

        return Ok(resultado);
    }

    // Cadastra um novo acadêmico ou administrador
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Post(
        CriarAcademicoRequest dadosCadastro
    )
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
            return BadRequest(
                "Já existe um usuário cadastrado com este email."
            );
        }

        var matriculaJaExiste = await _context.Academicos.AnyAsync(a =>
            a.Ativo &&
            a.Matricula == dadosCadastro.Matricula
        );

        if (matriculaJaExiste)
        {
            return BadRequest(
                "Já existe um usuário cadastrado com esta matrícula."
            );
        }

        var academico = new Academico
        {
            PrimeiroAcessoToken = Guid.NewGuid().ToString(),

            PrimeiroAcessoTokenExpiraEm =
                DateTime.UtcNow.AddHours(24),

            Matricula = dadosCadastro.Matricula,

            Nome = dadosCadastro.Nome,

            Email = dadosCadastro.Email,

            EhAdmin = dadosCadastro.EhAdmin,

            HorarioEntrada =
                dadosCadastro.HorarioEntrada,

            HorarioSaida =
                dadosCadastro.HorarioSaida,

            PrecisaDefinirSenha = true,

            Ativo = true
        };

        try
        {
            _context.Academicos.Add(academico);

            await _context.SaveChangesAsync();
        }
        catch
        {
            return BadRequest(
                "Já existe um usuário com este email ou matrícula."
            );
        }

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

            primeiroAcessoToken =
                academico.PrimeiroAcessoToken
        });
    }

    // Realiza login
[AllowAnonymous]
[EnableRateLimiting("login")]
[HttpPost("login")]
public async Task<IActionResult> Login(
    LoginRequest dadosLogin
)
{
    var resultado =
        await _academicoService
            .LoginAsync(dadosLogin);

    if (resultado == null)
    {
        return Unauthorized(
            "Email ou senha inválidos."
        );
    }

    return Ok(resultado);
}

    // Primeiro acesso
    [AllowAnonymous]
[EnableRateLimiting("login")]
[HttpPost("primeiro-acesso")]
public async Task<IActionResult>
    PrimeiroAcesso(
        PrimeiroAcessoRequest dadosPrimeiroAcesso
    )
{
    var sucesso =
        await _academicoService
            .DefinirPrimeiraSenhaAsync(
                dadosPrimeiroAcesso
            );

    if (!sucesso)
    {
        return BadRequest(
            "Token inválido ou expirado."
        );
    }

    return Ok(
        "Senha definida com sucesso."
    );
}

    private PasswordVerificationResult VerificarSenha(
        Academico academico,
        string senhaInformada
    )
    {
        try
        {
            return _passwordHasher
                .VerifyHashedPassword(
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

    // Exclui acadêmico
[Authorize(Roles = "Admin")]
[HttpDelete("{id}")]
public async Task<IActionResult>
    Delete(int id)
{
    var sucesso =
        await _academicoService
            .DeletarAsync(id);

    if (!sucesso)
    {
        return NotFound(
            "Acadêmico não encontrado."
        );
    }

    return NoContent();
}

    private readonly IAcademicoService
    _academicoService;
}