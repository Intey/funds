<script lang="ts">
  import { onMount } from "svelte";
  import TransactionCard from "./Transaction.svelte";
  import { getTransactionsStore } from "./store";
  import type { Fund } from "./types";
  export let fund: Fund;

  let showTransactions: boolean = false;

  let fundTransactionsAPI = getTransactionsStore(fund.name);
  let store = fundTransactionsAPI.store;

  let showSyncedTransactions = false;

  $: visibleTransactions = $store.filter(
    (t) => t.synced == showSyncedTransactions
  );
  let remoteError = false;
  // Fund.create() -> Fund.create() + [Fund.name()]_Transactions.declare()
  // Transaction.all();

  let handleOpenFund = (e: Event) => {
    showTransactions = !showTransactions;
    if (showTransactions) {
      fundTransactionsAPI.retrieve();
    }
  };
</script>

<div
  class="card fund"
  on:click={handleOpenFund}
  on:keypress={handleOpenFund}
  role="button"
  tabindex="0"
>
  <div>{fund.name}:{fund.budget}</div>
  <div>{fund.balance}</div>
  {#if showTransactions}
    <div class="inner-shadow" class:error={remoteError}>
      {#each visibleTransactions as transaction}
        <TransactionCard {transaction} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .fund {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr auto;
    row-gap: 0.2em;
  }
  .fund > :nth-child(3) {
    grid-column: 1/3;
    grid-row: 2;
  }
  .local {
    background: #f5f5f5;
  }
</style>
