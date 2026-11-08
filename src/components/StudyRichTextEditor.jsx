import { Extension, Mark, mergeAttributes, Node } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { closeHistory } from "@tiptap/pm/history";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Image from "@tiptap/extension-image";
import { Bold, CaseSensitive, Check, Eye, EyeOff, ImagePlus, IndentDecrease, IndentIncrease, Italic, List, ListOrdered, MessageSquareText, Trash2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ZKRATKY_TOOLTIPY from "../zkratky-tooltips";
import { FRACTION_MAP } from "../utils/formatovaniUdaju.js";
import { STUDY_NOTE_APPEARANCE } from "../utils/formatovaniTextu.jsx";

const FRACTION_TEXT_MAP = Object.fromEntries(
  Object.entries(FRACTION_MAP).map(([text, fraction]) => [fraction, text]),
);

const StudyImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute("class"),
      },
      studyDimensions: {
        default: null,
        parseHTML: (element) => {
          const width = parseStudyImageDimension(
            element.getAttribute("data-study-width") || element.style.width || element.getAttribute("width"),
          );
          const height = parseStudyImageDimension(
            element.getAttribute("data-study-height") || element.style.height || element.getAttribute("height"),
          );
          if (!width && !height) return null;
          return {
            width,
            height,
            keepAspectRatio: element.getAttribute("data-study-keep-aspect-ratio") !== "false",
          };
        },
        renderHTML: ({ studyDimensions }) => {
          if (!studyDimensions) return {};
          const width = parseStudyImageDimension(studyDimensions.width);
          const height = parseStudyImageDimension(studyDimensions.height);
          const keepAspectRatio = studyDimensions.keepAspectRatio !== false;
          const styles = [];
          if (width) styles.push(`width: ${width}px`);
          if (height && (!keepAspectRatio || !width)) styles.push(`height: ${height}px`);
          return {
            ...(width ? { "data-study-width": String(width) } : {}),
            ...(height ? { "data-study-height": String(height) } : {}),
            "data-study-keep-aspect-ratio": String(keepAspectRatio),
            ...(styles.length ? { style: styles.join("; ") } : {}),
          };
        },
      },
    };
  },
}).configure({ inline: true });

const EditorSpellcheck = Extension.create({
  name: "editorSpellcheck",
  addOptions() {
    return { language: "cs-CZ" };
  },
  addProseMirrorPlugins() {
    const language = this.options.language;
    return [new Plugin({
      props: {
        decorations: (state) => {
          const decorations = [];
          state.doc.descendants((node, position) => {
            if (!node.isTextblock) return;
            decorations.push(Decoration.node(position, position + node.nodeSize, {
              lang: language,
              spellcheck: "true",
            }));
            return false;
          });
          return DecorationSet.create(state.doc, decorations);
        },
      },
    })];
  },
});

function validStudyImageSource(value) {
  return /^(?:\/(?!\/)|https?:\/\/)/i.test(value) && !/[\\\u0000-\u001f]/.test(value);
}

function parseStudyImageDimension(value) {
  const raw = String(value ?? "").trim();
  if (!/^\d+(?:\.\d+)?(?:px)?$/i.test(raw)) return null;
  const dimension = Math.round(Number.parseFloat(raw));
  return Number.isFinite(dimension) && dimension > 0 ? dimension : null;
}

