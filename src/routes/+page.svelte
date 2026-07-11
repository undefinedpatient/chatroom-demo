<script lang="ts">
  import { SvelteMap } from "svelte/reactivity";

  import Button from "$lib/components/ui/button/button.svelte";
  import { toggleMode } from "mode-watcher";
  import { MoonIcon, SunIcon, Bot, MessageCircle } from "@lucide/svelte";
  import { setChatroomContext } from "$lib/chatroomContext";
  import Chatroom from "$lib/components/Chatroom.svelte";
  import type { Context } from "../types/context.d";
  import type { Channel, Message, Upvote, User } from "../types/database";
  import { onMount } from "svelte";
  import { fetchDatabaseData } from "$lib/supabaseClient";

  let activeTab: "none" | "chat" | "bot" = $state("none");

  // Current chatroom context.
  let context: Context = $state({
    userId: "",

    channels: [],
    messages: new SvelteMap(),
    upvotes: new SvelteMap(),
    users: [],

    replyMessagesId: new SvelteMap(),
    activeChannelId: null
  });

  function changeUser(user: User) {
    context.userId = user.id;
  }

  setChatroomContext(context);

  onMount(() => {
    const fetchData = async () => {
      const {
        channelsData: remoteChannelsData,
        messagesData: remoteMessagesData,
        upvotesData: remoteUpvotesData,
        usersData: remoteUsersData
      } = await fetchDatabaseData();
      context.channels = remoteChannelsData as Channel[];
      context.users = remoteUsersData as User[];

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
  });
</script>

<div class="relative flex h-screen w-screen overflow-hidden">
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
    <div class="w-80 flex flex-col gap-4">
      <div class="space-y-1">
        <h3 class="text-lg font-semibold tracking-tight text-foreground">Active Account</h3>
        <p class="text-sm text-muted-foreground">
          Currently logged in as: <strong class="text-primary"
            >{context.users.find((u) => u.id === context.userId)?.username ?? "None"}</strong
          >
          {#if context.userId}
            <span class="text-xs font-mono opacity-60 block">({context.userId})</span>
          {/if}
        </p>
      </div>

      <div
        class="border rounded bg-card text-card-foreground shadow-sm flex flex-col overflow-hidden"
      >
        <div class="px-4 py-2 border-b bg-muted/40">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >Select User Identity</span
          >
        </div>
        <div class="divide-y max-h-60 overflow-y-auto">
          {#each context.users as user (user.id)}
            <button
              type="button"
              class="w-full text-left px-4 py-2.5 hover:bg-muted/60 transition-colors text-sm flex justify-between items-center {context.userId ===
              user.id
                ? 'bg-primary/10 font-medium border-l-2 border-primary'
                : 'border-l-2 border-transparent'}"
              onclick={() => changeUser(user)}
            >
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground font-mono"
                  >{user.username.slice(0, 16)}</span
                >
              </div>
              <span
                class="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
              >
                {user.type}
              </span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Sidebar -->
  <div class="relative flex flex-col w-12 bg-sidebar gap-0">
    <Button
      onclick={() => {
        activeTab = activeTab == "chat" ? "none" : "chat";
      }}
      class="
			{activeTab == 'chat' ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'bg-primary'}
			w-full h-auto aspect-square"><MessageCircle /></Button
    >
    <Button
      onclick={() => {
        activeTab = activeTab == "bot" ? "none" : "bot";
      }}
      class="
			{activeTab == 'bot' ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'bg-primary'}
			w-full h-auto aspect-square"><Bot /></Button
    >
  </div>

  <Chatroom
    class="{activeTab === 'chat' ? 'w-96' : 'w-0'}  flex flex-col transition-all overflow-hidden"
  />
  <div
    class="{activeTab === 'bot' ? 'w-96' : 'w-0'} flex flex-col transition-all overflow-hidden
		justify-center items-center
	"
  >
    This is A.I. chatbox
  </div>
</div>
