import {
  OrganizationsDeployed
} from "../generated/OrganizationStreamsDeployer/OrganizationStreamsDeployer";
import {
  OrganizationStreams as OrganizationStreamsTemplate
} from "../generated/templates";
import {
  StreamAdded,
  Withdraw,
  Deposit
} from "../generated/templates/OrganizationStreams/OrganizationStreams";

import { Organization, Stream, StreamActivity } from "../generated/schema"

export function handleOrganizationDeployed(event: OrganizationsDeployed): void {
  let orgAddress = event.params.orgAddress.toHex();
  let org = Organization.load(orgAddress);

  if (!org) {
    org = new Organization(orgAddress);
    org.createdAt = event.block.timestamp;
    org.owner = event.params.ownerAddress;
    org.orgName = event.params.organizationName;
  }

  OrganizationStreamsTemplate.create(event.params.orgAddress);

  org.save();
}

export function handleStreamAdded(event: StreamAdded): void {
  let orgAddress = event.address.toHex();

  let stream = new Stream(event.params.user.toHex());
  stream.user = event.params.user;
  stream.creator = event.params.creator;
  stream.createdAt = event.block.timestamp;
  stream.organization = orgAddress;

  stream.save();
}

export function handleWithdraw(event: Withdraw): void {
  let stream = Stream.load(event.params.to.toHex());
  if (stream) {
    let id = event.transaction.hash.toHex();

    let activity = new StreamActivity(id);
    activity.eventType = "StreamWithdrawEvent";
    activity.amount = event.params.amount;
    activity.organization = stream.organization;
    activity.user = event.params.to;
    activity.info = event.params.reason;
    activity.createdAt = event.block.timestamp;
    activity.save();
  }
}

export function handleDeposit(event: Deposit): void {
  let stream = Stream.load(event.params.stream.toHex());
  if (stream) {
    let id = event.transaction.hash.toHex();

    let activity = new StreamActivity(id);
    activity.eventType = "StreamDepositEvent";
    activity.amount = event.params.amount;
    activity.organization = stream.organization;
    activity.user = event.params.from;
    activity.info = event.params.reason;
    activity.createdAt = event.block.timestamp;
    activity.save();
  }
}