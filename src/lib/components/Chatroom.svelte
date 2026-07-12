<script lang="ts">
  import { onMount } from "svelte";
  import { sendMessage, supabase } from "$lib/supabaseClient";

  import ScrollArea from "$lib/components/ui/scroll-area/scroll-area.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import MessageBubble from "$lib/components/MessageBubble.svelte";
  import { findMessageById, findUserById } from "$lib/utils";
  import { tick } from "svelte";

  import type { Message } from "$lib/../types/database.d";
  import type { Context } from "$lib/../types/context.d";

  import { useChatroomContext } from "$lib/chatroomContext";
  import Textarea from "./ui/textarea/textarea.svelte";

  let { class: className = "" } = $props();

  let viewportElement: HTMLElement | null = $state(null);
  // Current user message box content.
  let messageInputText: string = $state("");

  let context: Context = useChatroomContext();

  // Fetch all the channel and message data on mount.
  onMount(() => {
    const channel = supabase
      .channel("messages_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages"
        },
        (payload) => {
          const eventType = payload.eventType;
          let newMessage: Message = payload.new as Message;
          let oldMessages: Message[] = context.messages.get(context.activeChannelId!) ?? [];
          switch (eventType) {
            case "INSERT":
              context.messages.set(newMessage.channel_id!, [...oldMessages, newMessage]);
              break;
            case "UPDATE": {
              if (newMessage.channel_id) {
                context.messages.set(
                  newMessage.channel_id,
                  oldMessages.map((msg) => (msg.id === newMessage.id ? newMessage : msg))
                );
              }
              break;
            }
            case "DELETE": {
              const deletedId: string = payload.old.id;
              for (const [channelId, messages] of context.messages.entries()) {
                if (messages.some((msg) => msg.id === deletedId)) {
                  context.messages.set(
                    channelId,
                    messages.filter((msg) => msg.id !== deletedId)
                  );
                  break;
                }
              }
              break;
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  });

  $effect(() => {
    const activeChannel = context.activeChannelId;
    const messages = activeChannel ? context.messages.get(activeChannel) : null;

    if (viewportElement && messages) {
      // Access length to establish a dependency on messages updates
      const messageCount = messages.length;

      tick().then(() => {
        if (viewportElement) {
          const percentage =
            viewportElement.scrollTop /
            (viewportElement.scrollHeight - viewportElement.clientHeight);
          if (percentage > 0.8) {
            viewportElement.scrollTo({
              top: viewportElement.scrollHeight,
              behavior: "smooth"
            });
          }
        }
      });
    }
  });
</script>

<div class={className}>
  <!-- Title -->
  <div class="p-4 truncate">
    <span><b>Discussions</b> # {context.activeChannelId}</span>
  </div>
  <!-- Message Bubble Area -->
  <ScrollArea bind:viewportRef={viewportElement} class="relative w-full h-40 flex-1 flex flex-col ">
    <div class="flex flex-col h-full p-6 space-y-4 max-w-4xl">
      {#if context.activeChannelId != null}
        {#each context.messages.get(context.activeChannelId) as message (message.id)}
          <MessageBubble {message} />
        {/each}
      {:else}
        <p class="align-middle self-center">No active channel selected</p>
      {/if}
    </div>
    <!-- If user is currently replying to a message, show the message he is replying to -->
    {#if context.replyMessagesId.get(context.activeChannelId ?? "")}
      <div
        class="
					absolute left-4 right-4 bottom-4
					flex justify-between max-h-32 overflow-hidden text-ellipsis
					p-4 border rounded bg-card text-card-foreground shadow
					"
      >
        <div class="w-[80%]">
          <b
            >{findUserById(
              context,
              findMessageById(context, context.replyMessagesId.get(context.activeChannelId!)!)!
                .user_id!
            )?.name}</b
          ><br />
          {findMessageById(context, context.replyMessagesId.get(context.activeChannelId!)!)!
            .content}
        </div>
        <Button
          onclick={() => {
            context.replyMessagesId.set(context.activeChannelId!, null);
          }}
          variant="destructive">x</Button
        >
      </div>
    {/if}
  </ScrollArea>
  <!-- Send Message Area -->
  <div class="relative border-sidebar bg-sidebar-accent">
    <div class="max-w-4xl mp-4 p-4 mx-auto flex gap-2 border-t border-slate-800">
      <Textarea bind:value={messageInputText} placeholder="Message #{context.activeChannelId}" />
      <Button
        onclick={async () => {
          await sendMessage(context, messageInputText);
          context.replyMessagesId.set(context.activeChannelId!, null);
          messageInputText = "";
        }}
        class="cursor-pointer"
      >
        Send
      </Button>
    </div>
  </div>
  <!-- Bottom Region (Channel List) -->
  <div class="flex w-full bg-sidebar border-r border border-sidebar text-sidebar">
    <!-- Horizontal list of Channels -->
    <ScrollArea class="flex flex-1 p-2">
      <div class="flex space-y-1">
        {#each context.channels as channel (channel.id)}
          <Button
            onclick={() => {
              context.activeChannelId = channel.id;
            }}
            class="h-full text-left px-3 py-2 text-sm transition-color duration-200 cursor-pointer
					{context.activeChannelId === channel.id
              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
              : 'bg-sidebar-accent text-sidebar-accent-foreground'}"
          >
            {channel.name}
          </Button>
        {/each}
      </div>
    </ScrollArea>
  </div>
</div>
