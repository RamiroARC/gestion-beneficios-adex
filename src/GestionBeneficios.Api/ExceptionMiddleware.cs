using System.Net;
using System.Text.Json;

namespace GestionBeneficios.Api;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled error");
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = ex switch
            {
                KeyNotFoundException => (int)HttpStatusCode.NotFound,
                UnauthorizedAccessException => (int)HttpStatusCode.Forbidden,
                InvalidOperationException or ArgumentException => (int)HttpStatusCode.BadRequest,
                _ => (int)HttpStatusCode.InternalServerError
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                code = context.Response.StatusCode,
                message = ex.Message
            }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
        }
    }
}
