import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import Conversation from './Models/Conversation.js';
import Message from './Models/Message.js';
import Users from './Models/Users.js';
import { getMailboxAddress, getMailboxLocalPart } from './mailbox.js';

const PASSWORD = 'Test@123';
const DOMAIN = (process.env.DOMAIN || 'phonemail.test').trim().toLowerCase();
const demoUsers = [
  { phone: '+919876500101', username: 'Demo Aarav' },
  { phone: '+919876500102', username: 'Demo Meera' },
  { phone: '+919876500103', username: 'Demo Kabir' },
  { phone: '+919876500104', username: 'Demo Nisha' },
];

const userByName = Object.fromEntries(demoUsers.map((user) => [user.username, user]));
const localParts = demoUsers.map((user) => getMailboxLocalPart(user.phone));

function address(phone) {
  return getMailboxAddress(phone, DOMAIN).toLowerCase();
}

async function ensureDemoUsers() {
  for (const user of demoUsers) {
    const existingCount = await Users.countDocuments({ phone: user.phone });
    const existing = await Users.findOne({ phone: user.phone });
    if (existingCount > 1 || (existing && existing.username !== user.username)) {
      throw new Error(`Refusing to overwrite an account using ${user.phone}`);
    }

    await Users.updateOne(
      { phone: user.phone },
      {
        $set: {
          username: user.username,
          password: await bcrypt.hash(PASSWORD, 10),
          phoneVerified: true,
        },
      },
      { upsert: true }
    );
  }
}

async function getConversation({ participants, groupName = '' }) {
  const participantPhones = [...new Set(participants.map((phone) => getMailboxLocalPart(phone)))].sort();
  const isGroup = participantPhones.length > 2;
  const query = isGroup
    ? { groupName, participants: participantPhones }
    : { participantsKey: participantPhones.join('_') };
  let conversation = await Conversation.findOne(query);

  if (!conversation) {
    conversation = new Conversation({
      participants: participantPhones,
      participantsKey: isGroup ? null : participantPhones.join('_'),
      isGroup,
      groupName: isGroup ? groupName : '',
    });
  } else {
    conversation.participants = participantPhones;
    conversation.isGroup = isGroup;
    conversation.groupName = isGroup ? groupName : '';
  }

  await conversation.save();
  return conversation;
}

async function saveDemoMessage(conversation, definition) {
  const sender = userByName[definition.from];
  const recipients = definition.to.map((name) => userByName[name]);
  const to = recipients.map((user) => address(user.phone));
  const recipientState = Object.fromEntries(recipients.map((user) => [
    getMailboxLocalPart(user.phone),
    { read: (definition.readBy || []).includes(user.username), folder: 'inbox' },
  ]));
  const messageId = `<${definition.key}@${DOMAIN}>`;
  const values = {
    conversation: conversation._id,
    from: address(sender.phone),
    to,
    cc: [],
    bcc: [],
    messageId,
    inReplyTo: definition.inReplyTo || '',
    references: definition.references || [],
    subject: definition.subject,
    text: definition.text,
    html: `<p>${definition.text}</p>`,
    recipientState,
    senderState: { folder: 'sent' },
    isNewThreadRoot: !definition.inReplyTo,
    date: new Date(Date.now() - definition.minutesAgo * 60_000),
  };

  let message = await Message.findOne({ messageId });
  if (message) return message;
  message = new Message(values);
  await message.save();
  return message;
}

