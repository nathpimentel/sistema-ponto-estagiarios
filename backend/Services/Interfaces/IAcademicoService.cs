using backend.DTOs;
using backend.Models;

namespace backend.Services.Interfaces;

public interface IAcademicoService
{
    Task<LoginResponseDTO?> LoginAsync(
        LoginRequest dadosLogin
    );

    Task<AcademicoResponseDTO?> CriarAsync(
        CriarAcademicoRequest dadosCadastro
    );

    Task<bool> DefinirPrimeiraSenhaAsync(
    PrimeiroAcessoRequest dadosPrimeiroAcesso
    );

    Task<bool> DeletarAsync(int id);

    
    Task<PagedResponseDTO<AcademicoResponseDTO>>
    ObterPaginadoAsync(
        int page,
        int pageSize
    );
}

