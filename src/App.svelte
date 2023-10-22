<script lang="ts">
  import { onMount } from "svelte";
  import FundComponent from "./Fund.svelte";
  import { auth, funds, token, notifications } from "./store";
  import type { Fund } from "./types";
  import { loadPersistent } from "./utils";

  import type { Writable } from "svelte/store";

  let name = "";
  let budget = 0;
  let balance = 0;
  let fundsStore: Writable<Fund[]> = funds.store;

  function handleCreate(ev: Event) {
    ev.preventDefault();
    funds.create({ name, budget, balance, needSync: true });
    name = "";
  }

  function handleAuth(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    auth();
  }

  onMount(async () => {
    console.log("mounted");
    funds.retrieve();
    // window.addEventListener("online", (e) => {
    //   console.log("online");
    //   let requests = loadPersistent("requests", []);
    //   // TODO: repeat with correct order. Delete this req in utils
    //   funds.retrieve();
    // });
  });
  let getNotificationsList = () => {
    return Object.values($notifications);
  };
</script>

<div class="list">
  {#if fundsStore}
    {#each $fundsStore as fund}
      <FundComponent {fund} />
    {/each}
  {/if}

  <input type="text" bind:value={name} />
  <input type="number" bind:value={budget} />
  <button on:click={handleCreate}>create</button>
  {#if !$token}
    <button on:click={handleAuth}>login</button>
  {/if}
  <div class="notifications">
    {#each getNotificationsList() as notification}
      <div class="notification">
        <div>{notification.type}</div>
        <div>{notification.message}</div>
      </div>
    {/each}
  </div>
</div>

<style>
  :global(.list) {
    display: flex;
    flex-direction: column;
    padding: 0.2em;
  }
  :global(.card) {
    box-shadow: 4px 4px 4px rgba(0, 0, 0, 0.1);
    border-radius: 2px;
    padding: 8px;
    margin: 8px;
    background: white;
    border: 1px solid rgba(100, 100, 100, 0.1);
  }
  :global(.row) {
    display: flex;
    justify-content: flex-start;
    align-items: left;
  }
  :global(.row > *) {
    padding: 0.2em;
  }

  :global(.inner-shadow) {
    box-shadow: inset 0px 0px 10px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(100, 100, 100, 0.1);
  }
  :global(.error) {
    border: 1px solid brown;
  }
  .notifications {
    position: absolute;
    top: 0;
    left: 0 ;
  }
</style>
