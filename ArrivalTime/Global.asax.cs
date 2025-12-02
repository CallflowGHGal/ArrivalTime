using System.Web.Http;

namespace ArrivalTime
{
    public class WebApiApplication : System.Web.HttpApplication
    {
        protected void Application_Start()
        {
            GlobalConfiguration.Configure(WebApiConfig.Register);
            // SwaggerConfig.Register(); <-- removed, Swagger is registered by PreApplicationStartMethod
        }
    }
}
