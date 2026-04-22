export async function sendLineMessage(to: string, message: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to,
      messages: [
        {
          type: "text",
          text: message,
        },
      ],
    }),
  });
}