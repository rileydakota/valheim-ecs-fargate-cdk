import { SNSHandler, SNSEvent, Context, SNSMessage } from "aws-lambda";
import { EmbedBuilder, WebhookClient } from "discord.js";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
if (!DISCORD_WEBHOOK_URL) throw new Error("DISCORD_WEBHOOK_URL must be defined!");

const EMBED_AVATAR_URL = "https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png";
const GREEN = 6872928;
const RED = 16711680;

// https://discordjs.guide/popular-topics/webhooks.html#sending-messages
export const handler: SNSHandler = async (event: SNSEvent, _context: Context) => {
  const webhookClient = new WebhookClient({ url: DISCORD_WEBHOOK_URL });

  const embeds: EmbedBuilder[] = [];
  for (const record of event.Records) {
    embeds.push(generateEmbedForAlarmMessage(record.Sns));
  }

  try {
    const result = await webhookClient.send({
      embeds,
      username: "AWS CloudWatch Alarms",
      avatarURL: EMBED_AVATAR_URL,
    });
    console.log(`Sucessfully send notification to discord: ${JSON.stringify(result)}`);
  } catch (error) {
    console.error(`Failed to send notification to discord: ${JSON.stringify(error)}`);
  }
}

const generateEmbedForAlarmMessage = (message: SNSMessage): EmbedBuilder => {
  const { Subject, Message } = message;
  const alarmMessage = JSON.parse(Message);

  console.log(`${Subject}: ${JSON.stringify(alarmMessage, null, 2)}`);

  const embed = new EmbedBuilder({
    title: Subject,
    color: alarmMessage.NewStateValue === "OK" ? GREEN : RED,
    description: `${alarmMessage.AlarmDescription}

${alarmMessage.NewStateReason}`,
    timestamp: `${alarmMessage.StateChangeTime.split("+")[0]}Z`,
    footer: {text: alarmMessage.AlarmArn },
  });

  return embed;
}