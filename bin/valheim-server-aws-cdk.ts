#!/usr/bin/env node
import "source-map-support/register";
import { ValheimServerAwsCdkStack } from "../lib/valheim-server-aws-cdk-stack";
import { LambdaEcsFargateUpdownstatusStack } from '../lib/lambda-ecs-fargate-updownstatus-stack';
import { Construct } from "constructs";
import { Annotations, App } from "aws-cdk-lib";
import { config } from "dotenv";
import WorldBootstrapResourcesStack from "../lib/world-bootstrap-resources-stack";
import { readdirSync } from "fs";
import { MonitoringStack } from "../lib/monitoring";
config();

const BOOTSTRAP_WITH_WORLD_NAME = process.env.BOOTSTRAP_WITH_WORLD_NAME;

interface ValheimServerProps {
    addAppGatewayStartStopStatus: boolean;
    appGatewayStartStopPassword?: string;
    worldAssetLocations?: string[];
}

class ValheimServer extends Construct {
    constructor(scope: Construct, id: string, props: ValheimServerProps) {
        super(scope, id);

        let worldBootstrapResourcesStack: WorldBootstrapResourcesStack | undefined;
        if (props.worldAssetLocations && props.worldAssetLocations.length > 0) {
            worldBootstrapResourcesStack = new WorldBootstrapResourcesStack(this, "WorldBootstrapResources", {
                worldAssetLocations: props.worldAssetLocations
            });
        }

        const hasRequestedWorldInResourcesFolder = props.worldAssetLocations?.includes(`resources/worlds/${BOOTSTRAP_WITH_WORLD_NAME}`);
        if (BOOTSTRAP_WITH_WORLD_NAME && !hasRequestedWorldInResourcesFolder) {
            Annotations.of(this).addError(`${BOOTSTRAP_WITH_WORLD_NAME} does not exist in the resources/worlds directory!`);
        }
        
        const ecsStack = new ValheimServerAwsCdkStack(this, "ValheimServerAwsCdkStack", {
            worldBootstrapLocation: worldBootstrapResourcesStack ? BOOTSTRAP_WITH_WORLD_NAME : undefined,
            worldResourcesBucket: worldBootstrapResourcesStack?.bucket
        });
        if (worldBootstrapResourcesStack) ecsStack.addDependency(worldBootstrapResourcesStack);

        if(props?.addAppGatewayStartStopStatus) {
            const lambdaStack = new LambdaEcsFargateUpdownstatusStack(this, 'LambdaEcsFargateUpdownstatusStack', {
                serviceArn: ecsStack.valheimService.serviceArn,
                clusterArn: ecsStack.fargateCluster.clusterArn,
                startStopPassword: props.appGatewayStartStopPassword === undefined ? "" : props.appGatewayStartStopPassword,
            });
            lambdaStack.addDependency(ecsStack);
        }

        new MonitoringStack(this, "ValheimServerMonitoringStack", {
            fargateService: ecsStack.valheimService,
            discordWebhookUrl: DISCORD_WEBHOOK_URL_FOR_ALARMS,
        })
    }
}

const getWorldAssetLocations = () => {
    try {
        return readdirSync("resources/worlds")
            .filter((file) => !file.startsWith("."))
            .map((file) => `resources/worlds/${file}`);
    } catch (err) {
        throw new Error(`Failed to get world asset locations: ${err}`);
    }
}

const app = new App();
const worldAssetLocations = getWorldAssetLocations();
const APPGW_START_STOP_PASSWORD = process.env.APPGW_START_STOP_PASSWORD;
const DISCORD_WEBHOOK_URL_FOR_ALARMS = process.env.DISCORD_WEBHOOK_URL_FOR_ALARMS;

new ValheimServer(app, "ValheimServer", {
    worldAssetLocations,
    addAppGatewayStartStopStatus: !APPGW_START_STOP_PASSWORD || APPGW_START_STOP_PASSWORD !== "changeme",
    appGatewayStartStopPassword: APPGW_START_STOP_PASSWORD,
});
app.synth();
