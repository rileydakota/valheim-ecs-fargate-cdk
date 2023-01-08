#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { ValheimServerAwsCdkStack } from "../lib/valheim-server-aws-cdk-stack";
import { LambdaEcsFargateUpdownstatusStack } from '../lib/lambda-ecs-fargate-updownstatus-stack';

class ValheimServerProps {
    addAppGatewayStartStopStatus: boolean;
    appGatewayStartStopPassword?: string;
}

class ValheimServer extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props?: ValheimServerProps) {
        super(scope, id);
        const ecsStack = new ValheimServerAwsCdkStack(app, "ValheimServerAwsCdkStack");
        if( props?.addAppGatewayStartStopStatus )
        {
            const lambdaStack = new LambdaEcsFargateUpdownstatusStack(app, 'LambdaEcsFargateUpdownstatusStack', {
                serviceArn: cdk.Fn.importValue("fargateServiceName"),
                clusterArn: cdk.Fn.importValue("fargateClusterName"),
                startStopPassword: props.appGatewayStartStopPassword === undefined ? "" : props.appGatewayStartStopPassword,
            });
            lambdaStack.addDependency(ecsStack);
        }
    }
}

const app = new cdk.App();
new ValheimServer(app, "ValheimServer", {addAppGatewayStartStopStatus: true, appGatewayStartStopPassword: "changeme"});
app.synth();
