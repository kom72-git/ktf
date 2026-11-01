import { Extension, Mark, mergeAttributes, Node } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { Bold, CaseSensitive, EyeOff, IndentDecrease, IndentIncrease, Italic, List, ListOrdered, MessageSquareText } from "lucide-react";
import React, { useEffect, useRef } from "react";
import ZKRATKY_TOOLTIPY from "../zkratky-tooltips";

const NoTooltip = Mark.create({
  name: "noTooltip",
  parseHTML() {
    return [{ tag: 'span[data-no-tooltip="true"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-no-tooltip": "true" }), 0];
  },
});

const TooltipEnabled = Mark.create({
  name: "tooltipEnabled",
  parseHTML() {
    return [{ tag: 'span[data-tooltip-enabled="true"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-tooltip-enabled": "true" }), 0];
  },
});

const StudyNote = Node.create({
  name: "studyNote",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-study-note="true"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-study-note": "true",
        class: "study-editor-note",
      }),
      0,
    ];
  },
});

function changeParagraphIndent(state, transaction, dispatch, direction) {
  const paragraphs = new Map();
  const { from, to, empty, $from } = state.selection;

  if (empty) {
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (node.type.name === "paragraph") {
        paragraphs.set($from.before(depth), node);
        break;
      }
    }
  } else {
    state.doc.nodesBetween(from, to, (node, position) => {
      if (node.type.name === "paragraph") paragraphs.set(position, node);
    });
  }

  if (!paragraphs.size) return false;

  paragraphs.forEach((node, position) => {
    const indent = Math.max(0, Math.min(5, Number(node.attrs.indent || 0) + direction));
    transaction.setNodeMarkup(position, undefined, { ...node.attrs, indent });
  });
  dispatch?.(transaction.scrollIntoView());
  return true;
}

const ParagraphIndent = Extension.create({
  name: "paragraphIndent",
  addGlobalAttributes() {
    return [{
      types: ["paragraph"],
      attributes: {
        indent: {
          default: 0,
          parseHTML: (element) => {
            const value = Number(element.getAttribute("data-indent"));
            return Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
          },
          renderHTML: (attributes) => {
            const indent = Math.max(0, Math.min(5, Number(attributes.indent || 0)));
            return indent
              ? { "data-indent": String(indent), style: `--first-line-indent: ${indent * 2}em` }
              : {};
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      increaseIndent: () => ({ state, tr, dispatch }) => changeParagraphIndent(state, tr, dispatch, 1),
      decreaseIndent: () => ({ state, tr, dispatch }) => changeParagraphIndent(state, tr, dispatch, -1),
    };
  },
});

const abbreviationPattern = Object.keys(ZKRATKY_TOOLTIPY)
  .sort((left, right) => right.length - left.length)
  .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

function toEditorHtml(value, storageFormat) {
  let html = String(value ?? "").replace(/\r\n?/g, "\n");

  html = html.replace(/\[(pozn|poznamka|redakce)\]([\s\S]*?)\[\/\1\]/gi, (_match, _tag, content) => {
    const body = /<(p|ul|ol|blockquote|div)\b/i.test(content)
      ? content
      : `<p>${content}</p>`;
    return `<div data-study-note="true">${body}</div>`;
  });

  if (storageFormat !== "author" && abbreviationPattern) {
    const noTooltipRegex = new RegExp(`\\*(${abbreviationPattern})(?=[\\s)\\]};:,.!?]|$)`, "g");
    html = html.replace(noTooltipRegex, '<span data-no-tooltip="true">$1</span>');
  }

  html = html.replace(/\n/g, "<br>");
  if (storageFormat === "author" || !abbreviationPattern) return html;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const abbreviationRegex = new RegExp(
    `((?<=^|[\\s\\(\\[\\{{,;:>])(${abbreviationPattern})(?=[\\s\\)\\]\\}},;:.!?<]|$))|\\b(${abbreviationPattern})\\b`,
    "g",
  );
  const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.parentElement?.closest('[data-no-tooltip="true"], [data-tooltip-enabled="true"]')) {
      textNodes.push(node);
    }
  }

  textNodes.forEach((node) => {
    const text = node.textContent;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let match;
    abbreviationRegex.lastIndex = 0;
    while ((match = abbreviationRegex.exec(text)) !== null) {
      const abbreviation = match[2] || match[3];
      if (!abbreviation) continue;
      if (match.index > cursor) fragment.append(document.createTextNode(text.slice(cursor, match.index)));
      const marker = document.createElement("span");
      marker.dataset.tooltipEnabled = "true";
      marker.textContent = abbreviation;
      fragment.append(marker);
      cursor = match.index + match[0].length;
    }
    if (cursor) {
      if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)));
      node.replaceWith(fragment);
    }
  });

  return wrapper.innerHTML;
}

