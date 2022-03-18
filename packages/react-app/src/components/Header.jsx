import { PageHeader } from "antd";
import React from "react";
import { TokenStreamLogo } from "./TokenStreamLogo";

// displays a page header

export default function Header() {
  return (
    <a href="/" target="_blank" rel="noopener noreferrer">
      <PageHeader
        title={
        <div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="navbar-title">
          <TokenStreamLogo width="120" height="40" />
          <p>Tokenstream.Party</p>
        </a>
        </div>
        }
        subTitle="Fund the Moonshot Collective Builders"
        style={{ cursor: "pointer" }}
      />
    </a>
  );
}
