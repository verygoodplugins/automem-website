export function GET() {
  const script = `#!/bin/bash
echo "Installing AutoMem CLI..."
npx automem-cli init "$@"\n`;

  return new Response(script, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
