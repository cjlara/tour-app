exports.handler = async function() {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
      GITHUB_REPO:       process.env.GITHUB_REPO       || "(no configurado)",
      GITHUB_TOKEN:      process.env.GITHUB_TOKEN       ? "OK" : "(no configurado)",
      ADMIN_TOKEN:       process.env.ADMIN_TOKEN        ? "OK" : "(no configurado)",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY  ? "OK" : "(no configurado)",
      NODE_VERSION:      process.version,
      timestamp:         new Date().toISOString()
    }, null, 2)
  };
};
