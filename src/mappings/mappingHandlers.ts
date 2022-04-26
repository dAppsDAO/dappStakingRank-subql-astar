import { SubstrateEvent } from "@subql/types"
import { Contract, DAppStakingReward, Account } from "../types"
import { Balance } from "@polkadot/types/interfaces"
import { u32 } from "@polkadot/types"

export async function handleDAppStakingReward(event: SubstrateEvent): Promise<void> {
  const {
    event: {
      data: [account, smartContract, era, balanceOf],
    },
  } = event
  const balance = correctBalance(balanceOf as Balance)
  const accountId = account.toString()
  const contractId = JSON.parse(smartContract.toString())["evm"]
  logger.info("\nevm: " + contractId)
  await ensureAccount(accountId, balance)
  await ensureContract(contractId, balance)
  const entity = new DAppStakingReward(`${event.block.block.header.number}-${event.idx.toString()}`)
  entity.accountId = accountId
  entity.contractId = contractId
  entity.reward = balance
  entity.eraIndex = (era as u32).toNumber()
  entity.timestamp = event.block.timestamp
  await entity.save()
}

async function ensureAccount(accountId: string, balance: number): Promise<void> {
  let account = await Account.get(accountId)
  if (!account) {
    account = new Account(accountId)
    account.totalRewarded = 0
  }
  account.totalRewarded += balance
  await account.save()
}

async function ensureContract(contractId: string, balance: number): Promise<void> {
  let contract = await Contract.get(contractId)
  if (!contract) {
    contract = new Contract(contractId)
    contract.totalReward = 0
  }
  contract.totalReward += balance
  await contract.save()
}

function insertStr(str, index, insert) {
  return str.slice(0, index) + insert + str.slice(index, str.length)
}

function correctBalance(balanceOf: Balance): number {
  let balance = (balanceOf as Balance).toString()
  while (balance.length < 18) {
    balance = "0" + balance
  }
  if (balance.length > 18) {
    balance = insertStr(balance, balance.length - 18, ".")
  } else {
    balance = "0." + balance
  }
  return parseFloat(balance)
}
