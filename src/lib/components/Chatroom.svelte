<script lang="ts">
  import ScrollArea from "$lib/components/ui/scroll-area/scroll-area.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import Textarea from "./ui/textarea/textarea.svelte";
  import MessageBubble from "$lib/components/MessageBubble.svelte";
  import { useChatroomContext } from "$lib/chatroomContext";
  import { onMount } from "svelte";
  import { sendMessage, supabase } from "$lib/supabaseClient";
  import { findMessageById, findUserById } from "$lib/utils";
  import { tick } from "svelte";

  import type { Message } from "$lib/../types/database.d";
  import type { Context } from "$lib/../types/context.d";

  interface SuggestionItem {
    id: string;
    label: string;
    type: "role" | "user";
    name: string;
    colorClass: string;
  }

  let { class: className = "" } = $props();
  let context: Context = useChatroomContext();

  // Current user text input.
  let messageInputText: string = $state("");

  let showMentionsMenu = $state(false);
  let mentionQuery = $state("");
  let selectedIndex = $state(0);

  let viewportElement: HTMLElement | null = $state(null);
  let textareaElement: HTMLTextAreaElement | null = $state(null);

  /**
   *	Keep track of last read timestamps per channel, reactive to the logged in user.
   */
  let lastReadTimestamps: Record<string, string> = $state({});

  const suggestions = $derived.by(() => {
    if (!showMentionsMenu) return [];
    const q = mentionQuery.toLowerCase();

    const roleItems: SuggestionItem[] = [
      {
        id: "role-instructor",
        label: "@instructor",
        type: "role",
        name: "instructor",
        colorClass: "text-rose-400 bg-rose-400/10 border-rose-400/30"
      },
      {
        id: "role-ta",
        label: "@ta",
        type: "role",
        name: "ta",
        colorClass: "text-indigo-400 bg-indigo-400/10 border-indigo-400/30"
      },
      {
        id: "role-student",
        label: "@student",
        type: "role",
        name: "student",
        colorClass: "text-amber-400 bg-amber-400/10 border-amber-400/30"
      }
    ];

    const userItems: SuggestionItem[] = context.users.map((u) => ({
      id: `user-${u.id}`,
      label: `@${u.name}`,
      type: "user" as const,
      name: u.name,
      colorClass: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
    }));

    const allItems = [...roleItems, ...userItems];

    if (!q) return allItems;
    return allItems.filter((item) => item.name.toLowerCase().includes(q));
  });

  function handleInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    const value = target.value;
    const selectionEnd = target.selectionEnd;

    const beforeCursor = value.slice(0, selectionEnd);
    const match = beforeCursor.match(/(?:^|\s)@([^\s]*)$/);

    if (match) {
      showMentionsMenu = true;
      mentionQuery = match[0].trim();
    } else {
      showMentionsMenu = false;
      mentionQuery = "";
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (showMentionsMenu && suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        selectedIndex = (selectedIndex + 1) % suggestions.length;
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        selectSuggestion(suggestions[selectedIndex]!);
      } else if (event.key === "Escape") {
        event.preventDefault();
        showMentionsMenu = false;
      }
    }
  }

  function selectSuggestion(item: SuggestionItem) {
    if (!textareaElement) return;

    const value = messageInputText;
    const selectionEnd = textareaElement.selectionEnd;
    const beforeCursor = value.slice(0, selectionEnd);
    const afterCursor = value.slice(selectionEnd);

    const updatedBefore = beforeCursor.replace(/@([^\s]*)$/, `${item.label} `);
    messageInputText = updatedBefore + afterCursor;

    showMentionsMenu = false;
    mentionQuery = "";

    tick().then(() => {
      textareaElement?.focus();
      const newPos = updatedBefore.length;
      textareaElement?.setSelectionRange(newPos, newPos);
    });
  }

  function getUnreadMentionsCount(channelId: string): number {
    if (channelId === context.activeChannelId) return 0;
    if (!context.user) return 0;

    const messages = context.messages.get(channelId) || [];
    const lastReadTimeStamp = lastReadTimestamps[channelId];
    const userName = context.user.name;
    const userRole = context.user.role;

    return messages.filter((msg) => {
      if (msg.user_id === context.user?.id) return false;
      if (lastReadTimeStamp && new Date(msg.created_at) <= new Date(lastReadTimeStamp))
        return false;
      return msg.content.includes(`@${userRole}`) || msg.content.includes(`@${userName}`);
    }).length;
  }
  // Fetch all the channel and message data on mount.
  onMount(() => {
    const handleWindowClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".mentions-dropdown-container") && !target.closest("textarea")) {
        showMentionsMenu = false;
      }
    };
    window.addEventListener("click", handleWindowClick);

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
      window.removeEventListener("click", handleWindowClick);
      supabase.removeChannel(channel);
    };
  });
  // Load from localStorage when user changes
  $effect(() => {
    const userId = context.user?.id;
    if (userId) {
      try {
        const stored = localStorage.getItem(`chatroom_last_read_${userId}`);
        lastReadTimestamps = stored ? JSON.parse(stored) : {};
      } catch (e) {
        console.error(e);
        lastReadTimestamps = {};
      }
    } else {
      lastReadTimestamps = {};
    }
  });
  // Keep active channel's read timestamp updated
  $effect(() => {
    const activeChannelId = context.activeChannelId;
    const userId = context.user?.id;
    if (activeChannelId && userId) {
      const messages = context.messages.get(activeChannelId) || [];
      const nowStr = new Date().toISOString();
      lastReadTimestamps[activeChannelId] = nowStr;
      localStorage.setItem(`chatroom_last_read_${userId}`, JSON.stringify(lastReadTimestamps));
    }
  });
  // Keep the suggestion in range.
  $effect(() => {
    if (suggestions.length > 0) {
      selectedIndex = Math.min(selectedIndex, suggestions.length - 1);
    } else {
      selectedIndex = 0;
    }
  });
  // Auto Scrolling.
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
    <!-- Mention Dropdown -->
    {#if showMentionsMenu && suggestions.length > 0}
      <div
        class="mentions-dropdown-container absolute bottom-full left-4 bg-popover text-popover-foreground border rounded shadow-lg p-1 z-50 min-w-[200px] max-h-60 overflow-y-auto flex flex-col gap-0.5 mb-2"
      >
        <div class="px-2 py-1 text-xs text-muted-foreground border-b mb-1 font-semibold">
          Mentions
        </div>
        {#each suggestions as item, idx (item.id)}
          <button
            type="button"
            onclick={() => selectSuggestion(item)}
            onmouseenter={() => (selectedIndex = idx)}
            class="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors flex items-center justify-between
                   {idx === selectedIndex ? 'bg-accent text-accent-foreground font-medium' : ''}"
          >
            <span>{item.label}</span>
            <span
              class="text-[10px] px-1 py-0.2 rounded border uppercase font-mono tracking-wider scale-90 {item.colorClass}"
            >
              {item.type}
            </span>
          </button>
        {/each}
      </div>
    {/if}

    <div class="max-w-4xl mp-4 p-4 mx-auto flex gap-2 border-t border-slate-800">
      <Textarea
        bind:value={messageInputText}
        bind:ref={textareaElement}
        oninput={handleInput}
        onkeydown={handleKeyDown}
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
            class="h-full text-left px-3 py-2 text-sm transition-color duration-200 cursor-pointer flex items-center gap-1.5
					{context.activeChannelId === channel.id
              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
              : 'bg-sidebar-accent text-sidebar-accent-foreground'}"
          >
            <span>{channel.name}</span>
            <!-- Unread message count -->
            {#if getUnreadMentionsCount(channel.id) > 0}
              <span
                class="inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-bold rounded bg-rose-500 text-white animate-pulse"
              >
                {getUnreadMentionsCount(channel.id)}
              </span>
            {/if}
          </Button>
        {/each}
      </div>
    </ScrollArea>
  </div>
</div>