export async function seedDemoData({ connect = true, disconnect = true } = {}) {
  if (connect) {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
    await mongoose.connect(process.env.MONGO_URI);
  }

  try {
    const existingUsers = await Users.find({ phone: { $in: demoUsers.map((user) => user.phone) } });
    const demoUserNames = new Set(demoUsers.map((user) => user.username));
    if (existingUsers.some((user) => !demoUserNames.has(user.username))) {
      throw new Error('A proposed demo phone number is already assigned to a non-demo account');
    }

    const existingConversations = await Conversation.find({ participants: { $in: localParts } });
    const existingDemoNames = new Set(existingUsers.map((user) => user.username));
    if (existingConversations.length && demoUsers.some((user) => !existingDemoNames.has(user.username))) {
      throw new Error('Existing conversations use a proposed demo phone number; refusing to modify them');
    }

    await ensureDemoUsers();

    const conversationDefinitions = {
      'aarav-meera': await getConversation({ participants: [userByName['Demo Aarav'].phone, userByName['Demo Meera'].phone] }),
      'aarav-kabir': await getConversation({ participants: [userByName['Demo Aarav'].phone, userByName['Demo Kabir'].phone] }),
      'aarav-nisha': await getConversation({ participants: [userByName['Demo Aarav'].phone, userByName['Demo Nisha'].phone] }),
      'demo-team': await getConversation({
        participants: [userByName['Demo Aarav'].phone, userByName['Demo Meera'].phone, userByName['Demo Kabir'].phone],
        groupName: 'Demo Team Updates',
      }),
    };

    const messageDefinitions = [
      { key: 'demo-meera-welcome', thread: 'aarav-meera', from: 'Demo Meera', to: ['Demo Aarav'], subject: 'Welcome to the project', text: 'I have shared the project notes. Let me know what you think.', minutesAgo: 125 },
      { key: 'demo-aarav-thanks', thread: 'aarav-meera', from: 'Demo Aarav', to: ['Demo Meera'], subject: 'Re: Welcome to the project', text: 'Thanks, I will review them this afternoon.', minutesAgo: 110, readBy: ['Demo Meera'], inReplyTo: `<demo-meera-welcome@${DOMAIN}>`, references: [`<demo-meera-welcome@${DOMAIN}>`] },
      { key: 'demo-meera-followup', thread: 'aarav-meera', from: 'Demo Meera', to: ['Demo Aarav'], subject: 'Re: Welcome to the project', text: 'I added a short checklist at the end of the notes.', minutesAgo: 8, inReplyTo: `<demo-aarav-thanks@${DOMAIN}>`, references: [`<demo-meera-welcome@${DOMAIN}>`, `<demo-aarav-thanks@${DOMAIN}>`] },
      { key: 'demo-kabir-review', thread: 'aarav-kabir', from: 'Demo Kabir', to: ['Demo Aarav'], subject: 'Can you review the inbox layout?', text: 'The latest build is ready. I would especially like feedback on the conversation list.', minutesAgo: 65 },
      { key: 'demo-aarav-review-reply', thread: 'aarav-kabir', from: 'Demo Aarav', to: ['Demo Kabir'], subject: 'Re: Can you review the inbox layout?', text: 'I am looking at it now. The message spacing feels much better.', minutesAgo: 52, readBy: ['Demo Kabir'], inReplyTo: `<demo-kabir-review@${DOMAIN}>`, references: [`<demo-kabir-review@${DOMAIN}>`] },
      { key: 'demo-nisha-lunch', thread: 'aarav-nisha', from: 'Demo Nisha', to: ['Demo Aarav'], subject: 'Lunch on Friday?', text: 'Are you free to grab lunch after the demo?', minutesAgo: 32 },
      { key: 'demo-team-release', thread: 'demo-team', from: 'Demo Kabir', to: ['Demo Aarav', 'Demo Meera'], subject: 'Release demo at 3 PM', text: 'The team demo is set for 3 PM. Please add any final notes before then.', minutesAgo: 18, readBy: ['Demo Meera'] },
    ];

    const savedMessages = [];
    for (const definition of messageDefinitions) {
      savedMessages.push(await saveDemoMessage(conversationDefinitions[definition.thread], definition));
    }

    for (const conversation of Object.values(conversationDefinitions)) {
      const latest = savedMessages
        .filter((message) => String(message.conversation) === String(conversation._id))
        .sort((left, right) => right.date - left.date)[0];
      await Conversation.updateOne({ _id: conversation._id }, {
        $set: {
          lastMessageAt: latest.date,
          lastMessagePreview: latest.text.slice(0, 200),
          lastMessageFrom: latest.from.slice(0, latest.from.lastIndexOf('@')),
        },
      });
    }

    console.log(`Seeded ${demoUsers.length} demo users, ${Object.keys(conversationDefinitions).length} conversations, and ${savedMessages.length} messages.`);
    console.log(`All demo users use password ${PASSWORD}.`);
    for (const user of demoUsers) console.log(`${user.username}: ${user.phone}`);
  } finally {
    if (disconnect) await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  seedDemoData().catch((error) => {
    console.error('[seed-demo] Failed:', error.message);
    process.exitCode = 1;
  });
}