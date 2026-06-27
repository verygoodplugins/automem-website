# AutoMem guided installer — the review plan (dry-run, nothing written)
# Existing-Endpoint path against the local /health stub, default agents, Claude
# Code plugin mode. Dry-run (preamble) prints the plan and stops.
# Run from repo root: vhs scripts/tapes/installer-review-plan.tape
Output "scripts/tapes/out/_rec_plan.gif"
Require node

Set Shell "bash"
Set FontSize 18
Set Width 1200
Set Height 1100
Set Padding 30

Hide
Type "source scripts/tapes/_preamble.sh"
Enter
Sleep 400ms
Show
Type "npx @verygoodplugins/mcp-automem install"
Enter
Sleep 7s
Down
Sleep 250ms
Down
Sleep 250ms
Enter
Sleep 1500ms
Type "http://127.0.0.1:8001"
Sleep 300ms
Enter
Sleep 1800ms
Enter
Sleep 3000ms
Enter
Sleep 2000ms
Enter
Sleep 3500ms
Screenshot "scripts/tapes/out/installer-review-plan.png"
Sleep 600ms
