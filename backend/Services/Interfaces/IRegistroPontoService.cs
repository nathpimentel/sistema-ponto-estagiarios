using backend.DTOs;

namespace backend.Services.Interfaces;

public interface IRegistroPontoService
{
    Task<PagedResponseDTO<
    RegistroPontoResponseDTO>>
    ObterRegistrosAsync(
            int academicoIdLogado,
            bool usuarioEhAdmin,
            DateTime? dataInicio,
            DateTime? dataFim,
            int page,
            int pageSize
            
        );

    Task<bool> RegistrarEntradaAsync(
int academicoId
);
    Task<bool> RegistrarSaidaAsync(
        int academicoId
    );
}