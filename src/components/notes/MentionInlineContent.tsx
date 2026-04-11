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
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: "rgba(130,100,255,0.18)",
          color: "#a98eff",
          borderRadius: "6px",
          padding: "1px 7px",
          fontSize: "0.875em",
          fontWeight: 500,
          cursor: "default",
        }}
      >
        {props.inlineContent.props.photoUrl && (
          <img
            src={props.inlineContent.props.photoUrl}
            alt=""
            style={{ width: 14, height: 14, borderRadius: "50%" }}
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
