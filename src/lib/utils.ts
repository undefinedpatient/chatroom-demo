import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Context } from "../types/context.d";
import type { Message, User } from "../types/database";

//#region Generated Helpers
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

export function findUserById(context: Context, id: string): User | null {
  const user = context.users.find((value: User) => value.id === id);
  return user ?? null;
}
