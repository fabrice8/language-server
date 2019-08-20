import { URI } from "vscode-uri";
import {
  Range,
  Location,
  TextDocument,
  TextDocumentPositionParams
} from "vscode-languageserver";
import escapeRegexp from "escape-string-regexp";
import { TagLibLookup } from "../../compiler";
import { ParserEvents } from "../../htmljs-parser";
import { START_OF_FILE, createTextDocument } from "../../utils";

export function attributeName(
  taglib: TagLibLookup,
  document: TextDocument,
  params: TextDocumentPositionParams,
  event: ParserEvents.AttributeName
) {
  const tagName = event.tag.tagNameExpression ? undefined : event.tag.tagName;
  const tagDef = tagName && taglib.getTag(tagName);
  const attrDef = taglib.getAttribute(tagName || "*", event.name);
  let range = START_OF_FILE;

  if (!attrDef) {
    return;
  }

  const attrEntryFile = attrDef.filePath || (tagDef && tagDef.filePath);

  if (!attrEntryFile) {
    return;
  }

  if (/\/marko(?:-tag)?\.json$/.test(attrEntryFile)) {
    const tagDefDoc = createTextDocument(attrEntryFile);
    const match = new RegExp(`"@${escapeRegexp(event.name)}"`).exec(
      tagDefDoc.getText()
    );

    if (match && match.index) {
      range = Range.create(
        tagDefDoc.positionAt(match.index),
        tagDefDoc.positionAt(match.index + match[0].length)
      );
    }
  }

  return Location.create(URI.file(attrEntryFile).toString(), range);
}
