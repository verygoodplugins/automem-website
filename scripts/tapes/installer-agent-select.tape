# AutoMem guided installer — "Install AutoMem into which agents?" (multi-select)
# Existing-Endpoint path against the local /health stub; dry-run (preamble) so
# nothing is written. Stops at the agent picker.
# Run from repo root: vhs scripts/tapes/installer-agent-select.tape
Output "scripts/tapes/out/_rec_agents.gif"
Require node

Set Shell "bash"
Set FontSize 18
Set Width 1200
Set Height 880
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
Screenshot "scripts/tapes/out/installer-agent-select.png"
Sleep 500ms
