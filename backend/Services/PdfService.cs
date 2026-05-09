using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using PuppeteerSharp;
using PuppeteerSharp.Media;

namespace CertificateEngine.Services
{
    public interface IPdfService
    {
        Task<byte[]> GeneratePdfAsync(string resolvedFabricJson);
    }

    public class PdfService : IPdfService
    {
        // Reads executable path from env var PUPPETEER_EXECUTABLE_PATH, then config,
        // then falls back to a local Chromium download (dev only).
        private readonly string? _executablePath;

        public PdfService(IConfiguration config)
        {
            _executablePath =
                Environment.GetEnvironmentVariable("PUPPETEER_EXECUTABLE_PATH")
                ?? config["Puppeteer:ExecutablePath"];
        }

        // Inline HTML renderer: loads Fabric.js from CDN, renders JSON, signals done.
        private const string HtmlTemplate = @"<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ width: 1000px; height: 700px; overflow: hidden; background: white; }}
    canvas {{ display: block; }}
  </style>
</head>
<body>
  <canvas id='c' width='1000' height='700'></canvas>
  <script src='https://cdnjs.cloudflare.com/ajax/libs/fabric.js/4.6.0/fabric.min.js'></script>
  <script>
    window.onload = function() {{
      var canvas = new fabric.Canvas('c', {{ width: 1000, height: 700 }});
      canvas.loadFromJSON({0}, function() {{
        canvas.renderAll();
        window.__RENDER_DONE__ = true;
      }});
    }};
  </script>
</body>
</html>";

        public async Task<byte[]> GeneratePdfAsync(string resolvedFabricJson)
        {
            var launchOptions = new LaunchOptions
            {
                Headless = true,
                Args = new[]
                {
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",   // required in containers with limited /dev/shm
                    "--disable-gpu",
                    "--single-process"            // reduces memory in Cloud Run single-CPU tier
                }
            };

            // Use system Chromium in container; fall back to auto-download in local dev
            if (!string.IsNullOrEmpty(_executablePath))
            {
                launchOptions.ExecutablePath = _executablePath;
            }
            else
            {
                var fetcher = new BrowserFetcher();
                await fetcher.DownloadAsync(BrowserFetcher.DefaultChromiumRevision);
            }

            await using var browser = await Puppeteer.LaunchAsync(launchOptions);
            await using var page = await browser.NewPageAsync();

            await page.SetViewportAsync(new ViewPortOptions { Width = 1000, Height = 700 });

            var html = string.Format(HtmlTemplate, resolvedFabricJson);
            await page.SetContentAsync(html, new NavigationOptions
            {
                WaitUntil = new[] { WaitUntilNavigation.Load }
            });

            // Poll until Fabric.js signals render complete
            await page.WaitForFunctionAsync(
                "() => window.__RENDER_DONE__ === true",
                new WaitForFunctionOptions { Timeout = 20000 });

            return await page.PdfAsync(new PdfOptions
            {
                Width = "1000px",
                Height = "700px",
                PrintBackground = true,
                MarginOptions = new MarginOptions { Top = "0", Bottom = "0", Left = "0", Right = "0" }
            });
        }
    }
}
