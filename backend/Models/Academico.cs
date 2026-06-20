namespace backend.Models;

// Representa um acadêmico cadastrado no sistema
public class Academico
{
    public int Id { get; set; }

    public string Matricula { get; set; } = string.Empty;

    public string Nome { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Senha { get; set; } = string.Empty;

    public bool PrecisaDefinirSenha { get; set; } = true;

    public bool EhAdmin { get; set; } = false;

    public string HorarioEntrada { get; set; } = string.Empty;

    public string HorarioSaida { get; set; } = string.Empty;

    public bool Ativo { get; set; } = true;

    public string? PrimeiroAcessoToken { get; set; }

    public DateTime? PrimeiroAcessoTokenExpiraEm { get; set; }
}