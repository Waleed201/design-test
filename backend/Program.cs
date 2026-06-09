using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace CertificateEngine
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                    // Bind address/port comes from the ASPNETCORE_URLS environment
                    // variable (http://+:8080 in the container). Do not hard-code a
                    // UseUrls() here — it would override that env var and bind to the
                    // wrong port/interface.
                });
    }
}
