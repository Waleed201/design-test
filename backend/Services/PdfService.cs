using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using PuppeteerSharp;

namespace CertificateEngine.Services
{
    public interface IPdfService
    {
        Task<byte[]> GeneratePdfAsync(string resolvedFabricJson);
    }

    public class PdfService : IPdfService
    {
        // Inline HTML renderer — loads Fabric.js from CDN and renders the JSON onto a canvas,
        // then Puppeteer captures it as a PDF.
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
            // Download Chromium on first run (cached afterward)
            var fetcher = new BrowserFetcher();
            await fetcher.DownloadAsync(BrowserFetcher.DefaultChromiumRevision);

            await using var browser = await Puppeteer.LaunchAsync(new LaunchOptions
            {
                Headless = true,
                Args = new[] { "--no-sandbox", "--disable-setuid-sandbox" }
            });

            await using var page = await browser.NewPageAsync();

            // Escape JSON for embedding in JS string context
            var escapedJson = resolvedFabricJson
                .Replace("\\", "\\\\")
                .Replace("'", "\\'");

            var html = string.Format(HtmlTemplate, resolvedFabricJson);

            await page.SetContentAsync(html, new NavigationOptions
            {
                WaitUntil = new[] { WaitUntilNavigation.Load }
            });

            // Wait for Fabric.js render to complete (poll flag set in JS)
            await page.WaitForFunctionAsync("() => window.__RENDER_DONE__ === true",
                new WaitForFunctionOptions { Timeout = 15000 });

            await page.SetViewportAsync(new ViewPortOptions { Width = 1000, Height = 700 });

            var pdf = await page.PdfAsync(new PdfOptions
            {
                Width = "1000px",
                Height = "700px",
                PrintBackground = true,
                MarginOptions = new MarginOptions { Top = "0", Bottom = "0", Left = "0", Right = "0" }
            });

            return pdf;
        }
    }
}
