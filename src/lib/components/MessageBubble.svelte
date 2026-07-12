<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index";
  import { deleteMessage, triggerUpvote } from "$lib/supabaseClient";
  import { findMessageById, findUserById } from "$lib/utils";
  import { ArrowUp } from "@lucide/svelte";
  import Button from "./ui/button/button.svelte";

  import { useChatroomContext } from "$lib/chatroomContext";

  import type { Message, User } from "../../types/database";

  const {
    message
  }: {
    message: Message;
  } = $props();

  const context = useChatroomContext();
  const parentMessage = $derived(
    message.parent_id ? findMessageById(context, message.parent_id) : null
  );
  const parentSender: User | null = parentMessage
    ? findUserById(context, parentMessage!.user_id!)
    : null;
  const sender: User = findUserById(context, message.user_id!)!;

  function hasParentMessage(): boolean {
    return parentMessage !== null;
  }

  function isUpvoted(): boolean {
    return !!context.upvotes.get(message.id)?.some((vote) => vote.user_id === context.user?.id);
  }
</script>

<!-- Message Bubble in Chatroom -->
<div class={message.user_id == context.user?.id ? "self-end" : "self-start"}>
  <ContextMenu.Root>
    <ContextMenu.Trigger
      class="group/bubble flex flex-col items-start relative h-min w-max max-w-96 p-3 rounded bg-card border hover:border-primary"
    >
      <span
        class="
					hidden
					absolute left-0 bottom-full
					truncate italic text-xs
					group-hover/bubble:block
			">{new Date(message.created_at).toLocaleString()}</span
      >
      <!-- Parent Message -->
      {#if hasParentMessage()}
        <div class="flex items-center gap-1 mb-1 px-1 max-w-full truncate text-xs">
          <span class="font-semibold">{parentSender?.name ?? "Unknown User"}</span>
          <span class="truncate italic">"{parentMessage!.content}"</span>
        </div>
      {/if}
      <!-- Message Content -->
      <span>
        <b>{sender.name}</b>
        {#if sender.role !== "student"}
          <i class="text-muted-foreground">({sender.role})</i>
        {/if}
      </span>
      <br />
      {message.content}
      <!-- Upvote Button -->
      <Button
        onclick={async () => {
          triggerUpvote(context, message.id);
        }}
        class="w-12 h-6 mt-4 text-xs self-end rounded cursor-pointer border"
        variant={isUpvoted() ? "default" : "outline"}
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
      <!-- Handle Deletion, if user own the message, allow deletion -->
      {#if message.user_id == context.user?.id || context.user?.role != "student"}
        <ContextMenu.Item
          onclick={async () => {
            deleteMessage(message.id);
          }}
          variant="destructive"
        >
          Delete
        </ContextMenu.Item>
      {/if}
    </ContextMenu.Content>
  </ContextMenu.Root>
</div>
