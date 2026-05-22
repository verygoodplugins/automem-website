---
title: "You Don't Need to Spend Most of Your Day Thinking About Memory to Have a Memory-Powered AI Assistant"
description: "A beginner-friendly guide to running AutoMem locally — completely free, no coding experience required"
date: "2026-01-26"
tags:
  - tutorial
  - docker
  - beginners
---

People keep asking "how do I actually test this thing?"

Here's the honest answer: **It's free and takes about 15 minutes if you've never done anything like this before.**

If you already know Docker? Five minutes. If the word "terminal" makes you nervous? Still doable — I'll walk you through it.

This might be your first time running open source software. That's totally fine. By the end of this, you'll have a working AI memory system running on your own computer. No monthly fees. No data going to some company's servers. Just you.

## What You're About to Do

You're going to:
1. Install a free program called Docker
2. Download AutoMem from GitHub
3. Run it
4. Connect it to Claude or ChatGPT

That's it. No coding. No configuration files. No cloud accounts.

## Step 1: Install Docker

Docker is a tool that runs software in isolated containers. You don't need to understand how it works — just install it.

**Download Docker Desktop:**
- **Mac:** [Download for Mac](https://docs.docker.com/desktop/install/mac-install/)
- **Windows:** [Download for Windows](https://docs.docker.com/desktop/install/windows-install/)
- **Linux:** [Download for Linux](https://docs.docker.com/desktop/install/linux-install/)

Install it like any other program. Open it once to make sure it's running. You'll see a whale icon in your menu bar or system tray.

## Step 2: Open a Terminal

This is where beginners usually get scared. Don't be.

A terminal is just a text-based way to tell your computer what to do. You type commands, hit enter, stuff happens.

**How to open it:**

- **Mac:** Press `Cmd + Space`, type "Terminal", hit Enter
- **Windows:** Press `Windows key`, type "PowerShell", hit Enter
- **Linux:** You probably already know this one

You'll see a window with a blinking cursor. That's it. You're in.

## Step 3: Download AutoMem

Copy this command and paste it into your terminal:

```bash
git clone https://github.com/verygoodplugins/automem.git
```

Hit Enter. You'll see some text scroll by. That's it downloading.

**Don't have git?**
- Mac: It'll prompt you to install developer tools. Say yes.
- Windows: [Download git here](https://git-scm.com/download/win) first.

Now move into the folder you just downloaded:

```bash
cd automem
```

## Step 4: Start AutoMem

One command:

```bash
make dev
```

The first time you run this, Docker downloads some stuff. Takes a couple minutes. Go get coffee.

When it's done, you'll see some log output. AutoMem is now running on your computer.

**Want to check it's working?** Open your browser and go to:

```text
http://localhost:8001/health
```

You should see `{"status": "ok"}`. That means it's alive.

## Step 5: Connect to Claude Desktop

Now the good part — making Claude remember things.

**One-Click Plugin Install:**

<!-- TODO: Add plugin link here -->

Or manually: Open Claude Desktop settings and add this MCP server configuration.

**Where's the config file?**
- **Mac:** Open Finder, press `Cmd + Shift + G`, paste: `~/Library/Application Support/Claude/`
- **Windows:** Press `Windows + R`, paste: `%APPDATA%\Claude\`

Look for `claude_desktop_config.json`. If it doesn't exist, create it.

Add this inside:

```json
{
  "mcpServers": {
    "automem": {
      "command": "npx",
      "args": ["-y", "@verygoodplugins/mcp-automem"],
      "env": {
        "AUTOMEM_URL": "http://localhost:8001"
      }
    }
  }
}
```

Save. Restart Claude Desktop.

## Step 6: Test It

Open a new conversation in Claude and say:

> "Remember that my favorite programming language is Python and I prefer dark mode in all my apps."

Then start a **new conversation** and ask:

> "What do you know about my preferences?"

Claude should recall what you told it. Magic? No — just memory working the way it should.

## What Did You Just Do?

You ran open source software on your own computer. Specifically:

- **AutoMem** — the memory service
- **FalkorDB** — stores how memories relate to each other
- **Qdrant** — makes searching memories fast

All of this is running locally. Your data never leaves your machine.

## It's Free, Really

No subscriptions. No API costs for basic usage. No "free tier with limits."

You downloaded code that we made public. You're running it yourself. That's open source.

## When You're Done

To stop AutoMem, go back to your terminal and press `Ctrl + C`.

To start it again later, open terminal, `cd` back to the automem folder, and run `make dev` again. Your memories are saved — they'll still be there.

## What's Next?

Once you're comfortable with this local setup:

- **Want access from your phone?** Deploy to [Railway](https://railway.com/deploy/automem-ai-memory-service?referralCode=VuFE6g&utm_medium=integration&utm_source=template&utm_campaign=generic) (still free tier available)
- **Want to hack on it?** The code is right there in the folder you downloaded
- **Found a bug?** [Open an issue](https://github.com/verygoodplugins/automem/issues)

## You Just Learned Something

If this was your first time:
- Opening a terminal
- Cloning a repo
- Running Docker containers

Congrats. You now know more about software than most people ever will. And you did it to give your AI a memory. Pretty good reason if you ask me.

Go try it.

– Jack
