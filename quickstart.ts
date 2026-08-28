import { LettaAgentClient } from "@letta-ai/letta-agent-sdk";

async function main() {
  const client = new LettaAgentClient({ backend: "local" });

  const agentId = await client.createAgent({
    model: "openrouter/openrouter/free",
    persona:
      "You are a Spanish tutor for an Englissh speaking native.",
    human:
      "The user complex practice, and random word tests.",
  });

  await using session = client.createSession(agentId, {
    cwd: process.cwd(),
    allowedTools: [],
  });
  

  console.log("Agent ID:", agentId);
  console.log("Sending…");
  await session.send(
    "Give the user a random Spanish word and ask them to translate it into English. Then, provide the correct translation after they respond.",
  );
  console.log("Send accepted");

  let printedConversationId = false;
//   for await (const message of session.stream()) {
//     if (!printedConversationId && session.conversationId) {
//       console.log("Conversation ID:", session.conversationId);
//       printedConversationId = true;
//     }
//     if (message.type === "assistant") {
//       process.stdout.write(message.content);
//     }
//   }
    for await (const message of session.stream()) {
        if (message.type === "assistant") process.stdout.write(message.content);
        if (message.type === "error")
            console.error("ERROR:", message.message, message.errorDetail);
        if (message.type === "result") {
            console.log("\nRESULT:", message);
        }
    }

}

main().catch((error) => {
  console.error(error);
  throw error;
});