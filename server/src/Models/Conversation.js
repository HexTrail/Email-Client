// models/Conversation.js
//
// The mobile client has "no separate Inbox/Sent — all emails
// organised into chats/conversations", grouped by the other
// participant(s). This collection IS that grouping.
//
// - A 1:1 conversation is looked up by its sorted pair of phone
//   numbers, so the same two people always land in the same thread
//   (participantsKey enforces this at the DB level).
// - A group conversation (2+ recipients added via Compose on Home)
//   is its own separate document and is never reused for later
//   1:1 messages to an individual from that group — matching the
//   task doc's rule exactly.

import {Schema, model} from 'mongoose'

const ConversationSchema = new Schema(
  {
    participants: {
      type: [String], // phone numbers, local-part only
      required: true,
    },

    isGroup: { type: Boolean, default: false },
    groupName: { type: String, default: "" }, // only meaningful if isGroup

    // Sorted, joined participants — e.g. "9876543210_9998887776".
    // For 1:1 chats this gives you a unique index so re-emailing the
    // same person always resolves to the same thread instead of
    // creating a duplicate one. Group chats skip this (each group is
    // its own thread even with overlapping members), so the unique
    // index is sparse/partial — see the index below.
    participantsKey: { type: String, default: null },

    // Denormalized for fast inbox-list rendering without a join.
    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, default: "" },
    lastMessageFrom: { type: String, default: "" },
  },
  { timestamps: true }
);

// Enforces "same two people -> same 1:1 thread" while allowing
// unlimited group threads (participantsKey is null for those, and a
// partial index ignores nulls).
ConversationSchema.index(
  { participantsKey: 1 },
  { unique: true, partialFilterExpression: { participantsKey: { $type: "string" } } }
);

// Fast "list my conversations, newest first" query.
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });

export default model("Conversation", ConversationSchema);