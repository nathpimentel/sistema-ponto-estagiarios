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

    public RegistrosPontoController(AppDbContext context)
    {
        _context = context;
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
    public IActionResult Get(
        DateTime? dataInicial,
        DateTime? dataFinal
)
    {
        var academicoIdLogado = ObterAcademicoIdLogado();

        if (academicoIdLogado == null)
        {
            return Unauthorized();
        }

        var usuarioEhAdmin = UsuarioEhAdmin();

        var query = _context.RegistrosPonto
    .Include(r => r.Academico)
    .Where(r =>
        usuarioEhAdmin ||
        r.AcademicoId == academicoIdLogado.Value
    );

if (dataInicial.HasValue)
{
    query = query.Where(r =>
        r.Data.Date >= dataInicial.Value.Date
    );
}

if (dataFinal.HasValue)
{
    query = query.Where(r =>
        r.Data.Date <= dataFinal.Value.Date
    );
}

       var registros = query
            .Include(r => r.Academico)
            .Where(r => usuarioEhAdmin || r.AcademicoId == academicoIdLogado.Value)
            .OrderByDescending(r => r.HoraEntrada)
            .Select(r => new
            {
                r.Id,
                r.AcademicoId,
                r.Data,
                r.HoraEntrada,
                r.HoraSaida,
                r.TotalTrabalhado,
                Academico = r.Academico == null ? null : new
{
    r.Academico.Id,
    r.Academico.Matricula,
    r.Academico.Nome,
    r.Academico.Email,
                    r.Academico.HorarioEntrada,
                    r.Academico.HorarioSaida,
                    r.Academico.Ativo
                }
            })
            .ToList();

        return Ok(registros);
    }

    [Authorize]
    [HttpPost("entrada")]
    public IActionResult RegistrarEntrada()
    {
        var academicoId = ObterAcademicoIdLogado();

        if (academicoId == null)
        {
            return Unauthorized();
        }

        var academicoExiste = _context.Academicos.Any(a =>
            a.Id == academicoId.Value &&
            a.Ativo
        );

        if (!academicoExiste)
        {
            return NotFound("Academico nao encontrado.");
        }

        var hoje = DateTime.UtcNow.Date;

        var registrosHoje = _context.RegistrosPonto.Count(r =>
            r.AcademicoId == academicoId.Value &&
            r.Data.Date == hoje
        );

        if (registrosHoje >= 2)
        {
            return BadRequest("Limite diário atingido: máximo de 2 expedientes por dia.");
        }

        var entradaAberta = _context.RegistrosPonto.Any(r =>
            r.AcademicoId == academicoId.Value &&
            r.Data.Date == hoje &&
            r.HoraSaida == null
        );

        if (entradaAberta)
        {
            return BadRequest("Já existe uma entrada aberta para este acadêmico.");
        }

        var registro = new RegistroPonto
        {
            AcademicoId = academicoId.Value,
            Data = DateTime.UtcNow.Date,
            HoraEntrada = DateTime.UtcNow
        };

        _context.RegistrosPonto.Add(registro);
        _context.SaveChanges();

        return Ok(registro);
    }

    [Authorize]
    [HttpPost("saida")]
    public IActionResult RegistrarSaida()
    {
        var academicoId = ObterAcademicoIdLogado();

        if (academicoId == null)
        {
            return Unauthorized();
        }

        var hoje = DateTime.UtcNow.Date;

        var academicoExiste = _context.Academicos.Any(a =>
            a.Id == academicoId.Value &&
            a.Ativo
        );

        if (!academicoExiste)
        {
            return NotFound("Academico nao encontrado.");
        }


        var registro = _context.RegistrosPonto
            .Where(r =>
                r.AcademicoId == academicoId.Value &&
                r.Data.Date == hoje &&
                r.HoraSaida == null
            )
            .OrderByDescending(r => r.HoraEntrada)
            .FirstOrDefault();

        if (registro == null)
        {
            return NotFound("Entrada não encontrada.");
        }

        if (registro.HoraEntrada == null)
        {
            return BadRequest("Registro de entrada invalido.");
        }

        var horaSaida = DateTime.UtcNow;

        registro.HoraSaida = horaSaida;
        registro.TotalTrabalhado = horaSaida - registro.HoraEntrada.Value;

        _context.SaveChanges();

        return Ok(registro);
    }
}
