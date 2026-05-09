using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace CertificateEngine.Services
{
    public interface IVariableService
    {
        string Replace(string fabricJson, Dictionary<string, string> variables);
        IReadOnlyList<string> ExtractPlaceholders(string fabricJson);
    }

    public class VariableService : IVariableService
    {
        // Pre-compiled pattern for high-performance matching
        private static readonly Regex PlaceholderPattern =
            new Regex(@"\{\{([^}]+)\}\}", RegexOptions.Compiled);

        /// <summary>
        /// Performs a single-pass, high-performance string replacement of all
        /// {{key}} tokens found in the Fabric.js JSON string.
        /// </summary>
        public string Replace(string fabricJson, Dictionary<string, string> variables)
        {
            if (string.IsNullOrEmpty(fabricJson) || variables == null || variables.Count == 0)
                return fabricJson;

            return PlaceholderPattern.Replace(fabricJson, match =>
            {
                var key = match.Groups[1].Value.Trim();
                return variables.TryGetValue(key, out var value) ? value : match.Value;
            });
        }

        /// <summary>
        /// Extracts all unique placeholder keys from the Fabric JSON string.
        /// </summary>
        public IReadOnlyList<string> ExtractPlaceholders(string fabricJson)
        {
            var keys = new HashSet<string>();
            foreach (Match m in PlaceholderPattern.Matches(fabricJson))
                keys.Add(m.Groups[1].Value.Trim());
            return new List<string>(keys);
        }
    }
}
