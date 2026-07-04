import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database, Channel, Message } from "../types/database.d";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from "$env/static/public";
import type { Upvote } from "../types/database";

export const supabase: SupabaseClient = createClient<Database>(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

/**
 * @returns A object consist of two values, a list of channels,
 * and a map of channelId to array of {@link Message}.
 */
export async function fetchDatabaseData() {
  const { data: remoteChannelsData, error: remoteChannelsError } = await supabase
    .from("channels")
    .select("*");
  const { data: remoteMessagesData, error: remoteMessagesError } = await supabase
    .from("messages")
    .select("*");
  const { data: remoteUpvotesData, error: remoteUpvotesError } = await supabase
    .from("upvotes")
    .select("*");
  if (remoteChannelsError) {
    console.error(remoteChannelsError.message);
    throw remoteChannelsError;
  }
  if (remoteMessagesError) {
    console.error(remoteMessagesError.message);
    throw remoteMessagesError;
  }
  if (remoteUpvotesError) {
    console.error(remoteUpvotesError.message);
    throw remoteUpvotesError;
  }
  const channelsData: Channel[] = remoteChannelsData as Channel[];
  const messagesData = Map.groupBy(remoteMessagesData, (value: Message) => value.channel_id);
  const upvotesData = Map.groupBy(remoteUpvotesData, (value: Upvote) => value.message_id);
  return { channelsData, messagesData, upvotesData };
}
