# AutoMem guided installer — "Where should AutoMem run?" (first prompt)
# Run from repo root: vhs scripts/tapes/installer-target-select.tape
# See scripts/tapes/README.md for prerequisites (VHS + health stub + env).
Output "scripts/tapes/out/_rec_target.gif"
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
Screenshot "scripts/tapes/out/installer-target-select.png"
Sleep 500ms