function serializeAuthorParagraph(paragraph) {
  const indent = Math.max(0, Math.min(5, Number(paragraph.getAttribute("data-indent") || 0)));
  const content = [...paragraph.childNodes].map(serializeAuthorNode).join("");
  return `${"\u00a0".repeat(indent * 2)}${content || "<br />"}`;
}

function serializeAuthorList(list) {
  return [...list.children]
    .filter((child) => child.tagName === "LI")
    .map((item, index) => {
      const marker = list.tagName === "OL" ? `${index + 1}. ` : "• ";
      const content = serializeAuthorNode(item);
      return `${marker}${content}`;
    })
    .join("<br />");
}

function serializeAuthorNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  if (node.tagName === "P") return serializeAuthorParagraph(node);
  if (node.tagName === "UL" || node.tagName === "OL") return serializeAuthorList(node);
  if (node.tagName === "BR") return "<br />";
  const content = [...node.childNodes].map(serializeAuthorNode).join("");
  const tag = node.tagName.toLowerCase();
  return ["b", "strong", "i", "em", "u", "sup", "sub"].includes(tag)
    ? `<${tag}>${content}</${tag}>`
    : content;
}

function toStoredValue(html, storageFormat) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  wrapper.querySelectorAll("img.ProseMirror-separator, br.ProseMirror-trailingBreak").forEach((element) => element.remove());
  const replacements = [];
  const authorFormat = storageFormat === "author";

  wrapper.querySelectorAll("div[data-study-note='true']").forEach((note, index) => {
    if (authorFormat) {
      note.replaceWith(document.createTextNode(note.textContent));
      return;
    }
    const first = note.firstElementChild;
    const body = note.children.length === 1 && first?.tagName === "P"
      ? first.innerHTML
      : note.innerHTML;
    const token = `STUDY_NOTE_TOKEN_${index}_END`;
    replacements.push([token, `[pozn]${body}[/pozn]`]);
    note.replaceWith(document.createTextNode(token));
  });

  wrapper.querySelectorAll("span[data-no-tooltip='true']").forEach((mark, index) => {
    if (authorFormat) {
      mark.replaceWith(document.createTextNode(mark.textContent));
      return;
    }
    const token = `STUDY_TOOLTIP_TOKEN_${index}_END`;
    replacements.push([token, `*${mark.textContent}`]);
    mark.replaceWith(document.createTextNode(token));
  });

  wrapper.querySelectorAll("span[data-tooltip-enabled='true']").forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent));
  });

  if (authorFormat) {
    return [...wrapper.childNodes].map(serializeAuthorNode).join("<br />");
  }

  return replacements.reduce(
    (result, [token, replacement]) => result.replace(token, replacement),
    wrapper.innerHTML,
  );
}

