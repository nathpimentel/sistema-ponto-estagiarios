namespace backend.DTOs;

public class AcademicoResponseDTO
{
    public int Id { get; set; }

    public string Matricula { get; set; } = string.Empty;

    public string Nome { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public bool EhAdmin { get; set; }

    public string HorarioEntrada { get; set; } = string.Empty;

    public string HorarioSaida { get; set; } = string.Empty;

    public bool PrecisaDefinirSenha { get; set; }

    public bool Ativo { get; set; }

    public string? PrimeiroAcessoToken { get; set; }
}