const NoTooltip = Mark.create({
  name: "noTooltip",
  excludes: "tooltipEnabled",
  parseHTML() {
    return [{ tag: 'span[data-no-tooltip="true"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-no-tooltip": "true" }), 0];
  },
});

const TooltipEnabled = Mark.create({
  name: "tooltipEnabled",
  excludes: "noTooltip",
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
        class: STUDY_NOTE_APPEARANCE === "editorial"
          ? "study-editor-note study-editor-note--editorial"
          : "study-editor-note",
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

function getAbbreviationDecorations(doc) {
  const decorations = [];
  doc.descendants((node, position) => {
    if (!node.isTextblock) return;
    const text = node.textBetween(0, node.content.size, "", "\ufffc");
    const abbreviationRegex = new RegExp(
      `((?<=^|[\\s\\(\\[\\{{,;:>])(${abbreviationPattern})(?=[\\s\\)\\]\\}},;:.!?<]|$))|\\b(${abbreviationPattern})\\b`,
      "g",
    );
    for (const match of text.matchAll(abbreviationRegex)) {
      const from = position + 1 + match.index;
      const to = from + match[0].length;
      doc.nodesBetween(from, to, (child, childPosition) => {
        if (!child.isText || child.marks.some((mark) => mark.type.name === "noTooltip")) return;
        decorations.push(Decoration.inline(
          Math.max(from, childPosition),
          Math.min(to, childPosition + child.nodeSize),
          { "data-tooltip-preview": "true" },
        ));
      });
    }
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

const LiveAbbreviationTooltips = Extension.create({
  name: "liveAbbreviationTooltips",
  addOptions() {
    return { enabled: true };
  },
  addProseMirrorPlugins() {
    if (!this.options.enabled || !abbreviationPattern) return [];
    const key = new PluginKey("liveAbbreviationTooltips");
    return [new Plugin({
      key,
      state: {
        init: (_config, state) => getAbbreviationDecorations(state.doc),
        apply: (transaction, previous) => transaction.docChanged
          ? getAbbreviationDecorations(transaction.doc)
          : previous,
      },
      props: {
        decorations: (state) => key.getState(state),
      },
    })];
  },
});

function toEditorHtml(value, storageFormat) {
  let html = String(value ?? "").replace(/\r\n?/g, "\n");

  html = html.replace(/\[(pozn|poznamka|redakce)\]([\s\S]*?)\[\/\1\]/gi, (_match, _tag, content) => {
    const body = /<(p|ul|ol|blockquote|div)\b/i.test(content)
      ? content
      : `<p>${content}</p>`;
    return `<div data-study-note="true">${body}</div>`;
  });

  if (storageFormat !== "author" && abbreviationPattern) {
    const noTooltipRegex = new RegExp(`\\*(${abbreviationPattern})(?=[\\s)\\]};:,.!?<]|$)`, "g");
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((node) => {
      const text = node.textContent;
      const matches = [...text.matchAll(noTooltipRegex)];
      if (!matches.length) return;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      matches.forEach((match) => {
        fragment.append(document.createTextNode(text.slice(cursor, match.index)));
        const marker = document.createElement("span");
        marker.dataset.noTooltip = "true";
        marker.textContent = match[1];
        fragment.append(marker);
        cursor = match.index + match[0].length;
      });
      fragment.append(document.createTextNode(text.slice(cursor)));
      node.replaceWith(fragment);
    });
    html = wrapper.innerHTML;
  }

  return html.replace(/\n/g, "<br>");
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
  imagePathPrefix = "",
}) {
  const onChangeRef = useRef(onChange);
  const lastValueRef = useRef(String(value ?? ""));
  const imageDialogRef = useRef(null);
  const [imageDialog, setImageDialog] = useState(null);
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [imageIntrinsicSize, setImageIntrinsicSize] = useState(null);

  useEffect(() => {
    const dialog = imageDialogRef.current;
    if (imageDialog && !dialog?.open) {
      dialog?.showModal();
      const input = dialog?.querySelector("input");
      input?.focus();
      if (!imageDialog.existing) input?.setSelectionRange(input.value.length, input.value.length);
    }
  }, [imageDialog]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Superscript, Subscript, NoTooltip, TooltipEnabled, StudyNote, ParagraphIndent,
      EditorSpellcheck.configure({ language: lang }),
      ...(storageFormat !== "author" ? [StudyImage] : []),
      LiveAbbreviationTooltips.configure({ enabled: storageFormat !== "author" })],
    content: toEditorHtml(value, storageFormat),
    editorProps: {
      attributes: {
        id,
        lang,
        spellcheck: "true",
        class: "study-rich-editor-content",
        "aria-label": ariaLabel,
      },
      handleClickOn: (_view, _position, node, nodePosition, _event, direct) => {
        if (direct && node.type.name === "image") openImageDialog(nodePosition);
        return false;
      },
    },
    onUpdate({ editor: currentEditor }) {
      const nextValue = toStoredValue(currentEditor.getHTML(), storageFormat);
      lastValueRef.current = nextValue;
      onChangeRef.current(nextValue);
    },
  });

  const tooltipDisabled = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => currentEditor?.isActive("noTooltip") ?? false,
  });
  const tooltipActionLabel = tooltipDisabled ? "Zapnout tooltip u výběru" : "Vypnout tooltip u výběru";
  const imageSelected = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => currentEditor?.isActive("image") ?? false,
  });
  const fractionActionLabel = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) return "Převést text na zlomky";
      const { from, to } = currentEditor.state.selection;
      const text = currentEditor.state.doc.textBetween(from, to, "\n", "\ufffc");
      const hasFraction = Object.keys(FRACTION_TEXT_MAP).some((fraction) => text.includes(fraction));
      const hasTextFraction = [...text.matchAll(/(?<![\d/])\d+\/\d+(?![\d/])/g)]
        .some((match) => Boolean(FRACTION_MAP[match[0]]));
      if (hasFraction && hasTextFraction) return "Přepnout zápis zlomků";
      return hasFraction ? "Převést zlomky na prostý text" : "Převést text na zlomky";
    },
  }) || "Převést text na zlomky";

  useEffect(() => {
    if (!editor || lastValueRef.current === String(value ?? "")) return;
    const nextValue = String(value ?? "");
    lastValueRef.current = nextValue;
    editor.commands.setContent(toEditorHtml(nextValue, storageFormat), { emitUpdate: false });
  }, [editor, value]);

  const run = (command) => {
    if (editor) command(editor.chain().focus()).run();
  };

  const openImageDialog = (position) => {
    if (!editor) return;
    const { selection, doc } = editor.state;
    const node = typeof position === "number" ? doc.nodeAt(position) : selection.node;
    const existing = node?.type.name === "image";
    const attrs = existing ? node.attrs : {};
    const dimensions = attrs.studyDimensions || {};
    const classes = (attrs.class || "").split(/\s+/);
    const from = existing && typeof position === "number" ? position : selection.from;
    setImagePreviewFailed(false);
    setImageIntrinsicSize(null);
    setImageDialog({
      from,
      to: existing ? from + node.nodeSize : selection.to,
      existing,
      attrs,
      src: existing ? attrs.src || "" : imagePathPrefix,
      suggestedSource: imagePathPrefix,
      alt: attrs.alt || "",
      layout: classes.includes("study-float-left") ? "left" : classes.includes("study-float-right") ? "right" : "none",
      width: dimensions.width ? String(dimensions.width) : "",
      height: dimensions.height ? String(dimensions.height) : "",
      keepAspectRatio: dimensions.keepAspectRatio !== false,
      dimensionsEdited: false,
      error: "",
    });
  };

  const updateImageDimension = (dimension, value) => {
    setImageDialog((current) => {
      if (!current) return current;
      const next = { ...current, [dimension]: value, dimensionsEdited: true };
      const ratio = imageIntrinsicSize?.width && imageIntrinsicSize?.height
        ? imageIntrinsicSize.width / imageIntrinsicSize.height
        : 0;
      const numericValue = Number(value);
      if (current.keepAspectRatio && ratio > 0 && numericValue > 0) {
        const pairedDimension = dimension === "width" ? "height" : "width";
        const pairedValue = dimension === "width" ? numericValue / ratio : numericValue * ratio;
        next[pairedDimension] = String(Math.max(1, Math.round(pairedValue)));
      } else if (current.keepAspectRatio && value === "") {
        next[dimension === "width" ? "height" : "width"] = "";
      }
      return next;
    });
  };

  const toggleImageAspectRatio = (keepAspectRatio) => {
    setImageDialog((current) => {
      if (!current) return current;
      const next = { ...current, keepAspectRatio, dimensionsEdited: true };
      const ratio = imageIntrinsicSize?.width && imageIntrinsicSize?.height
        ? imageIntrinsicSize.width / imageIntrinsicSize.height
        : 0;
      if (keepAspectRatio && ratio > 0) {
        if (Number(current.width) > 0) {
          next.height = String(Math.max(1, Math.round(Number(current.width) / ratio)));
        } else if (Number(current.height) > 0) {
          next.width = String(Math.max(1, Math.round(Number(current.height) * ratio)));
        }
      }
      return next;
    });
  };

  const handleImagePreviewLoad = (event) => {
    const size = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight };
    if (!size.width || !size.height) return;
    setImageIntrinsicSize(size);
    setImageDialog((current) => {
      if (!current) return current;
      const ratio = size.width / size.height;
      if (!current.keepAspectRatio) {
        return {
          ...current,
          width: current.width || String(size.width),
          height: current.height || String(size.height),
        };
      }
      if (Number(current.width) > 0) {
        return { ...current, height: String(Math.max(1, Math.round(Number(current.width) / ratio))) };
      }
      if (Number(current.height) > 0) {
        return { ...current, width: String(Math.max(1, Math.round(Number(current.height) * ratio))) };
      }
      return { ...current, width: String(size.width), height: String(size.height) };
    });
  };

  useEffect(() => {
    if (!imageDialog) return;
    const preview = imageDialogRef.current?.querySelector(".study-image-dialog-preview img");
    if (preview?.complete && preview.naturalWidth && preview.naturalHeight) {
      handleImagePreviewLoad({ currentTarget: preview });
    }
  }, [imageDialog?.src, imageDialog?.from]);

  const closeImageDialog = () => {
    imageDialogRef.current?.close();
    setImageDialog(null);
    editor?.commands.focus();
  };

  const applyImage = (event) => {
    event.preventDefault();
    const src = imageDialog.src.trim();
    if (!imageDialog.existing && src && src === imageDialog.suggestedSource) {
      setImageDialog({ ...imageDialog, error: "Doplň cestu k obrázku včetně přípony." });
      return;
    }
    if (!validStudyImageSource(src)) {
      setImageDialog({ ...imageDialog, error: "Zadej cestu začínající / nebo adresu https:// či http://." });
      return;
    }
    const hasWidth = String(imageDialog.width || "").trim() !== "";
    const hasHeight = String(imageDialog.height || "").trim() !== "";
    const width = parseStudyImageDimension(imageDialog.width);
    const height = parseStudyImageDimension(imageDialog.height);
    if ((hasWidth && !width) || (hasHeight && !height)) {
      setImageDialog({ ...imageDialog, error: "Rozměry musí být kladná čísla v pixelech." });
      return;
    }
    const studyDimensions = imageDialog.dimensionsEdited
      ? width || height
        ? { width, height, keepAspectRatio: imageDialog.keepAspectRatio !== false }
        : null
      : imageDialog.attrs.studyDimensions || null;
    const classes = (imageDialog.attrs.class || "").split(/\s+/)
      .filter((name) => name && !["study-float-left", "study-float-right", "study-image"].includes(name));
    classes.push(imageDialog.layout === "none" ? "study-image" : `study-float-${imageDialog.layout}`);
    editor.chain().focus().command(({ tr }) => { closeHistory(tr); return true; }).insertContentAt({ from: imageDialog.from, to: imageDialog.to }, {
      type: "image",
      attrs: { ...imageDialog.attrs, src, alt: imageDialog.alt.trim(), class: classes.join(" "), studyDimensions },
    }).run();
    closeImageDialog();
  };

  const removeImage = () => {
    editor.chain().focus().command(({ tr }) => { closeHistory(tr); return true; })
      .deleteRange({ from: imageDialog.from, to: imageDialog.to }).run();
    closeImageDialog();
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

  const convertSelectedFractions = () => {
    if (!editor || editor.state.selection.empty) return;
    const state = editor.state;
    const { from, to } = state.selection;
    const replacements = [];
    const fractionPattern = new RegExp(
      `(?<![\\d/])\\d+/\\d+(?![\\d/])|[${Object.values(FRACTION_MAP).join("")}]`,
      "g",
    );

    state.doc.nodesBetween(from, to, (node, position) => {
      if (!node.isTextblock) return;
      const start = Math.max(from, position + 1);
      const end = Math.min(to, position + 1 + node.content.size);
      const text = state.doc.textBetween(start, end, "", "\ufffc");
      for (const match of text.matchAll(fractionPattern)) {
        const fraction = FRACTION_MAP[match[0]] || FRACTION_TEXT_MAP[match[0]];
        if (!fraction) continue;
        replacements.push({
          from: start + match.index,
          to: start + match.index + match[0].length,
          text: fraction,
          marks: state.doc.nodeAt(start + match.index)?.marks || [],
        });
      }
      return false;
    });

    if (!replacements.length) return;
    let transaction = closeHistory(state.tr);
    replacements.reverse().forEach((replacement) => {
      transaction = transaction.replaceWith(
        replacement.from,
        replacement.to,
        state.schema.text(replacement.text, replacement.marks),
      );
    });
    transaction = transaction.setSelection(state.selection.map(transaction.doc, transaction.mapping));
    editor.view.dispatch(transaction.scrollIntoView());
    editor.view.focus();
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
        <button type="button" title={fractionActionLabel} aria-label={fractionActionLabel} onMouseDown={(event) => event.preventDefault()} onClick={convertSelectedFractions}>
          <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>½</span>
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
        <button type="button" title={tooltipActionLabel} aria-label={tooltipActionLabel} aria-pressed={tooltipDisabled || false} onMouseDown={(event) => event.preventDefault()} onClick={() => run((chain) => tooltipDisabled
          ? chain.unsetMark("noTooltip").setMark("tooltipEnabled")
          : chain.unsetMark("tooltipEnabled").setMark("noTooltip"))}>
          {tooltipDisabled ? <Eye aria-hidden="true" size={16} /> : <EyeOff aria-hidden="true" size={16} />}
        </button>
        {storageFormat !== "author" && (
          <>
            <span className="study-rich-editor-divider" aria-hidden="true" />
            <button type="button" title={imageSelected ? "Upravit obrázek" : "Vložit obrázek"} aria-label={imageSelected ? "Upravit obrázek" : "Vložit obrázek"} onMouseDown={(event) => event.preventDefault()} onClick={() => openImageDialog()}>
              <ImagePlus aria-hidden="true" size={16} />
            </button>
          </>
        )}
      </div>
      <EditorContent editor={editor} />
      {imageDialog && createPortal(
        <dialog ref={imageDialogRef} className="study-image-dialog" aria-labelledby={`${id}-image-dialog-title`} onCancel={(event) => { event.preventDefault(); closeImageDialog(); }}>
          <form onSubmit={applyImage}>
            <div className="study-image-dialog-header">
              <h3 id={`${id}-image-dialog-title`}>{imageDialog.existing ? "Upravit obrázek" : "Vložit obrázek"}</h3>
              <button type="button" className="study-image-icon-button" title="Zavřít" aria-label="Zavřít" onClick={closeImageDialog}><X size={18} aria-hidden="true" /></button>
            </div>
            <label>Cesta / URL
              <input
                autoFocus
                required
                value={imageDialog.src}
                placeholder="/img/1989/PL2909-4bloky.jpg"
                onChange={(event) => {
                  setImagePreviewFailed(false);
                  setImageIntrinsicSize(null);
                  setImageDialog({
                    ...imageDialog,
                    attrs: { ...imageDialog.attrs, studyDimensions: null },
                    src: event.target.value,
                    width: "",
                    height: "",
                    dimensionsEdited: false,
                    error: "",
                  });
                }}
              />
            </label>
            <label>Popis obrázku
              <input value={imageDialog.alt} onChange={(event) => setImageDialog({ ...imageDialog, alt: event.target.value })} />
            </label>
            <div className="study-image-dialog-dimensions">
              <label>Šířka (px)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={imageDialog.width}
                  onChange={(event) => updateImageDimension("width", event.target.value)}
                />
              </label>
              <label>Výška (px)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={imageDialog.height}
                  onChange={(event) => updateImageDimension("height", event.target.value)}
                />
              </label>
              <label className="study-image-dialog-ratio">
                <input
                  type="checkbox"
                  checked={imageDialog.keepAspectRatio}
                  onChange={(event) => toggleImageAspectRatio(event.target.checked)}
                />
                <span>Zachovat poměr stran</span>
              </label>
            </div>
            <label>Obtékání textem
              <select value={imageDialog.layout} onChange={(event) => setImageDialog({ ...imageDialog, layout: event.target.value })}>
                <option value="none">Bez obtékání</option>
                <option value="left">Obrázek vlevo</option>
                <option value="right">Obrázek vpravo</option>
              </select>
            </label>
            {validStudyImageSource(imageDialog.src.trim()) && (imageDialog.existing || imageDialog.src.trim() !== imageDialog.suggestedSource) && (
              <div className="study-image-dialog-preview">
                {imagePreviewFailed ? <span role="status">Obrázek se nepodařilo načíst.</span> : (
                  <img
                    src={imageDialog.src.trim()}
                    alt={imageDialog.alt || "Náhled obrázku"}
                    style={{
                      width: imageDialog.width ? `${imageDialog.width}px` : undefined,
                      height: imageDialog.height && (!imageDialog.keepAspectRatio || !imageDialog.width)
                        ? `${imageDialog.height}px`
                        : undefined,
                    }}
                    onLoad={handleImagePreviewLoad}
                    onError={() => { setImagePreviewFailed(true); setImageIntrinsicSize(null); }}
                  />
                )}
              </div>
            )}
            {imageDialog.error && <div className="study-image-dialog-error" role="alert">{imageDialog.error}</div>}
            <div className="study-image-dialog-actions">
              {imageDialog.existing && <button type="button" className="study-image-icon-button study-image-remove" title="Odebrat obrázek" aria-label="Odebrat obrázek" onClick={removeImage}><Trash2 size={18} aria-hidden="true" /></button>}
              <button type="button" onClick={closeImageDialog}>Zrušit</button>
              <button type="submit" className="study-image-apply"><Check size={18} aria-hidden="true" />Použít</button>
            </div>
          </form>
        </dialog>, document.body,
      )}
    </div>
  );
}