# AutoMem guided installer — "How should we stand up your hosted AutoMem?"
# Stops at the provider prompt (no provider chosen → no deploy is ever triggered).
# Run from repo root: vhs scripts/tapes/installer-cloud-provider.tape
Output "scripts/tapes/out/_rec_cloud.gif"
Require node

Set Shell "bash"
Set FontSize 18
Set Width 1200
Set Height 720
Set Padding 30

Hide
Type "source scripts/tapes/_preamble.sh"
Enter
Sleep 500ms
Show
Type "npx @verygoodplugins/mcp-automem install"
Enter
Sleep 7s
Enter
Sleep 2500ms
Screenshot "scripts/tapes/out/installer-cloud-provider.png"
Sleep 500ms
