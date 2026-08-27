using System.Text;
using GestionBeneficios.Application.Services;
using GestionBeneficios.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var jwtKey = builder.Configuration["Authentication:DevJwt:Key"]
             ?? "DEV_ONLY_CHANGE_ME_GestionBeneficios_ADEX_2026!";
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Authentication:DevJwt:Issuer"] ?? "gestion-beneficios-dev",
            ValidAudience = builder.Configuration["Authentication:DevJwt:Audience"] ?? "gestion-beneficios-spa",
            IssuerSigningKey = signingKey,
            RoleClaimType = System.Security.Claims.ClaimTypes.Role
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(o => o.AddPolicy("spa", p =>
    p.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:4200"])
        .AllowAnyHeader()
        .AllowAnyMethod()));

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

await app.Services.SeedAsync();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseMiddleware<GestionBeneficios.Api.ExceptionMiddleware>();
app.UseCors("spa");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program;
