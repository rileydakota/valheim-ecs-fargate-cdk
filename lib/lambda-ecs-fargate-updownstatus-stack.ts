import * as cdk from '@aws-cdk/core';
import { Arn, Stack } from '@aws-cdk/core';
import * as lambda_service from '../lib/lambda-ecs-fargate-updownstatus-service';

interface MultiStackProps extends cdk.StackProps {
  serviceArn: Arn;
  clusterArn: Arn;
  startStopPassword: string;
}

export class LambdaEcsFargateUpdownstatusStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: MultiStackProps) {
    super(scope, id, props);

    new lambda_service.LambdaEcsFargateUpDownService(this, 'Status', {
      region: cdk.Stack.of(this).region,
      serviceArn: props.serviceArn,
      clusterArn: props.clusterArn,
      startStopPassword: props.startStopPassword,
    });
  }
}
