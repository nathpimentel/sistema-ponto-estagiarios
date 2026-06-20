
using backend.Services.Interfaces;
using backend.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using backend.Data;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("registros-ponto")]
public class RegistrosPontoController : ControllerBase
{
    private readonly AppDbContext _context;

    public RegistrosPontoController(
    AppDbContext context,

    IRegistroPontoService
        registroPontoService
)
{
    _context = context;

    _registroPontoService =
        registroPontoService;
}

    private int? ObterAcademicoIdLogado()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (int.TryParse(idClaim, out var academicoId))
        {
            return academicoId;
        }

        return null;
    }

    private bool UsuarioEhAdmin()
    {
        return User.IsInRole("Admin");
    }

    [Authorize]
[HttpGet]
public async Task<IActionResult> Get(
    DateTime? dataInicio,

    DateTime? dataFim,

    int page = 1,

    int pageSize = 10
)
{
    var academicoIdLogado =
        ObterAcademicoIdLogado();

    if (academicoIdLogado == null)
    {
        return Unauthorized(
            "Usuário não autenticado."
        );
    }

    var usuarioEhAdmin =
        UsuarioEhAdmin();

    var registros =
        await _registroPontoService
    .ObterRegistrosAsync(
        academicoIdLogado.Value,

        usuarioEhAdmin,

        dataInicio,

        dataFim,

        page,

        pageSize
    );

    return Ok(registros);
}

    [Authorize]
[HttpPost("entrada")]
public async Task<IActionResult>
    RegistrarEntrada()
{
    var academicoIdLogado =
        ObterAcademicoIdLogado();

    if (academicoIdLogado == null)
    {
        return Unauthorized(
            "Usuário não autenticado."
        );
    }

    var sucesso =
        await _registroPontoService
            .RegistrarEntradaAsync(
                academicoIdLogado.Value
            );

    if (!sucesso)
    {
        return BadRequest(
            "Não foi possível registrar entrada."
        );
    }

    return Ok(
        "Entrada registrada com sucesso."
    );
}

    [Authorize]
[HttpPost("saida")]
public async Task<IActionResult>
    RegistrarSaida()
{
    var academicoIdLogado =
        ObterAcademicoIdLogado();

    if (academicoIdLogado == null)
    {
        return Unauthorized(
            "Usuário não autenticado."
        );
    }

    var sucesso =
        await _registroPontoService
            .RegistrarSaidaAsync(
                academicoIdLogado.Value
            );

    if (!sucesso)
    {
        return BadRequest(
            "Não foi possível registrar saída."
        );
    }

    return Ok(
        "Saída registrada com sucesso."
    );
}

    private readonly IRegistroPontoService
    _registroPontoService;
    
}
