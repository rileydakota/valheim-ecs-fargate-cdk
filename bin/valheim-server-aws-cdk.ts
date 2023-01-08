#!/usr/bin/env node
import { ValheimServerAwsCdkStack } from "../lib/valheim-server-aws-cdk-stack";
import { LambdaEcsFargateUpdownstatusStack } from '../lib/lambda-ecs-fargate-updownstatus-stack';
import { Construct } from "constructs";
import { App, Fn } from "aws-cdk-lib";

class ValheimServerProps {
    addAppGatewayStartStopStatus: boolean;
    appGatewayStartStopPassword?: string;
}

class ValheimServer extends Construct {
    constructor(scope: Construct, id: string, props?: ValheimServerProps) {
        super(scope, id);
        const ecsStack = new ValheimServerAwsCdkStack(app, "ValheimServerAwsCdkStack");
        if( props?.addAppGatewayStartStopStatus )
        {
            const lambdaStack = new LambdaEcsFargateUpdownstatusStack(app, 'LambdaEcsFargateUpdownstatusStack', {
                serviceArn: Fn.importValue("fargateServiceName"),
                clusterArn: Fn.importValue("fargateClusterName"),
                startStopPassword: props.appGatewayStartStopPassword === undefined ? "" : props.appGatewayStartStopPassword,
            });
            lambdaStack.addDependency(ecsStack);
        }
    }
}

const app = new App();
new ValheimServer(app, "ValheimServer", {addAppGatewayStartStopStatus: true, appGatewayStartStopPassword: "changeme"});
app.synth();
