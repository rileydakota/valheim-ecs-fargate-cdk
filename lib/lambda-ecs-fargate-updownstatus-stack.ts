import { Arn, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaEcsFargateUpDownService } from "./lambda-ecs-fargate-updownstatus-service";

interface MultiStackProps extends StackProps {
  serviceArn: Arn;
  clusterArn: Arn;
  startStopPassword: string;
}

export class LambdaEcsFargateUpdownstatusStack extends Stack {
  constructor(scope: Construct, id: string, props: MultiStackProps) {
    super(scope, id, props);

    new LambdaEcsFargateUpDownService(this, 'Status', {
      region: Stack.of(this).region,
      serviceArn: props.serviceArn,
      clusterArn: props.clusterArn,
      startStopPassword: props.startStopPassword,
    });
  }
}
