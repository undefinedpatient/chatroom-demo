import type { SvelteMap } from "svelte/reactivity";
import type { Channel, Message, Upvote, User } from "./database";

// Everything the user needs to know.
export type Context = {
  user: User | null;

  // Local DB data.
  channels: Channel[]; // Local channels data.
  messages: SvelteMap<string, Message[]>; // Channel Id maps to array of Messages.
  upvotes: SvelteMap<string, Upvote[]>; // message id to array of upvotes.
  users: User[];

  // Purely local.
  activeChannelId: string | null; // Current active chat tab.
  replyMessagesId: SvelteMap<string, string | null>; // Channel Id maps to message id.
};
