using backend.Services.Interfaces;
using backend.DTOs;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.Data;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("academicos")]
public class AcademicosController : ControllerBase
{
    private readonly AppDbContext _context;

    private readonly IConfiguration _configuration;

    private readonly IAcademicoService _academicoService;

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

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> Get(
        int page = 1,
        int pageSize = 10
    )
    {
        var resultado = await _academicoService
            .ObterPaginadoAsync(page, pageSize);

        return Ok(resultado);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Post(
        CriarAcademicoRequest dadosCadastro
    )
    {
        if (string.IsNullOrWhiteSpace(dadosCadastro.Nome))
            return BadRequest("O nome é obrigatório.");

        if (string.IsNullOrWhiteSpace(dadosCadastro.Email))
            return BadRequest("O email é obrigatório.");

        if (!dadosCadastro.Email.EndsWith("@gmail.com"))
            return BadRequest("O email deve ser um Gmail válido.");

        if (!dadosCadastro.EhAdmin)
        {
            if (!TimeOnly.TryParse(dadosCadastro.HorarioEntrada, out _))
                return BadRequest("Horário de entrada inválido.");

            if (!TimeOnly.TryParse(dadosCadastro.HorarioSaida, out _))
                return BadRequest("Horário de saída inválido.");
        }

        TimeOnly? horarioEntrada = TimeOnly.TryParse(
            dadosCadastro.HorarioEntrada, out var he
        ) ? he : null;

        TimeOnly? horarioSaida = TimeOnly.TryParse(
            dadosCadastro.HorarioSaida, out var hs
        ) ? hs : null;

        var academico = new Academico
        {
            PrimeiroAcessoToken = Guid.NewGuid().ToString(),
            PrimeiroAcessoTokenExpiraEm = DateTime.UtcNow.AddHours(24),
            Matricula = dadosCadastro.Matricula,
            Nome = dadosCadastro.Nome,
            Email = dadosCadastro.Email,
            EhAdmin = dadosCadastro.EhAdmin,
            HorarioEntrada = horarioEntrada,
            HorarioSaida = horarioSaida,
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
            horarioEntrada = academico.HorarioEntrada?.ToString("HH:mm") ?? string.Empty,
            horarioSaida = academico.HorarioSaida?.ToString("HH:mm") ?? string.Empty,
            academico.PrecisaDefinirSenha,
            academico.Ativo,
            primeiroAcessoToken = academico.PrimeiroAcessoToken
        });
    }

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("login")]
    public async Task<IActionResult> Login(
        LoginRequest dadosLogin
    )
    {
        var resultado = await _academicoService.LoginAsync(dadosLogin);

        if (resultado == null)
            return Unauthorized("Email ou senha inválidos.");

        return Ok(resultado);
    }

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("primeiro-acesso")]
    public async Task<IActionResult> PrimeiroAcesso(
        PrimeiroAcessoRequest dadosPrimeiroAcesso
    )
    {
        var sucesso = await _academicoService
            .DefinirPrimeiraSenhaAsync(dadosPrimeiroAcesso);

        if (!sucesso)
            return BadRequest("Token inválido ou expirado.");

        return Ok("Senha definida com sucesso.");
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var sucesso = await _academicoService.DeletarAsync(id);

        if (!sucesso)
            return NotFound("Acadêmico não encontrado.");

        return NoContent();
    }
}
