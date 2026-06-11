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
    }
}