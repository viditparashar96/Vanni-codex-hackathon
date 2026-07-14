"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { RFNodeData } from "@/lib/flow-transform";
import { StartNode } from "./start-node";
import { ConversationNode } from "./conversation-node";
import { EndNode } from "./end-node";
import { TransferNode } from "./transfer-node";
import { DtmfNode } from "./dtmf-node";
import { SmsNode } from "./sms-node";

/**
 * Single React Flow node component that dispatches on `data.kind`. This mirrors
 * the reference's one-file-per-kind layout while fitting our canvas model,
 * where every node shares the `flowNode` type and carries its kind in the data
 * payload (so `configToNodes`/`nodesToConfig` round-tripping is untouched).
 */
export const FlowNode = memo(function FlowNode(props: NodeProps) {
  const { kind } = props.data as RFNodeData;
  switch (kind) {
    case "initial":
      return <StartNode {...props} />;
    case "end":
      return <EndNode {...props} />;
    case "transfer":
      return <TransferNode {...props} />;
    case "dtmf":
      return <DtmfNode {...props} />;
    case "sms":
      return <SmsNode {...props} />;
    case "node":
    default:
      return <ConversationNode {...props} />;
  }
});
