(function () {
  const outputEl = document.getElementById("terminalOutput");
  const formEl = document.getElementById("terminalForm");
  const inputEl = document.getElementById("commandInput");
  const promptLabelEl = document.getElementById("promptLabel");

  const state = {
    cwd: TERMINAL_PUZZLE.homePath,
    history: [],
    historyIndex: -1,
    hintIndex: 0
  };

  const storage = {
    load() {
      try {
        const raw = localStorage.getItem(TERMINAL_PUZZLE.storageKey);
        return raw ? JSON.parse(raw) : {};
      } catch (error) {
        return {};
      }
    },
    save(partial) {
      const current = this.load();
      localStorage.setItem(
        TERMINAL_PUZZLE.storageKey,
        JSON.stringify({ ...current, ...partial })
      );
    },
    clear() {
      localStorage.removeItem(TERMINAL_PUZZLE.storageKey);
    }
  };

  function normalizePath(path) {
    if (!path || path === "/") {
      return "/";
    }
    const parts = path.split("/").filter(Boolean);
    return `/${parts.join("/")}`;
  }

  function pathToParts(path) {
    return normalizePath(path).split("/").filter(Boolean);
  }

  function getPromptPath(path) {
    if (path === TERMINAL_PUZZLE.homePath) {
      return "~";
    }
    if (path.startsWith(`${TERMINAL_PUZZLE.homePath}/`)) {
      return `~${path.slice(TERMINAL_PUZZLE.homePath.length)}`;
    }
    return path;
  }

  function updatePrompt() {
    promptLabelEl.textContent = `${TERMINAL_PUZZLE.promptUser}:${getPromptPath(state.cwd)}$`;
  }

  function appendLine(text, className) {
    const line = document.createElement("div");
    line.className = `line ${className || ""}`.trim();
    line.textContent = text;
    outputEl.appendChild(line);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function appendLines(lines, className) {
    lines.forEach((line) => appendLine(line, className));
  }

  function getNode(path) {
    const parts = pathToParts(path);
    let node = TERMINAL_PUZZLE.fileSystem;

    for (const part of parts) {
      if (!node || node.type !== "dir" || !node.entries || !node.entries[part]) {
        return null;
      }
      node = node.entries[part];
    }

    return node;
  }

  function resolvePath(inputPath) {
    const raw = (inputPath || "").trim();
    const baseParts = raw.startsWith("/") ? [] : pathToParts(state.cwd);
    const incoming = raw.split("/").filter(Boolean);
    const parts = [...baseParts];

    incoming.forEach((part) => {
      if (part === ".") {
        return;
      }
      if (part === "..") {
        parts.pop();
        return;
      }
      parts.push(part);
    });

    return normalizePath(`/${parts.join("/")}`);
  }

  function listEntries(path, includeHidden) {
    const node = getNode(path);
    if (!node) {
      return { error: `No such file or directory: ${path}` };
    }
    if (node.type !== "dir") {
      return { error: `Not a directory: ${path}` };
    }

    const names = Object.keys(node.entries || {})
      .filter((name) => includeHidden || !node.entries[name].hidden)
      .sort((a, b) => a.localeCompare(b));

    const output = [];
    if (includeHidden) {
      output.push(".", "..");
    }

    names.forEach((name) => {
      output.push(node.entries[name].type === "dir" ? `${name}/` : name);
    });

    return { output };
  }

  function treeLines(node, prefix, includeHidden) {
    const names = Object.keys(node.entries || {})
      .filter((name) => includeHidden || !node.entries[name].hidden)
      .sort((a, b) => a.localeCompare(b));
    const lines = [];

    names.forEach((name, index) => {
      const entry = node.entries[name];
      const connector = index === names.length - 1 ? "`-- " : "|-- ";
      lines.push(`${prefix}${connector}${entry.type === "dir" ? `${name}/` : name}`);
      if (entry.type === "dir") {
        const nextPrefix = prefix + (index === names.length - 1 ? "    " : "|   ");
        lines.push(...treeLines(entry, nextPrefix, includeHidden));
      }
    });

    return lines;
  }

  function parseArgs(commandLine) {
    return commandLine.trim().split(/\s+/).filter(Boolean);
  }

  function handleHelp() {
    appendLines(
      [
        "Available commands:",
        "help      show available commands",
        "ls        list directory contents",
        "ls -a     list directory contents including hidden entries",
        "cd        change directory",
        "pwd       print current path",
        "cat       print file contents",
        "clear     clear visible output",
        "whoami    print current user",
        "uname     print system information",
        "date      print current date",
        "hint      reveal progressive hints",
        "tree      print directory tree",
        "grep      search for text inside a file",
        "echo      print text",
        "about     show node information",
        "readme    show puzzle readme",
        "restart   replay the startup sequence",
        "reset     clear saved state and replay startup"
      ],
      "system"
    );
  }

  function handleCd(args) {
    const target = args[1] ? resolvePath(args[1]) : TERMINAL_PUZZLE.homePath;
    const node = getNode(target);
    if (!node) {
      appendLine(`No such file or directory: ${args[1] || ""}`, "error");
      return;
    }
    if (node.type !== "dir") {
      appendLine(`Not a directory: ${args[1]}`, "error");
      return;
    }
    state.cwd = target;
    updatePrompt();
  }

  function handleLs(args) {
    const includeHidden = args.includes("-a");
    const pathArg = args.find((arg, index) => index > 0 && arg !== "-a");
    const target = pathArg ? resolvePath(pathArg) : state.cwd;
    const result = listEntries(target, includeHidden);
    if (result.error) {
      appendLine(result.error, "error");
      return;
    }
    appendLine(result.output.join("  "), "system");
  }

  function handlePwd() {
    appendLine(state.cwd, "system");
  }

  function handleCat(args) {
    if (!args[1]) {
      appendLine("Usage: cat <file>", "error");
      return;
    }
    const target = resolvePath(args[1]);
    const node = getNode(target);
    if (!node) {
      appendLine(`No such file: ${args[1]}`, "error");
      return;
    }
    if (node.type !== "file") {
      appendLine(`Not a file: ${args[1]}`, "error");
      return;
    }
    appendLines(node.content.split("\n"), node.format === "hex" ? "hex" : "system");
  }

  function handleWhoami() {
    appendLine("guest", "system");
  }

  function handleUname() {
    appendLine("WitcheyOS remote-node 2.4.1 simulated-terminal", "system");
  }

  function handleDate() {
    appendLine(new Date().toString(), "system");
  }

  function handleHint() {
    const hint = TERMINAL_PUZZLE.hints[Math.min(state.hintIndex, TERMINAL_PUZZLE.hints.length - 1)];
    appendLine(`Hint ${Math.min(state.hintIndex + 1, TERMINAL_PUZZLE.hints.length)}: ${hint}`, "system");
    state.hintIndex = Math.min(state.hintIndex + 1, TERMINAL_PUZZLE.hints.length - 1);
  }

  function handleTree() {
    const node = getNode(state.cwd);
    if (!node || node.type !== "dir") {
      appendLine("Unable to print tree from current location.", "error");
      return;
    }
    appendLine(state.cwd === "/" ? "/" : `${state.cwd}/`, "system");
    appendLines(treeLines(node, "", true), "dim");
  }

  function handleGrep(commandLine) {
    const match = commandLine.match(/^grep\s+(.+?)\s+(.+)$/);
    if (!match) {
      appendLine("Usage: grep <term> <file>", "error");
      return;
    }

    const term = match[1].trim().toLowerCase();
    const target = resolvePath(match[2].trim());
    const node = getNode(target);

    if (!node) {
      appendLine(`No such file: ${match[2].trim()}`, "error");
      return;
    }
    if (node.type !== "file") {
      appendLine(`Not a file: ${match[2].trim()}`, "error");
      return;
    }

    const matches = node.content
      .split("\n")
      .filter((line) => line.toLowerCase().includes(term));

    if (matches.length === 0) {
      appendLine(`No matches for "${match[1].trim()}".`, "dim");
      return;
    }

    appendLines(matches, node.format === "hex" ? "hex" : "system");
  }

  function handleEcho(commandLine) {
    appendLine(commandLine.replace(/^echo\s*/, ""), "system");
  }

  function clearTerminal() {
    outputEl.innerHTML = "";
  }

  function runBootSequence(shouldPersist) {
    clearTerminal();
    inputEl.disabled = true;
    const lines = [...TERMINAL_PUZZLE.startupBanner];

    lines.forEach((line, index) => {
      setTimeout(() => {
        appendLine(line, "system");
      }, index * 320);
    });

    setTimeout(() => {
      appendLine("", "spacer");
      appendLines(TERMINAL_PUZZLE.introLines, "system");
      inputEl.disabled = false;
      inputEl.focus();
      if (shouldPersist) {
        storage.save({ bootPlayed: true, history: state.history });
      }
    }, lines.length * 320 + 180);
  }

  function handleRestart(clearStorage) {
    if (clearStorage) {
      state.history = [];
      state.historyIndex = -1;
      state.hintIndex = 0;
      storage.clear();
    } else {
      storage.save({ bootPlayed: false, history: state.history });
    }
    runBootSequence(!clearStorage);
  }

  function executeCommand(commandLine) {
    const trimmed = commandLine.trim();
    if (!trimmed) {
      return;
    }

    appendLine(`${promptLabelEl.textContent} ${trimmed}`, "command");

    const args = parseArgs(trimmed);
    const command = args[0];

    switch (command) {
      case "help":
        handleHelp();
        break;
      case "ls":
        handleLs(args);
        break;
      case "cd":
        handleCd(args);
        break;
      case "pwd":
        handlePwd();
        break;
      case "cat":
        handleCat(args);
        break;
      case "clear":
        clearTerminal();
        break;
      case "whoami":
        handleWhoami();
        break;
      case "uname":
        handleUname();
        break;
      case "date":
        handleDate();
        break;
      case "hint":
        handleHint();
        break;
      case "tree":
        handleTree();
        break;
      case "grep":
        handleGrep(trimmed);
        break;
      case "echo":
        handleEcho(trimmed);
        break;
      case "about":
        appendLines(TERMINAL_PUZZLE.aboutText, "system");
        break;
      case "readme":
        appendLines(TERMINAL_PUZZLE.readmeText, "system");
        break;
      case "restart":
        handleRestart(false);
        return;
      case "reset":
        handleRestart(true);
        return;
      default:
        appendLine(`Command not found: ${command}`, "error");
    }

    appendLine("", "spacer");
  }

  function loadStoredState() {
    const saved = storage.load();
    if (Array.isArray(saved.history)) {
      state.history = saved.history;
    }
    state.historyIndex = state.history.length;
    return Boolean(saved.bootPlayed);
  }

  function saveHistory() {
    storage.save({ bootPlayed: true, history: state.history });
  }

  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (state.history.length === 0) {
        return;
      }
      state.historyIndex = Math.max(0, state.historyIndex - 1);
      inputEl.value = state.history[state.historyIndex] || "";
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (state.history.length === 0) {
        return;
      }
      state.historyIndex = Math.min(state.history.length, state.historyIndex + 1);
      inputEl.value = state.history[state.historyIndex] || "";
    }
  });

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const commandLine = inputEl.value;

    if (commandLine.trim()) {
      state.history.push(commandLine.trim());
      state.historyIndex = state.history.length;
      saveHistory();
    }

    inputEl.value = "";
    executeCommand(commandLine);
    outputEl.scrollTop = outputEl.scrollHeight;
  });

  updatePrompt();
  const bootPlayed = loadStoredState();
  if (bootPlayed) {
    appendLines(TERMINAL_PUZZLE.introLines, "system");
  } else {
    runBootSequence(true);
  }
})();
