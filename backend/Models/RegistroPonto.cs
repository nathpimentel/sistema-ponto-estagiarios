using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class RegistroPonto : IAuditavel
{
    public int Id { get; set; }

    public int AcademicoId { get; set; }

    public Academico? Academico { get; set; }

    public DateTime? HoraEntrada { get; set; }

    public DateTime? HoraSaida { get; set; }

    [NotMapped]
    public TimeSpan? TotalTrabalhado =>
        HoraEntrada.HasValue && HoraSaida.HasValue
            ? HoraSaida.Value - HoraEntrada.Value
            : null;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
