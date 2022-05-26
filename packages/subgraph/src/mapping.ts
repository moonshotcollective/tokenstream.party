import {
  OrganizationDeployed
} from "../generated/StreamDeployer/StreamDeployer";
import {
  MultiStream as MultiStreamTemplate
} from "../generated/templates";
import {
  StreamAdded,
  Withdraw,
  Deposit
} from "../generated/templates/MultiStream/MultiStream";
import { crypto, ByteArray } from '@graphprotocol/graph-ts'

import { Organization, Stream, StreamActivity } from "../generated/schema"

export function handleOrganizationDeployed(event: OrganizationDeployed): void {
  let orgAddress = event.params.orgAddress.toHex();
  let org = Organization.load(orgAddress);

  if (!org) {
    org = new Organization(orgAddress);
    org.createdAt = event.block.timestamp;
    org.owner = event.params.ownerAddress;
    org.orgName = event.params.organizationName;
  }

  MultiStreamTemplate.create(event.params.orgAddress);

  org.save();
}

export function handleStreamAdded(event: StreamAdded): void {
  let orgAddress = event.address.toHex();

  let nameHash = crypto.keccak256(ByteArray.fromUTF8(event.params.name)).toHexString();
  let streamId = orgAddress.concat(nameHash);
  let stream = Stream.load(streamId);
  if (!stream) {
    stream = new Stream(streamId);
    stream.name = event.params.name;
    stream.organization = orgAddress;
    stream.createdAt = event.block.timestamp;
    stream.save();
  }
}

export function handleWithdraw(event: Withdraw): void {
  let orgAddress = event.address.toHex();
  let id = event.transaction.hash.toHex();

  let activity = new StreamActivity(id);
  activity.stream = orgAddress.concat(event.params.stream.toHexString());
  activity.eventType = "StreamWithdrawEvent";
  activity.amount = event.params.amount;
  activity.organization = orgAddress;
  activity.actor = event.params.to;
  activity.info = event.params.reason;
  activity.createdAt = event.block.timestamp;
  activity.save();
}

export function handleDeposit(event: Deposit): void {
  let orgAddress = event.address.toHex();
  let id = event.transaction.hash.toHex();

  let activity = new StreamActivity(id);
  activity.stream = orgAddress.concat(event.params.stream.toHexString());
  activity.eventType = "StreamDepositEvent";
  activity.amount = event.params.amount;
  activity.organization = orgAddress;
  activity.actor = event.params.from;
  activity.info = event.params.reason;
  activity.createdAt = event.block.timestamp;
  activity.save();
}