import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { FargateService } from "aws-cdk-lib/aws-ecs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Topic } from "aws-cdk-lib/aws-sns";
import { LambdaSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { AlarmFactoryDefaults, MonitoringFacade, SnsAlarmActionStrategy } from "cdk-monitoring-constructs";
import { Construct } from "constructs";

interface MonitoringStackProps extends StackProps {
  fargateService: FargateService;
  discordWebhookUrl?: string;
}

export class MonitoringStack extends Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { fargateService } = props;

    let alarmFactoryDefaults: AlarmFactoryDefaults = {
      actionsEnabled: false,
      alarmNamePrefix: "ValheimCDK",
    };

    if (props.discordWebhookUrl) {
      const topicForDiscordNotif = new Topic(this, "AlarmTopic");
      const embedAlarmInDiscordLambda = new NodejsFunction(this, "EmbedAlarmInDiscordLambda", {
        runtime: Runtime.NODEJS_18_X,
        entry: 'resources/embedAlarmInDiscordLambda.ts',
        handler: "handler",
        bundling: {
          nodeModules: ['discord.js'],
        },
        environment: {
          DISCORD_WEBHOOK_URL: props.discordWebhookUrl,
        }
      });
      topicForDiscordNotif.addSubscription(new LambdaSubscription(embedAlarmInDiscordLambda));
      
      alarmFactoryDefaults = {
        ...alarmFactoryDefaults,
        actionsEnabled: true,
        action: new SnsAlarmActionStrategy({
          onAlarmTopic: topicForDiscordNotif,
          onOkTopic: topicForDiscordNotif,
        }),
      }
    }

    const monitoring = new MonitoringFacade(this, "Monitoring", {
      alarmFactoryDefaults,
    });

    monitoring
      .monitorSimpleFargateService({
        fargateService,

        addCpuUsageAlarm: {
          "CRITICAL": {
            maxUsagePercent: 95,
            datapointsToAlarm: 3,
            period: Duration.minutes(1),
            treatMissingDataOverride: TreatMissingData.IGNORE,
          },
          "WARNING": {
            maxUsagePercent: 90,
            datapointsToAlarm: 10,
            period: Duration.minutes(1),
            treatMissingDataOverride: TreatMissingData.IGNORE,
          }
        },
        addMemoryUsageAlarm: {
          "CRITICAL": {
            maxUsagePercent: 95,
            datapointsToAlarm: 3,
            period: Duration.minutes(1),
            treatMissingDataOverride: TreatMissingData.IGNORE,
          },
          "WARNING": {
            maxUsagePercent: 90,
            datapointsToAlarm: 10,
            period: Duration.minutes(1),
            treatMissingDataOverride: TreatMissingData.IGNORE,
          }
        }
      });
  }
}
