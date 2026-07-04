<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index";
  import { supabase } from "$lib/supabaseClient";
  import { findMessageById } from "$lib/utils";
  import type { Context } from "../../types/context.d";
  import type { Message, Upvote } from "../../types/database.d";
  import Button from "./ui/button/button.svelte";
  const {
    message,
    context,
    onDeleteClick,
    onReplyClick,
    onUpvoteClick
  }: {
    message: Message;
    context: Context;
    onDeleteClick?: (id: string) => void;
    onReplyClick?: (id: string) => void;
    onUpvoteClick?: (id: string, isDelete: boolean) => void;
  } = $props();
  let parentMessage: Message | null = $state(null);
  if (message.parent_id) {
    parentMessage = findMessageById(context, message.parent_id);
  }
</script>

<!-- Message Bubble in Chatroom -->
<div
  class="h-min w-max max-w-56 p-3 rounded text-wrap break-all bg-slate-600
	{message.username == context.username ? 'self-end' : 'self-start'}"
>
  <ContextMenu.Root>
    <ContextMenu.Trigger class="flex flex-col items-start">
      {#if parentMessage}
        <div class="flex items-center gap-1 mb-1 px-1 max-w-full truncate text-xs text-slate-300">
          <span class="font-semibold text-slate-300">{parentMessage.username}</span>
          <span class="truncate italic">"{parentMessage.content}"</span>
        </div>
      {/if}
      <b>{message.username}</b><br />
      {message.content}<br />
      <Button
        onclick={async () => {
          if (
            context.upvotes.get(message.id)?.find((value) => value.username == context.username)
          ) {
            console.log("Removing votes");
            await supabase
              .from("upvotes")
              .delete()
              .eq("message_id", message.id)
              .eq("username", context.username);
            onUpvoteClick?.(message.id, true);
          } else {
            console.log("Adding votes");
            let newRow: Upvote = {
              message_id: message.id,
              username: context.username
            };
            const { data, error } = await supabase.from("upvotes").insert([newRow]).select();
            if (error) {
              console.log(error);
            } else {
              console.log(data);
            }
            onUpvoteClick?.(message.id, false);
          }
        }}
        class="text-xs self-end rounded"
      >
        Upvote: {context.upvotes.get(message.id)?.length || 0}
      </Button>
    </ContextMenu.Trigger>
    <ContextMenu.Content>
      <!-- Handle Reply -->
      <ContextMenu.Item
        onclick={async () => {
          onReplyClick?.(message.id);
        }}>Reply</ContextMenu.Item
      >
      <ContextMenu.Separator />
      <!-- Handle Deletion -->
      {#if message.username == context.username}
        <ContextMenu.Item
          onclick={async () => {
            const res = await supabase.from("messages").delete().eq("id", message.id);
            if (res.error) {
              console.error(res.error);
            }
            onDeleteClick?.(message.id);
          }}
          variant="destructive">Delete</ContextMenu.Item
        >
      {/if}
    </ContextMenu.Content>
  </ContextMenu.Root>
</div>