export default function StudyRichTextEditor({
  id,
  value,
  onChange,
  className = "",
  lang = "cs-CZ",
  ariaLabel = "Popis studie",
  storageFormat = "study",
}) {
  const onChangeRef = useRef(onChange);
  const lastValueRef = useRef(String(value ?? ""));

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Superscript, Subscript, NoTooltip, TooltipEnabled, StudyNote, ParagraphIndent],
    content: toEditorHtml(value, storageFormat),
    editorProps: {
      attributes: {
        id,
        lang,
        spellcheck: "true",
        class: "study-rich-editor-content",
        "aria-label": ariaLabel,
      },
    },
    onUpdate({ editor: currentEditor }) {
      const nextValue = toStoredValue(currentEditor.getHTML(), storageFormat);
      lastValueRef.current = nextValue;
      onChangeRef.current(nextValue);
    },
  });

  useEffect(() => {
    if (!editor || lastValueRef.current === String(value ?? "")) return;
    const nextValue = String(value ?? "");
    lastValueRef.current = nextValue;
    editor.commands.setContent(toEditorHtml(nextValue, storageFormat), { emitUpdate: false });
  }, [editor, value]);

  const run = (command) => {
    if (editor) command(editor.chain().focus()).run();
  };

  const toggleSelectionCase = () => {
    if (!editor || editor.state.selection.empty) return;
    const state = editor.state;
    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to, "\n");
    const upperText = selectedText.toLocaleUpperCase("cs-CZ");
    const lowerText = selectedText.toLocaleLowerCase("cs-CZ");
    if (upperText === lowerText) return;

    const convert = selectedText === upperText ? lowerText : upperText;
    const segments = [];
    state.doc.nodesBetween(from, to, (node, position) => {
      if (!node.isText) return;
      const start = Math.max(from, position) - position;
      const end = Math.min(to, position + node.nodeSize) - position;
      const text = node.text.slice(start, end);
      if (text) segments.push({ from: position + start, to: position + end, text, marks: node.marks });
    });

    let transaction = state.tr;
    [...segments].reverse().forEach((segment) => {
      const convertedText = convert === upperText
        ? segment.text.toLocaleUpperCase("cs-CZ")
        : segment.text.toLocaleLowerCase("cs-CZ");
      transaction = transaction.replaceWith(
        segment.from,
        segment.to,
        state.schema.text(convertedText, segment.marks),
      );
    });
    transaction = transaction.setSelection(state.selection.map(transaction.doc, transaction.mapping));
    editor.view.dispatch(transaction.scrollIntoView());
  };

  const insertNote = () => {
    if (!editor) return;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const hasEditorRange = range && editor.view.dom.contains(range.commonAncestorContainer);
    const from = hasEditorRange
      ? editor.view.posAtDOM(range.startContainer, range.startOffset)
      : editor.state.selection.from;
    const to = hasEditorRange
      ? editor.view.posAtDOM(range.endContainer, range.endOffset)
      : editor.state.selection.to;
    const selectedText = hasEditorRange
      ? selection.toString()
      : editor.state.doc.textBetween(from, to, "\n");
    const content = selectedText
      ? [{ type: "paragraph", content: [{ type: "text", text: selectedText }] }]
      : [{ type: "paragraph" }];
    editor.chain().focus().insertContentAt({ from, to }, {
      type: "studyNote",
      content,
    }).run();
  };

  return (
    <div className={`study-rich-editor ${className}`.trim()}>
      <div className="study-rich-editor-toolbar" role="toolbar" aria-label={`Nástroje pro ${ariaLabel.toLocaleLowerCase("cs-CZ")}`}>
        <button type="button" title="Tučně" aria-label="Tučně" aria-pressed={editor?.isActive("bold") || false} onMouseDown={(event) => event.preventDefault()} onClick={() => run((chain) => chain.toggleBold())}>
          <Bold aria-hidden="true" size={16} />
        </button>
        <button type="button" title="Kurzíva" aria-label="Kurzíva" aria-pressed={editor?.isActive("italic") || false} onMouseDown={(event) => event.preventDefault()} onClick={() => run((chain) => chain.toggleItalic())}>
          <Italic aria-hidden="true" size={16} />
        </button>
        <button type="button" title="Převést na velká nebo malá písmena" aria-label="Převést velikost písmen" onMouseDown={(event) => event.preventDefault()} onClick={toggleSelectionCase}>
          <CaseSensitive aria-hidden="true" size={16} />
        </button>
        <span className="study-rich-editor-divider" aria-hidden="true" />
        <button type="button" title="Odrážkový seznam" aria-label="Odrážkový seznam" aria-pressed={editor?.isActive("bulletList") || false} onMouseDown={(event) => event.preventDefault()} onClick={() => run((chain) => chain.toggleBulletList())}>
          <List aria-hidden="true" size={16} />
        </button>
        <button type="button" title="Číslovaný seznam" aria-label="Číslovaný seznam" aria-pressed={editor?.isActive("orderedList") || false} onMouseDown={(event) => event.preventDefault()} onClick={() => run((chain) => chain.toggleOrderedList())}>
          <ListOrdered aria-hidden="true" size={16} />
        </button>
        <button type="button" title="Zmenšit odsazení prvního řádku" aria-label="Zmenšit odsazení prvního řádku" onMouseDown={(event) => event.preventDefault()} onClick={() => run((chain) => chain.decreaseIndent())}>
          <IndentDecrease aria-hidden="true" size={16} />
        </button>
        <button type="button" title="Zvětšit odsazení prvního řádku" aria-label="Zvětšit odsazení prvního řádku" onMouseDown={(event) => event.preventDefault()} onClick={() => run((chain) => chain.increaseIndent())}>
          <IndentIncrease aria-hidden="true" size={16} />
        </button>
        <span className="study-rich-editor-divider" aria-hidden="true" />
        <button type="button" title="Vložit redakční poznámku" aria-label="Vložit redakční poznámku" onMouseDown={(event) => event.preventDefault()} onClick={insertNote}>
          <MessageSquareText aria-hidden="true" size={16} />
        </button>
        <button type="button" title="Vypnout tooltip u výběru" aria-label="Vypnout tooltip u výběru" aria-pressed={editor?.isActive("noTooltip") || false} onMouseDown={(event) => event.preventDefault()} onClick={() => run((chain) => chain.toggleMark("noTooltip"))}>
          <EyeOff aria-hidden="true" size={16} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}