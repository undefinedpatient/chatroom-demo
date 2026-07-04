import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "./supabaseClient";
import type { Context } from "../types/context.types";
import type { Message } from "../types/database.types";

//#region Generated
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

//#endregion

/**
 * @returns Find {@link Message} in local context.
 */
export function findMessageById(context: Context, id: string): Message | null {
  const msg = context.messages
    .get(context.activeChannelId!)
    ?.find((value: Message) => value.id === id);
  return msg ?? null;
}
export async function sendMessage(
  context: Context, // Use the username and channel inside of it.
  message: string,
  parentId?: string
) {
  if (!message.trim() || !context.activeChannelId) return;
  if (!context.username.trim()) return;

  const newRow = {
    channel_id: context.activeChannelId,
    content: message,
    username: context.username,
    parent_id: parentId,
    upvote_count: 0
  };

  const { data, error } = await supabase.from("messages").insert([newRow]).select();
  if (error) {
    console.error("Failed to send message to database:", error.message);
    return;
  }

  if (data && data.length > 0) {
    const savedMessage = data[0] as Message;
    // Append operation.
    const currentMessages = context.messages.get(context.activeChannelId) || [];
    context.messages.set(context.activeChannelId, [...currentMessages, savedMessage]);
  }
}
