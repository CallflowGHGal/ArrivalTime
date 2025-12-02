using System.Web.Http;
using Swashbuckle.Application;

public class SwaggerConfig
{
    public static void Register()
    {
        var config = GlobalConfiguration.Configuration;
        config.EnableSwagger(c =>
        {
            c.SingleApiVersion("v1", "ArrivalTime API");
        })
        .EnableSwaggerUi();
    }
}