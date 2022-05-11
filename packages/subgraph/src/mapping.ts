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

import { Organization, User, UserOrganization, StreamActivity } from "../generated/schema"

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
  let userAddress = event.params.user.toHex();

  let user = User.load(userAddress);

  if (!user) {
    user = new User(userAddress);
    user.user = event.params.user;
    user.createdAt = event.block.timestamp;
    user.save();
  }

  let userOrgAddress = userAddress.concat(orgAddress);
  let userOrg = UserOrganization.load(userOrgAddress)
  if (!userOrg) {
    userOrg = new UserOrganization(userOrgAddress);
    userOrg.user = userAddress;
    userOrg.organization = orgAddress;
    userOrg.creator = event.params.creator;
    userOrg.save();
  }
}

export function handleWithdraw(event: Withdraw): void {
  let orgAddress = event.address.toHex();
  let id = event.transaction.hash.toHex();

  let activity = new StreamActivity(id);
  activity.user = event.params.to.toHex();
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
  activity.user = event.params.stream.toHex();
  activity.eventType = "StreamDepositEvent";
  activity.amount = event.params.amount;
  activity.organization = orgAddress;
  activity.actor = event.params.from;
  activity.info = event.params.reason;
  activity.createdAt = event.block.timestamp;
  activity.save();
}