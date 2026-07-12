import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Channel, Database, Message, Upvote, User } from "../types/database.d";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from "$env/static/public";
import type { Context } from "../types/context";

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
  const { data: remoteUsersData, error: remoteUsersError } = await supabase
    .from("users")
    .select("*");
  if (remoteChannelsError) {
    throw remoteChannelsError;
  }
  if (remoteMessagesError) {
    throw remoteMessagesError;
  }
  if (remoteUpvotesError) {
    throw remoteUpvotesError;
  }
  if (remoteUsersError) {
    throw remoteUsersError;
  }
  const channelsData: Channel[] = remoteChannelsData as Channel[];
  const usersData: User[] = remoteUsersData as User[];
  const messagesData = Map.groupBy(remoteMessagesData, (value: Message) => value.channel_id);
  const upvotesData = Map.groupBy(remoteUpvotesData, (value: Upvote) => value.message_id);
  return { channelsData, messagesData, upvotesData, usersData };
}

/**
 * @description Send a {@link Message} to DB.
 */
export async function sendMessage(
  context: Context, // Use the username and channel inside of it.
  message: string
): Promise<void> {
  if (!message.trim() || !context.activeChannelId) return;
  if (!context.user) return;

  const newMessage = {
    channel_id: context.activeChannelId,
    content: message,
    user_id: context.user?.id,
    parent_id: context.replyMessagesId.get(context.activeChannelId) ?? null
  };

  const { error } = await supabase.from("messages").insert([newMessage]).select();
  if (error) {
    console.error("Failed to send message to database:", error.message);
    return;
  }
}

export async function triggerUpvote(context: Context, messageId: string) {
  const isUpvoted: boolean = !!context.upvotes
    .get(messageId)
    ?.some((vote) => vote.user_id === context.user?.id);
  if (isUpvoted) {
    await supabase
      .from("upvotes")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", context.user?.id);
    const newUpvotes: Upvote[] =
      context.upvotes
        .get(messageId)
        ?.filter((vote) => vote.message_id != messageId || vote.user_id != context.user?.id) || [];
    context.upvotes.set(messageId, newUpvotes);
  } else {
    const newRow: Upvote = {
      message_id: messageId,
      user_id: context.user!.id
    };
    const { error } = await supabase.from("upvotes").insert([newRow]).select();
    if (error) {
      throw error;
    }
    const newUpvote: Upvote = {
      message_id: messageId,
      user_id: context.user!.id
    };
    const oldUpvotes: Upvote[] = context.upvotes.get(messageId) || [];
    context.upvotes.set(messageId, [...oldUpvotes, newUpvote]);
  }
}

export async function deleteMessage(messageId: string) {
  const res = await supabase.from("messages").delete().eq("id", messageId);
  if (res.error) {
    throw res.error;
  }
  // The DataBase will then boardcast the deletion.
}
