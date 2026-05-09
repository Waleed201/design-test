using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using CertificateEngine.Models;

namespace CertificateEngine.Services
{
    /// <summary>
    /// In-memory store for the PoC. Swap out for a real DB (EF Core) in production.
    /// </summary>
    public interface ITemplateStore
    {
        Template Save(Template template);
        Template? GetById(int id);
        Template? GetLatest();
        IReadOnlyList<Template> GetAll();
    }

    public class TemplateStore : ITemplateStore
    {
        private readonly ConcurrentDictionary<int, Template> _store = new();
        private int _nextId = 1;

        public Template Save(Template template)
        {
            if (template.Id == 0)
            {
                template.Id = System.Threading.Interlocked.Increment(ref _nextId) - 1;
                _store[template.Id] = template;
            }
            else
            {
                template.UpdatedAt = System.DateTime.UtcNow;
                _store[template.Id] = template;
            }
            return template;
        }

        public Template? GetById(int id) =>
            _store.TryGetValue(id, out var t) ? t : null;

        public Template? GetLatest() =>
            _store.Values.OrderByDescending(t => t.UpdatedAt).FirstOrDefault();

        public IReadOnlyList<Template> GetAll() =>
            _store.Values.OrderByDescending(t => t.UpdatedAt).ToList();
    }
}
