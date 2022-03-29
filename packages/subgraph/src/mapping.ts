import {
  OrganizationsDeployed
} from "../generated/OrgFactoryDeployer/OrgFactoryDeployer";
import {
  StreamFactory as StreamFactoryTemplate,
  Stream as StreamTemplate
} from "../generated/templates";
import {
  StreamAdded
} from "../generated/templates/StreamFactory/StreamFactory";
import {
  Withdraw,
  Deposit
} from "../generated/templates/Stream/Stream";
import { Organization, Stream, StreamActivity } from "../generated/schema"

export function handleOrganizationDeployed(event: OrganizationsDeployed): void {
  let orgAddress = event.params.tokenAddress.toHex();
  let org = Organization.load(orgAddress);

  if (!org) {
    org = new Organization(orgAddress);
    org.createdAt = event.block.timestamp;
    org.owner = event.params.ownerAddress;
    org.orgName = event.params.organizationName;
  }

  StreamFactoryTemplate.create(event.params.tokenAddress);

  org.save();
}

export function handleStreamAdded(event: StreamAdded): void {
  let orgAddress = event.address.toHex();

  let stream = new Stream(event.params.stream.toHex());
  stream.user = event.params.user;
  stream.createdAt = event.block.timestamp;
  stream.organization = orgAddress;

  StreamTemplate.create(event.params.stream);

  stream.save();
}

export function handleWithdraw(event: Withdraw): void {
  let stream = Stream.load(event.address.toHex());
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
  let stream = Stream.load(event.address.toHex());
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