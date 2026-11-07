---
title: Quick Start
description: Choose where AutoMem runs, connect an agent, and recall your first memory in a fresh chat.
sidebar:
  order: 1
---

## Connect your agent

Run the command for your selected route above. You need [Node.js](https://nodejs.org/) 20.19+, 22.13+, or 24+ and npm. The installer asks for your endpoint, lets you select agents, then shows a plan before applying it.

For a prebuilt Docker setup, enter `http://localhost:8001` and your `AUTOMEM_API_TOKEN` using **Existing Endpoint**. Hosted users can choose [InstaPods](https://instapods.com/apps/automem/?ref=jack) or [Railway](/docs/deployment/railway/).

Fully quit and reopen your agent after installation. Need help with a prompt? See the [installer walkthrough](/docs/cli/setup/#walk-through-the-installer-prompt-by-prompt).

## Verify it worked

### Try it end to end

In your connected agent, send:

```text title="Chat 1 · Save a memory"
Use AutoMem to remember that my demo workspace is called Lantern.
```

Look for a successful `store_memory` call. Then open a **fresh chat** and send:

```text title="Chat 2 · Recall it"
Use AutoMem to look up the name of my demo workspace.
```

<div class="first-recall-success">

**✓ First memory recalled.** You're connected when `recall_memory` returns **Lantern** in the new chat.

</div>

If the result is empty, give background indexing a moment and retry. Check that both chats use the same endpoint. For connection errors, see [health and token checks](/docs/cli/setup/#verify-it-worked) or your agent's [platform guide](/docs/platforms/claude-desktop/).

Add more agents whenever you like. Connect them to the same AutoMem endpoint to share memories.
