<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { fetchDatabaseData } from "$lib/supabaseClient";

  import ScrollArea from "$lib/components/ui/scroll-area/scroll-area.svelte";
  import type { Channel, Message } from "../types/database.d";
  import Button from "$lib/components/ui/button/button.svelte";
  import MessageBubble from "$lib/components/MessageBubble.svelte";
  import type { Context } from "../types/context.d";
  import { findMessageById, sendMessage } from "$lib/utils";
  import type { Upvote } from "../types/database";

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

  // Fetch all the channel and message data on mount.
  onMount(async () => {
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
  });
</script>

<div class="relative flex h-screen w-screen overflow-hidden">
  <!-- #region Base -->
  <div
    class="relative flex-3 flex flex-col justify-center items-center p-3 bg-slate-800 text-slate-100"
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
  <div class="relative flex-1 flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
    <div class="p-4 truncate">
      <span><b>Discussions</b> # {context.activeChannelId}</span>
    </div>
    <!-- Message Bubble Area -->
    <ScrollArea class="relative w-full h-40 flex-1 flex flex-col bg-slate-950">
      <div class="flex flex-col h-full p-6 space-y-4 max-w-4xl">
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
              onUpvoteClick={(id: string, isDeleted: boolean) => {
                if (isDeleted) {
                  let newUpvotes: Upvote[] =
                    context.upvotes
                      .get(id)
                      ?.filter(
                        (vote) => vote.message_id != id && vote.username != context.username
                      ) || [];
                  context.upvotes.set(id, newUpvotes);
                } else {
                  let newUpvote: Upvote = {
                    message_id: id,
                    username: context.username
                  };
                  let oldUpvotes: Upvote[] = context.upvotes.get(id) || [];
                  context.upvotes.set(id, [...oldUpvotes, newUpvote]);
                }
              }}
            />
          {/each}
        {:else}
          <p class="align-middle self-center">No active channel selected</p>
        {/if}
      </div>
      {#if context.replyMessagesId.get(context.activeChannelId ?? "")}
        <div
          class="absolute left-4 right-4 bottom-4 flex justify-between p-4 rounded bg-slate-600 shadow"
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
    <div class="relative border-slate-800 bg-slate-950">
      <div class="max-w-4xl mp-4 p-4 mx-auto flex gap-2 border-t border-slate-800">
        <input
          type="text"
          bind:value={messageInputText}
          placeholder="Message #{context.activeChannelId}"
          class="flex-1 bg-slate-900 border border-slate-800 px-4 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
        />
        <Button
          onclick={async () => {
            await sendMessage(context, messageInputText);
            context.replyMessagesId.set(context.activeChannelId!, null);
            messageInputText = "";
          }}
          class="bg-slate-600 cursor-pointer"
        >
          Send
        </Button>
      </div>
    </div>

    <!-- Bottom Region (Channel List) -->
    <div class="flex w-full bg-slate-900 border-r border-slate-800">
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
                ? 'bg-slate-600 text-white'
                : 'bg-slate-700 hover:bg-slate-500/50 text-slate-100 hover:text-slate-200'}"
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
