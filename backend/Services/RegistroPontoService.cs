using backend.Models;
using backend.Data;
using backend.DTOs;
using backend.Services.Interfaces;

using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class RegistroPontoService
    : IRegistroPontoService
{
    private readonly AppDbContext _context;

    public RegistroPontoService(
        AppDbContext context
    )
    {
        _context = context;
    }

public async Task<
    PagedResponseDTO<
        RegistroPontoResponseDTO
    >
> ObterRegistrosAsync(
        int academicoIdLogado,
        bool usuarioEhAdmin,
        DateTime? dataInicio,
        DateTime? dataFim,
        int page,
        int pageSize
        
        
    )
    
    {
        var query = _context.RegistrosPonto
            .Include(r => r.Academico)
            .AsQueryable();

        if (!usuarioEhAdmin)
        {
            query = query.Where(r =>
                r.AcademicoId ==
                academicoIdLogado
            );
        }

        if (dataInicio.HasValue)
        {
            query = query.Where(r =>
                r.HoraEntrada >=
                dataInicio.Value
            );
        }

        if (dataFim.HasValue)
        {
            query = query.Where(r =>
                r.HoraEntrada <=
                dataFim.Value
            );
        }
        var totalItems =
        await query.CountAsync();

        var registros =
        await query
            .OrderByDescending(r =>
                r.HoraEntrada
            )
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r =>
                new RegistroPontoResponseDTO
                {
                    Id = r.Id,

                    AcademicoId =
                        r.AcademicoId,

                    NomeAcademico =
                        r.Academico != null
                            ? r.Academico.Nome
                            : "Acadêmico não encontrado",

                    Entrada =
                        r.HoraEntrada,

                    Saida =
                        r.HoraSaida,

                    TotalHoras =
                        r.TotalTrabalhado
                }
            )

            
            .ToListAsync();

            return new PagedResponseDTO<
                RegistroPontoResponseDTO
            >
            {
                Data = registros,

                Page = page,

                PageSize = pageSize,

                TotalItems = totalItems
            };
    }

    

    public async Task<bool>
    RegistrarEntradaAsync(
        int academicoId
    )
{
    var academicoExiste =
        await _context.Academicos
            .AnyAsync(a =>
                a.Id == academicoId &&
                a.Ativo
            );

    if (!academicoExiste)
    {
        return false;
    }

var inicioHoje = DateTime.UtcNow.Date;
var inicioAmanha = inicioHoje.AddDays(1);

var quantidadeRegistrosHoje =
    await _context.RegistrosPonto
        .CountAsync(r =>
            r.AcademicoId == academicoId &&
            r.HoraEntrada.HasValue &&
            r.HoraEntrada >= inicioHoje &&
            r.HoraEntrada < inicioAmanha
        );

    if (quantidadeRegistrosHoje >= 2)
    {
        return false;
    }

    var possuiEntradaAberta =
        await _context.RegistrosPonto
            .AnyAsync(r =>
                r.AcademicoId ==
                    academicoId &&
                r.HoraSaida == null
            );

    if (possuiEntradaAberta)
    {
        return false;
    }

    var registro = new RegistroPonto
    {
        AcademicoId = academicoId,

        HoraEntrada = DateTime.UtcNow
    };

    _context.RegistrosPonto.Add(registro);

    await _context.SaveChangesAsync();

    return true;
}
public async Task<bool>
    RegistrarSaidaAsync(
        int academicoId
    )
{
    var registro =
        await _context.RegistrosPonto
            .Where(r =>
                r.AcademicoId ==
                    academicoId &&

                r.HoraSaida == null
            )
            .OrderByDescending(r =>
                r.HoraEntrada
            )
            .FirstOrDefaultAsync();

    if (registro == null)
    {
        return false;
    }

    registro.HoraSaida = DateTime.UtcNow;

    if (
        registro.HoraEntrada.HasValue &&
        registro.HoraSaida.HasValue
    )
    {
        registro.TotalTrabalhado =
            registro.HoraSaida.Value -
            registro.HoraEntrada.Value;
    }

    await _context.SaveChangesAsync();

    return true;
}
}