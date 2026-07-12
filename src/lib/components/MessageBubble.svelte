<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index";
  import { ArrowUp } from "@lucide/svelte";
  import Button from "./ui/button/button.svelte";
  import { deleteMessage, triggerUpvote } from "$lib/supabaseClient";
  import { findMessageById, findUserById, parseMessage } from "$lib/utils";
  import { useChatroomContext } from "$lib/chatroomContext";

  import type { Message, User } from "../../types/database";

  const {
    message
  }: {
    message: Message;
  } = $props();
  const context = useChatroomContext();

  const parentMessage: Message | null = $derived(
    message.parent_id ? findMessageById(context, message.parent_id) : null
  );
  const parentSender: User | null = parentMessage
    ? findUserById(context, parentMessage!.user_id!)
    : null;
  const sender: User = findUserById(context, message.user_id!)!;
  // Highlight bubble if the message mentions current user name or role
  const isHighlighted: boolean = $derived(
    context.user &&
      (message.content.includes(`@${context.user.role}`) ||
        message.content.includes(`@${context.user.name}`)) &&
      message.user_id !== context.user.id
  );
  // Does the message has replied to some previous message.
  const hasParent: boolean = $derived(parentMessage !== null);
  // Is the message upvoted by current user.
  const isUpvoted: boolean = $derived(
    !!context.upvotes.get(message.id)?.some((vote) => vote.user_id === context.user?.id)
  );
</script>

<!-- Message Bubble in Chatroom -->
<div class={message.user_id == context.user?.id ? "self-end" : "self-start"}>
  <ContextMenu.Root>
    <ContextMenu.Trigger
      class="group/bubble flex flex-col items-start relative h-min w-max max-w-96 p-3 rounded bg-card border hover:border-primary
             {isHighlighted
        ? 'bg-amber-500/5 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.08)]'
        : ''}"
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
      {#if hasParent}
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

      <!-- Render Tokenized Content with Tag Badges -->
      <div class="whitespace-pre-wrap text-sm leading-relaxed">
        {#each parseMessage(context, message.content) as token (token.id)}
          {#if token.type === "role"}
            <span
              class="inline-block px-1 py-0.5 rounded font-semibold text-[11px] border
                         {token.targetName === 'instructor'
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                : token.targetName === 'ta'
                  ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}"
            >
              {token.text}
            </span>
          {:else if token.type === "user"}
            <span
              class="inline-block px-1 py-0.5 rounded font-semibold text-[11px] border
                         {context.user?.name === token.targetName
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-muted/15 text-muted-foreground border-muted/30'}"
            >
              {token.text}
            </span>
          {:else}
            {token.text}
          {/if}
        {/each}
      </div>

      <!-- Upvote Button -->
      <Button
        onclick={async () => {
          triggerUpvote(context, message.id);
        }}
        class="w-12 h-6 mt-4 text-xs self-end rounded cursor-pointer border"
        variant={isUpvoted ? "default" : "outline"}
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
