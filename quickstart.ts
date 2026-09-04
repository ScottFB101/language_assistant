import { LettaAgentClient } from "@letta-ai/letta-agent-sdk";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";

async function main() {
  const client = new LettaAgentClient({ backend: "local" });

  const agentIdPath = join(process.cwd(), ".agentId");
  let agentId: string;

  if (existsSync(agentIdPath)) {
    agentId = readFileSync(agentIdPath, "utf-8").trim();
    console.log("Reusing existing agent ID:", agentId);
  } else {
    agentId = await client.createAgent({
      model: "openrouter/meta-llama/llama-3.1-8b-instruct",
      persona: "You are a Spanish tutor for an English speaking native.",
      human: "The user wants complex spanish practice, and random word tests.",
    });
    writeFileSync(agentIdPath, agentId);
    console.log("Created new agent with ID:", agentId);
  }

  await using session = client.createSession(agentId, {
    cwd: process.cwd(),
    allowedTools: [],
  });

  // const catalog = await session.listModels()
  // console.log("Available models:", catalog.entries.map((m) => m.handle).join(", \n"));

  console.log("Agent ID:", agentId);

  const rl = createInterface({ input: stdin, output: stdout });

  // First turn kicks things off
  let nextMessage =
    "Give the user a random Spanish word and ask them to translate it into English. Then, provide the correct translation after they respond.";

while (true) {
  await session.send(nextMessage);

  let fullResponse = "";
  const iterator = session.stream()[Symbol.asyncIterator]();
  let turnDone = false;

  while (!turnDone) {
    console.log("Waiting for next message...");
    const outcome = await Promise.race([
      iterator.next(),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 15000)),
    ]);

    if (outcome === "timeout") {
      console.warn("[WARN] No result after timeout — proceeding anyway.");
      break;
    }

    const { value: message, done } = outcome;
    if (done) break;

    if (message.type === "assistant") {
      fullResponse += message.content; // buffer instead of writing immediately
    }
    if (message.type === "error") {
      console.error("ERROR:", message.message, message.errorDetail);
    }
    if (message.type === "result") {
      if (!message.success) {
        console.error("Turn failed:", message.errorCode, message.errorDetail);
      }
      turnDone = true;
    }
  }

  console.log(fullResponse); // print the whole reply as one line/block

  nextMessage = await rl.question("\nYou: ");
  if (nextMessage.trim().toLowerCase() === "exit") break;
}

  rl.close();
}

main().catch((error) => {
  console.error(error);
  throw error;
});