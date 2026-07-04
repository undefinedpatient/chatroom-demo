<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { fetchDatabaseData } from "$lib/supabaseClient";

  import ScrollArea from "$lib/components/ui/scroll-area/scroll-area.svelte";
  import type { Channel, Message } from "../types/database.types";
  import Button from "$lib/components/ui/button/button.svelte";
  import MessageBubble from "$lib/components/MessageBubble.svelte";
  import type { Context } from "../types/context.types";
  import { findMessageById, sendMessage } from "$lib/utils";

  // Current user message box content.
  let messageInputText: string = $state("");
  let usernameInputText: string = $state("");
  // Current chatroom context.
  let context: Context = $state({
    username: "Anonymous User",
    activeChannelId: null,
    channels: [],
    messages: new SvelteMap(),
    replyMessagesId: new SvelteMap()
  });

  // Fetch all the channel and message data on mount.
  onMount(async () => {
    const { channelsData: remoteChannelsData, messagesData: remoteMessagesData } =
      await fetchDatabaseData();
    context.channels = remoteChannelsData as Channel[];
    if (context.channels.length == 0) return;

    context.activeChannelId = context.channels[0]!["id"];
    (remoteMessagesData as Map<string, Message[]>).forEach((value, key) => {
      context.messages.set(key, value);
    });
  });
</script>

<div class="relative flex h-screen w-screen overflow-hidden">
  <!-- #region Base -->
  <div
    class="relative flex-3 flex flex-col justify-center items-center p-3 bg-slate-500 text-slate-100"
  >
    <div class="w-max">
      <h3>Account: <i>{context.username}</i></h3>
      <input
        type="text"
        bind:value={usernameInputText}
        placeholder="Username"
        class="h-min bg-slate-900 border border-slate-800 px-4 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
      />

      <Button
        onclick={() => {
          context.username = usernameInputText;
        }}>Change Identity</Button
      >
    </div>
  </div>
  <!-- #endregion -->

  <!-- #region Chatroom-->
  <div class="relative flex-1 flex flex-col bg-slate-950 text-slate-100 font-sans">
    <!-- Message Region -->
    <div class="relative w-full flex-1 flex flex-col bg-slate-950">
      <div
        class="h-14 w-full flex items-center px-6 border-b border-slate-800 font-semibold text-white"
      >
        # {context.activeChannelId}
      </div>

      <!-- Message Bubble Area -->
      <ScrollArea class="flex-1 p-6">
        <div class="flex flex-col space-y-4 max-w-4xl mx-auto">
          {#if context.activeChannelId != null}
            {#each context.messages.get(context.activeChannelId) as message (message.id)}
              <MessageBubble
                {message}
                {context}
                onDeleteClick={(id: string) => {
                  let currentMessages: Message[] | undefined = context.messages.get(
                    context.activeChannelId!
                  );
                  if (!currentMessages) return;
                  let updatedMessages = currentMessages.filter((v) => v.id !== id);
                  context.messages.set(context.activeChannelId!, updatedMessages);
                }}
                onReplyClick={(id: string) => {
                  context.replyMessagesId.set(context.activeChannelId!, id);
                }}
              />
            {/each}
          {:else}
            <p class="align-middle self-center">No active channel selected</p>
          {/if}
        </div>
      </ScrollArea>

      <!-- Send Message Area -->
      <div class="border-t border-slate-800 bg-slate-950">
        {#if context.replyMessagesId.get(context.activeChannelId ?? "")}
          <div class="relatve flex justify-between p-4 border-b border-slate-800 bg-slate-950">
            <div>
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
        <div class="max-w-4xl mp-4 p-4 mx-auto flex gap-2">
          <input
            type="text"
            bind:value={messageInputText}
            placeholder="Message #{context.activeChannelId}"
            class="flex-1 bg-slate-900 border border-slate-800 px-4 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
          />
          <Button
            onclick={() => {
              sendMessage(context, messageInputText);
            }}
            class="bg-slate-600 cursor-pointer">Send</Button
          >
        </div>
      </div>
    </div>

    <!-- Bottom Region (Channel List) -->
    <div class="flex w-full bg-slate-600 border-r border-slate-800">
      <div
        class="flex h-full items-center px-4 font-bold tracking-tight border-b border-slate-800 text-white"
      >
        COMP9999 - Introduction to Chatroom Demo
      </div>
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
                ? 'bg-slate-500 text-white'
                : 'text-slate-100 bg-slate-600 hover:bg-slate-500/50 hover:text-slate-200'}"
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
