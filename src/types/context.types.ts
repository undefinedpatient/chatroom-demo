import type { SvelteMap } from "svelte/reactivity";
import type { Channel, Message } from "./database.types";

export type Context = {
  username: string;
  activeChannelId: string | null;
  channels: Channel[];
  messages: SvelteMap<string, Message[]>; // Channel Id maps to array of Messages.
  replyMessagesId: SvelteMap<string, string | null>; // Channel Id maps to message id.
};
