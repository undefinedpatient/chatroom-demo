<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { fetchDatabaseData, supabase } from "$lib/supabaseClient";

  import ScrollArea from "$lib/components/ui/scroll-area/scroll-area.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import MessageBubble from "$lib/components/MessageBubble.svelte";
  import { findMessageById, sendMessage } from "$lib/utils";

  import type { Channel, Message } from "../types/database.d";
  import type { Context } from "../types/context.d";
  import type { Upvote } from "../types/database";
  import { toggleMode } from "mode-watcher";
  import { MoonIcon, SunIcon } from "@lucide/svelte";
  import { Input } from "$lib/components/ui/input";

  import { setChatroomContext } from "$lib/chatroomContext";

  // Current user message box content.
  let messageInputText: string = $state("");
  let usernameInputText: string = $state("");
  // Current chatroom context.
  let context: Context = $state({
    username: "Anonymous User",
    activeChannelId: null,
    channels: [],
    messages: new SvelteMap(),
    replyMessagesId: new SvelteMap(),
    upvotes: new SvelteMap()
  });

  setChatroomContext(context);

  // Fetch all the channel and message data on mount.
  onMount(() => {
    const fetchData = async () => {
      const {
        channelsData: remoteChannelsData,
        messagesData: remoteMessagesData,
        upvotesData: remoteUpvotesData
      } = await fetchDatabaseData();
      context.channels = remoteChannelsData as Channel[];
      if (context.channels.length == 0) return;

      context.activeChannelId = context.channels[0]!["id"];
      (remoteUpvotesData as Map<string, Upvote[]>).forEach((value, key) => {
        context.upvotes.set(key, value);
      });
      (remoteMessagesData as Map<string, Message[]>).forEach((value, key) => {
        context.messages.set(key, value);
      });
    };
    fetchData();

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
          let oldMessages: Message[] = context.messages.get(context.activeChannelId!) ?? [];
          switch (eventType) {
            case "INSERT":
              context.messages.set(context.activeChannelId!, [
                ...oldMessages,
                payload.new as Message
              ]);
              break;
            case "UPDATE":
              break;
            case "DELETE":
              context.messages.set(
                context.activeChannelId!,
                oldMessages.filter((msg) => msg.id != payload.old["id"])
              );

              break;
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  });
</script>

<div class="relative flex h-screen w-screen overflow-hidden">
  <!-- #region Base -->
  <div
    class="relative flex-3 flex flex-col justify-center items-center p-3 bg-background text-slate-100"
  >
    <Button onclick={toggleMode} variant="outline" size="icon" class="absolute top-1 left-1">
      <SunIcon
        class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
      />
      <MoonIcon
        class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
      />
      <span class="sr-only">Toggle theme</span>
    </Button>
    <div class="w-max">
      <h3>Account: <i>{context.username}</i></h3>
      <Input type="text" bind:value={usernameInputText} placeholder="Username" />

      <Button
        onclick={() => {
          context.username = usernameInputText;
        }}>Change Identity</Button
      >
    </div>
  </div>
  <!-- #endregion -->

  <!-- #region Chatroom-->
  <div
    class="relative flex-1 flex flex-col h-full bg-secondary text-secondary-foreground font-sans"
  >
    <div class="p-4 truncate">
      <span><b>Discussions</b> # {context.activeChannelId}</span>
    </div>
    <!-- Message Bubble Area -->
    <ScrollArea class="relative w-full h-40 flex-1 flex flex-col ">
      <div class="flex flex-col h-full p-6 space-y-4 max-w-4xl">
        {#if context.activeChannelId != null}
          {#each context.messages.get(context.activeChannelId) as message (message.id)}
            <MessageBubble {message} />
          {/each}
        {:else}
          <p class="align-middle self-center">No active channel selected</p>
        {/if}
      </div>
      {#if context.replyMessagesId.get(context.activeChannelId ?? "")}
        <div
          class="
					absolute left-4 right-4 bottom-4
					flex justify-between
					p-4 border rounded bg-card text-card-foreground shadow"
        >
          <div>
            {findMessageById(context, context.replyMessagesId.get(context.activeChannelId!)!)!
              .username}<br />
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
        <Input
          type="text"
          bind:value={messageInputText}
          placeholder="Message #{context.activeChannelId}"
        />
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
  <!-- #endregion -->
</div>
