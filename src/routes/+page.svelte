<script lang="ts">
  import { SvelteMap } from "svelte/reactivity";

  import Button from "$lib/components/ui/button/button.svelte";
  import { toggleMode } from "mode-watcher";
  import { MoonIcon, SunIcon, Bot, MessageCircle } from "@lucide/svelte";
  import { Input } from "$lib/components/ui/input";
  import { setChatroomContext } from "$lib/chatroomContext";
  import Chatroom from "$lib/components/Chatroom.svelte";
  import type { Context } from "../types/context.d";

  let usernameInputText: string = $state("");
  let activeTab: "none" | "chat" | "bot" = $state("none");
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
			w-full h-auto aspect-square"><Bot class="" /></Button
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
