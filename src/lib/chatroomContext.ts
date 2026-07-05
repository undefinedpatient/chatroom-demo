import { createContext } from "svelte";
import type { Context } from "../types/context.d";

export const [useChatroomContext, setChatroomContext] = createContext<Context>();
