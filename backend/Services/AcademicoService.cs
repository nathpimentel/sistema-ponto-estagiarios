using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services.Interfaces;

using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace backend.Services;

public class AcademicoService
    : IAcademicoService
{
    private readonly AppDbContext _context;

    private readonly IConfiguration _configuration;

    private readonly IPasswordHasher<Academico>
        _passwordHasher;

    public AcademicoService(
        AppDbContext context,
        IConfiguration configuration,
        IPasswordHasher<Academico> passwordHasher
    )
    {
        _context = context;
        _configuration = configuration;
        _passwordHasher = passwordHasher;
    }

    public async Task<LoginResponseDTO?> LoginAsync(
        LoginRequest dadosLogin
    )
    {
        var academico =
            await _context.Academicos
                .FirstOrDefaultAsync(a =>
                    a.Ativo &&
                    a.Email == dadosLogin.Email
                );

        if (academico == null || !academico.Ativo)
            return null;

        if (academico.PrecisaDefinirSenha)
            return null;

        var resultadoSenha =
            _passwordHasher.VerifyHashedPassword(
                academico,
                academico.Senha,
                dadosLogin.Senha
            );

        if (resultadoSenha == PasswordVerificationResult.Failed)
            return null;

        var role = academico.EhAdmin ? "Admin" : "Academico";

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, academico.Id.ToString()),
            new Claim(ClaimTypes.Name, academico.Nome),
            new Claim(ClaimTypes.Email, academico.Email),
            new Claim(ClaimTypes.Role, role)
        };

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!)
        );

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: credentials
        );

        var tokenString =
            new JwtSecurityTokenHandler().WriteToken(token);

        return new LoginResponseDTO
        {
            Token = tokenString,
            Id = academico.Id,
            Matricula = academico.Matricula,
            Nome = academico.Nome,
            Email = academico.Email,
            EhAdmin = academico.EhAdmin,
            HorarioEntrada = academico.HorarioEntrada?.ToString("HH:mm") ?? string.Empty,
            HorarioSaida = academico.HorarioSaida?.ToString("HH:mm") ?? string.Empty,
            PrecisaDefinirSenha = academico.PrecisaDefinirSenha,
            Ativo = academico.Ativo
        };
    }

    public async Task<AcademicoResponseDTO?> CriarAsync(
        CriarAcademicoRequest dadosCadastro
    )
    {
        if (string.IsNullOrWhiteSpace(dadosCadastro.Nome))
            return null;

        if (string.IsNullOrWhiteSpace(dadosCadastro.Email))
            return null;

        var emailJaExiste = await _context.Academicos.AnyAsync(a =>
            a.Ativo && a.Email == dadosCadastro.Email
        );

        if (emailJaExiste)
            return null;

        var matriculaJaExiste = await _context.Academicos.AnyAsync(a =>
            a.Ativo && a.Matricula == dadosCadastro.Matricula
        );

        if (matriculaJaExiste)
            return null;

        TimeOnly? horarioEntrada = TimeOnly.TryParse(
            dadosCadastro.HorarioEntrada, out var he
        ) ? he : null;

        TimeOnly? horarioSaida = TimeOnly.TryParse(
            dadosCadastro.HorarioSaida, out var hs
        ) ? hs : null;

        var academico = new Academico
        {
            PrimeiroAcessoToken = Guid.NewGuid().ToString(),
            PrimeiroAcessoTokenExpiraEm = DateTime.UtcNow.AddHours(24),
            Matricula = dadosCadastro.Matricula,
            Nome = dadosCadastro.Nome,
            Email = dadosCadastro.Email,
            EhAdmin = dadosCadastro.EhAdmin,
            HorarioEntrada = horarioEntrada,
            HorarioSaida = horarioSaida,
            PrecisaDefinirSenha = true,
            Ativo = true
        };

        _context.Academicos.Add(academico);
        await _context.SaveChangesAsync();

        return new AcademicoResponseDTO
        {
            Id = academico.Id,
            Matricula = academico.Matricula,
            Nome = academico.Nome,
            Email = academico.Email,
            EhAdmin = academico.EhAdmin,
            HorarioEntrada = academico.HorarioEntrada?.ToString("HH:mm") ?? string.Empty,
            HorarioSaida = academico.HorarioSaida?.ToString("HH:mm") ?? string.Empty,
            PrecisaDefinirSenha = academico.PrecisaDefinirSenha,
            Ativo = academico.Ativo,
            PrimeiroAcessoToken = academico.PrimeiroAcessoToken
        };
    }

    public async Task<bool> DefinirPrimeiraSenhaAsync(
        PrimeiroAcessoRequest dadosPrimeiroAcesso
    )
    {
        var academico = await _context.Academicos
            .FirstOrDefaultAsync(a =>
                a.Ativo &&
                a.Email == dadosPrimeiroAcesso.Email &&
                a.PrimeiroAcessoToken == dadosPrimeiroAcesso.Token &&
                a.PrimeiroAcessoTokenExpiraEm > DateTime.UtcNow
            );

        if (academico == null)
            return false;

        academico.Senha = _passwordHasher.HashPassword(
            academico,
            dadosPrimeiroAcesso.NovaSenha
        );

        academico.PrecisaDefinirSenha = false;
        academico.PrimeiroAcessoToken = null;
        academico.PrimeiroAcessoTokenExpiraEm = null;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeletarAsync(int id)
    {
        var academico = await _context.Academicos.FindAsync(id);

        if (academico == null || !academico.Ativo)
            return false;

        academico.Ativo = false;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<PagedResponseDTO<AcademicoResponseDTO>> ObterPaginadoAsync(
        int page,
        int pageSize
    )
    {
        var query = _context.Academicos.Where(a => a.Ativo);

        var totalItems = await query.CountAsync();

        var academicos = await query
            .OrderBy(a => a.Nome)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AcademicoResponseDTO
            {
                Id = a.Id,
                Matricula = a.Matricula,
                Nome = a.Nome,
                Email = a.Email,
                EhAdmin = a.EhAdmin,
                HorarioEntrada = a.HorarioEntrada != null
                    ? a.HorarioEntrada.Value.ToString("HH:mm")
                    : string.Empty,
                HorarioSaida = a.HorarioSaida != null
                    ? a.HorarioSaida.Value.ToString("HH:mm")
                    : string.Empty,
                PrecisaDefinirSenha = a.PrecisaDefinirSenha,
                Ativo = a.Ativo
            })
            .ToListAsync();

        return new PagedResponseDTO<AcademicoResponseDTO>
        {
            Data = academicos,
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems
        };
    }
}
