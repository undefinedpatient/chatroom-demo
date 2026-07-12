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

// Parse @role and @username tags
interface Token {
  id: number;
  type: "text" | "role" | "user";
  text: string;
  targetName?: string;
}

export function parseMessage(context: Context, content: string): Token[] {
  if (!content) return [];

  // Sort usernames by length descending to match longer/full names first
  const userNames = context.users.map((u) => u.name).sort((a, b) => b.length - a.length);

  const roles = ["instructor", "ta", "student"];

  // Add \ in front of all special symbols.
  const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

  // @instructor\b|@ta\b|@ta\b
  const rolePattern = roles.map((word) => `@${word}\\b`).join("|");
  const userPattern = userNames.map((u) => `@${escapeRegex(u)}\\b`).join("|");

  const combinedPattern: RegExp = new RegExp(`(${rolePattern}|${userPattern})`, "g");

  const parts = content.split(combinedPattern);
  return parts.map((part, idx) => {
    if (part.startsWith("@")) {
      const nameWithoutAt = part.slice(1); // "@ABC" => "ABC"
      if (roles.includes(nameWithoutAt)) {
        return { id: idx, type: "role" as const, text: part, targetName: nameWithoutAt };
      } else {
        return { id: idx, type: "user" as const, text: part, targetName: nameWithoutAt };
      }
    }
    return { id: idx, type: "text" as const, text: part };
  });
}
