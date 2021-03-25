import * as core from "@aws-cdk/core";
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdanodejs from "@aws-cdk/aws-lambda-nodejs";
import { Policy, PolicyStatement, PolicyProps, Effect } from "@aws-cdk/aws-iam"
import { Stack, Arn } from "@aws-cdk/core";
import { EndpointType } from "@aws-cdk/aws-apigateway";

export interface LambdaEcsFargateUpDownServiceOptions {
  region: string;
  serviceArn: Arn;
  clusterArn: Arn;
  startStopPassword: string;
}

export class LambdaEcsFargateUpDownService extends core.Construct {
  constructor(scope: core.Construct, id: string, props: LambdaEcsFargateUpDownServiceOptions) {
    super(scope, id);

    const serverStatusHandler = new lambdanodejs.NodejsFunction(this, "serverStatus", {
      runtime: lambda.Runtime.NODEJS_10_X, // So we can use async 
      entry: 'resources/serverstatus.ts',
      handler: "handler",
      bundling: {
        nodeModules: ['@aws-sdk/client-ecs', '@aws-sdk/client-ec2'],
      },
      environment: {
        REGION: props.region,
        SERVICE_ARN: props.serviceArn as string,
        CLUSTER_ARN: props.clusterArn as string
      }
    });

    const ecsStatusPolicy = new Policy(this, "ecsStatusPolicy", {
      statements: [
        new PolicyStatement({
          resources: ['*'],
          effect: Effect.ALLOW,
          actions: [
            "ecs:ListTasks",
            "ecs:DescribeTasks",
            "ec2:DescribeNetworkInterfaces"
          ]
        })
      ]
    });
    serverStatusHandler.role?.attachInlinePolicy(ecsStatusPolicy);

    const startStopHandler = new lambdanodejs.NodejsFunction(this, "startstop", {
      runtime: lambda.Runtime.NODEJS_10_X, // So we can use async 
      entry: 'resources/startstopserver.ts',
      handler: "handler",
      bundling: {
        nodeModules: ['@aws-sdk/client-ecs'],
      },
      environment: {
        REGION: props.region,
        SERVICE_NAME: props.serviceArn as string,
        CLUSTER_ARN: props.clusterArn as string,
        PASSWORD: props.startStopPassword,
      }
    });
    const ecsStartStopPolicy = new Policy(this, "ecsStartStopPolicy", {
      statements: [
        new PolicyStatement({
          resources: ['*'],
          effect: Effect.ALLOW,
          actions: [
            "ecs:UpdateService",
          ]
        })
      ]
    });
    startStopHandler.role?.attachInlinePolicy(ecsStartStopPolicy);


    const api = new apigateway.RestApi(this, "startstopserver-api", {
      restApiName: "Start Stop Status for ECS service",
      description: "This service allows you to start / stop and get the status of an ECS task.",
      endpointTypes: [ EndpointType.REGIONAL ]
    });

    const startStopResource = api.root.addResource("startstop");
    const serverStatusResource = api.root.addResource("serverstatus");

    const serverStatusIntegration = new apigateway.LambdaIntegration(serverStatusHandler, {
    });

    const startStopIntegration = new apigateway.LambdaIntegration(startStopHandler, {
    });

    serverStatusResource.addMethod("ANY", serverStatusIntegration); // GET /
    startStopResource.addMethod("ANY", startStopIntegration);
  }
}