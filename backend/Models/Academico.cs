using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Academico : IAuditavel
{
    public int Id { get; set; }

    [MaxLength(20)]
    public string Matricula { get; set; } = string.Empty;

    [MaxLength(120)]
    public string Nome { get; set; } = string.Empty;

    [MaxLength(320)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Senha { get; set; } = string.Empty;

    public bool PrecisaDefinirSenha { get; set; } = true;

    public bool EhAdmin { get; set; } = false;

    public TimeOnly? HorarioEntrada { get; set; }

    public TimeOnly? HorarioSaida { get; set; }

    public bool Ativo { get; set; } = true;

    public string? PrimeiroAcessoToken { get; set; }

    public DateTime? PrimeiroAcessoTokenExpiraEm { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
