using backend.Models;
using Microsoft.AspNetCore.Identity;

namespace backend.Data;

public static class SeedData
{
    public static async Task InicializarAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();

        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var passwordHasher = scope.ServiceProvider
            .GetRequiredService<IPasswordHasher<Academico>>();

        var adminExiste = context.Academicos.Any(a => a.Email == "admin@subg.rio");

        if (adminExiste)
        {
            return;
        }

        var admin = new Academico
        {
            Nome = "Administrador",
            Email = "admin@subg.rio",
            Matricula = "ADMIN001",
            EhAdmin = true,
            Ativo = true,
            PrecisaDefinirSenha = false,
            HorarioEntrada = "",
            HorarioSaida = ""
        };

        admin.Senha = passwordHasher.HashPassword(admin, "Admin@123");

        context.Academicos.Add(admin);

        await context.SaveChangesAsync();
    }
}