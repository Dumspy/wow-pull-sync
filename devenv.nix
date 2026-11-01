{ pkgs, ... }:

{
  # Node.js 22 (LTS) + npm for the Vite/React frontend and the Cloudflare Worker
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    npm.enable = true;
    # Runs `npm install` on devenv initialisation
    npm.install.enable = true;
  };

  # Scaffolds the Wrangler secrets file on first entry (gitignored)
  enterShell = ''
    if [ ! -f .dev.vars ]; then
      cp .dev.vars.example .dev.vars
      echo "Created .dev.vars from .dev.vars.example — fill in your API keys (see README.md)."
    fi
  '';

  # `devenv up` starts the Vite dev server, which also runs the Cloudflare Worker
  processes.dev.exec = "npm run dev";
}
