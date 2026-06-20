namespace backend.Models;

public interface IAuditavel
{
    DateTime CreatedAt { get; set; }

    DateTime UpdatedAt { get; set; }
}
