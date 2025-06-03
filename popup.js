// popup.js

// ───────────────────────────────────────────────────────────────────────────────
// Helper: show “Saved!” status for 1 second
// ───────────────────────────────────────────────────────────────────────────────
function showStatus() {
  const statusDiv = document.getElementById("status");
  statusDiv.style.display = "block";
  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 1000);
}

// ───────────────────────────────────────────────────────────────────────────────
// 1) renderTable(): read “replacements” from storage, populate the table
// ───────────────────────────────────────────────────────────────────────────────
function renderTable() {
  chrome.storage.sync.get("replacements", (data) => {
    const list = Array.isArray(data.replacements) ? data.replacements : [];
    const tbody = document.querySelector("#replacements-table tbody");
    tbody.innerHTML = ""; // clear existing rows

    list.forEach((item, index) => {
      const tr = document.createElement("tr");

      // “Find” cell
      const findTd = document.createElement("td");
      findTd.textContent = item.find;
      tr.appendChild(findTd);

      // “Replace” cell
      const replaceTd = document.createElement("td");
      replaceTd.textContent = item.replace;
      tr.appendChild(replaceTd);

      // “Action” cell (Delete button)
      const actionTd = document.createElement("td");
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "row-button";
      delBtn.addEventListener("click", () => {
        deleteEntry(index);
      });
      actionTd.appendChild(delBtn);
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    });
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// 2) deleteEntry(idx): remove the item at index idx from “replacements” and save
// ───────────────────────────────────────────────────────────────────────────────
function deleteEntry(idx) {
  chrome.storage.sync.get("replacements", (data) => {
    const list = Array.isArray(data.replacements) ? data.replacements : [];
    if (idx < 0 || idx >= list.length) return;
    list.splice(idx, 1);
    chrome.storage.sync.set({ replacements: list }, () => {
      renderTable();
      showStatus();
    });
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// 3) addNewEntry(): read find+replace inputs, append (or overwrite) in “replacements”
// ───────────────────────────────────────────────────────────────────────────────
function addNewEntry() {
  const findInput = document.getElementById("find-input");
  const replaceInput = document.getElementById("replace-input");
  const findVal = findInput.value.trim();
  const replaceVal = replaceInput.value.trim();

  if (!findVal || !replaceVal) {
    alert("Both fields must be non-empty.");
    return;
  }

  chrome.storage.sync.get("replacements", (data) => {
    const list = Array.isArray(data.replacements) ? data.replacements : [];

    // If “find” already exists (case-insensitive), overwrite its “replace”:
    const existingIdx = list.findIndex(
      (item) => item.find.toLowerCase() === findVal.toLowerCase()
    );
    if (existingIdx !== -1) {
      list[existingIdx].replace = replaceVal;
    } else {
      list.push({ find: findVal, replace: replaceVal });
    }

    chrome.storage.sync.set({ replacements: list }, () => {
      findInput.value = "";
      replaceInput.value = "";
      renderTable();
      showStatus();
    });
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// 4) On DOMContentLoaded: wire up ruto-select, “Add” button, and render table
// ───────────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const rutoSelect = document.getElementById("ruto-select");

  // ─── 4A) Load saved rutoReplacement (or default to “nabii”):
  chrome.storage.sync.get("rutoReplacement", (data) => {
    const saved = data.rutoReplacement || "nabii";
    // If for some reason it’s not one of our four, fallback to “nabii”:
    if (
      !["nabii", "kaunda uongoman", "kaongo", "kasongo"].includes(saved)
    ) {
      rutoSelect.value = "nabii";
    } else {
      rutoSelect.value = saved;
    }
  });

  // ─── 4B) When user changes the dropdown, save to storage immediately:
  rutoSelect.addEventListener("change", () => {
    const newVal = rutoSelect.value;
    chrome.storage.sync.set({ rutoReplacement: newVal }, () => {
      showStatus();
    });
  });

  // ─── 4C) Wire up “Add Replacement” button for other pairs:
  document.getElementById("add-btn").addEventListener("click", addNewEntry);

  // ─── 4D) Render the current table of “replacements” (other pairs):
  renderTable();
});
