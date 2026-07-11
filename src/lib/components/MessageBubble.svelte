<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index";
  import { supabase } from "$lib/supabaseClient";
  import { findMessageById, findUserById } from "$lib/utils";
  import { ArrowUp } from "@lucide/svelte";
  import Button from "./ui/button/button.svelte";

  import { useChatroomContext } from "$lib/chatroomContext";

  import type { Message, Upvote } from "../../types/database.d";

  const {
    message
  }: {
    message: Message;
  } = $props();

  const context = useChatroomContext();
  const parentMessage = $derived(
    message.parent_id ? findMessageById(context, message.parent_id) : null
  );
</script>

<!-- Message Bubble in Chatroom -->
<div
  class="group/bubble relative h-min w-max max-w-56 p-3 rounded bg-card border
	{message.user_id == context.userId ? 'self-end' : 'self-start'}"
>
  <ContextMenu.Root>
    <ContextMenu.Trigger class="flex flex-col items-start">
      {#if parentMessage}
        <div class="flex items-center gap-1 mb-1 px-1 max-w-full truncate text-xs">
          <span class="font-semibold"
            >{findUserById(context, parentMessage.user_id!)?.username ?? "Unknown User"}</span
          >
          <span class="truncate italic">"{parentMessage.content}"</span>
        </div>
      {/if}
      <b>{findUserById(context, message.user_id!)?.username}</b><br />
      {message.content}
      <span
        class="
					absolute left-0 bottom-full
					truncate italic text-xs
					hidden
					group-hover/bubble:block
			">{new Date(message.created_at).toLocaleString()}</span
      >
      <Button
        onclick={async () => {
          if (context.upvotes.get(message.id)?.find((value) => value.user_id == context.userId)) {
            await supabase
              .from("upvotes")
              .delete()
              .eq("message_id", message.id)
              .eq("user_id", context.userId);
            let newUpvotes: Upvote[] =
              context.upvotes
                .get(message.id)
                ?.filter(
                  (vote) => vote.message_id != message.id || vote.user_id != context.userId
                ) || [];
            context.upvotes.set(message.id, newUpvotes);
          } else {
            let newRow: Upvote = {
              message_id: message.id,
              user_id: context.userId
            };
            const { data, error } = await supabase.from("upvotes").insert([newRow]).select();
            if (error) {
              throw error;
            }
            let newUpvote: Upvote = {
              message_id: message.id,
              user_id: context.userId
            };
            let oldUpvotes: Upvote[] = context.upvotes.get(message.id) || [];
            context.upvotes.set(message.id, [...oldUpvotes, newUpvote]);
          }
        }}
        class="text-xs self-end rounded cursor-pointer"
      >
        <ArrowUp />
        {context.upvotes.get(message.id)?.length || 0}
      </Button>
    </ContextMenu.Trigger>
    <ContextMenu.Content class="rounded">
      <!-- Handle Reply -->
      <ContextMenu.Item
        onclick={async () => {
          context.replyMessagesId.set(context.activeChannelId!, message.id);
        }}>Reply</ContextMenu.Item
      >
      <ContextMenu.Separator />
      <!-- Handle Deletion -->
      {#if message.user_id == context.userId}
        <ContextMenu.Item
          onclick={async () => {
            const res = await supabase.from("messages").delete().eq("id", message.id);
            if (res.error) {
              throw res.error;
            }
            // Update the context.
            let currentMessages: Message[] | undefined = context.messages.get(
              context.activeChannelId!
            );
            if (!currentMessages) return;
            let updatedMessages = currentMessages.filter((v) => v.id !== message.id);
            context.messages.set(context.activeChannelId!, updatedMessages);
          }}
          variant="destructive">Delete</ContextMenu.Item
        >
      {/if}
    </ContextMenu.Content>
  </ContextMenu.Root>
</div>
