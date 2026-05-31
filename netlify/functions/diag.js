// diag.js — shows environment config (remove after debugging)
exports.handler = async function() {
  const REPO   = process.env.GITHUB_REPO   || "(no configurado)";
  const BRANCH = process.env.GITHUB_BRANCH || "main (default)";
  const hasToken  = !!process.env.GITHUB_TOKEN;
  const hasAdmin  = !!process.env.ADMIN_TOKEN;
  const hasAnthro = !!process.env.ANTHROPIC_API_KEY;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
      GITHUB_REPO: REPO,
      GITHUB_BRANCH: BRANCH,
      GITHUB_TOKEN: hasToken ? "✓ configurado" : "✗ NO configurado",
      ADMIN_TOKEN:  hasAdmin  ? "✓ configurado" : "✗ NO configurado",
      ANTHROPIC_API_KEY: hasAnthro ? "✓ configurado" : "✗ NO configurado",
    }, null, 2)
  };
};
