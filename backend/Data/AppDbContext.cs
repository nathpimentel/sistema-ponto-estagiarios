using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Academico> Academicos { get; set; }

    public DbSet<RegistroPonto> RegistrosPonto { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Academico>()
            .HasIndex(a => a.Email)
            .IsUnique();

        modelBuilder.Entity<Academico>()
            .HasIndex(a => a.Matricula)
            .IsUnique();

        // 5.2 — índice composto para consultas por acadêmico e data
        modelBuilder.Entity<RegistroPonto>()
            .HasIndex(r => new { r.AcademicoId, r.HoraEntrada });

        // 3.9 — impede exclusão física acidental de acadêmico com registros
        modelBuilder.Entity<RegistroPonto>()
            .HasOne(r => r.Academico)
            .WithMany()
            .HasForeignKey(r => r.AcademicoId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    // 3.8 — preenche CreatedAt/UpdatedAt automaticamente
    public override Task<int> SaveChangesAsync(
        CancellationToken cancellationToken = default
    )
    {
        var agora = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<IAuditavel>())
        {
            if (entry.State == EntityState.Added)
                entry.Entity.CreatedAt = agora;

            if (entry.State is EntityState.Added or EntityState.Modified)
                entry.Entity.UpdatedAt = agora;
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
