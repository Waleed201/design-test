using System.Collections.Generic;
using System.Threading.Tasks;
using CertificateEngine.Models;
using CertificateEngine.Services;
using Microsoft.AspNetCore.Mvc;

namespace CertificateEngine.Controllers
{
    [ApiController]
    [Route("api/template")]
    public class TemplateController : ControllerBase
    {
        private readonly ITemplateStore _store;
        private readonly IVariableService _variableService;

        public TemplateController(ITemplateStore store, IVariableService variableService)
        {
            _store = store;
            _variableService = variableService;
        }

        // POST /api/template
        [HttpPost]
        public ActionResult<Template> Post([FromBody] Template template)
        {
            if (string.IsNullOrWhiteSpace(template.FabricJson))
                return BadRequest("FabricJson is required.");

            var saved = _store.Save(template);
            return CreatedAtAction(nameof(Get), new { id = saved.Id }, saved);
        }

        // GET /api/template/{id}
        [HttpGet("{id:int}")]
        public ActionResult<Template> Get(int id)
        {
            var template = _store.GetById(id);
            if (template == null) return NotFound();
            return Ok(template);
        }

        // GET /api/template/latest
        [HttpGet("latest")]
        public ActionResult<Template> GetLatest()
        {
            var template = _store.GetLatest();
            if (template == null) return NotFound("No templates saved yet.");
            return Ok(template);
        }

        // GET /api/template
        [HttpGet]
        public ActionResult<IReadOnlyList<Template>> GetAll()
        {
            return Ok(_store.GetAll());
        }

        // GET /api/template/{id}/placeholders — returns detected variable keys
        [HttpGet("{id:int}/placeholders")]
        public ActionResult<IReadOnlyList<string>> GetPlaceholders(int id)
        {
            var template = _store.GetById(id);
            if (template == null) return NotFound();
            var keys = _variableService.ExtractPlaceholders(template.FabricJson);
            return Ok(keys);
        }
    }

    // ── PDF generation endpoint ────────────────────────────────────────────────

    [ApiController]
    [Route("api/generate-pdf")]
    public class PdfController : ControllerBase
    {
        private readonly ITemplateStore _store;
        private readonly IVariableService _variableService;
        private readonly IPdfService _pdfService;

        public PdfController(ITemplateStore store, IVariableService variableService, IPdfService pdfService)
        {
            _store = store;
            _variableService = variableService;
            _pdfService = pdfService;
        }

        // POST /api/generate-pdf/{id}
        // Body: { "trainee_name": "Alice", "course_title": "Angular 101", ... }
        [HttpPost("{id:int}")]
        public async Task<IActionResult> GeneratePdf(int id, [FromBody] Dictionary<string, string> variables)
        {
            var template = _store.GetById(id);
            if (template == null) return NotFound($"Template {id} not found.");

            var resolvedJson = _variableService.Replace(template.FabricJson, variables ?? new Dictionary<string, string>());

            var pdfBytes = await _pdfService.GeneratePdfAsync(resolvedJson);

            return File(pdfBytes, "application/pdf", "certificate.pdf");
        }

        // POST /api/generate-pdf/preview  (no stored template — pass JSON directly)
        [HttpPost("preview")]
        public async Task<IActionResult> GeneratePreview([FromBody] PreviewRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.FabricJson))
                return BadRequest("FabricJson is required.");

            var resolvedJson = _variableService.Replace(request.FabricJson, request.Variables ?? new Dictionary<string, string>());
            var pdfBytes = await _pdfService.GeneratePdfAsync(resolvedJson);
            return File(pdfBytes, "application/pdf", "certificate-preview.pdf");
        }
    }

    public class PreviewRequest
    {
        public string FabricJson { get; set; } = string.Empty;
        public Dictionary<string, string>? Variables { get; set; }
    }
}
