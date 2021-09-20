import { PageHeader } from "antd";
import React from "react";

// displays a page header

export default function Header() {
  return (
    <a href="/" target="_blank" rel="noopener noreferrer">
      <PageHeader
        title="GTC Tokenstream.Party"
        subTitle="Fund the Moonshot Collective Builders"
        style={{ cursor: "pointer" }}
      />
    </a>
  );
}
