<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { supabase } from "$lib/supabaseClient";

  import ScrollArea from "$lib/components/ui/scroll-area/scroll-area.svelte";
  import type { Channel, Message } from "../types/database.types";
  import Button from "$lib/components/ui/button/button.svelte";

  let activeChannelId: string = $state("");
  let localChannelsData: Channel[] = $state([]);
  let localMessagesData: SvelteMap<string, Message[]> = new SvelteMap();

  onMount(async () => {
    const { data: remoteChannelsData, error: remoteChannelsError } = await supabase
      .from("channels")
      .select("*");
    if (remoteChannelsError) {
      console.error(remoteChannelsError.message);
      return;
    }
    localChannelsData = remoteChannelsData as Channel[];
    if (localChannelsData.length == 0) return;
    console.log(localChannelsData);

    activeChannelId = localChannelsData[0]!["id"];
    const { data: remoteMessagesData, error: remoteMessagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("channel_id", activeChannelId);
    if (remoteMessagesError) {
      console.error(remoteMessagesError.message);
      return;
    }
    localMessagesData.set(activeChannelId, remoteMessagesData);
  });
</script>

<div class="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
  <div class="w-60 bg-slate-900 flex flex-col border-r border-slate-800">
    <div
      class="h-14 flex items-center px-4 font-bold tracking-tight border-b border-slate-800 text-white"
    >
      Workspace
    </div>
    <ScrollArea class="flex flex-1 p-2">
      <div class="flex flex-col space-y-1">
        {#each localChannelsData as channel (channel.id)}
          <Button
            onclick={() => {
              activeChannelId = channel.id;
            }}
            class="w-full text-left px-3 py-2 text-sm transition-color duration-200
					{activeChannelId === channel.id
              ? 'bg-slate-400 text-white'
              : 'text-slate-100 bg-slate-600 hover:bg-slate-600/50 hover:text-slate-200'}"
            >{channel.name}</Button
          >
        {/each}
      </div>
    </ScrollArea>
  </div>

  <div class="flex-1 flex flex-col bg-slate-950">
    <div class="h-14 flex items-center px-6 border-b border-slate-800 font-semibold text-white">
      # {activeChannelId}
    </div>

    <ScrollArea class="flex-1 p-6">
      <div class="space-y-4 max-w-4xl mx-auto">
        <!-- Message Area -->
      </div>
    </ScrollArea>
    <div class="p-4 border-t border-slate-800 bg-slate-950">
      <div class="max-w-4xl mx-auto flex gap-2">
        <input
          type="text"
          placeholder="Message #{activeChannelId}"
          class="flex-1 bg-slate-900 border border-slate-800 px-4 py-2 text-sm text-white focus:outline-none focus:border-slate-700"
        />
        <Button variant="default">Send</Button>
      </div>
    </div>
  </div>
</div>
