<script lang="ts">
  import type { Transaction } from "./types";

  export let transaction: Transaction;
</script>

<div class="card row">
  <div>{transaction.date}</div>
  <div class:income={transaction.amount < 0}>{transaction.amount}</div>
  <div>{transaction.description}</div>
  <div>{transaction.synced}</div>
</div>

<style>
  .income {
    color: green;
  }
</style>
