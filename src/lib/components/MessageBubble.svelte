<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index";
  import { supabase } from "$lib/supabaseClient";
  import type { Context } from "../../types/context.types";
  import type { Message } from "../../types/database.types";
  const {
    message,
    context,
    onDeleteClick,
    onReplyClick
  }: {
    message: Message;
    context: Context;
    onDeleteClick?: (id: string) => void;
    onReplyClick?: (id: string) => void;
  } = $props();
</script>

<!-- Message Bubble in Chatroom -->
<div
  class="h-min w-max max-w-56 p-3 border-2 rounded-xs border-slate-500 text-wrap break-all bg-slate-600
	{message.username == context.username ? 'self-end' : 'self-start'}"
>
  <ContextMenu.Root>
    <ContextMenu.Trigger>
      <b>{message.username}</b><br />
      {message.content}
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
