// models/Message.js
//
// One document per email. Belongs to exactly one Conversation
// (for the mobile chat view) and also carries a `folder` field
// (for the Gmail-style web client, and for Drafts/Spam/Trash on
// both clients).

import { Schema, model } from 'mongoose'

const AttachmentSchema = new Schema(
  {
    filename: { type: String, required: true },
    contentType: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 }, // bytes
    content: { type: Buffer, required: true },
  },
  { _id: false }
);

const MessageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    from: { type: String, required: true }, // full address, e.g. "9876543210@phonemail.test"
    to: { type: [String], required: true }, // full addresses
    cc: { type: [String], default: [] },

    subject: { type: String, default: "(no subject)" },
    text: { type: String, default: "" },
    html: { type: String, default: "" },
    attachments: { type: [AttachmentSchema], default: [] },

    date: { type: Date, default: Date.now, index: true },

    // --- Per-recipient state. Since one Message doc can have several
    //     recipients, read/favorite/folder are tracked per-phone so
    //     Alice marking a group email read doesn't affect Bob's copy.
    recipientState: {
      type: Map,
      of: new Schema(
        {
          read: { type: Boolean, default: false },
          favorite: { type: Boolean, default: false },
          folder: {
            type: String,
            enum: ["inbox", "spam", "trash"],
            default: "inbox",
          },
        },
        { _id: false }
      ),
      default: {},
    },

    // Sender's own copy — the "Sent" view / drafts.
    senderState: {
      folder: {
        type: String,
        enum: ["sent", "drafts", "trash"],
        default: "sent",
      },
    },

    // --- Reply-chain rules from the task doc ---
    // "Each message can be replied to only once."
    repliedTo: { type: Schema.Types.ObjectId, ref: "Message", default: null },
    hasBeenRepliedTo: { type: Boolean, default: false }, // set true on the ORIGINAL once a reply exists

    // New top-level email vs a reply — controls whether the Subject
    // field is shown in the mobile chat UI.
    isNewThreadRoot: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Fast "get this conversation's messages in order" query.
MessageSchema.index({ conversation: 1, date: 1 });

export default model("Message", MessageSchema);