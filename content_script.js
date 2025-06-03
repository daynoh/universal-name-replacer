// content_script.js

// ───────────────────────────────────────────────────────────────────────────────
// 1) walkAndReplace(rootNode, regex, substitute):
//    Given a DOM subtree rootNode, finds all TEXT nodes under it and replaces
//    occurrences of `regex` with `substitute` in nodeValue.
// ───────────────────────────────────────────────────────────────────────────────
function walkAndReplace(rootNode, regex, substitute) {
  const walker = document.createTreeWalker(
    rootNode,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  let node;
  while ((node = walker.nextNode())) {
    if (regex.test(node.nodeValue)) {
      node.nodeValue = node.nodeValue.replace(regex, substitute);
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 2) Main entry: fetch both “rutoReplacement” and “replacements” from storage.
//    Build a compiled array of { regex, substitute } starting with ruto’s pair.
//    Then do an initial pass + set up a MutationObserver for dynamic content.
// ───────────────────────────────────────────────────────────────────────────────
chrome.storage.sync.get(
  ["rutoReplacement", "replacements"],
  (data) => {
    // 2A) Determine ruto’s replacement (default to "nabii" if unset):
    const rutoReplacement = data.rutoReplacement || "nabii";
    // Compile a case-insensitive whole-word regex for “ruto”:
    const rutoRegex = new RegExp("\\bruto\\b", "gi");
    const compiledList = [
      { regex: rutoRegex, substitute: rutoReplacement }
    ];

    // 2B) Now process any other user-added { find, replace } pairs:
    const others = Array.isArray(data.replacements) ? data.replacements : [];
    others.forEach((item) => {
      if (!item.find || !item.replace) return;
      // Escape special regex chars in item.find:
      const escaped = item.find.replace(/[-\\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pattern = `\\b${escaped}\\b`;
      const reg = new RegExp(pattern, "gi");
      compiledList.push({ regex: reg, substitute: item.replace });
    });

    // If there's nothing to replace, bail out:
    if (compiledList.length === 0) return;

    // ──────── 2C) Initial pass on document.body ───────────────────────────────
    compiledList.forEach(({ regex, substitute }) => {
      walkAndReplace(document.body, regex, substitute);
    });

    // ──────── 2D) MutationObserver: watch for added/changed nodes ────────────
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // If new nodes were added:
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Walk the subtree of this new element:
              compiledList.forEach(({ regex, substitute }) => {
                walkAndReplace(node, regex, substitute);
              });
            } else if (node.nodeType === Node.TEXT_NODE) {
              // A text node inserted directly:
              compiledList.forEach(({ regex, substitute }) => {
                if (regex.test(node.nodeValue)) {
                  node.nodeValue = node.nodeValue.replace(regex, substitute);
                }
              });
            }
          });
        }

        // If existing text nodes changed in place:
        if (
          mutation.type === "characterData" &&
          mutation.target.nodeType === Node.TEXT_NODE
        ) {
          const txtNode = mutation.target;
          compiledList.forEach(({ regex, substitute }) => {
            if (regex.test(txtNode.nodeValue)) {
              txtNode.nodeValue = txtNode.nodeValue.replace(regex, substitute);
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
);
