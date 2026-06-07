const BONUS_FINAL_DMM = "N 41\u00B0 11.237' W 85\u00B0 05.457'";

// Each cache accepts either the North or West last-3-minute digits.
const PROOF_RULES = {
  GCBKEF1: ["552", "733"],
  GCBKEF2: ["018", "991"],
  GCBKEF3: ["845", "988"],
  GCBKEF4: ["803", "314"],
  GCBKEF5: ["677", "787"],
  GCBKEF6: ["258", "587"],
  GCBKEF7: ["201", "458"],
  GCBKEF8: ["004", "497"],
  GCBKEF9: ["443", "162"]
};

const statusEl = document.getElementById("status");
const unlockStatusEl = document.getElementById("unlockStatus");
const bonusCoordsRowEl = document.getElementById("bonusCoordsRow");
const bonusCoordsValueEl = document.getElementById("bonusCoordsValue");
const formEl = document.getElementById("proofForm");
const clearBtn = document.getElementById("clearBtn");

function setStatus(message) {
  statusEl.textContent = message;
}

function normalizeProof(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  return digits.slice(0, 3).padStart(3, "0");
}

function setUnlocked(isUnlocked) {
  if (isUnlocked) {
    unlockStatusEl.textContent = "Unlocked";
    unlockStatusEl.className = "hint-badge hint-hot";
    bonusCoordsRowEl.classList.remove("hidden");
    bonusCoordsValueEl.textContent = BONUS_FINAL_DMM;
  } else {
    unlockStatusEl.textContent = "Locked";
    unlockStatusEl.className = "hint-badge hint-cold";
    bonusCoordsRowEl.classList.add("hidden");
    bonusCoordsValueEl.textContent = "";
  }
}

function verifyProofs() {
  const missing = [];
  const wrong = [];

  for (const [cacheCode, allowed] of Object.entries(PROOF_RULES)) {
    const input = document.getElementById(`proof-${cacheCode}`);
    const normalized = normalizeProof(input.value);
    input.value = normalized;

    if (!normalized || normalized.length !== 3) {
      missing.push(cacheCode);
      continue;
    }

    if (!allowed.includes(normalized)) {
      wrong.push(cacheCode);
    }
  }

  if (missing.length > 0) {
    setUnlocked(false);
    setStatus(`Missing entries: ${missing.join(", ")}.`);
    return;
  }

  if (wrong.length > 0) {
    setUnlocked(false);
    setStatus(`Incorrect proof for: ${wrong.join(", ")}.`);
    return;
  }

  setUnlocked(true);
  setStatus("All proofs verified. Bonus final coordinates unlocked.");
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  verifyProofs();
});

clearBtn.addEventListener("click", () => {
  for (const cacheCode of Object.keys(PROOF_RULES)) {
    const input = document.getElementById(`proof-${cacheCode}`);
    input.value = "";
  }

  setUnlocked(false);
  setStatus("Entries cleared.");
});

for (const cacheCode of Object.keys(PROOF_RULES)) {
  const input = document.getElementById(`proof-${cacheCode}`);
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D+/g, "").slice(0, 3);
  });
}

setUnlocked(false);
