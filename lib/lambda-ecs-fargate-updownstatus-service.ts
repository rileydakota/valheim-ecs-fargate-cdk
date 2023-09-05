import { Arn } from "aws-cdk-lib";
import { EndpointType, LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export interface LambdaEcsFargateUpDownServiceOptions {
  region: string;
  serviceArn: Arn;
  clusterArn: Arn;
  startStopPassword: string;
}

export class LambdaEcsFargateUpDownService extends Construct {
  constructor(scope: Construct, id: string, props: LambdaEcsFargateUpDownServiceOptions) {
    super(scope, id);

    const serverStatusHandler = new NodejsFunction(this, "serverStatus", {
      runtime: Runtime.NODEJS_18_X,
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

    const startStopHandler = new NodejsFunction(this, "startstop", {
      runtime: Runtime.NODEJS_18_X,
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


    const api = new RestApi(this, "startstopserver-api", {
      restApiName: "Start Stop Status for ECS service",
      description: "This service allows you to start / stop and get the status of an ECS task.",
      endpointTypes: [ EndpointType.REGIONAL ]
    });

    const startStopResource = api.root.addResource("startstop");
    const serverStatusResource = api.root.addResource("serverstatus");

    const serverStatusIntegration = new LambdaIntegration(serverStatusHandler, {
    });

    const startStopIntegration = new LambdaIntegration(startStopHandler, {
    });

    serverStatusResource.addMethod("ANY", serverStatusIntegration); // GET /
    startStopResource.addMethod("ANY", startStopIntegration);
  }
}