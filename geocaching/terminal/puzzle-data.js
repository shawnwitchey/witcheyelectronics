const TERMINAL_PUZZLE = {
  storageKey: "we_terminal_puzzle_v1",
  promptUser: "guest@geocaching",
  homePath: "/home/guest",
  startupBanner: [
    "GEOCACHING REMOTE ACCESS NODE",
    "Unauthorized access prohibited",
    "Initializing terminal..."
  ],
  introLines: [
    "Simulated training node online. Type help to view available commands.",
    "Some archive material may be incomplete or hidden from standard directory listings."
  ],
  hints: [
    "Not every clue is visible with a normal ls. Old systems liked to tuck things into hidden folders.",
    "Read the archive notes carefully. Some legacy exports were stored in raw hexadecimal instead of plain text.",
    "Search under /var/log/archive and inspect hidden directories. The target log is buried in an old backup path."
  ],
  aboutText: [
    "Remote node profile:",
    "- simulated shell only",
    "- no external network access",
    "- archive mirrors are read-only"
  ],
  readmeText: [
    "Welcome to the geocaching archive node.",
    "Use this simulated terminal to inspect logs, notes, and file structure.",
    "Goal: locate the archived dump and decode it outside this interface."
  ],
  fileSystem: {
    type: "dir",
    name: "",
    entries: {
      home: {
        type: "dir",
        entries: {
          guest: {
            type: "dir",
            entries: {
              "notes.txt": {
                type: "file",
                content: [
                  "Field note 04:",
                  "Plain ls output is not always enough.",
                  "If a directory feels too clean, check again with hidden entries enabled."
                ].join("\n")
              },
              "readme.txt": {
                type: "file",
                content: [
                  "Archive operator memo:",
                  "- This is a simulated system for training and review.",
                  "- Legacy material was mirrored under /var/log/archive.",
                  "- Some sessions were moved during retention cleanup."
                ].join("\n")
              },
              clues: {
                type: "dir",
                entries: {
                  "archive-format.txt": {
                    type: "file",
                    content: [
                      "Retention note:",
                      "Old exports from the archive subsystem were occasionally stored as raw hexadecimal dumps.",
                      "If a log looks unreadable but only contains 0-9 and a-f, decode it as ASCII."
                    ].join("\n")
                  },
                  "pathing.txt": {
                    type: "file",
                    content: [
                      "Route reminder:",
                      "Recent logs were cleaned up, but deeper backups still exist.",
                      "Look beyond the obvious archive folder structure."
                    ].join("\n")
                  },
                  ".breadcrumbs": {
                    type: "file",
                    hidden: true,
                    content: [
                      "Breadcrumb trail:",
                      "archive -> .old -> session -> backup",
                      "The dump file kept its original .log extension."
                    ].join("\n")
                  }
                }
              },
              ".shell_history": {
                type: "file",
                hidden: true,
                content: [
                  "ls",
                  "ls -a",
                  "cd /var/log/archive",
                  "tree"
                ].join("\n")
              }
            }
          }
        }
      },
      var: {
        type: "dir",
        entries: {
          log: {
            type: "dir",
            entries: {
              "system.log": {
                type: "file",
                content: [
                  "[INFO] archive rotation complete",
                  "[INFO] retention policy applied",
                  "[INFO] hidden backup branches preserved"
                ].join("\n")
              },
              archive: {
                type: "dir",
                entries: {
                  "rotate.log": {
                    type: "file",
                    content: [
                      "Archive rotation summary:",
                      "- current set copied",
                      "- stale references moved into hidden legacy branches",
                      "- backup hierarchy preserved for audit"
                    ].join("\n")
                  },
                  ".old": {
                    type: "dir",
                    hidden: true,
                    entries: {
                      session: {
                        type: "dir",
                        entries: {
                          backup: {
                            type: "dir",
                            entries: {
                              "system_dump.log": {
                                type: "file",
                                format: "hex",
                                content: [
                                  "4c4f472d53595354454d2d41524348495645204241434b55500a53657373696f6e20696e697469616c697a65642e2e2e",
                                  "0a417574686f72697a6174696f6e206b65792076616c6964617465642e2e2e0a41726368697665206e6f74653a206c65",
                                  "67616379206d61696e74656e616e6365206578706f727473206d61792062652073746f72656420617320726177206865",
                                  "7861646563696d616c2e0a53746f7261676520626c6f636b73206465636f6d707265737365642e2e2e0a436f6e677261",
                                  "74756c6174696f6e732c207468652066696e616c20636f6f726473206172652033392030372e3430372038362030372e",
                                  "3430372e20476f6f64206c75636b20617420475a210a4172636869766520636f6d706c6574652e0a53657373696f6e20",
                                  "7465726d696e617465642e0a"
                                ].join("\n")
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      tmp: {
        type: "dir",
        entries: {
          "debug-token.txt": {
            type: "file",
            content: [
              "TEMP DEBUG TOKEN",
              "A1-9F-77-QQ",
              "Discard after maintenance."
            ].join("\n")
          }
        }
      },
      etc: {
        type: "dir",
        entries: {
          motd: {
            type: "file",
            content: [
              "Remote users are reminded that this node is a simulation.",
              "No write access is enabled."
            ].join("\n")
          },
          "archive.conf": {
            type: "file",
            content: [
              "archive_format=legacy",
              "hex_exports=true",
              "hidden_branches=preserve"
            ].join("\n")
          }
        }
      }
    }
  }
};
