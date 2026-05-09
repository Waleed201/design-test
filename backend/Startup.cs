using CertificateEngine.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace CertificateEngine
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        public void ConfigureServices(IServiceCollection services)
        {
            services.AddCors(options =>
            {
                options.AddDefaultPolicy(builder =>
                    // In production, requests arrive from the Nginx frontend container on the same
                    // Cloud Run project, so we allow any origin (nginx enforces CORS externally).
                    builder.AllowAnyOrigin()
                           .AllowAnyHeader()
                           .AllowAnyMethod());
            });

            services.AddControllers()
                    .AddNewtonsoftJson(options =>
                        options.SerializerSettings.NullValueHandling =
                            Newtonsoft.Json.NullValueHandling.Ignore);

            services.AddSingleton<ITemplateStore, TemplateStore>();
            services.AddSingleton<IVariableService, VariableService>();
            // PdfService needs IConfiguration to read Puppeteer:ExecutablePath
            services.AddSingleton<IPdfService>(sp =>
                new PdfService(sp.GetRequiredService<IConfiguration>()));
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
                app.UseDeveloperExceptionPage();

            app.UseCors();
            app.UseRouting();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
