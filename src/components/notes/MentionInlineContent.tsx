"use client";

import { createReactInlineContentSpec } from "@blocknote/react";
import { BlockNoteSchema, defaultInlineContentSpecs } from "@blocknote/core";

export const Mention = createReactInlineContentSpec(
  {
    type: "mention" as const,
    propSchema: {
      googleId: { default: "" },
      name: { default: "" },
      email: { default: "" },
      photoUrl: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => (
      <span
        className="inline-flex items-center gap-1 rounded-md bg-purple-500/20 px-1.5 py-px text-sm font-medium text-purple-400 cursor-default"
        style={{ userSelect: "none" }}
      >
        {props.inlineContent.props.photoUrl && (
          <img
            src={props.inlineContent.props.photoUrl}
            alt=""
            className="rounded-full"
            style={{ width: 14, height: 14 }}
          />
        )}
        @{props.inlineContent.props.name}
      </span>
    ),
  }
);

export const mentionSchema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention: Mention,
  },
});

export type MentionSchema = typeof mentionSchema;
