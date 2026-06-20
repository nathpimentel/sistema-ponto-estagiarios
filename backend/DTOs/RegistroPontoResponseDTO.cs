namespace backend.DTOs;

public class RegistroPontoResponseDTO
{
    public int Id { get; set; }

    public int AcademicoId { get; set; }

    public string NomeAcademico { get; set; } =
        string.Empty;

    public DateTime? Entrada { get; set; }

    public DateTime? Saida { get; set; }

    public TimeSpan? TotalHoras { get; set; }
}