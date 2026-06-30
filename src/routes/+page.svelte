<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { fetchDatabaseData, supabase } from "$lib/supabaseClient";

  import ScrollArea from "$lib/components/ui/scroll-area/scroll-area.svelte";
  import type { Channel, Message } from "../types/database.types";
  import Button from "$lib/components/ui/button/button.svelte";

  let activeChannelId: string = $state("");
  let localChannelsData: Channel[] = $state([]);
  let localMessagesData: SvelteMap<string, Message[]> = new SvelteMap();
  // Current user message box content.
  let messageBoxText: string = $state("");

  onMount(async () => {
    const { channelsData: remoteChannelsData, messagesData: remoteMessagesData } =
      await fetchDatabaseData();
    localChannelsData = remoteChannelsData as Channel[];
    if (localChannelsData.length == 0) return;

    activeChannelId = localChannelsData[0]!["id"];
    (remoteMessagesData as Map<string, Message[]>).forEach((value, key) => {
      localMessagesData.set(key, value);
    });
  });

  async function sendMessage() {
    if (!messageBoxText.trim() || !activeChannelId) return;

    const textToSend = messageBoxText;
    messageBoxText = ""; // Clear input field.

    const newMessagePayload = {
      channel_id: activeChannelId,
      content: textToSend,
      username: "Anonymous User",
      parent_id: null, // Main feed message (not a thread reply.)
      upvote_count: 0
    };

    // 3. Fire-and-forget to Supabase database
    const { data, error } = await supabase.from("messages").insert([newMessagePayload]).select(); // .select() tells Supabase to return the row it just created (with its new database ID)

    if (error) {
      console.error("Failed to send message to database:", error.message);
      return;
    }

    // 4. Update your local SvelteMap instantly so it renders right away
    if (data && data.length > 0) {
      const savedMessage = data[0] as Message;

      const currentMessages = localMessagesData.get(activeChannelId) || [];
      // Svelte 5 state maps require you to re-.set() to guarantee a reactive refresh
      localMessagesData.set(activeChannelId, [...currentMessages, savedMessage]);
    }
  }
</script>

<div class="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
  <!-- Message Region -->
  <div class="flex-1 flex flex-col bg-slate-950">
    <div class="h-14 flex items-center px-6 border-b border-slate-800 font-semibold text-white">
      # {activeChannelId}
    </div>

    <!-- Message Bubble Area -->
    <ScrollArea class="flex-1 p-6">
      <div class="space-y-4 max-w-4xl mx-auto">
        {#each localMessagesData.get(activeChannelId) as message (message.id)}
          <div class="h-min w-min p-1 bg-slate-600">{message.content}</div>
        {/each}
      </div>
    </ScrollArea>

    <!-- Send Message Area -->
    <div class="p-4 border-t border-slate-800 bg-slate-950">
      <div class="max-w-4xl mx-auto flex gap-2">
        <input
          type="text"
          bind:value={messageBoxText}
          placeholder="Message #{activeChannelId}"
          class="flex-1 bg-slate-900 border border-slate-800 px-4 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
        />
        <Button
          onclick={() => {
            sendMessage();
          }}
          class="bg-slate-600 cursor-pointer">Send</Button
        >
      </div>
    </div>
  </div>

  <!-- Panel Region -->
  <div class="flex w-full bg-slate-600 border-r border-slate-800">
    <div
      class="flex h-full items-center px-4 font-bold tracking-tight border-b border-slate-800 text-white"
    >
      COMP9999 - Introduction to Chatroom Demo
    </div>
    <!-- Horizontal list of Channels -->
    <ScrollArea class="flex flex-1 p-2">
      <div class="flex space-y-1">
        {#each localChannelsData as channel (channel.id)}
          <Button
            onclick={() => {
              activeChannelId = channel.id;
            }}
            class="h-full text-left px-3 py-2 text-sm transition-color duration-200 cursor-pointer
					{activeChannelId === channel.id
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
