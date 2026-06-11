using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Identity;
using backend.Models;
using backend.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Security.Claims;
using backend.Security;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", limiterOptions =>
    {
        limiterOptions.PermitLimit = 5;

        limiterOptions.Window = TimeSpan.FromMinutes(1);

        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;

        limiterOptions.QueueLimit = 0;
    });

    options.RejectionStatusCode = 429;
});

//Permite usar os controllers da API
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Sistema Ponto Estagiarios API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Informe o token JWT."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

//Libera o front consumir a API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            var allowedOrigins = builder.Configuration
                .GetSection("Cors:AllowedOrigins")
                .Get<string[]>() ?? Array.Empty<string>();

            policy.WithOrigins(allowedOrigins)
                  .WithHeaders("Content-Type", "Authorization")
                  .WithMethods("GET", "POST", "PUT", "DELETE")
                .AllowCredentials();
        });
});

builder.Services.AddScoped<IPasswordHasher<Academico>, PasswordHasher<Academico>>();

var jwtKey = builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "Configure Jwt:Key em User Secrets ou variável de ambiente."
    );
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
       options.RequireHttpsMetadata = false;

       options.TokenValidationParameters = new TokenValidationParameters
{
    ValidateIssuer = true,
    ValidateAudience = true,
    ValidateLifetime = true,
    ValidateIssuerSigningKey = true,

    ValidIssuer = builder.Configuration["Jwt:Issuer"],
    ValidAudience = builder.Configuration["Jwt:Audience"],

    IssuerSigningKey = new SymmetricSecurityKey(
        Encoding.UTF8.GetBytes(jwtKey)
    ),

    ClockSkew = TimeSpan.Zero
};

options.Events = new JwtBearerEvents
{
    OnTokenValidated = async context =>
    {
        var db = context.HttpContext.RequestServices
            .GetRequiredService<AppDbContext>();

        var userIdClaim = context.Principal?
            .FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(userIdClaim, out var userId))
        {
            context.Fail("Token inválido.");
            return;
        }

        var usuarioAtivo = await db.Academicos
            .AnyAsync(a =>
                a.Id == userId &&
                a.Ativo
            );

        if (!usuarioAtivo)
        {
            context.Fail("Usuário desativado.");
        }
    }
};

       options.Events = new JwtBearerEvents
       {
           OnMessageReceived = context =>
           {
               if (
                   string.IsNullOrWhiteSpace(context.Token) &&
                   context.Request.Cookies.TryGetValue(
                       AuthCookieNames.AccessToken,
                       out var cookieToken
                   )
               )
               {
                   context.Token = cookieToken;
               }

               return Task.CompletedTask;
           },

           OnTokenValidated = async context =>
           {
               var idClaim = context.Principal?
                   .FindFirstValue(ClaimTypes.NameIdentifier);

               if (!int.TryParse(idClaim, out var academicoId))
               {
                   context.Fail("Token sem identificador de usuário.");
                   return;
               }

               var dbContext = context.HttpContext.RequestServices
                   .GetRequiredService<AppDbContext>();

               var usuarioAtivo = await dbContext.Academicos
                   .AnyAsync(a => a.Id == academicoId && a.Ativo);

               if (!usuarioAtivo)
               {
                   context.Fail("Usuário inativo.");
               }
           }
       };
    });

builder.Services.AddAuthorization();

var defaultConnection =
    builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(defaultConnection))
{
    throw new InvalidOperationException(
        "Configure ConnectionStrings:DefaultConnection em User Secrets ou variável de ambiente."
    );
}

//Configura conexão com SQL server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
    defaultConnection
));

var app = builder.Build();


app.UseSwagger();
app.UseSwaggerUI();

//Aplica configuração do CORS (faz o backend usar as regras de acesso)
app.UseCors("AllowFrontend");

app.UseHttpsRedirection();

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

//Ativa rota dos controllers
app.MapControllers();

await SeedData.InicializarAsync(app.Services);

app.Run();
